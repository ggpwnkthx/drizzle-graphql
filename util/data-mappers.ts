import { type Column, getTableColumns, type Table } from "drizzle-orm";
import { GraphQLError } from "graphql";
import type { TableNamedRelations } from "./builders/index.ts";
import { Buffer } from "node:buffer";

export type RemapToGraphQLFunction = (
  value: any,
  column: Column,
  key: string,
  tableName: string,
  relationMap?: Record<string, Record<string, TableNamedRelations>>,
) => any;

export type RemapFromGraphQLFunction = (
  value: any,
  column: Column,
  columnName: string,
) => any;

const remapToRegistry: Record<string, RemapToGraphQLFunction> = {};
const remapFromRegistry: Record<string, RemapFromGraphQLFunction> = {};

/**
 * Registers a remapping function for converting a database value to a GraphQL value.
 * The key is typically the custom column type.
 */
export const registerRemapToGraphQL = (
  typeKey: string,
  mapper: RemapToGraphQLFunction,
): void => {
  remapToRegistry[typeKey] = mapper;
};

/**
 * Registers a remapping function for converting a GraphQL input value into a database value.
 * The key is typically the custom column type.
 */
export const registerRemapFromGraphQL = (
  typeKey: string,
  mapper: RemapFromGraphQLFunction,
): void => {
  remapFromRegistry[typeKey] = mapper;
};

const defaultRemapToMapping: Record<string, RemapToGraphQLFunction> = {
  date: (value) =>
    value instanceof Date ? value.toISOString() : value,
  buffer: (value) =>
    value instanceof Buffer ? Array.from(value) : value,
  bigint: (value) =>
    typeof value === "bigint" ? value.toString() : value,
  json: (value) =>
    typeof value === "object" && value !== null && !Array.isArray(value)
      ? JSON.stringify(value)
      : value,
  array: (value, column, key, tableName, relationMap) => {
    if (Array.isArray(value)) {
      return value.map((item) =>
        remapToGraphQLCore(key, item, tableName, column, relationMap)
      );
    }
    return value;
  },
  default: (value) => value,
};

const defaultRemapFromMapping: Record<string, RemapFromGraphQLFunction> = {
  date: (value, _column, columnName) => {
    const formatted = new Date(value);
    if (Number.isNaN(formatted.getTime())) {
      throw new GraphQLError(
        `Field '${columnName}' is not a valid date!`
      );
    }
    return formatted;
  },
  buffer: (value, _column, columnName) => {
    if (!Array.isArray(value)) {
      throw new GraphQLError(
        `Field '${columnName}' is not an array!`
      );
    }
    return Buffer.from(value);
  },
  json: (value, _column, columnName) => {
    try {
      return JSON.parse(value);
    } catch (e) {
      throw new GraphQLError(
        `Invalid JSON in field '${columnName}':\n${
          e instanceof Error ? e.message : "Unknown error"
        }`
      );
    }
  },
  array: (value, _column, columnName) => {
    if (!Array.isArray(value)) {
      throw new GraphQLError(
        `Field '${columnName}' is not an array!`
      );
    }
    return value;
  },
  bigint: (value, _column, columnName) => {
    try {
      return BigInt(value);
    } catch (_e) {
      throw new GraphQLError(
        `Field '${columnName}' is not a BigInt!`
      );
    }
  },
  default: (value) => value,
};

export const remapToGraphQLCore = (
  key: string,
  value: any,
  tableName: string,
  column: Column,
  relationMap?: Record<string, Record<string, TableNamedRelations>>,
): any => {
  // If a relation mapping exists for this key, delegate to the appropriate handler.
  const relations = relationMap?.[tableName];
  if (relations?.[key]) {
    if (Array.isArray(value)) {
      return remapToGraphQLArrayOutput(
        value,
        relations[key]!.targetTableName,
        relations[key]!.relation.referencedTable,
        relationMap,
      );
    }
    if (typeof value === "object" && value !== null) {
      return remapToGraphQLSingleOutput(
        value,
        relations[key]!.targetTableName,
        relations[key]!.relation.referencedTable,
        relationMap,
      );
    }
  }

  // Choose a mapper: first check for a custom mapping registered by columnType,
  // then fall back to a default based on the column's dataType, or use the identity.
  const mapper =
    remapToRegistry[column.columnType] ||
    defaultRemapToMapping[column.dataType] ||
    defaultRemapToMapping.default;
  return mapper(value, column, key, tableName, relationMap);
};

export const remapToGraphQLSingleOutput = (
  queryOutput: Record<string, any>,
  tableName: string,
  table: Table,
  relationMap?: Record<string, Record<string, TableNamedRelations>>,
) => {
  for (const [key, value] of Object.entries(queryOutput)) {
    if (value === undefined || value === null) {
      delete queryOutput[key];
    } else {
      // Assume the table's properties are columns.
      const column = table[key as keyof Table] as Column;
      queryOutput[key] = remapToGraphQLCore(
        key,
        value,
        tableName,
        column,
        relationMap,
      );
    }
  }
  return queryOutput;
};

export const remapToGraphQLArrayOutput = (
  queryOutput: Record<string, any>[],
  tableName: string,
  table: Table,
  relationMap?: Record<string, Record<string, TableNamedRelations>>,
) => {
  for (const entry of queryOutput) {
    remapToGraphQLSingleOutput(entry, tableName, table, relationMap);
  }
  return queryOutput;
};

export const remapFromGraphQLCore = (
  value: any,
  column: Column,
  columnName: string,
) => {
  const mapper =
    remapFromRegistry[column.columnType] ||
    defaultRemapFromMapping[column.dataType] ||
    defaultRemapFromMapping.default;
  return mapper(value, column, columnName);
};

export const remapFromGraphQLSingleInput = (
  queryInput: Record<string, any>,
  table: Table,
) => {
  for (const [key, value] of Object.entries(queryInput)) {
    if (value === undefined) {
      delete queryInput[key];
    } else {
      const column = getTableColumns(table)[key];
      if (!column) throw new GraphQLError(`Unknown column: ${key}`);

      if (value === null && column.notNull) {
        delete queryInput[key];
        continue;
      }

      queryInput[key] = remapFromGraphQLCore(value, column, key);
    }
  }
  return queryInput;
};

export const remapFromGraphQLArrayInput = (
  queryInput: Record<string, any>[],
  table: Table,
) => {
  for (const entry of queryInput) {
    remapFromGraphQLSingleInput(entry, table);
  }
  return queryInput;
};

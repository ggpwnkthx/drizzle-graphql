import { type Column, getTableColumns, type Table } from "drizzle-orm";
import { GraphQLError } from "graphql";
import type { TableNamedRelations } from "./builders/index.ts";
import { Buffer } from "node:buffer";

/**
 * Function type for remapping a database value to a GraphQL-compatible value.
 *
 * @param value - The original value from the database.
 * @param column - The column definition from Drizzle ORM.
 * @param key - The key corresponding to the column or field name.
 * @param tableName - The name of the table containing the column.
 * @param relationMap - Optional mapping of table relations for handling nested or related data.
 * @returns The value remapped to a format suitable for GraphQL output.
 */
export type RemapToGraphQLFunction = (
  value: any,
  column: Column,
  key: string,
  tableName: string,
  relationMap?: Record<string, Record<string, TableNamedRelations>>,
) => any;

/**
 * Function type for remapping a GraphQL input value to a database-compatible value.
 *
 * @param value - The input value received from a GraphQL request.
 * @param column - The column definition from Drizzle ORM.
 * @param columnName - The name of the column being remapped.
 * @returns The value remapped to a format suitable for database storage.
 */
export type RemapFromGraphQLFunction = (
  value: any,
  column: Column,
  columnName: string,
) => any;

// Registry for custom remapping functions for converting database values to GraphQL values.
const remapToRegistry: Record<string, RemapToGraphQLFunction> = {};

// Registry for custom remapping functions for converting GraphQL input values to database values.
const remapFromRegistry: Record<string, RemapFromGraphQLFunction> = {};

/**
 * Registers a custom remapping function for converting a database value to a GraphQL value.
 *
 * This allows you to override the default behavior for a specific custom column type.
 *
 * @param typeKey - The key representing the custom column type.
 * @param mapper - The remapping function to register for the given typeKey.
 */
export const registerRemapToGraphQL = (
  typeKey: string,
  mapper: RemapToGraphQLFunction,
): void => {
  remapToRegistry[typeKey] = mapper;
};

/**
 * Registers a custom remapping function for converting a GraphQL input value to a database-compatible value.
 *
 * This allows you to override the default behavior for a specific custom column type.
 *
 * @param typeKey - The key representing the custom column type.
 * @param mapper - The remapping function to register for the given typeKey.
 */
export const registerRemapFromGraphQL = (
  typeKey: string,
  mapper: RemapFromGraphQLFunction,
): void => {
  remapFromRegistry[typeKey] = mapper;
};

/**
 * Default remapping functions for converting database values to GraphQL values.
 *
 * Handlers included:
 * - date: Converts Date objects to ISO strings.
 * - buffer: Converts Buffer objects to an array of numbers.
 * - bigint: Converts BigInt values to strings.
 * - json: Converts JSON objects to their stringified representation.
 * - array: Recursively remaps array items using remapToGraphQLCore.
 * - default: Returns the value unmodified.
 */
const defaultRemapToMapping: Record<string, RemapToGraphQLFunction> = {
  date: (value) => value instanceof Date ? value.toISOString() : value,
  buffer: (value) => value instanceof Buffer ? Array.from(value) : value,
  bigint: (value) => typeof value === "bigint" ? value.toString() : value,
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

/**
 * Default remapping functions for converting GraphQL input values to database-compatible values.
 *
 * Handlers included:
 * - date: Converts string values to Date objects, validating their correctness.
 * - buffer: Converts arrays to Buffer objects after validating the input.
 * - json: Parses JSON strings into objects.
 * - array: Validates that the input is an array.
 * - bigint: Converts values to BigInt, throwing an error if conversion fails.
 * - default: Returns the value unmodified.
 */
const defaultRemapFromMapping: Record<string, RemapFromGraphQLFunction> = {
  date: (value, _column, columnName) => {
    const formatted = new Date(value);
    if (Number.isNaN(formatted.getTime())) {
      throw new GraphQLError(
        `Field '${columnName}' is not a valid date!`,
      );
    }
    return formatted;
  },
  buffer: (value, _column, columnName) => {
    if (!Array.isArray(value)) {
      throw new GraphQLError(
        `Field '${columnName}' is not an array!`,
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
        }`,
      );
    }
  },
  array: (value, _column, columnName) => {
    if (!Array.isArray(value)) {
      throw new GraphQLError(
        `Field '${columnName}' is not an array!`,
      );
    }
    return value;
  },
  bigint: (value, _column, columnName) => {
    try {
      return BigInt(value);
    } catch (_e) {
      throw new GraphQLError(
        `Field '${columnName}' is not a BigInt!`,
      );
    }
  },
  default: (value) => value,
};

/**
 * Remaps a single value from the database format to a GraphQL-compatible format.
 *
 * The function first checks if a relation mapping exists for the given key in the specified table.
 * If a relation is found, it delegates the remapping to specialized functions for arrays or single objects.
 * Otherwise, it determines the appropriate remapping function from either a custom registry or default mappings,
 * based on the column's type and data type.
 *
 * @param key - The field key associated with the value.
 * @param value - The original database value to be remapped.
 * @param tableName - The name of the table containing the field.
 * @param column - The column definition associated with the value.
 * @param relationMap - Optional mapping of table relations for handling nested or related data.
 * @returns The remapped value, formatted for GraphQL output.
 */
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
  // then fall back to a default based on the column's dataType, or use the identity function.
  const mapper = remapToRegistry[column.columnType] ||
    defaultRemapToMapping[column.dataType] ||
    defaultRemapToMapping.default;
  return mapper(value, column, key, tableName, relationMap);
};

/**
 * Remaps an object representing a single database row to a GraphQL-compatible format.
 *
 * Iterates through each property of the provided object, applying the remapping transformation
 * for each field using `remapToGraphQLCore`. Properties with undefined or null values are removed.
 *
 * @param queryOutput - An object representing a single row retrieved from the database.
 * @param tableName - The name of the table from which the row originates.
 * @param table - The table definition containing the column metadata.
 * @param relationMap - Optional mapping of table relations for handling nested or related data.
 * @returns The transformed object with all applicable values remapped for GraphQL output.
 */
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
      // Assume the table's properties correspond to columns.
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

/**
 * Remaps an array of database rows to a GraphQL-compatible format.
 *
 * Iterates over each entry in the array, applying `remapToGraphQLSingleOutput` to convert each row.
 *
 * @param queryOutput - An array of objects, each representing a row from the database.
 * @param tableName - The name of the table from which the rows originate.
 * @param table - The table definition containing the column metadata.
 * @param relationMap - Optional mapping of table relations for handling nested or related data.
 * @returns The array with each object remapped for GraphQL output.
 */
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

/**
 * Remaps a GraphQL input value to a database-compatible format.
 *
 * Determines the appropriate remapping function based on custom registries and default mappings,
 * then applies it to the provided value.
 *
 * @param value - The input value received from a GraphQL request.
 * @param column - The column definition associated with the value.
 * @param columnName - The name of the column being remapped.
 * @returns The transformed value suitable for database storage.
 */
export const remapFromGraphQLCore = (
  value: any,
  column: Column,
  columnName: string,
) => {
  const mapper = remapFromRegistry[column.columnType] ||
    defaultRemapFromMapping[column.dataType] ||
    defaultRemapFromMapping.default;
  return mapper(value, column, columnName);
};

/**
 * Remaps an object representing a single GraphQL input into a database-compatible format.
 *
 * Iterates through each property in the input object, validating and remapping values using `remapFromGraphQLCore`.
 * Undefined values are removed from the object. If a column does not exist in the table, a GraphQLError is thrown.
 * If a column is non-nullable and the value is null, the property is removed.
 *
 * @param queryInput - An object representing GraphQL input data for a single database row.
 * @param table - The table definition containing column metadata.
 * @returns The transformed object with values remapped to a format suitable for database storage.
 * @throws {GraphQLError} If an unknown column is encountered or non-null constraints are violated.
 */
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

/**
 * Remaps an array of GraphQL input objects to a database-compatible format.
 *
 * Applies `remapFromGraphQLSingleInput` to each entry in the array to transform all values.
 *
 * @param queryInput - An array of objects representing GraphQL input data.
 * @param table - The table definition containing column metadata.
 * @returns The array with each object remapped to a format suitable for database storage.
 */
export const remapFromGraphQLArrayInput = (
  queryInput: Record<string, any>[],
  table: Table,
) => {
  for (const entry of queryInput) {
    remapFromGraphQLSingleInput(entry, table);
  }
  return queryInput;
};

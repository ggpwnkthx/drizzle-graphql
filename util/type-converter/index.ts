import { is } from "drizzle-orm";
import { MySqlInt, MySqlSerial } from "drizzle-orm/mysql-core";
import { type PgArray, PgInteger, PgSerial } from "drizzle-orm/pg-core";
import { SQLiteInteger } from "drizzle-orm/sqlite-core";
import {
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  type GraphQLScalarType,
  GraphQLString,
} from "graphql";

import type { Column } from "drizzle-orm";
import { capitalize } from "../case-ops.ts";
import type { ConvertedColumn } from "./types.ts";

const allowedNameChars = /^[a-zA-Z0-9_]+$/;

const enumMap = new WeakMap<object, GraphQLEnumType>();
const generateEnumCached = (
  column: Column,
  columnName: string,
  tableName: string,
): GraphQLEnumType => {
  if (enumMap.has(column)) return enumMap.get(column)!;

  const gqlEnum = new GraphQLEnumType({
    name: `${capitalize(tableName)}${capitalize(columnName)}Enum`,
    values: Object.fromEntries(
      column.enumValues!.map((e, index) => [
        allowedNameChars.test(e) ? e : `Option${index}`,
        {
          value: e,
          description: `Value: ${e}`,
        },
      ]),
    ),
  });

  enumMap.set(column, gqlEnum);
  return gqlEnum;
};

/**
 * A mapping function receives the current column plus some context and returns a ConvertedColumn.
 */
type DynamicGraphQLTypeFn = (
  column: Column,
  isInput: boolean,
  columnName: string,
  tableName: string,
) => ConvertedColumn<boolean>;

// First, create an empty registry for custom mappings.
const dynamicMappings: { [key: string]: DynamicGraphQLTypeFn } = {};

/**
 * Default mappings for basic data types.
 *
 * (Note that the "array" mapping calls columnToGraphQLCore recursively on the base column.)
 */
const defaultMappings: { [key: string]: DynamicGraphQLTypeFn } = {
  boolean: (_column, _isInput) => ({
    type: GraphQLBoolean,
    description: "Boolean",
  }),
  json: (_column, _isInput) => ({ type: GraphQLString, description: "JSON" }),
  date: (_column, _isInput) => ({ type: GraphQLString, description: "Date" }),
  string: (column, _isInput, columnName, tableName) => {
    if (column.enumValues?.length) {
      return { type: generateEnumCached(column, columnName, tableName) };
    }
    return { type: GraphQLString, description: "String" };
  },
  bigint: (_column, _isInput) => ({
    type: GraphQLString,
    description: "BigInt",
  }),
  number: (column, _isInput) => {
    if (
      is(column, PgInteger) ||
      is(column, PgSerial) ||
      is(column, MySqlInt) ||
      is(column, MySqlSerial) ||
      is(column, SQLiteInteger)
    ) {
      return { type: GraphQLInt, description: "Integer" };
    }
    return { type: GraphQLFloat, description: "Float" };
  },
  buffer: (_column, _isInput) => ({
    type: new GraphQLList(new GraphQLNonNull(GraphQLInt)),
    description: "Buffer",
  }),
  array: (column, isInput, columnName, tableName) => {
    // Assume column.baseColumn is present for arrays.
    const innerMapping = columnToGraphQLCore(
      (column as Column as PgArray<any, any>).baseColumn,
      columnName,
      tableName,
      isInput,
    );
    return {
      type: new GraphQLList(
        new GraphQLNonNull(innerMapping.type as GraphQLScalarType),
      ),
      description: `Array<${innerMapping.description}>`,
    };
  },
};

// Merge default mappings into the registry.
Object.assign(dynamicMappings, defaultMappings);

/**
 * Allows registration of custom GraphQL type mappings.
 *
 * The key can be a dataType (e.g. 'number') or a custom columnType (e.g. 'PgGeometry').
 */
export const registerGraphQLTypeMapping = (
  key: string,
  fn: DynamicGraphQLTypeFn,
): void => {
  dynamicMappings[key] = fn;
};

/**
 * Converts a Drizzle column into a GraphQL type by first checking for a custom mapping keyed by the column’s
 * `columnType` and then falling back to the mapping keyed by the column’s `dataType`.
 *
 * If no mapping is found, an error is thrown.
 */
function columnToGraphQLCore(
  column: Column,
  columnName: string,
  tableName: string,
  isInput: boolean,
): ConvertedColumn<boolean> {
  if (dynamicMappings[column?.columnType]) {
    return dynamicMappings[column.columnType](
      column,
      isInput,
      columnName,
      tableName,
    );
  }
  if (dynamicMappings[column?.dataType]) {
    return dynamicMappings[column.dataType](
      column,
      isInput,
      columnName,
      tableName,
    );
  }
  throw new Error(
    `Drizzle-GraphQL Error: Type ${column.dataType} with columnType ${column.columnType} is not implemented!`,
  );
}

/**
 * Converts a Drizzle column into a GraphQL type.
 *
 * This function wraps the core conversion with additional handling for nullability.
 */
export const drizzleColumnToGraphQLType = <
  TColumn extends Column,
  TIsInput extends boolean,
>(
  column: TColumn,
  columnName: string,
  tableName: string,
  forceNullable = false,
  defaultIsNullable = false,
  isInput: TIsInput = false as TIsInput,
): ConvertedColumn<TIsInput> => {
  const typeDesc = columnToGraphQLCore(column, columnName, tableName, isInput);
  const noDesc = ["string", "boolean", "number"];
  if (noDesc.find((e) => e === column.dataType)) delete typeDesc.description;

  if (forceNullable) return typeDesc as ConvertedColumn<TIsInput>;
  if (
    column.notNull &&
    !(defaultIsNullable && (column.hasDefault || column.defaultFn))
  ) {
    return {
      type: new GraphQLNonNull(typeDesc.type),
      description: typeDesc.description,
    } as ConvertedColumn<TIsInput>;
  }

  return typeDesc as ConvertedColumn<TIsInput>;
};

export * from "./types.ts";

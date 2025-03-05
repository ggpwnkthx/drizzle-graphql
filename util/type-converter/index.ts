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

// Regular expression to validate allowed characters in enum names.
const allowedNameChars = /^[a-zA-Z0-9_]+$/;

// Cache for generated GraphQL enum types to prevent re-creation.
const enumMap = new WeakMap<object, GraphQLEnumType>();

/**
 * Generates and caches a GraphQLEnumType for a given database column that has enum values.
 *
 * This function constructs a GraphQLEnumType with a name derived from the table and column names.
 * If an enum for the column has already been generated, it returns the cached instance.
 *
 * @param column - The database column that contains enum values.
 * @param columnName - The name of the column.
 * @param tableName - The name of the table containing the column.
 * @returns A GraphQLEnumType representing the enum values of the column.
 */
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
 * Function type for dynamically converting a database column into a GraphQL type.
 *
 * This function takes a column along with contextual information and returns a ConvertedColumn,
 * which contains the GraphQL type and an optional description.
 *
 * @param column - The database column to be converted.
 * @param isInput - Indicates whether the conversion is for an input type.
 * @param columnName - The name of the column.
 * @param tableName - The name of the table containing the column.
 * @returns A ConvertedColumn object that includes the GraphQL type and description.
 */
type DynamicGraphQLTypeFn = (
  column: Column,
  isInput: boolean,
  columnName: string,
  tableName: string,
) => ConvertedColumn<boolean>;

/**
 * Registry for dynamic GraphQL type mapping functions.
 *
 * Custom mapping functions can be registered here to override or extend the default behavior.
 */
const dynamicMappings: { [key: string]: DynamicGraphQLTypeFn } = {};

/**
 * Default mappings for converting basic data types from Drizzle columns to GraphQL types.
 *
 * These mappings cover common data types such as boolean, json, date, string, bigint, number, buffer, and array.
 * The "array" mapping recursively calls `columnToGraphQLCore` on the base column.
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

// Merge the default mappings into the dynamic mapping registry.
Object.assign(dynamicMappings, defaultMappings);

/**
 * Registers a custom GraphQL type mapping function.
 *
 * This function allows you to extend or override the default type conversion behavior for a specific
 * data type or custom column type. The provided function will be used when converting Drizzle columns
 * to GraphQL types.
 *
 * @param key - The key representing the dataType (e.g., 'number') or custom columnType (e.g., 'PgGeometry').
 * @param fn - The mapping function that converts a column into a ConvertedColumn.
 */
export const registerGraphQLTypeMapping = (
  key: string,
  fn: DynamicGraphQLTypeFn,
): void => {
  dynamicMappings[key] = fn;
};

/**
 * Core function to convert a Drizzle column into a GraphQL type.
 *
 * The function first checks if a custom mapping is registered for the column's `columnType`. If not,
 * it falls back to checking the mapping for the column's `dataType`. If no mapping is found, an error is thrown.
 *
 * @param column - The Drizzle column to be converted.
 * @param columnName - The name of the column.
 * @param tableName - The name of the table containing the column.
 * @param isInput - Indicates whether the conversion is for an input type.
 * @returns A ConvertedColumn object containing the GraphQL type and an optional description.
 * @throws Will throw an error if no mapping is found for the column's type.
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
 * Converts a Drizzle column into a GraphQL type with proper handling of nullability.
 *
 * This function wraps the core conversion process by first determining the GraphQL type for the column
 * using `columnToGraphQLCore`, and then applying additional logic to enforce non-null constraints.
 *
 * @template TColumn - A type that extends the Drizzle Column type.
 * @template TIsInput - A boolean indicating whether the conversion is for an input type.
 * @param column - The Drizzle column to be converted.
 * @param columnName - The name of the column.
 * @param tableName - The name of the table containing the column.
 * @param forceNullable - If true, the field will remain nullable regardless of column constraints.
 * @param defaultIsNullable - If true and the column has a default value or function, the field will be considered nullable.
 * @param isInput - Indicates whether the conversion is for an input type (default is false).
 * @returns A ConvertedColumn object that includes the GraphQL type and optional description, with nullability applied.
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

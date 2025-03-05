import type {
  Many,
  One,
  Relation,
  Relations,
  Table,
  TableRelationalConfig,
  TablesRelationalConfig,
} from "drizzle-orm";
import type { MySqlDatabase } from "drizzle-orm/mysql-core";
import type { RelationalQueryBuilder as MySqlQuery } from "drizzle-orm/mysql-core/query-builders/query";
import type { PgDatabase } from "drizzle-orm/pg-core";
import type { RelationalQueryBuilder as PgQuery } from "drizzle-orm/pg-core/query-builders/query";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import type { RelationalQueryBuilder as SQLiteQuery } from "drizzle-orm/sqlite-core/query-builders/query";
import type {
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLResolveInfo,
  GraphQLScalarType,
  GraphQLSchema,
} from "graphql";

import type {
  Filters,
  GetRemappedTableDataType,
  GetRemappedTableInsertDataType,
  GetRemappedTableUpdateDataType,
  OrderByArgs,
} from "./util/builders/index.ts";

/**
 * Represents any supported Drizzle database instance.
 *
 * This type union covers PostgreSQL, SQLite, and MySQL databases used with Drizzle-ORM.
 *
 * @template TSchema - The schema definition of the database.
 */
export type AnyDrizzleDB<TSchema extends Record<string, any>> =
  | PgDatabase<any, TSchema>
  | BaseSQLiteDatabase<any, any, TSchema>
  | MySqlDatabase<any, any, TSchema>;

/**
 * Represents any supported query builder instance for the respective Drizzle database.
 *
 * This type union supports query builders for PostgreSQL, MySQL, and SQLite.
 *
 * @template TConfig - The tables relational configuration.
 * @template TFields - The table fields configuration.
 */
export type AnyQueryBuiler<
  TConfig extends TablesRelationalConfig = any,
  TFields extends TableRelationalConfig = any,
> =
  | PgQuery<TConfig, TFields>
  | MySqlQuery<any, TConfig, TFields>
  | SQLiteQuery<any, any, TConfig, TFields>;

/**
 * Extracts the table objects from a schema.
 *
 * Given a schema object where each key can either be a Table or another type, this type
 * returns an object containing only the keys that correspond to Table objects.
 *
 * @template TSchema - The schema object with keys that may or may not be Tables.
 */
export type ExtractTables<TSchema extends Record<string, Table | unknown>> = {
  [K in keyof TSchema as TSchema[K] extends Table ? K : never]:
    TSchema[K] extends Table ? TSchema[K] : never;
};

/**
 * Extracts the relation objects from a schema.
 *
 * Given a schema object where each key can either be Relations or another type, this type
 * returns an object containing only the keys that correspond to Relations.
 *
 * @template TSchema - The schema object with keys that may or may not be Relations.
 */
export type ExtractRelations<TSchema extends Record<string, Table | unknown>> =
  {
    [K in keyof TSchema as TSchema[K] extends Relations ? K : never]:
      TSchema[K] extends Relations ? TSchema[K] : never;
  };

/**
 * Extracts the relation configuration for a specific table from the schema relations.
 *
 * This type maps over the schema relations and extracts the relation configuration corresponding
 * to the specified table name.
 *
 * @template TTable - The table for which to extract relation configurations.
 * @template TSchemaRelations - The schema relations object.
 */
export type ExtractTableRelations<
  TTable extends Table,
  TSchemaRelations extends Record<string, Relations>,
> = {
  [
    K
      in keyof TSchemaRelations as TSchemaRelations[K]["table"]["_"][
        "name"
      ] extends TTable["_"]["name"] ? K
        : never
  ]: TSchemaRelations[K]["table"]["_"]["name"] extends TTable["_"]["name"]
    ? TSchemaRelations[K] extends Relations<any, infer RelationConfig>
      ? RelationConfig
    : never
    : never;
};

/**
 * Extracts a table from the schema by matching its name.
 *
 * This type iterates over the provided table schema and returns the table whose name matches
 * the given name.
 *
 * @template TTableSchema - The object containing table definitions.
 * @template TName - The name of the table to extract.
 */
export type ExtractTableByName<
  TTableSchema extends Record<string, Table>,
  TName extends string,
> = {
  [
    K in keyof TTableSchema as TTableSchema[K]["_"]["name"] extends TName ? K
      : never
  ]: TTableSchema[K]["_"]["name"] extends TName ? TTableSchema[K] : never;
};

/**
 * Represents the result of a mutation that does not return any data.
 *
 * This type is used when a mutation operation is executed in a "returnless" mode.
 */
export type MutationReturnlessResult = {
  isSuccess: boolean;
};

/**
 * Arguments for a query operation on a table.
 *
 * Supports both single and multiple record queries with optional filtering,
 * ordering, offset, and limit parameters.
 *
 * @template TTable - The table on which the query is performed.
 * @template isSingle - A boolean flag indicating whether the query targets a single record.
 */
export type QueryArgs<TTable extends Table, isSingle extends boolean> = Partial<
  (isSingle extends true ? {
      offset: number;
    }
    : {
      offset: number;
      limit: number;
    }) & {
    where: Filters<TTable>;
    orderBy: OrderByArgs<TTable>;
  }
>;

/**
 * Arguments for an insert operation on a table.
 *
 * When inserting a single record, the value is provided as an object.
 * When inserting multiple records, the values are provided as an array of objects.
 *
 * @template TTable - The table into which data will be inserted.
 * @template isSingle - A boolean flag indicating if the operation is a single insert.
 */
export type InsertArgs<TTable extends Table, isSingle extends boolean> =
  isSingle extends true ? {
      values: GetRemappedTableInsertDataType<TTable>;
    }
    : {
      values: Array<GetRemappedTableInsertDataType<TTable>>;
    };

/**
 * Arguments for an update operation on a table.
 *
 * Allows setting new values and optionally filtering which rows to update.
 *
 * @template TTable - The table on which the update operation is performed.
 */
export type UpdateArgs<TTable extends Table> = Partial<{
  set: GetRemappedTableUpdateDataType<TTable>;
  where?: Filters<TTable>;
}>;

/**
 * Arguments for a delete operation on a table.
 *
 * Provides an optional filtering condition to specify which rows should be deleted.
 *
 * @template TTable - The table from which rows will be deleted.
 */
export type DeleteArgs<TTable extends Table> = {
  where?: Filters<TTable>;
};

/**
 * Resolver type for a query that selects multiple records from a table.
 *
 * The resolver returns a promise that resolves to an array of remapped table data, potentially
 * augmented with related data if relations are defined.
 *
 * @template TTable - The table being queried.
 * @template TTables - The collection of all tables in the schema.
 * @template TRelations - The relations associated with the table.
 */
export type SelectResolver<
  TTable extends Table,
  TTables extends Record<string, Table>,
  TRelations extends Record<string, Relation>,
> = (
  source: any,
  args: Partial<QueryArgs<TTable, false>>,
  context: any,
  info: GraphQLResolveInfo,
) => Promise<
  keyof TRelations extends infer RelKey ? RelKey extends string ? Array<
        & GetRemappedTableDataType<TTable>
        & {
          [K in RelKey]: TRelations[K] extends One<string> ?
              | GetRemappedTableDataType<
                ExtractTableByName<
                  TTables,
                  TRelations[K]["referencedTableName"]
                > extends infer T ? T[keyof T]
                  : never
              >
              | null
            : TRelations[K] extends Many<string> ? Array<
                GetRemappedTableDataType<
                  ExtractTableByName<
                    TTables,
                    TRelations[K]["referencedTableName"]
                  > extends infer T ? T[keyof T]
                    : never
                >
              >
            : never;
        }
      >
    : Array<GetRemappedTableDataType<TTable>>
    : Array<GetRemappedTableDataType<TTable>>
>;

/**
 * Resolver type for a query that selects a single record from a table.
 *
 * The resolver returns a promise that resolves to a single remapped table data object,
 * potentially augmented with related data if relations are defined, or null if no record is found.
 *
 * @template TTable - The table being queried.
 * @template TTables - The collection of all tables in the schema.
 * @template TRelations - The relations associated with the table.
 */
export type SelectSingleResolver<
  TTable extends Table,
  TTables extends Record<string, Table>,
  TRelations extends Record<string, Relation>,
> = (
  source: any,
  args: Partial<QueryArgs<TTable, true>>,
  context: any,
  info: GraphQLResolveInfo,
) => Promise<
  | (keyof TRelations extends infer RelKey ? RelKey extends string ?
        & GetRemappedTableDataType<TTable>
        & {
          [K in RelKey]: TRelations[K] extends One<string> ?
              | GetRemappedTableDataType<
                ExtractTableByName<
                  TTables,
                  TRelations[K]["referencedTableName"]
                > extends infer T ? T[keyof T]
                  : never
              >
              | null
            : TRelations[K] extends Many<string> ? Array<
                GetRemappedTableDataType<
                  ExtractTableByName<
                    TTables,
                    TRelations[K]["referencedTableName"]
                  > extends infer T ? T[keyof T]
                    : never
                >
              >
            : never;
        }
    : GetRemappedTableDataType<TTable>
    : GetRemappedTableDataType<TTable>)
  | null
>;

/**
 * Resolver type for an insert operation that returns multiple records.
 *
 * The resolver returns a promise that resolves to either an array of remapped table data or a mutation result
 * indicating success when operating in returnless mode.
 *
 * @template TTable - The table into which data is inserted.
 * @template IsReturnless - A boolean flag indicating if the mutation should be returnless.
 */
export type InsertResolver<TTable extends Table, IsReturnless extends boolean> =
  (
    source: any,
    args: Partial<InsertArgs<TTable, false>>,
    context: any,
    info: GraphQLResolveInfo,
  ) => Promise<
    IsReturnless extends false ? Array<GetRemappedTableDataType<TTable>>
      : MutationReturnlessResult
  >;

/**
 * Resolver type for an insert operation that returns a single record.
 *
 * The resolver returns a promise that resolves to either a single remapped table data object (or undefined)
 * or a mutation result indicating success when operating in returnless mode.
 *
 * @template TTable - The table into which data is inserted.
 * @template IsReturnless - A boolean flag indicating if the mutation should be returnless.
 */
export type InsertArrResolver<
  TTable extends Table,
  IsReturnless extends boolean,
> = (
  source: any,
  args: Partial<InsertArgs<TTable, true>>,
  context: any,
  info: GraphQLResolveInfo,
) => Promise<
  IsReturnless extends false ? GetRemappedTableDataType<TTable> | undefined
    : MutationReturnlessResult
>;

/**
 * Resolver type for an update operation on a table.
 *
 * The resolver returns a promise that resolves to either the updated remapped table data (or undefined)
 * or a mutation result indicating success when operating in returnless mode.
 *
 * @template TTable - The table to be updated.
 * @template IsReturnless - A boolean flag indicating if the mutation should be returnless.
 */
export type UpdateResolver<TTable extends Table, IsReturnless extends boolean> =
  (
    source: any,
    args: UpdateArgs<TTable>,
    context: any,
    info: GraphQLResolveInfo,
  ) => Promise<
    IsReturnless extends false ? GetRemappedTableDataType<TTable> | undefined
      : MutationReturnlessResult
  >;

/**
 * Resolver type for a delete operation on a table.
 *
 * The resolver returns a promise that resolves to either the remapped table data of the deleted record (or undefined)
 * or a mutation result indicating success when operating in returnless mode.
 *
 * @template TTable - The table from which data is deleted.
 * @template IsReturnless - A boolean flag indicating if the mutation should be returnless.
 */
export type DeleteResolver<TTable extends Table, IsReturnless extends boolean> =
  (
    source: any,
    args: DeleteArgs<TTable>,
    context: any,
    info: GraphQLResolveInfo,
  ) => Promise<
    IsReturnless extends false ? GetRemappedTableDataType<TTable> | undefined
      : MutationReturnlessResult
  >;

/**
 * Defines the core query operations for the generated GraphQL schema.
 *
 * This type maps over the schema tables to generate two sets of queries:
 * - A query for multiple records (with pagination and filtering).
 * - A query for a single record.
 *
 * The resulting type is used to build the GraphQL query root type.
 *
 * @template TSchemaTables - The collection of table definitions.
 * @template TSchemaRelations - The collection of relations for the tables.
 * @template TInputs - The collection of generated GraphQL input types.
 * @template TOutputs - The collection of generated GraphQL output types.
 */
export type QueriesCore<
  TSchemaTables extends Record<string, Table>,
  TSchemaRelations extends Record<string, Relations>,
  TInputs extends Record<string, GraphQLInputObjectType>,
  TOutputs extends Record<string, GraphQLObjectType>,
> =
  & {
    [
      TName in keyof TSchemaTables as TName extends string
        ? `${Uncapitalize<TName>}`
        : never
    ]: TName extends string ? {
        type: GraphQLNonNull<
          GraphQLList<
            GraphQLNonNull<TOutputs[`${Capitalize<TName>}SelectItem`]>
          >
        >;
        args: {
          offset: {
            type: GraphQLScalarType<number, number>;
          };
          limit: {
            type: GraphQLScalarType<number, number>;
          };
          orderBy: {
            type: TInputs[`${Capitalize<TName>}OrderBy`] extends
              GraphQLInputObjectType ? TInputs[`${Capitalize<TName>}OrderBy`]
              : never;
          };
          where: {
            type: TInputs[`${Capitalize<TName>}Filters`] extends
              GraphQLInputObjectType ? TInputs[`${Capitalize<TName>}Filters`]
              : never;
          };
        };
        resolve: SelectResolver<
          TSchemaTables[TName],
          TSchemaTables,
          ExtractTableRelations<TSchemaTables[TName], TSchemaRelations> extends
            infer R ? R[keyof R] : never
        >;
      }
      : never;
  }
  & {
    [
      TName in keyof TSchemaTables as TName extends string
        ? `${Uncapitalize<TName>}Single`
        : never
    ]: TName extends string ? {
        type: TOutputs[`${Capitalize<TName>}SelectItem`];
        args: {
          offset: {
            type: GraphQLScalarType<number, number>;
          };
          orderBy: {
            type: TInputs[`${Capitalize<TName>}OrderBy`] extends
              GraphQLInputObjectType ? TInputs[`${Capitalize<TName>}OrderBy`]
              : never;
          };
          where: {
            type: TInputs[`${Capitalize<TName>}Filters`] extends
              GraphQLInputObjectType ? TInputs[`${Capitalize<TName>}Filters`]
              : never;
          };
        };
        resolve: SelectSingleResolver<
          TSchemaTables[TName],
          TSchemaTables,
          ExtractTableRelations<TSchemaTables[TName], TSchemaRelations> extends
            infer R ? R[keyof R] : never
        >;
      }
      : never;
  };

/**
 * Defines the core mutation operations for the generated GraphQL schema.
 *
 * This type maps over the schema tables to generate mutations for:
 * - Inserting multiple records.
 * - Inserting a single record.
 * - Updating records.
 * - Deleting records.
 *
 * The resulting type is used to build the GraphQL mutation root type.
 *
 * @template TSchemaTables - The collection of table definitions.
 * @template TInputs - The collection of generated GraphQL input types.
 * @template TOutputs - The collection of generated GraphQL output types.
 * @template IsReturnless - A flag indicating whether the mutations are returnless.
 */
export type MutationsCore<
  TSchemaTables extends Record<string, Table>,
  TInputs extends Record<string, GraphQLInputObjectType>,
  TOutputs extends Record<string, GraphQLObjectType>,
  IsReturnless extends boolean,
> =
  & {
    [
      TName in keyof TSchemaTables as TName extends string
        ? `insertInto${Capitalize<TName>}`
        : never
    ]: TName extends string ? {
        type: IsReturnless extends true
          ? TOutputs["MutationReturn"] extends GraphQLObjectType
            ? TOutputs["MutationReturn"]
          : never
          : GraphQLNonNull<
            GraphQLList<GraphQLNonNull<TOutputs[`${Capitalize<TName>}Item`]>>
          >;
        args: {
          values: {
            type: GraphQLNonNull<
              GraphQLList<
                GraphQLNonNull<TInputs[`${Capitalize<TName>}InsertInput`]>
              >
            >;
          };
        };
        resolve: InsertArrResolver<TSchemaTables[TName], IsReturnless>;
      }
      : never;
  }
  & {
    [
      TName in keyof TSchemaTables as TName extends string
        ? `insertInto${Capitalize<TName>}Single`
        : never
    ]: TName extends string ? {
        type: IsReturnless extends true
          ? TOutputs["MutationReturn"] extends GraphQLObjectType
            ? TOutputs["MutationReturn"]
          : never
          : TOutputs[`${Capitalize<TName>}Item`];

        args: {
          values: {
            type: GraphQLNonNull<TInputs[`${Capitalize<TName>}InsertInput`]>;
          };
        };
        resolve: InsertResolver<TSchemaTables[TName], IsReturnless>;
      }
      : never;
  }
  & {
    [
      TName in keyof TSchemaTables as TName extends string
        ? `update${Capitalize<TName>}`
        : never
    ]: TName extends string ? {
        type: IsReturnless extends true
          ? TOutputs["MutationReturn"] extends GraphQLObjectType
            ? TOutputs["MutationReturn"]
          : never
          : GraphQLNonNull<
            GraphQLList<GraphQLNonNull<TOutputs[`${Capitalize<TName>}Item`]>>
          >;
        args: {
          set: {
            type: GraphQLNonNull<TInputs[`${Capitalize<TName>}UpdateInput`]>;
          };
          where: {
            type: TInputs[`${Capitalize<TName>}Filters`] extends
              GraphQLInputObjectType ? TInputs[`${Capitalize<TName>}Filters`]
              : never;
          };
        };
        resolve: UpdateResolver<TSchemaTables[TName], IsReturnless>;
      }
      : never;
  }
  & {
    [
      TName in keyof TSchemaTables as TName extends string
        ? `deleteFrom${Capitalize<TName>}`
        : never
    ]: TName extends string ? {
        type: IsReturnless extends true
          ? TOutputs["MutationReturn"] extends GraphQLObjectType
            ? TOutputs["MutationReturn"]
          : never
          : GraphQLNonNull<
            GraphQLList<GraphQLNonNull<TOutputs[`${Capitalize<TName>}Item`]>>
          >;
        args: {
          where: {
            type: TInputs[`${Capitalize<TName>}Filters`] extends
              GraphQLInputObjectType ? TInputs[`${Capitalize<TName>}Filters`]
              : never;
          };
        };
        resolve: DeleteResolver<TSchemaTables[TName], IsReturnless>;
      }
      : never;
  };

/**
 * Defines the generated input types for the GraphQL schema.
 *
 * This type maps over the schema tables to produce the following input types for each table:
 * - Insert input
 * - Update input
 * - OrderBy input
 * - Filters input
 *
 * @template TSchema - The schema containing table definitions.
 */
export type GeneratedInputs<TSchema extends Record<string, Table>> =
  & {
    [
      TName in keyof TSchema as TName extends string
        ? `${Capitalize<TName>}InsertInput`
        : never
    ]: GraphQLInputObjectType;
  }
  & {
    [
      TName in keyof TSchema as TName extends string
        ? `${Capitalize<TName>}UpdateInput`
        : never
    ]: GraphQLInputObjectType;
  }
  & {
    [
      TName in keyof TSchema as TName extends string
        ? `${Capitalize<TName>}OrderBy`
        : never
    ]: GraphQLInputObjectType;
  }
  & {
    [
      TName in keyof TSchema as TName extends string
        ? `${Capitalize<TName>}Filters`
        : never
    ]: GraphQLInputObjectType;
  };

/**
 * Defines the generated output types for the GraphQL schema.
 *
 * For each table, an output type is generated to represent a selected record.
 * Additionally, based on whether mutations are returnless, a common mutation return type
 * or individual item types are generated.
 *
 * @template TSchema - The schema containing table definitions.
 * @template IsReturnless - A boolean flag indicating if the mutations are returnless.
 */
export type GeneratedOutputs<
  TSchema extends Record<string, Table>,
  IsReturnless extends Boolean,
> =
  & {
    [
      TName in keyof TSchema as TName extends string
        ? `${Capitalize<TName>}SelectItem`
        : never
    ]: GraphQLObjectType;
  }
  & (IsReturnless extends true ? {
      MutationReturn: GraphQLObjectType;
    }
    : {
      [
        TName in keyof TSchema as TName extends string
          ? `${Capitalize<TName>}Item`
          : never
      ]: GraphQLObjectType;
    });

/**
 * Represents the complete set of generated entities for the GraphQL schema.
 *
 * This type aggregates the generated queries, mutations, input types, and output types.
 *
 * @template TDatabase - The Drizzle database instance.
 * @template TSchema - The database schema.
 * @template TSchemaTables - The extracted tables from the schema.
 * @template TSchemaRelations - The extracted relations from the schema.
 * @template TInputs - The generated GraphQL input types.
 * @template TOutputs - The generated GraphQL output types.
 */
export type GeneratedEntities<
  TDatabase extends AnyDrizzleDB<TSchema>,
  TSchema extends Record<string, unknown> = TDatabase extends
    AnyDrizzleDB<infer ISchema> ? ISchema : never,
  TSchemaTables extends ExtractTables<TSchema> = ExtractTables<TSchema>,
  TSchemaRelations extends ExtractRelations<TSchema> = ExtractRelations<
    TSchema
  >,
  TInputs extends GeneratedInputs<TSchemaTables> = GeneratedInputs<
    TSchemaTables
  >,
  TOutputs extends GeneratedOutputs<
    TSchemaTables,
    TDatabase extends MySqlDatabase<any, any, any, any> ? true : false
  > = GeneratedOutputs<
    TSchemaTables,
    TDatabase extends MySqlDatabase<any, any, any, any> ? true : false
  >,
> = {
  queries: QueriesCore<TSchemaTables, TSchemaRelations, TInputs, TOutputs>;
  mutations: MutationsCore<
    TSchemaTables,
    TInputs,
    TOutputs,
    TDatabase extends MySqlDatabase<any, any, any, any> ? true : false
  >;
  inputs: TInputs;
  types: TOutputs;
};

/**
 * Represents the generated GraphQL schema and its associated entities.
 *
 * @template TDatabase - The Drizzle database instance used to generate the schema.
 */
export type GeneratedData<
  TDatabase extends AnyDrizzleDB<any>,
> = {
  schema: GraphQLSchema;
  entities: GeneratedEntities<TDatabase>;
};

/**
 * Configuration options for building the GraphQL schema.
 */
export type BuildSchemaConfig = {
  /**
   * Determines whether generated mutations will be included in the returned schema.
   *
   * Set to `false` to omit mutations from the generated schema.
   * By default, mutations are included.
   */
  mutations?: boolean;
  /**
   * Limits the depth of generated relation fields in queries.
   *
   * - Use a non-negative integer to set the maximum relation depth.
   * - Set to `0` to omit relation fields altogether.
   * - Leave undefined to apply no limit.
   * By default, this option is treated as undefined.
   */
  relationsDepthLimit?: number;
};

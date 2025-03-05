import {
  createTableRelationsHelpers,
  is,
  type Relation,
  Relations,
  type Table,
} from "drizzle-orm";
import {
  type BaseSQLiteDatabase,
  type SQLiteColumn,
  SQLiteTable,
} from "drizzle-orm/sqlite-core";
import {
  GraphQLError,
  type GraphQLFieldConfig,
  type GraphQLFieldConfigArgumentMap,
  type GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  type GraphQLObjectType,
  type ThunkObjMap,
} from "graphql";
import { parseResolveInfo } from "graphql-parse-resolve-info";
import type { ResolveTree } from "graphql-parse-resolve-info";

import {
  extractFilters,
  extractOrderBy,
  extractRelationsParams,
  extractSelectedColumnsFromTree,
  extractSelectedColumnsFromTreeSQLFormat,
  generateTableTypes,
  withGraphQLError,
} from "./common.ts";
import { capitalize, uncapitalize } from "../case-ops.ts";
import {
  remapFromGraphQLArrayInput,
  remapFromGraphQLSingleInput,
  remapToGraphQLArrayOutput,
  remapToGraphQLSingleOutput,
} from "../data-mappers.ts";

import type { GeneratedEntities } from "../../types.ts";
import type { RelationalQueryBuilder } from "drizzle-orm/sqlite-core/query-builders/query";
import type {
  CreatedResolver,
  Filters,
  TableNamedRelations,
  TableSelectArgs,
} from "./types.ts";

/**
 * Retrieves the query builder for a specified table from the SQLite database instance.
 *
 * This function extracts the query builder corresponding to the provided table name from the database's query object.
 * If the query builder is not found, it throws an error indicating that the table was not found in the database instance.
 *
 * @param db - The SQLite database instance.
 * @param tableName - The name of the table for which to retrieve the query builder.
 * @returns The relational query builder for the specified table.
 * @throws Error if the query builder for the table does not exist.
 */
function getQueryBase(
  db: BaseSQLiteDatabase<any, any, any, any>,
  tableName: string,
): RelationalQueryBuilder<any, any, any, any> {
  const queryBase = db.query[tableName as keyof typeof db.query] as unknown as
    | RelationalQueryBuilder<any, any, any, any>
    | undefined;
  if (!queryBase) {
    throw new Error(
      `Drizzle-GraphQL Error: Table ${tableName} not found in the database instance.`,
    );
  }
  return queryBase;
}

/**
 * Generates a select resolver for retrieving either a single record or multiple records from a table.
 *
 * This function creates a resolver that:
 * - Extracts and processes the GraphQL query information using the resolve info.
 * - Determines the selected columns, order, filter conditions, and relation parameters.
 * - Executes the appropriate database query (findFirst for single record or findMany for multiple records).
 * - Remaps the query result to the appropriate GraphQL output format.
 *
 * @param db - The SQLite database instance.
 * @param tableName - The name of the table to query.
 * @param tables - A mapping of all tables in the schema.
 * @param relationMap - A mapping of table relations keyed by table name.
 * @param orderArgs - The GraphQL input object type defining ordering arguments.
 * @param filterArgs - The GraphQL input object type defining filter arguments.
 * @param single - A boolean flag indicating whether to query a single record (true) or multiple records (false).
 * @returns A CreatedResolver object containing the resolver name, arguments, and resolver function.
 */
const generateSelect = (
  db: BaseSQLiteDatabase<any, any, any, any>,
  tableName: string,
  tables: Record<string, Table>,
  relationMap: Record<string, Record<string, TableNamedRelations>>,
  orderArgs: GraphQLInputObjectType,
  filterArgs: GraphQLInputObjectType,
  single: boolean,
): CreatedResolver => {
  const queryBase = getQueryBase(db, tableName);
  const typeName = `${capitalize(tableName)}SelectItem`;
  const table = tables[tableName]!;

  const args: GraphQLFieldConfigArgumentMap = {
    offset: { type: GraphQLInt },
    orderBy: { type: orderArgs },
    where: { type: filterArgs },
    ...(!single && { limit: { type: GraphQLInt } }),
  };

  return {
    name: single ? `${uncapitalize(tableName)}Single` : uncapitalize(tableName),
    args,
    resolver: withGraphQLError(
      async (source, args: Partial<TableSelectArgs>, context, info) => {
        const { offset, limit, orderBy, where } = args;
        const parsedInfo = parseResolveInfo(info, {
          deep: true,
        }) as ResolveTree;

        // Extract the selected fields from the parsed resolve info.
        const selectedFields = parsedInfo.fieldsByTypeName[typeName]!;
        // Determine which columns are selected based on the GraphQL query.
        const columns = extractSelectedColumnsFromTree(selectedFields, table);
        // Build the order by clause if provided.
        const orderByClause = orderBy
          ? extractOrderBy(table, orderBy)
          : undefined;
        // Build the where clause if provided.
        const whereClause = where
          ? extractFilters(table, tableName, where)
          : undefined;
        // Extract relation parameters for nested queries if available.
        const withClause = relationMap[tableName]
          ? extractRelationsParams(
            relationMap,
            tables,
            tableName,
            parsedInfo,
            typeName,
          )
          : undefined;

        // Execute the query using the appropriate method based on the 'single' flag.
        const query = single
          ? queryBase.findFirst({
            columns,
            offset,
            orderBy: orderByClause,
            where: whereClause,
            with: withClause,
          })
          : queryBase.findMany({
            columns,
            offset,
            limit,
            orderBy: orderByClause,
            where: whereClause,
            with: withClause,
          });

        const result = await query;
        // Remap the query result to the appropriate GraphQL output format.
        if (Array.isArray(result)) {
          return remapToGraphQLArrayOutput(
            result,
            tableName,
            table,
            relationMap,
          );
        }
        return result
          ? remapToGraphQLSingleOutput(result, tableName, table, relationMap)
          : undefined;
      },
    ),
  };
};

/**
 * Generates an insert resolver for handling single or batch insert operations.
 *
 * This function creates a resolver that:
 * - Accepts input values (single object or array of objects).
 * - Remaps the input data from GraphQL format to the database format.
 * - Executes the insert operation on the table, with conflict resolution (do nothing on conflict).
 * - Returns the inserted record(s) after remapping them to GraphQL output format.
 *
 * @param db - The SQLite database instance.
 * @param tableName - The name of the table into which data will be inserted.
 * @param table - The SQLite table definition.
 * @param baseType - The GraphQL input object type representing the table insert input.
 * @param single - A boolean flag indicating whether the insert is for a single record (true) or multiple records (false).
 * @returns A CreatedResolver object containing the resolver name, arguments, and resolver function.
 */
const generateInsert = (
  db: BaseSQLiteDatabase<any, any, any, any>,
  tableName: string,
  table: SQLiteTable,
  baseType: GraphQLInputObjectType,
  single: boolean,
): CreatedResolver => {
  const queryName = single
    ? `insertInto${capitalize(tableName)}Single`
    : `insertInto${capitalize(tableName)}`;
  const typeName = `${capitalize(tableName)}Item`;

  const queryArgs: GraphQLFieldConfigArgumentMap = {
    values: {
      type: new GraphQLNonNull(
        single ? baseType : new GraphQLList(new GraphQLNonNull(baseType)),
      ),
    },
  };

  return {
    name: queryName,
    args: queryArgs,
    resolver: withGraphQLError(
      async (source, args: { values: any }, context, info) => {
        // Remap input data from GraphQL to the database format.
        const input = single
          ? remapFromGraphQLSingleInput(args.values, table)
          : remapFromGraphQLArrayInput(args.values, table);
        if (!single && !input.length) {
          throw new GraphQLError("No values were provided!");
        }
        const parsedInfo = parseResolveInfo(info, {
          deep: true,
        }) as ResolveTree;
        const selectedFields = parsedInfo.fieldsByTypeName[typeName]!;
        // Extract the columns to be returned after insertion.
        const columns = extractSelectedColumnsFromTreeSQLFormat<SQLiteColumn>(
          selectedFields,
          table,
        );

        const result = await db
          .insert(table)
          .values(input)
          .returning(columns)
          .onConflictDoNothing();

        return single
          ? result[0]
            ? remapToGraphQLSingleOutput(result[0], tableName, table)
            : undefined
          : remapToGraphQLArrayOutput(result, tableName, table);
      },
    ),
  };
};

/**
 * Generates a resolver for update or delete operations on a table.
 *
 * This function creates a resolver that handles either update or delete operations.
 * For update operations, it remaps the input values and applies them via the update query.
 * For delete operations, it constructs a delete query.
 * In both cases, it applies filtering conditions and returns the modified records remapped to GraphQL format.
 *
 * @param db - The SQLite database instance.
 * @param tableName - The name of the table to modify.
 * @param table - The SQLite table definition.
 * @param filterArgs - The GraphQL input object type representing filter arguments.
 * @param inputType - The GraphQL input object type representing update input (only applicable for update operations).
 * @param operation - The type of operation: either "update" or "delete".
 * @returns A CreatedResolver object containing the resolver name, arguments, and resolver function.
 */
const generateModify = (
  db: BaseSQLiteDatabase<any, any, any, any>,
  tableName: string,
  table: SQLiteTable,
  filterArgs: GraphQLInputObjectType,
  inputType: GraphQLInputObjectType | undefined, // only for update
  operation: "update" | "delete",
): CreatedResolver => {
  const queryName = operation === "update"
    ? `update${capitalize(tableName)}`
    : `deleteFrom${capitalize(tableName)}`;
  const typeName = `${capitalize(tableName)}Item`;

  const queryArgs: GraphQLFieldConfigArgumentMap = operation === "update"
    ? {
      set: { type: new GraphQLNonNull(inputType!) },
      where: { type: filterArgs },
    }
    : { where: { type: filterArgs } };

  return {
    name: queryName,
    args: queryArgs,
    resolver: withGraphQLError(
      async (
        source,
        args: { where?: Filters<Table>; set?: Record<string, any> },
        context,
        info,
      ) => {
        const parsedInfo = parseResolveInfo(info, {
          deep: true,
        }) as ResolveTree;
        const selectedFields = parsedInfo.fieldsByTypeName[typeName]!;
        // Extract the columns that should be returned after the operation.
        const columns = extractSelectedColumnsFromTreeSQLFormat<SQLiteColumn>(
          selectedFields,
          table,
        );

        let query;
        if (operation === "update") {
          // Remap the update input data from GraphQL format.
          const input = remapFromGraphQLSingleInput(args.set!, table);
          if (!Object.keys(input).length) {
            throw new GraphQLError(
              "Unable to update with no values specified!",
            );
          }
          query = db.update(table).set(input);
        } else {
          query = db.delete(table);
        }

        if (args.where) {
          const filters = extractFilters(table, tableName, args.where);
          query = query.where(filters) as any;
        }
        query = query.returning(columns) as any;
        const result = await query;
        return remapToGraphQLArrayOutput(result, tableName, table);
      },
    ),
  };
};

/**
 * Generates the complete GraphQL schema data from the provided Drizzle-ORM schema and SQLite database instance.
 *
 * This function processes the schema to extract table definitions and relations, then generates:
 * - GraphQL query resolvers for selecting records.
 * - GraphQL mutation resolvers for inserting, updating, and deleting records.
 * - GraphQL input and output types for each table.
 *
 * The resulting schema data includes queries, mutations, inputs, and types which can be used to build a complete
 * GraphQL schema.
 *
 * @template TDrizzleInstance - The type of the SQLite database instance.
 * @template TSchema - The Drizzle-ORM schema object, mapping table names to table definitions.
 * @param db - The SQLite database instance.
 * @param schema - The Drizzle-ORM schema object.
 * @param relationsDepthLimit - Optional limit for the depth of generated relation fields in queries.
 * @returns An object containing the generated queries, mutations, inputs, and output types.
 * @throws Error if no tables are detected in the provided schema.
 */
export const generateSchemaData = <
  TDrizzleInstance extends BaseSQLiteDatabase<any, any, any, any>,
  TSchema extends Record<string, Table | unknown>,
>(
  db: TDrizzleInstance,
  schema: TSchema,
  relationsDepthLimit?: number,
): GeneratedEntities<TDrizzleInstance, TSchema> => {
  const schemaEntries = Object.entries(schema);

  // Filter out table entries.
  const tableEntries = schemaEntries.filter(([_key, value]) =>
    is(value, SQLiteTable)
  ) as [string, SQLiteTable][];
  if (!tableEntries.length) {
    throw new Error(
      "Drizzle-GraphQL Error: No tables detected in Drizzle-ORM's database instance. Did you forget to pass schema to the drizzle constructor?",
    );
  }
  const tables = Object.fromEntries(tableEntries);

  // Process relations from the schema.
  const rawRelations = schemaEntries
    .filter(([_key, value]) => is(value, Relations))
    .map<[string, Relations]>(([_key, value]) => {
      const tableName = tableEntries.find(
        ([_tableName, tableValue]) => tableValue === (value as Relations).table,
      )![0];
      return [tableName, value as Relations];
    })
    .map<[string, Record<string, Relation>]>(([tableName, relValue]) => [
      tableName,
      relValue.config(createTableRelationsHelpers(tables[tableName]!)),
    ]);

  const namedRelations = Object.fromEntries(
    rawRelations.map(([relName, config]) => {
      const namedConfig: Record<string, TableNamedRelations> = Object
        .fromEntries(
          Object.entries(config).map(([innerRelName, innerRelValue]) => {
            const targetTableName = tableEntries.find(
              ([_tableName, tableValue]) =>
                tableValue === innerRelValue.referencedTable,
            )![0];
            return [
              innerRelName,
              { relation: innerRelValue, targetTableName },
            ];
          }),
        );
      return [relName, namedConfig];
    }),
  );

  const queries: ThunkObjMap<GraphQLFieldConfig<any, any>> = {};
  const mutations: ThunkObjMap<GraphQLFieldConfig<any, any>> = {};
  const gqlSchemaTypes = Object.fromEntries(
    Object.entries(tables).map(([tableName, _table]) => [
      tableName,
      generateTableTypes(
        tableName,
        tables,
        namedRelations,
        true,
        relationsDepthLimit,
      ),
    ]),
  );

  const inputs: Record<string, GraphQLInputObjectType> = {};
  const outputs: Record<string, GraphQLObjectType> = {};

  for (const [tableName, tableTypes] of Object.entries(gqlSchemaTypes)) {
    const { insertInput, updateInput, tableFilters, tableOrder } =
      tableTypes.inputs;
    const {
      selectSingleOutput,
      selectArrOutput,
      singleTableItemOutput,
      arrTableItemOutput,
    } = tableTypes.outputs;

    const selectArrResolver = generateSelect(
      db,
      tableName,
      tables,
      namedRelations,
      tableOrder,
      tableFilters,
      false,
    );
    const selectSingleResolver = generateSelect(
      db,
      tableName,
      tables,
      namedRelations,
      tableOrder,
      tableFilters,
      true,
    );
    const insertArrResolver = generateInsert(
      db,
      tableName,
      schema[tableName] as SQLiteTable,
      insertInput,
      false,
    );
    const insertSingleResolver = generateInsert(
      db,
      tableName,
      schema[tableName] as SQLiteTable,
      insertInput,
      true,
    );
    const updateResolver = generateModify(
      db,
      tableName,
      schema[tableName] as SQLiteTable,
      tableFilters,
      updateInput,
      "update",
    );
    const deleteResolver = generateModify(
      db,
      tableName,
      schema[tableName] as SQLiteTable,
      tableFilters,
      undefined,
      "delete",
    );

    queries[selectArrResolver.name] = {
      type: selectArrOutput,
      args: selectArrResolver.args,
      resolve: selectArrResolver.resolver,
    };
    queries[selectSingleResolver.name] = {
      type: selectSingleOutput,
      args: selectSingleResolver.args,
      resolve: selectSingleResolver.resolver,
    };
    mutations[insertArrResolver.name] = {
      type: arrTableItemOutput,
      args: insertArrResolver.args,
      resolve: insertArrResolver.resolver,
    };
    mutations[insertSingleResolver.name] = {
      type: singleTableItemOutput,
      args: insertSingleResolver.args,
      resolve: insertSingleResolver.resolver,
    };
    mutations[updateResolver.name] = {
      type: arrTableItemOutput,
      args: updateResolver.args,
      resolve: updateResolver.resolver,
    };
    mutations[deleteResolver.name] = {
      type: arrTableItemOutput,
      args: deleteResolver.args,
      resolve: deleteResolver.resolver,
    };

    // Collect common inputs and outputs.
    [insertInput, updateInput, tableFilters, tableOrder].forEach((input) => {
      inputs[input.name] = input;
    });
    outputs[selectSingleOutput.name] = selectSingleOutput;
    outputs[singleTableItemOutput.name] = singleTableItemOutput;
  }

  return { queries, mutations, inputs, types: outputs } as any;
};

import {
  createTableRelationsHelpers,
  is,
  type Relation,
  Relations,
  type Table,
} from "drizzle-orm";
import { type PgColumn, type PgDatabase, PgTable } from "drizzle-orm/pg-core";
import {
  GraphQLError,
  type GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  type GraphQLObjectType,
} from "graphql";

import {
  extractFilters,
  extractOrderBy,
  extractRelationsParams,
  extractSelectedColumnsFromTree,
  extractSelectedColumnsFromTreeSQLFormat,
  generateTableTypes,
} from "./common.ts";
import { capitalize, uncapitalize } from "../case-ops.ts";
import {
  remapFromGraphQLArrayInput,
  remapFromGraphQLSingleInput,
  remapToGraphQLArrayOutput,
  remapToGraphQLSingleOutput,
} from "../data-mappers.ts";
import { parseResolveInfo } from "graphql-parse-resolve-info";

import type { GeneratedEntities } from "../../types.ts";
import type { RelationalQueryBuilder } from "drizzle-orm/pg-core/query-builders/query";
import type {
  GraphQLFieldConfig,
  GraphQLFieldConfigArgumentMap,
  ThunkObjMap,
} from "graphql";
import type { ResolveTree } from "graphql-parse-resolve-info";
import type {
  CreatedResolver,
  Filters,
  TableNamedRelations,
  TableSelectArgs,
} from "./types.ts";

/**
 * Generates a resolver for selecting an array of records from a PostgreSQL table.
 *
 * This function constructs a GraphQL field resolver that handles fetching multiple records
 * (i.e. findMany) from the specified table. It extracts the selected columns, applies ordering,
 * filtering, and relation parameters based on the GraphQL resolve info and provided arguments,
 * and finally remaps the raw query results into the appropriate GraphQL output format.
 *
 * @param db - The PostgreSQL database instance.
 * @param tableName - The name of the table to query.
 * @param tables - A record mapping table names to their corresponding Table definitions.
 * @param relationMap - A mapping of table names to their relations (with inner relation configurations).
 * @param orderArgs - The GraphQL input type defining ordering arguments.
 * @param filterArgs - The GraphQL input type defining filtering arguments.
 * @returns A CreatedResolver object containing the resolver name, arguments, and the resolver function.
 * @throws Error if the query builder for the specified table is not found.
 */
const generateSelectArray = (
  db: PgDatabase<any, any, any>,
  tableName: string,
  tables: Record<string, Table>,
  relationMap: Record<string, Record<string, TableNamedRelations>>,
  orderArgs: GraphQLInputObjectType,
  filterArgs: GraphQLInputObjectType,
): CreatedResolver => {
  const queryName = `${uncapitalize(tableName)}`;
  const queryBase = db.query[tableName as keyof typeof db.query] as unknown as
    | RelationalQueryBuilder<any, any>
    | undefined;
  if (!queryBase) {
    throw new Error(
      `Drizzle-GraphQL Error: Table ${tableName} not found in drizzle instance. Did you forget to pass schema to drizzle constructor?`,
    );
  }

  const queryArgs = {
    offset: {
      type: GraphQLInt,
    },
    limit: {
      type: GraphQLInt,
    },
    orderBy: {
      type: orderArgs,
    },
    where: {
      type: filterArgs,
    },
  } as GraphQLFieldConfigArgumentMap;

  const typeName = `${capitalize(tableName)}SelectItem`;
  const table = tables[tableName]!;

  return {
    name: queryName,
    resolver: async (
      _source,
      args: Partial<TableSelectArgs>,
      _context,
      info,
    ) => {
      try {
        const { offset, limit, orderBy, where } = args;

        const parsedInfo = parseResolveInfo(info, {
          deep: true,
        }) as ResolveTree;

        const query = queryBase.findMany({
          columns: extractSelectedColumnsFromTree(
            parsedInfo.fieldsByTypeName[typeName]!,
            table,
          ),
          offset,
          limit,
          orderBy: orderBy ? extractOrderBy(table, orderBy) : undefined,
          where: where ? extractFilters(table, tableName, where) : undefined,
          with: relationMap[tableName]
            ? extractRelationsParams(
              relationMap,
              tables,
              tableName,
              parsedInfo,
              typeName,
            )
            : undefined,
        });

        const result = await query;

        return remapToGraphQLArrayOutput(result, tableName, table, relationMap);
      } catch (e) {
        if (typeof e === "object" && typeof (<any> e).message === "string") {
          throw new GraphQLError((<any> e).message);
        }

        throw e;
      }
    },
    args: queryArgs,
  };
};

/**
 * Generates a resolver for selecting a single record from a PostgreSQL table.
 *
 * This function constructs a GraphQL field resolver that handles fetching a single record
 * (i.e. findFirst) from the specified table. It extracts the selected columns, applies ordering
 * and filtering, and remaps the result to the appropriate GraphQL output format.
 *
 * @param db - The PostgreSQL database instance.
 * @param tableName - The name of the table to query.
 * @param tables - A record mapping table names to their corresponding Table definitions.
 * @param relationMap - A mapping of table names to their relations (with inner relation configurations).
 * @param orderArgs - The GraphQL input type defining ordering arguments.
 * @param filterArgs - The GraphQL input type defining filtering arguments.
 * @returns A CreatedResolver object containing the resolver name, arguments, and the resolver function.
 * @throws Error if the query builder for the specified table is not found.
 */
const generateSelectSingle = (
  db: PgDatabase<any, any, any>,
  tableName: string,
  tables: Record<string, Table>,
  relationMap: Record<string, Record<string, TableNamedRelations>>,
  orderArgs: GraphQLInputObjectType,
  filterArgs: GraphQLInputObjectType,
): CreatedResolver => {
  const queryName = `${uncapitalize(tableName)}Single`;
  const queryBase = db.query[tableName as keyof typeof db.query] as unknown as
    | RelationalQueryBuilder<any, any>
    | undefined;
  if (!queryBase) {
    throw new Error(
      `Drizzle-GraphQL Error: Table ${tableName} not found in drizzle instance. Did you forget to pass schema to drizzle constructor?`,
    );
  }

  const queryArgs = {
    offset: {
      type: GraphQLInt,
    },
    orderBy: {
      type: orderArgs,
    },
    where: {
      type: filterArgs,
    },
  } as GraphQLFieldConfigArgumentMap;

  const typeName = `${capitalize(tableName)}SelectItem`;
  const table = tables[tableName]!;

  return {
    name: queryName,
    resolver: async (
      _source,
      args: Partial<TableSelectArgs>,
      _context,
      info,
    ) => {
      try {
        const { offset, orderBy, where } = args;

        const parsedInfo = parseResolveInfo(info, {
          deep: true,
        }) as ResolveTree;

        const query = queryBase.findFirst({
          columns: extractSelectedColumnsFromTree(
            parsedInfo.fieldsByTypeName[typeName]!,
            table,
          ),
          offset,
          orderBy: orderBy ? extractOrderBy(table, orderBy) : undefined,
          where: where ? extractFilters(table, tableName, where) : undefined,
          with: relationMap[tableName]
            ? extractRelationsParams(
              relationMap,
              tables,
              tableName,
              parsedInfo,
              typeName,
            )
            : undefined,
        });

        const result = await query;
        if (!result) return undefined;

        return remapToGraphQLSingleOutput(
          result,
          tableName,
          table,
          relationMap,
        );
      } catch (e) {
        if (typeof e === "object" && typeof (<any> e).message === "string") {
          throw new GraphQLError((<any> e).message);
        }

        throw e;
      }
    },
    args: queryArgs,
  };
};

/**
 * Generates a resolver for inserting an array of records into a PostgreSQL table.
 *
 * This function creates a GraphQL field resolver that handles batch insert operations.
 * It remaps the input data from GraphQL format to the database format, executes the insert,
 * and returns the inserted records remapped into GraphQL output format.
 *
 * @param db - The PostgreSQL database instance.
 * @param tableName - The name of the table into which data will be inserted.
 * @param table - The PostgreSQL table definition.
 * @param baseType - The GraphQL input type representing the table's insert input.
 * @returns A CreatedResolver object containing the resolver name, arguments, and the resolver function.
 * @throws GraphQLError if no values are provided for insertion.
 */
const generateInsertArray = (
  db: PgDatabase<any, any, any>,
  tableName: string,
  table: PgTable,
  baseType: GraphQLInputObjectType,
): CreatedResolver => {
  const queryName = `insertInto${capitalize(tableName)}`;
  const typeName = `${capitalize(tableName)}Item`;

  const queryArgs: GraphQLFieldConfigArgumentMap = {
    values: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(baseType))),
    },
  };

  return {
    name: queryName,
    resolver: async (
      _source,
      args: { values: Record<string, any>[] },
      _context,
      info,
    ) => {
      try {
        const input = remapFromGraphQLArrayInput(args.values, table);
        if (!input.length) throw new GraphQLError("No values were provided!");

        const parsedInfo = parseResolveInfo(info, {
          deep: true,
        }) as ResolveTree;

        const columns = extractSelectedColumnsFromTreeSQLFormat<PgColumn>(
          parsedInfo.fieldsByTypeName[typeName]!,
          table,
        );

        const result = await db.insert(table).values(input).returning(columns)
          .onConflictDoNothing();

        return remapToGraphQLArrayOutput(result, tableName, table);
      } catch (e) {
        if (typeof e === "object" && typeof (<any> e).message === "string") {
          throw new GraphQLError((<any> e).message);
        }
        throw e;
      }
    },
    args: queryArgs,
  };
};

/**
 * Generates a resolver for inserting a single record into a PostgreSQL table.
 *
 * This function creates a GraphQL field resolver for single record insertion.
 * It remaps the input data from GraphQL format to the database format, performs the insert,
 * and returns the inserted record remapped into GraphQL output format.
 *
 * @param db - The PostgreSQL database instance.
 * @param tableName - The name of the table into which data will be inserted.
 * @param table - The PostgreSQL table definition.
 * @param baseType - The GraphQL input type representing the table's insert input.
 * @returns A CreatedResolver object containing the resolver name, arguments, and the resolver function.
 */
const generateInsertSingle = (
  db: PgDatabase<any, any, any>,
  tableName: string,
  table: PgTable,
  baseType: GraphQLInputObjectType,
): CreatedResolver => {
  const queryName = `insertInto${capitalize(tableName)}Single`;
  const typeName = `${capitalize(tableName)}Item`;

  const queryArgs: GraphQLFieldConfigArgumentMap = {
    values: {
      type: new GraphQLNonNull(baseType),
    },
  };

  return {
    name: queryName,
    resolver: async (
      _source,
      args: { values: Record<string, any> },
      _context,
      info,
    ) => {
      try {
        const input = remapFromGraphQLSingleInput(args.values, table);

        const parsedInfo = parseResolveInfo(info, {
          deep: true,
        }) as ResolveTree;

        const columns = extractSelectedColumnsFromTreeSQLFormat<PgColumn>(
          parsedInfo.fieldsByTypeName[typeName]!,
          table,
        );

        const result = await db.insert(table).values(input).returning(columns)
          .onConflictDoNothing();

        if (!result[0]) return undefined;

        return remapToGraphQLSingleOutput(result[0], tableName, table);
      } catch (e) {
        if (typeof e === "object" && typeof (<any> e).message === "string") {
          throw new GraphQLError((<any> e).message);
        }
        throw e;
      }
    },
    args: queryArgs,
  };
};

/**
 * Generates a resolver for updating records in a PostgreSQL table.
 *
 * This function creates a GraphQL field resolver for update operations.
 * It remaps the update input data from GraphQL format to the database format, constructs
 * an update query with optional filtering conditions, and returns the updated records
 * remapped into GraphQL output format.
 *
 * @param db - The PostgreSQL database instance.
 * @param tableName - The name of the table to update.
 * @param table - The PostgreSQL table definition.
 * @param setArgs - The GraphQL input type representing the update input.
 * @param filterArgs - The GraphQL input type representing filter arguments.
 * @returns A CreatedResolver object containing the resolver name, arguments, and the resolver function.
 * @throws GraphQLError if no update values are specified.
 */
const generateUpdate = (
  db: PgDatabase<any, any, any>,
  tableName: string,
  table: PgTable,
  setArgs: GraphQLInputObjectType,
  filterArgs: GraphQLInputObjectType,
): CreatedResolver => {
  const queryName = `update${capitalize(tableName)}`;
  const typeName = `${capitalize(tableName)}Item`;

  const queryArgs = {
    set: {
      type: new GraphQLNonNull(setArgs),
    },
    where: {
      type: filterArgs,
    },
  } as const satisfies GraphQLFieldConfigArgumentMap;

  return {
    name: queryName,
    resolver: async (
      _source,
      args: { where?: Filters<Table>; set: Record<string, any> },
      _context,
      info,
    ) => {
      try {
        const { where, set } = args;

        const parsedInfo = parseResolveInfo(info, {
          deep: true,
        }) as ResolveTree;

        const columns = extractSelectedColumnsFromTreeSQLFormat<PgColumn>(
          parsedInfo.fieldsByTypeName[typeName]!,
          table,
        );

        const input = remapFromGraphQLSingleInput(set, table);
        if (!Object.keys(input).length) {
          throw new GraphQLError("Unable to update with no values specified!");
        }

        let query = db.update(table).set(input);
        if (where) {
          const filters = extractFilters(table, tableName, where);
          query = query.where(filters) as any;
        }

        query = query.returning(columns) as any;

        const result = await query;

        return remapToGraphQLArrayOutput(result, tableName, table);
      } catch (e) {
        if (typeof e === "object" && typeof (<any> e).message === "string") {
          throw new GraphQLError((<any> e).message);
        }
        throw e;
      }
    },
    args: queryArgs,
  };
};

/**
 * Generates a resolver for deleting records from a PostgreSQL table.
 *
 * This function creates a GraphQL field resolver for delete operations.
 * It constructs a delete query with optional filtering conditions and returns the deleted records
 * remapped into GraphQL output format.
 *
 * @param db - The PostgreSQL database instance.
 * @param tableName - The name of the table from which to delete records.
 * @param table - The PostgreSQL table definition.
 * @param filterArgs - The GraphQL input type representing filter arguments.
 * @returns A CreatedResolver object containing the resolver name, arguments, and the resolver function.
 */
const generateDelete = (
  db: PgDatabase<any, any, any>,
  tableName: string,
  table: PgTable,
  filterArgs: GraphQLInputObjectType,
): CreatedResolver => {
  const queryName = `deleteFrom${capitalize(tableName)}`;
  const typeName = `${capitalize(tableName)}Item`;

  const queryArgs = {
    where: {
      type: filterArgs,
    },
  } as const satisfies GraphQLFieldConfigArgumentMap;

  return {
    name: queryName,
    resolver: async (
      _source,
      args: { where?: Filters<Table> },
      _context,
      info,
    ) => {
      try {
        const { where } = args;

        const parsedInfo = parseResolveInfo(info, {
          deep: true,
        }) as ResolveTree;

        const columns = extractSelectedColumnsFromTreeSQLFormat<PgColumn>(
          parsedInfo.fieldsByTypeName[typeName]!,
          table,
        );

        let query = db.delete(table);
        if (where) {
          const filters = extractFilters(table, tableName, where);
          query = query.where(filters) as any;
        }

        query = query.returning(columns) as any;

        const result = await query;

        return remapToGraphQLArrayOutput(result, tableName, table);
      } catch (e) {
        if (typeof e === "object" && typeof (<any> e).message === "string") {
          throw new GraphQLError((<any> e).message);
        }
        throw e;
      }
    },
    args: queryArgs,
  };
};

/**
 * Generates the complete GraphQL schema data from the provided Drizzle-ORM schema and PostgreSQL database instance.
 *
 * This function processes the Drizzle-ORM schema to extract table definitions and relations, then generates:
 * - GraphQL query resolvers for selecting records.
 * - GraphQL mutation resolvers for inserting, updating, and deleting records.
 * - GraphQL input and output types for each table.
 *
 * The resulting schema data includes queries, mutations, inputs, and output types which can be used to build a complete
 * GraphQL schema.
 *
 * @template TDrizzleInstance - The PostgreSQL database instance type.
 * @template TSchema - The Drizzle-ORM schema object mapping table names to table definitions.
 * @param db - The PostgreSQL database instance.
 * @param schema - The Drizzle-ORM schema object.
 * @param relationsDepthLimit - Optional limit for the depth of generated relation fields in queries.
 * @returns An object containing the generated queries, mutations, inputs, and output types.
 * @throws Error if no tables are detected in the provided schema.
 */
export const generateSchemaData = <
  TDrizzleInstance extends PgDatabase<any, any, any>,
  TSchema extends Record<string, Table | unknown>,
>(
  db: TDrizzleInstance,
  schema: TSchema,
  relationsDepthLimit: number | undefined,
): GeneratedEntities<TDrizzleInstance, TSchema> => {
  const rawSchema = schema;
  const schemaEntries = Object.entries(rawSchema);

  const tableEntries = schemaEntries.filter(([_key, value]) =>
    is(value, PgTable)
  ) as [string, PgTable][];
  const tables = Object.fromEntries(tableEntries) as Record<
    string,
    PgTable
  >;

  if (!tableEntries.length) {
    throw new Error(
      "Drizzle-GraphQL Error: No tables detected in Drizzle-ORM's database instance. Did you forget to pass schema to drizzle constructor?",
    );
  }

  const rawRelations = schemaEntries
    .filter(([_key, value]) => is(value, Relations))
    .map<[string, Relations]>(([_key, value]) => [
      tableEntries.find(
        ([_tableName, tableValue]) => tableValue === (value as Relations).table,
      )![0] as string,
      value as Relations,
    ])
    .map<[string, Record<string, Relation>]>(([tableName, relValue]) => [
      tableName,
      relValue.config(createTableRelationsHelpers(tables[tableName]!)),
    ]);

  const namedRelations = Object.fromEntries(
    rawRelations.map(([relName, config]) => {
      const namedConfig: Record<string, TableNamedRelations> = Object
        .fromEntries(
          Object.entries(config).map(([innerRelName, innerRelValue]) => {
            const targetTableName =
              tableEntries.find(([_tableName, tableValue]) =>
                tableValue === innerRelValue.referencedTable
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

    const selectArrGenerated = generateSelectArray(
      db,
      tableName,
      tables,
      namedRelations,
      tableOrder,
      tableFilters,
    );
    const selectSingleGenerated = generateSelectSingle(
      db,
      tableName,
      tables,
      namedRelations,
      tableOrder,
      tableFilters,
    );
    const insertArrGenerated = generateInsertArray(
      db,
      tableName,
      schema[tableName] as PgTable,
      insertInput,
    );
    const insertSingleGenerated = generateInsertSingle(
      db,
      tableName,
      schema[tableName] as PgTable,
      insertInput,
    );
    const updateGenerated = generateUpdate(
      db,
      tableName,
      schema[tableName] as PgTable,
      updateInput,
      tableFilters,
    );
    const deleteGenerated = generateDelete(
      db,
      tableName,
      schema[tableName] as PgTable,
      tableFilters,
    );

    queries[selectArrGenerated.name] = {
      type: selectArrOutput,
      args: selectArrGenerated.args,
      resolve: selectArrGenerated.resolver,
    };
    queries[selectSingleGenerated.name] = {
      type: selectSingleOutput,
      args: selectSingleGenerated.args,
      resolve: selectSingleGenerated.resolver,
    };
    mutations[insertArrGenerated.name] = {
      type: arrTableItemOutput,
      args: insertArrGenerated.args,
      resolve: insertArrGenerated.resolver,
    };
    mutations[insertSingleGenerated.name] = {
      type: singleTableItemOutput,
      args: insertSingleGenerated.args,
      resolve: insertSingleGenerated.resolver,
    };
    mutations[updateGenerated.name] = {
      type: arrTableItemOutput,
      args: updateGenerated.args,
      resolve: updateGenerated.resolver,
    };
    mutations[deleteGenerated.name] = {
      type: arrTableItemOutput,
      args: deleteGenerated.args,
      resolve: deleteGenerated.resolver,
    };
    [insertInput, updateInput, tableFilters, tableOrder].forEach(
      (e) => (inputs[e.name] = e),
    );
    outputs[selectSingleOutput.name] = selectSingleOutput;
    outputs[singleTableItemOutput.name] = singleTableItemOutput;
  }

  return { queries, mutations, inputs, types: outputs } as any;
};

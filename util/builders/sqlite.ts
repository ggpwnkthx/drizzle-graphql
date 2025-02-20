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
 * Retrieves the query builder for a given table from the database instance.
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
 * Generates a select resolver for a single or multiple records.
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

        // Extract common query parts.
        const selectedFields = parsedInfo.fieldsByTypeName[typeName]!;
        const columns = extractSelectedColumnsFromTree(selectedFields, table);
        const orderByClause = orderBy
          ? extractOrderBy(table, orderBy)
          : undefined;
        const whereClause = where
          ? extractFilters(table, tableName, where)
          : undefined;
        const withClause = relationMap[tableName]
          ? extractRelationsParams(
            relationMap,
            tables,
            tableName,
            parsedInfo,
            typeName,
          )
          : undefined;

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
 * Generates an insert resolver for single or batch inputs.
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
 * Generates a resolver for update or delete operations.
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
        const columns = extractSelectedColumnsFromTreeSQLFormat<SQLiteColumn>(
          selectedFields,
          table,
        );

        let query;
        if (operation === "update") {
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
 * Generates the GraphQL schema data (queries, mutations, inputs, types) from the provided schema.
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

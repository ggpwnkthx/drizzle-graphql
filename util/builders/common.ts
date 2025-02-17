import {
  and,
  asc,
  desc,
  eq,
  getTableColumns,
  gt,
  gte,
  ilike,
  inArray,
  is,
  isNotNull,
  isNull,
  like,
  lt,
  lte,
  ne,
  notIlike,
  notInArray,
  notLike,
  One,
  or,
  type Column,
  type SQL,
  type Table,
} from "drizzle-orm";
import {
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLError,
  type GraphQLFieldResolver,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  type GraphQLScalarType,
  GraphQLString,
} from "graphql";

import { capitalize, uncapitalize } from "../case-ops.ts";
import { remapFromGraphQLCore } from "../data-mappers.ts";
import {
  type ConvertedColumn,
  type ConvertedInputColumn,
  type ConvertedRelationColumnWithArgs,
  drizzleColumnToGraphQLType,
} from "../type-converter/index.ts";
import { parseResolveInfo, type ResolveTree } from "graphql-parse-resolve-info";
import type {
  CreatedResolver,
  FilterColumnOperators,
  FilterColumnOperatorsCore,
  Filters,
  FiltersCore,
  GeneratedTableTypes,
  GeneratedTableTypesOutputs,
  OrderByArgs,
  ProcessedTableSelectArgs,
  SelectData,
  SelectedColumnsRaw,
  SelectedSQLColumns,
  TableNamedRelations,
  TableSelectArgs,
} from "./types.ts";
import { AnyDrizzleDB } from "../../types.ts";

/**
 * Helper factory to create a non-null list GraphQL type.
 */
export const nonNullList = (type: GraphQLScalarType | GraphQLObjectType) =>
  new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(type)));

/**
 * A higher-order function to wrap resolver logic in common error handling.
 */
export const withGraphQLError = (
  resolver: GraphQLFieldResolver<any, any>,
): GraphQLFieldResolver<any, any> =>
async (source, args, context, info) => {
  try {
    return await resolver(source, args, context, info);
  } catch (e: unknown) {
    const message = typeof e === "object" && e !== null && "message" in e
      ? (e as Error).message
      : "Unknown error";
    throw new GraphQLError(message);
  }
};

/**
 * A generic caching helper built on WeakMap.
 */
class Cache<K extends object, V> {
  private map = new WeakMap<K, V>();
  get(key: K, compute: () => V): V {
    if (this.map.has(key)) return this.map.get(key)!;
    const value = compute();
    this.map.set(key, value);
    return value;
  }
}

// Caches for generated types and field maps.
export const orderCache = new Cache<
  object,
  Record<string, ConvertedInputColumn>
>();
export const filterCache = new Cache<
  object,
  Record<string, ConvertedInputColumn>
>();
export const fieldCache = new Cache<object, Record<string, ConvertedColumn>>();
export const orderTypeCache = new Cache<object, GraphQLInputObjectType>();
export const filterTypeCache = new Cache<object, GraphQLInputObjectType>();

export const extractSelectedColumnsFromTree = (
  tree: Record<string, ResolveTree>,
  table: Table,
): Record<string, true> => {
  const tableColumns = getTableColumns(table);
  const selectedColumns: SelectedColumnsRaw = [];
  for (const [_fieldName, fieldData] of Object.entries(tree)) {
    if (tableColumns[fieldData.name]) {
      selectedColumns.push([fieldData.name, true]);
    }
  }
  if (!selectedColumns.length) {
    // Fallback: choose the first column.
    const [fallback] = Object.keys(tableColumns);
    selectedColumns.push([fallback, true]);
  }
  return Object.fromEntries(selectedColumns);
};

/**
 * Can't automatically determine column type on type level
 * Since drizzle table types extend eachother
 */
export const extractSelectedColumnsFromTreeSQLFormat = <
  TColType extends Column = Column,
>(
  tree: Record<string, ResolveTree>,
  table: Table,
): Record<string, TColType> => {
  const tableColumns = getTableColumns(table);
  const selectedColumns: SelectedSQLColumns = [];
  for (const [_fieldName, fieldData] of Object.entries(tree)) {
    if (tableColumns[fieldData.name]) {
      selectedColumns.push([fieldData.name, tableColumns[fieldData.name]!]);
    }
  }
  if (!selectedColumns.length) {
    const [fallback] = Object.entries(tableColumns);
    selectedColumns.push([fallback[0], fallback[1]]);
  }
  return Object.fromEntries(selectedColumns) as Record<string, TColType>;
};

export const innerOrder = new GraphQLInputObjectType({
  name: "InnerOrder" as const,
  fields: {
    direction: {
      type: new GraphQLNonNull(
        new GraphQLEnumType({
          name: "OrderDirection",
          description: "Order by direction",
          values: {
            asc: {
              value: "asc",
              description: "Ascending order",
            },
            desc: {
              value: "desc",
              description: "Descending order",
            },
          },
        }),
      ),
    },
    priority: {
      type: new GraphQLNonNull(GraphQLInt),
      description: "Priority of current field",
    },
  } as const,
});

const generateColumnFilterValues = (
  column: Column,
  tableName: string,
  columnName: string,
): GraphQLInputObjectType => {
  const columnGraphQLType = drizzleColumnToGraphQLType(
    column,
    columnName,
    tableName,
    true,
    false,
    true,
  );
  const columnArr = new GraphQLList(new GraphQLNonNull(columnGraphQLType.type));

  const baseFields = {
    eq: {
      type: columnGraphQLType.type,
      description: columnGraphQLType.description,
    },
    ne: {
      type: columnGraphQLType.type,
      description: columnGraphQLType.description,
    },
    lt: {
      type: columnGraphQLType.type,
      description: columnGraphQLType.description,
    },
    lte: {
      type: columnGraphQLType.type,
      description: columnGraphQLType.description,
    },
    gt: {
      type: columnGraphQLType.type,
      description: columnGraphQLType.description,
    },
    gte: {
      type: columnGraphQLType.type,
      description: columnGraphQLType.description,
    },
    like: { type: GraphQLString },
    notLike: { type: GraphQLString },
    ilike: { type: GraphQLString },
    notIlike: { type: GraphQLString },
    inArray: {
      type: columnArr,
      description: `Array<${columnGraphQLType.description}>`,
    },
    notInArray: {
      type: columnArr,
      description: `Array<${columnGraphQLType.description}>`,
    },
    isNull: { type: GraphQLBoolean },
    isNotNull: { type: GraphQLBoolean },
  };

  const type: GraphQLInputObjectType = new GraphQLInputObjectType({
    name: `${capitalize(tableName)}${capitalize(columnName)}Filters`,
    fields: {
      ...baseFields,
      OR: {
        type: new GraphQLList(
          new GraphQLNonNull(
            new GraphQLInputObjectType({
              name: `${capitalize(tableName)}${
                capitalize(columnName)
              }filtersOr`,
              fields: {
                ...baseFields,
              },
            }),
          ),
        ),
      },
    },
  });

  return type;
};

const orderMap = new WeakMap<object, Record<string, ConvertedInputColumn>>();
const generateTableOrderCached = (table: Table) => {
  if (orderMap.has(table)) return orderMap.get(table)!;

  const columns = getTableColumns(table);
  const columnEntries = Object.entries(columns);

  const remapped = Object.fromEntries(
    columnEntries.map((
      [columnName, _columnDescription],
    ) => [columnName, { type: innerOrder }]),
  );

  orderMap.set(table, remapped);

  return remapped;
};

const filterMap = new WeakMap<object, Record<string, ConvertedInputColumn>>();
const generateTableFilterValuesCached = (table: Table, tableName: string) => {
  if (filterMap.has(table)) return filterMap.get(table)!;

  const columns = getTableColumns(table);
  const columnEntries = Object.entries(columns);

  const remapped = Object.fromEntries(
    columnEntries.map(([columnName, columnDescription]) => [
      columnName,
      {
        type: generateColumnFilterValues(
          columnDescription,
          tableName,
          columnName,
        ),
      },
    ]),
  );

  filterMap.set(table, remapped);

  return remapped;
};

const fieldMap = new WeakMap<object, Record<string, ConvertedColumn>>();
const generateTableSelectTypeFieldsCached = (
  table: Table,
  tableName: string,
): Record<string, ConvertedColumn> => {
  if (fieldMap.has(table)) return fieldMap.get(table)!;

  const columns = getTableColumns(table);
  const columnEntries = Object.entries(columns);

  const remapped = Object.fromEntries(
    columnEntries.map(([columnName, columnDescription]) => [
      columnName,
      drizzleColumnToGraphQLType(columnDescription, columnName, tableName),
    ]),
  );

  fieldMap.set(table, remapped);

  return remapped;
};

const orderTypeMap = new WeakMap<object, GraphQLInputObjectType>();
const generateTableOrderTypeCached = (table: Table, tableName: string) => {
  if (orderTypeMap.has(table)) return orderTypeMap.get(table)!;

  const orderColumns = generateTableOrderCached(table);
  const order = new GraphQLInputObjectType({
    name: `${capitalize(tableName)}OrderBy`,
    fields: orderColumns,
  });

  orderTypeMap.set(table, order);

  return order;
};

const filterTypeMap = new WeakMap<object, GraphQLInputObjectType>();
const generateTableFilterTypeCached = (table: Table, tableName: string) => {
  if (filterTypeMap.has(table)) return filterTypeMap.get(table)!;

  const filterColumns = generateTableFilterValuesCached(table, tableName);
  const filters: GraphQLInputObjectType = new GraphQLInputObjectType({
    name: `${capitalize(tableName)}Filters`,
    fields: {
      ...filterColumns,
      OR: {
        type: new GraphQLList(
          new GraphQLNonNull(
            new GraphQLInputObjectType({
              name: `${capitalize(tableName)}FiltersOr`,
              fields: filterColumns,
            }),
          ),
        ),
      },
    },
  });

  filterTypeMap.set(table, filters);

  return filters;
};

const generateSelectFields = <TWithOrder extends boolean>(
  tables: Record<string, Table>,
  tableName: string,
  relationMap: Record<string, Record<string, TableNamedRelations>>,
  typeName: string,
  withOrder: TWithOrder,
  relationsDepthLimit: number | undefined,
  currentDepth: number = 0,
  usedTables: Set<string> = new Set(),
): SelectData<TWithOrder> => {
  const relations = relationMap[tableName];
  const relationEntries: [string, TableNamedRelations][] = relations
    ? Object.entries(relations)
    : [];

  const table = tables[tableName]!;

  const order = withOrder
    ? generateTableOrderTypeCached(table, tableName)
    : undefined;

  const filters = generateTableFilterTypeCached(table, tableName);

  const tableFields = generateTableSelectTypeFieldsCached(table, tableName);

  if (
    usedTables.has(tableName) ||
    (typeof relationsDepthLimit === "number" &&
      currentDepth >= relationsDepthLimit) ||
    !relationEntries.length
  ) {
    return {
      order,
      filters,
      tableFields,
      relationFields: {},
    } as SelectData<TWithOrder>;
  }

  const rawRelationFields: [string, ConvertedRelationColumnWithArgs][] = [];
  const updatedUsedTables = new Set(usedTables).add(tableName);
  const newDepth = currentDepth + 1;

  for (const [relationName, { targetTableName, relation }] of relationEntries) {
    const relTypeName = `${typeName}${capitalize(relationName)}Relation`;
    const isOne = is(relation, One);

    const relData = generateSelectFields(
      tables,
      targetTableName,
      relationMap,
      relTypeName,
      !isOne,
      relationsDepthLimit,
      newDepth,
      updatedUsedTables,
    );

    const relType = new GraphQLObjectType({
      name: relTypeName,
      fields: { ...relData.tableFields, ...relData.relationFields },
    });

    if (isOne) {
      rawRelationFields.push([
        relationName,
        {
          type: relType,
          args: {
            where: { type: relData.filters },
          },
        },
      ]);

      continue;
    }

    rawRelationFields.push([
      relationName,
      {
        type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(relType))),
        args: {
          where: { type: relData.filters },
          orderBy: { type: relData.order! },
          offset: { type: GraphQLInt },
          limit: { type: GraphQLInt },
        },
      },
    ]);
  }

  const relationFields = Object.fromEntries(rawRelationFields);

  return { order, filters, tableFields, relationFields } as SelectData<
    TWithOrder
  >;
};

export const generateTableTypes = <
  WithReturning extends boolean,
>(
  tableName: string,
  tables: Record<string, Table>,
  relationMap: Record<string, Record<string, TableNamedRelations>>,
  withReturning: WithReturning,
  relationsDepthLimit: number | undefined,
): GeneratedTableTypes<WithReturning> => {
  const stylizedName = capitalize(tableName);
  const { tableFields, relationFields, filters, order } = generateSelectFields(
    tables,
    tableName,
    relationMap,
    stylizedName,
    true,
    relationsDepthLimit,
  );

  const table = tables[tableName]!;
  const columns = getTableColumns(table);
  const columnEntries = Object.entries(columns);

  const insertFields = Object.fromEntries(
    columnEntries.map(([columnName, columnDescription]) => [
      columnName,
      drizzleColumnToGraphQLType(
        columnDescription,
        columnName,
        tableName,
        false,
        true,
        true,
      ),
    ]),
  );

  const updateFields = Object.fromEntries(
    columnEntries.map(([columnName, columnDescription]) => [
      columnName,
      drizzleColumnToGraphQLType(
        columnDescription,
        columnName,
        tableName,
        true,
        false,
        true,
      ),
    ]),
  );

  const insertInput = new GraphQLInputObjectType({
    name: `${stylizedName}InsertInput`,
    fields: insertFields,
  });

  const selectSingleOutput = new GraphQLObjectType({
    name: `${stylizedName}SelectItem`,
    fields: { ...tableFields, ...relationFields },
  });

  const selectArrOutput = new GraphQLNonNull(
    new GraphQLList(new GraphQLNonNull(selectSingleOutput)),
  );

  const singleTableItemOutput = withReturning
    ? new GraphQLObjectType({
      name: `${stylizedName}Item`,
      fields: tableFields,
    })
    : undefined;

  const arrTableItemOutput = withReturning
    ? new GraphQLNonNull(
      new GraphQLList(new GraphQLNonNull(singleTableItemOutput!)),
    )
    : undefined;

  const updateInput = new GraphQLInputObjectType({
    name: `${stylizedName}UpdateInput`,
    fields: updateFields,
  });

  const inputs = {
    insertInput,
    updateInput,
    tableOrder: order,
    tableFilters: filters,
  };

  const outputs = (
    withReturning
      ? {
        selectSingleOutput,
        selectArrOutput,
        singleTableItemOutput: singleTableItemOutput!,
        arrTableItemOutput: arrTableItemOutput!,
      }
      : {
        selectSingleOutput,
        selectArrOutput,
      }
  ) as GeneratedTableTypesOutputs<WithReturning>;

  return {
    inputs,
    outputs,
  };
};

export const extractOrderBy = <
  TTable extends Table,
  TArgs extends OrderByArgs<TTable> = OrderByArgs<TTable>,
>(
  table: TTable,
  orderArgs: TArgs,
): SQL[] => {
  const columns = getTableColumns(table);
  const sqlArray: SQL[] = [];
  // Sort by descending priority.
  for (
    const [column, config] of Object.entries(orderArgs).sort(
      (a, b) => (b[1]?.priority ?? 0) - (a[1]?.priority ?? 0),
    )
  ) {
    if (!config) continue;
    sqlArray.push(
      config.direction === "asc"
        ? asc(columns[column]!)
        : desc(columns[column]!),
    );
  }
  return sqlArray;
};

export const extractFiltersColumn = <TColumn extends Column>(
  column: TColumn,
  columnName: string,
  operators: FilterColumnOperators<TColumn>,
): SQL | undefined => {
  if (!operators.OR?.length) delete operators.OR;
  const entries = Object.entries(
    operators as FilterColumnOperatorsCore<TColumn>,
  );
  if (operators.OR) {
    if (entries.length > 1) {
      throw new GraphQLError(
        `WHERE ${columnName}: Cannot specify both fields and 'OR' in column operators!`,
      );
    }
    const variants = operators.OR
      .map((variant) => extractFiltersColumn(column, columnName, variant))
      .filter(Boolean) as SQL[];
    return variants.length
      ? (variants.length > 1 ? or(...variants) : variants[0])
      : undefined;
  }
  const operatorMap: Record<
    keyof FilterColumnOperatorsCore<TColumn>,
    (col: TColumn, value?: any) => SQL
  > = {
    eq: (col, value) => eq(col, remapFromGraphQLCore(value, col, columnName)),
    ne: (col, value) => ne(col, remapFromGraphQLCore(value, col, columnName)),
    gt: (col, value) => gt(col, remapFromGraphQLCore(value, col, columnName)),
    gte: (col, value) => gte(col, remapFromGraphQLCore(value, col, columnName)),
    lt: (col, value) => lt(col, remapFromGraphQLCore(value, col, columnName)),
    lte: (col, value) => lte(col, remapFromGraphQLCore(value, col, columnName)),
    like: (col, value) => like(col, value),
    notLike: (col, value) => notLike(col, value),
    ilike: (col, value) => ilike(col, value),
    notIlike: (col, value) => notIlike(col, value),
    inArray: (col, value: any[]) => {
      if (!value.length) {
        throw new GraphQLError(
          `WHERE ${columnName}: inArray requires a non-empty array!`,
        );
      }
      return inArray(
        col,
        value.map((val) => remapFromGraphQLCore(val, col, columnName)),
      );
    },
    notInArray: (col, value: any[]) => {
      if (!value.length) {
        throw new GraphQLError(
          `WHERE ${columnName}: notInArray requires a non-empty array!`,
        );
      }
      return notInArray(
        col,
        value.map((val) => remapFromGraphQLCore(val, col, columnName)),
      );
    },
    isNull: (col) => isNull(col),
    isNotNull: (col) => isNotNull(col),
  };
  const variants: SQL[] = [];
  for (const [operatorName, operatorValue] of entries) {
    if (operatorValue === null || operatorValue === false) continue;
    const filterFn =
      operatorMap[operatorName as keyof FilterColumnOperatorsCore<TColumn>];
    if (!filterFn) continue;
    variants.push(filterFn(column, operatorValue));
  }
  return variants.length
    ? (variants.length > 1 ? and(...variants) : variants[0])
    : undefined;
};

export const extractFilters = <TTable extends Table>(
  table: TTable,
  tableName: string,
  filters: Filters<TTable>,
): SQL | undefined => {
  if (!filters.OR?.length) delete filters.OR;
  const entries = Object.entries(filters as FiltersCore<TTable>);
  if (!entries.length) return;
  if (filters.OR) {
    if (entries.length > 1) {
      throw new GraphQLError(
        `WHERE ${tableName}: Cannot specify both fields and 'OR' in table filters!`,
      );
    }
    const variants = filters.OR
      .map((variant) => extractFilters(table, tableName, variant))
      .filter(Boolean) as SQL[];
    return variants.length
      ? (variants.length > 1 ? or(...variants) : variants[0])
      : undefined;
  }
  const variants: SQL[] = [];
  for (const [columnName, operators] of entries) {
    if (operators === null) continue;
    const column = getTableColumns(table)[columnName]!;
    variants.push(extractFiltersColumn(column, columnName, operators)!);
  }
  return variants.length
    ? (variants.length > 1 ? and(...variants) : variants[0])
    : undefined;
};

const extractRelationsParamsInner = (
  relationMap: Record<string, Record<string, TableNamedRelations>>,
  tables: Record<string, Table>,
  tableName: string,
  typeName: string,
  originField: ResolveTree,
  isInitial: boolean = false,
) => {
  const relations = relationMap[tableName];
  if (!relations) return undefined;

  const baseField = Object.entries(originField.fieldsByTypeName).find((
    [key, _value],
  ) => key === typeName)?.[1];
  if (!baseField) return undefined;

  const args: Record<string, Partial<ProcessedTableSelectArgs>> = {};

  for (const [relName, { targetTableName }] of Object.entries(relations)) {
    const relTypeName = `${isInitial ? capitalize(tableName) : typeName}${
      capitalize(relName)
    }Relation`;
    const relFieldSelection = Object.values(baseField).find((field) =>
      field.name === relName
    )?.fieldsByTypeName[relTypeName];
    if (!relFieldSelection) continue;

    const columns = extractSelectedColumnsFromTree(
      relFieldSelection,
      tables[targetTableName]!,
    );

    const thisRecord: Partial<ProcessedTableSelectArgs> = {};
    thisRecord.columns = columns;

    const relationField = Object.values(baseField).find((e) =>
      e.name === relName
    );
    const relationArgs: Partial<TableSelectArgs> | undefined = relationField
      ?.args;

    const orderBy = relationArgs?.orderBy
      ? extractOrderBy(tables[targetTableName]!, relationArgs.orderBy!)
      : undefined;
    const where = relationArgs?.where
      ? extractFilters(tables[targetTableName]!, relName, relationArgs?.where)
      : undefined;
    const offset = relationArgs?.offset ?? undefined;
    const limit = relationArgs?.limit ?? undefined;

    thisRecord.orderBy = orderBy;
    thisRecord.where = where;
    thisRecord.offset = offset;
    thisRecord.limit = limit;

    const relWith = relationField
      ? extractRelationsParamsInner(
        relationMap,
        tables,
        targetTableName,
        relTypeName,
        relationField,
      )
      : undefined;
    thisRecord.with = relWith;

    args[relName] = thisRecord;
  }

  return args;
};

export const extractRelationsParams = (
  relationMap: Record<string, Record<string, TableNamedRelations>>,
  tables: Record<string, Table>,
  tableName: string,
  info: ResolveTree | undefined,
  typeName: string,
): Record<string, Partial<ProcessedTableSelectArgs>> | undefined => {
  if (!info) return undefined;

  return extractRelationsParamsInner(
    relationMap,
    tables,
    tableName,
    typeName,
    info,
    true,
  );
};

/**
 * Creates a resolver for selecting records.
 * @param db - The database instance.
 * @param tableName - Name of the table.
 * @param tables - Map of tables.
 * @param relationMap - Map of relation definitions.
 * @param orderArgs - GraphQL input type for order arguments.
 * @param filterArgs - GraphQL input type for filter arguments.
 * @param queryMethod - Either "findMany" (array) or "findFirst" (single).
 * @param remapFn - Function to remap the raw DB output to GraphQL output.
 */
export function createSelectResolver<TDbClient extends AnyDrizzleDB<any>>(
  db: TDbClient,
  tableName: string,
  tables: Record<string, Table>,
  relationMap: Record<string, Record<string, TableNamedRelations>>,
  orderArgs: any,
  filterArgs: any,
  queryMethod: "findMany" | "findFirst",
  remapFn: (
    result: any,
    tableName: string,
    table: Table,
    relationMap?: Record<string, any>,
  ) => any,
): CreatedResolver {
  const queryName = uncapitalize(tableName) +
    (queryMethod === "findMany" ? "" : "Single");
  const queryBase = (db.query as any)[tableName];
  if (!queryBase) {
    throw new Error(
      `Drizzle-GraphQL Error: Table ${tableName} not found in drizzle instance.`,
    );
  }

  const queryArgs: Record<string, any> = {
    offset: { type: GraphQLInt },
    orderBy: { type: orderArgs },
    where: { type: filterArgs },
  };
  if (queryMethod === "findMany") {
    queryArgs.limit = { type: GraphQLInt };
  }
  const typeName = `${capitalize(tableName)}SelectItem`;
  const table = tables[tableName]!;

  return {
    name: queryName,
    args: queryArgs,
    resolver: async (source, args: Partial<TableSelectArgs>, context, info) => {
      try {
        const { offset, limit, orderBy, where } = args;
        const parsedInfo = parseResolveInfo(info, { deep: true }) as any;
        const selectInfo = parsedInfo.fieldsByTypeName[typeName];
        const queryOptions: any = {
          columns: extractSelectedColumnsFromTree(selectInfo, table),
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
        };
        if (queryMethod === "findMany") queryOptions.limit = limit;
        const query = queryBase[queryMethod](queryOptions);
        const result = await query;
        return remapFn(result, tableName, table, relationMap);
      } catch (e: any) {
        throw new GraphQLError(e?.message || e.toString());
      }
    },
  };
}

/**
 * Creates a resolver for insert operations.
 * @param db - The database instance.
 * @param tableName - Name of the table.
 * @param table - The table definition.
 * @param baseType - GraphQL input type for the insert.
 * @param withReturning - Whether the query should return values.
 * @param remapFromInput - Function to remap the GraphQL input to DB input.
 * @param remapFn - Function to remap the DB result to GraphQL output.
 * @param extractColumns - (Optional) Function to extract columns for a returning clause.
 * @param relationMap - (Optional) Relation map used by the remap function.
 */
export function createInsertResolver<TDbClient extends AnyDrizzleDB<any>>(
  db: TDbClient,
  tableName: string,
  table: Table,
  baseType: any,
  withReturning: boolean,
  remapFromInput: (input: any, table: Table) => any,
  remapFn: (
    result: any,
    tableName: string,
    table: Table,
    relationMap?: Record<string, any>,
  ) => any,
  extractColumns?: (selectInfo: any, table: Table) => any,
  relationMap?: Record<string, Record<string, TableNamedRelations>>,
): CreatedResolver {
  const queryName = withReturning
    ? `insertInto${capitalize(tableName)}Single`
    : `insertInto${capitalize(tableName)}`;
  const queryArgs = {
    values: {
      type: new GraphQLNonNull(
        withReturning
          ? baseType
          : new GraphQLList(new GraphQLNonNull(baseType)),
      ),
    },
  };

  return {
    name: queryName,
    args: queryArgs,
    resolver: async (source, args: any, context, info) => {
      try {
        const input = remapFromInput(args.values, table);
        if (Array.isArray(input) && !input.length) {
          throw new GraphQLError("No values were provided!");
        }
        let query = (db.insert as any)(table).values(input);
        if (withReturning && extractColumns) {
          const typeName = `${capitalize(tableName)}Item`;
          const parsedInfo = parseResolveInfo(info, { deep: true }) as any;
          const selectInfo = parsedInfo.fieldsByTypeName[typeName];
          const columns = extractColumns(selectInfo, table);
          query = query.returning(columns).onConflictDoNothing();
        }
        const result = await query;
        return remapFn(result, tableName, table, relationMap);
      } catch (e: any) {
        throw new GraphQLError(e?.message || e.toString());
      }
    },
  };
}

/**
 * Creates a resolver for update operations.
 * (Very similar to createInsertResolver.)
 */
export function createUpdateResolver<TDbClient extends AnyDrizzleDB<any>>(
  db: TDbClient,
  tableName: string,
  table: Table,
  setType: any,
  filterArgs: any,
  remapFromInput: (input: any, table: Table) => any,
  remapFn: (
    result: any,
    tableName: string,
    table: Table,
    relationMap?: Record<string, any>,
  ) => any,
  extractColumns?: (selectInfo: any, table: Table) => any,
  relationMap?: Record<string, Record<string, TableNamedRelations>>,
): CreatedResolver {
  const queryName = `update${capitalize(tableName)}`;
  const queryArgs = {
    set: { type: new GraphQLNonNull(setType) },
    where: { type: filterArgs },
  };
  return {
    name: queryName,
    args: queryArgs,
    resolver: async (source, args: any, context, info) => {
      try {
        const { set, where } = args;
        const input = remapFromInput(set, table);
        if (!Object.keys(input).length) {
          throw new GraphQLError("Unable to update with no values specified!");
        }
        let query = (db.update as any)(table).set(input);
        if (where) {
          query = query.where(extractFilters(table, tableName, where));
        }
        if (extractColumns) {
          const typeName = `${capitalize(tableName)}Item`;
          const parsedInfo = parseResolveInfo(info, { deep: true }) as any;
          const selectInfo = parsedInfo.fieldsByTypeName[typeName];
          const columns = extractColumns(selectInfo, table);
          query = query.returning(columns);
        }
        const result = await query;
        return remapFn(result, tableName, table, relationMap);
      } catch (e: any) {
        throw new GraphQLError(e?.message || e.toString());
      }
    },
  };
}

/**
 * Creates a resolver for delete operations.
 */
export function createDeleteResolver<TDbClient extends AnyDrizzleDB<any>>(
  db: TDbClient,
  tableName: string,
  table: Table,
  filterArgs: any,
  remapFn: (
    result: any,
    tableName: string,
    table: Table,
    relationMap?: Record<string, any>,
  ) => any,
  extractColumns?: (selectInfo: any, table: Table) => any,
  relationMap?: Record<string, Record<string, TableNamedRelations>>,
): CreatedResolver {
  const queryName = `deleteFrom${capitalize(tableName)}`;
  const queryArgs = {
    where: { type: filterArgs },
  };
  return {
    name: queryName,
    args: queryArgs,
    resolver: async (source, args: any, context, info) => {
      try {
        const { where } = args;
        let query = (db.delete as any)(table);
        if (where) {
          query = query.where(extractFilters(table, tableName, where));
        }
        if (extractColumns) {
          const typeName = `${capitalize(tableName)}Item`;
          const parsedInfo = parseResolveInfo(info, { deep: true }) as any;
          const selectInfo = parsedInfo.fieldsByTypeName[typeName];
          const columns = extractColumns(selectInfo, table);
          query = query.returning(columns);
        }
        const result = await query;
        return remapFn(result, tableName, table, relationMap);
      } catch (e: any) {
        throw new GraphQLError(e?.message || e.toString());
      }
    },
  };
}

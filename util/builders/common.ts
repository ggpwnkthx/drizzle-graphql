import {
  and,
  asc,
  type Column,
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
  type SQL,
  type Table,
} from "drizzle-orm";
import {
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLError,
  GraphQLFieldConfigArgumentMap,
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
import type { AnyDrizzleDB } from "../../types.ts";

/**
 * Helper factory that creates a non-null list GraphQL type.
 *
 * This function wraps a given GraphQL type in a non-null list of non-null values.
 *
 * @param type - A GraphQLScalarType or GraphQLObjectType to wrap.
 * @returns A new GraphQLNonNull type wrapping a GraphQLList of non-null instances of the provided type.
 */
export const nonNullList = (type: GraphQLScalarType | GraphQLObjectType) =>
  new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(type)));

/**
 * Higher-order function that wraps a resolver function with standardized error handling.
 *
 * If the resolver throws an error, it is caught and rethrown as a GraphQLError with a meaningful message.
 *
 * @param resolver - The original GraphQL field resolver function.
 * @returns A new GraphQLFieldResolver function with error handling.
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
 * Generic caching helper built using a WeakMap.
 *
 * This class provides a simple interface to cache computed values for object keys.
 *
 * @template K - The type of the key (must be an object).
 * @template V - The type of the cached value.
 */
class Cache<K extends object, V> {
  private map = new WeakMap<K, V>();

  /**
   * Retrieves a cached value by key, or computes and caches it if not present.
   *
   * @param key - The key to retrieve.
   * @param compute - A function that computes the value if it is not cached.
   * @returns The cached or computed value.
   */
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

/**
 * Extracts selected columns from a parsed GraphQL resolve tree.
 *
 * It iterates over the fields in the provided tree and checks whether each field corresponds to a column in the table.
 * If no columns are selected, it defaults to selecting the first column.
 *
 * @param tree - A record of ResolveTree objects representing the GraphQL query selection.
 * @param table - The database table from which to extract columns.
 * @returns A record mapping column names to `true`, indicating selected columns.
 */
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
 * Extracts selected columns from a parsed GraphQL resolve tree in SQL format.
 *
 * This function is similar to `extractSelectedColumnsFromTree` but returns a record mapping column names
 * to their corresponding Column objects.
 *
 * @template TColType - The expected column type.
 * @param tree - A record of ResolveTree objects representing the GraphQL query selection.
 * @param table - The database table from which to extract columns.
 * @returns A record mapping column names to Column objects.
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

/**
 * A GraphQL input object type representing ordering options for a column.
 *
 * Contains two fields:
 * - direction: The sort direction (ascending or descending).
 * - priority: The priority of the field when sorting.
 */
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

/**
 * Generates a GraphQL input type for filtering a specific column.
 *
 * This function creates an input object type that defines various filter operators (e.g. eq, ne, gt, lt)
 * for the provided column. It also includes an "OR" field for logical disjunction.
 *
 * @param column - The database column to filter.
 * @param tableName - The name of the table containing the column.
 * @param columnName - The name of the column.
 * @returns A GraphQLInputObjectType defining filter operators for the column.
 */
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

// Caches for table ordering fields.
const orderMap = new WeakMap<object, Record<string, ConvertedInputColumn>>();
/**
 * Caches and returns a mapping of column names to their GraphQL order type for a table.
 *
 * If the mapping for the table is already cached, it returns the cached version.
 * Otherwise, it creates a new mapping where each column is assigned the innerOrder type.
 *
 * @param table - The database table.
 * @returns A record mapping column names to ConvertedInputColumn representing order configuration.
 */
const generateTableOrderCached = (table: Table) => {
  if (orderMap.has(table)) return orderMap.get(table)!;

  const columns = getTableColumns(table);
  const columnEntries = Object.entries(columns);

  const remapped = Object.fromEntries(
    columnEntries.map(([columnName, _]) => [columnName, { type: innerOrder }]),
  );

  orderMap.set(table, remapped);

  return remapped;
};

// Caches for table filter input types.
const filterMap = new WeakMap<object, Record<string, ConvertedInputColumn>>();
/**
 * Caches and returns a mapping of column names to their GraphQL filter input types for a table.
 *
 * For each column, it generates a GraphQLInputObjectType defining filter operators.
 * The result is cached for future use.
 *
 * @param table - The database table.
 * @param tableName - The name of the table.
 * @returns A record mapping column names to ConvertedInputColumn representing filter configuration.
 */
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

// Caches for table select type fields.
const fieldMap = new WeakMap<object, Record<string, ConvertedColumn>>();
/**
 * Caches and returns the GraphQL type fields for a table's select query.
 *
 * It maps each column to its converted GraphQL type using drizzleColumnToGraphQLType.
 *
 * @param table - The database table.
 * @param tableName - The name of the table.
 * @returns A record mapping column names to their corresponding ConvertedColumn.
 */
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

// Caches for table order GraphQL input types.
const orderTypeMap = new WeakMap<object, GraphQLInputObjectType>();
/**
 * Caches and returns the GraphQL input type for ordering a table.
 *
 * It builds the input type based on the cached order fields of the table.
 *
 * @param table - The database table.
 * @param tableName - The name of the table.
 * @returns A GraphQLInputObjectType representing the table's order by input type.
 */
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

// Caches for table filter GraphQL input types.
const filterTypeMap = new WeakMap<object, GraphQLInputObjectType>();
/**
 * Caches and returns the GraphQL input type for filtering a table.
 *
 * It builds the input type based on the cached filter fields of the table.
 *
 * @param table - The database table.
 * @param tableName - The name of the table.
 * @returns A GraphQLInputObjectType representing the table's filters input type.
 */
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

/**
 * Recursively generates the field definitions for a table select query.
 *
 * This function generates the GraphQL field definitions for selecting data from a table,
 * including nested relations up to a specified depth.
 *
 * @template TWithOrder - Indicates whether ordering is enabled.
 * @param tables - A record mapping table names to Table definitions.
 * @param tableName - The name of the current table.
 * @param relationMap - A mapping of table names to their relation configurations.
 * @param typeName - The base type name for generating nested types.
 * @param withOrder - Whether to include order information.
 * @param relationsDepthLimit - The maximum depth for nested relation fields.
 * @param currentDepth - The current recursion depth (default is 0).
 * @param usedTables - A set of table names that have already been processed to avoid circular references.
 * @returns A SelectData object containing order type, filters type, table fields, and relation fields.
 */
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

/**
 * Generates GraphQL types for a database table.
 *
 * This function creates input and output GraphQL types for a given table by extracting its columns,
 * generating select fields, and wrapping them into appropriate GraphQLInputObjectType and GraphQLObjectType.
 * It supports both returnable and non-returnable mutation operations.
 *
 * @template WithReturning - A boolean flag indicating if mutations should return values.
 * @param tableName - The name of the table.
 * @param tables - A record mapping table names to Table definitions.
 * @param relationMap - A mapping of table names to their relation configurations.
 * @param withReturning - Whether the mutations return detailed values.
 * @param relationsDepthLimit - Optional depth limit for nested relations.
 * @returns An object containing generated input types and output types for the table.
 */
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

/**
 * Extracts SQL ORDER BY clauses from GraphQL order arguments.
 *
 * For each field in the orderArgs, the function constructs a SQL clause based on the column's direction (asc/desc)
 * and priority. The resulting array of SQL expressions is returned.
 *
 * @template TTable - The table type.
 * @param table - The table for which to generate ORDER BY clauses.
 * @param orderArgs - A record of order arguments keyed by column name.
 * @returns An array of SQL expressions representing the ORDER BY clauses.
 */
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

/**
 * Extracts a SQL filter expression for a specific column based on provided operators.
 *
 * This function processes the filter operators (e.g., eq, ne, gt) for a column and returns
 * a SQL expression. It supports logical OR compositions for operators.
 *
 * @template TColumn - The column type.
 * @param column - The column to filter.
 * @param columnName - The name of the column.
 * @param operators - An object specifying filter operators and their values.
 * @returns A SQL expression representing the filter, or undefined if no filters are applied.
 * @throws GraphQLError if both direct fields and OR conditions are specified.
 */
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

/**
 * Extracts SQL filters for a table based on provided filter arguments.
 *
 * Processes each filter condition for the table and returns a combined SQL expression.
 * Supports logical OR compositions for the filter conditions.
 *
 * @template TTable - The table type.
 * @param table - The table to filter.
 * @param tableName - The name of the table.
 * @param filters - An object representing filter conditions.
 * @returns A SQL expression representing the combined filters, or undefined if no filters are applied.
 * @throws GraphQLError if both direct filter fields and OR conditions are specified.
 */
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

/**
 * Recursively extracts relation parameters from a GraphQL resolve tree.
 *
 * This helper function processes nested relation fields in the resolve tree, extracting
 * the selected columns, ordering, filtering, and nested relation parameters.
 *
 * @param relationMap - A mapping of table names to their relation configurations.
 * @param tables - A record mapping table names to Table definitions.
 * @param tableName - The name of the current table.
 * @param typeName - The base type name used for generating nested relation types.
 * @param originField - The root ResolveTree from which to extract relation parameters.
 * @param isInitial - Whether this is the initial call (default is false).
 * @returns A record mapping relation names to partial ProcessedTableSelectArgs for each relation.
 */
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

  const baseField = Object.entries(originField.fieldsByTypeName).find(
    ([key, _value]) => key === typeName,
  )?.[1];
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
      ? extractFilters(tables[targetTableName]!, relName, relationArgs.where)
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

/**
 * Extracts relation parameters from a GraphQL resolve tree for a table.
 *
 * This function is a wrapper around `extractRelationsParamsInner` that initiates the extraction
 * process from the provided resolve info.
 *
 * @param relationMap - A mapping of table names to their relation configurations.
 * @param tables - A record mapping table names to Table definitions.
 * @param tableName - The name of the table for which to extract relation parameters.
 * @param info - The ResolveTree obtained from parsing the GraphQL resolve info.
 * @param typeName - The base type name used for generating nested relation types.
 * @returns A record mapping relation names to partial ProcessedTableSelectArgs, or undefined if no relations.
 */
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
 * Creates a GraphQL select resolver for a table.
 *
 * This function returns a resolver that executes a select query on the specified table,
 * applying pagination, ordering, filtering, and relation parameters extracted from the GraphQL query.
 * The resolver then remaps the raw database result into GraphQL output using the provided remapping function.
 *
 * @param db - The database instance.
 * @param tableName - The name of the table to query.
 * @param tables - A record mapping table names to Table definitions.
 * @param relationMap - A mapping of table names to their relation configurations.
 * @param orderArgs - The GraphQL input type for order arguments.
 * @param filterArgs - The GraphQL input type for filter arguments.
 * @param queryMethod - Either "findMany" for multiple records or "findFirst" for a single record.
 * @param remapFn - A function that remaps the raw database result to GraphQL output.
 * @returns A CreatedResolver containing the field name, arguments, and resolver function.
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
    resolver: async (
      _source,
      args: Partial<TableSelectArgs>,
      _context,
      info,
    ) => {
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
 * Creates a GraphQL insert resolver for a table.
 *
 * This function returns a resolver that handles insert operations.
 * It remaps GraphQL input to the database input, executes the insert,
 * and optionally returns the inserted values after remapping them to GraphQL output.
 *
 * @param db - The database instance.
 * @param tableName - The name of the table into which to insert.
 * @param table - The table definition.
 * @param baseType - The GraphQL input type for the insert.
 * @param withReturning - Indicates whether to return inserted values.
 * @param remapFromInput - A function to remap GraphQL input to database format.
 * @param remapFn - A function to remap the database result to GraphQL output.
 * @param extractColumns - (Optional) A function to extract columns for the returning clause.
 * @param relationMap - (Optional) The relation map used for remapping.
 * @returns A CreatedResolver containing the insert resolver.
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
    resolver: async (_source, args: any, _context, info) => {
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
 * Creates a GraphQL update resolver for a table.
 *
 * This function returns a resolver that handles update operations.
 * It remaps GraphQL input to database format, applies the update with optional filters,
 * and returns the updated values after remapping to GraphQL output.
 *
 * @param db - The database instance.
 * @param tableName - The name of the table to update.
 * @param table - The table definition.
 * @param setType - The GraphQL input type for the update set.
 * @param filterArgs - The GraphQL input type for filter conditions.
 * @param remapFromInput - A function to remap GraphQL update input to database format.
 * @param remapFn - A function to remap the database result to GraphQL output.
 * @param extractColumns - (Optional) A function to extract columns for the returning clause.
 * @param relationMap - (Optional) The relation map used for remapping.
 * @returns A CreatedResolver containing the update resolver.
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
    resolver: async (_source, args: any, _context, info) => {
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
 * Creates a GraphQL delete resolver for a table.
 *
 * This function returns a resolver that handles delete operations.
 * It applies optional filters to determine which records to delete, and returns the deleted values
 * after remapping them to GraphQL output.
 *
 * @param db - The database instance.
 * @param tableName - The name of the table to delete from.
 * @param table - The table definition.
 * @param filterArgs - The GraphQL input type for filter conditions.
 * @param remapFn - A function to remap the database result to GraphQL output.
 * @param extractColumns - (Optional) A function to extract columns for the returning clause.
 * @param relationMap - (Optional) The relation map used for remapping.
 * @returns A CreatedResolver containing the delete resolver.
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
  } as const satisfies GraphQLFieldConfigArgumentMap;
  return {
    name: queryName,
    args: queryArgs,
    resolver: async (_source, args: any, _context, info) => {
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

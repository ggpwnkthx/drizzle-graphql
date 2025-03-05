import type { Column, Relation, SQL, Table } from "drizzle-orm";
import type {
  GraphQLFieldConfigArgumentMap,
  GraphQLFieldResolver,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
} from "graphql";
import type {
  ConvertedColumn,
  ConvertedRelationColumnWithArgs,
} from "../type-converter/index.ts";

/**
 * Represents a relation for a table with an associated target table name.
 */
export type TableNamedRelations = {
  relation: Relation;
  targetTableName: string;
};

/**
 * Defines the arguments for a table select operation.
 *
 * @property offset - The number of records to skip.
 * @property limit - The maximum number of records to return.
 * @property where - Filtering conditions to apply.
 * @property orderBy - Ordering rules for the returned records.
 */
export type TableSelectArgs = {
  offset: number;
  limit: number;
  where: Filters<Table>;
  orderBy: OrderByArgs<Table>;
};

/**
 * Represents the processed arguments for building a SQL query from a table select operation.
 *
 * @property columns - A record of selected columns, where each key is the column name and the value is always true.
 * @property offset - The offset for pagination.
 * @property limit - The limit for pagination.
 * @property where - The SQL representation of the filter conditions.
 * @property orderBy - An array of SQL expressions representing the order by clauses.
 * @property with - Optional nested select arguments for related tables.
 */
export type ProcessedTableSelectArgs = {
  columns: Record<string, true>;
  offset: number;
  limit: number;
  where: SQL;
  orderBy: SQL[];
  with?: Record<string, Partial<ProcessedTableSelectArgs>>;
};

/**
 * A raw representation of selected columns.
 *
 * Each tuple consists of a column name and a boolean true indicating selection.
 */
export type SelectedColumnsRaw = [string, true][];

/**
 * Represents an array of selected SQL columns.
 *
 * Each tuple consists of the column name and its corresponding Column object.
 */
export type SelectedSQLColumns = [string, Column][];

/**
 * Defines a mapping of selected columns for a table.
 *
 * For every column in the table, the value is set to true.
 */
export type SelectedColumns = {
  [columnName in keyof Table["_"]["columns"]]: true;
};

/**
 * Represents a created GraphQL resolver with its name, resolver function, and argument definitions.
 *
 * @property name - The name of the resolver.
 * @property resolver - The function that resolves the field.
 * @property args - A map of field arguments and their configurations.
 */
export type CreatedResolver = {
  name: string;
  resolver: GraphQLFieldResolver<any, any>;
  args: GraphQLFieldConfigArgumentMap;
};

/**
 * Converts a GraphQL field argument map into a type mapping.
 *
 * For each argument, if its type is a GraphQLScalarType, the mapped type is inferred.
 *
 * @template TArgMap - The GraphQL field configuration argument map.
 */
export type ArgMapToArgsType<TArgMap extends GraphQLFieldConfigArgumentMap> = {
  [Key in keyof TArgMap]?: TArgMap[Key] extends
    { type: GraphQLScalarType<infer R, any> } ? R : never;
};

/**
 * Determines the GraphQL type for a column, taking into account its nullability.
 *
 * If the column is marked as not-null, returns TColType; otherwise, returns TColType or null.
 *
 * @template TColumn - The column being evaluated.
 * @template TColType - The underlying type of the column.
 */
export type ColTypeIsNull<TColumn extends Column, TColType> =
  TColumn["_"]["notNull"] extends true ? TColType
    : TColType | null;

/**
 * Determines the GraphQL type for a column, including the possibility of undefined.
 *
 * If the column is not-null, returns TColType; otherwise, returns TColType, null, or undefined.
 *
 * @template TColumn - The column being evaluated.
 * @template TColType - The underlying type of the column.
 */
export type ColTypeIsNullOrUndefined<TColumn extends Column, TColType> =
  TColumn["_"]["notNull"] extends true ? TColType
    : TColType | null | undefined;

/**
 * Determines the GraphQL type for a column considering nullability and default values.
 *
 * If the column is non-nullable and has no default, returns TColType; otherwise, returns TColType
 * union null or undefined as appropriate.
 *
 * @template TColumn - The column being evaluated.
 * @template TColType - The underlying type of the column.
 */
export type ColTypeIsNullOrUndefinedWithDefault<
  TColumn extends Column,
  TColType,
> = TColumn["_"]["notNull"] extends true
  ? TColumn["_"]["hasDefault"] extends true ? TColType | null | undefined
  : TColumn["defaultFn"] extends undefined ? TColType
  : TColType | null | undefined
  : TColType | null | undefined;

/**
 * Determines the GraphQL data type for a given column when selecting data.
 *
 * The mapping is based on the column's dataType, columnType, and enum values. It also respects
 * the column's nullability.
 *
 * @template TColumn - The column being mapped.
 */
export type GetColumnGqlDataType<TColumn extends Column> =
  TColumn["dataType"] extends "boolean" ? ColTypeIsNull<TColumn, boolean>
    : TColumn["dataType"] extends "json"
      ? TColumn["_"]["columnType"] extends "PgGeometryObject"
        ? ColTypeIsNull<TColumn, {
          x: number;
          y: number;
        }>
      : ColTypeIsNull<TColumn, string>
    : TColumn["dataType"] extends "date" | "string" | "bigint"
      ? TColumn["enumValues"] extends [string, ...string[]]
        ? ColTypeIsNull<TColumn, TColumn["enumValues"][number]>
      : ColTypeIsNull<TColumn, string>
    : TColumn["dataType"] extends "number" ? ColTypeIsNull<TColumn, number>
    : TColumn["dataType"] extends "buffer" ? ColTypeIsNull<TColumn, number[]>
    : TColumn["dataType"] extends "array"
      ? TColumn["columnType"] extends "PgVector"
        ? ColTypeIsNull<TColumn, number[]>
      : TColumn["columnType"] extends "PgGeometry"
        ? ColTypeIsNullOrUndefinedWithDefault<TColumn, [number, number]>
      : ColTypeIsNull<
        TColumn,
        Array<
          GetColumnGqlDataType<
            TColumn extends { baseColumn: Column } ? TColumn["baseColumn"]
              : never
          > extends infer InnerColType
            ? InnerColType extends null | undefined ? never
            : InnerColType
            : never
        >
      >
    : never;

/**
 * Determines the GraphQL data type for a given column when inserting data.
 *
 * The mapping is based on the column's dataType, columnType, enum values, and takes into account
 * nullability and default values for insert operations.
 *
 * @template TColumn - The column being mapped.
 */
export type GetColumnGqlInsertDataType<TColumn extends Column> =
  TColumn["dataType"] extends "boolean"
    ? ColTypeIsNullOrUndefinedWithDefault<TColumn, boolean>
    : TColumn["dataType"] extends "json"
      ? TColumn["_"]["columnType"] extends "PgGeometryObject"
        ? ColTypeIsNullOrUndefinedWithDefault<TColumn, {
          x: number;
          y: number;
        }>
      : ColTypeIsNullOrUndefinedWithDefault<TColumn, string>
    : TColumn["dataType"] extends "date" | "string" | "bigint"
      ? TColumn["enumValues"] extends [string, ...string[]]
        ? ColTypeIsNullOrUndefinedWithDefault<
          TColumn,
          TColumn["enumValues"][number]
        >
      : ColTypeIsNullOrUndefinedWithDefault<TColumn, string>
    : TColumn["dataType"] extends "number"
      ? ColTypeIsNullOrUndefinedWithDefault<TColumn, number>
    : TColumn["dataType"] extends "buffer"
      ? ColTypeIsNullOrUndefinedWithDefault<TColumn, number[]>
    : TColumn["dataType"] extends "array"
      ? TColumn["columnType"] extends "PgVector"
        ? ColTypeIsNullOrUndefinedWithDefault<TColumn, number[]>
      : TColumn["columnType"] extends "PgGeometry"
        ? ColTypeIsNullOrUndefinedWithDefault<TColumn, [number, number]>
      : ColTypeIsNullOrUndefinedWithDefault<
        TColumn,
        Array<
          GetColumnGqlDataType<
            TColumn extends { baseColumn: Column } ? TColumn["baseColumn"]
              : never
          > extends infer InnerColType
            ? InnerColType extends null | undefined ? never
            : InnerColType
            : never
        >
      >
    : never;

/**
 * Determines the GraphQL data type for a given column when updating data.
 *
 * The result is a union type that allows for null or undefined values to support partial updates.
 *
 * @template TColumn - The column being mapped.
 */
export type GetColumnGqlUpdateDataType<TColumn extends Column> =
  TColumn["dataType"] extends "boolean" ? boolean | null | undefined
    : TColumn["dataType"] extends "json"
      ? TColumn["_"]["columnType"] extends "PgGeometryObject" ?
          | {
            x: number;
            y: number;
          }
          | null
          | undefined
      : string | null | undefined
    : TColumn["dataType"] extends "date" | "string" | "bigint"
      ? TColumn["enumValues"] extends [string, ...string[]]
        ? TColumn["enumValues"][number] | null | undefined
      : string | null | undefined
    : TColumn["dataType"] extends "number" ? number | null | undefined
    : TColumn["dataType"] extends "buffer" ? number[] | null | undefined
    : TColumn["dataType"] extends "array"
      ? TColumn["columnType"] extends "PgVector" ? number[] | null | undefined
      : TColumn["columnType"] extends "PgGeometry"
        ? [number, number] | null | undefined
      :
        | Array<
          GetColumnGqlDataType<
            TColumn extends { baseColumn: Column } ? TColumn["baseColumn"]
              : never
          > extends infer InnerColType
            ? InnerColType extends null | undefined ? never
            : InnerColType
            : never
        >
        | null
        | undefined
    : never;

/**
 * Maps each column of a table to its corresponding GraphQL data type for select queries.
 *
 * @template TTable - The table whose columns are being mapped.
 * @template TColumns - An optional override for the table's columns.
 */
export type GetRemappedTableDataType<
  TTable extends Table,
  TColumns extends TTable["_"]["columns"] = TTable["_"]["columns"],
> = {
  [K in keyof TColumns]: GetColumnGqlDataType<TColumns[K]>;
};

/**
 * Maps each column of a table to its corresponding GraphQL data type for insert operations.
 *
 * @template TTable - The table whose columns are being mapped.
 */
export type GetRemappedTableInsertDataType<TTable extends Table> = {
  [K in keyof TTable["_"]["columns"]]: GetColumnGqlInsertDataType<
    TTable["_"]["columns"][K]
  >;
};

/**
 * Maps each column of a table to its corresponding GraphQL data type for update operations.
 *
 * @template TTable - The table whose columns are being mapped.
 */
export type GetRemappedTableUpdateDataType<TTable extends Table> = {
  [K in keyof TTable["_"]["columns"]]: GetColumnGqlUpdateDataType<
    TTable["_"]["columns"][K]
  >;
};

/**
 * Defines the core set of filter operators for a given column.
 *
 * Supported operators include equality, inequality, comparison operators, pattern matching,
 * array inclusion, and null checks.
 *
 * @template TColumn - The column for which filter operators are defined.
 * @template TColType - The GraphQL data type for the column.
 */
export type FilterColumnOperatorsCore<
  TColumn extends Column,
  TColType = GetColumnGqlDataType<TColumn>,
> = Partial<{
  eq: TColType;
  ne: TColType;
  lt: TColType;
  lte: TColType;
  gt: TColType;
  gte: TColType;
  like: string;
  notLike: string;
  ilike: string;
  notIlike: string;
  inArray: Array<TColType>;
  notInArray: Array<TColType>;
  isNull: boolean;
  isNotNull: boolean;
}>;

/**
 * Extends the core filter operators for a column with logical OR composition.
 *
 * @template TColumn - The column for which filter operators are defined.
 * @template TOperators - The base filter operators for the column.
 */
export type FilterColumnOperators<
  TColumn extends Column,
  TOperators extends FilterColumnOperatorsCore<TColumn> =
    FilterColumnOperatorsCore<TColumn>,
> = TOperators & {
  OR?: TOperators[];
};

/**
 * Defines the core filters for a table.
 *
 * Each column in the table can have an associated set of filter operators.
 *
 * @template TTable - The table for which filters are defined.
 */
export type FiltersCore<TTable extends Table> = Partial<
  {
    [Column in keyof TTable["_"]["columns"]]: FilterColumnOperatorsCore<
      TTable["_"]["columns"][Column]
    >;
  }
>;

/**
 * Represents the complete filter object for a table.
 *
 * Extends the core filters with an optional OR clause for combining filter conditions.
 *
 * @template TTable - The table for which filters are defined.
 * @template TFilterType - An optional override for the filter type.
 */
export type Filters<TTable extends Table, TFilterType = FiltersCore<TTable>> =
  & TFilterType
  & {
    OR?: TFilterType[];
  };

/**
 * Defines the ordering arguments for a table.
 *
 * For each column, an optional order definition can be provided specifying the sort direction and priority.
 *
 * @template TTable - The table for which ordering is defined.
 */
export type OrderByArgs<TTable extends Table> = {
  [Key in keyof TTable["_"]["columns"]]?: {
    direction: "asc" | "desc";
    priority: number;
  };
};

/**
 * Defines the generated GraphQL input types for a table.
 *
 * Includes input types for insert, update, ordering, and filtering operations.
 */
export type GeneratedTableTypesInputs = {
  insertInput: GraphQLInputObjectType;
  updateInput: GraphQLInputObjectType;
  tableOrder: GraphQLInputObjectType;
  tableFilters: GraphQLInputObjectType;
};

/**
 * Defines the generated GraphQL output types for a table.
 *
 * If WithReturning is true, additional types for individual table items are generated.
 *
 * @template WithReturning - A flag indicating whether mutations return detailed item data.
 */
export type GeneratedTableTypesOutputs<WithReturning extends boolean> =
  WithReturning extends true ? {
      selectSingleOutput: GraphQLObjectType;
      selectArrOutput: GraphQLNonNull<
        GraphQLList<GraphQLNonNull<GraphQLObjectType>>
      >;
      singleTableItemOutput: GraphQLObjectType;
      arrTableItemOutput: GraphQLNonNull<
        GraphQLList<GraphQLNonNull<GraphQLObjectType>>
      >;
    }
    : {
      selectSingleOutput: GraphQLObjectType;
      selectArrOutput: GraphQLNonNull<
        GraphQLList<GraphQLNonNull<GraphQLObjectType>>
      >;
    };

/**
 * Aggregates the generated GraphQL input and output types for a table.
 *
 * @template WithReturning - A flag indicating whether mutations return detailed item data.
 */
export type GeneratedTableTypes<WithReturning extends boolean> = {
  inputs: GeneratedTableTypesInputs;
  outputs: GeneratedTableTypesOutputs<WithReturning>;
};

/**
 * Represents the data required for constructing a GraphQL selection set.
 *
 * @template TWithOrder - A flag indicating whether ordering is enabled.
 *
 * @property filters - The input type for filtering data.
 * @property tableFields - A mapping of table field names to their converted column definitions.
 * @property relationFields - A mapping of relation field names to their converted relation column definitions with arguments.
 * @property order - The input type for ordering, if enabled; otherwise undefined.
 */
export type SelectData<TWithOrder extends boolean> = {
  filters: GraphQLInputObjectType;
  tableFields: Record<string, ConvertedColumn>;
  relationFields: Record<string, ConvertedRelationColumnWithArgs>;
  order: TWithOrder extends true ? GraphQLInputObjectType : undefined;
};

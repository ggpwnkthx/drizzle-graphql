import type {
  GraphQLEnumType,
  GraphQLFieldConfig,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
} from "graphql";

/**
 * Represents a database column that has been converted into a GraphQL type.
 *
 * This type encapsulates the GraphQL representation of a database column after conversion.
 * It supports various GraphQL types including scalar types, enums, non-null wrappers,
 * lists, and complex object types. Depending on the generic parameter `TIsInput`,
 * the conversion yields input types (for mutations and query arguments) or output types (for queries).
 *
 * @template TIsInput - A boolean flag indicating whether the conversion is for an input type.
 *   - When `true`, the type includes `GraphQLInputObjectType` and its variants.
 *   - When `false`, the type includes `GraphQLObjectType` and its variants.
 *
 * @property type - The GraphQL type representing the converted column. This can be:
 *   - For scalar values:
 *     - `GraphQLScalarType` or `GraphQLEnumType` (with optional `GraphQLNonNull` wrappers),
 *     - Lists of scalar types (optionally wrapped in `GraphQLNonNull`).
 *   - For non-scalar values:
 *     - When `TIsInput` is true: `GraphQLInputObjectType` (and its non-null/list variants),
 *     - When `TIsInput` is false: `GraphQLObjectType` (and its non-null/list variants).
 * @property description - An optional description for the column.
 */
export type ConvertedColumn<TIsInput extends boolean = false> = {
  type:
    | GraphQLScalarType
    | GraphQLEnumType
    | GraphQLNonNull<GraphQLScalarType>
    | GraphQLNonNull<GraphQLEnumType>
    | GraphQLList<GraphQLScalarType>
    | GraphQLList<GraphQLNonNull<GraphQLScalarType>>
    | GraphQLNonNull<GraphQLList<GraphQLScalarType>>
    | GraphQLNonNull<GraphQLList<GraphQLNonNull<GraphQLScalarType>>>
    | (TIsInput extends true ?
        | GraphQLInputObjectType
        | GraphQLNonNull<GraphQLInputObjectType>
        | GraphQLList<GraphQLInputObjectType>
        | GraphQLNonNull<GraphQLList<GraphQLInputObjectType>>
        | GraphQLNonNull<GraphQLList<GraphQLNonNull<GraphQLInputObjectType>>>
      :
        | GraphQLObjectType
        | GraphQLNonNull<GraphQLObjectType>
        | GraphQLList<GraphQLObjectType>
        | GraphQLNonNull<GraphQLList<GraphQLObjectType>>
        | GraphQLNonNull<GraphQLList<GraphQLNonNull<GraphQLObjectType>>>);
  description?: string;
};

/**
 * Extends a converted column with optional field arguments.
 *
 * This type represents a converted database column along with additional
 * GraphQL field arguments (if any) that may be required for resolving the field.
 *
 * @property args - An optional map of field arguments as defined in `GraphQLFieldConfig['args']`.
 */
export type ConvertedColumnWithArgs = ConvertedColumn & {
  args?: GraphQLFieldConfig<any, any>["args"];
};

/**
 * Represents a converted column intended specifically for GraphQL input objects.
 *
 * This type is used when the converted column is meant to serve as part of a GraphQL
 * input object type (e.g. for mutations).
 *
 * @property type - The `GraphQLInputObjectType` representing the converted input column.
 * @property description - An optional description for the input column.
 */
export type ConvertedInputColumn = {
  type: GraphQLInputObjectType;
  description?: string;
};

/**
 * Represents a database relation that has been converted into a GraphQL field type.
 *
 * This type is used to represent relational fields in GraphQL. It supports both singular
 * object types and non-null lists of object types.
 *
 * @property type - The GraphQL type representing the relation. It can be one of:
 *   - `GraphQLObjectType`
 *   - `GraphQLNonNull<GraphQLObjectType>`
 *   - `GraphQLNonNull<GraphQLList<GraphQLNonNull<GraphQLObjectType>>>`
 */
export type ConvertedRelationColumn = {
  type:
    | GraphQLObjectType
    | GraphQLNonNull<GraphQLObjectType>
    | GraphQLNonNull<GraphQLList<GraphQLNonNull<GraphQLObjectType>>>;
};

/**
 * Extends a converted relation column with optional field arguments.
 *
 * This type represents a converted relational field in GraphQL along with additional
 * arguments that can be provided when querying the relation.
 *
 * @property args - An optional map of field arguments as defined in `GraphQLFieldConfig['args']`.
 */
export type ConvertedRelationColumnWithArgs = ConvertedRelationColumn & {
  args?: GraphQLFieldConfig<any, any>["args"];
};

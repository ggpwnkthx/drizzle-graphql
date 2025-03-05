import { is } from "drizzle-orm";
import { MySqlDatabase } from "drizzle-orm/mysql-core";
import { PgDatabase } from "drizzle-orm/pg-core";
import { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import {
  type GraphQLFieldConfig,
  type GraphQLInputObjectType,
  GraphQLObjectType,
  GraphQLSchema,
  type GraphQLSchemaConfig,
} from "graphql";

import {
  generateMySQL,
  generatePG,
  generateSQLite,
} from "./util/builders/index.ts";
import type { ObjMap } from "graphql/jsutils/ObjMap";
import type {
  AnyDrizzleDB,
  BuildSchemaConfig,
  GeneratedData,
} from "./types.ts";

// Re-export custom type mapping and data remapping functions
export { registerGraphQLTypeMapping } from "./util/type-converter/index.ts";
export {
  registerRemapFromGraphQL,
  registerRemapToGraphQL,
} from "./util/data-mappers.ts";

/**
 * Generates a GraphQL schema based on the provided Drizzle ORM database instance.
 *
 * This function analyzes the Drizzle ORM schema embedded within the provided database instance and automatically constructs
 * a corresponding GraphQL schema. It supports MySQL, PostgreSQL, and SQLite by selecting the appropriate generator
 * function based on the type of the database instance.
 *
 * The generated schema includes:
 *  - A Query type built from the generated query fields.
 *  - Optionally, a Mutation type built from the generated mutation fields if the `mutations` config option is not explicitly disabled.
 *  - Custom input and output types generated from the Drizzle schema.
 *
 * @template TDbClient - A type extending AnyDrizzleDB that represents the Drizzle ORM database client.
 *
 * @param db - The Drizzle ORM database instance containing the schema information.
 * @param config - Optional configuration object for customizing schema generation.
 *   - relationsDepthLimit: A nonnegative integer specifying the maximum depth of relations to include in the schema.
 *   - mutations: If set to false, mutation fields will not be generated.
 *
 * @throws Will throw an error if the full schema is not found on the database instance.
 * @throws Will throw an error if the provided `relationsDepthLimit` is negative or not an integer.
 * @throws Will throw an error if the database instance type is unknown.
 *
 * @returns An object containing:
 *   - schema: The constructed GraphQLSchema instance.
 *   - entities: The full output from the schema generator, including queries, mutations, input types, and other type definitions.
 *
 * @example
 * ```ts
 * import { buildSchema } from "jsr:ggpwnkthx/drizzle-graphql";
 * import { MySqlDatabase } from 'drizzle-orm/mysql-core';
 * import { db } from './db.ts'; // your Drizzle ORM database instance
 *
 * const schemaData = buildSchema(db, { relationsDepthLimit: 2 });
 * console.log(schemaData.schema);
 * ```
 */
export const buildSchema = <TDbClient extends AnyDrizzleDB<any>>(
  db: TDbClient,
  config?: BuildSchemaConfig,
): GeneratedData<TDbClient> => {
  // Retrieve the full schema from the Drizzle database instance.
  const schema = db._.fullSchema;
  if (!schema) {
    throw new Error(
      "Drizzle-GraphQL Error: Schema not found in drizzle instance. Make sure you're using drizzle-orm v0.30.9 or above and schema is passed to drizzle constructor!",
    );
  }

  // Validate the relationsDepthLimit configuration if provided.
  if (typeof config?.relationsDepthLimit === "number") {
    if (config.relationsDepthLimit < 0) {
      throw new Error(
        "Drizzle-GraphQL Error: config.relationsDepthLimit is supposed to be nonnegative integer or undefined!",
      );
    }
    if (config.relationsDepthLimit !== ~~config.relationsDepthLimit) {
      throw new Error(
        "Drizzle-GraphQL Error: config.relationsDepthLimit is supposed to be nonnegative integer or undefined!",
      );
    }
  }

  // Determine the database type and generate the corresponding GraphQL entities.
  let generatorOutput;
  if (is(db, MySqlDatabase)) {
    generatorOutput = generateMySQL(db, schema, config?.relationsDepthLimit);
  } else if (is(db, PgDatabase)) {
    generatorOutput = generatePG(db, schema, config?.relationsDepthLimit);
  } else if (is(db, BaseSQLiteDatabase)) {
    generatorOutput = generateSQLite(db, schema, config?.relationsDepthLimit);
  } else {
    throw new Error("Drizzle-GraphQL Error: Unknown database instance type");
  }

  // Destructure generated queries, mutations, input types, and other types.
  const { queries, mutations, inputs, types } = generatorOutput;

  // Build the GraphQL schema configuration with the generated input and output types.
  const graphQLSchemaConfig: GraphQLSchemaConfig = {
    types: [
      ...Object.values(inputs),
      ...Object.values(types),
    ] as (GraphQLInputObjectType | GraphQLObjectType)[],
    query: new GraphQLObjectType({
      name: "Query",
      fields: queries as ObjMap<GraphQLFieldConfig<any, any, any>>,
    }),
  };

  // Optionally add a Mutation type if mutations are enabled in the config.
  if (config?.mutations !== false) {
    const mutation = new GraphQLObjectType({
      name: "Mutation",
      fields: mutations as ObjMap<GraphQLFieldConfig<any, any, any>>,
    });
    graphQLSchemaConfig.mutation = mutation;
  }

  // Create the final GraphQLSchema instance from the configuration.
  const outputSchema = new GraphQLSchema(graphQLSchemaConfig);

  return { schema: outputSchema, entities: generatorOutput };
};

// Re-export all types from the types module.
export * from "./types.ts";

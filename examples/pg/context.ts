/**
 * This module sets up the application context for a GraphQL server using a PostgreSQL database
 * with the Postgres.js client and Drizzle-ORM. It configures the database connection, builds the
 * GraphQL schema and its corresponding entity definitions, starts an HTTP server to handle GraphQL
 * requests, and initializes a GraphQL client for interacting with the server.
 *
 * The context includes:
 *  - A Postgres.js client and a Drizzle-ORM wrapped database instance.
 *  - A generated GraphQL schema and its associated entities.
 *  - A Deno HTTP server listening on port 3000.
 *  - A GraphQL client configured to connect to the local GraphQL endpoint.
 *
 * Environment variable:
 *  - LOG_SQL: If set, enables SQL logging in Drizzle-ORM.
 */

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "npm:postgres";
import { GraphQLHTTP } from "jsr:@deno-libs/gql";
import type { GraphQLSchema } from "graphql";
import { GraphQLClient } from "../../util/gql.ts";
import * as schema from "./schema.ts";
import { buildSchema, type GeneratedEntities } from "../../mod.ts";

/**
 * Context interface representing the runtime environment of the GraphQL server.
 *
 * @property db - The Drizzle-ORM wrapped PostgreSQL database instance.
 * @property client - The underlying Postgres.js client used for executing SQL queries.
 * @property schema - The generated GraphQL schema.
 * @property entities - The GraphQL entity definitions generated from the Drizzle-ORM schema.
 * @property server - The Deno HTTP server handling incoming requests.
 * @property gql - A GraphQL client for making requests to the local GraphQL server.
 * @property ac - An AbortController to manage the HTTP server's lifecycle.
 */
export interface Context {
  db: PostgresJsDatabase<typeof schema>;
  client: Sql;
  schema: GraphQLSchema;
  entities: GeneratedEntities<PostgresJsDatabase<typeof schema>>;
  server: Deno.HttpServer;
  gql: GraphQLClient;
  ac: AbortController;
}

// Create an empty context object that will hold all the runtime components.
const ctx: Context = {} as any;

// -----------------------------------------------------------------------------
// Database Client and Drizzle-ORM Setup
// -----------------------------------------------------------------------------

// Initialize the Postgres.js client using a connection string.
// The client is configured with a maximum of 1 connection and ignores notices.
ctx.client = postgres(`postgres://postgres:postgres@postgresql:5432/postgres`, {
  max: 1,
  onnotice: () => {
    /* ignore notices */
  },
  // Uncomment the following lines to enable query debugging.
  // debug: (_connection, query, params, _types) =>
  //   console.debug({ query, params }),
});

// Wrap the Postgres.js client with Drizzle-ORM, passing the schema.
// SQL logging is enabled if the LOG_SQL environment variable is set.
ctx.db = drizzle(ctx.client, {
  schema,
  logger: Deno.env.get("LOG_SQL") ? true : false,
});

// Build the GraphQL schema and generate the corresponding entity definitions
// from the Drizzle-ORM database instance.
const { schema: gqlSchema, entities } = buildSchema(ctx.db);
ctx.schema = gqlSchema;
ctx.entities = entities;

// -----------------------------------------------------------------------------
// HTTP Server Setup
// -----------------------------------------------------------------------------

// Create an AbortController to manage the lifecycle of the HTTP server.
ctx.ac = new AbortController();

// Start a Deno HTTP server on port 3000.
// The server listens for requests, and if the request pathname is "/graphql",
// it delegates handling to GraphQLHTTP; otherwise, it returns a 404 response.
ctx.server = Deno.serve(
  {
    signal: ctx.ac.signal,
    port: 3000,
    onListen({ hostname, port }) {
      console.log(`☁  Started on http://${hostname}:${port}`);
    },
  },
  async (req) => {
    const { pathname } = new URL(req.url);
    return pathname === "/graphql"
      ? await GraphQLHTTP<Request>({ schema: ctx.schema, graphiql: false })(req)
      : new Response("Not Found", { status: 404 });
  },
);

// -----------------------------------------------------------------------------
// GraphQL Client Setup
// -----------------------------------------------------------------------------

// Initialize a GraphQL client that connects to the local GraphQL endpoint.
ctx.gql = new GraphQLClient(`http://localhost:3000/graphql`);

// Export the context object as the default export so it can be used throughout the application.
export default ctx;

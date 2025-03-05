/**
 * This module sets up the application context for a GraphQL server backed by a Better SQLite3
 * database using Drizzle-ORM. It configures the database connection, builds the GraphQL schema,
 * starts an HTTP server to serve GraphQL requests, and initializes a GraphQL client for testing
 * or internal use.
 *
 * The context includes:
 * - A Better SQLite3 client wrapped by Drizzle-ORM.
 * - A GraphQL schema and its generated entities.
 * - A Deno HTTP server running on port 3000.
 * - A GraphQL client pointing to the local server endpoint.
 *
 * Environment variables:
 * - LOG_SQL: If set, enables SQL logging in Drizzle-ORM.
 */

import * as sqlite from "npm:better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import type { GraphQLSchema } from "graphql";
import { GraphQLHTTP } from "jsr:@deno-libs/gql";
import Database, { type Database as Client } from "npm:libsql";
import { buildSchema } from "../../mod.ts";
import * as schema from "./schema.ts";
import type { GeneratedEntities } from "../../types.ts";
import { GraphQLClient } from "../../util/gql.ts";

/**
 * Context interface representing the full runtime environment of the GraphQL server.
 *
 * @property db - The Drizzle-ORM wrapped SQLite database instance.
 * @property client - The underlying Better SQLite3 client.
 * @property schema - The generated GraphQL schema.
 * @property entities - The generated GraphQL entity definitions.
 * @property server - The Deno HTTP server instance.
 * @property gql - A GraphQL client configured to interact with the local GraphQL server.
 * @property ac - An AbortController to control the lifetime of the HTTP server.
 */
export interface Context {
  db: BaseSQLiteDatabase<"sync", any, typeof schema>;
  client: Client;
  schema: GraphQLSchema;
  entities: GeneratedEntities<BaseSQLiteDatabase<"sync", any, typeof schema>>;
  server: Deno.HttpServer;
  gql: GraphQLClient;
  ac: AbortController;
}

// Create a context object that will hold all runtime components.
const ctx: Context = {} as any;

// -----------------------------------------------------------------------------
// Database and ORM Setup
// -----------------------------------------------------------------------------

// Initialize the Better SQLite3 client with an in-memory database.
ctx.client = new Database(":memory:");

// Configure Drizzle-ORM with the SQLite client and provided schema.
// SQL logging is enabled if the LOG_SQL environment variable is set.
ctx.db = drizzle(ctx.client, {
  schema,
  logger: Deno.env.get("LOG_SQL") ? true : false,
});

// Build the GraphQL schema and generate the associated entity definitions from the Drizzle ORM instance.
const { schema: gqlSchema, entities } = buildSchema(ctx.db);
ctx.schema = gqlSchema;
ctx.entities = entities;

// -----------------------------------------------------------------------------
// HTTP Server Setup
// -----------------------------------------------------------------------------

// Create an AbortController to manage the HTTP server's lifetime.
ctx.ac = new AbortController();

// Start a Deno HTTP server on port 3000.
// The server listens for requests, and if the request pathname is "/graphql",
// it delegates handling to GraphQLHTTP; otherwise, it returns a 404 response.
ctx.server = Deno.serve({
  signal: ctx.ac.signal,
  port: 3000,
  onListen({ hostname, port }) {
    console.log(`☁  Started on http://${hostname}:${port}`);
  },
}, async (req) => {
  const { pathname } = new URL(req.url);
  return pathname === "/graphql"
    ? await GraphQLHTTP<Request>({
      schema: ctx.schema,
      graphiql: false,
    })(req)
    : new Response("Not Found", { status: 404 });
});

// -----------------------------------------------------------------------------
// GraphQL Client Setup
// -----------------------------------------------------------------------------

// Initialize a GraphQL client pointed at the local GraphQL endpoint.
ctx.gql = new GraphQLClient(`http://localhost:3000/graphql`);

// Export the context as the default export for use in other parts of the application.
export default ctx;

/**
 * This module sets up the application context for a GraphQL server backed by a MySQL database
 * using the MySQL2 client and Drizzle-ORM. It configures the database connection, builds the GraphQL
 * schema with generated entity definitions, starts an HTTP server to handle GraphQL requests, and
 * initializes a GraphQL client for interacting with the server.
 *
 * The context includes:
 *  - A MySQL2 connection wrapped by Drizzle-ORM.
 *  - A generated GraphQL schema and its associated entity definitions.
 *  - A Deno HTTP server listening on port 3000.
 *  - A GraphQL client configured to connect to the local GraphQL endpoint.
 *
 * Environment variable:
 *  - LOG_SQL: If set, enables SQL logging in Drizzle-ORM.
 */

import { drizzle, type MySql2Database as Database } from "drizzle-orm/mysql2";
import * as mysql from "npm:mysql2/promise";
import { GraphQLHTTP } from "jsr:@deno-libs/gql";
import type { GraphQLSchema } from "graphql";
import { GraphQLClient } from "../../util/gql.ts";
import * as schema from "./schema.ts";
import { buildSchema, type GeneratedEntities } from "../../mod.ts";

/**
 * Context interface representing the full runtime environment for the GraphQL server.
 *
 * @property db - The Drizzle-ORM wrapped MySQL database instance.
 * @property client - The MySQL2 connection client used to execute SQL queries.
 * @property schema - The generated GraphQL schema.
 * @property entities - The generated GraphQL entity definitions from the Drizzle-ORM schema.
 * @property server - The Deno HTTP server instance handling incoming requests.
 * @property gql - A GraphQL client configured to send requests to the local GraphQL endpoint.
 * @property ac - An AbortController to manage the lifetime of the HTTP server.
 */
export interface Context {
  db: Database<typeof schema>;
  client: mysql.Connection;
  schema: GraphQLSchema;
  entities: GeneratedEntities<Database<typeof schema>>;
  server: Deno.HttpServer;
  gql: GraphQLClient;
  ac: AbortController;
}

// Create a context object that will hold all the runtime components.
const ctx: Context = {} as any;

// -----------------------------------------------------------------------------
// Database Client and Drizzle-ORM Setup
// -----------------------------------------------------------------------------

// Establish a connection to the MySQL database using MySQL2 in promise mode.
// The connection string includes the credentials and host information.
ctx.client = await mysql.createConnection(
  `mysql://root:mysql@mysql:3306/drizzle`,
);
// Ensure the connection is established.
await ctx.client.connect();

// Wrap the MySQL connection with Drizzle-ORM to create a high-level database instance.
// The schema is passed in, and SQL logging is enabled if the LOG_SQL environment variable is set.
// The mode 'default' is specified for standard behavior.
ctx.db = drizzle(ctx.client, {
  schema,
  logger: Deno.env.get("LOG_SQL") ? true : false,
  mode: "default",
});

// Build the GraphQL schema and generate entity definitions based on the Drizzle-ORM instance.
const { schema: gqlSchema, entities } = buildSchema(ctx.db);
ctx.schema = gqlSchema;
ctx.entities = entities;

// -----------------------------------------------------------------------------
// HTTP Server Setup
// -----------------------------------------------------------------------------

// Create an AbortController to control the lifetime of the HTTP server.
ctx.ac = new AbortController();

// Start a Deno HTTP server on port 3000.
// The server listens for incoming requests, and if the request URL pathname is "/graphql",
// it handles the request with GraphQLHTTP; otherwise, it responds with a 404 "Not Found".
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

// Initialize a GraphQL client that points to the local GraphQL endpoint.
ctx.gql = new GraphQLClient(`http://localhost:3000/graphql`);

// Export the context as the default export so it can be used throughout the application.
export default ctx;

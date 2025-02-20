import { drizzle } from "drizzle-orm/better-sqlite3";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import type { GraphQLSchema } from "graphql";
import { GraphQLHTTP } from "jsr:@deno-libs/gql";
import Database, { type Database as Client } from "npm:libsql";
import { buildSchema } from "../../mod.ts";
import * as schema from "./schema.ts";
import type { GeneratedEntities } from "../../types.ts";
import { GraphQLClient } from "../../util/gql.ts";

export interface Context {
  db: BaseSQLiteDatabase<"sync", any, typeof schema>;
  client: Client;
  schema: GraphQLSchema;
  entities: GeneratedEntities<BaseSQLiteDatabase<"sync", any, typeof schema>>;
  server: Deno.HttpServer;
  gql: GraphQLClient;
  ac: AbortController;
}

const ctx: Context = {} as any;

ctx.client = new Database(":memory:");

ctx.db = drizzle(ctx.client, {
  schema,
  logger: Deno.env.get("LOG_SQL") ? true : false,
});

const { schema: gqlSchema, entities } = buildSchema(ctx.db);
ctx.schema = gqlSchema;
ctx.entities = entities;

ctx.ac = new AbortController();
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

ctx.gql = new GraphQLClient(`http://localhost:3000/graphql`);

export default ctx;

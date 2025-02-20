import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "npm:postgres";
import { GraphQLHTTP } from "jsr:@deno-libs/gql";
import type { GraphQLSchema } from "graphql";
import { GraphQLClient } from "../../util/gql.ts";
import * as schema from "./schema.ts";
import { buildSchema, type GeneratedEntities } from "../../mod.ts";

export interface Context {
  db: PostgresJsDatabase<typeof schema>;
  client: Sql;
  schema: GraphQLSchema;
  entities: GeneratedEntities<PostgresJsDatabase<typeof schema>>;
  server: Deno.HttpServer;
  gql: GraphQLClient;
  ac: AbortController;
}

const ctx: Context = {} as any;

ctx.client = postgres(`postgres://postgres:postgres@postgresql:5432/postgres`, {
  max: 1,
  onnotice: () => {/* ignore notices */},
  // debug: (_connection, query, params, _types) =>
  //   console.debug({query, params}),
});

ctx.db = drizzle(ctx.client, {
  schema,
  logger: Deno.env.get("LOG_SQL") ? true : false,
});

const { schema: gqlSchema, entities } = buildSchema(ctx.db);
ctx.schema = gqlSchema;
ctx.entities = entities;

ctx.ac = new AbortController();
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
      ? await GraphQLHTTP<Request>({ schema: ctx.schema, graphiql: false })(
        req,
      )
      : new Response("Not Found", { status: 404 });
  },
);

ctx.gql = new GraphQLClient(`http://localhost:3000/graphql`);

export default ctx;

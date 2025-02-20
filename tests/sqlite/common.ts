import { sql } from "drizzle-orm";
import type { Context } from "../../examples/sqlite/context.ts";
import * as schema from "../../examples/sqlite/schema.ts"

// -------------------- Per–Test Hooks --------------------
export async function beforeEachTest(ctx: Context) {
  // Create tables
  await ctx.db.run(sql`CREATE TABLE IF NOT EXISTS \`customers\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`address\` text NOT NULL,
    \`is_confirmed\` integer,
    \`registration_date\` integer NOT NULL,
    \`user_id\` integer NOT NULL,
    FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE no action
  );`);
  await ctx.db.run(sql`CREATE TABLE IF NOT EXISTS \`posts\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`content\` text,
    \`author_id\` integer
  );`);
  await ctx.db.run(sql`CREATE TABLE IF NOT EXISTS \`users\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`name\` text NOT NULL,
    \`email\` text,
    \`text_json\` text,
    \`blob_bigint\` blob,
    \`numeric\` numeric,
    \`created_at\` integer,
    \`created_at_ms\` integer,
    \`real\` real,
    \`text\` text(255),
    \`role\` text DEFAULT 'user',
    \`is_confirmed\` integer
  );`);

  // Insert data into users, posts, and customers
  await ctx.db.insert(schema.Users).values([
    {
      id: 1,
      name: "FirstUser",
      email: "userOne@notmail.com",
      textJson: { field: "value" },
      blobBigInt: BigInt(10),
      numeric: "250.2",
      createdAt: new Date("2024-04-02T06:44:41.785Z"),
      createdAtMs: new Date("2024-04-02T06:44:41.785Z"),
      real: 13.5,
      text: "sometext",
      role: "admin",
      isConfirmed: true,
    },
    {
      id: 2,
      name: "SecondUser",
      createdAt: new Date("2024-04-02T06:44:41.785Z"),
    },
    {
      id: 5,
      name: "FifthUser",
      createdAt: new Date("2024-04-02T06:44:41.785Z"),
    },
  ]);
  await ctx.db.insert(schema.Posts).values([
    { id: 1, authorId: 1, content: "1MESSAGE" },
    { id: 2, authorId: 1, content: "2MESSAGE" },
    { id: 3, authorId: 1, content: "3MESSAGE" },
    { id: 4, authorId: 5, content: "1MESSAGE" },
    { id: 5, authorId: 5, content: "2MESSAGE" },
    { id: 6, authorId: 1, content: "4MESSAGE" },
  ]);
  await ctx.db.insert(schema.Customers).values([
    {
      id: 1,
      address: "AdOne",
      isConfirmed: false,
      registrationDate: new Date("2024-03-27T03:54:45.235Z"),
      userId: 1,
    },
    {
      id: 2,
      address: "AdTwo",
      isConfirmed: false,
      registrationDate: new Date("2024-03-27T03:55:42.358Z"),
      userId: 2,
    },
  ]);
}

export async function afterEachTest(ctx: Context) {
  await ctx.db.run(sql`PRAGMA foreign_keys = OFF;`);
  await ctx.db.run(sql`DROP TABLE IF EXISTS \`customers\`;`);
  await ctx.db.run(sql`DROP TABLE IF EXISTS \`posts\`;`);
  await ctx.db.run(sql`DROP TABLE IF EXISTS \`users\`;`);
  await ctx.db.run(sql`PRAGMA foreign_keys = ON;`);
}

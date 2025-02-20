import { sql } from "drizzle-orm";
import type { Context } from "../../examples/pg/context.ts";
import * as schema from "../../examples/pg/schema.ts";

export async function beforeEachTest(ctx: Context): Promise<void> {
  // Create the tables
  await ctx.db.execute(sql`
    CREATE TABLE IF NOT EXISTS "customers" (
      "id" serial PRIMARY KEY NOT NULL,
      "address" text NOT NULL,
      "is_confirmed" boolean,
      "registration_date" timestamp DEFAULT now() NOT NULL,
      "user_id" integer NOT NULL
    );
  `);

  await ctx.db.execute(sql`
    CREATE TABLE IF NOT EXISTS "posts" (
      "id" serial PRIMARY KEY NOT NULL,
      "content" text,
      "author_id" integer
    );
  `);

  await ctx.db.execute(sql`
    CREATE TABLE IF NOT EXISTS "users" (
      "a" integer[],
      "id" serial PRIMARY KEY NOT NULL,
      "name" text NOT NULL,
      "email" text,
      "birthday_string" date,
      "birthday_date" date,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "role" "role",
      "role1" text,
      "role2" text DEFAULT 'user',
      "profession" varchar(20),
      "initials" char(2),
      "is_confirmed" boolean,
      "vector_column" vector(5),
      "geometry_xy" geometry(point),
      "geometry_tuple" geometry(point)
    );
  `);

  // Add foreign key constraint (if not already there)
  await ctx.db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_users_id_fk" FOREIGN KEY ("user_id")
      REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // Create the "role" enum type if it does not already exist.
  await ctx.db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "role" AS ENUM('admin', 'user');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // Insert seed data into the tables
  await ctx.db.insert(schema.Users).values([
    {
      a: [1, 5, 10, 25, 40],
      id: 1,
      name: "FirstUser",
      email: "userOne@notmail.com",
      birthdayString: "2024-04-02T06:44:41.785Z",
      birthdayDate: new Date("2024-04-02T06:44:41.785Z"),
      createdAt: new Date("2024-04-02T06:44:41.785Z"),
      role: "admin",
      roleText: null,
      profession: "FirstUserProf",
      initials: "FU",
      isConfirmed: true,
      vector: [1, 2, 3, 4, 5],
      geoXy: {
        x: 20,
        y: 20.3,
      },
      geoTuple: [20, 20.3],
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

export async function afterEachTest(ctx: Context): Promise<void> {
  await ctx.db.execute(sql`DROP TABLE "posts" CASCADE;`);
  await ctx.db.execute(sql`DROP TABLE "customers" CASCADE;`);
  await ctx.db.execute(sql`DROP TABLE "users" CASCADE;`);
}

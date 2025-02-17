// pg/test.ts
import { assertEquals, assertInstanceOf } from "jsr:@std/assert";
import {
  beforeEachTest,
  afterEachTest,
  globalSetup,
  type Context,
} from "./common.ts";

const ctx = {} as Context;

// Do the global setup once (this starts the Docker container, connects to PG, builds the GraphQL schema, and starts the HTTP server)
await globalSetup(ctx);

Deno.test("Queries", async (t) => {
  await t.step("Select", async (s) => {
    await s.step("Single", async () => {
      await beforeEachTest(ctx);
      try {
        const res = await ctx.gql.queryGql(`
          {
            usersSingle {
              a
              id
              name
              email
              birthdayString
              birthdayDate
              createdAt
              role
              roleText
              roleText2
              profession
              initials
              isConfirmed
              vector
              geoXy {
                x
                y
              }
              geoTuple
            }
            postsSingle {
              id
              authorId
              content
            }
          }
        `);
        // Based on the seed data in beforeEachTest, the first (single) user is the one with id=1.
        assertEquals(res, {
          data: {
            usersSingle: {
              a: [1, 5, 10, 25, 40],
              id: 1,
              name: "FirstUser",
              email: "userOne@notmail.com",
              birthdayString: "2024-04-02",
              birthdayDate: "2024-04-02T00:00:00.000Z",
              createdAt: "2024-04-02T06:44:41.785Z",
              role: "admin",
              roleText: null,
              roleText2: "user",
              profession: "FirstUserProf",
              initials: "FU",
              isConfirmed: true,
              vector: [1, 2, 3, 4, 5],
              geoXy: { x: 20, y: 20.3 },
              geoTuple: [20, 20.3],
            },
            postsSingle: {
              id: 1,
              authorId: 1,
              content: "1MESSAGE",
            },
          },
        });
      } finally {
        await afterEachTest(ctx);
      }
    });

    await s.step("Array", async () => {
      await beforeEachTest(ctx);
      try {
        const res = await ctx.gql.queryGql(`
          {
            users {
              a
              id
              name
              email
              birthdayString
              birthdayDate
              createdAt
              role
              roleText
              roleText2
              profession
              initials
              isConfirmed
              vector
              geoXy {
                x
                y
              }
              geoTuple
            }
            posts {
              id
              authorId
              content
            }
          }
        `);
        // The seed inserts three users and six posts.
        assertEquals(res, {
          data: {
            users: [
              {
                a: [1, 5, 10, 25, 40],
                id: 1,
                name: "FirstUser",
                email: "userOne@notmail.com",
                birthdayString: "2024-04-02",
                birthdayDate: "2024-04-02T00:00:00.000Z",
                createdAt: "2024-04-02T06:44:41.785Z",
                role: "admin",
                roleText: null,
                roleText2: "user",
                profession: "FirstUserProf",
                initials: "FU",
                isConfirmed: true,
                vector: [1, 2, 3, 4, 5],
                geoXy: { x: 20, y: 20.3 },
                geoTuple: [20, 20.3],
              },
              {
                a: null,
                id: 2,
                name: "SecondUser",
                email: null,
                birthdayString: null,
                birthdayDate: null,
                createdAt: "2024-04-02T06:44:41.785Z",
                role: null,
                roleText: null,
                roleText2: "user",
                profession: null,
                initials: null,
                isConfirmed: null,
                vector: null,
                geoXy: null,
                geoTuple: null,
              },
              {
                a: null,
                id: 5,
                name: "FifthUser",
                email: null,
                birthdayString: null,
                birthdayDate: null,
                createdAt: "2024-04-02T06:44:41.785Z",
                role: null,
                roleText: null,
                roleText2: "user",
                profession: null,
                initials: null,
                isConfirmed: null,
                vector: null,
                geoXy: null,
                geoTuple: null,
              },
            ],
            posts: [
              { id: 1, authorId: 1, content: "1MESSAGE" },
              { id: 2, authorId: 1, content: "2MESSAGE" },
              { id: 3, authorId: 1, content: "3MESSAGE" },
              { id: 4, authorId: 5, content: "1MESSAGE" },
              { id: 5, authorId: 5, content: "2MESSAGE" },
              { id: 6, authorId: 1, content: "4MESSAGE" },
            ],
          },
        });
      } finally {
        await afterEachTest(ctx);
      }
    });
  });
});

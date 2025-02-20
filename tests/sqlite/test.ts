import { assertEquals } from "jsr:@std/assert";
import { afterEachTest, beforeEachTest } from "./common.ts";
import ctx from "../../examples/sqlite/context.ts";
import Tests from "../common.ts";

Deno.test("Drizzle-GraphQL - SQLite", async (test) => {
  await test.step("Queries", async (t) => {
    await t.step("Select", async (s) => {
      await s.step("Single", async () => {
        await beforeEachTest(ctx);
        try {
          const res = await ctx.gql.queryGql(`
          {
            usersSingle {
              id
              name
              email
              textJson
              blobBigInt
              numeric
              createdAt
              createdAtMs
              real
              text
              role
              isConfirmed
            }
            postsSingle {
              id
              authorId
              content
            }
          }
        `);
          assertEquals(res, {
            data: {
              usersSingle: {
                id: 1,
                name: "FirstUser",
                email: "userOne@notmail.com",
                textJson: '{"field":"value"}',
                blobBigInt: "10",
                numeric: "250.2",
                createdAt: "2024-04-02T06:44:41.000Z",
                createdAtMs: "2024-04-02T06:44:41.785Z",
                real: 13.5,
                text: "sometext",
                role: "admin",
                isConfirmed: true,
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
              id
              name
              email
              textJson
              blobBigInt
              numeric
              createdAt
              createdAtMs
              real
              text
              role
              isConfirmed
            }
            posts {
              id
              authorId
              content
            }
          }
        `);
          assertEquals(res, {
            data: {
              users: [
                {
                  id: 1,
                  name: "FirstUser",
                  email: "userOne@notmail.com",
                  textJson: '{"field":"value"}',
                  blobBigInt: "10",
                  numeric: "250.2",
                  createdAt: "2024-04-02T06:44:41.000Z",
                  createdAtMs: "2024-04-02T06:44:41.785Z",
                  real: 13.5,
                  text: "sometext",
                  role: "admin",
                  isConfirmed: true,
                },
                {
                  id: 2,
                  name: "SecondUser",
                  email: null,
                  blobBigInt: null,
                  textJson: null,
                  createdAt: "2024-04-02T06:44:41.000Z",
                  createdAtMs: null,
                  numeric: null,
                  real: null,
                  text: null,
                  role: "user",
                  isConfirmed: null,
                },
                {
                  id: 5,
                  name: "FifthUser",
                  email: null,
                  createdAt: "2024-04-02T06:44:41.000Z",
                  role: "user",
                  blobBigInt: null,
                  textJson: null,
                  createdAtMs: null,
                  numeric: null,
                  real: null,
                  text: null,
                  isConfirmed: null,
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

      await s.step("Single with relations", async () => {
        await beforeEachTest(ctx);
        try {
          const res = await ctx.gql.queryGql(`
          {
            usersSingle {
              id
              name
              email
              textJson
              blobBigInt
              numeric
              createdAt
              createdAtMs
              real
              text
              role
              isConfirmed
              posts {
                id
                authorId
                content
              }
            }
            postsSingle {
              id
              authorId
              content
              author {
                id
                name
                email
                textJson
                numeric
                createdAt
                createdAtMs
                real
                text
                role
                isConfirmed
              }
            }
          }
        `);
          assertEquals(res, {
            data: {
              usersSingle: {
                id: 1,
                name: "FirstUser",
                email: "userOne@notmail.com",
                textJson: '{"field":"value"}',
                blobBigInt: "10",
                numeric: "250.2",
                createdAt: "2024-04-02T06:44:41.000Z",
                createdAtMs: "2024-04-02T06:44:41.785Z",
                real: 13.5,
                text: "sometext",
                role: "admin",
                isConfirmed: true,
                posts: [
                  { id: 1, authorId: 1, content: "1MESSAGE" },
                  { id: 2, authorId: 1, content: "2MESSAGE" },
                  { id: 3, authorId: 1, content: "3MESSAGE" },
                  { id: 6, authorId: 1, content: "4MESSAGE" },
                ],
              },
              postsSingle: {
                id: 1,
                authorId: 1,
                content: "1MESSAGE",
                author: {
                  id: 1,
                  name: "FirstUser",
                  email: "userOne@notmail.com",
                  textJson: '{"field":"value"}',
                  numeric: "250.2",
                  createdAt: "2024-04-02T06:44:41.000Z",
                  createdAtMs: "2024-04-02T06:44:41.785Z",
                  real: 13.5,
                  text: "sometext",
                  role: "admin",
                  isConfirmed: true,
                },
              },
            },
          });
        } finally {
          await afterEachTest(ctx);
        }
      });

      await s.step("Array with relations", async () => {
        await beforeEachTest(ctx);
        try {
          const res = await ctx.gql.queryGql(`
          {
            users {
              id
              name
              email
              textJson
              blobBigInt
              numeric
              createdAt
              createdAtMs
              real
              text
              role
              isConfirmed
              posts {
                id
                authorId
                content
              }
            }
            posts {
              id
              authorId
              content
              author {
                id
                name
                email
                textJson
                numeric
                createdAt
                createdAtMs
                real
                text
                role
                isConfirmed
              }
            }
          }
        `);
          assertEquals(res, {
            data: {
              users: [
                {
                  id: 1,
                  name: "FirstUser",
                  email: "userOne@notmail.com",
                  textJson: '{"field":"value"}',
                  blobBigInt: "10",
                  numeric: "250.2",
                  createdAt: "2024-04-02T06:44:41.000Z",
                  createdAtMs: "2024-04-02T06:44:41.785Z",
                  real: 13.5,
                  text: "sometext",
                  role: "admin",
                  isConfirmed: true,
                  posts: [
                    { id: 1, authorId: 1, content: "1MESSAGE" },
                    { id: 2, authorId: 1, content: "2MESSAGE" },
                    { id: 3, authorId: 1, content: "3MESSAGE" },
                    { id: 6, authorId: 1, content: "4MESSAGE" },
                  ],
                },
                {
                  id: 2,
                  name: "SecondUser",
                  email: null,
                  textJson: null,
                  blobBigInt: null,
                  numeric: null,
                  createdAt: "2024-04-02T06:44:41.000Z",
                  createdAtMs: null,
                  real: null,
                  text: null,
                  role: "user",
                  isConfirmed: null,
                  posts: [],
                },
                {
                  id: 5,
                  name: "FifthUser",
                  email: null,
                  textJson: null,
                  blobBigInt: null,
                  numeric: null,
                  createdAt: "2024-04-02T06:44:41.000Z",
                  createdAtMs: null,
                  real: null,
                  text: null,
                  role: "user",
                  isConfirmed: null,
                  posts: [
                    { id: 4, authorId: 5, content: "1MESSAGE" },
                    { id: 5, authorId: 5, content: "2MESSAGE" },
                  ],
                },
              ],
              posts: [
                {
                  id: 1,
                  authorId: 1,
                  content: "1MESSAGE",
                  author: {
                    id: 1,
                    name: "FirstUser",
                    email: "userOne@notmail.com",
                    textJson: '{"field":"value"}',
                    numeric: "250.2",
                    createdAt: "2024-04-02T06:44:41.000Z",
                    createdAtMs: "2024-04-02T06:44:41.785Z",
                    real: 13.5,
                    text: "sometext",
                    role: "admin",
                    isConfirmed: true,
                  },
                },
                {
                  id: 2,
                  authorId: 1,
                  content: "2MESSAGE",
                  author: {
                    id: 1,
                    name: "FirstUser",
                    email: "userOne@notmail.com",
                    textJson: '{"field":"value"}',
                    numeric: "250.2",
                    createdAt: "2024-04-02T06:44:41.000Z",
                    createdAtMs: "2024-04-02T06:44:41.785Z",
                    real: 13.5,
                    text: "sometext",
                    role: "admin",
                    isConfirmed: true,
                  },
                },
                {
                  id: 3,
                  authorId: 1,
                  content: "3MESSAGE",
                  author: {
                    id: 1,
                    name: "FirstUser",
                    email: "userOne@notmail.com",
                    textJson: '{"field":"value"}',
                    numeric: "250.2",
                    createdAt: "2024-04-02T06:44:41.000Z",
                    createdAtMs: "2024-04-02T06:44:41.785Z",
                    real: 13.5,
                    text: "sometext",
                    role: "admin",
                    isConfirmed: true,
                  },
                },
                {
                  id: 4,
                  authorId: 5,
                  content: "1MESSAGE",
                  author: {
                    id: 5,
                    name: "FifthUser",
                    email: null,
                    textJson: null,
                    numeric: null,
                    createdAt: "2024-04-02T06:44:41.000Z",
                    createdAtMs: null,
                    real: null,
                    text: null,
                    role: "user",
                    isConfirmed: null,
                  },
                },
                {
                  id: 5,
                  authorId: 5,
                  content: "2MESSAGE",
                  author: {
                    id: 5,
                    name: "FifthUser",
                    email: null,
                    textJson: null,
                    numeric: null,
                    createdAt: "2024-04-02T06:44:41.000Z",
                    createdAtMs: null,
                    real: null,
                    text: null,
                    role: "user",
                    isConfirmed: null,
                  },
                },
                {
                  id: 6,
                  authorId: 1,
                  content: "4MESSAGE",
                  author: {
                    id: 1,
                    name: "FirstUser",
                    email: "userOne@notmail.com",
                    textJson: '{"field":"value"}',
                    numeric: "250.2",
                    createdAt: "2024-04-02T06:44:41.000Z",
                    createdAtMs: "2024-04-02T06:44:41.785Z",
                    real: 13.5,
                    text: "sometext",
                    role: "admin",
                    isConfirmed: true,
                  },
                },
              ],
            },
          });
        } finally {
          await afterEachTest(ctx);
        }
      });

      await s.step("Single by fragment", async () => {
        await beforeEachTest(ctx);
        try {
          const res = await ctx.gql.queryGql(`
          query testQuery {
            usersSingle {
              ...UsersFrag
            }
            postsSingle {
              ...PostsFrag
            }
          }
          fragment UsersFrag on UsersSelectItem {
            id
            name
            email
            textJson
            blobBigInt
            numeric
            createdAt
            createdAtMs
            real
            text
            role
            isConfirmed
          }
          fragment PostsFrag on PostsSelectItem {
            id
            authorId
            content
          }
        `);
          assertEquals(res, {
            data: {
              usersSingle: {
                id: 1,
                name: "FirstUser",
                email: "userOne@notmail.com",
                textJson: '{"field":"value"}',
                blobBigInt: "10",
                numeric: "250.2",
                createdAt: "2024-04-02T06:44:41.000Z",
                createdAtMs: "2024-04-02T06:44:41.785Z",
                real: 13.5,
                text: "sometext",
                role: "admin",
                isConfirmed: true,
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

      await s.step("Array by fragment", async () => {
        await beforeEachTest(ctx);
        try {
          const res = await ctx.gql.queryGql(`
          query testQuery {
            users {
              ...UsersFrag
            }
            posts {
              ...PostsFrag
            }
          }
          fragment UsersFrag on UsersSelectItem {
            id
            name
            email
            textJson
            blobBigInt
            numeric
            createdAt
            createdAtMs
            real
            text
            role
            isConfirmed
          }
          fragment PostsFrag on PostsSelectItem {
            id
            authorId
            content
          }
        `);

          assertEquals(res, {
            data: {
              users: [
                {
                  id: 1,
                  name: "FirstUser",
                  email: "userOne@notmail.com",
                  textJson: '{"field":"value"}',
                  blobBigInt: "10",
                  numeric: "250.2",
                  createdAt: "2024-04-02T06:44:41.000Z",
                  createdAtMs: "2024-04-02T06:44:41.785Z",
                  real: 13.5,
                  text: "sometext",
                  role: "admin",
                  isConfirmed: true,
                },
                {
                  id: 2,
                  name: "SecondUser",
                  email: null,
                  blobBigInt: null,
                  textJson: null,
                  createdAt: "2024-04-02T06:44:41.000Z",
                  createdAtMs: null,
                  numeric: null,
                  real: null,
                  text: null,
                  role: "user",
                  isConfirmed: null,
                },
                {
                  id: 5,
                  name: "FifthUser",
                  email: null,
                  createdAt: "2024-04-02T06:44:41.000Z",
                  role: "user",
                  blobBigInt: null,
                  textJson: null,
                  createdAtMs: null,
                  numeric: null,
                  real: null,
                  text: null,
                  isConfirmed: null,
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

      await s.step("Single with relations by fragment", async () => {
        await beforeEachTest(ctx);
        try {
          const res = await ctx.gql.queryGql(`
          query testQuery {
            usersSingle {
              ...UsersFrag
            }
            postsSingle {
              ...PostsFrag
            }
          }
          fragment UsersFrag on UsersSelectItem {
            id
            name
            email
            textJson
            blobBigInt
            numeric
            createdAt
            createdAtMs
            real
            text
            role
            isConfirmed
            posts {
              id
              authorId
              content
            }
          }
          fragment PostsFrag on PostsSelectItem {
            id
            authorId
            content
            author {
              id
              name
              email
              textJson
              numeric
              createdAt
              createdAtMs
              real
              text
              role
              isConfirmed
            }
          }
        `);
          assertEquals(res, {
            data: {
              usersSingle: {
                id: 1,
                name: "FirstUser",
                email: "userOne@notmail.com",
                textJson: '{"field":"value"}',
                blobBigInt: "10",
                numeric: "250.2",
                createdAt: "2024-04-02T06:44:41.000Z",
                createdAtMs: "2024-04-02T06:44:41.785Z",
                real: 13.5,
                text: "sometext",
                role: "admin",
                isConfirmed: true,
                posts: [
                  { id: 1, authorId: 1, content: "1MESSAGE" },
                  { id: 2, authorId: 1, content: "2MESSAGE" },
                  { id: 3, authorId: 1, content: "3MESSAGE" },
                  { id: 6, authorId: 1, content: "4MESSAGE" },
                ],
              },
              postsSingle: {
                id: 1,
                authorId: 1,
                content: "1MESSAGE",
                author: {
                  id: 1,
                  name: "FirstUser",
                  email: "userOne@notmail.com",
                  textJson: '{"field":"value"}',
                  numeric: "250.2",
                  createdAt: "2024-04-02T06:44:41.000Z",
                  createdAtMs: "2024-04-02T06:44:41.785Z",
                  real: 13.5,
                  text: "sometext",
                  role: "admin",
                  isConfirmed: true,
                },
              },
            },
          });
        } finally {
          await afterEachTest(ctx);
        }
      });

      await s.step("Array with relations by fragment", async () => {
        await beforeEachTest(ctx);
        try {
          const res = await ctx.gql.queryGql(`
          query testQuery {
            users {
              ...UsersFrag
            }
            posts {
              ...PostsFrag
            }
          }
          fragment UsersFrag on UsersSelectItem {
            id
            name
            email
            textJson
            blobBigInt
            numeric
            createdAt
            createdAtMs
            real
            text
            role
            isConfirmed
            posts {
              id
              authorId
              content
            }
          }
          fragment PostsFrag on PostsSelectItem {
            id
            authorId
            content
            author {
              id
              name
              email
              textJson
              numeric
              createdAt
              createdAtMs
              real
              text
              role
              isConfirmed
            }
          }
        `);
          assertEquals(res, {
            data: {
              users: [
                {
                  id: 1,
                  name: "FirstUser",
                  email: "userOne@notmail.com",
                  textJson: '{"field":"value"}',
                  blobBigInt: "10",
                  numeric: "250.2",
                  createdAt: "2024-04-02T06:44:41.000Z",
                  createdAtMs: "2024-04-02T06:44:41.785Z",
                  real: 13.5,
                  text: "sometext",
                  role: "admin",
                  isConfirmed: true,
                  posts: [
                    { id: 1, authorId: 1, content: "1MESSAGE" },
                    { id: 2, authorId: 1, content: "2MESSAGE" },
                    { id: 3, authorId: 1, content: "3MESSAGE" },
                    { id: 6, authorId: 1, content: "4MESSAGE" },
                  ],
                },
                {
                  id: 2,
                  name: "SecondUser",
                  email: null,
                  textJson: null,
                  blobBigInt: null,
                  numeric: null,
                  createdAt: "2024-04-02T06:44:41.000Z",
                  createdAtMs: null,
                  real: null,
                  text: null,
                  role: "user",
                  isConfirmed: null,
                  posts: [],
                },
                {
                  id: 5,
                  name: "FifthUser",
                  email: null,
                  textJson: null,
                  blobBigInt: null,
                  numeric: null,
                  createdAt: "2024-04-02T06:44:41.000Z",
                  createdAtMs: null,
                  real: null,
                  text: null,
                  role: "user",
                  isConfirmed: null,
                  posts: [
                    { id: 4, authorId: 5, content: "1MESSAGE" },
                    { id: 5, authorId: 5, content: "2MESSAGE" },
                  ],
                },
              ],
              posts: [
                {
                  id: 1,
                  authorId: 1,
                  content: "1MESSAGE",
                  author: {
                    id: 1,
                    name: "FirstUser",
                    email: "userOne@notmail.com",
                    textJson: '{"field":"value"}',
                    numeric: "250.2",
                    createdAt: "2024-04-02T06:44:41.000Z",
                    createdAtMs: "2024-04-02T06:44:41.785Z",
                    real: 13.5,
                    text: "sometext",
                    role: "admin",
                    isConfirmed: true,
                  },
                },
                {
                  id: 2,
                  authorId: 1,
                  content: "2MESSAGE",
                  author: {
                    id: 1,
                    name: "FirstUser",
                    email: "userOne@notmail.com",
                    textJson: '{"field":"value"}',
                    numeric: "250.2",
                    createdAt: "2024-04-02T06:44:41.000Z",
                    createdAtMs: "2024-04-02T06:44:41.785Z",
                    real: 13.5,
                    text: "sometext",
                    role: "admin",
                    isConfirmed: true,
                  },
                },
                {
                  id: 3,
                  authorId: 1,
                  content: "3MESSAGE",
                  author: {
                    id: 1,
                    name: "FirstUser",
                    email: "userOne@notmail.com",
                    textJson: '{"field":"value"}',
                    numeric: "250.2",
                    createdAt: "2024-04-02T06:44:41.000Z",
                    createdAtMs: "2024-04-02T06:44:41.785Z",
                    real: 13.5,
                    text: "sometext",
                    role: "admin",
                    isConfirmed: true,
                  },
                },
                {
                  id: 4,
                  authorId: 5,
                  content: "1MESSAGE",
                  author: {
                    id: 5,
                    name: "FifthUser",
                    email: null,
                    textJson: null,
                    numeric: null,
                    createdAt: "2024-04-02T06:44:41.000Z",
                    createdAtMs: null,
                    real: null,
                    text: null,
                    role: "user",
                    isConfirmed: null,
                  },
                },
                {
                  id: 5,
                  authorId: 5,
                  content: "2MESSAGE",
                  author: {
                    id: 5,
                    name: "FifthUser",
                    email: null,
                    textJson: null,
                    numeric: null,
                    createdAt: "2024-04-02T06:44:41.000Z",
                    createdAtMs: null,
                    real: null,
                    text: null,
                    role: "user",
                    isConfirmed: null,
                  },
                },
                {
                  id: 6,
                  authorId: 1,
                  content: "4MESSAGE",
                  author: {
                    id: 1,
                    name: "FirstUser",
                    email: "userOne@notmail.com",
                    textJson: '{"field":"value"}',
                    numeric: "250.2",
                    createdAt: "2024-04-02T06:44:41.000Z",
                    createdAtMs: "2024-04-02T06:44:41.785Z",
                    real: 13.5,
                    text: "sometext",
                    role: "admin",
                    isConfirmed: true,
                  },
                },
              ],
            },
          });
        } finally {
          await afterEachTest(ctx);
        }
      });
    });

    await t.step("Insert", async (s) => {
      await s.step("Single", async () => {
        await beforeEachTest(ctx);
        try {
          const res = await ctx.gql.queryGql(`
          mutation {
            insertIntoUsersSingle(
              values: {
                id: 3
                name: "ThirdUser"
                email: "userThree@notmail.com"
                textJson: "{ \\"field\\": \\"value\\" }"
                blobBigInt: "10"
                numeric: "250.2"
                createdAt: "2024-04-02T06:44:41.785Z"
                createdAtMs: "2024-04-02T06:44:41.785Z"
                real: 13.5
                text: "sometext"
                role: admin
                isConfirmed: true
              }
            ) {
              id
              name
              email
              textJson
              blobBigInt
              numeric
              createdAt
              createdAtMs
              real
              text
              role
              isConfirmed
            }
          }
        `);
          assertEquals(res, {
            data: {
              insertIntoUsersSingle: {
                id: 3,
                name: "ThirdUser",
                email: "userThree@notmail.com",
                textJson: '{"field":"value"}',
                blobBigInt: "10",
                numeric: "250.2",
                createdAt: "2024-04-02T06:44:41.000Z",
                createdAtMs: "2024-04-02T06:44:41.785Z",
                real: 13.5,
                text: "sometext",
                role: "admin",
                isConfirmed: true,
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
          mutation {
            insertIntoUsers(
              values: [
                {
                  id: 3
                  name: "ThirdUser"
                  email: "userThree@notmail.com"
                  textJson: "{ \\"field\\": \\"value\\" }"
                  blobBigInt: "10"
                  numeric: "250.2"
                  createdAt: "2024-04-02T06:44:41.785Z"
                  createdAtMs: "2024-04-02T06:44:41.785Z"
                  real: 13.5
                  text: "sometext"
                  role: admin
                  isConfirmed: true
                }
                {
                  id: 4
                  name: "FourthUser"
                  email: "userFour@notmail.com"
                  textJson: "{ \\"field\\": \\"value\\" }"
                  blobBigInt: "10"
                  numeric: "250.2"
                  createdAt: "2024-04-02T06:44:41.785Z"
                  createdAtMs: "2024-04-02T06:44:41.785Z"
                  real: 13.5
                  text: "sometext"
                  role: user
                  isConfirmed: false
                }
              ]
            ) {
              id
              name
              email
              textJson
              blobBigInt
              numeric
              createdAt
              createdAtMs
              real
              text
              role
              isConfirmed
            }
          }
        `);
          assertEquals(res, {
            data: {
              insertIntoUsers: [
                {
                  id: 3,
                  name: "ThirdUser",
                  email: "userThree@notmail.com",
                  textJson: '{"field":"value"}',
                  blobBigInt: "10",
                  numeric: "250.2",
                  createdAt: "2024-04-02T06:44:41.000Z",
                  createdAtMs: "2024-04-02T06:44:41.785Z",
                  real: 13.5,
                  text: "sometext",
                  role: "admin",
                  isConfirmed: true,
                },
                {
                  id: 4,
                  name: "FourthUser",
                  email: "userFour@notmail.com",
                  textJson: '{"field":"value"}',
                  blobBigInt: "10",
                  numeric: "250.2",
                  createdAt: "2024-04-02T06:44:41.000Z",
                  createdAtMs: "2024-04-02T06:44:41.785Z",
                  real: 13.5,
                  text: "sometext",
                  role: "user",
                  isConfirmed: false,
                },
              ],
            },
          });
        } finally {
          await afterEachTest(ctx);
        }
      });
    });

    await t.step("Update", async () => {
      await beforeEachTest(ctx);
      try {
        const res = await ctx.gql.queryGql(`
        mutation {
          updateCustomers(set: { isConfirmed: true, address: "Edited" }) {
            id
            address
            isConfirmed
            registrationDate
            userId
          }
        }
      `);
        assertEquals(res, {
          data: {
            updateCustomers: [
              {
                id: 1,
                address: "Edited",
                isConfirmed: true,
                registrationDate: "2024-03-27T03:54:45.235Z",
                userId: 1,
              },
              {
                id: 2,
                address: "Edited",
                isConfirmed: true,
                registrationDate: "2024-03-27T03:55:42.358Z",
                userId: 2,
              },
            ],
          },
        });
      } finally {
        await afterEachTest(ctx);
      }
    });

    await t.step("Delete", async () => {
      await beforeEachTest(ctx);
      try {
        const res = await ctx.gql.queryGql(`
        mutation {
          deleteFromCustomers {
            id
            address
            isConfirmed
            registrationDate
            userId
          }
        }
      `);
        assertEquals(res, {
          data: {
            deleteFromCustomers: [
              {
                id: 1,
                address: "AdOne",
                isConfirmed: false,
                registrationDate: "2024-03-27T03:54:45.235Z",
                userId: 1,
              },
              {
                id: 2,
                address: "AdTwo",
                isConfirmed: false,
                registrationDate: "2024-03-27T03:55:42.358Z",
                userId: 2,
              },
            ],
          },
        });
      } finally {
        await afterEachTest(ctx);
      }
    });
  });

  await Tests.Types(test, ctx, beforeEachTest, afterEachTest);

  await Tests.Arguments(test, ctx, beforeEachTest, afterEachTest);

  await Tests.Returned(test, ctx, beforeEachTest, afterEachTest);

  await test.step("__typename", async (t) => {
    await t.step("Select", async (s) => {
      await s.step("single", async () => {
        await beforeEachTest(ctx);
        try {
          const res = await ctx.gql.queryGql(`
          {
            usersSingle { __typename }
            postsSingle { __typename }
          }
        `);
          assertEquals(res, {
            data: {
              usersSingle: { __typename: "UsersSelectItem" },
              postsSingle: { __typename: "PostsSelectItem" },
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
            users { __typename }
            posts { __typename }
          }
        `);
          assertEquals(res, {
            data: {
              users: [
                { __typename: "UsersSelectItem" },
                { __typename: "UsersSelectItem" },
                { __typename: "UsersSelectItem" },
              ],
              posts: [
                { __typename: "PostsSelectItem" },
                { __typename: "PostsSelectItem" },
                { __typename: "PostsSelectItem" },
                { __typename: "PostsSelectItem" },
                { __typename: "PostsSelectItem" },
                { __typename: "PostsSelectItem" },
              ],
            },
          });
        } finally {
          await afterEachTest(ctx);
        }
      });

      await s.step("Single with relations", async () => {
        await beforeEachTest(ctx);
        try {
          const res = await ctx.gql.queryGql(`
          {
            usersSingle {
              __typename
              posts { __typename }
            }
            postsSingle {
              __typename
              author { __typename }
            }
          }
        `);
          assertEquals(res, {
            data: {
              usersSingle: {
                __typename: "UsersSelectItem",
                posts: [
                  { __typename: "UsersPostsRelation" },
                  { __typename: "UsersPostsRelation" },
                  { __typename: "UsersPostsRelation" },
                  { __typename: "UsersPostsRelation" },
                ],
              },
              postsSingle: {
                __typename: "PostsSelectItem",
                author: { __typename: "PostsAuthorRelation" },
              },
            },
          });
        } finally {
          await afterEachTest(ctx);
        }
      });

      await s.step("Array with relations", async () => {
        await beforeEachTest(ctx);
        try {
          const res = await ctx.gql.queryGql(`
          {
            users {
              __typename
              posts { __typename }
            }
            posts {
              __typename
              author { __typename }
            }
          }
        `);
          assertEquals(res, {
            data: {
              users: [
                {
                  __typename: "UsersSelectItem",
                  posts: [
                    { __typename: "UsersPostsRelation" },
                    { __typename: "UsersPostsRelation" },
                    { __typename: "UsersPostsRelation" },
                    { __typename: "UsersPostsRelation" },
                  ],
                },
                { __typename: "UsersSelectItem", posts: [] },
                {
                  __typename: "UsersSelectItem",
                  posts: [
                    { __typename: "UsersPostsRelation" },
                    { __typename: "UsersPostsRelation" },
                  ],
                },
              ],
              posts: [
                {
                  __typename: "PostsSelectItem",
                  author: { __typename: "PostsAuthorRelation" },
                },
                {
                  __typename: "PostsSelectItem",
                  author: { __typename: "PostsAuthorRelation" },
                },
                {
                  __typename: "PostsSelectItem",
                  author: { __typename: "PostsAuthorRelation" },
                },
                {
                  __typename: "PostsSelectItem",
                  author: { __typename: "PostsAuthorRelation" },
                },
                {
                  __typename: "PostsSelectItem",
                  author: { __typename: "PostsAuthorRelation" },
                },
                {
                  __typename: "PostsSelectItem",
                  author: { __typename: "PostsAuthorRelation" },
                },
              ],
            },
          });
        } finally {
          await afterEachTest(ctx);
        }
      });
    });

    await t.step("Insert", async (s) => {
      await s.step("single", async () => {
        await beforeEachTest(ctx);
        try {
          const res = await ctx.gql.queryGql(`
          mutation {
            insertIntoUsersSingle(
              values: {
                id: 3
                name: "ThirdUser"
                email: "userThree@notmail.com"
                textJson: "{ \\"field\\": \\"value\\" }"
                blobBigInt: "10"
                numeric: "250.2"
                createdAt: "2024-04-02T06:44:41.785Z"
                createdAtMs: "2024-04-02T06:44:41.785Z"
                real: 13.5
                text: "sometext"
                role: admin
                isConfirmed: true
              }
            ) { __typename }
          }
        `);
          assertEquals(res, {
            data: { insertIntoUsersSingle: { __typename: "UsersItem" } },
          });
        } finally {
          await afterEachTest(ctx);
        }
      });

      await s.step("Array", async () => {
        await beforeEachTest(ctx);
        try {
          const res = await ctx.gql.queryGql(`
          mutation {
            insertIntoUsers(
              values: [
                {
                  id: 3
                  name: "ThirdUser"
                  email: "userThree@notmail.com"
                  textJson: "{ \\"field\\": \\"value\\" }"
                  blobBigInt: "10"
                  numeric: "250.2"
                  createdAt: "2024-04-02T06:44:41.785Z"
                  createdAtMs: "2024-04-02T06:44:41.785Z"
                  real: 13.5
                  text: "sometext"
                  role: admin
                  isConfirmed: true
                }
                {
                  id: 4
                  name: "FourthUser"
                  email: "userFour@notmail.com"
                  textJson: "{ \\"field\\": \\"value\\" }"
                  blobBigInt: "10"
                  numeric: "250.2"
                  createdAt: "2024-04-02T06:44:41.785Z"
                  createdAtMs: "2024-04-02T06:44:41.785Z"
                  real: 13.5
                  text: "sometext"
                  role: user
                  isConfirmed: false
                }
              ]
            ) { __typename }
          }
        `);
          assertEquals(res, {
            data: {
              insertIntoUsers: [
                { __typename: "UsersItem" },
                { __typename: "UsersItem" },
              ],
            },
          });
        } finally {
          await afterEachTest(ctx);
        }
      });
    });

    await t.step("Update", async () => {
      await beforeEachTest(ctx);
      try {
        const res = await ctx.gql.queryGql(`
        mutation {
          updateCustomers(set: { isConfirmed: true, address: "Edited" }) {
            __typename
          }
        }
      `);
        assertEquals(res, {
          data: {
            updateCustomers: [
              { __typename: "CustomersItem" },
              { __typename: "CustomersItem" },
            ],
          },
        });
      } finally {
        await afterEachTest(ctx);
      }
    });

    await t.step("Delete", async () => {
      await beforeEachTest(ctx);
      try {
        const res = await ctx.gql.queryGql(`
        mutation {
          deleteFromCustomers {
            __typename
          }
        }
      `);
        assertEquals(res, {
          data: {
            deleteFromCustomers: [
              { __typename: "CustomersItem" },
              { __typename: "CustomersItem" },
            ],
          },
        });
      } finally {
        await afterEachTest(ctx);
      }
    });

    await t.step("With data", async (d) => {
      await d.step("Select", async (s) => {
        await s.step("Single", async () => {
          await beforeEachTest(ctx);
          try {
            const res = await ctx.gql.queryGql(`
          {
            usersSingle {
              id
              name
              email
              textJson
              blobBigInt
              numeric
              createdAt
              createdAtMs
              real
              text
              role
              isConfirmed
              __typename
            }
            postsSingle {
              id
              authorId
              content
              __typename
            }
          }
        `);
            assertEquals(res, {
              data: {
                usersSingle: {
                  id: 1,
                  name: "FirstUser",
                  email: "userOne@notmail.com",
                  textJson: '{"field":"value"}',
                  blobBigInt: "10",
                  numeric: "250.2",
                  createdAt: "2024-04-02T06:44:41.000Z",
                  createdAtMs: "2024-04-02T06:44:41.785Z",
                  real: 13.5,
                  text: "sometext",
                  role: "admin",
                  isConfirmed: true,
                  __typename: "UsersSelectItem",
                },
                postsSingle: {
                  id: 1,
                  authorId: 1,
                  content: "1MESSAGE",
                  __typename: "PostsSelectItem",
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
              id
              name
              email
              textJson
              blobBigInt
              numeric
              createdAt
              createdAtMs
              real
              text
              role
              isConfirmed
              __typename
            }
            posts {
              id
              authorId
              content
              __typename
            }
          }
        `);
            assertEquals(res, {
              data: {
                users: [
                  {
                    id: 1,
                    name: "FirstUser",
                    email: "userOne@notmail.com",
                    textJson: '{"field":"value"}',
                    blobBigInt: "10",
                    numeric: "250.2",
                    createdAt: "2024-04-02T06:44:41.000Z",
                    createdAtMs: "2024-04-02T06:44:41.785Z",
                    real: 13.5,
                    text: "sometext",
                    role: "admin",
                    isConfirmed: true,
                    __typename: "UsersSelectItem",
                  },
                  {
                    id: 2,
                    name: "SecondUser",
                    email: null,
                    blobBigInt: null,
                    textJson: null,
                    createdAt: "2024-04-02T06:44:41.000Z",
                    createdAtMs: null,
                    numeric: null,
                    real: null,
                    text: null,
                    role: "user",
                    isConfirmed: null,
                    __typename: "UsersSelectItem",
                  },
                  {
                    id: 5,
                    name: "FifthUser",
                    email: null,
                    createdAt: "2024-04-02T06:44:41.000Z",
                    role: "user",
                    blobBigInt: null,
                    textJson: null,
                    createdAtMs: null,
                    numeric: null,
                    real: null,
                    text: null,
                    isConfirmed: null,
                    __typename: "UsersSelectItem",
                  },
                ],
                posts: [
                  {
                    id: 1,
                    authorId: 1,
                    content: "1MESSAGE",
                    __typename: "PostsSelectItem",
                  },
                  {
                    id: 2,
                    authorId: 1,
                    content: "2MESSAGE",
                    __typename: "PostsSelectItem",
                  },
                  {
                    id: 3,
                    authorId: 1,
                    content: "3MESSAGE",
                    __typename: "PostsSelectItem",
                  },
                  {
                    id: 4,
                    authorId: 5,
                    content: "1MESSAGE",
                    __typename: "PostsSelectItem",
                  },
                  {
                    id: 5,
                    authorId: 5,
                    content: "2MESSAGE",
                    __typename: "PostsSelectItem",
                  },
                  {
                    id: 6,
                    authorId: 1,
                    content: "4MESSAGE",
                    __typename: "PostsSelectItem",
                  },
                ],
              },
            });
          } finally {
            await afterEachTest(ctx);
          }
        });

        await s.step("Single with relations", async () => {
          await beforeEachTest(ctx);
          try {
            const res = await ctx.gql.queryGql(`
          {
            usersSingle {
              id
              name
              email
              textJson
              blobBigInt
              numeric
              createdAt
              createdAtMs
              real
              text
              role
              isConfirmed
              __typename
              posts {
                id
                authorId
                content
                __typename
              }
            }
            postsSingle {
              id
              authorId
              content
              __typename
              author {
                id
                name
                email
                textJson
                numeric
                createdAt
                createdAtMs
                real
                text
                role
                isConfirmed
                __typename
              }
            }
          }
        `);
            assertEquals(res, {
              data: {
                usersSingle: {
                  id: 1,
                  name: "FirstUser",
                  email: "userOne@notmail.com",
                  textJson: '{"field":"value"}',
                  blobBigInt: "10",
                  numeric: "250.2",
                  createdAt: "2024-04-02T06:44:41.000Z",
                  createdAtMs: "2024-04-02T06:44:41.785Z",
                  real: 13.5,
                  text: "sometext",
                  role: "admin",
                  isConfirmed: true,
                  __typename: "UsersSelectItem",
                  posts: [
                    {
                      id: 1,
                      authorId: 1,
                      content: "1MESSAGE",
                      __typename: "UsersPostsRelation",
                    },
                    {
                      id: 2,
                      authorId: 1,
                      content: "2MESSAGE",
                      __typename: "UsersPostsRelation",
                    },
                    {
                      id: 3,
                      authorId: 1,
                      content: "3MESSAGE",
                      __typename: "UsersPostsRelation",
                    },
                    {
                      id: 6,
                      authorId: 1,
                      content: "4MESSAGE",
                      __typename: "UsersPostsRelation",
                    },
                  ],
                },
                postsSingle: {
                  id: 1,
                  authorId: 1,
                  content: "1MESSAGE",
                  __typename: "PostsSelectItem",
                  author: {
                    id: 1,
                    name: "FirstUser",
                    email: "userOne@notmail.com",
                    textJson: '{"field":"value"}',
                    numeric: "250.2",
                    createdAt: "2024-04-02T06:44:41.000Z",
                    createdAtMs: "2024-04-02T06:44:41.785Z",
                    real: 13.5,
                    text: "sometext",
                    role: "admin",
                    isConfirmed: true,
                    __typename: "PostsAuthorRelation",
                  },
                },
              },
            });
          } finally {
            await afterEachTest(ctx);
          }
        });

        await s.step("Array with relations", async () => {
          await beforeEachTest(ctx);
          try {
            const res = await ctx.gql.queryGql(`
          {
            users {
              id
              name
              email
              textJson
              blobBigInt
              numeric
              createdAt
              createdAtMs
              real
              text
              role
              isConfirmed
              __typename
              posts {
                id
                authorId
                content
                __typename
              }
            }
            posts {
              id
              authorId
              content
              __typename
              author {
                id
                name
                email
                textJson
                numeric
                createdAt
                createdAtMs
                real
                text
                role
                isConfirmed
                __typename
              }
            }
          }
        `);
            assertEquals(res, {
              data: {
                users: [
                  {
                    id: 1,
                    name: "FirstUser",
                    email: "userOne@notmail.com",
                    textJson: '{"field":"value"}',
                    blobBigInt: "10",
                    numeric: "250.2",
                    createdAt: "2024-04-02T06:44:41.000Z",
                    createdAtMs: "2024-04-02T06:44:41.785Z",
                    real: 13.5,
                    text: "sometext",
                    role: "admin",
                    isConfirmed: true,
                    __typename: "UsersSelectItem",
                    posts: [
                      {
                        id: 1,
                        authorId: 1,
                        content: "1MESSAGE",
                        __typename: "UsersPostsRelation",
                      },
                      {
                        id: 2,
                        authorId: 1,
                        content: "2MESSAGE",
                        __typename: "UsersPostsRelation",
                      },
                      {
                        id: 3,
                        authorId: 1,
                        content: "3MESSAGE",
                        __typename: "UsersPostsRelation",
                      },
                      {
                        id: 6,
                        authorId: 1,
                        content: "4MESSAGE",
                        __typename: "UsersPostsRelation",
                      },
                    ],
                  },
                  {
                    id: 2,
                    name: "SecondUser",
                    email: null,
                    textJson: null,
                    blobBigInt: null,
                    numeric: null,
                    createdAt: "2024-04-02T06:44:41.000Z",
                    createdAtMs: null,
                    real: null,
                    text: null,
                    role: "user",
                    isConfirmed: null,
                    __typename: "UsersSelectItem",
                    posts: [],
                  },
                  {
                    id: 5,
                    name: "FifthUser",
                    email: null,
                    textJson: null,
                    blobBigInt: null,
                    numeric: null,
                    createdAt: "2024-04-02T06:44:41.000Z",
                    createdAtMs: null,
                    real: null,
                    text: null,
                    role: "user",
                    isConfirmed: null,
                    __typename: "UsersSelectItem",
                    posts: [
                      {
                        id: 4,
                        authorId: 5,
                        content: "1MESSAGE",
                        __typename: "UsersPostsRelation",
                      },
                      {
                        id: 5,
                        authorId: 5,
                        content: "2MESSAGE",
                        __typename: "UsersPostsRelation",
                      },
                    ],
                  },
                ],
                posts: [
                  {
                    id: 1,
                    authorId: 1,
                    content: "1MESSAGE",
                    __typename: "PostsSelectItem",
                    author: {
                      id: 1,
                      name: "FirstUser",
                      email: "userOne@notmail.com",
                      textJson: '{"field":"value"}',
                      numeric: "250.2",
                      createdAt: "2024-04-02T06:44:41.000Z",
                      createdAtMs: "2024-04-02T06:44:41.785Z",
                      real: 13.5,
                      text: "sometext",
                      role: "admin",
                      isConfirmed: true,
                      __typename: "PostsAuthorRelation",
                    },
                  },
                  {
                    id: 2,
                    authorId: 1,
                    content: "2MESSAGE",
                    __typename: "PostsSelectItem",
                    author: {
                      id: 1,
                      name: "FirstUser",
                      email: "userOne@notmail.com",
                      textJson: '{"field":"value"}',
                      numeric: "250.2",
                      createdAt: "2024-04-02T06:44:41.000Z",
                      createdAtMs: "2024-04-02T06:44:41.785Z",
                      real: 13.5,
                      text: "sometext",
                      role: "admin",
                      isConfirmed: true,
                      __typename: "PostsAuthorRelation",
                    },
                  },
                  {
                    id: 3,
                    authorId: 1,
                    content: "3MESSAGE",
                    __typename: "PostsSelectItem",
                    author: {
                      id: 1,
                      name: "FirstUser",
                      email: "userOne@notmail.com",
                      textJson: '{"field":"value"}',
                      numeric: "250.2",
                      createdAt: "2024-04-02T06:44:41.000Z",
                      createdAtMs: "2024-04-02T06:44:41.785Z",
                      real: 13.5,
                      text: "sometext",
                      role: "admin",
                      isConfirmed: true,
                      __typename: "PostsAuthorRelation",
                    },
                  },
                  {
                    id: 4,
                    authorId: 5,
                    content: "1MESSAGE",
                    __typename: "PostsSelectItem",
                    author: {
                      id: 5,
                      name: "FifthUser",
                      email: null,
                      textJson: null,
                      numeric: null,
                      createdAt: "2024-04-02T06:44:41.000Z",
                      createdAtMs: null,
                      real: null,
                      text: null,
                      role: "user",
                      isConfirmed: null,
                      __typename: "PostsAuthorRelation",
                    },
                  },
                  {
                    id: 5,
                    authorId: 5,
                    content: "2MESSAGE",
                    __typename: "PostsSelectItem",
                    author: {
                      id: 5,
                      name: "FifthUser",
                      email: null,
                      textJson: null,
                      numeric: null,
                      createdAt: "2024-04-02T06:44:41.000Z",
                      createdAtMs: null,
                      real: null,
                      text: null,
                      role: "user",
                      isConfirmed: null,
                      __typename: "PostsAuthorRelation",
                    },
                  },
                  {
                    id: 6,
                    authorId: 1,
                    content: "4MESSAGE",
                    __typename: "PostsSelectItem",
                    author: {
                      id: 1,
                      name: "FirstUser",
                      email: "userOne@notmail.com",
                      textJson: '{"field":"value"}',
                      numeric: "250.2",
                      createdAt: "2024-04-02T06:44:41.000Z",
                      createdAtMs: "2024-04-02T06:44:41.785Z",
                      real: 13.5,
                      text: "sometext",
                      role: "admin",
                      isConfirmed: true,
                      __typename: "PostsAuthorRelation",
                    },
                  },
                ],
              },
            });
          } finally {
            await afterEachTest(ctx);
          }
        });
      });

      await d.step("Insert", async (s) => {
        await s.step("Single", async () => {
          await beforeEachTest(ctx);
          try {
            const res = await ctx.gql.queryGql(`
          mutation {
            insertIntoUsersSingle(
              values: {
                id: 3
                name: "ThirdUser"
                email: "userThree@notmail.com"
                textJson: "{ \\"field\\": \\"value\\" }"
                blobBigInt: "10"
                numeric: "250.2"
                createdAt: "2024-04-02T06:44:41.785Z"
                createdAtMs: "2024-04-02T06:44:41.785Z"
                real: 13.5
                text: "sometext"
                role: admin
                isConfirmed: true
              }
            ) {
              id
              name
              email
              textJson
              blobBigInt
              numeric
              createdAt
              createdAtMs
              real
              text
              role
              isConfirmed
              __typename
            }
          }
        `);
            assertEquals(res, {
              data: {
                insertIntoUsersSingle: {
                  id: 3,
                  name: "ThirdUser",
                  email: "userThree@notmail.com",
                  textJson: '{"field":"value"}',
                  blobBigInt: "10",
                  numeric: "250.2",
                  createdAt: "2024-04-02T06:44:41.000Z",
                  createdAtMs: "2024-04-02T06:44:41.785Z",
                  real: 13.5,
                  text: "sometext",
                  role: "admin",
                  isConfirmed: true,
                  __typename: "UsersItem",
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
          mutation {
            insertIntoUsers(
              values: [
                {
                  id: 3
                  name: "ThirdUser"
                  email: "userThree@notmail.com"
                  textJson: "{ \\"field\\": \\"value\\" }"
                  blobBigInt: "10"
                  numeric: "250.2"
                  createdAt: "2024-04-02T06:44:41.785Z"
                  createdAtMs: "2024-04-02T06:44:41.785Z"
                  real: 13.5
                  text: "sometext"
                  role: admin
                  isConfirmed: true
                }
                {
                  id: 4
                  name: "FourthUser"
                  email: "userFour@notmail.com"
                  textJson: "{ \\"field\\": \\"value\\" }"
                  blobBigInt: "10"
                  numeric: "250.2"
                  createdAt: "2024-04-02T06:44:41.785Z"
                  createdAtMs: "2024-04-02T06:44:41.785Z"
                  real: 13.5
                  text: "sometext"
                  role: user
                  isConfirmed: false
                }
              ]
            ) {
              id
              name
              email
              textJson
              blobBigInt
              numeric
              createdAt
              createdAtMs
              real
              text
              role
              isConfirmed
              __typename
            }
          }
        `);
            assertEquals(res, {
              data: {
                insertIntoUsers: [
                  {
                    id: 3,
                    name: "ThirdUser",
                    email: "userThree@notmail.com",
                    textJson: '{"field":"value"}',
                    blobBigInt: "10",
                    numeric: "250.2",
                    createdAt: "2024-04-02T06:44:41.000Z",
                    createdAtMs: "2024-04-02T06:44:41.785Z",
                    real: 13.5,
                    text: "sometext",
                    role: "admin",
                    isConfirmed: true,
                    __typename: "UsersItem",
                  },
                  {
                    id: 4,
                    name: "FourthUser",
                    email: "userFour@notmail.com",
                    textJson: '{"field":"value"}',
                    blobBigInt: "10",
                    numeric: "250.2",
                    createdAt: "2024-04-02T06:44:41.000Z",
                    createdAtMs: "2024-04-02T06:44:41.785Z",
                    real: 13.5,
                    text: "sometext",
                    role: "user",
                    isConfirmed: false,
                    __typename: "UsersItem",
                  },
                ],
              },
            });
          } finally {
            await afterEachTest(ctx);
          }
        });
      });

      await d.step("Update", async () => {
        await beforeEachTest(ctx);
        try {
          const res = await ctx.gql.queryGql(`
        mutation {
          updateCustomers(set: { isConfirmed: true, address: "Edited" }) {
            id
            address
            isConfirmed
            registrationDate
            userId
            __typename
          }
        }
      `);
          assertEquals(res, {
            data: {
              updateCustomers: [
                {
                  id: 1,
                  address: "Edited",
                  isConfirmed: true,
                  registrationDate: "2024-03-27T03:54:45.235Z",
                  userId: 1,
                  __typename: "CustomersItem",
                },
                {
                  id: 2,
                  address: "Edited",
                  isConfirmed: true,
                  registrationDate: "2024-03-27T03:55:42.358Z",
                  userId: 2,
                  __typename: "CustomersItem",
                },
              ],
            },
          });
        } finally {
          await afterEachTest(ctx);
        }
      });

      await d.step("Delete", async () => {
        await beforeEachTest(ctx);
        try {
          const res = await ctx.gql.queryGql(`
        mutation {
          deleteFromCustomers {
            id
            address
            isConfirmed
            registrationDate
            userId
            __typename
          }
        }
      `);
          assertEquals(res, {
            data: {
              deleteFromCustomers: [
                {
                  id: 1,
                  address: "AdOne",
                  isConfirmed: false,
                  registrationDate: "2024-03-27T03:54:45.235Z",
                  userId: 1,
                  __typename: "CustomersItem",
                },
                {
                  id: 2,
                  address: "AdTwo",
                  isConfirmed: false,
                  registrationDate: "2024-03-27T03:55:42.358Z",
                  userId: 2,
                  __typename: "CustomersItem",
                },
              ],
            },
          });
        } finally {
          await afterEachTest(ctx);
        }
      });
    });
  });
});

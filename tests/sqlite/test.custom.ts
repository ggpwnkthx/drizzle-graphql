import { assertEquals } from "jsr:@std/assert";
import {
  afterEachTest,
  beforeEachTest,
  type Context,
  globalSetup,
} from "./common.ts";
import { buildSchema } from "../../mod.ts";
import { GraphQLObjectType, GraphQLSchema } from "graphql";

const ctx: Context = {} as any;

await globalSetup(ctx);

const { entities } = buildSchema(ctx.db);
ctx.schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: "Query",
    fields: {
      customUsersSingle: entities.queries.usersSingle,
      customUsers: entities.queries.users,
      customCustomersSingle: entities.queries.customersSingle,
      customCustomers: entities.queries.customers,
      customPostsSingle: entities.queries.postsSingle,
      customPosts: entities.queries.posts,
    },
  }),
  mutation: new GraphQLObjectType({
    name: "Mutation",
    fields: {
      deleteFromCustomUsers: entities.mutations.deleteFromUsers,
      deleteFromCustomCustomers: entities.mutations.deleteFromCustomers,
      deleteFromCustomPosts: entities.mutations.deleteFromPosts,
      updateCustomUsers: entities.mutations.updateUsers,
      updateCustomCustomers: entities.mutations.updateCustomers,
      updateCustomPosts: entities.mutations.updatePosts,
      insertIntoCustomUsers: entities.mutations.insertIntoUsers,
      insertIntoCustomUsersSingle: entities.mutations.insertIntoUsersSingle,
      insertIntoCustomCustomers: entities.mutations.insertIntoCustomers,
      insertIntoCustomCustomersSingle:
        entities.mutations.insertIntoCustomersSingle,
      insertIntoCustomPosts: entities.mutations.insertIntoPosts,
      insertIntoCustomPostsSingle: entities.mutations.insertIntoPostsSingle,
    },
  }),
  types: [
    ...Object.values(entities.types),
    ...Object.values(entities.inputs),
  ],
});

Deno.test("Queries", async (t) => {
  await t.step("Select", async (s) => {
    await s.step("Single", async () => {
      await beforeEachTest(ctx);
      try {
        const res = await ctx.gql.queryGql(`
          {
            customUsersSingle {
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
            customPostsSingle {
              id
              authorId
              content
            }
          }
        `);
        assertEquals(res, {
          data: {
            customUsersSingle: {
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
            customPostsSingle: {
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

    await s.step("Single with relations", async () => {
      await beforeEachTest(ctx);
      try {
        const res = await ctx.gql.queryGql(`
          {
            customUsersSingle {
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
            customPostsSingle {
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
            customUsersSingle: {
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
            customPostsSingle: {
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

    await s.step("Single by fragment", async () => {
      await beforeEachTest(ctx);
      try {
        const res = await ctx.gql.queryGql(`
          query testQuery {
            customUsersSingle {
              ...UsersFrag
            }

            customPostsSingle {
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
            customUsersSingle: {
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
            customPostsSingle: {
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

    await s.step("Single with relations by fragment", async () => {
      await beforeEachTest(ctx);
      try {
        const res = await ctx.gql.queryGql(`
          query testQuery {
            customUsersSingle {
              ...UsersFrag
            }

            customPostsSingle {
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
            customUsersSingle: {
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
                {
                  id: 1,
                  authorId: 1,
                  content: "1MESSAGE",
                },
                {
                  id: 2,
                  authorId: 1,
                  content: "2MESSAGE",
                },
                {
                  id: 3,
                  authorId: 1,
                  content: "3MESSAGE",
                },

                {
                  id: 6,
                  authorId: 1,
                  content: "4MESSAGE",
                },
              ],
            },
            customPostsSingle: {
              id: 1,
              authorId: 1,
              content: "1MESSAGE",
              author: {
                id: 1,
                name: "FirstUser",
                email: "userOne@notmail.com",
                textJson: '{"field":"value"}',
                // RQB can't handle blobs in JSON, for now
                // blobBigInt: '10',
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

    await s.step("Array", async () => {
      await beforeEachTest(ctx);
      try {
        const res = await ctx.gql.queryGql(`
          {
            customUsers {
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
            customPosts {
              id
              authorId
              content
            }
          }
        `);
        assertEquals(res, {
          data: {
            customUsers: [
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
            customPosts: [
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

    await s.step("Array with relations", async () => {
      await beforeEachTest(ctx);
      try {
        const res = await ctx.gql.queryGql(`
          {
            customUsers {
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
            customPosts {
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
            customUsers: [
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
            customPosts: [
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

    await s.step("Array by fragment", async () => {
      await beforeEachTest(ctx);
      try {
        const res = await ctx.gql.queryGql(`
          query testQuery {
            customUsers {
              ...UsersFrag
            }

            customPosts {
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
            customUsers: [
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
            customPosts: [
              {
                id: 1,
                authorId: 1,
                content: "1MESSAGE",
              },
              {
                id: 2,
                authorId: 1,
                content: "2MESSAGE",
              },
              {
                id: 3,
                authorId: 1,
                content: "3MESSAGE",
              },
              {
                id: 4,
                authorId: 5,
                content: "1MESSAGE",
              },
              {
                id: 5,
                authorId: 5,
                content: "2MESSAGE",
              },
              {
                id: 6,
                authorId: 1,
                content: "4MESSAGE",
              },
            ],
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
            customUsers {
              ...UsersFrag
            }

            customPosts {
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
            customUsers: [
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
                  {
                    id: 1,
                    authorId: 1,
                    content: "1MESSAGE",
                  },
                  {
                    id: 2,
                    authorId: 1,
                    content: "2MESSAGE",
                  },
                  {
                    id: 3,
                    authorId: 1,
                    content: "3MESSAGE",
                  },
                  {
                    id: 6,
                    authorId: 1,
                    content: "4MESSAGE",
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
                  {
                    id: 4,
                    authorId: 5,
                    content: "1MESSAGE",
                  },
                  {
                    id: 5,
                    authorId: 5,
                    content: "2MESSAGE",
                  },
                ],
              },
            ],
            customPosts: [
              {
                id: 1,
                authorId: 1,
                content: "1MESSAGE",
                author: {
                  id: 1,
                  name: "FirstUser",
                  email: "userOne@notmail.com",
                  textJson: '{"field":"value"}',
                  // RQB can't handle blobs in JSON, for now
                  // blobBigInt: '10',
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
                  // RQB can't handle blobs in JSON, for now
                  // blobBigInt: '10',
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
                  // RQB can't handle blobs in JSON, for now
                  // blobBigInt: '10',
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
                  // RQB can't handle blobs in JSON, for now
                  // blobBigInt: null,
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
                  // RQB can't handle blobs in JSON, for now
                  // blobBigInt: null,
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
                  // RQB can't handle blobs in JSON, for now
                  // blobBigInt: '10',
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
});

Deno.test("Mutations", async (t) => {
  await t.step("Insert", async (s) => {
    await s.step("Single", async () => {
      await beforeEachTest(ctx);
      try {
        const res = await ctx.gql.queryGql(`
          mutation {
            insertIntoCustomUsersSingle(
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
            insertIntoCustomUsersSingle: {
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
            insertIntoCustomUsers(
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
            insertIntoCustomUsers: [
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
          updateCustomCustomers(set: { isConfirmed: true, address: "Edited" }) {
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
          updateCustomCustomers: [
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
          deleteFromCustomCustomers {
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
          deleteFromCustomCustomers: [
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
Deno.test("Arguments", async (t) => {
  await t.step("Order by", async () => {
    await beforeEachTest(ctx);
    try {
      const res = await ctx.gql.queryGql(`
        {
          customPosts(orderBy: { authorId: { priority: 1, direction: desc }, content: { priority: 0, direction: asc } }) {
            id
            authorId
            content
          }
        }
      `);
      assertEquals(res, {
        data: {
          customPosts: [
            { id: 4, authorId: 5, content: "1MESSAGE" },
            { id: 5, authorId: 5, content: "2MESSAGE" },
            { id: 1, authorId: 1, content: "1MESSAGE" },
            { id: 2, authorId: 1, content: "2MESSAGE" },
            { id: 3, authorId: 1, content: "3MESSAGE" },
            { id: 6, authorId: 1, content: "4MESSAGE" },
          ],
        },
      });
    } finally {
      await afterEachTest(ctx);
    }
  });

  await t.step("Order by on single", async () => {
    await beforeEachTest(ctx);
    try {
      const res = await ctx.gql.queryGql(`
        {
          customPostsSingle(orderBy: { authorId: { priority: 1, direction: desc }, content: { priority: 0, direction: asc } }) {
            id
            authorId
            content
          }
        }
      `);
      assertEquals(res, {
        data: {
          customPostsSingle: { id: 4, authorId: 5, content: "1MESSAGE" },
        },
      });
    } finally {
      await afterEachTest(ctx);
    }
  });

  await t.step("Offset & limit", async () => {
    await beforeEachTest(ctx);
    try {
      const res = await ctx.gql.queryGql(`
        {
          customPosts(offset: 1, limit: 2) {
            id
            authorId
            content
          }
        }
      `);
      assertEquals(res, {
        data: {
          customPosts: [
            { id: 2, authorId: 1, content: "2MESSAGE" },
            { id: 3, authorId: 1, content: "3MESSAGE" },
          ],
        },
      });
    } finally {
      await afterEachTest(ctx);
    }
  });

  await t.step("Offset on single", async () => {
    await beforeEachTest(ctx);
    try {
      const res = await ctx.gql.queryGql(`
        {
          customPostsSingle(offset: 1) {
            id
            authorId
            content
          }
        }
      `);
      assertEquals(res, {
        data: {
          customPostsSingle: { id: 2, authorId: 1, content: "2MESSAGE" },
        },
      });
    } finally {
      await afterEachTest(ctx);
    }
  });

  await t.step("Filters", async (s) => {
    await s.step("top level AND", async () => {
      await beforeEachTest(ctx);
      try {
        const res = await ctx.gql.queryGql(`
          {
            customPosts(where: { id: { inArray: [2, 3, 4, 5, 6] }, authorId: { ne: 5 }, content: { ne: "3MESSAGE" } }) {
              id
              authorId
              content
            }
          }
        `);
        assertEquals(res, {
          data: {
            customPosts: [
              { id: 2, authorId: 1, content: "2MESSAGE" },
              { id: 6, authorId: 1, content: "4MESSAGE" },
            ],
          },
        });
      } finally {
        await afterEachTest(ctx);
      }
    });

    await s.step("top level OR", async () => {
      await beforeEachTest(ctx);
      try {
        const res = await ctx.gql.queryGql(`
          {
            customPosts(where: { OR: [{ id: { lte: 3 } }, { authorId: { eq: 5 } }] }) {
              id
              authorId
              content
            }
          }
        `);
        assertEquals(res, {
          data: {
            customPosts: [
              { id: 1, authorId: 1, content: "1MESSAGE" },
              { id: 2, authorId: 1, content: "2MESSAGE" },
              { id: 3, authorId: 1, content: "3MESSAGE" },
              { id: 4, authorId: 5, content: "1MESSAGE" },
              { id: 5, authorId: 5, content: "2MESSAGE" },
            ],
          },
        });
      } finally {
        await afterEachTest(ctx);
      }
    });

    await s.step("Update", async () => {
      await beforeEachTest(ctx);
      try {
        const res = await ctx.gql.queryGql(`
          mutation {
            updateCustomPosts(where: { OR: [{ id: { lte: 3 } }, { authorId: { eq: 5 } }] }, set: { content: "UPDATED" }) {
              id
              authorId
              content
            }
          }
        `);
        assertEquals(res, {
          data: {
            updateCustomPosts: [
              { id: 1, authorId: 1, content: "UPDATED" },
              { id: 2, authorId: 1, content: "UPDATED" },
              { id: 3, authorId: 1, content: "UPDATED" },
              { id: 4, authorId: 5, content: "UPDATED" },
              { id: 5, authorId: 5, content: "UPDATED" },
            ],
          },
        });
      } finally {
        await afterEachTest(ctx);
      }
    });

    await s.step("Delete", async () => {
      await beforeEachTest(ctx);
      try {
        const res = await ctx.gql.queryGql(`
          mutation {
            deleteFromCustomPosts(where: { OR: [{ id: { lte: 3 } }, { authorId: { eq: 5 } }] }) {
              id
              authorId
              content
            }
          }
        `);
        assertEquals(res, {
          data: {
            deleteFromCustomPosts: [
              { id: 1, authorId: 1, content: "1MESSAGE" },
              { id: 2, authorId: 1, content: "2MESSAGE" },
              { id: 3, authorId: 1, content: "3MESSAGE" },
              { id: 4, authorId: 5, content: "1MESSAGE" },
              { id: 5, authorId: 5, content: "2MESSAGE" },
            ],
          },
        });
      } finally {
        await afterEachTest(ctx);
      }
    });
  });

  await t.step("Relations", async (s) => {
    await s.step("orderBy", async () => {
      await beforeEachTest(ctx);
      try {
        const res = await ctx.gql.queryGql(`
          {
            customUsers {
              id
              posts(orderBy: { id: { priority: 1, direction: desc } }) {
                id
                authorId
                content
              }
            }
          }
        `);
        assertEquals(res, {
          data: {
            customUsers: [
              {
                id: 1,
                posts: [
                  { id: 6, authorId: 1, content: "4MESSAGE" },
                  { id: 3, authorId: 1, content: "3MESSAGE" },
                  { id: 2, authorId: 1, content: "2MESSAGE" },
                  { id: 1, authorId: 1, content: "1MESSAGE" },
                ],
              },
              { id: 2, posts: [] },
              {
                id: 5,
                posts: [
                  { id: 5, authorId: 5, content: "2MESSAGE" },
                  { id: 4, authorId: 5, content: "1MESSAGE" },
                ],
              },
            ],
          },
        });
      } finally {
        await afterEachTest(ctx);
      }
    });

    await s.step("offset & limit", async () => {
      await beforeEachTest(ctx);
      try {
        const res = await ctx.gql.queryGql(`
          {
            customUsers {
              id
              posts(offset: 1, limit: 2) {
                id
                authorId
                content
              }
            }
          }
        `);
        assertEquals(res, {
          data: {
            customUsers: [
              {
                id: 1,
                posts: [
                  { id: 2, authorId: 1, content: "2MESSAGE" },
                  { id: 3, authorId: 1, content: "3MESSAGE" },
                ],
              },
              { id: 2, posts: [] },
              {
                id: 5,
                posts: [{ id: 5, authorId: 5, content: "2MESSAGE" }],
              },
            ],
          },
        });
      } finally {
        await afterEachTest(ctx);
      }
    });

    await s.step("filters", async () => {
      await beforeEachTest(ctx);
      try {
        const res = await ctx.gql.queryGql(`
          {
            customUsers {
              id
              posts(where: { content: { like: "2%" } }) {
                id
                authorId
                content
              }
            }
          }
        `);
        assertEquals(res, {
          data: {
            customUsers: [
              { id: 1, posts: [{ id: 2, authorId: 1, content: "2MESSAGE" }] },
              { id: 2, posts: [] },
              { id: 5, posts: [{ id: 5, authorId: 5, content: "2MESSAGE" }] },
            ],
          },
        });
      } finally {
        await afterEachTest(ctx);
      }
    });
  });
});

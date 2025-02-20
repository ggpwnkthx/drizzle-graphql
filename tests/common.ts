import {
  GraphQLInputObjectType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
} from "graphql";
import z from "npm:zod";
import { assertEquals, assertInstanceOf } from "jsr:@std/assert";

export default {
  Arguments: async (
    test: Deno.TestContext,
    ctx: any,
    beforeTest: CallableFunction,
    afterTest: CallableFunction,
  ) => {
    await test.step("Arguments", async (t) => {
      await t.step("Order by", async () => {
        await beforeTest(ctx);
        try {
          const res = await ctx.gql.queryGql(`
            {
              posts(orderBy: { authorId: { priority: 1, direction: desc }, content: { priority: 0, direction: asc } }) {
                id
                authorId
                content
              }
            }
          `);
          assertEquals(res, {
            data: {
              posts: [
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
          await afterTest(ctx);
        }
      });

      await t.step("Order by on single", async () => {
        await beforeTest(ctx);
        try {
          const res = await ctx.gql.queryGql(`
            {
              postsSingle(orderBy: { authorId: { priority: 1, direction: desc }, content: { priority: 0, direction: asc } }) {
                id
                authorId
                content
              }
            }
          `);
          assertEquals(res, {
            data: { postsSingle: { id: 4, authorId: 5, content: "1MESSAGE" } },
          });
        } finally {
          await afterTest(ctx);
        }
      });

      await t.step("Offset & limit", async () => {
        await beforeTest(ctx);
        try {
          const res = await ctx.gql.queryGql(`
            {
              posts(offset: 1, limit: 2) {
                id
                authorId
                content
              }
            }
          `);
          assertEquals(res, {
            data: {
              posts: [
                { id: 2, authorId: 1, content: "2MESSAGE" },
                { id: 3, authorId: 1, content: "3MESSAGE" },
              ],
            },
          });
        } finally {
          await afterTest(ctx);
        }
      });

      await t.step("Offset on single", async () => {
        await beforeTest(ctx);
        try {
          const res = await ctx.gql.queryGql(`
            {
              postsSingle(offset: 1) {
                id
                authorId
                content
              }
            }
          `);
          assertEquals(res, {
            data: { postsSingle: { id: 2, authorId: 1, content: "2MESSAGE" } },
          });
        } finally {
          await afterTest(ctx);
        }
      });

      await t.step("Filters", async (s) => {
        await s.step("top level AND", async () => {
          await beforeTest(ctx);
          try {
            const res = await ctx.gql.queryGql(`
              {
                posts(where: { id: { inArray: [2, 3, 4, 5, 6] }, authorId: { ne: 5 }, content: { ne: "3MESSAGE" } }) {
                  id
                  authorId
                  content
                }
              }
            `);
            assertEquals(res, {
              data: {
                posts: [
                  { id: 2, authorId: 1, content: "2MESSAGE" },
                  { id: 6, authorId: 1, content: "4MESSAGE" },
                ],
              },
            });
          } finally {
            await afterTest(ctx);
          }
        });

        await s.step("top level OR", async () => {
          await beforeTest(ctx);
          try {
            const res = await ctx.gql.queryGql(`
              {
                posts(where: { OR: [{ id: { lte: 3 } }, { authorId: { eq: 5 } }] }) {
                  id
                  authorId
                  content
                }
              }
            `);
            assertEquals(res, {
              data: {
                posts: [
                  { id: 1, authorId: 1, content: "1MESSAGE" },
                  { id: 2, authorId: 1, content: "2MESSAGE" },
                  { id: 3, authorId: 1, content: "3MESSAGE" },
                  { id: 4, authorId: 5, content: "1MESSAGE" },
                  { id: 5, authorId: 5, content: "2MESSAGE" },
                ],
              },
            });
          } finally {
            await afterTest(ctx);
          }
        });
        await s.step("Update", async () => {
          await beforeTest(ctx);
          try {
            const res = await ctx.gql.queryGql(`
              mutation {
                updatePosts(where: { OR: [{ id: { lte: 3 } }, { authorId: { eq: 5 } }] }, set: { content: "UPDATED" }) {
                  id
                  authorId
                  content
                }
              }
            `);
            assertEquals(res, {
              data: {
                updatePosts: [
                  { id: 1, authorId: 1, content: "UPDATED" },
                  { id: 2, authorId: 1, content: "UPDATED" },
                  { id: 3, authorId: 1, content: "UPDATED" },
                  { id: 4, authorId: 5, content: "UPDATED" },
                  { id: 5, authorId: 5, content: "UPDATED" },
                ],
              },
            });
          } finally {
            await afterTest(ctx);
          }
        });

        await s.step("Delete", async () => {
          await beforeTest(ctx);
          try {
            const res = await ctx.gql.queryGql(`
              mutation {
                deleteFromPosts(where: { OR: [{ id: { lte: 3 } }, { authorId: { eq: 5 } }] }) {
                  id
                  authorId
                  content
                }
              }
            `);
            assertEquals(res, {
              data: {
                deleteFromPosts: [
                  { id: 1, authorId: 1, content: "1MESSAGE" },
                  { id: 2, authorId: 1, content: "2MESSAGE" },
                  { id: 3, authorId: 1, content: "3MESSAGE" },
                  { id: 4, authorId: 5, content: "1MESSAGE" },
                  { id: 5, authorId: 5, content: "2MESSAGE" },
                ],
              },
            });
          } finally {
            await afterTest(ctx);
          }
        });
      });

      await t.step("Relations", async (s) => {
        await s.step("orderBy", async () => {
          await beforeTest(ctx);
          try {
            const res = await ctx.gql.queryGql(`
              {
                users {
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
                users: [
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
            await afterTest(ctx);
          }
        });

        await s.step("offset & limit", async () => {
          await beforeTest(ctx);
          try {
            const res = await ctx.gql.queryGql(`
              {
                users {
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
                users: [
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
            await afterTest(ctx);
          }
        });

        await s.step("filters", async () => {
          await beforeTest(ctx);
          try {
            const res = await ctx.gql.queryGql(`
              {
                users {
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
                users: [
                  {
                    id: 1,
                    posts: [{ id: 2, authorId: 1, content: "2MESSAGE" }],
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
            await afterTest(ctx);
          }
        });
      });
    });
  },
  Returned: async (
    test: Deno.TestContext,
    ctx: any,
    _beforeTest: CallableFunction,
    _afterTest: CallableFunction,
  ) => {
    await test.step("Returned data", async (t) => {
      await t.step("Schema", () => {
        assertEquals(ctx.schema instanceof GraphQLSchema, true);
      });

      await t.step("Entities", () => {
        const schema = z
          .object({
            queries: z
              .object({
                users: z
                  .object({
                    args: z
                      .object({
                        orderBy: z
                          .object({
                            type: z.instanceof(GraphQLInputObjectType),
                          })
                          .strict(),
                        offset: z
                          .object({
                            type: z.instanceof(GraphQLScalarType),
                          })
                          .strict(),
                        limit: z
                          .object({
                            type: z.instanceof(GraphQLScalarType),
                          })
                          .strict(),
                        where: z
                          .object({
                            type: z.instanceof(GraphQLInputObjectType),
                          })
                          .strict(),
                      })
                      .strict(),
                    resolve: z.function(),
                    type: z.instanceof(GraphQLNonNull),
                  })
                  .strict(),
                usersSingle: z
                  .object({
                    args: z
                      .object({
                        orderBy: z
                          .object({
                            type: z.instanceof(GraphQLInputObjectType),
                          })
                          .strict(),
                        offset: z
                          .object({
                            type: z.instanceof(GraphQLScalarType),
                          })
                          .strict(),
                        where: z
                          .object({
                            type: z.instanceof(GraphQLInputObjectType),
                          })
                          .strict(),
                      })
                      .strict(),
                    resolve: z.function(),
                    type: z.instanceof(GraphQLObjectType),
                  })
                  .strict(),
                posts: z
                  .object({
                    args: z
                      .object({
                        orderBy: z
                          .object({
                            type: z.instanceof(GraphQLInputObjectType),
                          })
                          .strict(),
                        offset: z
                          .object({
                            type: z.instanceof(GraphQLScalarType),
                          })
                          .strict(),
                        limit: z
                          .object({
                            type: z.instanceof(GraphQLScalarType),
                          })
                          .strict(),
                        where: z
                          .object({
                            type: z.instanceof(GraphQLInputObjectType),
                          })
                          .strict(),
                      })
                      .strict(),
                    resolve: z.function(),
                    type: z.instanceof(GraphQLNonNull),
                  })
                  .strict(),
                postsSingle: z
                  .object({
                    args: z
                      .object({
                        orderBy: z
                          .object({
                            type: z.instanceof(GraphQLInputObjectType),
                          })
                          .strict(),
                        offset: z
                          .object({
                            type: z.instanceof(GraphQLScalarType),
                          })
                          .strict(),
                        where: z
                          .object({
                            type: z.instanceof(GraphQLInputObjectType),
                          })
                          .strict(),
                      })
                      .strict(),
                    resolve: z.function(),
                    type: z.instanceof(GraphQLObjectType),
                  })
                  .strict(),
                customers: z
                  .object({
                    args: z
                      .object({
                        orderBy: z
                          .object({
                            type: z.instanceof(GraphQLInputObjectType),
                          })
                          .strict(),
                        offset: z
                          .object({
                            type: z.instanceof(GraphQLScalarType),
                          })
                          .strict(),
                        limit: z
                          .object({
                            type: z.instanceof(GraphQLScalarType),
                          })
                          .strict(),
                        where: z
                          .object({
                            type: z.instanceof(GraphQLInputObjectType),
                          })
                          .strict(),
                      })
                      .strict(),
                    resolve: z.function(),
                    type: z.instanceof(GraphQLNonNull),
                  })
                  .strict(),
                customersSingle: z
                  .object({
                    args: z
                      .object({
                        orderBy: z
                          .object({
                            type: z.instanceof(GraphQLInputObjectType),
                          })
                          .strict(),
                        offset: z
                          .object({
                            type: z.instanceof(GraphQLScalarType),
                          })
                          .strict(),
                        where: z
                          .object({
                            type: z.instanceof(GraphQLInputObjectType),
                          })
                          .strict(),
                      })
                      .strict(),
                    resolve: z.function(),
                    type: z.instanceof(GraphQLObjectType),
                  })
                  .strict(),
              })
              .strict(),
            mutations: z
              .object({
                insertIntoUsers: z
                  .object({
                    args: z
                      .object({
                        values: z
                          .object({
                            type: z.instanceof(GraphQLNonNull),
                          })
                          .strict(),
                      })
                      .strict(),
                    resolve: z.function(),
                    type: z.instanceof(GraphQLNonNull),
                  })
                  .strict(),
                insertIntoUsersSingle: z
                  .object({
                    args: z
                      .object({
                        values: z
                          .object({
                            type: z.instanceof(GraphQLNonNull),
                          })
                          .strict(),
                      })
                      .strict(),
                    resolve: z.function(),
                    type: z.instanceof(GraphQLObjectType),
                  })
                  .strict(),
                updateUsers: z
                  .object({
                    args: z
                      .object({
                        set: z
                          .object({
                            type: z.instanceof(GraphQLNonNull),
                          })
                          .strict(),
                        where: z
                          .object({
                            type: z.instanceof(GraphQLInputObjectType),
                          })
                          .strict(),
                      })
                      .strict(),
                    resolve: z.function(),
                    type: z.instanceof(GraphQLNonNull),
                  })
                  .strict(),
                deleteFromUsers: z
                  .object({
                    args: z
                      .object({
                        where: z
                          .object({
                            type: z.instanceof(GraphQLInputObjectType),
                          })
                          .strict(),
                      })
                      .strict(),
                    resolve: z.function(),
                    type: z.instanceof(GraphQLNonNull),
                  })
                  .strict(),
                insertIntoPosts: z
                  .object({
                    args: z
                      .object({
                        values: z
                          .object({
                            type: z.instanceof(GraphQLNonNull),
                          })
                          .strict(),
                      })
                      .strict(),
                    resolve: z.function(),
                    type: z.instanceof(GraphQLNonNull),
                  })
                  .strict(),
                insertIntoPostsSingle: z
                  .object({
                    args: z
                      .object({
                        values: z
                          .object({
                            type: z.instanceof(GraphQLNonNull),
                          })
                          .strict(),
                      })
                      .strict(),
                    resolve: z.function(),
                    type: z.instanceof(GraphQLObjectType),
                  })
                  .strict(),
                updatePosts: z
                  .object({
                    args: z
                      .object({
                        set: z
                          .object({
                            type: z.instanceof(GraphQLNonNull),
                          })
                          .strict(),
                        where: z
                          .object({
                            type: z.instanceof(GraphQLInputObjectType),
                          })
                          .strict(),
                      })
                      .strict(),
                    resolve: z.function(),
                    type: z.instanceof(GraphQLNonNull),
                  })
                  .strict(),
                deleteFromPosts: z
                  .object({
                    args: z
                      .object({
                        where: z
                          .object({
                            type: z.instanceof(GraphQLInputObjectType),
                          })
                          .strict(),
                      })
                      .strict(),
                    resolve: z.function(),
                    type: z.instanceof(GraphQLNonNull),
                  })
                  .strict(),
                insertIntoCustomers: z
                  .object({
                    args: z
                      .object({
                        values: z
                          .object({
                            type: z.instanceof(GraphQLNonNull),
                          })
                          .strict(),
                      })
                      .strict(),
                    resolve: z.function(),
                    type: z.instanceof(GraphQLNonNull),
                  })
                  .strict(),
                insertIntoCustomersSingle: z
                  .object({
                    args: z
                      .object({
                        values: z
                          .object({
                            type: z.instanceof(GraphQLNonNull),
                          })
                          .strict(),
                      })
                      .strict(),
                    resolve: z.function(),
                    type: z.instanceof(GraphQLObjectType),
                  })
                  .strict(),
                updateCustomers: z
                  .object({
                    args: z
                      .object({
                        set: z
                          .object({
                            type: z.instanceof(GraphQLNonNull),
                          })
                          .strict(),
                        where: z
                          .object({
                            type: z.instanceof(GraphQLInputObjectType),
                          })
                          .strict(),
                      })
                      .strict(),
                    resolve: z.function(),
                    type: z.instanceof(GraphQLNonNull),
                  })
                  .strict(),
                deleteFromCustomers: z
                  .object({
                    args: z
                      .object({
                        where: z
                          .object({
                            type: z.instanceof(GraphQLInputObjectType),
                          })
                          .strict(),
                      })
                      .strict(),
                    resolve: z.function(),
                    type: z.instanceof(GraphQLNonNull),
                  })
                  .strict(),
              })
              .strict(),
            types: z
              .object({
                UsersItem: z.instanceof(GraphQLObjectType),
                UsersSelectItem: z.instanceof(GraphQLObjectType),
                PostsItem: z.instanceof(GraphQLObjectType),
                PostsSelectItem: z.instanceof(GraphQLObjectType),
                CustomersItem: z.instanceof(GraphQLObjectType),
                CustomersSelectItem: z.instanceof(GraphQLObjectType),
              })
              .strict(),
            inputs: z
              .object({
                UsersFilters: z.instanceof(GraphQLInputObjectType),
                UsersOrderBy: z.instanceof(GraphQLInputObjectType),
                UsersInsertInput: z.instanceof(GraphQLInputObjectType),
                UsersUpdateInput: z.instanceof(GraphQLInputObjectType),
                PostsFilters: z.instanceof(GraphQLInputObjectType),
                PostsOrderBy: z.instanceof(GraphQLInputObjectType),
                PostsInsertInput: z.instanceof(GraphQLInputObjectType),
                PostsUpdateInput: z.instanceof(GraphQLInputObjectType),
                CustomersFilters: z.instanceof(GraphQLInputObjectType),
                CustomersOrderBy: z.instanceof(GraphQLInputObjectType),
                CustomersInsertInput: z.instanceof(GraphQLInputObjectType),
                CustomersUpdateInput: z.instanceof(GraphQLInputObjectType),
              })
              .strict(),
          })
          .strict();
        assertEquals(schema.safeParse(ctx.entities).success, true);
      });
    });
  },
  Types: async (
    test: Deno.TestContext,
    ctx: any,
    _beforeTest: CallableFunction,
    _afterTest: CallableFunction,
  ) => {
    await test.step("Types", async (t) => {
      await t.step("Schema", () => {
        assertInstanceOf(ctx.schema, GraphQLSchema);
      });

      await t.step("Queries", () => {
        const schema = z
          .object({
            customers: z.object({
              type: z.instanceof(GraphQLNonNull),
              args: z
                .object({
                  orderBy: z.object({
                    type: z.instanceof(GraphQLInputObjectType),
                  })
                    .strict(),
                  offset: z.object({ type: z.instanceof(GraphQLScalarType) })
                    .strict(),
                  limit: z.object({ type: z.instanceof(GraphQLScalarType) })
                    .strict(),
                  where: z.object({
                    type: z.instanceof(GraphQLInputObjectType),
                  })
                    .strict(),
                })
                .strict(),
              resolve: z.function(),
            }),
            posts: z.object({
              type: z.instanceof(GraphQLNonNull),
              args: z
                .object({
                  orderBy: z.object({
                    type: z.instanceof(GraphQLInputObjectType),
                  })
                    .strict(),
                  offset: z.object({ type: z.instanceof(GraphQLScalarType) })
                    .strict(),
                  limit: z.object({ type: z.instanceof(GraphQLScalarType) })
                    .strict(),
                  where: z.object({
                    type: z.instanceof(GraphQLInputObjectType),
                  })
                    .strict(),
                })
                .strict(),
              resolve: z.function(),
            }),
            users: z.object({
              type: z.instanceof(GraphQLNonNull),
              args: z
                .object({
                  orderBy: z.object({
                    type: z.instanceof(GraphQLInputObjectType),
                  })
                    .strict(),
                  offset: z.object({ type: z.instanceof(GraphQLScalarType) })
                    .strict(),
                  limit: z.object({ type: z.instanceof(GraphQLScalarType) })
                    .strict(),
                  where: z.object({
                    type: z.instanceof(GraphQLInputObjectType),
                  })
                    .strict(),
                })
                .strict(),
              resolve: z.function(),
            }),
            customersSingle: z.object({
              type: z.instanceof(GraphQLObjectType),
              args: z
                .object({
                  orderBy: z.object({
                    type: z.instanceof(GraphQLInputObjectType),
                  })
                    .strict(),
                  offset: z.object({ type: z.instanceof(GraphQLScalarType) })
                    .strict(),
                  where: z.object({
                    type: z.instanceof(GraphQLInputObjectType),
                  })
                    .strict(),
                })
                .strict(),
              resolve: z.function(),
            }),
            postsSingle: z.object({
              type: z.instanceof(GraphQLObjectType),
              args: z
                .object({
                  orderBy: z.object({
                    type: z.instanceof(GraphQLInputObjectType),
                  })
                    .strict(),
                  offset: z.object({ type: z.instanceof(GraphQLScalarType) })
                    .strict(),
                  where: z.object({
                    type: z.instanceof(GraphQLInputObjectType),
                  })
                    .strict(),
                })
                .strict(),
              resolve: z.function(),
            }),
            usersSingle: z.object({
              type: z.instanceof(GraphQLObjectType),
              args: z
                .object({
                  orderBy: z.object({
                    type: z.instanceof(GraphQLInputObjectType),
                  })
                    .strict(),
                  offset: z.object({ type: z.instanceof(GraphQLScalarType) })
                    .strict(),
                  where: z.object({
                    type: z.instanceof(GraphQLInputObjectType),
                  })
                    .strict(),
                })
                .strict(),
              resolve: z.function(),
            }),
          })
          .strict();
        assertEquals(schema.safeParse(ctx.entities.queries).success, true);
      });

      await t.step("Mutations", () => {
        const schema = z
          .object({
            insertIntoCustomers: z.object({
              type: z.instanceof(GraphQLNonNull),
              args: z
                .object({
                  values: z.object({ type: z.instanceof(GraphQLNonNull) })
                    .strict(),
                })
                .strict(),
              resolve: z.function(),
            }),
            insertIntoPosts: z.object({
              type: z.instanceof(GraphQLNonNull),
              args: z
                .object({
                  values: z.object({ type: z.instanceof(GraphQLNonNull) })
                    .strict(),
                })
                .strict(),
              resolve: z.function(),
            }),
            insertIntoUsers: z.object({
              type: z.instanceof(GraphQLNonNull),
              args: z
                .object({
                  values: z.object({ type: z.instanceof(GraphQLNonNull) })
                    .strict(),
                })
                .strict(),
              resolve: z.function(),
            }),
            insertIntoCustomersSingle: z.object({
              type: z.instanceof(GraphQLObjectType),
              args: z
                .object({
                  values: z.object({ type: z.instanceof(GraphQLNonNull) })
                    .strict(),
                })
                .strict(),
              resolve: z.function(),
            }),
            insertIntoPostsSingle: z.object({
              type: z.instanceof(GraphQLObjectType),
              args: z
                .object({
                  values: z.object({ type: z.instanceof(GraphQLNonNull) })
                    .strict(),
                })
                .strict(),
              resolve: z.function(),
            }),
            insertIntoUsersSingle: z.object({
              type: z.instanceof(GraphQLObjectType),
              args: z
                .object({
                  values: z.object({ type: z.instanceof(GraphQLNonNull) })
                    .strict(),
                })
                .strict(),
              resolve: z.function(),
            }),
            updateCustomers: z.object({
              type: z.instanceof(GraphQLNonNull),
              args: z
                .object({
                  set: z.object({ type: z.instanceof(GraphQLNonNull) })
                    .strict(),
                  where: z.object({
                    type: z.instanceof(GraphQLInputObjectType),
                  })
                    .strict(),
                })
                .strict(),
              resolve: z.function(),
            }),
            updatePosts: z.object({
              type: z.instanceof(GraphQLNonNull),
              args: z
                .object({
                  set: z.object({ type: z.instanceof(GraphQLNonNull) })
                    .strict(),
                  where: z.object({
                    type: z.instanceof(GraphQLInputObjectType),
                  })
                    .strict(),
                })
                .strict(),
              resolve: z.function(),
            }),
            updateUsers: z.object({
              type: z.instanceof(GraphQLNonNull),
              args: z
                .object({
                  set: z.object({ type: z.instanceof(GraphQLNonNull) })
                    .strict(),
                  where: z.object({
                    type: z.instanceof(GraphQLInputObjectType),
                  })
                    .strict(),
                })
                .strict(),
              resolve: z.function(),
            }),
            deleteFromCustomers: z.object({
              type: z.instanceof(GraphQLNonNull),
              args: z
                .object({
                  where: z.object({
                    type: z.instanceof(GraphQLInputObjectType),
                  })
                    .strict(),
                })
                .strict(),
              resolve: z.function(),
            }),
            deleteFromPosts: z.object({
              type: z.instanceof(GraphQLNonNull),
              args: z
                .object({
                  where: z.object({
                    type: z.instanceof(GraphQLInputObjectType),
                  })
                    .strict(),
                })
                .strict(),
              resolve: z.function(),
            }),
            deleteFromUsers: z.object({
              type: z.instanceof(GraphQLNonNull),
              args: z
                .object({
                  where: z.object({
                    type: z.instanceof(GraphQLInputObjectType),
                  })
                    .strict(),
                })
                .strict(),
              resolve: z.function(),
            }),
          })
          .strict();
        assertEquals(schema.safeParse(ctx.entities.mutations).success, true);
      });

      await t.step("Types", () => {
        const schema = z
          .object({
            CustomersItem: z.instanceof(GraphQLObjectType),
            PostsItem: z.instanceof(GraphQLObjectType),
            UsersItem: z.instanceof(GraphQLObjectType),
            CustomersSelectItem: z.instanceof(GraphQLObjectType),
            PostsSelectItem: z.instanceof(GraphQLObjectType),
            UsersSelectItem: z.instanceof(GraphQLObjectType),
          })
          .strict();
        assertEquals(schema.safeParse(ctx.entities.types).success, true);
      });

      await t.step("Inputs", () => {
        const schema = z
          .object({
            UsersFilters: z.instanceof(GraphQLInputObjectType),
            CustomersFilters: z.instanceof(GraphQLInputObjectType),
            PostsFilters: z.instanceof(GraphQLInputObjectType),
            UsersOrderBy: z.instanceof(GraphQLInputObjectType),
            CustomersOrderBy: z.instanceof(GraphQLInputObjectType),
            PostsOrderBy: z.instanceof(GraphQLInputObjectType),
            UsersInsertInput: z.instanceof(GraphQLInputObjectType),
            CustomersInsertInput: z.instanceof(GraphQLInputObjectType),
            PostsInsertInput: z.instanceof(GraphQLInputObjectType),
            UsersUpdateInput: z.instanceof(GraphQLInputObjectType),
            CustomersUpdateInput: z.instanceof(GraphQLInputObjectType),
            PostsUpdateInput: z.instanceof(GraphQLInputObjectType),
          })
          .strict();
        assertEquals(schema.safeParse(ctx.entities.inputs).success, true);
      });
    });
  },
};

import { assertEquals } from "jsr:@std/assert";
import { afterEachTest, beforeEachTest } from "./common.ts";
import ctx from "../../examples/pg/context.ts";
import Tests from "../common.ts";

Deno.test("Drizzle-GraphQL - PostgreSQL", async (test) => {
  await test.step("Queries", async (t) => {
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
                geoXy: {
                  x: 20,
                  y: 20.3,
                },
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

      await s.step("Single with relations", async () => {
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
              }
            }
          `);
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
                geoXy: {
                  x: 20,
                  y: 20.3,
                },
                geoTuple: [20, 20.3],
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
              postsSingle: {
                id: 1,
                authorId: 1,
                content: "1MESSAGE",
                author: {
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
                  geoXy: {
                    x: 20,
                    y: 20.3,
                  },
                  geoTuple: [20, 20.3],
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
              usersSingle {
                ...UsersFrag
              }

              postsSingle {
                ...PostsFrag
              }
            }

            fragment UsersFrag on UsersSelectItem {
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

            fragment PostsFrag on PostsSelectItem {
              id
              authorId
              content
            }
          `);
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
                geoXy: {
                  x: 20,
                  y: 20.3,
                },
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
            }
          `);
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
                geoXy: {
                  x: 20,
                  y: 20.3,
                },
                geoTuple: [20, 20.3],
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
              postsSingle: {
                id: 1,
                authorId: 1,
                content: "1MESSAGE",
                author: {
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
                  geoXy: {
                    x: 20,
                    y: 20.3,
                  },
                  geoTuple: [20, 20.3],
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
                  geoXy: {
                    x: 20,
                    y: 20.3,
                  },
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

      await s.step("Array with relations", async () => {
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
              }
            }
          `);
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
                  geoXy: {
                    x: 20,
                    y: 20.3,
                  },
                  geoTuple: [20, 20.3],
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
                  posts: [],
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
              posts: [
                {
                  id: 1,
                  authorId: 1,
                  content: "1MESSAGE",
                  author: {
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
                    geoXy: {
                      x: 20,
                      y: 20.3,
                    },
                    geoTuple: [20, 20.3],
                  },
                },
                {
                  id: 2,
                  authorId: 1,
                  content: "2MESSAGE",
                  author: {
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
                    geoXy: {
                      x: 20,
                      y: 20.3,
                    },
                    geoTuple: [20, 20.3],
                  },
                },
                {
                  id: 3,
                  authorId: 1,
                  content: "3MESSAGE",
                  author: {
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
                    geoXy: {
                      x: 20,
                      y: 20.3,
                    },
                    geoTuple: [20, 20.3],
                  },
                },
                {
                  id: 4,
                  authorId: 5,
                  content: "1MESSAGE",
                  author: {
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
                },
                {
                  id: 5,
                  authorId: 5,
                  content: "2MESSAGE",
                  author: {
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
                },
                {
                  id: 6,
                  authorId: 1,
                  content: "4MESSAGE",
                  author: {
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
                    geoXy: {
                      x: 20,
                      y: 20.3,
                    },
                    geoTuple: [20, 20.3],
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
              users {
                ...UsersFrag
              }

              posts {
                ...PostsFrag
              }
            }

            fragment UsersFrag on UsersSelectItem {
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
                  geoXy: {
                    x: 20,
                    y: 20.3,
                  },
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
              users {
                ...UsersFrag
              }

              posts {
                ...PostsFrag
              }
            }

            fragment UsersFrag on UsersSelectItem {
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
            }
          `);
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
                  geoXy: {
                    x: 20,
                    y: 20.3,
                  },
                  geoTuple: [20, 20.3],
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
                  posts: [],
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
              posts: [
                {
                  id: 1,
                  authorId: 1,
                  content: "1MESSAGE",
                  author: {
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
                    geoXy: {
                      x: 20,
                      y: 20.3,
                    },
                    geoTuple: [20, 20.3],
                  },
                },
                {
                  id: 2,
                  authorId: 1,
                  content: "2MESSAGE",
                  author: {
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
                    geoXy: {
                      x: 20,
                      y: 20.3,
                    },
                    geoTuple: [20, 20.3],
                  },
                },
                {
                  id: 3,
                  authorId: 1,
                  content: "3MESSAGE",
                  author: {
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
                    geoXy: {
                      x: 20,
                      y: 20.3,
                    },
                    geoTuple: [20, 20.3],
                  },
                },
                {
                  id: 4,
                  authorId: 5,
                  content: "1MESSAGE",
                  author: {
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
                },
                {
                  id: 5,
                  authorId: 5,
                  content: "2MESSAGE",
                  author: {
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
                },
                {
                  id: 6,
                  authorId: 1,
                  content: "4MESSAGE",
                  author: {
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
                    geoXy: {
                      x: 20,
                      y: 20.3,
                    },
                    geoTuple: [20, 20.3],
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
                  a: [1, 5, 10, 25, 40]
                  id: 3
                  name: "ThirdUser"
                  email: "userThree@notmail.com"
                  birthdayString: "2024-04-02T06:44:41.785Z"
                  birthdayDate: "2024-04-02T06:44:41.785Z"
                  createdAt: "2024-04-02T06:44:41.785Z"
                  role: admin
                  roleText: null
                  profession: "ThirdUserProf"
                  initials: "FU"
                  isConfirmed: true
                  vector: [1, 2, 3, 4, 5]
                  geoXy: {
                    x: 20
                    y: 20.3
                  }
                  geoTuple: [20, 20.3]		
                }
              ) {
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
            }
          `);
          assertEquals(res, {
            data: {
              insertIntoUsersSingle: {
                a: [1, 5, 10, 25, 40],
                id: 3,
                name: "ThirdUser",
                email: "userThree@notmail.com",
                birthdayString: "2024-04-02",
                birthdayDate: "2024-04-02T00:00:00.000Z",
                createdAt: "2024-04-02T06:44:41.785Z",
                role: "admin",
                roleText: null,
                roleText2: "user",
                profession: "ThirdUserProf",
                initials: "FU",
                isConfirmed: true,
                vector: [1, 2, 3, 4, 5],
                geoXy: {
                  x: 20,
                  y: 20.3,
                },
                geoTuple: [20, 20.3],
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
                    a: [1, 5, 10, 25, 40]
                    id: 3
                    name: "ThirdUser"
                    email: "userThree@notmail.com"
                    birthdayString: "2024-04-02T06:44:41.785Z"
                    birthdayDate: "2024-04-02T06:44:41.785Z"
                    createdAt: "2024-04-02T06:44:41.785Z"
                    role: admin
                    roleText: null
                    profession: "ThirdUserProf"
                    initials: "FU"
                    isConfirmed: true
                    vector: [1, 2, 3, 4, 5]
                    geoXy: {
                      x: 20
                      y: 20.3
                    }
                    geoTuple: [20, 20.3]
                  }
                  {
                    a: [1, 5, 10, 25, 40]
                    id: 4
                    name: "FourthUser"
                    email: "userFour@notmail.com"
                    birthdayString: "2024-04-04"
                    birthdayDate: "2024-04-04T00:00:00.000Z"
                    createdAt: "2024-04-04T06:44:41.785Z"
                    role: user
                    roleText: null
                    roleText2: user
                    profession: "FourthUserProf"
                    initials: "SU"
                    isConfirmed: false
                  }
                ]
              ) {
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
            }
          `);
          assertEquals(res, {
            data: {
              insertIntoUsers: [
                {
                  a: [1, 5, 10, 25, 40],
                  id: 3,
                  name: "ThirdUser",
                  email: "userThree@notmail.com",
                  birthdayString: "2024-04-02",
                  birthdayDate: "2024-04-02T00:00:00.000Z",
                  createdAt: "2024-04-02T06:44:41.785Z",
                  role: "admin",
                  roleText: null,
                  roleText2: "user",
                  profession: "ThirdUserProf",
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
                  a: [1, 5, 10, 25, 40],
                  id: 4,
                  name: "FourthUser",
                  email: "userFour@notmail.com",
                  birthdayString: "2024-04-04",
                  birthdayDate: "2024-04-04T00:00:00.000Z",
                  createdAt: "2024-04-04T06:44:41.785Z",
                  role: "user",
                  roleText: null,
                  roleText2: "user",
                  profession: "FourthUserProf",
                  initials: "SU",
                  isConfirmed: false,
                  vector: null,
                  geoXy: null,
                  geoTuple: null,
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
      await s.step("Single", async () => {
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
      await s.step("Single", async () => {
        await beforeEachTest(ctx);
        try {
          const res = await ctx.gql.queryGql(`
            mutation {
              insertIntoUsersSingle(
                values: {
                  a: [1, 5, 10, 25, 40]
                  id: 3
                  name: "ThirdUser"
                  email: "userThree@notmail.com"
                  birthdayString: "2024-04-02T06:44:41.785Z"
                  birthdayDate: "2024-04-02T06:44:41.785Z"
                  createdAt: "2024-04-02T06:44:41.785Z"
                  role: admin
                  roleText: null
                  profession: "ThirdUserProf"
                  initials: "FU"
                  vector: [1, 2, 3, 4, 5]
                  geoXy: {
                    x: 20
                    y: 20.3
                  }
                  geoTuple: [20, 20.3]
                  isConfirmed: true
                }
              ) {
                __typename
              }
            }
        `);
          assertEquals(res, {
            data: {
              insertIntoUsersSingle: {
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
                    a: [1, 5, 10, 25, 40]
                    id: 3
                    name: "ThirdUser"
                    email: "userThree@notmail.com"
                    birthdayString: "2024-04-02T06:44:41.785Z"
                    birthdayDate: "2024-04-02T06:44:41.785Z"
                    createdAt: "2024-04-02T06:44:41.785Z"
                    role: admin
                    roleText: null
                    profession: "ThirdUserProf"
                    initials: "FU"
                    isConfirmed: true
                    vector: [1, 2, 3, 4, 5]
                    geoXy: {
                      x: 20
                      y: 20.3
                    }
                    geoTuple: [20, 20.3]
                  }
                  {
                    a: [1, 5, 10, 25, 40]
                    id: 4
                    name: "FourthUser"
                    email: "userFour@notmail.com"
                    birthdayString: "2024-04-04"
                    birthdayDate: "2024-04-04T00:00:00.000Z"
                    createdAt: "2024-04-04T06:44:41.785Z"
                    role: user
                    roleText: null
                    roleText2: user
                    profession: "FourthUserProf"
                    initials: "SU"
                    isConfirmed: false
                  }
                ]
              ) {
                __typename
              }
            }
        `);
          assertEquals(res, {
            data: {
              insertIntoUsers: [
                {
                  __typename: "UsersItem",
                },
                {
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
                  geoXy: {
                    x: 20,
                    y: 20.3,
                  },
                  geoTuple: [20, 20.3],
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
                    geoXy: {
                      x: 20,
                      y: 20.3,
                    },
                    geoTuple: [20, 20.3],
                    __typename: "UsersSelectItem",
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
                    __typename: "UsersSelectItem",
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
                    __typename
                  }
                }
              }
            `);
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
                  geoXy: {
                    x: 20,
                    y: 20.3,
                  },
                  geoTuple: [20, 20.3],
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
                    geoXy: {
                      x: 20,
                      y: 20.3,
                    },
                    geoTuple: [20, 20.3],
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
                    __typename
                  }
                }
              }
            `);
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
                    geoXy: {
                      x: 20,
                      y: 20.3,
                    },
                    geoTuple: [20, 20.3],
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
                    __typename: "UsersSelectItem",
                    posts: [],
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
                      geoXy: {
                        x: 20,
                        y: 20.3,
                      },
                      geoTuple: [20, 20.3],
                      __typename: "PostsAuthorRelation",
                    },
                  },
                  {
                    id: 2,
                    authorId: 1,
                    content: "2MESSAGE",
                    __typename: "PostsSelectItem",
                    author: {
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
                      geoXy: {
                        x: 20,
                        y: 20.3,
                      },
                      geoTuple: [20, 20.3],
                      __typename: "PostsAuthorRelation",
                    },
                  },
                  {
                    id: 3,
                    authorId: 1,
                    content: "3MESSAGE",
                    __typename: "PostsSelectItem",
                    author: {
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
                      geoXy: {
                        x: 20,
                        y: 20.3,
                      },
                      geoTuple: [20, 20.3],
                      __typename: "PostsAuthorRelation",
                    },
                  },
                  {
                    id: 4,
                    authorId: 5,
                    content: "1MESSAGE",
                    __typename: "PostsSelectItem",
                    author: {
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
                      __typename: "PostsAuthorRelation",
                    },
                  },
                  {
                    id: 5,
                    authorId: 5,
                    content: "2MESSAGE",
                    __typename: "PostsSelectItem",
                    author: {
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
                      __typename: "PostsAuthorRelation",
                    },
                  },
                  {
                    id: 6,
                    authorId: 1,
                    content: "4MESSAGE",
                    __typename: "PostsSelectItem",
                    author: {
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
                      geoXy: {
                        x: 20,
                        y: 20.3,
                      },
                      geoTuple: [20, 20.3],
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
                    a: [1, 5, 10, 25, 40]
                    id: 3
                    name: "ThirdUser"
                    email: "userThree@notmail.com"
                    birthdayString: "2024-04-02T06:44:41.785Z"
                    birthdayDate: "2024-04-02T06:44:41.785Z"
                    createdAt: "2024-04-02T06:44:41.785Z"
                    role: admin
                    roleText: null
                    profession: "ThirdUserProf"
                    initials: "FU"
                    isConfirmed: true
                    vector: [1, 2, 3, 4, 5]
                    geoXy: {
                      x: 20
                      y: 20.3
                    },
                    geoTuple: [20, 20.3]
                  }
                ) {
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
                  __typename
                }
              }
            `);
            assertEquals(res, {
              data: {
                insertIntoUsersSingle: {
                  a: [1, 5, 10, 25, 40],
                  id: 3,
                  name: "ThirdUser",
                  email: "userThree@notmail.com",
                  birthdayString: "2024-04-02",
                  birthdayDate: "2024-04-02T00:00:00.000Z",
                  createdAt: "2024-04-02T06:44:41.785Z",
                  role: "admin",
                  roleText: null,
                  roleText2: "user",
                  profession: "ThirdUserProf",
                  initials: "FU",
                  isConfirmed: true,
                  vector: [1, 2, 3, 4, 5],
                  geoXy: {
                    x: 20,
                    y: 20.3,
                  },
                  geoTuple: [20, 20.3],
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
                      a: [1, 5, 10, 25, 40]
                      id: 3
                      name: "ThirdUser"
                      email: "userThree@notmail.com"
                      birthdayString: "2024-04-02T06:44:41.785Z"
                      birthdayDate: "2024-04-02T06:44:41.785Z"
                      createdAt: "2024-04-02T06:44:41.785Z"
                      role: admin
                      roleText: null
                      profession: "ThirdUserProf"
                      initials: "FU"
                      isConfirmed: true
                      vector: [1, 2, 3, 4, 5]
                      geoXy: {
                        x: 20
                        y: 20.3
                      }
                      geoTuple: [20, 20.3]
                    }
                    {
                      a: [1, 5, 10, 25, 40]
                      id: 4
                      name: "FourthUser"
                      email: "userFour@notmail.com"
                      birthdayString: "2024-04-04"
                      birthdayDate: "2024-04-04T00:00:00.000Z"
                      createdAt: "2024-04-04T06:44:41.785Z"
                      role: user
                      roleText: null
                      roleText2: user
                      profession: "FourthUserProf"
                      initials: "SU"
                      isConfirmed: false
                    }
                  ]
                ) {
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
                  __typename
                }
              }
            `);
            assertEquals(res, {
              data: {
                insertIntoUsers: [
                  {
                    a: [1, 5, 10, 25, 40],
                    id: 3,
                    name: "ThirdUser",
                    email: "userThree@notmail.com",
                    birthdayString: "2024-04-02",
                    birthdayDate: "2024-04-02T00:00:00.000Z",
                    createdAt: "2024-04-02T06:44:41.785Z",
                    role: "admin",
                    roleText: null,
                    roleText2: "user",
                    profession: "ThirdUserProf",
                    initials: "FU",
                    isConfirmed: true,
                    vector: [1, 2, 3, 4, 5],
                    geoXy: {
                      x: 20,
                      y: 20.3,
                    },
                    geoTuple: [20, 20.3],
                    __typename: "UsersItem",
                  },
                  {
                    a: [1, 5, 10, 25, 40],
                    id: 4,
                    name: "FourthUser",
                    email: "userFour@notmail.com",
                    birthdayString: "2024-04-04",
                    birthdayDate: "2024-04-04T00:00:00.000Z",
                    createdAt: "2024-04-04T06:44:41.785Z",
                    role: "user",
                    roleText: null,
                    roleText2: "user",
                    profession: "FourthUserProf",
                    initials: "SU",
                    isConfirmed: false,
                    vector: null,
                    geoXy: null,
                    geoTuple: null,
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

  await ctx.client.end();
  ctx.ac.abort();
});

import { sql } from 'drizzle-orm';
import { GraphQLObjectType, GraphQLSchema } from 'graphql';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  it,
} from "jsr:@std/testing/bdd";
import { expect } from "jsr:@std/expect";
import * as schema from "../examples/pg/schema.ts";
import ctx from "../examples/pg/context.ts";

beforeAll(async () => {
	ctx.schema = new GraphQLSchema({
		query: new GraphQLObjectType({
			name: 'Query',
			fields: {
				customUsersSingle: ctx.entities.queries.usersSingle,
				customUsers: ctx.entities.queries.users,
				customCustomersSingle: ctx.entities.queries.customersSingle,
				customCustomers: ctx.entities.queries.customers,
				customPostsSingle: ctx.entities.queries.postsSingle,
				customPosts: ctx.entities.queries.posts,
			},
		}),
		mutation: new GraphQLObjectType({
			name: 'Mutation',
			fields: {
				deleteFromCustomUsers: ctx.entities.mutations.deleteFromUsers,
				deleteFromCustomCustomers: ctx.entities.mutations.deleteFromCustomers,
				deleteFromCustomPosts: ctx.entities.mutations.deleteFromPosts,
				updateCustomUsers: ctx.entities.mutations.updateUsers,
				updateCustomCustomers: ctx.entities.mutations.updateCustomers,
				updateCustomPosts: ctx.entities.mutations.updatePosts,
				insertIntoCustomUsers: ctx.entities.mutations.insertIntoUsers,
				insertIntoCustomUsersSingle: ctx.entities.mutations.insertIntoUsersSingle,
				insertIntoCustomCustomers: ctx.entities.mutations.insertIntoCustomers,
				insertIntoCustomCustomersSingle: ctx.entities.mutations.insertIntoCustomersSingle,
				insertIntoCustomPosts: ctx.entities.mutations.insertIntoPosts,
				insertIntoCustomPostsSingle: ctx.entities.mutations.insertIntoPostsSingle,
			},
		}),
		types: [...Object.values(ctx.entities.types), ...Object.values(ctx.entities.inputs)],
	});

	await ctx.db.execute(
		sql`
		DO $$ BEGIN
		CREATE TYPE "role" AS ENUM('admin', 'user');
	   	EXCEPTION
		WHEN duplicate_object THEN null;
	   	END $$;
		`,
	);
});
afterAll(async () => {
	await ctx.client?.end().catch(console.error);
});

beforeEach(async () => {
	await ctx.db.execute(
		sql`CREATE TABLE IF NOT EXISTS "customers" (
			"id" serial PRIMARY KEY NOT NULL,
			"address" text NOT NULL,
			"is_confirmed" boolean,
			"registration_date" timestamp DEFAULT now() NOT NULL,
			"user_id" integer NOT NULL
		);`,
	);

	await ctx.db.execute(sql`CREATE TABLE IF NOT EXISTS "posts" (
		"id" serial PRIMARY KEY NOT NULL,
		"content" text,
		"author_id" integer
	);`);

	await ctx.db.execute(sql`CREATE TABLE IF NOT EXISTS "users" (
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
	);`);

	await ctx.db.execute(sql`DO $$ BEGIN
			ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
		EXCEPTION
			WHEN duplicate_object THEN null;
		END $$;
   `);

	await ctx.db.insert(schema.Users).values([
		{
			a: [1, 5, 10, 25, 40],
			id: 1,
			name: 'FirstUser',
			email: 'userOne@notmail.com',
			birthdayString: '2024-04-02T06:44:41.785Z',
			birthdayDate: new Date('2024-04-02T06:44:41.785Z'),
			createdAt: new Date('2024-04-02T06:44:41.785Z'),
			role: 'admin',
			roleText: null,
			profession: 'FirstUserProf',
			initials: 'FU',
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
			name: 'SecondUser',
			createdAt: new Date('2024-04-02T06:44:41.785Z'),
		},
		{
			id: 5,
			name: 'FifthUser',
			createdAt: new Date('2024-04-02T06:44:41.785Z'),
		},
	]);

	await ctx.db.insert(schema.Posts).values([
		{
			id: 1,
			authorId: 1,
			content: '1MESSAGE',
		},
		{
			id: 2,
			authorId: 1,
			content: '2MESSAGE',
		},
		{
			id: 3,
			authorId: 1,
			content: '3MESSAGE',
		},
		{
			id: 4,
			authorId: 5,
			content: '1MESSAGE',
		},
		{
			id: 5,
			authorId: 5,
			content: '2MESSAGE',
		},
		{
			id: 6,
			authorId: 1,
			content: '4MESSAGE',
		},
	]);

	await ctx.db.insert(schema.Customers).values([
		{
			id: 1,
			address: 'AdOne',
			isConfirmed: false,
			registrationDate: new Date('2024-03-27T03:54:45.235Z'),
			userId: 1,
		},
		{
			id: 2,
			address: 'AdTwo',
			isConfirmed: false,
			registrationDate: new Date('2024-03-27T03:55:42.358Z'),
			userId: 2,
		},
	]);
});

afterEach(async () => {
	await ctx.db.execute(sql`DROP TABLE "posts" CASCADE;`);
	await ctx.db.execute(sql`DROP TABLE "customers" CASCADE;`);
	await ctx.db.execute(sql`DROP TABLE "users" CASCADE;`);
});
describe('Query tests', () => {
	it(`Select single`, async () => {
		const res = await ctx.gql.queryGql(/* GraphQL */ `
			{
				customUsersSingle {
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
				}

				customPostsSingle {
					id
					authorId
					content
				}
			}
		`);

		expect(res).toStrictEqual({
			data: {
				customUsersSingle: {
					a: [1, 5, 10, 25, 40],
					id: 1,
					name: 'FirstUser',
					email: 'userOne@notmail.com',
					birthdayString: '2024-04-02',
					birthdayDate: '2024-04-02T00:00:00.000Z',
					createdAt: '2024-04-02T06:44:41.785Z',
					role: 'admin',
					roleText: null,
					roleText2: 'user',
					profession: 'FirstUserProf',
					initials: 'FU',
					isConfirmed: true,
				},
				customPostsSingle: {
					id: 1,
					authorId: 1,
					content: '1MESSAGE',
				},
			},
		});
	});

	it(`Select array`, async () => {
		const res = await ctx.gql.queryGql(/* GraphQL */ `
			{
				customUsers {
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
				}

				customPosts {
					id
					authorId
					content
				}
			}
		`);

		expect(res).toStrictEqual({
			data: {
				customUsers: [
					{
						a: [1, 5, 10, 25, 40],
						id: 1,
						name: 'FirstUser',
						email: 'userOne@notmail.com',
						birthdayString: '2024-04-02',
						birthdayDate: '2024-04-02T00:00:00.000Z',
						createdAt: '2024-04-02T06:44:41.785Z',
						role: 'admin',
						roleText: null,
						roleText2: 'user',
						profession: 'FirstUserProf',
						initials: 'FU',
						isConfirmed: true,
					},
					{
						a: null,
						id: 2,
						name: 'SecondUser',
						email: null,
						birthdayString: null,
						birthdayDate: null,
						createdAt: '2024-04-02T06:44:41.785Z',
						role: null,
						roleText: null,
						roleText2: 'user',
						profession: null,
						initials: null,
						isConfirmed: null,
					},
					{
						a: null,
						id: 5,
						name: 'FifthUser',
						email: null,
						birthdayString: null,
						birthdayDate: null,
						createdAt: '2024-04-02T06:44:41.785Z',
						role: null,
						roleText: null,
						roleText2: 'user',
						profession: null,
						initials: null,
						isConfirmed: null,
					},
				],
				customPosts: [
					{
						id: 1,
						authorId: 1,
						content: '1MESSAGE',
					},
					{
						id: 2,
						authorId: 1,
						content: '2MESSAGE',
					},
					{
						id: 3,
						authorId: 1,
						content: '3MESSAGE',
					},
					{
						id: 4,
						authorId: 5,
						content: '1MESSAGE',
					},
					{
						id: 5,
						authorId: 5,
						content: '2MESSAGE',
					},
					{
						id: 6,
						authorId: 1,
						content: '4MESSAGE',
					},
				],
			},
		});
	});

	it(`Select single with relations`, async () => {
		const res = await ctx.gql.queryGql(/* GraphQL */ `
			{
				customUsersSingle {
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
					}
				}
			}
		`);

		expect(res).toStrictEqual({
			data: {
				customUsersSingle: {
					a: [1, 5, 10, 25, 40],
					id: 1,
					name: 'FirstUser',
					email: 'userOne@notmail.com',
					birthdayString: '2024-04-02',
					birthdayDate: '2024-04-02T00:00:00.000Z',
					createdAt: '2024-04-02T06:44:41.785Z',
					role: 'admin',
					roleText: null,
					roleText2: 'user',
					profession: 'FirstUserProf',
					initials: 'FU',
					isConfirmed: true,
					posts: [
						{
							id: 1,
							authorId: 1,
							content: '1MESSAGE',
						},
						{
							id: 2,
							authorId: 1,
							content: '2MESSAGE',
						},
						{
							id: 3,
							authorId: 1,
							content: '3MESSAGE',
						},

						{
							id: 6,
							authorId: 1,
							content: '4MESSAGE',
						},
					],
				},
				customPostsSingle: {
					id: 1,
					authorId: 1,
					content: '1MESSAGE',
					author: {
						a: [1, 5, 10, 25, 40],
						id: 1,
						name: 'FirstUser',
						email: 'userOne@notmail.com',
						birthdayString: '2024-04-02',
						birthdayDate: '2024-04-02T00:00:00.000Z',
						createdAt: '2024-04-02T06:44:41.785Z',
						role: 'admin',
						roleText: null,
						roleText2: 'user',
						profession: 'FirstUserProf',
						initials: 'FU',
						isConfirmed: true,
					},
				},
			},
		});
	});

	it(`Select array with relations`, async () => {
		const res = await ctx.gql.queryGql(/* GraphQL */ `
			{
				customUsers {
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
					}
				}
			}
		`);

		expect(res).toStrictEqual({
			data: {
				customUsers: [
					{
						a: [1, 5, 10, 25, 40],
						id: 1,
						name: 'FirstUser',
						email: 'userOne@notmail.com',
						birthdayString: '2024-04-02',
						birthdayDate: '2024-04-02T00:00:00.000Z',
						createdAt: '2024-04-02T06:44:41.785Z',
						role: 'admin',
						roleText: null,
						roleText2: 'user',
						profession: 'FirstUserProf',
						initials: 'FU',
						isConfirmed: true,
						posts: [
							{
								id: 1,
								authorId: 1,
								content: '1MESSAGE',
							},
							{
								id: 2,
								authorId: 1,
								content: '2MESSAGE',
							},
							{
								id: 3,
								authorId: 1,
								content: '3MESSAGE',
							},
							{
								id: 6,
								authorId: 1,
								content: '4MESSAGE',
							},
						],
					},
					{
						a: null,
						id: 2,
						name: 'SecondUser',
						email: null,
						birthdayString: null,
						birthdayDate: null,
						createdAt: '2024-04-02T06:44:41.785Z',
						role: null,
						roleText: null,
						roleText2: 'user',
						profession: null,
						initials: null,
						isConfirmed: null,
						posts: [],
					},
					{
						a: null,
						id: 5,
						name: 'FifthUser',
						email: null,
						birthdayString: null,
						birthdayDate: null,
						createdAt: '2024-04-02T06:44:41.785Z',
						role: null,
						roleText: null,
						roleText2: 'user',
						profession: null,
						initials: null,
						isConfirmed: null,
						posts: [
							{
								id: 4,
								authorId: 5,
								content: '1MESSAGE',
							},
							{
								id: 5,
								authorId: 5,
								content: '2MESSAGE',
							},
						],
					},
				],
				customPosts: [
					{
						id: 1,
						authorId: 1,
						content: '1MESSAGE',
						author: {
							a: [1, 5, 10, 25, 40],
							id: 1,
							name: 'FirstUser',
							email: 'userOne@notmail.com',
							birthdayString: '2024-04-02',
							birthdayDate: '2024-04-02T00:00:00.000Z',
							createdAt: '2024-04-02T06:44:41.785Z',
							role: 'admin',
							roleText: null,
							roleText2: 'user',
							profession: 'FirstUserProf',
							initials: 'FU',
							isConfirmed: true,
						},
					},
					{
						id: 2,
						authorId: 1,
						content: '2MESSAGE',
						author: {
							a: [1, 5, 10, 25, 40],
							id: 1,
							name: 'FirstUser',
							email: 'userOne@notmail.com',
							birthdayString: '2024-04-02',
							birthdayDate: '2024-04-02T00:00:00.000Z',
							createdAt: '2024-04-02T06:44:41.785Z',
							role: 'admin',
							roleText: null,
							roleText2: 'user',
							profession: 'FirstUserProf',
							initials: 'FU',
							isConfirmed: true,
						},
					},
					{
						id: 3,
						authorId: 1,
						content: '3MESSAGE',
						author: {
							a: [1, 5, 10, 25, 40],
							id: 1,
							name: 'FirstUser',
							email: 'userOne@notmail.com',
							birthdayString: '2024-04-02',
							birthdayDate: '2024-04-02T00:00:00.000Z',
							createdAt: '2024-04-02T06:44:41.785Z',
							role: 'admin',
							roleText: null,
							roleText2: 'user',
							profession: 'FirstUserProf',
							initials: 'FU',
							isConfirmed: true,
						},
					},
					{
						id: 4,
						authorId: 5,
						content: '1MESSAGE',
						author: {
							a: null,
							id: 5,
							name: 'FifthUser',
							email: null,
							birthdayString: null,
							birthdayDate: null,
							createdAt: '2024-04-02T06:44:41.785Z',
							role: null,
							roleText: null,
							roleText2: 'user',
							profession: null,
							initials: null,
							isConfirmed: null,
						},
					},
					{
						id: 5,
						authorId: 5,
						content: '2MESSAGE',
						author: {
							a: null,
							id: 5,
							name: 'FifthUser',
							email: null,
							birthdayString: null,
							birthdayDate: null,
							createdAt: '2024-04-02T06:44:41.785Z',
							role: null,
							roleText: null,
							roleText2: 'user',
							profession: null,
							initials: null,
							isConfirmed: null,
						},
					},
					{
						id: 6,
						authorId: 1,
						content: '4MESSAGE',
						author: {
							a: [1, 5, 10, 25, 40],
							id: 1,
							name: 'FirstUser',
							email: 'userOne@notmail.com',
							birthdayString: '2024-04-02',
							birthdayDate: '2024-04-02T00:00:00.000Z',
							createdAt: '2024-04-02T06:44:41.785Z',
							role: 'admin',
							roleText: null,
							roleText2: 'user',
							profession: 'FirstUserProf',
							initials: 'FU',
							isConfirmed: true,
						},
					},
				],
			},
		});
	});

	it(`Select single by fragment`, async () => {
		const res = await ctx.gql.queryGql(/* GraphQL */ `
			query testQuery {
				customUsersSingle {
					...UsersFrag
				}

				customPostsSingle {
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
			}

			fragment PostsFrag on PostsSelectItem {
				id
				authorId
				content
			}
		`);

		expect(res).toStrictEqual({
			data: {
				customUsersSingle: {
					a: [1, 5, 10, 25, 40],
					id: 1,
					name: 'FirstUser',
					email: 'userOne@notmail.com',
					birthdayString: '2024-04-02',
					birthdayDate: '2024-04-02T00:00:00.000Z',
					createdAt: '2024-04-02T06:44:41.785Z',
					role: 'admin',
					roleText: null,
					roleText2: 'user',
					profession: 'FirstUserProf',
					initials: 'FU',
					isConfirmed: true,
				},
				customPostsSingle: {
					id: 1,
					authorId: 1,
					content: '1MESSAGE',
				},
			},
		});
	});

	it(`Select array by fragment`, async () => {
		const res = await ctx.gql.queryGql(/* GraphQL */ `
			query testQuery {
				customUsers {
					...UsersFrag
				}

				customPosts {
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
			}

			fragment PostsFrag on PostsSelectItem {
				id
				authorId
				content
			}
		`);

		expect(res).toStrictEqual({
			data: {
				customUsers: [
					{
						a: [1, 5, 10, 25, 40],
						id: 1,
						name: 'FirstUser',
						email: 'userOne@notmail.com',
						birthdayString: '2024-04-02',
						birthdayDate: '2024-04-02T00:00:00.000Z',
						createdAt: '2024-04-02T06:44:41.785Z',
						role: 'admin',
						roleText: null,
						roleText2: 'user',
						profession: 'FirstUserProf',
						initials: 'FU',
						isConfirmed: true,
					},
					{
						a: null,
						id: 2,
						name: 'SecondUser',
						email: null,
						birthdayString: null,
						birthdayDate: null,
						createdAt: '2024-04-02T06:44:41.785Z',
						role: null,
						roleText: null,
						roleText2: 'user',
						profession: null,
						initials: null,
						isConfirmed: null,
					},
					{
						a: null,
						id: 5,
						name: 'FifthUser',
						email: null,
						birthdayString: null,
						birthdayDate: null,
						createdAt: '2024-04-02T06:44:41.785Z',
						role: null,
						roleText: null,
						roleText2: 'user',
						profession: null,
						initials: null,
						isConfirmed: null,
					},
				],
				customPosts: [
					{
						id: 1,
						authorId: 1,
						content: '1MESSAGE',
					},
					{
						id: 2,
						authorId: 1,
						content: '2MESSAGE',
					},
					{
						id: 3,
						authorId: 1,
						content: '3MESSAGE',
					},
					{
						id: 4,
						authorId: 5,
						content: '1MESSAGE',
					},
					{
						id: 5,
						authorId: 5,
						content: '2MESSAGE',
					},
					{
						id: 6,
						authorId: 1,
						content: '4MESSAGE',
					},
				],
			},
		});
	});

	it(`Select single with relations by fragment`, async () => {
		const res = await ctx.gql.queryGql(/* GraphQL */ `
			query testQuery {
				customUsersSingle {
					...UsersFrag
				}

				customPostsSingle {
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
				}
			}
		`);

		expect(res).toStrictEqual({
			data: {
				customUsersSingle: {
					a: [1, 5, 10, 25, 40],
					id: 1,
					name: 'FirstUser',
					email: 'userOne@notmail.com',
					birthdayString: '2024-04-02',
					birthdayDate: '2024-04-02T00:00:00.000Z',
					createdAt: '2024-04-02T06:44:41.785Z',
					role: 'admin',
					roleText: null,
					roleText2: 'user',
					profession: 'FirstUserProf',
					initials: 'FU',
					isConfirmed: true,
					posts: [
						{
							id: 1,
							authorId: 1,
							content: '1MESSAGE',
						},
						{
							id: 2,
							authorId: 1,
							content: '2MESSAGE',
						},
						{
							id: 3,
							authorId: 1,
							content: '3MESSAGE',
						},

						{
							id: 6,
							authorId: 1,
							content: '4MESSAGE',
						},
					],
				},
				customPostsSingle: {
					id: 1,
					authorId: 1,
					content: '1MESSAGE',
					author: {
						a: [1, 5, 10, 25, 40],
						id: 1,
						name: 'FirstUser',
						email: 'userOne@notmail.com',
						birthdayString: '2024-04-02',
						birthdayDate: '2024-04-02T00:00:00.000Z',
						createdAt: '2024-04-02T06:44:41.785Z',
						role: 'admin',
						roleText: null,
						roleText2: 'user',
						profession: 'FirstUserProf',
						initials: 'FU',
						isConfirmed: true,
					},
				},
			},
		});
	});

	it(`Select array with relations`, async () => {
		const res = await ctx.gql.queryGql(/* GraphQL */ `
			query testQuery {
				customUsers {
					...UsersFrag
				}

				customPosts {
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
				}
			}
		`);

		expect(res).toStrictEqual({
			data: {
				customUsers: [
					{
						a: [1, 5, 10, 25, 40],
						id: 1,
						name: 'FirstUser',
						email: 'userOne@notmail.com',
						birthdayString: '2024-04-02',
						birthdayDate: '2024-04-02T00:00:00.000Z',
						createdAt: '2024-04-02T06:44:41.785Z',
						role: 'admin',
						roleText: null,
						roleText2: 'user',
						profession: 'FirstUserProf',
						initials: 'FU',
						isConfirmed: true,
						posts: [
							{
								id: 1,
								authorId: 1,
								content: '1MESSAGE',
							},
							{
								id: 2,
								authorId: 1,
								content: '2MESSAGE',
							},
							{
								id: 3,
								authorId: 1,
								content: '3MESSAGE',
							},
							{
								id: 6,
								authorId: 1,
								content: '4MESSAGE',
							},
						],
					},
					{
						a: null,
						id: 2,
						name: 'SecondUser',
						email: null,
						birthdayString: null,
						birthdayDate: null,
						createdAt: '2024-04-02T06:44:41.785Z',
						role: null,
						roleText: null,
						roleText2: 'user',
						profession: null,
						initials: null,
						isConfirmed: null,
						posts: [],
					},
					{
						a: null,
						id: 5,
						name: 'FifthUser',
						email: null,
						birthdayString: null,
						birthdayDate: null,
						createdAt: '2024-04-02T06:44:41.785Z',
						role: null,
						roleText: null,
						roleText2: 'user',
						profession: null,
						initials: null,
						isConfirmed: null,
						posts: [
							{
								id: 4,
								authorId: 5,
								content: '1MESSAGE',
							},
							{
								id: 5,
								authorId: 5,
								content: '2MESSAGE',
							},
						],
					},
				],
				customPosts: [
					{
						id: 1,
						authorId: 1,
						content: '1MESSAGE',
						author: {
							a: [1, 5, 10, 25, 40],
							id: 1,
							name: 'FirstUser',
							email: 'userOne@notmail.com',
							birthdayString: '2024-04-02',
							birthdayDate: '2024-04-02T00:00:00.000Z',
							createdAt: '2024-04-02T06:44:41.785Z',
							role: 'admin',
							roleText: null,
							roleText2: 'user',
							profession: 'FirstUserProf',
							initials: 'FU',
							isConfirmed: true,
						},
					},
					{
						id: 2,
						authorId: 1,
						content: '2MESSAGE',
						author: {
							a: [1, 5, 10, 25, 40],
							id: 1,
							name: 'FirstUser',
							email: 'userOne@notmail.com',
							birthdayString: '2024-04-02',
							birthdayDate: '2024-04-02T00:00:00.000Z',
							createdAt: '2024-04-02T06:44:41.785Z',
							role: 'admin',
							roleText: null,
							roleText2: 'user',
							profession: 'FirstUserProf',
							initials: 'FU',
							isConfirmed: true,
						},
					},
					{
						id: 3,
						authorId: 1,
						content: '3MESSAGE',
						author: {
							a: [1, 5, 10, 25, 40],
							id: 1,
							name: 'FirstUser',
							email: 'userOne@notmail.com',
							birthdayString: '2024-04-02',
							birthdayDate: '2024-04-02T00:00:00.000Z',
							createdAt: '2024-04-02T06:44:41.785Z',
							role: 'admin',
							roleText: null,
							roleText2: 'user',
							profession: 'FirstUserProf',
							initials: 'FU',
							isConfirmed: true,
						},
					},
					{
						id: 4,
						authorId: 5,
						content: '1MESSAGE',
						author: {
							a: null,
							id: 5,
							name: 'FifthUser',
							email: null,
							birthdayString: null,
							birthdayDate: null,
							createdAt: '2024-04-02T06:44:41.785Z',
							role: null,
							roleText: null,
							roleText2: 'user',
							profession: null,
							initials: null,
							isConfirmed: null,
						},
					},
					{
						id: 5,
						authorId: 5,
						content: '2MESSAGE',
						author: {
							a: null,
							id: 5,
							name: 'FifthUser',
							email: null,
							birthdayString: null,
							birthdayDate: null,
							createdAt: '2024-04-02T06:44:41.785Z',
							role: null,
							roleText: null,
							roleText2: 'user',
							profession: null,
							initials: null,
							isConfirmed: null,
						},
					},
					{
						id: 6,
						authorId: 1,
						content: '4MESSAGE',
						author: {
							a: [1, 5, 10, 25, 40],
							id: 1,
							name: 'FirstUser',
							email: 'userOne@notmail.com',
							birthdayString: '2024-04-02',
							birthdayDate: '2024-04-02T00:00:00.000Z',
							createdAt: '2024-04-02T06:44:41.785Z',
							role: 'admin',
							roleText: null,
							roleText2: 'user',
							profession: 'FirstUserProf',
							initials: 'FU',
							isConfirmed: true,
						},
					},
				],
			},
		});
	});

	it(`Insert single`, async () => {
		const res = await ctx.gql.queryGql(/* GraphQL */ `
			mutation {
				insertIntoCustomUsersSingle(
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
				}
			}
		`);

		expect(res).toStrictEqual({
			data: {
				insertIntoCustomUsersSingle: {
					a: [1, 5, 10, 25, 40],
					id: 3,
					name: 'ThirdUser',
					email: 'userThree@notmail.com',
					birthdayString: '2024-04-02',
					birthdayDate: '2024-04-02T00:00:00.000Z',
					createdAt: '2024-04-02T06:44:41.785Z',
					role: 'admin',
					roleText: null,
					roleText2: 'user',
					profession: 'ThirdUserProf',
					initials: 'FU',
					isConfirmed: true,
				},
			},
		});
	});

	it(`Insert array`, async () => {
		const res = await ctx.gql.queryGql(/* GraphQL */ `
			mutation {
				insertIntoCustomUsers(
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
				}
			}
		`);

		expect(res).toStrictEqual({
			data: {
				insertIntoCustomUsers: [
					{
						a: [1, 5, 10, 25, 40],
						id: 3,
						name: 'ThirdUser',
						email: 'userThree@notmail.com',
						birthdayString: '2024-04-02',
						birthdayDate: '2024-04-02T00:00:00.000Z',
						createdAt: '2024-04-02T06:44:41.785Z',
						role: 'admin',
						roleText: null,
						roleText2: 'user',
						profession: 'ThirdUserProf',
						initials: 'FU',
						isConfirmed: true,
					},
					{
						a: [1, 5, 10, 25, 40],
						id: 4,
						name: 'FourthUser',
						email: 'userFour@notmail.com',
						birthdayString: '2024-04-04',
						birthdayDate: '2024-04-04T00:00:00.000Z',
						createdAt: '2024-04-04T06:44:41.785Z',
						role: 'user',
						roleText: null,
						roleText2: 'user',
						profession: 'FourthUserProf',
						initials: 'SU',
						isConfirmed: false,
					},
				],
			},
		});
	});

	it(`Update`, async () => {
		const res = await ctx.gql.queryGql(/* GraphQL */ `
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

		expect(res).toStrictEqual({
			data: {
				updateCustomCustomers: [
					{
						id: 1,
						address: 'Edited',
						isConfirmed: true,
						registrationDate: '2024-03-27T03:54:45.235Z',
						userId: 1,
					},
					{
						id: 2,
						address: 'Edited',
						isConfirmed: true,
						registrationDate: '2024-03-27T03:55:42.358Z',
						userId: 2,
					},
				],
			},
		});
	});

	it(`Delete`, async () => {
		const res = await ctx.gql.queryGql(/* GraphQL */ `
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

		expect(res).toStrictEqual({
			data: {
				deleteFromCustomCustomers: [
					{
						id: 1,
						address: 'AdOne',
						isConfirmed: false,
						registrationDate: '2024-03-27T03:54:45.235Z',
						userId: 1,
					},
					{
						id: 2,
						address: 'AdTwo',
						isConfirmed: false,
						registrationDate: '2024-03-27T03:55:42.358Z',
						userId: 2,
					},
				],
			},
		});
	});
});

describe('Arguments tests', () => {
	it('Order by', async () => {
		const res = await ctx.gql.queryGql(/* GraphQL */ `
			{
				customPosts(
					orderBy: { authorId: { priority: 1, direction: desc }, content: { priority: 0, direction: asc } }
				) {
					id
					authorId
					content
				}
			}
		`);

		expect(res).toStrictEqual({
			data: {
				customPosts: [
					{
						id: 4,
						authorId: 5,
						content: '1MESSAGE',
					},
					{
						id: 5,
						authorId: 5,
						content: '2MESSAGE',
					},
					{
						id: 1,
						authorId: 1,
						content: '1MESSAGE',
					},
					{
						id: 2,
						authorId: 1,
						content: '2MESSAGE',
					},
					{
						id: 3,
						authorId: 1,
						content: '3MESSAGE',
					},

					{
						id: 6,
						authorId: 1,
						content: '4MESSAGE',
					},
				],
			},
		});
	});

	it('Order by on single', async () => {
		const res = await ctx.gql.queryGql(/* GraphQL */ `
			{
				customPostsSingle(
					orderBy: { authorId: { priority: 1, direction: desc }, content: { priority: 0, direction: asc } }
				) {
					id
					authorId
					content
				}
			}
		`);

		expect(res).toStrictEqual({
			data: {
				customPostsSingle: {
					id: 4,
					authorId: 5,
					content: '1MESSAGE',
				},
			},
		});
	});

	it('Offset & limit', async () => {
		const res = await ctx.gql.queryGql(/* GraphQL */ `
			{
				customPosts(offset: 1, limit: 2) {
					id
					authorId
					content
				}
			}
		`);

		expect(res).toStrictEqual({
			data: {
				customPosts: [
					{
						id: 2,
						authorId: 1,
						content: '2MESSAGE',
					},
					{
						id: 3,
						authorId: 1,
						content: '3MESSAGE',
					},
				],
			},
		});
	});

	it('Offset on single', async () => {
		const res = await ctx.gql.queryGql(/* GraphQL */ `
			{
				customPostsSingle(offset: 1) {
					id
					authorId
					content
				}
			}
		`);

		expect(res).toStrictEqual({
			data: {
				customPostsSingle: {
					id: 2,
					authorId: 1,
					content: '2MESSAGE',
				},
			},
		});
	});

	it('Filters - top level AND', async () => {
		const res = await ctx.gql.queryGql(/* GraphQL */ `
			{
				customPosts(where: { id: { inArray: [2, 3, 4, 5, 6] }, authorId: { ne: 5 }, content: { ne: "3MESSAGE" } }) {
					id
					authorId
					content
				}
			}
		`);

		expect(res).toStrictEqual({
			data: {
				customPosts: [
					{
						id: 2,
						authorId: 1,
						content: '2MESSAGE',
					},
					{
						id: 6,
						authorId: 1,
						content: '4MESSAGE',
					},
				],
			},
		});
	});

	it('Filters - top level OR', async () => {
		const res = await ctx.gql.queryGql(/* GraphQL */ `
			{
				customPosts(where: { OR: [{ id: { lte: 3 } }, { authorId: { eq: 5 } }] }) {
					id
					authorId
					content
				}
			}
		`);

		expect(res).toStrictEqual({
			data: {
				customPosts: [
					{
						id: 1,
						authorId: 1,
						content: '1MESSAGE',
					},
					{
						id: 2,
						authorId: 1,
						content: '2MESSAGE',
					},
					{
						id: 3,
						authorId: 1,
						content: '3MESSAGE',
					},
					{
						id: 4,
						authorId: 5,
						content: '1MESSAGE',
					},
					{
						id: 5,
						authorId: 5,
						content: '2MESSAGE',
					},
				],
			},
		});
	});

	it('Update filters', async () => {
		const res = await ctx.gql.queryGql(/* GraphQL */ `
			mutation {
				updateCustomPosts(where: { OR: [{ id: { lte: 3 } }, { authorId: { eq: 5 } }] }, set: { content: "UPDATED" }) {
					id
					authorId
					content
				}
			}
		`);

		expect(res).toStrictEqual({
			data: {
				updateCustomPosts: [
					{
						id: 1,
						authorId: 1,
						content: 'UPDATED',
					},
					{
						id: 2,
						authorId: 1,
						content: 'UPDATED',
					},
					{
						id: 3,
						authorId: 1,
						content: 'UPDATED',
					},
					{
						id: 4,
						authorId: 5,
						content: 'UPDATED',
					},
					{
						id: 5,
						authorId: 5,
						content: 'UPDATED',
					},
				],
			},
		});
	});

	it('Delete filters', async () => {
		const res = await ctx.gql.queryGql(/* GraphQL */ `
			mutation {
				deleteFromCustomPosts(where: { OR: [{ id: { lte: 3 } }, { authorId: { eq: 5 } }] }) {
					id
					authorId
					content
				}
			}
		`);

		expect(res).toStrictEqual({
			data: {
				deleteFromCustomPosts: [
					{
						id: 1,
						authorId: 1,
						content: '1MESSAGE',
					},
					{
						id: 2,
						authorId: 1,
						content: '2MESSAGE',
					},
					{
						id: 3,
						authorId: 1,
						content: '3MESSAGE',
					},
					{
						id: 4,
						authorId: 5,
						content: '1MESSAGE',
					},
					{
						id: 5,
						authorId: 5,
						content: '2MESSAGE',
					},
				],
			},
		});
	});

	it('Relations orderBy', async () => {
		const res = await ctx.gql.queryGql(/* GraphQL */ `
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

		expect(res).toStrictEqual({
			data: {
				customUsers: [
					{
						id: 1,
						posts: [
							{
								id: 6,
								authorId: 1,
								content: '4MESSAGE',
							},
							{
								id: 3,
								authorId: 1,
								content: '3MESSAGE',
							},
							{
								id: 2,
								authorId: 1,
								content: '2MESSAGE',
							},
							{
								id: 1,
								authorId: 1,
								content: '1MESSAGE',
							},
						],
					},
					{
						id: 2,
						posts: [],
					},
					{
						id: 5,
						posts: [
							{
								id: 5,
								authorId: 5,
								content: '2MESSAGE',
							},
							{
								id: 4,
								authorId: 5,
								content: '1MESSAGE',
							},
						],
					},
				],
			},
		});
	});

	it('Relations offset & limit', async () => {
		const res = await ctx.gql.queryGql(/* GraphQL */ `
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

		expect(res).toStrictEqual({
			data: {
				customUsers: [
					{
						id: 1,
						posts: [
							{
								id: 2,
								authorId: 1,
								content: '2MESSAGE',
							},
							{
								id: 3,
								authorId: 1,
								content: '3MESSAGE',
							},
						],
					},
					{
						id: 2,
						posts: [],
					},
					{
						id: 5,
						posts: [
							{
								id: 5,
								authorId: 5,
								content: '2MESSAGE',
							},
						],
					},
				],
			},
		});
	});

	it('Relations filters', async () => {
		const res = await ctx.gql.queryGql(/* GraphQL */ `
			{
				customUsers {
					id
					posts(where: { content: { ilike: "2%" } }) {
						id
						authorId
						content
					}
				}
			}
		`);

		expect(res).toStrictEqual({
			data: {
				customUsers: [
					{
						id: 1,
						posts: [
							{
								id: 2,
								authorId: 1,
								content: '2MESSAGE',
							},
						],
					},
					{
						id: 2,
						posts: [],
					},
					{
						id: 5,
						posts: [
							{
								id: 5,
								authorId: 5,
								content: '2MESSAGE',
							},
						],
					},
				],
			},
		});
	});
});
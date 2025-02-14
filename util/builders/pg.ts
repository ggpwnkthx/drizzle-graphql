import {
	createTableRelationsHelpers,
	is,
	Relation,
	Relations,
	Table,
} from 'drizzle-orm';
import { PgColumn, PgDatabase, PgTable } from 'drizzle-orm/pg-core';
import {
	GraphQLError,
	GraphQLInputObjectType,
	GraphQLInt,
	GraphQLList,
	GraphQLNonNull,
	GraphQLObjectType,
} from 'graphql';

import {
	extractFilters,
	extractOrderBy,
	extractRelationsParams,
	extractSelectedColumnsFromTree,
	extractSelectedColumnsFromTreeSQLFormat,
	generateTableTypes,
} from './common.ts';
import { capitalize, uncapitalize } from '../case-ops/index.ts';
import {
	remapFromGraphQLArrayInput,
	remapFromGraphQLSingleInput,
	remapToGraphQLArrayOutput,
	remapToGraphQLSingleOutput,
} from '../data-mappers/index.ts';
import { parseResolveInfo } from 'graphql-parse-resolve-info';

import type { GeneratedEntities } from '../../types.ts';
import type { RelationalQueryBuilder } from 'drizzle-orm/mysql-core/query-builders/query';
import type {
	GraphQLFieldConfig,
	GraphQLFieldConfigArgumentMap,
	ThunkObjMap,
} from 'graphql';
import type { ResolveTree } from 'graphql-parse-resolve-info';
import type {
	CreatedResolver,
	Filters,
	TableNamedRelations,
	TableSelectArgs,
} from './types.ts';

/* Helper: Wrap async resolver work to catch errors and rethrow as GraphQLError */
const withErrorHandling = async <T>(fn: () => Promise<T>): Promise<T> => {
	try {
		return await fn();
	} catch (e: any) {
		if (e && typeof e.message === 'string') throw new GraphQLError(e.message);
		throw e;
	}
};

/* Helper: Parse GraphQL resolve info */
const parseInfo = (info: any): ResolveTree =>
	parseResolveInfo(info, { deep: true }) as ResolveTree;

const generateSelectArray = (
	db: PgDatabase<any, any, any>,
	tableName: string,
	tables: Record<string, Table>,
	relationMap: Record<string, Record<string, TableNamedRelations>>,
	orderArgs: GraphQLInputObjectType,
	filterArgs: GraphQLInputObjectType
): CreatedResolver => {
	const queryName = uncapitalize(tableName);
	const queryBase = db.query[
		tableName as keyof typeof db.query
	] as unknown as RelationalQueryBuilder<any, any, any> | undefined;
	if (!queryBase) {
		throw new Error(
			`Drizzle-GraphQL Error: Table ${tableName} not found in drizzle instance. Did you forget to pass schema to drizzle constructor?`
		);
	}

	const queryArgs: GraphQLFieldConfigArgumentMap = {
		offset: { type: GraphQLInt },
		limit: { type: GraphQLInt },
		orderBy: { type: orderArgs },
		where: { type: filterArgs },
	};

	const typeName = `${capitalize(tableName)}SelectItem`;
	const table = tables[tableName]!;

	return {
		name: queryName,
		resolver: (source, args: Partial<TableSelectArgs>, context, info) =>
			withErrorHandling(async () => {
				const { offset, limit, orderBy, where } = args;
				const parsedInfo = parseInfo(info);
				const dbInstance = context?.db || source?.db || defaultDb;
				const queryInstance =
					dbInstance.query[tableName] || queryBase;

				const query = queryInstance.findMany({
					columns: extractSelectedColumnsFromTree(
						parsedInfo.fieldsByTypeName[typeName]!,
						table
					),
					offset,
					limit,
					orderBy: orderBy ? extractOrderBy(table, orderBy) : undefined,
					where: where ? extractFilters(table, tableName, where) : undefined,
					with: relationMap[tableName]
						? extractRelationsParams(
								relationMap,
								tables,
								tableName,
								parsedInfo,
								typeName
						  )
						: undefined,
				});
				const result = await query;
				return remapToGraphQLArrayOutput(result, tableName, table, relationMap);
			}),
		args: queryArgs,
	};
};

const generateSelectSingle = (
	db: PgDatabase<any, any, any>,
	tableName: string,
	tables: Record<string, Table>,
	relationMap: Record<string, Record<string, TableNamedRelations>>,
	orderArgs: GraphQLInputObjectType,
	filterArgs: GraphQLInputObjectType
): CreatedResolver => {
	const queryName = `${uncapitalize(tableName)}Single`;
	const queryBase = db.query[
		tableName as keyof typeof db.query
	] as unknown as RelationalQueryBuilder<any, any, any> | undefined;
	if (!queryBase) {
		throw new Error(
			`Drizzle-GraphQL Error: Table ${tableName} not found in drizzle instance. Did you forget to pass schema to drizzle constructor?`
		);
	}

	const queryArgs: GraphQLFieldConfigArgumentMap = {
		offset: { type: GraphQLInt },
		orderBy: { type: orderArgs },
		where: { type: filterArgs },
	};

	const typeName = `${capitalize(tableName)}SelectItem`;
	const table = tables[tableName]!;

	return {
		name: queryName,
		resolver: (source, args: Partial<TableSelectArgs>, context, info) =>
			withErrorHandling(async () => {
				const { offset, orderBy, where } = args;
				const parsedInfo = parseInfo(info);
				const dbInstance = context?.db || source?.db || defaultDb;
				const queryInstance =
					dbInstance.query[tableName] || queryBase;

				const query = queryInstance.findFirst({
					columns: extractSelectedColumnsFromTree(
						parsedInfo.fieldsByTypeName[typeName]!,
						table
					),
					offset,
					orderBy: orderBy ? extractOrderBy(table, orderBy) : undefined,
					where: where ? extractFilters(table, tableName, where) : undefined,
					with: relationMap[tableName]
						? extractRelationsParams(
								relationMap,
								tables,
								tableName,
								parsedInfo,
								typeName
						  )
						: undefined,
				});
				const result = await query;
				return result
					? remapToGraphQLSingleOutput(result, tableName, table, relationMap)
					: undefined;
			}),
		args: queryArgs,
	};
};

const generateInsertArray = (
	db: PgDatabase<any, any, any>,
	tableName: string,
	table: PgTable,
	baseType: GraphQLInputObjectType
): CreatedResolver => {
	const queryName = `insertInto${capitalize(tableName)}`;
	const typeName = `${capitalize(tableName)}Item`;

	const queryArgs: GraphQLFieldConfigArgumentMap = {
		values: {
			type: new GraphQLNonNull(
				new GraphQLList(new GraphQLNonNull(baseType))
			),
		},
	};

	return {
		name: queryName,
		resolver: (source, args: { values: Record<string, any>[] }, context, info) =>
			withErrorHandling(async () => {
				const input = remapFromGraphQLArrayInput(args.values, table);
				if (!input.length)
					throw new GraphQLError('No values were provided!');
				const parsedInfo = parseInfo(info);
				const columns = extractSelectedColumnsFromTreeSQLFormat<PgColumn>(
					parsedInfo.fieldsByTypeName[typeName]!,
					table
				);
				const dbInstance = context?.db || source?.db || defaultDb;
				const result = await dbInstance
					.insert(table)
					.values(input)
					.returning(columns)
					.onConflictDoNothing();
				return remapToGraphQLArrayOutput(result, tableName, table);
			}),
		args: queryArgs,
	};
};

const generateInsertSingle = (
	db: PgDatabase<any, any, any>,
	tableName: string,
	table: PgTable,
	baseType: GraphQLInputObjectType
): CreatedResolver => {
	const queryName = `insertInto${capitalize(tableName)}Single`;
	const typeName = `${capitalize(tableName)}Item`;

	const queryArgs: GraphQLFieldConfigArgumentMap = {
		values: { type: new GraphQLNonNull(baseType) },
	};

	return {
		name: queryName,
		resolver: (source, args: { values: Record<string, any> }, context, info) =>
			withErrorHandling(async () => {
				const input = remapFromGraphQLSingleInput(args.values, table);
				const parsedInfo = parseInfo(info);
				const columns = extractSelectedColumnsFromTreeSQLFormat<PgColumn>(
					parsedInfo.fieldsByTypeName[typeName]!,
					table
				);
				const dbInstance = context?.db || source?.db || defaultDb;
				const result = await dbInstance
					.insert(table)
					.values(input)
					.returning(columns)
					.onConflictDoNothing();
				return result[0]
					? remapToGraphQLSingleOutput(result[0], tableName, table)
					: undefined;
			}),
		args: queryArgs,
	};
};

const generateUpdate = (
	db: PgDatabase<any, any, any>,
	tableName: string,
	table: PgTable,
	setArgs: GraphQLInputObjectType,
	filterArgs: GraphQLInputObjectType
): CreatedResolver => {
	const queryName = `update${capitalize(tableName)}`;
	const typeName = `${capitalize(tableName)}Item`;

	const queryArgs: GraphQLFieldConfigArgumentMap = {
		set: { type: new GraphQLNonNull(setArgs) },
		where: { type: filterArgs },
	};

	return {
		name: queryName,
		resolver: (
			source,
			args: { where?: Filters<Table>; set: Record<string, any> },
			context,
			info
		) =>
			withErrorHandling(async () => {
				const { where, set } = args;
				const parsedInfo = parseInfo(info);
				const columns = extractSelectedColumnsFromTreeSQLFormat<PgColumn>(
					parsedInfo.fieldsByTypeName[typeName]!,
					table
				);
				const input = remapFromGraphQLSingleInput(set, table);
				if (!Object.keys(input).length)
					throw new GraphQLError(
						'Unable to update with no values specified!'
					);
				const dbInstance = context?.db || source?.db || defaultDb;
				let query = dbInstance.update(table).set(input);
				if (where) {
					query = query.where(
						extractFilters(table, tableName, where)
					) as any;
				}
				query = query.returning(columns) as any;
				const result = await query;
				return remapToGraphQLArrayOutput(result, tableName, table);
			}),
		args: queryArgs,
	};
};

const generateDelete = (
	db: PgDatabase<any, any, any>,
	tableName: string,
	table: PgTable,
	filterArgs: GraphQLInputObjectType
): CreatedResolver => {
	const queryName = `deleteFrom${capitalize(tableName)}`;
	const typeName = `${capitalize(tableName)}Item`;

	const queryArgs: GraphQLFieldConfigArgumentMap = {
		where: { type: filterArgs },
	};

	return {
		name: queryName,
		resolver: (
			source,
			args: { where?: Filters<Table> },
			context,
			info
		) =>
			withErrorHandling(async () => {
				const { where } = args;
				const parsedInfo = parseInfo(info);
				const columns = extractSelectedColumnsFromTreeSQLFormat<PgColumn>(
					parsedInfo.fieldsByTypeName[typeName]!,
					table
				);
				const dbInstance = context?.db || source?.db || defaultDb;
				let query = dbInstance.delete(table);
				if (where) {
					query = query.where(
						extractFilters(table, tableName, where)
					) as any;
				}
				query = query.returning(columns) as any;
				const result = await query;
				return remapToGraphQLArrayOutput(result, tableName, table);
			}),
		args: queryArgs,
	};
};

export const generateSchemaData = <
	TDrizzleInstance extends PgDatabase<any, any, any>,
	TSchema extends Record<string, Table | unknown>
>(
	db: TDrizzleInstance,
	schema: TSchema,
	relationsDepthLimit: number | undefined
): GeneratedEntities<TDrizzleInstance, TSchema> => {
	const schemaEntries = Object.entries(schema);
	const tableEntries = schemaEntries.filter(([_, value]) => is(value, PgTable)) as [
		string,
		PgTable
	][];
	if (!tableEntries.length) {
		throw new Error(
			"Drizzle-GraphQL Error: No tables detected in Drizzle-ORM's database instance. Did you forget to pass schema to drizzle constructor?"
		);
	}
	const tables = Object.fromEntries(tableEntries) as Record<string, PgTable>;

	const namedRelations = Object.fromEntries(
		schemaEntries
			.filter(([_, value]) => is(value, Relations))
			.map(([_, rel]) => {
				const tableName =
					tableEntries.find(
						([, tableValue]) =>
							tableValue === (rel as Relations).table
					)?.[0] || '';
				const config = (rel as Relations).config(
					createTableRelationsHelpers(tables[tableName]!)
				);
				const namedConfig = Object.fromEntries(
					Object.entries(config).map(([innerRelName, innerRelValue]) => {
						const targetTableName =
							tableEntries.find(
								([, tableValue]) =>
									tableValue === innerRelValue.referencedTable
							)?.[0] || '';
						return [
							innerRelName,
							{ relation: innerRelValue, targetTableName },
						];
					})
				);
				return [tableName, namedConfig];
			})
	);

	const queries: ThunkObjMap<GraphQLFieldConfig<any, any>> = {};
	const mutations: ThunkObjMap<GraphQLFieldConfig<any, any>> = {};
	const gqlSchemaTypes = Object.fromEntries(
		Object.entries(tables).map(([tableName, table]) => [
			tableName,
			generateTableTypes(
				tableName,
				tables,
				namedRelations,
				true,
				relationsDepthLimit
			),
		])
	);

	const inputs: Record<string, GraphQLInputObjectType> = {};
	const outputs: Record<string, GraphQLObjectType> = {};

	for (const [tableName, tableTypes] of Object.entries(gqlSchemaTypes)) {
		const {
			insertInput,
			updateInput,
			tableFilters,
			tableOrder,
		} = tableTypes.inputs;
		const {
			selectSingleOutput,
			selectArrOutput,
			singleTableItemOutput,
			arrTableItemOutput,
		} = tableTypes.outputs;

		const selectArrGenerated = generateSelectArray(
			db,
			tableName,
			tables,
			namedRelations,
			tableOrder,
			tableFilters
		);
		const selectSingleGenerated = generateSelectSingle(
			db,
			tableName,
			tables,
			namedRelations,
			tableOrder,
			tableFilters
		);
		const insertArrGenerated = generateInsertArray(
			db,
			tableName,
			schema[tableName] as PgTable,
			insertInput
		);
		const insertSingleGenerated = generateInsertSingle(
			db,
			tableName,
			schema[tableName] as PgTable,
			insertInput
		);
		const updateGenerated = generateUpdate(
			db,
			tableName,
			schema[tableName] as PgTable,
			updateInput,
			tableFilters
		);
		const deleteGenerated = generateDelete(
			db,
			tableName,
			schema[tableName] as PgTable,
			tableFilters
		);

		queries[selectArrGenerated.name] = {
			type: selectArrOutput,
			args: selectArrGenerated.args,
			resolve: selectArrGenerated.resolver,
		};
		queries[selectSingleGenerated.name] = {
			type: selectSingleOutput,
			args: selectSingleGenerated.args,
			resolve: selectSingleGenerated.resolver,
		};
		mutations[insertArrGenerated.name] = {
			type: arrTableItemOutput,
			args: insertArrGenerated.args,
			resolve: insertArrGenerated.resolver,
		};
		mutations[insertSingleGenerated.name] = {
			type: singleTableItemOutput,
			args: insertSingleGenerated.args,
			resolve: insertSingleGenerated.resolver,
		};
		mutations[updateGenerated.name] = {
			type: arrTableItemOutput,
			args: updateGenerated.args,
			resolve: updateGenerated.resolver,
		};
		mutations[deleteGenerated.name] = {
			type: arrTableItemOutput,
			args: deleteGenerated.args,
			resolve: deleteGenerated.resolver,
		};

		[insertInput, updateInput, tableFilters, tableOrder].forEach(
			(input) => (inputs[input.name] = input)
		);
		outputs[selectSingleOutput.name] = selectSingleOutput;
		outputs[singleTableItemOutput.name] = singleTableItemOutput;
	}

	return { queries, mutations, inputs, types: outputs } as any;
};

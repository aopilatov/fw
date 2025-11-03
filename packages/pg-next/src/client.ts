import { DateTime } from 'luxon';
import { PoolClient, QueryConfig, QueryConfigValues, QueryResult, QueryResultRow } from 'pg';
import QueryStream from 'pg-query-stream';

import { PgError } from './errors';
import { BaseModel } from './model';
import { KEYWORD_METADATA_TABLE } from './types';

export class PgClient {
	constructor(
		protected readonly client: PoolClient,
		protected readonly isSlave: boolean = false,
	) {}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public async query<R extends QueryResultRow = any, I = any[]>(
		queryTextOrConfig: string | QueryConfig<I>,
		values?: QueryConfigValues<I>,
	): Promise<QueryResult<R>> {
		return this.client.query(queryTextOrConfig, values);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public getQueryStream(queryText: string, values?: any[]): NodeJS.ReadableStream {
		const query = new QueryStream(queryText, values);
		return this.client.query(query);
	}

	public async insert(model: BaseModel): Promise<QueryResult> {
		if (this?.isSlave) {
			throw new PgError('Can not do insert in pg slave');
		}

		const table: string = Reflect.getMetadata(KEYWORD_METADATA_TABLE, model.constructor);
		const data = model.toSql();

		const query = `
			INSERT INTO "${table}" (${data.fields.join(', ')})
			VALUES (${data.placeholders.join(', ')})
			RETURNING *;
		`;

		return this.client.query(query, data.values);
	}

	public async insertMany(models: BaseModel[]): Promise<QueryResult> {
		if (this?.isSlave) {
			throw new PgError('Can not do insert in pg slave');
		}

		if (models.length === 0) {
			throw new Error('Cannot insert zero rows.');
		}

		const table: string = Reflect.getMetadata(KEYWORD_METADATA_TABLE, models[0].constructor);
		const data = BaseModel.manyToSql(models);

		const query = `
			INSERT INTO "${table}" (${data.fields.join(', ')})
			VALUES
			${data.placeholders.join(', ')}
			RETURNING *;
		`;

		return this.client.query(query, data.values);
	}

	public async partition(table: string, name: string, start: DateTime, end: DateTime): Promise<void> {
		if (this?.isSlave) {
			throw new PgError('Can not do insert in pg slave');
		}

		await this.query(
			`CREATE TABLE "${table}_${name}" PARTITION OF "${table}" FOR VALUES FROM ('${start.startOf('day').toSQL()}') TO ('${end.startOf('day').toSQL()}');`,
		);
	}
}

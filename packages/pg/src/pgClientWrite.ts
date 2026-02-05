import { DateTime } from 'luxon';
import { PoolClient, QueryConfig, QueryConfigValues, QueryResult, QueryResultRow } from 'pg';
import QueryStream from 'pg-query-stream';

import { Container } from '@fw/common';

import { PgModel } from './model';
import { Pg } from './pg';

export class PgWriteClient {
	protected client: PoolClient;

	constructor() {
		this.client = Container.getSystem(Pg).getPoolClient();
	}

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

	public async insertOne(model: PgModel, record: Record<string, unknown>): Promise<QueryResult> {
		const data = model.oneToSqlCreate(record);
		const returning: string[] = ['*'];

		for (const field of data.fields) {
			const metadata = model.getMetadata(field);
			if (!metadata) continue;

			if (metadata.type === 'GEOGRAPHY') {
				returning.push(`ST_AsGeoJSON("${field}")::JSON as fw_custom_${field}`);
			}
		}

		const query = `
			INSERT INTO "${model.table}" (${data.fields.map((item) => `"${item}"`).join(', ')})
			VALUES (${data.placeholders.join(', ')})
			RETURNING ${returning.join(', ')};
		`;

		return this.client.query(query, data.values);
	}

	public async insertMany(model: PgModel, records: Record<string, unknown>[]): Promise<QueryResult> {
		if (records.length === 0) {
			throw new Error('Cannot insert zero rows.');
		}

		const data = model.manyToSqlCreate(records);

		const modelPlaceholders: string[] = [];
		for (const rec of data.placeholders) {
			modelPlaceholders.push(rec.join(', '));
		}
		const placeholders = modelPlaceholders.map((item) => `(${item})`).join(', ');

		const query = `
			INSERT INTO "${model.table}" (${data.fields.map((item) => `"${item}"`).join(', ')})
			VALUES ${placeholders} RETURNING *;
		`;

		return this.client.query(query, data.values);
	}

	public async partition(table: string, name: string, start: DateTime, end: DateTime): Promise<void> {
		await this.query(
			`CREATE TABLE "${table}_${name}" PARTITION OF "${table}" FOR VALUES FROM ('${start.startOf('day').toFormat('yyyy-MM-dd')}') TO ('${end.startOf('day').toFormat('yyyy-MM-dd')}');`,
		);
	}
}

import { DateTime } from 'luxon';
import { PoolClient, QueryResult } from 'pg';

import { PgModel } from './model';
import { PgReadClient } from './pgClientRead';

export class PgWriteClient extends PgReadClient {
	constructor(protected readonly client: PoolClient) {
		super(client);
	}

	public async insertOne(model: PgModel, record: Record<string, unknown>): Promise<QueryResult> {
		const data = model.oneToSqlCreate(record);

		const query = `
			INSERT INTO "${model.table}" (${data.fields.map((item) => `"${item}"`).join(', ')})
			VALUES (${data.placeholders.join(', ')})
			RETURNING *;
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
			`CREATE TABLE "${table}_${name}" PARTITION OF "${table}" FOR VALUES FROM ('${start.startOf('day').toSQL()}') TO ('${end.startOf('day').toSQL()}');`,
		);
	}
}

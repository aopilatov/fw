import { DateTime } from 'luxon';
import { PoolClient, QueryResult } from 'pg';

import { PgModel } from './model';
import { PgReadClient } from './pgClientRead';

export class PgWriteClient extends PgReadClient {
	constructor(protected readonly client: PoolClient) {
		super(client);
	}

	public async insert(model: PgModel, record: object): Promise<QueryResult> {
		const data = model.oneToSql(record);

		const query = `
			INSERT INTO "${model.table}" (${data.fields.join(', ')})
			VALUES (${data.placeholders.join(', ')})
			RETURNING *;
		`;

		return this.client.query(query, data.values);
	}

	public async insertMany(model: PgModel, records: object[]): Promise<QueryResult> {
		if (records.length === 0) {
			throw new Error('Cannot insert zero rows.');
		}

		const data = model.manyToSql(records);

		const query = `
			INSERT INTO "${model.table}" (${data.fields.join(', ')})
			VALUES
			${data.placeholders.join(', ')}
			RETURNING *;
		`;

		return this.client.query(query, data.values);
	}

	public async partition(table: string, name: string, start: DateTime, end: DateTime): Promise<void> {
		await this.query(
			`CREATE TABLE "${table}_${name}" PARTITION OF "${table}" FOR VALUES FROM ('${start.startOf('day').toSQL()}') TO ('${end.startOf('day').toSQL()}');`,
		);
	}
}

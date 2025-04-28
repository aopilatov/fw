import { QueryResult, QueryResultRow } from 'pg';

import { PgClient, PgClientRead } from './client';

export class Repository {
	constructor(protected readonly pgClient: PgClient | PgClientRead) {}

	protected insert<T extends QueryResultRow>(table: string, data: object): Promise<QueryResult<T>> {
		const entries = Object.entries(data).filter(([, value]) => value !== undefined && value !== null);
		const fields = entries.map(([key]) => key);
		const values = entries.map(([, value]) => value);
		const placeholders = entries.map((_, index) => `$${index + 1}`);

		const query = `
			INSERT INTO "${table}" (${fields.map((field) => `"${field}"`).join(', ')})
			VALUES (${placeholders.join(', ')})
			RETURNING *;
  	`;

		return this.pgClient.query(query, values);
	}
}

import { PoolClient, QueryResult, QueryResultRow } from 'pg';

class PgClientBase {
	constructor(protected readonly client: PoolClient) {}

	public async query<R extends QueryResultRow = QueryResultRow, I extends unknown[] = unknown[]>(
		queryText: string,
		values?: I,
	): Promise<QueryResult<R>> {
		return this.client.query(queryText, values);
	}
}

export class PgClient extends PgClientBase {
	public async executeInTransaction<T>(func: () => Promise<T>): Promise<T> {
		try {
			await this.client.query('BEGIN');
			const result = await func();
			await this.client.query('COMMIT');
			return result;
		} catch (e: unknown) {
			await this.client.query('ROLLBACK');
			throw e;
		}
	}
}

export class PgClientRead extends PgClientBase {}

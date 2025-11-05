import { PoolClient, QueryConfig, QueryConfigValues, QueryResult, QueryResultRow } from 'pg';
import QueryStream from 'pg-query-stream';

export class PgReadClient {
	constructor(protected readonly client: PoolClient) {}

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
}

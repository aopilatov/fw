import { DateTime } from 'luxon';
import { PoolClient, QueryConfig, QueryConfigValues, QueryResult, QueryResultRow } from 'pg';
import QueryStream from 'pg-query-stream';
import { Service } from 'typedi';

@Service()
export class PgClientRead {
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

@Service()
export class PgClient extends PgClientRead {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public async insert<R extends QueryResultRow = any, D extends Record<string, any> = any>(
		table: string,
		data: D,
		types?: Partial<Record<keyof D, string>>,
	): Promise<QueryResult<R>> {
		const entries = Object.entries(data).filter(([, value]) => value !== undefined);

		const fields = entries.map(([key]) => `"${key}"`);
		const values = entries.map(([, value]) => {
			if (value instanceof DateTime) return value.toSQL();
			return value;
		});

		const placeholders = entries.map(([key, _], index) => {
			if (types && key in types) {
				return `$${index + 1}::${types[key]}`;
			}

			return `$${index + 1}`;
		});

		const query = `
			INSERT INTO "${table}" (${fields.join(', ')})
			VALUES (${placeholders.join(', ')})
			RETURNING *;
		`;

		return this.client.query(query, values);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public async insertMany<R extends QueryResultRow = any, D extends Record<string, any> = any>(
		table: string,
		rows: D[],
		types?: Partial<Record<keyof D, string>>,
	): Promise<QueryResult<R>> {
		if (rows.length === 0) {
			throw new Error('Cannot insert zero rows.');
		}

		const keys = Object.keys(rows[0]).filter((key) => rows[0][key] !== undefined);
		const fields = keys.map((key) => `"${key}"`);
		const values: unknown[] = [];

		const rowsPlaceholders = rows.map((row, rowIndex) => {
			return (
				'(' +
				keys
					.map((key, colIndex) => {
						const value = row[key];
						const transformed = value instanceof DateTime ? value.toSQL() : value;
						values.push(transformed);

						const paramIndex = rowIndex * keys.length + colIndex + 1;
						const typeCast = types && types[key] ? `::${types[key]}` : '';
						return `$${paramIndex}${typeCast}`;
					})
					.join(', ') +
				')'
			);
		});

		const query = `
			INSERT INTO "${table}" (${fields.join(', ')})
			VALUES
			${rowsPlaceholders.join(', ')}
			RETURNING *;
		`;

		return this.client.query(query, values);
	}

	public async partition(table: string, name: string, start: DateTime, end: DateTime): Promise<void> {
		await this.query(
			`CREATE TABLE "${table}_${name}" PARTITION OF "${table}" FOR VALUES FROM ('${start.startOf('day').toSQL()}') TO ('${end.startOf('day').toSQL()}');`,
		);
	}
}

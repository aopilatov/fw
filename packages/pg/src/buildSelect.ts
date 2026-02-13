import { QueryResult } from 'pg';

import { PgError } from './errors';
import { PgReadClient } from './pgClientRead';
import { PgWriteClient } from './pgClientWrite';
import { PgColumn } from './types';

type Select = string | [string, string];

export class BuildSelect {
	private readonly select: Select[] = [];
	private readonly where: string[] = [];
	private readonly orderBy: string[] = [];
	private limit?: number = undefined;
	private values?: unknown[] = undefined;

	constructor(
		private readonly table: string,
		private readonly metadata: Map<string, PgColumn>,
	) {}

	public addSelect(select: Select): this {
		if (typeof select === 'string' && select !== '*') {
			const metadata = this.metadata.get(select);
			if (!metadata) {
				throw new PgError(`${select} does not exist`);
			}
		}

		this.select.push(select);
		return this;
	}

	public addWhere(where: string): this {
		this.where.push(where);
		return this;
	}

	public addOrderBy(orderBy: string): this {
		this.orderBy.push(orderBy);
		return this;
	}

	public setLimit(limit: number): this {
		this.limit = limit;
		return this;
	}

	public setValues(values: unknown[]): this {
		this.values = values;
		return this;
	}

	public async execute(client: PgReadClient | PgWriteClient): Promise<QueryResult> {
		const selects = this.select.map((item) => {
			if (typeof item === 'string') {
				if (item === '*') return item;
				return `"${item}"`;
			}

			return `${item[0]} AS ${item[1]}`;
		});

		for (const key of Array.from(this.metadata.keys())) {
			const metadata = this.metadata.get(key)!;
			if (metadata.type === 'GEOGRAPHY' && (this.select.includes('*') || this.select.includes(key))) {
				selects.push(`ST_AsGeoJSON("${key}")::JSON as fw_custom_${key}`);
			}
		}

		let limit = '';
		if (this?.limit !== undefined) {
			limit = `LIMIT ${this.limit}`;
		}

		const query = `SELECT ${selects.join(', ')} FROM ${this.table} WHERE ${this.where.join(' AND ')} ORDER BY ${this.orderBy.join(', ')} ${limit};`;
		return await client.query(query, this.values);
	}
}

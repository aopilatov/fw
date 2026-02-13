import { QueryResult } from 'pg';

import { PgWriteClient } from './pgClientWrite';
import { PgColumn } from './types';

export class BuildUpdate {
	private readonly setters: string[] = [];
	private readonly where: string[] = [];
	private readonly select: string[] = [];
	private readonly values: unknown[] = [];

	constructor(
		private readonly table: string,
		private readonly metadata: Map<string, PgColumn>,
	) {}

	public addSelect(select: string): this {
		this.select.push(select);
		return this;
	}

	public addWhere(where: string, values?: unknown[]): this {
		this.where.push(where);
		if (values) {
			this.values.push(...values);
		}

		return this;
	}

	public addSetter(setter: string, values?: unknown[]): this {
		this.setters.push(setter);
		if (values) {
			this.values.push(...values);
		}

		return this;
	}

	public async execute(client: PgWriteClient): Promise<QueryResult> {
		for (const key of Array.from(this.metadata.keys())) {
			const metadata = this.metadata.get(key)!;
			if (metadata.type === 'GEOGRAPHY' && (this.select.includes('*') || this.select.includes(key))) {
				this.select.push(`ST_AsGeoJSON("${key}")::JSON as fw_custom_${key}`);
			}
		}

		const selects = this.select.map((item) => {
			return `"${item}"`;
		});

		// const query = `SELECT ${selects.join(', ')} FROM ${this.table} WHERE ${this.where.join(' AND ')} ORDER BY ${this.orderBy.join(', ')} ${limit};`;
		const query = `UPDATE "${this.table}" SET ${this.setters.join(', ')} WHERE ${this.where.join(' AND ')} RETURNING ${this.select.join(', ')};`;
		return await client.query(query, this.values);
	}
}

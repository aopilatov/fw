import { z } from 'zod';

import { Container } from '@fw/common';

import { PgBuilder } from './builder';
import { PgError } from './errors';
import { Pg } from './pg';
import { PgColumn, PgType } from './types';

export class PgModel<M extends z.ZodObject = z.ZodObject, C extends z.ZodObject = z.ZodObject> {
	constructor(
		public readonly table: string,
		private readonly metadata: Map<string, PgColumn>,
		private readonly model: M,
		private readonly creatable: C,
	) {
		Container.get(Pg).registerModel(this);
	}

	public static async register<M extends z.ZodObject, C extends z.ZodObject>(table: string, model: M, creatable: C) {
		const client = await Container.get(Pg).getClient();
		const tableMetadata = await client.query(
			`
				SELECT column_name, data_type, udt_name, is_nullable
				FROM information_schema.columns
				WHERE table_schema = 'public'
					AND table_name = $1
				ORDER BY ordinal_position;
			`,
			[table],
		);

		for (const column of Object.keys(model.shape)) {
			const columnFromRows = tableMetadata.rows.find((row) => row.column_name === column);
			if (!columnFromRows) {
				throw new PgError(`Column ${column} not found in table ${table}`);
			}
		}

		const metadata = new Map<string, PgColumn>();

		for (const row of tableMetadata.rows) {
			const columnFromModel = Object.keys(model.shape).find((item) => item === row.column_name);
			if (!columnFromModel) {
				throw new PgError(`Column ${row.column_name} not found in model`);
			}

			const fieldSchema = model.shape[row.column_name];
			const fieldType: PgType = row.udt_name.replace('_', '').toUpperCase();

			metadata.set(row.column_name, {
				name: row.column_name,
				type: fieldType,
				isNullable: row.is_nullable === 'YES',
				isArray: row.data_type === 'ARRAY',
				schema: fieldSchema,
			});
		}

		return new PgModel<M, C>(table, metadata, model, creatable);
	}

	public oneToSqlSave(record: z.infer<M>) {
		return this.oneToSql(record);
	}

	public oneToSqlCreate(record: z.infer<C>) {
		return this.oneToSql(record);
	}

	public manyToSqlCreate(records: z.infer<C>[]) {
		if (records.length === 0) {
			throw new Error('Cannot insert zero rows.');
		}

		const fields: string[] = [];
		const values: unknown[] = [];
		const placeholders: string[][] = records.map(() => []);

		const columns: string[] = Array.from(this.metadata.keys());
		let number = 0;

		for (const columnIndex in columns) {
			const column = columns[columnIndex];
			const columnMetadata = this.metadata.get(column);
			if (!columnMetadata) {
				throw new PgError(`${column}: Class does not have column metadata`);
			}

			fields.push(column);
		}

		for (const modelIndex in records) {
			const model = records[modelIndex];

			for (const columnIndex in columns) {
				const column = columns[columnIndex];
				const value = model[column];

				const columnMetadata = this.metadata.get(column);
				if (!columnMetadata) {
					throw new PgError(`${column}: Class does not have column metadata`);
				}

				if (value !== undefined) {
					placeholders[modelIndex].push(PgBuilder.getPlaceholder(number, columnMetadata));
					values.push(value);
					number++;
				} else {
					placeholders[modelIndex].push('DEFAULT');
				}
			}
		}

		return { fields, values, placeholders };
	}

	public oneFromSql(data: Record<string, unknown>): z.infer<M> {
		const record: Record<string, unknown> = {};

		for (const [key, value] of Object.entries(data)) {
			const columnMetadata = this.metadata.get(key);
			if (!columnMetadata) {
				throw new PgError(`${key}: Class does not have column metadata`);
			}

			switch (columnMetadata.type) {
				case 'BOOL':
				case 'BOOLEAN':
					record[key] = PgBuilder.getBoolean(key, value, columnMetadata);
					break;

				case 'CIDR':
				case 'INET':
					record[key] = PgBuilder.getString(key, value, columnMetadata);
					break;

				case 'UUID':
					record[key] = PgBuilder.getUuid(key, value, columnMetadata);
					break;

				case 'TEXT':
				case 'VARCHAR':
				case 'CHARACTER VARYING':
					record[key] = PgBuilder.getString(key, value, columnMetadata);
					break;

				case 'INT2':
				case 'SMALLINT':
				case 'SERIAL2':
				case 'SMALLSERIAL':
				case 'INT4':
				case 'INT':
				case 'INTEGER':
				case 'SERIAL4':
				case 'SERIAL':
					record[key] = PgBuilder.getInt(key, value, columnMetadata);
					break;

				case 'BIGINT':
				case 'INT8':
				case 'SERIAL8':
				case 'BIGSERIAL':
					record[key] = PgBuilder.getBigInt(key, value, columnMetadata);
					break;

				case 'FLOAT4':
				case 'REAL':
				case 'FLOAT8':
				case 'DOUBLE PRECISION':
				case 'NUMERIC':
				case 'DECIMAL':
					record[key] = PgBuilder.getFloat(key, value, columnMetadata);
					break;

				case 'JSONB':
					record[key] = PgBuilder.getJson(key, value, columnMetadata);
					break;

				case 'DATE':
				case 'TIME':
				case 'TIME WITHOUT TIME ZONE':
				case 'TIME WITH TIME ZONE':
				case 'TIMEZ':
				case 'TIMESTAMP':
				case 'TIMESTAMP WITHOUT TIME ZONE':
				case 'TIMESTAMP WITH TIME ZONE':
				case 'TIMESTAMPZ':
					record[key] = PgBuilder.getDate(key, value, columnMetadata);
					break;
			}
		}

		return record as z.infer<M>;
	}

	private oneToSql(record: object) {
		const fields: string[] = [];
		const values: unknown[] = [];
		const placeholders: string[] = [];

		const columns: string[] = Array.from(this.metadata.keys());
		let number = 0;
		for (const index in columns) {
			const column = columns[index];
			const columnMetadata = this.metadata.get(column);
			if (!columnMetadata) {
				throw new PgError(`${column}: Class does not have column metadata`);
			}

			if (record[column] !== undefined) {
				const value = record[column];

				fields.push(column);
				values.push(value);
				placeholders.push(PgBuilder.getPlaceholder(number, columnMetadata));
				number++;
			}
		}

		return { fields, values, placeholders };
	}
}

import { isUUID } from 'class-validator';
import { DateTime } from 'luxon';

import { PgError } from './errors';
import { KEYWORD_METADATA_COLUMNS, PgColumn } from './types';

import type { UUID } from 'node:crypto';

export class BaseModel {
	public fromSql(data: Record<string, unknown>) {
		const columnsMetadata = Reflect.getMetadata(KEYWORD_METADATA_COLUMNS, this.constructor) as Map<string, PgColumn>;
		if (!columnsMetadata) {
			throw new PgError('Class does not have columns metadata');
		}

		for (const [key, value] of Object.entries(data)) {
			const columnMetadata = columnsMetadata.get(key);
			if (!columnMetadata) {
				throw new PgError(`${key}: Class does not have column metadata`);
			}

			switch (columnMetadata.type) {
				case 'BOOL':
				case 'BOOLEAN':
					this[key] = BaseModel.getBoolean(key, value, columnMetadata);
					break;

				case 'CIDR':
				case 'INET':
					this[key] = BaseModel.getString(key, value, columnMetadata);
					break;

				case 'UUID':
					this[key] = BaseModel.getUuid(key, value, columnMetadata);
					break;

				case 'TEXT':
				case 'VARCHAR':
				case 'CHARACTER VARYING':
					this[key] = BaseModel.getString(key, value, columnMetadata);
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
					this[key] = BaseModel.getInt(key, value, columnMetadata);
					break;

				case 'BIGINT':
				case 'INT8':
				case 'SERIAL8':
				case 'BIGSERIAL':
					this[key] = BaseModel.getBigInt(key, value, columnMetadata);
					break;

				case 'FLOAT4':
				case 'REAL':
				case 'FLOAT8':
				case 'DOUBLE PRECISION':
				case 'NUMERIC':
				case 'DECIMAL':
					this[key] = BaseModel.getFloat(key, value, columnMetadata);
					break;

				case 'JSONB':
					this[key] = BaseModel.getJson(key, value, columnMetadata);
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
					this[key] = BaseModel.getDate(key, value, columnMetadata);
					break;
			}
		}
	}

	public toSql() {
		const fields: string[] = [];
		const values: unknown[] = [];
		const placeholders: string[] = [];

		const columnsMetadata = Reflect.getMetadata(KEYWORD_METADATA_COLUMNS, this.constructor) as Map<string, PgColumn>;
		if (!columnsMetadata) {
			throw new PgError('Class does not have columns metadata');
		}

		const columns: string[] = Array.from(columnsMetadata.keys());
		for (const index in columns) {
			const column = columns[index];
			const columnMetadata = columnsMetadata.get(column);
			if (!columnMetadata) {
				throw new PgError(`${column}: Class does not have column metadata`);
			}

			if (this[column] !== undefined) {
				let value = this[column];
				if (value instanceof DateTime) {
					value = value.toSQL();
				}

				fields.push(column);
				values.push(value);
				placeholders.push(BaseModel.getPlaceholder(Number(index), columnMetadata));
			}
		}

		return { fields, values, placeholders };
	}

	public static manyToSql<T extends BaseModel>(models: T[]) {
		if (models.length === 0) {
			throw new Error('Cannot insert zero rows.');
		}

		const fields: string[] = [];
		const values: unknown[][] = models.map(() => [] as unknown[]);
		const placeholders: string[] = [];

		const columnsMetadata = Reflect.getMetadata(KEYWORD_METADATA_COLUMNS, models[0].constructor) as Map<string, PgColumn>;
		if (!columnsMetadata) {
			throw new PgError('Class does not have columns metadata');
		}

		const columns: string[] = Array.from(columnsMetadata.keys());
		for (const index in columns) {
			const column = columns[index];
			const columnMetadata = columnsMetadata.get(column);
			if (!columnMetadata) {
				throw new PgError(`${column}: Class does not have column metadata`);
			}

			fields.push(column);
			placeholders.push(BaseModel.getPlaceholder(Number(index), columnMetadata));

			for (const modelIndex in models) {
				const model = models[modelIndex];

				let value = model[column];
				if (value instanceof DateTime) {
					value = value.toSQL();
				}

				values[Number(modelIndex)].push(value);
			}
		}

		return { fields, values, placeholders };
	}

	private static getBoolean(key: string, value: unknown, columnMetadata: PgColumn) {
		const isNull = this.throwIfNullable(key, value, columnMetadata);
		if (isNull) return null;

		const getValue = (item: unknown) => (typeof item === 'boolean' ? item : String(item).toLowerCase().trim() === 'true');
		return BaseModel.getValue(key, value, columnMetadata, getValue);
	}

	private static getString(key: string, value: unknown, columnMetadata: PgColumn) {
		const isNull = this.throwIfNullable(key, value, columnMetadata);
		if (isNull) return null;
		const getValue = (item: unknown) => String(item);
		return BaseModel.getValue(key, value, columnMetadata, getValue);
	}

	private static getUuid(key: string, value: unknown, columnMetadata: PgColumn) {
		const isNull = this.throwIfNullable(key, value, columnMetadata);
		if (isNull) return null;

		const getValue = (item: unknown) => {
			if (isUUID(item)) {
				return item as UUID;
			}

			throw new PgError(`${key}: Value is not UUID`);
		};

		return BaseModel.getValue(key, value, columnMetadata, getValue);
	}

	private static getInt(key: string, value: unknown, columnMetadata: PgColumn) {
		const isNull = this.throwIfNullable(key, value, columnMetadata);
		if (isNull) return null;

		const getValue = (item: unknown) => parseInt(String(item));
		return BaseModel.getValue(key, value, columnMetadata, getValue);
	}

	private static getBigInt(key: string, value: unknown, columnMetadata: PgColumn) {
		const isNull = this.throwIfNullable(key, value, columnMetadata);
		if (isNull) return null;

		const getValue = (item: unknown) => String(item);
		return BaseModel.getValue(key, value, columnMetadata, getValue);
	}

	private static getFloat(key: string, value: unknown, columnMetadata: PgColumn) {
		const isNull = this.throwIfNullable(key, value, columnMetadata);
		if (isNull) return null;

		const getValue = (item: unknown) => parseFloat(String(item));
		return BaseModel.getValue(key, value, columnMetadata, getValue);
	}

	private static getJson(key: string, value: unknown, columnMetadata: PgColumn) {
		const isNull = this.throwIfNullable(key, value, columnMetadata);
		if (isNull) return null;

		const getValue = (item: unknown) => (typeof item === 'string' ? JSON.parse(item) : item);
		return BaseModel.getValue(key, value, columnMetadata, getValue);
	}

	private static getDate(key: string, value: unknown, columnMetadata: PgColumn) {
		const isNull = this.throwIfNullable(key, value, columnMetadata);
		if (isNull) return null;

		const getValue = (item: unknown) => (typeof item === 'string' ? DateTime.fromSQL(item) : DateTime.fromJSDate(item as Date));
		return BaseModel.getValue(key, value, columnMetadata, getValue);
	}

	private static throwIfNullable(key: string, value: unknown, columnMetadata: PgColumn): boolean | never {
		if (value === null) {
			if (columnMetadata?.isNullable) return true;
			throw new PgError(`${key}: Column is not nullable`);
		}

		return false;
	}

	private static getValue<Type>(
		key: string,
		value: unknown,
		columnMetadata: PgColumn,
		getValue: (item: unknown) => Type,
	): never | Type | Type[] {
		if (Array.isArray(value)) {
			if (columnMetadata?.isArray) {
				return value.map((item) => getValue(item));
			}

			throw new PgError(`${key}: Column is not array`);
		} else {
			return getValue(value);
		}
	}

	private static getPlaceholder(index: number, columnMetadata: PgColumn): string {
		if (columnMetadata?.isArray) {
			return `$${index + 1}::${columnMetadata.type}[]`;
		}

		switch (columnMetadata.type) {
			case 'INET':
				return `$${index + 1}::INET`;
			case 'CIDR':
				return `$${index + 1}::CIDR`;
			default:
				return `$${index + 1}`;
		}
	}
}

import { isUUID } from 'class-validator';
import { DateTime } from 'luxon';

import { Constructable, Container } from '@fw/common';

import { PgError } from './errors';
import { Pg } from './pg';
import { KEYWORD_METADATA_TABLE, KEYWORD_METADATA_COLUMNS, PgColumn } from './types';

import type { UUID } from 'node:crypto';

export function Column(config: PgColumn) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return (target: any, propertyName: string | symbol): void => {
		const map = Reflect.hasMetadata(KEYWORD_METADATA_COLUMNS, target.constructor)
			? (Reflect.getMetadata(KEYWORD_METADATA_COLUMNS, target.constructor) as Map<string, PgColumn>)
			: new Map<string, PgColumn>();

		map.set(propertyName.toString(), config);
		Reflect.defineMetadata(KEYWORD_METADATA_COLUMNS, map, target.constructor);
	};
}

export function Model(tableName: string) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return (target: any) => {
		Reflect.defineMetadata(KEYWORD_METADATA_TABLE, tableName, target);
		return target;
	};
}

export class PgModel<C = unknown, M = unknown> {
	public readonly table: string;
	private readonly columns: Map<string, PgColumn> = new Map();

	constructor(private readonly modelClass: Constructable<M>) {
		const modelTable = Reflect.getMetadata(KEYWORD_METADATA_TABLE, modelClass);
		if (!modelClass) {
			throw new PgError(`Table in model ${modelTable} not found`);
		}

		this.table = modelTable;

		const columnsMetadata = Reflect.getMetadata(KEYWORD_METADATA_COLUMNS, this.constructor) as Map<string, PgColumn>;
		if (!columnsMetadata) {
			throw new PgError('Class does not have columns metadata');
		}

		this.columns = columnsMetadata;

		Container.get(Pg).registerModel(this);
	}

	public oneToSql(record: C | M) {
		const fields: string[] = [];
		const values: unknown[] = [];
		const placeholders: string[] = [];

		const columns: string[] = Array.from(this.columns.keys());
		for (const index in columns) {
			const column = columns[index];
			const columnMetadata = this.columns.get(column);
			if (!columnMetadata) {
				throw new PgError(`${column}: Class does not have column metadata`);
			}

			if (record[column] !== undefined) {
				let value = record[column];
				if (value instanceof DateTime) {
					value = value.toSQL();
				}

				fields.push(column);
				values.push(value);
				placeholders.push(PgModel.getPlaceholder(Number(index), columnMetadata));
			}
		}

		return { fields, values, placeholders };
	}

	public manyToSql(records: (C | M)[]) {
		if (records.length === 0) {
			throw new Error('Cannot insert zero rows.');
		}

		const fields: string[] = [];
		const values: unknown[][] = records.map(() => [] as unknown[]);
		const placeholders: string[] = [];

		const columns: string[] = Array.from(this.columns.keys());
		for (const index in columns) {
			const column = columns[index];
			const columnMetadata = this.columns.get(column);
			if (!columnMetadata) {
				throw new PgError(`${column}: Class does not have column metadata`);
			}

			fields.push(column);
			placeholders.push(PgModel.getPlaceholder(Number(index), columnMetadata));

			for (const modelIndex in records) {
				const model = records[modelIndex];

				let value = model[column];
				if (value instanceof DateTime) {
					value = value.toSQL();
				}

				values[Number(modelIndex)].push(value);
			}
		}

		return { fields, values, placeholders };
	}

	public oneFromSql(data: Record<string, unknown>): M {
		const record = new this.modelClass();

		for (const [key, value] of Object.entries(data)) {
			const columnMetadata = this.columns.get(key);
			if (!columnMetadata) {
				throw new PgError(`${key}: Class does not have column metadata`);
			}

			switch (columnMetadata.type) {
				case 'BOOL':
				case 'BOOLEAN':
					this[key] = PgModel.getBoolean(key, value, columnMetadata);
					break;

				case 'CIDR':
				case 'INET':
					this[key] = PgModel.getString(key, value, columnMetadata);
					break;

				case 'UUID':
					this[key] = PgModel.getUuid(key, value, columnMetadata);
					break;

				case 'TEXT':
				case 'VARCHAR':
				case 'CHARACTER VARYING':
					this[key] = PgModel.getString(key, value, columnMetadata);
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
					this[key] = PgModel.getInt(key, value, columnMetadata);
					break;

				case 'BIGINT':
				case 'INT8':
				case 'SERIAL8':
				case 'BIGSERIAL':
					this[key] = PgModel.getBigInt(key, value, columnMetadata);
					break;

				case 'FLOAT4':
				case 'REAL':
				case 'FLOAT8':
				case 'DOUBLE PRECISION':
				case 'NUMERIC':
				case 'DECIMAL':
					this[key] = PgModel.getFloat(key, value, columnMetadata);
					break;

				case 'JSONB':
					this[key] = PgModel.getJson(key, value, columnMetadata);
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
					this[key] = PgModel.getDate(key, value, columnMetadata);
					break;
			}
		}

		return record;
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

	private static getBoolean(key: string, value: unknown, columnMetadata: PgColumn) {
		const isNull = this.throwIfNullable(key, value, columnMetadata);
		if (isNull) return null;

		const getValue = (item: unknown) => (typeof item === 'boolean' ? item : String(item).toLowerCase().trim() === 'true');
		return PgModel.getValue(key, value, columnMetadata, getValue);
	}

	private static getString(key: string, value: unknown, columnMetadata: PgColumn) {
		const isNull = this.throwIfNullable(key, value, columnMetadata);
		if (isNull) return null;
		const getValue = (item: unknown) => String(item);
		return PgModel.getValue(key, value, columnMetadata, getValue);
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

		return PgModel.getValue(key, value, columnMetadata, getValue);
	}

	private static getInt(key: string, value: unknown, columnMetadata: PgColumn) {
		const isNull = this.throwIfNullable(key, value, columnMetadata);
		if (isNull) return null;

		const getValue = (item: unknown) => parseInt(String(item));
		return PgModel.getValue(key, value, columnMetadata, getValue);
	}

	private static getBigInt(key: string, value: unknown, columnMetadata: PgColumn) {
		const isNull = this.throwIfNullable(key, value, columnMetadata);
		if (isNull) return null;

		const getValue = (item: unknown) => String(item);
		return PgModel.getValue(key, value, columnMetadata, getValue);
	}

	private static getFloat(key: string, value: unknown, columnMetadata: PgColumn) {
		const isNull = this.throwIfNullable(key, value, columnMetadata);
		if (isNull) return null;

		const getValue = (item: unknown) => parseFloat(String(item));
		return PgModel.getValue(key, value, columnMetadata, getValue);
	}

	private static getJson(key: string, value: unknown, columnMetadata: PgColumn) {
		const isNull = this.throwIfNullable(key, value, columnMetadata);
		if (isNull) return null;

		const getValue = (item: unknown) => (typeof item === 'string' ? JSON.parse(item) : item);
		return PgModel.getValue(key, value, columnMetadata, getValue);
	}

	private static getDate(key: string, value: unknown, columnMetadata: PgColumn) {
		const isNull = this.throwIfNullable(key, value, columnMetadata);
		if (isNull) return null;

		const getValue = (item: unknown) => (typeof item === 'string' ? DateTime.fromSQL(item) : DateTime.fromJSDate(item as Date));
		return PgModel.getValue(key, value, columnMetadata, getValue);
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

	private static throwIfNullable(key: string, value: unknown, columnMetadata: PgColumn): boolean | never {
		if (value === null) {
			if (columnMetadata?.isNullable) return true;
			throw new PgError(`${key}: Column is not nullable`);
		}

		return false;
	}
}

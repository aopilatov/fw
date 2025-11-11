import { UUID } from 'node:crypto';

import { isUUID } from 'class-validator';
import { DateTime } from 'luxon';

import { PgError } from './errors';
import { PgColumn, PgWhere } from './types';

export class PgBuilder {
	public static getPlaceholder(index: number, columnMetadata: PgColumn): string {
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

	public static getBoolean(key: string, value: unknown, columnMetadata: PgColumn) {
		const isNull = this.throwIfNullable(key, value, columnMetadata);
		if (isNull) return null;

		const getValue = (item: unknown) => (typeof item === 'boolean' ? item : String(item).toLowerCase().trim() === 'true');
		return PgBuilder.getValue(key, value, columnMetadata, getValue);
	}

	public static getString(key: string, value: unknown, columnMetadata: PgColumn) {
		const isNull = this.throwIfNullable(key, value, columnMetadata);
		if (isNull) return null;
		const getValue = (item: unknown) => String(item);
		return PgBuilder.getValue(key, value, columnMetadata, getValue);
	}

	public static getUuid(key: string, value: unknown, columnMetadata: PgColumn) {
		const isNull = this.throwIfNullable(key, value, columnMetadata);
		if (isNull) return null;

		const getValue = (item: unknown) => {
			if (isUUID(item)) {
				return item as UUID;
			}

			throw new PgError(`${key}: Value is not UUID`);
		};

		return PgBuilder.getValue(key, value, columnMetadata, getValue);
	}

	public static getInt(key: string, value: unknown, columnMetadata: PgColumn) {
		const isNull = this.throwIfNullable(key, value, columnMetadata);
		if (isNull) return null;

		const getValue = (item: unknown) => parseInt(String(item));
		return PgBuilder.getValue(key, value, columnMetadata, getValue);
	}

	public static getBigInt(key: string, value: unknown, columnMetadata: PgColumn) {
		const isNull = this.throwIfNullable(key, value, columnMetadata);
		if (isNull) return null;

		const getValue = (item: unknown) => String(item);
		return PgBuilder.getValue(key, value, columnMetadata, getValue);
	}

	public static getFloat(key: string, value: unknown, columnMetadata: PgColumn) {
		const isNull = this.throwIfNullable(key, value, columnMetadata);
		if (isNull) return null;

		const getValue = (item: unknown) => parseFloat(String(item));
		return PgBuilder.getValue(key, value, columnMetadata, getValue);
	}

	public static getJson(key: string, value: unknown, columnMetadata: PgColumn) {
		const isNull = this.throwIfNullable(key, value, columnMetadata);
		if (isNull) return null;

		const getValue = (item: unknown) => (typeof item === 'string' ? JSON.parse(item) : item);
		return PgBuilder.getValue(key, value, columnMetadata, getValue);
	}

	public static getDate(key: string, value: unknown, columnMetadata: PgColumn) {
		const isNull = this.throwIfNullable(key, value, columnMetadata);
		if (isNull) return null;

		const getValue = (item: unknown) => (typeof item === 'string' ? DateTime.fromSQL(item) : DateTime.fromJSDate(item as Date));
		return PgBuilder.getValue(key, value, columnMetadata, getValue);
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

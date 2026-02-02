import { UUID } from 'node:crypto';

import { isUUID } from 'class-validator';
import { DateTime } from 'luxon';
import { Geometry } from 'wkx-ts';

import { PgError } from './errors';
import { PgColumn, PgWhere } from './types';

export class PgBuilder {
	public static getPlaceholder(index: number | number[], columnMetadata: PgColumn, withAny?: boolean): string {
		if (!Array.isArray(index)) {
			if (columnMetadata?.isArray) {
				if (withAny) {
					return `ANY($${index + 1})`;
				}

				return `$${index + 1}::${columnMetadata.type}[]`;
			}

			switch (columnMetadata.type) {
				case 'INET':
					return `$${index + 1}::INET`;
				case 'CIDR':
					return `$${index + 1}::CIDR`;
				case 'GEOGRAPHY':
					return `ST_MakePoint($2, $3)::GEOGRAPHY`;
				default:
					return `$${index + 1}`;
			}
		} else {
			if (columnMetadata.type === 'GEOGRAPHY') {
				return `ST_MakePoint($${index[0] + 1}, $${index[1] + 1})::GEOGRAPHY`;
			}

			throw new PgError('Supported by types: [GEOGRAPHY]');
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

		const getValue = (item: unknown) => BigInt(String(item));
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

	public static getCoordinates(key: string, value: unknown, columnMetadata: PgColumn) {
		const isNull = this.throwIfNullable(key, value, columnMetadata);
		if (isNull) return null;

		const getValue = (item: unknown) => (typeof item === 'string' ? Geometry.parse(Buffer.from(item, 'hex').toString()).toGeoJSON() : item);
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

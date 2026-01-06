import { z } from 'zod';

import { Container } from '@fw/common';

import { PgBuilder } from './builder';
import { PgError } from './errors';
import { Pg } from './pg';
import { PG_CONDITION, PgColumn, PgType, PgWhere } from './types';

export class PgView {
	constructor(
		public readonly name: string,
		public readonly metadata: Map<string, PgColumn>,
	) {
		Container.getSystem(Pg).registerView(this);
	}

	public static async register(name: string) {
		const client = Container.getSystem(Pg).getMasterClient();
		const tableMetadata = await client.query(
			`
				SELECT column_name, data_type, udt_name, is_nullable
				FROM information_schema.columns
				WHERE table_schema = 'public'
					AND table_name = $1
				ORDER BY ordinal_position;
			`,
			[name],
		);

		const metadata = new Map<string, PgColumn>();

		for (const row of tableMetadata.rows) {
			const fieldType: PgType = row.data_type === 'USER-DEFINED' ? row.udt_name : row.udt_name.replace('_', '').toUpperCase();
			let fieldSchema!: z.ZodType;

			switch (fieldType) {
				case 'BOOL':
				case 'BOOLEAN':
					fieldSchema = z.boolean();
					break;

				case 'CIDR':
				case 'INET':
					fieldSchema = z.union([z.ipv4(), z.ipv6()]);
					break;

				case 'UUID':
					fieldSchema = z.uuid();
					break;

				case 'TEXT':
				case 'VARCHAR':
				case 'CHARACTER VARYING':
					fieldSchema = z.string();
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
					fieldSchema = z.int();
					break;

				case 'BIGINT':
				case 'INT8':
				case 'SERIAL8':
				case 'BIGSERIAL':
					fieldSchema = z.bigint();
					break;

				case 'FLOAT4':
				case 'REAL':
				case 'FLOAT8':
				case 'DOUBLE PRECISION':
				case 'NUMERIC':
				case 'DECIMAL':
					fieldSchema = z.number();
					break;

				case 'JSONB':
					fieldSchema = z.json();
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
					fieldSchema = z.coerce.date();
					break;

				default:
					fieldSchema = z.string();
			}

			const isNullable = row.is_nullable === 'YES';
			if (isNullable) {
				fieldSchema = fieldSchema.nullable();
			}

			const isArray = row.data_type === 'ARRAY';
			if (isArray) {
				fieldSchema = z.array(fieldSchema);
			}

			metadata.set(row.column_name, {
				name: row.column_name,
				type: fieldType,
				isNullable,
				isArray,
				schema: fieldSchema,
			});
		}

		return new PgView(name, metadata);
	}

	public async toSql(where: PgWhere, orderBy?: Record<string, 'ASC' | 'DESC'>) {
		const values: unknown[] = [];
		const conditions: string[] = [];
		const orders: string[] = [];

		for (const [key, value] of Object.entries(where)) {
			const metadata = this.metadata.get(key);
			if (!metadata) {
				throw new PgError(`${key}: Class does not have column metadata`);
			}

			const validations: z.ZodSafeParseResult<unknown>[] = [];
			if (typeof value === 'object' && value && 'value' in value) {
				if (!metadata.isArray && [PG_CONDITION.IN, PG_CONDITION.NOT_IN, PG_CONDITION.BETWEEN].includes(value.condition)) {
					for (const item of value.value as unknown[]) {
						validations.push(metadata.schema.safeParse(item));
					}
				} else {
					validations.push(metadata.schema.safeParse(value.value));
				}
			} else {
				validations.push(metadata.schema.safeParse(value));
			}

			if (validations.some((item) => !item.success)) {
				throw new PgError(`${key}: validation failed`);
			}
		}

		if (orderBy) {
			for (const [key, value] of Object.entries(orderBy)) {
				const metadata = this.metadata.get(key);
				if (!metadata) {
					throw new PgError(`${key}: Class does not have column metadata`);
				}
			}
		}

		let number = 0;
		for (const [key, value] of Object.entries(where)) {
			const metadata = this.metadata.get(key);
			if (!metadata) {
				throw new PgError(`${key}: Class does not have column metadata`);
			}

			const placeholder = PgBuilder.getPlaceholder(number, metadata);

			if (typeof value === 'object') {
				if (!value?.condition) {
					throw new PgError(`${key}: Value does not have column condition`);
				}

				switch (value.condition) {
					case PG_CONDITION.NULL:
						conditions.push(`"${key}" IS NULL`);
						break;

					case PG_CONDITION.NOT_NULL:
						conditions.push(`"${key}" IS NOT NULL`);
						break;

					case PG_CONDITION.EQUAL:
						conditions.push(`"${key}" = ${placeholder}`);
						values.push(value.value);
						number++;
						break;

					case PG_CONDITION.NOT_EQUAL:
						conditions.push(`"${key}" != ${placeholder}`);
						values.push(value.value);
						number++;
						break;

					case PG_CONDITION.GREATER_THAN:
						conditions.push(`"${key}" > ${placeholder}`);
						values.push(value.value);
						number++;
						break;

					case PG_CONDITION.GREATER_THAN_OR_EQUAL:
						conditions.push(`"${key}" >= ${placeholder}`);
						values.push(value.value);
						number++;
						break;

					case PG_CONDITION.LESS_THAN:
						conditions.push(`"${key}" < ${placeholder}`);
						values.push(value.value);
						number++;
						break;

					case PG_CONDITION.LESS_THAN_OR_EQUAL:
						conditions.push(`"${key}" <= ${placeholder}`);
						values.push(value.value);
						number++;
						break;

					case PG_CONDITION.IN:
						conditions.push(`"${key}" = ANY(${placeholder})`);
						values.push(value.value);
						number++;
						break;

					case PG_CONDITION.NOT_IN:
						conditions.push(`"${key}" != ALL(${placeholder})`);
						values.push(value.value);
						number++;
						break;

					case PG_CONDITION.BETWEEN: {
						values.push(value.value[0]);
						number++;

						const placeholder2 = PgBuilder.getPlaceholder(number, metadata);
						values.push(value.value[1]);

						conditions.push(`"${key}" BETWEEN ${placeholder} AND ${placeholder2}`);

						number++;
						break;
					}
				}
			} else {
				conditions.push(`"${key}" = ${placeholder}`);
				values.push(value);
				number++;
			}
		}

		if (orderBy) {
			for (const [key, value] of Object.entries(orderBy)) {
				orders.push(`"${key}" ${value}`);
			}
		}

		return { conditions, values, orders };
	}
}

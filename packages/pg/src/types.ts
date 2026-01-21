import { PoolConfig } from 'pg';
import { z } from 'zod';

export type PgType =
	| 'BOOLEAN'
	| 'BOOL'
	| 'CIDR'
	| 'INET'
	| 'UUID'
	| 'TEXT'
	| 'VARCHAR'
	| 'CHARACTER VARYING'
	| 'INT2'
	| 'SMALLINT'
	| 'SERIAL2'
	| 'SMALLSERIAL'
	| 'INT4'
	| 'INT'
	| 'INTEGER'
	| 'SERIAL4'
	| 'SERIAL'
	| 'INT8'
	| 'BIGINT'
	| 'SERIAL8'
	| 'BIGSERIAL'
	| 'FLOAT4'
	| 'REAL'
	| 'FLOAT8'
	| 'DOUBLE PRECISION'
	| 'NUMERIC'
	| 'DECIMAL'
	| 'DATE'
	| 'TIME'
	| 'TIME WITHOUT TIME ZONE'
	| 'TIME WITH TIME ZONE'
	| 'TIMEZ'
	| 'TIMESTAMP'
	| 'TIMESTAMP WITHOUT TIME ZONE'
	| 'TIMESTAMP WITH TIME ZONE'
	| 'TIMESTAMPZ'
	| 'JSONB';

export type PgColumn = {
	name: string;
	type: PgType | string;
	isNullable?: boolean;
	isArray?: boolean;
	schema: z.ZodType | z.ZodString | z.ZodNumber | z.ZodBoolean | z.ZodUnknown;
};

export interface PgConfig extends PoolConfig {
	alloyDb?: {
		key: string;
	};
}

export enum PG_CONDITION {
	NULL = 'IS NULL',
	NOT_NULL = 'IS NOT NULL',
	EQUAL = '=',
	NOT_EQUAL = '!=',
	GREATER_THAN = '>',
	GREATER_THAN_OR_EQUAL = '>=',
	LESS_THAN = '<',
	LESS_THAN_OR_EQUAL = '<=',
	IN = 'IN',
	NOT_IN = 'NOT IN',
	BETWEEN = 'BETWEEN',
	CONTAINS = 'CONTAINS',
}

type PgWhereType = string | number | boolean | null;

type PgWhereCondition =
	| {
			condition:
				| PG_CONDITION.EQUAL
				| PG_CONDITION.NOT_EQUAL
				| PG_CONDITION.GREATER_THAN
				| PG_CONDITION.GREATER_THAN_OR_EQUAL
				| PG_CONDITION.LESS_THAN
				| PG_CONDITION.LESS_THAN_OR_EQUAL
				| PG_CONDITION.CONTAINS;
			value: PgWhereType;
	  }
	| {
			condition: PG_CONDITION.NULL | PG_CONDITION.NOT_NULL;
	  }
	| {
			condition: PG_CONDITION.IN | PG_CONDITION.NOT_IN;
			value: PgWhereType[];
	  }
	| {
			condition: PG_CONDITION.BETWEEN;
			value: [PgWhereType, PgWhereType];
	  };

export type PgWhere = {
	[key: string]: PgWhereType | PgWhereCondition;
};

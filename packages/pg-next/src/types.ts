import { PoolConfig } from 'pg';

export const KEYWORD_METADATA_TABLE = 'table';
export const KEYWORD_METADATA_COLUMNS = 'columns';
export const KEYWORD_METADATA_WITH_HISTORY = 'withHistory';
export const KEYWORD_METADATA_WITH_READ = 'withRead';

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
	type: PgType;
	isNullable?: boolean;
	isArray?: boolean;
	isPrimaryKey?: boolean;
};

export interface PgConfig extends PoolConfig {
	isAlloyDb?: boolean;
}

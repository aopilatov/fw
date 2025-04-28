export interface RedisServerConfig {
	isCluster: false;
	url?: string;
	username?: string;
	password?: string;
}

export interface RedisClusterConfig {
	isCluster: true;
	nodes: RedisServerConfig[];
}

export type RedisConfig = RedisServerConfig | RedisClusterConfig;

export type RedisMode = 'NX' | 'XX' | 'GT' | 'LT';

export type RedisArgument = Buffer | string;

export type RedisOptionsNx = {
	NX?: true;
};

export type RedisOptionsXx = {
	XX?: true;
};

export type RedisOptionsLt = {
	LT?: true;
};

export type RedisOptionsGt = {
	GT?: true;
};

export type RedisOptionsCh = {
	CH?: true;
};

export type RedisOptionsIncr = {
	INCR?: true;
};

export type RedisHSETObject = Record<string | number, RedisArgument | number>;

export type RedisHSETMap = Map<RedisArgument | number, RedisArgument | number>;

export type RedisHSETTuples = Array<[RedisArgument | number, RedisArgument | number]> | Array<RedisArgument | number>;

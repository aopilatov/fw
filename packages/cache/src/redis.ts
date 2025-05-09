import { omit } from 'es-toolkit';
import { createCluster, createClient, RedisClientType, RedisClusterType, SetOptions } from 'redis';
import { Service } from 'typedi';

import {
	RedisConfig,
	RedisServerConfig,
	RedisClusterConfig,
	RedisMode,
	RedisArgument,
	RedisOptionsNx,
	RedisOptionsXx,
	RedisOptionsLt,
	RedisOptionsGt,
	RedisOptionsCh,
	RedisOptionsIncr,
	RedisHSETObject,
	RedisHSETMap,
	RedisHSETTuples,
} from './types';

@Service()
export class Redis {
	private client!: RedisClientType | RedisClusterType;

	public async init(options: RedisConfig, logError: (...params: unknown[]) => void): Promise<void> {
		if (this.client) return;

		const isCluster = options.isCluster;
		const config = omit(options, ['isCluster']);

		if (!isCluster) {
			this.client = createClient(config as RedisServerConfig);
		} else {
			this.client = createCluster({
				rootNodes: (config as RedisClusterConfig).nodes!.map((item) => omit(item, ['isCluster'])),
				defaults: { socket: { reconnectStrategy: (retries) => Math.min(retries * 50, 2000) } },
				useReplicas: true,
			});
		}

		this.client.on('error', (error: unknown) => logError('redis error', error));
		await this.client.connect();
	}

	public async destroy(): Promise<void> {
		if (!this.client) return;
		await this.client.disconnect();
	}

	public async set(key: RedisArgument, value: RedisArgument | number, options?: SetOptions): Promise<string | null> {
		return this.client.set(key, value, options);
	}

	public async get(key: RedisArgument): Promise<string | null> {
		return this.client.get(key);
	}

	public async del(keys: RedisArgument | RedisArgument[]): Promise<number> {
		return this.client.del(keys);
	}

	public async expire(key: RedisArgument, seconds: number, mode?: RedisMode) {
		return this.client.expire(key, seconds, mode);
	}

	public async pExpire(key: RedisArgument, milliseconds: number, mode?: RedisMode) {
		return this.client.pExpire(key, milliseconds, mode);
	}

	public async zAdd(
		key: RedisArgument,
		members:
			| {
					score: number;
					value: RedisArgument;
			  }
			| {
					score: number;
					value: RedisArgument;
			  }[],
		options?: (RedisOptionsNx | (RedisOptionsXx & RedisOptionsLt & RedisOptionsGt)) & RedisOptionsCh & RedisOptionsIncr,
	): Promise<number> {
		return this.client.zAdd(key, members, options);
	}

	public async zCard(key: RedisArgument): Promise<number> {
		return this.client.zCard(key);
	}

	public async zRemRangeByScore(key: RedisArgument, min: RedisArgument | number, max: RedisArgument | number): Promise<number> {
		return this.client.zRemRangeByScore(key, min, max);
	}

	public async sAdd(key: RedisArgument, members: RedisArgument | RedisArgument[]): Promise<number> {
		return this.client.sAdd(key, members);
	}

	public async sIsMember(key: RedisArgument, member: RedisArgument): Promise<boolean> {
		return this.client.sIsMember(key, member);
	}

	public async unlink(key: RedisArgument | RedisArgument[]): Promise<number> {
		return this.client.unlink(key);
	}

	public async hExists(key: RedisArgument, field: RedisArgument): Promise<boolean> {
		return this.client.hExists(key, field);
	}

	public async hGet(key: RedisArgument, field: RedisArgument): Promise<string | undefined> {
		return this.client.hGet(key, field);
	}

	public async hGetAll(key: RedisArgument): Promise<Record<string, string>> {
		return this.client.hGetAll(key);
	}

	public async hSet(key: RedisArgument, field: RedisArgument | number, value: RedisArgument | number): Promise<number> {
		return this.client.hSet(key, field, value);
	}

	public async hmSet(key: RedisArgument, field: RedisHSETObject | RedisHSETMap | RedisHSETTuples): Promise<number> {
		return this.client.hSet(key, field);
	}

	public async hDel(key: RedisArgument, field: RedisArgument | RedisArgument[]): Promise<number> {
		return this.client.hDel(key, field);
	}
}

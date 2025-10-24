import { GoogleAuth } from 'google-auth-library';
import { Pool, PoolClient, PoolConfig } from 'pg';

import { Container, Logger, Registry, SystemService } from '@fw/common';

import { PgClient } from './client';
import { PgError } from './errors';
import { PgConfig } from './types';

@SystemService()
export class Pg {
	private pool: Pool;
	private readPools: Record<string, Pool> = {};

	private readonly clients: Map<string, { poolClient: PoolClient; masterClient: unknown }> = new Map();
	private readonly readClients: Map<string, { poolClient: PoolClient; readClient: unknown }> = new Map();

	public init(name: string, config: PgConfig, slavesConfigs?: Record<string, PoolConfig>): void {
		const rewriteConfig: Record<string, unknown> = {};

		if (config?.isAlloyDb) {
			const gcpAuth = new GoogleAuth({
				scopes: ['https://www.googleapis.com/auth/alloydb.login'],
			});

			rewriteConfig['ssl'] = true;
			rewriteConfig['rejectUnauthorized'] = false;
			rewriteConfig['password'] = async () => {
				return await gcpAuth.getAccessToken();
			};
		}

		this.pool = new Pool({
			application_name: name,
			query_timeout: 12000,
			idleTimeoutMillis: 30000,
			keepAlive: true,
			...config,
			...rewriteConfig,
		});

		this.pool.on('error', (error) => {
			Container.get(Logger).error('pgError', { error });
		});

		if (slavesConfigs && Object.keys(slavesConfigs).length) {
			for (const slaveConfigName of Object.keys(slavesConfigs || {})) {
				const slaveConfig = slavesConfigs[slaveConfigName];
				this.readPools[slaveConfigName] = new Pool({
					application_name: name,
					query_timeout: 12000,
					keepAlive: true,
					...slaveConfig,
				});

				this.readPools[slaveConfigName].on('error', (error) => {
					Container.get(Logger).error('pgError', { error });
				});

				Container.get(Logger).info('pg', { slave: slaveConfigName, action: 'connected' });
			}
		}
	}

	public async destroy(): Promise<void> {
		if (!this.pool) {
			throw new PgError('Pool does not exist');
		}

		await this.pool.end();
		for (const readPool of Object.values(this.readPools)) {
			await readPool.end();
		}
	}

	public async createClient(containerId: string): Promise<void> {
		if (!this.pool) {
			throw new PgError('Pool does not exist');
		}

		if (this.clients.has(containerId)) {
			throw new PgError('This container already has client');
		}

		const poolClient = await this.pool.connect();
		const masterClient = new PgClient(poolClient);
		this.clients.set(containerId, { poolClient, masterClient });
	}

	public async createReadClient(containerId: string, slaveName: string): Promise<void> {
		const pool = this.readPools?.[slaveName];
		if (!pool) {
			throw new PgError('Pool does not exist');
		}

		if (this.readClients.has(`${containerId}/${slaveName}`)) {
			throw new PgError('This container already has client');
		}

		const poolClient = await pool.connect();
		const readClient = new PgClient(poolClient, true);
		this.readClients.set(`${containerId}/${slaveName}`, { poolClient, readClient });
	}

	public releaseClient(containerId: string): void {
		if (!this.clients.has(containerId)) {
			throw new PgError('This container does not have client');
		}

		this.clients.get(containerId)!.poolClient.release();
		this.clients.delete(containerId);
	}

	public releaseReadClient(containerId: string, slaveName: string): void {
		if (!this.readClients.has(`${containerId}/${slaveName}`)) {
			throw new PgError('This container does not have client');
		}

		this.readClients.get(`${containerId}/${slaveName}`)!.poolClient.release();
		this.readClients.delete(`${containerId}/${slaveName}`);
	}

	public releaseAllReadClients(containerId: string): void {
		const matchingKeys = [...this.readClients.keys()].filter((key) => key.startsWith(containerId));
		for (const key of matchingKeys) {
			this.readClients.get(key)!.poolClient.release();
			this.readClients.delete(key);
		}
	}
}

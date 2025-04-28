import { Pool, PoolClient, PoolConfig } from 'pg';
import { Service } from 'typedi';

import { getLogger } from '@fw/logger';

import { PgClient, PgClientRead } from './client';
import { PgError } from './types';

@Service()
export class Pg {
	private pool: Pool;
	private readPools: Record<string, Pool> = {};

	private readonly clients: Map<string, { poolClient: PoolClient; masterClient: PgClient }> = new Map();
	private readonly readClients: Map<string, { poolClient: PoolClient; readClient: PgClientRead }> = new Map();

	public async init(name: string, config: PoolConfig, slavesConfigs?: Record<string, PoolConfig>): Promise<void> {
		if (this.pool) {
			throw new PgError('Pool has already created');
		}

		this.pool = new Pool({
			application_name: name,
			query_timeout: 12000,
			keepAlive: true,
			parseInputDatesAsUTC: true,
			...config,
		});

		this.pool.on('error', (err) => {
			getLogger().error('pgError', err);
		});

		await this.pool.connect();
		getLogger().info('pg', 'master', 'connected');

		if (slavesConfigs && Object.keys(slavesConfigs).length) {
			for (const slaveConfigName of Object.keys(slavesConfigs || {})) {
				const slaveConfig = slavesConfigs[slaveConfigName];
				this.readPools[slaveConfigName] = new Pool({
					application_name: name,
					query_timeout: 12000,
					keepAlive: true,
					parseInputDatesAsUTC: true,
					...slaveConfig,
				});

				this.readPools[slaveConfigName].on('error', (err) => {
					getLogger().error('pgError', err);
				});

				await this.readPools[slaveConfigName].connect();
				getLogger().info('pg', slaveConfigName, 'connected');
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

	public async createClient(containerId: string): Promise<PgClient> {
		if (!this.pool) {
			throw new PgError('Pool does not exist');
		}

		if (this.clients.has(containerId)) {
			throw new PgError('This container already has client');
		}

		const poolClient = await this.pool.connect();
		const masterClient = new PgClient(poolClient);
		this.clients.set(containerId, { poolClient, masterClient });

		return masterClient;
	}

	public async createReadClient(containerId: string, slaveName: string): Promise<PgClientRead> {
		const pool = this.readPools[slaveName];
		if (!pool) {
			throw new PgError('Pool does not exist');
		}

		if (this.readClients.has(`${containerId}/${slaveName}`)) {
			throw new PgError('This container already has client');
		}

		const poolClient = await pool.connect();
		const readClient = new PgClientRead(poolClient);
		this.readClients.set(`${containerId}/${slaveName}`, { poolClient, readClient });

		return readClient;
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

	public getClient(containerId: string): PgClient {
		if (!this.clients.has(containerId)) {
			throw new PgError('This container does not have client');
		}

		return this.clients.get(containerId)!.masterClient;
	}

	public getReadClient(containerId: string, slaveName: string): PgClientRead {
		if (!this.readClients.has(`${containerId}/${slaveName}`)) {
			throw new PgError('This container does not have client');
		}

		return this.readClients.get(`${containerId}/${slaveName}`)!.readClient;
	}
}

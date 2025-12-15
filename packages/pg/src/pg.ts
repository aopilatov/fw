import { JWT } from 'google-auth-library';
import { Pool, PoolClient, PoolConfig } from 'pg';

import { Container, Logger, Registry, SystemService } from '@fw/common';

import { PgError } from './errors';
import { PgModel } from './model';
import { PgReadClient } from './pgClientRead';
import { PgWriteClient } from './pgClientWrite';
import { PgConfig } from './types';
import { PgView } from './view';

import './helper';

@SystemService()
export class Pg {
	private pool: Pool;
	private readPools: Record<string, Pool> = {};
	private readonly models: Map<string, PgModel> = new Map();
	private readonly views: Map<string, PgView> = new Map();

	private readonly clients: Map<string, PoolClient> = new Map();
	private readonly readClients: Map<string, PoolClient> = new Map();

	private readonly hubMasters: Map<string, PgWriteClient> = new Map();
	private readonly hubSlaves: Map<string, PgReadClient> = new Map();

	public init(name: string, config: PgConfig, slavesConfigs?: Record<string, PoolConfig>): void {
		const rewriteConfig: Record<string, unknown> = {};

		if (config?.alloyDb) {
			const key = JSON.parse(config.alloyDb.key);
			const gcpAuth = new JWT({
				email: key.client_email,
				key: key.private_key,
				scopes: ['https://www.googleapis.com/auth/cloud-platform'],
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

	public getPoolClient(slaveName?: string): PoolClient {
		const context = Registry.context.getStore() || {};
		if (!context?.requestId) {
			throw new PgError('Request id is not defined');
		}

		let client: PoolClient | undefined;
		if (slaveName) {
			client = this.readClients.get(`${context.requestId}/${slaveName}`);
		} else {
			client = this.clients.get(context.requestId);
		}

		if (!client) {
			throw new PgError('Pool client not found');
		}

		return client;
	}

	public getClient(slaveName?: string): PgReadClient | PgWriteClient {
		if (slaveName) return this.getSlaveClient(slaveName);
		return this.getMasterClient();
	}

	public getMasterClient(): PgWriteClient {
		const context = Registry.context.getStore() || {};
		if (!context?.requestId) {
			throw new PgError('Request id is not defined');
		}

		let hubMaster = this.hubMasters.get(context.requestId);
		if (!hubMaster) {
			hubMaster = new PgWriteClient();
			this.hubMasters.set(context.requestId, hubMaster);
		}

		return hubMaster;
	}

	public getSlaveClient(slaveName: string): PgReadClient {
		const context = Registry.context.getStore() || {};
		if (!context?.requestId) {
			throw new PgError('Request id is not defined');
		}

		let hubSlave = this.hubSlaves.get(context.requestId);
		if (!hubSlave) {
			hubSlave = new PgReadClient(slaveName);
			this.hubSlaves.set(context.requestId, hubSlave);
		}

		return hubSlave;
	}

	public async destroy(): Promise<void> {
		if (!this.pool) {
			throw new PgError('Pool does not exist');
		}

		for (const key of this.clients.keys()) {
			this.clients.get(key)?.release(true);
			this.clients.delete(key);
		}

		for (const key of this.readClients.keys()) {
			this.readClients.get(key)?.release(true);
			this.readClients.delete(key);
		}

		await this.pool.end();
		for (const readPool of Object.values(this.readPools)) {
			await readPool.end();
		}
	}

	public async createClient(containerId: string): Promise<PoolClient> {
		if (!this.pool) {
			throw new PgError('Pool does not exist');
		}

		if (this.clients.has(containerId)) {
			throw new PgError('This container already has client');
		}

		const poolClient = await this.pool.connect();
		this.clients.set(containerId, poolClient);

		return poolClient;
	}

	public async createReadClient(containerId: string, slaveName: string): Promise<PoolClient> {
		const pool = this.readPools?.[slaveName];
		if (!pool) {
			throw new PgError('Pool does not exist');
		}

		if (this.readClients.has(`${containerId}/${slaveName}`)) {
			throw new PgError('This container already has client');
		}

		const poolClient = await pool.connect();
		this.readClients.set(`${containerId}/${slaveName}`, poolClient);

		return poolClient;
	}

	public releaseClient(containerId: string): void {
		if (!this.clients.has(containerId)) {
			throw new PgError('This container does not have client');
		}

		this.clients.get(containerId)!.release(true);
		this.clients.delete(containerId);
		this.hubMasters.delete(containerId);
	}

	public releaseReadClient(containerId: string, slaveName: string): void {
		if (!this.readClients.has(`${containerId}/${slaveName}`)) {
			throw new PgError('This container does not have client');
		}

		this.readClients.get(`${containerId}/${slaveName}`)!.release(true);
		this.readClients.delete(`${containerId}/${slaveName}`);
		this.hubSlaves.delete(`${containerId}/${slaveName}`);
	}

	public releaseAllReadClients(containerId: string): void {
		const matchingKeys = [...this.readClients.keys()].filter((key) => key.startsWith(containerId));
		for (const key of matchingKeys) {
			this.readClients.get(key)!.release(true);
			this.readClients.delete(key);
		}
	}

	public registerModel(model: PgModel, skipCheck: boolean = false): void {
		if (this.models.has(model.table)) {
			if (skipCheck) {
				return;
			} else {
				throw new PgError(`Model for table ${model.table} is already registered`);
			}
		}

		this.models.set(model.table, model);
	}

	public getModel(table: string): PgModel {
		const model = this.models.get(table);
		if (!model) {
			throw new PgError(`Model for table ${table} is not registered`);
		}

		return model;
	}

	public registerView(view: PgView): void {
		if (this.views.has(view.name)) {
			throw new PgError(`Model for view ${view.name} is already registered`);
		}

		this.views.set(view.name, view);
	}

	public getView(name: string): PgView {
		const view = this.views.get(name);
		if (!view) {
			throw new PgError(`Model for view ${name} is not registered`);
		}

		return view;
	}
}

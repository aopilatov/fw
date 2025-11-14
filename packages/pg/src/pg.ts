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

	private readonly clients: Map<string, { poolClient: PoolClient; masterClient: PgWriteClient }> = new Map();
	private readonly readClients: Map<string, { poolClient: PoolClient; readClient: PgReadClient }> = new Map();

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

	public async getOrCreateClient(slaveName?: string): Promise<PgWriteClient | PgReadClient> {
		if (slaveName) {
			return this.getOrCreateReadClient(slaveName);
		}

		return this.getOrCreateMasterClient();
	}

	public getMasterClient(): PgWriteClient {
		const context = Registry.context.getStore() || {};
		if (!context?.requestId) {
			throw new PgError('Request id is not defined');
		}

		const client = this.clients.get(context.requestId);
		if (!client) {
			throw new PgError('Client is not created');
		}

		return client.masterClient;
	}

	public getReadClient(slaveName: string): PgReadClient {
		const context = Registry.context.getStore() || {};
		if (!context?.requestId) {
			throw new PgError('Request id is not defined');
		}

		const client = this.readClients.get(`${context.requestId}/${slaveName}`);
		if (!client) {
			throw new PgError('Client is not created');
		}

		return client.readClient;
	}

	public async destroy(): Promise<void> {
		if (!this.pool) {
			throw new PgError('Pool does not exist');
		}

		for (const key of this.clients.keys()) {
			this.clients.get(key)?.poolClient?.release();
			this.clients.delete(key);
		}

		for (const key of this.readClients.keys()) {
			this.readClients.get(key)?.poolClient?.release();
			this.readClients.delete(key);
		}

		await this.pool.end();
		for (const readPool of Object.values(this.readPools)) {
			await readPool.end();
		}
	}

	public async createClient(containerId: string): Promise<{ poolClient: PoolClient; masterClient: PgWriteClient }> {
		if (!this.pool) {
			throw new PgError('Pool does not exist');
		}

		if (this.clients.has(containerId)) {
			throw new PgError('This container already has client');
		}

		const poolClient = await this.pool.connect();
		const masterClient = new PgWriteClient(poolClient);
		this.clients.set(containerId, { poolClient, masterClient });

		return { masterClient, poolClient };
	}

	public async createReadClient(containerId: string, slaveName: string): Promise<{ poolClient: PoolClient; readClient: PgReadClient }> {
		const pool = this.readPools?.[slaveName];
		if (!pool) {
			throw new PgError('Pool does not exist');
		}

		if (this.readClients.has(`${containerId}/${slaveName}`)) {
			throw new PgError('This container already has client');
		}

		const poolClient = await pool.connect();
		const readClient = new PgReadClient(poolClient);
		this.readClients.set(`${containerId}/${slaveName}`, { poolClient, readClient });

		return { readClient, poolClient };
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

	private async getOrCreateMasterClient(): Promise<PgWriteClient> {
		const context = Registry.context.getStore() || {};
		if (!context?.requestId) {
			throw new PgError('Request id is not defined');
		}

		let client = this.clients.get(context.requestId);
		if (!client) {
			client = await this.createClient(context.requestId);
		}

		return client.masterClient;
	}

	private async getOrCreateReadClient(slaveName: string): Promise<PgReadClient> {
		const context = Registry.context.getStore() || {};
		if (!context?.requestId) {
			throw new PgError('Request id is not defined');
		}

		let client = this.readClients.get(`${context.requestId}/${slaveName}`);
		if (!client) {
			client = await this.createReadClient(context.requestId, slaveName);
		}

		return client.readClient;
	}
}

import { SystemService } from '@fw/common';
import { UseRequest, Request } from '@fw/common';
import { Container } from '@fw/common';

import { Pg } from './pg';
import { PgWriteClient } from './pgClientWrite';

@SystemService()
export class PgHelper {
	@UseRequest() private readonly request: Request;

	public async executeInTransaction<T>(func: () => Promise<T>): Promise<T> {
		if (this.request.transactional) {
			return await func();
		} else {
			const client = (await Container.getSystem(Pg).getOrCreateClient()) as PgWriteClient;

			try {
				this.request.transactional = true;
				await client.query('BEGIN');
				const result = await func();
				await client.query('COMMIT');
				return result;
			} catch (e: unknown) {
				await client.query('ROLLBACK');
				throw e;
			} finally {
				this.request.transactional = false;
			}
		}
	}

	public async startAutocloseLock(namespace: string, key: string): Promise<void> {
		if (!this.request.transactional) {
			throw new Error('Lock requires transaction');
		}

		const client = (await Container.getSystem(Pg).getOrCreateClient()) as PgWriteClient;
		await client.query('SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2));', [namespace, key]);
	}

	public async lockStart(namespace: string, key: string): Promise<void> {
		if (!this.request.transactional) {
			throw new Error('Lock requires transaction');
		}

		const client = (await Container.getSystem(Pg).getOrCreateClient()) as PgWriteClient;
		await client.query('SELECT pg_advisory_lock(hashtext($1), hashtext($2));', [namespace, key]);
	}

	public async lockClose(namespace: string, key: string): Promise<void> {
		if (!this.request.transactional) {
			throw new Error('Lock requires transaction');
		}

		const client = (await Container.getSystem(Pg).getOrCreateClient()) as PgWriteClient;
		await client.query('SELECT pg_advisory_unlock(hashtext($1), hashtext($2));', [namespace, key]);
	}
}

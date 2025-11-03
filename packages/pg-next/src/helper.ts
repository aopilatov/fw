import { UseRequest, Request, Container, SystemService } from '@fw/common';

import { Pg } from './registry';

@SystemService()
export class PgHelper {
	@UseRequest() private readonly request: Request;

	public async executeInTransaction<T>(func: () => Promise<T>, skipCheck: boolean = false): Promise<T> {
		const client = await Container.get(Pg).getClient();

		if (this.request.isTransactional && !skipCheck) {
			throw new Error('Transaction is already performed');
		}

		this.request.transactional = true;

		try {
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

	public async performWithAutocloseLock(namespace: string, key: string): Promise<void> {
		if (!this.request.isTransactional) {
			throw new Error('Lock requires transaction');
		}

		const client = await Container.get(Pg).getClient();
		await client.query('SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2));', [namespace, key]);
	}

	public async lockStart(namespace: string, key: string): Promise<void> {
		if (!this.request.isTransactional) {
			throw new Error('Lock requires transaction');
		}

		const client = await Container.get(Pg).getClient();
		await client.query('SELECT pg_advisory_lock(hashtext($1), hashtext($2));', [namespace, key]);
	}

	public async lockClose(namespace: string, key: string): Promise<void> {
		if (!this.request.isTransactional) {
			throw new Error('Lock requires transaction');
		}

		const client = await Container.get(Pg).getClient();
		await client.query('SELECT pg_advisory_unlock(hashtext($1), hashtext($2));', [namespace, key]);
	}
}

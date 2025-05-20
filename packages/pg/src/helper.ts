import { Container, Inject, Service } from 'typedi';

import { RequestLike } from '@fw/common';

import { PgClient } from './client';

@Service()
export class PgHelper {
	@Inject() readonly request: RequestLike;

	public async executeInTransaction<T>(func: () => Promise<T>, skipCheck: boolean = false): Promise<T> {
		const client = Container.of(this.request.id).get(PgClient);

		if (this.request.isTransactional && !skipCheck) {
			throw new Error('Transaction is already performed');
		}

		this.request.setHasTransaction();

		try {
			await client.query('BEGIN');
			const result = await func();
			await client.query('COMMIT');
			return result;
		} catch (e: unknown) {
			await client.query('ROLLBACK');
			throw e;
		} finally {
			this.request.unsetHasTransaction();
		}
	}

	public async performWithAutocloseLock(namespace: string, key: string): Promise<void> {
		if (!this.request.isTransactional) {
			throw new Error('Lock requires transaction');
		}

		const client = Container.of(this.request.id).get(PgClient);
		await client.query('SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2));', [namespace, key]);
	}

	public async lockStart(namespace: string, key: string): Promise<void> {
		if (!this.request.isTransactional) {
			throw new Error('Lock requires transaction');
		}

		const client = Container.of(this.request.id).get(PgClient);
		await client.query('SELECT pg_advisory_lock(hashtext($1), hashtext($2));', [namespace, key]);
	}

	public async lockClose(namespace: string, key: string): Promise<void> {
		if (!this.request.isTransactional) {
			throw new Error('Lock requires transaction');
		}

		const client = Container.of(this.request.id).get(PgClient);
		await client.query('SELECT pg_advisory_unlock(hashtext($1), hashtext($2));', [namespace, key]);
	}
}

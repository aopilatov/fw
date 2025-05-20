import { Container, Service } from 'typedi';

import { PgClient } from '@fw/pg';

import { ServiceLike } from './service';

@Service()
export class MixinLike extends ServiceLike {
	public async executeInTransaction<T>(func: () => Promise<T>): Promise<T> {
		const client = Container.of(this.request.id).get(PgClient);

		if (this.request.isTransactional) {
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
		}
	}

	public async performWithLock(key: string) {
		if (!this.request.isTransactional) {
			throw new Error('Lock requires transaction');
		}

		const client = Container.of(this.request.id).get(PgClient);
		await client.query('SELECT pg_advisory_xact_lock(hashtext($1));', [key]);
	}
}

import { randomUUID } from 'node:crypto';

import { Service, Container } from 'typedi';

import { Redis } from '../../cache';

import { PerformLockConfig } from './types';

@Service()
export class RedisLock {
	public async performWithLock<T>(
		lockKey: string,
		callback: () => Promise<T>,
		{ retryCount = 10, retryDelay = 50, retryJitter = 50, ttl = 200, doubleCheckLock = true }: PerformLockConfig = {},
	): Promise<T> {
		const cache = Container.get(Redis);

		const lockValue = randomUUID();
		const lockName = 'lock:' + lockKey.replace(/ /g, '_');

		await this.acquireLock(lockName, lockValue, ttl, retryCount, retryDelay, retryJitter, doubleCheckLock);

		const extendLock = async () => {
			const currentValue = await cache.get(lockName);
			if (currentValue === lockValue) {
				await cache.pExpire(lockName, ttl);
			}
		};

		const interval = setInterval(extendLock, ttl * 0.8);

		let value: T;
		try {
			value = await callback();
		} catch (error) {
			throw error;
		} finally {
			clearInterval(interval);
			const currentValue = await this.checkLock(lockName);
			if (currentValue === lockValue) {
				await this.clearLock(lockName);
			}
		}
		return value;
	}

	private async acquireLock(
		lockKey: string,
		lockValue: string,
		ttl: number,
		retryCount: number,
		retryDelay: number,
		retryJitter: number,
		doubleCheckLock: boolean,
	): Promise<boolean> {
		for (let i = 0; i < retryCount; i++) {
			await this.wait(Math.floor(Math.random() * retryJitter));
			const result = await this.setLock(lockKey, lockValue, ttl);
			if (result === 'OK') {
				if (!doubleCheckLock) {
					return true;
				}
				const currentValue = await this.checkLock(lockKey);
				if (currentValue === lockValue) {
					return true;
				}
			}
			await this.wait(retryDelay + Math.floor(Math.random() * retryJitter));
		}
		throw new Error(`Failed to acquire lock`);
	}

	private async setLock(lockKey: string, lockValue: string, ttl: number): Promise<string | null> {
		const cache = Container.get(Redis);
		return await cache.set(lockKey, lockValue, { PX: ttl, NX: true });
	}

	public async checkLock(lockKey: string): Promise<string | null> {
		const cache = Container.get(Redis);
		return await cache.get(lockKey.replace(/ /g, '_'));
	}

	private async clearLock(lockKey: string, ignoreIfAlreadyInAnotherLock?: boolean): Promise<void> {
		const cache = Container.get(Redis);
		await cache.del(lockKey);
	}

	private async wait(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

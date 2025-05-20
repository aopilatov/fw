import crypto from 'node:crypto';

import { Service, Container } from 'typedi';

import { RequestLike } from '@fw/common';
import { getLogger } from '@fw/logger/src';

@Service()
export class WorkerHelper {
	public async withinContainer<T>(
		prefix: string,
		callback: (name: string) => Promise<T>,
		onCreate?: (name: string) => void | Promise<void>,
		onDestroy?: (name: string) => void | Promise<void>,
	): Promise<T> {
		let result: T;

		const containerName = `${prefix}.${crypto.randomUUID()}`;
		Container.of(containerName).set(RequestLike, new RequestLike(containerName));

		if (onCreate) {
			await onCreate(containerName);
		}

		try {
			result = await callback(containerName);
		} catch (e: unknown) {
			getLogger(containerName).error(prefix, e);
			throw e;
		} finally {
			if (onDestroy) {
				await onDestroy(containerName);
			}

			getLogger(containerName).info('finished');
			Container.reset(containerName);
		}

		return result;
	}
}

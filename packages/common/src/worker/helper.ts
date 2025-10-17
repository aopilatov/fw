import crypto from 'node:crypto';

import { Container, GlobalService } from '../di';
import { Logger } from '../logger';

@GlobalService()
export class WorkerHelper {
	public async withinContainer<T>(
		prefix: string,
		callback: (name: string) => Promise<T>,
		onCreate?: (name: string) => void | Promise<void>,
		onDestroy?: (name: string) => void | Promise<void>,
	): Promise<T> {
		let result: T;

		const containerName = `${prefix}.${crypto.randomUUID()}`;
		Container.of(containerName);

		const logger = Container.get(Logger).get(containerName);

		if (onCreate) {
			await onCreate(containerName);
		}

		try {
			result = await callback(containerName);
		} catch (e: unknown) {
			logger.error(prefix, e?.['message']);
			throw e;
		} finally {
			if (onDestroy) {
				await onDestroy(containerName);
			}

			logger.info('finished');
			Container.reset(containerName);
		}

		return result;
	}
}

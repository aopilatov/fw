import { Inject, Service } from 'typedi';

import { type Redis } from '@fw/cache';
import { type PubSub } from '@fw/pubsub';
import { type Centrifugo } from '@fw/socket';

import { RequestLike } from './request';

@Service()
export class ServiceLike {
	@Inject() protected readonly request: RequestLike;
	@Inject() protected readonly cacheInstance?: Redis;
	@Inject() protected readonly pubsubInstance?: PubSub;
	@Inject() protected readonly socketInstance?: Centrifugo;

	protected get cache(): Redis {
		if (!this.cacheInstance) {
			throw new Error('Cache does not exist in service');
		}

		return this.cacheInstance;
	}

	protected get pubsub(): PubSub {
		if (!this.pubsubInstance) {
			throw new Error('PubSub does not exist in service');
		}

		return this.pubsubInstance;
	}

	protected get socket(): Centrifugo {
		if (!this.socketInstance) {
			throw new Error('Socket does not exist in service');
		}

		return this.socketInstance;
	}
}

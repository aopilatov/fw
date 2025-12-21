import { ServiceInstance } from './serviceInstance';

export interface PubSub<Type = unknown> extends ServiceInstance<Type> {
	instanceOf: 'pubsub';
	scope: 'container';
}

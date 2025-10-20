import { ServiceInstance } from './serviceInstance';

export interface Cache<Type = unknown> extends ServiceInstance<Type> {
	instanceOf: 'cache';
	scope: 'container';
}

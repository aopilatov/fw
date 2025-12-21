import { ServiceInstance } from './serviceInstance';

export interface SystemService<Type = unknown> extends ServiceInstance<Type> {
	instanceOf: 'system';
	scope: 'container';
}

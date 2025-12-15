import { ServiceInstance } from './serviceInstance';

export interface GlobalService<Type = unknown> extends ServiceInstance<Type> {
	instanceOf: 'global';
	scope: 'singleton';
}

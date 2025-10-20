import { ServiceInstance } from './serviceInstance';

export interface Warehouse<Type = unknown> extends ServiceInstance<Type> {
	instanceOf: 'warehouse';
	scope: 'container';
}

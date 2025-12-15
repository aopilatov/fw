import { ServiceInstance } from './serviceInstance';

export interface ActionService<Type = unknown> extends ServiceInstance<Type> {
	instanceOf: 'action';
	scope: 'container';
}

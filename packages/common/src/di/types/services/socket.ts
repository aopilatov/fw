import { ServiceInstance } from './serviceInstance';

export interface Socket<Type = unknown> extends ServiceInstance<Type> {
	instanceOf: 'socket';
	scope: 'container';
}

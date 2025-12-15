import { ServiceInstance } from './serviceInstance';

export interface Service<Type = unknown> extends ServiceInstance<Type> {
	instanceOf: 'service';
	scope: 'container';
}

import { ServiceInstance } from './serviceInstance';

export interface ValidationService<Type = unknown> extends ServiceInstance<Type> {
	instanceOf: 'validation';
	scope: 'container';
}

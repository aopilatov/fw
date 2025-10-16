import { ServiceInstance } from './serviceInstance';

export interface Repository<Type = unknown> extends ServiceInstance<Type> {
	instanceOf: 'repository';
	scope: 'container';
}

import { ContainerInstance } from '../../containerInstance';
import { ServiceIdentifier, Scope, Constructable, Identifier, InstanceOf } from '../types';

export interface ServiceInstance<Type = unknown> {
	id: ServiceIdentifier;
	instanceOf: InstanceOf;
	scope: Scope;
	type: Constructable<Type> | null;
	factory: [Constructable<unknown>, string] | CallableFunction | undefined;
	value: unknown | symbol;
	referencedBy?: Map<Identifier, ContainerInstance>;
}

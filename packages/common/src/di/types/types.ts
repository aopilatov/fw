import { ContainerGlobalInstance } from '../containerGlobalInstance';
import { ContainerInstance } from '../containerInstance';

import { ServiceInstance } from './services/serviceInstance';

export const EMPTY_VALUE = Symbol('EMPTY_VALUE');

export type Identifier = string | symbol;

export type ServiceIdentifier<T = unknown> = Constructable<T> | AbstractConstructable<T> | CallableFunction | Token<T> | string;

export type Constructable<T> = new (...args: unknown[]) => T;

export type AbstractConstructable<T> = NewableFunction & { prototype: T };

export type Scope = 'singleton' | 'container' | 'transient';

export type InstanceOf = 'global' | 'validation' | 'action' | 'service';

export interface Handler<T = unknown> {
	object: Constructable<T>;
	propertyName?: string;
	index?: number;
	value: (container: ContainerInstance | ContainerGlobalInstance) => unknown;
}

export type ServiceOptions<T = unknown> =
	| Omit<Partial<ServiceInstance<T>>, 'referencedBy' | 'type' | 'factory'>
	| Omit<Partial<ServiceInstance<T>>, 'referencedBy' | 'value' | 'factory'>
	| Omit<Partial<ServiceInstance<T>>, 'referencedBy' | 'value' | 'type'>;

export class Token<T> {
	constructor(public name?: string) {}
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type Func = Function;

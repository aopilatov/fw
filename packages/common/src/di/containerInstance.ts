import { Registry } from './registry';
import { AbstractConstructable, Constructable } from './types';

export class ContainerInstance {
	constructor(public readonly id: string) {}

	public hasValidation<T = unknown>(type: Constructable<T>): boolean {
		return Registry.has<T>('validation', type);
	}

	public hasAction<T = unknown>(type: Constructable<T>): boolean {
		return Registry.has<T>('action', type);
	}

	public getValidation<T = unknown>(type: Constructable<T>): T;
	public getValidation<T = unknown>(type: AbstractConstructable<T>): T {
		return Registry.get<T>(this, 'validation', type);
	}

	public getAction<T = unknown>(type: Constructable<T>): T;
	public getAction<T = unknown>(type: AbstractConstructable<T>): T {
		return Registry.get<T>(this, 'action', type);
	}

	public getSystem<T = unknown>(type: Constructable<T>): T;
	public getSystem<T = unknown>(type: AbstractConstructable<T>): T {
		return Registry.get<T>(this, 'system', type);
	}
}

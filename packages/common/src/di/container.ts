import 'reflect-metadata';

import { ContainerInstance } from './containerInstance';
import { Registry } from './registry';
import { GlobalService } from './types/services/global';
import { AbstractConstructable, Constructable, Func, ServiceIdentifier, ServiceOptions, Token } from './types/types';

export class Container {
	public static of(id: string): ContainerInstance {
		let container = Registry.getContainer(id);
		if (!container) {
			container = new ContainerInstance(id);
			Registry.setContainer(container);
		}

		return container;
	}

	public static has<T>(type: Constructable<T>): boolean {
		return Registry.getGlobalContainer().has(type);
	}

	public static get<T>(type: Constructable<T>): T;
	public static get<T>(type: AbstractConstructable<T>): T {
		return Registry.getGlobalContainer().get(type as never);
	}

	public static set<T = unknown>(service: GlobalService<T>): Container;
	public static set<T = unknown>(type: Constructable<T>, value: T): Container;
	public static set<T = unknown>(type: AbstractConstructable<T>, value: T): Container;
	public static set<T = unknown>(service: GlobalService<T> | Constructable<T> | AbstractConstructable<T>, value?: unknown) {
		Registry.getGlobalContainer().set(service as never, value);
		return this;
	}

	public static remove(identifierOrIdentifierArray: ServiceIdentifier | ServiceIdentifier[]): Container {
		Registry.remove(identifierOrIdentifierArray);
		return this;
	}
}

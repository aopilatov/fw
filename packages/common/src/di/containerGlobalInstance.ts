import { Registry } from './registry';
import { GlobalService } from './types/services/global';
import { Constructable, AbstractConstructable, ServiceIdentifier, EMPTY_VALUE, Handler, ServiceOptions, Token } from './types/types';

export class ContainerGlobalInstance {
	public has<T>(type: Constructable<T>): boolean {
		return Registry.has<T>('global', type);
	}

	public get<T>(type: Constructable<T>): T;
	public get<T>(type: AbstractConstructable<T>): T {
		return Registry.get<T>(this, 'global', type);
	}

	public set<T = unknown>(service: GlobalService<T>): ContainerGlobalInstance;
	public set<T = unknown>(type: Constructable<T>, instance: T): ContainerGlobalInstance;
	public set<T = unknown>(type: AbstractConstructable<T>, instance: T): ContainerGlobalInstance;
	public set<T = unknown>(service: Constructable<T> | AbstractConstructable<T> | GlobalService<T>, value?: T): ContainerGlobalInstance {
		// @ts-ignore
		Registry.set<T>('global', service, value);
		return this;
	}
}

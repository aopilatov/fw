import { ContainerGlobalInstance } from './containerGlobalInstance';
import { ContainerInstance } from './containerInstance';
import { DIError, DIErrorNotFound } from './errors';
import { ServiceInstance } from './types/services/serviceInstance';
import {
	AbstractConstructable,
	Constructable,
	EMPTY_VALUE,
	Func,
	Handler,
	InstanceOf,
	ServiceIdentifier,
	ServiceOptions,
	Token,
} from './types/types';

export class Registry {
	private static readonly globalInstance: ContainerGlobalInstance = new ContainerGlobalInstance();
	private static readonly instances: ContainerInstance[] = [];

	private static readonly handlers: Handler[] = [];
	private static services: ServiceInstance[] = [];

	public static getGlobalContainer(): ContainerGlobalInstance {
		return Registry.globalInstance;
	}

	public static getContainer(id: string): ContainerInstance | undefined {
		return Registry.instances.find((instance) => instance.id === id);
	}

	public static setContainer(instance: ContainerInstance): void {
		Registry.instances.push(instance);
	}

	public static has<T>(instanceOf: InstanceOf, type: Constructable<T>): boolean;
	public static has<T>(instanceOf: InstanceOf, id: Token<T>): boolean;
	public static has<T>(instanceOf: InstanceOf, identifier: ServiceIdentifier<T>): boolean {
		return !!this.findService<T>(instanceOf, identifier);
	}

	public static get<T>(caller: ContainerInstance | ContainerGlobalInstance, instanceOf: InstanceOf, type: Constructable<T>): T;
	public static get<T>(caller: ContainerInstance | ContainerGlobalInstance, instanceOf: InstanceOf, type: AbstractConstructable<T>): T;
	public static get<T>(caller: ContainerInstance | ContainerGlobalInstance, instanceOf: InstanceOf, id: Token<T>): T;
	public static get<T>(caller: ContainerInstance | ContainerGlobalInstance, instanceOf: InstanceOf, id: ServiceIdentifier<T>): T;
	public static get<T>(caller: ContainerInstance | ContainerGlobalInstance, instanceOf: InstanceOf, identifier: ServiceIdentifier<T>): T {
		const globalService = Registry.findService<T>(instanceOf, identifier);
		if (globalService) {
			return this.getServiceValue<T>(caller, globalService);
		}

		throw new DIErrorNotFound(identifier.toString());
	}

	public static set<T = unknown>(instanceOf: InstanceOf, service: ServiceInstance<T>): void;
	public static set<T = unknown>(instanceOf: InstanceOf, type: Constructable<T>, instance: T): void;
	public static set<T = unknown>(instanceOf: InstanceOf, type: AbstractConstructable<T>, instance: T): void;
	public static set<T = unknown>(instanceOf: InstanceOf, token: Token<T>, instance: T): void;
	public static set<T = unknown>(instanceOf: InstanceOf, token: ServiceIdentifier, instance: T): void;
	public static set<T = unknown>(instanceOf: InstanceOf, metadata: ServiceOptions<T>): void;
	public static set<T = unknown>(
		instanceOf: InstanceOf,
		identifierOrServiceMetadata: ServiceIdentifier<T> | ServiceOptions<T>,
		value?: T,
	): void {
		if (identifierOrServiceMetadata instanceof Token) {
			return this.set(instanceOf, {
				id: identifierOrServiceMetadata,
				instanceOf: instanceOf,
				type: null,
				value: value,
				factory: undefined,
			});
		}

		if (typeof identifierOrServiceMetadata === 'function') {
			return this.set(instanceOf, {
				id: identifierOrServiceMetadata,
				instanceOf: instanceOf,
				type: identifierOrServiceMetadata as Constructable<unknown>,
				value: value,
				factory: undefined,
			});
		}

		const newService: ServiceInstance<T> = {
			id: new Token('UNREACHABLE'),
			instanceOf: instanceOf,
			type: null,
			factory: undefined,
			value: EMPTY_VALUE,
			scope: instanceOf === 'global' ? 'singleton' : (identifierOrServiceMetadata?.['scope'] ?? 'container'),
			// @ts-ignore
			...identifierOrServiceMetadata,
		};

		this.services.push(newService);
	}

	public static remove(identifierOrIdentifierArray: ServiceIdentifier | ServiceIdentifier[]): Registry {
		if (Array.isArray(identifierOrIdentifierArray)) {
			identifierOrIdentifierArray.forEach((id) => this.remove(id));
		} else {
			Registry.services = Registry.services.filter((service) => {
				if (service.id === identifierOrIdentifierArray) {
					this.destroyServiceInstance(service);
					return false;
				}

				return true;
			});
		}

		return this;
	}

	public static reset(id: string): void {
		const instance = this.instances.find((item) => item.id === id);
		if (instance) {
			this.instances.splice(this.instances.indexOf(instance), 1);
		}
	}

	public static registerHandler(handler: Handler): void {
		Registry.handlers.push(handler);
	}

	public static getService<T = unknown>(identifier: ServiceIdentifier): ServiceInstance<T> | undefined {
		return Registry.services.find((service) => service.id === identifier) as ServiceInstance<T> | undefined;
	}

	private static findService<T = unknown>(instanceOf: InstanceOf, identifier: ServiceIdentifier): ServiceInstance<T> | undefined {
		return Registry.services.find((service) => service.instanceOf === instanceOf && service.id === identifier) as
			| ServiceInstance<T>
			| undefined;
	}

	private static getServiceValue<T = unknown>(caller: ContainerInstance | ContainerGlobalInstance, serviceMetadata: ServiceInstance<T>): T {
		let value: unknown = EMPTY_VALUE;

		if (serviceMetadata.value !== EMPTY_VALUE) {
			return serviceMetadata.value as T;
		}

		if (!serviceMetadata.factory && !serviceMetadata.type) {
			throw new DIError(serviceMetadata.id.toString());
		}

		if (serviceMetadata.factory) {
			if (serviceMetadata.factory instanceof Array) {
				let factoryInstance: T;

				try {
					factoryInstance = Registry.get<T>(caller, serviceMetadata.instanceOf, serviceMetadata.factory[0]);
				} catch (error: unknown) {
					if (error instanceof DIErrorNotFound) {
						factoryInstance = new serviceMetadata.factory[0]() as unknown as T;
					} else {
						throw error;
					}
				}

				value = factoryInstance[serviceMetadata.factory[1]](caller, serviceMetadata.id);
			} else {
				value = serviceMetadata.factory(caller, serviceMetadata.id);
			}
		}

		if (!serviceMetadata.factory && serviceMetadata.type) {
			const constructableTargetType: Constructable<T> = serviceMetadata.type;
			const paramTypes = Reflect.getMetadata('design:paramtypes', constructableTargetType) || [];
			const params = Registry.initializeParams(caller, serviceMetadata.instanceOf, constructableTargetType, paramTypes);

			params.push(this);
			value = new constructableTargetType(...params);
		}

		if (value === EMPTY_VALUE) {
			throw new DIError(serviceMetadata.id.toString());
		}

		if (serviceMetadata.type) {
			this.applyPropertyHandlers(caller, serviceMetadata.type, value as Record<string, unknown>);
		}

		return value as T;
	}

	private static initializeParams(
		caller: ContainerInstance | ContainerGlobalInstance,
		instanceOf: InstanceOf,
		target: unknown,
		paramTypes: unknown[],
	): unknown[] {
		return paramTypes.map((paramType, index) => {
			const paramHandler = Registry.handlers.find((handler) => {
				return (handler.object === target || handler.object === Object.getPrototypeOf(target)) && handler.index === index;
			});

			if (paramHandler) {
				return paramHandler.value(caller);
			}

			if (paramType && paramType['name'] && !Registry.isPrimitiveParamType(paramType['name'])) {
				return Registry.get(caller, instanceOf, paramType as Constructable<unknown>);
			}

			return undefined;
		});
	}

	private static applyPropertyHandlers(
		caller: ContainerInstance | ContainerGlobalInstance,
		target: Func,
		instance: { [key: string]: unknown },
	) {
		Registry.handlers.forEach((handler) => {
			if (typeof handler.index === 'number') return;
			if (handler.object.constructor !== target && !(target.prototype instanceof handler.object.constructor)) return;

			if (handler.propertyName) {
				instance[handler.propertyName] = handler.value(caller);
			}
		});
	}

	private static isPrimitiveParamType(paramTypeName: string): boolean {
		return ['string', 'boolean', 'number', 'object'].includes(paramTypeName.toLowerCase());
	}

	private static destroyServiceInstance(serviceMetadata: unknown, force = false) {
		const shouldResetValue = force || !!serviceMetadata?.['type'] || !!serviceMetadata?.['factory'];

		if (shouldResetValue) {
			if (typeof (serviceMetadata?.['value'] as Record<string, unknown>)['destroy'] === 'function') {
				try {
					(serviceMetadata!['value'] as { destroy: CallableFunction }).destroy();
				} catch (error) {
					/** We simply ignore the errors from the destroy function. */
				}
			}

			serviceMetadata!['value'] = EMPTY_VALUE;
		}
	}
}

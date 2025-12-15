import { Constructable, Func, Registry, DIErrorInject, resolveToTypeWrapper, Container } from '@fw/common';

import { Pg } from './pg';

export function UsePg(): Func {
	return function (target: object, propertyName: string | symbol, index?: number): void {
		const typeWrapper = resolveToTypeWrapper(undefined, target, propertyName, index);
		if (
			typeWrapper === undefined ||
			typeWrapper.eagerType === undefined ||
			typeWrapper.eagerType === Object ||
			typeWrapper.eagerType?.['name'] !== 'Pg'
		) {
			throw new DIErrorInject(`${(target as Constructable<unknown>).constructor.name} -> ${propertyName.toString()}`);
		}

		Registry.registerHandler({
			object: target as Constructable<unknown>,
			propertyName: propertyName as string,
			index: index,
			value: (containerInstance) => {
				const targetService = Registry.getService(target.constructor);
				if (targetService?.instanceOf && !['repository'].includes(targetService.instanceOf)) {
					throw new DIErrorInject(
						`${(target as Constructable<unknown>).constructor.name} -> ${propertyName.toString()} -> Pg is allowed only in repositories`,
					);
				}

				const evaluatedLazyType = typeWrapper.lazyType();

				if (evaluatedLazyType === undefined || evaluatedLazyType === Object) {
					throw new DIErrorInject(`${(target as Constructable<unknown>).constructor.name} -> ${propertyName.toString()}`);
				}

				return Registry.get(containerInstance, 'system', evaluatedLazyType);
			},
		});
	};
}

export function UsePgHelper(): Func {
	return function (target: object, propertyName: string | symbol, index?: number): void {
		const typeWrapper = resolveToTypeWrapper(undefined, target, propertyName, index);
		if (
			typeWrapper === undefined ||
			typeWrapper.eagerType === undefined ||
			typeWrapper.eagerType === Object ||
			typeWrapper.eagerType?.['name'] !== 'PgHelper'
		) {
			throw new DIErrorInject(`${(target as Constructable<unknown>).constructor.name} -> ${propertyName.toString()}`);
		}

		Registry.registerHandler({
			object: target as Constructable<unknown>,
			propertyName: propertyName as string,
			index: index,
			value: (containerInstance) => {
				const targetService = Registry.getService(target.constructor);
				if (targetService?.instanceOf && !['action'].includes(targetService.instanceOf)) {
					throw new DIErrorInject(
						`${(target as Constructable<unknown>).constructor.name} -> ${propertyName.toString()} -> PgHelper is allowed only in actions`,
					);
				}

				const evaluatedLazyType = typeWrapper.lazyType();

				if (evaluatedLazyType === undefined || evaluatedLazyType === Object) {
					throw new DIErrorInject(`${(target as Constructable<unknown>).constructor.name} -> ${propertyName.toString()}`);
				}

				return Registry.get(containerInstance, 'system', evaluatedLazyType);
			},
		});
	};
}

import { DIErrorInject } from '../errors';
import { resolveToTypeWrapper } from '../helpers';
import { Registry } from '../registry';
import { Constructable, Func } from '../types/types';

export function UseSocket(typeFn?: (type?: never) => Constructable<unknown>): Func {
	return function (target: object, propertyName: string | symbol, index?: number): void {
		const typeWrapper = resolveToTypeWrapper(typeFn, target, propertyName, index);
		if (typeWrapper === undefined || typeWrapper.eagerType === undefined || typeWrapper.eagerType === Object) {
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
						`${(target as Constructable<unknown>).constructor.name} -> ${propertyName.toString()} -> Sockets are allowed only in actions`,
					);
				}

				const evaluatedLazyType = typeWrapper.lazyType();

				if (evaluatedLazyType === undefined || evaluatedLazyType === Object) {
					throw new DIErrorInject(`${(target as Constructable<unknown>).constructor.name} -> ${propertyName.toString()}`);
				}

				return Registry.get(containerInstance, 'socket', evaluatedLazyType);
			},
		});
	};
}

import { Constructable, Func, Registry, DIErrorInject, resolveToTypeWrapper } from '../di';

export function UseRequest(): Func {
	return function (target: object, propertyName: string | symbol, index?: number): void {
		const typeWrapper = resolveToTypeWrapper(undefined, target, propertyName, index);
		if (
			typeWrapper === undefined ||
			typeWrapper.eagerType === undefined ||
			typeWrapper.eagerType === Object ||
			typeWrapper.eagerType?.['name'] !== 'Request'
		) {
			throw new DIErrorInject(`${(target as Constructable<unknown>).constructor.name} -> ${propertyName.toString()}`);
		}

		Registry.registerHandler({
			object: target as Constructable<unknown>,
			propertyName: propertyName as string,
			index: index,
			value: (containerInstance) => {
				const targetService = Registry.getService(target.constructor);
				if (targetService?.instanceOf && ['global'].includes(targetService.instanceOf)) {
					throw new DIErrorInject(
						`${(target as Constructable<unknown>).constructor.name} -> ${propertyName.toString()} -> Request is not allowed here`,
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

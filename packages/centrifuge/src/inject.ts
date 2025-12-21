import { DIErrorInject, resolveToTypeWrapper, Constructable, Func, Registry } from '@fw/common';

export function UseCentrifuge(): Func {
	return function (target: object, propertyName: string | symbol, index?: number): void {
		const typeWrapper = resolveToTypeWrapper(undefined, target, propertyName, index);
		if (
			typeWrapper === undefined ||
			typeWrapper.eagerType === undefined ||
			typeWrapper.eagerType === Object ||
			typeWrapper.eagerType?.['name'] !== 'Centrifuge'
		) {
			throw new DIErrorInject(`${(target as Constructable<unknown>).constructor.name} -> ${propertyName.toString()}`);
		}

		Registry.registerHandler({
			object: target as Constructable<unknown>,
			propertyName: propertyName as string,
			index: index,
			value: (containerInstance) => {
				const targetService = Registry.getService(target.constructor);
				if (targetService?.instanceOf && !['socket'].includes(targetService.instanceOf)) {
					throw new DIErrorInject(
						`${(target as Constructable<unknown>).constructor.name} -> ${propertyName.toString()} -> Centrifugo is allowed only in socket service`,
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

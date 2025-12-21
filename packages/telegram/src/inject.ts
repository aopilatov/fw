import { DIErrorInject, resolveToTypeWrapper, Constructable, Func, Registry } from '@fw/common';

export function UseTelegram(): Func {
	return function (target: object, propertyName: string | symbol, index?: number): void {
		const typeWrapper = resolveToTypeWrapper(undefined, target, propertyName, index);
		if (
			typeWrapper === undefined ||
			typeWrapper.eagerType === undefined ||
			typeWrapper.eagerType === Object ||
			!['TelegramApi', 'TelegramMtproto'].includes(typeWrapper.eagerType?.['name'])
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
						`${(target as Constructable<unknown>).constructor.name} -> ${propertyName.toString()} -> Telegram is allowed only in actions`,
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

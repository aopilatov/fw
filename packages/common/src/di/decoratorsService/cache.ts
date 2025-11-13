import { Registry } from '../registry';
import { Cache as BaseClass } from '../types/services/cache';
import { Constructable, EMPTY_VALUE, ServiceOptions, Token, Func } from '../types/types';

export function Cache<T = unknown>(): Func;
export function Cache<T = unknown>(token: Token<unknown>): Func;
export function Cache<T = unknown>(options?: ServiceOptions<T>): Func;
export function Cache<T = unknown>(optionsOrServiceIdentifier?: ServiceOptions<T> | Token<T> | string): ClassDecorator {
	return (targetConstructor) => {
		const serviceMetadata: BaseClass<T> = {
			id: targetConstructor,
			instanceOf: 'cache',
			scope: 'container',
			type: targetConstructor as unknown as Constructable<T>,
			factory: undefined,
			value: EMPTY_VALUE,
		};

		if (optionsOrServiceIdentifier instanceof Token) {
			serviceMetadata.id = optionsOrServiceIdentifier;
		} else if (optionsOrServiceIdentifier) {
			serviceMetadata.id = (optionsOrServiceIdentifier as BaseClass).id || targetConstructor;
			serviceMetadata.factory = (optionsOrServiceIdentifier as BaseClass).factory || undefined;
		}

		Registry.set<T>('cache', serviceMetadata);

		if (typeof targetConstructor.prototype['registerAsync'] === 'function') {
			Registry.get(Registry.getGlobalContainer(), 'cache', targetConstructor);
			Registry.addAsyncRegistrator(targetConstructor.prototype['registerAsync'].bind(targetConstructor.prototype));
		}
	};
}

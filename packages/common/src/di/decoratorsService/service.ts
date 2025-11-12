import { Registry } from '../registry';
import { Service as BaseClass } from '../types/services/service';
import { Constructable, EMPTY_VALUE, ServiceOptions, Token, Func } from '../types/types';

export function Service<T = unknown>(): Func;
export function Service<T = unknown>(token: Token<unknown>): Func;
export function Service<T = unknown>(options?: ServiceOptions<T>): Func;
export function Service<T = unknown>(optionsOrServiceIdentifier?: ServiceOptions<T> | Token<T> | string): ClassDecorator {
	return (targetConstructor) => {
		const serviceMetadata: BaseClass<T> = {
			id: targetConstructor,
			instanceOf: 'service',
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

		if (typeof targetConstructor.prototype['registerAsync'] === 'function') {
			Registry.addAsyncRegistrator(targetConstructor.prototype['registerAsync']);
		}

		Registry.set<T>('service', serviceMetadata);
	};
}

import { Registry } from '../registry';
import { SystemService as BaseClass } from '../types/services/system';
import { Constructable, EMPTY_VALUE, ServiceOptions, Token, Func } from '../types/types';

export function SystemService<T = unknown>(): Func;
export function SystemService<T = unknown>(token: Token<unknown>): Func;
export function SystemService<T = unknown>(options?: ServiceOptions<T>): Func;
export function SystemService<T = unknown>(optionsOrServiceIdentifier?: ServiceOptions<T> | Token<T> | string): ClassDecorator {
	return (targetConstructor) => {
		const serviceMetadata: BaseClass<T> = {
			id: targetConstructor,
			instanceOf: 'system',
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
			Registry.addAsyncRegistrator(targetConstructor.prototype['registerAsync'].bind(targetConstructor.prototype));
		}

		Registry.set<T>('system', serviceMetadata);
	};
}

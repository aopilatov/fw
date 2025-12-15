import { Registry } from '../registry';
import { Socket as BaseClass } from '../types/services/socket';
import { Constructable, EMPTY_VALUE, ServiceOptions, Token, Func } from '../types/types';

export function Socket<T = unknown>(): Func;
export function Socket<T = unknown>(token: Token<unknown>): Func;
export function Socket<T = unknown>(options?: ServiceOptions<T>): Func;
export function Socket<T = unknown>(optionsOrServiceIdentifier?: ServiceOptions<T> | Token<T> | string): ClassDecorator {
	return (targetConstructor) => {
		const serviceMetadata: BaseClass<T> = {
			id: targetConstructor,
			instanceOf: 'socket',
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

		Registry.set<T>('socket', serviceMetadata);

		if (typeof targetConstructor.prototype['registerAsync'] === 'function') {
			Registry.addAsyncRegistrator(targetConstructor.prototype['registerAsync'].bind(targetConstructor.prototype));
		}
	};
}

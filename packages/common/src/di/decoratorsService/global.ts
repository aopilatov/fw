import { Registry } from '../registry';
import { GlobalService as BaseClass } from '../types/services/global';
import { Constructable, EMPTY_VALUE, ServiceOptions, Token, Func } from '../types/types';

export function GlobalService<T = unknown>(): Func;
export function GlobalService<T = unknown>(token: Token<unknown>): Func;
export function GlobalService<T = unknown>(options?: ServiceOptions<T>): Func;
export function GlobalService<T = unknown>(optionsOrServiceIdentifier?: ServiceOptions<T> | Token<T> | string): ClassDecorator {
	return (targetConstructor) => {
		const serviceMetadata: BaseClass<T> = {
			id: targetConstructor,
			instanceOf: 'global',
			scope: 'singleton',
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

		Registry.set<T>('global', serviceMetadata);
	};
}

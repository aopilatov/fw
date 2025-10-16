import { Registry } from '../registry';
import { ValidationService as BaseClass } from '../types/services/validation';
import { Constructable, EMPTY_VALUE, ServiceOptions, Token, Func } from '../types/types';

export function ValidationService<T = unknown>(): Func;
export function ValidationService<T = unknown>(token: Token<unknown>): Func;
export function ValidationService<T = unknown>(options?: ServiceOptions<T>): Func;
export function ValidationService<T = unknown>(optionsOrServiceIdentifier?: ServiceOptions<T> | Token<T> | string): ClassDecorator {
	return (targetConstructor) => {
		const serviceMetadata: BaseClass<T> = {
			id: targetConstructor,
			instanceOf: 'validation',
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

		Registry.set<T>('validation', serviceMetadata);
	};
}

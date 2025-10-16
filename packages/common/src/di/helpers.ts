import { Token } from './types/types';
import { Constructable } from './types/types';
import { ServiceIdentifier } from './types/types';

export function resolveToTypeWrapper(
	typeOrIdentifier: ((type?: never) => Constructable<unknown>) | ServiceIdentifier<unknown> | undefined,
	target: object,
	propertyName: string | symbol,
	index?: number,
): { eagerType: ServiceIdentifier | null; lazyType: (type?: never) => ServiceIdentifier } {
	let typeWrapper!: { eagerType: ServiceIdentifier | null; lazyType: (type?: never) => ServiceIdentifier };

	if ((typeOrIdentifier && typeof typeOrIdentifier === 'string') || typeOrIdentifier instanceof Token) {
		typeWrapper = { eagerType: typeOrIdentifier, lazyType: () => typeOrIdentifier };
	}

	if (typeOrIdentifier && typeof typeOrIdentifier === 'function') {
		typeWrapper = { eagerType: null, lazyType: () => (typeOrIdentifier as CallableFunction)() };
	}

	if (!typeOrIdentifier && propertyName) {
		const identifier = (Reflect as any).getMetadata('design:type', target, propertyName);

		typeWrapper = { eagerType: identifier, lazyType: () => identifier };
	}

	if (!typeOrIdentifier && typeof index == 'number' && Number.isInteger(index)) {
		const paramTypes: ServiceIdentifier[] = (Reflect as any).getMetadata('design:paramtypes', target, propertyName);
		const identifier = paramTypes?.[index];

		typeWrapper = { eagerType: identifier, lazyType: () => identifier };
	}

	return typeWrapper;
}

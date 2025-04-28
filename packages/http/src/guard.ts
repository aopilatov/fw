import { invoke } from 'es-toolkit/compat';

import type { GuardCallback, ServerRequest } from './types';

const KEYWORD_METADATA = 'guards';

export async function executeGuards(controllerClass: CallableFunction, cb: CallableFunction, req: ServerRequest): Promise<boolean> {
	const guardsMap: Map<string, GuardCallback[]> = Reflect.getMetadata(KEYWORD_METADATA, controllerClass.constructor) || new Map();
	const guards = [...(guardsMap.get('constructor') || []), ...(guardsMap.get(cb.name) || [])];

	if (guards.length) {
		for (const guard of guards) {
			const result = await invoke(guard, '', [req]);
			if (!result) return false;
		}
	}

	return true;
}

export function Guard(...guards: GuardCallback[]) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return (target: any, prop?: string, descriptor?: TypedPropertyDescriptor<unknown>) => {
		if (prop && descriptor) {
			// method
			const map = Reflect.hasMetadata(KEYWORD_METADATA, target.constructor)
				? (Reflect.getMetadata(KEYWORD_METADATA, target.constructor) as Map<string, GuardCallback[]>)
				: new Map<string, GuardCallback[]>();

			if (map.has(prop)) {
				const guardsExisting = map.get(prop) || [];
				map.set(prop, [...guardsExisting, ...guards]);
			} else {
				map.set(prop, guards);
			}

			Reflect.defineMetadata(KEYWORD_METADATA, map, target.constructor);
		} else {
			// class
			const map = Reflect.hasMetadata(KEYWORD_METADATA, target)
				? (Reflect.getMetadata(KEYWORD_METADATA, target) as Map<string, GuardCallback[]>)
				: new Map<string, GuardCallback[]>();

			if (map.has('constructor')) {
				const guardsExisting = map.get('constructor') || [];
				map.set('constructor', [...guardsExisting, ...guards]);
			} else {
				map.set('constructor', guards);
			}

			Reflect.defineMetadata(KEYWORD_METADATA, map, target);
		}
	};
}

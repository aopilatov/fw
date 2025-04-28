import { ClassConstructor } from 'class-transformer';
import { FastifyContextConfig, FastifySchema } from 'fastify';

import { Router } from './router';
import { RouteMethod, EndpointMetadata, EndpointReply, ServerRequest } from './types';

export const KEYWORD_ENDPOINTS = 'endpoints';

export function Controller(prefix: string) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return (target: ClassConstructor<any>) => {
		Router.register(prefix, target);
		return target;
	};
}

export function Endpoint(method: RouteMethod, endpoint: string, definition: FastifySchema, config?: FastifyContextConfig) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return (target: any, prop: string, descriptor: TypedPropertyDescriptor<(request: ServerRequest<any>) => Promise<EndpointReply<any>>>) => {
		if (prop && descriptor) {
			const map = Reflect.hasMetadata(KEYWORD_ENDPOINTS, target.constructor)
				? (Reflect.getMetadata(KEYWORD_ENDPOINTS, target.constructor) as Map<string, EndpointMetadata>)
				: new Map<string, EndpointMetadata>();

			map.set(prop, { method, endpoint, definition, config });
			Reflect.defineMetadata(KEYWORD_ENDPOINTS, map, target.constructor);

			return target;
		}

		throw new Error('"Endpoint" decorator could be used only for methods');
	};
}

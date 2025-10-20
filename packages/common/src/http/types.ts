import http2 from 'node:http2';

import { FastifyRequest, FastifyReply, FastifySchema, FastifyContextConfig, FastifyInstance, RouteGenericInterface } from 'fastify';

export type ServerInstance = FastifyInstance<http2.Http2SecureServer, http2.Http2ServerRequest, http2.Http2ServerResponse>;
export type ServerRequest<T extends RouteGenericInterface = RouteGenericInterface> = FastifyRequest<T, http2.Http2SecureServer>;
export type ServerResponse = FastifyReply<RouteGenericInterface, http2.Http2SecureServer>;

export type ErrorHandler = (err: unknown, req: ServerRequest, res: ServerResponse) => Promise<void> | void;
export type OnStartup = (name: string) => Promise<void> | void;

export type MiddlewareHookEvent =
	| 'onRequest'
	| 'preParsing'
	| 'preValidation'
	| 'preHandler'
	| 'preSerialization'
	| 'onSend'
	| 'onResponse'
	| 'onError'
	| 'onTimeout';

export type MiddlewareCallback = (req: ServerRequest, res: ServerResponse) => Promise<void>;
export interface MiddlewareEvent {
	cb: MiddlewareCallback;
	event: MiddlewareHookEvent;
}

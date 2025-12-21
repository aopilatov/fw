import http2 from 'node:http2';

import { FastifyRequest, FastifyReply, FastifyContextConfig, FastifyInstance, RouteGenericInterface } from 'fastify';

export type RouteMethod = 'ALL' | 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
export type RouteFunc = (req: ServerRequest, res: ServerResponse) => Promise<RouteReply>;
export type GuardCallback = (req: ServerRequest) => boolean | Promise<boolean>;

export type ServerInstance = FastifyInstance<http2.Http2SecureServer, http2.Http2ServerRequest, http2.Http2ServerResponse>;
export type ServerRequest<T extends RouteGenericInterface = RouteGenericInterface> = FastifyRequest<T, http2.Http2SecureServer>;
export type ServerResponse = FastifyReply<RouteGenericInterface, http2.Http2SecureServer>;

export type ErrorHandler = (err: unknown, req: ServerRequest, res: ServerResponse) => Promise<void> | void;
export type OnStartup = (name: string) => Promise<void> | void;
export type RequestCallback = (req: ServerRequest, res: ServerResponse) => Promise<void>;

export type Route = {
	enabled: boolean;
	route: string;
	method: RouteMethod;
	func: RouteFunc;
	guards?: GuardCallback[];
	config?: FastifyContextConfig;
};

export interface RouteReply<T = unknown> {
	statusCode: number;
	body: T;
	headers?: Record<string, string>;
	cookies?: {
		name: string;
		value: string;
		domain?: string;
		options?: {
			ageInMs?: number;
		};
	};
}

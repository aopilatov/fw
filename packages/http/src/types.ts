import http2 from 'node:http2';

import { FastifyRequest, FastifyReply, FastifySchema, FastifyContextConfig, FastifyInstance, RouteGenericInterface } from 'fastify';

export type ServerInstance = FastifyInstance<http2.Http2SecureServer, http2.Http2ServerRequest, http2.Http2ServerResponse>;
export type ServerRequest<T extends RouteGenericInterface = RouteGenericInterface> = FastifyRequest<T, http2.Http2SecureServer>;
export type ServerResponse = FastifyReply<RouteGenericInterface, http2.Http2SecureServer>;

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

export type RouteMethod = 'ALL' | 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
export type GuardCallback = (req: ServerRequest) => boolean | Promise<boolean>;

export interface EndpointReply<T = unknown> {
	statusCode: number;
	body: T;
	headers?: Record<string, string>;
	cookies?:
		| string
		| {
				name: string;
				value: string;
				domain?: string;
				options?: {
					ageInMs?: number;
				};
		  };
}

export interface EndpointMetadata {
	method: RouteMethod;
	endpoint: string;
	definition: FastifySchema;
	config?: FastifyContextConfig;
}

export interface CookieData {
	name: string;
	value: string;
}

export enum Device {
	WEB = 'WEB',
	TELEGRAM = 'TG',
	OPERA_MINI_APP = 'OPERA_MINI_APP',
}

export type UserAgent = {
	device: Device;
	platform: 'unknown' | 'tdesktop' | string;
	lang: string;
	languageBasedOnCountry: string;
	userAgent: string;
	isMobile: boolean;
	isTablet: boolean;
	isDesktop: boolean;
	isInAppBrowser: boolean;
	os: string;
	osVersion: string;
	country?: string;
};

import 'reflect-metadata';
import crypto from 'node:crypto';

import cookie, { FastifyCookieOptions } from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import middie from '@fastify/middie';
import FastifyOtelInstrumentation from '@fastify/otel';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { set } from 'es-toolkit/compat';
import { fastify } from 'fastify';
import fastifyIp from 'fastify-ip';
import metrics from 'fastify-metrics';
import { Container } from 'typedi';
import { UAParser, IResult } from 'ua-parser-js';

import { RequestLike } from '@fw/common';
import { loggerConfig } from '@fw/logger';
import { sdk } from '@fw/telemetry';

import { certExample, keyExample } from './consts';
import { applyHooks } from './middleware';
import { Router } from './router';
import { ServerInstance, ServerRequest, ServerResponse } from './types';

declare module 'fastify' {
	interface FastifyRequest {
		userAgent: IResult;
		country: string;
		referer: string | undefined;
		user?: unknown;
		auth?: {
			model: unknown;
			token: Record<string, unknown>;
		};
	}
}

let serverIsReady: boolean = false;

export async function createHttpServer(
	name: string,
	params?: {
		useUnsafe?: boolean;
		origin?: string[];
		bodyLimit?: number;
		contentType?: 'json'[];
		customErrorHandler?: (err: unknown, req: ServerRequest, res: ServerResponse) => Promise<void> | void;
		onStartup?: (name: string) => Promise<void> | void;
		host?: string;
		port?: number;
		maxConcurrentRequests?: number;
		key?: string;
		cert?: string;
		secret?: string;
	},
): Promise<ServerInstance> {
	const server: ServerInstance = fastify({
		ignoreTrailingSlash: true,
		logger: loggerConfig,
		requestTimeout: 10000,
		maxParamLength: 256,
		bodyLimit: params?.bodyLimit || 1048576,
		disableRequestLogging: true,
		http2: true,
		https: {
			allowHTTP1: true,
			key: params?.key || keyExample,
			cert: params?.cert || certExample,
		},
		genReqId: (req) => crypto.randomUUID(),
	});

	const fastifyOtelInstrumentation = new FastifyOtelInstrumentation({ servername: name });
	fastifyOtelInstrumentation.setTracerProvider(sdk['_tracerProvider']);
	server.register(fastifyOtelInstrumentation.plugin());

	server.register(cookie, { secret: params?.secret || 'unsafe' });
	server.register(fastifyIp, {
		order: ['x-origin-cf-connecting-ip', 'cf-connecting-ip'],
	});

	if (params?.origin?.length) {
		server.register(helmet);
		server.register(cors, {
			origin: params.origin,
			methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
			credentials: true,
		});
	} else {
		server.register(swagger, {
			swagger: {
				consumes: ['application/json'],
				produces: ['application/json'],
			},
		});
		server.register(swaggerUi, { routePrefix: '/swagger' });
	}

	server.register(metrics, { endpoint: '/metrics' });
	server.register(middie).after(() => {
		applyHooks(server);
	});

	if (params?.contentType?.includes('json')) {
		server.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
			try {
				done(null, JSON.parse(body.toString('utf8')));
			} catch (e: unknown) {
				const err = e as Error;
				set(err, 'statusCode', 400);
				done(err, undefined);
			}
		});
	}

	if (params?.customErrorHandler) {
		server.setErrorHandler(params.customErrorHandler);
	}

	let activeRequests = 0;

	server.addHook('preHandler', async (req, res) => {
		if (params?.maxConcurrentRequests && activeRequests >= params.maxConcurrentRequests) {
			res.code(503).send({ error: 'Server too busy, try again later' });
			return res;
		}

		activeRequests++;
	});

	server.addHook('onRequest', async (request, reply) => {
		let country = request.headers?.['x-origin-cf-ipcountry'] as string;
		if (!country) country = request.headers?.['cf-ipcountry'] as string;
		if (!country) country = 'zz';

		let referer = request.headers?.['origin'];
		if (!referer) referer = request.headers?.['referer'];
		if (!referer) referer = undefined;

		request.country = country;
		request.referer = referer;
		request.userAgent = UAParser(request.headers['user-agent']);
		Container.of(request.id).set(RequestLike, new RequestLike(request.id));
	});

	server.addHook('onResponse', async (request, reply) => {
		Container.reset(request.id);
		activeRequests--;
	});

	server.get('/_/readiness', (req, res) => {
		if (params?.maxConcurrentRequests && activeRequests >= params.maxConcurrentRequests) {
			return res.code(503).send('busy');
		}

		if (serverIsReady) {
			return res.code(200).send('ok');
		}

		return res.code(500).send('not ok');
	});

	server.addHook('onListen', async () => {
		serverIsReady = true;
	});

	Router.apply(server);

	if (params?.onStartup) {
		await params.onStartup(name);
	}

	if (!params?.origin?.length) {
		// eslint-disable-next-line no-console
		console.info(server.printRoutes());
	}

	server.listen({ host: params?.host || '0.0.0.0', port: params?.port || 3000 }, (err: Error | null, address: string) => {
		if (err) throw new Error(`Can not start server: ${err?.message ?? 'not detected'}`);
		// eslint-disable-next-line no-console
		console.info(`Server started at ${address}`);
	});

	return server;
}

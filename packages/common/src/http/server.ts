import crypto from 'node:crypto';

import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import middie from '@fastify/middie';
import { LogLevel } from '@logtape/logtape/src/level';
import { set } from 'es-toolkit/compat';
import { fastify, FastifyContextConfig } from 'fastify';
import fastifyIp from 'fastify-ip';
import { UAParser, IResult } from 'ua-parser-js';

import { Container } from '../di';
import { Logger } from '../logger';

import { certExample, keyExample } from './consts';
import { ForbiddenError } from './errors';
import {
	ErrorHandler,
	GuardCallback,
	MiddlewareEvent,
	OnStartup,
	Route,
	RouteFunc,
	RouteMethod,
	ServerInstance,
	ServerRequest,
	ServerResponse,
} from './types';

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

export class Server {
	private static name: string = 'server';
	private static isDev: boolean = true;
	private static isInitialized: boolean = false;
	private static isReady: boolean = false;
	private static activeRequests: number = 0;

	private static readonly hooks: MiddlewareEvent[] = [];
	private static readonly routes: Route[] = [];

	private static bodyLimit: number = 1048576;
	private static host: string = '0.0.0.0';
	private static port: number = 3000;
	private static maxConcurrentRequests?: number;
	private static cookieSecret: string = 'unsafe';
	private static cookieDomain?: string;
	private static certificate: string = certExample;
	private static certificateKey: string = keyExample;
	private static errorHandler?: ErrorHandler;
	private static onStartup?: OnStartup;
	private static readonly origin: string[] = [];
	private static readonly contentType: string[] = [];
	private static readonly customIpHeaders: string[] = [];
	private static readonly customCountryHeaders: string[] = [];

	public static setName(name: string): Server {
		this.name = name;
		return this;
	}

	public static setIsDev(isDev: boolean): Server {
		this.isDev = isDev;
		return this;
	}

	public static addHook(hook: MiddlewareEvent): Server {
		this.hooks.push(hook);
		return this;
	}

	public static addRoute(route: string, method: RouteMethod, func: RouteFunc): Server;
	public static addRoute(route: string, method: RouteMethod, enabled: boolean, func: RouteFunc): Server;
	public static addRoute(route: string, method: RouteMethod, guards: GuardCallback | GuardCallback[], func: RouteFunc): Server;
	public static addRoute(
		route: string,
		method: RouteMethod,
		enabled: boolean,
		guards: GuardCallback | GuardCallback[],
		func: RouteFunc,
	): Server;
	public static addRoute(route: string, method: RouteMethod, config: FastifyContextConfig, func: RouteFunc): Server;
	public static addRoute(route: string, method: RouteMethod, enabled: boolean, config: FastifyContextConfig, func: RouteFunc): Server;
	public static addRoute(
		route: string,
		method: RouteMethod,
		guards: GuardCallback | GuardCallback[],
		config: FastifyContextConfig,
		func: RouteFunc,
	): Server;
	public static addRoute(
		route: string,
		method: RouteMethod,
		enabled: boolean,
		guards: GuardCallback | GuardCallback[],
		config: FastifyContextConfig,
		func: RouteFunc,
	): Server;
	public static addRoute(
		route: string,
		method: RouteMethod,
		enabledOrGuardsOrConfigOrFunc?: boolean | GuardCallback | GuardCallback[] | FastifyContextConfig | RouteFunc,
		guardsOrConfigOrFunc?: GuardCallback | GuardCallback[] | FastifyContextConfig | RouteFunc,
		configOrFunc?: FastifyContextConfig | RouteFunc,
		funcToExecute?: RouteFunc,
	): Server {
		const routeObj: Route = {
			route,
			method,
			enabled: true,
			config: undefined,
			func: async (req, res) => {
				return { statusCode: 200, body: 'ok' };
			},
		};

		if (Array.isArray(enabledOrGuardsOrConfigOrFunc)) {
			routeObj.guards = enabledOrGuardsOrConfigOrFunc;
		} else if (typeof enabledOrGuardsOrConfigOrFunc === 'boolean') {
			routeObj.enabled = enabledOrGuardsOrConfigOrFunc;
		} else if (typeof enabledOrGuardsOrConfigOrFunc === 'object') {
			routeObj.config = enabledOrGuardsOrConfigOrFunc;
		} else if (Server.funcIsGuardCallback(enabledOrGuardsOrConfigOrFunc)) {
			routeObj.guards = [enabledOrGuardsOrConfigOrFunc];
		} else if (Server.funcIsRouteFunc(enabledOrGuardsOrConfigOrFunc)) {
			routeObj.func = enabledOrGuardsOrConfigOrFunc;
		}

		if (guardsOrConfigOrFunc) {
			if (Array.isArray(guardsOrConfigOrFunc)) {
				routeObj.guards = guardsOrConfigOrFunc;
			} else if (typeof guardsOrConfigOrFunc === 'object') {
				routeObj.config = guardsOrConfigOrFunc;
			} else if (Server.funcIsGuardCallback(guardsOrConfigOrFunc)) {
				routeObj.guards = [guardsOrConfigOrFunc];
			} else if (Server.funcIsRouteFunc(guardsOrConfigOrFunc)) {
				routeObj.func = guardsOrConfigOrFunc;
			}
		}

		if (configOrFunc) {
			if (typeof configOrFunc === 'object') {
				routeObj.config = configOrFunc;
			} else if (Server.funcIsRouteFunc(configOrFunc)) {
				routeObj.func = configOrFunc;
			}
		}

		if (funcToExecute) {
			routeObj.func = funcToExecute;
		}

		Server.routes.push(routeObj);
		return this;
	}

	public static setBodyLimit(bodyLimit: number): Server {
		this.bodyLimit = bodyLimit;
		return this;
	}

	public static setHost(host: string): Server {
		this.host = host;
		return this;
	}

	public static setPort(port: number): Server {
		this.port = port;
		return this;
	}

	public static setMaxConcurrentRequests(maxConcurrentRequests: number): Server {
		this.maxConcurrentRequests = maxConcurrentRequests;
		return this;
	}

	public static setCookieSecret(cookieSecret: string): Server {
		this.cookieSecret = cookieSecret;
		return this;
	}

	public static setCookieDomain(cookieDomain: string): Server {
		this.cookieDomain = cookieDomain;
		return this;
	}

	public static setCertificate(certificate: string): Server {
		this.certificate = certificate;
		return this;
	}

	public static setCertificateKey(certificateKey: string): Server {
		this.certificateKey = certificateKey;
		return this;
	}

	public static setErrorHandler(errorHandler: ErrorHandler): Server {
		this.errorHandler = errorHandler;
		return this;
	}

	public static setOnStartup(onStartup: OnStartup): Server {
		this.onStartup = onStartup;
		return this;
	}

	public static addOrigin(address: string): Server {
		this.origin.push(address);
		return this;
	}

	public static addContentType(contentType: 'json'): Server {
		this.contentType.push(contentType);
		return this;
	}

	public static addCustomIpHeader(headerName: string): Server {
		this.customIpHeaders.push(headerName);
		return this;
	}

	public static addCustomCountryHeader(headerName: string): Server {
		this.customCountryHeaders.push(headerName);
		return this;
	}

	public static async start(): Promise<ServerInstance> {
		if (this.isInitialized) throw new Error('Server is already initialized');
		this.isInitialized = true;

		let logLevel: LogLevel = 'info';
		if (process.env?.LOG_LEVEL) {
			logLevel = process.env.LOG_LEVEL as LogLevel;
		}

		Container.get(Logger).config({
			appName: this.name,
			lowestLevel: logLevel,
			prettify: this.isDev,
		});

		const server: ServerInstance = fastify({
			ignoreTrailingSlash: true,
			logger: false,
			requestTimeout: 10000,
			maxParamLength: 256,
			bodyLimit: this.bodyLimit,
			disableRequestLogging: true,
			http2: true,
			https: {
				allowHTTP1: true,
				key: this.certificateKey,
				cert: this.certificate,
			},
			genReqId: (req) => crypto.randomUUID(),
		});

		server.register(cookie, { secret: this.cookieSecret });
		server.register(fastifyIp, {
			order: this.customIpHeaders,
		});

		if (this.origin.length) {
			server.register(helmet);
			server.register(cors, {
				origin: this.origin,
				methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
				credentials: true,
			});
		}

		if (Server.hooks.length) {
			server.register(middie).after(() => {
				for (const hook of Server.hooks) {
					server.addHook(hook.event, hook.cb as unknown as () => void);
				}
			});
		}

		if (this?.contentType?.includes('json')) {
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

		if (this?.errorHandler) {
			server.setErrorHandler(this.errorHandler);
		}

		server.addHook('preHandler', async (req, res) => {
			if (this?.maxConcurrentRequests && this.activeRequests >= this?.maxConcurrentRequests) {
				res.code(503).send({ error: 'Server too busy, try again later' });
				return res;
			}

			this.activeRequests++;
		});

		server.addHook('onRequest', async (request, reply) => {
			let country!: string;
			for (const header of this.customCountryHeaders) {
				if (!country) country = request.headers?.[header] as string;
			}
			if (!country) country = 'zz';

			let referer = request.headers?.['origin'];
			if (!referer) referer = request.headers?.['referer'];
			if (!referer) referer = undefined;

			request.country = country;
			request.referer = referer;
			request.userAgent = UAParser(request.headers['user-agent']);
		});

		server.addHook('onResponse', async (request, reply) => {
			Container.reset(request.id);
			this.activeRequests--;
		});

		server.get('/', (req, res) => {
			this.isServerReady(req, res);
		});

		server.get('/_/readiness', (req, res) => {
			this.isServerReady(req, res);
		});

		server.addHook('onListen', async () => {
			this.isReady = true;
		});

		Server.registerRoutes(server);

		if (!!this?.onStartup) {
			await this.onStartup(this.name);
		}

		if (this.isDev) {
			Container.get(Logger).get().info(server.printRoutes());
		}

		server.listen({ host: this.host, port: this.port }, (err: Error | null, address: string) => {
			if (err) throw new Error(`Can not start server: ${err?.message ?? 'not detected'}`);
			Container.get(Logger).get().info(`Server started at ${address}`);
		});

		return server;
	}

	private static isServerReady(req: ServerRequest, res: ServerResponse) {
		if (this?.maxConcurrentRequests && this.activeRequests >= this.maxConcurrentRequests) {
			return res.code(503).send('busy');
		}

		if (this.isReady) {
			return res.code(200).send('ok');
		}

		return res.code(500).send('not ok');
	}

	private static registerRoutes(server: ServerInstance) {
		for (const route of Server.routes) {
			server.route({
				method: route.method.toLowerCase(),
				url: route.route,
				config: route.config,
				handler: async (req: ServerRequest, res: ServerResponse) => {
					if (route?.guards?.length) {
						for (const guard of route.guards) {
							const result = await guard(req);
							if (!result) throw new ForbiddenError('You are not allowed');
						}
					}

					const answer = await route.func(req, res);
					if (answer?.headers) res.headers(answer.headers);
					if (answer?.cookies) {
						if (answer.cookies.value === 'delete') {
							res.clearCookie(`${answer.cookies.name}-${Server?.cookieDomain || 'local'}`);
						} else {
							res.setCookie(`${answer.cookies.name}-${Server?.cookieDomain || 'local'}`, answer.cookies.value, {
								httpOnly: true,
								secure: true,
								path: '/',
								domain: Server?.cookieDomain ?? undefined,
								maxAge: answer.cookies?.options?.ageInMs || 3600,
								sameSite: 'none',
							});
						}
					}

					res.code(answer.statusCode);
					return res.send(answer.body);
				},
			});
		}
	}

	private static funcIsGuardCallback(fnc: unknown): fnc is GuardCallback {
		if (typeof fnc !== 'function') return false;
		return fnc.length === 1;
	}

	private static funcIsRouteFunc(fnc: unknown): fnc is GuardCallback {
		if (typeof fnc !== 'function') return false;
		return fnc.length === 2;
	}
}

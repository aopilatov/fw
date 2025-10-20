import crypto from 'node:crypto';

import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import middie from '@fastify/middie';
import { set } from 'es-toolkit/compat';
import { fastify } from 'fastify';
import fastifyIp from 'fastify-ip';
import { Container } from 'typedi';

import { certExample, keyExample } from './consts';
import { applyHooks } from './middleware';
import { ErrorHandler, OnStartup, ServerInstance } from './types';

export class Server {
	private name: string;
	private bodyLimit: number = 1048576;
	private host: string = '0.0.0.0';
	private port: number = 3000;
	private maxConcurrentRequests: number;
	private cookieSecret: string = 'unsafe';
	private cookieDomain: string;
	private certificate: string = certExample;
	private certificateKey: string = keyExample;
	private errorHandler: ErrorHandler;
	private onStartup: OnStartup;
	private readonly origin: string[] = [];
	private readonly contentType: string[] = [];

	public setName(name: string): Server {
		this.name = name;
		return this;
	}

	public setBodyLimit(bodyLimit: number): Server {
		this.bodyLimit = bodyLimit;
		return this;
	}

	public setHost(host: string): Server {
		this.host = host;
		return this;
	}

	public setPort(port: number): Server {
		this.port = port;
		return this;
	}

	public setMaxConcurrentRequests(maxConcurrentRequests: number): Server {
		this.maxConcurrentRequests = maxConcurrentRequests;
		return this;
	}

	public setCookieSecret(cookieSecret: string): Server {
		this.cookieSecret = cookieSecret;
		return this;
	}

	public setCookieDomain(cookieDomain: string): Server {
		this.cookieDomain = cookieDomain;
		return this;
	}

	public setCertificate(certificate: string): Server {
		this.certificate = certificate;
		return this;
	}

	public setCertificateKey(certificateKey: string): Server {
		this.certificateKey = certificateKey;
		return this;
	}

	public setErrorHandler(errorHandler: ErrorHandler): Server {
		this.errorHandler = errorHandler;
		return this;
	}

	public setOnStartup(onStartup: OnStartup): Server {
		this.onStartup = onStartup;
		return this;
	}

	public addOrigin(address: string): Server {
		this.origin.push(address);
		return this;
	}

	public addContentType(contentType: 'json'): Server {
		this.contentType.push(contentType);
		return this;
	}

	public start(): void {
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
			order: ['cf-connecting-ip'],
		});

		if (this.origin.length) {
			server.register(helmet);
			server.register(cors, {
				origin: this.origin,
				methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
				credentials: true,
			});
		}

		server.register(middie).after(() => {
			applyHooks(server);
		});

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

		if (this.errorHandler) {
			server.setErrorHandler(this.errorHandler);
		}

		let activeRequests = 0;

		server.addHook('preHandler', async (req, res) => {
			if (this.maxConcurrentRequests && activeRequests >= this.maxConcurrentRequests) {
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
	}
}

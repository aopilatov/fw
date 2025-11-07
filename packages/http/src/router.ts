import { ClassConstructor } from 'class-transformer';
import { invoke, get } from 'es-toolkit/compat';

import { KEYWORD_ENDPOINTS } from './controller';
import { ForbiddenError } from './errors';
import { executeGuards } from './guard';
import { EndpointMetadata, EndpointReply, ServerInstance, ServerRequest, ServerResponse } from './types';

export class Router {
	private static readonly controllers: Map<string, ClassConstructor<CallableFunction>> = new Map();
	private static cookiesDomain: string | undefined = undefined;

	public static register(prefix: string, ControllerClass: ClassConstructor<CallableFunction>): void {
		Router.controllers.set(prefix, ControllerClass);
	}

	public static setCookiesDomain(value: string): void {
		this.cookiesDomain = value;
	}

	public static apply(server: ServerInstance): void {
		const prefixes: string[] = Array.from(Router.controllers.keys());
		for (const prefix of prefixes) {
			Router.registerRoute(server, prefix);
		}
	}

	private static registerRoute(server: ServerInstance, prefix: string): void {
		const ControllerClass = Router.controllers.get(prefix);
		if (!ControllerClass) return;

		const controllerClass = new ControllerClass();
		const controllerEndpoints =
			(Reflect.getMetadata(KEYWORD_ENDPOINTS, get(controllerClass, 'constructor') as unknown as object) as Map<string, EndpointMetadata>) ||
			new Map<string, EndpointMetadata>();

		const controllerEndpointKeys: string[] = Array.from(controllerEndpoints.keys());
		for (const endpoint of controllerEndpointKeys) {
			let endpointPath = controllerEndpoints.get(endpoint)!.endpoint;
			if (!endpointPath.startsWith('/')) endpointPath = `/${endpointPath}`;

			server.route({
				method: controllerEndpoints.get(endpoint)!.method.toLowerCase(),
				url: `${prefix}${endpointPath}`,
				schema: controllerEndpoints.get(endpoint)!.definition,
				config: controllerEndpoints.get(endpoint)!.config,
				handler: async (req: ServerRequest, res: ServerResponse) => {
					const guardsResult = await executeGuards(controllerClass, get(controllerClass, endpoint), req);
					if (!guardsResult) throw new ForbiddenError('You are not allowed');

					const answer = (await invoke(controllerClass, endpoint, [req, res])) as EndpointReply;
					if (answer?.headers) res.headers(answer.headers);
					if (answer?.cookies) {
						if (answer?.cookies) {
							if (typeof answer.cookies === 'string') {
								if (answer.cookies === 'delete') {
									res.clearCookie(`token-auth-${this.cookiesDomain || 'local'}`);
								} else {
									res.setCookie(`token-auth-${this.cookiesDomain || 'local'}`, answer.cookies, {
										httpOnly: true,
										secure: true,
										path: '/',
										domain: this.cookiesDomain ?? undefined,
										maxAge: 3600,
										sameSite: 'none',
									});
								}
							} else {
								const name = `${answer.cookies.name}-${answer?.cookies?.domain || this.cookiesDomain || 'local'}`;
								if (answer.cookies.value === 'delete') {
									res.clearCookie(name);
								} else {
									res.setCookie(name, answer.cookies.value, {
										httpOnly: true,
										secure: true,
										path: '/',
										domain: this.cookiesDomain ?? undefined,
										maxAge: answer.cookies?.options?.ageInMs || 3600,
										sameSite: 'none',
									});
								}
							}
						}
					}

					res.code(answer.statusCode);
					return res.send(answer.body);
				},
			});
		}
	}
}

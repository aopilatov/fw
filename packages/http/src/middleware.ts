import { MiddlewareEvent, MiddlewareCallback, MiddlewareHookEvent, ServerInstance } from './types';

const hooks: MiddlewareEvent[] = [];

export function applyHooks(server: ServerInstance): void {
	hooks.forEach((hookMiddleware) => {
		// @ts-ignore
		server.addHook(hookMiddleware.event, hookMiddleware.cb);
	});
}

export function Hook(event: MiddlewareHookEvent, cb: MiddlewareCallback): void {
	hooks.push({ event, cb });
}

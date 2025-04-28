import { invoke } from 'es-toolkit/compat';
import { DateTime } from 'luxon';
import { LoggerOptions, pino } from 'pino';
import { Container } from 'typedi';

import { LogRecord } from './types';

const LevelToSeverityLookup: Record<string, string | undefined> = {
	trace: 'DEBUG',
	debug: 'DEBUG',
	info: 'INFO',
	warn: 'WARNING',
	error: 'ERROR',
	fatal: 'CRITICAL',
};

function deepMerge(target: object, source: unknown[]) {
	for (const key of Object.keys(source)) {
		if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) && typeof target[key] === 'object') {
			target[key] = deepMerge({ ...target[key] }, source[key]);
		} else {
			target[key] = source[key];
		}
	}
	return target;
}

export const loggerConfig: LoggerOptions = {
	messageKey: 'message',

	timestamp(): string {
		return `,"timestamp":"${DateTime.now().toISO()}"`;
	},

	formatters: {
		log(object: LogRecord): Record<string, unknown> {
			const { trace_id, span_id, trace_flags, ...rest } = object;

			return {
				'logging.googleapis.com/trace': trace_id,
				'logging.googleapis.com/spanId': span_id,
				'logging.googleapis.com/trace_sampled': trace_flags ? trace_flags === '01' : undefined,
				...rest,
			};
		},

		level(label: string) {
			return {
				severity: LevelToSeverityLookup[label] ?? LevelToSeverityLookup['info'],
			};
		},
	},

	hooks: {
		logMethod(args, method) {
			for (const index in args) {
				if (typeof args[index] === 'object' && args[index] instanceof Error) {
					args[index] = {
						message: args[index].message,
						stack: args[index].stack,
					};
				}
			}

			invoke(method, 'call', [this, args]);
		},
	},
};

if (process.env.NODE_ENV === 'development') {
	loggerConfig.transport = {
		target: 'pino-pretty',
		options: {
			colorize: true,
		},
	};
}

const logger = pino({
	...loggerConfig,
	base: null,
});

export const getLogger = (requestId?: string) => {
	const getCustomLogger = () => {
		if (!requestId) return logger;
		return logger.child({ requestId });
	};

	try {
		const serverInstance = Container.get('serverInstance');
		if (serverInstance && requestId) {
			return serverInstance['log'] as pino.Logger;
		}

		return getCustomLogger();
	} catch (e: unknown) {
		return getCustomLogger();
	}
};

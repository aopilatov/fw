import type { LogLevel } from '@logtape/logtape/src/level';

export type LogConfig = {
	lowestLevel?: LogLevel;
	prettify?: boolean;
};

export type LogCallback = (prefix: (message: TemplateStringsArray, ...values: unknown[]) => unknown[]) => unknown[];

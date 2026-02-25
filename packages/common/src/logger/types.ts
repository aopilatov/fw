import type { LogLevel } from '@logtape/logtape';

export type LogConfig = {
	lowestLevel?: LogLevel;
	prettify?: boolean;
};

export type LogCallback = (prefix: (message: TemplateStringsArray, ...values: unknown[]) => unknown[]) => unknown[];

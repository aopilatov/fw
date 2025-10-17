import type { LogLevel } from '@logtape/logtape/src/level';

export type LogConfig = {
	appName: string;
	lowestLevel?: LogLevel;
	prettify?: boolean;
};

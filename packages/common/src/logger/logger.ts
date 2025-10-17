import { configureSync, getConsoleSink, getLogger } from '@logtape/logtape';
import { prettyFormatter } from '@logtape/pretty';

import { GlobalService } from '../di';

import { LoggerError } from './errors';
import { LogConfig } from './types';

@GlobalService()
export class Logger {
	private appName: string;

	public config(config: LogConfig): void {
		this.appName = config.appName;

		configureSync({
			sinks: {
				console: getConsoleSink({
					formatter: config?.prettify ? prettyFormatter : undefined,
				}),
			},
			loggers: [
				{
					category: config.appName,
					sinks: ['console'],
					lowestLevel: config.lowestLevel,
				},
			],
		});
	}

	public get(id?: string) {
		if (!this.appName) {
			throw new LoggerError('Logger is not configured. Call config() method first.');
		}

		const logger = getLogger([this.appName]);

		if (id) {
			return logger.with({ requestId: id });
		}

		return logger;
	}
}

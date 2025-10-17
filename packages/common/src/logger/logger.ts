import { configureSync, getConsoleSink, getLogger } from '@logtape/logtape';
import { prettyFormatter } from '@logtape/pretty';

import { GlobalService } from '../di';

import { LogConfig } from './types';

@GlobalService()
export class Logger {
	private readonly appName: string;

	constructor(config: LogConfig) {
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
		const logger = getLogger([this.appName]);

		if (id) {
			return logger.with({ requestId: id });
		}

		return logger;
	}
}

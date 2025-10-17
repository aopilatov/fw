import { configureSync, getConsoleSink, getLogger } from '@logtape/logtape';
import { prettyFormatter } from '@logtape/pretty';

import type { LogLevel } from '@logtape/logtape/src/level';

export class Logger {
	constructor(
		private readonly appName: string,
		lowestLevel: LogLevel = 'info',
		prettify: boolean = false,
	) {
		configureSync({
			sinks: {
				console: getConsoleSink({
					formatter: prettify ? prettyFormatter : undefined,
				}),
			},
			loggers: [
				{
					category: appName,
					sinks: ['console'],
					lowestLevel,
				},
			],
		});
	}

	public getChild(id: string) {
		return getLogger([this.appName]).getChild([id]);
	}
}

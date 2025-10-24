import { configureSync, getConsoleSink, getLogger } from '@logtape/logtape';
import { prettyFormatter } from '@logtape/pretty';

import { GlobalService, Registry } from '../di';

import { LoggerError } from './errors';
import { LogConfig, LogCallback } from './types';

configureSync({
	sinks: {
		console: getConsoleSink(),
	},
	loggers: [
		{
			category: [],
			sinks: ['console'],
			lowestLevel: 'info',
		},
	],
});

@GlobalService()
export class Logger {
	private appName: string;

	public config(config: LogConfig): void {
		if (this.appName) throw new LoggerError('Logger is already configured.');
		this.appName = config.appName;

		configureSync({
			reset: true,
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

	public trace(message: TemplateStringsArray | string | LogCallback | Record<string, unknown>, ...values: unknown[]): void {
		// @ts-expect-error
		this.get().trace(message, ...values);
	}

	public debug(message: TemplateStringsArray | string | LogCallback | Record<string, unknown>, ...values: unknown[]): void {
		// @ts-expect-error
		this.get().debug(message, ...values);
	}

	public info(message: TemplateStringsArray | string | LogCallback | Record<string, unknown>, ...values: unknown[]): void {
		// @ts-expect-error
		this.get().info(message, ...values);
	}

	public warning(message: TemplateStringsArray | string | LogCallback | Record<string, unknown>, ...values: unknown[]): void {
		// @ts-expect-error
		this.get().warning(message, ...values);
	}

	public error(message: TemplateStringsArray | string | LogCallback | Record<string, unknown>, ...values: unknown[]): void {
		// @ts-expect-error
		this.get().error(message, ...values);
	}

	public fatal(message: TemplateStringsArray | string | LogCallback | Record<string, unknown>, ...values: unknown[]): void {
		// @ts-expect-error
		this.get().fatal(message, ...values);
	}

	private get() {
		const logger = getLogger([this.appName]);

		const contextStore = Registry.context.getStore();
		if (contextStore) {
			return logger.with(contextStore);
		}

		return logger;
	}
}

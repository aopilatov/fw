import { configureSync, getConsoleSink, getLogger, LogRecord } from '@logtape/logtape';
import { getPrettyFormatter } from '@logtape/pretty';
import { isNumberString } from 'class-validator';
import { omit } from 'es-toolkit/object';
import { DateTime } from 'luxon';

import { GlobalService, Registry } from '../di';

import { LogConfig, LogCallback } from './types';

const defaultFormatter = (record: LogRecord) => {
	const textPayload: string[] = [...record.category];
	let jsonPayload: Record<string, unknown> = {};

	const addPayload = (data: unknown, key?: string) => {
		if (typeof data === 'object') {
			let object = data;
			if (object instanceof Error) {
				object = {
					name: object?.['name'] ?? 'Unknown error',
					message: object?.['message'] ?? 'No error message',
					stack: object?.['stack'] ?? 'No stack trace',
				};
			}

			if (key && !isNumberString(key)) {
				jsonPayload[key] = object;
			} else {
				jsonPayload = { ...jsonPayload, ...object };
			}
		} else {
			if (key) {
				jsonPayload[key] = data;
			} else {
				textPayload.push(String(data));
			}
		}
	};

	for (const message of record.message) {
		addPayload(message);
	}

	for (const key of Object.keys(record.properties)) {
		addPayload(record.properties[key], key);
	}

	return JSON.stringify({
		timestamp: DateTime.fromMillis(record.timestamp).toISO(),
		severity: record.level.toUpperCase(),
		message: textPayload.join(' '),
		...jsonPayload,
	});
};

configureSync({
	reset: true,
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
	public config(config: LogConfig): void {
		configureSync({
			reset: true,
			sinks: {
				console: getConsoleSink({
					formatter: config?.prettify
						? getPrettyFormatter({
								properties: true,
								inspectOptions: {
									depth: 3,
									colors: true,
									compact: true,
								},
							})
						: defaultFormatter,
				}),
			},
			loggers: [
				{
					category: [],
					sinks: ['console'],
					lowestLevel: config.lowestLevel,
				},
			],
		});
	}

	public trace(message: TemplateStringsArray, ...values: readonly unknown[]): void;
	public trace(message: string, properties?: Record<string, unknown> | (() => Record<string, unknown>)): void;
	public trace(properties: Record<string, unknown>): void;
	public trace(callback: LogCallback): void;
	public trace(message: TemplateStringsArray | string | LogCallback | Record<string, unknown>, ...values: unknown[]): void {
		this.get().trace(message as TemplateStringsArray, values);
	}

	public debug(message: TemplateStringsArray, ...values: readonly unknown[]): void;
	public debug(message: string, properties?: Record<string, unknown> | (() => Record<string, unknown>)): void;
	public debug(properties: Record<string, unknown>): void;
	public debug(callback: LogCallback): void;
	public debug(message: TemplateStringsArray | string | LogCallback | Record<string, unknown>, ...values: unknown[]): void {
		this.get().debug(message as TemplateStringsArray, values);
	}

	public info(message: TemplateStringsArray, ...values: readonly unknown[]): void;
	public info(message: string, properties?: Record<string, unknown> | (() => Record<string, unknown>)): void;
	public info(properties: Record<string, unknown>): void;
	public info(callback: LogCallback): void;
	public info(message: TemplateStringsArray | string | LogCallback | Record<string, unknown>, ...values: unknown[]): void {
		this.get().info(message as TemplateStringsArray, values);
	}

	public warning(message: TemplateStringsArray, ...values: readonly unknown[]): void;
	public warning(message: string, properties?: Record<string, unknown> | (() => Record<string, unknown>)): void;
	public warning(properties: Record<string, unknown>): void;
	public warning(callback: LogCallback): void;
	public warning(message: TemplateStringsArray | string | LogCallback | Record<string, unknown>, ...values: unknown[]): void {
		this.get().warning(message as TemplateStringsArray, values);
	}

	public error(message: TemplateStringsArray, ...values: readonly unknown[]): void;
	public error(message: string, properties?: Record<string, unknown> | (() => Record<string, unknown>)): void;
	public error(properties: Record<string, unknown>): void;
	public error(callback: LogCallback): void;
	public error(message: TemplateStringsArray | string | LogCallback | Record<string, unknown>, ...values: unknown[]): void {
		this.get().error(message as TemplateStringsArray, values);
	}

	public fatal(message: TemplateStringsArray, ...values: readonly unknown[]): void;
	public fatal(message: string, properties?: Record<string, unknown> | (() => Record<string, unknown>)): void;
	public fatal(properties: Record<string, unknown>): void;
	public fatal(callback: LogCallback): void;
	public fatal(message: TemplateStringsArray | string | LogCallback | Record<string, unknown>, ...values: unknown[]): void {
		this.get().fatal(message as TemplateStringsArray, values);
	}

	private get() {
		const logger = getLogger();

		const contextStore = Registry.context.getStore();
		if (contextStore) {
			return logger.with(omit(contextStore, ['defers', 'hasTransaction']));
		}

		return logger;
	}
}

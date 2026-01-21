import assert from 'node:assert/strict';
import test from 'node:test';

import { configureSync, type LogRecord } from '@logtape/logtape';

import { Logger } from '../index';

const configureCapture = (): LogRecord[] => {
	const records: LogRecord[] = [];

	configureSync({
		reset: true,
		sinks: {
			buffer: (record: LogRecord) => records.push(record),
		},
		loggers: [
			{
				category: [],
				sinks: ['buffer'],
				lowestLevel: 'trace',
			},
		],
	});

	return records;
};

const lastAppRecord = (records: LogRecord[]) => {
	const record = [...records].reverse().find((item) => item.category.length === 0);
	assert.ok(record);
	return record;
};

const findInObjectDepth2 = (value: unknown, key: string): unknown => {
	if (!value || typeof value !== 'object') {
		return undefined;
	}

	const obj = value as Record<string, unknown>;
	if (Object.prototype.hasOwnProperty.call(obj, key)) {
		return obj[key];
	}

	for (const nested of Object.values(obj)) {
		if (!nested || typeof nested !== 'object') {
			continue;
		}
		const nestedObj = nested as Record<string, unknown>;
		if (Object.prototype.hasOwnProperty.call(nestedObj, key)) {
			return nestedObj[key];
		}
	}

	return undefined;
};

const findInRecord = (record: LogRecord, key: string): unknown => {
	const direct = findInObjectDepth2(record.properties, key);
	if (direct !== undefined) {
		return direct;
	}

	for (const part of record.message) {
		const found = findInObjectDepth2(part, key);
		if (found !== undefined) {
			return found;
		}
	}

	return undefined;
};

test('Logger.error passes properties as payload', () => {
	const records = configureCapture();
	const logger = new Logger();

	logger.error('create', { error: new Error('boom') });

	assert.ok(records.length > 0);

	const record = lastAppRecord(records);
	const message = record.message.map((part) => String(part)).join('');
	const error = findInRecord(record, 'error') as Error;
	assert.ok(message.includes('create'));
	assert.equal(record.rawMessage, 'create');
	assert.ok(error);
});

test('Logger.error captures Error from catch', () => {
	const records = configureCapture();
	const logger = new Logger();

	try {
		throw new Error('message');
	} catch (error: unknown) {
		logger.error('create', { error });
	}

	assert.ok(records.length > 0);

	const record = lastAppRecord(records);
	const error = findInRecord(record, 'error') as Error;
	assert.equal(record.rawMessage, 'create');
	assert.ok(error);
});

test('Logger serializes error details in json output', () => {
	const chunks: string[] = [];
	const originalStdoutWrite = process.stdout.write.bind(process.stdout);
	const originalStderrWrite = process.stderr.write.bind(process.stderr);

	const capture = (chunk: string | Uint8Array, encoding?: BufferEncoding, callback?: (err?: Error) => void) => {
		const text = typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString(encoding ?? 'utf8');
		chunks.push(text);
		if (typeof callback === 'function') {
			callback();
		}
		return true;
	};

	process.stdout.write = capture as typeof process.stdout.write;
	process.stderr.write = capture as typeof process.stderr.write;

	try {
		const logger = new Logger();
		logger.config({ lowestLevel: 'trace', prettify: false });
		logger.error('create', { error: new Error('boom'), requestId: 'worker.balance.test' });
	} finally {
		process.stdout.write = originalStdoutWrite;
		process.stderr.write = originalStderrWrite;
	}

	const output = chunks.join('').trim();
	const lines = output.split('\n').filter(Boolean);
	const recordLine = [...lines].reverse().find((line) => line.includes('"message":"create"'));
	assert.ok(recordLine);

	const record = JSON.parse(recordLine) as Record<string, unknown>;
	const error = findInObjectDepth2(record, 'error') as { message?: string; name?: string };
	assert.equal(error?.message, 'boom');
	assert.equal(error?.name, 'Error');
});

test('Logger.info spreads template values', () => {
	const records = configureCapture();
	const logger = new Logger();

	void logger.info`create ${'boom'}`;

	assert.ok(records.length > 0);

	const record = lastAppRecord(records);
	const message = record.message.map((part) => String(part)).join('');
	assert.ok(Array.isArray(record.rawMessage));
	assert.ok((record.rawMessage as TemplateStringsArray).raw !== undefined);
	assert.ok(message.includes('create'));
	assert.ok(message.includes('boom'));
});

test('Logger.info logs message with context', () => {
	const records = configureCapture();
	const logger = new Logger();

	logger.info('Request start', { correlationId: 'req.1', requestId: 'worker.balance.1' });

	const record = lastAppRecord(records);
	const message = record.message.map((part) => String(part)).join('');
	assert.equal(record.rawMessage, 'Request start');
	assert.ok(message.includes('Request start'));
	assert.equal(findInRecord(record, 'correlationId'), 'req.1');
	assert.equal(findInRecord(record, 'requestId'), 'worker.balance.1');
});

test('Logger.warning logs message without context', () => {
	const records = configureCapture();
	const logger = new Logger();

	logger.warning('Signal received');

	const record = lastAppRecord(records);
	const message = record.message.map((part) => String(part)).join('');
	assert.equal(record.rawMessage, 'Signal received');
	assert.ok(message.includes('Signal received'));
	assert.equal(Object.keys(record.properties).length, 0);
});

test('Logger.error keeps error in properties', () => {
	const records = configureCapture();
	const logger = new Logger();
	const error = new Error('External call failed');

	logger.error('External call failed', { error, payload: { foo: 'bar' } });

	const record = lastAppRecord(records);

	const message = record.message.map((part) => String(part)).join('');
	const loggedError = findInRecord(record, 'error') as Error;
	assert.equal(record.rawMessage, 'External call failed');
	assert.ok(message.includes('External call failed'));
	assert.ok(loggedError);
	assert.deepEqual(findInRecord(record, 'payload'), { foo: 'bar' });
});

test('Logger.fatal logs error with context', () => {
	const records = configureCapture();
	const logger = new Logger();
	const error = new Error('Critical failure');

	logger.fatal('Critical failure', { error, game: 'demo', spins: 3, randomNumber: 7 });

	const record = lastAppRecord(records);
	const message = record.message.map((part) => String(part)).join('');
	const loggedError = findInRecord(record, 'error') as Error;
	assert.equal(record.rawMessage, 'Critical failure');
	assert.ok(message.includes('Critical failure'));
	assert.ok(loggedError);
	assert.equal(findInRecord(record, 'game'), 'demo');
	assert.equal(findInRecord(record, 'spins'), 3);
	assert.equal(findInRecord(record, 'randomNumber'), 7);
});

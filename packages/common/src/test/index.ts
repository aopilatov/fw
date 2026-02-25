import process from 'node:process';

import { DateTime } from 'luxon';

import { Pg } from '../../../pg';
import { Container, Registry } from '../di';
import { Server, ServerInstance, ServerRequest, ServerResponse } from '../http';
import { Logger } from '../logger';

let server: ServerInstance;

const onRequest = async (request: ServerRequest, response: ServerResponse) => {
	await Container.getSystem(Pg).createClient(request.id);
	await Container.getSystem(Pg).createReadClient(request.id, 'slave1');

	const startHeap = process.memoryUsage().heapUsed;
	const startRss = process.memoryUsage().rss;

	request['memoryStart'] = {
		heapUsed: startHeap,
		rss: startRss,
		time: DateTime.now(),
	};
};

const onResponse = async (request: ServerRequest, response: ServerResponse) => {
	const logResponse: Record<string, unknown> = {
		statusCode: response.statusCode,
		method: request.method,
		endpoint: request.url,
	};

	const endHeap = process.memoryUsage().heapUsed;
	const endRss = process.memoryUsage().rss;

	const start: {
		heapUsed: number;
		rss: number;
		time: DateTime;
	} = request['memoryStart'];

	if (start) {
		const heapDelta = endHeap - start.heapUsed;
		const rssDelta = endRss - start.rss;

		const durationMs = DateTime.now().diff(start.time, ['milliseconds']).milliseconds;

		const heapMB = (heapDelta / 1024 / 1024).toFixed(2);
		const rssMB = (rssDelta / 1024 / 1024).toFixed(2);

		logResponse['durationMs'] = durationMs;
		logResponse['heapDeltaMB'] = heapMB;
		logResponse['rssDeltaMB'] = rssMB;

		if (heapDelta > 8 * 1024 * 1024) {
			logResponse['suspicious'] = 'YES';
		}
	}

	Container.get(Logger).info('Request finished', logResponse);

	Container.getSystem(Pg).releaseClient(request.id);
	Container.getSystem(Pg).releaseAllReadClients(request.id);
};

const onStartup = async () => {
	const pgConf = {
		host: process.env?.DB_MASTER_HOST || '127.0.0.1',
		port: parseInt(process.env?.DB_MASTER_PORT || '5432'),
		database: process.env?.DB_MASTER_NAME || 'originals',
		user: process.env?.DB_MASTER_USER || 'postgres',
		password: process.env?.DB_MASTER_PASS || 'password',
		ssl: false,
	};

	const pgConfigMaster = pgConf;
	const pgConfigReplicas = pgConf;
	Container.setSystem(Pg, new Pg());
	Container.getSystem(Pg).init('test', pgConfigMaster, {
		slave1: pgConfigReplicas,
	});
};

(async () => {
	Server.setIsDev(true);
	Server.setName('test');
	Server.setHost('0.0.0.0');
	Server.setPort(3001);
	Server.setMaxConcurrentRequests(300);
	Server.setOnStartup(onStartup);
	Server.setOnRequest(onRequest);
	Server.setOnResponse(onResponse);
	Server.addRoute('/test', 'GET', async (req, _) => {
		return {
			statusCode: 200,
			body: { test: 1 },
		};
	});

	server = await Server.start();
})();

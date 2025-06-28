import * as crypto from 'node:crypto';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

import { loadPackageDefinition, credentials } from '@grpc/grpc-js';
import { loadSync } from '@grpc/proto-loader';
import { Service } from 'typedi';

import { CentrifugoApi } from './api';

@Service()
export class Centrifugo {
	private readonly client: CentrifugoApi;

	constructor(
		private readonly host: string,
		private readonly isTest: boolean = false,
	) {
		if (isTest) return;

		const definition = loadSync(path.join(__dirname, 'api.proto'), {
			keepCase: true,
			longs: String,
			enums: String,
			defaults: true,
			oneofs: true,
		});

		// @ts-expect-error: TS2339
		const api = loadPackageDefinition(definition).centrifugal.centrifugo.api;
		this.client = new api.CentrifugoApi(host, credentials.createInsecure());
	}

	public async publish(channel: string, data: Record<string, unknown>): Promise<void> {
		await this.callGrpcMethod('Publish', {
			channel,
			data: Buffer.from(JSON.stringify(data)),
		});
	}

	private callGrpcMethod(method: string, params: unknown) {
		if (this.isTest) return;

		return new Promise((resolve, reject) => {
			this.client?.[method](params, (err: unknown, res: unknown) => {
				if (err) return reject(err);
				resolve(res);
			});
		});
	}
}

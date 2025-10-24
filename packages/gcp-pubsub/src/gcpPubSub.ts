import { AsyncLocalStorage } from 'node:async_hooks';
import process from 'node:process';

import { ClientConfig, PubSub as GcpPubSubClient, Message } from '@google-cloud/pubsub';

import { Container, Logger, Registry, SystemService } from '@fw/common';

import { GcpPubSubError } from './errors';
import { GcpPubSubConfig, GcpPubSubSchema, GcpPubSubTopicData, GcpPubSubLimitConfig } from './types';

@SystemService()
export class GcpPubSub {
	private isTest: boolean;
	private isEmulator: boolean;
	private client: GcpPubSubClient;
	private topics: Partial<Record<keyof GcpPubSubSchema, GcpPubSubTopicData>> = {};

	public connect(config: GcpPubSubConfig): void {
		if (this.client) return;
		this.isTest = false;

		const pubSubConf: ClientConfig = {};
		if (typeof config === 'string') {
			this.isEmulator = false;

			const credentials = JSON.parse(config);
			pubSubConf.projectId = credentials.project_id;
			pubSubConf.credentials = credentials;
		} else {
			this.isEmulator = true;

			pubSubConf.projectId = config.projectId;
			pubSubConf.servicePath = config.host;

			process.env.PUBSUB_PROJECT_ID = config.projectId;
			process.env.PUBSUB_EMULATOR_HOST = config.host;

			this.isTest = !!config.isTest;
		}

		if (!this.isTest) {
			this.client = new GcpPubSubClient(pubSubConf);
		}
	}

	public async disconnect(): Promise<void> {
		if (this.client) await this.client.close();
	}

	public async registerTopic<T extends keyof GcpPubSubSchema>(id: T): Promise<void> {
		if (!this.client) return;

		if (!(id in this.topics)) {
			let topic = this.client.topic(id);

			if (this.isEmulator && !(await topic.exists())[0]) {
				Container.get(Logger).get().warn(`Topic ${id} does not exist. Creating...`);
				await topic.create();
				topic = this.client.topic(id);
			}

			this.topics[id] = { topic, subscriptions: new Map() };
			Container.get(Logger)
				.get()
				.info(`Connect to topic ${id}`, { metadata: await topic.getMetadata() });
		}
	}

	public getTopic<T extends keyof GcpPubSubSchema>(id: T) {
		const topic = this.topics[id];
		if (!topic && !this.isTest) throw new GcpPubSubError(`Topic '${id}' is not registered`);

		return {
			publish: async (data: GcpPubSubSchema[T]) => {
				if (this.isTest) return;

				const dataBuffer = Buffer.from(JSON.stringify(data));
				if (process.env?.NODE_ENV === 'test') {
					Container.get(Logger).get().info('PubSub message', data);
					return;
				}

				try {
					await topic!.topic.publishMessage({ data: dataBuffer });
				} catch (error) {
					Container.get(Logger).get().error(`Failed to publish to topic '${id}' message`, {
						metadata: topic!.topic.getMetadata(),
						error,
					});

					throw new GcpPubSubError(`Failed to publish to topic '${id}' message ${data?.toString()}`);
				}
			},

			subscribe: async (
				name: string,
				handler: (message: GcpPubSubSchema[T]) => Promise<void>,
				errorHandler?: (rawMessage: Message, error: unknown) => Promise<void>,
				limitConfig?: GcpPubSubLimitConfig,
			) => {
				if (this.isTest) {
					return {
						unsubscribe: async () => {},
					};
				}

				if (topic!.subscriptions.has(name)) {
					Container.get(Logger)
						.get()
						.warn(`Subscription ${name} already exists`, {
							metadata: await topic!.topic.getMetadata(),
						});

					throw new GcpPubSubError(`Subscription ${name} already exists`);
				}

				if (this.isEmulator && !(await topic!.topic.subscription(name).exists())[0]) {
					Container.get(Logger)
						.get()
						.warn(`Subscription ${name} does not exist. Creating...`, { metadata: await topic!.topic.getMetadata() });

					await topic!.topic.subscription(name).create(limitConfig ? { flowControl: limitConfig } : undefined);
				}

				topic!.subscriptions.set(name, {
					subscription: topic!.topic.subscription(name, limitConfig ? { flowControl: limitConfig } : undefined),
					callback: async (message) => {
						try {
							const data: GcpPubSubSchema[T] = JSON.parse(Buffer.from(message.data).toString());
							if (!('requestId' in data) || typeof data.requestId !== 'string') {
								throw new GcpPubSubError(`Message does not have requestId`);
							}

							const context = Registry.context;
							await context.run({ correlationId: data.requestId }, async () => {
								await handler(data);
								message.ack();
							});
						} catch (error: unknown) {
							Container.get(Logger).get().error(`Failed to process message:`, { error });
							if (errorHandler) {
								await errorHandler(message, error);
							} else {
								Container.get(Logger).get().fatal(`Ignore message:`, { error, message: message.data });
								message.ack();
							}
						}
					},
				});

				Container.get(Logger)
					.get()
					.info(`Subscribed to subscription ${name}`, { metadata: await topic!.topic.getMetadata() });

				const subscription = topic!.subscriptions.get(name)!;
				subscription.subscription.on('message', subscription.callback);

				return {
					unsubscribe: async () => {
						subscription.subscription.removeListener('message', subscription.callback);
						Container.get(Logger).get().info(`Unsubscribed from subscription ${name}`, { metadata: topic!.topic.getMetadata() });
						topic!.subscriptions.delete(name);
					},
				};
			},
		};
	}
}

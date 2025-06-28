import * as process from 'node:process';

import { ClientConfig, PubSub as GcpPubSub, Message } from '@google-cloud/pubsub';
import { Service } from 'typedi';

import { getLogger } from '@fw/logger';

import { PubSubError } from './errors';
import { Config, PubSubSchema, LimitConfig, TopicData } from './types';

@Service({ global: true })
export class PubSub {
	private isEmulator: boolean;
	private isTest: boolean;
	private client: GcpPubSub;
	private topics: Partial<Record<keyof PubSubSchema, TopicData>> = {};

	public connect(config: Config): void {
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

			process.env.PUBSUB_PROJECT_ID = 'originals-local';
			process.env.PUBSUB_EMULATOR_HOST = 'localhost:8085';

			this.isTest = !!config.isTest;
		}

		if (!this.isTest) {
			this.client = new GcpPubSub(pubSubConf);
		}
	}

	public async disconnect(): Promise<void> {
		if (this.client) await this.client.close();
	}

	public async registerTopic<T extends keyof PubSubSchema>(id: T): Promise<void> {
		if (!this.client) return;

		if (!(id in this.topics)) {
			let topic = this.client.topic(id);

			if (this.isEmulator && !(await topic.exists())[0]) {
				getLogger().warn(`Topic ${id} does not exist. Creating...`);
				await topic.create();
				topic = this.client.topic(id);
			}

			this.topics[id] = { topic, subscriptions: new Map() };
			getLogger().info(`Connect to topic ${id}`, await topic.getMetadata());
		}
	}

	public getTopic<T extends keyof PubSubSchema>(id: T) {
		const topic = this.topics[id];
		if (!topic && !this.isTest) throw new PubSubError(`Topic '${id}' is not registered`);

		return {
			publish: async (data: PubSubSchema[T]) => {
				if (this.isTest) return;

				const dataBuffer = Buffer.from(JSON.stringify(data));
				if (process.env?.NODE_ENV === 'test') {
					getLogger().info('PubSub message', data);
					return;
				}

				try {
					await topic!.topic.publishMessage({ data: dataBuffer });
				} catch (error) {
					getLogger().error(`Failed to publish to topic '${id}' message`, topic!.topic.getMetadata(), error);
					throw new PubSubError(`Failed to publish to topic '${id}' message ${data?.toString()}`);
				}
			},

			subscribe: async (
				name: string,
				handler: (message: PubSubSchema[T]) => Promise<void>,
				errorHandler?: (rawMessage: Message, error: unknown) => Promise<void>,
				limitConfig?: LimitConfig,
			) => {
				if (this.isTest) {
					return {
						unsubscribe: async () => {},
					};
				}

				if (topic!.subscriptions.has(name)) {
					getLogger().warn(`Subscription ${name} already exists `, await topic!.topic.getMetadata());
					throw new PubSubError(`Subscription ${name} already exists`);
				}

				if (this.isEmulator && !(await topic!.topic.subscription(name).exists())[0]) {
					getLogger().warn(`Subscription ${name} does not exist. Creating...`, await topic!.topic.getMetadata());
					await topic!.topic.subscription(name).create(limitConfig ? { flowControl: limitConfig } : undefined);
				}

				topic!.subscriptions.set(name, {
					subscription: topic!.topic.subscription(name, limitConfig ? { flowControl: limitConfig } : undefined),
					callback: async (message) => {
						try {
							const data: PubSubSchema[T] = JSON.parse(Buffer.from(message.data).toString());
							await handler(data);
							message.ack();
						} catch (e: unknown) {
							getLogger().error(`Failed to process message:`, e);
							if (errorHandler) {
								await errorHandler(message, e);
							} else {
								getLogger().fatal(`Ignore message:`, { e, message: message.data });
								message.ack();
							}
						}
					},
				});

				getLogger().info(`Subscribed to subscription ${name}`, await topic!.topic.getMetadata());

				const subscription = topic!.subscriptions.get(name)!;
				subscription.subscription.on('message', subscription.callback);

				return {
					unsubscribe: async () => {
						subscription.subscription.removeListener('message', subscription.callback);
						getLogger().info(`Unsubscribed from subscription ${name}`, topic!.topic.getMetadata());
						topic!.subscriptions.delete(name);
					},
				};
			},
		};
	}
}

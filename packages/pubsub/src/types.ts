import { Topic, Subscription, Message } from '@google-cloud/pubsub';

export interface ConfigDev {
	projectId: string;
	host: string;
}

export type Config = string | ConfigDev;

export interface TopicData {
	topic: Topic;
	subscriptions: Map<string, { subscription: Subscription; callback: (message: Message) => Promise<void> }>;
}

export interface PubSubSchema {
	EXAMPLE: { nothing: string };
}

export type LimitConfig = {
	maxMessages: number;
	maxExtensionMinutes: number;
};

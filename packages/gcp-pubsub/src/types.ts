import { Topic, Subscription, Message } from '@google-cloud/pubsub';

export interface GcpPubSubConfigDev {
	projectId: string;
	host: string;
	isTest?: boolean;
}

export type GcpPubSubConfig = string | GcpPubSubConfigDev;

export interface GcpPubSubTopicData {
	topic: Topic;
	subscriptions: Map<string, { subscription: Subscription; callback: (message: Message) => Promise<void> }>;
}

export interface GcpPubSubSchema {
	EXAMPLE: { nothing: string };
}

export type GcpPubSubLimitConfig = {
	maxMessages: number;
	maxExtensionMinutes: number;
};

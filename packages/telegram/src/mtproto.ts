import BigInteger from 'big-integer';
import { TelegramClient, Api } from 'telegram';
import { NewMessageEvent } from 'telegram/events';
import { CallbackQueryEvent } from 'telegram/events/CallbackQuery';
import { StringSession } from 'telegram/sessions';
import { Container, Service } from 'typedi';

import { Redis } from '@fw/cache';
import { getLogger } from '@fw/logger/src';

import { TelegramMessage } from './message';
import { InputCommand } from './types';

@Service({ global: true })
export class TelegramMtproto {
	private client!: TelegramClient;

	public async start(name: string, config: { appId: number; appHash: string; botToken: string }) {
		if (this.client) return;

		const cache = Container.get(Redis);

		let session!: StringSession;
		const sessionCache = await cache.hGetAll(`telegram:mtproto:${name}`);
		if (sessionCache?.dcId && sessionCache?.serverAddress && sessionCache?.port && sessionCache?.authKey) {
			session = new StringSession(sessionCache.authKey);
			session.setDC(Number(sessionCache.dcId), sessionCache.serverAddress, Number(sessionCache.port));
		} else {
			session = new StringSession();
		}

		this.client = new TelegramClient(session, config.appId, config.appHash, {
			connectionRetries: 2,
			testServers: false,
			autoReconnect: true,
			appVersion: '1.1',
			langCode: 'en',
			systemLangCode: 'en-US',
			floodSleepThreshold: 0,
		});

		try {
			const isAuthenticated = await this.client.checkAuthorization();
			if (isAuthenticated) return;

			await this.client.start({ botAuthToken: config.botToken });

			const authKey = this.client.session.save() as unknown as string;
			if (authKey) {
				await cache.hmSet(`telegram:mtproto:${name}`, {
					dcId: this.client.session.dcId.toString(),
					port: this.client.session.port.toString(),
					serverAddress: this.client.session.serverAddress,
					authKey,
				});
			} else {
				getLogger().error(`Error starting bot ${name}`, 'No auth key');
			}
		} catch (e: unknown) {
			getLogger().error(`Error starting bot ${name}`, e);
		}
	}

	public onMessage(callable: (data: NewMessageEvent) => Promise<void>): void {
		this.client.addEventHandler(callable);
	}

	public onEvent(callable: (data: CallbackQueryEvent) => Promise<void>): void {
		this.client.addEventHandler(callable);
	}

	public async addCommand(command: InputCommand): Promise<void> {
		await this.client.invoke(
			new Api.bots.SetBotCommands({
				scope: new Api.BotCommandScopeDefault(),
				langCode: command?.language || 'en',
				commands: [
					new Api.BotCommand({
						command: command.command,
						description: command.description,
					}),
				],
			}),
		);
	}

	public async getDialogs() {
		try {
			return await this.client.invoke(
				new Api.messages.GetDialogs({
					limit: 1000,
					offsetDate: 0,
					offsetId: 0,
					hash: BigInteger(0),
					offsetPeer: new Api.InputPeerEmpty(),
				}),
			);
		} catch (e: unknown) {
			getLogger().error('mtproto getDialogs', 'error', e);
			throw e;
		}
	}

	public message(): { builder: TelegramMessage; send: () => Promise<string> } {
		const builder = new TelegramMessage();
		return {
			builder,
			send: async () => {
				return await this.sendMessage(builder);
			},
		};
	}

	private async sendMessage(message: TelegramMessage): Promise<string> {
		const payload = message.toMtproto();

		let data!: Api.messages.SendMedia | Api.messages.SendMessage;
		if (payload?.media) {
			data = new Api.messages.SendMedia(payload);
		} else {
			data = new Api.messages.SendMessage(payload);
		}

		try {
			const result = await this.client.invoke(data);
			getLogger().info('mtproto sendMessage', 'message sent');

			return String(result['id'] || '0');
		} catch (e: unknown) {
			getLogger().error('mtproto sendMessage', 'error', e);
			throw e;
		}
	}
}

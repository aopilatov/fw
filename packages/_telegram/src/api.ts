import { Bot } from 'grammy';
import { Service } from 'typedi';

import { getLogger } from '@fw/logger/src';

import { TelegramMessage } from './message';

@Service({ global: true })
export class TelegramApi {
	private readonly bot: Bot;

	constructor(token: string) {
		this.bot = new Bot(token);
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

	public async removeActionsFromMessage(chatId: string, messageId: number): Promise<void> {
		await this.bot.api.editMessageReplyMarkup(chatId, messageId, {
			reply_markup: undefined,
		});
	}

	private async sendMessage(message: TelegramMessage): Promise<string> {
		const payload = message.toApi();

		try {
			const result = await this.bot.api[payload.cmd](payload.chatId, payload.message, payload.params);
			getLogger().info('api sendMessage', 'message sent');

			return String(result.message_id);
		} catch (e: unknown) {
			getLogger().error('api sendMessage', 'error', e);
			throw e;
		}
	}
}

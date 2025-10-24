import { Bot } from 'grammy';

import { Container, Logger, SystemService } from '@fw/common';

import { TelegramMessage } from './message';

@SystemService()
export class TelegramApi {
	private bot: Bot;

	public init(token: string) {
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
			Container.get(Logger).debug('api sendMessage', { action: 'message sent' });

			return String(result.message_id);
		} catch (error: unknown) {
			Container.get(Logger).error('api sendMessage', { action: 'error', error });
			throw error;
		}
	}
}

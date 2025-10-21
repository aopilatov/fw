import BigInteger from 'big-integer';
import { InlineKeyboard } from 'grammy';
import { Api } from 'telegram';
import { HTMLParser } from 'telegram/extensions/html';

import { KeyboardButton } from './types';

export class TelegramMessage {
	private chat: string | number;
	private accessHash?: string;
	private message: string;
	private media: string | undefined;
	private replyMarkupRows: { buttons: KeyboardButton[] }[] | undefined = undefined;
	private replyTo: number | undefined = undefined;
	private isChannel: boolean = false;

	public setIsChannel(isChannel: boolean): TelegramMessage {
		this.isChannel = isChannel;
		return this;
	}

	public setRecipient(chat: string | number): TelegramMessage {
		this.chat = chat;
		return this;
	}

	public setAccessHash(accessHash: string): TelegramMessage {
		this.accessHash = accessHash;
		return this;
	}

	public setText(message: string): TelegramMessage {
		this.message = message;
		return this;
	}

	public setMedia(media: string): TelegramMessage {
		this.media = media;
		return this;
	}

	public addMarkupRow(buttons: KeyboardButton[]): TelegramMessage {
		if (!this.replyMarkupRows) {
			this.replyMarkupRows = [];
		}

		this.replyMarkupRows.push({ buttons });
		return this;
	}

	public setReplyTo(replyTo: number): TelegramMessage {
		this.replyTo = replyTo;
		return this;
	}

	public toApi() {
		let cmd: 'sendMessage' | 'sendPhoto' | 'sendVideo' = 'sendMessage';

		let peer: number = Number(this.chat);
		if (this.isChannel) {
			peer = Number(`-100${peer}`);
		}

		const options: Record<string, unknown> = { parse_mode: 'HTML' };

		if (this.replyTo) {
			options['reply_to_message_id'] = this.replyTo;
		}

		if (this?.replyMarkupRows) {
			const replyMarkup = new InlineKeyboard();
			for (const row of this.replyMarkupRows) {
				for (const button of row.buttons) {
					switch (button.type) {
						case 'url':
							replyMarkup.url(button.text, button.url);
							break;

						case 'webview':
							replyMarkup.webApp(button.text, button.url);
							break;

						case 'callback':
							replyMarkup.text(button.text, button.data.toString('utf-8'));
							break;
					}
				}

				replyMarkup.row();
			}

			options['reply_markup'] = replyMarkup;
		}

		if (this?.media) {
			options['caption'] = this.message;

			if (/\.(jpg|jpeg|png|gif)$/i.test(this.media)) {
				cmd = 'sendPhoto';
			}

			if (/\.(mp4)$/i.test(this.media)) {
				cmd = 'sendVideo';
			}

			return {
				cmd,
				chatId: peer,
				message: this.media,
				params: options,
			};
		}

		return {
			cmd,
			chatId: peer,
			message: this.message,
			params: options,
		};
	}

	public toMtproto() {
		let peer!: Api.TypeEntityLike;

		if (this?.accessHash) {
			if (this.isChannel) {
				peer = new Api.InputPeerChannel({
					channelId: BigInteger(this.chat.toString()),
					accessHash: BigInteger(this.accessHash),
				});
			} else {
				peer = new Api.InputUser({
					userId: BigInteger(this.chat.toString()),
					accessHash: BigInteger(this.accessHash),
				});
			}
		} else {
			peer = BigInteger(this.chat.toString());
		}

		let replyTo: Api.InputReplyToMessage | undefined = undefined;
		if (this.replyTo) {
			replyTo = new Api.InputReplyToMessage({ replyToMsgId: this.replyTo });
		}

		const [message, entities] = HTMLParser.parse(this.message);
		const replyMarkup = this?.replyMarkupRows
			? new Api.ReplyInlineMarkup({
					rows: this.replyMarkupRows.map((row) => {
						return new Api.KeyboardButtonRow({
							buttons: row.buttons.map((button) => {
								switch (button.type) {
									case 'url':
										return new Api.KeyboardButtonUrl({
											text: button.text,
											url: button.url,
										});

									case 'webview':
										return new Api.KeyboardButtonWebView({
											text: button.text,
											url: button.url,
										});

									case 'callback':
										return new Api.KeyboardButtonCallback({
											text: button.text,
											data: button.data,
											requiresPassword: button?.requiresPassword,
										});
								}
							}),
						});
					}),
				})
			: undefined;

		let media: Api.InputMediaPhotoExternal | Api.InputMediaDocumentExternal | undefined = undefined;

		if (this?.media && /\.(jpg|jpeg|png|gif)$/i.test(this.media)) {
			media = new Api.InputMediaPhotoExternal({
				spoiler: false,
				url: this.media,
			});
		}

		if (this?.media && /\.(mp4)$/i.test(this.media)) {
			media = new Api.InputMediaDocumentExternal({
				spoiler: false,
				url: this.media,
			});
		}

		return {
			randomId: BigInteger(Math.ceil(Math.random() * 0xffffff) + Math.ceil(Math.random() * 0xffffff)),
			noWebpage: true,
			peer,
			entities,
			message,
			replyMarkup,
			media,
			replyTo,
		};
	}
}

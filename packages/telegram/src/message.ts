import BigInteger from 'big-integer';
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

	public toMtproto() {
		let peer!: Api.TypeEntityLike;

		if (this?.accessHash) {
			peer = new Api.InputUser({
				userId: BigInteger(this.chat.toString()),
				accessHash: BigInteger(this.accessHash),
			});
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

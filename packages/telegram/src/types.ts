export type TelegramKeyboardButton = TelegramKeyboardButtonUrl | TelegramKeyboardButtonWebView | TelegramKeyboardButtonCallback;

export interface TelegramKeyboardButtonUrl {
	type: 'url';
	text: string;
	url: string;
}

export interface TelegramKeyboardButtonWebView {
	type: 'webview';
	text: string;
	url: string;
}

export interface TelegramKeyboardButtonCallback {
	type: 'callback';
	requiresPassword?: boolean;
	text: string;
	data: Buffer;
}

export interface TelegramInputCommand {
	command: string;
	description: string;
	language?: string;
}

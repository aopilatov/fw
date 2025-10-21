export type KeyboardButton = KeyboardButtonUrl | KeyboardButtonWebView | KeyboardButtonCallback;

export interface KeyboardButtonUrl {
	type: 'url';
	text: string;
	url: string;
}

export interface KeyboardButtonWebView {
	type: 'webview';
	text: string;
	url: string;
}

export interface KeyboardButtonCallback {
	type: 'callback';
	requiresPassword?: boolean;
	text: string;
	data: Buffer;
}

export interface InputCommand {
	command: string;
	description: string;
	language?: string;
}

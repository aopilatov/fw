export class PubSubError extends Error {
	constructor(public readonly error: string) {
		super(error);
	}
}

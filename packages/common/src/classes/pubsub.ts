import { Registry } from '../di';

export class PubSubBase {
	protected get requestId(): string {
		const requestId = Registry.getCurrentRequestId();
		if (!requestId) throw new Error('No request id found');
		return requestId;
	}

	protected get correlationId(): string | undefined {
		return Registry.getCurrentContext()?.correlationId;
	}
}

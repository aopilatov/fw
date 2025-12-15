import { Registry } from '../di';

export class PubSubBase {
	protected get requestId() {
		const context = Registry.context.getStore();
		const requestId = context?.correlationId ?? context?.requestId;
		if (!requestId) throw new Error('No request id found');
		return requestId;
	}
}

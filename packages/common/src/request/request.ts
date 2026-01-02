import { Container, Registry, SystemService, Context, ContextUser } from '../di';
import { Logger } from '../logger';

@SystemService()
export class Request {
	public get id(): string {
		const requestId = this.context?.requestId;
		if (!requestId) {
			throw new Error('No requestId found');
		}

		return requestId;
	}

	private get context(): Context {
		const store = Registry.context.getStore();
		if (!store) {
			throw new Error('No transactional context found');
		}

		return store;
	}

	public get transactional(): boolean {
		return this.context?.hasTransaction ?? false;
	}

	public set transactional(data: boolean) {
		this.context.hasTransaction = data;
	}

	public get user(): ContextUser | undefined {
		return this.context.user;
	}

	public set user(user: ContextUser) {
		this.context.user = user;
	}

	public addDefer(defer: () => void | Promise<void>): void {
		if (!this.context.defers) this.context.defers = [];
		this.context.defers.push(defer);
	}

	public async executeDefers(): Promise<void> {
		if (!this.context.defers || !this.context.defers.length) return;
		const results = await Promise.allSettled(this.context.defers.map((item) => item()));
		for (const result of results.filter((item) => item.status === 'rejected')) {
			Container.get(Logger).error('defer failed', result.reason);
		}
	}
}

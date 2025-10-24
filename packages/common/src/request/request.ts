import { Container, SystemService } from '../di';
import { Logger } from '../logger';

import { RequestContext } from './context';

@SystemService({
	factory: ({ id }: { id: string }) => new Request(id),
})
export class Request {
	private hasTransaction: boolean = false;
	private defers: (() => void | Promise<void>)[] = [];
	private context: RequestContext = { test: 'test' };

	constructor(private readonly identifier: string) {}

	public get id(): string {
		return this.identifier;
	}

	public get isTransactional(): boolean {
		return this.hasTransaction;
	}

	public set transactional(data: boolean) {
		this.hasTransaction = data;
	}

	public addDefer(defer: () => void | Promise<void>): void {
		this.defers.push(defer);
	}

	public async executeDefers(): Promise<void> {
		if (!this.defers.length) return;
		const results = await Promise.allSettled(this.defers.map((item) => item()));
		for (const result of results.filter((item) => item.status === 'rejected')) {
			Container.get(Logger).error('defer failed', result.reason);
		}
	}

	public setContextKey<K extends keyof RequestContext>(key: K, value: RequestContext[K]): void {
		this.context[key] = value;
	}

	public getContextKey<K extends keyof RequestContext>(key: K): RequestContext[K] {
		return this.context[key];
	}
}

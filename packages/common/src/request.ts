import { Service } from 'typedi';

import { getLogger, type Logger } from '@fw/logger';

@Service()
export class RequestLike {
	private hasTransaction: boolean = false;
	private defers: (() => void | Promise<void>)[] = [];

	constructor(private readonly requestId: string) {}

	public get id(): string {
		return this.requestId;
	}

	public get log(): Logger {
		return getLogger(this.id);
	}

	public get isTransactional(): boolean {
		return this.hasTransaction;
	}

	public setHasTransaction(): void {
		this.hasTransaction = true;
	}

	public unsetHasTransaction(): void {
		this.hasTransaction = false;
	}

	public addDefer(defer: () => void | Promise<void>): void {
		this.defers.push(defer);
	}

	public async executeDefers(): Promise<void> {
		if (!this.defers.length) return;
		await Promise.allSettled(this.defers).then((results) => {
			for (const result of results.filter((item) => item.status === 'rejected')) {
				getLogger(this.requestId).error('defer failed', result.reason);
			}
		});
	}
}

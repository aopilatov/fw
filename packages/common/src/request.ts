import { Service } from 'typedi';

import { getLogger, type Logger } from '@fw/logger';

@Service()
export class RequestLike {
	private hasTransaction: boolean = false;

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
}

import { AccessDeniedError } from '../http';

export abstract class ActionBase<Input = unknown, Output = unknown> {
	public async execute(data: Input): Promise<Output> {
		if (!(await this.checkAbility(data))) {
			throw new AccessDeniedError('Not allowed');
		}

		return await this.perform(data);
	}

	protected abstract perform(data: Input): Promise<Output>;

	protected async checkAbility(data: unknown): Promise<boolean> {
		return true;
	}
}

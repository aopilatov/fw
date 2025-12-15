import { type Pg } from './pg';

export abstract class RepositoryBase {
	protected abstract pg: Pg;
	protected abstract slaveName: string | undefined;

	public get client() {
		return this.pg.getClient(this.slaveName);
	}
}

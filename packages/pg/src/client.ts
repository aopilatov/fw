import { PoolClient } from 'pg';

import { SystemService } from '@fw/common';
@SystemService()
export class PgClient {
	constructor(
		protected readonly client: PoolClient,
		protected readonly isSlave: boolean = false,
	) {}
}

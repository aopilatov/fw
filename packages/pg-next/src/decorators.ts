import 'reflect-metadata';

import { PgError } from './errors';
import { BaseModel } from './model';
import {
	KEYWORD_METADATA_TABLE,
	KEYWORD_METADATA_COLUMNS,
	KEYWORD_METADATA_WITH_HISTORY,
	KEYWORD_METADATA_WITH_READ,
	PgColumn,
} from './types';

export function Model(tableName: string, options?: { withHistory?: boolean; withReadInstance?: boolean }) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return (target: any) => {
		if (!(target.prototype instanceof BaseModel)) {
			throw new PgError('Model decorator could be used only for classes that extends BaseModel');
		}

		Reflect.defineMetadata(KEYWORD_METADATA_TABLE, tableName, target);
		Reflect.defineMetadata(KEYWORD_METADATA_WITH_HISTORY, options?.withHistory || false, target);
		Reflect.defineMetadata(KEYWORD_METADATA_WITH_READ, options?.withReadInstance || false, target);

		return target;
	};
}

export function Column(config: PgColumn) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return (target: any, propertyName: string | symbol): void => {
		const map = Reflect.hasMetadata(KEYWORD_METADATA_COLUMNS, target.constructor)
			? (Reflect.getMetadata(KEYWORD_METADATA_COLUMNS, target.constructor) as Map<string, PgColumn>)
			: new Map<string, PgColumn>();

		map.set(propertyName.toString(), config);
		Reflect.defineMetadata(KEYWORD_METADATA_COLUMNS, map, target.constructor);
	};
}

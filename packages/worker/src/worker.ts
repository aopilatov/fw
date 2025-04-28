import { ClassConstructor } from 'class-transformer';

import { WorkersFactory } from './main';
import { CronExpression, CronTasks, WorkerRedefined } from './types';

export function Worker(name: string, enabled: boolean = false) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return (target: ClassConstructor<any>) => {
		const workerClass = class extends target implements WorkerRedefined {
			public readonly name: string = name;
			public readonly isEnabled: boolean = enabled;
		};

		WorkersFactory.register(workerClass, name);
		return workerClass;
	};
}

export function Cron(expression: CronExpression) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
		if (!(propertyKey && descriptor)) {
			throw new Error('"Cron" decorator could be used only for methods');
		}

		const map: CronTasks = Reflect.hasMetadata('cron-tasks', target.constructor)
			? Reflect.getMetadata('cron-tasks', target.constructor)
			: new Map();

		map.set(propertyKey, expression);
		Reflect.defineMetadata('cron-tasks', map, target.constructor);
		return target;
	};
}

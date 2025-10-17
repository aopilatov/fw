import { ClassConstructor } from 'class-transformer';

import { Registry } from './registry';
import { CronExpression, CronTasks } from './types';

export function Worker(name: string, enabled: boolean = false) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return (target: ClassConstructor<any>) => {
		Reflect.defineMetadata('name', name, target);
		Reflect.defineMetadata('isEnabled', enabled, target);

		Registry.register(target, name);
		return target;
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

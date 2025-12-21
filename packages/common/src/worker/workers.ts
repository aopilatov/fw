import { ClassConstructor } from 'class-transformer';
import { get } from 'es-toolkit/compat';
import cron from 'node-cron';

import { CronTasks, WorkerAbstraction } from './types';

export class Workers {
	private static readonly workers: Map<string, WorkerAbstraction> = new Map();

	public static register(worker: ClassConstructor<WorkerAbstraction>, name: string): void {
		if (Workers.workers.has(name)) {
			throw new Error(`Worker "${name}" is already exists`);
		}

		Workers.workers.set(name, new worker());
	}

	public static async run(): Promise<void> {
		const names: string[] = Array.from(Workers.workers.keys());
		for (const name of names) {
			const worker = Workers.workers.get(name)!;

			const isEnabled = Reflect.getMetadata('isEnabled', get(worker, 'constructor') as unknown as object) as boolean;
			if (isEnabled) {
				if (worker?.startup) {
					await worker.startup();
				}

				const cronTasks: CronTasks = Reflect.getMetadata('cron-tasks', worker.constructor) || new Map();
				const cronTasksKeys: string[] = Array.from(cronTasks.keys());
				for (const cronTasksKey of cronTasksKeys) {
					cron.schedule(cronTasks.get(cronTasksKey)!, worker[cronTasksKey].bind(worker));
				}
			}
		}
	}

	public static async stop(): Promise<void> {
		const names: string[] = Array.from(Workers.workers.keys());
		await Promise.all(
			names.map((name) => {
				const worker = Workers.workers.get(name)!;
				if (worker?.shutdown) {
					worker.shutdown();
				}
			}),
		);
	}
}

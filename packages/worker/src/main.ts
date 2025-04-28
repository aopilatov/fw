import { ClassConstructor } from 'class-transformer';
import { invoke } from 'es-toolkit/compat';
import cron from 'node-cron';

import { CronTasks, WorkerRedefined } from './types';

export class WorkersFactory {
	private static readonly workers: Map<string, WorkerRedefined> = new Map();

	public static register(worker: ClassConstructor<WorkerRedefined>, name: string): void {
		if (WorkersFactory.workers.has(name)) {
			throw new Error(`Worker "${name}" is already exists`);
		}

		WorkersFactory.workers.set(name, new worker());
	}

	public static async run(): Promise<void> {
		const names: string[] = Array.from(WorkersFactory.workers.keys());
		for (const name of names) {
			const worker = WorkersFactory.workers.get(name)!;

			if (worker.isEnabled) {
				if (worker?.startup) {
					await worker.startup();
				}

				const cronTasks: CronTasks = Reflect.getMetadata('cron-tasks', worker.constructor) || new Map();
				const cronTasksKeys: string[] = Array.from(cronTasks.keys());
				for (const cronTasksKey of cronTasksKeys) {
					cron.schedule(cronTasks.get(cronTasksKey)!, invoke(worker, cronTasksKey));
				}
			}
		}
	}

	public static async stop(): Promise<void> {
		const names: string[] = Array.from(WorkersFactory.workers.keys());
		await Promise.all(
			names.map((name) => {
				const worker = WorkersFactory.workers.get(name)!;
				if (worker?.shutdown) {
					worker.shutdown();
				}
			}),
		);
	}
}

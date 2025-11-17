import { z } from 'zod';

export abstract class Validator {
	protected abstract schema: z.ZodObject;
	public abstract validate(value: unknown): z.infer<typeof this.schema>;
}

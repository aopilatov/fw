import { z } from 'zod';

export abstract class Validator {
	public abstract schema: z.ZodObject;
	public abstract validate(value: unknown): z.infer<typeof this.schema>;
}

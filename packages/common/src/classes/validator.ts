import { z } from 'zod';

export abstract class Validator {
	public abstract schema: z.ZodObject | z.ZodArray | z.ZodUnion | z.ZodNullable;
	public abstract validate(value: unknown): z.infer<typeof this.schema>;
}

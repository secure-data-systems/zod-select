/* eslint-disable @typescript-eslint/no-unused-vars */
import { z } from 'zod/v4';

import { InferType, ZodSelect } from '../src/select.js';

const UserSchema = z.object({
	address: z.object({
		city: z.string(),
		state: z.string(),
		street: z.string(),
		zip: z.string()
	}),
	email: z.string(),
	firstName: z.string(),
	lastName: z.string()
});

function find<T extends ZodSelect<typeof UserSchema>>(select: T): InferType<typeof UserSchema, T> {
	// ...Find Logic
	return null as any;
}

const user = find({
	address: { street: true },
	firstName: true,
	lastName: true
});

/* user inferred as:
{
	firstName: string;
	lastName: string;
	address: { street: string };
}
*/

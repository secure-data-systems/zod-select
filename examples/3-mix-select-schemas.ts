/* eslint-disable @typescript-eslint/no-unused-vars */
import { z } from 'zod';

import { InferMergedType, MultiSelect } from '../src/select.js';

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

function find<T extends MultiSelect<typeof UserSchema>>(select: T): InferMergedType<typeof UserSchema, T> {
	// ...Find Logic
	return null as any;
}

const user = find([
	{ lastName: true },
	z.object({
		address: z.object({ state: z.string() })
	})
]);

/* user inferred as:
{
	lastName: string;
	address: { state: string };
}
*/

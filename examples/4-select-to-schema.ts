/* eslint-disable @typescript-eslint/no-unused-vars */
import { z } from 'zod';

import { refineSchema } from '../src/refine-schema.js';

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

const schema = refineSchema(UserSchema, {
	address: true,
	firstName: true
});

/* schema.shape
{
	firstName: z.ZodString;
	address: z.ZodObject<...>;
}
*/

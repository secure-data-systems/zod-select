/* eslint-disable @typescript-eslint/no-unused-vars */
import { z, ZodType } from 'zod';

import { mergeSelect } from '../src/merge-select.js';
import { refineSchema } from '../src/refine-schema.js';
import { InferMergedType, MergeSelect, MultiSelect } from '../src/select.js';

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

function find<T extends MultiSelect<typeof UserSchema>>(select: T): InferMergedType<typeof UserSchema, T>[] {
	const selectArr = Array.isArray(select) ? select : [select];
	const sel: Record<string, 1> = {};

	for (let schema of selectArr) {
		if (!(schema instanceof ZodType)) {
			schema = refineSchema(UserSchema, schema);
			continue;
		}

		// Crawl each zod schema building the select statement
		// sel[] = 1;
	}

	// Find Logic
	return null as any;
}

function getUsersFromTexas<T extends MultiSelect<typeof UserSchema>>(
	sel?: T
): InferMergedType<typeof UserSchema, MergeSelect<typeof UserSchema, { address: boolean }, T>>[] {
	const users = find(
		// Use the merge select function to combined a ZodSelect with a MultiSelect
		mergeSelect(UserSchema, { address: true }, sel)
	);

	return users.filter(user =>
		// At this point the user object has address and whatever fields are specified in the passed in select
		// but VS code doesn't know what fields are going to be passed in at runtime. It does know that address
		// was selected inside this function so it is strongly typed with a fully selected address object
		user.address.state === 'TX'
	);
}

const users = getUsersFromTexas({
	firstName: true,
	lastName: true
});

// At this point we know what fields we selected and the extra fields added by the getUsersFromTexas function

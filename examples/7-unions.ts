/* eslint-disable @typescript-eslint/no-unused-vars */
import z from 'zod';

import { refineSchema } from '../src/refine-schema.js';

const individual = z.object({
	_id: z.string().regex(/^[a-f\d]{24}$/),
	firstName: z.string(),
	lastName: z.string()
});

const organization = z.object({
	_id: z.string().regex(/^[a-f\d]{24}$/),
	name: z.string()
});

const entity = z.union([individual, organization]);

const ticket = z.object({
	entity: entity
});

const topLevel = refineSchema(
	entity,
	{
		_id: true,
		name: true
	}
);

const nLevel = refineSchema(
	ticket,
	{
		entity: {
			_id: true
		}
	}
);

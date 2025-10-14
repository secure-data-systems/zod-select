/* eslint-disable @typescript-eslint/no-unused-vars */
import z from 'zod';

import { refineSchema } from '../src/refine-schema.js';

const Individual = z.object({
	_id: z.string().regex(/^[a-f\d]{24}$/),
	firstName: z.string(),
	lastName: z.string()
});

const Organization = z.object({
	_id: z.string().regex(/^[a-f\d]{24}$/),
	name: z.string()
});

const Entity = z.union([Individual, Organization]);

const Ticket = z.object({
	entity: Entity
});

const topLevel = refineSchema(
	Entity,
	{
		_id: true,
		name: true
	}
);

const nLevel = refineSchema(
	Ticket,
	{
		entity: {
			_id: true
		}
	}
);

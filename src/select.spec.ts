import { describe, it } from 'node:test';
import { z } from 'zod';

import { InferMergedType, ZodSelect } from './select.js';

const internalService = z.object({
	name: z.string(),
	type: z.literal('internal')
}).strict();

const externalService = z.object({
	iconUrl: z.string().optional(),
	name: z.string(),
	type: z.literal('external')
}).strict();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const serviceType = z.union([internalService, externalService]);

describe('InferMergedType', () => {
	it('should resolve to z.infer<T> when used in a generic function with TSelect = undefined', () => {
		function getServices<TSelect extends undefined | ZodSelect<typeof serviceType, true> = undefined>(
			options: { select?: TSelect }
		): Record<string, InferMergedType<typeof serviceType, TSelect>> {
			void options;
			return {} as any;
		}

		// When called without select, TSelect defaults to undefined
		// InferMergedType<typeof Service, undefined> should resolve to z.infer<typeof Service>
		const services = getServices({});
		const service = Object.values(services)[0];

		// This is a compile-time test: the assertion below must type-check (all
		// union members have `name: string`). The impl returns `{}`, so guard the
		// dereference — the block never runs but TS still checks it.
		if (service) {
			const name: string = service.name;
			void name;
		}
	});

	it('should resolve to projected type when used in a generic function with a select', () => {
		function getServices<TSelect extends undefined | ZodSelect<typeof serviceType, true> = undefined>(
			options: { select?: TSelect }
		): Record<string, InferMergedType<typeof serviceType, TSelect>> {
			void options;
			return {} as any;
		}

		// When called with a select, the return type should be the projected type
		const services = getServices({ select: { name: true } });
		const service = Object.values(services)[0];

		// This is a compile-time test: the assertion below must type-check (name
		// was selected). The impl returns `{}`, so guard the dereference — the
		// block never runs but TS still checks it.
		if (service) {
			const name: string = service.name;
			void name;
		}
	});
});

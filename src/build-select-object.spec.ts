import { strict as assert } from 'assert';
import { describe, it } from 'node:test';
import { z } from 'zod';

import { buildSelectObject } from './build-select-object.js';

describe('.buildSelectObject()', () => {
	it('should return all keys set to true for a flat object', () => {
		const schema = z.object({
			age: z.number(),
			name: z.string()
		});

		assert.deepStrictEqual(buildSelectObject(schema), { age: true, name: true });
	});

	it('should merge keys from all union members', () => {
		const schema = z.union([
			z.object({ type: z.literal('a'), valueA: z.string() }),
			z.object({ type: z.literal('b'), valueB: z.number() })
		]);

		assert.deepStrictEqual(buildSelectObject(schema), {
			type: true,
			valueA: true,
			valueB: true
		});
	});

	it('should merge keys from an intersection', () => {
		const schema = z.intersection(
			z.object({ a: z.string() }),
			z.object({ b: z.number() })
		);

		assert.deepStrictEqual(buildSelectObject(schema), { a: true, b: true });
	});

	it('should unwrap optional/nullable wrappers', () => {
		const inner = z.object({ id: z.string(), value: z.number() });
		const schema = inner.optional();

		assert.deepStrictEqual(buildSelectObject(schema as any), { id: true, value: true });
	});

	it('should unwrap lazy schemas', () => {
		const schema = z.lazy(() => z.object({ bar: z.number(), foo: z.string() }));

		assert.deepStrictEqual(buildSelectObject(schema as any), { bar: true, foo: true });
	});

	it('should handle nested unions inside intersection', () => {
		const schema = z.intersection(
			z.union([
				z.object({ a: z.string() }),
				z.object({ b: z.number() })
			]),
			z.object({ c: z.boolean() })
		);

		assert.deepStrictEqual(buildSelectObject(schema), {
			a: true,
			b: true,
			c: true
		});
	});

	it('should only collect top-level keys (not nested)', () => {
		const schema = z.object({
			active: z.boolean(),
			user: z.object({
				age: z.number(),
				name: z.string()
			})
		});

		assert.deepStrictEqual(buildSelectObject(schema), { active: true, user: true });
	});
});

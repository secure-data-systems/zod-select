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

	it('should recursively expand nested objects', () => {
		const schema = z.object({
			active: z.boolean(),
			user: z.object({
				age: z.number(),
				name: z.string()
			})
		});

		assert.deepStrictEqual(buildSelectObject(schema), {
			active: true,
			user: { age: true, name: true }
		});
	});

	it('should recursively expand deeply nested objects', () => {
		const schema = z.object({
			name: z.string(),
			organization: z.object({
				_id: z.string(),
				address: z.object({
					city: z.string(),
					country: z.string()
				})
			})
		});

		assert.deepStrictEqual(buildSelectObject(schema), {
			name: true,
			organization: { _id: true, address: { city: true, country: true } }
		});
	});

	it('should expand optional nested objects', () => {
		const schema = z.object({
			name: z.string(),
			organization: z.object({
				_id: z.string(),
				name: z.string()
			}).optional()
		});

		assert.deepStrictEqual(buildSelectObject(schema), {
			name: true,
			organization: { _id: true, name: true }
		});
	});

	it('should not expand arrays', () => {
		const schema = z.object({
			name: z.string(),
			tags: z.array(z.string())
		});

		assert.deepStrictEqual(buildSelectObject(schema), { name: true, tags: true });
	});

	it('should not expand arrays of objects', () => {
		const schema = z.object({
			items: z.array(z.object({ id: z.string(), value: z.number() })),
			name: z.string()
		});

		assert.deepStrictEqual(buildSelectObject(schema), { items: true, name: true });
	});

	it('should handle recursive schemas without infinite loop', () => {
		interface Node { children?: Node[], name: string, parent?: Node };

		const node: z.ZodType<Node> = z.lazy(() => z.object({
			children: z.array(node).optional(),
			name: z.string(),
			parent: node.optional()
		}));

		const schema = z.object({
			name: z.string(),
			root: node
		});

		// Should not throw or hang — recursive objects hit depth limit
		const result = buildSelectObject(schema);
		assert.strictEqual(result.name, true);
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		assert.ok(typeof result.root === 'object' && result.root !== null);
	});
});

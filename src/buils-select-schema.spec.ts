import { strict as assert } from 'assert';
import { describe, it } from 'node:test';
import { z, ZodObject } from 'zod/v4';

import { buildSelectSchema } from './build-select-schema.js';
import { getInnerType, isZodObjectLoose } from './utilities.js';

describe('.buildSelectSchema()', () => {
	it('should build select schema for a flat object', () => {
		const schema = z.object({
			age: z.number(),
			name: z.string()
		});
		const selectSchema = buildSelectSchema(schema);

		assert(selectSchema instanceof ZodObject);

		assert.deepEqual(selectSchema.parse({ name: true }), { name: true });
		assert.deepEqual(selectSchema.parse({}), {});

		assert.throws(() =>
			selectSchema.parse({ name: 'yes' }), /expected boolean/
		);

		assert.throws(() =>
			selectSchema.parse({ unknown: true }), /Unrecognized key/
		);
	});

	it('should handle nested objects', () => {
		const schema = z.object({
			user: z.object({
				id: z.string(),
				profile: z.object({
					displayName: z.string()
				})
			})
		});
		const selectSchema = buildSelectSchema(schema);

		const result = selectSchema.parse({
			user: {
				id: true,
				profile: {
					displayName: true
				}
			}
		});

		assert.deepEqual(result, {
			user: {
				id: true,
				profile: {
					displayName: true
				}
			}
		});
	});

	it('should build select schema for a union of objects', () => {
		const schema = z.union([
			z.object({ type: z.literal('a'), valueA: z.string() }).strict(),
			z.object({ type: z.literal('b'), valueB: z.number() }).strict()
		]);
		const selectSchema = buildSelectSchema(schema);

		assert(selectSchema instanceof ZodObject);

		const result = selectSchema.parse({
			type: true,
			valueA: true
		});

		assert.deepEqual(result, {
			type: true,
			valueA: true
		});

		assert.throws(() =>
			selectSchema.parse({ valueC: true }), /Unrecognized key/
		);
	});

	it('should support intersections of objects', () => {
		const schema = z.intersection(
			z.object({ a: z.string() }),
			z.object({ b: z.number() })
		);

		const select = buildSelectSchema(schema);

		assert.strictEqual(getInnerType(select.shape.a).def.type, 'boolean');
		assert.strictEqual(getInnerType(select.shape.b).def.type, 'boolean');
	});

	it('should support tuples of objects', () => {
		const schema = z.tuple([
			z.object({ foo: z.string() }),
			z.object({ bar: z.number() })
		]);

		const select = buildSelectSchema(schema);

		assert.strictEqual(getInnerType(select.shape.foo).def.type, 'boolean');
		assert.strictEqual(getInnerType(select.shape.bar).def.type, 'boolean');
	});

	it('should return a strict schema if all members are strict', () => {
		const schema = z.union([
			z.object({ strictA: z.string() }).strict(),
			z.object({ strictB: z.number() }).strict()
		]);

		const select = buildSelectSchema(schema);

		assert.strictEqual(isZodObjectLoose(select), false);
	});

	it('should allow optional keys in the select schema', () => {
		const schema = z.object({
			optionalField: z.string().optional()
		});

		const select = buildSelectSchema(schema);
		assert.strictEqual(getInnerType(select.shape.optionalField).def.type, 'boolean');
	});
});

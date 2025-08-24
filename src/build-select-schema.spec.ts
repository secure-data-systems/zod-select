import { strict as assert } from 'assert';
import { describe, it } from 'node:test';
import { z, ZodBoolean, ZodLazy, ZodObject, ZodOptional, ZodType, ZodUnion } from 'zod';

import { BasicSelect, buildSelectSchema } from './build-select-schema.js';
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

		assert.strictEqual(getInnerType((select as ZodObject).shape.a).def.type, 'boolean');
		assert.strictEqual(getInnerType((select as ZodObject).shape.b).def.type, 'boolean');
	});

	it('should support tuples of objects', () => {
		const schema = z.tuple([
			z.object({ foo: z.string() }),
			z.object({ bar: z.number() })
		]);

		const select = buildSelectSchema(schema);

		assert.strictEqual(getInnerType((select as ZodObject).shape.foo).def.type, 'boolean');
		assert.strictEqual(getInnerType((select as ZodObject).shape.bar).def.type, 'boolean');
	});

	it('should return a strict schema if all members are strict', () => {
		const schema = z.union([
			z.object({ strictA: z.string() }).strict(),
			z.object({ strictB: z.number() }).strict()
		]);

		const select = buildSelectSchema(schema);

		assert.strictEqual(isZodObjectLoose((select as ZodObject)), false);
	});

	it('should allow optional keys in the select schema', () => {
		const schema = z.object({
			optionalField: z.string().optional()
		});

		const select = buildSelectSchema(schema);
		assert.strictEqual(getInnerType((select as ZodObject).shape.optionalField).def.type, 'boolean');
	});

	it('should handle direct recursion', () => {
		interface Role {
			name: string,
			roles: Role[]
		}

		const RoleSchema: ZodType<Role> = z.lazy(() => {
			return (
				z.object({
					name: z.string(),
					roles: z.array(RoleSchema)
				})
			);
		});

		const select = buildSelectSchema(RoleSchema);

		assert.deepStrictEqual(Object.keys((select as ZodObject).shape), ['name', 'roles']);

		const nameSelect = (select as ZodObject).shape.name;
		assert.strictEqual(nameSelect.def.type, 'optional');
		assert.strictEqual(nameSelect.def.innerType.def.type, 'boolean');

		const rolesSelect = (select as ZodObject).shape.roles;
		assert.strictEqual(rolesSelect.def.type, 'lazy');

		const innerUnion = rolesSelect.def.getter().def.innerType;
		assert.strictEqual(innerUnion.def.type, 'union');

		const booleanItem = innerUnion.def.options[0];
		assert.strictEqual(booleanItem.def.type, 'boolean');

		const roleItem = innerUnion.def.options[1];
		assert.strictEqual(roleItem.def.type, 'object');
	});

	it('should support mutual recursion (cross-recursive)', () => {
		interface A { b: B }
		interface B { a: A }

		const A: z.ZodType<A> = z.lazy(() =>
			z.object({
				b: B
			})
		);

		const B: z.ZodType<B> = z.lazy(() =>
			z.object({
				a: A
			})
		);

		const select = buildSelectSchema(A);
		assert.strictEqual((select as any as ZodObject).shape.b.def.type, 'lazy');

		const bUnion = (select as any as ZodObject).shape.b.def.getter();

		assert.strictEqual(bUnion.def.innerType.def.type, 'union');

		const bObj = bUnion.def.innerType.def.options[1];
		assert.strictEqual(bObj.shape.a.def.type, 'lazy');
	});

	it('should share the same instance in recursion (no infinite loop)', () => {
		interface Role {
			name: string,
			roles: Role[]
		}

		const Role: ZodType<Role> = z.lazy(() =>
			z.object({
				name: z.string(),
				roles: z.array(Role)
			})
		);

		const select = buildSelectSchema(Role);
		const rolesSelect = (select as ZodObject).shape.roles;
		const unionSelect = (rolesSelect as ZodLazy<ZodOptional<ZodUnion<readonly [ZodBoolean, BasicSelect]>>>).def.getter().def.innerType;
		const nestedRoleSelect = (unionSelect.def.options[1] as ZodObject).shape.roles;

		// Should be the same object (by reference)
		assert.strictEqual(rolesSelect, nestedRoleSelect);
	});

	it('should support record types', () => {
		const schema = z.object({
			tags: z.record(z.string(), z.string())
		});

		const select = buildSelectSchema(schema);

		const tagsSelect = (select as ZodObject).shape.tags as
			z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodRecord<z.ZodString, z.ZodOptional<z.ZodBoolean>>]>>;

		assert.strictEqual(tagsSelect.type, 'optional');

		const union = tagsSelect.def.innerType;

		assert.strictEqual(union.type, 'union');
		assert.strictEqual(union.def.options[0].type, 'boolean');
		assert.strictEqual(union.def.options[1].type, 'record');
		assert.strictEqual(union.def.options[1].def.keyType.type, 'string');
		assert.strictEqual(union.def.options[1].def.valueType.type, 'optional');
		assert.strictEqual(union.def.options[1].def.valueType.def.innerType.type, 'boolean');
	});

	it('should support unknown types', () => {
		const schema = z.object({
			tags: z.unknown()
		});

		const select = buildSelectSchema(schema);

		const result = select.safeParse({
			tags: {
				any: {
					damn: true
				},
				thing: true
			}
		});

		assert.strictEqual(result.success, true);
		assert.deepStrictEqual(
			result.data,
			{
				tags: {
					any: {
						damn: true
					},
					thing: true
				}
			}
		);
	});
});

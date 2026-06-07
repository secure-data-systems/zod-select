import { strict as assert, deepStrictEqual, throws } from 'assert';
import { describe, it } from 'node:test';
import { z, ZodError } from 'zod';

import { refineSchema, type RefineSchema } from './refine-schema.js';

describe('.refineSchema()', () => {
	it('should retain required fields', () => {
		const userSchema = z.object({
			age: z.number().optional(),
			firstName: z.string(),
			lastName: z.string()
		});

		const refinedSchema = refineSchema(userSchema, {
			firstName: true,
			lastName: true
		});

		const parsedData = refinedSchema.parse({
			firstName: 'John',
			lastName: 'Doe'
		});

		assert.equal(parsedData.firstName, 'John');
		assert.equal(parsedData.lastName, 'Doe');
	});

	it('should handle optional fields', () => {
		const userSchema = z.object({
			age: z.number().optional(),
			firstName: z.string(),
			lastName: z.string()
		});

		const refinedSchema = refineSchema(userSchema, {
			age: true
		});

		const parsedData = refinedSchema.parse({ age: 25 });
		assert.equal(parsedData.age, 25);

		const parsedWithoutAge = refinedSchema.parse({});
		assert.equal(parsedWithoutAge.age, undefined);
	});

	it('should handle nullable fields', () => {
		const roleSchema = z.object({
			name: z.string()
		});

		const userSchema = z.object({
			firstName: z.string(),
			role: roleSchema.nullable()
		});

		const refinedSchema = refineSchema(userSchema, {
			role: true
		});

		const parsedWithNullRole = refinedSchema.parse({
			firstName: 'Alice',
			role: null
		});

		assert.equal(parsedWithNullRole.role, null);
	});

	it('should handle both optional and nullable fields', () => {
		const roleSchema = z.object({
			name: z.string()
		});

		const userSchema = z.object({
			firstName: z.string(),
			role: roleSchema.nullable().optional()
		});

		const refinedSchema = refineSchema(userSchema, {
			role: {
				name: true
			}
		});

		const parsedWithRole = refinedSchema.parse({
			firstName: 'Alice',
			role: { name: 'Admin' }
		});
		assert.deepStrictEqual(parsedWithRole.role, { name: 'Admin' });

		const parsedWithNullRole = refinedSchema.parse({
			firstName: 'Alice',
			role: null
		});
		assert.strictEqual(parsedWithNullRole.role, null);

		const parsedWithoutRole = refinedSchema.parse({ firstName: 'Alice' });
		assert.strictEqual(parsedWithoutRole.role, undefined);
	});

	it('should apply custom schema transformations', () => {
		const roleSchema = z.object({
			name: z.string()
		});

		const userSchema = z.object({
			firstName: z.string(),
			role: roleSchema
		});

		const refinedSchema = refineSchema(userSchema, {
			role: schema => (schema as typeof roleSchema).extend({ permissions: z.array(z.string()) })
		});

		const parsedData = refinedSchema.parse({
			firstName: 'Bob',
			role: { name: 'User', permissions: ['read', 'write'] }
		});

		assert.deepEqual(parsedData.role, {
			name: 'User',
			permissions: ['read', 'write']
		});
	});

	it('should handle nested arrays', () => {
		const roleSchema = z.object({
			level: z.number(),
			title: z.string()
		});

		const userSchema = z.object({
			age: z.number().optional(),
			firstName: z.string(),
			lastName: z.string(),
			nestedArray: z.array(z.object({ name: z.string(), value: z.number() })).optional().nullable(),
			role: roleSchema.nullable().optional(),
			tags: z.array(z.string()).optional()
		});

		const refinedSchema = refineSchema(userSchema, {
			nestedArray: {
				name: true
			}
		});

		const parsedData = refinedSchema.parse({
			firstName: 'Alice',
			lastName: 'Smith',
			nestedArray: [{ name: 'Feature1', value: 10 }, { name: 'Feature2', value: 20 }]
		});

		assert.deepStrictEqual(parsedData.nestedArray, [{ name: 'Feature1' }, { name: 'Feature2' }]);

		// Test optional array
		const parsedWithoutNestedArray = refinedSchema.parse({
			firstName: 'Alice',
			lastName: 'Smith'
		});
		assert.equal(parsedWithoutNestedArray.nestedArray, undefined);
	});

	it('should handle custom fields', () => {
		interface Address {
			city: string,
			state: string,
			street: string
		}

		const userSchema = z.object({
			address: z.custom<Address>().optional(),
			firstName: z.string(),
			lastName: z.string()
		});

		const refinedSchema = refineSchema(userSchema, {
			address: true
		});

		const parsedData = refinedSchema.parse({
			address: {
				city: 'Austin',
				state: 'TX',
				street: '123 Main Street'
			},
			firstName: 'Alice',
			lastName: 'Smith'
		});

		assert.deepStrictEqual(
			parsedData,
			{
				address: {
					city: 'Austin',
					state: 'TX',
					street: '123 Main Street'
				}
			}
		);
	});

	it('should support unions of objects', () => {
		const person = z.object({
			firstName: z.string(),
			lastName: z.string()
		});

		const address = z.object({
			address: z.string(),
			city: z.string()
		});

		const schema = refineSchema(z.union([person, address]), {
			address: true,
			firstName: true
		});

		let parseResult = schema.parse({
			address: '123 Main Street',
			firstName: 'Jerry',
			lastName: 'Springer'
		});

		deepStrictEqual(parseResult, { firstName: 'Jerry' });

		parseResult = schema.parse({
			address: '123 Main Street',
			city: 'Austin'
		});

		deepStrictEqual(parseResult, { address: '123 Main Street' });
	});

	it('should error if none of the types are matched', () => {
		const person = z.object({
			firstName: z.string(),
			lastName: z.string()
		});

		const address = z.object({
			address: z.string(),
			city: z.string()
		});

		const schema = refineSchema(z.union([person, address]), {
			address: true,
			firstName: true
		});

		throws(() => {
			schema.parse({
				lastName: 'Springer'
			});
		}, (err) => {
			if (!(err instanceof ZodError) || err.issues[0]!.code !== 'invalid_union') {
				return false;
			}

			return true;
		});
	});

	it('should exclude fields specified as false in the shape', () => {
		const schema = z.object({
			firstName: z.string(),
			lastName: z.string()
		});

		const refined = refineSchema(schema, {
			firstName: true,
			lastName: false
		});

		// lastName was specified as false — it should be excluded from the refined schema
		const result = refined.parse({ firstName: 'Alice', lastName: 'Smith' });

		assert.deepStrictEqual(result, { firstName: 'Alice' });
	});

	it('should support unions of objects and simple types', () => {
		const person = z.object({
			firstName: z.string(),
			lastName: z.string()
		});

		const schema = refineSchema(z.union([person, z.string()]), {
			address: true,
			firstName: true
		});

		let parseResult = schema.parse({
			firstName: 'Jerry',
			lastName: 'Springer'
		});

		deepStrictEqual(parseResult, { firstName: 'Jerry' });

		parseResult = schema.parse('123 Main Street');

		deepStrictEqual(parseResult, '123 Main Street');
	});

	it('should accept selecting a subfield of a union member with an optional array-of-objects field', () => {
		// Regression test for a bug in `UnionFieldType` (refine-schema.ts).
		//
		// `UnionFieldType` chose a union member field's refine shape with
		// `z.infer<T> extends Array<infer U>` but, unlike `RefineType`, it did not
		// strip `| undefined` first. For an OPTIONAL array-of-objects member
		// (`field: Obj.array().optional()`), `z.infer<T>` is `Obj[] | undefined`,
		// which is NOT assignable to `Array<infer U>`, so the field's refine shape
		// collapsed to `RefineObject<Obj[]>` (the array's own keys) instead of
		// `RefineObject<Obj>`. The runtime was unaffected, so this only broke the
		// type-check (`tsc`), not `tsx --test`.
		const accessLevel = z.object({
			_id: z.string(),
			name: z.string()
		});

		const organizationInvitation = z.object({
			accessLevels: accessLevel.array().optional(),
			organizationId: z.string(),
			type: z.literal('organization')
		});

		const platformInvitation = z.object({
			accessLevels: accessLevel.array().optional(),
			type: z.literal('platform')
		});

		const invitation = z.discriminatedUnion('type', [organizationInvitation, platformInvitation]);

		// Type-level assertion: drilling into a subfield of the optional array
		// member is a valid select and MUST be assignable to the refine shape.
		// With the bug present, this `satisfies` fails to compile.
		const select = {
			accessLevels: { name: true },
			type: true
		} satisfies RefineSchema<typeof invitation, false>;

		const refined = refineSchema(invitation, select);

		const parsed = refined.parse({
			accessLevels: [{ name: 'Admin' }],
			type: 'organization'
		});

		assert.equal(parsed.type, 'organization');
		assert.deepEqual(parsed.accessLevels, [{ name: 'Admin' }]);
	});

	it('allows selecting a nested subfield of a declared looseObject field', () => {
		// Regression test for `RefineObject` collapsing a `z.looseObject`'s declared fields.
		//
		// A `z.looseObject` carries a catchall index signature (`[k: string]: unknown`).
		// `RefineObject` maps over `keyof T`, and when `T` has an index signature `keyof T`
		// collapses to `string | number`, so every declared field's value type came from the
		// catchall (`unknown` -> scalar `boolean`). Declared fields could be marked `true` but
		// could NOT be drilled into. The runtime was unaffected, so this only broke the
		// type-check (`tsc`), not `tsx --test`.
		const personName = z.object({
			first: z.string().optional(),
			last: z.string().optional()
		});

		const user = z.looseObject({
			_id: z.string(),
			name: personName.optional(),
			username: z.string()
		});

		const root = z.object({
			invitedBy: user
		});

		// Type-level assertion: drilling into `invitedBy.name.first` is valid and MUST be
		// assignable to the refine shape. With the bug present this `satisfies` fails to
		// compile because `invitedBy`'s declared fields collapse to an index signature with
		// `boolean` values.
		const select = {
			invitedBy: { name: { first: true } }
		} satisfies RefineSchema<typeof root, false>;

		const refined = refineSchema(root, select);

		const parsed = refined.parse({
			invitedBy: { name: { first: 'Alice' } }
		});

		assert.equal(parsed.invitedBy.name?.first, 'Alice');
	});
});

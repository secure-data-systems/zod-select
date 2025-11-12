import { strict as assert, deepStrictEqual, throws } from 'assert';
import { describe, it } from 'node:test';
import { z, ZodError } from 'zod';

import { refineSchema } from './refine-schema.js';

describe('.refineSchema()', () => {
	it('should retain required fields', () => {
		const UserSchema = z.object({
			age: z.number().optional(),
			firstName: z.string(),
			lastName: z.string()
		});

		const RefinedSchema = refineSchema(UserSchema, {
			firstName: true,
			lastName: true
		});

		const parsedData = RefinedSchema.parse({
			firstName: 'John',
			lastName: 'Doe'
		});

		assert.equal(parsedData.firstName, 'John');
		assert.equal(parsedData.lastName, 'Doe');
	});

	it('should handle optional fields', () => {
		const UserSchema = z.object({
			age: z.number().optional(),
			firstName: z.string(),
			lastName: z.string()
		});

		const RefinedSchema = refineSchema(UserSchema, {
			age: true
		});

		const parsedData = RefinedSchema.parse({ age: 25 });
		assert.equal(parsedData.age, 25);

		const parsedWithoutAge = RefinedSchema.parse({});
		assert.equal(parsedWithoutAge.age, undefined);
	});

	it('should handle nullable fields', () => {
		const RoleSchema = z.object({
			name: z.string()
		});

		const UserSchema = z.object({
			firstName: z.string(),
			role: RoleSchema.nullable()
		});

		const RefinedSchema = refineSchema(UserSchema, {
			role: true
		});

		const parsedWithNullRole = RefinedSchema.parse({
			firstName: 'Alice',
			role: null
		});

		assert.equal(parsedWithNullRole.role, null);
	});

	it('should handle both optional and nullable fields', () => {
		const RoleSchema = z.object({
			name: z.string()
		});

		const UserSchema = z.object({
			firstName: z.string(),
			role: RoleSchema.nullable().optional()
		});

		const RefinedSchema = refineSchema(UserSchema, {
			role: {
				name: true
			}
		});

		const parsedWithRole = RefinedSchema.parse({
			firstName: 'Alice',
			role: { name: 'Admin' }
		});
		assert.deepStrictEqual(parsedWithRole.role, { name: 'Admin' });

		const parsedWithNullRole = RefinedSchema.parse({
			firstName: 'Alice',
			role: null
		});
		assert.strictEqual(parsedWithNullRole.role, null);

		const parsedWithoutRole = RefinedSchema.parse({ firstName: 'Alice' });
		assert.strictEqual(parsedWithoutRole.role, undefined);
	});

	it('should apply custom schema transformations', () => {
		const RoleSchema = z.object({
			name: z.string()
		});

		const UserSchema = z.object({
			firstName: z.string(),
			role: RoleSchema
		});

		const RefinedSchema = refineSchema(UserSchema, {
			role: (schema: typeof RoleSchema) => schema.extend({ permissions: z.array(z.string()) })
		});

		const parsedData = RefinedSchema.parse({
			firstName: 'Bob',
			role: { name: 'User', permissions: ['read', 'write'] }
		});

		assert.deepEqual(parsedData.role, {
			name: 'User',
			permissions: ['read', 'write']
		});
	});

	it('should handle nested arrays', () => {
		const RoleSchema = z.object({
			level: z.number(),
			title: z.string()
		});

		const UserSchema = z.object({
			age: z.number().optional(),
			firstName: z.string(),
			lastName: z.string(),
			nestedArray: z.array(z.object({ name: z.string(), value: z.number() })).optional().nullable(),
			role: RoleSchema.nullable().optional(),
			tags: z.array(z.string()).optional()
		});

		const RefinedSchema = refineSchema(UserSchema, {
			nestedArray: {
				name: true
			}
		});

		const parsedData = RefinedSchema.parse({
			firstName: 'Alice',
			lastName: 'Smith',
			nestedArray: [{ name: 'Feature1', value: 10 }, { name: 'Feature2', value: 20 }]
		});

		assert.deepStrictEqual(parsedData.nestedArray, [{ name: 'Feature1' }, { name: 'Feature2' }]);

		// Test optional array
		const parsedWithoutNestedArray = RefinedSchema.parse({
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

		const UserSchema = z.object({
			address: z.custom<Address>().optional(),
			firstName: z.string(),
			lastName: z.string()
		});

		const RefinedSchema = refineSchema(UserSchema, {
			address: true
		});

		const parsedData = RefinedSchema.parse({
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
		const Person = z.object({
			firstName: z.string(),
			lastName: z.string()
		});

		const Address = z.object({
			address: z.string(),
			city: z.string()
		});

		const Schema = refineSchema(z.union([Person, Address]), {
			address: true,
			firstName: true
		});

		let parseResult = Schema.parse({
			address: '123 Main Street',
			firstName: 'Jerry',
			lastName: 'Springer'
		});

		deepStrictEqual(parseResult, { firstName: 'Jerry' });

		parseResult = Schema.parse({
			address: '123 Main Street',
			city: 'Austin'
		});

		deepStrictEqual(parseResult, { address: '123 Main Street' });
	});

	it('should error if none of the types are matched', () => {
		const Person = z.object({
			firstName: z.string(),
			lastName: z.string()
		});

		const Address = z.object({
			address: z.string(),
			city: z.string()
		});

		const Schema = refineSchema(z.union([Person, Address]), {
			address: true,
			firstName: true
		});

		throws(() => {
			Schema.parse({
				lastName: 'Springer'
			});
		}, (err) => {
			if (!(err instanceof ZodError) || err.issues[0]!.code !== 'invalid_union') {
				return false;
			}

			return true;
		});
	});

	it('should support unions of objects and simple types', () => {
		const Person = z.object({
			firstName: z.string(),
			lastName: z.string()
		});

		const Schema = refineSchema(z.union([Person, z.string()]), {
			address: true,
			firstName: true
		});

		let parseResult = Schema.parse({
			firstName: 'Jerry',
			lastName: 'Springer'
		});

		deepStrictEqual(parseResult, { firstName: 'Jerry' });

		parseResult = Schema.parse('123 Main Street');

		deepStrictEqual(parseResult, '123 Main Street');
	});
});

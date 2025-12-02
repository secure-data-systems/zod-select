import { strict as assert, deepStrictEqual, throws } from 'assert';
import { describe, it } from 'node:test';
import { z, ZodError } from 'zod';

import { refineSchema } from './refine-schema.js';

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
			role: (schema: typeof roleSchema) => schema.extend({ permissions: z.array(z.string()) })
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
});

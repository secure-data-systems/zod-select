import assert from 'node:assert';
import { describe, it } from 'node:test';
import { z } from 'zod';

import { getInnerType, isZodObject, isZodOptional, isZodRecord, isZodUnion, isZodUnknown } from './utilities.js';

describe('.utilities()', () => {
	describe('.getInnerType()', () => {
		it('getInnerType identifies inner types', () => {
			const optionalString = z.string().optional();
			const nullableString = z.string().nullable();
			const defaultString = z.string().default('default');
			const catchString = z.string().catch('fallback');
			const lazyString = z.lazy(() => z.string());
			const arrayString = z.array(z.string());

			assert.strictEqual((getInnerType(optionalString) as z.ZodString).def.type, optionalString.def.innerType.def.type);
			assert.strictEqual((getInnerType(nullableString) as z.ZodString).def.type, nullableString.def.innerType.def.type);
			assert.strictEqual((getInnerType(defaultString) as z.ZodString).def.type, defaultString.def.innerType.def.type);
			assert.strictEqual((getInnerType(catchString) as z.ZodString).def.type, (catchString.def.innerType as z.ZodString).def.type);
			assert.strictEqual((getInnerType(lazyString) as z.ZodString).def.type, (lazyString.def.getter() as z.ZodString).def.type);
			assert.strictEqual((getInnerType(arrayString) as z.ZodString).def.type, arrayString.element.def.type);
			assert.strictEqual(getInnerType(z.string()).def.type, 'string'); // Not a wrapper type
		});

		it('should return base type from array', () => {
			const schema = z.array(z.number());
			const inner = getInnerType(schema);

			assert.strictEqual(inner.def.type, 'number');
		});

		it('should unwrap nested optional -> nullable -> default -> string', () => {
			const schema = z.string().default('x').nullable().optional();
			const inner = getInnerType(schema);

			assert.strictEqual(inner.def.type, 'string');
		});

		it('should unwrap lazy inside nested wrappers', () => {
			const lazySchema = z.lazy(() => z.string());
			const wrapped = lazySchema.optional().nullable().default('abc');
			const inner = getInnerType(wrapped);

			assert.strictEqual(inner.def.type, 'string');
		});
	});

	it('isZodObject detects ZodObject', () => {
		const objectSchema = z.object({ name: z.string() });
		const stringSchema = z.string();
		assert.ok(isZodObject(objectSchema));
		assert.ok(!isZodObject(stringSchema));
	});

	it('isZodObject should detect loose objects when isLoose is passed', () => {
		assert.ok(isZodObject(z.looseObject({}), true));
		assert.ok(!isZodObject(z.looseObject({}), false));
		assert.ok(!isZodObject(z.strictObject({}), true));
		assert.ok(isZodObject(z.strictObject({}), false));
	});

	it('isZodOptional detects ZodOptional', () => {
		const optionalSchema = z.string().optional();
		const stringSchema = z.string();
		assert.ok(isZodOptional(optionalSchema));
		assert.ok(!isZodOptional(stringSchema));
	});

	it('isZodRecord detects complex record schemas with optional fields', () => {
		// Create a sample RecordAttachmentSchema
		const recordAttachmentSchema = z.object({
			name: z.string(),
			size: z.number(),
			type: z.string()
		});

		// Create a record schema with optional field
		const attachmentsSchema = z.record(z.string(), recordAttachmentSchema).optional();
		const nonRecordSchema = z.object({ field: z.string() });

		// Test record detection
		assert.ok(isZodRecord(z.record(z.string(), recordAttachmentSchema)), 'Should detect record schema');
		assert.ok(isZodRecord(attachmentsSchema.unwrap()), 'Should detect optional record schema when unwrapped');
		assert.ok(!isZodRecord(nonRecordSchema), 'Should not detect object schema as record');

		// Test with actual record data
		const validRecord = z.record(z.string(), recordAttachmentSchema).parse({
			'file1': { name: 'test.pdf', size: 1024, type: 'application/pdf' },
			'file2': { name: 'image.jpg', size: 2048, type: 'image/jpeg' }
		});

		assert.ok(validRecord, 'Should successfully parse valid record data');
	});

	it('isZodRecord detects ZodRecord', () => {
		const recordSchema = z.record(z.string(), z.string());
		const stringSchema = z.string();
		assert.ok(isZodRecord(recordSchema));
		assert.ok(!isZodRecord(stringSchema));
	});

	it('isZodUnion detects ZodUnion', () => {
		const unionSchema = z.union([z.string(), z.number()]);
		const stringSchema = z.string();
		assert.ok(isZodUnion(unionSchema));
		assert.ok(!isZodUnion(stringSchema));
	});

	it('isZodUnknown detects ZodUnknown', () => {
		assert.ok(isZodUnknown(z.unknown()));
		assert.ok(!isZodUnknown(z.string()));
	});
});

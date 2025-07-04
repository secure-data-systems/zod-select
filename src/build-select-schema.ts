import { z, ZodBoolean, ZodDiscriminatedUnion, ZodIntersection, ZodObject, ZodOptional, ZodTuple, ZodType, ZodUnion } from 'zod/v4';

import { RefineObject, RefineZodUnion } from './refine-schema.js';
import { getInnerType, isZodObject, isZodObjectLoose } from './utilities.js';

export type BasicSelect = ZodObject<
	Readonly<{
		[k: string]: ZodOptional<ZodBoolean | ZodUnion<[ZodBoolean, BasicSelect]>>
	}>
>;

function buildSelect(schema: ZodType): ZodBoolean | ZodUnion<[ZodBoolean, BasicSelect]> {
	schema = getInnerType(schema);

	if (isZodObject(schema)) {
		const shape: Record<string, ZodBoolean | ZodUnion<[ZodBoolean, BasicSelect]>> = {};

		for (const key in schema.shape) {
			shape[key] = buildSelect(schema.shape[key]);
		}

		let result = z.object(shape).partial();

		if (!isZodObjectLoose(schema)) {
			result = result.strict();
		}

		return z.union([z.boolean(), result]);
	}

	let types: undefined | ZodType[];

	if (schema.def.type === 'intersection') {
		types = [(schema as ZodIntersection).def.left as ZodType, (schema as ZodIntersection).def.right as ZodType];
	}

	if (schema.def.type === 'tuple') {
		types = (schema as ZodTuple).def.items as ZodType[];
	}

	if (schema.def.type === 'union') {
		types = (schema as ZodUnion).def.options as ZodType[];
	}

	if (types) {
		const shape: { [k: string]: ZodOptional<ZodBoolean | ZodUnion<[ZodBoolean, BasicSelect]>> } = {};
		let isStrict = false;

		for (const cur of types) {
			const select = buildSelect(cur);

			if (select.def.type === 'union') {
				for (const key in select.def.options[1].shape) {
					shape[key] = select.def.options[1].shape[key];
				}

				if (!isZodObjectLoose(select.def.options[1])) {
					isStrict = true;
				}
			}
		}

		let result = z.object(shape);

		if (isStrict) {
			result = result.strict();
		}

		return z.union([z.boolean(), result]);
	}

	return z.boolean();
}

export function buildSelectSchema(schema: ZodType<object> | ZodUnion): BasicSelect {
	const result = buildSelect(schema) as z.ZodUnion<[z.ZodBoolean, BasicSelect]>;

	return result.def.options[1];
}

/*
export function buildSelectSchema<T extends ZodType<object>>(schema: T): ZodType<RefineObject<z.infer<T>, boolean>>;
export function buildSelectSchema<T extends ZodUnion>(schema: T): ZodType<RefineZodUnion<T>>;
export function buildSelectSchema<
	T extends ZodType<object> | ZodUnion
>(schema: T): z.infer<T> extends object ? ZodType<RefineObject<z.infer<T>>, boolean> : T extends ZodUnion ? ZodType<RefineZodUnion<T>> : never;

export function buildSelectSchema<T extends ZodType<object> | ZodUnion>(schema: T): ZodType {
	if (schema instanceof ZodObject) {
		const selectShape: Record<string, ZodType> = {};

		for (const key in schema.shape) {
			const value = schema.shape[key];
			selectShape[key] = value instanceof ZodObject
				? buildSelectSchema(value)
				: z.literal(true);
		}

		return z.object(selectShape).strict();
	}

	if (schema instanceof ZodUnion) {
		const options = schema.options as ZodType[];
		const objectSchemas = options.map(opt => buildSelectSchema(opt) as AnyZodObject);
		return z.object(mergeShapes(objectSchemas)).strict();
	}

	if (schema instanceof ZodDiscriminatedUnion) {
		const options = Array.from(schema.options.values());
		const objectSchemas = options.map(opt => buildSelectSchema(opt) as AnyZodObject);
		return z.object(mergeShapes(objectSchemas)).strict();
	}

	if (schema instanceof ZodIntersection) {
		const left = buildSelectSchema(schema.def.left) as AnyZodObject;
		const right = buildSelectSchema(schema.def.right) as AnyZodObject;
		return z.object(mergeShapes([left, right])).strict();
	}

	// fallback
	return z.object({}).strict();
}

function mergeShapes(shapes: AnyZodObject[]): Record<string, ZodType> {
	const merged: Record<string, ZodType> = {};

	for (const shape of shapes) {
		for (const key in shape.shape) {
			const field = shape.shape[key];

			if (field instanceof ZodObject) {
				const existing = merged[key];
				const nested = existing instanceof ZodObject
					? mergeShapes([existing as AnyZodObject, field])
					: buildSelectSchema(field);
				merged[key] = z.object(nested.shape);
			} else {
				merged[key] = z.literal(true);
			}
		}
	}
	return merged;
}
*/

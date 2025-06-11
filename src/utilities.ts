import { ZodArray, ZodCatch, ZodDefault, ZodLazy, ZodNullable, ZodObject, ZodOptional, ZodType, ZodUnion, ZodUnknown } from 'zod/v4';

export function getInnerType(schema: ZodType): undefined | ZodType {
	if (schema instanceof ZodOptional || schema instanceof ZodNullable || schema instanceof ZodDefault || schema instanceof ZodCatch) {
		return schema.def.innerType as ZodType;
	} else if (schema instanceof ZodLazy) {
		return schema.def.getter() as ZodType;
	} else if (schema instanceof ZodArray) {
		return schema.element as ZodType;
	}

	// Not a recognized wrapper type
	return undefined;
}

export function isZodArray(obj: unknown): obj is ZodArray<ZodType> {
	return isZodType(obj) && (obj.def.type === 'array');
}

export function isZodNullable(obj: unknown): obj is ZodNullable<ZodType> {
	return isZodType(obj) && (obj.def.type === 'nullable');
}

export function isZodObject(obj: unknown, isLoose?: boolean): obj is ZodObject {
	if (!isZodType(obj) || (obj.def.type !== 'object')) {
		return false;
	}

	if (typeof isLoose === 'undefined') {
		return true;
	}

	return isLoose === isZodUnknown((obj as ZodObject).def.catchall);
}

export function isZodOptional(obj: unknown): obj is ZodOptional<ZodType> {
	return isZodType(obj) && (obj.def.type === 'optional');
}

export function isZodType(obj: unknown): obj is ZodType {
	return typeof obj === 'object' && obj !== null && 'def' in obj && 'safeParse' in obj && typeof (obj as ZodType).safeParse === 'function';
}

export function isZodUnion(obj: unknown): obj is ZodUnion<ZodType[]> {
	return isZodType(obj) && (obj.def.type === 'union');
}

export function isZodUnknown(obj: unknown): obj is ZodUnknown {
	return isZodType(obj) && (obj.def.type === 'unknown');
}

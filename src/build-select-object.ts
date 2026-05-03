import { ZodCatch, ZodDefault, ZodIntersection, ZodLazy, ZodNullable, ZodOptional, ZodType, ZodUnion } from 'zod';

import { ZodSelect } from './select.js';
import { getInnerType, isZodObject, isZodUnion } from './utilities.js';

interface SelectObject { [key: string]: SelectObject | true }

type SelectValue = SelectObject | true;
export type ZodSelectAll<T extends ZodType<object> | ZodUnion> = { [K in keyof ZodSelect<T, true>]-?: true };

/**
 * Produces a runtime select-all object for the given Zod schema.
 *
 * Every scalar key is set to `true`. Nested object fields are recursively
 * expanded into nested select objects. Array fields remain `true`.
 * For union schemas the result is the merged set of keys across all variants.
 *
 * @example
 * ```ts
 * const select = buildSelectObject(AuthenticationService);
 * // { name: true, type: true, isEnabled: true, ... }
 * ```
 */
export function buildSelectObject<T extends ZodType<object> | ZodUnion>(schema: T): ZodSelectAll<T> {
	const result: Record<string, SelectValue> = {};
	collectKeys(schema, result);
	return result as ZodSelectAll<T>;
}

/**
 * Unwraps optional/nullable/default/catch/lazy wrappers but NOT arrays.
 */
function unwrapField(schema: ZodType): ZodType {
	if (
		schema instanceof ZodOptional
		|| schema instanceof ZodNullable
		|| schema instanceof ZodDefault
		|| schema instanceof ZodCatch
	) {
		return unwrapField(schema.def.innerType as ZodType);
	}

	if (schema instanceof ZodLazy) {
		return unwrapField(schema.def.getter() as ZodType);
	}

	return schema;
}

const MAX_DEPTH = 10;

function collectKeys(schema: ZodType, result: Record<string, SelectValue>, depth = 0): void {
	if (depth >= MAX_DEPTH) {
		return;
	}

	schema = getInnerType(schema);

	if (isZodObject(schema)) {
		for (const key in schema.shape) {
			const fieldInner = unwrapField(schema.shape[key]);

			if (isZodObject(fieldInner)) {
				const nested: Record<string, SelectValue> = {};
				collectKeys(fieldInner, nested, depth + 1);
				result[key] = nested;
			} else {
				result[key] = true;
			}
		}
	} else if (isZodUnion(schema)) {
		for (const option of schema.options) {
			collectKeys(option, result, depth);
		}
	} else if (schema.def.type === 'intersection') {
		collectKeys((schema as ZodIntersection).def.left as ZodType, result, depth);
		collectKeys((schema as ZodIntersection).def.right as ZodType, result, depth);
	}
}

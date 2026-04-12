import { ZodIntersection, ZodType, ZodUnion } from 'zod';

import { ZodSelect } from './select.js';
import { getInnerType, isZodObject, isZodUnion } from './utilities.js';

/**
 * Produces a runtime select-all object for the given Zod schema.
 *
 * Every top-level key is set to `true`, which tells the server to include
 * that field in the response.  For union schemas the result is the merged
 * set of keys across all variants.
 *
 * @example
 * ```ts
 * const select = buildSelectObject(AuthenticationService);
 * // { name: true, type: true, isEnabled: true, ... }
 * ```
 */
export function buildSelectObject<T extends ZodType<object> | ZodUnion>(schema: T): ZodSelect<T, true> {
	const result: Record<string, true> = {};
	collectKeys(schema, result);
	return result as ZodSelect<T, true>;
}

function collectKeys(schema: ZodType, result: Record<string, true>): void {
	schema = getInnerType(schema);

	if (isZodObject(schema)) {
		for (const key in schema.shape) {
			result[key] = true;
		}
	} else if (isZodUnion(schema)) {
		for (const option of schema.options) {
			collectKeys(option, result);
		}
	} else if (schema.def.type === 'intersection') {
		collectKeys((schema as ZodIntersection).def.left as ZodType, result);
		collectKeys((schema as ZodIntersection).def.right as ZodType, result);
	}
}

import { z, ZodBoolean, ZodIntersection, ZodLazy, ZodObject, ZodOptional, ZodTuple, ZodType, ZodUnion } from 'zod';

import { ZodSelect } from './select.js';
import { getInnerType, isZodLazy, isZodObject, isZodObjectLoose } from './utilities.js';

export type BasicSelect = ZodObject<
	Readonly<{
		[k: string]:
			| Clause
			| ZodLazy<Clause>
	}>
>;

type Clause = ZodOptional<ZodBoolean> | ZodOptional<ZodUnion<readonly [ZodBoolean, BasicSelect]>>;

function buildSelect(
	schema: ZodType,
	cache = new Map<ZodType, Clause | ZodLazy<Clause>>()
): Clause | ZodLazy<Clause> {
	schema = getInnerType(schema, false);

	if (cache.has(schema)) {
		return cache.get(schema)!;
	}

	if (isZodLazy(schema)) {
		const select = z.lazy(() => {
			return buildSelect(schema.def.getter() as ZodType, cache) as Clause;
		});

		cache.set(schema, select);

		return select;
	}

	if (isZodObject(schema)) {
		const shape: Record<string, Clause | ZodLazy<Clause>> = {};
		let select: BasicSelect;

		for (const key in schema.shape) {
			shape[key] = buildSelect(schema.shape[key], cache);
		}

		select = z.object(shape);

		if (!isZodObjectLoose(schema)) {
			select = select.strict();
		}

		const result = z.union([z.boolean(), select]).optional();

		cache.set(schema, result);

		return result;
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
		const hasLazy = types.some(item => isZodLazy(item));

		if (hasLazy) {
			return z.lazy(() => {
				return buildSelectMerge(types);
			});
		}

		return buildSelectMerge(types);
	}

	return z.boolean().optional();
}

function buildSelectMerge(types: ZodType[]): Clause {
	const shape: Record<string, Clause | ZodLazy<Clause>> = {};
	let isStrict = false;

	for (const cur of types) {
		const select = buildSelect(cur);
		let clause: Clause;

		if (isZodLazy(select)) {
			clause = select.def.getter();
		} else {
			clause = select;
		}

		if (clause.def.innerType.def.type === 'union') {
			const obj = getInnerType(clause.def.innerType.def.options[1]) as ZodObject;

			for (const key in obj.shape) {
				shape[key] = obj.shape[key];
			}

			if (!isZodObjectLoose(obj)) {
				isStrict = true;
			}
		}
	}

	let result = z.object(shape);

	if (isStrict) {
		result = result.strict();
	}

	return z.union([z.boolean(), result]).optional();
}

export function buildSelectSchema<T extends ZodType<object> | ZodUnion>(schema: T): ZodType<ZodSelect<T, true>> {
	const result = buildSelect(schema);

	if (isZodLazy(result)) {
		return (result.def.getter().def.innerType as ZodUnion).def.options[1] as ZodType<ZodSelect<T, true>>;
	}

	return (result.def.innerType as ZodUnion).def.options[1] as ZodType<ZodSelect<T, true>>;
}

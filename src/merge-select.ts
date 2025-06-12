import { ZodType, ZodUnion } from 'zod/v4';

import { MergeSelect, MultiSelect, ZodSelect } from './select.js';

export function mergeSelect<
	T extends ZodType<object> | ZodUnion,
	TSelect1 extends ZodSelect<T>,
	TSelect2 extends MultiSelect<T>
>(
	schema: T, select1: TSelect1, select2?: TSelect2
): MergeSelect<T, TSelect1, TSelect2> {
	if (select2 === undefined) {
		return [select1, schema] as MergeSelect<T, TSelect1, TSelect2>;
	}

	if (Array.isArray(select2)) {
		return [select1, ...select2] as MergeSelect<T, TSelect1, TSelect2>;
	}

	return [select1, select2] as MergeSelect<T, TSelect1, TSelect2>;
}

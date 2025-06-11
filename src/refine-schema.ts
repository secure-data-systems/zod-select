import { core, z, ZodAny, ZodArray, ZodBoolean, ZodDate, ZodLiteral, ZodNever, ZodNullable, ZodNumber, ZodObject, ZodOptional, ZodRawShape, ZodString, ZodType, ZodUnion, ZodUnknown } from 'zod/v4';

import { IsAny, IsJsonType, Mutable } from './types.js';
import { getInnerType, isZodArray, isZodNullable, isZodObject, isZodOptional, isZodType, isZodUnion } from './utilities.js';

export type RefinedSchema<
	T extends ZodType<object> | ZodUnion,
	TShape extends RefineSchema<T>
> = T extends ZodUnion ? RefinedUnionSchema<T, TShape>
	: T extends ZodType<object> ? RefinedTypeSchema<z.infer<T>, TShape>
  : never;

export type RefinedTypeSchema<T extends object, TShape, TDepth extends number = 0> =
	TDepth extends keyof DepthLimit
		? ZodObject<{
			[K in keyof T & keyof TShape]:
				// Use the result of the refinement function
				TShape[K] extends (schema: infer S) => ZodType ? ReturnType<TShape[K]>

				// Use the redefined ZodType if provided
				: TShape[K] extends ZodType ? TShape[K]

				// Keep the original type
				: TShape[K] extends boolean ? Zodify<T[K]>

				: TShape[K] extends object
					?
						// Handle array of nested objects
						Exclude<T[K], null | undefined> extends Array<infer U>
							? U extends object
								? ApplyOptionalNullable<T[K], z.ZodArray<RefinedTypeSchema<U, TShape[K], NextDepth<TDepth>>>>

								// Keep original if array items are not objects
								: Zodify<T[K]>

					: Exclude<T[K], null | undefined> extends object
						? ApplyOptionalNullable<T[K], RefinedTypeSchema<Exclude<T[K], null | undefined>, TShape[K], NextDepth<TDepth>>>
							: ZodNever
					: ZodNever;
		}, core.$strict> : any;

export type RefinedUnionSchema<T extends ZodUnion, TShape> = ZodUnion<
	T['options'] extends Readonly<[infer A, ...infer Rest]>
		? Rest extends ZodType[]
			? [ReapplyOptionalNullable<
				A,
					A extends ZodType<object>
						? RefinedTypeSchema<z.infer<A>, TShape>
						: Extract<A, ZodType>
			>,
			...{
				[K in keyof Rest]: Rest[K] extends ZodType
					? z.infer<Rest[K]> extends object
						? RefinedTypeSchema<z.infer<Rest[K]>, TShape>
						: Extract<Rest[K], ZodType>
					: Extract<Rest[K], ZodType>;
			}
			]
			: never
		: never
>;

// Recursive type to define shape of fields to pick, redefine, or refine
export type RefineObject<T extends object> = {
	[K in keyof T]?: RefineType<T[K]>
};

export type RefineSchema<
	T extends ZodType<object> | ZodUnion
> = T extends ZodUnion
	? RefineZodUnion<T>
	: T extends ZodType<object>
		? RefineObject<T['_output']>
		: never;

export type RefineZodUnion<T extends ZodUnion>
	= {
		[K in keyof UnionToIntersection<
			T['options'][number] extends ZodObject<infer Shape extends ZodRawShape> ? Shape : object
		>]?: boolean;
	};

// Because Zod handles undefined and nulls as type wrappers instead of unions this type does
// not handle null and undefined types. They must be stripped out before using this type.
// eslint-disable-next-line @typescript-eslint/naming-convention
export type TuplifyUnion<T, TDepth extends number = 0, L = LastOf<T>, N = [T] extends [never] ? true : false> =
	TDepth extends 9 ? [] // Stop recursion at depth 3 for debugging
	: true extends N ? []
	: Push<TuplifyUnion<Exclude<T, L>, NextDepth<TDepth>>, InternalZodify<L>>;

export type UnionToIntersection<U> =
	(U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never;

export type Zodify<T, TDepth extends number = 0> =
	ApplyOptionalNullable<T,
		IsTuple<
			TuplifyUnion<Exclude<T, null | undefined>, TDepth>,
			ZodUnion<TuplifyUnion<Exclude<T, null | undefined>, TDepth>>,
			InternalZodify<Exclude<T, null | undefined>, TDepth>
		>
	>;

type ApplyOptionalNullable<T, U extends ZodType> =
	IsAny<
		T,
		U,
		undefined extends T
			? null extends T
				? ZodOptional<ZodNullable<U>>
				: ZodOptional<U>
			: null extends T ? ZodNullable<U>
			: U
	>;

type DepthLimit = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

// Recursive type to map a TypeScript type to a Zod schema
type InternalZodify<T, TDepth extends number = 0> =
	TDepth extends 9 ? ZodType
	: IsAny<
		T,
		ZodAny,

		T extends string
			? string extends T ? ZodString : ZodLiteral<T>
		: T extends number ? ZodNumber
		: T extends boolean ? ZodBoolean
		: T extends Date ? ZodDate
		: unknown extends T ? ZodUnknown
		: T extends Array<infer U> ? ZodArray<Zodify<U, NextDepth<TDepth>>>
		: T extends object
			? IsJsonType<
				T,
				true,
				ZodObject<{ [K in keyof T]-?: Zodify<T[K], NextDepth<TDepth>> }, core.$strict>,
				ZodType<T>
			>
		: never
	>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type IsTuple<T, TTrue = true, TFalse = false> = T extends [infer TFirst, infer TSecond, ...infer TRest] ? TTrue : TFalse;

type LastOf<T> =
	UnionToIntersection<T extends any ? () => T : never> extends () => (infer R) ? R : never;

type NextDepth<T extends number> =
  T extends 0 ? 1 :
  T extends 1 ? 2 :
  T extends 2 ? 3 :
  T extends 3 ? 4 :
  T extends 4 ? 5 :
  T extends 5 ? 6 :
  T extends 6 ? 7 :
  T extends 7 ? 8 :
  T extends 8 ? 9 :
  9;

type Push<T extends any[], V> = [...T, V];

// Helper to reapply optional and nullable wrappers
type ReapplyOptionalNullable<T, U extends z.ZodType> =
	T extends ZodOptional<ZodNullable<ZodType>>
		? ZodOptional<ZodNullable<U>> :
	T extends ZodNullable<ZodOptional<ZodType>>
		? ZodNullable<ZodOptional<U>> :
	T extends ZodOptional<ZodType>
		? ZodOptional<U> :
	T extends ZodNullable<ZodType>
		? ZodNullable<U> :
	U;

type Refinement<T extends ZodType> = ((schema: T) => ZodType) | boolean | ZodType;

type RefineType<T> =
	IsTuple<
		TuplifyUnion<Exclude<T, null | undefined>>,

		Refinement<Zodify<T>>,

		Exclude<T, null | undefined> extends string ? Refinement<ApplyOptionalNullable<T, ZodString>>
			: Exclude<T, null | undefined> extends number ? Refinement<ApplyOptionalNullable<T, ZodNumber>>
			: Exclude<T, null | undefined> extends boolean ? Refinement<ApplyOptionalNullable<T, ZodBoolean>>
			: Exclude<T, null | undefined> extends Date ? Refinement<ApplyOptionalNullable<T, ZodDate>>
			: Exclude<T, null | undefined> extends Array<infer U>
				? Exclude<U, null | undefined> extends object
					? Refinement<Zodify<T>> | RefineObject<Extract<U, object>>
						: Refinement<Zodify<T>>
			: Exclude<T, null | undefined> extends object
				? IsJsonType<
					Exclude<T, null | undefined>,
					false,
					Refinement<Zodify<T>> | RefineObject<Extract<T, object>>,
					Refinement<Zodify<T>>
				>
			: unknown extends Exclude<T, null | undefined>
				? Refinement<Zodify<T>>
			: never
	>;

// Main function to refine the schema
export function refineSchema<
	T extends ZodType<object> | ZodUnion,
	TShape extends RefineSchema<T>
>(
	schema: T,
	shape: TShape
): RefinedSchema<T, TShape> {
	if (isZodObject(schema)) {
		const refinedShape: Mutable<ZodRawShape> = {};
		const schemaShape = schema.shape;

		for (const key in shape) {
			if (key in schemaShape) {
				refinedShape[key] = refineSchemaField(schemaShape[key], shape[key]);
			}
		}

		return z.object(refinedShape) as RefinedSchema<T, TShape>;
	} else if (isZodUnion(schema)) {
		const refinedOptions = schema.options.map(option => refineSchemaField(option, shape));

		return z.union(refinedOptions as any) as RefinedSchema<T, TShape>;
	}

	throw new Error('Unsupported schema type for refinement');
}

// Helper function to refine a single schema field
function refineSchemaField<T extends ZodType, TShape>(fieldSchema: T, fieldShape: TShape): ZodType {
	if (fieldShape === true) {
		return fieldSchema; // Keep original type
	} else if (typeof fieldShape === 'function') {
		return fieldShape(fieldSchema); // Apply refinement function
	} else if (isZodType(fieldShape)) {
		return fieldShape; // Use redefined type
	} else if (isZodObject(fieldSchema)) {
		return refineSchema(fieldSchema, fieldShape as any); // Recursively refine nested objects
	} else if (isZodUnion(fieldSchema)) {
		return refineSchema(fieldSchema, fieldShape as any);
	} else if (isZodArray(fieldSchema)) {
		// Recursively refine array items
		return z.array(
			refineSchemaField(fieldSchema.element, fieldShape)
		);
	} else if (isZodOptional(fieldSchema)) {
		return refineSchemaField(fieldSchema._def.innerType, fieldShape).optional();
	} else if (isZodNullable(fieldSchema)) {
		return refineSchemaField(fieldSchema._def.innerType, fieldShape).nullable();
	} else {
		const innerType = getInnerType(fieldSchema);

		// There are wrapper types we can't forward because the underlying object structures are changing.
		if (innerType) {
			return refineSchemaField(innerType, fieldShape);
		}
	}

	return fieldSchema;
}

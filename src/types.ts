export type DeepMerge<T, U> = {
	[K in keyof T | keyof U]: K extends keyof T
		? K extends keyof U
			? T[K] extends object
				? U[K] extends object
					? DeepMerge<T[K], U[K]>
					: T[K] | U[K]
				: T[K] | U[K]
			: T[K]
		: K extends keyof U
		? U[K]
		: never;
};

export type DeepMergeAll<T> = T extends readonly any[]
	? T extends [infer First, ...infer Rest]
		? Rest extends []
			? First
			: DeepMerge<First, DeepMergeAll<Rest>>
		: unknown
	: T;

export type IsAny<T, TTrue = true, TFalse = false> = 0 extends (1 & T) ? TTrue : TFalse;

export type IsEqual<T, U, TTrue = true, TFalse = false> =
  (<V>() => V extends T ? 1 : 2) extends
  (<V>() => V extends U ? 1 : 2) ? TTrue : TFalse;

export type IsJsonType<T, TDeep extends boolean = true, TTrue = true, TFalse = false> =
	T extends JsonType
		? TTrue
		// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
		: T extends Function
			? TFalse
			: T extends Array<infer U>
				? TDeep extends false
					? TTrue
					: IsJsonType<U, TDeep, TTrue, TFalse>
				: T extends object
					? TDeep extends false
						? TTrue
						: {
							[K in keyof T]: IsJsonType<T[K], true, false>
						} extends { [K in keyof T]: true }
							? TTrue
							: TFalse
					: TFalse;

export type Mutable<T> = {
	-readonly [P in keyof T]: T[P];
};

type JsonType = boolean | null | number | string | undefined;

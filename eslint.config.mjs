import securedatasystems from '@securedatasystems/eslint-config';

export default [
	...securedatasystems.configs.flat,
	{
		ignores: [
			'**/dist/*',
			'**/scripts/*',
			'eslint.config.mjs',
			'test.ts',
			'tsconfig.json'
		]
	}
];
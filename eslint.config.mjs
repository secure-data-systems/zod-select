import temelyos from '@temelyos/eslint-config';

export default [
	...temelyos.configs.flat,
	{
		ignores: [
			'.claude/*',
			'**/dist/*',
			'**/scripts/*',
			'eslint.config.mjs',
			'test.ts',
			'tsconfig.json'
		]
	}
];
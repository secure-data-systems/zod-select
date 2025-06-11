import synergy from '@securedatasystems/eslint-config';

export default [
	...synergy.configs.flat,
	{
		ignores: [
			'**/dist/*',
			'**/build/*',
			'**/scripts/*',
			'**/*-dbschema.js',
			'commitlint.config.js',
			'eslint.config.mjs',
			'release.config.mjs',
			'test.ts',
			'tsconfig.json'
		]
	}
];
import eslintJs from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import importeslint from 'eslint-plugin-import';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import tseslint from 'typescript-eslint';

export default [
	eslintPluginPrettierRecommended,
	eslintJs.configs.recommended,
	...tseslint.configs.recommended,
	tseslint.configs.eslintRecommended,
	{
		ignores: ['node_modules', '**/node_modules', '.idea', '.vscode', '.github', '**/dist'],

		languageOptions: {
			parser: tsParser,
		},

		rules: {
			'no-unused-vars': 'off',
			'no-console': 'error',
			'@typescript-eslint/no-shadow': ['error', { ignoreTypeValueShadow: true }],

			quotes: [
				'error',
				'single',
				{
					allowTemplateLiterals: true,
				},
			],

			semi: ['error', 'always'],

			'semi-spacing': [
				'error',
				{
					before: false,
					after: true,
				},
			],

			'comma-dangle': ['error', 'always-multiline'],
			'object-curly-spacing': ['error', 'always'],
			'no-case-declarations': 'error',
			'no-extra-boolean-cast': 'off',
			'no-useless-catch': 'off',
			'no-constant-condition': 'off',
			'@typescript-eslint/ban-ts-comment': 'off',
			'@typescript-eslint/no-unused-vars': 'off',
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/no-inferrable-types': 'off',
			'@typescript-eslint/ban-types': 'off',
			'import/no-named-as-default': 'off',
			'import/order': [
				'error',
				{
					groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
					'newlines-between': 'always',
					alphabetize: {
						order: 'asc',
					},
					pathGroups: [
						{
							pattern: '@fw/**',
							group: 'parent',
							position: 'before',
						},
					],
					pathGroupsExcludedImportTypes: ['@fw/**'],
					distinctGroup: false,
				},
			],
		},
		plugins: {
			import: importeslint,
		},
	},
];

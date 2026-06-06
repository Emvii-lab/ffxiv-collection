import js from '@eslint/js';
import globals from 'globals';

export default [
    {
        ignores: ['dist/**', 'node_modules/**', '_archive/**', 'text_app.js'],
    },
    js.configs.recommended,
    {
        files: ['src/**/*.js', '*.config.js'],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: 'module',
            globals: {
                ...globals.browser,
            },
        },
        rules: {
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'no-console': 'off',
            eqeqeq: ['warn', 'smart'],
            'prefer-const': 'warn',
        },
    },
    {
        // Node-side config files and tests
        files: ['*.config.js', 'vitest.config.js', '**/*.test.js'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
];

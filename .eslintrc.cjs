
// Those types/features are not fully supported in Opera Mini and IE 11.
const notPolyfilled = [
    'Number',
    'Object',
    'Promise',
    'performance',
]

module.exports = {
    extends: ['@cdoublev/eslint-config'],
    overrides: [
        {
            extends: ['@cdoublev/eslint-config/node', '@cdoublev/eslint-config/jest'],
            files: ['__tests__/*.js'],
            globals: {
                document: 'readonly',
                window: 'writable',
            },
        },
        {
            extends: ['@cdoublev/eslint-config/browser'],
            files: ['src/*.js'],
            settings: {
                polyfills: notPolyfilled,
            },
        },
    ],
    parser: '@babel/eslint-parser',
}

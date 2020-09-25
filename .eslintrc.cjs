
module.exports = {
    env: { jest: true },
    extends: ['@cdoublev/eslint-config'],
    overrides: [
        {
            extends: ['@cdoublev/eslint-config/jest'],
            files: ['__tests__/*.js'],
            globals: {
                document: 'readonly',
            },
        },
        {
            extends: ['@cdoublev/eslint-config/browser'],
            files: ['src/*.js'],
            settings: {
                polyfills: [
                    'Number',
                    'Object',
                    'Promise',
                    'Symbol',
                    'performance',
                ],
            },
        },
    ],
    parser: '@babel/eslint-parser',
}

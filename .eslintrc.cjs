
module.exports = {
    env: { jest: true },
    extends: ['@cdoublev/eslint-config'],
    overrides: [
        {
            files: ['__tests__/*.js'],
            globals: {
                document: 'readonly',
            },
            extends: ['@cdoublev/eslint-config/jest'],
        },
        {
            files: ['src/*.js'],
            extends: ['@cdoublev/eslint-config/browser'],
            settings: {
                polyfills: [
                    "Number",
                    "Object",
                    "Promise",
                    "Symbol",
                    "performance",
                ]
            },
        },
    ],
    parser: '@babel/eslint-parser',
}

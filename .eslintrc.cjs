
module.exports = {
    env: { jest: true },
    extends: ['@cdoublev/eslint-config/browser'],
    settings: {
        polyfills: [
            "Number",
            "Object",
            "Promise",
            "Symbol",
            "performance",
        ]
    }
}

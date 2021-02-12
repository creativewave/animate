
const plugins = [
    '@babel/plugin-transform-runtime',
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-private-methods',
    '@babel/plugin-proposal-private-property-in-object',
]

module.exports = api => {

    const env = api.env()

    if (env === 'browser') {
        return {
            plugins,
            presets: [['@babel/preset-env', { targets: { esmodules: true } }]],
        }
    }

    return {
        exclude: /node_modules/,
        plugins,
        presets: [['@babel/preset-env', {
            corejs: '3.8',
            modules: env === 'node' ? false : 'auto',
            targets: env === 'development'
                ? { esmodules: true } // lint
                : { node: true },     // build:node, test
            useBuiltIns: 'usage',
        }]],
    }
}

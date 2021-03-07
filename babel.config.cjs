
const { dependencies } = require('./package.json')

const plugins = [
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-private-methods',
    '@babel/plugin-proposal-private-property-in-object',
]
const presetEnv = {
    bugfixes: true,
    corejs: dependencies['core-js'],
    loose: true,
    useBuiltIns: 'usage',
}
const presets = [['@babel/preset-env', presetEnv]]

module.exports = api => {

    const env = api.env()

    if (env === 'cjs' || env === 'es') {
        plugins.push(['@babel/plugin-transform-runtime', { version: dependencies['@babel/runtime'] }])
        presetEnv.modules = env === 'es' ? false : 'auto'
    } else if (env === 'umd') {
        return { exclude: /core-js/, plugins, presets, targets: 'supports es6-module' }
    }

    return { exclude: /node_modules/, plugins, presets, targets: 'current node' }
}


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

    if (env === 'browser') {
        presetEnv.targets = { esmodules: true }
        return { exclude: /core-js/, plugins, presets }
    }

    presetEnv.targets = { node: true }

    if (env === 'node') {
        plugins.push(['@babel/plugin-transform-runtime', { version: dependencies['@babel/runtime'] }])
        presetEnv.modules = false
    }

    return { exclude: /node_modules/, plugins, presets }
}

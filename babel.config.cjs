
const { dependencies } = require('./package.json')
const plugins = [
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-private-methods',
    '@babel/plugin-proposal-private-property-in-object',
]
const presetEnv = { corejs: dependencies['core-js'], useBuiltIns: 'usage' }
const presets = [['@babel/preset-env', presetEnv]]

module.exports = api => {

    const env = api.env()

    if (env === 'node') {
        presetEnv.modules = false
    }
    if (env === 'browser' || env === 'development') {
        presetEnv.targets = { esmodules: true }
    } else {
        presetEnv.targets = { node: true }
    }

    if (env === 'browser') {
        return { exclude: /core-js/, plugins, presets }
    }

    plugins.push(['@babel/plugin-transform-runtime', { version: dependencies['@babel/runtime'] }])

    return { exclude: /node_modules/, plugins, presets }
}

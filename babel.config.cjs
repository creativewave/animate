
const config = {
    exclude: /node_modules/,
    plugins: [],
    presets: [['@babel/preset-env', {
        corejs: '3.8',
        // debug: true,
        targets: { node: true },
        useBuiltIns: 'usage',
    }]],
}

// ESLint requires plugins for proposals
if (process.env.NODE_ENV !== 'test') {
    config.plugins.push(
        '@babel/plugin-proposal-class-properties',
        '@babel/plugin-proposal-private-methods',
        '@babel/plugin-proposal-private-property-in-object')
}

module.exports = config


module.exports = (env, argv) => {
    process.env.NODE_ENV = env // @babel/preset-env will use it when parsing its config file
    return {
        mode: env,
        module: { rules: [{ exclude: /node_modules/, test: /\.jsx?$/, use: 'babel-loader' }] },
        output: {
            library: 'animate',
            libraryTarget: 'umd'
        },
        // TODO: remove watching options when dev is mostly done.
        watch: argv.watch,
        watchOptions: { aggregateTimeout: 300, ignored: /node_modules/, poll: true },
    }
}

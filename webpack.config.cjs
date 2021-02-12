
module.exports = {
    mode: 'production',
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader',
            },
            {
                test: /\.(c|m)?js?$/i,
                include: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        babelrc: false,
                        configFile: false,
                        presets: ['@babel/preset-env'],
                    },
                },
            },
        ],
    },
    output: {
        filename: 'browser/animate.js',
        library: 'animate',
    },
    target: ['web', 'es2017'],
}

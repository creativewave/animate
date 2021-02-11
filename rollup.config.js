
import babel from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import pkg from './package.json'
import replace from '@rollup/plugin-replace'
import { terser } from 'rollup-plugin-terser'

const externalRegexp = new RegExp(`^(${Object.keys(pkg.dependencies).join('|')})`)
const external = id => externalRegexp.test(id)
const replaceEnv = replace({ 'process.env.NODE_ENV': process.env.NODE_ENV })

const babelPresets = [
    ['@babel/preset-env', {
        corejs: '3.8',
        targets: { esmodules: true },
        useBuiltIns: 'usage',
    }]
]
const babelSyntaxPlugins = [
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-private-methods',
    '@babel/plugin-proposal-private-property-in-object',
]

export default [
    {
        external,
        input: 'src/index.js',
        output: {
            file: pkg.exports['.'],
            format: 'es',
        },
        plugins: [babel({
            babelHelpers: 'runtime',
            exclude: /node_modules/,
            plugins: ['@babel/plugin-transform-runtime', ...babelSyntaxPlugins],
            presets: babelPresets,
        })],
    },
    {
        input: 'src/index.js',
        output: {
            file: pkg.unpkg,
            format: 'umd',
            name: 'animate',
        },
        plugins: [
            replaceEnv,
            nodeResolve(),
            babel({
                babelHelpers: 'bundled',
                exclude: /node_modules/,
                plugins: babelSyntaxPlugins,
                presets: babelPresets,
            }),
            commonjs(),
            terser({ keep_fnames: /play|pause/ }),
        ],
    },
]

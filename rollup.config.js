
import babel from 'rollup-plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import pkg from './package.json'
import replace from '@rollup/plugin-replace'
import { terser } from 'rollup-plugin-terser'

const { dependencies = {}, peerDependencies = {} } = pkg
const external = id => (new RegExp(`^(${Object.keys({ ...dependencies, ...peerDependencies }).join('|')})`)).test(id)
const replaceEnv = replace({ 'process.env.NODE_ENV': process.env.NODE_ENV })

const getBabelConfig = targets => ({
    exclude: /node_modules/,
    plugins: [
        '@babel/plugin-proposal-class-properties',
        '@babel/plugin-proposal-private-methods',
        '@babel/plugin-proposal-private-property-in-object',
    ],
    presets: [['@babel/preset-env', {
        corejs: 3,
        // debug: true,
        targets,
        useBuiltIns: 'usage',
    }]]
})

export default [
    {
        external,
        input: 'src/index.js',
        output: {
            file: pkg.main,
            format: 'cjs',
        },
        plugins: [replaceEnv, babel(getBabelConfig({ node: true }))],
    },
    {
        external,
        input: 'src/index.js',
        output: {
            file: pkg.module,
            format: 'es',
        },
        plugins: [replaceEnv, babel(getBabelConfig({ esmodules: true }))],
    },
    {
        input: 'src/index.js',
        output: {
            file: pkg.unpkg,
            format: 'iife',
            name: 'animate',
        },
        plugins: [
            replaceEnv,
            nodeResolve(),
            babel(getBabelConfig('defaults')),
            commonjs(),
            terser(),
        ],
    },
]

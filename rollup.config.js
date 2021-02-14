
import babel from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'
import { terser } from 'rollup-plugin-terser'
import { unpkg } from './package.json'

export default {
    input: 'src/index.js',
    output: {
        file: unpkg,
        format: 'umd',
        name: 'animate',
    },
    plugins: [
        replace({ 'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV) }),
        nodeResolve(),
        babel({ babelHelpers: 'bundled' }),
        commonjs(),
        terser({ keep_fnames: /play|pause/ }),
    ],
}

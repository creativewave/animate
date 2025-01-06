
import browser from '@cdoublev/eslint-config/browser'
import common from '@cdoublev/eslint-config'
import jest from '@cdoublev/eslint-config/jest'
import node from '@cdoublev/eslint-config/node'

// Not fully supported in Opera Mini.
const notPolyfilled = [
    'Promise',
    'performance',
]

export default [
    common,
    { files: ['__tests__/*.js'], ...node },
    jest,
    {
        files: ['src/*.js'],
        settings: {
            polyfills: notPolyfilled,
        },
        ...browser,
    },
]

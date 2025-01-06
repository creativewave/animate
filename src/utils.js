
export const isTest = process.env.NODE_ENV === 'test'

export const isFiniteNumber = n => !Number.isNaN(n) && Number.isFinite((typeof n === 'string' && n !== '') ? +n : n)

export const isNumber = n => isFiniteNumber(n) || n === Infinity

export const isPositiveNumber = n => isNumber(n) && n >= 0

export const now = () => globalThis.performance?.now()
    ?? globalThis.require?.('perf_hooks').performance.now()
    ?? Date.now()

export const round = (n, p = 1) => isTest ? +n.toFixed(p) : n

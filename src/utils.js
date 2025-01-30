
export const isTest = process.env.NODE_ENV === 'test'

export function isFiniteNumber(n) {
    return !Number.isNaN(n) && Number.isFinite((typeof n === 'string' && n !== '') ? +n : n)
}

export function isNumber(n) {
    return isFiniteNumber(n) || n === Infinity
}

export function isPositiveNumber(n) {
    return isNumber(n) && n >= 0
}

export function round(n, p = 6) {
    return +n.toFixed(p)
}

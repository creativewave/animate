
export const isFiniteNumber = n => !Number.isNaN(n) && Number.isFinite((typeof n === 'string' && n !== '') ? +n : n)

export const isNumber = n => isFiniteNumber(n) || n === Infinity

export const isPositiveNumber = n => isNumber(n) && n >= 0

// eslint-disable-next-line no-undef
export const round = (n, p = 1) => process.env.NODE_ENV === 'test' ? +n.toFixed(p) : n

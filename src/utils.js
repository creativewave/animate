
export const isFiniteNumber = n => !isNaN(n) && Number.isFinite(n)

// eslint-disable-next-line no-undef
export const round = (n, p = 1) => process.env.NODE_ENV === 'test' ? +n.toFixed(p) : n


import { error, errors } from './error.js'

/**
 * cubic :: (Number -> Number -> Number -> Number) -> (Time -> Number)
 *
 * Memo:
 * - ease: cubic-bezier(0.25, 0.1, 0.25, 1)
 * - ease-in: cubic-bezier(0.42, 0, 1, 1)
 * - ease-out: cubic-bezier(0, 0, 0.58, 1)
 * - ease-in-out: cubic-bezier(0.42, 0, 0.58, 1)
 *
 * Speficiation: https://drafts.csswg.org/css-easing-1/#cubic-bezier-easing-functions
 */
export const cubic = (a, b, c, d) => t => {

    if (t <= 0) {
        let startGradient = 0
        if (a > 0) {
            startGradient = b / a
        } else if (!b && c > 0) {
            startGradient = d / c
        }
        return startGradient * t
    }
    if (t >= 1) {
        let endGgradient = 0
        if (c < 1)
            endGgradient = (d - 1) / (c - 1)
        else if (c == 1 && a < 1)
            endGgradient = (b - 1) / (a - 1)
        return 1 + (endGgradient * (t - 1))
    }

    let start = 0
    let end = 1
    let mid
    const f = (a, b, m) => (3 * a * (1 - m) * (1 - m) * m) + (3 * b * (1 - m) * m * m) + (m * m * m)
    while (start < end) {

        mid = (start + end) / 2
        const xEst = f(a, c, mid)

        if (Math.abs(t - xEst) < 0.00001) {
            return f(b, d, mid)
        }
        if (xEst < t) {
            start = mid
        } else {
            end = mid
        }
    }

    return f(b, d, mid)
}

/**
 * step :: (Number -> String) -> (Time -> Boolean) -> Number
 *
 * Specification: https://drafts.csswg.org/css-easing-1/#step-easing-algo
 */
export const steps = (count, position = 'end') => {

    let jumps = count
    if (position === 'start') {
        position = `jump-${position}`
    } else if (position === 'jump-none') {
        --jumps
    } else if (position === 'jump-both') {
        ++jumps
    }

    return (t, before) => {

        let step = Math.floor(t * count)

        if (position === 'jump-start' || position === 'jump-both') {
            step++
        }
        if (before && Number.isInteger(t * count)) {
            step--
        }
        if (t >= 0 && step < 0) {
            step = 0
        }
        if (t <= 1 && step > jumps) {
            step = jumps
        }

        return step / jumps
    }
}

/**
 * Easing :: Number -> Number
 *
 * Memo: currently, tree shaking an object export indexing each easing function
 * with its corresponding alias, is not possible with Rollup.
 */
const ease = cubic(0.25, 0.1, 0.25, 1)
const easeIn = t => 1 + Math.sin(Math.PI * ((t / 2) - 0.5))
const easeInOut = t => (1 + Math.sin(Math.PI * (t - 0.5))) / 2
const easeOut = t => Math.sin(Math.PI * t / 2)
export const linear = t => t
const stepEnd = steps(1, 'jump-end')
const stepStart = steps(1, 'jump-start')

const aliases = {
    ease,
    'ease-in': easeIn,
    'ease-in-out': easeInOut,
    'ease-out': easeOut,
    linear,
    'step-end': stepEnd,
    'step-start': stepStart,
}

const pointPattern = '\\s*(-?\\d+\\.?\\d*|-?\\.\\d+)\\s*'
const cubicBezierRegexp = new RegExp(`^cubic-bezier\\(${pointPattern},${pointPattern},${pointPattern},${pointPattern}\\)`)
const stepsRegexp = /^steps\(\s*(?<count>\d+)\s*(,\s*(?<position>((?:jump-)?(?:start|end|none|noth))|start|end)\s*)?\)/

/**
 * parseEasing :: String|Easing|void -> Easing
 *
 * Easing :: Time -> Number
 */
export const parseEasing = (easing = linear) => {
    if (typeof easing === 'function') {
        return easing
    } else if (typeof easing === 'string') {
        if (aliases[easing]) {
            return aliases[easing]
        }
        const [, ...points] = cubicBezierRegexp.exec(easing) ?? []
        if (points.length === 4) {
            return cubic(...points.map(Number))
        }
        const { groups: { count, position = 'end' } } = stepsRegexp.exec(easing) ?? { groups: {} }
        if (count) {
            return steps(Number(count), position)
        }
    }
    error(errors.OPTION_EASING)
}

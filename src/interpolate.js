
import error, { errors } from './error'

/**
 * Memo: a reference of one of those functions can be assigned to `interpolate`
 * in a `PropertyController` assigned to an animated `Property` in a `Keyframe`.
 */
export const interpolateNumber = (from, to, time) => from + ((to - from) * time)
export const interpolateTaggedNumbers = ([from, strings], [to], time) =>
    strings
        .slice(0, strings.length - 1)
        .reduce((value, string, number) => `${value}${string}${interpolateNumber(from[number], to[number], time)}`, '')
        .concat(strings[strings.length - 1])
export const tag = (strings, ...tags) => [tags, strings]

/**
 * parseEasing :: String|Easing|void -> Easing
 *
 * Easing :: Time -> Number
 *
 * TODO: find match against `/steps\((.*)\)/` in `easing` and parse it to create
 * the corresponding `step()`.
 */
export const parseEasing = easing => {
    if (typeof easing === 'undefined') {
        easing = easings.linear
    } else if (typeof easing === 'string') {
        easing = easings[easing]
    }
    return typeof easing === 'function' ? easing : error(errors.EASING, easing)
}

/**
 * cubic :: (Number -> Number -> Number -> Number) -> (Time -> Number)
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
 * step :: (Number -> Number) -> (Time -> Number)
 */
export const step = (count, pos) => t => {

    if (t >= 1) {
        return 1
    }

    const stepSize = 1 / count
    t += pos * stepSize

    return t - (t % stepSize)
}

/**
 * Easings :: { [String]: Time -> Number }
 *
 * Memo:
 * - ease: cubic-bezier(0.25, 0.1, 0.25, 1)
 * - ease-in: cubic-bezier(0.42, 0, 1, 1)
 * - ease-out: cubic-bezier(0, 0, 0.58, 1)
 * - ease-in-out: cubic-bezier(0.42, 0, 0.58, 1)
 *
 * Related: https://www.w3.org/TR/css-easing-1/#cubic-bezier-easing-functions
 */
export const easings = {
    'ease': cubic(0.25, 0.1, 0.25, 1),
    'ease-in': t => 1 + Math.sin(Math.PI * ((t / 2) - 0.5)),
    'ease-in-out': t => (1 + Math.sin(Math.PI * (t - 0.5))) / 2,
    'ease-out': t => Math.sin(Math.PI * t / 2),
    'linear': t => t,
    'step-end': step(1, 1),
    'step-middle': step(1, 0.5),
    'step-start': step(1, 0),
}

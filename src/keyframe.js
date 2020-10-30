
import { error, errors } from './error'
import { parseEasing } from './easing'
import { round } from './utils'

/**
 * Memo: a reference of one of those functions can be assigned to `interpolate`
 * in a `PropertyController` assigned to an animated `Property` in a `Keyframe`.
 */
export const interpolateNumber = (from, to, time) => from + ((to - from) * time)
export const interpolateTaggedNumbers = ([from, strings], [to], time) =>
    strings
        .slice(0, -1)
        .reduce((value, string, number) => `${value}${string}${interpolateNumber(from[number], to[number], time)}`, '')
        .concat(strings[strings.length - 1])
export const tag = (strings, ...tags) => [tags, strings]

/**
 * parseOffset :: (Number?|String -> Number?|String?|void -> [Number|null]) -> Number
 */
const parseOffset = (offset, index, offsets) => {
    if (isNaN(offset)) {
        error(errors.KEYFRAMES_OFFSET_TYPE)
    }
    offset = Number(offset)
    if (offset < 0 || 1 < offset) {
        error(errors.KEYFRAMES_OFFSET_RANGE)
    } else if ((offsets[index - 1] ?? 0) > offset) {
        error(errors.KEYFRAMES_OFFSET_ORDER)
    } else if (index === 0 && offset !== 0) {
        error(errors.KEYFRAMES_PARTIAL)
    }
    return offset
}

/**
 * parseObject :: Keyframes => [ProcessedKeyframe]
 */
const parseObject = keyframes => {

    /**
     * 1. Coerce each argument into a collection
     * 2. Coerce/validate each offset/easing into Number/Function
     * 3. Measure property w/ highest length
     * 4. Append prop/values in computed keyframes
     */
    const { easing, offset: offsets, length, ...props } =
        Object.entries(keyframes).reduce(
            (keyframes, [prop, values]) => {
                if (!Array.isArray(values)) {
                    values = [values]
                }
                if (prop === 'easing') {
                    values = values.map(parseEasing)
                } else if (prop === 'offset') {
                    values = values.map(parseOffset)
                } else if (values.length > keyframes.length) {
                    keyframes.length = values.length
                }
                keyframes[prop] = values
                return keyframes
            },
            { easing: [], length: 0, offset: [] })

    // Offset
    if (offsets.length === 0) {
        offsets.push(0)
    }
    if (offsets[offsets.length - 1] !== 1) {
        while (offsets.length < (length - 1)) {
            offsets.push(round(offsets[offsets.length - 1] + ((1 - offsets[offsets.length - 1]) / (length - offsets.length)), 2))
        }
        offsets.push(1)
    }
    if (offsets.length > length) {
        error(errors.KEYFRAMES_PARTIAL)
    }

    // Easing
    let index = 0
    while (easing.length < offsets.length - 1) {
        easing.push(parseEasing(easing[index++]))
    }

    const propsEntries = Object.entries(props)
    return offsets.map((offset, index) => {
        const computedKeyframe = { offset }
        if (index < (offsets.length - 1)) {
            computedKeyframe.easing = easing[index]
        }
        propsEntries.forEach(([prop, values]) => {
            let value
            if (values.length < offsets.length) {
                value = values[index / (offsets.length - 1) * (values.length - 1)]
                if (typeof value === 'undefined') {
                    return
                }
            } else {
                value = values[index]
            }
            return computedKeyframe[prop] = value
        })
        return computedKeyframe
    })
}

/**
 * parseArray :: parse :: [Keyframe] => [ProcessedKeyframe]
 */
const parseArray = keyframes => {

    const { length } = keyframes

    if (length < 2) {
        error(errors.KEYFRAMES_PARTIAL)
    }

    const lastIndex = length - 1

    return keyframes.reduce(
        (keyframes, { easing = 'linear', offset, ...props }, index, rawKeyframes) => {

            const keyframe = {}

            // Easing
            if (index < lastIndex) {
                keyframe.easing = parseEasing(easing)
            }

            // Offset
            if (typeof offset !== 'undefined') {
                keyframe.offset = parseOffset(offset, index, keyframes.map(k => k.offset))
                if (index === lastIndex && keyframe.offset !== 1) {
                    error(errors.KEYFRAMES_PARTIAL)
                }
            } else if (index === 0) {
                keyframe.offset = 0
            } else if (index === lastIndex) {
                keyframe.offset = 1
            } else {
                const { offset: prevOffset } = keyframes[index - 1]
                const nextIndex = ~rawKeyframes.slice(index + 1).findIndex(keyframe => keyframe.offset) || lastIndex
                const { offset: nextOffset = 1 } = rawKeyframes[nextIndex]
                keyframe.offset = round(prevOffset + ((nextOffset - prevOffset) / ((nextIndex + 1) - index)), 2)
            }

            // Properties
            Object.entries(props).forEach(([prop, value]) => {
                if (index > 0 && typeof keyframes[0][prop] === 'undefined') {
                    error(errors.KEYFRAMES_PARTIAL)
                }
                keyframe[prop] = value
            })
            if (index === lastIndex) {
                Object.keys(keyframes[0]).forEach(prop => {
                    if (prop !== 'easing' && typeof keyframe[prop] === 'undefined') {
                        error(errors.KEYFRAMES_PARTIAL)
                    }
                })
            }

            return keyframes.concat(keyframe)
        },
        [])
}

/**
 * parse :: Keyframes|[Keyframe] => [ProcessedKeyframe]
 *
 * Keyframe => {
 *   [Property]: a|PropertyController,
 *   easing?: String|Function,
 *   offset?: Number,
 * }
 * Keyframes => {
 *   [Property]: a|PropertyController|[a|PropertyController],
 *   easing?: String|Function|[String|Function],
 *   offset?: String|Number|[String|Number],
 * }
 * ProcessedKeyframe => {
 *   [Property]: a|PropertyController,
 *   easing?: String|Function,
 *   offset?: Number,
 * }
 *
 * It should compute a missing `offset` to `0, `1`, or a value evenly spaced
 * from the previous/next keyframe offset.
 *
 * It should throw an error/exception when:
 * - `easing` is assigned to an unknown alias
 * - `offset` is assigned to an out of range [0-1] value
 * - `offset` is assigned to a value that doesn't follow an ascending order
 * - keyframes are partially defined, either when:
 *   - first keyframe has an `offset !== 0`
 *   - last keyframe has an `offset !== 1`
 *   - first/last keyframe is missing a `Property` defined in other keyframes
 *
 * Memo: it will not handle partial keyframes as defined in the specification,
 * as it implies using `getComputedStyle()`, which is a performance killer.
 * Related: https://drafts.csswg.org/web-animations-1/#calculating-computed-keyframes
 *
 * Memo: it will not check the `Property` value as defined in the specification,
 * as it can be of any type here.
 * Related: https://drafts.csswg.org/web-animations-1/#process-a-keyframes-argument
 *
 * Memo: `Keyframes` can have a `Property` containing fewer values than `offset`
 * or `easing`, meaning that the index of current start/end `offset`s can't be
 * used directly to pick a value for `Property` and `easing`.
 *
 * Memo: the `easing` of the current interval of `Property` values should always
 * be picked based on the start `offset`, even when `playbackRate` is negative,
 * therefore `easing` will never be used in last `Keyframe`.
 * Related: https://drafts.csswg.org/web-animations-1/#keyframes-section
 */
const parse = keyframes => Array.isArray(keyframes) ? parseArray(keyframes) : parseObject(keyframes)

export default parse

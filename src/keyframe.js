
import error, { errors } from './error'
import { parseEasing } from './interpolate'

/**
 * parseOffset :: (Number|String -> Number -> [Number?]) -> Number
 *
 * Memo: `isNaN()` and `parseFloat()` will throw an error with a `Symbol`, but
 * `Number.isNan()` is usefull only when used with `NaN`.
 *
 * TODO: parse and return whole offset collection for both types of keyframes.
 */
const parseOffset = (offset, index, offsets) => {
    if (typeof offset !== 'number') {
        if (typeof offset === 'string' && !Number.isNaN(parseFloat(offset))) {
            offset = Number(offset)
        } else {
            error(errors.OFFSET_TYPE)
        }
    }
    if (offset < 0 || 1 < offset) {
        error(errors.OFFSET_RANGE)
    } else if ((offsets[index - 1] || 0) > offset) {
        error(errors.OFFSET_ORDER)
    } else if (index === 0 && offset !== 0) {
        error(errors.PARTIAL_KEYFRAMES)
    // Currently only used when executed from parseCollection:
    } else if (!Array.isArray(offsets) && index === (offsets.length - 1) && offset !== 1) {
        error(errors.PARTIAL_KEYFRAMES)
    }
    return offset
}

/**
 * parseRecord :: Keyframes => ComputedKeyframes
 *
 * Keyframes => {
 *   [Property]: a|PropertyController|[a|PropertyController],
 *   easing?: String|Function|[String|Function],
 *   offset?: String|Number|[String|Number],
 * }
 * ComputedKeyframe => {
 *   [Property]: a|PropertyController,
 *   easing?: String|Function,
 *   offset?: Number|String,
 * }
 *
 * It should transform `Keyframes` into a collection of `ComputedKeyframe`.
 *
 * It should create explicit `offset` when it's `undefined`, `0`, or `[0]`, by
 * computing evenly spaced values from `0` to `1`, whose length should be equal
 * to the `Property` with the highest length, or when `1` is missing as the end
 * value, by pushing `1`.
 *
 * It should create explicit `easing` by duplicating its values as needed until
 * it has one less value than `offset`.
 */
export const parseRecord = keyframes => {

    /**
     * 1. Coerce each argument into a collection
     * 2. Coerce/validate each offset/easing into Number/Function
     * 3. Measure property w/ highest length
     * 4. Append prop/values in computed keyframes
     */
    const { easing, offset: offsets, propsLength, ...props } =
        Object.entries(keyframes).reduce(
            (keyframes, [prop, values]) => {
                if (!Array.isArray(values)) {
                    values = [values]
                }
                if (prop === 'easing') {
                    values = values.map(parseEasing)
                } else if (prop === 'offset') {
                    values = values.map(parseOffset)
                } else if (prop !== 'offset' && (values.length > keyframes.propsLength)) {
                    keyframes.propsLength = values.length
                }
                keyframes[prop] = values
                return keyframes
            },
            { easing: [], offset: [], propsLength: 0 })

    // Offset
    if (offsets.length === 0) {
        offsets.push(0)
    }
    if (offsets[offsets.length - 1] !== 1) {
        if (offsets.length === 1 && offsets[0] === 0) {
            offsets.push(+(1 / (propsLength - 1)).toFixed(2))
            while (offsets.length < propsLength) {
                offsets.push(+(offsets[1] + offsets[offsets.length - 1]).toFixed(2))
            }
        } else {
            offsets.push(1)
        }
    }
    if (offsets.length > propsLength) {
        error(errors.PARTIAL_KEYFRAMES)
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
 * getOffset :: ([Keyframe] -> Number -> Number) -> Number
 *
 * Keyframe => {
 *   [Property]: a|PropertyController,
 *   easing?: String|Function,
 *   offset?: String|Number,
 * }
 *
 * It should return a `Number` evenly spaced between `prevOffset` and the next
 * offset found in given collection of `Keyframe`.
 */
const getOffset = (keyframes, prevOffset, currentIndex) => {

    const nextKeyframeWithOffset = keyframes.slice(currentIndex + 1).find(keyframe => keyframe.offset)
    const { nextIndex, nextOffset } = nextKeyframeWithOffset
        ? { nextIndex: keyframes.indexOf(nextKeyframeWithOffset), nextOffset: nextKeyframeWithOffset.offset }
        : { nextIndex: keyframes.length - 1, nextOffset: 1 }

    return +(prevOffset + ((nextOffset - prevOffset) / ((nextIndex + 1) - currentIndex))).toFixed(2)
}

/**
 * parseCollection :: parse :: [Keyframe] => [ComputedKeyframe]
 *
 * Keyframe => {
 *   [Property]: a|PropertyController,
 *   easing?: String|Function,
 *   offset?: String|Number,
 * }
 * ComputedKeyframe => {
 *   [Property]: a|PropertyController,
 *   easing?: String|Function,
 *   offset?: Number,
 * }
 *
 * It should map each `Keyframe`s into a `ComputedKeyframe`.
 *
 * It should create explicit `offset`s for each `Keyframe`, by computing evenly
 * spaced values.
 *
 * It should create explicit `easing`s for each `Keyframe`, by using `linear` as
 * a default value.
 */
export const parseCollection = keyframes => {

    if (keyframes.length < 2) {
        error(errors.PARTIAL_KEYFRAMES)
    }

    const lastIndex = keyframes.length - 1

    return keyframes.reduce(
        (computedKeyframes, { easing = 'linear', offset, ...props }, index) => {

            const computedKeyframe = {}

            // Easing
            if (index < lastIndex) {
                computedKeyframe.easing = parseEasing(easing)
            }

            // Offset
            if (offset) {
                computedKeyframe.offset = parseOffset(offset, index, { length: keyframes.length, ...computedKeyframes.map(k => k.offset) })
            } else if (index === 0) {
                computedKeyframe.offset = 0
            } else if (index === lastIndex) {
                computedKeyframe.offset = 1
            } else {
                computedKeyframe.offset = getOffset(keyframes, computedKeyframes[index - 1].offset, index)
            }

            // Properties
            Object.entries(props).forEach(([prop, value]) => {
                if (index > 0 && typeof keyframes[0][prop] === 'undefined') {
                    error(errors.PARTIAL_KEYFRAMES)
                }
                computedKeyframe[prop] = value
            })
            if (index === lastIndex) {
                Object.keys(computedKeyframes[0]).forEach(prop => {
                    if (prop !== 'easing' && typeof computedKeyframe[prop] === 'undefined') {
                        error(errors.PARTIAL_KEYFRAMES)
                    }
                })
            }

            return computedKeyframes.concat(computedKeyframe)
        },
        [])
}

/**
 * parse :: Keyframes|[Keyframe] => [ComputedKeyframe]
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
 * ComputedKeyframe => {
 *   [Property]: a|PropertyController,
 *   easing?: String|Function,
 *   offset?: Number,
 * }
 *
 * It should map each `Keyframe`s into a `ComputedKeyframe`.
 *
 * It should transform `Keyframes` into a collection of `ComputedKeyframe`.
 *
 * It should create explicit `offset`, either by creating default start/end
 * `offset`, or by computing evenly spaced values.
 *
 * It should throw an error/exception when:
 * - an unknown alias is assigned to `easing`
 * - `offset` contains a value out of range [0-1]
 * - `offset` are not ordered in ascending order
 * - keyframes are partially defined, either when:
 *   - the first `offset` is not `0`
 *   - the last computed `offset` is not `1`
 *   - a `Property` is missing in the first or last `ComputedKeyframe`
 *
 * Memo: it should not handle partial keyframes as defined in the CSS and WAAPI
 * specifications, as it would imply executing `getComputedStyle()` which is a
 * performance killer, in order to use computed values in implicit keyframes.
 *
 * Memo: the type of each `Property` can't be checked as in the WAAPI, because
 * it could be of any type here.
 *
 * Memo: "the array-form allows specifying different easing for each keyframe
 * whilst for the object-form, the list of values will be repeated as needed
 * until each keyframe has been assigned a value", meaning that
 *       `{ x: [1, 0, 1], easing: ['ease'] }`
 *   !== `[{ x: 1, easing: 'ease' }, { x: 0 }, { x: 1 }]`
 * Demo: https://codepen.io/creative-wave/pen/ExYrpRJ
 */
const parse = keyframes =>
    Array.isArray(keyframes)
        ? parseCollection(keyframes)
        : parseRecord(keyframes)

export default parse

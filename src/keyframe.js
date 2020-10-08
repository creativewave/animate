
import { error, errors } from './error'
import { parseEasing } from './interpolate'

/**
 * parseOffset :: (Number|String -> Number -> [Number?]) -> Number
 *
 * TODO: parse and return whole offset collection for both types of keyframes.
 */
const parseOffset = (offset, index, offsets) => {
    if (isNaN(offset)) {
        error(errors.KEYFRAMES_OFFSET_TYPE)
    }
    offset = Number(offset)
    if (offset < 0 || 1 < offset) {
        error(errors.KEYFRAMES_OFFSET_RANGE)
    } else if ((offsets[index - 1] || 0) > offset) {
        error(errors.KEYFRAMES_OFFSET_ORDER)
    } else if (index === 0 && offset !== 0) {
        error(errors.KEYFRAMES_PARTIAL)
    // Currently only used when executed from parseCollection:
    } else if (!Array.isArray(offsets) && index === (offsets.length - 1) && offset !== 1) {
        error(errors.KEYFRAMES_PARTIAL)
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
        while (offsets.length < (propsLength - 1)) {
            offsets.push(offsets[offsets.length - 1] + ((1 - offsets[offsets.length - 1]) / (propsLength - offsets.length)))
        }
        offsets.push(1)
    }
    if (offsets.length > propsLength) {
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
        error(errors.KEYFRAMES_PARTIAL)
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
            if (typeof offset !== 'undefined') {
                computedKeyframe.offset = parseOffset(
                    offset,
                    index,
                    { length: keyframes.length, ...computedKeyframes.map(k => k.offset) })
            } else if (index === 0) {
                computedKeyframe.offset = 0
            } else if (index === lastIndex) {
                computedKeyframe.offset = 1
            } else {
                computedKeyframe.offset = getOffset(
                    keyframes,
                    computedKeyframes[index - 1].offset,
                    index)
            }

            // Properties
            Object.entries(props).forEach(([prop, value]) => {
                if (index > 0 && typeof keyframes[0][prop] === 'undefined') {
                    error(errors.KEYFRAMES_PARTIAL)
                }
                computedKeyframe[prop] = value
            })
            if (index === lastIndex) {
                Object.keys(computedKeyframes[0]).forEach(prop => {
                    if (prop !== 'easing' && typeof computedKeyframe[prop] === 'undefined') {
                        error(errors.KEYFRAMES_PARTIAL)
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
 * Related: https://drafts.csswg.org/web-animations-1/#compute-missing-keyframe-offsets
 *
 * Memo: it will not check the `Property` type as defined in the specification,
 * as it can be of any type here.
 * Related: https://drafts.csswg.org/web-animations-1/#process-a-keyframe-like-object
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
const parse = keyframes =>
    Array.isArray(keyframes)
        ? parseCollection(keyframes)
        : parseRecord(keyframes)

export default parse

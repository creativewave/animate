
import { error, errors } from './error'
import { isFiniteNumber, isNumber, round } from './utils'
import { linear, parseEasing } from './easing'
import { setAttribute, setProperty, setStyle } from './buffer'

/**
 * interpolateNumber :: (Number -> Number -> Number) -> Number
 */
export const interpolateNumber = (from, to, time) => from + ((to - from) * time)

/**
 * interpolateNumbers :: (TemplateParts -> TemplateParts -> Number) -> String
 *
 * Memo: floating numbers can be assigned to rgb(a) in current browser versions,
 * but not in `jsdom`, and it is currently discussed by the W3C.
 * Related: https://github.com/w3c/csswg-drafts/issues/3249
 */
const interpolateNumbers = ([from, strings], [to], time) =>
    strings
        .slice(0, -1)
        .reduce((value, string, number) => `${value}${string}${round(interpolateNumber(from[number], to[number], time), 0)}`, '')
        .concat(strings[strings.length - 1])

/**
 * getTemplateParts :: String -> TemplateParts
 *
 * TemplateParts => [[Number], [String]]
 */
export const getTemplateParts = value => {

    const numbers = []
    const strings = []
    const matches = value.matchAll(/(?<color>#[a-f\d]{3,8})|(?<number>-?\d+\.?\d*|-?\.\d+)|(?<string>[^-.#\d]+|[-.#](?![a-f\d]{3,8}))/gi)

    let index = 0
    for (const { groups: { color, number, string } } of matches) {
        if (color) {
            const [, n1, n2, n3, n4, n5, n6, n7, n8] = color
            switch (color.length) {
                case 4:
                    numbers.push(Number(`0x${n1}${n1}`), Number(`0x${n2}${n2}`), Number(`0x${n3}${n3}`))
                    strings.push('rgb(', ',', ',', ')')
                    break
                case 7:
                    numbers.push(Number(`0x${n1}${n2}`), Number(`0x${n3}${n4}`), Number(`0x${n5}${n6}`))
                    strings.push('rgb(', ',', ',', ')')
                    break
                case 9:
                    numbers.push(Number(`0x${n1}${n2}`), Number(`0x${n3}${n4}`), Number(`0x${n5}${n6}`), Number(`0x${n7}${n8}` / 255))
                    strings.push('rgba(', ',', ',', ',', ')')
                    break
                default:
                    error(errors.KEYFRAMES_COLOR_VALUE)
            }
        } else if (number) {
            numbers.push(Number(number))
            if (index === 0) {
                strings.push('')
            }
        } else {
            strings.push(string)
        }
        index++
    }

    if (strings.length === numbers.length) {
        strings.push('')
    }

    return [numbers, strings]
}

/**
 * parseProperty :: Number|String|PropertyController -> PropertyController
 *
 * PropertyController => {
 *   interpolate: (a -> a -> Number) -> a,
 *   set: (Buffer -> String -> a) -> void,
 *   value: a|[a],
 * }
 */
const parseProperty = value => {
    if (typeof value === 'object') {
        const { interpolate, set = setStyle, value: propertyValue } = value
        if (interpolate) {
            return { set, ...value }
        } else if (isFiniteNumber(propertyValue)) {
            return { interpolate: interpolateNumber, set, value: Number(propertyValue) }
        }
        return { interpolate: interpolateNumbers, set, value: getTemplateParts(propertyValue) }
    }
    return parseProperty({ value })
}

/**
 * getComputedProperty :: (Buffer -> String -> PropertySetter) -> String
 */
const getComputedProperty = (target, property, set) => {
    switch (set) {
        case setAttribute:
            return target.initial.attributes[property]
        case setProperty:
            return target.initial.properties[property]
        case setStyle:
            return target.getComputedStyle(property)
        default:
            error(errors.KEYFRAMES_COMPUTED_VALUE)
    }
}

/**
 * getComputedKeyframes :: ([ProcessedKeyframe] -> Buffer -> TargetProperties) -> [ComputedKeyframe]
 *
 * TargetProperties => Map { [String]: PropertyController }
 * PropertyController => {
 *   interpolate: (a -> a -> Number) -> a,
 *   set: (Buffer -> String -> a) -> void,
 *   value: a|[a],
 * }
 */
export const getComputedKeyframes = (keyframes, target, targetProperties) => {

    const computedKeyframes = keyframes.slice()

    targetProperties.forEach(({ interpolate, set }, propertyName) => {

        const propertyKeyframes = keyframes.filter(keyframe => keyframe[propertyName])
        const computeFirstKeyframe = propertyKeyframes[0].computedOffset !== 0
        const computeLastKeyframe = propertyKeyframes[propertyKeyframes.length - 1]?.computedOffset !== 1

        if (computeFirstKeyframe || computeLastKeyframe) {

            const computed = {
                ...parseProperty(getComputedProperty(target, propertyName, set)),
                interpolate,
                set,
            }

            if (computeFirstKeyframe) {
                if (computedKeyframes[0].computedOffset === 0) {
                    computedKeyframes[0][propertyName] = computed
                } else {
                    computedKeyframes.unshift({ computedOffset: 0, easing: linear, [propertyName]: computed })
                }
            }
            if (computeLastKeyframe) {
                if (computedKeyframes[computedKeyframes.length - 1].computedOffset === 1) {
                    computedKeyframes[computedKeyframes.length - 1][propertyName] = computed
                } else {
                    computedKeyframes.push({ computedOffset: 1, easing: linear, [propertyName]: computed })
                }
            }
        }
    })

    return computedKeyframes
}

const setMissingOffsets = keyframes => {
    keyframes.forEach(keyframe => keyframe.computedOffset = keyframe.offset)
    if (keyframes.length > 1 && keyframes[0].computedOffset === null) {
        keyframes[0].computedOffset = 0
    }
    if (keyframes[keyframes.length - 1].computedOffset === null) {
        keyframes[keyframes.length - 1].computedOffset = 1
    }
    keyframes.forEach(({ computedOffset: offsetA }, keyframeIndex) => {
        const nextIndex = keyframeIndex + 1
        if (keyframes[nextIndex]?.computedOffset === null) {
            const nextKeyframeIndexWithOffset = keyframes
                .slice(nextIndex)
                .findIndex(keyframe => keyframe.computedOffset !== null) + nextIndex
            const { computedOffset: offsetB } = keyframes[nextKeyframeIndexWithOffset]
            const n = nextKeyframeIndexWithOffset - keyframeIndex
            for (let index = 1; (keyframeIndex + index) < nextKeyframeIndexWithOffset; index++) {
                keyframes[keyframeIndex + index].computedOffset = round(offsetA + (((offsetB - offsetA) * index) / n), 2)
            }
        }
    })
    return keyframes
}

/**
 * parseOffset :: (Number?|String?|null? -> Number?|String?|void) -> Number|null
 */
const parseOffset = (offset = null, prevOffset = 0) => {

    if (offset === null) {
        return offset
    }
    if (isNumber(offset)) {

        offset = Number(offset)

        if (offset < 0 || 1 < offset) {
            error(errors.KEYFRAMES_OFFSET_RANGE)
        } else if (prevOffset > offset) {
            error(errors.KEYFRAMES_OFFSET_ORDER)
        }

        return offset
    }
    error(errors.KEYFRAMES_OFFSET_TYPE)
}

/**
 * parseObject :: (Keyframes -> TargetProperties) -> [ProcessedKeyframe]
 *
 * TargetProperties => Map { [String]: PropertyController }
 */
const parseObject = (keyframes, targetProperties) => {

    const { easing: easings, offset: offsets, ...properties } =
        Object.entries(keyframes).reduce(
            (keyframes, [prop, values]) => {
                if (!Array.isArray(values)) {
                    if (Array.isArray(values.value)) {
                        const { interpolate, set } = values
                        values = values.value.map(value => ({ interpolate, set, value }))
                    } else {
                        values = [values]
                    }
                }
                if (prop === 'easing') {
                    values = values.map(parseEasing)
                } else if (prop === 'offset') {
                    values = values.map((offset, index) => parseOffset(offset, values[index - 1]))
                } else {
                    values = values.map(parseProperty)
                    targetProperties.set(prop, values[0])
                }
                keyframes[prop] = values
                return keyframes
            },
            { easing: [linear], offset: [] })

    return Object.entries(properties)
        .flatMap(([name, values]) => setMissingOffsets(values.map(value => ({ [name]: value, offset: null }))))
        .sort((a, b) => a.computedOffset - b.computedOffset)
        .reduce(
            (keyframes, { computedOffset, offset, ...properties }) => {

                const { length } = keyframes
                const prevKeyframe = keyframes[length - 1]

                if (computedOffset === prevKeyframe?.computedOffset) {
                    keyframes[length - 1] = { ...prevKeyframe, ...properties }
                    return keyframes
                }

                return keyframes.concat({
                    computedOffset,
                    easing: easings[length % easings.length],
                    offset: offsets[length] ?? offset,
                    ...properties,
                })
            },
            [])
}

/**
 * parseArray :: ([Keyframe] -> TargetProperties) -> [ProcessedKeyframe]
 *
 * TargetProperties => Map { [String]: PropertyController }
 */
const parseArray = (keyframes, targetProperties) => keyframes.reduce(
    (keyframes, { easing = linear, offset = null, ...properties }, index) =>
        keyframes.concat({
            easing: parseEasing(easing),
            offset: parseOffset(offset, keyframes[index - 1]?.offset),
            ...Object.entries(properties).reduce(
                (properties, [name, value]) => {
                    targetProperties.set(name, properties[name] = parseProperty(value))
                    return properties
                },
                {}),
        }),
    [])

/**
 * parse :: ([Keyframe]|Keyframes -> TargetProperties) -> [ProcessedKeyframe]
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
 */
const parse = (keyframes, targetProperties) => {

    if (keyframes) {
        return setMissingOffsets(Array.isArray(keyframes)
            ? parseArray(keyframes, targetProperties)
            : parseObject(keyframes, targetProperties))
    }

    return []
}

export default parse

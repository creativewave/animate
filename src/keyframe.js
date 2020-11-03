
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
 */
const interpolateNumbers = ([from, strings], [to], time) =>
    strings
        .slice(0, -1)
        .reduce((value, string, number) => `${value}${string}${interpolateNumber(from[number], to[number], time)}`, '')
        .concat(strings[strings.length - 1])

/**
 * getTemplateParts :: String -> TemplateParts
 *
 * TemplateParts => [[Number], [String]]
 */
const getTemplateParts = value => {
    if (value.startsWith('#')) {
        const [, n1, n2, n3, n4, n5, n6, n7, n8] = value
        switch (value.length) {
            case 3:
                return [
                    [`0x${n1}${n1}`, `0x${n2}${n2}`, `0x${n3}${n3}`].map(Number),
                    ['rgb(', ',', ',', ')'],
                ]
            case 6:
                return [
                    [`0x${n1}${n2}`, `0x${n3}${n4}`, `0x${n5}${n6}`].map(Number),
                    ['rgb(', ',', ',', ')'],
                ]
            case 8:
                return [
                    [`0x${n1}${n2}`, `0x${n3}${n4}`, `0x${n5}${n6}`, `0x${n7}${n8}` / 255].map(Number),
                    ['rgba(', ',', ',', ',', ')'],
                ]
            default:
                error(errors.KEYFRAMES_COLOR_VALUE)
        }
    }
    return [value.match(/(-?\d+\.?\d*|-?\.\d+)/g).map(Number), value.match(/[^\d-.]+|[-.](?!\d+)/g)]
}

/**
 * parseProperty :: Number|String|PropertyController -> PropertyController
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
 * getComputedProperty :: (Element -> String -> PropertySetter) -> String
 *
 * PropertySetter -> (String -> Number|String) -> void
 */
const getComputedProperty = (target, property, set) => {
    switch (set) {
        case setAttribute:
            return target.getAttribute(property)
        case setProperty:
            return target[property]
        case setStyle:
            return window.getComputedStyle(target)[property]
        default:
            error(errors.KEYFRAMES_COMPUTED_VALUE)
    }
}

/**
 * getComputedKeyframes :: ([ProcessedKeyframe] -> Element -> TargetProperties) -> [ComputedKeyframe]
 *
 * TargetProperties => Map { [String]: PropertyController }
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
 */
const parseObject = (keyframes, targetProperties) => {

    const { easing: easings, offset: offsets, ...properties } =
        Object.entries(keyframes).reduce(
            (keyframes, [prop, values]) => {
                if (!Array.isArray(values)) {
                    values = [values]
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

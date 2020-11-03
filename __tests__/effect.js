
import { AnimationEffect, KeyframeEffect, MotionPathEffect } from '../src/effect'
import { setStyle as set, setAttribute } from '../src/buffer'
import { NaNs } from './utils'
import { linear as easing } from '../src/easing'
import { errors } from '../src/error'
import { interpolateNumber as interpolate } from '../src/keyframe'

// SVG interfaces are not implement by jsdom
class SVGGeometryElement {}
class SVGPathElement extends SVGGeometryElement {

    /**
     * <svg viewBox="0 0 10 10">
     *   <path id=path d="M5 10 A 5 5 0 0 0 5 0 5 5 0 0 0 5 10" />
     *   <path id=target d="M-1 -1l2 1 -2 1z" />
     * </svg>
     */
    points = [
        { angle: { normal: 45, reverse: 135 }, x: 5, y: 10 },
        { angle: { normal: -45, reverse: 45 }, x: 10, y: 5 },
        { angle: { normal: -135, reverse: -45 }, x: 5, y: 0 },
        { angle: { normal: 135, reverse: -135 }, x: 0, y: 5 },
    ]

    getPointAtLength(length) {
        if (length >= this.points.length) {
            length %= this.points.length
        } else if (length < 0) {
            length = this.points.length - 1
        }
        return this.points[Math.floor(length)]
    }

    getTotalLength() {
        return this.points.length
    }
}

window.SVGGeometryElement = SVGGeometryElement
window.SVGPathElement = SVGPathElement

const target = document.createElement('path')
const motionPath = new SVGPathElement()

target.setAttribute('width', 1)
target.style.opacity = 1

describe('AnimationEffect::constructor(options)', () => {
    it('should run updateTiming(options)', () => {
        expect((new AnimationEffect()).getTiming()).toEqual({
            delay: 0,
            direction: 'normal',
            duration: 'auto',
            easing,
            endDelay: 0,
            fill: 'auto',
            iterationStart: 0,
            iterations: 1,
        })
    })
})
describe('AnimationEffect::updateTiming(options)', () => {

    const effect = new AnimationEffect()

    it('should throw when it receives an invalid timing option', () => {

        const invalid = [
            ['delay', errors.OPTION_DELAY, [...NaNs, Infinity, -Infinity]],
            ['direction', errors.OPTION_DIRECTION, ['invalid']],
            ['duration', errors.OPTION_DURATION, [...NaNs, -1]],
            ['easing', errors.OPTION_EASING, ['invalid']],
            ['endDelay', errors.OPTION_DELAY, [...NaNs, Infinity, -Infinity]],
            ['fill', errors.OPTION_FILL, ['invalid']],
            ['iterations', errors.OPTION_ITERATIONS, [...NaNs, -1]],
            ['iterationStart', errors.OPTION_ITERATION_START, [...NaNs, Infinity, -Infinity, -1]],
        ]

        invalid.forEach(([option, error, values]) =>
            values.forEach(value =>
                expect(() => effect.updateTiming({ [option]: value }))
                    .toThrow(error)))
    })
    it('should update timing with the provided options', () => {

        effect.updateTiming({ delay: 1 })

        expect(effect.getTiming()).toEqual({
            delay: 1,
            direction: 'normal',
            duration: 'auto',
            easing,
            endDelay: 0,
            fill: 'auto',
            iterationStart: 0,
            iterations: 1,
        })
    })
    it('should run apply when associated to an Animation', () => {

        const apply = jest.fn()
        class CustomEffect extends AnimationEffect {
            apply() {
                apply()
            }
        }
        const effect = new CustomEffect()

        effect.animation = {}
        effect.updateTiming()

        expect(apply).toHaveBeenCalled()
    })
})

describe('KeyframeEffect::constructor(target, keyframes, options)', () => {
    it('should set target and setKeyframes(keyframes)', () => {

        const effect = new KeyframeEffect(target, { prop: [0, 1] }, 1)

        expect(effect.target).toBe(target)
        expect(effect.getTiming()).toEqual({
            delay: 0,
            direction: 'normal',
            duration: 1,
            easing,
            endDelay: 0,
            fill: 'auto',
            iterationStart: 0,
            iterations: 1,
        })
        expect(effect.getKeyframes()).toEqual([
            { computedOffset: 0, easing, offset: null, prop: { interpolate, set, value: 0 } },
            { computedOffset: 1, easing, offset: null, prop: { interpolate, set, value: 1 } },
        ])
    })
})
describe('KeyframeEffect::setKeyframes(keyframes)', () => {

    const effect = new KeyframeEffect(target, null)

    it('should throw when it receives keyframes with an invalid easing alias', () => {
        expect(() => effect.setKeyframes([{ easing: 'invalid', prop: 0 }, { prop: 1 }]))
            .toThrow(errors.OPTION_EASING)
        expect(() => effect.setKeyframes({ easing: 'invalid', prop: [0, 1] }))
            .toThrow(errors.OPTION_EASING)
    })
    it('should throw when it reveives keyframes with an out of range [0-1] offset', () => {
        expect(() => effect.setKeyframes([{ offset: -1, prop: 0 }, { offset: 2, prop: 1 }]))
            .toThrow(errors.KEYFRAMES_OFFSET_RANGE)
        expect(() => effect.setKeyframes({ offset: [-1, 2], prop: [0, 1] }))
            .toThrow(errors.KEYFRAMES_OFFSET_RANGE)
    })
    it('should throw when it reveives keyframes with an offset that is not a number', () => {
        NaNs.forEach(value => {
            expect(() => effect.setKeyframes([{ prop: 0 }, { offset: value, prop: 0 }, { prop: 1 }]))
                .toThrow(errors.KEYFRAMES_OFFSET_TYPE)
            expect(() => effect.setKeyframes({ offset: [0, value, 1], prop: [0, 1, 2] }))
                .toThrow(errors.KEYFRAMES_OFFSET_TYPE)
        })
    })
    it('should throw when it reveives keyframes with an unordered offset', () => {
        expect(() => effect.setKeyframes([
            { prop: 0 },
            { offset: 0.75, prop: 1 },
            { offset: 0.25, prop: 2 },
            { prop: 3 },
        ])).toThrow(errors.KEYFRAMES_OFFSET_ORDER)
        expect(() => effect.setKeyframes({
            offset: [0, 0.75, 0.25, 1],
            prop: [0, 1, 2, 3],
        })).toThrow(errors.KEYFRAMES_OFFSET_ORDER)
    })
    it('should compute keyframes with alias/custom/missing easing', () => {

        const custom = n => n
        const expected = [
            { computedOffset: 0, easing: custom, offset: null, prop: { interpolate, set, value: 0 } },
            { computedOffset: 0.25, easing, offset: null, prop: { interpolate, set, value: 1 } },
            { computedOffset: 0.5, easing, offset: null, prop: { interpolate, set, value: 2 } },
            { computedOffset: 0.75, easing: custom, offset: null, prop: { interpolate, set, value: 3 } },
            { computedOffset: 1, easing, offset: null, prop: { interpolate, set, value: 4 } },
        ]

        effect.setKeyframes([
            { easing: custom, prop: 0 },
            { easing: 'linear', prop: 1 },
            { prop: 2 },
            { easing: custom, prop: 3 },
            { prop: 4 },
        ])
        expect(effect.getKeyframes()).toEqual(expected)

        effect.setKeyframes({
            easing: [custom, 'linear', easing],
            prop: [0, 1, 2, 3, 4],
        })
        expect(effect.getKeyframes()).toEqual(expected)
    })
    it('should compute keyframes with different prop lengths', () => {

        const expected = [
            {
                computedOffset: 0,
                easing,
                offset: null,
                prop1: { interpolate, set, value: 0 },
                prop2: { interpolate, set, value: 0 },
            },
            {
                computedOffset: 0.2,
                easing,
                offset: null,
                prop2: { interpolate, set, value: 1 },
            },
            {
                computedOffset: 0.4,
                easing,
                offset: null,
                prop2: { interpolate, set, value: 2 },
            },
            {
                computedOffset: 0.6,
                easing,
                offset: null,
                prop2: { interpolate, set, value: 3 },
            },
            {
                computedOffset: 0.8,
                easing,
                offset: null,
                prop2: { interpolate, set, value: 4 },
            },
            {
                computedOffset: 1,
                easing,
                offset: null,
                prop1: { interpolate, set, value: 1 },
                prop2: { interpolate, set, value: 5 },
            },
        ]

        effect.setKeyframes({ prop1: [0, 1], prop2: [0, 1, 2, 3, 4, 5] })
        expect(effect.getKeyframes()).toEqual(expected)
    })
    it('should compute keyframes with missing offset [1/2]', () => {

        const expected = [
            { computedOffset: 0, easing, offset: null, prop: { interpolate, set, value: 0 } },
            { computedOffset: 0.25, easing, offset: 0.25, prop: { interpolate, set, value: 1 } },
            { computedOffset: 0.5, easing, offset: null, prop: { interpolate, set, value: 2 } },
            { computedOffset: 0.75, easing, offset: null, prop: { interpolate, set, value: 3 } },
            { computedOffset: 1, easing, offset: null, prop: { interpolate, set, value: 4 } },
        ]

        effect.setKeyframes([{ prop: 0 }, { offset: 0.25, prop: 1 }, { prop: 2 }, { prop: 3 }, { prop: 4 }])
        expect(effect.getKeyframes()).toEqual(expected)

        effect.setKeyframes({ offset: [expected[0].offset = 0, 0.25], prop: [0, 1, 2, 3, 4] })
        expect(effect.getKeyframes()).toEqual(expected)
    })
    it('should compute keyframes with missing offset [2/2]', () => {

        const expected = [
            { computedOffset: 0, easing, offset: 0, prop: { interpolate, set, value: 0 } },
            { computedOffset: 0.33, easing, offset: 0.33, prop: { interpolate, set, value: 1 } },
            { computedOffset: 0.67, easing, offset: null, prop: { interpolate, set, value: 2 } },
            { computedOffset: 1, easing, offset: null, prop: { interpolate, set, value: 3 } },
        ]

        effect.setKeyframes([{ offset: 0, prop: 0 }, { offset: 0.33, prop: 1 }, { prop: 2 }, { prop: 3 }])
        expect(effect.getKeyframes()).toEqual(expected)

        effect.setKeyframes({ offset: [0, 0.33], prop: [0, 1, 2, 3] })
        expect(effect.getKeyframes()).toEqual(expected)
    })
    it('should compute keyframes with a single keyframe [no offset]', () => {

        const keyframe = { opacity: 0.5, width: { set: setAttribute, value: 0.5 } }
        const expected = [
            {
                computedOffset: 1,
                easing,
                offset: null,
                opacity: { interpolate, set, value: 0.5 },
                width: { interpolate, set: setAttribute, value: 0.5 },
            },
        ]

        effect.setKeyframes([keyframe])
        expect(effect.getKeyframes()).toEqual(expected)

        effect.setKeyframes(keyframe)
        expect(effect.getKeyframes()).toEqual(expected)
    })
    it('should compute keyframes with a single keyframe [offset: 0]', () => {

        const keyframe = { offset: 0, opacity: { interpolate, set, value: 0.5 } }
        const expected = [{ computedOffset: 0, easing, ...keyframe }]

        effect.setKeyframes([keyframe])
        expect(effect.getKeyframes()).toEqual(expected)

        effect.setKeyframes(keyframe)
        expect(effect.getKeyframes()).toEqual(expected)
    })
    it('should compute keyframes with a single keyframe [offset: 0.5]', () => {

        const keyframe = { offset: 0.5, opacity: { interpolate, set, value: 0.5 } }
        const expected = [{ computedOffset: 0.5, easing, ...keyframe }]

        effect.setKeyframes([keyframe])
        expect(effect.getKeyframes()).toEqual(expected)

        effect.setKeyframes(keyframe)
        expect(effect.getKeyframes()).toEqual(expected)
    })
    it('should compute keyframes with a single keyframe [offset: 1]', () => {

        const keyframe = { offset: 1, opacity: { interpolate, set, value: 0.5 } }
        const expected = [{ computedOffset: 1, easing, ...keyframe }]

        effect.setKeyframes([keyframe])
        expect(effect.getKeyframes()).toEqual(expected)

        effect.setKeyframes(keyframe)
        expect(effect.getKeyframes()).toEqual(expected)
    })
    it('should compute keyframes with a first offset > 0', () => {

        const expected = [
            { computedOffset: 0.2, easing, offset: 0.2, opacity: { interpolate, set, value: 0 } },
            { computedOffset: 0.6, easing, offset: null, opacity: { interpolate, set, value: 0.5 } },
            { computedOffset: 1, easing, offset: null, opacity: { interpolate, set, value: 1 } },
        ]

        effect.setKeyframes([{ offset: 0.2, opacity: 0 }, { opacity: 0.5 }, { opacity: 1 }])
        expect(effect.getKeyframes()).toEqual(expected)

        effect.setKeyframes({ offset: 0.2, opacity: [0, 0.5, 1] })
        expect(effect.getKeyframes()).toEqual(expected)
    })
    it('should compute keyframes with a last offset < 1', () => {

        const expected = [
            { computedOffset: 0, easing, offset: 0, opacity: { interpolate, set, value: 1 } },
            { computedOffset: 0.4, easing, offset: 0.4, opacity: { interpolate, set, value: 0.5 } },
            { computedOffset: 0.8, easing, offset: 0.8, opacity: { interpolate, set, value: 0 } },
        ]

        effect.setKeyframes([{ offset: 0, opacity: 1 }, { offset: 0.4, opacity: 0.5 }, { offset: 0.8, opacity: 0 }])
        expect(effect.getKeyframes()).toEqual(expected)

        effect.setKeyframes({ offset: [0, 0.4, 0.8], opacity: [1, 0.5, 0] })
        expect(effect.getKeyframes()).toEqual(expected)
    })
    it('should compute keyframes with a single offset === 1', () => {

        const expected = [
            { computedOffset: 1, easing, offset: 1, opacity: { interpolate, set, value: 0 } },
            { computedOffset: 1, easing, offset: null, opacity: { interpolate, set, value: 0.5 } },
            { computedOffset: 1, easing, offset: null, opacity: { interpolate, set, value: 1 } },
        ]

        effect.setKeyframes({ offset: 1, opacity: [0, 0.5, 1] })
        expect(effect.getKeyframes()).toEqual(expected)
    })
    it('should compute keyframes with fewer offset values than for props', () => {

        const expected = [
            { computedOffset: 0, easing, offset: 0, opacity: { interpolate, set, value: 0 } },
            { computedOffset: 1, easing, offset: 1, opacity: { interpolate, set, value: 0.5 } },
            { computedOffset: 1, easing, offset: null, opacity: { interpolate, set, value: 1 } },
        ]

        effect.setKeyframes({ offset: [0, 1], opacity: [0, 0.5, 1] })
        expect(effect.getKeyframes()).toEqual(expected)
    })
    it('should compute keyframes with more offset values than for props', () => {

        const expected = [
            { computedOffset: 0, easing, offset: 0, opacity: { interpolate, set, value: 0 } },
            { computedOffset: 0.5, easing, offset: 0.5, opacity: { interpolate, set, value: 1 } },
        ]

        effect.setKeyframes({ offset: [0, 0.5, 1], opacity: [0, 1] })
        expect(effect.getKeyframes()).toEqual(expected)
    })
})
describe('KeyframeEffect::apply()', () => {
    it('should apply expected values on target', () => {

        const keyframes = {
            opacity: [0, 1, 0, 1, 0],
            width: [{ set: setAttribute, value: 0 }, { set: setAttribute, value: 1 }],
        }
        const effect = new KeyframeEffect(target, keyframes, 100)

        effect.animation = { currentTime: 0, playbackRate: 1 }
        effect.apply()

        expect(target.style.willChange).toBe('opacity')
        expect(target.style.opacity).toBe('0')
        expect(target.getAttribute('width')).toBe('0')

        effect.animation.currentTime = 25
        effect.apply()

        expect(target.style.opacity).toBe('1')
        expect(target.getAttribute('width')).toBe('0.25')

        effect.animation.currentTime = 50
        effect.apply()

        expect(target.style.opacity).toBe('0')
        expect(target.getAttribute('width')).toBe('0.5')

        effect.animation.currentTime = 75
        effect.apply()

        expect(target.style.opacity).toBe('1')
        expect(target.getAttribute('width')).toBe('0.75')
    })
    it('should apply expected values on target with a single keyframe', () => {

        const effect = new KeyframeEffect(target, { opacity: 0 }, 100)

        effect.animation = { currentTime: 0, playbackRate: 1 }
        effect.apply()

        expect(target.style.willChange).toBe('opacity')
        expect(target.style.opacity).toBe('1')
    })
})

describe('MotionPathEffect::constructor(target, path, options)', () => {
    it('should throw when it receives an invalid path', () => {
        expect(() => new MotionPathEffect(target, {}, 1)).toThrow(errors.MOTION_PATH_TYPE)
    })
    it('should throw when it receives an invalid options', () => {

        const invalid = [...NaNs, Infinity, -Infinity, 'none']

        invalid.forEach(value =>
            expect(() => new MotionPathEffect(target, motionPath, { anchor: value }))
                .toThrow(errors.OPTION_ANCHOR))
    })
})
describe('MotionPathEffect::apply()', () => {

    const getTargetBoundingBox = () => ({ height: 2, width: 2, x: -1, y: -1 })

    target.getBBox = getTargetBoundingBox

    beforeEach(() => {
        target.removeAttribute('transform')
        target.removeAttribute('transform-box')
        target.removeAttribute('transform-origin')
    })

    it('should apply expected values on target', () => {

        // <path id=target d='M4 4l2 1 -2 1z' />
        target.getBBox = () => ({ height: 2, width: 2, x: 4, y: 4 })

        const effect = new MotionPathEffect(target, motionPath, 1)

        effect.animation = { currentTime: 0, playbackRate: 1 }
        effect.apply()

        // Ie. from target center [5, 5] to motion path start [5, 10]
        expect(target.getAttribute('transform')).toBe('translate(0 5)')
        expect(target.style.transformBox).toBe('fill-box')
        expect(target.style.transformOrigin).toBe('center')

        target.getBBox = getTargetBoundingBox
    })
    it('should apply expected values on target [anchor=[1,-1]]', () => {

        const effect = new MotionPathEffect(target, motionPath, { anchor: [1, -1], duration: 1 })
        const { points: [{ x, y }] } = motionPath

        effect.animation = { currentTime: 0, playbackRate: 1 }
        effect.apply()

        expect(target.getAttribute('transform')).toBe(`translate(${x + 1} ${y - 1})`)
    })
    it('should apply expected values on target [rotate=true]', () => {

        const effect = new MotionPathEffect(target, motionPath, { duration: 1, rotate: true })
        const { points: [{ angle: { normal: angle }, x, y }] } = motionPath

        effect.animation = { currentTime: 0, playbackRate: 1 }
        effect.apply()

        expect(target.getAttribute('transform')).toBe(`translate(${x} ${y}) rotate(${angle})`)
    })
    it('should apply expected values on target [direction=reverse,rotate=true]', () => {

        const effect = new MotionPathEffect(target, motionPath, { direction: 'reverse', duration: 1, rotate: true })
        const { points: [{ angle: { reverse: angle }, x, y }] } = motionPath

        effect.animation = { currentTime: 0, playbackRate: 1 }
        effect.apply()

        expect(target.getAttribute('transform')).toBe(`translate(${x} ${y}) rotate(${angle})`)
    })
    it('should apply expected values on target [iterationStart=0.25,rotate=true]', () => {

        const effect = new MotionPathEffect(target, motionPath, { duration: 1, rotate: true })
        const { points: [, { angle: { normal: angle }, x, y }] } = motionPath

        effect.animation = { currentTime: 0.25, playbackRate: 1 }
        effect.apply()

        expect(target.getAttribute('transform')).toBe(`translate(${x} ${y}) rotate(${angle})`)
    })
})

/**
 * @jest-environment jsdom
 */

import { AnimationEffect, KeyframeEffect, MotionPathEffect } from '../src/effect.js'
import { setStyle as set, setAttribute } from '../src/buffer.js'
import Animation from '../src/animation.js'
import { NaNs } from './utils.js'
import { addEffect } from '../src/registry.js'
import { linear as easing } from '../src/easing.js'
import { errors } from '../src/error.js'
import { interpolateNumber as interpolate } from '../src/keyframe.js'

/**
 * SVGGeometryElement and SVGPathElement are required for MotionPathEffect but
 * are not available in a jsdom environement.
 */
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

describe('AnimationEffect::constructor(options)', () => {
    it('sets its timing with the provided options', () => {
        expect((new AnimationEffect).getTiming()).toEqual({
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

    const effect = new AnimationEffect

    it('throws an error when it receives an invalid timing option', () => {

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
    it('updates its timing with the provided options', () => {

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
    it('applies to its target', () => {

        const effect = new class CustomEffect extends AnimationEffect {}
        const apply = jest.fn()

        addEffect(effect, apply)
        new Animation(effect)
        effect.updateTiming()

        expect(apply).toHaveBeenNthCalledWith(1, true)
    })
})

describe('KeyframeEffect::constructor(target, keyframes, options)', () => {
    it('sets properties', () => {

        const target = document.createElement('div')
        const keyframes = { prop: [0, 1] }
        const effect = new KeyframeEffect(target, keyframes, 1)

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

    const target = document.createElement('div')
    const effect = new KeyframeEffect(target, null)

    it('throws an error when it receives keyframes with an invalid easing alias', () => {
        expect(() => effect.setKeyframes([{ easing: 'invalid', prop: 0 }, { prop: 1 }]))
            .toThrow(errors.OPTION_EASING)
        expect(() => effect.setKeyframes({ easing: 'invalid', prop: [0, 1] }))
            .toThrow(errors.OPTION_EASING)
    })
    it('throws an error when it reveives keyframes with an out of range [0-1] offset', () => {
        expect(() => effect.setKeyframes([{ offset: -1, prop: 0 }, { offset: 2, prop: 1 }]))
            .toThrow(errors.KEYFRAMES_OFFSET_RANGE)
        expect(() => effect.setKeyframes({ offset: [-1, 2], prop: [0, 1] }))
            .toThrow(errors.KEYFRAMES_OFFSET_RANGE)
    })
    it('throws an error when it reveives keyframes with an offset that is not a number', () => {
        NaNs.forEach(value => {
            expect(() => effect.setKeyframes([{ prop: 0 }, { offset: value, prop: 0 }, { prop: 1 }]))
                .toThrow(errors.KEYFRAMES_OFFSET_TYPE)
            expect(() => effect.setKeyframes({ offset: [0, value, 1], prop: [0, 1, 2] }))
                .toThrow(errors.KEYFRAMES_OFFSET_TYPE)
        })
    })
    it('throws an error when it reveives keyframes with an unordered offset', () => {
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
    it('applies to its target', () => {

        const effect = new KeyframeEffect(target, null, 1)
        const animation = new Animation(effect)

        animation.currentTime = 0
        effect.setKeyframes({ opacity: [0, 1] })

        expect(target.style.opacity).toBe('0')

        animation.cancel()
    })
    it('removes the previous keyframe values', () => {

        const effect = new KeyframeEffect(target, { opacity: [0, 1] }, 1)
        const animation = new Animation(effect)

        animation.currentTime = 0
        effect.setKeyframes()

        expect(target.style.opacity).toBe('')

        animation.cancel()
    })
    it('computes keyframes with alias/custom/missing easing', () => {

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
    it('computes keyframes with a different number of properties', () => {

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
    it('computes keyframes with missing offset [1/2]', () => {

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
    it('computes keyframes with missing offset [2/2]', () => {

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
    it('computes keyframes with a single keyframe [no offset]', () => {

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
    it('computes keyframes with a single keyframe [offset: 0]', () => {

        const keyframe = { offset: 0, opacity: { interpolate, set, value: 0.5 } }
        const expected = [{ computedOffset: 0, easing, ...keyframe }]

        effect.setKeyframes([keyframe])
        expect(effect.getKeyframes()).toEqual(expected)

        effect.setKeyframes(keyframe)
        expect(effect.getKeyframes()).toEqual(expected)
    })
    it('computes keyframes with a single keyframe [offset: 0.5]', () => {

        const keyframe = { offset: 0.5, opacity: { interpolate, set, value: 0.5 } }
        const expected = [{ computedOffset: 0.5, easing, ...keyframe }]

        effect.setKeyframes([keyframe])
        expect(effect.getKeyframes()).toEqual(expected)

        effect.setKeyframes(keyframe)
        expect(effect.getKeyframes()).toEqual(expected)
    })
    it('computes keyframes with a single keyframe [offset: 1]', () => {

        const keyframe = { offset: 1, opacity: { interpolate, set, value: 0.5 } }
        const expected = [{ computedOffset: 1, easing, ...keyframe }]

        effect.setKeyframes([keyframe])
        expect(effect.getKeyframes()).toEqual(expected)

        effect.setKeyframes(keyframe)
        expect(effect.getKeyframes()).toEqual(expected)
    })
    it('computes keyframes with a first offset > 0', () => {

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
    it('computes keyframes with a last offset < 1', () => {

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
    it('computes keyframes with a single offset === 1', () => {

        const expected = [
            { computedOffset: 1, easing, offset: 1, opacity: { interpolate, set, value: 0 } },
            { computedOffset: 1, easing, offset: null, opacity: { interpolate, set, value: 0.5 } },
            { computedOffset: 1, easing, offset: null, opacity: { interpolate, set, value: 1 } },
        ]

        effect.setKeyframes({ offset: 1, opacity: [0, 0.5, 1] })
        expect(effect.getKeyframes()).toEqual(expected)
    })
    it('computes keyframes with fewer offset values than for properties', () => {

        const expected = [
            { computedOffset: 0, easing, offset: 0, opacity: { interpolate, set, value: 0 } },
            { computedOffset: 1, easing, offset: 1, opacity: { interpolate, set, value: 0.5 } },
            { computedOffset: 1, easing, offset: null, opacity: { interpolate, set, value: 1 } },
        ]

        effect.setKeyframes({ offset: [0, 1], opacity: [0, 0.5, 1] })
        expect(effect.getKeyframes()).toEqual(expected)
    })
    it('computes keyframes with more offset values than for properties', () => {

        const expected = [
            { computedOffset: 0, easing, offset: 0, opacity: { interpolate, set, value: 0 } },
            { computedOffset: 0.5, easing, offset: 0.5, opacity: { interpolate, set, value: 1 } },
        ]

        effect.setKeyframes({ offset: [0, 0.5, 1], opacity: [0, 1] })
        expect(effect.getKeyframes()).toEqual(expected)
    })
})
describe('KeyframeEffect.target', () => {
    it('applies/removes its values when replacing target', () => {

        const target1 = document.createElement('div')
        const target2 = document.createElement('div')
        const keyframes = { opacity: [0, 1] }
        const effect = new KeyframeEffect(target1, keyframes, 1)
        const animation = new Animation(effect)

        animation.play()
        effect.target = target2

        expect(target1.style.opacity).toBe('')
        expect(target2.style.opacity).toBe('0')
    })
})
describe('KeyframeEffect::apply()', () => {
    it('does not replace non-animated CSS values', () => {

        const target = document.createElement('div')

        target.style.border = '1px solid red'

        const keyframes = { opacity: [0, 1] }
        const effect = new KeyframeEffect(target, keyframes, 2)
        const animation = new Animation(effect)

        animation.currentTime = 1

        expect(target.style.border).toBe('1px solid red')
    })
    it('replaces <color>', () => {

        const target = document.createElement('div')

        target.style.borderBottomColor =
        target.style.borderLeftColor =
        target.style.borderRightColor =
        target.style.borderTopColor = 'rgb(255, 255, 255)'

        const keyframes = {
            borderBottomColor: ['#22222233', '#cccccccc'],
            borderLeftColor: ['rgba(34,34,34,0.2)', 'rgba(204,204,204,0.8)'],
            borderRightColor: ['#222222', '#cccccc'],
            borderTopColor: ['#222', '#ccc'],
        }
        const effect = new KeyframeEffect(target, keyframes, 2)
        const animation = new Animation(effect)

        animation.currentTime = 0

        expect(target.style.borderTopColor).toBe('rgb(34,34,34)')
        expect(target.style.borderRightColor).toBe('rgb(34,34,34)')
        expect(target.style.borderBottomColor).toBe('rgba(34,34,34,0.2)')
        expect(target.style.borderLeftColor).toBe('rgba(34,34,34,0.2)')

        animation.currentTime = 1

        expect(target.style.borderTopColor).toBe('rgb(119,119,119)')
        expect(target.style.borderRightColor).toBe('rgb(119,119,119)')
        expect(target.style.borderBottomColor).toBe('rgba(119,119,119,0.5)')
        expect(target.style.borderLeftColor).toBe('rgba(119,119,119,0.5)')

        animation.finish()

        expect(target.style.borderTopColor).toBe('rgb(255, 255, 255)')
        expect(target.style.borderRightColor).toBe('rgb(255, 255, 255)')
        expect(target.style.borderBottomColor).toBe('rgb(255, 255, 255)')
        expect(target.style.borderLeftColor).toBe('rgb(255, 255, 255)')
    })
    it('replaces <number>', () => {

        const target = document.createElement('div')
        const keyframes = { opacity: [0, 1] }
        const effect = new KeyframeEffect(target, keyframes, 2)
        const animation = new Animation(effect)

        animation.currentTime = 1

        expect(target.style.opacity).toBe('0.5')
    })
    it('replaces <length>', () => {

        const target = document.createElement('div')
        const keyframes = { width: ['0px', '100px'] }
        const effect = new KeyframeEffect(target, keyframes, 2)
        const animation = new Animation(effect)

        animation.currentTime = 1

        expect(target.style.width).toBe('50px')
    })
    it('replaces <string> <number|string>... <number>', () => {

        const target = document.createElement('path')
        const keyframes = { d: { set: setAttribute, value: ['M 0 0 H-10-10', 'M 0 0 H10 10'] } }
        const effect = new KeyframeEffect(target, keyframes, 2)
        const animation = new Animation(effect)

        animation.currentTime = 1

        expect(target.getAttribute('d')).toBe('M 0 0 H0 0')
    })
    it('replaces <string> <number|string>... <string>', () => {

        const target = document.createElement('path')
        const keyframes = { d: { set: setAttribute, value: ['M 0 0 H-10-10z', 'M 0 0 H10 10z'] } }
        const effect = new KeyframeEffect(target, keyframes, 2)
        const animation = new Animation(effect)

        animation.currentTime = 1

        expect(target.getAttribute('d')).toBe('M 0 0 H0 0z')
    })
    it('replaces <length> <string> <color>', () => {

        const target = document.createElement('div')
        const keyframes = { border: ['0px solid #222', '2px solid #ccc'] }
        const effect = new KeyframeEffect(target, keyframes, 2)
        const animation = new Animation(effect)

        animation.currentTime = 1

        expect(target.style.border).toBe('1px solid rgb(119,119,119)')
    })
    it('applies to its target with other effect values', () => {

        const target = document.createElement('div')
        const keyframes1 = { opacity: [0, 1] }
        const keyframes2 = { transform: ['translateX(0%)', 'translateX(100%)'] }
        const effect1 = new KeyframeEffect(target, keyframes1, 1)
        const effect2 = new KeyframeEffect(target, keyframes2, 2)
        const animation1 = new Animation(effect1)
        const animation2 = new Animation(effect2)

        animation1.currentTime = animation2.currentTime = 0

        expect(target.style.opacity).toBe('0')
        expect(target.style.transform).toBe('translateX(0%)')

        animation1.currentTime = animation2.currentTime = 1

        expect(target.style.opacity).toBe('')
        expect(target.style.transform).toBe('translateX(50%)')
    })
})

describe('MotionPathEffect::constructor(target, path, options)', () => {

    const target = document.createElement('div')
    const motionPath = new SVGPathElement

    it('throws an error when it receives an invalid path', () => {
        expect(() => new MotionPathEffect(target, {}, 1)).toThrow(errors.MOTION_PATH_TYPE)
    })
    it('throws an error when it receives an invalid options', () => {

        const invalid = [...NaNs, Infinity, -Infinity, 'none']

        invalid.forEach(value =>
            expect(() => new MotionPathEffect(target, motionPath, { anchor: value }))
                .toThrow(errors.OPTION_ANCHOR))
    })
})
describe('MotionPathEffect::apply()', () => {

    const target = document.createElement('path')
    const motionPath = new SVGPathElement
    const getTargetBoundingBox = () => ({ height: 2, width: 2, x: -1, y: -1 })

    target.getBBox = getTargetBoundingBox

    it('applies to its target', () => {

        const initialStyle = { fill: 'red', transformOrigin: 'bottom right' }
        const initialTransform = 'translate(5 5)'

        Object.assign(target.style, initialStyle)
        target.setAttribute('transform', initialTransform)

        // <path id=target d='M4 4l2 1 -2 1z' />
        target.getBBox = () => ({ height: 2, width: 2, x: 4, y: 4 })

        const effect = new MotionPathEffect(target, motionPath, 1)
        const animation = new Animation(effect)

        animation.currentTime = 0

        // Ie. from target center [5, 5] to motion path start [5, 10]
        expect(target.getAttribute('transform')).toBe('translate(0 5)')
        expect(target.style.fill).toBe(initialStyle.fill)
        expect(target.style.transformBox).toBe('fill-box')
        expect(target.style.transformOrigin).toBe('center')

        animation.finish()

        expect(target.getAttribute('transform')).toBe(initialTransform)
        expect(target.style.fill).toBe(initialStyle.fill)
        expect(target.style.transformBox).toBe('')
        expect(target.style.transformOrigin).toBe(initialStyle.transformOrigin)

        target.getBBox = getTargetBoundingBox
    })
    it('applies to its target [anchor=[1,-1]]', () => {

        const options = { anchor: [1, -1], duration: 1 }
        const effect = new MotionPathEffect(target, motionPath, options)
        const animation = new Animation(effect)
        const { points: [{ x, y }] } = motionPath

        animation.currentTime = 0

        expect(target.getAttribute('transform')).toBe(`translate(${x + 1} ${y - 1})`)
    })
    it('applies to its target [rotate=true]', () => {

        const options = { duration: 1, rotate: true }
        const effect = new MotionPathEffect(target, motionPath, options)
        const animation = new Animation(effect)
        const { points: [{ angle: { normal: angle }, x, y }] } = motionPath

        animation.currentTime = 0

        expect(target.getAttribute('transform')).toBe(`translate(${x} ${y}) rotate(${angle})`)
    })
    it('applies to its target [direction=reverse, rotate=true]', () => {

        const options = { direction: 'reverse', duration: 1, rotate: true }
        const effect = new MotionPathEffect(target, motionPath, options)
        const animation = new Animation(effect)
        const { points: [{ angle: { reverse: angle }, x, y }] } = motionPath

        animation.currentTime = 0

        expect(target.getAttribute('transform')).toBe(`translate(${x} ${y}) rotate(${angle})`)
    })
    it('applies to its target [iterationStart=0.25, rotate=true]', () => {

        const options = { duration: 1, rotate: true }
        const effect = new MotionPathEffect(target, motionPath, options)
        const animation = new Animation(effect)
        const { points: [, { angle: { normal: angle }, x, y }] } = motionPath

        animation.currentTime = 0.25

        expect(target.getAttribute('transform')).toBe(`translate(${x} ${y}) rotate(${angle})`)
    })
})

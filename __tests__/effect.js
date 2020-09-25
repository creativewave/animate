
import { AnimationEffect, KeyframeEffect, MotionPathEffect } from '../src/effect'
import { easings } from '../src/interpolate'
import { errors } from '../src/error'

const { ease, linear } = easings
const NaNs = [NaN, 'a0.5', {}/*, Symbol()*/]
const target = {}

describe('AnimationEffect::updateTiming(options)', () => {
    it('should throw when it receives an invalid timing option', () => {

        const invalid = [
            ['delay', errors.OPTION_DELAY, [...NaNs, Infinity, -Infinity]],
            ['direction', errors.OPTION_DIRECTION, ['reverse-alternate']],
            ['duration', errors.OPTION_DURATION, [...NaNs, -1]],
            ['easing', errors.OPTION_EASING, ['bounce']],
            ['endDelay', errors.OPTION_DELAY, [...NaNs, Infinity, -Infinity]],
            ['fill', errors.OPTION_FILL, ['empty']],
            ['iterations', errors.OPTION_ITERATIONS, [...NaNs, -1]],
            ['iterationStart', errors.OPTION_ITERATION_START, [...NaNs, Infinity, -Infinity, -1]],
        ]

        invalid.forEach(([option, error, values]) =>
            values.forEach(value =>
                expect(() => new AnimationEffect({ [option]: value }))
                    .toThrow(error)))
    })
    it('should update timing with the provided options', () => {

        const effect = new AnimationEffect()

        effect.updateTiming({ delay: 1 })

        expect(effect.getTiming()).toEqual({
            delay: 1,
            direction: 'normal',
            duration: 'auto',
            easing: linear,
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
    it('should throw when it receives partial keyframes', () => {

        const partialKeyframes = [
            [{ prop: 0 }],
            [{ prop: 0 }, { offset: 0.5, prop: 1 }],
            [{ offset: 0.5, prop: 0 }, { prop: 1 }],
            [{}, { prop: 0 }],
            [{ prop: 0 }, {}],
            { offset: [0, 1], prop: 0 },
            { offset: [1], prop: [0, 1] },
            { offset: 1, prop: [0, 1] },
            { offset: [0, 0.5], prop: [0, 1] },
            { offset: [0.5, 1], prop: [0, 1] },
        ]

        partialKeyframes.forEach(keyframes =>
            expect(() => new KeyframeEffect(target, keyframes, 1))
                .toThrow(errors.KEYFRAMES_PARTIAL))
    })
    it('should throw when it reveives a keyframe or a timing option with an unknown easing alias', () => {
        expect(() => new KeyframeEffect(target, [{ easing: 'unknown', prop: 0 }, { prop: 1 }]))
            .toThrow(errors.EASING)
        expect(() => new KeyframeEffect(target, { easing: 'unknown', prop: [0, 1] }))
            .toThrow(errors.EASING)
        expect(() => new KeyframeEffect(target, { prop: [0, 1] }, { easing: 'unknown' }))
            .toThrow(errors.EASING)
    })
    it('should throw when it reveives a keyframe with an out of range offset [0-1]', () => {
        expect(() => new KeyframeEffect(target, [{ offset: -1, prop: 0 }, { offset: 1, prop: 1 }]))
            .toThrow(errors.KEYFRAMES_OFFSET_RANGE)
        expect(() => new KeyframeEffect(target, [{ offset: 0, prop: 0 }, { offset: 2, prop: 1 }]))
            .toThrow(errors.KEYFRAMES_OFFSET_RANGE)
        expect(() => new KeyframeEffect(target, { offset: [-1, 1], prop: [0, 1] }))
            .toThrow(errors.KEYFRAMES_OFFSET_RANGE)
        expect(() => new KeyframeEffect(target, { offset: [0, 2], prop: [0, 1] }))
            .toThrow(errors.KEYFRAMES_OFFSET_RANGE)
    })
    it('should throw when it reveives a keyframe with an offset that is not a number', () => {
        NaNs.forEach(value => {
            expect(() => new KeyframeEffect(target, [{ prop: 0 }, { offset: value, prop: 0 }, { prop: 1 }]))
                .toThrow(errors.KEYFRAMES_OFFSET_TYPE)
            expect(() => new KeyframeEffect(target, { offset: [0, value, 1], prop: [0, 1, 2] }))
                .toThrow(errors.KEYFRAMES_OFFSET_TYPE)
        })
    })
    it('should throw when it reveives a keyframe with unordered offsets', () => {

        expect(() => new KeyframeEffect(target, [
            { prop: 0 },
            { offset: 0.75, prop: 1 },
            { offset: 0.25, prop: 2 },
            { prop: 3 },
        ])).toThrow(errors.KEYFRAMES_OFFSET_ORDER)

        expect(() => new KeyframeEffect(target, {
            offset: [0, 0.75, 0.25, 1],
            prop: [0, 1, 2, 3],
        })).toThrow(errors.KEYFRAMES_OFFSET_ORDER)
    })
    it('should set target and run updateTiming() and setKeyframes()', () => {

        const effect = new KeyframeEffect(target, { prop: [0, 1] }, 1)

        expect(effect.target).toBe(target)
        expect(effect.getTiming()).toEqual({
            delay: 0,
            direction: 'normal',
            duration: 1,
            easing: linear,
            endDelay: 0,
            fill: 'auto',
            iterationStart: 0,
            iterations: 1,
        })
        expect(effect.getKeyframes()).toEqual([
            { easing: linear, offset: 0, prop: 0 },
            { offset: 1, prop: 1 },
        ])
    })
})

describe('KeyframeEffect::getKeyframes()', () => {
    it('should compute keyframes with alias/custom/extra easing', () => {

        const expected = [
            { easing: ease, offset: 0, prop: 0 },
            { easing: ease, offset: 0.5, prop: 0.5 },
            { offset: 1, prop: 1 },
        ]

        expect(new KeyframeEffect(target, [
            { easing: 'ease', prop: 0 },
            { easing: ease, prop: 0.5 },
            { easing: 'linear', prop: 1 },
        ]).getKeyframes()).toEqual(expected)

        expect(new KeyframeEffect(target, {
            easing: ['ease', ease, 'linear'],
            offset: [0, 0.5, 1],
            prop: [0, 0.5, 1],
        }).getKeyframes()).toEqual(expected)
    })
    it('should compute keyframes with missing offset/easing', () => {

        const expected = [
            { easing: linear, offset: 0, prop1: 0, prop2: 0 },
            { easing: linear, offset: 0.5, prop1: 1 },
            { offset: 1, prop1: 2, prop2: 1 },
        ]

        expect((new KeyframeEffect(target, [
            { prop1: 0, prop2: 0 },
            { prop1: 1 },
            { prop1: 2, prop2: 1 },
        ]).getKeyframes())).toEqual(expected)

        expect((new KeyframeEffect(target, {
            prop1: [0, 1, 2],
            prop2: [0, 1],
        }).getKeyframes())).toEqual(expected)
    })
    it('should compute keyframes with missing/custom offset', () => {
        expect(new KeyframeEffect(target, [
            { prop: 0 },
            { offset: 0.3, prop: 1 },
            { prop: 0 },
            { prop: 1 },
            { offset: 0.9, prop: 1 },
            { prop: 1 },
        ]).getKeyframes()).toEqual([
            { easing: linear, offset: 0, prop: 0 },
            { easing: linear, offset: 0.3, prop: 1 },
            { easing: linear, offset: 0.5, prop: 0 },
            { easing: linear, offset: 0.7, prop: 1 },
            { easing: linear, offset: 0.9, prop: 1 },
            { offset: 1, prop: 1 },
        ])
    })
    it('should compute keyframes with a single offset/easing', () => {
        expect(new KeyframeEffect(target, {
            easing: 'linear',
            offset: 0,
            prop1: [0, 1, 2],
            prop2: [0, 1],
        }).getKeyframes()).toEqual([
            { easing: linear, offset: 0, prop1: 0, prop2: 0 },
            { easing: linear, offset: 0.5, prop1: 1 },
            { offset: 1, prop1: 2, prop2: 1 },
        ])
    })
    it('should compute keyframes with more values for offset than for easing/prop', () => {
        expect(new KeyframeEffect(target, {
            easing: ['ease', linear, 'linear', ease],
            prop1: [0, 1],
            prop2: [0, 1, 2, 3, 4, 5],
        }).getKeyframes()).toEqual([
            { easing: ease, offset: 0, prop1: 0, prop2: 0 },
            { easing: linear, offset: 0.2, prop2: 1 },
            { easing: linear, offset: 0.4, prop2: 2 },
            { easing: ease, offset: 0.6, prop2: 3 },
            { easing: ease, offset: 0.8, prop2: 4 },
            { offset: 1, prop1: 1, prop2: 5 },
        ])
    })
})

describe('MotionPathEffect::apply()', () => {
    it('should apply expected values to the target transform attribute', () => {

        /**
         * <svg viewBox="0 0 10 10">
         *   <path id=circle d="M5 10 A 5 5 0 0 0 5 0 5 5 0 0 0 5 10" />
         * </svg>
         */
        const points = [
            { angle: { normal: 45, reverse: 135 }, x: 5, y: 10 },
            { angle: { normal: -45, reverse: 45 }, x: 10, y: 5 },
            { angle: { normal: -135, reverse: -45 }, x: 5, y: 0 },
            { angle: { normal: 135, reverse: -135 }, x: 0, y: 5 },
        ]
        const path = {
            getPointAtLength(length) {
                if (length >= points.length) {
                    length %= points.length
                } else if (length < 0) {
                    length = points.length - 1
                }
                return points[Math.floor(length)]
            },
            getTotalLength() {
                return points.length
            },
        }
        const target = document.createElement('path')
        const options = {
            direction: 'alternate',
            duration: 1,
            fill: 'forwards',
            iterations: 2,
            rotate: true,
        }
        const effect = new MotionPathEffect(target, path, options)

        effect.animation = { currentTime: 0, playbackRate: 1 }
        effect.apply()

        {
            const [{ angle: { normal: angle }, x, y }] = points
            expect(target.getAttribute('transform')).toBe(`translate(${x} ${y}) rotate(${angle})`)
        }

        target.removeAttribute('transform')
        effect.animation.currentTime = 1
        effect.apply()

        {
            const [{ angle: { reverse: angle }, x, y }] = points
            expect(target.getAttribute('transform')).toBe(`translate(${x} ${y}) rotate(${angle})`)
        }

        target.removeAttribute('transform')
        effect.animation.currentTime = 0.25
        effect.apply()

        {
            const [, { angle: { normal: angle }, x, y }] = points
            expect(target.getAttribute('transform')).toBe(`translate(${x} ${y}) rotate(${angle})`)
        }
    })
})

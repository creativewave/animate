
import animate from '../src/animate'
import { errors } from '../src/error'
import { performance } from 'perf_hooks'

const createElement = (element = { style: {} }) => ({
    attributes: {},
    properties: {},
    removeAttribute(attr) {
        delete element.attributes[attr]
    },
    setAttribute(attr, value) {
        element.attributes[attr] = value
    },
    style: {
        removeProperty(prop) {
            delete element.style[prop]
        },
    },
})

const getIdleProps = playbackRate => ({
    currentTime: null,
    pending: false,
    playState: 'idle',
    playbackRate,
    startTime: null,
})

const keyframes = { opacity: [0, 1] }
let element
beforeEach(() => element = createElement())

expect.extend({
    toEqualWithLabel(animation, expected, label) {
        for (const prop in expected) {
            try {
                expect(animation[prop]).toBe(expected[prop])
            } catch {
                return {
                    message: () => `${label} should have ${prop} set to ${expected[prop]} instead of ${animation[prop]}`,
                    pass: false,
                }
            }
        }
        return { pass: true }
    },
})

describe('animate()', () => {
    it('should throw when updating Animation.currentTime from not null to null', () => {
        expect(() => animate(element, keyframes, 1).currentTime = null).toThrow(errors.CURRENT_TIME_UNRESOLVED)
    })
    it('should throw when executing Animation.finish() while endTime === Infinity', () => {

        const animation = animate(element, keyframes, { duration: 1, iterations: Infinity })

        expect(() => animation.finish()).toThrow(errors.INVALID_STATE_FINISH)
        animation.cancel()
    })
    it('should throw when executing Animation.pause() while currenTime === null && playbackRate < 0 && endTime === Infinity', () => {

        const animation = animate(element, keyframes, { duration: 1, iterations: Infinity })

        animation.cancel()
        animation.playbackRate = -1
        expect(() => animation.pause()).toThrow(errors.INVALID_STATE_PAUSE)
    })
    it('should throw when executing Animation.play() while endTime === Infinity && playbackRate < 0', () => {
        expect(() => animate(element, keyframes, { direction: 'reverse', duration: 1, iterations: Infinity }))
            .toThrow(errors.INVALID_STATE_PLAY)
    })
    it('should return a new Animation w/ expected prop values before/after Animation.cancel()', () => {

        const animation = animate(element, keyframes, 1)
        const expected = {
            currentTime: 0,
            id: 'Animation#5',
            pending: true,
            playState: 'running',
            playbackRate: 1,
            startTime: null,
        }

        expect(animation).toEqualWithLabel(expected, 'A new Animation')
        animation.cancel()
        expect(animation).toEqualWithLabel(getIdleProps(1), 'A new Animation immediately cancelled')
    })
    it('should return a new Animation w/ expected prop values after Animation.pause()', () => {

        const animation = animate(element, keyframes, 1)
        const expected = {
            currentTime: 0,
            pending: true,
            playState: 'paused',
            playbackRate: 1,
            startTime: null,
        }

        animation.pause()
        expect(animation).toEqualWithLabel(expected, 'A new Animation immediately paused')
        animation.cancel()
        expect(animation).toEqualWithLabel(getIdleProps(1), 'A new Animation immediately paused + cancelled')
    })
    it('should return a new Animation w/ expected prop values after Animation.finish()', () => {

        const animation = animate(element, keyframes, 1)
        const expected = {
            currentTime: 1,
            pending: false,
            playState: 'finished',
            playbackRate: 1,
        }

        animation.finish()
        expect(animation).toEqualWithLabel(expected, 'A new Animation immediately finished')
        expect(typeof animation.startTime).toBe('number')
        expect(animation.startTime < performance.now()).toBeTruthy()
    })
    it('should return a new Animation w/ expected prop values after Animation.reverse()', async () => {

        const animation = animate(element, keyframes, 1)
        const expected = {
            end: {
                currentTime: 0,
                pending: false,
                playState: 'finished',
                playbackRate: -1,
            },
            start: {
                currentTime: 1,
                pending: true,
                playState: 'running',
                // Memo: the procedure to update (effective) playback rate has not been implemented
                playbackRate: -1,
                startTime: null,
            },
        }

        animation.reverse()
        expect(animation).toEqualWithLabel(expected.start, 'A new Animation immediately reversed')

        return await animation.finished.then(() => {
            expect(animation).toEqualWithLabel(expected.end, 'A new Animation immediately reversed, and finished,')
            expect(typeof animation.startTime).toBe('number')
            expect(animation.startTime < performance.now()).toBeTruthy()
        })
    })
    it('should return a new Animation w/ expected prop values after setting Animation.currentTime', () => {

        const animation = animate(element, keyframes, 2)
        const expected = {
            currentTime: 1,
            pending: true,
            playState: 'running',
            playbackRate: 1,
            startTime: null,
        }

        animation.currentTime = 1
        expect(animation).toEqualWithLabel(expected, 'A new Animation whose current time is immediately updated')
        animation.cancel()
        expect(animation).toEqualWithLabel(getIdleProps(1), 'A new Animation immediately cancelled')
    })
})

/**
 * TODO
 * - new -> finish -> new -> finish (replacement of finished promise)
 * - set start time
 * - set current time multiple times
 * - set start time multiple times
 * - expect Element props/values for each test case +:
 *   - playbackRate !== 1
 *   - delay !== 0
 *   - endDelay !== 0
 *   - direction !== 'normal'
 *   - iterations !== 1
 *   - direction + iterations
 *   - fill !== 'none'
 */

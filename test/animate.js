
import animate from '../src/animate'
import assert from 'assert'
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

const assertAnimationHasProps = (label, animation, expected) =>
    Object.keys(expected).forEach(prop => assert.strictEqual(
        animation[prop], expected[prop], `${label} should have ${prop} set to ${expected[prop]} instead of ${animation[prop]}`))

const keyframes = { opacity: [0, 1] }
let element
beforeEach(() => element = createElement())

describe('animate()', () => {
    it('should throw when updating Animation.currentTime from not null to null', () => {
        assert.throws(() => animate(element, keyframes, 1).currentTime = null, errors.CURRENT_TIME_UNRESOLVED)
    })
    it('should throw when executing Animation.finish() while endTime === Infinity', () => {

        const animation = animate(element, keyframes, { duration: 1, iterations: Infinity })

        assert.throws(() => animation.finish(), errors.INVALID_STATE_FINISH)
        animation.cancel()
    })
    it('should throw when executing Animation.pause() while currenTime === null && playbackRate < 0 && endTime === Infinity', () => {

        const animation = animate(element, keyframes, { duration: 1, iterations: Infinity })

        animation.cancel()
        animation.playbackRate = -1
        assert.throws(() => animation.pause(), errors.INVALID_STATE_PAUSE)
    })
    it('should throw when executing Animation.play() while endTime === Infinity && playbackRate < 0', () => {
        assert.throws(
            () => animate(element, keyframes, { direction: 'reverse', duration: 1, iterations: Infinity }),
            errors.INVALID_STATE_PLAY)
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

        assertAnimationHasProps('A new Animation', animation, expected)
        animation.cancel()
        assertAnimationHasProps('A new Animation immediately cancelled', animation, getIdleProps(1))
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
        assertAnimationHasProps('A new Animation immediately paused', animation, expected)
        animation.cancel()
        assertAnimationHasProps('A new Animation immediately paused + cancelled', animation, getIdleProps(1))
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
        assertAnimationHasProps('A new Animation immediately finished', animation, expected)
        assert.strictEqual(typeof animation.startTime, 'number')
        assert.ok(animation.startTime < performance.now())
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
        assertAnimationHasProps('A new Animation immediately reversed', animation, expected.start)

        return await animation.finished.then(() => {
            assertAnimationHasProps('A new Animation immediately reversed, and finished,', animation, expected.end)
            assert.strictEqual(typeof animation.startTime, 'number')
            assert.ok(animation.startTime < performance.now())
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
        assertAnimationHasProps('A new Animation whose current time is immediately updated', animation, expected)
        animation.cancel()
        assertAnimationHasProps('A new Animation immediately cancelled', animation, getIdleProps(1))
    })
})

/**
 * TODO
 * - new -> finish -> new -> finish (replacement of finished promise)
 * - set start time
 * - set current time multiple times
 * - set start time multiple times
 * - assert Element props/values for each test case +:
 *   - playbackRate !== 1
 *   - delay !== 0
 *   - endDelay !== 0
 *   - direction !== 'normal'
 *   - iterations !== 1
 *   - direction + iterations
 *   - fill !== 'none'
 */

/**
 * @jest-environment jsdom
 */

import Animation from '../src/animation.js'
import { KeyframeEffect } from '../src/effect.js'
import { clear } from '../src/registry.js'
import { errors } from '../src/error.js'
import { performance } from 'node:perf_hooks'
import timeline from '../src/timeline.js'

const keyframes = { opacity: [0, 1] }
const target = document.createElement('a')

beforeEach(() => {
    target.style.opacity = '0.5'
    clear()
})

describe('Animation::constructor(effect, timeline)', () => {
    it('sets properties', async () => {

        const effect = new KeyframeEffect(target, keyframes)
        const timeline = { currentTime: 0 }
        const animation = new Animation(effect, timeline)
        const callback = jest.fn()

        expect(animation.effect).toBe(effect)
        expect(animation.timeline).toBe(timeline)
        expect(animation.currentTime).toBeNull()
        expect(animation.pending).toBe(false)
        expect(animation.playbackRate).toBe(1)
        expect(animation.startTime).toBeNull()

        animation.ready.then(callback)

        await Promise.resolve()

        expect(callback).toHaveBeenCalledTimes(1)
        expect(callback).toHaveBeenCalledWith(animation)
    })
    it('sets properties with no effect or timeline', async () => {

        const animation = new Animation

        expect(animation.effect).toBeNull()
        expect(animation.timeline).toBe(timeline)
        expect(() => {
            animation.play()
            animation.pause()
            animation.reverse()
            animation.finish()
        }).not.toThrow()

        await new Promise(requestAnimationFrame)

        expect(() => {
            animation.currentTime = 0
            animation.startTime = 0
            animation.timeline = { currentTime: 0 }
            animation.cancel()
        }).not.toThrow()
    })
})

describe('Animation::play() and before phase', () => {
    it('throws an error when Animation has an invalid state', () => {

        const options = { duration: 1, iterations: Infinity }
        const effect = new KeyframeEffect(target, keyframes, options)
        const animation = new Animation(effect)

        animation.playbackRate = -1

        expect(() => animation.play()).toThrow(errors.INVALID_STATE_PLAY)
    })
    it('updates Animation and applies Animation.effect before/after Animation.ready', async () => {

        const effect = new KeyframeEffect(target, keyframes, 1)
        const animation = new Animation(effect)
        let startTime

        requestAnimationFrame(() => startTime = document.timeline.currentTime)

        animation.play()

        expect(animation.currentTime).toBe(0)
        expect(animation.pending).toBe(true)
        expect(animation.playState).toBe('running')
        expect(animation.playbackRate).toBe(1)
        expect(animation.startTime).toBeNull()
        expect(target.style.opacity).toBe('0')

        await animation.ready

        expect(animation.currentTime).toBe(0)
        expect(animation.pending).toBe(false)
        expect(animation.playState).toBe('running')
        expect(animation.playbackRate).toBe(1)
        expect(animation.startTime).toBe(startTime)
        expect(target.style.opacity).toBe('0')

        animation.cancel()
    })
    it('applies Animation.effect [fill=auto|none, delay]', async () => {

        const options = { delay: 10, duration: 10 }
        const effect = new KeyframeEffect(target, keyframes, options)
        const animation = new Animation(effect)

        animation.play()

        expect(target.style.opacity).toBe('0.5')

        effect.updateTiming({ fill: 'none' })

        expect(target.style.opacity).toBe('0.5')

        await animation.finished
        animation.play()
        await animation.ready

        // it should not apply value from last frame of previous animation
        expect(target.style.opacity).toBe('0.5')

        animation.cancel()
    })
    it('applies Animation.effect [fill=backwards|both, delay]', () => {

        const options = { delay: 1, duration: 1, fill: 'backwards' }
        const effect = new KeyframeEffect(target, keyframes, options)
        const animation = new Animation(effect)

        animation.play()

        expect(target.style.opacity).toBe('0')

        effect.updateTiming({ fill: 'both' })

        expect(target.style.opacity).toBe('0')

        animation.cancel()
    })
    it('applies Animation.effect [direction=reverse]', () => {

        const options = { direction: 'reverse', duration: 1 }
        const effect = new KeyframeEffect(target, keyframes, options)
        const animation = new Animation(effect)

        animation.play()

        expect(target.style.opacity).toBe('1')

        animation.cancel()
    })
    it('applies Animation.effect [direction=alternate-reverse, iterations=3]', () => {

        const options = { direction: 'alternate-reverse', duration: 1, iterations: 3 }
        const effect = new KeyframeEffect(target, keyframes, options)
        const animation = new Animation(effect)

        animation.play()

        expect(target.style.opacity).toBe('1')

        animation.cancel()
    })
    it('updates Animation with a shifted DocumentTimeline', async () => {

        const originTime = 1
        const timeline = new DocumentTimeline({ originTime })
        const animation = new Animation(null, timeline)
        let startTime

        requestAnimationFrame(() => startTime = timeline.currentTime)

        animation.play()
        await animation.ready

        expect(animation.startTime).toBe(startTime)

        animation.cancel()
    })
})

describe('Animation.cancel()', () => {
    it('updates Animation and removes Animation.effect', async () => {

        const effect = new KeyframeEffect(target, keyframes, 1)
        const animation = new Animation(effect)

        animation.play()
        const { ready } = animation
        animation.cancel()

        const result = await animation.ready

        expect(animation.currentTime).toBeNull()
        expect(animation.pending).toBe(false)
        expect(animation.playState).toBe('idle')
        expect(animation.playbackRate).toBe(1)
        expect(animation.startTime).toBeNull()
        expect(animation.ready).not.toBe(ready)
        expect(result).toBe(animation)
        expect(target.style.opacity).toBe('0.5')
    })
    it('rejects then replaces Animation.ready and Animation.finished', async () => {

        const effect = new KeyframeEffect(target, keyframes, 1)
        const animation = new Animation(effect)
        const onReady = jest.fn()
        const onFinished = jest.fn()

        animation.play()

        const { ready, finished } = animation

        ready.catch(onReady)
        finished.catch(onFinished)
        animation.cancel()

        await Promise.resolve()

        expect(onReady).toHaveBeenCalledTimes(1)
        expect(onReady).toHaveBeenCalledWith(errors.ABORT)
        expect(onFinished).toHaveBeenCalledTimes(1)
        expect(onFinished).toHaveBeenCalledWith(errors.ABORT)
        expect(animation.ready).not.toBe(ready)
        expect(animation.finished).not.toBe(finished)
    })
    it('runs Animation.oncancel()', () => {

        const effect = new KeyframeEffect(target, keyframes, 1)
        const animation = new Animation(effect)
        const callback = jest.fn()

        animation.oncancel = callback
        animation.cancel()

        expect(callback).not.toHaveBeenCalled()

        animation.play()
        animation.cancel()

        expect(callback).toHaveBeenNthCalledWith(1, animation)

        animation.play()
        animation.cancel()

        expect(callback).toHaveBeenNthCalledWith(2, animation)
    })
})

describe('Animation.pause()', () => {
    it('throws an error when Animation has an invalid state', () => {

        const options = { duration: 1, iterations: Infinity }
        const effect = new KeyframeEffect(target, keyframes, options)
        const animation = new Animation(effect)

        animation.playbackRate = -1

        expect(() => animation.pause()).toThrow(errors.INVALID_STATE_PAUSE)
    })
    it('updates Animation and applies Animation.effect before/after Animation.ready', async () => {

        const effect = new KeyframeEffect(target, keyframes, 1)
        const animation = new Animation(effect)

        animation.pause()

        expect(animation.currentTime).toBe(0)
        expect(animation.pending).toBe(true)
        expect(animation.playState).toBe('paused')
        expect(animation.playbackRate).toBe(1)
        expect(animation.startTime).toBeNull()
        expect(target.style.opacity).toBe('0')

        await animation.ready

        expect(animation.currentTime).toBe(0)
        expect(animation.pending).toBe(false)
        expect(animation.playState).toBe('paused')
        expect(animation.playbackRate).toBe(1)
        expect(animation.startTime).toBeNull()
        expect(target.style.opacity).toBe('0')

        animation.cancel()
    })
    it('updates Animation after Animation.play()', async () => {

        const effect = new KeyframeEffect(target, keyframes, 1)
        const animation = new Animation(effect)

        animation.play()
        animation.pause()

        expect(animation.currentTime).toBe(0)
        expect(animation.pending).toBe(true)
        expect(animation.playState).toBe('paused')
        expect(animation.startTime).toBeNull()

        await animation.ready

        expect(animation.currentTime).toBe(0)
        expect(animation.pending).toBe(false)
        expect(animation.playState).toBe('paused')
        expect(animation.playbackRate).toBe(1)
        expect(animation.startTime).toBeNull()
        expect(target.style.opacity).toBe('0')

        animation.cancel()
    })
})

describe('Animation.finish() and after phase', () => {
    it('throws an error when Animation has an invalid state', () => {

        const options = { duration: 1, iterations: Infinity }
        const effect = new KeyframeEffect(target, keyframes, options)
        const animation = new Animation(effect)

        expect(() => animation.finish()).toThrow(errors.INVALID_STATE_FINISH)

        animation.cancel()
    })
    it('updates Animation and removes the effect', () => {

        const duration = 1000
        const effect = new KeyframeEffect(target, keyframes, duration)
        const animation = new Animation(effect)
        const startTime = document.timeline.currentTime - duration

        animation.finish()

        expect(animation.currentTime).toBe(duration)
        expect(animation.pending).toBe(false)
        expect(animation.playState).toBe('finished')
        expect(animation.startTime).toBe(startTime)
        expect(target.style.opacity).toBe('0.5')
    })
    it('applies Animation.effect with [fill=forwards|both]', () => {

        const options = { duration: 1, fill: 'forwards' }
        const effect = new KeyframeEffect(target, keyframes, options)
        const animation = new Animation(effect)

        animation.finish()

        expect(target.style.opacity).toBe('1')

        effect.updateTiming({ fill: 'both' })

        expect(target.style.opacity).toBe('1')
    })
    it('applies Animation.effect with [fill=forwards|both, direction=reverse]', () => {

        const options = { direction: 'reverse', duration: 1, fill: 'forwards' }
        const effect = new KeyframeEffect(target, keyframes, options)
        const animation = new Animation(effect)

        animation.finish()

        expect(target.style.opacity).toBe('0')

        effect.updateTiming({ fill: 'both' })

        expect(target.style.opacity).toBe('0')
    })
    it('applies Animation.effect with [fill=forwards|both, direction=alternate]', () => {

        const options = { direction: 'alternate', duration: 1, fill: 'forwards' }
        const effect = new KeyframeEffect(target, keyframes, options)
        const animation = new Animation(effect)

        animation.finish()

        expect(target.style.opacity).toBe('1')

        effect.updateTiming({ fill: 'both' })

        expect(target.style.opacity).toBe('1')
    })
    it('applies Animation.effect with [fill=forwards|both, direction=alternate, iterations=2]', () => {

        const options = { direction: 'alternate', duration: 1, fill: 'forwards', iterations: 2 }
        const effect = new KeyframeEffect(target, keyframes, options)
        const animation = new Animation(effect)

        animation.finish()

        expect(target.style.opacity).toBe('0')

        effect.updateTiming({ fill: 'both' })

        expect(target.style.opacity).toBe('0')
    })
    it('applies Animation.effect with [fill=forwards|both, direction=alternate-reverse, iterations=3]', () => {

        const options = { direction: 'alternate-reverse', duration: 1, fill: 'forwards', iterations: 3 }
        const effect = new KeyframeEffect(target, keyframes, options)
        const animation = new Animation(effect)

        animation.finish()

        expect(target.style.opacity).toBe('0')

        effect.updateTiming({ fill: 'both' })

        expect(target.style.opacity).toBe('0')
    })
    it('resolves Animation.finished', async () => {

        const effect = new KeyframeEffect(target, keyframes, 1)
        const animation = new Animation(effect)
        const callback = jest.fn()

        animation.play()
        animation.finished.then(callback)

        await animation.ready
        await new Promise(requestAnimationFrame)
        await Promise.resolve()

        expect(callback).toHaveBeenCalledTimes(1)
        expect(callback).toHaveBeenCalledWith(animation)
    })
    it('runs Animation.onfinish()', async () => {

        const effect = new KeyframeEffect(target, keyframes, 1)
        const animation = new Animation(effect)
        const callback = jest.fn()

        animation.onfinish = callback
        animation.play()

        await animation.finished

        expect(callback).toHaveBeenNthCalledWith(1, animation)

        animation.play()

        await animation.finished

        expect(callback).toHaveBeenNthCalledWith(2, animation)
    })
    it('does not trigger notification steps after timing is updated and animation is still running', async () => {

        const effect = new KeyframeEffect(target, keyframes, 10)
        const animation = new Animation(effect)
        const callback = jest.fn()

        animation.onfinish = callback

        animation.play()
        animation.currentTime = 10
        effect.updateTiming({ iterations: 2 })

        await Promise.resolve()

        expect(animation.playState).toBe('running')
        expect(callback).not.toHaveBeenCalled()

        animation.finish()

        expect(animation.playState).toBe('finished')
        expect(callback).toHaveBeenCalledTimes(1)
    })
})

describe('Animation.reverse()', () => {
    it('throws an error when Animation has an invalid state', () => {

        const effect = new KeyframeEffect(target, keyframes)
        const animation = new Animation(effect, null)

        expect(() => animation.reverse()).toThrow(errors.INVALID_STATE_REVERSE)
    })
    it('updates Animation and applies Animation.effect', () => {

        const effect = new KeyframeEffect(target, keyframes, 1)
        const animation = new Animation(effect)

        animation.reverse()

        expect(animation.currentTime).toBe(1)
        expect(animation.pending).toBe(true)
        expect(animation.playState).toBe('running')
        expect(animation.playbackRate).toBe(-1)
        expect(target.style.opacity).toBe('1')

        animation.cancel()
    })
})

describe('Animation.currentTime', () => {
    it('throw an error when Animation.currentTime is set from not null to null', () => {

        const effect = new KeyframeEffect(target, keyframes)
        const animation = new Animation(effect)

        animation.currentTime = 0

        expect(() => animation.currentTime = null).toThrow(errors.CURRENT_TIME_UNRESOLVED)
    })
    it('updates Animation and applies Animation.effect', async () => {

        const effect = new KeyframeEffect(target, keyframes, 2)
        const animation = new Animation(effect)

        animation.currentTime = 1

        expect(animation.currentTime).toBe(1)
        expect(animation.pending).toBe(false)
        expect(animation.playState).toBe('paused')
        expect(animation.playbackRate).toBe(1)
        expect(animation.startTime).toBeNull()
        expect(target.style.opacity).toBe('0.5')

        animation.finish()
        animation.currentTime = 0

        expect(animation.playState).toBe('running')
        expect(target.style.opacity).toBe('0')

        animation.cancel()
    })
})

describe('Animation.effect', () => {
    it('updates Animation and applies Animation.effect', async () => {

        const effect = new KeyframeEffect(target, keyframes, 16)
        const newEffect = new KeyframeEffect(target, keyframes, 64)
        const animation = new Animation(effect)

        animation.finish()
        animation.effect = newEffect

        expect(animation.playState).toBe('running')
        expect(target.style.opacity).toBe('0.25')

        await new Promise(requestAnimationFrame)

        animation.cancel()
    })
    it('removes Animation.effect when it is set to null', () => {

        const effect = new KeyframeEffect(target, keyframes, 1)
        const animation = new Animation(effect)

        animation.play()
        animation.effect = null

        expect(target.style.opacity).toBe('0.5')

        animation.cancel()
    })
    it('removes Animation.effect on a previous Animation', () => {

        const effect = new KeyframeEffect(null, keyframes, 1)
        const previousAnimation = new Animation(effect)

        previousAnimation.play()
        new Animation(effect)

        expect(previousAnimation.effect).toBeNull()
        expect(previousAnimation.playState).toBe('finished')
        expect(target.style.opacity).toBe('0.5')
    })
})

describe('Animation.startTime', () => {
    it('updates Animation and applies Animation.effect', () => {

        const effect = new KeyframeEffect(target, keyframes, 2)
        const animation = new Animation(effect)

        animation.startTime = performance.now() + 50

        expect(animation.currentTime < 0).toBeTruthy()
        expect(animation.pending).toBe(false)
        expect(animation.playState).toBe('running')
        expect(animation.playbackRate).toBe(1)
        expect(target.style.opacity).toBe('0.5')

        animation.cancel()
    })
})

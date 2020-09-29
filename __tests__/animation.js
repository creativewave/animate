
import Animation, { timeline } from '../src/animation'
import { KeyframeEffect } from '../src/effect'
import { errors } from '../src/error'
import { performance } from 'perf_hooks'

const keyframes = { opacity: [0, 1] }

let target
beforeEach(() => {
    target = document.createElement('a')
    target.style.opacity = '0.5'
})

describe('Animation::constructor(effect, timeline)', () => {
    it('should set timeline/effect and have expected prop values', () => {

        const effect = new KeyframeEffect(target, keyframes)
        const customTimeline = { currentTime: 0 }
        const animation = new Animation(effect, customTimeline)

        // Memo: `toEqual()` breaks w/ private properties transformed by babel
        expect(animation.effect).toBe(effect)
        expect(animation.timeline).toBe(customTimeline)
        expect(animation.currentTime).toBeNull()
        expect(animation.pending).toBe(false)
        expect(animation.playbackRate).toBe(1)
        expect(animation.startTime).toBeNull()

        expect((new Animation(effect)).timeline).toBe(timeline)
    })
})

describe('Animation::play() and before phase', () => {
    it('should throw an error when Animation has an invalid state', () => {

        const effect = new KeyframeEffect(target, keyframes, { duration: 1, iterations: Infinity })
        const animation = new Animation(effect)

        animation.playbackRate = -1

        expect(animation.play).toThrow(errors.INVALID_STATE_PLAY)
    })
    it('should have expected prop values (as well as target) before/after Animation.ready', async () => {

        const effect = new KeyframeEffect(target, keyframes, 1)
        const animation = new Animation(effect)

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
        expect(typeof animation.startTime).toBe('number')
        expect(target.style.opacity).toBe('0')

        animation.cancel()
    })
    it('should apply expected prop values on target when fill is backwards|both and Animation has a start delay', () => {

        const effect = new KeyframeEffect(target, keyframes, { delay: 1, duration: 1, fill: 'backwards' })
        const animation = new Animation(effect)

        animation.play()

        expect(target.style.opacity).toBe('0')

        effect.updateTiming({ fill: 'both' })

        expect(target.style.opacity).toBe('0')

        animation.cancel()
    })
    it('should apply expected prop values on target when direction is reverse', () => {

        const effect = new KeyframeEffect(target, keyframes, { direction: 'reverse', duration: 1 })
        const animation = new Animation(effect)

        animation.play()

        expect(target.style.opacity).toBe('1')

        animation.cancel()
    })
    it('should apply expected prop values on target when direction is alternate-reverse and iterations is 3', () => {

        const option = { direction: 'alternate-reverse', duration: 1, iterations: 3 }
        const effect = new KeyframeEffect(target, keyframes, option)
        const animation = new Animation(effect)

        animation.play()

        expect(target.style.opacity).toBe('1')

        animation.cancel()
    })
})

describe('Animation.cancel()', () => {
    it('should have expected prop values (as well as target)', () => {

        const effect = new KeyframeEffect(target, keyframes, 1)
        const animation = new Animation(effect)

        animation.play()
        animation.cancel()

        expect(animation.currentTime).toBeNull()
        expect(animation.pending).toBe(false)
        expect(animation.playState).toBe('idle')
        expect(animation.playbackRate).toBe(1)
        expect(animation.startTime).toBeNull()
        expect(target.style.opacity).toBe('')
    })
})

describe('Animation.pause()', () => {
    it('should throw an error when Animation has an invalid state', () => {

        const effect = new KeyframeEffect(target, keyframes, { duration: 1, iterations: Infinity })
        const animation = new Animation(effect)

        animation.playbackRate = -1

        expect(animation.pause).toThrow(errors.INVALID_STATE_PAUSE)
    })
    it('should have expected prop values (as well as target) before/after Animation.ready', async () => {

        const effect = new KeyframeEffect(target, keyframes, 1)
        const animation = new Animation(effect)

        animation.pause()

        expect(animation.currentTime).toBe(0)
        expect(animation.pending).toBe(true)
        expect(animation.playState).toBe('paused')
        expect(animation.playbackRate).toBe(1)
        expect(animation.startTime).toBeNull()
        expect(target.style.opacity).toBe('0.5')

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
    it('should throw an error when Animation has an invalid state', () => {

        const effect = new KeyframeEffect(target, keyframes, { duration: 1, iterations: Infinity })
        const animation = new Animation(effect)

        expect(animation.finish).toThrow(errors.INVALID_STATE_FINISH)

        animation.cancel()
    })
    it('should have expected prop values (as well as target)', () => {

        const effect = new KeyframeEffect(target, keyframes, 1000)
        const animation = new Animation(effect)

        animation.finish()

        expect(animation.currentTime).toBe(1000)
        expect(animation.pending).toBe(false)
        expect(animation.playState).toBe('finished')
        expect(animation.playbackRate).toBe(1)
        expect(typeof animation.startTime).toBe('number')
        expect(target.style.opacity).toBe('0.5')
    })
    it('should apply expected prop values on target when fill is forwards|both', () => {

        const effect = new KeyframeEffect(target, keyframes, { duration: 1, fill: 'forwards' })
        const animation = new Animation(effect)

        animation.finish()

        expect(target.style.opacity).toBe('1')

        effect.updateTiming({ fill: 'both' })

        expect(target.style.opacity).toBe('1')
    })
    it('should apply expected prop values on target when direction is reverse and fill is forwards|both', () => {

        const effect = new KeyframeEffect(target, keyframes, { direction: 'reverse', duration: 1, fill: 'forwards' })
        const animation = new Animation(effect)

        animation.finish()

        expect(target.style.opacity).toBe('0')

        effect.updateTiming({ fill: 'both' })

        expect(target.style.opacity).toBe('0')
    })
    it('should apply expected prop values on target when direction is alternate and fill is forwards|both', () => {

        const option = { direction: 'alternate', duration: 1, fill: 'forwards' }
        const effect = new KeyframeEffect(target, keyframes, option)
        const animation = new Animation(effect)

        animation.finish()

        expect(target.style.opacity).toBe('1')

        effect.updateTiming({ fill: 'both' })

        expect(target.style.opacity).toBe('1')
    })
    it('should apply expected prop values on target when direction is alternate, fill is forwards|both, and iterations is 2', () => {

        const effect = new KeyframeEffect(target, keyframes, { direction: 'alternate', duration: 1, fill: 'forwards', iterations: 2 })
        const animation = new Animation(effect)

        animation.finish()

        expect(target.style.opacity).toBe('0')

        effect.updateTiming({ fill: 'both' })

        expect(target.style.opacity).toBe('0')
    })
    it('should apply expected prop values on target when direction is alternate-reverse, fill is forwards|both, and iterations is 3', () => {

        const option = { direction: 'alternate-reverse', duration: 1, fill: 'forwards', iterations: 3 }
        const effect = new KeyframeEffect(target, keyframes, option)
        const animation = new Animation(effect)

        animation.finish()

        expect(target.style.opacity).toBe('0')

        effect.updateTiming({ fill: 'both' })

        expect(target.style.opacity).toBe('0')
    })
    it('should run a callaback passed to Animation.finished.then()', async () => {

        const effect = new KeyframeEffect(target, keyframes, 1)
        const animation = new Animation(effect)
        const callback = jest.fn()

        animation.play()
        animation.finished.then(callback)

        await animation.finished

        expect(callback).toHaveBeenNthCalledWith(1, animation)
    })
    it('should run a callaback passed to Animation.next()', async () => {

        const effect = new KeyframeEffect(target, keyframes, 1)
        const animation = new Animation(effect)
        const callback1 = jest.fn()
        const callback2 = jest.fn()

        animation.play()
        animation.next(callback1).next(callback2)

        await animation.finished

        expect(callback1).toHaveBeenNthCalledWith(1, animation)

        await Promise.resolve()

        expect(callback2).toHaveBeenCalledTimes(1)

        animation.play()

        await animation.finished

        expect(callback1).toHaveBeenNthCalledWith(2, animation)

        await Promise.resolve()

        expect(callback2).toHaveBeenCalledTimes(2)
    })
})

describe('Animation.reverse()', () => {
    it('should throw an error when Animation has an invalid state', () => {

        const effect = new KeyframeEffect(target, keyframes)
        const animation = new Animation(effect, null)

        expect(animation.reverse).toThrow(errors.INVALID_STATE_REVERSE)
    })
    it('should have expected prop values (as well as target)', () => {

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
    it('should throw when Animation.currentTime is set from not null to null', () => {

        const effect = new KeyframeEffect(target, keyframes)
        const animation = new Animation(effect)

        animation.currentTime = 0

        expect(() => animation.currentTime = null).toThrow(errors.CURRENT_TIME_UNRESOLVED)
    })
    it('should have expected prop values (as well as target)', () => {

        const effect = new KeyframeEffect(target, keyframes, 2)
        const animation = new Animation(effect)

        animation.currentTime = 1

        expect(animation.currentTime).toBe(1)
        expect(animation.pending).toBe(false)
        expect(animation.playState).toBe('paused')
        expect(animation.playbackRate).toBe(1)
        expect(animation.startTime).toBeNull()
        expect(target.style.opacity).toBe('0.5')
    })
})

describe('Animation.startTime', () => {
    it('should have expected prop values (as well as target)', async () => {

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

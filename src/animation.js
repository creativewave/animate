
import { error, errors } from './error.js'
import createPromise from './promise.js'
import frame from './frame.js'
import timeline from './timeline.js'

/**
 * getAssociatedEffectEnd :: Animation -> Number
 */
function getAssociatedEffectEnd(animation) {
    return animation.effect?.getComputedTiming().endTime ?? 0
}

class Animation {

    oncancel
    onfinish
    playbackRate = 1

    #effect = null
    #holdTime = null
    #pendingTask = null
    #previousCurrentTime = null
    #startTime = null
    #silent
    #timeline
    #useHoldTime = true

    constructor(effect, t = timeline) {
        this.ready = Promise.resolve(this)
        this.finished = createPromise()
        this.timeline = t
        this.effect = effect
    }

    get currentTime() {
        if (this.#holdTime !== null && this.#useHoldTime) {
            return this.#holdTime
        }
        if (this.#startTime === null || !this.#timeline) {
            return null
        }
        return (this.#timeline.currentTime - this.#startTime) * this.playbackRate
    }

    set currentTime(seekTime = null) {
        if (seekTime === null) {
            if (this.currentTime !== null) {
                error(errors.CURRENT_TIME_UNRESOLVED)
            }
            return
        }
        if (this.#holdTime !== null || this.#startTime === null || this.playbackRate === 0 || !this.#timeline) {
            this.#holdTime = seekTime
            if (!this.#timeline) {
                this.#startTime = null
            }
        } else {
            this.#startTime = this.timeline.currentTime - (seekTime / this.playbackRate)
        }
        this.#previousCurrentTime = null
        if (this.#silent) {
            return
        }
        if (this.#pendingTask?.name === 'pause') {
            this.#holdTime = seekTime
            this.#startTime = null
            this.#pendingTask = null
            this.ready.resolve(this)
        }
        this.#update(undefined, true, false, true)
    }

    get effect() {
        return this.#effect
    }

    set effect(newEffect = null) {
        if (this.#effect === newEffect) {
            return
        }
        if (newEffect) {
            if (newEffect.animation) {
                newEffect.animation.effect = null
            }
            newEffect.animation = this
        } else {
            this.#effect?.remove()
        }
        this.#effect = newEffect
        this.#update(undefined, false, false, true)
    }

    get pending() {
        return Boolean(this.#pendingTask)
    }

    get playState() {

        const { currentTime } = this
        const endTime = getAssociatedEffectEnd(this)

        if (currentTime === null && this.#startTime === null && !this.#pendingTask) {
            return 'idle'
        }
        if (this.#pendingTask?.name === 'pause' || (this.#startTime === null && this.#pendingTask?.name !== 'play')) {
            return 'paused'
        }
        if (currentTime !== null && ((this.playbackRate > 0 && currentTime >= endTime) || (this.playbackRate < 0 && currentTime <= 0))) {
            return 'finished'
        }
        return 'running'
    }

    get startTime() {
        return this.#startTime
    }

    set startTime(newStartTime = null) {
        const timelineTime = this.#timeline?.currentTime ?? null
        if (timelineTime === null && newStartTime !== null) {
            this.#holdTime = null
        }
        const previousCurrentTime = this.currentTime
        this.#startTime = newStartTime
        if (this.#startTime === null) {
            this.#holdTime = previousCurrentTime
        } else if (this.playbackRate !== 0) {
            this.#holdTime = null
        }
        if (this.#pendingTask) {
            this.#pendingTask = null
            this.ready.resolve(this)
        }
        this.#update(undefined, true, false, true)
    }

    get timeline() {
        return this.#timeline
    }

    set timeline(newTimeline = null) {
        if (this.#timeline === newTimeline) {
            return
        }
        this.#timeline = newTimeline
        if (this.#startTime !== null) {
            this.#holdTime = null
        }
        this.#update(undefined, false, false, true)
    }

    /**
     * Note: animating an element removed from the DOM does not throw an error
     * but Animation.cancel() should be used to prevent memory leaks.
     */
    cancel = () => {
        if (this.playState !== 'idle') {
            if (this.#pendingTask) {
                this.#pendingTask = null
                this.ready.reject(errors.ABORT)
                this.ready = createPromise()
                this.oncancel?.(this)
            }
            this.finished.reject(errors.ABORT)
            this.finished = createPromise()
            this.#effect?.remove()
            frame.cancel(this.#update)
        }
        this.#holdTime = null
        this.#startTime = null
    }

    finish = () => {

        const endTime = getAssociatedEffectEnd(this)

        if (this.playbackRate === 0 || (this.playbackRate > 0 && endTime === Infinity)) {
            error(errors.INVALID_STATE_FINISH)
        }

        this.#silent = true
        const limit = this.currentTime = this.playbackRate > 0 ? endTime : 0
        this.#silent = false

        if (this.#startTime === null && this.#timeline) {
            this.#startTime = this.#timeline.currentTime - (limit / this.playbackRate)
        }
        if (this.#pendingTask) {
            if (this.#pendingTask?.name === 'pause' && this.#startTime !== null) {
                this.#holdTime = null
            }
            this.#pendingTask = null
            this.ready.resolve(this)
        }
        this.#update(undefined, true, true, true)
    }

    pause = () => {

        if (this.#pendingTask?.name === 'pause' || this.playState === 'paused') {
            return
        }

        const endTime = getAssociatedEffectEnd(this)
        let seekTime = null

        if (this.currentTime === null) {
            if (this.playbackRate >= 0) {
                seekTime = 0
            } else if (endTime === Infinity) {
                error(errors.INVALID_STATE_PAUSE)
            } else {
                seekTime = endTime
            }
        }
        if (seekTime !== null) {
            this.#holdTime = seekTime
        }
        if (this.#pendingTask?.name === 'play') {
            this.#pendingTask = null
        } else {
            this.ready = createPromise()
        }

        const pause = readyTime => {
            if (this.#startTime !== null && this.#holdTime === null) {
                this.#holdTime = (readyTime - this.#startTime) * this.playbackRate
            }
            this.#startTime = null
            this.ready.resolve(this)
            this.#updateFinishedState()
        }

        this.#pendingTask = pause
        this.#update(undefined, false, false, true)
    }

    play = () => {

        const { currentTime } = this
        const endTime = getAssociatedEffectEnd(this)
        const abortedPause = this.#pendingTask?.name !== 'pause'
        let seekTime = null

        if (this.playbackRate > 0 && (currentTime === null || currentTime < 0 || currentTime >= endTime)) {
            seekTime = 0
        } else if (this.playbackRate < 0 && (currentTime === null || currentTime <= 0 || currentTime > endTime)) {
            if (endTime === Infinity) {
                error(errors.INVALID_STATE_PLAY)
            }
            seekTime = endTime
        }
        if (seekTime === null && this.#startTime !== null && currentTime !== null) {
            seekTime = 0
        }
        if (seekTime !== null) {
            this.#holdTime = seekTime
        }
        if (this.#holdTime !== null) {
            this.#startTime = null
        }
        if (this.#pendingTask) {
            this.#pendingTask = null
        } else {
            this.ready = createPromise()
        }
        if (this.#holdTime === null && seekTime === null && !abortedPause) {
            return
        }

        const play = readyTime => {
            if (this.#startTime === null && this.#holdTime === null) {
                throw Error('Assertion: start time or hold time shoud be resolved')
            }
            if (this.#holdTime === null) {
                const currentTime = (readyTime - this.#startTime) * this.playbackRate
                if (this.playbackRate === 0) {
                    this.#holdTime = currentTime
                    this.#startTime = readyTime
                } else {
                    this.#startTime = readyTime - (currentTime / this.playbackRate)
                }
            } else if (this.playbackRate === 0) {
                this.#startTime = readyTime
            } else {
                this.#startTime = readyTime - (this.#holdTime / this.playbackRate)
                this.#holdTime = null
            }
            this.ready.resolve(this)
            this.#updateFinishedState()
        }

        this.#pendingTask = play
        this.#update(undefined, false, false, true)
    }

    reverse = () => {
        if (!this.#timeline) {
            error(errors.INVALID_STATE_REVERSE)
        }
        this.playbackRate = -this.playbackRate
        try {
            this.play()
        } catch (e) {
            this.playbackRate = -this.playbackRate
            throw e
        }
    }

    #update = (timestamp, didSeek = false, sync = false, live = false) => {

        if (timestamp) {
            timeline.currentTime = timestamp
        }

        const pendingTask = this.#pendingTask
        if (this.#timeline && !live && pendingTask) {
            this.#pendingTask = null
            pendingTask(this.#timeline.currentTime)
        }

        if (this.#timeline || live) {
            this.#updateFinishedState(didSeek, sync)
            const { playState } = this
            if (playState === 'finished') {
                this.#effect?.apply(live)
                frame.cancel(this.#update)
            } else if (playState === 'running' || (playState === 'paused' && live)) {
                this.#effect?.apply(live)
                frame.request(this.#update)
            }
        }
    }

    #updateFinishedState(didSeek = false, sync = false) {

        let currentTime
        if (didSeek) {
            currentTime = this.currentTime
        } else {
            this.#useHoldTime = false
            currentTime = this.currentTime
            this.#useHoldTime = true
        }

        if (currentTime !== null && this.#startTime !== null && !this.#pendingTask) {

            const endTime = getAssociatedEffectEnd(this)

            if (this.playbackRate > 0 && currentTime >= endTime) {
                if (didSeek) {
                    this.#holdTime = currentTime
                } else if (this.#previousCurrentTime === null) {
                    this.#holdTime = endTime
                } else {
                    this.#holdTime = Math.max(this.#previousCurrentTime, endTime)
                }
            } else if (this.playbackRate < 0 && currentTime <= 0) {
                if (didSeek) {
                    this.#holdTime = currentTime
                } else if (this.#previousCurrentTime === null) {
                    this.#holdTime = 0
                } else {
                    this.#holdTime = Math.min(this.#previousCurrentTime, 0)
                }
            } else if (this.playbackRate !== 0) {
                if (didSeek && this.#holdTime !== null) {
                    this.#startTime = this.#timeline.currentTime - (this.#holdTime / this.playbackRate)
                }
                this.#holdTime = null
            }
        }

        this.#previousCurrentTime = this.currentTime

        const isFinished = this.playState === 'finished'
        const isResolved = this.finished.status === 'resolved'

        if (isFinished && !isResolved) {
            if (sync) {
                this.#finish.cancelled = true
                this.#finish()
            } else {
                Promise.resolve().then(() => {
                    if (!this.#finish.cancelled) {
                        this.#finish()
                    }
                })
            }
        } else if (!isFinished && isResolved) {
            this.finished = createPromise()
        }
    }

    #finish() {

        if (this.playState === 'finished') {
            this.finished.resolve(this)
            this.onfinish?.(this)
        }

        this.#finish.cancelled = false
    }
}

export default Animation


import animationFrame, { microtask } from './task'
import error, { errors } from './error'
import now from './now'

export const timeline = { currentTime: now(), phase: 'active' }

class Animation {

    playbackRate = 1

    #effect
    #holdTime = null
    #next = []
    #pendingTask = null
    #previousCurrentTime = null
    #startTime = null
    #silent
    #timeline
    #useHoldTime = true

    constructor(effect, t = timeline) {
        this.finished = this.#createPromise('finished')
        this.ready = this.#createPromise()
        this.#timeline = t
        this.#effect = effect
        effect.animation = this
    }

    get currentTime() {
        if (this.#holdTime !== null && this.#useHoldTime) {
            return this.#holdTime
        } else if (this.#startTime === null || !this.#timeline) {
            return null
        }
        return (this.#timeline.currentTime - this.#startTime) * this.playbackRate
    }

    set currentTime(seekTime) {
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
            microtask.cancel(this.#pendingTask)
            this.#pendingTask = null
            this.ready.resolve(this)
        }
        if (this.#effect) {
            this.#effect.apply()
        }
        this.#updateFinishedState(true)
    }

    get effect() {
        return this.#effect
    }

    set effect(newEffect) {
        if (this.#effect === newEffect) {
            return
        } else if (this.#pendingTask?.name === 'pause') {
            microtask.cancel(this.#pendingTask)
        }
        if (newEffect.animation) {
            newEffect.animation.effect = null
        }
        this.#effect = newEffect
        this.#effect.apply()
        this.#updateFinishedState()
    }

    get pending() {
        return Boolean(this.#pendingTask)
    }

    get playState() {
        const { currentTime } = this
        const { endTime = 0 } = this.#effect.getComputedTiming()
        if (currentTime === null && this.#startTime === null && !this.#pendingTask) {
            return 'idle'
        } else if (this.#pendingTask?.name === 'pause' || (this.#startTime === null && this.#pendingTask?.name !== 'play')) {
            return 'paused'
        } else if (currentTime !== null && ((this.playbackRate > 0 && currentTime >= endTime) || (this.playbackRate < 0 && currentTime <= 0))) {
            return 'finished'
        }
        return 'running'
    }

    get startTime() {
        return this.#startTime
    }

    set startTime(newStartTime) {
        const previousCurrentTime = this.#timeline ? this.currentTime : null
        this.#startTime = newStartTime
        if (this.#startTime === null) {
            this.#holdTime = previousCurrentTime
        } else if (this.playbackRate !== 0) {
            this.#holdTime = null
        }
        if (this.#pendingTask) {
            microtask.cancel(this.#pendingTask)
            this.#pendingTask = null
            this.ready.resolve(this)
        }
        if (this.#effect) {
            this.#effect.apply()
        }
        animationFrame.request(this.#update)
        this.#updateFinishedState(true)
    }

    get timeline() {
        return this.#timeline
    }

    set timeline(newTimeline) {
        if (this.#timeline === newTimeline) {
            return
        }
        this.#timeline = newTimeline
        if (this.#startTime !== null) {
            this.#holdTime = null
        }
        if (this.#effect) {
            this.#effect.apply()
        }
        animationFrame.request(this.#update)
        this.#updateFinishedState()
    }

    cancel = () => {
        if (this.playState !== 'idle') {
            if (this.#pendingTask) {
                microtask.cancel(this.#pendingTask)
                this.#pendingTask = null
                this.ready.reject('Abort')
                this.ready = this.#createPromise()
            }
            this.finished.reject('Abort')
            this.finished = this.#createPromise('finished')
            this.#effect.buffer.remove()
            animationFrame.cancel(this.#update)
        }
        this.#holdTime = null
        this.#startTime = null
    }

    finish = () => {

        const { endTime = 0 } = this.#effect.getComputedTiming()

        if (this.playbackRate === 0 || (this.playbackRate > 0 && endTime === Infinity)) {
            error(errors.INVALID_STATE_FINISH)
        }

        this.#silent = true
        const limit = this.currentTime = this.playbackRate > 0 ? endTime : 0
        this.#silent = false

        if (this.#startTime === null) {
            this.#startTime = this.#timeline.currentTime - (limit / this.playbackRate)
        }
        if (this.#pendingTask) {
            if (this.#pendingTask?.name === 'pause') {
                this.#holdTime = null
                microtask.cancel(this.#pendingTask)
            }
            this.#pendingTask = null
            this.ready.resolve(this)
        }
        if (this.#effect) {
            this.#effect.apply()
        }
        animationFrame.request(this.#update)
        this.#updateFinishedState(true, true)
    }

    pause = () => {

        if (this.#pendingTask?.name === 'pause' || this.playState === 'paused') {
            return
        }

        const { endTime = 0 } = this.#effect.getComputedTiming()
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
            this.#startTime = seekTime
        }
        if (this.#pendingTask?.name === 'play') {
            this.#pendingTask = null
        } else {
            this.ready = this.#createPromise()
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
        this.#updateFinishedState()
    }

    play = () => {

        const { currentTime } = this
        const { endTime = 0 } = this.#effect.getComputedTiming()
        let hasPendingReadyPromise = false
        let seekTime = null

        if (this.playbackRate > 0 && (currentTime === null || currentTime < 0 || currentTime >= endTime)) {
            seekTime = 0
        } else if (this.playbackRate < 0 && (currentTime === null || currentTime <= 0 || currentTime > endTime)) {
            if (endTime === Infinity) {
                error(errors.INVALID_STATE_PLAY)
            }
            seekTime = endTime
        } else if (this.playbackRate === 0 && currentTime === null) {
            seekTime = 0
        }
        if (seekTime !== null) {
            this.#holdTime = seekTime
        }
        if (this.#holdTime !== null) {
            this.#startTime = null
        }
        if (this.#pendingTask) {
            microtask.cancel(this.#pendingTask)
            hasPendingReadyPromise = true
        }
        if (this.#holdTime === null && this.#pendingTask?.name !== 'pause') {
            return
        }
        if (!hasPendingReadyPromise) {
            this.ready = this.#createPromise()
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
            this.ready.resolve()
            this.#updateFinishedState()
        }

        this.#pendingTask = play
        if (this.#effect) {
            this.#effect.apply()
        }
        animationFrame.request(this.#update)
        this.#updateFinishedState()
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

    next = fn => {
        this.#next.push(fn)
        return this
    }

    // eslint-disable-next-line space-before-function-paren, func-names
    #createPromise(name) {

        const resolver = {}
        const promise = new Promise((resolve, reject) => {
            resolver.resolve = () => {
                if (promise.status === 'pending') {
                    promise.status = 'resolved'
                    if (name === 'finished') {
                        this.#next.reduce((p, fn) => p.then(fn), Promise.resolve(this))
                    }
                    resolve(this)
                }
            }
            resolver.reject = error => {
                if (promise.status === 'pending') {
                    promise.status = 'rejected'
                    if (error !== 'Abort') {
                        reject(error)
                    }
                }
            }
        })

        promise.status = 'pending'
        promise.resolve = resolver.resolve
        promise.reject = resolver.reject

        return promise
    }

    #update = timestamp => {

        delete this.#update.id
        timeline.currentTime = timestamp
        const { activeTime, phase } = this.#effect.getComputedTiming()

        if (this.#timeline
            && ((this.playState !== 'finished' && phase === 'active')
                || (this.playbackRate > 0 && phase === 'before')
                || (this.playbackRate < 0 && phase === 'after')
                || (activeTime !== null))) {


            if (this.#effect) {
                this.#effect.apply()
            }
            this.#updateFinishedState()

            if (this.#pendingTask) {
                this.#pendingTask(this.#timeline.currentTime)
                this.#pendingTask = null
            }

            animationFrame.request(this.#update)
        }
    }

    // eslint-disable-next-line space-before-function-paren, func-names
    #updateFinishedState(didSeek = false, sync = false) {

        let currentTime
        if (didSeek) {
            currentTime = this.currentTime // eslint-disable-line prefer-destructuring
        } else {
            this.#useHoldTime = false
            currentTime = this.currentTime // eslint-disable-line prefer-destructuring
            this.#useHoldTime = true
        }

        if (currentTime !== null && this.#startTime !== null && !this.#pendingTask) {

            const { endTime = 0 } = this.#effect.getComputedTiming()

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

            const { fill } = this.#effect.getComputedTiming()
            const finish = () => {
                if (this.playState === 'finished') {
                    if (fill === 'none' || fill === 'backwards') {
                        this.#effect.buffer.remove()
                    }
                    animationFrame.cancel(this.#update)
                    this.finished.resolve(this)
                }
            }

            if (sync) {
                microtask.cancel(finish)
                finish()
            } else if (!finish.id) {
                microtask.request(finish)
            }
        } else if (!isFinished && isResolved) {
            this.finished = this.#createPromise('finished')
        }
    }
}

export default Animation
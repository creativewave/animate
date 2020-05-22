
import createBuffer, { setStyle } from './buffer'
import error, { errors } from './error'
import task, { microtask } from './task'
import getTimingValues from './timing'
import { interpolateNumber } from './interpolate'
import now from './now'
import parseKeyframes from './keyframe'
import parseOptions from './options'

/**
 * animate :: Element -> [Keyframe]|Keyframes -> Options|Number -> Animation
 *
 * Keyframe => {
 *   [Property]: a|PropertyController,
 *   easing?: String|Function,
 *   offset?: Number|String,
 * }
 * Keyframes => {
 *   [Property]: [a|PropertyController]|a|PropertyController,
 *   easing?: [String|Function]|String|Function,
 *   offset?: [Number|String]|Number|String,
 * }
 * Property => String|Number|Symbol
 * PropertyController => {
 *   interpolate?: (From -> To -> Number) -> a,          // Default: `interpolateNumber`
 *   set?: (Element -> { [Property]: [Value] }) -> void, // Default: `setStyle()`
 *   value: a,
 * }
 * From => To => Value => a
 * Options => {
 *   duration?: Number,        // Default: 0
 *   delay?: Number,           // Default: 0
 *   direction?: String,       // Default: 'normal'
 *   easing?: String|Function, // Default: 'linear'
 *   endDelay?: Number,        // Default: 0
 *   fill?: String,            // Default: 'auto'
 *   id?: a,                   // Default: `Animation#1`
 *   iterations?: Number,      // Default: 1
 *   iterationStart?: Number,  // Default: 0
 * }
 *
 * Memo: a collection of `Keyframe`s will always result in a `ComputedKeyframes`
 * whose `offset`, `easing`, and each `Property` have the same length, but a
 * `Keyframes` record can result in a `ComputedKeyframes` which has a `Property`
 * containing fewer values than `offset` and/or `easing`, meaning that indexes
 * of current start/end `offset`s can't be used directly to pick `easing` and
 * `Property` values.
 *
 * Memo: the `easing` of the current interval of `Property` values should always
 * be picked based on the start `offset`, even when `playbackRate` is negative,
 * therefore `easing` will always be ignored in last `Keyframe`.
 *
 * Memo: reading/writing an element removed from the DOM in a callback given to
 * `requestAnimationFrame()` will not throw an error, but `Animation.cancel()`
 * should still be used in order to prevent future update requests.
 */
const animate = (element, rawKeyframes, rawOptions = 0) => {

    const buffer = createBuffer(element)
    const keyframes = parseKeyframes(rawKeyframes)
    const options = parseOptions(typeof rawOptions === 'number' ? { duration: rawOptions } : rawOptions)
    const activeDuration = options.duration * options.iterations
    const endTime = Math.max(options.delay + activeDuration + options.endDelay, 0)
    const next = []
    const resolver = {}

    const ready = (task, readyTime) => {
        if (task === 'play') {
            // Ref.: Playing an animation
            if (startTime === null && holdTime === null) {
                throw Error('Either startTime or holdTime should be resolved.')
            }
            if (holdTime !== null) {
                if (playbackRate === 0) {
                    startTime = readyTime
                } else {
                    startTime = readyTime - (holdTime / playbackRate)
                    holdTime = null
                }
            } else if (startTime !== null) {
                holdTime = (readyTime - startTime) * playbackRate
                if (playbackRate === 0) {
                    startTime = readyTime
                } else {
                    startTime = readyTime - (readyTime - startTime)
                }
            }
        } else {
            // Ref.: Pausing an animation
            if (startTime !== null && holdTime === null) {
                holdTime = (readyTime - startTime) * playbackRate
            }
            startTime = null
        }
    }
    const update = (didSeek = false, sync = false, taskName = null) => {

        // Ref.: Playing an animation, Pausing an animation
        if (taskName) {
            pendingTask = taskName
        }

        const currentTime = (didSeek || holdTime === null)
            ? animation.currentTime
            : holdTime
        if (currentTime !== null && startTime !== null && !pendingTask) {
            if (playbackRate > 0 && currentTime >= endTime) {
                if (didSeek) {
                    holdTime = currentTime
                } else if (previousCurrentTime === null) {
                    holdTime = endTime
                } else {
                    holdTime = Math.max(previousCurrentTime, endTime)
                }
            } else if (playbackRate < 0 && currentTime <= 0) {
                if (didSeek) {
                    holdTime = currentTime
                } else if (previousCurrentTime === null) {
                    holdTime = 0
                } else {
                    holdTime = Math.min(previousCurrentTime, 0)
                }
            } else if (playbackRate !== 0) {
                if (didSeek && holdTime !== null) {
                    timelineTime === null && console.log('!!! bug here')
                    startTime = timelineTime - (holdTime / playbackRate)
                }
                holdTime = null
            }
        }
        previousCurrentTime = animation.currentTime

        apply(currentTime)

        const currentFinishedState = animation.playState === 'finished'
        if (currentFinishedState && !finished.isResolved) {
            // Round currentTime to 0 or endTime
            if (timelineTime !== null) {
                if (playbackRate > 0) {
                    timelineTime -= currentTime - endTime
                } else {
                    timelineTime += currentTime
                }
            }
            if (sync) {
                if (finishedTaskId) {
                    microtask.cancel(finishedTaskId)
                }
                resolver.resolve()
            } else {
                finishedTaskId = microtask.request(() => {
                    if (animation.playState === 'finished') {
                        resolver.resolve()
                    }
                })
            }
        }
        if (!currentFinishedState && finished.isResolved) {
            finished = createFinishedPromise()
        }
        if (animation.playState === 'running') {
            // Ref.: Introduction, Timelines
            taskId = task.request(timestamp => {
                if (!timing.isRelevant) {
                    return
                }
                // Ref.: Setting the timeline of an animation
                if (timelineTime === null && startTime !== null) {
                    holdTime = null
                }
                // Ref.: Animations, Playing an animation, Pausing an animation
                if (pendingTask) {
                    ready(pendingTask, timestamp)
                    pendingTask = null
                }
                timelineTime = timestamp
                update()
            })
        }
    }
    const apply = currentTime => {

        timing = getTimingValues({
            activeDuration,
            endTime,
            localTime: currentTime,
            playState: animation.playState,
            playbackRate,
        }, options)

        const iterationProgress = timing.transformedProgress
        const intervalEndpoints = []

        if (iterationProgress === null || keyframes.length === 0) {
            return
        }
        if (iterationProgress < 0 && keyframes.filter(k => k.offset === 0).length > 1) {
            intervalEndpoints.push(keyframes[0])
        } else if (iterationProgress >= 1 && keyframes.filter(k => k.offset === 1).length > 1) {
            intervalEndpoints.push(keyframes[keyframes.length - 1])
        } else {
            let fromIndex = keyframes.findIndex(k => k.offset <= iterationProgress && k.offset < 1)
            if (fromIndex === -1) {
                fromIndex = keyframes.findIndex(k => k.offset === 0)
            }
            intervalEndpoints.push(keyframes[fromIndex], keyframes[fromIndex + 1])
        }

        const [{ easing, offset: startOffset, ...props }] = intervalEndpoints
        const endOffset = intervalEndpoints[intervalEndpoints.length - 1].offset
        const intervalDistance = (iterationProgress - startOffset) / (endOffset - startOffset)
        const transformedDistance = easing(intervalDistance)

        Object.entries(props).forEach(([prop, value]) => {
            const { set = setStyle, value: from, interpolate = interpolateNumber } =
                typeof value === 'object' ? value : { value }
            const { value: to } = typeof intervalEndpoints[1][prop] === 'object'
                ? intervalEndpoints[1][prop]
                : { value: intervalEndpoints[1][prop] }
            set(buffer, prop, interpolate(from, to, transformedDistance))
        })
        buffer.flush()
    }
    const createFinishedPromise = () => {
        const promise = new Promise((resolve, reject) => {
            resolver.resolve = resolve
            resolver.reject = reject
        })
            .then(() => {
                promise.isResolved = true
                next.forEach(fn => fn(animation))
            })
            .catch(error => {
                if (error === 'idle') {
                    return
                }
                throw error
            })
        promise.isResolved = false
        return promise
    }
    const cancelTask = () => {
        pendingTask = null
        task.cancel(taskId)
    }

    let holdTime = null
    let finished = createFinishedPromise()
    let finishedTaskId = null
    let pendingTask = null
    let playbackRate = options.direction === 'reverse' ? -1 : 1
    let previousCurrentTime = null
    let silent = false
    let startTime = null
    let taskId = null
    let timelineTime = null
    let timing = {}

    const animation = {

        get currentTime() {
            if (holdTime !== null) {
                return holdTime
            } else if (startTime === null) {
                return null
            }
            const cT = (timelineTime - startTime) * playbackRate
            // Return 0 instead of -0 when playbackRate is negative (-0 === 0)
            return cT === 0 ? 0 : cT
        },
        set currentTime(seekTime) {
            if (seekTime === null) {
                if (animation.currentTime !== null) {
                    error(errors.CURRENT_TIME_UNRESOLVED)
                }
                return
            }
            if (holdTime !== null || startTime === null || playbackRate === 0) {
                holdTime = seekTime
            } else {
                startTime = timelineTime - (seekTime / playbackRate)
            }
            previousCurrentTime = null
            if (silent) {
                return
            }
            if (pendingTask === 'pause') {
                holdTime = seekTime
                startTime = null
                cancelTask()
            }
            update(true)
        },
        get finished() {
            return finished
        },
        get id() {
            return options.id
        },
        set id(s) {
            options.id = s
        },
        get pending() {
            return Boolean(pendingTask)
        },
        get playState() {
            const { currentTime } = animation
            if (currentTime === null && !pendingTask) {
                return 'idle'
            } else if (pendingTask === 'pause' || (startTime === null && pendingTask !== 'play')) {
                return 'paused'
            } else if (currentTime !== null && ((playbackRate > 0 && currentTime >= endTime) || (playbackRate < 0 && currentTime <= 0))) {
                return 'finished'
            }
            return 'running'
        },
        get playbackRate() {
            return playbackRate
        },
        set playbackRate(n) {
            playbackRate = n
        },
        get startTime() {
            return startTime
        },
        set startTime(newStartTime) {
            if (newStartTime !== null) {
                holdTime = null
            }
            previousCurrentTime = animation.currentTime
            startTime = newStartTime
            if (newStartTime !== null) {
                if (playbackRate !== 0) {
                    holdTime = null
                }
            } else if (previousCurrentTime === null) {
                holdTime = previousCurrentTime
            }
            if (pendingTask) {
                cancelTask()
            }
            update(true)
        },
        // eslint-disable-next-line sort-keys
        cancel: () => {
            if (animation.playState !== 'idle') {
                // Ref.: Setting the target effect of an animation
                if (pendingTask) {
                    cancelTask()
                }
                resolver.reject('idle')
                finished = createFinishedPromise()
                buffer.remove()
            }
            holdTime = null
            startTime = null
        },
        finish: () => {
            if (playbackRate === 0 || (playbackRate > 0 && endTime === Infinity)) {
                return error(errors.INVALID_STATE_FINISH)
            }
            silent = true
            const currentTime = animation.currentTime = playbackRate > 0 ? endTime : 0
            silent = false
            /**
             * Note: this is the only moment where startTime could be set and
             * conform to the following behavior:
             *
             * a = el.animate(...)
             * a.startTime === null // true
             * a.finish()
             * a.startTime === null // false
             */
            if (startTime === null) {
                startTime = (timelineTime || now()) - (currentTime / playbackRate)
            }
            if (pendingTask && startTime !== null) {
                if (pendingTask === 'pause') {
                    holdTime = null
                }
                cancelTask()
            }
            update(true, true)
        },
        pause() {
            if (pendingTask === 'paused' || animation.playState === 'paused') {
                return
            }
            if (animation.currentTime === null) {
                if (playbackRate >= 0) {
                    holdTime = 0
                } else if (endTime === Infinity) {
                    return error(errors.INVALID_STATE_PAUSE)
                } else {
                    holdTime = endTime
                }
            }
            if (pendingTask === 'play') {
                cancelTask()
            }
            update(false, false, 'pause')
        },
        play() {

            const abortedPause = pendingTask === 'pause'
            const { currentTime } = animation

            if (playbackRate > 0 && (currentTime === null || currentTime < 0 || currentTime >= endTime)) {
                holdTime = 0
            } else if (playbackRate < 0 && (currentTime === null || currentTime <= 0 || currentTime > endTime)) {
                if (endTime === Infinity) {
                    return error(errors.INVALID_STATE_PLAY)
                }
                holdTime = endTime
            } else if (playbackRate === 0 && currentTime === null) {
                holdTime = 0
            }
            if (pendingTask) {
                cancelTask()
            }
            if (holdTime === null) {
                if (!abortedPause) {
                    return
                }
            } else {
                startTime = null
            }

            update(false, false, 'play')
        },
        reverse() {
            playbackRate = -playbackRate
            try {
                animation.play()
            } catch (e) {
                playbackRate = -playbackRate
                throw e
            }
        },
        then(fn) {
            next.push(fn)
            return animation
        },
    }
    animation.play()
    return animation
}

export default animate

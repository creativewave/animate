
import * as buffer from './buffer'
import { error, errors } from './error'
import { isFiniteNumber, isPositiveNumber, round } from './utils'
import parseKeyframes, { getComputedKeyframes }  from './keyframe'
import { parseEasing } from './easing'

const directions = ['normal', 'reverse', 'alternate', 'alternate-reverse']
const fillModes = ['none', 'forwards', 'backwards', 'both', 'auto']

export class AnimationEffect {

    #prevComputedTiming = {}
    #prevLocalTime
    #prevPlaybackRate
    #prevTiming
    #timing = {
        delay: 0,
        direction: 'normal',
        duration: 'auto',
        easing: 'linear',
        endDelay: 0,
        fill: 'auto',
        iterationStart: 0,
        iterations: 1,
    }

    constructor(options) {
        this.updateTiming(typeof options === 'number' ? { duration: options } : options)
    }

    /**
     * getTiming :: void -> EffectTiming
     *
     * EffectTiming => {
     *   delay: Number,
     *   direction: String,
     *   duration: Number|String,
     *   easing: String|Function,
     *   endDelay: Number,
     *   fill: String,
     *   iterationStart: Number,
     * }
     */
    getTiming() {
        return this.#timing
    }

    /**
     * updateTiming :: OptionalEffectTiming -> void
     *
     * OptionalEffectTiming => {
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
     */
    updateTiming({
        delay = this.#timing.delay,
        direction = this.#timing.direction,
        duration = this.#timing.duration,
        easing = this.#timing.easing,
        endDelay = this.#timing.endDelay,
        fill = this.#timing.fill,
        iterationStart = this.#timing.iterationStart,
        iterations = this.#timing.iterations,
    } = {}) {

        if (delay !== 'undefined' && !isFiniteNumber(delay)) {
            error(errors.OPTION_DELAY)
        } else if (direction && !directions.includes(direction)) {
            error(errors.OPTION_DIRECTION)
        } else if (duration !== 'undefined' && duration !== 'auto' && !isPositiveNumber(duration)) {
            error(errors.OPTION_DURATION)
        } else if (endDelay !== 'undefined' && !isFiniteNumber(endDelay)) {
            error(errors.OPTION_DELAY)
        } else if (fill && !fillModes.includes(fill)) {
            error(errors.OPTION_FILL)
        } else if ((iterationStart !== 'undefined' && !isFiniteNumber(iterationStart)) || iterationStart < 0) {
            error(errors.OPTION_ITERATION_START)
        } else if (iterations !== 'undefined' && !isPositiveNumber(iterations)) {
            error(errors.OPTION_ITERATIONS)
        }

        this.#timing = {
            delay,
            direction,
            duration,
            easing: parseEasing(easing),
            endDelay,
            fill,
            iterationStart,
            iterations,
        }

        if (this.animation) {
            this.apply()
        }
    }

    /**
     * getComputedTiming :: void -> ComputedEffectTiming
     *
     * ComputedEffectTiming => {
     *   activeDuration: Number,
     *   currentIteration?: Number,
     *   delay: Number,
     *   direction: String,
     *   duration: Number,
     *   easing: String|Function,
     *   endDelay: Number,
     *   endTime: Number,
     *   fill: String,
     *   iterationStart: Number,
     *   localTime?: Number,
     *   progress?: Number,
     * }
     *
     * Memo (1): memoizing `progress` prevents applying same effect twice, eg.
     * at the first frame, when `playbackRate === 0`, etc...
     *
     * Memo (2): `phase` is not part of `ComputedEffectTiming` but required to
     * check if animation is relevant.
     *
     * Memo (3): `currentDirection` is not part of `ComputedEffectTiming` but
     * required by `MotionPathEffect`.
     */
    getComputedTiming() {

        const { currentTime: localTime, playbackRate } = this.animation ?? { currentTime: null }

        // Memoization
        if (this.#prevLocalTime === localTime
            && this.#prevPlaybackRate === playbackRate
            && this.#prevTiming === this.#timing) {
            return this.#prevComputedTiming
        }
        this.#prevLocalTime = localTime
        this.#prevPlaybackRate = playbackRate
        this.#prevTiming = this.#timing

        const {
            delay,
            direction,
            duration: iterationDuration,
            easing,
            endDelay,
            fill: fillMode,
            iterationStart,
            iterations,
        } = this.#timing

        const fill = fillMode === 'auto' ? 'none' : fillMode
        const duration = iterationDuration === 'auto' ? 0 : iterationDuration
        const activeDuration = (duration && iterations) ? duration * iterations : 0
        const endTime = Math.max(delay + activeDuration + endDelay, 0)

        let phase = 'idle'
        let currentDirection = null
        let currentIteration = null
        let progress = null

        if (localTime === null) {
            return this.#prevComputedTiming = {
                activeDuration,
                currentDirection, // (3)
                currentIteration,
                delay,
                direction,
                duration,
                easing,
                endDelay,
                endTime,
                fill,
                iterationStart,
                iterations,
                localTime,
                phase, // (2)
                progress,
            }
        }

        const animationDirection = playbackRate < 0 ? 'backwards' : 'forwards'
        const activeAfter = Math.max(Math.min(delay + activeDuration, endTime), 0)
        const beforeActive = Math.max(Math.min(delay, endTime), 0)

        let activeTime = null

        if (localTime < beforeActive || (animationDirection === 'backwards' && localTime === beforeActive)) {
            activeTime = (fill === 'backwards' || fill === 'both') ? Math.max(localTime - delay, 0) : null
            phase = 'before'
        } else if (localTime > activeAfter || (animationDirection === 'forwards' && localTime === activeAfter)) {
            activeTime = (fill === 'forwards' || fill === 'both') ? Math.max(Math.min(localTime - delay, activeDuration), 0) : null
            phase = 'after'
        } else {
            activeTime = localTime - delay
            phase = 'active'
        }

        if (activeTime !== null) {

            let overallProgress = null
            if (duration === 0) {
                overallProgress = phase === 'before' ? (0 + iterationStart) : (iterations + iterationStart)
            } else {
                overallProgress = (activeTime / duration) + iterationStart
            }

            let iterationProgress = overallProgress === Infinity ? (iterationStart % 1) : (overallProgress % 1)
            if (iterationProgress === 0
                && (phase === 'active' || phase === 'after')
                && activeTime === activeDuration
                && iterations !== 0) {
                iterationProgress = 1
            }

            if (phase === 'after' && iterations === Infinity) {
                currentIteration = Infinity
            } else if (iterationProgress === 1) {
                currentIteration = Math.floor(overallProgress) - 1
            } else {
                currentIteration = Math.floor(overallProgress)
            }

            if (direction === 'normal') {
                currentDirection = 'forwards'
            } else if (direction === 'reverse') {
                currentDirection = 'reverse'
            } else {
                const d = direction === 'alternate-reverse' ? (currentIteration + 1) : currentIteration
                currentDirection = (d % 2 && d !== Infinity) ? 'reverse' : 'forwards'
            }

            const directedProgress = currentDirection === 'forwards' ? iterationProgress : (1 - iterationProgress)
            progress = easing(
                directedProgress,
                (phase === 'before' && animationDirection === 'forwards')
                || (phase === 'after' && animationDirection === 'reverse'))
        }

        return this.#prevComputedTiming = {
            activeDuration,
            currentDirection, // (3)
            currentIteration,
            delay,
            direction,
            duration,
            easing,
            endDelay,
            endTime,
            fill,
            iterationStart,
            iterations,
            localTime,
            phase, // (2)
            progress: progress === this.#prevComputedTiming.progress ? null : progress, // (1)
        }
    }
}

export class KeyframeEffect extends AnimationEffect {

    #buffer
    #computedKeyframes = null
    #keyframes = []
    #target
    #targetProperties = new Map()

    /**
     * constructor :: (Element -> [Keyframe]|Keyframes -> OptionalEffectTiming|Number) -> KeyframeEffect
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
     */
    constructor(target, keyframes, options) {
        super(options)
        this.target = target
        this.setKeyframes(keyframes)
    }

    get target() {
        return this.#target
    }

    set target(newTarget) {

        this.#buffer?.remove()

        if (newTarget) {
            this.#buffer = buffer.create(newTarget, this.#targetProperties)
        }

        this.#target = newTarget
    }

    /**
     * getKeyframes :: void -> [ProcessedKeyframe]
     *
     * ProcessedKeyframe :: {
     *   [Property]: a|PropertyController,
     *   easing: Function,
     *   offset: Number,
     * }
     */
    getKeyframes() {
        return this.#keyframes
    }

    /**
     * setKeyframes :: [Keyframe]|Keyframes|void -> void
     */
    setKeyframes(newKeyframes) {
        this.#keyframes = parseKeyframes(newKeyframes, this.#targetProperties)
        this.#buffer?.setInitial(this.#targetProperties)
    }

    /**
     * Memo: partial keyframes will not be computed at each frame, as defined in
     * the specification, because `getComputedStyle()` will always return the
     * previous effect value instead of the computed value without any effect
     * applied, but instead they will be computed when missing and removed when
     * each time the associated animation becomes idle.
     *
     * Related: https://drafts.csswg.org/web-animations-1/#the-effect-value-of-a-keyframe-animation-effect
     */
    apply(sync = true) {

        if (!this.#target || this.#targetProperties.size === 0) {
            return
        }

        const { progress: iterationProgress } = this.getComputedTiming()

        if (iterationProgress === null) {
            return
        }

        if (this.#computedKeyframes === null) {
            this.#computedKeyframes = getComputedKeyframes(this.#keyframes, this.#buffer, this.#targetProperties)
        }

        for (const propertyName of this.#targetProperties.keys()) {

            const keyframes = this.#computedKeyframes.filter(keyframe => keyframe[propertyName])
            const intervalEndpoints = []

            if (iterationProgress < 0 && keyframes.filter(k => k.computedOffset === 0).length > 1) {
                intervalEndpoints.push(keyframes[0])
            } else if (iterationProgress >= 1 && keyframes.filter(k => k.computedOffset === 1).length > 1) {
                intervalEndpoints.push(keyframes[keyframes.length - 1])
            } else {
                let fromIndex = keyframes.reduce(
                    (fromIndex, { computedOffset }, index) =>
                        (computedOffset <= iterationProgress && computedOffset < 1) ? index : fromIndex,
                    null)
                if (fromIndex === null) {
                    fromIndex = keyframes.reduce(
                        (fromIndex, { computedOffset }, index) => computedOffset === 0 ? index : fromIndex,
                        null)
                }
                intervalEndpoints.push(keyframes[fromIndex], keyframes[fromIndex + 1])
            }

            const [{ easing, computedOffset: start, ...from }, { computedOffset: end, ...to }] = intervalEndpoints
            const { interpolate, set, value: fromValue } = from[propertyName]
            const { value: toValue } = to[propertyName]
            const transformedDistance = easing((iterationProgress - start) / (end - start))

            set(this.#buffer, propertyName, interpolate(fromValue, toValue, transformedDistance))
        }

        if (sync) {
            this.#buffer.flush()
        }
    }

    remove() {
        this.#buffer.restore()
        this.#computedKeyframes = null
    }
}

export class MotionPathEffect extends AnimationEffect {

    #anchor
    #buffer
    #path
    #pathTotalLength
    #target

    constructor(target, path, options) {
        super(options)
        this.target = target
        this.path = path
        this.anchor = options.anchor ?? 'auto'
        this.rotate = options.rotate
    }

    get anchor() {
        return this.#anchor
    }

    set anchor(newAnchor) {

        if (newAnchor === 'auto') {
            newAnchor = [0, 0]
        } else if (!Array.isArray(newAnchor) || !isFiniteNumber(newAnchor[0]) || !isFiniteNumber(newAnchor[1])) {
            error(errors.OPTION_ANCHOR)
        }

        const [anchorX, anchorY] = newAnchor
        const { height, width, x, y } = this.#target.getBBox()

        this.#anchor = [x + (width / 2) - anchorX, y + (height / 2) - anchorY]
    }

    get path() {
        return this.#path
    }

    set path(newPath) {
        if (newPath instanceof SVGGeometryElement) {
            this.#path = newPath
            this.#pathTotalLength = newPath.getTotalLength()
        } else if (newPath) {
            error(errors.MOTION_PATH_TYPE)
        }
    }

    get target() {
        return this.#target
    }

    set target(newTarget) {

        this.#buffer?.remove()

        if (newTarget) {

            const { transformBox, transformOrigin } = newTarget.style
            const initial = {
                attributes: { transform: newTarget.getAttribute('transform') },
                styles: { transformBox, transformOrigin },
            }

            this.#buffer = buffer.create(newTarget, initial)
            this.#buffer.setStyle('transform-box', 'fill-box')
            this.#buffer.setStyle('transform-origin', 'center')
        }

        this.#target = newTarget
    }

    apply(sync = true) {

        if (!(this.#target && this.#path)) {
            return
        }

        const { currentDirection, progress: iterationProgress } = this.getComputedTiming()

        if (iterationProgress === null) {
            return
        }

        const currentLength = iterationProgress * this.#pathTotalLength
        const { x, y } = this.#path.getPointAtLength(currentLength)
        const [anchorX, anchorY] = this.#anchor

        let transform = `translate(${round(x - anchorX)} ${round(y - anchorY)})`

        if (this.rotate) {

            const { x: x0, y: y0 } = this.#path.getPointAtLength(
                currentDirection === 'forwards'
                    ? (currentLength - 1)
                    : (currentLength + 1))

            transform += ` rotate(${round(Math.atan2(y - y0, x - x0) * 180 / Math.PI)})`
        }

        this.#buffer.setAttribute('transform', transform)
        if (sync) {
            this.#buffer.flush()
        }
    }

    remove() {
        this.#buffer.restore()
    }
}

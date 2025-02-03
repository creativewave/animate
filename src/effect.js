
import * as buffer from './buffer.js'
import { addEffect, getAnimation, updateAnimation } from './registry.js'
import { error, errors } from './error.js'
import { isFiniteNumber, isPositiveNumber, round } from './utils.js'
import parseKeyframes, { getComputedKeyframes }  from './keyframe.js'
import { parseEasing } from './easing.js'

const directions = ['normal', 'reverse', 'alternate', 'alternate-reverse']
const fillModes = ['none', 'forwards', 'backwards', 'both', 'auto']

/**
 * https://drafts.csswg.org/web-animations-1/#animationeffect
 */
export class AnimationEffect {

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

        updateAnimation(this)
    }

    /**
     * getComputedTiming :: void -> ComputedEffectTiming
     *
     * ComputedEffectTiming => {
     *   activeDuration: Number,
     *   currentDirection?: String,
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
     * It deviates from the specification by returning the current direction,
     * which is required by MotionPathEffect.
     */
    getComputedTiming() {

        const { currentTime: localTime, playbackRate } = getAnimation(this) ?? { currentTime: null }
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

        let currentDirection = null
        let currentIteration = null
        let progress = null

        if (localTime === null) {
            return {
                activeDuration,
                currentDirection,
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
                progress,
            }
        }

        const animationDirection = playbackRate < 0 ? 'backwards' : 'forwards'
        const activeAfter = Math.max(Math.min(delay + activeDuration, endTime), 0)
        const beforeActive = Math.max(Math.min(delay, endTime), 0)

        let activeTime = null
        let phase = 'idle'

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

        return {
            activeDuration,
            currentDirection,
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
            progress,
        }
    }
}

/**
 * https://drafts.csswg.org/web-animations-1/#keyframeeffect
 */
export class KeyframeEffect extends AnimationEffect {

    #buffer
    #computedKeyframes = null
    #keyframes = []
    #target
    #targetProperties = new Map

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
        addEffect(this, this.#apply.bind(this), this.#remove.bind(this))
        this.target = target
        this.setKeyframes(keyframes)
    }

    get target() {
        return this.#target
    }

    set target(newTarget = null) {
        this.#buffer?.remove(this)
        if (newTarget) {
            this.#buffer = buffer.create(newTarget, this, this.#targetProperties)
        }
        this.#target = newTarget
        this.#apply(true)
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
        this.#remove()
        this.#targetProperties.clear()
        this.#keyframes = parseKeyframes(newKeyframes, this.#targetProperties)
        this.#buffer?.setInitial(this, this.#targetProperties)
        this.#apply(true)
    }

    /**
     * Memo: partial keyframes are computed each time the associated animation
     * becomes idle instead of at each frame as specified, because there is no
     * interface to retrieve the base value (the computed value in the absence
     * of animations).
     *
     * Memo: progress is < 0 or > 1 only when offsets are < 0 or > 1, which is
     * not possible at the moment (as noted in the specification).
     *
     * https://drafts.csswg.org/web-animations-1/#the-effect-value-of-a-keyframe-animation-effect
     */
    #apply(live) {

        if (!this.#target || this.#targetProperties.size === 0) {
            return
        }

        const { progress } = this.getComputedTiming()

        if (progress === null) {
            this.#remove()
            return
        }

        if (this.#computedKeyframes === null) {
            this.#computedKeyframes = getComputedKeyframes(this.#keyframes, this.#buffer, this.#targetProperties)
        }

        for (const name of this.#targetProperties.keys()) {

            const keyframes = this.#computedKeyframes.filter(keyframe => keyframe[name])
            const endpoints = []

            if (progress < 0 && keyframes.filter(k => k.computedOffset === 0).length > 1) {
                endpoints.push(keyframes[0])
            } else if (progress >= 1 && keyframes.filter(k => k.computedOffset === 1).length > 1) {
                endpoints.push(keyframes.at(-1))
            } else {
                const fromIndex =
                    keyframes.findLastIndex(({ computedOffset }) =>
                        computedOffset <= progress && computedOffset < 1)
                    ?? keyframes.findLastIndex(keyframe => keyframe.computedOffset === 0)
                endpoints.push(keyframes[fromIndex], keyframes[fromIndex + 1])
            }

            const [from, to] = endpoints

            if (to) {
                const { easing, computedOffset: y0, [name]: { interpolate, set, value: x0 } } = from
                const { computedOffset: y1, [name]: { value: x1 } } = to
                const distance = easing((progress - y0) / (y1 - y0))
                set(this.#buffer, name, interpolate(x0, x1, distance))
            } else {
                const { [name]: { value: x0 } } = from
                set(this.#buffer, name, x0)
            }
        }

        if (live) {
            this.#buffer.flush()
        }
    }

    #remove() {
        this.#buffer?.restore(this)
        this.#computedKeyframes = null
    }
}

export class MotionPathEffect extends AnimationEffect {

    #anchor
    #buffer
    #path
    #pathTotalLength
    #state = 'idle'
    #target
    #targetProperties = new Map

    constructor(target, path, options) {
        super(options)
        addEffect(this, this.#apply.bind(this), this.#remove.bind(this))
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
        this.#apply(true)
    }

    get path() {
        return this.#path
    }

    set path(newPath) {
        if (newPath instanceof SVGGeometryElement) {
            this.#path = newPath
            this.#pathTotalLength = newPath.getTotalLength()
            this.#apply(true)
        } else if (newPath) {
            error(errors.MOTION_PATH_TYPE)
        }
    }

    get target() {
        return this.#target
    }

    set target(newTarget = null) {
        this.#buffer?.remove(this)
        if (newTarget) {
            this.#targetProperties.set('transform', { set: buffer.setAttribute })
            this.#targetProperties.set('transform-box', { set: buffer.setStyle })
            this.#targetProperties.set('transform-origin', { set: buffer.setStyle })
            this.#buffer = buffer.create(newTarget, this, this.#targetProperties)
        }
        this.#target = newTarget
        this.#apply(true)
    }

    #apply(live) {

        if (!(this.#target && this.#path)) {
            return
        }

        const { currentDirection, progress } = this.getComputedTiming()

        if (progress === null) {
            this.#remove()
            return
        }

        if (this.#state === 'idle') {
            this.#state = 'running'
            this.#buffer.setStyle('transform-box', 'fill-box')
            this.#buffer.setStyle('transform-origin', 'center')
        }

        const currentLength = progress * this.#pathTotalLength
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
        if (live) {
            this.#buffer.flush()
        }
    }

    #remove() {
        this.#buffer?.restore(this)
        this.#state = 'idle'
    }
}

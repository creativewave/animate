
import createBuffer, { setStyle } from './buffer'
import error, { errors } from './error'
import { interpolateNumber, parseEasing } from './interpolate'
import parseKeyframes from './keyframe'

const isDouble = n => !isNaN(n) && Number.isFinite(n)
const fillModes = ['none', 'forwards', 'backwards', 'both', 'auto']
const directions = ['normal', 'reverse', 'alternate', 'alternate-reverse']

class AnimationEffect {

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
    #prevTiming
    #prevLocalTime
    #prevComputedTiming

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

        if (delay !== 'undefined' && !isDouble(delay)) {
            error(errors.OPTION_DELAY)
        } else if (direction && !directions.includes(direction)) {
            error(errors.OPTION_DIRECTION)
        } else if ((duration !== 'undefined' && duration !== 'auto' && isNaN(duration)) || duration < 0) {
            error(errors.OPTION_DURATION)
        } else if (endDelay !== 'undefined' && !isDouble(endDelay)) {
            error(errors.OPTION_DELAY)
        } else if (fill && !fillModes.includes(fill)) {
            error(errors.OPTION_FILL)
        } else if ((iterationStart !== 'undefined' && !isDouble(iterationStart)) || iterationStart < 0) {
            error(errors.OPTION_ITERATION_START)
        } else if ((iterations !== 'undefined' && isNaN(iterations)) || iterations < 0) {
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
     */
    getComputedTiming() {

        const { currentTime: localTime, playbackRate } = this.animation ?? { currentTime: null }

        // Memoization
        if (this.#prevLocalTime === localTime && this.#prevTiming === this.#timing) {
            return this.#prevComputedTiming
        }
        this.#prevLocalTime = localTime
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

        if (localTime === null) {
            return this.#prevComputedTiming = {
                activeDuration,
                currentIteration: null,
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
                phase: 'idle', // Not specified but required to check if animation is relevant
                progress: null,
            }
        }

        const animationDirection = playbackRate < 0 ? 'backwards' : 'forwards'
        const activeAfter = Math.max(Math.min(delay + activeDuration, endTime), 0)
        const beforeActive = Math.max(Math.min(delay, endTime), 0)

        let activeTime = null
        let currentIteration = null
        let directedProgress = null
        let iterationProgress = null
        let overallProgress = null
        let progress = null
        let phase = 'idle'

        if (localTime < beforeActive || (animationDirection === 'backwards' && localTime === beforeActive)) {
            activeTime = (fill === 'backwards' || fill === 'both') ? Math.max(localTime - delay, 0) : null
            phase = 'before'
        } else if (localTime > activeAfter || (animationDirection === 'forwards' && localTime === activeAfter)) {
            activeTime = (fill === 'forwards' || fill === 'both') ? Math.max(Math.min(localTime - delay, activeDuration), 0) : null
            phase = 'after'
        } else if (phase !== 'before' && phase !== 'after') {
            activeTime = localTime - delay
            phase = 'active'
        }
        if (activeTime !== null) {
            if (duration === 0) {
                overallProgress = phase === 'before' ? (0 + iterationStart) : (iterations + iterationStart)
            } else {
                overallProgress = (activeTime / duration) + iterationStart
            }
            iterationProgress = overallProgress === Infinity ? (iterationStart % 1) : (overallProgress % 1)
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
            let currentDirection
            if (direction === 'normal') {
                currentDirection = 'forwards'
            } else if (direction === 'reverse') {
                currentDirection = 'reverse'
            } else {
                const d = direction === 'alternate-reverse' ? (currentIteration + 1) : currentIteration
                currentDirection = (d % 2 && d !== Infinity) ? 'reverse' : 'forwards'
            }
            directedProgress = currentDirection === 'forwards' ? iterationProgress : (1 - iterationProgress)
            progress = easing(
                directedProgress,
                (phase === 'before' && animationDirection === 'forwards')
                || (phase === 'after' && animationDirection === 'reverse'))
        }

        return this.#prevComputedTiming = {
            activeDuration,
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
            phase, // Not specified but required to check if animation is relevant
            progress,
        }
    }
}

class KeyframeEffect extends AnimationEffect {

    #keyframes = []

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
        super()
        this.target = target
        this.buffer = createBuffer(target)
        this.updateTiming(typeof options === 'number' ? { duration: options } : options)
        this.setKeyframes(keyframes)
        this.#setWillChange()
    }

    /**
     * getKeyframes :: void -> [ComputedKeyframe]
     *
     * ComputedKeyframe :: {
     *   [Property]: a|PropertyController,
     *   easing: Function,
     *   offset: Number,
     * }
     */
    getKeyframes() {
        return this.#keyframes
    }

    /**
     * setKeyframes :: [Keyframe]|Keyframes -> [ComputedKeyframe]
     */
    setKeyframes(keyframes) {
        this.#keyframes = parseKeyframes(keyframes)
    }

    apply() {

        if (!this.target) {
            return
        }

        const { progress: iterationProgress } = this.getComputedTiming()

        if (iterationProgress === null) {
            return
        }

        const keyframes = this.getKeyframes()
        const intervalEndpoints = []

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
            set(this.buffer, prop, interpolate(from, to, transformedDistance))
        })
        this.buffer.flush()
    }

    // eslint-disable-next-line space-before-function-paren, func-names
    #setWillChange() {

        // eslint-disable-next-line no-unused-vars
        const [{ easing, offset, ...keyframe }] = this.getKeyframes()
        const props = Object.keys(keyframe).join(', ')

        if (props) {
            console.log(props)
            this.buffer.setStyle('will-change', props)
        }
    }
}

export default KeyframeEffect

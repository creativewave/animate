
import * as buffer from './buffer'
import { error, errors } from './error'
import { interpolateNumber, parseEasing } from './interpolate'
import parseKeyframes from './keyframe'

const directions = ['normal', 'reverse', 'alternate', 'alternate-reverse']
const fillModes = ['none', 'forwards', 'backwards', 'both', 'auto']
const isDouble = n => !isNaN(n) && Number.isFinite(n)
const round = n => +(n.toFixed(2))

export class AnimationEffect {

    #prevComputedTiming
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
                currentDirection, // Not specified but required by MotionPathEffect
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

        const animationDirection = playbackRate < 0 ? 'backwards' : 'forwards'
        const activeAfter = Math.max(Math.min(delay + activeDuration, endTime), 0)
        const beforeActive = Math.max(Math.min(delay, endTime), 0)

        let activeTime = null
        let directedProgress = null
        let iterationProgress = null
        let overallProgress = null

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
            currentDirection, // Not specified but required by MotionPathEffect
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

export class KeyframeEffect extends AnimationEffect {

    #buffer
    #keyframes = []
    #target

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
        this.setKeyframes(keyframes)
        this.target = target
    }

    get target() {
        return this.#target
    }

    set target(newTarget) {

        this.#buffer?.remove()

        if (newTarget) {

            // eslint-disable-next-line no-unused-vars
            const [{ easing, offset, ...keyframe }] = this.#keyframes
            const willChange = []
            const initial = Object.entries(keyframe).reduce(
                (initial, [property, controller]) => {
                    switch (controller.set) {
                        case buffer.setAttribute:
                            initial.attributes[property] = newTarget.getAttribute(property)
                            break
                        case buffer.setProperty:
                            initial.properties[property] = newTarget[property]
                            break
                        default:
                            initial.styles[property] = newTarget.style[property]
                            willChange.push(property)
                            break
                    }
                    return initial
                },
                { attributes: {}, properties: {}, styles: {} })

            if (initial.styles) {
                newTarget.style.willChange = willChange.join(', ')
            }
            this.#buffer = buffer.create(newTarget, initial)
        }

        this.#target = newTarget
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

    apply(sync = true) {

        if (!this.target) {
            return
        }

        const { progress: iterationProgress } = this.getComputedTiming()

        if (iterationProgress === null) {
            return
        }

        const intervalEndpoints = []

        if (iterationProgress < 0 && this.#keyframes.filter(k => k.offset === 0).length > 1) {
            intervalEndpoints.push(this.#keyframes[0])
        } else if (iterationProgress >= 1 && this.#keyframes.filter(k => k.offset === 1).length > 1) {
            intervalEndpoints.push(this.#keyframes[this.#keyframes.length - 1])
        } else {
            let fromIndex = this.#keyframes.findIndex(k => k.offset <= iterationProgress && k.offset < 1)
            if (fromIndex === -1) {
                fromIndex = this.#keyframes.findIndex(k => k.offset === 0)
            }
            intervalEndpoints.push(this.#keyframes[fromIndex], this.#keyframes[fromIndex + 1])
        }

        const [{ easing, offset: startOffset, ...props }] = intervalEndpoints
        const endOffset = intervalEndpoints[intervalEndpoints.length - 1].offset
        const intervalDistance = (iterationProgress - startOffset) / (endOffset - startOffset)
        const transformedDistance = easing(intervalDistance)

        Object.entries(props).forEach(([prop, value]) => {
            const { set = buffer.setStyle, value: from, interpolate = interpolateNumber } =
                typeof value === 'object' ? value : { value }
            const { value: to } = typeof intervalEndpoints[1][prop] === 'object'
                ? intervalEndpoints[1][prop]
                : { value: intervalEndpoints[1][prop] }
            set(this.#buffer, prop, interpolate(from, to, transformedDistance))
        })

        if (sync) {
            this.#buffer.flush()
        }
    }

    remove() {
        this.#buffer.restore()
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
        } else if (!Array.isArray(newAnchor) || !isDouble(newAnchor[0]) || !isDouble(newAnchor[1])) {
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

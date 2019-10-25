
export const errors = {
    CURRENT_TIME_UNRESOLVED: {
        constructor: TypeError,
        message: "Failed to set the 'currentTime' property on 'Animation': currentTime may not be changed from resolved to unresolved",
    },
    EASING: {
        constructor: TypeError,
        message: 'Unexpected easing keyword.',
    },
    INVALID_STATE_FINISH: {
        constructor: /*DOMException*/Error,
        message: "Failed to execute 'finish' on 'Animation': Cannot finish Animation with an infinite target effect end.",
        name: /*'NotSupported*/'Error',
    },
    INVALID_STATE_PAUSE: {
        constructor: /*DOMException*/Error,
        message: "Failed to execute 'pause' on 'Animation': Cannot pause, Animation has infinite target effect end.",
        name: /*'NotSupported*/'Error',
    },
    INVALID_STATE_PLAY: {
        constructor: /*DOMException*/Error,
        message: "Failed to execute 'play' on 'Animation': Cannot play reversed Animation with infinite target effect end.",
        name: /*'NotSupported*/'Error',
    },
    OFFSET_ORDER: {
        constructor: TypeError,
        message: 'Offsets should be defined in ascending order.',
    },
    OFFSET_RANGE: {
        constructor: TypeError,
        message: 'Offset should be greater than or equal to 0.0, and lower than or equal to 1.0.',
    },
    OFFSET_TYPE: {
        constructor: TypeError,
        message: 'Offset should be a number or a string representing a number.',
    },
    PARTIAL_KEYFRAMES: {
        constructor: /*DOMException*/Error,
        message: "Failed to execute 'animate' on 'Element': Partial keyframes are not supported.",
        name: /*'NotSupported*/'Error',
    },
}

/**
 * error :: Error -> void
 *
 * Memo: name and message of a `DOMException` will not be logged when manually
 * thrown.
 *
 * Memo: most `DOMException` named `InvalidStateError` are related to infinite
 * target effect end, ie. when `iterations` (not implemented yet) is `Infinity`,
 * as `iterations` and `iterationStart` should be applied on `currentTime` to
 * handle when at least one of them is a floating `Number`.
 *
 * TODO(conformance): throw required errors/exceptions when applicable
 * - ... (done)
 * - TypeError: iterations/iterationStart/duration === NaN or < 0
 *   > https://drafts.csswg.org/web-animations/#updating-animationeffect-timing
 * - TypeError: typeof Keyframe !== object|null|undefined in keyframes collection
 *   > https://drafts.csswg.org/web-animations/#process-a-keyframes-argument
 * - DOMException named "AbortError": cancel (reset animation's pending task)
 *   > https://drafts.csswg.org/web-animations/#cancel-an-animation
 *   > does it really matters?
 * - DOMException named "InvalidStateError"
 *   - reverse w/ timeline === null || timelineTime === null
 *     > can't reproduce
 */
const error = ({ constructor, message }, value) => {
    if (value) {
        throw constructor(message, { type: typeof value, value })
    } else {
        throw constructor(message)
    }
}

export default error

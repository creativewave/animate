
export const errors = {
    CURRENT_TIME_UNRESOLVED: {
        message: "Failed to set the 'currentTime' property on 'Animation': currentTime may not be changed from resolved to unresolved",
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
    INVALID_STATE_REVERSE: {
        constructor: /*DOMException*/Error,
        message: "Failed to execute 'reverse' on 'Animation': Cannot reverse an animation with no active timeline.",
        name: /*'NotSupported*/'Error',
    },
    KEYFRAMES_COLOR_VALUE: {
        message: 'Failed to parse an hexadecimal color value in keyframes.',
    },
    KEYFRAMES_COMPUTED_VALUE: {
        message: 'Failed to compute a value in partial keyframes.',
    },
    KEYFRAMES_OFFSET_ORDER: {
        message: 'Keyframe offsets should be defined in ascending order.',
    },
    KEYFRAMES_OFFSET_RANGE: {
        message: 'Keyframe offsets should be greater than or equal to 0.0, and lower than or equal to 1.0.',
    },
    KEYFRAMES_OFFSET_TYPE: {
        message: 'Keyframe offsets should be a number or a string representing a number.',
    },
    KEYFRAMES_PARTIAL: {
        constructor: /*DOMException*/Error,
        message: 'Partial keyframes are not supported.',
        name: /*'NotSupported*/'Error',
    },
    MOTION_PATH_TYPE: {
        message: 'Motion path should inherit from SVGGeometryElement.',
    },
    OPTION_ANCHOR: {
        message: "'anchor' motion path options should be a finite number.",
    },
    OPTION_DELAY: {
        message: "'delay' and `endDelay` timing options should be finite numbers.",
    },
    OPTION_DIRECTION: {
        message: "'direction' timing option should be a valid playback direction.",
    },
    OPTION_DURATION: {
        message: "'duration' timing option should be 'auto' or a number greater or equal to 0.",
    },
    OPTION_EASING: {
        message: "'easing' timing option should be a valid easing keyword or function.",
    },
    OPTION_FILL: {
        message: "'fill' timing option should be a valid direction fill mode.",
    },
    OPTION_ITERATIONS: {
        message: "'iterations' timing option should be a number greater or equal to 0.",
    },
    OPTION_ITERATION_START: {
        message: "'iterationStart' timing option should be a finite number greater or equal to 0.",
    },
}

/**
 * error :: Error -> void
 *
 * Memo: name and message of a `DOMException` will not be logged when manually
 * thrown.
 */
export const error = ({ constructor = TypeError, message }) => {
    throw constructor(message)
}

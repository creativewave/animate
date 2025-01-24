
const animations = new Map
const effects = new Map

export function clear() {
    animations.clear()
    effects.clear()
}

/**
 * addAnimation :: (Animation -> (void -> void)) -> (Boolean -> void)
 */
export function addAnimation(animation, update) {
    animations.set(animation, update)
    return function updateEffect(live) {
        const { effect } = animation
        if (effect) {
            effects.get(effect).apply(live)
        }
    }
}

/**
 * addEffect :: (AnimationEffect -> (void -> void)) -> (void -> void)
 */
export function addEffect(effect, apply, remove) {
    effects.set(effect, { apply, remove })
    return function updateAnimation() {
        for (const [animation, update] of animations.entries()) {
            if (animation.effect === effect) {
                update()
                return
            }
        }
    }
}

/**
 * addTimeline :: Number -> (void -> void)
 */
export function addTimeline(timeline) {
    let { currentTime: prevCurrentTime } = timeline
    return function updateAnimations() {
        const { currentTime } = timeline
        if (prevCurrentTime !== currentTime) {
            prevCurrentTime = currentTime
            animations.forEach((update, animation) => {
                if (animation.timeline === timeline) {
                    update()
                }
            })
        }
    }
}

/**
 * getAnimation :: AnimationEffect -> Animation
 */
export function getAnimation(effect) {
    for (const animation of animations.keys()) {
        if (animation.effect === effect) {
            return animation
        }
    }
}

/**
 * removeEffect :: AnimationEffect -> void
 */
export function removeEffect(effect) {
    effects.get(effect).remove()
}

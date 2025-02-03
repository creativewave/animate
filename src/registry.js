
const animations = new Map
const effects = new Map

export function clear() {
    animations.clear()
    effects.clear()
}

export function addAnimation(animation, update) {
    animations.set(animation, update)
}

export function addEffect(effect, apply, remove) {
    effects.set(effect, { apply, remove })
}

export function getAnimation(effect) {
    for (const animation of animations.keys()) {
        if (animation.effect === effect) {
            return animation
        }
    }
}

export function removeEffect(effect) {
    effects.get(effect)?.remove()
}

export function updateAnimation(effect) {
    for (const [animation, update] of animations.entries()) {
        if (animation.effect === effect) {
            update(true)
            return
        }
    }
}

export function updateAnimations(timeline) {
    animations.forEach((update, animation) => {
        if (animation.timeline === timeline) {
            update()
        }
    })
}

export function updateEffect({ effect }, live = true) {
    if (effect) {
        effects.get(effect)?.apply(live)
    }
}

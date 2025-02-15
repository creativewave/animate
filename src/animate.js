
import { KeyframeEffect, MotionPathEffect } from './effect.js'
import Animation from './animation.js'

let id = 1

/**
 * animate :: (Element -> [Keyframe]|Keyframes|SVGGeometryElement -> OptionalEffectTiming|Number) -> Animation
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
 * OptionalEffectTiming => {
 *   anchor?: String|Array     // Default: 'auto'
 *   duration?: Number,        // Default: 0
 *   delay?: Number,           // Default: 0
 *   direction?: String,       // Default: 'normal'
 *   easing?: String|Function, // Default: 'linear'
 *   endDelay?: Number,        // Default: 0
 *   fill?: String,            // Default: 'none'
 *   id?: a,                   // Default: `Animation#1`
 *   iterations?: Number,      // Default: 1
 *   iterationStart?: Number,  // Default: 0
 *   rotate?: Boolean          // Default: false
 * }
 *
 * https://drafts.csswg.org/web-animations-1/#dom-animatable-animate
 *
 * It deviates from the specification:
 *
 * - by receiving the target instead of accessing it with `this`
 * - by creating a MotionPathEffect instead of a KeyframeEffect when `keyframes`
 * is a SVGGeometryElement
 * - by always assigning a value to Animation.id
 */
function animate(target, keyframes, options) {

    const effect = keyframes instanceof SVGGeometryElement
        ? new MotionPathEffect(target, keyframes, options)
        : new KeyframeEffect(target, keyframes, options)
    const animation = new Animation(effect, options.timeline)

    animation.id = options.id ?? `Animation#${id++}`
    animation.play()

    return animation
}

export default animate

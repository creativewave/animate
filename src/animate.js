
import { KeyframeEffect, MotionPathEffect } from './effect'
import Animation from './animation'

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
 * Memo: reading/writing an element removed from the DOM in a callback given to
 * `requestAnimationFrame()` will not throw an error, but `Animation.cancel()`
 * should still be used in order to prevent future update requests.
 */
const animate = (target, keyframes, options) => {

    const effect = keyframes instanceof SVGGeometryElement
        ? new MotionPathEffect(target, keyframes, options)
        : new KeyframeEffect(target, keyframes, options)
    const animation = new Animation(effect, options.timeline)

    animation.id = options.id ?? `Animation#${id++}`
    animation.play()

    return animation
}

export default animate

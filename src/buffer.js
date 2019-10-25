
/**
 * Memo: a reference of one of those functions should be assigned to `set` in a
 * `PropertyController` assigned to an animated `Property` in a `Keyframe`.
 */
export const setAttribute = (buffer, prop, value) => buffer.setAttribute(prop, value)
export const setProperty = (buffer, prop, value) => buffer.setProperty(prop, value)
export const setStyle = (buffer, prop, value) => buffer.setStyle(prop, value)

/**
 * create :: Element -> Buffer
 *
 * It should return a stub of the given `Element` which should record reads and
 * writes executed using its interface, to split and batch their executions and
 * avoid style/layout recalculations.
 *
 * Memo: FastDOM and similar packages help separating reads/writes of an entire
 * app but 1. they doesn't help batching and 2. reads/writes are also scheduled
 * using `requestAnimationFrame`, which would waste one of two frames and reduce
 * frame rate to 30 fps.
 *
 * Memo: `Object.assign(element.style, styles)` is the fastest method to merge
 * styles as an `Object`, using either hyphenated or camel cased property names.
 *
 * Memo: `setAttributeNs()` is required only for namespaced attributes but SVG
 * attributes can be set with `setAttribute()` or with `setAttributeNs()` and
 * `null` as its first argument (namespace), since HTML5.
 *
 * TODO: `remove()` should restore initial attributes/properties before clearing
 * them, eg. by reading/storing them before the first animation frame.
 */
const create = element => {

    const attributes = new Map()
    let properties = {}
    let styles = {}

    return {
        clear() {
            attributes.clear()
            properties = {}
            styles = {}
        },
        flush() {
            attributes.forEach((value, name) => element.setAttribute(name, value))
            Object.assign(element, properties)
            Object.assign(element.style, styles)
        },
        remove() {
            attributes.forEach((value, name) => element.removeAttribute(name))
            Object.keys(properties).forEach(prop => element[prop] = '')
            Object.keys(styles).forEach(prop => element.style.removeProperty(prop))
        },
        setAttribute(prop, value) {
            attributes.set(prop, value)
        },
        setProperty(prop, value) {
            properties[prop] = value
        },
        setStyle(prop, value) {
            styles[prop] = value
        },
    }
}

export default create

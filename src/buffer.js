
/**
 * Note: a reference to one of those functions should be assigned to `set` in a
 * PropertyController assigned to an animated Property in a Keyframe.
 */
export const setAttribute = (buffer, prop, value) => buffer.setAttribute(prop, value)
export const setProperty = (buffer, prop, value) => buffer.setProperty(prop, value)
export const setStyle = (buffer, prop, value) => buffer.setStyle(prop, value)

/**
 * Note: FastDOM and similar packages help separating/batching reads/writes but
 * they use requestAnimationFrame(), which runs its provided callback only from
 * the next event loop.
 *
 * Note: Object.assign(element.style, styles) is the fastest method to merge
 * styles as an Object, using either hyphenated or camel cased property names.
 *
 * Note: since HTML 5, SVG attributes can be set with setAttribute(), or with
 * setAttributeNs() and `null` as its namespace argument.
 */
class Buffer {

    initial = { attributes: {}, properties: {}, styles: {} }

    #computedStyles = {}
    #element
    #animated = { attributes: {}, properties: {}, styles: {} }

    /**
     * constructor :: (Element -> TargetProperties) -> Buffer
     */
    constructor(element, props) {
        this.#element = element
        this.setInitial(props)
    }

    flush() {

        const { attributes, properties, styles } = this.#animated

        Object.entries(attributes).forEach(([name, value]) => this.#element.setAttribute(name, value))
        Object.assign(this.#element, properties)
        Object.assign(this.#element.style, styles)
    }

    /**
     * getComputedStyle :: String -> String
     */
    getComputedStyle(name) {

        if (this.#computedStyles[name]) {
            return this.#computedStyles[name]
        }

        this.#computedStyles = getComputedStyle(this.#element)

        return this.#computedStyles[name]
    }

    remove() {
        this.restore()
        buffers.delete(this.#element)
    }

    restore() {

        const { attributes, properties, styles } = this.initial

        Object.entries(attributes).forEach(([name, value]) => {
            if (value === null) {
                this.#element.removeAttribute(name)
            } else {
                this.#element.setAttribute(name, value)
            }
        })
        Object.assign(this.#element, properties)
        Object.assign(this.#element.style, styles)

        this.#animated.attributes = {}
        this.#animated.properties = {}
        this.#animated.styles = {}
        this.#computedStyles = {}
    }

    /**
     * setAttribute :: (String -> String|Number) -> void
     */
    setAttribute(name, value) {
        this.#animated.attributes[name] = value
    }

    /**
     * setInitital :: TargetProperties -> Buffer
     *
     * TargetProperties => Map { [String]: PropertyController }
     * PropertyController => {
     *   interpolate: (a -> a -> Number) -> a,
     *   set: (Buffer -> String -> a) -> void,
     *   value: a|[a],
     * }
     */
    setInitial(props) {

        const { attributes, properties, styles } = this.initial

        props.forEach(({ set }, name) => {
            if (set === setAttribute) {
                attributes[name] = this.#element.getAttribute(name)
            } else if (set === setProperty) {
                properties[name] = this.#element[name]
            } else if (set === setStyle) {
                styles[name] = this.#element.style[name]
            }
        })

        return this
    }

    /**
     * setProperty :: (String -> String|Number) -> void
     */
    setProperty(name, value) {
        this.#animated.properties[name] = value
    }

    /**
     * setStyle :: (String -> String|Number) -> void
     */
    setStyle(name, value) {
        this.#animated.styles[name] = value
    }
}

export const buffers = new Map()

/**
 * create :: (Element -> TargetProperties) -> Buffer
 */
export const create = (element, props) => {

    if (buffers.has(element)) {
        return buffers.get(element).setInitial(props)
    }

    const buffer = new Buffer(element, props)

    buffers.set(element, buffer)

    return buffer
}

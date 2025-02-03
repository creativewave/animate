
export function setAttribute(buffer, prop, value) {
    return buffer.setAttribute(prop, value)
}
export function setProperty(buffer, prop, value) {
    return buffer.setProperty(prop, value)
}
export function setStyle(buffer, prop, value) {
    return buffer.setStyle(prop, value)
}

class Buffer {

    initial = new Map

    #computedStyles = new Map
    #element
    #animated = { attributes: new Map, properties: new Map, styles: new Map }

    /**
     * constructor :: (Element -> AnimationEffect -> TargetProperties) -> Buffer
     */
    constructor(element, effect, props) {
        this.#element = element
        this.setInitial(effect, props)
    }

    flush() {

        const { attributes, properties, styles } = this.#animated

        attributes.forEach((value, name) => this.#element.setAttribute(name, value))
        properties.forEach((value, name) => this.#element[name] = value)
        styles.forEach((value, name) => this.#element.style[name] = value)
    }

    /**
     * getComputedStyle :: String -> String
     */
    getComputedStyle(name) {
        if (this.#computedStyles.get(name)) {
            return this.#computedStyles.get(name)
        }
        this.#computedStyles.set(name, getComputedStyle(this.#element))
        return this.#computedStyles.get(name)
    }

    remove(effect) {
        this.restore(effect)
        if (this.initial.size === 0) {
            buffers.delete(this.#element)
        }
    }

    restore(effect) {

        const { attributes, properties, styles } = this.initial.get(effect)

        attributes.forEach((value, name) => {
            if (value === null) {
                this.#element.removeAttribute(name)
            } else {
                this.#element.setAttribute(name, value)
            }
            this.#animated.attributes.delete(name)
        })
        properties.forEach((value, name) => {
            this.#element[name] = value
            this.#animated.properties.delete(name)
        })
        styles.forEach((value, name) => {
            this.#element.style[name] = value
            this.#animated.styles.delete(name)
            this.#computedStyles.delete(name)
        })
    }

    /**
     * setAttribute :: (String -> String|Number) -> void
     */
    setAttribute(name, value) {
        this.#animated.attributes.set(name, value)
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
    setInitial(effect, props) {

        const attributes = new Map
        const properties = new Map
        const styles = new Map

        this.initial.set(effect, { attributes, properties, styles })

        props.forEach(({ set }, name) => {
            if (set === setAttribute && this.#animated.attributes[name] === undefined) {
                attributes.set(name, this.#element.getAttribute(name))
            } else if (set === setProperty && this.#animated.properties[name] === undefined) {
                properties.set(name, this.#element[name])
            } else if (set === setStyle && this.#animated.styles[name] === undefined) {
                styles.set(name, this.#element.style[name])
            }
        })

        return this
    }

    /**
     * setProperty :: (String -> String|Number) -> void
     */
    setProperty(name, value) {
        this.#animated.properties.set(name, value)
    }

    /**
     * setStyle :: (String -> String|Number) -> void
     */
    setStyle(name, value) {
        this.#animated.styles.set(name, value)
    }
}

export const buffers = new Map

/**
 * create :: (Element -> AnimationEffect -> TargetProperties) -> Buffer
 */
export function create(element, effect, props) {

    if (buffers.has(element)) {
        return buffers.get(element).setInitial(effect, props)
    }

    const buffer = new Buffer(element, effect, props)
    buffers.set(element, buffer)

    return buffer
}

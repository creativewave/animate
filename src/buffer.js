
/**
 * Memo: a reference to one of those functions should be assigned to `set` in a
 * `PropertyController` assigned to an animated `Property` in a `Keyframe`.
 */
export const setAttribute = (buffer, prop, value) => buffer.setAttribute(prop, value)
export const setProperty = (buffer, prop, value) => buffer.setProperty(prop, value)
export const setStyle = (buffer, prop, value) => buffer.setStyle(prop, value)

export const buffers = new Map()

/**
 * create :: Element -> Buffer
 *
 * It should return a stub of the given `Element` that should record each write
 * executed using its interfaces, to batch their executions.
 *
 * Memo: FastDOM and similar packages help separating/batching reads/writes but
 * they uses `requestAnimationFrame()`, which will prevent instant updates after
 * using the programming interface, and conforming to the specification.
 *
 * Memo: `Object.assign(element.style, styles)` is the fastest method to merge
 * styles as an `Object`, using either hyphenated or camel cased property names.
 *
 * Memo: `setAttributeNs()` is required only for namespaced attributes but SVG
 * attributes can be set with `setAttribute()` or with `setAttributeNs()` and
 * `null` as its first argument (namespace), since HTML5.
 */
export const create = element => {

    if (buffers.has(element)) {
        return buffers.get(element)
    }

    const initial = { attributes: {}, properties: {}, styles: {} }
    const animated = { attributes: {}, properties: {}, styles: {} }

    const buffer = {
        flush() {
            const { attributes, properties, styles } = animated
            Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value))
            Object.assign(element, properties)
            Object.assign(element.style, styles)
        },
        remove() {
            buffer.restore()
            buffers.delete(element)
        },
        restore() {
            const { attributes, properties, styles } = initial
            Object.entries(attributes).forEach(([name, value]) => {
                if (value === null) {
                    element.removeAttribute(name)
                } else {
                    element.setAttribute(name, value)
                }
            })
            Object.assign(element, properties)
            Object.assign(element.style, styles)
        },
        setAttribute(name, value) {
            animated.attributes[name] = value
        },
        /**
         * setInitital :: TargetProperties -> void
         *
         * TargetProperties => Map { [String]: PropertyController }
         */
        setInitial(props) {

            const attributes = {}
            const properties = {}
            const styles = {}
            const willChange = []

            props.forEach(({ set }, name) => {
                switch (set) {
                    case setAttribute:
                        attributes[name] = element.getAttribute(name)
                        break
                    case setProperty:
                        properties[name] = element[name]
                        break
                    case setStyle:
                        styles[name] = element.style[name]
                        willChange.push(name)
                        break
                }
            })

            initial.attributes = attributes
            initial.properties = properties
            initial.styles = styles
            element.style.willChange = willChange.join(', ')
        },
        setProperty(name, value) {
            animated.properties[name] = value
        },
        setStyle(name, value) {
            animated.styles[name] = value
        },
    }

    buffers.set(element, buffer)

    return buffer
}

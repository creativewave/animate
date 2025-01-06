
import { buffers } from './buffer.js'

export const fps = {
    current: 60,
    observe(cb = () => {}) {
        fps.callback = cb
    },
}

const updates = []
let lastTaskId = 0

const frame = {
    cancel(update) {
        if (update.id) {
            update.id = null
            updates.splice(updates.indexOf(update), 1)
        }
        if (updates.length === 0 && frame.flush.id) {
            frame.flush.id = globalThis.cancelAnimationFrame(frame.flush.id)
        }
    },
    flush(timestamp) {
        frame.flush.id = null
        for (let i = updates.length; i > 0; --i) {
            const update = updates.shift()
            if (update.id) {
                update.id = null
                update(timestamp)
            }
        }
        buffers.forEach(buffer => buffer.flush())
        if (process.env.NODE_ENV !== 'production') {
            fps.current++
            if (!fps.startTime) {
                fps.startTime = timestamp
            } else if ((timestamp - fps.startTime) > 1000) {
                fps.callback(fps.current.toFixed())
                fps.current = 0
                fps.startTime = timestamp
            }
        }
    },
    request(update) {
        if (update.id) {
            return update.id
        }
        if (update === frame.flush && !frame.flush.id) {
            return globalThis.requestAnimationFrame(frame.flush)
        }
        frame.flush.id = frame.request(frame.flush)
        updates.push(update)
        return update.id = ++lastTaskId
    },
}

export default frame

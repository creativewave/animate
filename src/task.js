
import { buffers } from './buffer'

const updates = []
let lastTaskId = 0

export const animationFrameGroup = {
    cancel(update) {
        if (update.id) {
            update.id = null
            updates.splice(updates.indexOf(update), 1)
        }
        if (updates.length === 0 && animationFrameGroup.flush.id) {
            animationFrameGroup.flush.id = globalThis.cancelAnimationFrame(animationFrameGroup.flush.id)
        }
    },
    flush(timestamp) {
        animationFrameGroup.flush.id = null
        for (let i = updates.length; i > 0; --i) {
            const update = updates.shift()
            if (update.id) {
                update.id = null
                update(timestamp)
            }
        }
        buffers.forEach(buffer => buffer.flush())
    },
    request(update) {
        if (update.id) {
            return update.id
        } else if (update === animationFrameGroup.flush && !animationFrameGroup.flush.id) {
            return globalThis.requestAnimationFrame(animationFrameGroup.flush)
        }
        animationFrameGroup.flush.id = animationFrameGroup.request(animationFrameGroup.flush)
        updates.push(update)
        return update.id = ++lastTaskId
    },
}

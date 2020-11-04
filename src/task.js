
import { isTest, now } from './utils'
import { buffers } from './buffer'

let lastTaskId = 0
const cancelledTaskIds = []

export const microtask = {
    cancel(task) {
        if (task.id) {
            cancelledTaskIds.push(task.id)
            task.id = null
        }
    },
    request(task) {
        if (task.id) {
            return
        }
        Promise.resolve(task.id = ++lastTaskId).then(taskId => {
            if (cancelledTaskIds.includes(taskId)) {
                return
            }
            task.id = null
            task(now())
        })
        return lastTaskId
    },
}

// eslint-disable-next-line no-undef
export const animationFrame = isTest
    ? { cancel: microtask.cancel, request: microtask.request }
    : { cancel: id => cancelAnimationFrame(id), request: fn => requestAnimationFrame(fn) }

const updates = []
export const animationFrameGroup = {
    cancel(update) {
        if (update.id) {
            update.id = null
            updates.splice(updates.indexOf(update), 1)
        }
        if (updates.length === 0 && animationFrameGroup.flush.id) {
            animationFrameGroup.flush.id = animationFrame.cancel(animationFrameGroup.flush.id)
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
            return animationFrame.request(animationFrameGroup.flush)
        }
        animationFrameGroup.flush.id = animationFrameGroup.request(animationFrameGroup.flush)
        updates.push(update)
        return update.id = ++lastTaskId
    },
}

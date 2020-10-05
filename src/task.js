
import { buffers } from './buffer'
import now from './now'

let lastTaskId = 0
const cancelledTaskIds = []

export const microtask = {
    cancel(task) {
        if (task?.id) {
            cancelledTaskIds.push(task.id)
            delete task.id
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
            delete task.id
            task(now())
        })
        return lastTaskId
    },
}

const updates = []
const animationFrame = {
    cancel(update) {
        delete update.id
        updates.splice(updates.indexOf(update), 1)
        if (updates.length === 0) {
            animationFrame.flush.id = cancelAnimationFrame(animationFrame.flush.id)
        }
    },
    flush(timestamp) {
        delete animationFrame.flush.id
        for (let i = updates.length; i > 0; --i) {
            const update = updates.shift()
            if (update.id) {
                delete update.id
                update(timestamp)
            }
        }
        buffers.forEach(buffer => buffer.flush())
    },
    request(update) {
        if (update.id) {
            return update.id
        } else if (update === animationFrame.flush && !animationFrame.flush.id) {
            return requestAnimationFrame(animationFrame.flush)
        }
        animationFrame.flush.id = animationFrame.request(animationFrame.flush)
        updates.push(update)
        return update.id = ++lastTaskId
    },
}

export default process.env.NODE_ENV === 'test' // eslint-disable-line no-undef
    ? microtask
    : animationFrame

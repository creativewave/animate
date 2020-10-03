
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
        update.id = cancelAnimationFrame(update.id)
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
            return
        } else if (update === animationFrame.flush && !animationFrame.flush.id) {
            animationFrame.flush.id = requestAnimationFrame(animationFrame.flush)
            return
        }
        animationFrame.request(animationFrame.flush)
        updates.push(update)
        return update.id = ++lastTaskId
    },
}

export default process.env.NODE_ENV === 'test' // eslint-disable-line no-undef
    ? microtask
    : animationFrame

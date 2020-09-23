
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

const animationFrame = {
    cancel(update) {
        update.id = cancelAnimationFrame(update.id)
    },
    request(update) {
        if (update.id) {
            return
        }
        return update.id = requestAnimationFrame(update)
    },
}

export default process.env.NODE_ENV === 'test' // eslint-disable-line no-undef
    ? microtask
    : animationFrame

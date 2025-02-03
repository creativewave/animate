
import { buffers } from './buffer.js'

const priorityTasks = []
const tasks = []
let id = null

export function cancel(task) {
    if (task) {
        let index = priorityTasks.indexOf(task)
        if (-1 < index) {
            priorityTasks.splice(index, 1)
        } else {
            index = tasks.indexOf(task)
            if (-1 < index) {
                tasks.splice(index, 1)
            }
        }
    } else {
        priorityTasks.splice(0)
        tasks.splice(0)
    }
    if (id && priorityTasks.length === 0 && tasks.length === 0) {
        cancelAnimationFrame(id)
        id = null
    }
}

function flush(timestamp) {
    id = null
    for (let i = priorityTasks.length; i > 0; --i) {
        priorityTasks.shift()(timestamp)
    }
    for (let i = tasks.length; i > 0; --i) {
        tasks.shift()(timestamp)
    }
    buffers.forEach(buffer => buffer.flush())
    if (process.env.NODE_ENV !== 'production') {
        rate.current++
        rate.startTime ??= timestamp
        if ((timestamp - rate.startTime) > 1000) {
            rate.callback?.(rate.current.toFixed())
            rate.current = 0
            rate.startTime = timestamp
        }
    }
}

export function request(task, important) {
    if (!id) {
        id = requestAnimationFrame(flush)
    }
    if (important) {
        priorityTasks.push(task)
    } else {
        tasks.push(task)
    }
}

export const rate = {
    current: 60,
    observe(cb) {
        rate.callback = cb
    },
}


import { buffers } from './buffer.js'

const tasks = []
let id = null

export function cancel(task) {
    if (task) {
        tasks.splice(tasks.indexOf(task), 1)
    } else {
        tasks.splice(0)
    }
    if (id && tasks.length === 0) {
        cancelAnimationFrame(id)
        id = null
    }
}

function flush(timestamp) {
    id = null
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

export function request(task) {
    if (!id) {
        id = requestAnimationFrame(flush)
    }
    tasks.push(task)
}

export const rate = {
    current: 60,
    observe(cb) {
        rate.callback = cb
    },
}

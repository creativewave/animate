
import assert from 'assert'
import task from '../src/task'

describe('raf', () => {
    it('should stub window.requestAnimationFrame() and window.cancelAnimationFrame()', () => {

        const ids = []
        const timestamps = []
        const addTimestamp = t => timestamps.push(t)

        ids.push(task.request(addTimestamp))
        ids.push(task.request(addTimestamp))
        ids.push(task.request(addTimestamp))
        assert.strictEqual(ids.length, 3)
        task.cancel(ids[2])

        return Promise.resolve().then(() => assert.strictEqual(timestamps.length, 2))
    })
})

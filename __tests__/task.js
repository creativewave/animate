
import task from '../src/task'

describe('raf', () => {
    it('should stub window.requestAnimationFrame() and window.cancelAnimationFrame()', () => {

        const fn1 = jest.fn()
        const fn2 = jest.fn()

        task.request(fn1)
        task.request(fn1)
        task.request(fn2)
        task.cancel(fn2)

        return Promise.resolve().then(() => {
            expect(fn1).toHaveBeenCalledTimes(1)
            expect(fn2).not.toHaveBeenCalled()
        })
    })
})

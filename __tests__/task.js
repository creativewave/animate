
import { animationFrame } from '../src/task'

describe('raf', () => {
    it('should stub window.requestAnimationFrame() and window.cancelAnimationFrame()', () => {

        const fn1 = jest.fn()
        const fn2 = jest.fn()

        animationFrame.request(fn1)
        animationFrame.request(fn1)
        animationFrame.request(fn2)
        animationFrame.cancel(fn2)

        return Promise.resolve().then(() => {
            expect(fn1).toHaveBeenCalledTimes(1)
            expect(fn2).not.toHaveBeenCalled()
        })
    })
})


import { animationFrame, animationFrameGroup } from '../src/task'

describe('animationFrame(task)', () => {
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

describe('animationFrameGroup(task)', () => {
    it('should cancel a request while satisfying other requests', async () => {

        const updateAnimation1 = jest.fn()
        const updateAnimation2 = jest.fn()

        // Start both animations
        animationFrameGroup.request(updateAnimation1)
        animationFrameGroup.request(updateAnimation2)

        await Promise.resolve()

        // Update animation 1
        animationFrameGroup.request(updateAnimation1)
        // Finish animation 2
        animationFrameGroup.cancel(updateAnimation2)

        await Promise.resolve()

        expect(updateAnimation1).toHaveBeenCalledTimes(2)
        expect(updateAnimation2).toHaveBeenCalledTimes(1)
    })
})

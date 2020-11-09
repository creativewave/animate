
import { animationFrameGroup } from '../src/task'

describe('animationFrameGroup', () => {
    it('should cancel a request while satisfying other requests', async () => {

        const updateAnimation1 = jest.fn()
        const updateAnimation2 = jest.fn()

        // Start both animations
        animationFrameGroup.request(updateAnimation1)
        animationFrameGroup.request(updateAnimation2)

        await new Promise(resolve => setTimeout(resolve, 17))

        // Update animation 1
        animationFrameGroup.request(updateAnimation1)
        // Finish animation 2
        animationFrameGroup.cancel(updateAnimation2)

        await new Promise(resolve => setTimeout(resolve, 17))

        expect(updateAnimation1).toHaveBeenCalledTimes(2)
        expect(updateAnimation2).toHaveBeenCalledTimes(1)
    })
})


import frame from '../src/frame.js'

describe('frame', () => {
    it('should cancel a request while satisfying other requests', async () => {

        const updateAnimation1 = jest.fn()
        const updateAnimation2 = jest.fn()

        // Start both animations
        frame.request(updateAnimation1)
        frame.request(updateAnimation2)

        await new Promise(resolve => setTimeout(resolve, 17))

        // Update animation 1
        frame.request(updateAnimation1)
        // Finish animation 2
        frame.cancel(updateAnimation2)

        await new Promise(resolve => setTimeout(resolve, 17))

        expect(updateAnimation1).toHaveBeenCalledTimes(2)
        expect(updateAnimation2).toHaveBeenCalledTimes(1)
    })
})

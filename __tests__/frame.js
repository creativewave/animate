/**
 * @jest-environment jsdom
 */

import { cancel, request } from '../src/frame.js'

describe('frame', () => {
    it('cancels a request while still satisfying the others', async () => {

        const task1 = jest.fn()
        const task2 = jest.fn()

        request(task1)
        request(task2)
        cancel(task2)

        await new Promise(requestAnimationFrame)

        expect(task1).toHaveBeenCalledTimes(1)
        expect(task2).toHaveBeenCalledTimes(0)

        request(task1)
        request(task2)
        cancel(task1)

        await new Promise(requestAnimationFrame)

        expect(task1).toHaveBeenCalledTimes(1)
        expect(task2).toHaveBeenCalledTimes(1)
    })
})

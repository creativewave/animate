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

        request(task1)
        cancel(task2)

        await new Promise(requestAnimationFrame)

        expect(task1).toHaveBeenCalledTimes(2)
        expect(task2).toHaveBeenCalledTimes(1)
    })
    it('runs important tasks first', async () => {

        const primary = jest.fn(() => i++)
        const secondary = jest.fn(() => i *= i)

        let i = 1

        request(secondary)
        request(primary, true)

        await new Promise(requestAnimationFrame)

        expect(i).toBe(4)
    })
})

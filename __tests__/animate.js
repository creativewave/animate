/**
 * @jest-environment jsdom
 */

import animate from '../src/animate.js'

/**
 * animate() checks if its second argument is a SVGGeometryElement, which is not
 * available in a jsdom environment.
 */
window.SVGGeometryElement = class SVGGeometryElement {}

describe('animate(target, keyframes, options)', () => {
    it('creates a new Animation, sets Animation.id, runs Animation.play(), and returns Animation', () => {

        const target = document.createElement('a')
        const keyframes = { prop: [0, 1] }
        const options = { duration: 1, id: 'animation' }
        const animation = animate(target, keyframes, options)

        expect(animation.id).toBe('animation')
        expect(animation.playState).toBe('running')

        animation.cancel()
    })
})

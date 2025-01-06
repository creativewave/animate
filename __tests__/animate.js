/**
 * @jest-environment jsdom
 */

import animate from '../src/animate.js'

// SVG interfaces are not implement by jsdom
class SVGGeometryElement {}
class SVGPathElement extends SVGGeometryElement {}

window.SVGGeometryElement = SVGGeometryElement
window.SVGPathElement = SVGPathElement


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

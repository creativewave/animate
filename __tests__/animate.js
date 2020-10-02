
import animate from '../src/animate'

// SVG interfaces are not implement by jsdom
class SVGGeometryElement {}
class SVGPathElement extends SVGGeometryElement {}

window.SVGGeometryElement = SVGGeometryElement // eslint-disable-line no-undef
window.SVGPathElement = SVGPathElement // eslint-disable-line no-undef


describe('animate(target, keyframes, options)', () => {
    it('should create a new Animation, set its id, run Animation.play() and return Animation', () => {

        const animation = animate(document.createElement('a'), { prop: [0, 1] }, { duration: 1, id: 'animation' })

        expect(animation.id).toBe('animation')
        expect(animation.playState).toBe('running')

        animation.cancel()
    })
})

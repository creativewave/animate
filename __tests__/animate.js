
import animate from '../src/animate'

// SVGElement is not implement by jsdom
window.SVGPathElement = class SVGPathElement {} // eslint-disable-line no-undef

describe('animate(target, keyframes, options)', () => {
    it('should create a new Animation, set its id, run Animation.play() and return Animation', () => {

        const animation = animate(document.createElement('a'), { prop: [0, 1] }, { duration: 1, id: 'animation' })

        expect(animation.id).toBe('animation')
        expect(animation.playState).toBe('running')

        animation.cancel()
    })
})

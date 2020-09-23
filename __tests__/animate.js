
import animate from '../src/animate'

describe('animate(target, keyframes, options)', () => {
    it('should create a new Animation, set its id, run Animation.play() and return Animation', () => {

        const animation = animate(document.createElement('a'), { prop: [0, 1] }, { duration: 1, id: 'animation' })

        expect(animation.id).toBe('animation')
        expect(animation.playState).toBe('running')

        animation.cancel()
    })
})

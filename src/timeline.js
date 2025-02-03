
import { request } from './frame.js'
import { updateAnimations  } from './registry.js'

if (process.env.NODE_ENV === 'test') {

    let currentTime = null

    function updateTimeline(timestamp) {
        currentTime = timestamp
        request(updateTimeline, true)
    }

    /**
     * https://drafts.csswg.org/web-animations-1/#animationtimeline
     */
    class AnimationTimeline {
        constructor() {
            request(updateTimeline)
        }
        get currentTime() {
            return currentTime
        }
    }
    /**
     * https://drafts.csswg.org/web-animations-1/#documenttimeline
     */
    class DocumentTimeline extends AnimationTimeline {
        #originTime
        constructor(options = {}) {
            super()
            this.#originTime = options.originTime ?? 0
        }
        get currentTime() {
            return this.#originTime + super.currentTime
        }
    }

    document.timeline = new DocumentTimeline
}

function loop() {
    updateAnimations(document.timeline)
    request(loop)
}
request(loop)

export default document.timeline

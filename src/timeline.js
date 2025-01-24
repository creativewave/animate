
import { addTimeline  } from './registry.js'
import { request } from './frame.js'

if (process.env.NODE_ENV === 'test') {

    let currentTime = null

    function updateTimeline(timestamp) {
        currentTime = timestamp
        request(updateTimeline)
    }

    class AnimationTimeline {
        constructor() {
            request(updateTimeline)
        }
        get currentTime() {
            return currentTime
        }
    }
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

    window.AnimationTimeline = AnimationTimeline
    window.DocumentTimeline = DocumentTimeline
    document.timeline = new DocumentTimeline
}

const updateAnimations = addTimeline(document.timeline)

function loop() {
    updateAnimations()
    request(loop)
}
request(loop)

export default document.timeline

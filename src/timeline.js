
import { request } from './frame.js'
import { updateAnimations  } from './registry.js'

if (process.env.NODE_ENV === 'test') {

    let currentTime = 0

    function updateTimeline(timestamp) {
        currentTime = timestamp
        request(updateTimeline, true)
    }
    request(updateTimeline, true)

    /**
     * https://drafts.csswg.org/web-animations-1/#documenttimeline
     */
    class DocumentTimeline {
        #originTime
        constructor(options = {}) {
            this.#originTime = options.originTime ?? 0
        }
        get currentTime() {
            return this.#originTime + currentTime
        }
    }

    window.DocumentTimeline = DocumentTimeline
    document.timeline = new DocumentTimeline
}

function loop() {
    updateAnimations(document.timeline)
    request(loop)
}
request(loop)

export default document.timeline


import { parseEasing } from './interpolate'

let i = 1
const parse = ({
    delay = 0,
    direction = 'normal',
    duration,
    easing = 'linear',
    endDelay = 0,
    fill = 'forwards',
    id = `Animation#${i++}`,
    iterations = 1,
    iterationStart = 0,
}) => ({
    delay,
    direction,
    duration,
    easing: parseEasing(easing),
    endDelay,
    fill,
    id,
    iterationStart,
    iterations,
})

export default parse

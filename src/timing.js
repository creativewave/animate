
const getCurrentDirection = (direction, currentIteration) => {
    if (direction === 'normal') {
        return 'forwards'
    } else if (direction === 'reverse') {
        return 'reverse'
    } else if (direction === 'alternate-reverse') {
        currentIteration++
    }
    if ((currentIteration % 2) === 0 || currentIteration === Infinity) {
        return 'forwards'
    }
    return 'reverse'
}

const setAnimationDirection = values => {
    values.animationDirection = values.playbackRate < 0 ? 'backwards' : 'forwards'
}
const setPhaseTimes = (values, { delay }) => {
    values.activeAfter = Math.max(Math.min(delay + values.activeDuration, values.endTime), 0)
    values.beforeActive = Math.max(Math.min(delay, values.endTime), 0)
}
const setCurrentPhase = values => {
    if (values.localTime < values.beforeActive || (values.animationDirection === 'backwards' && values.localTime === values.beforeActive)) {
        values.currentPhase = 'before'
    } else if (values.localTime > values.activeAfter || (values.animationDirection === 'forwards' && values.localTime === values.activeAfter)) {
        values.currentPhase = 'after'
    } else {
        values.currentPhase = 'active'
    }
}
const setActiveTime = (values, { delay }) => {
    if (values.currentPhase === 'before' && (values.animationDirection === 'backwards' || values.animationDirection === 'both')) {
        values.activeTime = Math.max(values.localTime - delay, 0)
    } else if (values.currentPhase === 'active') {
        values.activeTime = values.localTime - delay
    } else if (values.currentPhase === 'after' && (values.animationDirection === 'forwards' || values.animationDirection === 'both')) {
        values.activeTime = Math.max(Math.min(values.localTime - delay, values.activeDuration), 0)
    } else {
        values.activeTime = null
    }
}
const setCurrentStates = values => {
    values.currentStates = []
    if (values.currentPhase === 'active' && values.playState !== 'finished') {
        values.currentStates.push('in play')
    }
    if (values.currentStates.includes('in play')
        || (values.playbackRate > 0 && values.currentPhase === 'before')
        || (values.playbackRate < 0 && values.currentPhase === 'after')) {
        values.currentStates.push('current')
    }
    if (values.activeTime !== null) {
        values.currentStates.push('in effect')
    }
}
const setOverallProgress = (values, { duration, iterationStart, iterations }) => {
    if (values.activeTime === null) {
        values.overallProgress = null
    } else if (duration === 0) {
        values.overallProgress = (values.currentPhase === 'before' ? 0 : iterations) + iterationStart
    } else {
        values.overallProgress = (values.activeTime / duration) + iterationStart
    }
}
const setIterationProgress = (values, { iterations, iterationStart }) => {
    if (values.overallProgress === null) {
        values.iterationProgress = null
    } else {
        values.iterationProgress = values.overallProgress === Infinity
            ? iterationStart % 1
            : values.overallProgress % 1
        if (values.iterationProgress === 0 && (values.currentPhase === 'active' || values.currentPhase === 'after') && values.activeTime === values.activeDuration && iterations !== 0) {
            values.iterationProgress = 1
        }
    }
}
const setCurrentIteration = (values, { iterations }) => {
    if (values.activeTime === null) {
        values.currentIteration = null
    } else if (values.currentPhase === 'after' && iterations === Infinity) {
        values.currentIteration = Infinity
    } else if (values.iterationProgress === 1) {
        values.currentIteration = Math.floor(values.overallProgress) - 1
    } else {
        values.currentIteration = Math.floor(values.overallProgress)
    }
}
const setDirectedProgress = (values, { direction }) => {
    if (values.iterationProgress === null) {
        values.directedProgress = null
    } else {
        values.currentDirection = getCurrentDirection(direction, values.currentIteration)
        values.directedProgress = values.currentDirection === 'forwards'
            ? values.iterationProgress
            : 1 - values.iterationProgress
    }
}
const setTransformedProgress = (values, { easing }) => {
    if (values.directedProgress === null) {
        values.transformedProgress = null
    } else {
        values.transformedProgress = easing(
            values.directedProgress,
            (values.direction === 'forwards' && values.currentPhase === 'before')
            || (values.direction === 'reverse' && values.currentPhase === 'after'))
    }
}
const setIsRelevant = values => {
    values.isRelevant = values.currentStates.includes('in play')
        || (values.playbackRate > 0 && values.currentPhase === 'before')
        || (values.playbackRate < 0 && values.currentPhase === 'after')
        || (values.activeTime !== null)
}

const getTimingValues = (initialValues, options) => [
    setAnimationDirection,
    setPhaseTimes,
    setCurrentPhase,
    setActiveTime,
    setCurrentStates,
    setOverallProgress,
    setIterationProgress,
    setCurrentIteration,
    setDirectedProgress,
    setTransformedProgress,
    setIsRelevant,
].reduce(
    (values, fn) => fn(values, options) || values,
    initialValues)

export default getTimingValues

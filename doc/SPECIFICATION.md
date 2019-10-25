
# Specification

This document is a walk through the [Web Animation specification](https://drafts.csswg.org/web-animations/) to highlight, translate, and comment its implementation, as well as some noteworthy differences.

**Table of contents:**

- [Introduction](#Introduction)
- [Specification conventions](#Specification-conventions)
- [Web Animations model overview](#Web-Animations-model-overview)
- [Timing model](#Timing-model)
    - [Timelines](#Timelines)
    - [Animations](#Animations)
        - [Setting the timeline of an animation](#Setting-the-timeline-of-an-animation)
        - [Responding to a newly inactive timeline](#Responding-to-a-newly-inactive-timeline)
        - [Setting the target effect of an animation](#Setting-the-target-effect-of-an-animation)
        - [The current time of an animation](#The-current-time-of-an-animation)
        - [Setting the current time of an animation](#Setting-the-current-time-of-an-animation)
        - [Setting the start time of an animation](#Setting-the-start-time-of-an-animation)
        - [Waiting for the target effect](#Waiting-for-the-target-effect)
        - [Playing an animation](#Playing-an-animation)
        - [Pausing an animation](#Pausing-an-animation)
        - [Reaching the end](#Reaching-the-end)
        - [The current finished promise](#The-current-finished-promise)
        - [Updating the finished state](#Updating-the-finished-state)
        - [Finishing an animation](#Finishing-an-animation)
        - [Canceling an animation](#Canceling-an-animation)
        - [Speed control](#Speed-control)
        - [Reversing an animation](#Reversing-an-animation)
        - [Play states](#Play-states)
    - [Animation effect](#Animation-effect)
        - [Relationship between animation effects and animations](#Relationship-between-animation-effects-and-animations)
        - [Types of animation effects](#Types-of-animation-effects)
        - [The active interval](#The-active-interval)
        - [Local time](#Local-time)
        - [Animation effect phases and states](#Animation-effect-phases-and-states)
    - [Fill behavior](#Fill-behavior)
        - [Fill modes](#Fill-modes)
    - [Repeating](#Repeating)
        - [Iteration intervals](#Iteration-intervals)
        - [Controlling iteration](#Controlling-iteration)
    - [Core animation effect calculations](#Core-animation-effect-calculations)
        - [Calculating the active duration](#Calculating-the-active-duration)
        - [Transforming the local time](#Transforming-the-local-time)
            - [Calculating the active time](#Calculating-the-active-time)
            - [Calculating the overall progress](#Calculating-the-overall-progress)
            - [Calculating the simple iteration progress](#Calculating-the-simple-iteration-progress)
        - [Calculating the current iteration](#Calculating-the-current-iteration)
        - [Calculating the directed progress](#Calculating-the-directed-progress)
    - [Time transformations](#Time-transformations)
        - [Calculating the transformed progress](#Calculating-the-transformed-progress)
    - [The iteration progress](#The-iteration-progress)
- [Animation model](#Animation-model)
    - [Introduction](#Introduction)
    - [Keyframe effects](#Keyframe-effects)
        - [Keyframes](#Keyframes)
        - [Calculating computed keyframes](#Calculating-computed-keyframes)
        - [The effect value of a keyframe effect](#The-effect-value-of-a-keyframe-effect)
- [Programming interface](#Programming-interface)
    - [The Animation interface](#The-Animation-interface)
    - [The KeyframeEffect interface](#The-KeyframeEffect-interface)
        - [Processing a keyframes argument](#Processing-a-keyframes-argument)
    - [The Animatable interface mixin](#The-Animatable-interface-mixin)
    - [Extensions to the DocumentOrShadowRoot interface mixin](#Extensions-to-the-DocumentOrShadowRoot-interface-mixin)
    - [Model liveness](#Model-liveness)

## Introduction

https://drafts.csswg.org/web-animations/#introduction

> While it is possible to use ECMAScript to perform animation using requestAnimationFrame, such animations behave differently to declarative animation in terms of how they are represented in the CSS cascade and the performance optimizations that are possible such as performing the animation on a separate thread.

**Difference:** animation will really performn on the main thread using `requestAnimationFrame()` and `Element.style`.

> The time values used within the programming interface correspond with those used in animation frame callbacks [...].

**Difference/translation:** time values will be really based on the `timestamp` received by an animation frame callback (ie. given to `requestAnimationFrame()`) named `update()`, similarly as the name of the [procedure to update an animation('s finished) state](#Updating-the-finished-state), which will `apply()` effects and request a new `update()` with `requestAnimationFrame(update)` until `playState === 'finished'`, `playState !== 'running'`, `Animation` `!isRelevant()`, or until an interface of `Animation` has been used to control playback and whose procedure includes `cancelAnimationFrame(pendingTaskId)`, where `pendingTaskId` is the value returned by `requestAnimationFrame(update)` for a *pending play task* or a *pending pause task*.

**Difference/translation:**
- `timelineTime` should be initialized in the constructor of `Animation` in order to [set `Animation.startTime`](#Setting-the-start-time-of-an-animation) and [read](#The-current-time-of-an-animation) or [set `Animation.currentTime`](#Setting-the-current-time-of-an-animation)
- `timelineTime` should be updated with `timestamp` when satisfying each `update()` request, eg. with `requestAnimationFrame(t => { timelineTime = t; update() })`

## Specification conventions

https://drafts.csswg.org/web-animations/#spec-conventions

> [...] there are often specific procedures for updating [...animation] properties such as [...] the procedure to set the start time of an animation.
>
> Where this specification does not specifically link to a procedure, text that requires [...] to update a property such as, “make animation’s start time unresolved”, should be understood to refer to updating the property directly without invoking any related procedure.

**Translation:** `Animation.currentTime` and `Animation.startTime` should be updated with a setter implementing the related procedure.

**Comment/difference:** `Animation.playbackRate` will not be updated using the related procedure, as noted in [Speed control](#Speed-control), thus related steps will be ignored in next sections.

## Web Animations model overview

https://drafts.csswg.org/web-animations/#web-animations-model-overview

> At a glance, the Web Animations model consists of two largely independent pieces [...]:
> - **timing model:** takes a moment in time and converts it to [...] iteration progress. The iteration index is also recorded [...]
> - **animation model:** takes the iteration progress values and iteration indices [...] and converts them into a series of values to apply to the target properties
>
> Graphically, this flow can be represented as follows:
>
> *now* -> timing model -> [iteration progress, iteration index] -> animation model -> values to apply

**Translation:** the `timestamp` is the *moment in time* that should be used to compute `iterationProgress` and `currentIteration`, which are used to compute [*effect value* of each keyframe](#The-effect-value-of-a-keyframe-effect), ie. CSS properties/values to `apply()` to the target `Element`.

## Timing model

### Time values

https://drafts.csswg.org/web-animations/#time-value-section

> A time value is a real number which nominally represents a number of milliseconds from some moment.

**Translation:** each time value is a `Number !== Infinity`.

> A time value may also be unresolved if, for example, a timing node is not in a state to produce a time value.

**Translation:** some time values may be `null` until the first `update()`.

### Timelines

https://drafts.csswg.org/web-animations/#timelines

> A timeline provides a source of time values for the purpose of synchronization.
>
> At any given moment, a timeline has a single current time value known simply as the timeline’s current time.
>
> A timeline may not always be able to return a meaningful time value, but only an unresolved time value. For example, it may be defined relative to a moment that has yet to occur, such as the firing of a document’s load event. A timeline is considered to be inactive when its time value is unresolved.
>
> [...]
>
> When asked to update animations and send events for a Document doc at timestamp *now* [...]: update the current time of all timelines associated with doc passing *now* as the timestamp. [...] Updating the current time of a timeline also involves [...] running the update an animation’s finished state procedure for any animations whose current time has been updated.
>
> [...]
>
> A document timeline [...has a] current time [which] is calculated as a fixed offset from the *now* timestamp provided each time the update animations and send events procedure is run. This fixed offset is referred to as the document timeline’s origin time.
>
> Prior to establishing the time origin for its associated document, a document timeline is inactive.
>
> [...]
>
> The default document timeline has an origin time of zero.
>
> [...] document.timeline.currentTime will roughly correspond to Performance.now().

**Translation:** a timeline's current time, aka. *now* or *origin time*, ie. `timestamp` (static) or `performance.now()` (dynamic), starts at `0` ie. the *time origin*, *which is considered to be the beginning of the current document's lifetime* (source: [MDN](https://developer.mozilla.org/en-US/docs/Web/API/DOMHighResTimeStamp#The_time_origin)).

**Difference:** the document timeline will always be active and an animation will always be associated to a timeline, thus a condition for an *inactive timeline* or *an animation [which] has no associated timeline* will be ignored in next sections.

**Comment/translation:** the UA should perform the *update animations and send events procedure prior to running animation frame callbacks* (as specified in [Model liveness](#Model-liveness)), using eg. `document.getAnimations().forEach(a => a.update())`, where `getAnimations()` *returns the set of relevant Animation objects* (as specified in [Extensions to the DocumentOrShadowRoot interface mixin](#Extensions-to-the-DocumentOrShadowRoot-interface-mixin)), and where `Animation` *is relevant if its target effect is current or in effect* (as specified in [The Animatable interface mixin](#The-Animatable-interface-mixin)), ie. if `timing.currentStates.includes('in play')`, else if `playbackRate > 0 && timing.currentPhase === 'before'`, else if `playbackRate < 0 && timing.currentPhase === 'after'`, else if `timing.activeTime !== null` (as specified in [Animation effect phases and states](#Animation-effect-phases-and-states)).

**Difference/translation:** `Animation` should `requestAnimationFrame(update)` until `!isRelevant()` (described above).

### Animations

https://drafts.csswg.org/web-animations/#animations

> An animation connects a single animation effect, called its target effect, to a timeline [...].

**Translation:** `Animation` should `apply()` target effect(s), ie. `Keyframes` effect(s), the single type of animation effect that exists (as specified in [Types of animation effects](#Types-of-animation-effects)), with `Animation.currentTime` as its sole argument (as specified in [The current time of an animation](#The-current-time-of-an-animation).

> An animation’s start time is the time value of its timeline when its target effect is scheduled to begin playback. An animation’s start time is initially unresolved.

**Comment/translation:** `startTime` will be set to `timestamp` in the first frame after creating `Animation`, ie. when `Animation.ready` (not implemented) is resolved, eg. with `Promise.resolve(now).then(setStartTime)`), as specified in [Playing an animation](#Playing-an-animation) and [Pausing an animation](#Pausing-an-animation).

**Comment:** `timestamp` will always be a few milliseconds sooner than the time when *"a target effect is scheduled to begin playback"* but in [waiting for the target effect](#waiting-for-the-target-effect), it is specified that *"Web Animations typically begins timing animations from the moment when the first frame of the animation is complete [...] represented by an unresolved start time on the animation which becomes resolved when the animation is ready"*.

```js
    // -- Observing the resolution of startTime --
    // -- Observing startTime === raf timestamp --
    const animation = element.animate({ opacity: [0, 1] }, 1)
    log(getComputedStyle(element).opacity)
    rAF(t => log(animation.startTime, t))
    setTimeout(() => log(animation.startTime), 1)
    setTimeout(() => log(animation.startTime), 10)

    // Outputs (t === startTime most of the time):
    // 1. 0
    // 2. null, t
    // 3. null
    // 4. startTime
}
```

> An animation also maintains a hold time time value which is used to fix the animation’s output time value, called its current time, in circumstances such as pausing. The hold time is initially unresolved.

**Translation:** in the constructor of `Animation`, initialize `holdTime` with `null`.

#### Setting the timeline of an animation

https://drafts.csswg.org/web-animations/#setting-the-timeline

> 4. If the start time of animation is resolved, make animation’s hold time unresolved.
>
>    Note: This step ensures that the finished play state of animation is not “sticky” but is re-evaluated based on its updated current time.

**Difference:** steps 1 to 3 are related to connecting animation to a timeline, thus they will be ignored.

**Comment:** this procedure is executed only in (the second step of) the [constructor of `Animation`](#The-Animation-interface) and `startTime` should be *initially unresolved* (as specified before), thus this step is non-sense but its note suggests that it should be applied before using an interface that should check if `playState === 'finished'`, which depends on `Animation.currentTime !== null`, which depends on `holdTime`.

-> currently: `holdTime` is set to `null` in `update()` if `timelineTime === null && startTime !== null`.

> 5. Run the procedure to update an animation’s finished state for animation with the did seek flag set to false, and the synchronously notify flag set to false.

**Comment/translation:** when removed from next sections, the *synchronously notify flag* and the *didSeek flag* will be `false`, meaning that the corresponding `update()` parameters should default to `false`.

**Comment/difference:** this step is already in the [procedure of Animation.play()](#Playing-an-animation), which is the step 5 of the [procedure of `Element.animate()`](#The-Animatable-interface-mixin), whose step 3 is the procedure to [construct `Animation`](#The-Animation-interface), which includes this procedure and this step, thus this step will be ignored (ie. not repeated).

#### Responding to a newly inactive timeline

https://drafts.csswg.org/web-animations/#responding-to-a-newly-inactive-timeline

> [...] the only occasion on which an animation becomes idle, is when the procedure to cancel an animation is performed.

**Translation:** `Animation.playState === 'idle'` only after `Animation.cancel()`.

#### Setting the target effect of an animation

https://drafts.csswg.org/web-animations/#setting-the-target-effect

> The procedure to set the target effect of an animation [...] is as follows: [...]
>
> 6. Let the target effect of animation be new effect.
> 7. Run the procedure to update an animation’s finished state for animation [...]

**Comment/difference:** this procedure is executed in (the last step of) the [constructor of `Animation`](#The-Animation-interface), ie. before `Animation.play()`, or when updating `Animation.effect` which will not be implemented and to which steps 1 to 5 are entirely related, thus they will be ignored.

**Difference:** as for [Setting the timeline of an animation](#Setting-the-timeline-of-an-animation), step 7 will be ignored (ie. not repeated).

> The procedure to reset an animation’s pending tasks for animation is as follows:
> 1. If animation does not have a pending play task or a pending pause task, abort this procedure.
> 2. If animation has a pending play task, cancel that task.
> 3. If animation has a pending pause task, cancel that task.
> 4. Apply any pending playback rate on animation.
> 5. Reject animation’s current ready promise with a DOMException named "AbortError".
> 6. Let animation’s current ready promise [...].

**Comment:** this procedure is executed only in (the first step of) the [procedure of `Animation.cancel()`](#Canceling-an-animation).

**Comment/difference:** `Animation` will only handle a single `Promise` assigned to `Animation.finished` with `createFinishedPromise()` and whose executor should set `resolver` (initialized in the constructor of `Animation`) to its sole argument, thus step 5 will be ignored as well as all steps related to the *ready promise* in next sections.

**Comment/translation:** as translated in [Animation.play()](#Playing-an-animation) and [Animation.pause()](#Pausing-an-animation), an animation is described as having a pending play or pause task so long `update(didSeek, sync, 'play|pause')` is scheduled with `requestAnimationFrame()`, represented by setting `pendingTask` (initialized in the constructor of `Animation`) to the third `update()` argument and toggling it back to `null` when initializing `timelineTime`, ie. when animation becomes ready, as well as when `cancelAnimationFrame(pendingTaskId)`, ie. animation has been canceled before being ready.

**Difference/translation:** in `Animation.cancel()`, if `pendingTask`, `cancelAnimationFrame(pendingTaskId)`.

#### The current time of an animation

https://drafts.csswg.org/web-animations/#the-current-time-of-an-animation

> Animations provide a time value to their target effect called the animation’s current time.
>
> The current time is calculated from the first matching condition from below:
> - If the animation’s hold time is resolved, the current time is the animation’s hold time.
> - If any of the following are true:
>   1. the animation has no associated timeline, or
>   2. the associated timeline is inactive, or
>   3. the animation’s start time is unresolved.
>
>   The current time is an unresolved time value.
>
> - Otherwise, current time = (timeline time - start time) × playback rate
>
>   Where timeline time is the current time value of the associated timeline. [...]

**Difference/translation:** in the getter of `Animation.currentTime`, if `holdTime !== null`, `return holdTime`, else if `startTime === null`, `return null`, else `return (timelineTime - startTime) * playbackRate`.

#### Setting the current time of an animation

https://drafts.csswg.org/web-animations/#the-current-time-of-an-animation

> The current time of an animation can be set to a new value to seek the animation. The procedure for setting the current time is defined in two parts.

**Comment:** the first part is executed only in the [procedure of `Animation.finish()`](#Finishing-an-animation), which should apply effect(s) synchronously instead of in the next frame like the second part, which should also execute this first part as its first step.

> The procedure to silently set the current time of an animation [...] is as follows:
> 1. If seek time is an unresolved time value, then perform the following steps.
>    1. If the current time is resolved, then throw a TypeError.
>    2. Abort these steps.
> 2. If any of the following conditions are true:
>    - animation’s hold time is resolved, or
>    - animation’s start time is unresolved, or
>    - animation has no associated timeline or the associated timeline is inactive, or
>    - animation’s playback rate is 0,
>
>    Set animation’s hold time to seek time.
>
>    Otherwise, set animation’s start time to [...] timeline time - (seek time / playback rate) [...].
> 3. If animation has no associated timeline or the associated timeline is inactive, make animation’s start time unresolved.
>
>    This preserves the invariant that when we don’t have an active timeline it is only possible to set either the start time or the animation’s current time.
> 4. Make animation’s previous current time unresolved.

**Translation:** in `Animation.finish()`, set `silent` (initialized with `false` in the constructor of `Animation`) to `true` before setting `Animation.currentTime`, and then back to `false`.

**Translation:** (in the setter of `Animation.currentTime`)
- if `seekTime === null` (setter argument), `return currentTime === null || error(errors.CURRENT_TIME_UNRESOLVED)`
- if `holdTime !== null || startTime === null || playbackRate === 0`, set `holdTime` to `seekTime`, else set `startTime` to `timelineTime - (seekTime / playbackRate)`
- set `previousCurrentTime` to `null`
- if `silent`, `return`

> The procedure to set the current time of an animation [...] is as follows:
> 1. Run the steps to silently set the current time of animation to seek time.
> 2. If animation has a pending pause task, [...perform] the following steps:
>    1. Set animation’s hold time to seek time.
>    2. Apply any pending playback rate to animation.
>    3. Make animation’s start time unresolved.
>    4. Cancel the pending pause task.
>    5. Resolve animation’s current ready promise with animation.
> 3. Run the procedure to update an animation’s finished state for animation with the did seek flag set to true [...]

**Translation:** (in the setter of `Animation.currentTime`)
- if `pendingTask === 'pause'`, set `holdTime` to `seekTime`, `startTime` to `null`, and `cancelAnimationFrame(pendingTaskId)`.
- `update(true)`

#### Setting the start time of an animation

https://drafts.csswg.org/web-animations/#setting-the-start-time-of-an-animation

> The procedure to set the start time of animation, animation, to new start time, is as follows:
> 1. Let timeline time be the current time value of the timeline [...].
> 2. If timeline time is unresolved and new start time is resolved, make animation’s hold time unresolved.
>
>    This preserves the invariant that when we don’t have an active timeline it is only possible to set either the start time or the animation’s current time.
> 3. Let previous current time be animation’s current time.
>
>    Note: This is the current time after applying the changes from the previous step which may cause the current time to become unresolved.
> 4. Apply any pending playback rate on animation.
> 5. Set animation’s start time to new start time.
> 6. Update animation’s hold time based on the first matching condition from the following,
>    - If new start time is resolved,
>
>      If animation’s playback rate is not zero, make animation’s hold time unresolved.
>    - Otherwise (new start time is unresolved),
>
>      Set animation’s hold time to previous current time even if previous current time is unresolved.
> 7. If animation has a pending play task or a pending pause task, cancel that task and resolve animation’s current ready promise with animation.
> 8. Run the procedure to update an animation’s finished state for animation with the did seek flag set to true [...]

**Difference/translation:** (in the setter of `Animation.startTime`)
- if `newStartTime !== null` (setter argument), set `holdTime` to `null`
- set `previousCurrentTime` to `Animation.currentTime` and `startTime` to `newStartTime`
- if `newStartTime !== null`, set `holdTime` to `null` if `playbackRate !== 0`, else if `newStartTime === null`, set `holdTime` to `previousCurrentTime` if `previousCurrentTime === null`
- if `pendingTask`, `cancelAnimationFrame(pendingTaskId)`
- `update(true)`

#### Waiting for the target effect

https://drafts.csswg.org/web-animations/#waiting-for-the-target-effect

> Web Animations typically begins timing animations from the moment when the first frame of the animation is complete. This is represented by an unresolved start time on the animation which becomes resolved when the animation is ready. [...]

> An animation is ready at the first moment where both of the following conditions are true:
> - the user agent has completed any setup required to begin the playback of the animation’s target effect including rendering the first frame of any keyframe effect.
> - the animation is associated with a timeline that is not inactive.

**Difference/translation:** as noted before, animation will be ready at the (start of the) first `update()`.

#### Playing an animation

https://drafts.csswg.org/web-animations/#playing-an-animation-section

> The procedure to play an animation, given a flag auto-rewind, is as follows:
> 1. Let aborted pause be a boolean flag that is true if animation has a pending pause task, and false otherwise.
> 2. Let has pending ready promise be a boolean flag that is initially false.
> 3. Perform the steps corresponding to the first matching condition from the following, if any:
>    - If animation’s effective playback rate > 0 [...] and either animation’s:
>      - current time is unresolved, or
>      - current time < zero, or
>      - current time ≥ target effect end,
>
>      Set animation’s hold time to zero.
>    - If animation’s effective playback rate < 0 [...] and either animation’s:
>      - current time is unresolved, or
>      - current time ≤ zero, or
>      - current time > target effect end,
>
>      If target effect end is positive infinity, throw an "InvalidStateError" DOMException and abort these steps. Otherwise, set animation’s hold time to target effect end.
>    - If animation’s effective playback rate = 0 and animation’s current time is unresolved, set animation’s hold time to zero.

**Comment:** *auto-rewind* flag is always true by default, thus it will be ignored as well as in the next steps and sections.

**Translation:** (in `Animation.play()`)
- initialize `abortedPause` with `pendingTask === 'pause'`
- if `playbackRate` `> 0` and `Animation.currentTime` is `null` or `< 0` or `>= endTime`, set `holdTime` to `0`
- else if `playbackRate` `< 0` and `Animation.currentTime` is `null` or `<= 0` or `> endTime`, set `holdTime` to `endTime` (specified later) if `endTime !== Infinity`, otherwise `return error(errors.INVALID_STATE_PLAY)`
- else if `playbackRate === 0 && Animation.currentTime === null`, set `holdTime` to `0`

> 4. If animation has a pending play task or a pending pause task, cancel that task [...].
> 5. If [...] animation’s hold time is unresolved, and aborted pause is false, and animation does not have a pending playback rate, abort this procedure.
> 6. If animation’s hold time is resolved, let its start time be unresolved.
> 7. If has pending ready promise is false, let animation’s current ready promise be a new promise [...].

**Translation:**
- if `pendingTask`, `cancelAnimationFrame(pendingTaskId)`
- if `holdTime === null && !abortedPause`, `return`
- if `holdTime !== null`, set `startTime` to `null`

> 8. Schedule a task to run as soon as animation is ready. The task shall perform the following steps:
>    1. Assert that at least one of animation’s start time or hold time is resolved.
>    2. Let ready time be the time value of the timeline [...].
>    3. Perform the steps corresponding to the first matching condition below, if any:
>       [see below]
>    4. Resolve animation’s current ready promise with animation
>    5. Run the procedure to update an animation’s finished state for animation [...].
>
> So long as the above task is scheduled but has yet to run, animation is described as having a pending play task. While the task is running, however, animation does not have a pending play task.
>
> If a user agent determines that animation is immediately ready, it may schedule the above task as a microtask such that it runs at the next microtask checkpoint, but it must not perform the task synchronously.
>
> 9. Run the procedure to update an animation’s finished state for animation [...].

**Difference:** as noted before, step 8 will be executed when satisfying the first `update()` request if `pendingTask === 'play'`, ie. when animation becomes *ready*, and step 8.2 will use `timestamp`.

**Translation:** execute `update()` (step 9).

> If animation’s hold time is resolved,
> 1. Apply any pending playback rate on animation.
> 2. Let new start time be the result of evaluating ready time - hold time / playback rate for animation. If the playback rate is zero, let new start time be simply ready time.
> 3. Set the start time of animation to new start time.
> 4. If animation’s playback rate is not 0, make animation’s hold time unresolved.
>
> If animation’s start time is resolved and animation has a pending playback rate,
> 1. Let current time to match be the result of evaluating (ready time - start time) × playback rate for animation.
> 2. Apply any pending playback rate on animation.
> 3. If animation’s playback rate is zero, let animation’s hold time be current time to match.
> 4. Let new start time be the result of evaluating ready time - current time to match / playback rate for animation. If the playback rate is zero, let new start time be simply ready time.
> 5. Set the start time of animation to new start time.

**Difference/translation:** (in - the first - `update()`)
- if `startTime === null && holdTime === null`, `throw Error('Assertion failed)` (step 8.1)
- if `holdTime !== null`, set `startTime` to `timestamp` if `playbackRate === 0`, otherwise to `timestamp - (holdTime / playbackRate)` while setting `holdTime` to `null`
- else if `startTime !== null`, set `holdTime` to `(timestamp - startTime) * playbackRate` and `startTime` to `timestamp` if `playbackRate === 0`, otherwise set `startTime` to `timestamp - (timestamp - startTime)`

#### Pausing an animation

https://drafts.csswg.org/web-animations/#pausing-an-animation-section

> The procedure to pause an animation, animation, is as follows:
> 1. If animation has a pending pause task, abort these steps.
> 2. If the play state of animation is paused, abort these steps.
> 3. If the animation’s current time is unresolved, perform the steps according to the first matching condition from below:
>    - If animation’s playback rate is ≥ 0, let animation’s hold time be zero.
>    - If target effect end for animation is positive infinity, throw an "InvalidStateError" DOMException and abort these steps. Otherwise, let animation’s hold time be target effect end.
> 4. Let has pending ready promise be a boolean flag that is initially false.
> 5. If animation has a pending play task, cancel that task [...].
> 6. If has pending ready promise is false, set animation’s current ready promise [...].

**Difference/translation:** (in `Animation.pause()`)
- if `pendingTask === 'paused' || playState === 'play'`, `return`
- if `currentTime === null`
   - if `playbackRate >= 0`, set `holdTime` to `0`
   - else if `endTime === Infinity`, `return error(errors.INVALID_STATE_PAUSE)`, else set `holdTime` to `endTime` (specified later)
- if `pendingTask === 'play'`, `cancelAnimationFrame(pendingTaskId)`

> 7. Schedule a task [...that] shall perform the following steps:
>    1. Let ready time be the time value of the timeline [...].
>    2. If animation’s start time is resolved and its hold time is not resolved, let animation’s hold time be the result of evaluating (ready time - start time) × playback rate.
>
>       Note: The hold time might be already set if the animation is finished, or if the animation has a pending play task. In either case we want to preserve the hold time as we enter the paused state.
>    3. Apply any pending playback rate on animation.
>    4. Make animation’s start time unresolved.
>    5. Resolve animation’s current ready promise with animation.
>    6. Run the procedure to update an animation’s finished state for animation [...].
>
> So long as the above task is scheduled but has yet to run, animation is described as having a pending pause task. While the task is running, however, animation does not have a pending pause task.
>
> As with the pending play task, the user agent must run the pending pause task asynchronously, although that may be as soon as the next microtask checkpoint.

**Difference:** as noted before, step 7 will be executed when satisfying the first `update()` request if `pendingTask === 'pause'`, ie. when animation becomes *ready*, and step 7.2 will use `timestamp`.

**Difference/translation:** if `startTime !== null && holdTime === null`, set `holdTime` to `(timestamp - startTime) * playbackRate`, then set `startTime` to `null`.

> 8. Run the procedure to update an animation’s finished state for animation [...].

**Translation:** in `Animation.pause()`, `update(false, false, 'pause')`.

#### Reaching the end

https://drafts.csswg.org/web-animations/#reaching-the-end

> [...] the current time of Web Animations' animations do not play forwards beyond the end time of their target effect or play backwards past time zero.
>
> It is possible, however, to seek the current time of an animation to a time past the end of the target effect. When doing so, the current time will not progress but the animation will act as if it had been paused at the seeked time.

#### The current finished promise

https://drafts.csswg.org/web-animations/#the-current-finished-promise

> The current finished promise is initially a pending Promise object.
>
> The object is replaced with a new promise every time the animation leaves the finished play state.

**Comment/translation:** a `createFinishedPromise()` helper will be created in order to initialize and update `Animation.finished` when required, and since it should have its resolution state read in the [procedure to update the finished state](#Updating-the-finished-state), as well as being eventually cancelled, this helper should assign `false` to `Animation.finished.isResolved`, assign an incremented (or random) id in a global `finishedTaskId`, then `Animation.finished.then(() => finishedTaskId && animation.finished.isResolved = true)`, and finally, a `cancelFinishMicrotask()` helper will be created to set `finishedTaskId` to `null`, thus cancelling `Animation.finished`.

-> currently: assuming that updating `Animation.finished` is required only by/with step 6 of the procedure to update animation's finished state

#### Updating the finished state

> The target effect end of an animation is equal to the end time [...].
>
> For an animation with a negative playback rate, the current time continues to decrease until it reaches zero.
>
> A running animation that has reached this boundary (or overshot it) and has a resolved start time is said to be finished.
>
> The crossing of this boundary is checked on each modification to the animation object using the procedure to update an animation’s finished state defined below. This procedure is also run as part of the update animations and send events procedure. In both cases the did seek flag, defined below, is set to false.

> The procedure to update an animation’s finished state for animation [...] is as follows:
> 1. Let the unconstrained current time be the result of calculating the current time substituting an unresolved time value for the hold time if did seek is false. If did seek is true, the unconstrained current time is equal to the current time.
> 2. If [...] the unconstrained current time is resolved, and animation’s start time is resolved, and animation does not have a pending play task or a pending pause task, then update animation’s hold time based on the first matching condition for animation from below, if any:
> - if playback rate > 0 and unconstrained current time is greater than or equal to target effect end,
>   - If did seek is true, let the hold time be the value of unconstrained current time.
>   - If did seek is false, let the hold time be the maximum value of previous current time and target effect end. If the previous current time is unresolved, let the hold time be target effect end.
> - If playback rate < 0 and unconstrained current time is less than or equal to 0,
>   - If did seek is true, let the hold time be the value of unconstrained current time.
>   - If did seek is false, let the hold time be the minimum value of previous current time and zero. If the previous current time is unresolved, let the hold time be zero.
> - If playback rate ≠ 0, and animation is associated with an active timeline, perform the following steps:
>   1. If did seek is true and the hold time is resolved, let animation’s start time be equal to the result of evaluating timeline time - (hold time / playback rate) where timeline time is the current time value of timeline associated with animation.
>   2. Let the hold time be unresolved.

**Difference/translation:**
- set `currentTime` to `(didSeek || holdTime === null) ? Animation.currentTime : holdTime`
- if `currentTime` and `startTime` are not `null`:
   - if `playbackRate > 0 && currentTime >= endTime`, set `holdTime` to `currentTime` if `didSeek`, otherwise to `previousCurrentTime === null ? endTime : Math.max(previousCurrentTime, endTime)`
   - else if `playbackRate < 0` and `currentTime <= 0`, set `holdTime` to `currentTime` if `didSeek`, otherwise to `previousCurrentTime === null ? 0 : Math.min(previousCurrentTime, 0)`
   - else if `playbackRate !== 0`, set `startTime` to `timestamp - (holdTime / playbackRate)` if `didSeek`, and set `holdTime` to `null`

> 3. Set the previous current time of animation be the result of calculating its current time.
> 4. Let current finished state be true if the play state of animation is finished. Otherwise, let it be false.
> 5. If current finished state is true and the current finished promise is not yet resolved[...]:
>    1. Let finish notification steps refer to [...]:
>       1. If animation’s play state is not equal to finished, abort these steps.
>       2. Resolve animation’s current finished promise [...].
>    2. If synchronously notify is true, cancel any queued microtask to run the finish notification steps for this animation, and run the finish notification steps immediately.
>
>       Otherwise, if synchronously notify is false, queue a microtask to run finish notification steps for animation unless there is already a microtask queued to run those steps for animation.
> 6. If current finished state is false and animation’s current finished promise is already resolved, set animation’s current finished promise to a new promise [...].

**Difference:** all removed substeps of step 5.1 are related to emitting animation events, ie. handled with `Animation.onfinish` and `Animation.oncancel` (not implemented), thus they will be ignored.

**Difference/translation:**
- set `previousCurrentTime` to `currentTime`
- if `playState === 'finished' && !Animation.finished.isResolved`
  - if `sync`, `cancelFinishMicrotask() && resolver.resolver(animation)` if `!Animation.finished.isResolved`
  - else `finishMicrotask(() => playState === 'finished' && resolver.resolver()`
- else if `playState !== 'finished' && Animation.finished.isResolved`, set `finished` to `createFinishedPromise()`

> Typically, notification about the finished state of an animation is performed asynchronously.
>
> [...]
>
> The one exception to this asynchronous behavior is when the finish an animation procedure is performed (typically by calling the finish() method). [...]

**Comment/translation:** `Animation.finish()` is the only method that `update()` with its `sync` parameter set to `true`.

#### Finishing an animation

https://drafts.csswg.org/web-animations/#pausing-an-animation-section

> An animation can be advanced to the natural end of its current playback direction by using the procedure to finish an animation [...]:
> 1. If animation’s effective playback rate is zero, or if animation’s effective playback rate > 0 and target effect end is infinity, throw an "InvalidStateError" DOMException and abort these steps.
> 2. Apply any pending playback rate to animation.
> 3. [...] If playback rate > 0, let limit be target effect end [...] otherwise [...] zero.
> 4. Silently set the current time to limit.
> 5. If animation’s start time is unresolved and animation has an associated active timeline, let the start time be the result of evaluating timeline time - (limit / playback rate) where timeline time is the current time value of the associated timeline.
> 6. If there is a pending pause task and start time is resolved,
>    1. Let the hold time be unresolved.
>
>       Typically the hold time will already be unresolved except in the case when the animation was previously idle.
>    2. Cancel the pending pause task.
>    3. Resolve the current ready promise [...].
> 7. If there is a pending play task and start time is resolved, cancel that task and resolve the current ready promise [...].
> 8. Run the procedure to update an animation’s finished state for animation with the did seek flag set to true, and the synchronously notify flag set to true.

**Translation:** (in `Animation.finish()`)
- if `playbackRate === 0`, or if `playbackRate > 0 && endTime === Infinity`, `return error(errors.INVALID_STATE_FINISH)`
- set `silent` to `true` and `Animation.currentTime` to `playbackRate > 0 ? endTime : 0`, then set `silent` to `false`
- if `startTime === null`, set `startTime` to `timelineTime - (currentTime / playbackRate)`
- if `pendingTask === 'paused' && startTime !== null`, set `holdTime` to `null` and `cancelAnimationFrame(pendingTaskId)`
- if `pendingTask === 'play' && startTime !== null`, `cancelAnimationFrame(pendingTaskId)`
- `update(true, true)`

-> currently: step 5 replaces `timelineTime` with *now* when unresolved, otherwise it is coerced to `0` with `Animation.finish()`

-> alternative: ?

#### Canceling an animation

https://drafts.csswg.org/web-animations/#canceling-an-animation-section

> An animation can be canceled which causes the current time to become unresolved hence removing any effects caused by the target effect.
>
> The procedure to cancel an animation for animation is as follows:
> 1. If animation’s play state is not idle, perform the following steps:
>    1. Run the procedure to reset an animation’s pending tasks on animation.
>    2. Reject the current finished promise with a DOMException named "AbortError".
>    3. Let current finished promise be a new promise [...].
>
>    [...]
> 2. Make animation’s hold time unresolved.
> 3. Make animation’s start time unresolved.

**Difference:** steps 1.4 and following are related to emitting events, thus they will be ignored (as noted before).

**Translation:** (in `Animation.cancel()`)
- if `playState !== idle`, run the [procedure to reset an animation's pending task](#setting-the-target-effect-of-an-animation), `resolver.reject(new DOMException('AbortError'))`, and set `finished` to `createFinishedPromise()`
- set `holdTime` and `startTime` to `null`.

#### Speed control

https://drafts.csswg.org/web-animations/#speed-control

> Animations have a playback rate that provides a scaling factor from the rate of change of the associated timeline’s time values to the animation’s current time. The playback rate is initially 1.
>
> Setting an animation’s playback rate to zero effectively pauses the animation (however, the play state does not necessarily become paused).
>
> [...]

**Comment/difference:** this section is related to update `playbackRate` in a way that doesn't prevent *the process or thread running the animation [to] synchronize with the process or thread performing the update*, but there will be only the main thread, thus it can be ignored.

#### Reversing an animation

https://drafts.csswg.org/web-animations/#reversing-an-animation-section

> The procedure to reverse an animation [...] is as follows:
> 1. If there is no timeline associated with animation, or the associated timeline is inactive throw an "InvalidStateError" DOMException and abort these steps.
> 2. Let original pending playback rate be animation’s pending playback rate.
> 3. Let animation’s pending playback rate be the additive inverse of its effective playback rate (i.e. -effective playback rate).
> 4. Run the steps to play an animation for animation [...].
>
> If the steps to play an animation throw an exception, set animation’s pending playback rate to original pending playback rate and propagate the exception.

**Difference/translation:** in `Animation.reverse()`
- set `playbackRate` to `-playbackRate`
- `try { Animation.play() } catch (e) { playbackRate = -playbackRate; throw e }`

-> the first step can't be reproduced (see below)

-> `Error: Animation with null timeline is not supported` is thrown using the polyfill

```js
const keyframes = new KeyframeEffect(element, { opacity: [0, 1] }, { duration: 1 })
const animation = new Animation(keyframes, null)

try {
    animation.reverse()
} catch (e) {
    // Nope
    console.log('error')
}
```

#### Play states

https://drafts.csswg.org/web-animations/#play-states

> The play state of animation, animation, at a given moment is the state corresponding to the first matching condition from the following:
>
> - [...] the current time of animation is unresolved, and animation does not have either a pending play task or a pending pause task,
>
>   → idle
> - [...] animation has a pending pause task, or both the start time of animation is unresolved and it does not have a pending play task,
>
>   → paused
> - [...] current time is resolved and either [...] animation’s effective playback rate > 0 and current time ≥ target effect end; or animation’s effective playback rate < 0 and current time ≤ 0,
>
>   → finished
> - Otherwise,
>
>   → running

**Translation:** (in the getter of `Animation.playState`)
- if `currentTime === null && !pendingTask`, `return 'idle'`
- else if `pendingTask === 'pause'` or `startTime === null && pendingTask !== 'play'`, `return 'paused'`
- else if `currentTime !== null && (playbackRate > 0 && currentTime >= endTime) || (playckbackRate < 0 && currentTime <= 0)`, `'return finished'`
- else `return 'running'`

### Animation effect

#### Relationship between animation effects and animations

https://drafts.csswg.org/web-animations/#animation-effects-and-animations

> The target effect of an animation, if set, is a type of animation effect.

**Translation:** an *animation effect* is a *target effect*.

#### Types of animation effects

https://drafts.csswg.org/web-animations/#types-of-animation-effects

> This specification defines a single type of animation effect: keyframe effects.

**Translation:** an *animation effect* and a *target effect* are described by `Keyframes`.

#### The active interval

https://drafts.csswg.org/web-animations/#the-active-interval

> Animation effects define an active interval which is the period of time during which the effect is scheduled to produce its effect [...].
>
> The lower bound of the active interval is defined by the start delay.
>
> The start delay of an animation effect is a signed offset from the start time [...].
>
> The length of the active interval is called the active duration, the calculation of which is defined in [Calculating the active duration](#Calculating-the-active-duration).
>
> The end time of an animation effect is the result of evaluating max(start delay + active duration + end delay, 0).

**Translation:** in the constructor of `Animation`, set `endTime` to `Math.max(delay + activeDuration + endDelay, 0)`.

#### Local time

https://drafts.csswg.org/web-animations/#local-time-section

> The local time of an animation effect at a given moment is [...]: if the animation effect is associated with an animation, the local time is the current time of the animation, otherwise, the local time is unresolved.

**Difference/translation:** in `apply()`, set `localTime` to `currentTime`.

#### Animation effect phases and states

https://drafts.csswg.org/web-animations/#animation-effect-phases-and-states

> At a given moment, an animation effect may be in one of three possible phases. If an animation effect has an unresolved local time it will not be in any phase.
>
> [...]
>
> In addition to these phases, an animation effect may also be described as being in one of several overlapping states.

> Determining the phase of an animation effect requires the following definitions:
> - **animation direction:** ‘backwards’ if the effect is associated with an animation and the associated animation’s playback rate is less than zero; in all other cases, the animation direction is ‘forwards’.
> - **before-active boundary time:** max(min(start delay, end time), 0)
> - **active-after boundary time:** max(min(start delay + active duration, end time), 0)

**Translation:** (in `apply()`)
- set `animationDirection` to `playbackRate < 0 ? 'backwards' : 'forwards'`
- set `beforeActive` to `Math.max(Math.min(delay, endTime), 0)`
- set `activeAfter` to `Math.max(Math.min(delay + activeDuration, endTime), 0)`

> An animation effect is in the before phase [...]:
> 1. the local time is less than the before-active boundary time, or
> 2. the animation direction is ‘backwards’ and the local time is equal to the before-active boundary time.
>
> An animation effect is in the after phase [...]:
> 1. the local time is greater than the active-after boundary time, or
> 2. the animation direction is ‘forwards’ and the local time is equal to the active-after boundary time.
>
> An animation effect is in the active phase and it is not in either the before phase nor the after phase.

**Translation:** (in `apply()`)
- if `localTime < beforeActive || (animationDirection === 'backwards' && localTime === beforeActive)`, set `currentPhase` to `'before'`
- else if `localTime > activeAfter || (animationDirection === 'forwards' && localTime === activeAfter`, set `currentPhase` to `'after'`
- else set `currentPhase` to `'active'`.

> An animation effect is in play if [...]:
> 1. the animation effect is in the active phase, and
> 2. the animation effect is associated with an animation that is not finished.
>
> An animation effect is current if [...]:
> - the animation effect is in play, or
> - the animation effect is associated with an animation with a playback rate > 0 and the animation effect is in the before phase, or
> - the animation effect is associated with an animation with a playback rate < 0 and the animation effect is in the after phase.
>
> An animation effect is in effect if its active time, as calculated according to the [procedure in calculating the active time](#Calculating-the-active-time) is not unresolved.

**Translation:** (in `apply()`, after computing `activeTime`, specified later)
- initialize `currentStates` to `[]`
- if `currentPhase === 'active' && playState !== 'finished'`, push `'in play'` in `currentStates`
- if `currentStates.includes('in play') || (playbackRate > 0 && currentPhase === 'before') || (playbackRate < 0 && currentPhase === 'after')`, push `'current'` in `currentStates`
- else if `activeTime !== null`, push `'in effect'` in `currentStates`

### Fill behavior

https://drafts.csswg.org/web-animations/#fill-behavior

> The effect of an animation effect when it is not in play is determined by its fill mode.

> The normative definition of these modes is incorporated in the calculation of the active time in [Calculating the active time](#Calculating-the-active-time).

#### Fill modes

https://drafts.csswg.org/web-animations/#fill-modes

> - **none:** the animation effect has no effect when it is not in play.
> - **forwards:** when the animation effect is in the after phase, the animation effect will produce the same iteration progress value as the last moment it is scheduled to be in play.
>   For all other times that the animation effect is not in play, it will have no effect.
> - **backwards:** when the animation effect is in the before phase, the animation effect will produce the same iteration progress value as the earliest moment that it is scheduled to be in play.
>   For all other times that the animation effect is not in play, it will have no effect.
> - **both:** when the animation effect is in its before phase, backwards fill behavior is used.
>   When the animation effect is in its after phase, forwards fill behavior is used.

### Repeating

#### Iteration intervals

https://drafts.csswg.org/web-animations/#iteration-intervals

> - **Iteration duration:** the time taken for a single iteration of the animation effect to complete.

**Comment:** `iterationDuration === Options.duration`, ie. without incorporating `playbackRate`.

#### Controlling iteration

https://drafts.csswg.org/web-animations/#controlling-iteration

> The number of times an animation effect repeats is called its iteration count. The iteration count is a real number greater than or equal to zero. The iteration count may also be positive infinity to represent that the animation effect repeats indefinitely.

> In addition to the iteration count, animation effects also have an iteration start property which specifies an offset into the series of iterations at which the animation effect should begin. The iteration start is a finite real number greater than or equal to zero.

### Core animation effect calculations

#### Calculating the active duration

https://drafts.csswg.org/web-animations/#calculating-the-active-duration

> active duration = iteration duration × iteration count

**Translation:** in the constructor of `Animation`, set `activeDuration` to `Options.duration * iterations`.

#### Transforming the local time

##### Calculating the active time

https://drafts.csswg.org/web-animations/#calculating-the-active-time

> The active time is [...]:
> - If the animation effect is in the before phase [...]:
>   - If the fill mode is backwards or both, return the result of evaluating max(local time - start delay, 0).
>   - Otherwise, return an unresolved time value.
> - If the animation effect is in the active phase, return the result of evaluating local time - start delay.
> - If the animation effect is in the after phase [...]:
>   - If the fill mode is forwards or both, return the result of evaluating max(min(local time - start delay, active duration), 0).
>   - Otherwise, return an unresolved time value.
> Otherwise (the local time is unresolved), return an unresolved time value.

**Translation:** (in `apply()`)
- if `currentPhase === 'before'`, set `activeTime` to `(animationDirection === 'backwards' || animationDirection === 'both') ? Math.max(localTime - delay, 0) : null`
- else if `currentPhase === 'active'`, set `activeTime` to `localTime - delay`
- else if `currentPhase === 'after'`, set `activeTime` to `(animationDirection === 'forwards' || animationDirection === 'both') ? Math.max(Math.min(localTime - delay, activeDuration), 0) : null`
- else set `activeTime` to `null`

##### Calculating the overall progress

https://drafts.csswg.org/web-animations/#calculating-the-overall-progress

> The overall progress describes the number of iterations that have completed (including partial iterations) and is defined as follows:
> 1. If the active time is unresolved, return unresolved.
> 2. Calculate an initial value for overall progress based on the first matching condition from below:
>   - If the iteration duration is zero,
>
>     If the animation effect is in the before phase, let overall progress be zero, otherwise, let it be equal to the iteration count.
>   - Otherwise, let overall progress be the result of calculating active time / iteration duration.
> 3. Return the result of calculating overall progress + iteration start.

**Translation:** (in `apply()`)
- if `activeTime === null`, set `overallProgress` to `null`
- else if `duration === 0`, set `overallProgress` to `(currentPhase === 'before' ? 0 : iterations) + iterationStart`
- else set `overallProgress` to `(activeTime / duration) + iterationStart`.

##### Calculating the simple iteration progress

https://drafts.csswg.org/web-animations/#calculating-the-simple-iteration-progress

> The simple iteration progress is a fraction of the progress through the current iteration that ignores transformations to the time introduced by the playback direction or timing functions applied to the effect, and is calculated as follows:
> 1. If the overall progress is unresolved, return unresolved.
> 2. If overall progress is infinity, let the simple iteration progress be iteration start % 1.0, otherwise, let the simple iteration progress be overall progress % 1.0.
> 3. If all of the following conditions are true,
>    - the simple iteration progress calculated above is zero, and
>    - the animation effect is in the active phase or the after phase, and
>    - the active time is equal to the active duration, and
>    - the iteration count is not equal to zero.
>
>      let the simple iteration progress be 1.0.
> 4. Return simple iteration progress.

**Translation:** (in `apply()`)
- if `overallProgress === null`, set `iterationProgress` to `null`
- else set `iterationProgress` to `overallProgress === Infinity ? iterationStart % 1 : overallProgress % 1` (ie. their decimal number between 0 and 1), then if `iterationProgress === 0 && (currentPhase === 'active' || currentPhase === 'after) && activeTime === activeDuration && iterations !== 0`, set `iterationProgress` to `1`

#### Calculating the current iteration

> https://drafts.csswg.org/web-animations/#calculating-the-current-iteration

> The current iteration can be calculated using the following steps:
> 1. If the active time is unresolved, return unresolved.
> 2. If the animation effect is in the after phase and the iteration count is infinity, return infinity.
> 3. If the simple iteration progress is 1.0, return floor(overall progress) - 1.
> 4. Otherwise, return floor(overall progress).

**Translation:** (in `apply()`)
- if `activeTime === null`, set `currentIteration` to `null`
- else if `currentPhase === 'after' && iterations === Infinity`, set `currentIteration` to `Infinity`
- else if `iterationProgress === 1`, set `currentIteration` to `Math.floor(overallProgress) - 1`
- else set `currentIteration` to `Math.floor(overallProgress)`.

### Direction control

> The semantics of these [direction] values are incorporated into the calculation of the directed progress which follows.

#### Calculating the directed progress

https://drafts.csswg.org/web-animations/#calculating-the-directed-progress

> The directed progress is [...]:
> 1. If the simple iteration progress is unresolved, return unresolved.
> 2. Calculate the current direction using the first matching condition from the following list:
>    - If playback direction is normal, let the current direction be forwards.
>    - If playback direction is reverse, let the current direction be reverse.
>    - Otherwise,
>      1. let d be the current iteration.
>      2. If playback direction is alternate-reverse increment d by 1.
>      3. If d % 2 == 0, let the current direction be forwards, otherwise let the current direction be reverse. If d is infinity, let the current direction be forwards.
> 3. If the current direction is forwards then return the simple iteration progress.
>
>    Otherwise, return 1.0 - simple iteration progress.

**Translation:** (in `apply()`)
- if `iterationProgress === null`, set `directedProgress` to `null`
- else set `currentDirection` to `(direction === 'normal' || (direction === 'alternate-reverse' && (currentIteration + 1) % 2 === 0))` and `directedProgress` to `currentDirection === 'forwards' ? iterationProgress : (1 - iterationProgress)`

### Time transformations

https://drafts.csswg.org/web-animations/#time-transformations

> Animation effects have one timing function associated with them. The default timing function is the linear timing function.

#### Calculating the transformed progress

https://drafts.csswg.org/web-animations/#calculating-the-transformed-progress

> The transformed progress is [...]:
> 1. If the directed progress is unresolved, return unresolved.
> 2. Calculate the value of the before flag as follows:
>    1. Determine the current direction using the procedure defined in [Calculating the directed progress](#Calculating-the-directed-progress).
>    2. If the current direction is forwards, let going forwards be true, otherwise it is false.
>    3. The before flag is set if the animation effect is in the before phase and going forwards is true; or if the animation effect is in the after phase and going forwards is false.
> 3. Return the result of evaluating the animation effect’s timing function passing directed progress as the input progress value and before flag as the before flag.

**Translation:** (in `apply()`)
- if `directeProgress === null`, set `transformedProgress` to `null`
- else to `easing(directedProgress, (direction === 'forwards' && currentPhase === 'before') || (direction === 'reverse' && currentPhase === 'after'))`

### The iteration progress

https://drafts.csswg.org/web-animations/#the-iteration-progress

> The iteration progress of an animation effect is simply its transformed progress.

## Animation model

### Introduction

https://drafts.csswg.org/web-animations/#introduction-to-the-animation-model

> Given an iteration progress, a current iteration, and an underlying value, an animation effect produces an effect value for each animatable target property by applying the procedures from the animation type appropriate to the property.

### Keyframe effects

#### Keyframes

https://drafts.csswg.org/web-animations/#keyframes-section

> The effect values for a keyframe effect are calculated by interpolating between a series of property values positioned at fractional offsets. Each set of property values indexed by an offset is called a keyframe.

> The offset of a keyframe is a value in the range [0, 1] or the special value null. The list of keyframes for a keyframe effect must be loosely sorted by offset which means that for each keyframe in the list that has a keyframe offset that is not null, the offset is greater than or equal to the offset of the previous keyframe in the list with a keyframe offset that is not null, if any.

> Each keyframe also has a timing function associated with it [...]. The timing function specified on the last keyframe in the list is never applied.

**Comment:** `Keyframes` is a collection of `Keyframe` returned from the [procedure to process a keyframes argument](#Processing-a-keyframes-argument).

#### Calculating computed keyframes

https://drafts.csswg.org/web-animations/#calculating-computed-keyframes

> Before calculating the effect value of a keyframe effect, the property values specified on its keyframes are resolved to computed values, and the offset to use for any keyframes with a null keyframe offset is computed. The result of resolving these values is a set of computed keyframes.

**Difference:** `null` keyframe `offset` will be computed while executing the [procedure to process a keyframes argument](#Processing-a-keyframes-argument) in the constructor of `Animation`, and property values will not be computed using the current CSS values for `Element`.

> The calculated keyframe offsets of a set of keyframe that includes suitable values for each null keyframe offset are referred to as the computed keyframe offsets.

> To produce computed keyframe offsets, we define a procedure to compute missing keyframe offsets that [...]:
> 1. For each keyframe, in keyframes, let the computed keyframe offset of the keyframe be equal to its keyframe offset value.
> 2. If keyframes contains more than one keyframe and the computed keyframe offset of the first keyframe in keyframes is null, set the computed keyframe offset of the first keyframe to 0.
> 3. If the computed keyframe offset of the last keyframe in keyframes is null, set its computed keyframe offset to 1.

**Translation:** in `parseKeyframesOffsets()`, if the first `Keyframe` in a collection of `Keyframes` which defines an `offset` with `null`, replace `null` by `0`.

**Translation:** in `parseKeyframesOffsets()`, if the last `Keyframe` in a collection of `Keyframes` which defines an `offset` with `null`, replace `null` by `1`.

> 4. For each pair of keyframes A and B where A appears before B in keyframes, and A and B have a computed keyframe offset that is not null, and all keyframes between A and B have a null computed keyframe offset [...]:
>     1. Let offset k be the computed keyframe offset of a keyframe k.
>     2. Let n be the number of keyframes between and including A and B minus 1.
>     3. Let index refer to the position of keyframe in the sequence of keyframes between A and B such that the first keyframe after A has an index of 1.
>     4. Set the computed keyframe offset of keyframe to offsetA + (offsetB − offsetA) × index / n.

**Translation:** in `parseKeyframesOffsets()`, for each `Keyframe` in a collection of `Keyframes` which defines an `offset` with `null`, replace `null` by `prevOffset + (nextOffset - prevOffset) * (offsetIndex - prevOffsetIndex) / (nextOffsetIndex - prevOffsetIndex)`.

#### The effect value of a keyframe effect

https://drafts.csswg.org/web-animations/#the-effect-value-of-a-keyframe-animation-effect

> The effect value of a single property referenced by a keyframe effect as one of its target properties, for a given iteration progress, current iteration and underlying value is calculated as follows.
> 1. If iteration progress is unresolved abort this procedure.

**Translation:** in `apply()`, `return` if `iterationProgress === null`.

> 2. Let target property be the longhand property for which the effect value is to be calculated.
> 3. If animation type of the target property is not animatable abort this procedure since the effect cannot be applied.
> 4. Define the neutral value for composition as a value which, when combined with an underlying value using the add composite operation, produces the underlying value.
> 5. Let property-specific keyframes be the result of getting the set of computed keyframes for this keyframe effect.
> 6. Remove any keyframes from property-specific keyframes that do not have a property value for target property.
> 7. If property-specific keyframes is empty, return underlying value.

**Difference:** composite animations are not supported, thus steps 4 and 6 will be ignored (and removed from next steps), as well as step 2 and 3, in order to keep a small file size.

**Translation:** in `apply()`, if `Keyframes.length === 0`, `return`.

> 8. If there is no keyframe in property-specific keyframes with a computed keyframe offset of 0, create a new keyframe with a computed keyframe offset of 0, [...].
> 9. Similarly, if there is no keyframe in property-specific keyframes with a computed keyframe offset of 1, create a new keyframe with a computed keyframe offset of 1 [...].

**Difference:** property values will not be computed using current values (as noted before), thus those steps will be ignored.

> 10. Let interval endpoints be an empty sequence of keyframes.
> 11. Populate interval endpoints by following the steps from the first matching condition from below:
>     - If iteration progress < 0 and there is more than one keyframe in property-specific keyframes with a computed keyframe offset of 0,
Add the first keyframe in property-specific keyframes to interval endpoints.
>     - If iteration progress ≥ 1 and there is more than one keyframe in property-specific keyframes with a computed keyframe offset of 1,
Add the last keyframe in property-specific keyframes to interval endpoints.
>     - Otherwise,
>       1. Append to interval endpoints the last keyframe in property-specific keyframes whose computed keyframe offset is less than or equal to iteration progress and less than 1. If there is no such keyframe (because, for example, the iteration progress is negative), add the last keyframe whose computed keyframe offset is 0.
>       2. Append to interval endpoints the next keyframe in property-specific keyframes after the one added in the previous step.

**Translation:** (in `apply()`)
- initialize `intervalEndpoints` with `[]`
- if `iterationProgress < 0 && Keyframes.filter(k => k.offset === 0).length > 1`, push `Keyframes[0]` in `intervalEndpoints`
- else if `iterationProgress >= 1 && Keyframes.filter(k => k.offset === 1).length > 1`, push `Keyframes[Keyframes.length - 1]` in `intervalEndpoints`
- else set `fromIndex` to `Keyframes.findIndex(k => k.offset <= iterationProgress && k.offset < 1)` or to `Keyframes.findIndex(k => k.offset === 0)` if `fromEndpoint === -1`, then push `Keyframes[fromIndex]` and `Keyframes[fromIndex + 1]`.

> 12. For each keyframe in interval endpoints, if keyframe has a composite operation [...].
> 13. If there is only one keyframe in interval endpoints return the property value of target property on that keyframe.
> 14. Let start offset be the computed keyframe offset of the first keyframe in interval endpoints.
> 15. Let end offset be the computed keyframe offset of last keyframe in interval endpoints.
> 16. Let interval distance be the result of evaluating (iteration progress - start offset) / (end offset - start offset).
> 17. Let transformed distance be the result of evaluating the timing function associated with the first keyframe in interval endpoints passing interval distance as the input progress.
> 18. Return the result of applying the interpolation procedure defined by the animation type of the target property, to the values of the target property specified on the two keyframes in interval endpoints taking the first such value as Vstart and the second as Vend and using transformed distance as the interpolation parameter p.

**Difference:** step 13 will be ignored.

**Translation:** (in `apply()`)
- set `startOffset` to `intervalEndpoints[0].offset`
- set `endOffset` to `intervalEndpoints[1].offset`
- set `intervalDistance` to `(iterationProgress - startOffset) / (endOffset - startOffset)`
- set `transformedDistance` to `intervalEndpoints[0](intervalDistance)`
- for each `Property` in `Keyframe`, apply `(intervalEndpoints[1][Property] - intervalEndpoints[0][Property]) * transformedDistance`

## Programming interface

### The Animation interface

> **Constructor**
>
> Creates a new Animation object using the following procedure.
> 1. Let animation be a new Animation object.
> 2. Run the procedure to set the timeline of an animation [...].
> 3. Run the procedure to set the target effect of an animation on animation passing source as the new effect.

### The KeyframeEffect interface

#### Processing a keyframes argument

https://drafts.csswg.org/web-animations/#processing-a-keyframes-argument

> The procedure to process a keyframe-like object takes two arguments, an ECMAScript object, keyframe input, and an allow lists boolean flag, and returns a map from either property names to DOMString values if allow lists is false, or from property names to sequences of DOMString values otherwise, using the following procedure:
> 1. Run the procedure to convert an ECMAScript value to a dictionary type with keyframe input as the ECMAScript value, and the dictionary type depending on the value of the allow lists flag as follows:
>    - If allow lists is true, use the following dictionary type:
>
>      `{ offset: double|[double] = [], easing: DOMString|[DOMString] = [], composite: CompositeOperationOrAuto|[CompositeOperationOrAuto] = [] }`
>    - Otherwise, use the following dictionary type:
>
>      `{ offset: double = null, easing: DOMString = 'linear', composite: CompositeOperationOrAuto = 'auto' }`
>
>    Store the result of this procedure as keyframe output.
> 2. Build up a list of animatable properties [...].
> 3. Let input properties be the result of calling the EnumerableOwnNames operation with keyframe input as the object.
> 4. Make up a new list animation properties that consists of all of the properties that are in both input properties and animatable properties [...].
> 5. Sort animation properties in ascending order [...].
> 6. For each property name in animation properties,
>    1. Let raw value be the result of calling the [[Get]] internal method on keyframe input, with property name [...].
>    2. Check the completion record of raw value.
>    3. Convert raw value to a DOMString or sequence of DOMStrings property values as follows:
>       - If allow lists is true,
>
>         Let property values be the result of converting raw value to IDL type (DOMString or sequence<DOMString>) [...].
>
>         If property values is a single DOMString, replace property values with a sequence of DOMStrings with the original value of property values as the only element.
>       - Otherwise, let property values be the result of converting raw value to a DOMString [...].
>    4. Calculate the normalized property name [...].
>    5. Add a property to keyframe output with normalized property name as the property name, and property values as the property value.
> 7. Return keyframe output.

-> parseKeyframe()

> The procedure to process a keyframes argument [...is]:
> 1. If object is null, return an empty sequence of keyframes.
> 2. Let processed keyframes be an empty sequence of keyframes.
> 3. Let method be the result of GetMethod(object, @@iterator).
> 4. Check the completion record of method.
> 5. Perform the steps corresponding to the first matching condition from below,
>    - If method is not undefined, [...for each nextItem of keyframes] append to processed keyframes the result of running the procedure to process a keyframe-like object passing nextItem as the keyframe input and with the allow lists flag set to false.
>    - Otherwise,
>      1. Let property-indexed keyframe be the result of running the procedure to process a keyframe-like object passing object as the keyframe input and with the allow lists flag set to true.
>      2. For each member, m, in property-indexed keyframe, perform the following steps:

-> parseKeyframes()

**Translation:** in `parseKeyframes()`, if `Array.isArray(keyframesCollection)`, assign to `keyframes` the result of executing `parseKeyframe()` to each `keyframe` of `keyframesCollection`, else assign to `keyframes` the result of executing `parseKeyframesRecord(keyframesRecord)`, which should execute the steps below for each `Object.entries(keyframesRecord)`.

> 1. Let property name be the key for m.
> 2. If property name is “composite”, or “easing”, or “offset”, skip the remaining steps in this loop and continue from the next member in property-indexed keyframe after m.
> 3. Let property values be the value for m.
> 4. Let property keyframes be an empty sequence of keyframes.
> 5. For each value, v, in property values perform the following steps:
>    1. Let k be a new keyframe with a null keyframe offset.
>    2. Add the property-value pair, property name → v, to k.
>    3. Append k to property keyframes.
> 6. Apply the procedure to compute missing keyframe offsets to property keyframes.
> 7. Add keyframes in property keyframes to processed keyframes.

**Translation:** (in `parseKeyframes()`)
- if `Property` is `'composite' || 'easing' || 'offset'`, `return`
- for each `value` in `keyframesRecord[Property]`, push `{ Property: value, offset: null }` in `propertyKeyframes`
- assign to `keyframes` the result of executing `parseKeyframesOffsets(propertyKeyframes)` for each `propertyKeyframes`

> 3. Sort processed keyframes by the computed keyframe offset of each keyframe in increasing order.
> 4. Merge adjacent keyframes in processed keyframes when they have equal computed keyframe offsets.

**Translation:** in `parseKeyframes()`, ...

-> currently: replaced with a custom implementation

> 5. Let offsets be a sequence of nullable double values assigned based on the type of the “offset” member of the property-indexed keyframe as follows:
>      - sequence<double?>, the value of “offset” as-is
>      - double?, a sequence of length one with the value of “offset” as its single item, i.e. « offset »
> 6. Assign each value in offsets to the keyframe offset of the keyframe with corresponding position in processed keyframes until the end of either sequence is reached.

-> for each offset in `keyframesRecord.offset` (coerce it if required), assign `keyframes[index].offset = offset`

> 7. Let easings be a sequence of DOMString values assigned based on the type of the “easing” member of the property-indexed keyframe as follows:
>      - sequence<DOMString>, the value of “easing” as-is
>      - DOMString, a sequence of length one with the value of “easing” as its single item, i.e. « easing »
> 8. If easings is an empty sequence, let it be a sequence of length one containing the single value “linear”, i.e. « "linear" ».
> 9. If easings has fewer items than processed keyframes, repeat the elements in easings successively starting from the beginning of the list until easings has as many items as processed keyframes.
>
>      For example, if processed keyframes has five items, and easings is the sequence « "ease-in", "ease-out" », easings would be repeated to become « "ease-in", "ease-out", "ease-in", "ease-out", "ease-in" ».
> 10. If easings has more items than processed keyframes, store the excess items as unused easings.
> 11. Assign each value in easings to a property named “easing” on the keyframe with the corresponding position in processed keyframes until the end of processed keyframes is reached.
> 12. If the “composite” member of the property-indexed keyframe is not an empty sequence: [...].

-> same as for `offset` (steps 5 and 6)

> 6. If processed keyframes is not loosely sorted by offset, throw a TypeError and abort these steps.
> 7. If there exist any keyframe in processed keyframes whose keyframe offset is non-null and less than zero or greater than one, throw a TypeError and abort these steps.

-> currently: ignored and will probably always be

> 8. For each frame in processed keyframes, perform the following steps:
>    1. For each property-value pair in frame, parse the property value using the syntax specified for that property. [...]
>    2. Let the timing function of frame be the result of parsing the “easing” property on frame using the CSS syntax defined for the easing member of the EffectTiming dictionary.
>
>       If parsing the “easing” property fails, throw a TypeError and abort this procedure. [...]
> 9. Parse each of the values in unused easings using the CSS syntax defined for easing member of the EffectTiming interface, and if any of the values fail to parse, throw a TypeError and abort this procedure.

### The Animatable interface mixin

https://drafts.csswg.org/web-animations/#the-animatable-interface-mixin

> **Animation animate(keyframes, options)**
>
> Performs the following steps:
> 1. Let target be the object on which this method was called.
> 2. Construct a new KeyframeEffect object [...]
>
>    If the above procedure causes an exception to be thrown, propagate the exception and abort this procedure.
> 3. Construct a new Animation object [...] by using the same procedure as the Animation() constructor [...].
> 4. If options is a KeyframeAnimationOptions object, assign the value of the id member of options to animation’s id attribute.
> 5. Run the procedure to play an animation for animation [...].
> 6. Return animation.

> **getAnimations(options)**
>
> Returns the set of relevant Animation objects that contain at least one animation effect whose target element is this object [...].
>
> An animation is relevant if its target effect is current or in effect, and its replace state is not removed.

## Extensions to the DocumentOrShadowRoot interface mixin

> **getAnimations()**
>
> Returns the set of relevant Animation objects that have an associated target effect whose target element is a descendant of the document or shadow root on which this method is called.

## Model liveness

> **The time passed to a requestAnimationFrame callback will be equal to document.timeline.currentTime**. Since HTML’s event loop processing model defines that the procedure to update animations and send events is performed prior to running animation frame callbacks, and since the time passed to such callbacks is the same *now* timestamp is passed to both procedures, the current time of a the default document timeline should match the time passed to requestAnimationFrame.

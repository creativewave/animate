[![CircleCI](https://circleci.com/gh/creativewave/animate.svg?style=svg)](https://circleci.com/gh/creativewave/animate)

# animate

1. [About](#about)
2. [Installation](#installation)
3. [Example](#example)
4. [API](#API)

## About

`animate` is a JavaScript implementation of [Web Animations](https://drafts.csswg.org/web-animations-1/) with [extra features](#extra-features).

<details>

  <summary>The Web Animations specification is mainly intended for browsers to implement native animations, so this library has a few differences noted below.</summary>

  It performances animations animations on the main thread by applying effects on the `style` attribute of the animated element, instead of in a separated thread (the compositor) at a [level of the CSS cascade](https://www.w3.org/TR/css-cascade-5/#cascading-origins) that is only accessible by the user agent.

  For this reason, for partial keyframes, the base value (the original value in the absence of animations) is resolved once before playing the animation and is always used as the underlying value at each frame.

  For performance and technical reasons, keyframe property values are not resolved so they should use the same syntax and units (at the corresponding places) between keyframes.

  `will-change` is not [automatically set](https://drafts.csswg.org/web-animations-1/#side-effects-section) on the animated element (since v0.5.5): at best, the number of frames per second does not improve in Chrome and Firefox and decreases with the number of animated elements.

</details>

Each write on `Element` is delayed and batched at the end of the frame, to prevent style/layout recalculations.

<details>

  <summary>Support table</summary>

  **`Animation`**

  | Name               | Status | Notes |
  | ------------------ | ------ | ----- |
  | **Properties**     |        |       |
  | currentTime        | ✅    |       |
  | effect             | ✅    |       |
  | finished           | ✅    |       |
  | id                 | ✅    |       |
  | pending            | ✅    |       |
  | playState          | ✅    |       |
  | playbackRate       | ✅    |       |
  | ready              | ✅    |       |
  | replaceState       | ❌    | Will not be implemented. |
  | startTime          | ✅    |       |
  | timeline           | ✅    |       |
  | **Methods**        |        |       |
  | cancel             | ✅    |       |
  | commitStyles       | ❌    | Will not be implemented. |
  | finish             | ✅    |       |
  | oncancel           | ✅    |       |
  | onfinish           | ✅    |       |
  | onremove           | ❌    | Will not be implemented. |
  | pause              | ✅    |       |
  | persist            | ❌    | Will not be implemented. |
  | play               | ✅    |       |
  | reverse            | ✅    |       |
  | updatePlaybackRate | ❌    | Will not be implemented. |

  **`KeyframeEffect`**

  | Name              | Status | Notes |
  | ----------------- | ------ | ----- |
  | **Properties**    |        |       |
  | target            | ✅    |       |
  | pseudoElement     | ❌    | Will not be implemented. |
  | composite             |        |       |
  | - `replace` (default) | ✅    |       |
  | - `add`               | ❌    | May be implemented later. |
  | - `accumulate`        | ❌    | May be implemented later. |
  | **Methods**       |        |       |
  | getTiming         | ✅    |       |
  | getComputedTiming | ✅    |       |
  | updateTiming      | ✅    |       |
  | getKeyframes      | ✅    |       |
  | setKeyframes      | ✅    |       |

  **Keyframes argument**

  | Name                  | Status | Notes |
  | --------------------- | ------ | ----- |
  | composite             |        |       |
  | - `replace` (default) | ✅    |       |
  | - `add`               | ❌    | May be implemented later. |
  | - `accumulate`        | ❌    | May be implemented later. |
  | computedOffset        | ✅    |       |
  | easing                | ✅    |       |
  | offset                | ✅    |       |

  **Options**

  | Name                  | Status | Notes |
  | --------------------- | ------ | ----- |
  | composite             |        |       |
  | - `replace` (default) | ✅    |       |
  | - `add`               | ❌    | May be implemented later. |
  | - `accumulate`        | ❌    | May be implemented later. |
  | delay                 | ✅    |       |
  | direction             | ✅    |       |
  | duration              | ✅    |       |
  | easing                | ✅    |       |
  | endDelay              | ✅    |       |
  | fill                  | ✅    |       |
  | id                    | ✅    |       |
  | iterations            | ✅    |       |
  | iterationStart        | ✅    |       |
  | pseudoElement         | ❌    | Will not be implemented. |

</details>

### Extra features

1. `easing` can be assigned a custom timing function that would be cumbersome to implement with native easing functions (eg. multiple bounces)
2. keyframe properties can be assigned an object (`PropertyController`) defining how to apply the interpolated value on the animated element, to animate a CSS property that cannot be animated yet, an attribute or property of an HTML element (eg. `innerHTML`), to stagger values from a path definition, etc…
3. `MotionPathEffect` is a temporary alternative to `offset-path: url(#path)`, which is not supported in any brower yet (**update:** it is now supported in all 3 major browsers so this feature will be removed in the next minor version).

Demos:

- [Playground](https://codepen.io/creativewave/full/XWWRoWv)
- [Animating the `y` attribute of a `<pattern>`](https://codepen.io/creative-wave/pen/pooqymX)
- [Morphing the `d`efinition of a `<path>`](https://codepen.io/creativewave/pen/OJNqvqQ)
- [Morphing the `d`efinition of a `<path>` (stagger)](https://codepen.io/creative-wave/pen/yLLZbME)
- [Moving an SVG element along a path](https://codepen.io/creativewave/pen/GRgpOvO)

## Installation

`npm i @cdoublev/animate`

`@cdoublev/animate` is built to run in the current "active LTS" version of NodeJS, which means it should be transpiled with your application using its own targets.

## Example

All-in-one example:

```js
import animate, { setProperty as set } from '@cdoublev/animate'

const keyframes = [
  {
    opacity: 1,
    transform: 'translateX(0px) scale(0.5)',
    innerText: { set, value: 0 },
  },
  {
    opacity: 0,
    transform: 'translateX(100px) scale(1)',
    innerText: { set, value: 100 },
  },
]
const bounce = t => ((0.04 - (0.04 / t)) * Math.sin(25 * t)) + 1
const options = { duration: 2000, easing: bounce )

animate(element, keyframes, options).finished.then(() => console.log('done'))
```

## API

```js
import animate from '@cdoublev/animate'

const target = document.getElementById('target')
const keyframes = { color: ['red', 'green'] }
const options = { duration: 1000 }

// animate :: (Element -> Keyframes|MotionPath -> Options?|Number?) -> Animation
const target = animate(target, keyframes, 1000)
```

`animate(target, keyframes, options)` is a shorthand of:

```js
import { Animation, KeyframeEffect } from '@cdoublev/animate'

const target = document.getElementById('target')
const keyframes = { color: ['red', 'green'] }
const options = { duration: 1000 }
const effect = new KeyframeEffect(target, keyframes, options)
const animation = new Animation(effect)

animation.play()
```

It also provides `setAttribute`, `setProperty`, `setStyle`, as named exports.

### Arguments

#### Element (required)

`Element` should be a reference of the DOM element to animate.

#### Keyframes|MotionPath (required)

`MotionPath` should be a reference of a `SVGGeometryElement` (eg. `<path>`, `<circle>`, `<rect>`, etc…) for a `MotionPathEffect` along which to move `Element`.

`Keyframes` should define the properties and values of a `KeyframeEffect`. There are two formats of keyframes (learn more on [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API/Keyframe_Formats)):

**1. Canonical (aka array-form):**

```
Keyframes => [Keyframe]
Keyframe => {
  [Property]: a,
  easing?: String|Function,
  offset?: Number|String,
}
```

**2. Alternative (aka object-form):**

```
Keyframes => {
  [Property]: [a],
  easing?: [String|Function]|String|Function,
  offset?: [Number|String]|Number|String,
}
```

`a` should be an animated value. If it is a `Number` or a `String` containing numeric values (including hexadecimal values), it will be automatically interpolated and applyied on `Element.style`. Otherwise, it should be a `PropertyController`:

```
PropertyController => {
  interpolate?: (From -> To -> Time) -> a,
  set?: (Element -> Property -> a) -> void,
  value: a|[a],
}
From => To => a
```

`PropertyController` should define a function to interpolate and/or to apply (set) animated values on `Element`.

`interpolate` should return the intermediate `value` at the current relative `Time`, which will be a `Number` relative to the animation's duration, starting from `0` and ending at `1`. If not defined, the default function will interpolate `value` if it is a `Number` or a `String` containing numeric values (including hexadecimal values).

`set` should be one of the following named exports of this package:

- `setStyle` (default): to set the animated value as a CSS property of `Element.style`
- `setProperty`: to set the animated value as a property of `Element`
- `setAttribute`: to set the animated value as an attribute on `Element`

An `Array` can be used for `value` in object-form keyframes, to use a shorter syntax:

```js
const keyframes1 = {
  x: [{ set: setAttribute, value: 0 }, { set: setAttribute, value: 1 }]
}
// Same as:
const keyframes2 = {
  x: { set: setAttribute, value: [0, 1] },
}
```

#### Options|Number (optional)

`Options` should be either a `Number` representing the animation's duration (in milliseconds), or an `Object` containing one or more timing properties (learn more on [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Element/animate)).

`easing` can be assigned a function whose type should be `Time -> Number`. It is supposed to return `0` when `Time` is `0` and `1` when `Time` is `1`.

**Only for a `MotionPathEffect`:**

- `rotate` can be set to `true` to rotate `Element` towards the direction of `MotionPath`
- `anchor` can be set to a pair of SVG coordinates `[Number, Number]` to offset `Element` after applying the automatic transformation to center it on the start of `MotionPath`

### Return value

#### Animation

Learn more on [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Animation).

## TODO

- Performances: measure and improve

[![CircleCI](https://circleci.com/gh/creativewave/animate.svg?style=svg)](https://circleci.com/gh/creativewave/animate)

# animate

1. [About](#about)
2. [Installation](#installation)
3. [Example](#example)
4. [API](#API)

## About

`animate` is an alternative to the Web Animation API ([WAAPI](http://drafts.csswg.org/web-animations/)), which is not supported in all browsers yet ([can I use it?](https://caniuse.com/#feat=web-animation)), with some [extra features](#extra-features).

`animate` conforms to the [specification of the WAAPI](https://drafts.csswg.org/web-animations/), except for the properties and methods listed below.

<details>

  <summary>Support table</summary>

  | Property/method          | Status | Notes |
  | ------------------------ | ------ | ----- |
  | **Animation properties** |        |       |
  | currentTime              | ✅    |       |
  | effect                   | ✅    |       |
  | finished                 | ✅    |       |
  | id                       | ✅    |       |
  | pending                  | ✅    |       |
  | playState                | ✅    |       |
  | playbackRate             | ✅    |       |
  | ready                    | ✅    |       |
  | replaceState             | ❌    | Will not be implemented. |
  | startTime                | ✅    |       |
  | timeline                 | ✅    |       |
  | **Animation methods**    |        |       |
  | cancel                   | ✅    |       |
  | finish                   | ✅    |       |
  | oncancel                 | ✅    |       |
  | onfinish                 | ✅    |       |
  | onremove                 | ❌    | Will not be implemented. |
  | pause                    | ✅    |       |
  | play                     | ✅    |       |
  | reverse                  | ✅    |       |
  | updatePlaybackRate       | ❌    | Will not be implemented. |
  | **Keyframes**            |        |       |
  | composite                |        |       |
  | - `replace` (default)    | ✅    |       |
  | - `add`                  | ❌    | Will not be implemented. |
  | - `accumulate`           | ❌    | Will not be implemented. |
  | easing                   | ✅    |       |
  | offset                   | ✅    |       |
  | **Options**              |        |       |
  | composite                |        |       |
  | - `replace` (default)    | ✅    |       |
  | - `add`                  | ❌    | Will not be implemented. |
  | - `accumulate`           | ❌    | Will not be implemented. |
  | delay                    | ✅    |       |
  | direction                | ✅    |       |
  | duration                 | ✅    |       |
  | easing                   | ✅    |       |
  | endDelay                 | ✅    |       |
  | fill                     | ✅    |       |
  | id                       | ✅    |       |
  | iterations               | ✅    |       |
  | iterationStart           | ✅    |       |
  | pseudoElement            | ❌    | Will not be implemented. |
</details>

Each write on `Element` will be delayed and batched at the end of the frame, to prevent style/layout recalculations.

### Extra features

1. `easing` can be assigned a custom timing function like multiple bounces, which would be cumbersome to reproduce using keyframes.
2. Keyframes can have animated values defined with a custom function to interpolate and apply them on the animated element, eg. to stagger values such as a path definition, to animate a CSS property which can't be animated yet (eg. `x` and `y`), to animate an attribute or a property of an HTML element (eg. `innerHTML`), etc…
3. `MotionPathEffect` is a temporary alternative to `offset-path: url(#path)`, which is not supported in any brower yet.

Demos:

- [Playground](https://codepen.io/creativewave/full/XWWRoWv)
- [Animating the `y` attribute of a `<pattern>`](https://codepen.io/creative-wave/pen/pooqymX)
- [Morphing the `d`efinition of a `<path>`](https://codepen.io/creativewave/pen/OJNqvqQ)
- [Morphing the `d`efinition of a `<path>` (stagger)](https://codepen.io/creative-wave/pen/yLLZbME)
- [Moving an SVG element along a path](https://codepen.io/creativewave/pen/GRgpOvO)

## Installation

`npm i @cdoublev/animate`

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

animate(element, keyframes, options).next(() => console.log('done'))
```

## API

```js
// animate :: (Element -> Keyframes|MotionPath -> Options?|Number?) -> Animation
import animate from '@cdoublev/animate'
```

`animate(target, keyframes, options)` is a shortcut for the following:

```js
import { Animation, KeyframeEffect } from '@cdoublev/animate'

const effect = new KeyframeEffect(target, keyframes)
const animation = new Animation(effect)

animation.play()
```

It also provides named exports `setAttribute`, `setProperty`, `setStyle`, which are further described in [keyframes argument](#keyframesmotionpath-required).

### Arguments

#### Element (required)

`Element` should be a reference of the DOM element to animate.

#### Keyframes|MotionPath (required)

`MotionPath` should be a reference of an `SVGElement` for a `MotionPathEffect`, along which to move `Element`. It should inherit from `SVGGeometryElement` (eg. `<path>`, `<circle>`, `<rect>`, etc…).

`Keyframes` should define the properties and values (effects) of a `KeyframeEffect` to apply during the animation's duration. There are two different ways to format keyframes:

**1. Canonical type:**

```
Keyframes => [Keyframe]
Keyframe => {
  [Property]: a,
  easing?: String|Function,
  offset?: Number|String,
}
```

**2. Alternative type:**

```
Keyframes => {
  [Property]: [a],
  easing?: [String|Function]|String|Function,
  offset?: [Number|String]|Number|String,
}
```

Learn more on [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API/Keyframe_Formats).

`a` should be an animated value. If it's a `Number`, a `String` containing numbers or a color value, it will automatically be interpolated and applyied on `Element.style`. Otherwise it should be a `PropertyController`:

```
PropertyController => {
  interpolate?: (From -> To -> Time) -> a,
  set?: (Element -> Property -> a) -> void,
  value: a,
}
From => To => a
```

`PropertyController` should define a function to interpolate and/or to apply (set) animated values on `Element`.

`interpolate` should return the intermediate `value` at the current relative `Time`, which will be a `Number` relative to the animation's duration, starting from `0` and ending at `1`. If not defined, the default function will interpolate `value` if it's a `Number`, a `String` containing numbers or a color value.

`set` should be one of the following named exports of this package:

- `setStyle` (default): to set the animated value as a CSS property of `Element.style`
- `setProperty`: to set the animated value as a property of `Element`
- `setAttribute`: to set the animated value as an attribute on `Element`

#### Options|Number (optional)

`Options` should be either a `Number` representing the animation's duration (in milliseconds), or an `Object` containing one or more timing properties.

Learn more on [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Element/animate) and check `Options` support at the top of the page.

`easing` can be assigned a function whose type should be `Time -> Number`. It is supposed to return `0` when `Time` is `0` and `1` when `Time` is `1`.

Only for a `MotionPathEffect`:

- `rotate` can be set to `true` to rotate `Element` towards the direction of `MotionPath`
- `anchor` can be set to a pair of SVG coordinates `[Number, Number]` relative to the center of `Element` (after applying an automatic transformation to center `Element` on the start of `MotionPath`).

### Return value

#### Animation

Learn more on [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Animation) and check the support table at the top of the page.

## TODO

- Performances: measure and improve

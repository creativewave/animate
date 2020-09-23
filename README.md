[![CircleCI](https://circleci.com/gh/creativewave/animate.svg?style=svg)](https://circleci.com/gh/creativewave/animate)

# animate

1. [About](#about)
2. [Installation](#installation)
3. [Example](#example)
4. [API](#API)

## About

`animate()` is an alternative to `Element.animate()`, the native interface provided by the Web Animation API ([WAAPI](http://drafts.csswg.org/web-animations/)) to animate CSS properties, which is not supported in all browsers yet ([can I use it?](https://caniuse.com/#feat=web-animation)), with some [extra features](#extra-features).

`animate()` returns an object that should conform to the native [`Animation` interface](https://drafts.csswg.org/web-animations/#the-animation-interface), except for the properties and methods listed below.

Each write on `Element` will be delayed and batched at the end of the runtime, to prevent style/layout recalculations.

Demo: https://codepen.io/creative-wave/pen/XWWRoWv

### Supported WAAPI features

| Feature                  | Status | Notes |
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
| startTime                | ✅    |       |
| timeline                 | ✅    |       |
| **Animation methods**    |        |       |
| cancel                   | ✅    |       |
| finish                   | ✅    |       |
| oncancel                 | ❌    | Will not be implemented. |
| onfinish                 | ❌    | Will not be implemented. |
| onremove                 | ❌    | Will not be implemented. |
| pause                    | ✅    |       |
| play                     | ✅    |       |
| reverse                  | ✅    |       |
| updatePlaybackRate       | ❌    | Will not be implemented. |
| **Keyframes**            |        |       |
| Format 1                 | ✅    |       |
| Format 2                 | ✅    |       |
| composite                |        |       |
| - `replace` (default)    | ✅    |       |
| - `add`                  | ❌    | Will not be implemented. |
| - `accumulate`           | ❌    | Will not be implemented. |
| easing                   | ✅    |       |
| offset                   | ✅    |       |
| **Options**              |        |       |
| as Number (duration)     | ✅    |       |
| duration                 | ✅    |       |
| easing                   | ✅    |       |
| delay                    | ✅    |       |
| direction                |        |       |
| - `normal` (default)     | ✅    |       |
| - `reverse`              | ✅    |       |
| - `alternate`            | ✅    |       |
| - `alternate-reverse`    | ✅    |       |
| endDelay                 | ✅    |       |
| fill                     |        |       |
| - `auto` (default)       | ✅    |       |
| - `none`                 | ✅    |       |
| - `backwards`            | ✅    |       |
| - `forwards`             | ✅    |       |
| - `both`                 | ✅    |       |
| id                       | ✅    |       |
| iterations               | ✅    |       |
| iterationStart           | ✅    |       |
| pseudoElement            | ❌    | Will not be implemented. |

### Extra features

1. Custom timing (easing) function which would be cumbersome to reproduce using keyframes (eg. multiple bounces)
2. Custom functions to interpolate and set animated values,  eg.:

  - the `d`efinition attribute of an SVG `<path>` using unique delay/duration for each point ([demo](https://codepen.io/creative-wave/pen/yLLZbME))
  - a [property](https://svgwg.org/svg2-draft/pservers.html#PatternElementXAttribute) specified as [animatable](https://svgwg.org/specs/animations/#Animatable) but that couldn't be animated yet ([demo with the `y` attribute of a `<pattern>`](https://codepen.io/creative-wave/pen/pooqymX))
  - a property which is not a CSS property, such as `Element.innerText`

3. A `Animation.next()` interface to execute a callback each time animation is finished

## Installation

```shell
  npm i @cdoublev/animate
```

This package doesn't include a polyfill of `requestAnimationFrame`, which is required for IE < 10. You should [include it](https://gist.github.com/paulirish/1579671) [yourself](https://hackernoon.com/polyfills-everything-you-ever-wanted-to-know-or-maybe-a-bit-less-7c8de164e423).

## Example

All-in-one example:

```js
  import animate, {
    interpolateTaggedNumbers as interpolate,
    setProperty as set,
    tag,
  } from '@cdoublev/animate'

  const keyframes = [
    {
      opacity: 1,
      transform: { value: tag`translateX(${0}px) scale(${0.5})`, interpolate },
      innerText: { set, value: 0 },
    },
    {
      opacity: 0,
      transform: { value: tag`translateX(${100}px) scale(${1})`, interpolate },
      innerText: { set, value: 100 },
    },
  ]
  const bounce = t => ((0.04 - (0.04 / t)) * Math.sin(25 * t)) + 1
  const options = { duration: 2000, easing: bounce )

  animate(element, keyframes, options).next(() => console.log('done'))
```

## API

```js
    import animate, { Animation, KeyframeEffect } from '@cdoublev/animate`
```

`animate()` is the default export of this package. It's a `Function` which has the following signature:

`animate :: (Element -> Keyframes -> Options?|Number?) -> Animation`

It also exports the following functions, which are further described later:
- `setProperty`: to set a property on `Element` instead of `Element.style` (inline styles)
- `setAttribute`: to set a property on `Element` using `Element.setAttribute()`
- `tag`: to tag value(s) to interpolate in a tagged template
- `interpolateTaggedNumbers`: to interpolate tagged `Number`(s) and replace them in the parsed template

### Arguments

#### Element (required)

`Element` should be a reference of the DOM element whose properties should be animated.

#### Keyframes (required)

`Keyframes` defines properties and values (effects) to apply during the animation's duration.

Note: `a` could be any type but for most use cases, it will be a `Number` or a `String` to assign to a CSS property or to `Element.innerText`.

**1. Canonical type (collection):**

```
  Keyframes => [Keyframe]
  Keyframe => {
    [Property]: a,
    easing?: String|Function,
    offset?: Number|String,
  }
```

**2. Alternative type (set):**

```
  Keyframes => {
    [Property]: [a],
    easing?: [String|Function]|String|Function,
    offset?: [Number|String]|Number|String,
  }
```

Those formats are specified in the WAAPI. Learn more on [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API/Keyframe_Formats).

Instead of assigning a `String` or a `Number` to `Property`, you can use a `PropertyController`:

```
  PropertyController => {
    interpolate?: (From -> To -> Time) -> a,  // Default: `interpolateNumber`
    set?: (Element -> Property -> a) -> void, // Default: `setStyle()`
    value: a,
  }
  From => To => a
```

`set` should be one of the named exports of this package: `setStyle`, `setProperty`, or `setAttribute`.

`setStyle` (default) and `setProperty` will delay each write on `Element` or `Element.style`, to batch their executions and avoid style/layout recalculations. `setAttribute` will set an attribute such as `width`, but its executions will not be batched.

`interpolate` should be a function that returns the intermediate `value` at the current relative `Time`, which will be a `Number` relative to the animation's duration, starting from `0` and ending at `1`.

`interpolateNumber` (default) interpolates a `Number` assigned to `value`, eg. the value of `opacity`. The named exports `tag` and `interpolateTaggedNumbers` can be used to tag and interpolate `Number`(s) nested in a tagged template whose result is assigned to `value`, eg. `` tag`translateY(${200}px)` ``.

Note: a function to interpolate hexadecimal values may be provided later.

#### Options or duration (optional)

`Options` is either a `Number` representing the animation's duration (in milliseconds), or an `Object` containing one or more timing properties.

See the list of features at the top of the page, and learn more on [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Element/animate).

Instead of providing a `String` for `easing`, you can provide your own function whose type should be `easing :: Time -> Number`, and which is supposed to return `0` when `Time` is `0`, and `1` when `Time` is `1`.

If not defined, `Options` will default to `0`.

### Return value

#### Animation

See the list of features at the top of the page, and learn more on [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Animation).

Instead of using `finished` (`Promise`), you can directly use `then()` to chain a callback at the end of the animation. Note that it will be repeated each time `Animation.playState` becomes `finished`, eg. after repeating the execution of `Animation.play()` or `Animation.reverse()`.

**Chaining animations and cancel their executions in a React Component:**

```js
  import React from 'react'
  import animate from '@cdoublev/animate'

  const Component = () => {

    const animation = React.useRef({})
    const element = React.useRef()

    React.useEffect(
      () => {

        animation.current = animate(element, /*keyframes*/, 1000)
          .then(() => animation.current = animate(element, /*keyframes*/, 1000))

        return () => {
          if (animation.current.playState === 'running') {
            animation.current.cancel()
          }
        }
      }
    [animation])

    return <div ref={element}></div>
  }
```

`@cdoublev/react-utils` provides [`useAnimateCustom()`](https://github.com/creativewave/react-utils#useAnimateCustom), which is a custom hook that conveniently abstracts the above `effect`.

## TODO

- Performances: measure and improve
- Fix: handle `'steps()'` easing function

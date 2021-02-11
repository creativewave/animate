
# Computing keyframes

This document exposes the challenges in computing keyframe values.

## Why/when keyframe should be computed?

Computing keyframe values is required to interpolate (animate with a fluid transition between) values represented differently. Only values resolved to (represented with) (real) numbers can be interpolated.

**Key facts:**

1. Numbers can be unitless or have different units and they can be wrapped in function(s)
2. The types of values resolved to number(s) are angle, color, `fr`, length, `%`, position, ratio, and size
3. User agents should (and always) resolve an angle to `deg`
4. User agents should (and always) resolve a color to `rgba` when `a < 1`, otherwise to `rgb`
5. User agents should (and always) resolve `fr`, length, position, and size to `px` or `%`
6. User agents sometimes resolve `%` to `px` (even when not required by the specification)
7. User agents always resolve `transform` to a `matrix` function (even if not required by the specification)
8. A property may be assigned a **list** of values separated by `,`
9. A value may be represented by a single component or **multiple components** separated by ` ` or sometimes `/`
10. A component may be represented by a **function**, whose argument(s) are separated by a math operator for math functions, otherwise by `,`, ` `, or sometimes `/`
11. The function types that use numbers (or representation of numbers) as arguments are color, filter, gradient, math (including `fit-content(value)`, an alias of `min(max-content, max(min-content, value)))`), timing, toggle, and transform
12. Only math functions can be used in other function types but `calc()` only accepts `calc()`

**Examples:**

- multi-component: `box-shadow: 0px 2px black`
- list + multi-component: `box-shadow: 0px 2px black, 0px 5px 2px black`
- list + multi-component + function: `box-shadow: 0px min(2px, 1vh) black, 0px 5px 2px black`
- multi-component + transform + function: `transform: translateX(min(100px, 10vw)) scale(2)`

**Avoiding unneeded interpolations:**

Ideally, equal values should not be interpolated:

```js
const keyframes = {
  border: [
    '16px 0px 2px black',
    '1rem 0rem 2px rgb(calc(100 / 2 - 50), 0, 0)',
    '0.5em 0em 2px rgba(0, 0, 0, 1)',
    '10% 0ch 2px #000',
    '1vw 0vw 2px hsl(0, 0%, 0%)',
  ],
}
```

In the above keyframes, no interpolation should happen for the color component, and for the first length/percentage if:

- the `font-size` of the root `html` element resolves to `16px` (`1rem`)
- the `font-size` of the first ancestor element of the animated element resolves to `32px` (`0.5em`)
- the `width` of the parent element of the animated element resolves to `160px` (`10%`)
- the `width` of `window` resolves to `1600px` (`1vw`)

Avoiding unneeded interpolations of the first length/percentage component may not be worth the computations to check these conditions. But length components with strict equal values or values loosely equal to `0`, and color components with strict/loose equal values, can be excluded from values to interpolate.

User agents compute component values at each frame when computing keyframes using a [private algorythm](https://drafts.csswg.org/web-animations-1/#ref-for-compute-a-property-value%E2%91%A1) similar to `getComputedProperty()`.

## Computing component number

```js
const keyframes = { fontSize: ['24px', '2rem', 'large', 'larger'] }
```

Computing the above sizes and lengths would require:

- for `cm`, `in`, `mm`, `pc`, `pt`, `Q`, to apply basic math operations
- for `cap`, `ch`, `ex`, `ic`, `lh`, to get a value computed with a temporary element
- for `vh`, `vmin`, `vmax`, `vw`, to get a value computed with `window`
- for `rem` and absolute sizes, to get a value computed with `<html>`
- for `%`, `em`, `vb`, `vi`, `sizes` (`large`, `larger`), to get a value computed with an ancestor of the animated element

When used in a color or filter function, computing `%` would require to apply basic math operations or when used in a transform function, to get a value computed with the animated element.

A simpler alternative would be using `calc()`:

```js
const keyframes = {
  fontSize: [
    'calc(24px + 0rem + (0rem * 3/2) + (0em * 3/2))',
    'calc( 0px + 2rem + (0rem * 3/2) + (0em * 3/2))',
    'calc( 0px + 0rem + (1rem * 3/2) + (0em * 3/2))',
    'calc( 0px + 0rem + (0rem * 3/2) + (1em * 3/2))',
  ],
}
```

But interpolating values in math function components does not produce the same interpolated value than interpolating its computed value:

```js
const keyframes = {
  fontSize: ['calc(0em * 0)', 'calc(1em * 2)'],
}
```

At half the iteration duration, `fontSize` should be `1em` but it will be `0.5em`, ie. `calc(0.5em * 1)`.

## Computing functions

```js
const keyframes = {
  boxShadow: [
    '0px min(2px, 1vh) black',
    '0px 5px 2px black, 0px 10px 4px black',
  ],
  transform: [
    'scale(2) translateX(min(100px, 10vw))',
    'translateX(20em) rotate(45deg)',
  ],
}
```

In order to animate the above keyframes, their values should be computed:

```js
const computed = {
  boxShadow: [
    '0px min(2px, calc(1vh + 0px)) 0px rgba(0, 0, 0, 1), 0px 0px 0px rgba(0, 0, 0, 0)',
    '0px min(5px, calc(0vh + 5px)) 2px rgba(0, 0, 0, 1), 0px 10px 4px rgba(0, 0, 0, 1)',
  ],
  transform: [
    'scale(2) translateX(min(calc(100px + 0em), calc(10vw + 0em))) rotate(0deg)',
    'scale(1) translateX(min(calc(0px + 20em), calc(0vw + 20em))) rotate(45deg)',
  ],
}
```

But the `calc()` method can't help in normalizing the following keyframes:

```js
const keyframes = {
  fontSize: [
    'min(16px, 2rem)',
    'max(1vw, 3em, 10%)',
    'clamp(16px, 5%, 5vw)',
  ],
}
```

## Normalizing keywords

Some CSS property may be resolved to or assigned a keyword.

**`[backdrop-]filter: none`**

All keyframe values and their components should be read and one or multiple of the following values should replace `none`:

- `blur(0px)`
- `brightness(1)`
- `contrast(1)`
- `drop-shadow(rgba(0, 0, 0, 0) 0px 0px 0px)`
- `grayscale(0)`
- `hue-rotate(0deg)`
- `invert(0)`
- `opacity(1)`
- `saturate(1)`
- `sepia(0)`

**`background|mask-size: auto`**

The dimensions of the background image and/or from the container element should be resolved in order to replace `auto/contain/cover`.

A tradeoff would be using `100% 100%`, which is the expected value for a gradient.

**`[column|row-]gap: normal`**

The ancestor element establishing the layout should be found in order to replace `auto` by `0px` in a grid layout or `1em` in a column layout.

[WIP]

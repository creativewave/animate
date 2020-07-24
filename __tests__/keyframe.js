
import { parseCollection, parseRecord } from '../src/keyframe'
import { easings } from '../src/interpolate'
import { errors } from '../src/error'

const { ease, linear } = easings
const NaNs = ['a0.5', true, {}, Symbol()]

describe('keyframes#parseCollection()', () => {
    it('should throw when it receives partial keyframes', () => {

        const partialKeyframes = [
            [{ prop: 0 }],
            [{ prop: 0 }, { offset: 0.5, prop: 1 }],
            [{ offset: 0.5, prop: 0 }, { prop: 1 }],
            [{}, { prop: 0 }],
            [{ prop: 0 }, {}],
        ]

        partialKeyframes.forEach(keyframes =>
            expect(() => parseCollection(keyframes)).toThrow(errors.PARTIAL_KEYFRAMES))
    })
    it('should throw when it reveives unknown easing alias', () => {
        expect(() => parseCollection([{ easing: 'unknown', prop: 0 }, { prop: 1 }])).toThrow(errors.EASING)
    })
    it('should throw when it reveives an offset out of range [0-1]', () => {
        expect(() => parseCollection([{ offset: -1, prop: 0 }, { offset: 1, prop: 1 }])).toThrow(errors.OFFSET_RANGE)
        expect(() => parseCollection([{ offset: 0, prop: 0 }, { offset: 2, prop: 1 }])).toThrow(errors.OFFSET_RANGE)
    })
    it('should throw when it reveives an offset which is not a Number or a numerical String', () => {
        NaNs.forEach(type =>
            expect(() => parseCollection([{ prop: 0 }, { offset: type, prop: 0 }, { prop: 1 }]))
                .toThrow(errors.OFFSET_TYPE))
    })
    it('should throw when it reveives unordered offset', () => {
        expect(() => parseCollection([
            { prop: 0 },
            { offset: 0.75, prop: 1 },
            { offset: 0.25, prop: 2 },
            { prop: 3 },
        ]))
            .toThrow(errors.OFFSET_ORDER)
    })
    it('should parse [Keyframe] into ComputedKeyframes [default offset/easing]', () => {

        const keyframes = [{ prop: 0 }, { prop: 1 }]
        const actual = parseCollection(keyframes)
        const expected = [
            { easing: linear, offset: 0, prop: 0 },
            { offset: 1, prop: 1 },
        ]

        expect(actual).toEqual(expected)
    })
    it('should parse [Keyframe] into ComputedKeyframes [alias/custom easing]', () => {

        const keyframes = [{ easing: 'ease', prop: 0 }, { easing: ease, prop: 0.5 }, { easing: 'linear', prop: 1 }]
        const actual = parseCollection(keyframes)
        const expected = [
            { easing: ease, offset: 0, prop: 0 },
            { easing: ease, offset: 0.5, prop: 0.5 },
            { offset: 1, prop: 1 },
        ]

        expect(actual).toEqual(expected)
    })
    it('should parse [Keyframe] into ComputedKeyframes [default/custom offset]', () => {

        const keyframes = [
            { prop: 0 },
            { offset: 0.3, prop: 1 },
            { prop: 0 },
            { prop: 1 },
            { offset: 0.9, prop: 1 },
            { prop: 1 },
        ]
        const actual = parseCollection(keyframes)
        const expected = [
            { easing: linear, offset: 0, prop: 0 },
            { easing: linear, offset: 0.3, prop: 1 },
            { easing: linear, offset: 0.5, prop: 0 },
            { easing: linear, offset: 0.7, prop: 1 },
            { easing: linear, offset: 0.9, prop: 1 },
            { offset: 1, prop: 1 },
        ]

        expect(actual).toEqual(expected)
    })
})

describe('keyframes#parseRecord()', () => {
    it('should throw when it receives partial keyframes', () => {

        const partialKeyframes = [
            { offset: [0, 1], prop: 0 },
            { offset: [1], prop: [0, 1] },
            { offset: 1, prop: [0, 1] },
            { offset: [0, 0.5], prop: [0, 1] },
            { offset: [0.5, 1], prop: [0, 1] },
        ]

        partialKeyframes.forEach(keyframes =>
            expect(() => parseRecord(keyframes)).toThrow(errors.PARTIAL_KEYFRAMES))
    })
    it('should throw when it reveives unknown easing alias', () => {
        expect(() => parseRecord({ easing: 'unknown', prop: [0, 1] })).toThrow(errors.EASING)
    })
    it('should throw when it reveives an offset out of range 0-1', () => {
        expect(() => parseRecord({ offset: [-1, 1], prop: [0, 1] })).toThrow(errors.OFFSET_RANGE)
        expect(() => parseRecord({ offset: [0, 2], prop: [0, 1] })).toThrow(errors.OFFSET_RANGE)
    })
    it('should throw when it reveives an offset which is not a Number or a numerical String', () => {
        NaNs.forEach(type =>
            expect(() => parseRecord({ offset: [0, type, 1], prop: [0, 1, 2] }))
                .toThrow(errors.OFFSET_TYPE))
    })
    it('should throw when it reveives unordered offset', () => {
        expect(() => parseRecord({ offset: [0, 0.75, 0.25, 1], prop: [0, 1, 2, 3] })).toThrow(errors.OFFSET_ORDER)
    })
    it('should parse Keyframes [single prop, default offset/easing]', () => {

        const keyframes = { prop: [0, 1] }
        const actual = parseRecord(keyframes)
        const expected = [
            { easing: linear, offset: 0, prop: 0 },
            { offset: 1, prop: 1 },
        ]

        expect(actual).toEqual(expected)
    })
    it('should parse Keyframes [single prop, single offset/easing]', () => {

        const keyframes = { easing: 'ease', offset: 0, prop: [0, 1] }
        const actual = parseRecord(keyframes)
        const expected = [
            { easing: ease, offset: 0, prop: 0 },
            { offset: 1, prop: 1 },
        ]

        expect(actual).toEqual(expected)
    })
    it('should parse Keyframes [multiple props, default offset/easing]', () => {

        const keyframes = { prop1: [0, 1, 2], prop2: [0, 1] }
        const actual = parseRecord(keyframes)
        const expected = [
            { easing: linear, offset: 0, prop1: 0, prop2: 0 },
            { easing: linear, offset: 0.5, prop1: 1 },
            { offset: 1, prop1: 2, prop2: 1 },
        ]

        expect(actual).toEqual(expected)
    })
    it('should parse Keyframes [multiple props, single offset/easing]', () => {

        const keyframes = { easing: 'linear', offset: 0, prop1: [0, 1, 2], prop2: [0, 1] }
        const actual = parseRecord(keyframes)
        const expected = [
            { easing: linear, offset: 0, prop1: 0, prop2: 0 },
            { easing: linear, offset: 0.5, prop1: 1 },
            { offset: 1, prop1: 2, prop2: 1 },
        ]

        expect(actual).toEqual(expected)
    })
    it('should parse Keyframes [multiple props, offset length < easing/prop length]]', () => {

        const keyframes = {
            easing: ['ease', linear, 'linear', ease],
            prop1: [0, 1],
            prop2: [0, 1, 2, 3, 4, 5],
        }
        const actual = parseRecord(keyframes)
        const expected = [
            { easing: ease, offset: 0, prop1: 0, prop2: 0 },
            { easing: linear, offset: 0.2, prop2: 1 },
            { easing: linear, offset: 0.4, prop2: 2 },
            { easing: ease, offset: 0.6, prop2: 3 },
            { easing: ease, offset: 0.8, prop2: 4 },
            { offset: 1, prop1: 1, prop2: 5 },
        ]

        expect(actual).toEqual(expected)
    })
})

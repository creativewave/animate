
import { isFiniteNumber, isNumber } from '../src/utils.js'

export const NaNs = [
    ['NaN', NaN],
    ['undefined', undefined],
    ['null', null],
    ['true', true],
    ['false', false],
    ["''", ''],
    ["'1a'", '1a'],
    ["'a1'", 'a1'],
    ['[]', []],
    ['[1]', [1]],
    ["['1']", ['1']],
    ['{ toString(){ return 1 } }', { toString() { return 1 } }],
    ['Symbol()', Symbol()],
]

const numbers = [
    [-1, -1],
    [0, 0],
    [1e0, 1e0],
    [1e-1, 1e-1],
    [0.1, 0.1],
    [.1, .1], // eslint-disable-line @stylistic/js/no-floating-decimal
    [0x00, 0x00],
    ["'0'", '0'],
    ["'1e0'", '1e0'],
    ["'1e-1'", '1e-1'],
    ["'0.1'", '0.1'],
    ["'.1'", '.1'],
    ["'0x00'", '0x00'],
    ['Infinity', Infinity],
]

describe('isNumber', () => {
    it.each(NaNs)('should return false for %s', (_, n) => expect(isNumber(n)).toBeFalsy())
    it.each(numbers)('should return true for %s', (_, n) => expect(isNumber(n)).toBeTruthy())
})

describe('isFiniteNumber', () => {
    it.each(NaNs)('should return false for %s', (_, n) => expect(isFiniteNumber(n)).toBeFalsy())
    it.each(numbers.slice(0, -1))('should return true for %s', (_, n) => expect(isFiniteNumber(n)).toBeTruthy())
})

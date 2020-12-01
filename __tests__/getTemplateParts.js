
import { getTemplateParts } from '../src/keyframe'

it('parses an input starting with a string and including numbers', () => {

    const input = 'scale(1) translate(0, 100%)'
    const expected = [[1, 0, 100], ['scale(', ') translate(', ', ', '%)']]

    expect(getTemplateParts(input)).toEqual(expected)
})
it('parses an input starting with a number and ending with hexadecimal color', () => {

    const input = '0px 0px #000'
    const expected = [[0, 0, 0, 0, 0], ['', 'px ', 'px rgb(', ',', ',', ')']]

    expect(getTemplateParts(input)).toEqual(expected)
})
it('parses an input starting with a number and ending with rgba color', () => {

    const input = '0px 0px rgb(0, 0, 0)'
    const expected = [[0, 0, 0, 0, 0], ['', 'px ', 'px rgb(', ', ', ', ', ')']]

    expect(getTemplateParts(input)).toEqual(expected)
})
it('parses an input starting with a string and ending with a rgba color', () => {

    const input = 'inset 0px 0px #000'
    const expected = [[0, 0, 0, 0, 0], ['inset ', 'px ', 'px rgb(', ',', ',', ')']]

    expect(getTemplateParts(input)).toEqual(expected)
})
it('parses an input including negative numbers not preceded by a space', () => {

    const input = 'M0 0C-1 0-1-1-1 0z'
    const expected = [[0, 0, -1, 0, -1, -1, -1, 0], ['M', ' ', 'C', ' ', ' ', ' ', ' ', ' ', 'z']]
    expect(getTemplateParts(input)).toEqual(expected)
})
it('parses an input ending with negative numbers not preceded by a space', () => {

    const input = 'M0 0C0 0 0 0 -1-1'
    const expected = [[0, 0, 0, 0, 0, 0, -1, -1], ['M', ' ', 'C', ' ', ' ', ' ', ' ', ' ', '']]


    expect(getTemplateParts(input)).toEqual(expected)
})

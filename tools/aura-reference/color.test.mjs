import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveColor } from './lib/color.mjs';

/**
 * Measured by setting each declaration as a canvas `fillStyle` and reading the
 * pixel back, since `getComputedStyle().color` returns wide-gamut `oklch()`
 * unchanged. These are the values the reference is expected to state.
 */
const BROWSER_MEASURED = [
  ['oklch(0.59 0.2 25)', '#DB373A', true],
  ['oklch(0.61 0.35 87)', '#D95A00', false],
  ['oklch(0.89 0.3 98)', '#FFD400', false],
  ['oklch(0.6 0.2 155)', '#00A045', false],
  ['oklch(0.55 0.2 264)', '#3266E4', true],
  ['oklch(0.58 0.22 290)', '#7E55F0', true],
  ['oklch(0.95 0.005 248)', '#ECEFF2', true],
  ['oklch(0.2 0.01 260)', '#13161B', true],
];

test('oklch() resolves to the sRGB a browser paints', () => {
  for (const [value, hex, inSrgbGamut] of BROWSER_MEASURED) {
    assert.deepEqual(resolveColor(value), { hex, inSrgbGamut }, value);
  }
});

test('oklch() accepts percentages and angle units', () => {
  assert.equal(resolveColor('oklch(59% 50% 25)').hex, resolveColor('oklch(0.59 0.2 25)').hex);
  assert.equal(resolveColor('oklch(0.59 0.2 25deg)').hex, resolveColor('oklch(0.59 0.2 25)').hex);
  assert.equal(resolveColor('oklch(0.59 0.2 0.5turn)').hex, resolveColor('oklch(0.59 0.2 180)').hex);
});

test('hex and rgb() values pass through', () => {
  assert.deepEqual(resolveColor('#abc'), { hex: '#AABBCC', inSrgbGamut: true });
  assert.deepEqual(resolveColor('#3266e4'), { hex: '#3266E4', inSrgbGamut: true });
  assert.deepEqual(resolveColor('rgb(50 102 228)'), { hex: '#3266E4', inSrgbGamut: true });
});

test('values that depend on context resolve to null rather than a guess', () => {
  const unresolvable = [
    'var(--aura-blue)',
    'light-dark(white, black)',
    'oklch(from var(--aura-red) 0.5 c h)',
    'color-mix(in srgb, white 50%, black)',
    'oklch(from var(--aura-accent-color-light) 0.9 calc(c * 0.3) h)',
    '1.5vmin',
    'inherit',
  ];
  for (const value of unresolvable) assert.equal(resolveColor(value), null, value);
});

test('out-of-range oklch() components are clamped before conversion, as CSS does', () => {
  // Negative chroma is clamped to zero at parse time, which makes this a gray;
  // clipping the resulting RGB channels instead would give a blue-green.
  assert.deepEqual(resolveColor('oklch(0.5 -0.2 25)'), resolveColor('oklch(0.5 0 25)'));
  assert.deepEqual(resolveColor('oklch(1.5 0.1 25)'), resolveColor('oklch(1 0.1 25)'));
});

test('malformed color syntax resolves to null, never to a value', () => {
  const malformed = ['oklch(0.5 0.2 .)', 'rgb(1,,2,3)', 'oklch(0.5 0.2)', 'rgb(1 2)', 'oklch(a b c)'];
  for (const value of malformed) assert.equal(resolveColor(value), null, value);
});

test('an alpha channel is not silently dropped', () => {
  assert.equal(resolveColor('oklch(0.59 0.2 25 / 0.5)'), null);
  assert.equal(resolveColor('rgb(50 102 228 / 50%)'), null);
  assert.equal(resolveColor('#3266e480'), null);
});

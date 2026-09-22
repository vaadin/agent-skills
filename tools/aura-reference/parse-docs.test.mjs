import assert from 'node:assert/strict';
import test from 'node:test';

import { parseDocumentedProperties } from './lib/parse-docs.mjs';

const page = (name, source) => new Map([[name, source]]);

test('a property documented without a badge is customizable', () => {
  const properties = parseDocumentedProperties(
    page(
      'color',
      [
        '[.property-table]',
        '`--aura-accent-text-color-light`::',
        'The accent text color for the light color scheme. Computed from `--aura-accent-color-light` by default.',
      ].join('\n'),
    ),
  );

  assert.deepEqual(properties.get('--aura-accent-text-color-light'), {
    page: 'color',
    readOnly: false,
    lightDark: false,
    description: 'The accent text color for the light color scheme.',
  });
});

test('both badge forms mark a property read-only', () => {
  const properties = parseDocumentedProperties(
    page(
      'color',
      [
        '`--aura-surface-color` xref:./#read-only-properties[Read-only,role=badge]::',
        'A computed color you can apply to an element.',
        '',
        '`--aura-neutral` xref:#light-dark-function[light-dark(),role="badge light-dark"]::',
        'Automatically assigned the -light or -dark value.',
      ].join('\n'),
    ),
  );

  assert.equal(properties.get('--aura-surface-color').readOnly, true);
  assert.equal(properties.get('--aura-surface-color').lightDark, false);
  assert.equal(properties.get('--aura-neutral').readOnly, true);
  assert.equal(properties.get('--aura-neutral').lightDark, true);
});

test('table rows are read, and wildcard entries are skipped', () => {
  const properties = parseDocumentedProperties(
    page(
      'color',
      [
        '|===',
        '|Generic Color | Text Color',
        '|`--aura-red` | `--aura-red-text` xref:#light-dark-function[light-dark(),role="badge light-dark"]',
        '|===',
        '',
        '`--aura-*-text`::',
        'See saturated palette colors.',
      ].join('\n'),
    ),
  );

  assert.equal(properties.get('--aura-red').readOnly, false);
  assert.equal(properties.get('--aura-red-text').readOnly, true);
  assert.equal(properties.has('--aura-*-text'), false);
});

test('a property merely mentioned in prose is not classified', () => {
  const properties = parseDocumentedProperties(
    page('index', 'As an example, the `--aura-background-color` property is read-only.'),
  );

  assert.equal(properties.size, 0);
});

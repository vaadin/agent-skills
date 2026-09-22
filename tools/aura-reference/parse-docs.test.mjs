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

test('a badge that wrapped onto the next line of a table cell is still seen', () => {
  const properties = parseDocumentedProperties(
    page(
      'color',
      [
        '|===',
        '|`--aura-red` | `--aura-red-text`',
        'xref:#light-dark-function[light-dark(),role="badge light-dark"]',
        '|===',
      ].join('\n'),
    ),
  );

  assert.equal(properties.get('--aura-red-text').readOnly, true);
  assert.equal(properties.get('--aura-red-text').lightDark, true);
  assert.equal(properties.get('--aura-red').readOnly, false);
});

test('a later unbadged mention cannot downgrade a read-only property', () => {
  const properties = parseDocumentedProperties(
    page(
      'color',
      [
        '`--aura-red-text` xref:#light-dark-function[light-dark(),role="badge light-dark"]::',
        'Description.',
        '',
        '|===',
        '|Example |`--aura-red-text`',
        '|===',
      ].join('\n'),
    ),
  );

  assert.equal(properties.get('--aura-red-text').readOnly, true);
});

test('single-quoted role attributes carry the badge like double-quoted ones', () => {
  const properties = parseDocumentedProperties(
    page('color', "`--aura-red-text` xref:#light-dark-function[light-dark(),role='badge light-dark']::\nText."),
  );

  assert.equal(properties.get('--aura-red-text').readOnly, true);
  assert.equal(properties.get('--aura-red-text').lightDark, true);
});

test('the docs own inline badge form is recognized', () => {
  const properties = parseDocumentedProperties(page('other', '`--aura-surface-color` [badge]*Read-only*::\nText.'));
  assert.equal(properties.get('--aura-surface-color').readOnly, true);
});

test('badge markup nobody taught the parser fails the run', () => {
  assert.throws(
    () => parseDocumentedProperties(page('other', '`--aura-surface-color` <span class="x">Read-only</span>::\nText.')),
    /Unrecognized badge markup/,
  );
});

test('content inside an asciidoc comment block is ignored', () => {
  const properties = parseDocumentedProperties(
    page(
      'color',
      [
        '`--aura-red-text` xref:#light-dark-function[light-dark(),role="badge light-dark"]::',
        'Description.',
        '',
        '////',
        '`--aura-red-text`::',
        'An old draft that dropped the badge.',
        '////',
      ].join('\n'),
    ),
  );

  assert.equal(properties.get('--aura-red-text').readOnly, true);
});

test('a blank line does not detach a badge from its table cell', () => {
  const properties = parseDocumentedProperties(
    page(
      'color',
      [
        '|===',
        '|`--aura-red` | `--aura-red-text`',
        '',
        'xref:#light-dark-function[light-dark(),role="badge light-dark"]',
        '|===',
      ].join('\n'),
    ),
  );

  assert.equal(properties.get('--aura-red-text').readOnly, true);
});

test('the inline badge carries its light-dark class', () => {
  const properties = parseDocumentedProperties(
    page('color', '`--aura-neutral` [.badge.light-dark]#light-dark()#::\nText.'),
  );

  assert.equal(properties.get('--aura-neutral').readOnly, true);
  assert.equal(properties.get('--aura-neutral').lightDark, true);
});

test('prose that merely mentions light-dark() does not trip the badge guard', () => {
  const properties = parseDocumentedProperties(
    page('color', '`--aura-accent-color-light` Defaults to light-dark() but can be customized.::\nText.'),
  );

  assert.equal(properties.get('--aura-accent-color-light').readOnly, false);
});

test('a badge label set off by delimiters fails the run, prose does not', () => {
  const fires = [
    '`--aura-surface-color` *Read-only*::',
    '`--aura-surface-color` <b>Read-only</b>::',
    '`--aura-surface-color` #Read-only#::',
    '`--aura-surface-color` |Read-only|::',
    '`--aura-surface-color` _Read-only_::',
    '`--aura-surface-color` **Read-only**::',
  ];
  for (const source of fires) {
    assert.throws(() => parseDocumentedProperties(page('x', `${source}\nText.`)), /Unrecognized badge markup/, source);
  }

  const prose = [
    '`--aura-accent-color-light` Defaults to light-dark() but can be customized.::',
    '`--aura-accent-color-light` See xref:./#read-only-properties[the guide] for how light-dark() works.::',
    '`--aura-accent-color-light` The value is not "read-only"; you may override it.::',
  ];
  for (const source of prose) {
    assert.doesNotThrow(() => parseDocumentedProperties(page('x', `${source}\nText.`)), source);
  }
});

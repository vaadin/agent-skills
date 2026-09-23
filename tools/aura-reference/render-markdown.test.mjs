import assert from 'node:assert/strict';
import test from 'node:test';

import { scanBlockMarkers } from './lib/render-markdown.mjs';

const wrap = (id, body = 'x') => `<!-- BEGIN GENERATED ${id} -->\n${body}\n<!-- END GENERATED ${id} -->`;

test('well-formed markers are reported in document order', () => {
  const { ids, problems } = scanBlockMarkers(`${wrap('source')}\n\ntext\n\n${wrap('palette-colors')}`);
  assert.deepEqual(ids, ['source', 'palette-colors']);
  assert.deepEqual(problems, []);
});

test('a mismatched closing marker is reported, not skipped over', () => {
  const { problems } = scanBlockMarkers(
    '<!-- BEGIN GENERATED palette-colors -->\nWRONG\n<!-- END GENERATED palette-color -->',
  );
  assert.match(problems.join('\n'), /closed by an "palette-color" marker/);
});

test('a duplicated block cannot hide a stale copy', () => {
  const { problems } = scanBlockMarkers(`${wrap('palette-colors')}\n${wrap('palette-colors', 'WRONG')}`);
  assert.match(problems.join('\n'), /appears more than once/);
});

test('orphaned and unclosed markers are reported', () => {
  assert.match(scanBlockMarkers('<!-- END GENERATED source -->').problems.join('\n'), /without being opened/);
  assert.match(scanBlockMarkers('<!-- BEGIN GENERATED source -->').problems.join('\n'), /never closed/);
  assert.match(
    scanBlockMarkers('<!-- BEGIN GENERATED a -->\n<!-- BEGIN GENERATED b -->\n<!-- END GENERATED b -->').problems.join('\n'),
    /"a" is not closed before "b" begins/,
  );
});

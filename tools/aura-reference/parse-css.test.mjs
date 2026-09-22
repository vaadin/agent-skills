import assert from 'node:assert/strict';
import test from 'node:test';

import { collectDeclarations, collectVarReferences } from './lib/parse-css.mjs';

const sheets = (files) => new Map(Object.entries(files));

test('only root-scope declarations count as defaults', () => {
  const { defaults } = collectDeclarations(
    sheets({
      'aura.css': `
        :where(:root), :where(:host) { --aura-surface-level: 1; }
        :root, :host, vaadin-card, vaadin-grid { --aura-surface-opacity: 0.5; }
        vaadin-card { --aura-surface-level: 2; }
        :where(vaadin-dialog, vaadin-popover)::part(overlay) { --aura-surface-level: 4; }
        :is(#id, .aura-accent-red) { --aura-accent-color-light: red; }
      `,
    }),
  );

  assert.equal(defaults.get('--aura-surface-level').value, '1');
  assert.equal(defaults.get('--aura-surface-opacity').value, '0.5');
  assert.equal(defaults.has('--aura-accent-color-light'), false);
});

test('conditional declarations never become the default', () => {
  const { defaults } = collectDeclarations(
    sheets({
      'aura.css': `
        :where(:root) {
          --aura-base-size: 16;
          --aura-overlay-surface-opacity: 0.85;
          @media (prefers-reduced-transparency: reduce) { --aura-overlay-surface-opacity: 1 !important; }
        }
        @media (pointer: coarse) { :where(:root) { --aura-base-size: 18; } }
        @supports (color: hsl(0 0 0)) {
          @scope (:root) { :where(:scope) { --aura-app-background: none; } }
        }
      `,
    }),
  );

  assert.equal(defaults.get('--aura-base-size').value, '16');
  assert.equal(defaults.get('--aura-overlay-surface-opacity').value, '0.85');
  assert.equal(defaults.has('--aura-app-background'), false);
});

test('later declarations win, following @import order', () => {
  const { defaults, files } = collectDeclarations(
    sheets({
      'aura.css': `@import './src/first.css'; @import './src/second.css';`,
      'src/first.css': `:where(:root) { --aura-base-radius: 3; }`,
      'src/second.css': `:where(:root) { --aura-base-radius: 7; }`,
    }),
  );

  assert.deepEqual(files, ['src/first.css', 'src/second.css', 'aura.css']);
  assert.equal(defaults.get('--aura-base-radius').value, '7');
  assert.equal(defaults.get('--aura-base-radius').source, 'src/second.css');
});

test('values are collapsed, stripped of !important, and scanned for dependencies', () => {
  const { defaults } = collectDeclarations(
    sheets({
      'aura.css': `
        :where(:root) {
          --aura-neutral: light-dark(
            var(--aura-neutral-light),
            var(--aura-neutral-dark)
          ) !important;
        }
      `,
    }),
  );

  const neutral = defaults.get('--aura-neutral');
  assert.equal(neutral.value, 'light-dark(var(--aura-neutral-light), var(--aura-neutral-dark))');
  assert.equal(neutral.important, true);
  assert.deepEqual(neutral.dependsOn, ['--aura-neutral-light', '--aura-neutral-dark']);
});

test('comments and data URLs do not confuse the scanner', () => {
  const { defaults } = collectDeclarations(
    sheets({
      'aura.css': `
        :where(:root) {
          /* a comment with a } brace and a ; semicolon */
          --_vaadin-icon-menu: url('data:image/svg+xml;utf8,<svg><path d="M4 5h16"/></svg>');
          --aura-base-size: 16;
        }
      `,
    }),
  );

  assert.equal(defaults.get('--aura-base-size').value, '16');
});

test('collectVarReferences reports each referenced property once', () => {
  assert.deepEqual(collectVarReferences('calc(var(--a) + var(--b) * var(--a))'), ['--a', '--b']);
  assert.deepEqual(collectVarReferences('oklch(from var(--aura-red) l c h)'), ['--aura-red']);
  assert.deepEqual(collectVarReferences('0.85'), []);
});

test('a missing @import target fails loudly', () => {
  assert.throws(
    () => collectDeclarations(sheets({ 'aura.css': `@import './src/gone.css';` })),
    /missing src\/gone\.css/,
  );
});

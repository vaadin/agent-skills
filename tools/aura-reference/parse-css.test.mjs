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

test('a block-final declaration without a semicolon is not lost', () => {
  const { defaults } = collectDeclarations(sheets({ 'aura.css': `:root { --aura-base-size: 18 }` }));
  assert.equal(defaults.get('--aura-base-size').value, '18');
});

test('a semicolon inside an unquoted url() does not split the value', () => {
  const { defaults } = collectDeclarations(
    sheets({
      'aura.css': `:root { --aura-x: url(data:image/png;base64,AAAA); --aura-base-size: 16; }`,
    }),
  );
  assert.equal(defaults.get('--aura-x').value, 'url(data:image/png;base64,AAAA)');
  assert.equal(defaults.get('--aura-base-size').value, '16');
});

test('an escaped quote does not end the string early', () => {
  const { defaults } = collectDeclarations(
    sheets({
      'aura.css': String.raw`:root { --aura-font-family: "A\";B"; --aura-base-size: 16; }`,
    }),
  );
  assert.equal(defaults.get('--aura-font-family').value, String.raw`"A\";B"`);
  assert.equal(defaults.get('--aura-base-size').value, '16');
});

test('!important and selector specificity outrank document order', () => {
  const wins = (css) => collectDeclarations(sheets({ 'aura.css': css })).defaults.get('--aura-base-size').value;

  assert.equal(wins(`:root { --aura-base-size: 18 !important; } :root { --aura-base-size: 16; }`), '18');
  assert.equal(wins(`:root { --aura-base-size: 18 ! IMPORTANT; } :root { --aura-base-size: 16; }`), '18');
  assert.equal(wins(`:root { --aura-base-size: 18; } :where(:root) { --aura-base-size: 16; }`), '18');
  assert.equal(wins(`:root { --aura-base-size: 18; } html { --aura-base-size: 16; }`), '18');
  assert.equal(wins(`:is(:root, #theme) { --aura-base-size: 18; } :root { --aura-base-size: 16; }`), '18');
});

test('specificity is that of the selector matching root, not of the whole list', () => {
  // The block is shared with a component selector, but on root it is still a
  // zero-specificity `:where()` declaration, so the later one wins.
  const { defaults } = collectDeclarations(
    sheets({
      'aura.css': `:where(:root), vaadin-button { --aura-base-size: 18; } :where(:root) { --aura-base-size: 16; }`,
    }),
  );
  assert.equal(defaults.get('--aura-base-size').value, '16');
});

test('@layer fails loudly rather than being silently flattened', () => {
  const rejected = [
    `@layer second { :root { --aura-base-size: 18; } }`,
    `@import './a.css' layer(theme);`,
    `@import './a.css' layer;`,
    `@import './a.css' print;`,
    `@import './a.css' supports(display: grid);`,
  ];
  for (const css of rejected) {
    assert.throws(() => collectDeclarations(sheets({ 'aura.css': css, 'a.css': '' })), /not supported/, css);
  }
});

test('a nested @scope narrows out of root scope', () => {
  const rootScope = collectDeclarations(
    sheets({ 'aura.css': `@scope (:root) { :scope { --aura-base-size: 18; } }` }),
  );
  assert.equal(rootScope.defaults.get('--aura-base-size').value, '18');

  const nested = collectDeclarations(
    sheets({
      'aura.css': `:root { --aura-base-size: 16; } @scope (:root) { @scope (.card) { :scope { --aura-base-size: 18; } } }`,
    }),
  );
  assert.equal(nested.defaults.get('--aura-base-size').value, '16');

  const elsewhere = collectDeclarations(sheets({ 'aura.css': `@scope (.card) { :root { --aura-base-size: 18; } }` }));
  assert.equal(elsewhere.defaults.has('--aura-base-size'), false);
});

test('a comma inside an attribute selector is not a selector boundary', () => {
  const { defaults } = collectDeclarations(
    sheets({ 'aura.css': `[data-name="a,:root,b"] { --aura-base-size: 18; }` }),
  );
  assert.equal(defaults.has('--aura-base-size'), false);
});

test('a bare nested & stays in root scope, a narrowing one does not', () => {
  const nested = collectDeclarations(sheets({ 'aura.css': `:root { & { --aura-base-size: 18; } }` }));
  assert.equal(nested.defaults.get('--aura-base-size').value, '18');

  const narrowed = collectDeclarations(sheets({ 'aura.css': `:root { & vaadin-card { --aura-base-size: 18; } }` }));
  assert.equal(narrowed.defaults.has('--aura-base-size'), false);
});

test('@scope targets root without being a condition, unlike @media', () => {
  const scoped = collectDeclarations(sheets({ 'aura.css': `@scope (:root) { :scope { --aura-base-size: 18; } }` }));
  assert.equal(scoped.defaults.get('--aura-base-size').value, '18');

  const upperCase = collectDeclarations(
    sheets({ 'aura.css': `@MEDIA (pointer: coarse) { :root { --aura-base-size: 18; } }` }),
  );
  assert.equal(upperCase.defaults.has('--aura-base-size'), false);
});

test('@import inside a comment is not followed, and cycles fail loudly', () => {
  const { defaults } = collectDeclarations(
    sheets({ 'aura.css': `/* @import './ghost.css'; */ :root { --aura-base-size: 16; }` }),
  );
  assert.equal(defaults.get('--aura-base-size').value, '16');

  assert.throws(
    () => collectDeclarations(sheets({ 'aura.css': `@import './a.css';`, 'a.css': `@import './aura.css';` })),
    /Circular @import/,
  );
});

test('a sheet imported twice is applied twice, as the cascade would', () => {
  const { defaults } = collectDeclarations(
    sheets({
      'aura.css': `@import './a.css'; @import './b.css'; @import './a.css';`,
      'a.css': `:where(:root) { --aura-base-size: 18; }`,
      'b.css': `:where(:root) { --aura-base-size: 16; }`,
    }),
  );
  assert.equal(defaults.get('--aura-base-size').value, '18');
});

test('an enclosing @scope that excludes root excludes the declaration', () => {
  const enclosed = collectDeclarations(
    sheets({
      'aura.css': `@scope (.card) { @scope (:root) { :root { --aura-base-size: 18; } } } :root { --aura-base-size: 16; }`,
    }),
  );
  assert.equal(enclosed.defaults.get('--aura-base-size').value, '16');
});

test('a nearer @scope wins at equal specificity', () => {
  const { defaults } = collectDeclarations(
    sheets({ 'aura.css': `@scope (:root) { :root { --aura-base-size: 18; } } :root { --aura-base-size: 16; }` }),
  );
  assert.equal(defaults.get('--aura-base-size').value, '18');
});

test('specificity counts every component of a compound selector', () => {
  const { defaults } = collectDeclarations(
    sheets({ 'aura.css': `:is(:root, .a.b) { --aura-base-size: 18; } :root { --aura-base-size: 16; }` }),
  );
  assert.equal(defaults.get('--aura-base-size').value, '18');
});

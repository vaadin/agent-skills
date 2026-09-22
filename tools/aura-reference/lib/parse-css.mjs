/**
 * Walks Aura's stylesheets in cascade order and records every `--aura-*`
 * declaration, separating the ones that land in root scope unconditionally
 * — those are the theme's defaults — from component- and media-scoped ones.
 */

const AT_RULE_CONDITIONS = /^@(media|supports|container|scope)\b/;

/** Splits a selector list on commas that are not inside parentheses. */
function splitTopLevel(text) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const char of text) {
    if (char === '(') depth++;
    else if (char === ')') depth--;
    if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current.trim());
  return parts.filter(Boolean);
}

/** True for `:root`, `:host`, `html`, and any `:where()`/`:is()` wrapping of them. */
function isRootSelector(selector) {
  const normalized = selector.trim();
  if (normalized === ':root' || normalized === ':host' || normalized === 'html') return true;

  const wrapper = /^:(?:where|is)\((.*)\)$/s.exec(normalized);
  if (!wrapper) return false;
  // A wrapper only counts when it spans the whole selector, not when something
  // follows it — `:where(vaadin-dialog)::part(overlay)` is not root scope.
  let depth = 0;
  for (let i = 0; i < normalized.length; i++) {
    if (normalized[i] === '(') depth++;
    else if (normalized[i] === ')' && --depth === 0 && i !== normalized.length - 1) return false;
  }
  return splitTopLevel(wrapper[1]).some(isRootSelector);
}

function matchesRoot(selectorList, atRules) {
  if (splitTopLevel(selectorList).some(isRootSelector)) return true;
  // `@scope (:root) { :where(:scope) { … } }` addresses the root element too.
  const scoped = /^:(?:where|is)\(:scope\)$|^:scope$/.test(selectorList.trim());
  if (!scoped) return false;
  return atRules.some((rule) => {
    const root = /^@scope\s*\((.*?)\)/.exec(rule);
    return root ? splitTopLevel(root[1]).some(isRootSelector) : false;
  });
}

/** Collapses the multi-line values Aura uses for `light-dark()` and `oklch()`. */
function normalizeValue(value) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\s+,/g, ',')
    .trim();
}

export function collectVarReferences(value) {
  const references = new Set();
  for (const match of value.matchAll(/var\(\s*(--[\w-]+)/g)) references.add(match[1]);
  return [...references];
}

/**
 * Scans one stylesheet, invoking `onDeclaration` for each custom property with
 * the selector and at-rule context it was declared in.
 */
function scanStylesheet(css, onDeclaration) {
  const stack = [];
  let buffer = '';

  for (let i = 0; i < css.length; i++) {
    const char = css[i];

    if (char === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      i = end === -1 ? css.length : end + 1;
      continue;
    }

    if (char === '"' || char === "'") {
      const end = css.indexOf(char, i + 1);
      const stop = end === -1 ? css.length : end;
      buffer += css.slice(i, stop + 1);
      i = stop;
      continue;
    }

    if (char === '{') {
      stack.push(buffer.trim());
      buffer = '';
      continue;
    }

    if (char === '}') {
      stack.pop();
      buffer = '';
      continue;
    }

    if (char === ';') {
      const declaration = buffer.trim();
      buffer = '';
      if (!declaration.startsWith('--')) continue; // @import and friends
      const colon = declaration.indexOf(':');
      if (colon === -1) continue;

      const name = declaration.slice(0, colon).trim();
      let value = normalizeValue(declaration.slice(colon + 1));
      const important = /!important$/.test(value);
      if (important) value = value.replace(/\s*!important$/, '');

      const atRules = stack.filter((entry) => entry.startsWith('@'));
      const selectors = stack.filter((entry) => !entry.startsWith('@'));
      onDeclaration({
        name,
        value,
        important,
        selector: selectors.at(-1) ?? '',
        root: selectors.length === 1 && matchesRoot(selectors[0], atRules),
        conditional: atRules.some((rule) => AT_RULE_CONDITIONS.test(rule)),
        conditions: atRules.filter((rule) => AT_RULE_CONDITIONS.test(rule)),
      });
      continue;
    }

    buffer += char;
  }
}

/** Resolves a relative `@import` target against the importing file's directory. */
function resolvePath(directory, target) {
  const segments = directory ? directory.split('/') : [];
  for (const segment of target.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') segments.pop();
    else segments.push(segment);
  }
  return segments.join('/');
}

/** Resolves `@import` in the order a browser would apply the sheets. */
function cascadeOrder(stylesheets, entry, seen = new Set()) {
  if (seen.has(entry)) return [];
  seen.add(entry);

  const css = stylesheets.get(entry);
  if (css === undefined) throw new Error(`Aura package is missing ${entry}`);

  const directory = entry.includes('/') ? entry.slice(0, entry.lastIndexOf('/')) : '';
  const order = [];
  for (const match of css.matchAll(/@import\s+(?:url\()?['"](.+?)['"]\)?\s*;/g)) {
    order.push(...cascadeOrder(stylesheets, resolvePath(directory, match[1]), seen));
  }
  order.push(entry);
  return order;
}

/**
 * Collects the theme's defaults: the last value each custom property is given
 * in root scope outside any `@media`/`@supports`/`@container` condition.
 * Component- and condition-scoped declarations are deliberately excluded —
 * `vaadin-card { --aura-surface-level: 2 }` is not the theme default.
 *
 * @returns {{defaults: Map<string, object>, files: string[]}}
 */
export function collectDeclarations(stylesheets, entry = 'aura.css') {
  const files = cascadeOrder(stylesheets, entry);
  const defaults = new Map();

  for (const file of files) {
    scanStylesheet(stylesheets.get(file), (declaration) => {
      if (!declaration.root || declaration.conditional) return;
      defaults.set(declaration.name, {
        ...declaration,
        source: file,
        dependsOn: collectVarReferences(declaration.value),
      });
    });
  }

  return { defaults, files };
}

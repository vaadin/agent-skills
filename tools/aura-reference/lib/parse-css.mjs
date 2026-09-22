/**
 * Walks Aura's stylesheets in cascade order and records every custom property
 * declaration, separating the ones that land in root scope unconditionally
 * — those are the theme's defaults — from component- and media-scoped ones.
 *
 * This is not a general CSS engine. It resolves the cascade far enough for a
 * theme's root declarations — `!important`, the specificity of the selector
 * that matches root, and document order — and throws on constructs it cannot
 * resolve (`@layer`, a conditional `@import`) rather than picking a value that
 * might be wrong.
 */

/** Environmental conditions. `@scope` is not one: it narrows where a rule matches. */
const AT_RULE_CONDITIONS = /^@(media|supports|container)\b/i;

/** Skips over a quoted string, honouring backslash escapes. Returns the end index. */
function endOfString(text, start) {
  const quote = text[start];
  for (let i = start + 1; i < text.length; i++) {
    if (text[i] === '\\') i++;
    else if (text[i] === quote) return i;
  }
  return text.length - 1;
}

/** Splits a selector list on commas that are outside parentheses and strings. */
function splitTopLevel(text) {
  const parts = [];
  let depth = 0;
  let current = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' || char === "'") {
      const end = endOfString(text, i);
      current += text.slice(i, end + 1);
      i = end;
      continue;
    }
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

  const wrapper = /^:(?:where|is)\((.*)\)$/is.exec(normalized);
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
  // Only the innermost `@scope` decides what the rule — and `:scope` — refers
  // to. `@scope (:root) { @scope (.card) { … } }` is scoped to cards.
  const innermostScope = atRules.filter((rule) => /^@scope\b/i.test(rule)).at(-1);
  if (innermostScope !== undefined) {
    const prelude = /^@scope\s*\((.*?)\)/i.exec(innermostScope);
    if (!prelude || !splitTopLevel(prelude[1]).some(isRootSelector)) return false;
  }

  if (splitTopLevel(selectorList).some(isRootSelector)) return true;
  // `@scope (:root) { :scope { … } }` addresses the root element too.
  return innermostScope !== undefined && /^(?::(?:where|is)\(:scope\)|:scope)$/i.test(selectorList.trim());
}

/**
 * Approximate specificity of one compound selector: id, then class/attribute/
 * pseudo-class, then type. `:where()` contributes nothing and `:is()` takes its
 * most specific argument, as the selectors spec says.
 */
function selectorWeight(selector) {
  const wrapper = /^:(where|is|matches)\((.*)\)$/is.exec(selector.trim());
  if (wrapper) {
    if (/^where$/i.test(wrapper[1])) return 0;
    return Math.max(0, ...splitTopLevel(wrapper[2]).map(selectorWeight));
  }
  const compound = selector.trim();
  if (compound.startsWith('#')) return 100;
  if (/^[.[:]/.test(compound)) return 10;
  return 1;
}

/**
 * The weight a declaration carries *on the root element*. Only the parts of the
 * list that match root count: a block shared with component selectors still
 * lands on root with the weight of its own root selector, so
 * `:where(:root), vaadin-button` stays a zero-specificity root declaration.
 */
function rootSpecificity(selectorList) {
  const matching = splitTopLevel(selectorList).filter(isRootSelector);
  return matching.length === 0 ? 0 : Math.max(...matching.map(selectorWeight));
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
 * Scans one stylesheet, reporting each custom property with the selector and
 * at-rule context it was declared in, and each top-level at-statement.
 *
 * Comments and strings are skipped, and `;` only ends a declaration outside
 * parentheses — an unquoted `url(data:image/png;base64,…)` is one value, not two.
 */
function scanStylesheet(css, { onDeclaration, onStatement }) {
  const stack = [];
  let buffer = '';
  let parens = 0;

  const emit = () => {
    const text = buffer.trim();
    buffer = '';
    if (text === '') return;

    if (text.startsWith('@')) {
      onStatement?.(text);
      return;
    }

    const colon = text.indexOf(':');
    if (!text.startsWith('--') || colon === -1) return;

    const name = text.slice(0, colon).trim();
    let value = normalizeValue(text.slice(colon + 1));
    const important = /!\s*important$/i.test(value);
    if (important) value = value.replace(/\s*!\s*important$/i, '');

    const atRules = stack.filter((entry) => entry.startsWith('@'));
    // A nested `&` on its own re-states the parent selector rather than
    // narrowing it, so it does not take the declaration out of root scope.
    const selectors = stack.filter((entry) => !entry.startsWith('@') && entry !== '&');
    const selector = selectors.at(-1) ?? '';

    onDeclaration({
      name,
      value,
      important,
      selector,
      specificity: rootSpecificity(selector),
      root: selectors.length === 1 && matchesRoot(selector, atRules),
      conditional: atRules.some((rule) => AT_RULE_CONDITIONS.test(rule)),
      conditions: atRules.filter((rule) => AT_RULE_CONDITIONS.test(rule)),
    });
  };

  for (let i = 0; i < css.length; i++) {
    const char = css[i];

    if (char === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      i = end === -1 ? css.length : end + 1;
      continue;
    }

    if (char === '"' || char === "'") {
      const end = endOfString(css, i);
      buffer += css.slice(i, end + 1);
      i = end;
      continue;
    }

    if (char === '{') {
      const prelude = buffer.trim();
      buffer = '';
      parens = 0;
      if (/^@layer\b/i.test(prelude)) throw new Error(`@layer is not supported: ${prelude}`);
      stack.push(prelude);
      continue;
    }

    if (char === '}') {
      emit(); // a block's last declaration may omit its semicolon
      stack.pop();
      parens = 0;
      continue;
    }

    if (char === ';' && parens === 0) {
      emit();
      continue;
    }

    if (char === '(') parens++;
    else if (char === ')') parens = Math.max(0, parens - 1);
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

/** The targets a stylesheet imports, in source order. */
function importTargets(css, directory) {
  const targets = [];
  scanStylesheet(css, {
    onDeclaration: () => {},
    onStatement: (statement) => {
      if (/^@layer\b/i.test(statement)) throw new Error(`@layer is not supported: ${statement}`);
      if (!/^@import\b/i.test(statement)) return;

      const target = /^@import\s+(?:url\(\s*)?(?:'([^']*)'|"([^"]*)"|([^\s'")]+))\s*\)?/i.exec(statement);
      if (!target) throw new Error(`Unrecognized @import: ${statement}`);

      const qualifiers = statement.slice(target[0].length).trim();
      if (qualifiers !== '') {
        throw new Error(
          `@import with a layer, supports() or media qualifier is not supported: ${statement}\n` +
            'Such a sheet applies conditionally, which this generator cannot represent as a default.',
        );
      }
      targets.push(resolvePath(directory, target[1] ?? target[2] ?? target[3]));
    },
  });
  return targets;
}

/** Resolves `@import` in the order a browser would apply the sheets. */
function cascadeOrder(stylesheets, entry, chain = []) {
  if (chain.includes(entry)) throw new Error(`Circular @import: ${[...chain, entry].join(' -> ')}`);

  const css = stylesheets.get(entry);
  if (css === undefined) throw new Error(`Aura package is missing ${entry}`);

  const directory = entry.includes('/') ? entry.slice(0, entry.lastIndexOf('/')) : '';
  const order = [];
  for (const target of importTargets(css, directory)) {
    order.push(...cascadeOrder(stylesheets, target, [...chain, entry]));
  }
  order.push(entry);
  return order;
}

/**
 * Orders two competing root declarations the way the cascade would: an
 * `!important` declaration wins, then the more specific selector, then the one
 * that comes later.
 */
function wins(candidate, incumbent) {
  if (!incumbent) return true;
  if (candidate.important !== incumbent.important) return candidate.important;
  return candidate.specificity >= incumbent.specificity;
}

/**
 * Collects the theme's defaults: the value each custom property resolves to in
 * root scope outside any `@media`/`@supports`/`@container` condition.
 * Component- and condition-scoped declarations are deliberately excluded —
 * `vaadin-card { --aura-surface-level: 2 }` is not the theme default.
 *
 * @returns {{defaults: Map<string, object>, files: string[]}}
 */
export function collectDeclarations(stylesheets, entry = 'aura.css') {
  const files = cascadeOrder(stylesheets, entry);
  const defaults = new Map();

  for (const file of files) {
    scanStylesheet(stylesheets.get(file), {
      onDeclaration: (declaration) => {
        if (!declaration.root || declaration.conditional) return;
        const record = {
          ...declaration,
          source: file,
          dependsOn: collectVarReferences(declaration.value),
        };
        if (wins(record, defaults.get(record.name))) defaults.set(record.name, record);
      },
    });
  }

  return { defaults, files };
}

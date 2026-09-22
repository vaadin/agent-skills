/**
 * Reads the write-safety classification out of the Aura reference pages in
 * vaadin/docs.
 *
 * "Computed from other properties" and "not meant to be written" are different
 * things — nine of Aura's computed properties are exactly the documented way to
 * customize the theme. Only the docs record that intent, via two badges:
 *
 *   `--aura-x` xref:./#read-only-properties[Read-only,role=badge]::
 *   `--aura-x` xref:#light-dark-function[light-dark(),role="badge light-dark"]::
 *
 * Both mark a property as read-only; the second also says it adapts to the
 * color scheme. A property documented with neither badge is customizable.
 */

const PROPERTY_PATTERN = /`(--aura-[\w*-]+)`([^`]*)$/;

/** Turns an asciidoc fragment into plain prose: links become their label. */
function toPlainText(text) {
  return text
    .replace(/xref:[^[\]]*\[([^\]]*)\]/g, (_, label) => label.split(',')[0])
    .replace(/<<[^,>]*,([^>]*)>>/g, '$1')
    .replace(/<<([^>]*)>>/g, '$1')
    .replace(/link:\S+\[([^\]]*)\]/g, '$1')
    .replace(/https?:\/\/\S+\[([^\]]*)\]/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/_([^_]*)_/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstSentence(text) {
  const match = /^(.*?[.!?])(?:\s|$)/s.exec(text);
  return (match ? match[1] : text).trim();
}

function classifyBadges(trailer) {
  const readOnly = /role=(?:"[^"]*\bbadge\b[^"]*"|badge\b)/.test(trailer);
  const lightDark = /role="badge light-dark"/.test(trailer);
  return { readOnly, lightDark };
}

/**
 * @param {Map<string, string>} documents  page name -> asciidoc source
 * @returns {Map<string, {page: string, readOnly: boolean, lightDark: boolean, description: string}>}
 */
export function parseDocumentedProperties(documents) {
  const properties = new Map();

  for (const [page, source] of documents) {
    const lines = source.split('\n');

    lines.forEach((line, index) => {
      // Definition-list entries ("`--aura-x` <badges>::") and table cells
      // ("|`--aura-x` <badges>") are the only two shapes the reference uses.
      const cells = line.startsWith('|') ? line.slice(1).split('|') : line.endsWith('::') ? [line.slice(0, -2)] : [];

      for (const cell of cells) {
        const match = PROPERTY_PATTERN.exec(cell.trim());
        if (!match) continue;
        const [, name, trailer] = match;
        if (name.includes('*')) continue; // "`--aura-*-text`" stands for a group

        const description = line.endsWith('::')
          ? firstSentence(toPlainText(lines[index + 1] ?? ''))
          : '';
        properties.set(name, { page, ...classifyBadges(trailer), description });
      }
    });
  }

  return properties;
}

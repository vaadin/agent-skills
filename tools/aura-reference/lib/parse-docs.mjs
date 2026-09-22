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
 *
 * The dangerous failure direction here is read-only silently becoming
 * customizable, which would tell the model it may overwrite a property Aura
 * computes. Three things guard against it: badge markup is recognized in every
 * form these docs use, a classification is only ever raised and never lowered
 * by a later mention, and text that looks like an unrecognized badge fails the
 * run instead of being read as "no badge".
 */

/** `role=badge`, `role="badge light-dark"`, `role='badge light-dark'`. */
const ROLE_ATTRIBUTE = /role\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s,\]]+))/g;

/** The block/inline badge forms used elsewhere in the same docs: `[badge]*X*`, `[.badge]#X#`. */
const BADGE_SPAN = /\[\.?badge(?:[.\s][^\]]*)?\]/i;

/** Wording that means a badge is present even if its markup is not recognized. */
const BADGE_WORDING = /read-only|light-dark\(\)/i;

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

function classifyBadges(trailer, context) {
  const roles = [...trailer.matchAll(ROLE_ATTRIBUTE)].map((match) => match[1] ?? match[2] ?? match[3]);
  const readOnly = roles.some((role) => /\bbadge\b/.test(role)) || BADGE_SPAN.test(trailer);
  const lightDark = roles.some((role) => /\blight-dark\b/.test(role));

  if (!readOnly && BADGE_WORDING.test(trailer)) {
    throw new Error(
      `Unrecognized badge markup in ${context}:\n  ${trailer.trim()}\n` +
        'The text reads as a read-only badge but no known badge form matched, which would silently ' +
        'reclassify the property as customizable. Teach lib/parse-docs.mjs the new markup.',
    );
  }

  return { readOnly, lightDark };
}

/**
 * Splits a page into the lines that can carry a property: definition-list terms
 * and table rows. An asciidoc table cell may continue on following lines, so a
 * row is joined before it is read — otherwise a badge that wrapped onto the
 * next line would be missed, and the property read as customizable.
 */
function propertyLines(source) {
  const lines = source.split('\n');
  const entries = [];

  let inTable = false;
  let inComment = false;
  let row = null;

  const flushRow = () => {
    if (row !== null) entries.push({ text: row, cells: true, description: '' });
    row = null;
  };

  lines.forEach((raw, index) => {
    const line = raw.trim();

    if (line === '////') {
      inComment = !inComment;
      return;
    }
    if (inComment || line.startsWith('//')) return;

    if (/^\|={3,}$/.test(line)) {
      flushRow();
      inTable = !inTable;
      return;
    }

    if (inTable) {
      if (line === '') flushRow();
      else if (line.startsWith('|')) {
        flushRow();
        row = line;
      } else if (row !== null) row += ` ${line}`;
      return;
    }

    // A definition term is `<term>::` on one line; asciidoc does not wrap it.
    if (line.endsWith('::')) {
      entries.push({
        text: line.slice(0, -2),
        cells: false,
        description: firstSentence(toPlainText(lines[index + 1] ?? '')),
      });
    }
  });

  flushRow();
  return entries;
}

/**
 * @param {Map<string, string>} documents  page name -> asciidoc source
 * @returns {Map<string, {page: string, readOnly: boolean, lightDark: boolean, description: string}>}
 */
export function parseDocumentedProperties(documents) {
  const properties = new Map();

  for (const [page, source] of documents) {
    for (const entry of propertyLines(source)) {
      const cells = entry.cells ? entry.text.slice(1).split('|') : [entry.text];

      for (const cell of cells) {
        const match = PROPERTY_PATTERN.exec(cell.trim());
        if (!match) continue;
        const [, name, trailer] = match;
        if (name.includes('*')) continue; // "`--aura-*-text`" stands for a group

        const badges = classifyBadges(trailer, `${page}.adoc, ${name}`);
        const previous = properties.get(name);
        // Only ever raise a classification. A property documented once with a
        // badge and mentioned again without one is still read-only.
        properties.set(name, {
          page: previous?.page ?? page,
          readOnly: (previous?.readOnly ?? false) || badges.readOnly,
          lightDark: (previous?.lightDark ?? false) || badges.lightDark,
          description: previous?.description || entry.description,
        });
      }
    }
  }

  return properties;
}

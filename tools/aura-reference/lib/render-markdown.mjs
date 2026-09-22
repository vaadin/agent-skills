/**
 * Replaces the generated blocks of a Markdown reference in place.
 *
 * Everything outside a `<!-- BEGIN GENERATED … -->` / `<!-- END GENERATED … -->`
 * pair is hand-written guidance and is never touched. An unknown block id, or a
 * block naming a property Aura no longer ships, fails the run — that is how
 * drift surfaces instead of going unnoticed.
 */

const BLOCK_PATTERN = /([ \t]*)<!-- BEGIN GENERATED (\S+) -->\n[\s\S]*?\n[ \t]*<!-- END GENERATED \2 -->/g;

function table(headers, rows) {
  const lines = [`| ${headers.join(' | ')} |`, `|${headers.map(() => '---').join('|')}|`];
  for (const row of rows) lines.push(`| ${row.join(' | ')} |`);
  return lines.join('\n');
}

function code(value) {
  return `\`${value}\``;
}

/** Aura deps only: those are the properties a theme author can actually set. */
function auraDependencies(property) {
  return property.dependsOn.filter((name) => name.startsWith('--aura-'));
}

/**
 * Walks a read-only property's dependencies down to the customizable `--aura-*`
 * properties behind it, passing through Aura's own read-only and private
 * (`--_*`) intermediates. `--aura-font-size-xs` is computed from
 * `--aura-font-size-m`, which is read-only too; what you actually set is
 * `--aura-base-font-size`.
 */
function customizableSources(property, properties, derived) {
  const sources = [];
  const visited = new Set([property.name]);
  const queue = [...property.dependsOn];

  while (queue.length > 0) {
    const name = queue.shift();
    if (visited.has(name)) continue;
    visited.add(name);

    const dependency = properties.get(name);
    if (dependency?.writable) {
      sources.push(name);
      continue;
    }
    queue.push(...(dependency ?? derived.get(name))?.dependsOn ?? []);
  }

  return sources;
}

/**
 * Long `light-dark()`/`oklch()` formulas say nothing a theme author can act on;
 * the properties they are computed from do.
 */
function describeDefault(property) {
  if (property.value === null) return 'not set (opt-in)';
  const dependencies = auraDependencies(property);
  if (property.value.length > 48 && dependencies.length > 0) {
    return `computed from ${dependencies.map(code).join(', ')}`;
  }
  return code(property.value);
}

/**
 * A table of literal colors with the sRGB they render as. Values outside the
 * sRGB gamut are footnoted rather than passed off as exact.
 */
function colorTable(properties, blockId, names) {
  const resolved = names.map((name) => requireProperty(properties, name, blockId));
  const rows = resolved.map((property) => {
    const hex = property.color ? code(property.color.hex) : '—';
    const clipped = property.color && !property.color.inSrgbGamut;
    return [code(property.name), code(property.value), `${hex}${clipped ? ' \\*' : ''}`];
  });

  const lines = [table(['Property', 'Aura default', 'sRGB (as rendered)'], rows)];
  if (resolved.some((property) => property.color && !property.color.inSrgbGamut)) {
    lines.push(
      '',
      '\\* Outside the sRGB gamut. The hex is what browsers paint on an sRGB display; on a wide-gamut display these render more saturated.',
    );
  }
  return lines.join('\n');
}

function requireProperty(properties, name, blockId) {
  const property = properties.get(name);
  if (!property) {
    throw new Error(`Block "${blockId}" needs ${name}, which this version of @vaadin/aura does not declare`);
  }
  return property;
}

const PALETTE = ['--aura-red', '--aura-orange', '--aura-yellow', '--aura-green', '--aura-blue', '--aura-purple'];
const RADIUS_STEPS = ['--vaadin-radius-s', '--vaadin-radius-m', '--vaadin-radius-l'];

function buildBlock(id, context) {
  const { properties, derived, metadata } = context;

  const inlineDefault = /^default:(--[\w-]+)$/.exec(id);
  if (inlineDefault) {
    return `Aura default: ${describeDefault(requireProperty(properties, inlineDefault[1], id))}`;
  }

  switch (id) {
    case 'source':
      return [
        `Property defaults below are generated from \`@vaadin/aura@${metadata.auraVersion}\`;`,
        `read-only classification from \`vaadin/docs\` \`${metadata.docs.branch}\` (\`${metadata.docs.commit.slice(0, 7)}\`).`,
        `Regenerate with \`node tools/aura-reference/generate.mjs\`.`,
      ].join('\n');

    case 'palette-colors':
      return colorTable(properties, id, PALETTE);

    case 'neutral-colors':
      // The description column carries the docs' own "a dark gray"/"white"
      // wording: the dependency list says where the value comes from, but not
      // what it looks like, which is what a theme author is picturing.
      return table(
        ['Property', 'Aura default', 'Write?', 'Notes'],
        ['--aura-neutral', '--aura-neutral-light', '--aura-neutral-dark'].map((name) => {
          const property = requireProperty(properties, name, id);
          return [
            code(name),
            describeDefault(property),
            property.writable ? 'customizable' : 'read-only',
            property.description || '—',
          ];
        }),
      );

    case 'accent-colors':
      return colorTable(properties, id, ['--aura-accent-color-light', '--aura-accent-color-dark']);

    case 'background-colors':
      return colorTable(properties, id, ['--aura-background-color-light', '--aura-background-color-dark']);

    case 'radius-steps': {
      const lines = RADIUS_STEPS.map((name) => {
        const step = derived.get(name);
        if (!step) throw new Error(`Block "${id}" needs ${name}, which @vaadin/aura no longer declares at root scope`);
        return `${name}: ${step.value};`;
      });
      return ['```css', ...lines, '```'].join('\n');
    }

    case 'customizable-properties':
      return table(
        ['Property', 'Default'],
        [...properties.values()]
          .filter((property) => property.writable)
          .map((property) => [code(property.name), describeDefault(property)]),
      );

    case 'read-only-properties':
      return table(
        ['Property', 'Set these instead'],
        [...properties.values()]
          .filter((property) => !property.writable)
          .map((property) => {
            const sources = customizableSources(property, properties, derived);
            return [code(property.name), sources.length > 0 ? sources.map(code).join(', ') : '—'];
          }),
      );

    default:
      throw new Error(`No generator for block "${id}"`);
  }
}

/**
 * Every generated marker in the document, paired up.
 *
 * Rendering alone cannot police this: an orphaned or duplicated marker simply
 * fails to match the block pattern, leaving stale content in place while the
 * run reports success. Reading the raw markers is what makes that visible.
 *
 * @returns {{ids: string[], problems: string[]}}
 */
export function scanBlockMarkers(markdown) {
  const markers = [...markdown.matchAll(/<!--\s*(BEGIN|END) GENERATED (\S+?)\s*-->/g)];
  const problems = [];
  const ids = [];
  let open = null;

  for (const [, kind, id] of markers) {
    if (kind === 'BEGIN') {
      if (open !== null) problems.push(`"${open}" is not closed before "${id}" begins`);
      else if (ids.includes(id)) problems.push(`"${id}" appears more than once`);
      open = id;
    } else if (open === null) {
      problems.push(`"${id}" is closed without being opened`);
    } else {
      if (open !== id) problems.push(`"${open}" is closed by an "${id}" marker`);
      ids.push(open);
      open = null;
    }
  }

  if (open !== null) problems.push(`"${open}" is never closed`);
  return { ids, problems };
}

export function renderGeneratedBlocks(markdown, context) {
  const seen = new Set();
  const rendered = markdown.replace(BLOCK_PATTERN, (_, indent, id) => {
    seen.add(id);
    const body = buildBlock(id, context)
      .split('\n')
      .map((line) => (line ? indent + line : line))
      .join('\n');
    return `${indent}<!-- BEGIN GENERATED ${id} -->\n${body}\n${indent}<!-- END GENERATED ${id} -->`;
  });
  return { markdown: rendered, blocks: [...seen] };
}

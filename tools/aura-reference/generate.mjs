#!/usr/bin/env node
/**
 * Regenerates the factual parts of the aura-theme skill reference from the
 * published @vaadin/aura package, so they cannot drift from what Aura ships.
 *
 *   node tools/aura-reference/generate.mjs                write the artifact and reference
 *   node tools/aura-reference/generate.mjs --check        fail if either is out of date
 *   node tools/aura-reference/generate.mjs --update-docs  re-pin the docs commit to the branch head
 *
 * Two facts are gathered from two sources, because neither has both:
 *   - the defaults come from the package's own CSS;
 *   - whether a property is meant to be written comes from the Aura reference
 *     pages in vaadin/docs, which mark read-only properties with a badge.
 * "Computed from other properties" and "do not write" are kept apart: nine of
 * Aura's computed properties are the documented way to customize the theme.
 *
 * Both sources are pinned in config.json, so a run is reproducible and --check
 * only fails when something that matters has actually changed.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

import { fetchAuraDocs, fetchAuraStylesheets, resolveDocsCommit } from './lib/fetch-sources.mjs';
import { collectDeclarations } from './lib/parse-css.mjs';
import { parseDocumentedProperties } from './lib/parse-docs.mjs';
import { resolveColor } from './lib/color.mjs';
import { renderGeneratedBlocks } from './lib/render-markdown.mjs';

const toolDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = join(toolDirectory, '..', '..');

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

/**
 * Merges the CSS defaults with the documented write-safety classification, and
 * refuses to produce an artifact it cannot fully classify.
 */
function buildProperties(cssDefaults, documented, overrides) {
  const names = new Set([...cssDefaults.keys()].filter((name) => name.startsWith('--aura-')));
  for (const name of documented.keys()) names.add(name);

  const unclassified = [...names].filter((name) => !documented.has(name) && !overrides[name]);
  if (unclassified.length > 0) {
    throw new Error(
      `Aura declares ${unclassified.length} property(ies) that are neither documented in vaadin/docs nor listed in ` +
        `classification.json, so their write-safety is unknown:\n  ${unclassified.sort().join('\n  ')}\n` +
        'Add them to classification.json (with a reason), or re-pin docs.commit to a revision that documents them.',
    );
  }

  const stale = Object.keys(overrides).filter((name) => !names.has(name) || documented.has(name));
  if (stale.length > 0) {
    throw new Error(
      `classification.json has entries that are no longer needed — Aura either dropped them or the docs now ` +
        `classify them:\n  ${stale.sort().join('\n  ')}\nRemove them.`,
    );
  }

  const properties = [...names].sort().map((name) => {
    const declaration = cssDefaults.get(name);
    const documentation = documented.get(name);
    const override = overrides[name];

    const value = declaration ? declaration.value : null;
    const dependsOn = declaration ? declaration.dependsOn : [];
    const writable = documentation ? !documentation.readOnly : override.writable;

    return {
      name,
      value,
      declaredIn: declaration ? declaration.source : null,
      computed: dependsOn.length > 0,
      dependsOn,
      writable,
      classification: writable ? 'customizable' : documentation ? 'read-only' : 'internal',
      classificationSource: documentation ? 'docs' : 'classification.json',
      colorScheme: documentation ? documentation.lightDark : false,
      color: value === null ? null : resolveColor(value),
      description: documentation?.description || override?.reason || '',
    };
  });

  resolveAliasedColors(properties);
  return properties;
}

/**
 * Aura points some properties straight at another one — `--aura-accent-color-light`
 * is `var(--aura-blue)`. Following those aliases gives the alias its own color
 * instead of leaving a hole in the reference.
 */
function resolveAliasedColors(properties) {
  const byName = new Map(properties.map((property) => [property.name, property]));

  for (const property of properties) {
    if (property.color || property.value === null) continue;

    const visited = new Set([property.name]);
    let current = property;
    while (current) {
      const alias = /^var\(\s*(--[\w-]+)\s*\)$/.exec(current.value ?? '');
      if (!alias || visited.has(alias[1])) break;
      visited.add(alias[1]);
      current = byName.get(alias[1]);
      if (current?.color) {
        property.color = { ...current.color, via: current.name };
        break;
      }
    }
  }
}

async function generate(config) {
  const { properties: overrides } = await readJson(join(toolDirectory, 'classification.json'));

  const { url, stylesheets } = await fetchAuraStylesheets(config.aura.version);
  const { defaults, files } = collectDeclarations(stylesheets);

  const documented = parseDocumentedProperties(await fetchAuraDocs(config.docs.commit, config.docs.pages));
  const properties = buildProperties(defaults, documented, overrides);

  const artifact = {
    comment: `Generated by ${relative(repositoryRoot, fileURLToPath(import.meta.url))} — do not edit by hand.`,
    aura: { package: '@vaadin/aura', version: config.aura.version, tarball: url, stylesheets: files.length },
    docs: { repository: 'vaadin/docs', ...config.docs },
    properties,
  };

  const referencePath = join(repositoryRoot, config.outputs.reference);
  const { markdown, blocks } = renderGeneratedBlocks(await readFile(referencePath, 'utf8'), {
    properties: new Map(properties.map((property) => [property.name, property])),
    derived: defaults,
    metadata: { auraVersion: config.aura.version, docs: config.docs },
  });

  return {
    blocks,
    outputs: [
      { path: join(repositoryRoot, config.outputs.artifact), contents: `${JSON.stringify(artifact, null, 2)}\n` },
      { path: referencePath, contents: markdown },
    ],
  };
}

/** Re-pins config.json to the current head of the docs branch. */
async function updateDocsPin(configPath, config) {
  const commit = await resolveDocsCommit(config.docs.branch);
  if (commit === config.docs.commit) {
    console.log(`Docs pin already at ${config.docs.branch} head (${commit.slice(0, 7)}).`);
    return config;
  }

  const updated = { ...config, docs: { ...config.docs, commit } };
  await writeFile(configPath, `${JSON.stringify(updated, null, 2)}\n`);
  console.log(`Re-pinned docs to ${config.docs.branch} head: ${config.docs.commit.slice(0, 7)} -> ${commit.slice(0, 7)}.`);
  return updated;
}

async function main() {
  const check = process.argv.includes('--check');
  const configPath = join(toolDirectory, 'config.json');

  let config = await readJson(configPath);
  if (process.argv.includes('--update-docs')) {
    if (check) throw new Error('--update-docs writes config.json, so it cannot be combined with --check');
    config = await updateDocsPin(configPath, config);
  }

  const { blocks, outputs } = await generate(config);

  const stale = [];
  for (const { path, contents } of outputs) {
    const current = await readFile(path, 'utf8').catch(() => null);
    if (current === contents) continue;
    if (check) stale.push(relative(repositoryRoot, path));
    else await writeFile(path, contents);
  }

  if (check) {
    if (stale.length > 0) {
      throw new Error(
        `Out of date with @vaadin/aura@${config.aura.version}:\n  ${stale.join('\n  ')}\n` +
          'Run `node tools/aura-reference/generate.mjs` and commit the result.',
      );
    }
    console.log(`Up to date with @vaadin/aura@${config.aura.version}.`);
    return;
  }

  console.log(
    `Generated from @vaadin/aura@${config.aura.version}: ` +
      `${config.outputs.artifact} and ${blocks.length} block(s) in ${config.outputs.reference}.`,
  );
}

await main().catch((error) => {
  // The failures here are drift reports meant for a human — a stack trace of
  // this script's own frames would only bury them.
  console.error(error.message);
  process.exitCode = 1;
});

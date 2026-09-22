# Aura reference generator

Generates the factual parts of the `aura-theme` skill reference from the published
`@vaadin/aura` package, so they cannot drift from what Aura actually ships.

```bash
node tools/aura-reference/generate.mjs                # regenerate
node tools/aura-reference/generate.mjs --check        # fail if anything is out of date
node tools/aura-reference/generate.mjs --update-docs  # re-pin the docs commit to the branch head
node --test 'tools/aura-reference/*.test.mjs'         # offline unit tests
```

Node 20+ and network access. No dependencies, no install step. The tests and `--check`
run on every pull request — see [`.github/workflows/aura-reference.yml`](../../.github/workflows/aura-reference.yml).

## What it produces

| Output | Contents |
|---|---|
| [`aura-properties.json`](aura-properties.json) | One entry per `--aura-*` property: declared default, where it is declared, what it is computed from, whether it may be written, and the resolved sRGB hex for literal colors. |
| [`../../skills/aura-theme/references/property-values.md`](../../skills/aura-theme/references/property-values.md) | The blocks between `<!-- BEGIN GENERATED … -->` and `<!-- END GENERATED … -->` markers. |

Everything outside those markers in `property-values.md` is hand-written and is never
touched: the curated font list, the named background and accent presets, the preset value
tables (Low/Mid/High contrast, surface level, density), and the "when to customize" guidance.
Those are this skill's design choices, not Aura defaults. **Only the defaults are facts.**

## Two sources, because neither has both

**Defaults** come from the package's CSS. `generate.mjs` downloads the pinned tarball from
`registry.npmjs.org`, follows the `@import` graph from `aura.css` in cascade order, and keeps
the last value each property is given in root scope outside any `@media`/`@supports`/
`@container` condition. Component-scoped declarations (`vaadin-card { --aura-surface-level: 2 }`)
and conditional ones (`@media (pointer: coarse) { --aura-base-size: 18 }`) are deliberately
excluded — neither is the theme default.

**Write-safety** comes from the Aura reference pages in `vaadin/docs`, which mark read-only
properties with a `Read-only` or `light-dark()` badge. This is not derivable from the CSS:
49 of Aura's 74 properties have values computed from other custom properties at `25.3.0-rc1`,
but nine of those — the `-light`/`-dark` accent, neutral, shadow, and overlay outline colors —
are exactly the documented way to customize the theme. `computed` and `writable` are therefore
separate fields in the artifact, and a generator that conflated them would tell the model to
avoid the properties it most needs.

`classification.json` covers the handful of properties the docs do not mention. The generator
fails if a property is classified by neither source, and fails again if an entry in
`classification.json` becomes stale — so the hand-curated part cannot quietly grow.

## Colors

Aura states its palette in `oklch()`, which is wider than sRGB, and `getComputedStyle().color`
returns `oklch()` unchanged, so there is no way to read the hex out of a browser without
rasterizing. [`lib/color.mjs`](lib/color.mjs) does the OKLab conversion directly and clips
out-of-gamut channels, which reproduces what browsers paint on an sRGB display; the artifact
records `inSrgbGamut: false` when clipping occurred. The unit tests pin all six palette colors
and both background colors to values measured by canvas rasterization in a browser.

## Updating to a new Aura version

Both inputs are pinned in [`config.json`](config.json) — `aura.version` and an exact
`docs.commit` — so a run is reproducible and `--check` stays quiet until something
meaningful changes. To move forward:

```bash
# 1. bump aura.version (and docs.branch, for a new minor) in config.json
node tools/aura-reference/generate.mjs --update-docs
```

`--update-docs` re-pins `docs.commit` to the head of `docs.branch` and regenerates in one go.
Review the diff. Two things worth checking by hand when it is not empty:

- The **border radius step table** in `property-values.md` is measured in a browser and is not
  generated — evaluating `min(0.25lh, round(…))` needs a CSS engine. If the generated
  `radius-steps` block changes, re-measure that table.
- New properties surface as a hard failure rather than a silent omission, which is the point.

The artifact has no timestamp, so regenerating without a version change produces no diff.

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
the value each property resolves to in root scope outside any `@media`/`@supports`/`@container`
condition. Component-scoped declarations (`vaadin-card { --aura-surface-level: 2 }`) and
conditional ones (`@media (pointer: coarse) { --aura-base-size: 18 }`) are deliberately
excluded — neither is the theme default.

`lib/parse-css.mjs` is not a general CSS engine. It resolves competing root declarations by
`!important`, then the specificity of the selector that matches root — only the root-matching
parts of a list count, so `:where(:root), vaadin-button` stays a zero-specificity root
declaration — then document order. What it cannot resolve, it refuses: `@layer`, a qualified
`@import` (`layer`, `supports()`, a media query), and a root default declared inside `@scope`
all throw rather than being flattened into a value that might be wrong. Ordering that last one
would need scoping proximity, which is a distance to a scope root rather than anything visible
in the source.

**Write-safety** comes from the Aura reference pages in `vaadin/docs`, which mark read-only
properties with a `Read-only` or `light-dark()` badge. This is not derivable from the CSS:
49 of Aura's 74 properties have values computed from other custom properties at `25.3.0-rc1`,
but nine of those — the `-light`/`-dark` accent, neutral, shadow, and overlay outline colors —
are exactly the documented way to customize the theme. `computed` and `writable` are therefore
separate fields in the artifact, and a generator that conflated them would tell the model to
avoid the properties it most needs.

Read-only silently becoming customizable is the dangerous direction — it would tell the model
it may overwrite a property Aura computes — so `lib/parse-docs.mjs` guards it four ways: badge
markup is recognized in every form these docs use (including a badge that wrapped onto the next
line of a table cell), a classification is only ever raised and never lowered by a later
mention, a label set off by delimiters where no known badge matched fails the run rather than
being taken for "no badge", and `docs.expectedReadOnly` pins how many properties carry a badge
at the pinned commit. That last one is the backstop the others cannot be: reading badges out of
prose only ever recognizes the markup it knows, so if the docs move to a form the parser cannot
see, the count drops and the run stops.

`classification.json` covers what the two sources cannot say: `properties` classifies the five
`--aura-*` properties the docs do not mention, and `undeclared` names the one documented
property Aura deliberately never declares, so that a property vanishing from the CSS is
reported rather than read as an opt-in hook.

## Guards

Every one of these fails the run rather than producing a plausible-looking artifact:

| Condition | Why it matters |
|---|---|
| A property is classified by neither the docs nor `classification.json` | Its write-safety is unknown |
| An entry in `classification.json` is no longer needed | The hand-curated part cannot quietly grow |
| A documented property has no declaration and is not in `undeclared` | Aura dropped it, or the scanner failed to read it |
| A `<!-- BEGIN/END GENERATED … -->` marker is removed or misspelled | That table silently reverts to hand-maintained |
| A generated block names a property Aura no longer ships | The reference would state a value that does not exist |
| The docs use badge markup the parser does not know | Read-only properties would be reported as customizable |
| A `@layer`, a qualified `@import`, or a scoped root default | Ordering them needs cascade rules this tool does not implement |
| Fewer properties carry a read-only badge than `docs.expectedReadOnly` | Badge markup the parser cannot see reads as "customizable" |
| A corrupt tar header, checksum or truncated archive | The inputs cannot be trusted to state Aura's defaults |

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

Adding or removing a generated block in `property-values.md` means updating `generatedBlocks`
in `config.json` — that list is what makes marker damage detectable.

The artifact has no timestamp, so regenerating without a version change produces no diff.

---
name: figma-to-aura-theme
description: Map a Figma Aura design system to Vaadin Aura theme CSS configuration. This skill is phase 1 (theme configuration) of the figma-to-vaadin-orchestrator workflow, for projects on the Aura theme, and is normally invoked by it. Use it directly when the user provides a Figma URL and wants to configure only the Aura theme to match it. Triggers on requests like "set up Aura theme from Figma", "configure Aura to match my design", "generate Aura CSS from Figma", or when a Figma URL is combined with any Aura theming request. Applies when the target app uses the Aura theme (`@StyleSheet(Aura.STYLESHEET)`, Vaadin's default from 25.0 onwards) or has no theme configured yet. Does NOT apply to apps still on the classic Lumo theme (`@StyleSheet(Lumo.STYLESHEET)`, no Aura import) — use figma-to-lumo-theme for those instead.
---

# Figma to Aura Theme

Extract visual styling from a Figma design and translate it into a Vaadin Aura theme CSS file.

## Overview

Aura is a higher-level theming system than Lumo. It uses a small set of properties (accent color, background, surface level, density, radius, font, color scheme) that internally derive many Lumo variables. Because of this, Figma's design variables do **not** map 1:1 to Aura CSS properties — Figma encodes computed values, while Aura works from abstract inputs.

**The goal is not to copy Figma values verbatim — it is to find the Aura configuration that produces a result matching the Figma design.**

## Required Workflow

Create TODOs based on these steps.

- Step 1: Extract Figma variables from all available modes
- Step 2: Map variables to Aura properties
- Step 3: Infer visual properties from `get_design_context`
- Step 4: Generate the Aura CSS file

---

### Step 1: Extract Figma Variables from All Available Modes

**Start with `get_variable_defs`** on a representative node. It returns values for the file's
current/default mode only — it takes no mode parameter, and there's no documented way to switch
modes from outside and have it pick that up. If the file only has one mode, that's all you need.

If the file has **multiple modes** (e.g. light/dark), use `use_figma` instead, and read each
variable's value across all of its modes in one pass (`variable.valuesByMode`, keyed by mode) —
rather than trying to toggle the active mode and re-call `get_variable_defs`, which isn't how mode
selection works. Before your first `use_figma` call in this workflow, load its required `figma-use`
guidance (skill or MCP resource) — its own instructions mark this mandatory.

**Color scheme rule:**
- If the file has **both light and dark modes** → always implement both; set `color-scheme: light dark`
- If only **one mode** exists → implement that mode only; set `color-scheme: light` or `color-scheme: dark`

Variables to capture from each mode:

| Figma Variable | Light Mode Maps To | Dark Mode Maps To |
|---|---|---|
| `aura-accent-color` | `--aura-accent-color-light` | `--aura-accent-color-dark` |
| `aura-background-color` | `--aura-background-color-light` | `--aura-background-color-dark` |
| `vaadin-user-color-0` … `vaadin-user-color-9` | `--vaadin-user-color-0` … `--vaadin-user-color-9` | (same values, single declaration) |
| `Components/Field border tint` | `--vaadin-input-field-border-color` | (same or mode-specific) |
| `aura-border-color` | Informs input field border color | — |
| Font variable (e.g. `lumo-font-family`) | `--aura-font-family` | — |
| Font size variable (e.g. `lumo-font-size-m`) | `--aura-base-font-size` | — |

> **Note:** The Figma Aura design system may label some variables with `lumo-` prefixes (e.g. `lumo-font-family`, `lumo-font-size-m`). These are equivalent to their Aura counterparts and should be mapped to Aura CSS properties. A `lumo-` variable with no Aura equivalent is kept as a custom property per the rule below, not dropped.

#### Variables that don't match an Aura name
Design files are not always built from the Vaadin library, and a variable with an unfamiliar name
is still part of the design system. Handle every extracted variable — none are dropped:

1. **An equivalent Aura property exists** — map it, even if the names differ. Use the Vaadin
   MCP's `get_theme_css_properties` (theme: `"aura"`) to check before concluding there is none.
2. **No equivalent** — declare it as a custom property in the same global stylesheet, keeping the
   design's own name (e.g. `--brand-surface-raised: #f4f6f9;`). Views then reference it by name
   instead of hard-coding the value, and it stays in one place when the design changes.
3. **No variables in the file at all** — stop and ask the user how to proceed. Don't infer theme
   values from screenshots.

---

### Step 2: Map Figma Variables to Aura Properties

Aura has a seven-color palette. Prefer a palette color when the Figma value is close to one — it
keeps every accent-derived color coherent. When nothing is close, set the Figma value directly;
Aura derives text, border and surface variants from whatever you give it. See
[Color Matching Reference](#color-matching-reference) below.

#### Accent Color

The `aura-accent-color` variable from Figma is the **light mode** accent. Aura takes separate
light and dark accent values, both defaulting to `var(--aura-blue)`.

1. Compare the light mode hex to the palette in [Color Matching Reference](#color-matching-reference)
2. Close to a palette color (same hue family — blue stays blue, green stays green)? Reference it by
   name rather than pasting the hex
3. Nothing close? Set the Figma hex directly
4. Set the dark accent as well. There is no "paired dark variant" of a palette color — use the
   accent the Figma dark mode defines, or reuse the light value when the file has only one mode

```css
/* Example: Figma aura-accent-color = #16a34a → closest palette color = green */
--aura-accent-color-light: var(--aura-green);
--aura-accent-color-dark: var(--aura-green);
```

Only set these if they differ from the Aura default (`var(--aura-blue)` for both).

#### Background Color

The `aura-background-color` variable from Figma is the **light mode** background. Aura takes
separate light and dark background values.

There is no named background list to match against — set the Figma values directly, one per mode.
These two properties matter more than any other color: Aura computes the neutral, text, border and
surface colors from them.

If the background is tinted by the accent color (vibrant/colorful design), use the Accent background formula:
```css
--aura-background-color-light: oklch(from var(--aura-accent-color-light) 0.9 calc(c * 0.3) h);
--aura-background-color-dark: oklch(from var(--aura-accent-color-dark) 0.18 calc(c * 0.3) h);
```

Only set these if they differ from the Aura defaults (`oklch(0.95 0.005 248)` light /
`oklch(0.2 0.01 260)` dark).

#### Font Family

Map the font variable to `--aura-font-family`. Aura bundles only Instrument Sans (its default), so
any other font has to be loaded: add the Google Fonts `@import` at the top of the CSS file and keep
a fallback stack.

```css
/* Figma: lumo-font-family = "Inter" */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

--aura-font-family: 'Inter', var(--aura-font-family-system);
```

If Figma specifies Instrument Sans, the system font stack, or no font at all, omit
`--aura-font-family` — the default (`--aura-font-family-instrument-sans`) already covers it.

#### Font Size

The Figma font-size-m variable maps to `--aura-base-font-size`: a unitless number of pixels
(`15`, not `15px`). Aura computes the xs–xl font sizes from it, so round to a whole pixel.

Only set if it differs from the default (`14`).

#### User Colors

`vaadin-user-color-0` through `vaadin-user-color-9` map directly — they are base style properties,
so they carry the same defaults in every theme. Only set the ones that differ, and if Figma defines
fewer than 10, only set those present. Check the defaults with `get_theme_css_properties`
(`theme: "base"`) rather than assuming.

```css
html {
  --vaadin-user-color-0: #7f3fbf;
  --vaadin-user-color-1: #00d2cd;
  /* ... */
}
```

#### What Does NOT Map Directly

These Aura properties have no corresponding Figma variable — infer them visually in Step 4:

| Aura Property | How to Infer |
|---|---|
| `--aura-base-size` | Component density from `get_design_context` |
| `--aura-base-radius` | Border radius from component screenshots |
| `--aura-surface-level` | Surface elevation/layering from the design |
| `--aura-surface-opacity` | Whether surfaces are semi-transparent or opaque |
| `--aura-contrast-level` | Text/border contrast from the design |
| `--aura-app-layout-inset` | Whether the app layout has an inset/margin |
| `--aura-overlay-surface-opacity` | Dialog/overlay rendering from screenshots |

---

### Step 3: Infer Visual Properties from Figma

Call `get_design_context` on a representative frame (preferably an application shell or dashboard view). Use the screenshot and code hints to infer the properties listed above.

Look for:
- **Border radius:** Check button, input, and card corner rounding. `--aura-base-radius` is a
  unitless number, default `3`, with sensible values from `0` (mostly square) to `10` (very round).
  Radius `0` does not square every corner — to remove all rounding, override the base style radius
  properties (`--vaadin-radius-s/m/l`) instead
- **Density:** Check component heights and spacing. `--aura-base-size` is a unitless number,
  default `16`, suitable range 12–24 — prefer multiples of 4: `12` (compact), `16` (default),
  `20`/`24` (spacious)
- **Surface level:** Check if cards/panels appear elevated, flat, or deeply layered.
  `--aura-surface-level` accepts any number, default `1`; negative values look recessed, `0` matches
  the background, higher values look more elevated
- **App layout inset:** Check if the main content area has a gap/margin from the viewport edge. `0px` = no inset
- **Color scheme for nav vs content:** If the side nav is dark and content is light, set `--aura-content-color-scheme: light` alongside `color-scheme: dark`

For **input field styling**, check if the Figma design shows custom input field borders or backgrounds. If the `Components/Field border tint` or `aura-border-color` variables are meaningful (non-zero, non-default), configure input field properties:

```css
html {
  --vaadin-input-field-border-color: <value>;
  --vaadin-input-field-border-width: 1px; /* required when border-color is set */
}
```

---

### Step 4: Generate the Aura CSS File

Follow the file creation workflow:

1. Locate `styles.css` (default: `/src/main/resources/META-INF/resources/styles.css`)
2. Choose a descriptive filename for the theme CSS file
3. Create the CSS file in the same directory
4. Add `@import "filename.css";` at the top of `styles.css`

**Only include properties that differ from Aura defaults.** Do not set properties that match the default values. Use the default values documented in this skill (or looked up via the Vaadin MCP's `get_theme_css_properties` with `theme: "aura"`, and the app's Vaadin version) — don't guess a default from memory; a wrong assumption produces a CSS declaration that looks theme-driven but is actually just silently re-asserting (or subtly missing) the real default.

**CSS structure:**

```css
/* Font import — only if using a Google Font */
@import url('https://fonts.googleapis.com/css2?family=...');

html {
  /* Color scheme */
  color-scheme: light dark;

  /* Accent colors — only if different from the default var(--aura-blue) */
  --aura-accent-color-light: var(--aura-green);
  --aura-accent-color-dark: var(--aura-green);

  /* Background — only if different from the defaults
     oklch(0.95 0.005 248) / oklch(0.2 0.01 260) */
  --aura-background-color-light: #ffffff;
  --aura-background-color-dark: #18181b;

  /* Typography — only non-defaults */
  --aura-font-family: 'Inter', var(--aura-font-family-system);
  --aura-base-font-size: 15;

  /* Layout and visual style — only non-defaults
     (radius defaults to 3, base size to 16, surface level to 1) */
  --aura-base-radius: 6;
  --aura-base-size: 20;
  --aura-surface-level: 2;
  --aura-app-layout-inset: 0px;

  /* User colors — only if customized */
  --vaadin-user-color-0: #7f3fbf;
  --vaadin-user-color-1: #00d2cd;
}

/* Input field styling — only if border is customized */
html {
  --vaadin-input-field-border-color: #2941702e;
  --vaadin-input-field-border-width: 1px;
}
```

**For mixed mode (dark nav, light content):**
```css
html {
  color-scheme: dark;
  --aura-content-color-scheme: light;
}
```

---

## Color Matching Reference

Aura's palette is seven colors — neutral plus six saturated ones — each a single `oklch` value from
which Aura computes the text, border and surface variants. There are no 50–900 scales, and no
separate light and dark variants of a palette color.

| Palette property | Default value | oklch hue |
|---|---|---|
| `--aura-red` | `oklch(0.59 0.2 25)` | 25 |
| `--aura-orange` | `oklch(0.61 0.35 87)` | 87 |
| `--aura-yellow` | `oklch(0.89 0.3 98)` | 98 |
| `--aura-green` | `oklch(0.6 0.2 155)` | 155 |
| `--aura-blue` | `oklch(0.55 0.2 264)` | 264 |
| `--aura-purple` | `oklch(0.58 0.22 290)` | 290 |
| `--aura-neutral-light` / `--aura-neutral-dark` | computed from `--aura-background-color-light` / `-dark` | — |

These are **oklch** hues, not HSL ones — they don't line up with the hue angle a color picker
reports. Convert the Figma hex to `oklch` before comparing, then check that lightness and chroma
land in a similar range too.

Matching is a preference, not a rule:
- **Close to a palette color** → reference it (`var(--aura-green)`) so accent-derived colors stay
  coherent
- **Not close to any** → use the Figma value directly; Aura derives the rest either way
- **The brand color belongs to the design system** → redefine the palette property itself
  (`--aura-green: <brand value>;`), which recolors everything built on it

Confirm these defaults with the Vaadin MCP's `get_theme_css_properties` (`theme: "aura"`) for the
app's Vaadin version rather than assuming they hold across versions.

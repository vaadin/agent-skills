---
name: theme-mixing-check
description: Verify that a Vaadin application does not mix the Aura and Lumo base themes. Use whenever Aura or Lumo is used in a Vaadin project — after adding or changing a theme, writing `@StyleSheet(Aura.STYLESHEET)` or `@StyleSheet(Lumo.STYLESHEET)`, importing `aura/aura.css` or `lumo/lumo.css`, using `--aura-*` or `--lumo-*` CSS custom properties, using `LumoUtility`, or when the user asks to check, audit, or fix theme mixing or conflicting Vaadin styles. Mixing Aura and Lumo produces conflicting styles and CSS custom properties that fail to resolve.
---

# Vaadin Theme Mixing Check

Vaadin 25 ships two base themes, **Aura** and **Lumo**. A project must load exactly
one. Mixing them causes conflicting styles and unresolved CSS custom properties
(e.g. `--aura-*` tokens used under Lumo, or `LumoUtility` classes under Aura).

Whenever this skill triggers, run the check and act on the findings — do not just
eyeball the code.

## Workflow

1. **Run the tool** from the project root (the directory containing `pom.xml` or
   `package.json`). Prefer JSON output so the findings are machine-readable:

   ```bash
   npx @vaadin/agent-tools check-theme-mixing . --json
   ```

   Pass an explicit path instead of `.` if you are not in the project root, e.g.
   `npx @vaadin/agent-tools check-theme-mixing ./my-project --json`.

2. **Interpret the exit code and findings:**
   - Exit `0` — no error-level findings. Report that no theme mixing was detected.
     There may still be `warning`/`info` findings worth surfacing (see below).
   - Exit `1` — theme mixing detected. Read the `findings` array and fix the cause.
   - Exit `2` — usage error (e.g. the project directory does not exist). Fix the
     path or invocation and re-run.

3. **Report** the result to the user concisely, listing each finding's file, line,
   and snippet from its `evidence`, then fix the error-level findings.

## Findings and how to resolve them

- **`MULTIPLE_BASE_THEMES` (error)** — both Aura and Lumo are explicitly loaded.
  Keep exactly one base theme and remove the other's `@StyleSheet(...STYLESHEET)`
  or `@import ".../<theme>.css"`.
- **`LUMO_UTILITY_WITHOUT_LUMO_THEME` (error)** — `LumoUtility` is used while Aura
  is the active theme; its utility CSS classes are undefined under Aura. Replace
  the `LumoUtility` usage with Aura-equivalent styling, or switch the project to
  Lumo if that is intended.
- **`MISMATCHED_THEME_TOKENS` (warning)** — `--aura-*`/`--lumo-*` tokens from the
  non-active theme are used and will not resolve. Replace them with the active
  theme's tokens.
- **`THEME_INDETERMINATE` (info)** — no base theme is explicitly loaded, so the
  theme-dependent checks were skipped (the project may use a custom theme). Not a
  failure; mention that these checks could not run.
- **`LEGACY_THEME_ANNOTATION` (info)** — a legacy `@Theme` annotation coexists with
  `@StyleSheet`-based theming. Confirm this is intentional (e.g. mid-upgrade from
  Vaadin 24).

After fixing any error-level findings, re-run the tool to confirm it exits `0`.

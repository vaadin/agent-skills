---
name: vaadin-usage-review
description: >
  Reviews Vaadin code for custom workarounds where an official Vaadin API or
  component already exists, and reports them without editing anything. Use when
  asked to review, audit, or check whether Vaadin code — often code an agent just
  wrote — uses the official API instead of hacks: executeJs or callJsFunction
  calls, inline getStyle CSS, raw getElement DOM and property manipulation,
  manual paging, filtering or sorting instead of a data provider, hand-rolled
  dialogs, notifications or auth checks, deprecated API, workarounds in the
  project's own JS/TS connectors (monkey-patching web components, private-member
  access), and raw HTML elements or hand-styled markup where a Vaadin component
  fits (Div, Span or native inputs and buttons instead of TextField, Button or
  layouts; hand-styled badges or cards instead of Badge or Card). Every finding is
  verified against the Vaadin MCP server.
---

# Vaadin Usage Review

## Overview

Audits Vaadin code for places where a **custom workaround or hack** was used even though an **official Vaadin API exists** — typically because whoever wrote it (often an AI agent) didn't look it up.

This includes **component choice**: raw HTML elements (`Div`, `Span`, native `<input>`/`<button>`, flexbox `Div`s) or custom-styled markup used where an equivalent **Vaadin component** already exists (`TextField`, `Button`, `VerticalLayout`/`HorizontalLayout`, `Badge`, `Card`, …). Vaadin components are the default; raw HTML is the exception that must earn its place — see [Component choice](#component-choice-prefer-vaadin-components-over-html).

**This skill is report-only. It NEVER edits, fixes, or stages files.** It produces a findings report.

**The Vaadin MCP server is the single source of truth.** Every claim that "an official API exists" MUST be verified against the Vaadin MCP and cited. Do not assert official APIs from memory.

## The Two Iron Rules

1. **The MCP is the single source of truth.** If the Vaadin MCP is unavailable, STOP and report that — do not fall back to memory, training knowledge, or the web. A guess is worse than an honest "cannot verify".
2. **Report only.** No file edits, no fixes applied, no commits. Findings describe the official alternative; they do not change code.

## Component choice: prefer Vaadin components over HTML

Vaadin components are the default. A raw HTML element (`Div`, `Span`, `NativeLabel`, `NativeButton`, `Input`, `Anchor`-as-button, `new Element(...)`, `Html`, or raw `<div>/<span>/<input>/<button>` in `.tsx`) or custom-styled markup is a candidate finding when it fills a role an existing Vaadin component already covers — **and** when custom styling is written for something a Vaadin component already provides (a hand-styled badge, card, panel, pill, spinner …), the Vaadin component wins.

But this axis is a **false-positive magnet** — most `Div`/`Span` usage is legitimate structure. The user must **not** be flooded with speculative "a Div is theoretically better/worse" notes. Apply this gate to every candidate, in order, and only report what survives:

1. **Role test.** Does the element (a) play the role of a specific Vaadin component — input, button, layout, badge, card, dialog, tab, menu, progress … — **or** (b) carry custom styling, a `theme` attribute, or CSS classes that reproduce one?
   - **No** (a bare structural wrapper, a plain text holder, a slot target with no component-equivalent role) → **not a finding.** Do not report bare `Div`/`Span`.
   - **Yes** → continue.
2. **MCP confirmation.** Verify with `get_components_by_version` that the Vaadin component exists **for this version** and with the component's API docs that it actually covers the role. Note when it is **commercial** (needs a Vaadin subscription), so the user knows the equivalent isn't free. Not confirmed → drop it or mark it `unverified`.
3. **Concrete-advantage check (the anti-noise gate).** Before recommending the switch, ask: does the HTML element give a **concrete, specific, MCP-verifiable** advantage the Vaadin component cannot — a documented missing feature, a real constraint, a measured cost?
   - **No** → finding: recommend the Vaadin component (Medium, or High when the hand-built version is broken).
   - **Yes** → do **not** file a plain "switch" finding. Instead raise it as a *component-choice tradeoff for the user's decision*, naming the specific advantage and its MCP basis.

**"Theoretically lighter", "more flexible in principle", "a Div could do this too", "might be simpler" are NOT concrete advantages.** If that is all you have, recommend the Vaadin component (or stay silent) — never emit a speculative "HTML is arguably better here" note. Better to miss one debatable case than to bury the user in theoretical bikeshedding.

## Workflow

### Step 1 — Preflight: confirm the Vaadin MCP is reachable

Call `get_vaadin_versions`.

- **Succeeds** → the MCP is available, continue. Keep its `versions` list for Step 2.
- **Fails / tool not present / errors** → STOP immediately. Output exactly:

  > ⚠️ Vaadin MCP not available. The Vaadin MCP is the single source of truth for this review, so I cannot verify findings against official API. No review performed. (Enable the Vaadin MCP server and run the review again.)

  Do not proceed. Do not guess from training knowledge.

### Step 2 — Establish project context (do not guess)

Determine, from the repo:

- **Vaadin version** — read `pom.xml` (the `vaadin.version` property or the `vaadin-bom` version) or `build.gradle`/`build.gradle.kts`/`gradle.properties`. Map it to a `vaadin_version` value from the `versions` list `get_vaadin_versions` returned (a 25.x project uses its minor, such as `25.2`; any 24.x uses `24`). If none is found, map its `latest_known_version` the same way and state the assumption in the report.
- **Dev model** — Flow (Java views), Hilla/React (`@BrowserCallable` services, `.tsx` views under `src/main/frontend/views/`), or both. This sets the UI language (`java` / `react`) for the MCP tools that take one.
- **Theme** — Aura or Lumo. Look for `@StyleSheet(Aura.STYLESHEET)` or `@StyleSheet(Lumo.STYLESHEET)` on the `AppShellConfigurator`. Older projects use `@Theme` with a `frontend/themes/` folder instead; read what that theme builds on. If you cannot tell, say so and don't recommend theme-specific variants, utility classes, or custom properties.

State all three at the top of the report. Never recommend a `LUMO_*` variant or a `LumoUtility` class without confirming the theme is Lumo, and never an `AURA_*` variant without confirming it is Aura.

### Step 3 — Settle which scope to review

**Never guess the scope and never start reviewing on an assumption.** If the request already names it — a file, a package, the whole project, "my changes", "the code you just wrote" — that is the scope; skip to the filtering below. Otherwise ask the user, and **wait for the answer before reviewing anything**.

To ground the question, run `git status` and `git diff --name-only` first (skip this outside a git repository), then ask with your agent's question tool, if it has one. Propose options derived from the current git state, and recommend the one that best fits it (e.g. if there is an active change set, suggest "changed files" first):

- Changed files vs the base branch (`git diff --name-only main...HEAD` plus uncommitted changes) — "did the work just done introduce hacks?".
- Staged files only.
- A specific file / package / module the user names.
- The whole project — warn that this can be large and slow.

The user's answer wins; the suggestions are only a convenience.

Once the scope is chosen, filter it to Vaadin-relevant files:

- Java files that use Vaadin API (they import `com.vaadin.*`): views, components, layouts, security configuration, data providers, `@BrowserCallable` services.
- `.tsx`/`.ts` Hilla views.
- Theme and view CSS (typically under `src/main/resources/META-INF/resources/` or `src/main/frontend/themes/`).
- **Project-owned JavaScript/TypeScript** — frontend scripts, client-side connectors, and `@JsModule`/`@JavaScript`-referenced files that live in *this repo*. Typical locations: `src/main/frontend/` (or `frontend/` in older layouts), especially `*-connector.js`/`*-connector.ts`, and `src/main/resources/META-INF/resources/frontend/`.

**Never review dependency or generated code.** Exclude `node_modules/`, `target/`, `build/`, `src/main/frontend/generated/` (or `frontend/generated/`), and any minified or vendored `*.min.js`. If a `@JsModule` points at an npm package rather than a repo path, it is out of scope.

If the resolved scope has no Vaadin-relevant files, report that and stop.

### Step 4 — Review the files in batches

Split the in-scope files into batches (group by feature/package, about 3–6 files each). If your agent can run subagents and there is more than one batch, dispatch one reviewer per batch concurrently; otherwise review the batches yourself, one after another, under the same contract. Subagents don't have this skill loaded, so paste into each reviewer's prompt the contract below and the [smell catalog](#smell-catalog-candidates-to-verify--not-auto-findings) sections that apply to its files.

The reviewer contract (adapt the file list):

> You are reviewing Vaadin files for custom workarounds that have an official API. **Report only — do not edit any file.** The Vaadin MCP server is the single source of truth.
>
> Project: Vaadin {version}, {dev model}, {theme} theme. Pass `vaadin_version` = "{mcp version}" to every MCP tool that takes it, `ui_language` = "{java|react}" to `search_vaadin_docs`, and `framework` = "{java|react}" to `get_component_styling`.
> Files: {batch}
>
> For each suspicious pattern (see the smell catalog), you MUST verify against the MCP before reporting it — use `search_vaadin_docs` (then `get_full_document` for a hit), `get_java_symbol`, `get_component_java_api`, `get_component_react_api`, `get_component_web_component_api`, `get_component_styling`, `get_theme_css_properties`, or `get_components_by_version`. For project-owned `.js`/`.ts` connectors, check against the web component API; never review `node_modules` or generated bundles. Only report a finding if the MCP confirms an official API exists. If the MCP does not confirm an alternative, either drop the finding or mark it `unverified` — never invent an API from memory.
>
> Also review **component choice**: raw HTML elements or custom-styled markup used where a Vaadin component fits. Apply the three-step component-choice gate: (1) do NOT flag bare structural `Div`/`Span` — only markup that plays a specific Vaadin component's role or is styled to imitate one; (2) confirm via the MCP that the component exists for this version (note if it is commercial); (3) recommend the Vaadin component unless the HTML gives a **concrete, MCP-verifiable** advantage, in which case report it as a tradeoff for the user's decision. Never emit a speculative "HTML is theoretically better" note.
>
> **Do NOT report items that are verified correct** — patterns checked and found to use the official API are silently discarded. Only return actual violations.
>
> Return findings as: file:line · severity · the workaround · the official API (with the exact MCP source: tool + document path or component) · 1-line why it matters. Do NOT propose a diff or apply changes.

### Step 5 — Aggregate and report

Merge the batch findings into one report in the [format below](#report-format). Drop duplicates, group by severity, and make sure every official-API claim carries its MCP source — move any finding without one to **Unverified**. End with the report-only reminder.

**Omit verified-correct items entirely.** Only violations appear. If the user explicitly asks "what did you verify as correct?" you may list them, but never include them by default.

## Smell catalog (candidates to verify — not auto-findings)

A smell is only a finding **after the MCP confirms an official alternative**. Version markers such as "25.1+" say when an API arrived; on older versions confirm what the MCP offers instead.

### Server side (Java — Flow views and Hilla services)

| Smell | Why it's suspect | Verify in MCP |
|-------|------------------|---------------|
| `getElement().executeJs(...)` / `callJsFunction(...)` | Imperative JS where a typed Java/React API often exists | component Java/React API |
| `UI.getCurrent().getPage().executeJs(...)` | Global JS escape hatch instead of an API | `search_vaadin_docs` |
| `@JavaScript` / `@JsModule` loading a project script that drives or patches a Vaadin component | Loading raw JS where a typed API exists — also review the script itself (see below) | component API |
| `getElement().setProperty/setAttribute/getProperty` on a Vaadin component | Raw property poking instead of typed setters | `get_java_symbol`, component API |
| `getStyle().set("...")` for color/spacing/radius/typography | Inline CSS instead of theme variants, theme custom properties, or a class name styled in a stylesheet (Lumo utility classes only with Lumo) | `get_component_styling`, `get_theme_css_properties`, theming docs |
| `new Element("...")` / `Html(...)` building UI | Hand-built DOM instead of components | `search_vaadin_docs` |
| Reflection on Vaadin internals (`getDeclaredField`, `setAccessible`, internal packages) | Reaching past the public API | `get_java_symbol` |
| Manual `subList` / page math before `setItems` | Reinventing lazy loading | data provider docs, `setItemsPageable` |
| Hand-rolled filtering/sorting before `setItems` | Instead of data provider filtering and sorting | data provider docs |
| Custom `Thread`/polling to push updates | Instead of `@Push` / signals | server push and signals docs |
| Manual `UI.access` loops to refresh UI | Instead of signals (25.1+) / data binding | signals docs |
| `fetch`/REST in a React view | Instead of a `@BrowserCallable` service | Hilla endpoint docs (`react`) |
| Hand-rolled dialog/notification/upload/menu via DOM | Instead of `Dialog`/`Notification`/`Upload`/`ContextMenu` | component API |
| Manual field wiring and validation without `Binder` | Instead of `Binder` / `BeanValidationBinder` | forms and validation docs |
| Route URLs built by string concatenation for `UI.navigate(String)` | Instead of typed navigation with route parameters | routing and navigation docs |
| Custom role/auth checks in views | Instead of `@RolesAllowed` / `@PermitAll` / `@AnonymousAllowed` with `VaadinSecurityConfigurer` | security docs, `get_java_symbol` |
| `@Deprecated` or removed Vaadin API in use | Newer API exists | `get_java_symbol`, `get_new_apis` for the target version |

`@StyleSheet` is **not** a smell: in Vaadin 25 it is how the theme and view-scoped CSS are loaded.

### Styles (CSS)

| Smell | Why it's suspect | Verify in MCP |
|-------|------------------|---------------|
| Custom properties of the other theme (`--lumo-*` in an Aura project, `--aura-*` in a Lumo one) | Undefined in the active theme, so the rule fails silently | `get_theme_css_properties` |

This review catches the wrong theme's properties; it doesn't audit the values assigned to the active theme's own properties.

### Component choice — HTML where a Vaadin component fits

**Apply the [component-choice gate](#component-choice-prefer-vaadin-components-over-html) to every row: skip bare structural `Div`/`Span`, confirm the component in the MCP for this version, and only recommend the switch when the HTML has no concrete verified advantage.** Applies to Flow (`Div`, `Span`, `NativeButton`, `Input`, `Anchor`, `new Element`, `Html`) and to raw JSX in `.tsx` views alike.

| Smell | Prefer | Verify in MCP |
|-------|--------|---------------|
| Native `<input>` / `Input` / `Div` styled as a field | `TextField` / `NumberField` / `TextArea` / `DatePicker` / … | component API |
| `NativeButton` / `<button>` / `Anchor` styled as a button | `Button` (+ variants) | component API |
| `Div`/`Span` with `display:flex` styling used to lay out children | `HorizontalLayout` / `VerticalLayout` / `FlexLayout` | layout docs |
| `Div`/`Span` custom-styled as a badge / pill / status chip | `Badge` (25.1+) | `get_components_by_version`, component styling |
| `Div` custom-styled as a card / panel | `Card` | component API |
| Hand-built `Div` list/table with manual rows | `Grid` / `VirtualList`, or `Table` (25.3+) for small static data | component API |
| Raw `<dialog>` / overlay `Div` | `Dialog` | component API |
| `Div`/`Span` custom-styled as a progress bar / spinner | `ProgressBar` | component API |

### Project-owned JavaScript / TypeScript (connectors, frontend scripts)

Same principle as `executeJs`/`callJsFunction`: client-side code that reaches into Vaadin internals instead of using the supported element/connector contract. **Only authored project files — never `node_modules` or generated bundles.**

| Smell | Why it's suspect | Verify in MCP |
|-------|------------------|---------------|
| `customElements.get('vaadin-...')` then patching `.prototype` / overriding methods | Monkey-patching a Vaadin web component | `get_component_web_component_api` |
| Reading/writing private members (`el._something`, `el.__data`, `$`/`shadowRoot` internals) of a `vaadin-*` element | Depending on undocumented internals | `get_component_web_component_api` |
| `setTimeout`/`setInterval`/`MutationObserver` polling to wait for a component to be "ready" | Instead of lifecycle / `customElements.whenDefined` / Element API readiness | `search_vaadin_docs` |
| Manually dispatching synthetic events (`dispatchEvent(new CustomEvent(...))`) to drive a component | Instead of the component's public methods/properties | `get_component_web_component_api` |
| `querySelector('vaadin-...')` to grab and mutate a server-managed component | Bypasses Flow's element ↔ component sync | `search_vaadin_docs` |
| Connector reimplementing server↔client messaging | Instead of the Element API / `@ClientCallable` / `callJsFunction` contract | `search_vaadin_docs` |
| Injecting global CSS/`<style>` from JS | Instead of stylesheets loaded with `@StyleSheet` / `@CssImport` or style properties | theming docs |
| Hand-rolled fetch to a server endpoint from a connector | Instead of `@BrowserCallable` / element RPC | Hilla / Element API docs |

The catalog is a starting set — flag anything that looks like fighting the framework, then verify it.

## Red flags — you are about to break the skill

- About to edit a file, write a fix, or commit → STOP. This skill reports only.
- About to write "Vaadin has API X" without an MCP tool call backing it → STOP. That's memory, not the source of truth.
- MCP preflight failed and you're "just checking from what I know" → STOP. Report that the MCP is unavailable and end.
- Recommending a `LUMO_*` variant or `LumoUtility` class before confirming the project's theme → STOP. Check the theme first.
- Couldn't find the project's Vaadin version and silently used your own → STOP. State the assumption.
- About to start reviewing when the request named no scope and the user hasn't answered → STOP. Ask (Step 3) and wait for the answer.
- About to flag a bare `Div`/`Span` that isn't playing or imitating any Vaadin component's role → STOP. Structural wrappers and plain text holders are fine.
- About to write "a Div is theoretically lighter / more flexible / could also work" → STOP. That's not a concrete advantage. Recommend the Vaadin component or say nothing.
- About to raise "HTML is arguably better here" without a concrete, MCP-verified advantage → STOP. The user must not be flooded with speculative tradeoff notes.

## Report format

Only violations are shown. Patterns verified as correct are silently omitted (the user can ask for them explicitly).

```
# Vaadin Usage Review

Context: Vaadin {version} · {Flow/Hilla} · {Aura/Lumo} theme
Scope: {N files reviewed} ({changed files | staged files | named files | whole project})
MCP: available (source of truth)

## High — functional bug or broken behavior
- {file:line} — {the custom workaround / hack}.
  Official: {the Vaadin API}. Source: {MCP tool + component/document @ version}.
  Why: {1-line impact}.

## Medium — non-idiomatic, fights the theme or framework
- ...

## Low — minor / style
- ...

## Component choice — for your decision (HTML kept for a concrete, verified reason)
- {file:line} — {HTML element} used where a Vaadin component fits.
  Concrete advantage of the HTML here: {specific, MCP-verified reason}. Raised as a tradeoff, not a required change.

## Unverified (MCP had no confirmed alternative — listed for human judgment)
- ...

_Report only. No files were changed._
```

Leave out any section that has no findings. If no violations were found at all, report: `No violations found. All reviewed patterns use official Vaadin API.`

## Common mistakes

- **Reporting from memory.** The baseline failure mode: confidently citing "official docs" without a single MCP call. Every API claim needs a tool-backed source.
- **Drifting into fixes.** Writing "Fix:" with code to apply, or actually editing. State the alternative as information, not an action.
- **Theme/version blindness.** Recommending Lumo variants in an Aura project, or current API for an older Vaadin version.
- **Silent MCP fallback.** When the MCP is down, guessing instead of reporting unavailability.
- **Div/Span noise.** Flagging every raw element. Only markup that plays or imitates a Vaadin component's role is in scope; bare structure and plain text holders are not.
- **Theoretical bikeshedding.** Raising "HTML might be lighter/more flexible" without a concrete, MCP-verified advantage. Default to the Vaadin component; the reverse note is the rare exception, not the norm.

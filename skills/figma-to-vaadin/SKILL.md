---
name: figma-to-vaadin
description: >
  Translate one Figma frame into Vaadin Flow (Java) UI code. This skill is phase 2 (UI
  implementation) of the figma-to-vaadin-orchestrator workflow and is normally invoked by it,
  rather than directly: it assumes
  the app's theme is already configured from the same Figma file, and it does not verify its own
  output. If someone asks for a Figma design to be implemented in Vaadin without that workflow
  having started, invoke figma-to-vaadin-orchestrator instead. Does NOT apply to React, HTML, web
  components, or other frontend frameworks — only Vaadin Flow (Java). Does NOT apply to
  design-only tasks such as editing Figma files or generating Figma components. Does NOT
  configure themes or visual design tokens — that is figma-to-aura-theme / figma-to-lumo-theme.
compatibility: Requires a Figma MCP server and the Vaadin MCP server
---

# Figma to Vaadin: the Vaadin-specific half

## The process — follow it in order

**This skill is four documents.** This file is the spine; the three references carry the detail
that decides whether the output matches the design. Work the steps in order, and **open the
document a step names before doing that step's work.** The one-line summaries below are pointers
to those documents, not replacements for them.

**1. Learn the project.** Nothing about it should be assumed — read it out of the project each
time:

- **The workflow manifest** — `.figma-to-vaadin/state.json`, if the orchestrator wrote one. It
  carries the Figma `fileKey`, this frame's `nodeId` and `route`, the Vaadin version and the
  configured theme. Prefer it over re-deriving any of those.
- **Vaadin version** — from the build file (`pom.xml` / `build.gradle`), or the manifest. Pass it
  to **every** Vaadin MCP call, so you get the API surface this project actually compiles
  against.
- **The app's theme** — Lumo, Aura, or custom. Decides which variant constants apply, the
  default component styling, and which CSS custom properties are available.
- **An existing view** — shows the base class views extend, the shared header/footer wrappers,
  how CSS classes are named and where rules live.
- **What the app shell already provides** — a design screenshot shows the whole application, but
  navigation and chrome usually belong to the shell. Build only the content region;
  re-implementing the navigation renders it twice.
- **The icon set and the data source** — projects often add their own icon set, and existing
  records beat a parallel data model invented to fit the design.

Code style, architecture and conventions come from the project's own agent guidelines —
`AGENTS.md`, or a tool-specific equivalent such as `CLAUDE.md`. This skill does not restate them: 
how to structure a view, when to split out reusable components, how to name things and how to shape 
sample data are decisions the project already makes. Read them there and follow them.

**2. Load `figma-design-to-code`, then decompose the frame up front.** It is an MCP resource
served by the Figma MCP server, not a skill installed in this project. Read it through your client's
MCP resource reader at `skill://figma/figma-design-to-code/SKILL.md` on the Figma MCP server.
If your client cannot read MCP resources, say so and continue — the steps below still apply.

Full-screen frames truncate, and `get_design_context` can return an incomplete answer without
saying so. Get the region tree first, then request context **per region**. Don't discover
truncation late and fall back to metadata alone — that carries geometry with no styling, so the
implementation degrades to boxes in roughly the right places. Don't fall back to the screenshot
alone either while `get_design_context` can still answer for a region: the screenshot shows what
a thing looks like, not what it is made of.

**3. Measure the design — read `references/fidelity.md` first.** It sets out which properties to
take from the returned code and which from the screenshot, and which details are easiest to lose
on the way to Java. Record the view's own background and foreground first, then per region:
nesting, padding, gap, border, size, component type.

**4. Build the layout — read `references/layout.md` first.** It has the layout API surface in
full, so the design's flexbox maps onto Vaadin's layout components rather than hand-written CSS,
together with what genuinely belongs in CSS and the sizing defaults worth setting explicitly.

**5. Choose and style components — read `references/components.md` first.** It covers how the
components behave out of the box — Grid column sizing, card semantics, theme variants, icons — so
what you write complements a component's own styling rather than duplicating or overriding it.

**6. Close the loop — read the last section of `references/fidelity.md` again.** Check the
emitted code back against your measurements in all three directions it describes, then compile.
Compilation is the cheapest objective check available.

Writing the code is where this skill stops. Confirming it against the design belongs to phase 3
(verification), which `figma-to-vaadin-orchestrator` runs once every frame is built — do not
invoke a verification skill from here.

## What this skill does and does not own

The Figma side already has a skill: `figma-design-to-code`, which the Figma MCP requires you to
load before calling `get_design_context` — read it as an MCP resource, per step 2. It owns
fetching design context, treating the returned code as a reference rather than final, the hint
priority order (Code Connect → component docs → annotations → design tokens → raw values),
reusing what the project has, and asset fidelity.
**Follow it, and don't restate it here.**

This skill adds only what that skill cannot know: how Vaadin behaves, and how to find out what
*this* project does. It assumes nothing about the design either — a Figma file may be built from
a Vaadin library, may reference Lumo or another theme, or may have no relationship to Vaadin at
all. All are in scope; the difference is only how much you can take directly and how much you
must translate.

## Verify against the docs, not from memory

Vaadin's API surface, variants, custom properties and feature flags evolve between versions, so
recall is the least reliable input available.

**Stay inside this project.** Don't go looking for system files, don't extract or grep a 
dependency jar, and don't go searching the filesystem for a copy.
Everything those archives hold about a component's API is in the Vaadin documentation, one call
away and already written for the version you ask about.

**For a theme's real defaults, ask the running app.** It serves its own theme stylesheet at the
path its `@StyleSheet` names — `curl <appBaseUrl>/aura/aura.css` — so the answer is always this
project's version. With a page open, `getComputedStyle()` gives the value in effect at a given
element even if the theme reassigns styles on components themselves.

Match the question to its source:

**For anything about a Vaadin component — use the Vaadin MCP.** Pass the project's Vaadin version
to every call.

- `get_component_java_api` — a component's method signatures and variant constants. This is the
  direct answer to "what does this component expose", and it replaces any need to inspect a jar.
- `get_component_styling` — **before writing any CSS for a component.** What the component
  already does is the input to half the rules in `references/components.md`.
- `get_theme_css_properties` — before using a custom property. **Never invent a property name**:
  a `var(--made-up, fallback)` silently becomes a permanent hard-coded value that never tracks
  the theme.
- `search_vaadin_docs` → `get_full_document` — to find a component when you don't know which
  fits, for intended usage, and for worked examples. Search results are previews; read the
  document before relying on one.

**For how this project does things — read the project's own code.** If a view already uses a
component, that usage is a working example for exactly this version, and it also shows you the
project's conventions. It answers questions the documentation cannot.

**If, and only if, the documentation leaves one specific signature ambiguous**, a three-line
`javac` probe against the project's build settles it: write the call, compile, read the answer.
This is a yes/no check on something you already looked up — not a way to explore an API, and not
a reason to go hunting for jars.

**Never repair a compile error by guessing a nearby method name.** Look it up — for instance
whether a setter takes a boolean or a CSS string, or whether a sizing method lives on the
component or on a grid column.

**Feature-flag status changes between versions too.** Some components sit behind a flag in one
version and ship enabled in the next — check rather than recalling, and if a component needs a
flag the project hasn't set, say so instead of silently choosing something else.

## The rules that decide the outcome

**A floor, not a summary — this list does not replace the three documents.** These are the rules
that most often decide whether the result is right, kept here so they survive even if everything
else is forgotten:

- **The layout API comes before CSS.** `HorizontalLayout` and `VerticalLayout` *are* flexbox.
  Translating Figma's flexbox into `Div`s with `display: flex` feels faithful and is the most
  common structural defect.
- **Absence of a declaration is not neutral — it inherits the component default.** Restate no
  default; override every one the design contradicts.
- **Borders are the most-missed property in the design.** A 1px line is invisible in a screenshot,
  so nothing downstream will catch a missing one.
- **Implement what the design contains and nothing else.** An empty or underspecified region is a
  question for the user, not a blank to fill. Writing the guess down does not license shipping it.
- **The design names a specific icon.** If it isn't available in the project, ask — never
  substitute a different one, and never silently omit it.
- **Don't trust layer names.** Figma names drift from content. Take component type from
  `data-name` and annotations, and the view's identity from its visible heading text. If a
  component still doesn't map to one Vaadin component, ask rather than guess.

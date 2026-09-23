---
name: figma-to-vaadin-orchestrator
description: >
  Build a Vaadin Flow UI from a Figma design in the right order — theme configuration, then UI
  implementation, then verification — by delegating to the project's theme skill
  (figma-to-aura-theme or figma-to-lumo-theme), figma-to-vaadin and vaadin-visual-verification. This is the entry point
  for all Figma-to-Vaadin work: use it whenever someone wants a Figma design implemented in
  Vaadin, and whenever they describe the work broadly ("implement this design", "build this
  screen", "turn this Figma file into an app", "set up the UI from our design system"). It runs
  once per target node the user names — a whole screen or a region of an existing view — and
  configures the theme once per Figma file. Do not invoke figma-to-vaadin directly — it assumes
  a configured theme and does not verify its own output. Vaadin Flow (Java) only; not React, HTML,
  or web components.
compatibility: Requires a Figma MCP server, the Vaadin MCP server, and the Playwright MCP server
---

# Figma to Vaadin: workflow order

This skill owns the order and the shared state. Technique lives in the skills it calls — follow
them, don't restate them.

Three phases, always in this order:

| Phase | Name | Delegated to |
|---|---|---|
| 1 | Theme configuration | `figma-to-aura-theme` / `figma-to-lumo-theme` |
| 2 | UI implementation | `figma-to-vaadin` |
| 3 | Verification | `vaadin-visual-verification` |

Use these names when reporting progress, so every phase is referred to the same way throughout
the workflow.

## Customization order

Match the design by configuring, in this order, stopping at the first level that reaches:

1. **Theme properties** — Aura properties or Lumo custom properties.
2. **Component variants** — the variants the design system already provides.
3. **View-scoped CSS** — only where 1 and 2 cannot reach.

## Shared state: `.figma-to-vaadin/state.json`

Create it in phase 1 (theme configuration), update it as you go. Every delegated skill reads it,
so it is the hand-off payload — pass its path on every invocation.

The directory belongs to this workflow, not to any agent's configuration — create it at the
project root if it isn't there, and keep the path fixed rather than looking for an agent-specific
config directory to write into.

```json
{
  "figmaFileUrl": "https://www.figma.com/design/<fileKey>/<name>",
  "fileKey": "<fileKey>",
  "vaadinVersion": "25.0.1",
  "theme": "aura",
  "appStartCommand": "./mvnw spring-boot:run",
  "appBaseUrl": "http://localhost:8080",
  "targets": [
    { "name": "Dashboard", "nodeId": "1:234", "route": "/dashboard", "status": "verified" },
    { "name": "Order filter bar", "nodeId": "1:987", "route": "/orders", "status": "built" }
  ]
}
```

`status`: `pending` → `built` → `verified`. One entry per target, across all runs; targets can
share a `route`.

Read it at the start of every run. Re-read the project too — developers edit theme and view code
by hand, so where the two disagree the project wins and the manifest gets corrected.

## Phase 1 — Theme configuration

**The Vaadin version decides first** — Aura does not exist before 25.0. Take it from `pom.xml` /
`build.gradle`.

| Vaadin version | `AppShellConfigurator` imports | Theme | Skill |
|---|---|---|---|
| < 25.0 | anything, including none | Lumo | `figma-to-lumo-theme` |
| >= 25.0 | `Lumo.STYLESHEET` | Lumo | `figma-to-lumo-theme` |
| >= 25.0 | `Aura.STYLESHEET`, or no stylesheet | Aura | `figma-to-aura-theme` |

Record version and theme in the manifest.

**Already configured?** If the manifest records a `theme` for this same `fileKey` and that file
still exists, skip to phase 2 (UI implementation).

Invoke the theme skill with the Figma **file**, not a node — it reads variables across the whole
file.

Variables in the design file:

- **None at all** — stop and ask how to proceed. Don't infer theme values from screenshots.
- **Named for neither Aura nor Lumo** — still in scope: mapped where an equivalent exists,
  otherwise declared as custom properties in the global stylesheet.
- **Named for the other theme** (`--lumo-*` in an Aura project, or the reverse) — say so once and
  continue with the project's theme. Switching restyles every existing view; that is the
  developer's call.
- **Conflicting across files** — ask which file defines the design system.

Then build and start the app, confirm it serves at `appBaseUrl`, stop it, and begin phase 2 (UI
implementation). If
it does not build or start, report that and stop.

## Phase 2 — UI implementation

The user names one target node per run. If none was named, ask; don't pick one out of the file.

1. Record it in `targets` with its `nodeId` and the `route` it belongs to.
2. Invoke `figma-to-vaadin` with the manifest path, that `nodeId` and that `route`.
3. Set its `status` to `built`.

`figma-to-vaadin` writes and compiles code. It does not verify — phase 3 (verification) does.

## Phase 3 — Verification

Restart the app (see **Restarting**), then invoke `vaadin-visual-verification` with the manifest
path, the target's `nodeId` and its `route`. It reports without fixing.

Route each finding to the phase that owns its fix:

| The fix is | Route to |
|---|---|
| A theme property | Phase 1 — theme configuration |
| A component variant, or view-scoped CSS | Phase 2 — UI implementation |
| A deliberate trade-off | Neither — record it in the summary |

Theme findings go into a **single** phase-1 (theme configuration) revision, never one per
finding. A theme change
restyles every view, so after it, restart and re-verify every target already marked `verified`.

Set `status` to `verified` once the target has no open findings.

## Restarting

**A running Vaadin app does not pick up Java changes.** Hotswap agents and devtools are the
developer's setup — never assume one, and never take a server responding at `appBaseUrl` as
evidence it serves current code.

Stop the app and start it again with `appStartCommand`, waiting for its startup line, after every
phase that changed code and before anything reads the rendered app: end of phase 1 (theme
configuration), start of phase 3 (verification), and after every revision made in response to a
finding.

## Output

- **Theme configuration** — skill used, file changed, properties set.
- **UI implementation** — target name → route → source file.
- **Findings** — unresolved ones by severity, tagged with the phase that owns each.
- **Deferred** — trade-offs accepted, and why.
- **Open questions** — anything asked and still unanswered.

## Invocation

- Load each delegated skill by the exact names above, using whatever skill mechanism your agent
  provides; if it has none, read the skill's `SKILL.md` from the skills directory directly. Either
  way, follow the loaded instructions. If a skill can't be found, say so and stop rather than
  working from memory.
- Vaadin Flow (Java) only.

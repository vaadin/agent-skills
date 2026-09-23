---
name: vaadin-visual-verification
description: >
  Visually verify a Vaadin Flow view against the Figma design it was implemented from, using
  the Playwright MCP server to render the running app and a Figma screenshot as the reference.
  This is phase 3 (verification), the final phase of the figma-to-vaadin-orchestrator workflow,
  and is normally invoked by it. Also use it on its own when the user asks to "verify against the design", "check it
  matches Figma", or "visually verify the view". Produces a prioritized, actionable list of
  visual discrepancies — it does not fix them. Does NOT apply to backend/business-logic testing or
  general UI test suites — this is visual, design-fidelity verification only.
compatibility: Requires the Playwright MCP server, Figma MCP, and a runnable instance of the target app
---

# Vaadin Visual Verification

## Purpose

Compare a live, rendered Vaadin view against the Figma design it was built from, and produce a
prioritized list of concrete visual differences — not a pass/fail, and not a vague "looks good."

## Inputs

When invoked by `figma-to-vaadin-orchestrator`, everything below comes from the workflow
manifest at `.figma-to-vaadin/state.json` — read it first:

| Needed | Manifest field |
|---|---|
| The Figma node the view was built from | `fileKey` + the target's `nodeId` |
| The route of the implemented view | the target's `route`, appended to `appBaseUrl` |
| How to start the app if it isn't running | `appStartCommand` |

**Scope.** A node may be a region of an existing view rather than a whole screen, in which case
targets share a `route`. Compare only what the node covers — the rest of the page came from other
work, and its differences are not findings.

Invoked without the manifest, ask the caller or the user for the same three. Ask rather than
guess at a route or reuse a stale screenshot.

## Workflow

### 1. Ensure the app is running *the current code*

A responding server is not necessarily serving the code on disk — Java changes need a rebuild and
restart, and hotswap agents or devtools are never an assumption.

- **Called by `figma-to-vaadin-orchestrator`** — it restarted the app already. Confirm the URL
  responds and continue.
- **Otherwise** — restart it yourself: stop what's running, start it with `appStartCommand` in
  the background, and wait for the startup log line (e.g. `Started <Application> in ...`) before
  loading any page.

### 2. Capture the reference

`get_screenshot` on the Figma node the view was implemented from. This is the ground truth —
re-fetch it even if a screenshot was already seen during implementation, in case the design
changed since.

### 3. Capture the implementation

Using the Playwright MCP server (check the exact tool names available in your session — common
ones are `browser_navigate`, `browser_resize`, `browser_take_screenshot`, `browser_snapshot`
for the accessibility tree, and `browser_console_messages`):

- Navigate to the view's URL
- Resize the browser to match the Figma frame's dimensions where practical, otherwise a
  standard desktop size (1440×900)
- Take a full screenshot of the view
- Capture the browser console too — layout bugs and JS errors both matter, and the console
  surfaces things a screenshot alone won't (e.g. a component that silently failed to render)
- If the view has distinct states the Figma design also shows (e.g. a selected grid row
  revealing a detail panel), reproduce and capture each of those states

### 4. Compare

Go element by element, not just "does it look similar at a glance":

- **Layout** — spacing, alignment, sizing, padding, including nested-layout issues like doubled
  or collapsed padding, overlapping or overflowing elements
- **Viewport & scroll** — does the contents fit in the browser viewport? Does the view fill the full width? Are there nested scrollable areas? Confirm precisely with `browser_evaluate` — compare `document.documentElement.scrollHeight`/`scrollWidth` against `window.innerHeight`/`innerWidth`; any mismatch means real overflow, even if a screenshot alone looks fine (a screenshot only shows what's currently in view — content pushed below the fold by overflow, like footer action buttons, can look simply "missing" rather than "present but unreachable")
- **Typography** — heading levels, font size/weight, line height
- **Color & contrast** — text readable against its background, status colors (badges, errors)
  match intent, colors correct for the active color scheme if the app supports both light and
  dark
- **Component fidelity** — does the rendered component match Figma: orientation variant, color variant, theme variant, missing or
  extra elements
- **Console errors** — JS errors, failed component registrations, or Vaadin dev-mode warnings
  that indicate something didn't render as intended

### 5. Report findings

Produce a prioritized, actionable list — not a narrative. For each finding, give:

- **Severity** — `blocker` (broken or missing functionality/component), `high` (visibly wrong
  in a way a user would notice immediately, e.g. wrong orientation or color), `low` (minor
  spacing/polish difference)
- **Location** — which view/component
- **Expected vs. actual** — what Figma shows vs. what rendered
- **Suggested fix** — a concrete code-level suggestion where possible (e.g. "add
  `RadioGroupVariant.AURA_HORIZONTAL`"), not just "fix the spacing"

Sort by severity, blockers first. If there are no findings, say so explicitly rather than
omitting the report.

## Boundaries

- This skill only observes and reports — it does not edit code. Applying fixes belongs to the
  caller: `figma-to-vaadin-orchestrator` routes each finding to the phase that owns its fix —
  phase 1 (theme configuration) or phase 2 (UI implementation) — batches theme changes into a
  single revision, and decides what gets re-verified.
  Report findings; don't fix them, and don't loop.
- Don't rely on a single full-page screenshot alone — contrast and spacing issues are often
  only visible up close; take additional close-up screenshots of the specific regions where you
  suspect or find issues.

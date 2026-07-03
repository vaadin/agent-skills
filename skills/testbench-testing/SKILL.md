---
name: testbench-testing
description: >
  Guide the agent on writing end-to-end browser tests with Vaadin TestBench in Vaadin 25.
  This skill should be used when the user asks to "write an end-to-end test",
  "write a browser test", "use TestBench", "create a page object",
  "test in a real browser", "integration test a Vaadin app",
  "visual regression test", "cross-browser test", or needs help with
  TestBench Element API, ElementQuery, page objects, or TestBenchTestCase.
version: 0.3.0
---

# End-to-End Browser Testing with Vaadin TestBench

This skill is decision guidance, not an API reference. Look up current APIs and examples
rather than relying on memory:

- **Docs / patterns:** `search_vaadin_docs` — set `vaadin_version` to `"25"` and
  `ui_language` to `"java"`. Covers page objects, screenshots, and cross-browser setup.
- **Exact `Element` / `ElementQuery` signatures and source:** the docs MCP does *not*
  cover the TestBench API itself — use the javadoc MCP (`mcp__javadoc__*` — find via
  ToolSearch `javadoc` if not loaded) against the `com.vaadin` TestBench artifacts
  (e.g. `vaadin-testbench-core`), instead of unpacking jars from `~/.m2`.

TestBench runs your app in a real browser (built on Selenium, with a Vaadin-specific
high-level API). **It requires a commercial Vaadin subscription** — confirm the project
has one before recommending it.

## Reach for TestBench only when a browser is required

End-to-end browser tests are the slowest and flakiest tier. Use them for what genuinely
needs a real browser:

- **Critical user journeys** — login, checkout, payment.
- **Client-side behavior** — JavaScript, custom web components, things that only exist
  in the browser.
- **Visual regression** — screenshot comparison to catch unintended UI changes.
- **Cross-browser** — verifying Chrome / Firefox / Safari.
- **External integrations** — SSO, OAuth redirects.

For everything else — component logic, view flow, validation — prefer fast, browser-free
tests (Vaadin's browserless testing framework). Push coverage down to that tier and keep
TestBench for the handful of journeys that can't be verified any other way.

## Do / don't

- **Use page objects for all but the simplest tests.** Encapsulate each view/component
  behind a page object so tests read like a user story and UI changes touch one place,
  not every test.
- **Assign stable IDs to key components** (`component.setId(...)`) and query by them.
  Prefer IDs over positional or structural queries, which break on layout changes.
- **Wait, don't sleep.** Use TestBench's waiting queries (e.g. `waitForFirst()` /
  `waitUntil(...)`) instead of `Thread.sleep()` — explicit waits are both more reliable
  and faster, especially after navigation or async loading.
- **One user journey per test method**, and keep tests independent. E2E tests are
  expensive; each should cover a meaningful scenario, not every edge case.
- **Run in CI headless.** Chrome headless is the most reliable configuration.

---
name: responsive-layouts
description: >
  Guide the agent on building responsive Vaadin layouts that adapt to different screen sizes.
  This skill should be used when the user asks to "make a layout responsive",
  "support mobile", "adapt to screen size", "use breakpoints", "use media queries",
  "use container queries", "responsive design", "mobile first", or needs help
  making a Vaadin Flow view work well on both desktop and mobile devices.
version: 0.3.0
---

# Building Responsive Layouts in Vaadin

Guidance for building responsive Vaadin layouts lives in the Vaadin documentation,
served through the Vaadin MCP server. Responsive components, CSS techniques, and best
practices differ between Vaadin versions, so always fetch the article for the project's
actual version instead of relying on memorized behavior.

1. **Determine the project's Vaadin version** from `pom.xml` (the `vaadin.version`
   property or the Vaadin BOM/parent version) or, for a Hilla/npm project, from
   `package.json`. Use the matching `major.minor` channel (for example `25.2`).
   If you can't find one, call `get_supported_vaadin_versions` and ask the user
   which version to target.

2. **Fetch the responsive layouts article** and follow it as the source of truth:

   ```
   get_full_document(["v{version}/building-apps/ui-basics/layouts/responsive.md"])
   ```

   For example, `v25.2/building-apps/ui-basics/layouts/responsive.md`.

For an exact Java API signature or to read source, use the javadoc MCP (`mcp__javadoc__*` — find via ToolSearch `javadoc` if not loaded) to read Javadoc and sources from Maven Central instead of unpacking jars from `~/.m2`.

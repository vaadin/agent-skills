---
name: vaadin-layouts
description: >
  Guide the agent on using Vaadin HorizontalLayout and VerticalLayout correctly.
  This skill should be used when the user asks to "create a layout", "arrange components",
  "align items", "fix layout sizing", "use HorizontalLayout", "use VerticalLayout",
  or needs help with spacing, padding, margins, flex-grow, flex-shrink, or alignment
  in Vaadin Flow views. Also trigger when debugging layout issues like components
  shrinking unexpectedly or overflowing their container, or when choosing between
  layout components (HorizontalLayout vs VerticalLayout vs FlexLayout vs AppLayout).
  Also trigger for two-dimensional grids or card grids built with CSS Grid.
version: 0.4.0
---

# Vaadin Layouts: HorizontalLayout & VerticalLayout

Guidance for arranging components with Vaadin layouts lives in the Vaadin
documentation, served through the Vaadin MCP server. Layout defaults and APIs
differ between Vaadin versions, so always fetch the article for the project's
actual version instead of relying on memorized behavior.

1. **Determine the project's Vaadin version** from `pom.xml` (the `vaadin.version`
   property or the Vaadin BOM/parent version) or, for a Hilla/npm project, from
   `package.json`. Use the matching `major.minor` channel (for example `25.2`).
   If you can't find one, call `get_supported_vaadin_versions` and ask the user
   which version to target.

2. **Fetch the relevant article(s)** with the project's version as the path
   prefix (for example `v25.2`), and follow them as the source of truth:

   - The layouts overview -- rows, columns, sizing, alignment, spacing:

     ```
     get_full_document(["v{version}/building-apps/ui-basics/layouts/index.md"])
     ```

   - For a two-dimensional grid (rows *and* columns) or a card grid, also fetch
     the CSS Grid article:

     ```
     get_full_document(["v{version}/building-apps/ui-basics/layouts/css-grid.md"])
     ```

For an exact Java API signature or to read source, use the javadoc MCP (`mcp__javadoc__*` — find via ToolSearch `javadoc` if not loaded) to read Javadoc and sources from Maven Central instead of unpacking jars from `~/.m2`.

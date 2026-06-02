---
name: responsive-layouts
description: >
  Guide Claude on building responsive Vaadin 25 layouts that adapt to different screen sizes.
  This skill should be used when the user asks to "make a layout responsive",
  "support mobile", "adapt to screen size", "use breakpoints", "use media queries",
  "use container queries", "responsive design", "mobile first", or needs help
  making a Vaadin Flow view work well on both desktop and mobile devices.
version: 0.1.0
---

# Building Responsive Layouts in Vaadin 25

Use the Vaadin MCP tools (`search_vaadin_docs`, `get_component_java_api`) to look up the latest documentation whenever uncertain about a specific API detail. Always set `vaadin_version` to `"25"` and `ui_language` to `"java"`.

## Design Philosophy

Responsiveness in Vaadin means adapting the UI to best use available screen space — not just squeezing or stretching elements. The goal is to present the right amount of information and interaction for each viewport size.

Three strategies, in order of increasing effort:

1. **Reduce features on small screens** — hide secondary filters, collapse panels. Suitable when mobile is an occasional access mode.
2. **Build a responsive UI** — same features, different layout. Use CSS media/container queries and responsive components. The recommended approach for most apps.
3. **Build separate UIs** — independent mobile and desktop experiences. Only worth the effort when interaction patterns differ fundamentally (e.g., swipe-based mobile vs. data-grid desktop).

Start with strategy 2 unless you have a strong reason not to.

## Built-in Responsive Components

Leverage these before writing custom responsive logic — they handle adaptation automatically:

- **AppLayout** — drawer auto-collapses to hamburger menu on small viewports
- **Dashboard** — grid layout automatically adjusts to screen size
- **FormLayout** — adjusts column count and label positions based on width
- **MenuBar** — shows overflow menu when items don't fit
- **Tabs** — horizontal scroll buttons appear when tabs overflow
- **Context Menu** — docks to bottom of screen on mobile
- **Dialog / Confirm Dialog** — button toolbar switches to vertical on narrow viewports
- **CRUD** — editor switches to overlay on small viewports
- **Date Picker / Select** — overlay docks to bottom on mobile

## CSS Media Queries

The primary tool for viewport-based responsiveness. Define styles that activate at specific viewport widths.

```css
/* In your view's CSS file */
.filter-panel {
    display: flex;
}

@media (max-width: 640px) {
    .filter-panel {
        display: none;
    }
}
```

Apply CSS class names from Java and let the CSS handle the responsive logic. This keeps responsive behavior in CSS where it belongs, rather than trying to detect screen sizes server-side.

## CSS Container Queries

When responsiveness should be based on a component's container width rather than the viewport. Useful for resizable panels, reusable components that appear in different contexts, and dashboard widgets.

```css
.sidepanel {
    container-type: inline-size;
    container-name: sidepanel;
}

.sidepanel .footer {
    display: none;
}

@container sidepanel (min-width: 400px) {
    .footer {
        display: flex;
    }
}
```

Container queries make components self-contained — they adapt to their own available space rather than assuming a specific viewport size.

## Utility Classes for Responsive Design (Lumo Only)

Vaadin's Lumo utility classes provide a mobile-first responsive system similar to Tailwind CSS. They are the fastest way to add responsive behavior without writing custom CSS.

> **Note:** These utility classes only work with the Lumo theme. If using Aura, use CSS media queries or container queries instead (see sections above).

**Setup (required in Vaadin 25):**

```java
@StyleSheet(Lumo.STYLESHEET)
@StyleSheet(Lumo.UTILITY_STYLESHEET)
@StyleSheet("styles.css")
public class Application implements AppShellConfigurator {
}
```

Note: Loading Lumo Utility Classes through `theme.json` is no longer supported in Vaadin 25. Use `@StyleSheet` imports instead.

**Breakpoints (mobile-first):**

| Breakpoint | Min width | Java constant prefix |
|------------|-----------|---------------------|
| (default)  | 0px       | `LumoUtility.Display.FLEX` etc. |
| Small      | 640px     | `Display.Breakpoint.Small.*` |
| Medium     | 768px     | `Display.Breakpoint.Medium.*` |
| Large      | 1024px    | `Display.Breakpoint.Large.*` |
| XLarge     | 1280px    | `Display.Breakpoint.XLarge.*` |
| XXLarge    | 1536px    | `Display.Breakpoint.XXLarge.*` |

**Example — show a mobile toolbar only on small screens:**

```java
mobileToolbar.addClassNames(
    LumoUtility.Display.FLEX,               // visible by default (mobile)
    LumoUtility.Display.Breakpoint.Small.HIDDEN  // hidden at 640px+
);
```

**Example — switch from vertical to horizontal layout at a breakpoint:**

```java
container.addClassNames(
    LumoUtility.Display.FLEX,
    LumoUtility.FlexDirection.COLUMN,                          // stack vertically (mobile)
    LumoUtility.FlexDirection.Breakpoint.Medium.ROW            // row at 768px+
);
```

The utility classes follow a mobile-first pattern: define the mobile style as the default, then override at larger breakpoints. This matches the CSS convention and produces cleaner code.

## Responsive Patterns

### Pattern: Collapsible filter panel (Lumo utility classes)

On desktop, show a filter sidebar. On mobile, hide it behind a toggle button.

```java
// Lumo theme only — uses LumoUtility classes
// Filter panel — hidden on mobile, shown on desktop
VerticalLayout filterPanel = new VerticalLayout();
filterPanel.addClassNames(
    LumoUtility.Display.HIDDEN,                           // hidden by default
    LumoUtility.Display.Breakpoint.Medium.FLEX             // shown at 768px+
);

// Toggle button — shown on mobile, hidden on desktop
Button filterToggle = new Button("Filters");
filterToggle.addClassNames(
    LumoUtility.Display.INLINE_FLEX,                       // shown by default
    LumoUtility.Display.Breakpoint.Medium.HIDDEN           // hidden at 768px+
);
```

### Pattern: Responsive card grid

Use CSS Grid for a card layout that adapts its column count.

```css
.card-grid {
    display: grid;
    gap: 1rem;  /* or use theme token: var(--lumo-space-m) for Lumo */
    grid-template-columns: 1fr;  /* 1 column on mobile */
}

@media (min-width: 640px) {
    .card-grid {
        grid-template-columns: repeat(2, 1fr);  /* 2 columns */
    }
}

@media (min-width: 1024px) {
    .card-grid {
        grid-template-columns: repeat(3, 1fr);  /* 3 columns */
    }
}
```

```java
Div cardGrid = new Div();
cardGrid.addClassName("card-grid");
// Add Card components to cardGrid
```

### Pattern: Desktop sidebar → mobile bottom sheet

Use AppLayout with drawer placement. On small viewports, AppLayout automatically converts the drawer to an overlay. For full customization, combine with media queries to move navigation to a bottom bar.

## Best Practices

1. **Use CSS for responsiveness, not server-side detection** — avoid `Page.retrieveExtendedClientDetails()` or `UI.getCurrent().getPage().addBrowserWindowResizeListener()` for layout decisions. CSS media/container queries are more performant and don't require a server round-trip.
2. **Mobile first** — define the mobile layout as the default and add complexity for larger screens. This matches how Lumo utility breakpoints work.
3. **Leverage built-in responsive components** — AppLayout, FormLayout, Dashboard, MenuBar already handle adaptation. Don't rebuild what they provide.
4. **Prefer container queries for reusable components** — if a component might appear in different-width containers, container queries make it self-adapting.
5. **Design for fluid sizes** — don't target specific device resolutions. Users resize browsers, use split screens, and zoom. Test at many widths, not just "phone" and "desktop."
6. **Test wrapping behavior** — when using `setWrap(true)` on HorizontalLayout or flex-wrap in CSS, verify that items wrap gracefully at intermediate sizes, not just at your target breakpoints.

## Detailed Reference

For the complete list of Lumo utility class breakpoints and responsive constants, see `references/responsive-patterns.md`.

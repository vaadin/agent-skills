# Responsive Patterns Reference (Lumo Theme Only)

> **Note:** The utility classes and breakpoint constants in this reference require the Lumo theme and `Lumo.UTILITY_STYLESHEET`. They do not work with the Aura theme. For Aura, use CSS media queries and container queries instead.

## Lumo Utility Breakpoints

All breakpoints are mobile-first (min-width). The default style (no breakpoint prefix) applies to all screen sizes.

| Breakpoint | Min width | CSS prefix | Java constant prefix |
|------------|-----------|------------|---------------------|
| (default)  | 0px       | (none)     | `LumoUtility.Display.*` etc. |
| Small      | 640px     | `sm:`      | `*.Breakpoint.Small.*` |
| Medium     | 768px     | `md:`      | `*.Breakpoint.Medium.*` |
| Large      | 1024px    | `lg:`      | `*.Breakpoint.Large.*` |
| XLarge     | 1280px    | `xl:`      | `*.Breakpoint.XLarge.*` |
| XXLarge    | 1536px    | `xxl:`     | `*.Breakpoint.XXLarge.*` |

## Loading Lumo Utility Classes (Vaadin 25)

```java
@StyleSheet(Lumo.STYLESHEET)
@StyleSheet(Lumo.UTILITY_STYLESHEET)
@StyleSheet("styles.css")
public class Application implements AppShellConfigurator {
}
```

This replaces the old `theme.json` approach from Vaadin 24.

## Common Responsive Utility Class Patterns (Lumo Only)

### Show/hide elements

```java
// Visible on mobile, hidden on desktop
element.addClassNames(Display.FLEX, Display.Breakpoint.Medium.HIDDEN);

// Hidden on mobile, visible on desktop
element.addClassNames(Display.HIDDEN, Display.Breakpoint.Medium.FLEX);
```

### Change flex direction

```java
// Vertical on mobile, horizontal on desktop
container.addClassNames(
    LumoUtility.Display.FLEX,
    LumoUtility.FlexDirection.COLUMN,
    LumoUtility.FlexDirection.Breakpoint.Medium.ROW
);
```

### Change gap/padding at breakpoints

```java
container.addClassNames(
    LumoUtility.Gap.SMALL,
    LumoUtility.Gap.Breakpoint.Medium.MEDIUM,
    LumoUtility.Padding.SMALL,
    LumoUtility.Padding.Breakpoint.Medium.LARGE
);
```

## Components with Built-in Responsive Behavior

| Component | What adapts | How |
|-----------|------------|-----|
| AppLayout | Drawer | Collapses to hamburger overlay on small viewports |
| Dashboard | Widget grid | Adjusts column count based on container width |
| FormLayout | Columns, labels | Column count and label position adjust to width |
| MenuBar | Overflow | Items that don't fit go into an overflow menu |
| Tabs | Scrolling | Scroll buttons appear when tabs overflow |
| Context Menu | Position | Docks to bottom of screen on mobile |
| Dialog | Buttons | Button toolbar switches to vertical on narrow viewports |
| CRUD | Editor | Editor becomes an overlay on small viewports |
| Date Picker | Overlay | Overlay docks to bottom on mobile |
| Select | Overlay | Overlay docks to bottom on mobile |

## CSS Media Query Common Breakpoints

When writing custom CSS, use these breakpoints to match the Lumo utility class system:

```css
/* Mobile first — default styles apply to mobile */

@media (min-width: 640px) {
    /* Small — tablets in portrait */
}

@media (min-width: 768px) {
    /* Medium — tablets in landscape */
}

@media (min-width: 1024px) {
    /* Large — small desktops, laptops */
}

@media (min-width: 1280px) {
    /* XLarge — standard desktops */
}

@media (min-width: 1536px) {
    /* XXLarge — large monitors */
}
```

## CSS Container Query Setup

For components that need to respond to their own container size:

```css
/* 1. Declare the container */
.my-panel {
    container-type: inline-size;
    container-name: my-panel;  /* optional but improves readability */
}

/* 2. Query the container */
@container my-panel (min-width: 400px) {
    .my-panel .details {
        display: grid;
        grid-template-columns: 1fr 1fr;
    }
}
```

Use container queries when a component may appear in different width contexts (e.g., a widget on a dashboard that could be half-width or full-width).

## Anti-patterns

**Don't use server-side window resize listeners for layout:**
```java
// AVOID: causes server round-trips on every resize
UI.getCurrent().getPage().addBrowserWindowResizeListener(event -> {
    if (event.getWidth() < 768) {
        switchToMobileLayout();
    }
});
```

**Don't hard-code device widths:**
```css
/* AVOID: targets a specific device rather than a range */
@media (width: 375px) { ... }

/* PREFER: targets a range */
@media (max-width: 640px) { ... }
```

**Don't build separate view classes for mobile and desktop** unless the interaction patterns are fundamentally different. Maintain one view with responsive CSS.

# Layout: the Java API before CSS

*Required reading for step 3 of `SKILL.md`, before you write any layout code.*

**This skill uses Vaadin's layout APIs plus plain CSS.** That combination works in every Vaadin
project regardless of theme or setup, which utility-class approaches do not — `LumoUtility`
exists only for Lumo. If a project has its own utility or Tailwind convention, follow the
project's guidelines for the CSS half; the Java half below is unchanged either way.

Figma returns flexbox CSS, so translating it into `Div`s with `display: flex` feels faithful.
It is not — it discards the layout API, and it is the most common structural defect in generated
views. **`HorizontalLayout` and `VerticalLayout` are flexbox.** Use CSS only for what they cannot
express.

## Decision table

| Layout need | Java API |
|---|---|
| Vertical / horizontal stacking | `VerticalLayout` / `HorizontalLayout` |
| Visual container without opinionated defaults | `FlexLayout` |
| Spacing, padding | `setSpacing(...)`, `setPadding(...)` — check which overloads your version has |
| Custom gap size (not just on/off) | `setSpacing(String)` / `setSpacing(float, Unit)` |
| Wrap a row onto multiple lines | `setWrap(true)`, or `setFlexWrap(...)` on `FlexLayout` |
| Cross-axis alignment | `setAlignItems(...)` |
| Main-axis distribution | `setJustifyContentMode(...)` |
| One child fills remaining space | `expand(child)` or `setFlexGrow(1, child)` |
| Per-child alignment or basis | `setAlignSelf(...)`, `setFlexBasis(...)` |
| Size and constraints | `setWidth`, `setHeight`, `setSizeFull`, `setMin/MaxWidth` |
| Scrollable region | `Scroller` |
| Responsive form columns | `FormLayout.setAutoResponsive(true)` — derives the column count from `setColumnWidth(...)` and the space available, so no breakpoints are written by hand |
| Resizable split panels | `SplitLayout` |

Confirm the exact overloads with `get_component_java_api` for the project's version — a setter
that is boolean-only in one version may accept a CSS string in another, and assuming the wrong one
is a compile error at best and a silent no-op at worst.

## Responsiveness

**Responsiveness comes primarly from the layout API** and secondarily from a media query.

Beyond what the layout API and an auto-responsive `FormLayout` give for free, responsive behaviour is
**not described in the design** — a static frame specifies exactly one width. Check whether
the project already defines breakpoints or a responsive pattern and follow it; if it does not,
**ask** rather than inventing a breakpoint scale. Adding one unasked is a guess the user has to
review and probably undo.

## When CSS is the right answer

The layout API cannot express these:

| Need | CSS |
|---|---|
| 2-D grid (rows AND columns) | `display: grid; grid-template-columns: ...` |
| Sticky / absolute positioning | `position: sticky; top: 0;` |
| Clip overflow without a scrollbar | `overflow: hidden;` |
| Text truncation | `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;` |
| Card-like surface on a plain container, content panel | `background`, `border`, `border-radius`, `padding` |

## Layout behaviour that causes silent bugs

**Defaults differ between the two ordered layouts, and neither matches what you probably want.**
`VerticalLayout`: padding **on**, width 100%, items aligned START — children do not stretch
horizontally. `HorizontalLayout`: padding **off**, width **hugs content**, items **stretched** —
so a button beside a text field silently grows to match its height. Set padding, width and
alignment explicitly rather than inheriting these.

**`flex-shrink` is on by default**, so a fixed-size child shrinks next to a full-width sibling.
Use `setFlexGrow(1, ...)` on the growing child, or `setFlexShrink(0, ...)` on the fixed one,
rather than setting full width on one and hoping.

**A layout child's minimum size defaults to its content size.** This produces unexpected
scrollbars and containers that refuse to shrink below their content even with `setSizeFull()`,
and it applies one level up too. If a view overflows the page instead of scrolling internally,
set a zero min-height on the expanded child *itself*, not only on a scroller nested deeper
inside.

**Never use CSS `margin` to space a layout from its container.** Margin sits outside the measured
box and breaks full-size and expand height maths — a component can measure correct while visibly
overflowing. Use padding on a wrapping layout, or target the component's own shadow-DOM part.

**Vaadin's layout components already set `box-sizing: border-box`.** A CSS rule targeting a plain
`Div`, a non-layout component, or a `::part(...)` needs it added explicitly when the rule also
sets padding — otherwise the padding adds to the declared size.

**Prefer the component API over the element/style API.** Use the component's own setters and
theme variants rather than `getElement().setAttribute(...)` or `getStyle().set(...)`, and set
sizes with `setWidth()` / `setSizeFull()`.

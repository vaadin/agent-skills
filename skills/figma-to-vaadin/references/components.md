# Choosing and styling components

*Required reading for step 4 of `SKILL.md`, before you choose or style any component.*

Call `get_component_styling` before writing **any** CSS for a component, and
`get_component_java_api` before assuming a method exists. What the component already does is the
input to most of what follows.

## Choosing the right component

Start from the obvious mapping, then verify against annotations and the component's real API:

| Figma | Vaadin |
|---|---|
| Vertical / horizontal auto layout | `VerticalLayout` / `HorizontalLayout` |
| Free or absolute layout | `FlexLayout` |
| Form or labelled fields | `FormLayout` |
| Master-detail | `MasterDetailLayout` |
| Grid / table | `Grid` |
| Long repeated list | a virtualised list |
| Button, text field, avatar | `Button`, `TextField`, `Avatar` |
| Badge / status label | `Badge` |
| Text layer / heading | `Span` / `H1`–`H6` |

**A card component presents one data object** — a product, a person, an order: title, subtitle,
media, a few facts, maybe footer actions. It is not a panel, a section wrapper, or a form shell.

Don't reach for it because the design shows a rounded, bordered, elevated surface; that is a
*visual* treatment, and designs are full of them. **The name is the tell: if the honest
description is *panel*, *section*, *toolbar* or *container*, it is not a card.** Use a layout
with a scoped CSS class carrying the background, border, radius and padding. Misusing a card also
breaks sizing: its slots are laid out for content, so a
scroller placed inside one will not take the full width even with `setSizeFull()`.

**A component that accepts children gives you a slot, not a layout.** Adding several children to
a wrapper component — `CustomField` is the common case — drops them into its content slot with no
alignment, spacing or direction applied. Wrap them in a real layout and add that single wrapper,
and give the design's width to *that* layout rather than to the outer component: a width set on
the wrapper does not necessarily propagate inward, and **an internal `::part()` may not be a flex
container**, so `flex: 1` on a child can be silently inert. Check the component's styling before
writing CSS that depends on its internal structure.

**Grid columns: pick the sizing mode deliberately.** By default a Grid gives every column the
same width and lets them share the available space, which suits a table meant to fill its
container. When the design shows columns sized to their content — the common case in a dense data
view — ask for that with `setAutoWidth(true)`.

So: make the columns hug their content, and set an explicit width only on a column the design
*visibly* makes wider or narrower than its neighbours. What to avoid is hand-tuning a pixel width
per column — that reliably produces a grid matching no design at all — not configuration as such.

**Match the component to the data, not just the picture.** A long scrolling list of repeated
items is a virtualised list even when it is drawn as a stack of cards. Choosing the right
component and using its API correctly are independent — verify the API after you choose.

## Component defaults, in both directions

Two opposite failures follow from not checking what a component already does, and both are
common:

- **Don't restate a default.** Applying a "cover media" variant *and* writing `object-fit: cover`
  yourself is not harmless belt-and-braces; it is a duplicate declaration that will drift from
  the theme. If you are writing CSS targeting a component's internals (`::part(...)`,
  `[slot='...']`), check first for a variant that already covers it.
- **Do override a default the design contradicts.** Cards round their corners by default. If the
  design draws square cards and you emit nothing, you ship rounded ones.

**Absence of a declaration is not neutral: it inherits the default.** "The design shows X and I
wrote nothing about X" is correct only when the default already *is* X — and you cannot know
that without looking.

## Themes, variants and annotations

The design and the app may not share a theme, and often don't. Translate rather than assume.

- **Prefer theme-agnostic variant constants** where the enum offers them; they follow whichever
  theme the app runs and cannot drift out of sync with it. A theme-prefixed constant must match
  the app's actual theme.
- **Some variants exist in one theme only, and defaults differ between themes.** Component
  orientation is a common case: a radio or checkbox group renders vertically under one theme and
  horizontally under another, so a design showing a horizontal group may need an explicit variant
  — or none at all. Check the default for the *app's* theme, not the design's.
- **An annotation naming a variant that doesn't exist in the app's theme loses to the render.**
  Annotations are authoritative about *intent*, not about API. Implement what the design shows
  and report the mismatch, rather than emitting a constant that doesn't exist or silently
  dropping the annotation.
- **Content annotations constrain values**, not just component choice — honour them in the data
  you supply.

## Accessibility and semantics

- **Icon-only buttons need an accessible name** — set an aria-label; the icon carries no text.
- **Take heading levels from the design's text styles**, and keep them in document order. A
  heading's visual size is not its level, and the design's largest text is not automatically an
  `H1` if the page already has one.
- **A label drawn above a field in Figma is the field's label**, not a separate text element
  beside it — use the component's label API so the association survives.

## Icons

A design does not merely show an icon, it **names** one, and that name is the spec. Projects
usually draw from a single icon set — a Vaadin set or their own — holding only a subset of it.

When the named icon isn't available, **stop and ask**: a placeholder for now, the SVG exported
from Figma and added to the project's set, or the icon pulled from its upstream source. Any of
those is fine; choosing silently is not.

**Never substitute a different icon and move on.** Reaching for whatever is already available
produces things like a barcode icon on a column-picker button — not a near-miss but a different
meaning, and it looks deliberate, so review won't catch it. Omitting the icon is equally wrong.
If you are about to pick an icon the design did not name, that is the moment to ask.

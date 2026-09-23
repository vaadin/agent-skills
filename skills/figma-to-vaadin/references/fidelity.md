# Fidelity: measuring the design, and checking what you emitted

*Required reading for steps 2 and 5 of `SKILL.md`. Measuring the design, then checking what you emitted.*

Two passes over the same list: once before writing Java, once before finishing.

## What to trust for which property

The returned code is a measurement source even when it is not a usable implementation. For
measurable properties it is more precise than the screenshot, which cannot show a 1px border or
tell 12px from 14px padding.

- **The code wins** for spacing, padding, gaps, border widths, radii, sizes, font weights.
- **The screenshot wins** for intent, hierarchy, grouping, what a region *is*, and **large-area
  color** — the view's background and foreground.

**The base frame's own fill is a style to implement, not the canvas it is drawn on.** It sits on
the outermost frame rather than on any component, so it is easy to read past in the code while
being the most obvious thing on screen. Check background and text color first: every border
right against the wrong background is still the wrong view.

Record per region before writing Java: **nesting, padding, gap, border, size, component type.**

**Start that record with the view itself.** Before any region, write down the base frame's own
background and text color and where they will be set. This is the single most-missed property in
practice — it belongs to no component, so there is no point later in the job where anything
prompts you for it, and the view renders on the theme's default background without ever looking
obviously broken.

## Borders and separators: the most-missed detail

**Borders are dropped more often than any other measurable property.** A 1px line is effectively
invisible in a screenshot at normal zoom, so comparing against the render will not catch a
missing one, and nothing else downstream will either. A view can look right and still be missing
every rule and separator in the design.

- Take width, style and color from the returned **code**, never the screenshot. `border-b`,
  `border`, `divide-y` and a 1px-wide element are all borders — a 1px `Div` used as a divider
  means a border or a separator, not a 1px element in the Java.
- Sweep for them deliberately before finishing: header underlines, tab strips, toolbar and panel
  edges, grid outer border and row rules, card edges, dividers between blocks.
- Check the component's own API first — grid row and column rules, card edges and scroller
  overflow indicators usually come from variants rather than hand-written CSS.
- **The ones most often dropped sit on elements the view does not own.** A border on a shared
  theme class is more awkward to write than one on a class you invented, so it gets skipped.
  Scope the override under the view's own class with a child combinator so it wins on specificity
  without leaking into other views. Awkwardness is not a reason to drop a line the design has.

## Tokens first, literals when nothing fits

Themes define scales for spacing, radius and type, not only colors. Look a value up in the theme's
scale before writing it as a number.

A design tokenised for a different theme routinely asks for values the app's theme cannot
express — a type scale reaching past the theme's ceiling is the common case. Snapping such a
value to the nearest token is a silent, invisible loss of fidelity.

Prefer a token wherever one genuinely matches. **Where none does, emit the design's literal
value — do not snap to the nearest token, and specifically never to the top of the scale.**
Snapping flattens exactly the hierarchy the design is using: a 28px heading and a 22px one both
become the theme's ceiling, and two visibly different levels render identically.

"The theme has no token this large" is the condition for emitting a literal, not a reason to
round down to the largest token. Then **report it**, so the gap is a decision rather than an
accident — a short "these values have no token equivalent in the current theme" note is the
deliverable, not a nuisance.

## Implement what the design contains — and nothing else

- **Hidden layers are not content.** A layer hidden in Figma is not part of the design; do not
  implement it just because it appeared in the response.
- **An empty or underspecified region is a question, not a blank to fill.** When a design
  specifies a detail header but leaves the body empty, **ask** what belongs there rather than
  inventing a plausible form over whatever fields the data happens to have. Invented content
  looks finished and reviews as though it were specified, which is harder to catch than a gap.

**Writing the guess down does not license shipping it.** A note saying "this is a guess, replace
it with the real spec" is good practice and no substitute for asking. If you would have to write
that sentence, ask instead.

The narrow exception is a **behavioural affordance a component needs to be operable** — an
overlay needs some way to dismiss it even if the frame draws no close button. Add the minimum
that makes it work and report it. This covers operability, never content.

## Close the loop before you finish

Measuring a detail and then not emitting it is the most common way a careful run still produces a
wrong view. Check all three directions:

- **Every CSS class set in Java has a rule behind it.** An orphaned class is a measurement you
  captured and dropped — usually the 1px borders and exact paddings that separate a faithful view
  from an approximate one.
- **Every rule is reachable** from a class the Java actually sets.
- **Every declaration traces to something the design showed.** Padding the frame does not have is
  as wrong as padding it has and you dropped, and harder to notice. If you cannot point to the
  measurement behind a declaration, delete it.
- **Every hard-coded number is one token not matched.** Spacing, radius and type scales are tokens
  too — check the scale before leaving a number in.

Then re-read the per-region measurements from the start of the job and confirm each padding, gap,
border and size actually appears — in the layout API where one covers it, in CSS otherwise.

Finally, **compile**. It is the cheapest fully objective check available, and it catches API
mistakes that no amount of visual comparison will.

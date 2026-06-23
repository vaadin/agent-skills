---
name: vaadin-form-layout
description: >
  Builds the visual structure and layout of a form, entity editor, or data-entry
  view in Vaadin Flow (Java) from any spec source — Figma URL, screenshot, text,
  or prompt — choosing the fields and components, FormLayout sectioning, and
  responsive column layout. Use when asked to create, implement, build, or
  generate a form, entity editor, or data entry view in Vaadin, to "add fields",
  "add a form", or "build a layout for editing", or when the user describes
  collecting structured input from users — even if they don't say the word "form"
  explicitly. This skill covers the form's layout and components only; to wire the
  fields to a Java bean with Binder, converters, and validation, use the
  forms-and-validation skill alongside this one.
---
 
# Vaadin Form Creation
 
## Workflow
 
Track these three steps as TODOs so progress stays visible and the work can be resumed if it's interrupted partway through. Work through them in order.
 
### Step 1 – Understand the input and plan
 
Process the spec source first: fetch and inspect a Figma URL, read a screenshot, or parse a text prompt.
 
- **Well-defined spec** (explicit field list, or a design with clear fields and labels): implement exactly what's specified. Do not invent extra fields, rename labels, or add controls the spec doesn't call for. The output should be predictable and faithful to the input.
- **Vague request** (e.g. "make a customer form" with no field list): ask a few targeted clarifying questions before planning — which fields and their data types, how they group, and whether it should be a single section or several. Don't silently guess the contents.
Once the contents are settled, plan the structure and record it in your TODOs:
- the field list and the data type of each field,
- the section layout — single section, stacked vertical sections, or side-by-side horizontal sections,
- which reference example (see table below) most closely matches the planned structure.
**Sectioning guidance:** when a form covers multiple logical groups of fields (e.g. basic details and address), split it into separate `FormLayout` instances — one per section, each with its own heading added into the `FormLayout` spanning the full column width. Use a heading element whose level fits the surrounding view hierarchy (e.g. a section heading nested under a page title). If the right level isn't clear from the surrounding code, default to `H4` as the reference examples do — don't go out of your way to discover the exact level. Arrange sections side-by-side with a wrapping `HorizontalLayout` (growing and shrinking equally, wrapping to one column on narrow viewports) or stacked in a `VerticalLayout`.
 
### Step 2 – Gather references
 
With the component set now known from the plan:
- **Resolve the theme.** Check `Application.java` for the `@StyleSheet` import: `Aura.STYLESHEET` → Aura, `Lumo.STYLESHEET` → Lumo (also the default if no theme is found). Theme affects component variants, e.g. `RadioGroupVariant.AURA_HORIZONTAL` vs `RadioGroupVariant.LUMO_VERTICAL` for horizontal radio groups.
- **Read the matching reference example** end-to-end (table below).
- **Fetch component API docs** with `mcp_vaadin_get_component_java_api` for every component you'll use, including `FormLayout` — method signatures differ between Vaadin versions.

### Step 3 – Write the UI code
 
Implement the form following the patterns in the chosen reference example. Always use `FormLayout` for the form body. Key layout concepts:
- **Auto-responsive** — use `setAutoResponsive(true)` with `addFormRow(...)` to infer column count from the widest row. Combine with `setExpandColumns(true)` and `setExpandFields(true)` to fill available width. Preferred for uniform-width fields.
- **Responsive steps** — alternative to auto-responsive; use `setResponsiveSteps(...)` to define explicit column counts at specific breakpoints when you need precise control over layout at different widths.
- **Column span** — pass a column count to `form.add(field, n)` or use `FormRow` with per-field colspan for asymmetric rows.
- **Constrained width** — set `setMaxWidth`/`setMinWidth` to keep forms readable at large viewport sizes.
- **Asymmetric rows** — when fields in a row need different widths, wrap them in a `HorizontalLayout` and add it as a single full-width item.

## Examples
 
| File | What it shows |
|---|---|
| [references/horizontal-sections-form-example.md](references/horizontal-sections-form-example.md) | Two-section entity form with side-by-side auto-responsive `FormLayout` panels, equal-grow `HorizontalLayout` wrapper, asymmetric field rows via `HorizontalLayout.expand`, read-only fields, horizontal `RadioButtonGroup` (Aura), `ComboBox` with defaults, `NumberField` with helper text |
| [references/vertical-sections-three-column-form-example.md](references/vertical-sections-three-column-form-example.md) | Three-section employee form with stacked `VerticalLayout` sections, three-column auto-responsive `FormLayout`, `FormRow` colspan, `DatePicker`, `EmailField`, phone helper text |
| [references/compact-single-section-form-example.md](references/compact-single-section-form-example.md) | Compact single-section form with progressive disclosure (`CheckboxGroup` conditionally revealing a field), horizontal `RadioButtonGroup` with dynamic helper text, asymmetric field row via `HorizontalLayout`, icon prefix, live-computed summary label, constrained form width |
| [references/compact-labels-aside-form-example.md](references/compact-labels-aside-form-example.md) | Compact labels-aside form with `setLabelsAside(true)` for a two-column label/field layout, `CustomField` composition combining `NumberField` and `ComboBox` into a single form item, `TextArea` with character limit, required field indicators, constrained form width |
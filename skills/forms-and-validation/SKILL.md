---
name: forms-and-validation
description: >
  Guide the agent on building forms with Binder and robust validation in Vaadin 25 Flow.
  This skill should be used when the user asks to "create a form", "bind fields",
  "validate input", "use Binder", "use BeanValidationBinder", "add validation",
  "convert field values", "handle form submission", "cross-field validation",
  or needs help with field binding, converters, required fields, custom validators,
  or form error handling in Vaadin Flow. This skill covers data binding and
  validation; to lay out the form's fields and sections from a design or spec,
  use the vaadin-form-layout skill alongside this one.
version: 0.3.0
---

# Forms with Binder and Validation in Vaadin 25

This skill is decision guidance, not an API reference. For current signatures, code,
and examples, look them up rather than relying on memory:

- **Docs:** `search_vaadin_docs` — set `vaadin_version` to `"25"` and `ui_language` to `"java"`.
  Search for `Binder`, `BeanValidationBinder`, validators, converters.
- **Exact Java API / source:** the javadoc MCP (`mcp__javadoc__*` — find via ToolSearch
  `javadoc` if not loaded) against the `com.vaadin` binder artifacts, instead of unpacking
  jars from `~/.m2`.

`Binder` connects `HasValue` fields (TextField, ComboBox, DatePicker, …) to a Form Data
Object (a bean, record, or DTO), handling read/write, conversion, and validation.

## Pick the Binder mode first

| Scenario | Mode | Why |
|----------|------|-----|
| Form with Save/Cancel buttons | Buffered (`readBean` / `writeBeanIfValid`) | User can discard changes; nothing is written until valid |
| Multi-step wizard | Buffered | Validate each step before advancing |
| Inline row editing in a Grid | Buffered | Save/cancel per row |
| Settings panel | Write-through (`setBean`) | Every change should apply immediately |
| Search / filter bar | Write-through | Filtering updates live |

Default to **buffered** — it gives you Cancel for free and control over when data is
written. Reach for write-through only when "apply on every keystroke" is the desired UX.

## The binding chain has a fixed order

Validators and converters run in the order you declare them, and each step operates on
the value type *at that point in the chain*:

```
binder.forField(field)
    .asRequired("Required")     // 1. empty check + required indicator
    .withValidator(pre)         // 2. validates the FIELD type (e.g. String)
    .withConverter(converter)   // 3. converts field type -> model type
    .withValidator(post)        // 4. validates the MODEL type
    .bind(getter, setter);      // 5. property binding
```

Rules that follow from this:
- Put validators that need the raw input (length, regex) **before** the converter.
- Put validators that need the converted value (range, business rules) **after** it.
- Converters validate implicitly: a failed conversion surfaces as a validation error.

## Choose the right validation level

- **Field format / range** (length, email, numeric range) → binding-level validator.
  Prefer a built-in validator over a hand-written lambda when one exists; discover the
  set via `search_vaadin_docs` or the javadoc MCP rather than guessing class names.
- **Cross-field rules** (start-before-end, password confirmation) → binder-level
  validator (`binder.withValidator(...)` on the whole FDO).
- **Business rules** (uniqueness, external state) → service layer, surfaced back as a
  binder-level validator result.

Component built-in ("default") validators run alongside Binder's and take precedence;
disable per-binding with `withDefaultValidator(false)` and customize their messages via
the field's `setI18n()`.

## Do / don't

- **Prefer explicit `forField().bind(getter, setter)`** over `bindInstanceFields` /
  string property names. It's more readable and doesn't depend on field-name matching.
  (String property names are only warranted when the FDO is a record.)
- **Use `BeanValidationBinder`** when the bean already carries Jakarta annotations
  (`@NotEmpty`, `@Email`, `@Max`, …) — don't restate those rules a second time in Java.
- **Use converters for type safety**, and layer domain-primitive value objects behind
  them so invalid data is caught at the type level.
- **Set `asRequired()` on mandatory fields** — one call gives both the indicator and the
  empty check.
- **Give binder-level errors a visible home.** They don't attach to any single field, so
  route them to a status label (`binder.setStatusLabel(...)`); users won't see them
  otherwise.
- **Encapsulate each form in its own `Composite<FormLayout>` class** that owns the Binder
  and fields and exposes a small `setFormDataObject` / `getFormDataObject` API. In
  buffered mode the getter validates and returns `Optional.empty()` when invalid; in
  write-through mode the bean is already bound and the getter just validates before
  handing it back.

## Laying out the fields

Use a `FormLayout` for responsive columns. For choosing fields/components, sectioning,
auto-responsive vs responsive steps, and column spans — especially when building from a
design or spec — use the `vaadin-form-layout` skill, which covers layout in depth.

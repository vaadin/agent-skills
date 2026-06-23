# Compact single-section form with progressive disclosure and live-updating label

A single `FormLayout` that collects several related fields compactly, conditionally reveals a dependent field when a specific option is selected, and keeps a summary label in sync with the user's choices at all times. The defining patterns are: progressive disclosure (a hidden field becomes visible only when a triggering option is chosen), dynamic helper text on a `RadioButtonGroup` that reflects the consequence of each selection, and a live-computed `Span` that recalculates whenever any contributing field changes.

## Design principles demonstrated

* Keep a single logical group in one `FormLayout` when all fields belong to one task
* Use progressive disclosure — only reveal fields when they become relevant
* Reveal dependent fields inline, immediately below the control that triggers them
* Use `CheckboxGroup` for multi-select options, `RadioButtonGroup` for mutually exclusive choices
* Orient both groups horizontally to reduce vertical scroll
* Use dynamic helper text to reinforce the consequence of a choice in real time
* Preselect a sensible default for the most common option
* Keep a live-computed summary label so the user always sees the current state before submitting
* Use an icon prefix to add visual context to a field without adding a separate label
* Wrap asymmetric fields (one wide + one or more narrow) in a `HorizontalLayout` to control proportions
* Constrain form width with `setMinWidth` / `setMaxWidth` for comfortable reading at large viewports
* Use `FormRow` to place two equal fields side by side

## Implementation

```java
@Route("compact-single-section-form-example")
public class CompactSingleSectionFormExample extends VerticalLayout {

    public CompactSingleSectionFormExample() {
        setPadding(true);
        setSpacing("var(--vaadin-gap-l)");

        H1 pageHeading = new H1("Place your order");

        FormLayout form = new FormLayout();
        form.setAutoResponsive(true);
        form.setColumnSpacing("var(--vaadin-gap-s)");
        form.setExpandColumns(true);
        form.setExpandFields(true);
        form.setMinWidth("18em");
        form.setMaxWidth("36em");

        // Full name — two side-by-side fields
        TextField firstName = new TextField("First name");
        TextField lastName = new TextField("Last name");

        // Email
        EmailField email = new EmailField("Email address");

        // Payment card — wide number + two narrow fields in one row
        TextField cardNumber = new TextField("Card number");
        cardNumber.setPlaceholder("0000 0000 0000 0000");
        cardNumber.setPrefixComponent(VaadinIcon.LOCK.create());
        cardNumber.setMinWidth("18em");

        TextField cardExpiry = new TextField("Expiry");
        cardExpiry.setPlaceholder("MM/YY");
        cardExpiry.setWidth("6em");

        NumberField cardCvv = new NumberField("CVV");
        cardCvv.setWidth("6em");

        HorizontalLayout cardRow = new HorizontalLayout(cardNumber, cardExpiry, cardCvv);
        cardRow.setFlexGrow(1, cardNumber);
        cardRow.setWrap(true);

        // Add-ons — horizontal CheckboxGroup (Aura theme)
        CheckboxGroup<String> addOns = new CheckboxGroup<>("Add-ons");
        addOns.setItems("Gift wrapping (+$5.00)", "Insurance (+$22.99)");
        addOns.addThemeVariants(CheckboxGroupVariant.AURA_HORIZONTAL);

        // Gift message — conditionally revealed
        TextArea giftMessage = new TextArea("Gift message");
        giftMessage.setPlaceholder("Write a personal message to include with your gift...");
        giftMessage.setMaxLength(200);
        giftMessage.setHelperText("Max 200 characters");
        giftMessage.setVisible(false);

        addOns.addValueChangeListener(e -> {
            boolean giftSelected = e.getValue().stream().anyMatch(i -> i.contains("Gift wrapping"));
            giftMessage.setVisible(giftSelected);
            if (!giftSelected) giftMessage.clear();
        });

        // Delivery speed — horizontal RadioButtonGroup (Aura theme) with dynamic helper text
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MMMM d");
        RadioButtonGroup<String> deliverySpeed = new RadioButtonGroup<>("Delivery speed");
        deliverySpeed.setItems("Standard (free)", "Express (+$9.99)", "Overnight (+$19.99)");
        deliverySpeed.addThemeVariants(RadioGroupVariant.AURA_HORIZONTAL);
        deliverySpeed.addValueChangeListener(e -> {
            String speed = e.getValue();
            if (speed == null) {
                deliverySpeed.setHelperText(null);
                return;
            }
            LocalDate today = LocalDate.now();
            int days = speed.contains("Standard") ? 7 : speed.contains("Express") ? 3 : 1;
            deliverySpeed.setHelperText("Estimated delivery by " + today.plusDays(days).format(fmt) + ".");
        });
        deliverySpeed.setValue("Standard (free)");

        // Total — live price calculation
        final double BASE_PRICE = 150.00;
        Span totalLabel = new Span("Total");
        totalLabel.getStyle().set("font-weight", "500");
        Span totalAmount = new Span(String.format("$%.2f", BASE_PRICE));
        totalAmount.getStyle().set("font-weight", "600").set("font-size", "1.5em");
        HorizontalLayout totalRow = new HorizontalLayout(totalLabel, totalAmount);
        totalRow.setWidthFull();
        totalRow.setJustifyContentMode(FlexComponent.JustifyContentMode.BETWEEN);
        totalRow.setAlignItems(FlexComponent.Alignment.BASELINE);

        Runnable updateTotal = () -> {
            double total = BASE_PRICE;
            for (String item : addOns.getValue()) {
                if (item.contains("Gift wrapping")) total += 5.00;
                else if (item.contains("Insurance")) total += 22.99;
            }
            String speed = deliverySpeed.getValue();
            if (speed != null) {
                if (speed.contains("+$9.99")) total += 9.99;
                else if (speed.contains("+$19.99")) total += 19.99;
            }
            totalAmount.setText(String.format("$%.2f", total));
        };
        addOns.addValueChangeListener(e -> updateTotal.run());
        deliverySpeed.addValueChangeListener(e -> updateTotal.run());

        // Assemble form
        form.addFormRow(firstName, lastName);
        form.add(email, 2);
        form.add(cardRow, 2);
        form.add(addOns, 2);
        form.add(giftMessage, 2);
        form.add(deliverySpeed, 2);
        form.add(totalRow, 2);

        add(pageHeading, form);
    }
}
```

---

## APIs used in this example

Fetch up-to-date API docs with `mcp_vaadin_get_component_java_api` before writing code.

| API | Purpose |
|---|---|
| `FormLayout` · `setAutoResponsive` · `setExpandColumns` · `setExpandFields` · `setMinWidth` · `setMaxWidth` · `setColumnSpacing` | Constrained single-section auto-responsive form |
| `FormRow` · `addFormRow` · `form.add(row)` | Two equal fields side by side |
| `form.add(field, 2)` | Full-width item within the two-column grid |
| `component.setVisible(false)` · `addValueChangeListener` · `component.clear()` | Progressive disclosure — reveal and reset a field based on another field's value |
| `CheckboxGroup` · `addThemeVariants(CheckboxGroupVariant.AURA_HORIZONTAL)` | Horizontal multi-select options |
| `RadioButtonGroup` · `addThemeVariants(RadioGroupVariant.AURA_HORIZONTAL)` · `setHelperText` · `setValue` | Horizontal exclusive choice with dynamic helper text and preselected default |
| `HorizontalLayout` · `setFlexGrow` · `setWrap` | Asymmetric field row — one field grows, others stay fixed-width; wraps on narrow screens |
| `TextField` · `setPrefixComponent(VaadinIcon.X.create())` | Icon prefix for visual context |
| `Span` · `getStyle().set(...)` · `setText` | Styled live-computed summary label |
| `HorizontalLayout` · `setWidthFull` · `setJustifyContentMode(BETWEEN)` · `setAlignItems(BASELINE)` | Summary row with label on the left and value on the right |
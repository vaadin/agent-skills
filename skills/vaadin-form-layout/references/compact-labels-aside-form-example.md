# Compact labels-aside form

A constrained single-section `FormLayout` with labels placed to the left of each field via `setLabelsAside(true)`. The defining patterns are: labels-aside alignment for a compact two-column label/field layout, a `CustomField` composition that wraps a `NumberField` and a `ComboBox` into a single labelled form item, and constrained width to keep the form readable at large viewports.

## Design principles demonstrated

* Use a clear, task-specific form title
* Explain required-field rules upfront
* Use a compact single-column layout
* Place labels beside inputs for short forms
* Keep labels visible and persistent
* Use placeholders for examples, not labels
* Match input width to expected content
* Group amount and currency together
* Use dropdowns for constrained choices
* Use multiline input for longer messages
* Mark optional fields clearly
* Add helper text for limits and constraints
* Align controls consistently
* Minimize fields to what the task requires

## Implementation

```java
@Route("compact-labels-aside")
public class CompactLabelsAsideFormExample extends VerticalLayout {

    public CompactLabelsAsideFormExample() {
        H2 formHeading = new H2("Money transfer");
        Span description = new Span("Fields marked with • are required.");

        FormLayout form = new FormLayout();
        form.setAutoResponsive(true);
        form.setLabelsAside(true);
        form.setExpandColumns(true);
        form.setExpandFields(true);
        form.setMinWidth("16em");
        form.setMaxWidth("32em");

        TextField recipientName = new TextField();
        recipientName.setPlaceholder("Full name");
        recipientName.setRequired(true);

        TextField bankAccountNumber = new TextField();
        bankAccountNumber.setPlaceholder("e.g. FI21 1234 5600 0007 85");
        bankAccountNumber.setRequired(true);

        AmountWithCurrencyField amountWithCurrency = new AmountWithCurrencyField();
        amountWithCurrency.setRequiredIndicatorVisible(true);

        TextField referenceCode = new TextField();
        referenceCode.setPlaceholder("e.g. RF18 1234 5678");

        TextArea message = new TextArea();
        message.setPlaceholder("Optional message to recipient");
        message.setMaxLength(140);
        message.setHelperText("Max 140 characters");

        form.addFormItem(recipientName, "Recipient name");
        form.addFormItem(bankAccountNumber, "Bank account number");
        form.addFormItem(amountWithCurrency, "Transfer amount");
        form.addFormItem(referenceCode, "Reference code");
        form.addFormItem(message, "Message");

        add(formHeading, description, form);
    }

    public static class AmountWithCurrencyField extends CustomField<String> {

        private final NumberField amountField = new NumberField();
        private final ComboBox<String> currencyField = new ComboBox<>();

        public AmountWithCurrencyField() {
            amountField.setPlaceholder("0.00");
            amountField.addValueChangeListener(e -> updateValue());

            currencyField.setItems("EUR", "USD", "GBP", "SEK", "NOK", "DKK", "CHF", "JPY");
            currencyField.setValue("EUR");
            currencyField.setWidth("6em");
            currencyField.addValueChangeListener(e -> updateValue());

            HorizontalLayout layout = new HorizontalLayout(amountField, currencyField);
            layout.setFlexGrow(1, amountField);
            add(layout);
        }

        @Override
        protected String generateModelValue() {
            Double amount = amountField.getValue();
            String currency = currencyField.getValue();
            if (amount == null || currency == null) return null;
            return amount + " " + currency;
        }

        @Override
        protected void setPresentationValue(String value) {
            if (value == null) {
                amountField.clear();
                currencyField.setValue("EUR");
                return;
            }
            String[] parts = value.split(" ", 2);
            if (parts.length == 2) {
                try {
                    amountField.setValue(Double.parseDouble(parts[0]));
                } catch (NumberFormatException ignored) {
                    amountField.clear();
                }
                currencyField.setValue(parts[1]);
            }
        }
    }
}
```

---

## APIs used in this example

Fetch up-to-date API docs with `mcp_vaadin_get_component_java_api` before writing code.

| API | Purpose |
|---|---|
| `FormLayout` · `setAutoResponsive` · `setLabelsAside` · `setExpandColumns` · `setExpandFields` · `setMinWidth` · `setMaxWidth` | Constrained labels-aside auto-responsive form |
| `form.addFormItem(field, "Label")` | Adds a field with a label explicitly placed to its left when `setLabelsAside(true)` |
| `CustomField<T>` · `generateModelValue` · `setPresentationValue` · `updateValue` | Composite field — combines a `NumberField` and a `ComboBox` into a single labelled form item |
| `HorizontalLayout` · `setFlexGrow` | Composite field inner layout — numeric input grows, selector stays fixed-width |
| `NumberField` · `setPlaceholder` | Numeric amount input |
| `ComboBox` · `setItems` · `setValue` · `setWidth` | Currency selector with a preselected default |
| `TextField` · `setPlaceholder` · `setRequired` | Text input with placeholder and required marking |
| `TextArea` · `setMaxLength` · `setHelperText` | Bounded free-text input with character-limit helper |
| `setRequiredIndicatorVisible(true)` | Shows the required indicator on a `CustomField` |

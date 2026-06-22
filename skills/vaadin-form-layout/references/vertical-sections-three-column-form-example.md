# Stacked sections, three-column grid

Employee form where sections are stacked vertically inside a `VerticalLayout`, each section an independent `FormLayout` sharing the same three-column grid. The three-column grid is the defining pattern: it allows rows of one, two, or three equal fields, and `FormRow` colspan lets a single field dominate a row while a narrower companion sits beside it. The same layout applies to any number of stacked sections.

## Design principles demonstrated

* Group related fields into clear sections
* Use section headings to create hierarchy
* Place labels above inputs
* Keep labels persistent and visible
* Use a consistent multi-column grid
* Align fields to a shared baseline
* Size fields according to expected content
* Place related fields on the same row
* Use full-width fields for longer entries
* Match controls to input type
* Use dropdowns for predefined choices
* Use a date picker for date input
* Use radio buttons for small exclusive choices
* Add helper text for formatting guidance
* Maintain generous spacing between sections
* Follow a logical data-entry order

## Implementation

```java
public class VerticalSectionsThreeColumnFormExample extends VerticalLayout {

    public VerticalSectionsThreeColumnFormExample() {
        setSpacing("var(--vaadin-gap-xl)");
        add(createEmployeeSection(), createAddressSection(), createContactSection());
    }

    private FormLayout createEmployeeSection() {
        H4 heading = new H4("Personal details");

        TextField firstName = new TextField("First name");
        TextField middleName = new TextField("Middle name");
        TextField lastName = new TextField("Last name");

        ComboBox<String> jobTitle = new ComboBox<>("Job title");
        jobTitle.setItems(List.of("Analyst", "Associate", "Director", "Manager", "Specialist", "Team Lead", "Vice President"));

        ComboBox<String> department = new ComboBox<>("Department");
        department.setItems(List.of("Engineering", "Finance", "Human Resources", "Legal", "Marketing", "Operations", "Sales"));

        DatePicker startDate = new DatePicker("Employment start date");

        RadioButtonGroup<String> employmentType = new RadioButtonGroup<>("Employment type");
        employmentType.setItems("Full-time", "Part-time", "Contractor");
        employmentType.addThemeVariants(RadioGroupVariant.AURA_HORIZONTAL);

        FormLayout form = new FormLayout();
        form.setAutoResponsive(true);
        form.setExpandColumns(true);
        form.setExpandFields(true);
        form.add(heading, 3);                              // spans all 3 columns
        form.addFormRow(firstName, middleName, lastName);    // 3 equal columns
        form.addFormRow(jobTitle, department);               // 2 equal columns
        form.addFormRow(startDate, employmentType);          // 2 equal columns

        return form;
    }

    private FormLayout createAddressSection() {
        H4 heading = new H4("Address");

        TextField street = new TextField("Street");
        TextField number = new TextField("Number");
        TextField city = new TextField("City");
        TextField area = new TextField("Area");
        TextField postcode = new TextField("Postcode");

        FormLayout form = new FormLayout();
        form.setAutoResponsive(true);
        form.setExpandColumns(true);
        form.setExpandFields(true);
        form.add(heading, 3);                   // spans all 3 columns
        FormRow addressRow = new FormRow();
        addressRow.add(street, 2);              // Street takes 2 of 3 columns
        addressRow.add(number, 1);              // Number takes 1 of 3 columns
        form.add(addressRow);
        form.addFormRow(city, area, postcode);  // 3 equal columns

        return form;
    }

    private FormLayout createContactSection() {
        H4 heading = new H4("Contact details");

        TextField primaryPhone = new TextField("Primary phone");
        primaryPhone.getElement().executeJs("this._setType('tel')");
        primaryPhone.setHelperText("Include country code — e.g. +49 89 123 456");

        TextField secondaryPhone = new TextField("Secondary phone");
        secondaryPhone.getElement().executeJs("this._setType('tel')");
        secondaryPhone.setHelperText("Include country code — e.g. +49 170 123 456");

        EmailField email = new EmailField("Email address");

        FormLayout form = new FormLayout();
        form.setAutoResponsive(true);
        form.setExpandColumns(true);
        form.setExpandFields(true);
        form.add(heading, 3);                        // spans all 3 columns
        form.addFormRow(primaryPhone, secondaryPhone);  // 2 equal columns
        form.add(email, 2);                             // spans 2 of 3 columns

        return form;
    }
}
```

---

## APIs used in this example

Fetch up-to-date API docs with `mcp_vaadin_get_component_java_api` before writing code.

| API | Purpose |
|---|---|
| `FormLayout` · `setAutoResponsive` · `setExpandColumns` · `setExpandFields` · `addFormRow(a, b, c)` | Three-column auto-responsive grid; column count is inferred from the widest `addFormRow` call |
| `FormRow` · `add(field, colspan)` · `form.add(row)` | Explicit colspan within the grid — e.g. street (2 cols) + number (1 col) |
| `form.add(field, n)` | Span a single field across n columns without a `FormRow` |
| `VerticalLayout` · `setSpacing` | Stack sections with generous gap between them |
| `RadioButtonGroup` · `addThemeVariants(RadioGroupVariant.AURA_HORIZONTAL)` | Horizontal radio buttons |
| `DatePicker` | Date input matched to data type |
| `EmailField` | Semantic email input |
| `TextField` · `getElement().executeJs("this._setType('tel')")` · `setHelperText` | Phone input (no dedicated Vaadin component; JS type override + helper text for format guidance) |
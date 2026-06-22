# Horizontal two-panel form

Two-section entity form (Basic details + Address) where each section is an independent `FormLayout` placed side-by-side inside a wrapping `HorizontalLayout`. Each panel uses a 2-column grid.

## Design principles demonstrated

* Group related fields into clear sections
* Use a logical left-to-right, top-to-bottom flow
* Place labels above inputs
* Keep labels visible; do not rely on placeholders
* Align fields consistently
* Use consistent spacing and field sizing
* Use columns to reduce scrolling when appropriate
* Match input type to data type
* Use radio buttons for small exclusive choices
* Use dropdowns for longer predefined choices
* Preselect sensible defaults
* Visually distinguish editable, read-only, and disabled fields
* Place related fields on the same row when helpful
* Order fields according to user expectations
* Use progressive disclosure for conditional fields

## Implementation

```java
public class HorizontalSectionsFormExample extends HorizontalLayout {

    private FormLayout form1;
    private FormLayout form2;

    public HorizontalSectionsFormExample() {
        this.setSpacing("var(--vaadin-gap-xl)");
        this.setWrap(true);
        add(createBasicDetailsSection(), createAddressSection());
        this.setFlexGrow(1, form1, form2);
        this.setFlexShrink(1, form1, form2);
        form1.getElement().getStyle().set("flex-basis", "0");
        form1.setMaxWidth("36em");
        form1.setMinWidth("24em");
        form2.getElement().getStyle().set("flex-basis", "0");
        form2.setMaxWidth("36em");
        form2.setMinWidth("24em");
    }

    private FormLayout createBasicDetailsSection() {
        H4 heading = new H4("Basic details");

        TextField vehicleId = new TextField("Vehicle ID");
        vehicleId.setValue("VH-46521231");
        vehicleId.setReadOnly(true);

        TextField licensePlate = new TextField("License plate");
        licensePlate.setValue("AB-234-CD");
        licensePlate.setReadOnly(true);

        TextField alias = new TextField("Alias");

        ComboBox<String> vehicleType = new ComboBox<>("Vehicle type");
        vehicleType.setItems("Car", "Van", "Truck", "Motorcycle");
        vehicleType.setValue("Car");

        RadioButtonGroup<String> ownershipType = new RadioButtonGroup<>("Ownership type");
        ownershipType.setItems("Owned", "Leased", "Rented");
        ownershipType.setValue("Owned");
        ownershipType.addThemeVariants(RadioGroupVariant.AURA_HORIZONTAL);

        RadioButtonGroup<String> isPoolVehicle = new RadioButtonGroup<>("Pool vehicle");
        isPoolVehicle.setItems("Pool vehicle", "Assigned vehicle");
        isPoolVehicle.setValue("Pool vehicle");
        isPoolVehicle.addThemeVariants(RadioGroupVariant.AURA_HORIZONTAL);

        TextField parentFleetGroup = new TextField("Parent fleet group");

        TextArea notes = new TextArea("Notes");

        form1 = new FormLayout();
        form1.setAutoResponsive(true);
        form1.setExpandColumns(true);
        form1.setExpandFields(true);
        form1.add(heading, 2);
        form1.addFormRow(vehicleId, licensePlate);
        form1.add(alias, 2);
        form1.add(vehicleType, 2);
        form1.add(ownershipType, 2);
        form1.add(isPoolVehicle, 2);
        form1.add(parentFleetGroup, 2);
        form1.add(notes, 2);

        return form1;
    }

    private FormLayout createAddressSection() {
        H4 heading = new H4("Address");

        TextField street = new TextField("Street");
        TextField number = new TextField("Number");
        number.setWidth("6em");

        HorizontalLayout streetNumberRow = new HorizontalLayout(street, number);
        streetNumberRow.expand(street);

        TextField zipCode = new TextField("Zip code");
        zipCode.setHelperText("e.g. 80331");
        TextField city = new TextField("City");

        ComboBox<String> country = new ComboBox<>("Country");
        country.setItems("Australia", "Canada", "Germany", "United States", "United Kingdom");

        NumberField latitude = new NumberField("Latitude");
        latitude.setHelperText("Decimal degrees — e.g. 48.1374");
        NumberField longitude = new NumberField("Longitude");
        longitude.setHelperText("Decimal degrees — e.g. 11.5755");

        form2 = new FormLayout();
        form2.setAutoResponsive(true);
        form2.setExpandColumns(true);
        form2.setExpandFields(true);
        form2.add(heading);
        form2.add(streetNumberRow, 2);
        form2.addFormRow(zipCode, city);
        form2.add(country, 2);
        form2.addFormRow(latitude, longitude);

        return form2;
    }
}
```

---

## APIs used in this example

Fetch up-to-date API docs with `mcp_vaadin_get_component_java_api` before writing code.

| API | Purpose |
|---|---|
| `FormLayout` · `setAutoResponsive` · `setExpandColumns` · `setExpandFields` · `addFormRow` | Two-column auto-responsive grid |
| `HorizontalLayout` · `setWrap` · `setFlexGrow` · `setFlexShrink` · `getElement().getStyle().set("flex-basis", "0")` | Side-by-side panels that wrap and grow equally |
| `HorizontalLayout` · `expand` | Asymmetric field row where one field grows and the other stays fixed-width |
| `TextField` · `setReadOnly` · `setValue` | Pre-filled, non-editable display fields |
| `RadioButtonGroup` · `addThemeVariants(RadioGroupVariant.AURA_HORIZONTAL)` | Horizontal radio buttons |
| `ComboBox` · `setValue` | Dropdown with a preselected default |
| `NumberField` | Numeric input (coordinates, measurements) |
| `TextArea` | Multi-line free text |
| `setHelperText` | Formatting guidance below a field |
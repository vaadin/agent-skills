# Form Patterns Reference

## Built-in Validators

| Validator | Type | Purpose |
|-----------|------|---------|
| `StringLengthValidator` | String | Min/max length |
| `EmailValidator` | String | Email format |
| `RegexpValidator` | String | Regex pattern match |
| `IntegerRangeValidator` | Integer | Min/max range |
| `LongRangeValidator` | Long | Min/max range |
| `DoubleRangeValidator` | Double | Min/max range |
| `FloatRangeValidator` | Float | Min/max range |
| `BigDecimalRangeValidator` | BigDecimal | Min/max range |
| `BigIntegerRangeValidator` | BigInteger | Min/max range |
| `ByteRangeValidator` | Byte | Min/max range |
| `ShortRangeValidator` | Short | Min/max range |
| `DateRangeValidator` | LocalDate | Min/max date |
| `DateTimeRangeValidator` | LocalDateTime | Min/max datetime |
| `RangeValidator` | Comparable | Generic range with custom Comparator |

## Built-in Converters

| Converter | From → To |
|-----------|-----------|
| `StringToIntegerConverter` | String → Integer |
| `StringToLongConverter` | String → Long |
| `StringToDoubleConverter` | String → Double |
| `StringToFloatConverter` | String → Float |
| `StringToBigDecimalConverter` | String → BigDecimal |
| `StringToBigIntegerConverter` | String → BigInteger |
| `StringToBooleanConverter` | String → Boolean |
| `DateToLongConverter` | Date → Long |
| `LocalDateToDateConverter` | LocalDate → Date |
| `LocalDateTimeToDateConverter` | LocalDateTime → Date |

## Binding Chain Order

```
binder.forField(field)
    .asRequired("Required")              // 1. required check
    .withValidator(validator1)            // 2. pre-conversion validation
    .withConverter(converter)             // 3. type conversion
    .withValidator(validator2)            // 4. post-conversion validation
    .bind(getter, setter);               // 5. property binding
```

Each step operates on the value type at that point in the chain. Before the converter, validators work on the field's type (e.g., String for TextField). After the converter, validators work on the model type.

## Complete Form Template

```java
public class PersonForm extends Composite<FormLayout> {

    private final TextField name = new TextField("Name");
    private final TextField email = new TextField("Email");
    private final DatePicker birthDate = new DatePicker("Birth Date");
    private final ComboBox<String> role = new ComboBox<>("Role");

    private final Binder<Person> binder = new Binder<>(Person.class);
    private final Div errorDisplay = new Div();

    public PersonForm() {
        role.setItems("Admin", "User", "Guest");

        configureBinding();
        configureLayout();
    }

    private void configureBinding() {
        binder.forField(name)
            .asRequired("Name is required")
            .withValidator(new StringLengthValidator("1-100 chars", 1, 100))
            .bind(Person::getName, Person::setName);

        binder.forField(email)
            .asRequired("Email is required")
            .withValidator(new EmailValidator("Invalid email"))
            .bind(Person::getEmail, Person::setEmail);

        binder.forField(birthDate)
            .asRequired("Birth date is required")
            .bind(Person::getBirthDate, Person::setBirthDate);

        binder.forField(role)
            .asRequired("Role is required")
            .bind(Person::getRole, Person::setRole);

        // Binder-level error display
        errorDisplay.addClassName(LumoUtility.TextColor.ERROR); // Lumo theme only; for Aura, use a custom CSS class
        binder.setStatusLabel(errorDisplay);
    }

    private void configureLayout() {
        FormLayout form = getContent();
        form.add(name, email, birthDate, role, errorDisplay);
        form.setResponsiveSteps(
            new ResponsiveStep("0", 1),
            new ResponsiveStep("500px", 2)
        );
        form.setColspan(errorDisplay, 2);
    }

    public void edit(Person person) {
        binder.readBean(person);
    }

    public boolean save(Person person) {
        return binder.writeBeanIfValid(person);
    }
}
```

## Cross-Field Validation Template

```java
// Date range validation
binder.withValidator((bean, ctx) -> {
    if (bean.getStart() != null && bean.getEnd() != null
            && bean.getStart().isAfter(bean.getEnd())) {
        return ValidationResult.error("Start must be before end");
    }
    return ValidationResult.ok();
});

// Password confirmation
binder.withValidator((bean, ctx) -> {
    if (!Objects.equals(bean.getPassword(), bean.getConfirmPassword())) {
        return ValidationResult.error("Passwords don't match");
    }
    return ValidationResult.ok();
});
```

## BeanValidationBinder with Jakarta Annotations

```java
public class Person {
    @NotEmpty(message = "Name is required")
    @Size(min = 1, max = 100)
    private String name;

    @Email(message = "Invalid email")
    @NotEmpty
    private String email;

    @Min(value = 0, message = "Age must be positive")
    @Max(value = 150)
    private int age;
}

// Binder picks up annotations automatically
BeanValidationBinder<Person> binder = new BeanValidationBinder<>(Person.class);
binder.bindInstanceFields(formView);  // matches field names to properties
```

## Buffered vs Write-Through Decision

| Scenario | Mode | Why |
|----------|------|-----|
| Form with Save/Cancel buttons | Buffered (`readBean`/`writeBeanIfValid`) | User can discard changes |
| Settings panel | Write-through (`setBean`) | Changes apply immediately |
| Search filters | Write-through | Filtering should update live |
| Multi-step wizard | Buffered | Validate each step before advancing |
| Inline editing in Grid | Buffered | Save/cancel per row |

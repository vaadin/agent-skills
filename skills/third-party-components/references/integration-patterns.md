# Third-Party Component Integration Patterns Reference

## Decision Matrix

| npm package exports... | Java base class | Client-side file needed? | State sync |
|------------------------|----------------|--------------------------|------------|
| Custom element (`customElements.define()`) | `Component` | No | `@Synchronize`, `@DomEvent`, Element API |
| Custom element + needs Binder | `AbstractSinglePropertyField` | No | Built-in value sync + `@Synchronize` |
| React components only | `ReactAdapterComponent` | Yes (`.tsx`) | `setState`/`getState` + `hooks.useState` |
| React component + needs Binder | `AbstractSinglePropertyField` | Yes (`.tsx`) | `value-changed` CustomEvent |

## Web Component Skeleton

```java
@Tag("my-component")
@NpmPackage(value = "my-component", version = "1.0.0")
@JsModule("my-component/my-component.js")
public class MyComponent extends Component {

    // --- Properties ---

    public void setLabel(String label) {
        getElement().setProperty("label", label);
    }

    public String getLabel() {
        return getElement().getProperty("label", "");
    }

    // --- Events ---

    @DomEvent("my-event")
    public static class MyEvent extends ComponentEvent<MyComponent> {
        private final String detail;

        public MyEvent(MyComponent source, boolean fromClient,
                @EventData("event.detail") String detail) {
            super(source, fromClient);
            this.detail = detail;
        }

        public String getDetail() {
            return detail;
        }
    }

    public Registration addMyEventListener(
            ComponentEventListener<MyEvent> listener) {
        return addListener(MyEvent.class, listener);
    }

    // --- JS function calls ---

    public void open() {
        getElement().callJsFunction("open");
    }
}
```

## Web Component Field Skeleton (Binder-Compatible)

```java
@Tag("my-field")
@NpmPackage(value = "my-field", version = "1.0.0")
@JsModule("my-field/my-field.js")
public class MyField extends AbstractSinglePropertyField<MyField, String> {

    public MyField() {
        super("value", "", false);  // property name, default, nullable
    }

    @Synchronize("change")  // DOM event triggering value sync
    @Override
    public String getValue() {
        return super.getValue();
    }
}
```

## PropertyDescriptor Pattern

```java
public class MyComponent extends Component {

    private static final PropertyDescriptor<Boolean, Boolean> disabledProperty =
            PropertyDescriptors.propertyWithDefault("disabled", false);

    private static final PropertyDescriptor<String, String> labelProperty =
            PropertyDescriptors.propertyWithDefault("label", "");

    private static final PropertyDescriptor<Integer, Integer> maxProperty =
            PropertyDescriptors.propertyWithDefault("max", 100);

    public void setDisabled(boolean disabled) { disabledProperty.set(this, disabled); }
    public boolean isDisabled() { return disabledProperty.get(this); }

    public void setLabel(String label) { labelProperty.set(this, label); }
    public String getLabel() { return labelProperty.get(this); }

    public void setMax(int max) { maxProperty.set(this, max); }
    public int getMax() { return maxProperty.get(this); }
}
```

## @DomEvent Event Class Template

```java
@DomEvent("event-name")
public static class MyEvent extends ComponentEvent<MyComponent> {

    private final String value;
    private final int index;

    public MyEvent(MyComponent source, boolean fromClient,
            @EventData("event.detail.value") String value,
            @EventData("event.detail.index") int index) {
        super(source, fromClient);
        this.value = value;
        this.index = index;
    }

    public String getValue() { return value; }
    public int getIndex() { return index; }
}

// In the component:
public Registration addMyEventListener(
        ComponentEventListener<MyEvent> listener) {
    return addListener(MyEvent.class, listener);
}
```

## React Adapter Skeleton

**Java:**

```java
@NpmPackage(value = "react-fancy", version = "1.0.0")
@JsModule("./components/fancy-adapter.tsx")
@Tag("fancy-adapter")
public class FancyComponent extends ReactAdapterComponent {

    public FancyComponent() {
        setState("value", "");  // always initialize state
    }

    public String getValue() {
        return getState("value", String.class);
    }

    public void setValue(String value) {
        setState("value", value);
    }

    public void addValueChangeListener(SerializableConsumer<String> listener) {
        addStateChangeListener("value", String.class, listener);
    }
}
```

**TypeScript (`src/main/frontend/components/fancy-adapter.tsx`):**

```tsx
import { ReactAdapterElement, type RenderHooks } from 'Frontend/generated/flow/ReactAdapter';
import { FancyInput } from 'react-fancy';
import type { ReactElement } from 'react';

class FancyAdapterElement extends ReactAdapterElement {
    protected override render(hooks: RenderHooks): ReactElement | null {
        const [value, setValue] = hooks.useState<string>('value');

        return <FancyInput value={value ?? ''} onChange={setValue} />;
    }
}

customElements.define('fancy-adapter', FancyAdapterElement);
```

## React Field Skeleton (Binder-Compatible)

**Java:**

```java
@Tag("react-field")
@JsModule("./components/react-field.tsx")
public class ReactField extends AbstractSinglePropertyField<ReactField, String> {

    public ReactField() {
        super("value", "", false);
    }
}
```

**TypeScript (`src/main/frontend/components/react-field.tsx`):**

```tsx
import { ReactAdapterElement, type RenderHooks } from 'Frontend/generated/flow/ReactAdapter';
import type { ReactElement } from 'react';

class ReactFieldElement extends ReactAdapterElement {
    protected override render(hooks: RenderHooks): ReactElement | null {
        const [value, setValue] = hooks.useState<string>('value');

        const handleChange = (newValue: string) => {
            setValue(newValue);
            this.dispatchEvent(new CustomEvent('value-changed', {
                detail: { value: newValue }
            }));
        };

        return <input value={value ?? ''} onChange={e => handleChange(e.target.value)} />;
    }
}

customElements.define('react-field', ReactFieldElement);
```

## File Location Reference

| File type | Location | Referenced by |
|-----------|----------|---------------|
| Java component class | `src/main/java/com/example/components/` | — |
| `.tsx` adapter (React path) | `src/main/frontend/components/` | `@JsModule("./components/my-adapter.tsx")` |
| npm module JS (Web Component path) | `node_modules/` (auto-installed) | `@JsModule("package-name/file.js")` |
| Java record/bean for state | `src/main/java/com/example/model/` | Used in `setState`/`getState` |
| TypeScript interface for state | Inside the `.tsx` adapter file | Matches Java record fields |

# Beyond the Browser: Gestures, Add-ons, and the Browser Layer

The built-in locators simulate the user on Vaadin's own components. Add-ons and your own components usually come without one, and some interactions can't be simulated without a browser at all. These patterns keep such stories readable and honest about what they skip.

## Gestures: give them a Java API

Drag and drop, drawing on a canvas, and clicking a map are sequences of browser events, and there is no browser. Firing synthetic DOM events at the component's inner elements makes a test that breaks on every layout change and describes the implementation instead of the behaviour.

Instead, design the component so that the user's intent is a public Java method, and route every way of doing it through that one method:

```text
 drop listener ──────────┐
 context menu item ──────┤
 keyboard shortcut ──────┼──►  moveItem(itemId, laneId)  ──►  update the model, render
 page object (tests) ────┘
```

```java
public class LanePlanner extends Composite<Div> {

    /** Moves an item to a lane: the user's intent, whatever the gesture. */
    public void moveItem(String itemId, String laneId) { ... }

    /** Which lane holds the item. */
    public String laneOf(String itemId) { ... }

    // Each input path is a thin wrapper around moveItem:
    //   drop listener on a lane   -> moveItem(draggedId, laneId)
    //   context menu "Move to"    -> moveItem(itemId, laneId)
}
```

The page object calls the same method, so the story still reads as the use case:

```java
// Page object
void moveToLane(String item, String lane) {
    window.find(LanePlanner.class).single().moveItem(item, lane);
}

// Story
organiser.movesClassToLane("H21E", "STA1-2");
assertEquals("STA1-2", organiser.laneOf("H21E"));
```

Why this way:

- **Stable**: the rendering can change freely; the method is the contract the tests rely on.
- **Covered**: an input path added later, such as a keyboard shortcut, calls the same method, so the existing tests cover the logic behind it.
- **Accessible**: a context menu or keyboard alternative to a gesture helps keyboard and touch users, and gives a path the test could take through standard components.

What the test skips is the gesture itself: that a drop on a lane calls `moveItem` with the right arguments. One real-browser test covers that wiring; the rules behind every move belong to the fast tests.

When you write such a component, document the methods tests may rely on, for example under a "Tester API" heading in its Javadoc.

## Value components without a locator: the `setValue()` trap

For an add-on or your own component, the component's own Java API is usually good enough in a page object, and much cheaper than writing a tester for each. Reading state is always fine. Setting a value is the exception:

```java
// Looks like the user picked a location. It isn't.
window.find(PointField.class).withLabel("Location").single().setValue(point);
window.findButton().withText("Save").click();
// ✗ IllegalStateException: Save "is not usable because it is not enabled"
```

`setValue()` from the server is not a user action: the value change event reports `isFromClient() == false`, and a form that enables Save only after user edits ignores it. Write a small locator in the test sources that sets the value as the user would. `setValueAsUser(...)` is protected on `ComponentTester`, so reach it through a subclass:

```java
import com.vaadin.browserless.ComponentTester;
import com.vaadin.browserless.locator.HasLabelFilter;
import com.vaadin.browserless.locator.Locator;

/** Locator for the map add-on's PointField: sets a location as the user would. */
public class PointFieldLocator extends Locator<PointField, PointFieldLocator>
        implements HasLabelFilter<PointField, PointFieldLocator> {

    public PointFieldLocator() {
        super(PointField.class);
    }

    /**
     * Sets the location as if the user had dropped the pin on the map.
     * Doesn't verify that picking on the map works: that's the add-on's job.
     */
    public void dropPin(Point location) {
        new UserInput(component()).enter(location);
    }

    private static class UserInput extends ComponentTester<PointField> {

        UserInput(PointField field) {
            super(field);
        }

        void enter(Point value) {
            ensureComponentIsUsable();
            setValueAsUser(value);
        }
    }
}
```

The page object uses it like a built-in locator:

```java
void pickLocation(Point point) {
    window.find(PointFieldLocator::new).withLabel("Location").dropPin(point);
}
```

`HasLabelFilter` adds `withLabel(...)` to a locator whose component has a label; `HasTextFilter`, `HasValueFilter`, and the other `Has*Filter` mixins in `com.vaadin.browserless.locator` work the same way.

## Composite locators

A composite used on many views, such as a person form, can get a locator that acts at the level of the form. Scope its inner lookups with `inside(this)` so they only match inside the resolved composite:

```java
public class PersonFormLocator extends Locator<PersonForm, PersonFormLocator> {

    public PersonFormLocator() {
        super(PersonForm.class);
    }

    public PersonFormLocator fillIn(String name, String email) {
        new TextFieldLocator().withLabel("Name").inside(this).setValue(name);
        new EmailFieldLocator().withLabel("Email").inside(this).setValue(email);
        return this;
    }

    public void submit() {
        new ButtonLocator().withText("Submit").inside(this).click();
    }
}
```

A full custom `ComponentTester`, registered with `withComponentTesterPackages(...)`, is the heavier option: worth it for a component shipped as an add-on or used across many test suites. Search the docs for "Test a Custom Component" for both.

## Know what you skip

Every shortcut above leaves part of the real interaction untested: the gesture, the map click, the add-on's own rendering. That's a fine trade, as long as it's a conscious one:

- Say in the test's or page object's Javadoc what the shortcut skips.
- Make sure that part is covered elsewhere: in the add-on's or component's own tests, or in one real-browser test.
- Mention it to the user when you report the tests you wrote.

## The thin browser layer

Browserless tests can replace most TestBench, Selenium, or Playwright tests. Keep a few real-browser smoke tests for what only a browser can tell, and as a safety net for Vaadin and add-on upgrades:

- The most important views open.
- Custom components and add-ons render.
- The browser console has no JavaScript errors.
- The gesture wiring that browserless tests skip works, once per kind of gesture.

Don't repeat the use cases there: the rules behind them belong to the fast browserless tests. A component with its own client-side code needs real-browser tests of that code, in its own module.

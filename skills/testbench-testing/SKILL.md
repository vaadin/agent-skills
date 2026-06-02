---
name: testbench-testing
description: >
  Guide Claude on writing end-to-end browser tests with Vaadin TestBench in Vaadin 25.
  This skill should be used when the user asks to "write an end-to-end test",
  "write a browser test", "use TestBench", "create a page object",
  "test in a real browser", "integration test a Vaadin app",
  "visual regression test", "cross-browser test", or needs help with
  TestBench Element API, ElementQuery, page objects, or TestBenchTestCase.
version: 0.1.0
---

# End-to-End Browser Testing with Vaadin TestBench

Use the Vaadin MCP tools (`search_vaadin_docs`) to look up the latest documentation whenever uncertain about a specific API detail. Always set `vaadin_version` to `"25"` and `ui_language` to `"java"`.

**Note:** TestBench requires a commercial Vaadin subscription.

## What TestBench Is

TestBench runs your Vaadin application in a real browser (Chrome, Firefox, etc.) and lets you write Java tests that interact with it like a user would. It's built on Selenium but provides a high-level API specifically designed for Vaadin components.

## When to Use TestBench (vs. UI Unit Tests)

Use end-to-end TestBench tests for:
- **Critical user paths** — login, checkout, payment flows
- **Client-side behavior** — JavaScript functionality, custom web components
- **Visual regression** — screenshot comparison to catch unintended UI changes
- **Cross-browser testing** — verify behavior across Chrome, Firefox, Safari
- **Integration with external systems** — SSO, OAuth flows

For everything else, prefer UI unit tests (see the `ui-unit-testing` skill) — they're faster and less flaky.

## Core Concepts

### Elements

An `Element` class represents a DOM element — either a built-in HTML element (`<div>`, `<span>`) or a Vaadin web component (`<vaadin-button>`, `<vaadin-grid>`). Elements provide component-specific methods for interaction.

Every Vaadin component has a corresponding Element class: `ButtonElement`, `TextFieldElement`, `GridElement`, `ComboBoxElement`, etc.

### ElementQuery

`ElementQuery` finds elements on the page. Use the `$()` method:

```java
// Find by type
ButtonElement button = $(ButtonElement.class).first();

// Find by ID
TextFieldElement name = $(TextFieldElement.class).id("name");

// Find all buttons
List<ButtonElement> buttons = $(ButtonElement.class).all();

// Wait for element to appear
ButtonElement btn = $(ButtonElement.class).waitForFirst();

// Find by attribute
$(DivElement.class).attribute("class", "active").first();

// Nested query — find inside another element
VerticalLayoutElement layout = $(VerticalLayoutElement.class).id("content");
ButtonElement innerBtn = layout.$(ButtonElement.class).first();
```

Key methods on ElementQuery:
- `id("id")` — find by id (returns single element)
- `first()` — first match
- `last()` — last match
- `get(n)` — nth match
- `all()` — all matches as list
- `exists()` — boolean check
- `waitForFirst()` — waits until a match appears
- `attribute("name", "value")` — filter by attribute

## Writing Tests

### Basic test (JUnit 5)

```java
public class LoginTest extends BrowserTestBase {

    @BrowserTest
    public void loginWithValidCredentials() {
        $(TextFieldElement.class).id("username").setValue("admin");
        $(PasswordFieldElement.class).id("password").setValue("secret");
        $(ButtonElement.class).id("login").click();

        // Verify navigation to dashboard
        assertTrue($(DivElement.class).id("dashboard").exists());
    }
}
```

### JUnit 4 test

```java
public class LoginTest extends TestBenchTestCase {

    @Before
    public void setup() throws Exception {
        setDriver(new ChromeDriver());
        getDriver().get("http://localhost:8080");
    }

    @Test
    public void loginWithValidCredentials() {
        $(TextFieldElement.class).id("username").setValue("admin");
        $(PasswordFieldElement.class).id("password").setValue("secret");
        $(ButtonElement.class).id("login").click();

        assertTrue($(DivElement.class).id("dashboard").exists());
    }

    @After
    public void teardown() {
        getDriver().quit();
    }
}
```

## Page Objects

Page objects encapsulate interaction with a specific view or component, keeping test methods clean and maintainable. If the UI changes, only the page object needs updating — not every test.

### Creating a page object

A page object extends `TestBenchElement` and uses `@Element("tag-name")`:

```java
@Element("div")
@Attribute(name = "class", contains = "login-view")
public class LoginViewElement extends TestBenchElement {

    public void login(String username, String password) {
        $(TextFieldElement.class).id("username").setValue(username);
        $(PasswordFieldElement.class).id("password").setValue(password);
        $(ButtonElement.class).id("login").click();
    }

    public boolean isLoginFailed() {
        return $(DivElement.class).attribute("class", "error").exists();
    }
}
```

### Using the page object in tests

```java
@BrowserTest
public void loginSuccess() {
    LoginViewElement loginView = $(LoginViewElement.class).waitForFirst();
    loginView.login("admin", "secret");

    assertTrue($(DashboardViewElement.class).exists());
}

@BrowserTest
public void loginFailure() {
    LoginViewElement loginView = $(LoginViewElement.class).waitForFirst();
    loginView.login("admin", "wrong");

    assertTrue(loginView.isLoginFailed());
}
```

### Matching strategies

Use `@Attribute` to match page objects to DOM elements:

```java
// Match by class attribute (contains for multi-value attributes)
@Element("div")
@Attribute(name = "class", contains = "my-view")

// Auto-match by simple class name (removes Element/PageObject suffix)
@Element("div")
@Attribute(name = "class", contains = Attribute.SIMPLE_CLASS_NAME)
```

## Working with Complex Components

### Grid

```java
GridElement grid = $(GridElement.class).first();

// Get row count
int rowCount = grid.getRowCount();

// Get cell content
String name = grid.getCell(0, 0).getText();

// Click a row
grid.getRow(0).click();

// Scroll to a row
grid.scrollToRow(50);
```

### ComboBox

```java
ComboBoxElement combo = $(ComboBoxElement.class).id("country");
combo.openPopup();
combo.selectByText("Finland");
```

### Dialog

```java
// Dialogs overlay the main content
DialogElement dialog = $(DialogElement.class).waitForFirst();
dialog.$(ButtonElement.class).id("confirm").click();
```

## Best Practices

1. **Use Page Objects for all but the simplest tests** — they make tests readable and maintainable. Your test methods should read like a user story.
2. **Use `waitForFirst()` instead of `first()`** — when elements might not be immediately present (after navigation, async loading).
3. **Assign IDs to key components** — `component.setId("login-button")` makes them easy to find in tests. Prefer IDs over positional queries.
4. **Keep end-to-end tests focused on critical paths** — use UI unit tests for comprehensive coverage. End-to-end tests should verify the journey, not every edge case.
5. **Run tests in CI with headless browsers** — Chrome headless is the most reliable option.
6. **Don't sleep, wait** — use `waitForFirst()` or `waitUntil()` instead of `Thread.sleep()`. Explicit waits are more reliable and faster.
7. **Test one user journey per test method** — end-to-end tests are expensive. Make each test cover a meaningful scenario, but keep them independent.

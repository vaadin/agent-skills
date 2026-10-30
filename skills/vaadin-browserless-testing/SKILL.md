---
name: vaadin-browserless-testing
description: >
  Writes browserless tests for Vaadin Flow (Java) applications: tests that verify
  use cases end to end inside the JVM, without a browser or a server, written so
  that a human can read the use case straight from the test code. Use when asked
  to test a Vaadin view, form, navigation, or user story; to add UI, integration,
  or acceptance tests to a Vaadin app; to verify a UI change you or another agent
  made; to migrate from TestBench UI unit tests or Karibu-Testing; or when the
  user mentions browserless-test, BrowserlessTest, SpringBrowserlessTest,
  BrowserlessApplicationContext, or locators such as findButton(). Not for
  real-browser tests of themes, CSS, or client-side JavaScript.
---

# Vaadin Browserless Use-Case Tests

Browserless tests run a Vaadin Flow UI inside the test JVM: no browser and no HTTP server, but real views, real listeners, navigation, and real Spring or Quarkus beans (or mocks). A test runs in milliseconds and gives the same result every time, so it is the feedback loop to run after every UI change. They sit between unit tests of services and real-browser tests, and they are the layer that proves the use cases work.

The API this skill uses — application, user, and window contexts with locators — arrived in Vaadin 25.2, after most training data. Check the project's Vaadin version first. Before writing a call you are not sure of, look it up with the Vaadin MCP: `get_java_symbol` for `BrowserlessUIContext` or a `*Locator` class, and `search_vaadin_docs` for the guides, with `vaadin_version` set to the project's version.

## The rule: a test reads as its use case

Base every test on a use case: who does what, and what should happen. Write it so that someone who has never seen the code — a product owner, a new team member — can read the test method aloud and recognise the use case. The tests then double as the specification.

```java
@Test
void boaterWhoLosesTheRaceBooksAnotherBerth() {
    Boater alice = new Boater("S/Y Alice");
    Boater bob = new Boater("S/Y Bob");

    alice.books("B12");
    bob.books("B12");
    assertTrue(bob.wasToldThat("B12 was just taken"));

    bob.books("B11");
    assertEquals("S/Y Bob", harbour.boatIn("B11"));
}
```

The how lives below the story, written once and reused by every test:

| Layer | Knows | Example |
|---|---|---|
| Test method | The use case: who does what, and the expected outcome | `bob.books("B12")` |
| Actor | What a user in a role does, in the domain's verbs; one per person in the story, each in their own window | `Boater.books(berth)` |
| Page object | Where things are on one view: the locators | `BookingPage.clickBook(berth)` runs `window.findButton().withText("Book " + berth).click()` |

How to write them:

- **Name the test after the use case and its outcome**, in the domain's words: `customerCanPlaceAnOrder`, `boaterWhoLosesTheRaceBooksAnotherBerth`. Not `testSaveButton` or `clickBook_showsNotification`.
- **Keep UI mechanics out of the test method.** Locators, component classes, and `window` calls belong in page objects. A short single-view story whose locator calls already read as user steps may stay inline; extract a page object as soon as a second test needs the same steps or the method stops reading as the story.
- **Find things the way the user does**: by field label, button text, the text on screen, or the accessible name. Not by IDs, CSS class names, or the view's package-private fields. When a control has no visible text, such as an icon-only button, give it an accessible name with `setAriaLabel(...)` — screen readers need it too — and find it with `withAriaLabel(...)`. Only when nothing the user perceives tells two components apart, mark them with `setTestId(...)` and find them with `withTestId(...)`.
- **Assert outcomes the user or the business cares about**: what the user is told or sees (a notification, the rows in a grid, the view they land on) and the resulting state in the backend (`harbour.boatIn("B11")`). Phrase checks of the UI as questions to the actor: `bob.wasToldThat(...)`.
- **One use case per test.** Give the alternative and failure paths that matter their own tests — the berth that was taken, the invalid input, the user without permission — not only the happy path.
- **Give every person in the story their own user and window.** Races, sharing, and collaboration are use cases too: one actor per person, each with `app.newUser().newWindow()`.
- **State the starting situation in domain terms** — `harbour.clear()`, `givenFreeBerths("B11", "B12")` — in `@BeforeEach` or a named helper, never as a block of setup locators.

[references/story-tests.md](references/story-tests.md) has the complete example: the use case list, the test class for Spring Boot and plain Java, the actor, the page object, secured users, and testing a reusable component.

## Workflow

Track these steps as TODOs.

1. **Collect the use cases.** Take them from the user's request, from issues, user stories, or specs in the repository, or infer them from the view under test. For each, note the actor, the goal, the main path, and the alternative and failure paths that matter. If you inferred the list, show it to the user before writing tests: it is the specification.
2. **Write the stories first.** One test method per use case, named after it, with a body in actor verbs as if the actors and page objects already existed.
3. **Implement the actors and page objects** with locators. Reuse an existing page object for a view before writing a new one.
4. **Set up the test class** if the project has none (see Setup).
5. **Run the tests yourself**, for example `mvn test -Dtest=BerthBookingTest`, until they pass. A failure means either a bug in the UI or a wrong assumption in the story; decide which before changing anything. Never weaken the story to make a test pass.
6. **Report what the tests don't cover** (see Where browserless ends).

## Setup

- **Dependency**, `test` scope, version from the Vaadin BOM: `com.vaadin:browserless-test-spring` for Spring Boot, `com.vaadin:browserless-test-junit6` for plain Java, plus `com.vaadin:browserless-test-quarkus` for Quarkus. Read the setup guide for the project's framework with `search_vaadin_docs`.
- **Use the contexts API for every test**, also for one user in one window: one style for every story, no required superclass, and a second user can join the story later without a rewrite. Create a `BrowserlessApplicationContext` per test — `SpringBrowserlessApplicationContext.create(...)` with Spring, `BrowserlessApplicationContext.create(...)` in plain Java — and always close it, in `@AfterEach` or with try-with-resources.
- **Existing tests can stay.** Tests that extend `BrowserlessTest` or `SpringBrowserlessTest` and Karibu-Testing tests run side by side with new ones; write new tests in this style without rewriting the old. JUnit 4 TestBench UI unit tests (`vaadin-testbench-unit`) are the exception: they need a Maven module of their own, because their testers clash with browserless-test on one classpath.

## Where browserless ends

Browserless tests prove behaviour, not pixels. They can't show that the theme and CSS look right, that a component's client-side JavaScript works, how the layout responds in a real browser, or that an add-on renders. For those, recommend a thin layer of real-browser smoke tests (TestBench or Playwright): open the most important views, check that add-ons render, and that the browser console shows no errors. Don't write a browser test for anything a browserless test can prove.

Two traps with components that ship no locator, such as add-ons and your own components:

- **Gestures** — drag and drop, drawing on a canvas, clicking a map — can't be simulated. Don't fire synthetic DOM events. Give the component a public Java method for the user's intent, route every gesture (and a context menu or keyboard alternative) through it, and call that method from the page object.
- **`component.setValue(...)` is not a user action.** Its value change reports `isFromClient() == false`, so a form that tracks user edits ignores it and keeps Save disabled. Write a small custom locator that sets the value as the user would.

[references/beyond-the-browser.md](references/beyond-the-browser.md) shows both patterns in code. When a test takes such a shortcut, say in its Javadoc what it skips, and where that part is covered.

## Reading failures

A locator that finds nothing, or more than one match where one is expected, fails with the window's component tree in the message — the UI as text, as the user would have seen it:

```text
└── MockedUI[]
    └── OrderView[@theme='spacing padding']
        ├── ComboBox[label='Product', value='Coffee']
        ├── IntegerField[label='Amount', value='2']
        └── Button[DISABLED, caption='Order']
            └── Text[DISABLED, text='Order']
```

Read it before changing anything. Here a lookup of the confirmation notification failed, and the tree shows why: the Order button is still disabled, so the click never placed the order. An assertion that fails after a successful lookup shows no tree. `@ExtendWith(TreeOnFailureExtension.class)` on the test class publishes the tree as a JUnit report entry, which the IDE and the JUnit console launcher show but Maven Surefire doesn't.

## API notes

What models trained on older material get wrong:

- **Locators are the default**: `window.findTextField().withLabel("Boat").setValue("S/Y Alice")`. The tester form, `window.test(window.find(TextField.class).withLabel("Boat").single()).setValue(...)`, still works but reads worse.
- `$()` and `$view()` are deprecated for removal; use `find()` and `findInView()`. Find fields with `withLabel(...)`, not `withCaption(...)`.
- Components with typed items take the item type: `findGrid(Person.class)`, `findComboBox(Product.class).withLabel("Product").selectItem("Coffee")`.
- Filters exist only where the component supports them: `findButton().withLabel(...)` doesn't compile, because a button has text, not a label.
- `atIndex(n)` is one-based.
- Test classes that extend `BrowserlessTest`, `SpringBrowserlessTest`, or `QuarkusBrowserlessTest` get the `find<Component>()` locators only when they `implements Locators`.
- Before calling Vaadin APIs directly between window calls — `UI.getCurrent()`, a session-scoped bean — call `window.activate()`, so the thread-locals belong to that window's user.
- When one user's action updates a signal that another window shows, call `runPendingSignalsTasks()` on the observing window before asserting on it.
- Contexts are thread-affine: create, use, and close them on the test's own thread.

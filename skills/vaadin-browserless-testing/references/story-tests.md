# Story Tests: a Complete Example

A harbour lets boaters book berths. `BookingView` has a **Boat** field and one **Book B11**, **Book B12**, ... button per berth that was free when the view opened. A click books the berth and shows a notification: "B12 is yours", or "B12 was just taken" when someone else got there first. `BookingService` keeps the bookings.

## 1. The use cases

Written down before any test code. This list is the specification; each row becomes one test method with the same name.

| Use case | Actors | Outcome |
|---|---|---|
| `boaterBooksAFreeBerth` | One boater | Told "B12 is yours"; the harbour has the boat in B12 |
| `boaterWhoLosesTheRaceBooksAnotherBerth` | Two boaters, both with the view open | The second is told "B12 was just taken", then books B11 |
| `berthsAlreadyTakenAreNotOffered` | A boater who opens the view after B12 was booked | No button for B12; B11 is offered |

## 2. The test class: the stories

Spring Boot. The test method bodies use only actor verbs and domain checks; nothing in them says where anything is on the screen.

```java
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.vaadin.browserless.BrowserlessApplicationContext;
import com.vaadin.browserless.SpringBrowserlessApplicationContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;

@SpringBootTest
class BerthBookingTest {

    @Autowired
    ApplicationContext spring;
    @Autowired
    BookingService harbour;

    BrowserlessApplicationContext app;

    @BeforeEach
    void openAnEmptyHarbour() {
        harbour.clear();
        app = SpringBrowserlessApplicationContext.create(spring, BookingView.class);
    }

    @AfterEach
    void closeTheApp() {
        app.close();
    }

    @Test
    void boaterBooksAFreeBerth() {
        Boater alice = new Boater("S/Y Alice");

        alice.books("B12");

        assertTrue(alice.wasToldThat("B12 is yours"));
        assertEquals("S/Y Alice", harbour.boatIn("B12"));
    }

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

    @Test
    void berthsAlreadyTakenAreNotOffered() {
        new Boater("S/Y Alice").books("B12");

        Boater bob = new Boater("S/Y Bob");

        assertFalse(bob.isOffered("B12"));
        assertTrue(bob.isOffered("B11"));
    }

    /**
     * Actor: a boater in their own browser window. Knows what a boater
     * does; leaves where things are on the screen to {@link BookingPage}.
     */
    class Boater {

        private final BookingPage page = new BookingPage(app.newUser().newWindow());

        /** Opens the booking page and fills in the boat's name. */
        Boater(String boat) {
            page.open();
            page.enterBoat(boat);
        }

        void books(String berth) {
            page.clickBook(berth);
        }

        boolean wasToldThat(String message) {
            return message.equals(page.notification());
        }

        boolean isOffered(String berth) {
            return page.hasBookButtonFor(berth);
        }
    }
}
```

The actor is an inner class here so that it can reach `app`. When several test classes share an actor, make it a top-level class in the test sources that takes the `BrowserlessApplicationContext` (or a ready `BrowserlessUserContext`) in its constructor.

## 3. The page object: where things are

One per view, in the test sources, in the view's package. It is the only place that knows the labels, button texts, and component types of the view, so a change to the view's layout is fixed in one place.

```java
import com.vaadin.browserless.BrowserlessUIContext;

/** Where things are on {@link BookingView}. Used by every test that books berths. */
class BookingPage {

    private final BrowserlessUIContext window;

    BookingPage(BrowserlessUIContext window) {
        this.window = window;
    }

    void open() {
        window.navigate(BookingView.class);
    }

    void enterBoat(String boat) {
        window.findTextField().withLabel("Boat").setValue(boat);
    }

    void clickBook(String berth) {
        window.findButton().withText("Book " + berth).click();
    }

    boolean hasBookButtonFor(String berth) {
        return window.findButton().withText("Book " + berth).exists();
    }

    String notification() {
        return window.findNotification().getText();
    }
}
```

## Growing the layers

- **Page object methods** are named for what is on the page (`enterBoat`, `clickBook`, `notification`) and return what the user sees — strings, numbers, lists of row texts — never components. Then the story can't reach past them into the UI.
- **Actor methods** are the verbs and questions of the use case (`books`, `cancels`, `approves`; `wasToldThat`, `isOffered`). An actor whose story crosses views holds a page object per view, all over the same window.
- **When a story needs a step that doesn't exist yet**, add the verb to the actor first and the page object method under it. Don't add a locator to the test method "just this once".
- **A composite used on several views**, such as an address form, gets its own page object that the views' page objects reuse, or a custom locator; see [beyond-the-browser.md](beyond-the-browser.md).
- **A page reload or a second tab** is a new window of the same user: keep the actor's `BrowserlessUserContext` and call `newWindow()` again. Session state carries over; the UI state starts fresh.

```java
class Boater {
    private final BrowserlessUserContext user = app.newUser();
    private BookingPage page = new BookingPage(user.newWindow());

    // constructor and other verbs as before

    void reloadsThePage() {
        page = new BookingPage(user.newWindow());
        page.open();
    }
}
```

## Plain Java, without Spring

Only the setup differs. Without a dependency injection container, Vaadin creates views with their no-argument constructor, so the views must get their services some other way.

```java
@BeforeEach
void openTheApp() {
    app = BrowserlessApplicationContext.create(BookingView.class);
}
```

A single short test can create the context with try-with-resources instead of the `@BeforeEach`/`@AfterEach` pair:

```java
try (var app = BrowserlessApplicationContext.create(BookingView.class)) {
    // the story
}
```

`create(...)` takes classes whose packages contain the `@Route` views; passing classes rather than package names survives refactoring. Quarkus has `QuarkusBrowserlessApplicationContext.create(...)`; look up its test setup with `search_vaadin_docs`.

## Users with roles

With Spring Security, create a secured context and give each actor a user with the roles of their part in the story. `newUser()` without arguments is an anonymous visitor.

```java
SecuredBrowserlessApplicationContext<Authentication> app;

@BeforeEach
void openTheApp() {
    app = SpringBrowserlessApplicationContext.createSecured(spring, BookingView.class);
}

class Harbourmaster {
    private final HarbourAdminPage page =
            new HarbourAdminPage(app.newUser("hilda", "ADMIN").newWindow());
    // ...
}
```

The security context follows the window in use, so actors of different roles can take turns in one story. A use case like "a visitor who isn't logged in is sent to the login page" is a story too; the page object hides how the redirect shows up. Search the docs for "Test View Access Control" for the details, and for the Quarkus equivalent.

## Testing a reusable component

A form or composite used in many places deserves its own use-case tests, and so does a component in your own add-on or component module. Mount it without a route; its use cases are those of the people who fill it in.

```java
@Test
void personWithoutAnEmailCannotBeSaved() {
    try (var window = BrowserlessUIContext.forComponent(PersonForm::new)) {
        var form = new PersonFormPage(window);

        form.enterName("Ada Lovelace");

        assertFalse(form.canSave());
    }
}
```

Pass a factory (`PersonForm::new`) rather than an instance when the component's constructor needs `UI.getCurrent()` or the session. For the same component in several users' windows, use `BrowserlessApplicationContext.forComponent(...)`: every window gets its own instance.

# Ticket Triage: a Complete Example

A support desk triages tickets. `TicketsView` shows a searchable, filterable list of tickets next to an editor for the selected one. The behaviour that makes it worth a ViewModel:

- Search and the status filter narrow the list.
- Clicking a ticket opens it in the editor. Editing makes it *dirty*; **Save** is enabled only when the ticket is dirty and the title isn't blank, and a blank title shows an error on the field.
- Clicking another ticket while there are unsaved edits asks first. **Discard** opens the clicked ticket; **Keep editing** returns the list selection to the ticket being edited.
- Saving keeps the ticket open and selected, and updates its row in the list.
- Navigating away from the view with unsaved edits asks first, too.

All of this code compiles against Vaadin 25.3, and the tests pass.

## 1. The Model

A record, an enum, and a service.

```java
public enum Status {
    OPEN, IN_PROGRESS, RESOLVED
}
```

```java
public record Ticket(long id, String title, Status status, String assignee) {

    public Ticket withTitle(String title) {
        return new Ticket(id, title, status, assignee);
    }

    public Ticket withStatus(Status status) {
        return new Ticket(id, title, status, assignee);
    }

    public Ticket withAssignee(String assignee) {
        return new Ticket(id, title, status, assignee);
    }
}
```

```java
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentSkipListMap;

/** In a real application: a Spring {@code @Service} backed by a repository. */
public class TicketService {

    private final Map<Long, Ticket> store = new ConcurrentSkipListMap<>();

    public TicketService() {
        save(new Ticket(1, "Printer on fire", Status.OPEN, null));
        save(new Ticket(2, "Password reset", Status.IN_PROGRESS, "Ada"));
        save(new Ticket(3, "VPN drops hourly", Status.OPEN, null));
    }

    public List<Ticket> search(String text, Status status) {
        return store.values().stream()
                .filter(t -> t.title().toLowerCase().contains(text.toLowerCase()))
                .filter(t -> status == null || t.status() == status)
                .toList();
    }

    public List<String> agents() {
        return List.of("Ada", "Grace", "Linus");
    }

    public Ticket save(Ticket ticket) {
        store.put(ticket.id(), ticket);
        return ticket;
    }
}
```

## 2. The ViewModel

State first, then derived state, then the read-only signals the view binds to, then the commands. `selected`, `opened`, and `draft` are three pieces of state because the user can see three different things: the row selected in the list, the ticket in the editor as last saved, and that ticket with the user's edits. `confirmingDiscard` isn't stored at all: it is true exactly when the selected row differs from the opened ticket.

```java
import java.util.List;
import java.util.Objects;

import com.vaadin.flow.signals.Signal;
import com.vaadin.flow.signals.local.ValueSignal;

/**
 * The state and behaviour of the ticket triage view: which tickets are listed,
 * which one is open in the editor, and whether its changes can be saved.
 * Knows nothing about components.
 */
class TicketsViewModel {

    private final TicketService ticketService;

    // State
    private final ValueSignal<String> searchText = new ValueSignal<>("");
    private final ValueSignal<Status> statusFilter = new ValueSignal<>(null);
    private final ValueSignal<List<Ticket>> tickets = new ValueSignal<>(List.of());
    /** The row the user selected in the list. */
    private final ValueSignal<Ticket> selected = new ValueSignal<>(null);
    /** The ticket in the editor, as last saved. */
    private final ValueSignal<Ticket> opened = new ValueSignal<>(null);
    /** The ticket in the editor, with the user's edits. */
    private final ValueSignal<Ticket> draft = new ValueSignal<>(null);

    // Derived state
    private final Signal<Boolean> editing = draft.map(Objects::nonNull);
    private final Signal<Boolean> dirty = Signal
            .computed(() -> !Objects.equals(draft.get(), opened.get()));
    private final Signal<Boolean> confirmingDiscard = Signal
            .computed(() -> !Objects.equals(selected.get(), opened.get()));
    private final Signal<String> titleError = draft.map(
            d -> d != null && d.title().isBlank() ? "Title is required" : null);
    private final Signal<Boolean> canSave = Signal
            .computed(() -> dirty.get() && titleError.get() == null);

    TicketsViewModel(TicketService ticketService) {
        this.ticketService = ticketService;
        reload();
    }

    Signal<String> searchText() {
        return searchText.asReadonly();
    }

    Signal<Status> statusFilter() {
        return statusFilter.asReadonly();
    }

    Signal<List<Ticket>> tickets() {
        return tickets.asReadonly();
    }

    Signal<Ticket> selected() {
        return selected.asReadonly();
    }

    Signal<Boolean> editing() {
        return editing;
    }

    Signal<String> title() {
        return draft.map(d -> d == null ? "" : d.title());
    }

    Signal<Status> status() {
        return draft.map(d -> d == null ? null : d.status());
    }

    Signal<String> assignee() {
        return draft.map(d -> d == null ? null : d.assignee());
    }

    Signal<String> titleError() {
        return titleError;
    }

    Signal<Boolean> dirty() {
        return dirty;
    }

    Signal<Boolean> canSave() {
        return canSave;
    }

    /** True while a new selection waits for the user to keep or discard their edits. */
    Signal<Boolean> confirmingDiscard() {
        return confirmingDiscard;
    }

    List<String> agents() {
        return ticketService.agents();
    }

    void search(String text) {
        searchText.set(text == null ? "" : text);
        reload();
    }

    void filterByStatus(Status status) {
        statusFilter.set(status);
        reload();
    }

    void select(Ticket ticket) {
        selected.set(ticket);
        if (!dirty.peek()) {
            open(ticket);
        }
    }

    /** Throws away the edits and opens the selected ticket (or reopens the current one). */
    void discardChanges() {
        open(selected.peek());
    }

    /** Cancels the new selection and goes back to the ticket being edited. */
    void keepEditing() {
        selected.set(opened.peek());
    }

    void setTitle(String title) {
        draft.update(d -> d.withTitle(title));
    }

    void setStatus(Status status) {
        draft.update(d -> d.withStatus(status));
    }

    void setAssignee(String assignee) {
        draft.update(d -> d.withAssignee(assignee));
    }

    /** @return whether the ticket was saved */
    boolean save() {
        if (!canSave.peek()) {
            return false;
        }
        Ticket saved = ticketService.save(draft.peek());
        open(saved);
        reload();
        return true;
    }

    private void open(Ticket ticket) {
        selected.set(ticket);
        opened.set(ticket);
        draft.set(ticket);
    }

    private void reload() {
        tickets.set(ticketService.search(searchText.peek(), statusFilter.peek()));
    }
}
```

## 3. The view

Creates the ViewModel, lays out the components, and binds them. Listeners call one command each. The grid's items and the title field's error are bound with `bindItems` and `bindError` from the application's [`SignalBindings`](signal-bindings.md) class. The only effect the view writes itself opens the discard dialog.

```java
import static com.example.SignalBindings.bindError;
import static com.example.SignalBindings.bindItems;

import com.vaadin.flow.component.button.Button;
import com.vaadin.flow.component.button.ButtonVariant;
import com.vaadin.flow.component.combobox.ComboBox;
import com.vaadin.flow.component.confirmdialog.ConfirmDialog;
import com.vaadin.flow.component.formlayout.FormLayout;
import com.vaadin.flow.component.grid.Grid;
import com.vaadin.flow.component.notification.Notification;
import com.vaadin.flow.component.orderedlayout.HorizontalLayout;
import com.vaadin.flow.component.orderedlayout.VerticalLayout;
import com.vaadin.flow.component.textfield.TextField;
import com.vaadin.flow.router.BeforeLeaveEvent;
import com.vaadin.flow.router.BeforeLeaveEvent.ContinueNavigationAction;
import com.vaadin.flow.router.BeforeLeaveObserver;
import com.vaadin.flow.router.Route;
import com.vaadin.flow.signals.Signal;

@Route("tickets")
public class TicketsView extends HorizontalLayout implements BeforeLeaveObserver {

    private final TicketsViewModel viewModel;

    public TicketsView(TicketService ticketService) {
        viewModel = new TicketsViewModel(ticketService);
        setSizeFull();
        add(createList(), createEditor());
        createDiscardDialog();
    }

    private VerticalLayout createList() {
        TextField search = new TextField("Search");
        search.bindValue(viewModel.searchText(), viewModel::search);

        ComboBox<Status> statusFilter = new ComboBox<>("Status", Status.values());
        statusFilter.setClearButtonVisible(true);
        statusFilter.bindValue(viewModel.statusFilter(), viewModel::filterByStatus);

        Grid<Ticket> grid = new Grid<>();
        grid.addColumn(Ticket::title).setHeader("Title");
        grid.addColumn(Ticket::status).setHeader("Status");
        grid.addColumn(Ticket::assignee).setHeader("Assignee");
        bindItems(grid, viewModel.tickets()).setIdentifierProvider(Ticket::id);
        grid.asSingleSelect().bindValue(viewModel.selected(), viewModel::select);

        return new VerticalLayout(new HorizontalLayout(search, statusFilter), grid);
    }

    private VerticalLayout createEditor() {
        TextField title = new TextField("Title");
        title.bindValue(viewModel.title(), viewModel::setTitle);
        bindError(title, viewModel.titleError());

        ComboBox<Status> status = new ComboBox<>("Status", Status.values());
        status.bindValue(viewModel.status(), viewModel::setStatus);

        ComboBox<String> assignee = new ComboBox<>("Assignee", viewModel.agents());
        assignee.bindValue(viewModel.assignee(), viewModel::setAssignee);

        Button save = new Button("Save", e -> {
            if (viewModel.save()) {
                Notification.show("Ticket saved");
            }
        });
        save.addThemeVariants(ButtonVariant.PRIMARY);
        save.bindEnabled(viewModel.canSave());

        Button discard = new Button("Discard", e -> viewModel.discardChanges());
        discard.bindEnabled(viewModel.dirty());

        VerticalLayout editor = new VerticalLayout(
                new FormLayout(title, status, assignee),
                new HorizontalLayout(save, discard));
        editor.bindVisible(viewModel.editing());
        return editor;
    }

    private void createDiscardDialog() {
        ConfirmDialog dialog = new ConfirmDialog();
        dialog.setHeader("Unsaved changes");
        dialog.setText("Discard your changes to this ticket?");
        dialog.setConfirmButton("Discard", e -> viewModel.discardChanges());
        dialog.setCancelable(true);
        dialog.setCancelButton("Keep editing", e -> viewModel.keepEditing());
        Signal.effect(this, () -> dialog.setOpened(viewModel.confirmingDiscard().get()));
    }

    @Override
    public void beforeLeave(BeforeLeaveEvent event) {
        if (viewModel.dirty().peek()) {
            ContinueNavigationAction navigation = event.postpone();
            new ConfirmDialog("Unsaved changes", "Leave and discard your changes?",
                    "Leave", e -> navigation.proceed(),
                    "Stay", e -> navigation.cancel()).open();
        }
    }
}
```

Notes:

- `bindItems` sets the grid's items once and refreshes them, because `setItems()` would clear the bound selection on every reload. The identifier provider keeps the saved ticket's row selected after its record is replaced.
- The discard dialog's effect is owned by the view, not by the dialog: a closed dialog isn't attached, and an effect runs only while its owner is attached.
- The view never checks state in its listeners. Even the Discard button just calls `discardChanges()`: with nothing else selected, that reopens the current ticket and drops the edits.
- `beforeLeave` is the exception: the router needs an answer at once, so the view reads `dirty()` with `peek()`. The postponed navigation is a router object, so it stays in the view, and so does the dialog that resumes it.

## 4. The ViewModel tests

Plain JUnit: no Vaadin environment, no Spring context. Each test is one rule of the view, stated without a component. Read state with `peek()`.

```java
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class TicketsViewModelTest {

    TicketService service;
    TicketsViewModel viewModel;

    Ticket printer;
    Ticket vpn;

    @BeforeEach
    void setUp() {
        service = new TicketService();
        viewModel = new TicketsViewModel(service);
        printer = viewModel.tickets().peek().get(0);
        vpn = viewModel.tickets().peek().get(2);
    }

    @Test
    void searchNarrowsTheList() {
        viewModel.search("vpn");

        assertEquals(1, viewModel.tickets().peek().size());
        assertEquals("VPN drops hourly", viewModel.tickets().peek().getFirst().title());
    }

    @Test
    void openingATicketIsNotAnUnsavedChange() {
        viewModel.select(printer);

        assertTrue(viewModel.editing().peek());
        assertFalse(viewModel.dirty().peek());
        assertFalse(viewModel.canSave().peek());
    }

    @Test
    void editedTicketCanBeSaved() {
        viewModel.select(printer);
        viewModel.setAssignee("Grace");

        assertTrue(viewModel.canSave().peek());
        assertTrue(viewModel.save());
        assertEquals("Grace", viewModel.tickets().peek().getFirst().assignee());
        assertFalse(viewModel.dirty().peek());
    }

    @Test
    void blankTitleCannotBeSaved() {
        viewModel.select(printer);
        viewModel.setTitle(" ");

        assertEquals("Title is required", viewModel.titleError().peek());
        assertFalse(viewModel.canSave().peek());
        assertFalse(viewModel.save());
    }

    @Test
    void switchingTicketsWithUnsavedChangesAsksFirst() {
        viewModel.select(printer);
        viewModel.setTitle("Printer on fire again");

        viewModel.select(vpn);

        assertTrue(viewModel.confirmingDiscard().peek());
        assertEquals("Printer on fire again", viewModel.title().peek());
    }

    @Test
    void keepingEditsStaysOnTheTicket() {
        viewModel.select(printer);
        viewModel.setTitle("Printer on fire again");
        viewModel.select(vpn);

        viewModel.keepEditing();

        assertFalse(viewModel.confirmingDiscard().peek());
        assertEquals(printer, viewModel.selected().peek());
        assertEquals("Printer on fire again", viewModel.title().peek());
    }

    @Test
    void discardingEditsMovesOn() {
        viewModel.select(printer);
        viewModel.setTitle("Printer on fire again");
        viewModel.select(vpn);

        viewModel.discardChanges();

        assertFalse(viewModel.confirmingDiscard().peek());
        assertEquals(vpn, viewModel.selected().peek());
        assertEquals("VPN drops hourly", viewModel.title().peek());
        assertEquals("Printer on fire", service.search("printer", null).getFirst().title());
    }

    @Test
    void discardWithoutANewSelectionRevertsTheEdits() {
        viewModel.select(printer);
        viewModel.setTitle("Printer on fire again");

        viewModel.discardChanges();

        assertEquals("Printer on fire", viewModel.title().peek());
        assertFalse(viewModel.dirty().peek());
    }

    @Test
    void deselectingClosesTheEditor() {
        viewModel.select(printer);

        viewModel.select(null);

        assertFalse(viewModel.editing().peek());
        assertNull(viewModel.selected().peek());
    }
}
```

The view's use cases — clicking a row, the dialog, saving — are covered by browserless tests of `TicketsView`; see the `vaadin-browserless-testing` skill.

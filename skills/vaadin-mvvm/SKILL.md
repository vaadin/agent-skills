---
name: vaadin-mvvm
description: >
  Structures complex Vaadin Flow (Java) views with the Model-View-ViewModel
  pattern: the @Route view creates a plain-Java ViewModel that holds the view's
  state in signals and offers the user's actions as methods, while application
  services and domain classes or DTOs are the Model. Use when building or
  refactoring a Vaadin view whose state is shared by several components or has
  rules worth a unit test — master-detail editors, lists with several filters,
  dashboards, wizards, editors that guard unsaved changes — when a view class
  has grown hard to follow, or when the user mentions MVVM, ViewModel,
  presentation model, MVP, or separating UI state and logic from the view. Also
  decides when MVVM is overkill and a plain view or signals in the view are
  enough. Requires Vaadin 25.1 or later.
---

# MVVM for Complex Vaadin Views

In Model-View-ViewModel, the **View** is what the user sees, the **ViewModel** is what the view knows and can do — its state and the actions a user can trigger — and the **Model** is the application itself: services, domain classes, DTOs. Signals make the pattern cheap in Flow. The ViewModel keeps its state in signals, the view binds its components to those signals once, and every change reaches the screen without listeners that copy values around.

Signals arrived in Flow 25.1 (package `com.vaadin.flow.signals`), after most training data. Check the project's Vaadin version first. On 25.0 signals were an experimental feature with a different API, and older versions have none; tell the user this skill doesn't apply there. Before writing a signal or binding call you're not sure of, look it up with the Vaadin MCP: `get_java_symbol` for `Signal`, `ValueSignal`, `ListSignal`, or a component's `bind*` methods, and `search_vaadin_docs` for the signals guides, with `vaadin_version` set to the project's version.

## First decide: is MVVM worth it here?

Most views don't need a ViewModel. Pick the lightest level that keeps each view readable. Decide per view, not per application: a mix of levels in one application is normal.

| Level | What it is | Fits |
|---|---|---|
| 1. Plain view | Components, listeners, service calls; `Binder` for forms | Login, settings, a form that loads and saves one entity, a list with one filter, read-only pages |
| 2. Signals in the view | `ValueSignal` fields in the view class, bound to components | A few pieces of UI state shared by two or three components: a toggle, a filter, the selected item |
| 3. View + ViewModel | The signals and the rules move to a ViewModel class that the view creates | A view where two or more of the signs below hold |

Move to a ViewModel when **at least two** of these hold:

- **Rules over combined state.** What is visible, enabled, or shown depends on more than one piece of state: "Save is enabled when the draft has changes and is valid."
- **State shared by parts of the view.** The view is split into components — filter bar, list, detail panel, toolbar — that read or change the same state.
- **Behaviour worth a unit test.** You can state a rule about the view without naming a component, such as "switching tickets with unsaved edits asks first", and it deserves a test.
- **Flows and modes.** Wizards, view and edit modes, unsaved-changes guards, confirm-before-continue.
- **State that changes without a click.** Background loading, polling, pushed updates.

A ViewModel is overkill when:

- It would only forward: each command is one service call, and nothing is derived.
- Each piece of state is used by exactly one component.
- The view is a form for one entity. `Binder` already does that job.
- The view is a throwaway prototype.

Quick test: write the ViewModel's public API first, meaning the signals it exposes and its commands. If it has fewer than three state signals, no derived signal, and commands that only delegate, stay at level 1 or 2. Tell the user which level you picked and why.

Moving from level 2 to level 3 is mechanical. Move the signal fields and the code that changes them into the ViewModel, make the fields private, and expose read-only signals and commands.

## The roles

| | Model | ViewModel | View |
|---|---|---|---|
| Is | Application services, domain classes, DTOs, repositories | One plain Java class per complex view | The `@Route` class and its child components |
| Holds | Business rules, persistence, transactions, security | The view's state in signals, rules derived from that state, and the commands a user can trigger | Components, layout, bindings |
| Uses | — | The Model | The ViewModel |
| Never touches | The view or its ViewModel | Components, `UI`, `Notification`, `Binder`, the router | Services, other than handing them to the ViewModel |

## The ViewModel

```java
class TicketsViewModel {

    private final TicketService ticketService; // the Model

    // State
    private final ValueSignal<String> searchText = new ValueSignal<>("");
    private final ValueSignal<Status> statusFilter = new ValueSignal<>(null);
    private final ValueSignal<List<Ticket>> tickets = new ValueSignal<>(List.of());
    private final ValueSignal<Ticket> opened = new ValueSignal<>(null);
    private final ValueSignal<Ticket> draft = new ValueSignal<>(null);

    // Derived state
    private final Signal<Boolean> dirty = Signal
            .computed(() -> !Objects.equals(draft.get(), opened.get()));
    private final Signal<String> titleError = draft.map(
            d -> d != null && d.title().isBlank() ? "Title is required" : null);
    private final Signal<Boolean> canSave = Signal
            .computed(() -> dirty.get() && titleError.get() == null);

    TicketsViewModel(TicketService ticketService) {
        this.ticketService = ticketService;
        reload();
    }

    // State out: read-only signals
    Signal<String> searchText() {
        return searchText.asReadonly();
    }

    Signal<List<Ticket>> tickets() {
        return tickets.asReadonly();
    }

    Signal<String> title() {
        return draft.map(d -> d == null ? "" : d.title());
    }

    Signal<Boolean> canSave() {
        return canSave;
    }

    // Commands in: what the user can do
    void search(String text) {
        searchText.set(text);
        reload();
    }

    void setTitle(String title) {
        draft.update(d -> d.withTitle(title));
    }

    /** @return whether the ticket was saved */
    boolean save() {
        if (!canSave.peek()) {
            return false;
        }
        Ticket saved = ticketService.save(draft.peek());
        opened.set(saved);
        draft.set(saved);
        reload();
        return true;
    }

    private void reload() {
        tickets.set(ticketService.search(searchText.peek(), statusFilter.peek()));
    }
}
```

1. **A plain Java class that the view creates.** Not a Spring bean, and not `@UIScope` or `@RouteScope`. The view calls `new` and passes in the services, so the ViewModel lives exactly as long as the view instance. Put it in the view's package and keep it package-private.
2. **No components.** Nothing from `com.vaadin.flow.component`, `com.vaadin.flow.router`, or `com.vaadin.flow.data.binder`, and no `UI.getCurrent()`. Use only signals (`com.vaadin.flow.signals`) and the Model. That keeps the ViewModel testable with plain JUnit.
3. **All state lives in private signals.** Any other field is `final`: services and constants. Keep the values immutable: records with `withX` methods, and lists from `List.copyOf(...)` or `.toList()`. Change them with `update(d -> d.withTitle(t))`. Never mutate an object you read with `peek()`, because the signal can't see that change.
4. **State goes out as read-only signals.** Return `asReadonly()`, `map(...)`, or `Signal.computed(...)`, never a `ValueSignal`. Then every change goes through a command, and the ViewModel's API lists exactly what the user can do.
5. **Commands come in, named after what the user means to do:** `select(ticket)`, `search(text)`, `save()`, `keepEditing()`. A field edit is a command too (`setTitle`). It's the write callback of `bindValue`.
6. **Derive, don't sync.** When a value can be computed from other state, make it `Signal.computed(...)` or `map(...)`. Never keep a second signal in step by hand. If a derivation is expensive and read in several places, wrap it in `Signal.cached(...)`.
7. **React in commands, not in effects.** The ViewModel has no `Signal.effect`, which needs an owner component, and no `Signal.unboundEffect`, which leaks unless removed. When a filter change must reload data, the filter command does the reload.
8. **Use `peek()` in commands and `get()` in derivations.** Calling `get()` outside a computed signal or an effect throws `IllegalStateException`.
9. **Return one-shot outcomes; keep lasting conditions as state.** If the view must react once to a command, such as showing a notification or navigating away, the command returns the outcome: a `boolean`, an enum, or a sealed result. Anything that stays on screen, such as an error, a "Saving…" marker, or an open question to the user, is a signal.
10. **Anything a two-way component can show is state.** If a write callback ignores or rejects a value, the component keeps showing the user's value. It doesn't snap back. So when the ViewModel can't accept a change right away, it stores the change as state and settles it with a later command. In the example, clicking another ticket while there are unsaved edits sets `selected`. `confirmingDiscard` is derived from `selected` differing from `opened`, and `keepEditing()` sets `selected` back, so the grid's selection follows.

## The view

```java
@Route("tickets")
public class TicketsView extends HorizontalLayout {

    private final TicketsViewModel viewModel;

    public TicketsView(TicketService ticketService) {
        viewModel = new TicketsViewModel(ticketService);

        TextField search = new TextField("Search");
        search.bindValue(viewModel.searchText(), viewModel::search);

        TextField title = new TextField("Title");
        title.bindValue(viewModel.title(), viewModel::setTitle);

        Button save = new Button("Save", e -> {
            if (viewModel.save()) {
                Notification.show("Ticket saved");
            }
        });
        save.bindEnabled(viewModel.canSave());
        // ...
    }
}
```

1. **The `@Route` class creates the ViewModel** in its constructor and keeps it in a `private final` field. Spring or Quarkus injects the services into the view's constructor, and the view passes them on.
2. **Bind, don't push.** Use `bindText`, `bindVisible`, `bindEnabled`, `bindReadOnly`, `bindValue(viewModel.x(), viewModel::setX)`, `bindChildren`, and `grid.asSingleSelect().bindValue(...)`. Use `Signal.effect(owner, ...)` only for what has no bind method, such as `setItems`, `setInvalid`, or `setOpened`.
3. **Listeners only call commands.** A listener calls one command and at most acts on its result. It doesn't check state or call services.
4. **The view does what only a UI can do:** notifications, dialogs, navigation, focus, and reading route parameters.
5. **Child components receive state; they never create it.** Pass a child component the ViewModel, or only the signals and commands it needs, which keeps it reusable. Only the route view creates a ViewModel, or a parent ViewModel creates its child ViewModels.

## Patterns

### Lists and grids

- A list that is reloaded as a whole, such as search results, is a `ValueSignal<List<T>>` holding an immutable list.
- A list the user edits entry by entry and the view renders with `bindChildren` is a `ListSignal<T>`.

When a grid's selection is bound, set its items once and refresh them from an effect. `grid.setItems(...)` replaces the data provider, which always clears the selection, and the selection binding passes that to the ViewModel as a `null` selection:

```java
List<Ticket> rows = new ArrayList<>();
grid.setItems(rows).setIdentifierProvider(Ticket::id);
Signal.effect(grid, () -> {
    rows.clear();
    rows.addAll(viewModel.tickets().get());
    grid.getDataProvider().refreshAll();
});
grid.asSingleSelect().bindValue(viewModel.selected(), viewModel::select);
```

The identifier provider keeps the row selected when a save replaces its record. A grid without a bound selection can use `Signal.effect(grid, () -> grid.setItems(viewModel.tickets().get()))`.

For data too large to load at once, the ViewModel keeps the filter as state and offers paged queries that read it with `peek()`. The view refreshes the grid when the filter changes:

```java
grid.setItems(query -> viewModel.fetch(query.getOffset(), query.getLimit()),
        query -> viewModel.count());
Signal.effect(grid, () -> {
    viewModel.searchText().get();
    grid.getDataProvider().refreshAll();
});
```

### Forms: signals or Binder

A field is bound either by `bindValue` or by `Binder`, never by both.

- **Signals (the default inside a ViewModel).** The draft is a record in a `ValueSignal`. Fields bind with `bindValue(viewModel.title(), viewModel::setTitle)`, and the validation rules are derived signals such as `titleError` and `canSave`, which the ViewModel tests cover. To show a field's error, turn on manual validation and set the error from an effect:

  ```java
  title.setManualValidation(true);
  Signal.effect(title, () -> {
      String error = viewModel.titleError().get();
      title.setInvalid(error != null);
      title.setErrorMessage(error);
  });
  ```

- **Binder in the view.** Use this when the form needs converters or Jakarta Bean Validation annotations, or when the ViewModel only loads and saves the entity. The ViewModel exposes the bean to edit and a `save(bean)` command. The view calls `binder.readBean(...)` from an effect, calls `viewModel.save(bean)` when `binder.writeBeanIfValid(bean)` succeeds, and binds the Save button to `binder.validationStatusSignal().map(BinderValidationStatus::isOk)`. The form's own validation rules then stay out of the ViewModel tests.

### Dialogs and confirmations

A question the ViewModel asks is state. The view opens the dialog from an effect and wires its buttons to commands. The view must own the effect, because a closed dialog isn't attached and an effect only runs while its owner is attached:

```java
Signal.effect(this, () -> dialog.setOpened(viewModel.confirmingDiscard().get()));
dialog.setConfirmButton("Discard", e -> viewModel.discardChanges());
dialog.setCancelButton("Keep editing", e -> viewModel.keepEditing());
```

### Route parameters

The view reads the parameter and hands it to a command. The command's result decides whether to reroute:

```java
@Override
public void setParameter(BeforeEvent event, Long ticketId) {
    if (!viewModel.open(ticketId)) {
        event.rerouteToError(NotFoundException.class);
    }
}
```

### Background work

Local signals are thread-safe, so the ViewModel can set them from a background thread without `UI.access()`. The application needs `@Push` for the change to reach the browser without a user action. Keep loading, result, and error in one signal, for example a sealed `Loading | Loaded | Failed` type, so a single `set()` keeps them consistent; local signals don't support transactions. The ViewModel has no detach event, so the view cancels running work: `addDetachListener(e -> viewModel.cancelLoading())`. When the user can start a new request before the last one answers, ignore answers to requests that are no longer the latest.

### When the ViewModel grows

If a ViewModel holds unrelated groups of state, split it along the parts of the view. The route view's ViewModel creates child ViewModels, such as `FiltersViewModel` and `EditorViewModel`, and exposes them. Each child component binds to its own. Rules that span parts stay in the parent.

## Testing

- **Test the ViewModel with plain JUnit.** Create it with `new TicketsViewModel(service)`, using a fake or a mock service, call commands, and assert with `peek()`. These tests need no Vaadin environment and no Spring context, and they run in milliseconds. Test every rule: derived signals, guards, and command results.
- **Test the use cases with browserless tests of the view.** The `vaadin-browserless-testing` skill covers them. They prove the bindings and the wiring; the ViewModel tests prove the rules. Don't test every rule at both levels.

```java
@Test
void switchingTicketsWithUnsavedEditsAsksFirst() {
    viewModel.select(printer);
    viewModel.setTitle("Printer on fire again");

    viewModel.select(vpn);

    assertTrue(viewModel.confirmingDiscard().peek());
    assertEquals("Printer on fire again", viewModel.title().peek());
}
```

[references/ticket-triage-example.md](references/ticket-triage-example.md) has the complete example: the Model, the ViewModel, the view, and the ViewModel tests.

## Workflow

Track these steps as TODOs.

1. **Check the Vaadin version and pick the level.** Signals need 25.1 or later. Tell the user the level and the reason. Stop at level 1 or 2 when that's enough.
2. **Write the ViewModel's API first:** state signals, derived signals, and commands with their result types, named in the domain's words. For a complex view, show the API to the user. It is the view's behaviour on one screen.
3. **Implement the ViewModel and its unit tests**, and run them until they pass.
4. **Write the view:** layout, bindings, listeners that call commands, and effects for what has no bind method.
5. **Run the tests:** the ViewModel tests, and browserless tests of the use cases if the project has them.

## Red flags

- A ViewModel method returns a `ValueSignal` or `ListSignal`. The view can then change state without a command and skip its rules.
- A ViewModel imports a component, `UI`, `Notification`, or `Binder`.
- A ViewModel is a Spring bean (`@Component`, `@UIScope`, `@SpringComponent`). Its lifetime no longer matches the view's, and state leaks between views or browser tabs.
- `get()` in a command, a listener, or a test throws `IllegalStateException`. Use `peek()` there.
- A record or bean read with `peek()` is mutated in place, so nothing updates. Use `update(...)`, or `modify(...)` for a mutable bean.
- A command or an effect keeps a second signal in step with another. Make it a derived signal.
- `Signal.effect(grid, () -> grid.setItems(...))` on a grid whose selection is bound. Every reload clears the selection.
- A write callback rejects a value and expects the component to revert.
- An effect is owned by a component that isn't attached, such as a closed dialog, so it never runs.
- A ViewModel for a simple form that only forwards every call to a service.

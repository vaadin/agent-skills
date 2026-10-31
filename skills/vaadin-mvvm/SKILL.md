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
| 2. Signals in the view | `ValueSignal` fields in the view class, bound to components | A few pieces of UI state that more than one component reads: a toggle, a filter, the selected item, a dashboard's latest data |
| 3. View + ViewModel | The signals and the rules move to a ViewModel class that the view creates | A view where two or more of the signs below hold |

A signal earns its place when a second component reads the state. A search field that feeds one grid needs only a value-change listener.

Move to a ViewModel when **at least two** of these hold:

- **Rules over combined state.** What is visible, enabled, or shown depends on more than one piece of state: "Save is enabled when the draft has changes and is valid."
- **State shared by parts of the view.** The view is split into parts — filter bar, list, detail panel, toolbar, wizard steps — that read or change the same state. A field and the grid it filters are not parts.
- **Behaviour worth a unit test.** You can state a rule about the view without naming a component, such as "switching tickets with unsaved edits asks first", and it deserves a test.
- **Flows and modes.** Wizards, view and edit modes, unsaved-changes guards, confirm-before-continue.
- **State that changes without a click.** Background loading, polling, pushed updates.

A ViewModel is overkill when:

- It would only forward: each command is one service call, and nothing is derived.
- Each piece of state is used by exactly one component.
- The view is a form that loads one entity and saves it, with no rules beyond validating each field. `Binder` already does that job. A wizard or an editor with totals, lines, or guards is not such a form, even if it saves one entity.
- The view is a throwaway prototype.

Quick test: write the ViewModel's public API first, meaning the signals it exposes and its commands. Then strike out what a plain view gets for free: a signal per form field and a command that only passes a value to a service. If nothing is left — no derived signal that combines state, no guard, no flow — stay at level 1 or 2. Tell the user which level you picked and why.

At level 1, build forms with `Binder` (look up the Binder guides with `search_vaadin_docs`) and lay them out with the `vaadin-form-layout` skill. At level 2, the patterns below apply as written, with the view's own signals in place of `viewModel.x()`.

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
6. **Derive, don't sync.** When a value can be computed from other state, make it `Signal.computed(...)` or `map(...)`. Never keep a second signal in step by hand. A derivation runs again on every read, so keep it cheap and free of side effects. It may call a pure domain function, such as a pricing rule, but never a service that does I/O. If a derivation is expensive and read in several places, wrap it in `Signal.cached(...)`.
7. **React in commands, not in effects.** The ViewModel has no `Signal.effect`, which needs an owner component, and no `Signal.unboundEffect`, which leaks unless removed. When a filter change must reload data, the filter command does the reload.
8. **Use `peek()` in commands and `get()` in derivations.** Calling `get()` outside a computed signal or an effect throws `IllegalStateException`.
9. **Return one-shot outcomes; keep lasting conditions as state.** If the view must react once to a command, such as showing a notification or navigating away, the command returns the outcome: a `boolean`, an enum, or a sealed result. Anything that stays on screen, such as an error the user has to fix, a "Saving…" marker, or an open question to the user, is a signal. A failed save that only needs a notification is a returned outcome; a conflict that the form keeps showing until the user resolves it is state.
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

1. **The `@Route` class creates the ViewModel** in its constructor and keeps it in a `private final` field. Spring or Quarkus injects the services into the view's constructor, and the view passes them on. A field initializer can't use the ViewModel, not even inside a lambda: Java reports that the final field might not have been initialized. Create such fields, such as event listeners, in the constructor after the ViewModel.
2. **Bind, don't push.** Use `bindText`, `bindVisible`, `bindEnabled`, `bindReadOnly`, `bindValue(viewModel.x(), viewModel::setX)`, `bindChildren`, and `grid.asSingleSelect().bindValue(...)`. Vaadin has no bind method yet for a grid's items or a field's error. For those, use `bindItems` and `bindError` from the application's `SignalBindings` class. Write `Signal.effect(owner, ...)` yourself only for the rest, such as `setOpened`.
3. **Listeners only call commands.** A listener calls one command and at most acts on its result. It doesn't call services or decide anything the ViewModel could decide. When a framework callback needs an answer at once, such as `beforeLeave` asking whether to stop navigation, the view may read a derived signal with `peek()`: `viewModel.dirty().peek()`.
4. **The view does what only a UI can do:** notifications, dialogs, navigation, focus, and reading route parameters.
5. **Child components receive state; they never create it.** Pass a child component the ViewModel, or only the signals and commands it needs, which keeps it reusable. Only the route view creates a ViewModel, or a parent ViewModel creates its child ViewModels.

## Patterns

### Lists and grids

- A list that is reloaded as a whole, such as search results, is a `ValueSignal<List<T>>` holding an immutable list.
- A list the user edits entry by entry, such as an order's lines, is a `ListSignal<T>` that the view renders with `bindChildren`. `ListSignal` has no `asReadonly()`, so expose the entries as `Signal<List<Signal<T>>>` with `lines.map(entries -> List.<Signal<Line>>copyOf(entries))`. Commands such as `setQuantity(Signal<Line> line, Integer quantity)` take an entry and find it by identity. [references/lists-and-background-work.md](references/lists-and-background-work.md) has the complete code.

Bind a grid to a list signal with `bindItems`, and its selection with `bindValue`:

```java
bindItems(grid, viewModel.tickets()).setIdentifierProvider(Ticket::id);
grid.asSingleSelect().bindValue(viewModel.selected(), viewModel::select);
```

`bindItems` sets the items once and refreshes them on every change. Calling `grid.setItems(...)` again from an effect would replace the data provider, which always clears the selection, and the selection binding would pass that to the ViewModel as a `null` selection. The identifier provider keeps the row selected when a save replaces its record.

Keep a selection as IDs, and derive the selected rows from the IDs and the current list. After a reload, the derived selection then holds the rows' latest data, and a row that is gone drops out of it without a command having to prune it. This matters most for a multi-select grid, whose commands act on every selected row:

```java
private final ValueSignal<Set<Long>> selectedIds = new ValueSignal<>(Set.of());
private final Signal<Set<Line>> selectedLines = Signal.computed(() -> {
    var ids = selectedIds.get();
    return lines.get().stream().filter(l -> ids.contains(l.id())).collect(Collectors.toUnmodifiableSet());
});

void selectLines(Set<Line> selection) {
    selectedIds.set(selection.stream().map(Line::id).collect(Collectors.toUnmodifiableSet()));
}
```

```java
grid.asMultiSelect().bindValue(viewModel.selectedLines(), viewModel::selectLines);
```

The commands read `selectedLines().peek()`, never the IDs, so they never act on a row that is no longer listed.

### Paged data

For data too large to load at once, the ViewModel doesn't hand out a data provider. A data provider belongs to one component, and several components may show the same ViewModel. Instead, the ViewModel offers two things:

- `fetch(offset, limit)` and `count()`, plain methods that read the filter with `peek()`.
- One `query()` signal that changes whenever the list's contents would. It holds the filter and a revision number that commands bump after they change data.

Each component that shows the list builds its own data provider with `bindItems`, which refreshes it whenever the query changes:

```java
bindItems(grid, viewModel.query(), viewModel::fetch, viewModel::count)
        .setIdentifierProvider(Ticket::id);
```

The refresh effect ends when its grid is detached, so no component has to unregister. [references/lists-and-background-work.md](references/lists-and-background-work.md) has the complete code and two variants:

- Pass the query to `fetch` as the data provider's filter, so `fetch` works only from its arguments.
- Derive the revision from a shared signal in the Model, so other users' saves refresh the list too.

### Forms without Binder

A view with a ViewModel doesn't use `Binder`. `Binder` keeps the form's values and validity to itself, so the ViewModel's rules — Save enabled, Next enabled, a total — can't build on them, and it binds one fixed bean, not a list of rows. A field is bound either by `bindValue` or by `Binder`, never by both, so every field binds to the ViewModel's signals. `Binder` stays the tool for level 1 forms.

What `Binder` would have done moves into the ViewModel:

- **Values.** The draft is a record in a `ValueSignal`. Each field binds to a mapped signal and a command: `title.bindValue(viewModel.title(), viewModel::setTitle)`.
- **Validation.** Each rule is a derived signal holding the error message, or `null` when the value is fine, such as `titleError()` or `quantityError(line)`. `canSave` combines them, and the ViewModel tests cover all of them.
- **Built-in checks.** Showing your own error needs manual validation, which turns off the field's built-in checks: required, min and max, pattern. Write those as ViewModel rules too.
- **Conversion.** Use typed fields — `IntegerField`, `BigDecimalField`, `DatePicker`, `ComboBox<T>` — so values arrive typed. A command converts what's left, such as a code typed as text, and an error signal reports input it can't convert. A cleared or unparseable number arrives as `null`. Store it and let a rule report it; see rule 10.
- **When errors appear.** A derived error shows as soon as the draft breaks the rule, even on a new, empty form. To hold errors back until the user tries to save, keep a `submitted` signal that `save()` sets, and have each error signal return `null` while it is false.

`bindError` from `SignalBindings` shows any error signal on any field, and turns on manual validation for it:

```java
title.bindValue(viewModel.title(), viewModel::setTitle);
bindError(title, viewModel.titleError());
```

### SignalBindings

Vaadin has no bind methods yet for a grid's items or a field's error. Keep three small helpers in one class in the application, and import them statically in every view that has a ViewModel:

| Helper | Binds |
|---|---|
| `bindItems(grid, items)` | A `Signal<List<T>>` to a grid's items |
| `bindItems(grid, query, fetch, count)` | Paged data to a grid, refreshed whenever `query` changes |
| `bindError(field, error)` | A `Signal<String>` of error messages to a field |

Each `bindItems` returns the grid's data view, like `setItems()` does. When a grid needs something the helpers don't do, write the effect yourself. If the project has no `SignalBindings` yet, copy it from [references/signal-bindings.md](references/signal-bindings.md). The item helpers are for grids only: other components treat refreshed items in their own ways, and a `Select` or a `ComboBox`, for example, clears its value.

When a `ComboBox`'s or a `Select`'s options are a ViewModel signal that changes while its value is bound, as when the options are reloaded each time another record opens, the clearing reaches the write callback as `null`. Have the ViewModel empty the draft before it changes the options, and make the field commands do nothing while there is no draft. The clearing is then ignored, and setting the draft afterwards puts the value back:

```java
private void show(Ticket ticket) {
    draft.set(null);            // the field commands ignore the clearing
    agents.set(agentService.findAll());
    draft.set(ticket);
}
```

### Steps and modes

Keep a wizard's step, or a view's mode, as an enum in a signal. Show each part with `bindVisible(viewModel.step().map(s -> s == Step.PLAN))`. Derive `canGoNext` and `canGoBack` from the step and the validity of its fields. `back()` changes only the step, so whatever the user entered stays in the draft.

### Dialogs and confirmations

A question the ViewModel asks is state. The view opens the dialog from an effect and wires its buttons to commands. The view must own the effect, because a closed dialog isn't attached and an effect only runs while its owner is attached:

```java
Signal.effect(this, () -> dialog.setOpened(viewModel.confirmingDiscard().get()));
dialog.setConfirmButton("Discard", e -> viewModel.discardChanges());
dialog.setCancelButton("Keep editing", e -> viewModel.keepEditing());
```

### Leaving with unsaved changes

The router asks before the user navigates away, and it needs the answer at once. The view reads the ViewModel's `dirty()` with `peek()` and postpones the navigation. The postponed navigation is a router object, so it stays in the view, and so does the dialog that resumes it:

```java
@Override
public void beforeLeave(BeforeLeaveEvent event) {
    if (viewModel.dirty().peek()) {
        ContinueNavigationAction navigation = event.postpone();
        new ConfirmDialog("Unsaved changes", "Leave and discard your changes?",
                "Leave", e -> navigation.proceed(),
                "Stay", e -> navigation.cancel()).open();
    }
}
```

Always call `cancel()` when the user stays. Otherwise the postponed navigation stays pending, and links in the application stop working until the page is reloaded. `beforeLeave` only sees navigation inside the application, including the browser's back button and a route parameter change that reuses the view. For reloads and closed tabs, find the "Protect Unsaved Changes" guide with `search_vaadin_docs`, and turn its browser warning on and off from an effect on `viewModel.dirty()`.

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

Local signals are thread-safe, so the ViewModel can set them from the thread that completes a `CompletableFuture`, without `UI.access()`. For the change to reach the browser without a user action, the application needs `@Push`.

- **One signal per async value.** Keep loading, result, and error in one signal, for example a sealed `Loading | Loaded | Failed` type, so a single `set()` changes them together; local signals don't support transactions.
- **The latest request wins.** Number the requests and drop answers to any request that isn't the latest. Otherwise a slow answer to an old search overwrites a newer one.
- **The view cancels.** The ViewModel has no detach event, so the view calls `addDetachListener(e -> viewModel.cancel())`.
- **The view owns timers.** A periodic refresh has to stop when the view goes away. Start it on attach and stop it on detach, with `UI.setPollInterval(...)` or a scheduled task, and let it call a ViewModel command.
- **Slow commands are state too.** Set a `saving` signal, derive `canSave` from it so the button disables itself, and set the outcome when the work completes.

In a browserless test, a signal set on another thread reaches the components only after `window.runPendingSignalsTasks()`. [references/lists-and-background-work.md](references/lists-and-background-work.md) has the complete code and its tests.

### Changes from the Model

When the Model announces changes through listeners, such as Spring application events or a service's `addListener`, subscribing is the view's job, just like a timer. The ViewModel has no attach or detach event, and a subscription that outlives the view leaks it. The view subscribes on attach, unsubscribes on detach, and calls a ViewModel command that reloads, named after what happened:

```java
@Override
protected void onAttach(AttachEvent attachEvent) {
    var ui = attachEvent.getUI();
    registration = ticketService.addChangeListener(event -> ui.access(viewModel::ticketsChanged));
    viewModel.refresh(); // changes made while the view was detached
}

@Override
protected void onDetach(DetachEvent detachEvent) {
    registration.remove();
}
```

- **One subscription, in the route view.** Child components don't subscribe on their own; the route view routes each event to the ViewModel, and the ViewModel decides which parts reload.
- **The event may come from another user's request.** Run the command through `ui.access(...)`, or the project's own helper for that, so it runs with this view's session locked. A local signal refuses to be changed from another session.
- **Testing.** The ViewModel test calls the command directly, standing in for the event: `viewModel.ticketsChanged()`.
- **A shared signal in the Model is the alternative,** as in the paged data variant: then no listener is needed, but the Model depends on Vaadin's signal classes.

### When the ViewModel grows

If a ViewModel holds unrelated groups of state, split it along the parts of the view. The route view's ViewModel creates child ViewModels, such as `FiltersViewModel` and `EditorViewModel`, and exposes them. Each child component binds to its own. Rules that span parts stay in the parent.

When one part follows another, the parent passes the change on in its command. It doesn't share a signal for the child to follow in an effect:

```java
void select(Long ticketId) {
    selected.set(ticketId);
    editor.open(ticketId);
}
```

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
4. **Write the view:** layout, bindings, listeners that call commands, and effects for what has no bind method. Use `SignalBindings` for grids and field errors, and copy the class into the project if it doesn't have one yet.
5. **Run the tests:** the ViewModel tests, and browserless tests of the use cases if the project has them.

## Red flags

- A ViewModel method returns a `ValueSignal` or `ListSignal`. The view can then change state without a command and skip its rules.
- A ViewModel imports a component, `UI`, `Notification`, or `Binder`.
- A view with a ViewModel binds its fields with `Binder`. The ViewModel's rules can't see the form's values or validity.
- A ViewModel is a Spring bean (`@Component`, `@UIScope`, `@SpringComponent`). Its lifetime no longer matches the view's, and state leaks between views or browser tabs.
- `get()` in a command, a listener, or a test throws `IllegalStateException`. Use `peek()` there.
- A record or bean read with `peek()` is mutated in place, so nothing updates. Use `update(...)`, or `modify(...)` for a mutable bean.
- A command or an effect keeps a second signal in step with another. Make it a derived signal.
- A computed signal calls a service or a repository. It runs on every read; load data in a command instead.
- A background answer is applied without checking that its request is still the latest.
- `Signal.effect(grid, () -> grid.setItems(...))` on a grid whose selection is bound. Every reload clears the selection. Use `bindItems`.
- A multi-select grid's selection mode is set after `bindItems`. Its select-all checkbox then goes stale when the rows change.
- A `Select` or `ComboBox` whose value is bound gets its items refreshed while the draft is set. It clears its value, and the ViewModel receives `null`.
- A child component or a child ViewModel follows a parent's signal in an effect to load its own data. Make it a command the parent calls.
- A ViewModel subscribes to the Model's events, or a child component subscribes on its own. The route view subscribes and calls ViewModel commands.
- A ViewModel exposes a `DataProvider`, or keeps references to the views' data providers to refresh them.
- A write callback rejects a value and expects the component to revert.
- An effect is owned by a component that isn't attached, such as a closed dialog, so it never runs.
- A ViewModel for a simple form that only forwards every call to a service.

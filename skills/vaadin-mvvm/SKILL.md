---
name: vaadin-mvvm
description: >
  Structures complex Vaadin Flow (Java) views with the Model-View-ViewModel
  pattern, following Vaadin's guide "Structure Complex Views with MVVM": the
  @Route view creates a plain-Java ViewModel that holds the view's state in
  signals and offers the user's actions as methods, while application services
  and domain classes or DTOs are the Model. Use when building or refactoring a
  Vaadin view whose state is shared by several components or has rules worth a
  unit test — master-detail editors, lists with several filters, dashboards,
  wizards, editors that guard unsaved changes — when a view class has grown hard
  to follow, or when the user mentions MVVM, ViewModel, presentation model, MVP,
  presenter, or separating UI state and logic from the view. Also decides when
  MVVM is overkill and a plain view or signals in the view are enough, and
  whether to keep MVP in an application that uses it. Requires Vaadin 25.1 or
  later; reads the guide through the Vaadin MCP server.
---

# MVVM for Complex Vaadin Views

In Model-View-ViewModel, the **View** is what the user sees, the **ViewModel** is what the view knows and can do — its state and the actions a user can trigger — and the **Model** is the application itself: services, domain classes, DTOs. In Flow, the ViewModel keeps its state in signals, and the view binds its UI components to them.

Vaadin's guide, "Structure Complex Views with MVVM", explains the pattern with a complete example, and "MVP and MVVM Compared" covers the older Model-View-Presenter pattern. This skill decides whether a view needs a ViewModel, says which page of the guide to read for each task, and lists the mistakes to avoid. Read the guide; don't write the pattern from memory.

## Before you start

- **Vaadin version.** Signals arrived in Flow 25.1, in `com.vaadin.flow.signals`, after most training data. On 25.0 they were an experimental feature with a different API, and older versions have none; tell the user that this skill doesn't apply there.
- **Reading the guide.** Fetch its pages with the Vaadin MCP server's `get_full_document`, using the paths in [Read the guide](#read-the-guide) prefixed with `v{version}/`, for example `v25.3/building-apps/views/mvvm/index.md`. The guide exists for Vaadin 25.3 and later. For a project on 25.1 or 25.2, read the 25.3 pages, and check each signal or binding call against the project's version with `get_java_symbol`. If a path isn't found, use `search_vaadin_docs` with a query such as "MVVM ViewModel".
- **Without the MCP server**, say so, and read the guide at https://vaadin.com/docs/latest/building-apps/views/mvvm instead.

## Decide the approach

Most views don't need a ViewModel. Pick the lightest approach that keeps each view readable, and decide for each view, not for the whole application.

| Approach | Fits |
|---|---|
| Plain view: UI components, listeners, service calls, `Binder` for forms | A login or settings view, a form that loads and saves one entity, a list with one filter, a read-only page |
| Signals in the view | A few pieces of UI state that more than one UI component reads: a toggle, a filter, the selected item |
| View and ViewModel | A view that shows at least two of the signs below |

The signs of a view that needs a ViewModel:

- **Rules over combined state:** "Save is enabled when the ticket has changes and is valid."
- **State shared by parts of the view:** a filter bar, a list, a detail panel, wizard steps. A field and the grid it filters aren't parts.
- **Behavior worth a unit test:** a rule you can state without naming a UI component, such as "switching tickets with unsaved changes asks first".
- **Flows and modes:** wizard steps, view and edit modes, guards against losing changes, confirmations.
- **State that changes without a click:** background loading, polling, updates pushed from the server.

A ViewModel is overkill when each command would only forward to a service and nothing is derived, when each piece of state is used by one UI component, or when the view is a form for one entity with no rules beyond validating each field. If you're unsure, write the ViewModel's public API down, and strike out what a plain view gets for free: a signal per form field, and commands that only pass a value to a service. If no derived signal, guard, or flow is left, the view doesn't need a ViewModel.

In an application that uses MVP:

- Keep MVP while migrating the application to a newer Vaadin version. The presenters' tests then show that the UI logic still works.
- Move a view to MVVM when you change it substantially anyway. Write new complex views with MVVM.
- Use MVP for a new view only when its UI logic must not depend on Vaadin.

Testing alone isn't a reason for either pattern: a browserless test checks a plain view without a browser.

Tell the user which approach you picked, and why. For a plain view, build forms with `Binder` and lay them out with the `vaadin-form-layout` skill. The full guidance is in the guide's "When to Use MVVM" and in "MVP and MVVM Compared".

## Read the guide

Read the overview first. It has the roles, the decision in full, and the example that the other pages build on. Then read the pages for what the view does:

| When the view… | Read |
|---|---|
| Needs a ViewModel at all | `building-apps/views/mvvm/index.md` |
| Gets its ViewModel: signals, derived state, commands, outcomes, splitting | `building-apps/views/mvvm/write-viewmodel.md` |
| Binds UI components, child components, grids, or error messages; `SignalBindings` | `building-apps/views/mvvm/bind-view.md` |
| Edits data in a form | `building-apps/views/mvvm/forms.md` |
| Shows a list or grid, keeps a selection, edits entries one by one, or loads data page by page | `building-apps/views/mvvm/lists.md` |
| Has steps or modes, asks the user, protects unsaved changes, or opens an item from a route parameter | `building-apps/views/mvvm/dialogs-and-navigation.md` |
| Loads data in the background, refreshes on a timer, runs slow commands, or reacts to changes in the Model | `building-apps/views/mvvm/background-work.md` |
| Gets tests | `building-apps/views/mvvm/test-viewmodel.md`, and the `vaadin-browserless-testing` skill for the use cases |
| Uses MVP, or moves from MVP to MVVM | `building-apps/views/mvp.md` |

## Workflow

Track these steps as TODOs.

1. **Check the Vaadin version and the MCP server**, as in [Before you start](#before-you-start).
2. **Decide the approach**, and tell the user. Stop here when a plain view or signals in the view are enough.
3. **Read the overview and the pages** that the view needs.
4. **Write the ViewModel's public API first:** state signals, derived signals, and commands with their result types, named in the domain's words. For a complex view, show it to the user. It is the view's behavior on one screen.
5. **Write the ViewModel and its plain JUnit tests**, and run them until they pass.
6. **Write the view:** layout, bindings, and listeners that call commands. If the project has no `SignalBindings` class yet, copy it from "Bind the View".
7. **Run the tests**, including browserless tests of the use cases if the project has them.
8. **Check the code against the red flags** below before you finish.

## Red flags

Each of these is a mistake that the guide explains. Check for them when you write a view with a ViewModel, and when you review one.

**The decision** (`index.md`):

- A ViewModel is created for a view that doesn't need one, such as a form whose commands only forward to a service.

**The ViewModel** (`write-viewmodel.md`):

- It's a Spring bean (`@Component`, `@SpringComponent`, `@UIScope`, `@RouteScope`). Its lifetime no longer matches the view's.
- It imports a UI component, `UI`, `Notification`, `Binder`, or the router.
- A method returns a `ValueSignal` or a `ListSignal`, so the view can change state without a command.
- `get()` is called in a command, a listener, or a test. Outside a computed signal or an effect, it throws `IllegalStateException`; use `peek()`.
- An object read from a signal is changed in place, so nothing updates. Replace the value with `set()` or `update()`.
- A command or an effect keeps one signal in step with another. Make it a derived signal.
- A computed signal calls a service or a repository. It runs on every read; load data in a command.
- It has a `Signal.effect` or `Signal.unboundEffect`. It reacts in its commands instead.
- Its constructor loads data, or the view's does. Vaadin can create a view without showing it; the view calls a `refresh()` command after navigation.
- A child ViewModel or child component follows a parent's signal in an effect to load its own data. The parent calls a command on it instead.

**The view** (`bind-view.md`):

- A field initializer uses the ViewModel. The compiler rejects it; assign such fields in the constructor after the ViewModel.
- A listener calls a service, or decides something that the ViewModel could decide.
- `Signal.effect(grid, () -> grid.setItems(...))` is used on a grid whose selection is bound. Every change clears the selection, and the ViewModel receives `null`. Use `bindItems` from `SignalBindings`.
- A multi-select grid's selection mode is set after `bindItems`, so its select-all checkbox goes stale.

**Forms** (`forms.md`):

- A view with a ViewModel binds its fields with `Binder`. The ViewModel's rules can't see the form's values or validity.
- A `Select`'s items change, or a `ComboBox`'s items are replaced with `setItems()`, while its value is bound and the draft is set. It clears its value, and the ViewModel receives `null`.

**Lists** (`lists.md`):

- The ViewModel exposes a `DataProvider`, or keeps references to the views' data providers to refresh them.
- A refused grid selection is expected to make the grid go back to the old row. Fields go back to the signal's value; a grid's selection doesn't. Keep the requested selection as state (`write-viewmodel.md`).

**Dialogs and background work** (`dialogs-and-navigation.md`, `background-work.md`):

- An effect is owned by a UI component that isn't attached, such as a closed dialog, so it never runs. Make the view its owner.
- A postponed navigation isn't cancelled when the user stays, so links stop working until the page is reloaded.
- A background answer is applied without checking that its request is still the latest.
- The ViewModel subscribes to the Model's events, or a child component subscribes on its own. The route view subscribes on attach, unsubscribes on detach, and calls ViewModel commands.

# Editable Lists, Paged Data, and Background Work

Three patterns that go beyond the ticket-triage example. The code compiles against Vaadin 25.3, and its tests pass.

## Editable lists

An order's lines, a list of phone numbers: when the user edits a list entry by entry, keep it in a `ListSignal`. Each entry is its own signal, so `bindChildren` creates one row component per entry and keeps that component when the entry changes or moves. Rows aren't rebuilt while the user types, so they don't lose focus.

`ListSignal` has no `asReadonly()`. To keep the view from writing entries directly, expose the entries typed as plain `Signal`. They are the same signal instances, so `bindChildren` still tracks them, and the commands find the entry they're given by identity:

```java
import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;

import com.vaadin.flow.signals.Signal;
import com.vaadin.flow.signals.local.ListSignal;
import com.vaadin.flow.signals.local.ValueSignal;

class LinesViewModel {
    record Line(String product, BigDecimal price, int quantity) {
        Line withQuantity(int quantity) {
            return new Line(product, price, quantity);
        }

        BigDecimal total() {
            return price.multiply(BigDecimal.valueOf(quantity));
        }
    }

    private final ListSignal<Line> lines = new ListSignal<>();
    private final ValueSignal<List<Line>> opened = new ValueSignal<>(List.of());

    // Read-only view of the entries: the same signal instances, typed so they can't be set
    private final Signal<List<Signal<Line>>> readOnlyLines = lines
            .map(entries -> List.<Signal<Line>>copyOf(entries));
    private final Signal<BigDecimal> total = Signal.computed(() -> lines.getValues()
            .map(Line::total).reduce(BigDecimal.ZERO, BigDecimal::add));
    private final Signal<Boolean> dirty = Signal
            .computed(() -> !lines.getValues().toList().equals(opened.get()));
    private final Signal<Boolean> valid = Signal
            .computed(() -> lines.getValues().allMatch(l -> l.quantity() >= 1));

    LinesViewModel(List<Line> initial) {
        lines.insertAllLast(initial);
        opened.set(List.copyOf(initial));
    }

    Signal<List<Signal<Line>>> lines() {
        return readOnlyLines;
    }

    Signal<BigDecimal> total() {
        return total;
    }

    Signal<Boolean> dirty() {
        return dirty;
    }

    Signal<Boolean> valid() {
        return valid;
    }

    void addLine(String product, BigDecimal price) {
        lines.insertLast(new Line(product, price, 1));
    }

    void setQuantity(Signal<Line> line, Integer quantity) {
        entry(line).update(l -> l.withQuantity(quantity == null ? 0 : quantity));
    }

    void removeLine(Signal<Line> line) {
        lines.remove(entry(line));
    }

    private ValueSignal<Line> entry(Signal<Line> line) {
        return lines.peek().stream().filter(e -> e == line).findFirst()
                .orElseThrow();
    }
}
```

- `lines.getValues()` inside a computed signal depends on the list and on every entry's value, so the total follows both a quantity change and an added or removed line.
- `dirty` compares the current values with a snapshot taken when the lines were opened.
- Rows are identified by their signal, not by an id, so a new line that hasn't been saved needs no temporary id.
- A rule about one row, such as an error on its quantity, is a derived signal of that entry that the ViewModel hands out: `Signal<String> quantityError(Signal<Line> line)` returns `line.map(l -> l.quantity() < 1 ? "At least 1" : null)`.

The view renders one row per entry. The factory gets the entry's read-only signal and hands it back to the commands:

```java
rows.bindChildren(viewModel.lines(), line -> {
    Span product = new Span(line.map(Line::product));
    IntegerField quantity = new IntegerField();
    quantity.setAriaLabel("Quantity");
    quantity.bindValue(line.map(Line::quantity),
            q -> viewModel.setQuantity(line, q));
    Button remove = new Button("Remove", e -> viewModel.removeLine(line));
    return new HorizontalLayout(product, quantity, remove);
});
```

A list that is only shown, or reloaded as a whole, doesn't need any of this. Keep it as an immutable `List` in a `ValueSignal` and show it in a `Grid`.

## Paged data

A grid that loads its rows page by page needs a data provider, and a data provider belongs to one component. Several components may show the same ViewModel, so the ViewModel doesn't hand out a data provider. It offers what every data provider needs instead:

- `fetch(offset, limit)` and `count()`, plain methods that read the filter with `peek()`.
- `query()`, one signal that changes whenever the list's contents would. It holds the filter and a revision number that commands bump after they change data.

The Model is a `PagedTicketService` with `search(text, offset, limit)`, `count(text)`, and `save(ticket)`.

```java
/** What the ticket list shows: the filter, and how often the data has changed. */
record TicketQuery(String text, long revision) {

    TicketQuery withText(String text) {
        return new TicketQuery(text, revision);
    }

    TicketQuery nextRevision() {
        return new TicketQuery(text, revision + 1);
    }
}
```

```java
import java.util.stream.Stream;

import com.vaadin.flow.signals.Signal;
import com.vaadin.flow.signals.local.ValueSignal;

class PagedTicketsViewModel {

    private final PagedTicketService ticketService;

    private final ValueSignal<TicketQuery> query = new ValueSignal<>(new TicketQuery("", 0));
    private final ValueSignal<Ticket> selected = new ValueSignal<>(null);

    PagedTicketsViewModel(PagedTicketService ticketService) {
        this.ticketService = ticketService;
    }

    /** Changes whenever the list's contents would: a new filter or a saved ticket. */
    Signal<TicketQuery> query() {
        return query.asReadonly();
    }

    Signal<String> searchText() {
        return query.map(TicketQuery::text);
    }

    Signal<Ticket> selected() {
        return selected.asReadonly();
    }

    Signal<Boolean> canResolve() {
        return selected.map(t -> t != null && t.status() != Status.RESOLVED);
    }

    Stream<Ticket> fetch(int offset, int limit) {
        return ticketService.search(query.peek().text(), offset, limit).stream();
    }

    int count() {
        return ticketService.count(query.peek().text());
    }

    void search(String text) {
        query.update(q -> q.withText(text));
    }

    void select(Ticket ticket) {
        selected.set(ticket);
    }

    void resolveSelected() {
        Ticket saved = ticketService.save(selected.peek().withStatus(Status.RESOLVED));
        selected.set(saved);
        query.update(TicketQuery::nextRevision);
    }
}
```

Each component that shows the tickets builds its own data provider from these, with `bindItems` from [`SignalBindings`](signal-bindings.md). The view passes the same ViewModel to each of them, and any number can observe it. The refresh effect ends when its grid is detached, so nothing has to unregister:

```java
import static com.example.SignalBindings.bindItems;

import com.vaadin.flow.component.grid.Grid;
import com.vaadin.flow.component.orderedlayout.VerticalLayout;

/** One of the components that show the tickets; each builds its own data provider. */
class TicketList extends VerticalLayout {

    TicketList(PagedTicketsViewModel viewModel) {
        Grid<Ticket> grid = new Grid<>();
        grid.addColumn(Ticket::title).setHeader("Title");
        grid.addColumn(Ticket::status).setHeader("Status");
        bindItems(grid, viewModel.query(), viewModel::fetch, viewModel::count)
                .setIdentifierProvider(Ticket::id);
        grid.asSingleSelect().bindValue(viewModel.selected(), viewModel::select);
        add(grid);
    }
}
```

- `bindItems` sets the data provider once and calls `refreshAll()` whenever `query()` changes. That keeps the bound selection, which `setItems()` would clear.
- The identifier provider keeps the selected row selected when a save replaces its record.

### Variant: pass the query to fetch

If you'd rather have `fetch` and `count` work only from their arguments, have them take the query, and hand the query to the data provider as its filter. Setting the filter refreshes the provider. `bindItems` doesn't cover this variant, so each view writes the data provider and the effect itself:

```java
Stream<Ticket> fetch(TicketQuery query, int offset, int limit) {
    return ticketService.search(query.text(), offset, limit).stream();
}

int count(TicketQuery query) {
    return ticketService.count(query.text());
}
```

```java
ConfigurableFilterDataProvider<Ticket, Void, TicketQuery> tickets = new CallbackDataProvider<Ticket, TicketQuery>(
        query -> viewModel.fetch(query.getFilter().orElseThrow(),
                query.getOffset(), query.getLimit()),
        query -> viewModel.count(query.getFilter().orElseThrow()),
        Ticket::id).withConfigurableFilter();
grid.setItems(tickets);
Signal.effect(grid, () -> tickets.setFilter(viewModel.query().get()));
```

The effect sets the filter before the grid's first fetch, so `getFilter().orElseThrow()` is safe.

### Variant: changes by other users

The revision above counts only this ViewModel's own saves. To refresh the list when any user saves, let the Model count the saves in a shared signal:

```java
private final SharedNumberSignal changes = new SharedNumberSignal();

public Ticket save(Ticket ticket) {
    store.put(ticket.id(), ticket);
    changes.incrementBy(1);
    return ticket;
}

/** Changes whenever any user saves a ticket. */
public Signal<Integer> changes() {
    return changes.mapIntValue(count -> count);
}
```

The ViewModel derives its query from its own filter and the Model's signal. It no longer bumps a revision itself, because its own saves go through the service too:

```java
private final Signal<TicketQuery> query;

LiveTicketsViewModel(PagedTicketService ticketService) {
    this.ticketService = ticketService;
    query = Signal.computed(() -> new TicketQuery(searchText.get(),
            ticketService.changes().get()));
}
```

- The Model now depends on Vaadin's signal classes.
- For the other users' lists to refresh without an action of their own, the application needs `@Push`.

### Testing it

- A browserless grid locator reads rows straight from the data provider, so it shows current data even when no refresh happened. To test that a list refreshes, count the data provider's refresh events: `grid.getDataProvider().addDataProviderListener(e -> refreshes.incrementAndGet())`.
- Another user's save reaches an observing window only after `window.runPendingSignalsTasks()`.

## Background work

A value that arrives later has three states: loading, loaded, and failed. Keep them in one signal, so a single `set()` changes them together; local signals don't support transactions.

```java
/** Loading, loaded or failed: the three states of a value that arrives later. */
sealed interface AsyncState<T> {
    record Loading<T>() implements AsyncState<T> {
    }

    record Loaded<T>(T value) implements AsyncState<T> {
    }

    record Failed<T>(Throwable error) implements AsyncState<T> {
    }
}
```

The ViewModel starts the work and sets the signal when the answer arrives, on whatever thread completes the future. Local signals are thread-safe, so it needs no `UI.access()`. It numbers its requests so that an answer to an older search can't overwrite a newer one, and it offers `cancel()` for the view to call when it is detached:

```java
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicLong;

import com.vaadin.flow.signals.Signal;
import com.vaadin.flow.signals.local.ValueSignal;

class ReportViewModel {

    private final ReportService reportService;

    private final ValueSignal<String> query = new ValueSignal<>("");
    private final ValueSignal<AsyncState<List<String>>> rows = new ValueSignal<>(
            new AsyncState.Loading<>());

    // Not state the view shows: bookkeeping for the background work
    private final AtomicLong latestRequest = new AtomicLong();
    private volatile CompletableFuture<List<String>> running;

    ReportViewModel(ReportService reportService) {
        this.reportService = reportService;
        load();
    }

    Signal<String> query() {
        return query.asReadonly();
    }

    Signal<AsyncState<List<String>>> rows() {
        return rows.asReadonly();
    }

    Signal<Boolean> loading() {
        return rows.map(r -> r instanceof AsyncState.Loading);
    }

    void search(String text) {
        query.set(text);
        load();
    }

    /** Stops the running request; its answer is ignored. */
    void cancel() {
        latestRequest.incrementAndGet();
        CompletableFuture<?> future = running;
        if (future != null) {
            future.cancel(false);
        }
    }

    private void load() {
        long request = latestRequest.incrementAndGet();
        rows.set(new AsyncState.Loading<>());
        CompletableFuture<List<String>> future = reportService.load(query.peek());
        running = future;
        // Runs on the thread that completes the future. Setting a local
        // signal there is safe; Flow applies the change to the UI.
        future.whenComplete((value, error) -> {
            if (request != latestRequest.get()) {
                return; // a newer request or a cancel made this answer stale
            }
            rows.set(error == null ? new AsyncState.Loaded<>(value)
                    : new AsyncState.Failed<>(error));
        });
    }
}
```

The view binds to the state and cancels on detach:

```java
import java.util.List;

import com.vaadin.flow.component.html.Span;
import com.vaadin.flow.component.orderedlayout.VerticalLayout;
import com.vaadin.flow.component.progressbar.ProgressBar;
import com.vaadin.flow.component.textfield.TextField;
import com.vaadin.flow.router.Route;

@Route("report")
public class ReportView extends VerticalLayout {

    final ReportViewModel viewModel;

    public ReportView(ReportService reportService) {
        viewModel = new ReportViewModel(reportService);

        TextField query = new TextField("Query");
        query.bindValue(viewModel.query(), viewModel::search);

        ProgressBar progress = new ProgressBar();
        progress.setIndeterminate(true);
        progress.bindVisible(viewModel.loading());

        Span result = new Span(viewModel.rows().map(state -> switch (state) {
            case AsyncState.Loading<List<String>> loading -> "Loading…";
            case AsyncState.Loaded<List<String>> loaded -> String.join(", ", loaded.value());
            case AsyncState.Failed<List<String>> failed -> "Failed: " + failed.error().getMessage();
        }));
        result.setId("result");

        add(query, progress, result);
        addDetachListener(e -> viewModel.cancel());
    }
}
```

- For the change to reach the browser without a user action, the application needs `@Push` on its `AppShellConfigurator`.
- A refresh on a timer is the view's job, because the timer has to stop when the view goes away. Start it on attach and stop it on detach, either with `UI.setPollInterval(...)` and a poll listener, or with a scheduled task and `@Push`, and let it call a ViewModel command.
- A slow command, such as a save that takes seconds, works the same way: set a `saving` state, derive `canSave` from it so the button disables itself, and set the outcome when the work completes.

### Testing it

In a ViewModel test, complete the future and assert at once; no UI is involved:

```java
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.Test;

class ReportViewModelTest {
    ReportService service = new ReportService();
    ReportViewModel viewModel = new ReportViewModel(service);

    @Test
    void showsLoadingUntilTheAnswerArrives() {
        assertTrue(viewModel.loading().peek());

        service.requests.get(0).complete(List.of("a"));

        assertFalse(viewModel.loading().peek());
        assertEquals(new AsyncState.Loaded<>(List.of("a")), viewModel.rows().peek());
    }

    @Test
    void aLateAnswerToAnOlderSearchIsIgnored() {
        viewModel.search("x");

        service.requests.get(1).complete(List.of("new"));
        service.requests.get(0).complete(List.of("old"));

        assertEquals(new AsyncState.Loaded<>(List.of("new")), viewModel.rows().peek());
    }
}
```

In a browserless test, a signal set on another thread reaches the components only when the window runs its pending signal tasks. Complete the future, then call `window.runPendingSignalsTasks()` before asserting on the UI.

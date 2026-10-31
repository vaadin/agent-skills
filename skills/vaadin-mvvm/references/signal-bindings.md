# SignalBindings

Vaadin has bind methods for most component properties, but not yet for a grid's items or a field's error message. Copy this class into the application, for example into the package that holds the views, and use it from every view that has a ViewModel. It compiles against Vaadin 25.3, and the examples that use it pass their tests.

```java
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

import com.vaadin.flow.component.Component;
import com.vaadin.flow.component.HasValidation;
import com.vaadin.flow.component.grid.Grid;
import com.vaadin.flow.component.grid.GridMultiSelectionModel;
import com.vaadin.flow.component.grid.GridSelectionColumn;
import com.vaadin.flow.component.grid.dataview.GridLazyDataView;
import com.vaadin.flow.component.grid.dataview.GridListDataView;
import com.vaadin.flow.function.SerializableSupplier;
import com.vaadin.flow.signals.Signal;

/**
 * Binds ViewModel signals to components where Vaadin has no bind method yet.
 * Each binding is an effect owned by the component, so it ends when the
 * component is detached.
 */
public final class SignalBindings {

    /** Fetches one page of items. */
    @FunctionalInterface
    public interface PageFetch<T> extends Serializable {
        Stream<T> fetch(int offset, int limit);
    }

    private SignalBindings() {
    }

    /**
     * Shows the items of a list signal in a grid. The items are set once and
     * refreshed on every change, because setting them again would clear a
     * bound selection. In multi-select mode, set the selection mode first, so
     * that the select-all checkbox is kept right too.
     *
     * @return the data view, for example to set an identifier provider
     */
    public static <T> GridListDataView<T> bindItems(Grid<T> grid,
            Signal<List<T>> items) {
        List<T> rows = new ArrayList<>();
        GridListDataView<T> dataView = grid.setItems(rows);
        Signal.effect(grid, () -> {
            List<T> current = items.get();
            rows.clear();
            rows.addAll(current);
            dataView.refreshAll();
            updateSelectAllCheckbox(grid, rows);
        });
        if (grid.getSelectionModel() instanceof GridMultiSelectionModel<T>) {
            grid.addSelectionListener(e -> updateSelectAllCheckbox(grid, rows));
        }
        return dataView;
    }

    /**
     * Sets the select-all checkbox from the rows and the selection at the end
     * of the round trip, after Grid has set it. Grid sets it only when the
     * selection changes, so it goes stale when the rows change, and it shows
     * an empty grid with an empty selection as all selected.
     */
    private static <T> void updateSelectAllCheckbox(Grid<T> grid,
            List<T> rows) {
        grid.getUI().ifPresent(ui -> ui.beforeClientResponse(grid, context -> {
            if (!(grid.getSelectionModel() instanceof GridMultiSelectionModel<T> model)
                    || !model.isSelectAllCheckboxVisible()) {
                return;
            }
            long size = rows.size();
            long selected = rows.stream().filter(model::isSelected).count();
            grid.getChildren().filter(GridSelectionColumn.class::isInstance)
                    .map(GridSelectionColumn.class::cast).findFirst()
                    .ifPresent(column -> {
                        column.setSelectAllCheckboxState(
                                size > 0 && selected == size);
                        column.setSelectAllCheckboxIndeterminateState(
                                selected > 0 && selected < size);
                    });
        }));
    }

    /**
     * Shows items loaded page by page in a grid, and refreshes them whenever
     * the query signal changes.
     *
     * @return the data view, for example to set an identifier provider
     */
    public static <T> GridLazyDataView<T> bindItems(Grid<T> grid,
            Signal<?> query, PageFetch<T> fetch,
            SerializableSupplier<Integer> count) {
        GridLazyDataView<T> dataView = grid.setItems(
                page -> fetch.fetch(page.getOffset(), page.getLimit()),
                page -> count.get());
        Signal.effect(grid, () -> {
            query.get();
            dataView.refreshAll();
        });
        return dataView;
    }

    /** Shows an error signal on a field; a null error means the value is valid. */
    public static <F extends Component & HasValidation> void bindError(F field,
            Signal<String> error) {
        field.setManualValidation(true);
        Signal.effect(field, () -> {
            String message = error.get();
            field.setInvalid(message != null);
            field.setErrorMessage(message);
        });
    }
}
```

## Using it

Import the methods statically, and bind each grid and field with one line:

```java
bindItems(grid, viewModel.tickets()).setIdentifierProvider(Ticket::id);

bindItems(grid, viewModel.query(), viewModel::fetch, viewModel::count)
        .setIdentifierProvider(Ticket::id);

bindError(title, viewModel.titleError());
```

- **Data view.** Each `bindItems` returns the grid's data view, just as `setItems()` does. Set an identifier provider on it when a save replaces an item's record, so the row stays selected, or use anything else the data view offers.
- **Selection.** Bind the selection separately, with `grid.asSingleSelect().bindValue(...)`. The helpers keep it, because they set the items once and refresh them: `refreshAll()` keeps a selection, and `setItems()` would clear it.
- **Select-all checkbox.** In multi-select mode, Grid works out the header's select-all checkbox only when the selection changes, and counts an empty grid as all selected. Refreshed rows would leave it stale: ticked after the last selected row leaves, or still ticked when a row is added. The in-memory `bindItems` sets it from the rows and the selection at the end of each round trip, after Grid has set it, which is why the code reaches the `GridSelectionColumn`. Call `setSelectionMode(MULTI)` before `bindItems`. The paged helper leaves the checkbox alone, because Grid hides it for lazy data unless `setSelectAllCheckboxVisibility(VISIBLE)` shows it; if you show it, update it the same way.
- **Customizing.** When a grid needs something the helpers don't do, write the effect yourself. Examples are a configurable filter, a count estimate instead of an exact count, or a refresh of single items. Each helper is only a few lines to start from.

## Grids only

The item helpers take a `Grid` on purpose, because other components react to refreshed items in their own ways. A `Select` or a `ComboBox` clears its value whenever its items change, and the write callback of a bound value then receives `null`. When a selection component's options come from a ViewModel, set them once. If they must change while the view is open, have the ViewModel empty the draft before it changes them, as described under SignalBindings in the skill. `VirtualList` still uses the older `setDataProvider` API.

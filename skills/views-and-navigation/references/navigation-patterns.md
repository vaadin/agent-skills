# Navigation Patterns Quick Reference

## Routing Annotations

| Annotation | Purpose | Example |
|------------|---------|---------|
| `@Route("path")` | Define a view's URL path | `@Route("customers")` |
| `@Route("")` | Map to application root | `@Route("")` |
| `@RouteAlias("alt")` | Additional route to same view | `@RouteAlias("home")` |
| `@PageTitle("Title")` | Set browser tab title | `@PageTitle("Customers")` |
| `@Menu(...)` | Register view in navigation menu | `@Menu(title = "Home", order = 1, icon = "vaadin:home")` |
| `@Layout` | Create automatic router layout for all views | `@Layout` on a `RouterLayout` class |
| `@Layout("/path")` | Automatic layout scoped to a path prefix | `@Layout("/admin")` |
| `@ParentLayout(X.class)` | Nest a layout inside another layout | `@ParentLayout(MainLayout.class)` |
| `@RoutePrefix("prefix")` | Add path prefix from layout to child routes | `@RoutePrefix("admin")` |

## Layout Resolution Rules

- `@Layout` (no path) applies to **all** views unless a more specific layout matches
- `@Layout("/admin")` applies only to views whose routes start with `/admin`
- When multiple layouts match, the **longest matching path** wins
- Explicit `@Route(layout = X.class)` overrides any automatic layout
- `@Route(autoLayout = false)` disables the automatic layout (use for login, error pages)
- Parent layouts are always explicit — automatic layouts never apply to other layouts
- `@Layout` paths require a leading slash; `@Route` paths do not

## Navigation Methods

| Method | When to use | Example |
|--------|-------------|---------|
| `RouterLink` | Default choice — accessible, supports new tabs | `new RouterLink("Home", HomeView.class)` |
| `RouterLink` + param | Link with single route parameter | `new RouterLink("Detail", DetailView.class, "123")` |
| `RouterLink` + `RouteParameters` | Link with multiple route parameters | `new RouterLink("Edit", View.class, new RouteParameters(Map.of(...)))` |
| `UI.navigate(Class)` | Programmatic navigation (button clicks, etc.) | `UI.getCurrent().navigate(HomeView.class)` |
| `UI.navigate(Class, param)` | Programmatic with single parameter | `UI.getCurrent().navigate(DetailView.class, "123")` |
| `UI.navigate(Class, RouteParameters)` | Programmatic with multiple parameters | `UI.getCurrent().navigate(View.class, new RouteParameters(...))` |
| `UI.navigate(String)` | Navigate to React views (no Java class) | `UI.getCurrent().navigate("react/path")` |
| `Anchor` | Link to React views or external URLs | `new Anchor("react/path", "React View")` |

## Parameter Passing Decision Matrix

| Scenario | Approach | Interface/API |
|----------|----------|---------------|
| Single param identifies resource | `HasUrlParameter<T>` | `setParameter(BeforeEvent, T)` |
| Single optional param | `HasUrlParameter<T>` + `@OptionalParameter` | `setParameter(BeforeEvent, @OptionalParameter T)` |
| Capture remaining path | `HasUrlParameter<String>` + `@WildcardParameter` | `setParameter(BeforeEvent, @WildcardParameter String)` |
| Multiple named params | Route template + `BeforeEnterObserver` | `event.getRouteParameters().get("name")` |
| Constrained params (e.g., numeric IDs) | Route template with regex | `:id(\\d+)` |
| Optional filters, sorting, pagination | Query parameters + `BeforeEnterObserver` | `event.getLocation().getQueryParameters()` |

## Route Template Syntax

| Syntax | Meaning | Example route | Matches |
|--------|---------|---------------|---------|
| `:name` | Required, one segment | `customer/:id` | `/customer/123` |
| `:name?` | Optional, one segment | `customer/:id?` | `/customer` or `/customer/123` |
| `:name(regex)` | Required with constraint | `customer/:id(\\d+)` | `/customer/123` (not `/customer/abc`) |
| `:name?(regex)` | Optional with constraint | `order/:mode?(edit\|view)` | `/order` or `/order/edit` |
| `:name*` | Wildcard (last segment only) | `api/:path*` | `/api/a/b/c` |

## AppLayout Sections

| Method | Placement | Typical content |
|--------|-----------|-----------------|
| `addToNavbar(Component...)` | Top bar | `DrawerToggle`, app title, user menu |
| `addToDrawer(Component...)` | Side panel | Logo, `SideNav`, footer |
| `setPrimarySection(Section.DRAWER)` | Keep drawer visible on wide screens | — |
| `setPrimarySection(Section.NAVBAR)` | Navbar takes priority | — |

`DrawerToggle` automatically shows/hides the drawer on narrow screens (hamburger menu).

## Copy-Paste: MainLayout

```java
import com.vaadin.flow.component.Component;
import com.vaadin.flow.component.applayout.AppLayout;
import com.vaadin.flow.component.applayout.DrawerToggle;
import com.vaadin.flow.component.html.Span;
import com.vaadin.flow.component.icon.Icon;
import com.vaadin.flow.component.icon.VaadinIcon;
import com.vaadin.flow.component.orderedlayout.FlexComponent;
import com.vaadin.flow.component.orderedlayout.Scroller;
import com.vaadin.flow.component.orderedlayout.VerticalLayout;
import com.vaadin.flow.component.sidenav.SideNav;
import com.vaadin.flow.component.sidenav.SideNavItem;
import com.vaadin.flow.router.Layout;
import com.vaadin.flow.router.MenuConfiguration;
import com.vaadin.flow.router.MenuEntry;

@Layout
public class MainLayout extends AppLayout {

    public MainLayout() {
        addToNavbar(new DrawerToggle(), createTitle());
        setPrimarySection(Section.DRAWER);
        addToDrawer(createDrawerHeader(), new Scroller(createSideNav()));
    }

    private Span createTitle() {
        var title = new Span("My App");
        title.getStyle().setFontWeight("bold");
        return title;
    }

    private Component createDrawerHeader() {
        var logo = VaadinIcon.COGS.create();
        var name = new Span("My App");
        name.getStyle().setFontWeight("bold");
        var header = new VerticalLayout(logo, name);
        header.setAlignItems(FlexComponent.Alignment.CENTER);
        return header;
    }

    private SideNav createSideNav() {
        var nav = new SideNav();
        MenuConfiguration.getMenuEntries()
                .forEach(entry -> nav.addItem(createSideNavItem(entry)));
        return nav;
    }

    private SideNavItem createSideNavItem(MenuEntry entry) {
        var item = new SideNavItem(entry.title(), entry.path());
        item.setMatchNested(true);
        if (entry.icon() != null) {
            item.setPrefixComponent(new Icon(entry.icon()));
        }
        return item;
    }
}
```

## Copy-Paste: Master-Detail Scaffold

```java
import com.vaadin.flow.component.UI;
import com.vaadin.flow.component.grid.Grid;
import com.vaadin.flow.component.html.H3;
import com.vaadin.flow.component.html.Main;
import com.vaadin.flow.component.orderedlayout.VerticalLayout;
import com.vaadin.flow.component.splitlayout.SplitLayout;
import com.vaadin.flow.router.BeforeEvent;
import com.vaadin.flow.router.HasUrlParameter;
import com.vaadin.flow.router.Menu;
import com.vaadin.flow.router.OptionalParameter;
import com.vaadin.flow.router.PageTitle;
import com.vaadin.flow.router.Route;

@Route("items")
@PageTitle("Items")
@Menu(title = "Items", order = 1, icon = "vaadin:list")
public class ItemsView extends Main
        implements HasUrlParameter<Long> {

    private final Grid<Item> grid = new Grid<>(Item.class);
    private final VerticalLayout detailPane = new VerticalLayout();

    public static void showItem(Long itemId) {
        UI.getCurrent().navigate(ItemsView.class, itemId);
    }

    public static void showList() {
        UI.getCurrent().navigate(ItemsView.class);
    }

    public ItemsView(ItemService service) {
        var splitLayout = new SplitLayout(grid, detailPane);
        splitLayout.setSizeFull();
        splitLayout.setSplitterPosition(60);
        add(splitLayout);
        setSizeFull();

        grid.setItems(service.findAll());
        grid.addSelectionListener(e ->
                e.getFirstSelectedItem().ifPresent(
                        item -> showItem(item.getId())));
        detailPane.setVisible(false);
    }

    @Override
    public void setParameter(BeforeEvent event,
            @OptionalParameter Long itemId) {
        if (itemId != null) {
            detailPane.setVisible(true);
            detailPane.removeAll();
            detailPane.add(new H3("Item #" + itemId));
            // Load and display item details
        } else {
            detailPane.setVisible(false);
            grid.deselectAll();
        }
    }
}
```

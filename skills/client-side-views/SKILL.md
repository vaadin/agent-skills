---
name: client-side-views
description: >
  Guide Claude on building client-side (React/Hilla) views in Vaadin 25.
  This skill should be used when the user asks to "build a client-side view",
  "create a React view", "use Hilla", "use @BrowserCallable",
  "file-based routing", "call Java from React", "create an offline view",
  "client-side rendering", "use ViewConfig", "create a Hilla endpoint",
  "use reactive endpoints", "subscribe to server push from React",
  "use signals in React", or needs help with React-based Vaadin views,
  file-based routing conventions, or type-safe backend communication.
version: 0.1.0
---

# Client-Side Views with React and Hilla in Vaadin 25

Use the Vaadin MCP tools (`search_vaadin_docs`) to look up the latest documentation whenever uncertain about a specific API detail. Always set `vaadin_version` to `"25"` and `ui_language` to `"react"`.

## When to Use Client-Side Views

Client-side (React/Hilla) views run in the browser and communicate with Java endpoints over HTTP. Choose them when:

- **High traffic** — no server-side UI state per user, so the server scales better
- **Offline support** — views can work without a server connection
- **Fine-grained DOM control** — full access to the React ecosystem and browser APIs
- **Rich interactivity** — complex animations, drag-and-drop, or canvas rendering

Use server-side Flow views when you need rapid prototyping with pure Java, direct database access from UI code, or full server-side security for every interaction.

A single Vaadin 25 application can mix both models — Flow views and Hilla views coexist via the generated `routes.tsx`.

## Project Structure

```
src/main/frontend/
  views/                     # File-based routing root
    @layout.tsx              # Main application layout
    @index.tsx               # Root view (/)
    about.tsx                # /about
    products/
      @index.tsx             # /products
      {productId}.tsx        # /products/:productId
  components/                # Shared React components (not routes)
  generated/                 # Auto-generated endpoint clients (do not edit)
    endpoints.ts

src/main/java/
  com/example/services/
    ProductService.java      # @BrowserCallable endpoint
```

The `generated/` directory is rebuilt automatically during development. Import generated endpoint clients from `Frontend/generated/endpoints`.

## File-Based Routing

Views are `.tsx` files in `src/main/frontend/views/`. The file path determines the URL.

### Filename Conventions

| File | URL | Purpose |
|------|-----|---------|
| `@index.tsx` | Directory index (`/`) | Landing page for a directory |
| `@layout.tsx` | — | Wrapping layout with `<Outlet/>` |
| `about.tsx` | `/about` | Static route |
| `{productId}.tsx` | `/products/:productId` | Required parameter |
| `{{search}}.tsx` | `/search/:search?` | Optional parameter |
| `{...wildcard}.tsx` | `/*` | Wildcard (catch-all) |
| `_utils.tsx` | — | Ignored by router (underscore prefix) |

### Route Parameters

Access parameters with React Router's `useParams`:

```tsx
import { useParams } from 'react-router';

export default function ProductView() {
  const { productId } = useParams();
  // fetch product by productId...
}
```

### Programmatic Navigation

```tsx
import { useNavigate } from 'react-router';

function SaveButton() {
  const navigate = useNavigate();

  const handleSave = async () => {
    await ProductService.save(product);
    navigate('/products');
  };

  return <Button onClick={handleSave}>Save</Button>;
}
```

## ViewConfig

Export a `config` object from any view to customize its route metadata:

```tsx
import type { ViewConfig } from '@vaadin/hilla-file-router/types.js';

export default function DashboardView() {
  return <div>Dashboard content</div>;
}

export const config: ViewConfig = {
  title: 'Dashboard',
  loginRequired: true,
  rolesAllowed: ['ADMIN', 'MANAGER'],
  menu: {
    title: 'Dashboard',
    icon: 'vaadin:dashboard',
    order: 1,
  },
};
```

Key properties: `title`, `route`, `loginRequired`, `rolesAllowed`, `skipLayouts`, `menu` (`title`, `icon`, `order`, `exclude`), `detail`. See the reference file for the full property table.

### Auto-Generated Menu

Use `createMenuItems()` from `@vaadin/hilla-file-router/runtime.js` to populate navigation:

```tsx
import { createMenuItems } from '@vaadin/hilla-file-router/runtime.js';
import { SideNavItem } from '@vaadin/react-components/SideNavItem.js';
import { Icon } from '@vaadin/react-components/Icon.js';

{createMenuItems().map(({ to, icon, title }) => (
  <SideNavItem path={to} key={to}>
    {icon && <Icon icon={icon} slot="prefix" />}
    {title}
  </SideNavItem>
))}
```

## Layouts

Create `@layout.tsx` in any directory. It wraps sibling and child views via `<Outlet/>`. Use `AppLayout` with `SideNav` for the standard application shell:

```tsx
import { AppLayout } from '@vaadin/react-components/AppLayout.js';
import { DrawerToggle } from '@vaadin/react-components/DrawerToggle.js';
import { Suspense } from 'react';
import { Outlet } from 'react-router';

export default function MainLayout() {
  return (
    <AppLayout primarySection="drawer">
      <div slot="drawer" className="flex flex-col justify-between h-full p-m">
        <h1 className="text-l m-0">My App</h1>
        {/* SideNav with createMenuItems() here */}
      </div>
      <DrawerToggle slot="navbar" aria-label="Menu toggle" />
      <Suspense fallback={<div>Loading...</div>}>
        <Outlet />
      </Suspense>
    </AppLayout>
  );
}
```

Set `skipLayouts: true` in `ViewConfig` to render a view without parent layouts (e.g., login page).

## @BrowserCallable Endpoints

Annotate a Java service with `@BrowserCallable` to expose it to the frontend. Hilla generates type-safe TypeScript clients automatically.

### Java Service

```java
@BrowserCallable
@AnonymousAllowed
public class ProductService {
    private final ProductRepository repo;

    public ProductService(ProductRepository repo) {
        this.repo = repo;
    }

    @RolesAllowed("ADMIN")
    public Product save(@Valid @Nonnull Product product) {
        return repo.save(product);
    }

    public @Nonnull List<@Nonnull Product> findAll() {
        return repo.findAll();
    }
}
```

### Calling from React

```tsx
import { ProductService } from 'Frontend/generated/endpoints';
import { useEffect } from 'react';
import { useSignal } from '@vaadin/hilla-react-signals';
import type Product from 'Frontend/generated/com/example/Product';

export default function ProductListView() {
  const products = useSignal<Product[]>([]);

  useEffect(() => {
    ProductService.findAll().then(data => {
      products.value = data;
    });
  }, []);

  return (
    <ul>
      {products.value.map(p => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  );
}
```

### Security Annotations

Every `@BrowserCallable` method is **denied by default**. Add one of:

| Annotation | Access |
|------------|--------|
| `@AnonymousAllowed` | Anyone, no login required |
| `@PermitAll` | Any authenticated user |
| `@RolesAllowed("ROLE")` | Users with the specified role(s) |
| `@DenyAll` | Explicitly blocked (the default) |

Place on the class for a default, or on individual methods to override.

### Error Handling

Catch `EndpointValidationError` (Bean Validation failures with per-field `validationErrorData`), `EndpointError` (server exceptions with `message` and `type`), or plain errors (network failures). All from `@vaadin/hilla-frontend`. See the reference file for a complete error handling template.

## Reactive Endpoints (Server Push)

Return a `Flux` from a `@BrowserCallable` method to push data to the browser:

### Java Service

```java
@BrowserCallable
public class TimeService {

    @AnonymousAllowed
    public Flux<@Nonnull String> getClock() {
        return Flux.interval(Duration.ofSeconds(1))
                .onBackpressureDrop()
                .map(i -> Instant.now().toString());
    }

    @AnonymousAllowed
    public EndpointSubscription<@Nonnull String> getClockCancellable() {
        return EndpointSubscription.of(getClock(), () -> {
            // cleanup when client unsubscribes
        });
    }
}
```

### Subscribing from React

```tsx
import { TimeService } from 'Frontend/generated/endpoints';
import type { Subscription } from '@vaadin/hilla-frontend';

const sub = useSignal<Subscription<string> | undefined>(undefined);

// Start
sub.value = TimeService.getClockCancellable()
  .onNext(time => { serverTime.value = time; })
  .onError(err => console.error(err));

// Stop
sub.value?.cancel();
sub.value = undefined;
```

The `Subscription` object provides `cancel()`, `onNext()`, `onError()`, `onComplete()`, and `onSubscriptionLost()` callbacks. See the reference file for the full API table.

## Signals in React

Vaadin provides `useSignal` as a lightweight alternative to React's `useState`. Signals skip unnecessary re-renders by updating only the DOM nodes that read the signal value.

```tsx
import { useSignal, useComputed } from '@vaadin/hilla-react-signals';

export default function CounterView() {
  const count = useSignal(0);
  const doubled = useComputed(() => count.value * 2);

  return (
    <div>
      <p>Count: {count.value}</p>
      <p>Doubled: {doubled.value}</p>
      <Button onClick={() => count.value++}>Increment</Button>
    </div>
  );
}
```

- Read/write via `.value`
- `useComputed` creates derived signals that update automatically
- Signals work with Vaadin components the same way as with plain HTML elements

## Best Practices

1. **Choose the right model** — use client-side views for high-traffic pages, offline needs, or complex interactivity. Use Flow for admin panels, internal tools, or rapid prototyping with pure Java.

2. **Keep endpoints stateless** — `@BrowserCallable` services should not store per-user state in fields. Use method parameters and return values. Inject Spring services for data access.

3. **Always add security annotations** — endpoints are denied by default. Every public method needs `@AnonymousAllowed`, `@PermitAll`, or `@RolesAllowed`. Combine with `loginRequired` and `rolesAllowed` in `ViewConfig` for defense in depth.

4. **Use signals over `useState`** — `useSignal` from `@vaadin/hilla-react-signals` provides fine-grained reactivity with less boilerplate. Reserve `useState` for cases where you need React's rendering lifecycle (e.g., transitions).

5. **Follow file naming conventions** — use `@index.tsx` for directory indices, `@layout.tsx` for layouts, `{param}.tsx` for parameters. Prefix non-route files with `_`.

6. **Handle endpoint errors** — always wrap endpoint calls in try/catch. Distinguish `EndpointValidationError` (field-level issues) from `EndpointError` (server exceptions) and network errors.

7. **Use `ViewConfig` for access control** — set `loginRequired` and `rolesAllowed` on views, and matching security annotations on endpoints. This gives both client-side route protection and server-side enforcement.

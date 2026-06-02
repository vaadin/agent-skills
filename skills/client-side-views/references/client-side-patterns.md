# Client-Side View Patterns Reference

## Routing Filename Conventions

| Filename | Route Path | Example URL |
|----------|-----------|-------------|
| `views/@index.tsx` | `/` | `http://localhost:8080/` |
| `views/about.tsx` | `/about` | `http://localhost:8080/about` |
| `views/products/@index.tsx` | `/products` | `http://localhost:8080/products` |
| `views/products/{productId}.tsx` | `/products/:productId` | `http://localhost:8080/products/42` |
| `views/search/{{query}}.tsx` | `/search/:query?` | `http://localhost:8080/search/shoes` |
| `views/{...wildcard}.tsx` | `/*` | `http://localhost:8080/anything/here` |
| `views/@layout.tsx` | — | Wraps sibling/child views |
| `views/_helpers.tsx` | — | Ignored by router |

## ViewConfig Properties

| Property | Type | Description |
|----------|------|-------------|
| `title` | `string` | Page title (browser tab + default menu label) |
| `route` | `string` | Override file-path route |
| `loginRequired` | `boolean` | Require authentication |
| `rolesAllowed` | `readonly string[]` | Restrict to roles |
| `skipLayouts` | `boolean` | Skip parent `@layout.tsx` wrappers |
| `menu.title` | `string` | Menu label (defaults to `title`) |
| `menu.icon` | `string` | Icon identifier (e.g., `vaadin:dashboard`) |
| `menu.order` | `number` | Sort position in auto-generated menu |
| `menu.exclude` | `boolean` | Hide from auto-generated menu |
| `detail` | `T` | Custom metadata (generic type) |

## @BrowserCallable Endpoint Template

### Java

```java
package com.example.services;

import com.vaadin.flow.server.auth.AnonymousAllowed;
import com.vaadin.hilla.BrowserCallable;
import jakarta.annotation.security.RolesAllowed;
import jakarta.validation.Valid;
import jakarta.annotation.Nonnull;
import java.util.List;

@BrowserCallable
@AnonymousAllowed
public class ItemService {
    private final ItemRepository repository;

    public ItemService(ItemRepository repository) {
        this.repository = repository;
    }

    public @Nonnull List<@Nonnull Item> findAll() {
        return repository.findAll();
    }

    public Item findById(@Nonnull Long id) {
        return repository.findById(id).orElse(null);
    }

    @RolesAllowed("ADMIN")
    public @Nonnull Item save(@Valid @Nonnull Item item) {
        return repository.save(item);
    }

    @RolesAllowed("ADMIN")
    public void delete(@Nonnull Long id) {
        repository.deleteById(id);
    }
}
```

### TypeScript (calling the generated client)

```tsx
import { ItemService } from 'Frontend/generated/endpoints';
import type Item from 'Frontend/generated/com/example/Item';
import { useSignal } from '@vaadin/hilla-react-signals';
import { useEffect } from 'react';

export default function ItemListView() {
  const items = useSignal<Item[]>([]);

  useEffect(() => {
    ItemService.findAll().then(data => {
      items.value = data;
    });
  }, []);

  return (
    <ul>
      {items.value.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
```

## Security Annotations Reference

| Annotation | Scope | Effect |
|------------|-------|--------|
| `@DenyAll` | Class or method | Blocks all access (default) |
| `@AnonymousAllowed` | Class or method | No authentication required |
| `@PermitAll` | Class or method | Any authenticated user |
| `@RolesAllowed("ADMIN")` | Class or method | Users with specified roles |

Method-level annotations override class-level annotations.

## Reactive Subscription Template

### Java (Flux endpoint)

```java
@BrowserCallable
public class LiveDataService {

    @PermitAll
    public Flux<@Nonnull DataUpdate> streamUpdates() {
        return Flux.interval(Duration.ofSeconds(1))
                .onBackpressureDrop()
                .map(i -> fetchLatestData());
    }

    @PermitAll
    public EndpointSubscription<@Nonnull DataUpdate> streamUpdatesCancellable() {
        return EndpointSubscription.of(streamUpdates(), () -> {
            // cleanup on unsubscribe
        });
    }
}
```

### TypeScript (subscribing)

```tsx
import { LiveDataService } from 'Frontend/generated/endpoints';
import type { Subscription } from '@vaadin/hilla-frontend';

const subRef = useSignal<Subscription<DataUpdate> | undefined>(undefined);

function startStream() {
  subRef.value = LiveDataService.streamUpdatesCancellable()
    .onNext(data => { /* handle update */ })
    .onError(err => console.error('Stream error:', err))
    .onComplete(() => console.log('Stream ended'));
}

function stopStream() {
  subRef.value?.cancel();
  subRef.value = undefined;
}
```

### Subscription API

| Method | Purpose |
|--------|---------|
| `onNext(callback)` | Handle each pushed value |
| `onError(callback)` | Handle stream errors |
| `onComplete(callback)` | Called when stream ends |
| `cancel()` | Stop the subscription |
| `onSubscriptionLost(callback)` | Handle reconnection (return `RESUBSCRIBE` or `REMOVE`) |
| `onConnectionStateChange(callback)` | Track `CONNECTING`, `CONNECTED`, `CLOSED` states |

## Common Vaadin React Component Imports

```tsx
import { Button } from '@vaadin/react-components/Button.js';
import { TextField } from '@vaadin/react-components/TextField.js';
import { Grid } from '@vaadin/react-components/Grid.js';
import { GridColumn } from '@vaadin/react-components/GridColumn.js';
import { Dialog } from '@vaadin/react-components/Dialog.js';
import { ComboBox } from '@vaadin/react-components/ComboBox.js';
import { AppLayout } from '@vaadin/react-components/AppLayout.js';
import { SideNav } from '@vaadin/react-components/SideNav.js';
import { SideNavItem } from '@vaadin/react-components/SideNavItem.js';
import { Icon } from '@vaadin/react-components/Icon.js';
import { Notification } from '@vaadin/react-components/Notification.js';
import { FormLayout } from '@vaadin/react-components/FormLayout.js';
import { DatePicker } from '@vaadin/react-components/DatePicker.js';
import { ProgressBar } from '@vaadin/react-components/ProgressBar.js';
import { DrawerToggle } from '@vaadin/react-components/DrawerToggle.js';
```

## Error Handling Template

```tsx
import { EndpointError, EndpointValidationError } from '@vaadin/hilla-frontend';

async function callEndpoint<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof EndpointValidationError) {
      // Bean Validation failure — per-field errors
      for (const err of e.validationErrorData) {
        console.error(`${err.parameterName}: ${err.message}`);
      }
    } else if (e instanceof EndpointError) {
      // Server threw EndpointException — e.type, e.message
      console.error(`Server error [${e.type}]: ${e.message}`);
    } else {
      // Network error or unexpected failure
      console.error('Request failed:', e);
    }
    return undefined;
  }
}
```

## Anti-Patterns

### Calling endpoints without error handling

```tsx
// BAD: unhandled rejection if server is down or validation fails
const data = await ItemService.findAll();

// GOOD: wrap in try/catch
try {
  const data = await ItemService.findAll();
} catch (e) {
  // handle EndpointError, EndpointValidationError, network errors
}
```

### Missing security annotations on endpoints

```java
// BAD: method is denied by default — clients get 403
@BrowserCallable
public class OpenService {
    public List<Item> findAll() { // no security annotation!
        return repo.findAll();
    }
}

// GOOD: explicit annotation
@BrowserCallable
@AnonymousAllowed  // or @PermitAll, @RolesAllowed
public class OpenService {
    public List<Item> findAll() {
        return repo.findAll();
    }
}
```

### Storing per-user state in endpoint fields

```java
// BAD: @BrowserCallable is a Spring singleton — shared across all users
@BrowserCallable
public class CartService {
    private List<Item> cart = new ArrayList<>(); // shared state!
}

// GOOD: use method parameters or inject a session/user-scoped bean
@BrowserCallable
public class CartService {
    private final CartRepository repo;
    // ...
    public List<Item> getCart(@Nonnull String userId) {
        return repo.findByUserId(userId);
    }
}
```

### Securing only the view but not the endpoint

```tsx
// BAD: ViewConfig restricts the route, but endpoint is @AnonymousAllowed
export const config: ViewConfig = { rolesAllowed: ['ADMIN'] };

// GOOD: match endpoint security to view security
// Java: @RolesAllowed("ADMIN") on the endpoint method
// TSX:  rolesAllowed: ['ADMIN'] in ViewConfig
```

### Using a custom routes.tsx that ignores file-based routing

```
// BAD: custom routes.tsx with manual route list — files in views/ are ignored
//      but still processed, causing confusion

// GOOD: either remove custom routes.tsx to use file-based routing,
//       or integrate file routes into your custom routes.tsx
```

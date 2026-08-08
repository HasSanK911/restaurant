# Migration Guide — JSON Server to Laravel

This is the front-end side of the swap. [`BACKEND_PLAN.md`](./BACKEND_PLAN.md) specifies the Laravel
application; this document lists precisely what changes in the Angular codebase, file by file.

**The headline: the Angular app was built for this.** Every network call goes through one service,
every endpoint path is a constant, and every model is already the shape the Laravel API should
return. Most of the migration is a base-URL change and deleting the mock-auth shim.

---

## 0. What actually has to change

| Area | Effort | Files |
|---|---|---|
| Environment / base URL | 10 minutes | `src/environments/*` |
| Pagination envelope | 30 minutes | `api.service.ts` (one function) |
| Authentication | Half a day | `auth.service.ts`, `api.interceptor.ts`, `app.config.ts` |
| Coupon validation | 1 hour | `cart.service.ts`, `cart.page.ts`, `checkout.page.ts` |
| Reservation availability | 1 hour | `reservation.service.ts` |
| Order status transitions | 1 hour | `order.service.ts` |
| Inventory movements | 1 hour | `admin.service.ts` |
| Image URLs | 1 hour | `image.component.ts` (possibly nothing) |
| Realtime (optional) | 1 day | `kitchen.page.ts`, `track-order.page.ts`, `kitchen-queue.page.ts` |
| Prerender build | 15 minutes | `scripts/build.mjs` |

**Nothing in `src/app/features/**` changes.** Not one page component. That is the point of the
service layer.

---

## 1. Environment configuration

Three environment files exist:

| File | Used by | `apiUrl` | `siteUrl` |
|---|---|---|---|
| `environment.ts` | `ng serve` | `http://localhost:3000` | `http://localhost:4200` |
| `environment.demo.ts` | `npm run build` | `http://localhost:3000` | `https://salateenrestaurant.pk` |
| `environment.prod.ts` | `npm run build:laravel` | `https://api.salateenrestaurant.pk/api/v1` | `https://salateenrestaurant.pk` |

**Steps**

1. Point `environment.prod.ts.apiUrl` at the real API.
2. Set `useMockAuth: false` (this flag exists so you can grep for every mock-auth code path).
3. Change `environment.ts.apiUrl` to your local Laravel URL (e.g. `http://salateen.test/api/v1`)
   when you stop using JSON Server for development.
4. Build with `npm run build:laravel`. Delete `environment.demo.ts` and the `laravel` configuration
   in `angular.json` once JSON Server is gone, and rename `laravel` back to `production`.

---

## 2. API endpoint mapping

Every path lives in `src/app/core/constants/api.constants.ts`. JSON Server's resource names were
chosen to match a conventional Laravel `apiResource` layout, so most need no change at all.

| Constant | JSON Server | Laravel | Change? |
|---|---|---|---|
| `restaurant` | `/restaurant` | `/restaurant` | No |
| `settings` | `/settings` | `/settings` | No |
| `categories` | `/categories` | `/categories` | No |
| `menu` | `/menu` | `/menu` | No |
| `banners` `offers` `chefs` | same | same | No |
| `reservations` `orders` | same | same | No |
| `deliveryAreas` | `/deliveryAreas` | `/delivery-areas` | **Yes** |
| `inventoryLogs` | `/inventoryLogs` | `/inventory/logs` | **Yes** |
| `cateringPackages` | `/cateringPackages` | `/catering-packages` | **Yes** |
| `contactMessages` | `/contactMessages` | `/contact-messages` | **Yes** |
| `menuImages` | `/menuImages` | *(gone — media is embedded in the item)* | **Delete** |
| `dashboardStats` | `/dashboardStats` | `/admin/dashboard` | **Yes** |
| `analytics` | `/analytics` | `/admin/analytics` | **Yes** |
| `systemLogs` | `/systemLogs` | `/admin/logs` | **Yes** |
| `customers` | `/customers` | *(gone — `/admin/users?role=customer`)* | **Delete** |

Admin-only resources move under `/admin`: `inventory`, `suppliers`, `staff`, `users`, `roles`,
`permissions`, `coupons`, `tables`.

```ts
// api.constants.ts — after
export const API = {
  restaurant: '/restaurant',
  settings: '/settings',
  categories: '/categories',
  menu: '/menu',
  deliveryAreas: '/delivery-areas',
  cateringPackages: '/catering-packages',
  contactMessages: '/contact-messages',
  // admin
  inventory: '/admin/inventory',
  inventoryLogs: '/admin/inventory/logs',
  suppliers: '/admin/suppliers',
  users: '/admin/users',
  roles: '/admin/roles',
  dashboardStats: '/admin/dashboard',
  analytics: '/admin/analytics',
  systemLogs: '/admin/logs',
  // ...
} as const;
```

That is the whole endpoint migration. No feature file imports a URL string directly — grep for
`http://` under `src/app` and you will find none.

---

## 3. `ApiService` — the one real code change

`src/app/core/services/api.service.ts` normalises JSON Server's page envelope. Replace
`normalisePage` with the Laravel shape:

```ts
// BEFORE — JSON Server returns { data, items, pages }
function normalisePage<T>(res: JsonServerPage<T> | T[], page: number, perPage: number): Paginated<T> { ... }

// AFTER — Laravel returns { data, meta: { total, page, perPage, totalPages } }
interface LaravelPage<T> {
  data: T[];
  meta: { total: number; page: number; perPage: number; totalPages: number };
}

function normalisePage<T>(res: LaravelPage<T>, page: number, perPage: number): Paginated<T> {
  return {
    items: res.data,
    total: res.meta?.total ?? res.data.length,
    page: res.meta?.page ?? page,
    perPage: res.meta?.perPage ?? perPage,
    totalPages: res.meta?.totalPages ?? 1,
  };
}
```

Also update `all()` and `get()` to unwrap the `{ data: ... }` envelope:

```ts
all<T>(path: string, params?: QueryParams): Observable<T[]> {
  return this.http
    .get<{ data: T[] }>(this.url(path), { params: this.buildParams(params) })
    .pipe(map((res) => res.data));
}

get<T>(path: string, params?: QueryParams): Observable<T> {
  return this.http
    .get<{ data: T }>(this.url(path), { params: this.buildParams(params) })
    .pipe(map((res) => res.data));
}
```

Do the same for `byId`, `post`, `put`, `patch`. **Everything above `ApiService` is unaffected.**

### Query parameter names

`buildParams` currently forwards JSON Server's `_sort`, `_page`, `_per_page`. Laravel should accept
`sort`, `order`, `page`, `perPage`. Rename in the calling services (a mechanical find-and-replace of
`_sort` → `sort`, `-createdAt` → `sort=createdAt&order=desc`), or — simpler — have Laravel accept
the underscore-prefixed names as aliases for one release and clean up afterwards.

### `byField` disappears

```ts
// BEFORE — JSON Server has no /menu/{slug} route
this.api.byField<MenuItem>(API.menu, 'slug', slug)

// AFTER — Laravel route-model binding
this.api.byId<MenuItem>(API.menu, slug)
```

Affects `menu.service.ts`, `content.service.ts` (blogs, offers, jobs), `order.service.ts`
(`byReference`) and `reservation.service.ts` (`byReference`). Six call sites; delete `byField`
afterwards.

---

## 4. Authentication

This is the largest change and the most important. **`src/app/core/services/auth.service.ts` is a
demo shim**: it compares passwords in the browser against `db.json` and mints a base64 "token".
It carries a warning comment saying exactly that. Delete its body, keep its public surface.

### What must not change

The signals and methods every component depends on:

```ts
readonly session, user, isAuthenticated, role, isAdminSide, isCustomer, initials
can(permission), canAny(permissions), hasRole(...roles)
login(payload), register(payload), logout(), refresh()
updateProfile(patch), changePassword(current, next), toggleFavourite(id)
```

Keep all of these. Only the implementations change.

### After (Sanctum SPA / cookie mode)

```ts
login({ email, password }: LoginPayload): Observable<AuthSession> {
  return this.http.get('/sanctum/csrf-cookie').pipe(
    switchMap(() => this.api.post<AuthSession>('/auth/login', { email, password })),
    tap((session) => this._session.set(session)),
  );
}

logout(): void {
  this.api.post('/auth/logout', {}).subscribe({
    complete: () => this._session.set(null),
    error: () => this._session.set(null),   // clear locally even if the call fails
  });
}

refresh(): Observable<AuthUser | null> {
  return this.api.get<AuthSession>('/auth/me').pipe(
    tap((session) => this._session.set(session)),
    map((session) => session.user),
    catchError(() => { this._session.set(null); return of(null); }),
  );
}
```

### Session persistence

The demo writes the whole session to `localStorage` (`STORAGE_KEYS.session`). With cookie-based
Sanctum, **stop doing that**:

1. Remove the `effect()` in the `AuthService` constructor that persists the session.
2. Remove the `storage.get(...)` initialiser.
3. On app start, call `refresh()` once — see below.

Restoring the session on boot, in `app.config.ts`:

```ts
provideAppInitializer(() => {
  const auth = inject(AuthService);
  return firstValueFrom(auth.refresh().pipe(catchError(() => of(null))));
}),
```

> Guard against this delaying first paint. Public pages do not need the session; if the extra
> round trip is noticeable, call `refresh()` from the public layout instead of blocking bootstrap.

### The interceptor

`src/app/core/interceptors/api.interceptor.ts` currently attaches
`Authorization: Bearer <fake token>`. For cookie mode, replace that with credentials:

```ts
const request = isApiCall
  ? req.clone({
      withCredentials: true,            // <- send the Sanctum cookie
      setHeaders: { Accept: 'application/json' },
    })
  : req;
```

Add a 401 handler that clears the session and redirects to login:

```ts
catchError((error: unknown) => {
  const apiError = toApiError(error);
  if (apiError.status === 401 && !request.url.includes('/auth/')) {
    inject(AuthService).logout();
    inject(Router).navigate(['/auth/login']);
  }
  // ...existing toast handling
})
```

### Passwords in `db.json`

`User.password` exists in the model **only** because JSON Server has no auth layer. Delete the field
from `src/app/core/models/user.model.ts` and from the admin users form
(`src/app/features/admin/people.pages.ts`, the `AdminUsersPage` field list) once Laravel handles
credentials. It is already commented as demo-only.

### Forgot password

`src/app/features/auth/forgot-password.page.ts` is UI-complete and honest about being a stub — it
shows an amber notice saying no email is sent. Wire it to
`POST /auth/forgot-password`, remove the `setTimeout` simulation, and delete the notice block.

---

## 5. Business logic that must move server-side

These three were implemented client-side because JSON Server cannot compute. Each is marked with a
comment in the source explaining why.

### 5.1 Coupon validation — `cart.service.ts`

```ts
// BEFORE — validated in the browser, trivially bypassed
applyCoupon(coupon: Coupon | undefined, customerId: ID | null): CouponValidation { ...50 lines... }

// AFTER
applyCoupon(code: string): Observable<CouponValidation> {
  return this.api.post<CouponValidation>('/coupons/validate', {
    code,
    subtotal: this.subtotal(),
    items: this.toOrderItems().map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
  }).pipe(
    tap((result) => {
      if (result.valid && result.coupon) {
        this.appliedCoupon.set(result.coupon);
        this.couponFreeDelivery.set(result.freeDelivery);
      }
    }),
  );
}
```

Callers: `cart.page.ts` (`applyCoupon()`) and `checkout.page.ts`. Both already handle an
Observable-shaped result from `ContentService.couponByCode`, so the change is small. Delete
`computeDiscount()` from `cart.service.ts` and let `discount` come from the server response.

### 5.2 Reservation availability — `reservation.service.ts`

```ts
// BEFORE — forkJoin of tables + bookings, computed in the browser (races)
availability(date, zone, guests): Observable<AvailabilitySlot[]> { ...30 lines... }

// AFTER
availability(date: IsoDate, zone: TableZone, guests: number): Observable<AvailabilitySlot[]> {
  return this.api.get<AvailabilitySlot[]>('/reservations/availability', { date, zone, guests });
}
```

The return shape is unchanged, so `reservation.page.ts` needs no edit. Delete `SLOT_TIMES`,
`minutes()` and `HOLDS_TABLE` from the service — the server owns them now.

### 5.3 Order status transitions — `order.service.ts`

```ts
// BEFORE — read then write, two requests, lost-update race
updateStatus(id, status, note?, byName?): Observable<Order> {
  return this.byId(id).pipe(switchMap((order) => this.api.patch(...)));
}

// AFTER — one transactional endpoint
updateStatus(id: ID, status: OrderStatus, note?: string): Observable<Order> {
  return this.api.post<Order>(`${API.orders}/${id}/status`, { status, note });
}
```

`byName` disappears — the server knows who is authenticated. Remove the argument at its four call
sites (`admin/orders.page.ts`, `admin/order-detail.page.ts`, `admin/kitchen-queue.page.ts`,
`kitchen/kitchen.page.ts`); each passes `this.auth.user()?.name` today.

Also delete `generateReference()` from `order.service.ts`. The server assigns the reference; `place()`
stops sending one.

### 5.4 Order totals — `checkout.page.ts`

The demo sends `subtotal`, `discount`, `deliveryFee`, `tax` and `grandTotal` in the create payload
because JSON Server stores whatever it is given. **Laravel must ignore all of them** and recompute
from `items` (see BACKEND_PLAN §7). You can leave the client sending them — the server discards them
— or trim `PlaceOrderPayload` down to `items`, `fulfilment`, `paymentMethod`, contact details,
address and coupon code. Trimming is cleaner; either is safe once the server recomputes.

### 5.5 Inventory movements — `admin.service.ts`

```ts
// BEFORE — forkJoin of a PATCH and a POST, not atomic
recordMovement(item, movement, quantityChange, performedByName, note?) { forkJoin({...}) }

// AFTER
recordMovement(itemId: ID, movement: InventoryMovement, quantityChange: number, note?: string) {
  return this.api.post(`${API.inventory}/${itemId}/movement`, { movement, quantityChange, note });
}
```

Caller: `admin/inventory.page.ts`. `performedByName` is dropped — the server uses the authenticated
user.

---

## 6. Model changes

Almost none. The models in `src/app/core/models/` were written as the API contract.

| Model | Change |
|---|---|
| `User` | Delete `password` |
| `AuthSession` | Delete `token` if using cookie mode |
| `Order` | `timeline` may arrive as `statusEvents`; either rename in the model or alias in the API Resource — **prefer aliasing server-side** |
| `MenuItem` | `image` and `gallery` become absolute CDN base paths (see §8) |
| Everything else | Unchanged |

`ID` is already `string` throughout, so numeric Laravel primary keys are fine as long as the API
Resource casts them (`(string) $this->id`) — or leave them numeric and widen `ID` to
`string | number`. Casting server-side is tidier.

---

## 7. Error handling

`toApiError()` in `api.interceptor.ts` already parses `{ message, errors }`, which is Laravel's
default validation shape. Two additions:

1. **422 handling.** Map `errors` onto reactive form controls instead of only showing a toast:

```ts
// in a page component's error callback
if (apiError.status === 422 && apiError.errors) {
  for (const [field, messages] of Object.entries(apiError.errors)) {
    this.form.get(field)?.setErrors({ server: messages[0] });
  }
}
```
`FieldComponent` already renders an unknown error as "Please check this field." Add a `server` case
to its `errorMessage` computed to show the server's own wording.

2. **419 (CSRF token mismatch)** with Sanctum SPA mode: re-fetch `/sanctum/csrf-cookie` and retry
   once. Add it to the existing `retry` block.

The demo's "we could not reach the API, start it with `npm run api`" message in `toApiError()`
should be replaced with a generic connectivity message before go-live.

---

## 8. Images

`ImageComponent` builds `srcset` from a **base path with no suffix or extension**:

```
{base}-sm.webp   400w
{base}-md.webp   800w
{base}.webp     1600w
{base}-blur.webp  24w
```

Two options:

- **Keep the convention.** Have Media Library conversions produce those exact suffixes and return the
  base path. No client change at all. Recommended.
- **Change to explicit URLs.** Return `{ sm, md, lg, blur }` per image, add an `ImageSet` model, and
  rewrite `ImageComponent`'s three computed signals. More work, no benefit.

If image paths become absolute (`https://cdn...`), `ImageComponent` needs no change — it only strips
a trailing extension and appends suffixes.

**Do write a test for this.** A mismatch here silently breaks every image on the site.

---

## 9. Realtime (optional, do it last)

Three screens poll today. Each has a comment saying so and pointing at this section.

| File | Interval | What it polls |
|---|---|---|
| `features/kitchen/kitchen.page.ts` | 10s | `kitchenQueue()` |
| `features/admin/kitchen-queue.page.ts` | 15s | `kitchenQueue()` |
| `features/checkout/track-order.page.ts` | 20s | `track()` while an order is live |

Replacing with Laravel Echo:

```ts
// kitchen.page.ts
private readonly echo = inject(EchoService);

constructor() {
  this.echo.private('kitchen')
    .listen('.order.status.changed', () => this.reload.update((n) => n + 1));
}
```

Keep the poll as a fallback at a long interval (60s). Websockets drop; a kitchen display that
silently stops updating is worse than one that updates slowly.

**Ship polling first.** At this scale it is genuinely fine, and it removes a whole class of
deployment complexity from the initial launch.

---

## 10. Prerendering

`src/app/app.routes.server.ts` prerenders 101 routes and enumerates dynamic slugs with
`getPrerenderParams`, which currently **reads `db.json` off disk**:

```ts
// BEFORE
const raw = await readFile(candidate, 'utf8');
const db = JSON.parse(raw);
return db[collection].filter(r => r.slug).map(r => ({ [paramName]: r.slug }));

// AFTER
const response = await fetch(`${process.env.API_URL}/${collection}`);
const { data } = await response.json();
return data.filter((r) => r.slug).map((r) => ({ [paramName]: r.slug }));
```

And `scripts/build.mjs` — which starts JSON Server so prerendering has data — becomes:

```js
// Delete the spawn/waitForApi block entirely and just run:
//   API_URL=https://api.salateenrestaurant.pk/api/v1 ng build --configuration laravel
```

> **This matters more than it looks.** Prerendering runs the app for real and makes the same HTTP
> calls the browser would. If the API is unreachable at build time, all 101 pages ship as empty
> shells that look fine until you view source. The current build script exists specifically to
> prevent that, and it caught the problem during development. Keep an equivalent guard.

Verify after any build:

```bash
grep -c 'ld+json' dist/salateen-restaurant/browser/menu/kabuli-pulao/index.html   # expect > 0
grep -o '<title>[^<]*' dist/salateen-restaurant/browser/menu/kabuli-pulao/index.html
```

---

## 11. Things to delete once Laravel is live

- `db.json` and `scripts/seed.mjs`, `scripts/seed-catalogue.mjs`
- `json-server` and `concurrently` from `devDependencies`
- The `api`, `seed`, `seed:reset` npm scripts
- `environment.demo.ts` and the `laravel` build configuration (rename it to `production`)
- The spawn block in `scripts/build.mjs`
- `ApiService.byField()`
- `AuthService`'s mock implementation and `environment.useMockAuth`
- `User.password`
- `computeDiscount()` in `cart.service.ts`
- `SLOT_TIMES` / `minutes()` in `reservation.service.ts`
- `generateReference()` in `order.service.ts`
- The "start the demo API" copy in `features/errors/server-error.page.ts`
- The demo-credentials panel in `features/auth/auth-layout.component.ts` **(do not forget this one —
  it lists working admin credentials)**

---

## 12. Testing checklist

**Before merging the migration**

- [ ] Every page loads with the Laravel API and no console errors
- [ ] Guest checkout end to end, order appears in admin with correct totals
- [ ] Authenticated checkout, order appears under `/account/orders`
- [ ] Order tracking by reference **and** by phone number
- [ ] Coupon: valid, expired, below minimum, usage limit reached, unknown code
- [ ] **Server ignores a tampered `grandTotal`** — send `1` and confirm the stored order is correct
- [ ] Reservation booking, availability reflects an existing booking, double-booking rejected
- [ ] Manager confirms and rejects a reservation; the customer view updates
- [ ] Order advances through every status; illegal jumps rejected with 422
- [ ] Inventory movement updates the balance and writes a log, atomically
- [ ] Inventory movement that would go negative is rejected with a readable message
- [ ] Login, logout, session survives a refresh, 401 redirects to login
- [ ] A `manager` cannot open `/admin/users`; a `kitchen` account cannot open `/admin/settings`
- [ ] Validation errors appear next to the correct fields, not only as a toast
- [ ] Images render at all four sizes; check the network tab for 404s on `-sm`/`-md`/`-blur`

**Production checklist**

- [ ] `npm run build:laravel` with `API_URL` pointing at staging
- [ ] Prerendered pages contain real content (`grep ld+json`, check `<title>`)
- [ ] Canonical URLs use the production domain, not localhost
- [ ] `sitemap.xml` regenerated and reachable at `/sitemap.xml`
- [ ] `robots.txt` still disallows `/admin`, `/account`, `/checkout`, `/kitchen`
- [ ] Lighthouse on `/`, `/menu`, `/menu/kabuli-pulao`: performance and SEO both ≥ 90
- [ ] Structured data passes the Rich Results Test (Restaurant, Menu, FAQPage, Article, Breadcrumb)
- [ ] Open Graph card renders correctly when a link is pasted into WhatsApp
- [ ] SSR server supervised and restarting on deploy
- [ ] Error tracking receiving events from both Angular and Laravel
- [ ] **The demo credentials panel is gone from the login page**
- [ ] Menu prices verified against the current printed card by the client, not by the developer

---

## 13. Suggested migration order

1. **Read-only first.** Point `apiUrl` at Laravel with only the public GET endpoints implemented.
   The whole marketing site, menu and gallery will work. Everything else fails visibly and safely.
2. **Auth.** Swap `AuthService` and the interceptor. Account pages come alive.
3. **Orders.** Checkout, tracking, admin orders, kitchen. This is the revenue path — test it hardest.
4. **Reservations.** Independent of orders; can run in parallel.
5. **Admin CRUD.** Mostly free, since `ResourcePageComponent` drives twenty screens from one
   component and only the service call changes.
6. **Inventory, reports, notifications.** Internal; slipping here does not affect customers.
7. **Realtime.** Last, and optional.

Each step is independently shippable. There is no big-bang cutover, and at no point does the site
need to be down.

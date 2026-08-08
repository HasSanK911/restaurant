# Backend Plan — Salateen Restaurant Swabi (Laravel 12)

This document specifies the Laravel backend that replaces the JSON Server demo. It is written so a
Laravel developer can start on day one without guessing: every table, column, relationship,
endpoint, validation rule and business rule below already has a corresponding shape in the Angular
client and in `db.json`.

**Read this alongside [`MIGRATION_GUIDE.md`](./MIGRATION_GUIDE.md)**, which covers the front-end side
of the swap.

---

## 0. Context you need before you start

| Fact | Consequence for the backend |
|---|---|
| **Cash only.** No cards, no wallets, no gateway. | There is no `payments` table and no gateway integration. `payment_method` is an enum of two cash options. Section 16 covers the future gateway without building it now. |
| **One location today**, Mardan and Topi planned. | Schema is single-tenant but every operational table carries `branch_id` from day one (nullable, defaulting to the flagship). Retrofitting it later is expensive. |
| **Prices come off a printed menu card.** | `menu_items` prices are authored by staff, never computed. Half/full-kilo pricing is modelled as variants, not as a unit price times a quantity. |
| **Portions are shared.** A "Grand Platter" serves ten. | `menu_variants.serves` is a real column the UI shows. Do not drop it as decoration. |
| **The kitchen is the bottleneck**, not the website. | Order state transitions must be cheap, auditable and broadcastable. Everything else can be slower. |
| **Staff are not technical.** | Validation messages must be plain language. Destructive actions need soft deletes. |

---

## 1. Stack and conventions

- **Laravel 12**, PHP 8.3+
- **MySQL 8** (or MariaDB 11). Use `utf8mb4_unicode_ci`; the menu carries Urdu text.
- **Laravel Sanctum** for authentication (SPA cookie mode preferred, token mode supported).
- **Spatie Laravel Permission** for roles and permissions — the Angular client already models
  `roles.permissions` as a flat array of `module.action` strings, which maps directly.
- **Laravel Horizon + Redis** for queues.
- **Laravel Reverb** (or Pusher) for broadcasting.
- **Spatie Media Library** for image uploads and conversions.
- **Laravel Scout** only if menu search outgrows `LIKE` (unlikely at 45 items).

**Conventions**

- Table names: snake_case plural. Columns: snake_case.
- **The API responds in camelCase.** The Angular models are camelCase and changing them would touch
  every component. Use an API Resource layer (Section 6) or a global response transformer. Do not
  ask the front end to absorb this.
- Timestamps as ISO-8601 UTC strings (`->toIso8601String()`). The client parses with `new Date()`.
- Money as **integer PKR**. Pakistan has no circulating subunit; storing decimals invites rounding
  bugs. Column type `unsignedInteger`.
- Every table gets `created_at`, `updated_at`. Operational tables also get `deleted_at`.

---

## 2. Entity relationship overview

```
users ──< addresses
  │  └──< orders ──< order_items ──< order_item_addons
  │         └──< order_status_events
  │         └──> delivery_areas
  │         └──> coupons (nullable)
  ├──< reservations ──> tables
  ├──< reviews ──> menu_items
  └──> roles ──< permissions            (Spatie pivot tables)

categories ──< menu_items ──< menu_variants
                   │        └──< menu_item_addons ──> addons
                   └──< menu_item_media

suppliers ──< inventory_items ──< inventory_logs
                                      └──> users (performed_by)

staff_members ──> users (nullable)

banners · offers · coupons · chefs · testimonials · gallery_images
blog_posts · faqs · contact_messages · events · catering_packages
job_openings · branches · notifications · activity_log · settings
```

**The three relationships that matter most**

1. `orders → order_items` is a **snapshot**, not a join. Order items copy the dish name, variant
   label, image path and unit price at the moment of ordering. When the client raises the price of
   Mutton Karahi, last month's orders must not change. `menu_item_id` is kept as a nullable
   reference for analytics only, and is `nullOnDelete`.
2. `orders → order_status_events` is the audit trail the customer sees on the tracking page and the
   manager sees in the admin. Never mutate `orders.status` without appending an event.
3. `inventory_items → inventory_logs` is double-entry-flavoured: the log is the truth, the item's
   `quantity` is a cached balance. Both are written inside one transaction (Section 12).

---

## 3. Database schema

### 3.1 Identity and access

**`users`**

| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| name | string(120) | |
| email | string(180) unique | |
| phone | string(20) unique | Normalised to `03XXXXXXXXX` before persisting |
| password | string | bcrypt |
| avatar_path | string nullable | |
| is_active | boolean default true | Deactivated accounts cannot log in |
| loyalty_points | unsignedInteger default 0 | 1 point per Rs 100 spent |
| preferences | json | `{marketingEmails, orderUpdates, smsAlerts, language}` |
| email_verified_at | timestamp nullable | |
| last_login_at | timestamp nullable | |
| branch_id | FK nullable | Staff accounts belong to a branch |
| timestamps, softDeletes | | |

> **Phone is the real identifier in this market.** Many customers have no email. Make `email`
> nullable in a later migration if the client asks; the Angular register form already treats email as
> the login field, so coordinate before changing it.

**`addresses`**

`id, user_id FK cascade, label, line1, line2 nullable, area, city, landmark nullable, phone nullable, latitude nullable, longitude nullable, is_default boolean, timestamps, softDeletes`

Enforce "exactly one default per user" in an observer, not in the database.

**Roles and permissions** — use Spatie's `roles`, `permissions`, `model_has_roles`,
`role_has_permissions`. Seed exactly these roles:

| Role | Permissions |
|---|---|
| `admin` | all |
| `manager` | everything except `users.*`, `roles.*`, `logs.*` |
| `staff` | `dashboard.view`, `orders.{view,create,update}`, `reservations.{view,create,update}`, `menu.view`, `customers.view` |
| `kitchen` | `kitchen.{view,update}`, `orders.{view,update}`, `menu.view`, `inventory.view` |
| `rider` | `orders.{view,update}` |
| `customer` | none (storefront only) |

Permission keys are `module.action` where module ∈ {dashboard, orders, kitchen, reservations, menu,
categories, offers, coupons, inventory, customers, staff, users, roles, reviews, content, reports,
settings, logs} and action ∈ {view, create, update, delete}. **The Angular admin sidebar filters on
these exact strings** — see `src/app/core/constants/navigation.constants.ts`.

### 3.2 Catalogue

**`categories`**
`id, slug unique, name, name_urdu nullable, description text, image_path, icon, sort_order, is_active, is_featured, seo_title nullable, seo_description nullable, timestamps, softDeletes`

**`menu_items`**
`id, category_id FK restrict, slug unique, name, name_urdu nullable, short_description, description text, image_path, base_price unsignedInteger, compare_at_price unsignedInteger nullable, tags json, spice_level tinyint (0-3), prep_time_minutes unsignedSmallInteger, nutrition json nullable, ingredients json, allergens json, rating decimal(2,1) default 0, rating_count unsignedInteger default 0, order_count unsignedInteger default 0, is_available, is_featured, is_popular, is_new, is_chef_recommended, sort_order, seo_title nullable, seo_description nullable, timestamps, softDeletes`

- `base_price` is **derived from the default variant** — recompute it in a model observer whenever
  variants change. The client sorts and filters on it, so it must not drift.
- `rating`, `rating_count`, `order_count` are denormalised counters. Update them in the
  `ReviewObserver` and `OrderObserver`, not on read.
- Index: `(category_id, is_available, sort_order)` and `(is_featured)`.

**`menu_variants`**
`id, menu_item_id FK cascade, label, label_urdu nullable, price unsignedInteger, serves unsignedTinyInteger, is_default boolean, sort_order, timestamps`

Exactly one `is_default` per item — enforce in an observer.

**`addons`** (shared across dishes)
`id, name, price unsignedInteger, group, max_quantity unsignedTinyInteger, is_active, timestamps`

**`menu_item_addons`** pivot: `menu_item_id, addon_id, sort_order`.

**`menu_item_media`**
`id, menu_item_id FK cascade, path, alt, is_primary, sort_order, timestamps`
(Or drop this table and use Spatie Media Library collections. Either is fine; pick one.)

### 3.3 Ordering

**`orders`**

| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| reference | string(16) unique | `SLT-#####`. See Section 9 for generation |
| user_id | FK nullable, nullOnDelete | Null for guest orders — a real and common case |
| branch_id | FK | |
| customer_name, customer_phone | string | Copied even when `user_id` is set |
| customer_email | string nullable | |
| fulfilment | enum('delivery','dine-in') | |
| payment_method | enum('cash-on-delivery','cash-at-counter') | |
| status | enum(pending, accepted, preparing, ready, out-for-delivery, delivered, cancelled) | |
| subtotal, discount, delivery_fee, tax, grand_total | unsignedInteger | |
| coupon_id | FK nullable, nullOnDelete | |
| coupon_code | string nullable | Snapshot |
| delivery_area_id | FK nullable | |
| delivery_address | json nullable | Snapshot, not a FK |
| reservation_id | FK nullable | Dine-in orders linked to a booking |
| note | text nullable | |
| scheduled_for, estimated_ready_at | timestamp nullable | |
| assigned_rider_id | FK nullable → users | |
| cancel_reason | string nullable | |
| placed_via | enum('web','phone','walk-in') | Phone orders are entered by staff |
| timestamps, softDeletes | | |

Indexes: `(status, created_at)`, `(user_id, created_at)`, `(customer_phone)` — the tracking page
looks orders up by phone number, and that query must be fast.

**`order_items`**
`id, order_id FK cascade, menu_item_id FK nullable nullOnDelete, slug, name, variant_label, image_path, unit_price unsignedInteger, quantity unsignedSmallInteger, note nullable, line_total unsignedInteger, timestamps`

**`order_item_addons`**
`id, order_item_id FK cascade, name, price unsignedInteger, quantity unsignedTinyInteger`

**`order_status_events`**
`id, order_id FK cascade, status enum(...), note nullable, user_id FK nullable, created_at`

Append-only. No `updated_at`, no deletes.

**`delivery_areas`**
`id, branch_id FK, name, city, fee unsignedInteger, free_delivery_above unsignedInteger nullable, minimum_order unsignedInteger, estimated_minutes unsignedSmallInteger, landmarks json, is_active, timestamps`

**`coupons`**
`id, code string(32) unique, title, description, type enum('percentage','fixed','free-delivery'), value unsignedInteger, minimum_order unsignedInteger, max_discount unsignedInteger nullable, usage_limit unsignedInteger (0 = unlimited), used_count unsignedInteger default 0, per_customer_limit unsignedTinyInteger, starts_at, expires_at, is_active, timestamps, softDeletes`

**`coupon_redemptions`** (new — the demo has no equivalent and needs one)
`id, coupon_id FK, user_id FK nullable, order_id FK, discount_applied unsignedInteger, created_at`
Unique index on `(coupon_id, order_id)`. This is how `per_customer_limit` is actually enforced.

### 3.4 Reservations

**`tables`**
`id, branch_id FK, code string(8), zone enum('indoor','outdoor','family-hall','rooftop'), seats unsignedTinyInteger, min_guests unsignedTinyInteger, is_active, is_coming_soon, notes nullable, timestamps, softDeletes`
Unique on `(branch_id, code)`.

**`reservations`**
`id, reference string(16) unique, user_id FK nullable, branch_id FK, customer_name, customer_phone, customer_email nullable, date date, time time, guests unsignedSmallInteger, zone enum(...), table_id FK nullable, occasion nullable, note text nullable, status enum(pending, confirmed, seated, completed, rejected, cancelled, no-show), confirmed_at nullable, seated_at nullable, rejection_reason nullable, duration_minutes unsignedSmallInteger default 90, source enum('web','phone','walk-in'), timestamps, softDeletes`

Index `(date, zone, status)` — the availability query hits this constantly.

### 3.5 Inventory

**`suppliers`**
`id, name, contact_person, phone, email nullable, address text, categories json, payment_terms, rating decimal(2,1), is_active, timestamps, softDeletes`

**`inventory_items`**
`id, branch_id FK, sku string(24) unique, name, category enum(meat, poultry, seafood, vegetables, rice-grains, spices, dairy, oils, beverages, bakery, disposables, fuel), unit enum(kg, g, litre, ml, piece, packet, dozen, bundle), quantity decimal(10,2), reorder_level decimal(10,2), reorder_quantity decimal(10,2), unit_cost unsignedInteger, supplier_id FK nullable, storage_location, expiry_date date nullable, last_restocked_at nullable, is_perishable, is_active, timestamps, softDeletes`

`quantity` is decimal, not integer — the kitchen draws 0.5 kg of cardamom.

**`inventory_logs`**
`id, inventory_item_id FK, item_name (snapshot), movement enum('purchase','kitchen-consumption','wastage','return','adjustment'), quantity_change decimal(10,2) signed, quantity_after decimal(10,2), unit_cost nullable, total_cost nullable, reference nullable, related_order_id FK nullable, supplier_id FK nullable, performed_by FK → users, note nullable, created_at`

Append-only, like `order_status_events`.

### 3.6 Content and system

Straightforward tables mirroring `db.json`: `banners`, `offers`, `chefs`, `testimonials`,
`gallery_images`, `blog_posts`, `faqs`, `contact_messages`, `events`, `catering_packages`,
`job_openings`, `branches`, `reviews`, `staff_members`, `notifications`.

- `reviews`: `id, menu_item_id FK nullable, order_id FK nullable, user_id FK nullable, customer_name, rating tinyint, title, body text, images json, is_approved, reply text nullable, replied_at nullable, replied_by FK nullable, helpful_count, timestamps, softDeletes`
- `blog_posts.body` is a **light markdown subset** (`## ` headings, `- ` bullets, `*emphasis*`,
  blank-line paragraphs). The Angular `ArticleBodyPipe` renders exactly this and HTML-escapes first.
  If you switch to full markdown or a WYSIWYG, tell the front end — the pipe must change too.
- `settings`: single row, or a key/value table. The client reads one object; keep it one row.
- `activity_log`: use `spatie/laravel-activitylog` rather than a hand-rolled `system_logs` table.
  The Angular logs page reads `{level, actor, action, target, ip, meta, createdAt}` — map the Spatie
  columns into that shape in the API Resource.

---

## 4. Authentication

**Use Sanctum SPA (cookie) mode.** The Angular app is served from the same site, so cookies are
simpler and safer than storing tokens in `localStorage` (which is what the demo does, and which
should not survive migration).

### Endpoints

```
GET    /sanctum/csrf-cookie          Before the first stateful request
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout           auth:sanctum
GET    /api/v1/auth/me               auth:sanctum
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
PATCH  /api/v1/auth/profile          auth:sanctum
PATCH  /api/v1/auth/password         auth:sanctum
```

### Response shape

`/auth/me` and both auth endpoints must return this exact shape, because
`AuthService.buildSession()` consumes it:

```json
{
  "user": {
    "id": "12",
    "name": "Asad Khan",
    "email": "asad@example.com",
    "phone": "03120991116",
    "roleSlug": "customer",
    "avatar": null,
    "permissions": ["orders.view", "orders.create"]
  },
  "expiresAt": "2026-08-08T06:30:00.000Z"
}
```

`permissions` is the **flattened** list from the user's role, with `["*"]` for admins.
`AuthService.can()` checks membership in this array — resolve it server-side, do not make the
client walk a role object.

### Rules

- Rate limit `login` to 5 attempts per minute per IP **and** per email.
- Never reveal whether an email exists on `forgot-password`. Always return 200.
- Deactivated users (`is_active = false`) get a 403 with a plain message, not a 401.
- Password minimum 8 characters (matches the Angular validator). Do not add complexity rules the
  form does not enforce, or users will hit server errors the UI cannot explain.

---

## 5. API surface

Base: `/api/v1`. All responses camelCase. All list endpoints support
`?page=&perPage=&sort=&order=&search=`.

### Public (no auth)

| Method | Path | Notes |
|---|---|---|
| GET | `/restaurant` | Singleton profile |
| GET | `/settings` | Public settings only — never expose internal flags |
| GET | `/categories` | |
| GET | `/menu` | Supports `categorySlug`, `tags[]`, `maxSpice`, `priceMax`, `availableOnly` |
| GET | `/menu/{slug}` | Route-model binding on slug |
| GET | `/banners`, `/offers`, `/offers/{slug}` | |
| GET | `/chefs`, `/testimonials`, `/gallery` | |
| GET | `/blogs`, `/blogs/{slug}` | |
| GET | `/faq`, `/events`, `/catering-packages`, `/jobs`, `/jobs/{slug}`, `/branches` | |
| GET | `/delivery-areas` | Active only |
| GET | `/menu/{id}/reviews` | Approved only |
| POST | `/coupons/validate` | Body `{code, subtotal, items[]}`. See Section 10 |
| GET | `/reservations/availability` | Query `date`, `zone`, `guests`. See Section 11 |
| POST | `/orders` | Guest checkout allowed |
| GET | `/orders/track` | Query `reference` **or** `phone`. Rate limit hard |
| POST | `/reservations` | Guest booking allowed |
| POST | `/contact-messages` | Honeypot + rate limit |

### Customer (`auth:sanctum`)

`GET /me/orders`, `GET /me/orders/{id}`, `GET /me/reservations`,
`PATCH /me/reservations/{id}/cancel`, `GET/POST/PATCH/DELETE /me/addresses`,
`GET /me/reviews`, `POST /reviews`, `GET/POST/DELETE /me/favourites`,
`GET /me/notifications`, `PATCH /me/notifications/{id}/read`, `GET /me/coupons`

### Admin (`auth:sanctum` + permission middleware)

Standard `apiResource` for: `categories`, `menu`, `offers`, `coupons`, `inventory`, `suppliers`,
`tables`, `delivery-areas`, `users`, `staff`, `roles`, `testimonials`, `gallery`, `blogs`, `faqs`.

Plus:

| Method | Path | Permission |
|---|---|---|
| GET | `/admin/dashboard` | `dashboard.view` |
| GET | `/admin/analytics` | `reports.view` |
| GET | `/admin/reports/sales` | `reports.view` |
| GET | `/admin/reports/sales.csv` | `reports.view` |
| GET | `/admin/orders` | `orders.view` |
| POST | `/admin/orders/{id}/status` | `orders.update` |
| POST | `/admin/orders/{id}/rider` | `orders.update` |
| GET | `/admin/kitchen/queue` | `kitchen.view` |
| GET | `/admin/reservations` | `reservations.view` |
| POST | `/admin/reservations/{id}/confirm` | `reservations.update` |
| POST | `/admin/reservations/{id}/reject` | `reservations.update` |
| POST | `/admin/reservations/{id}/status` | `reservations.update` |
| POST | `/admin/inventory/{id}/movement` | `inventory.update` |
| GET | `/admin/inventory/logs` | `inventory.view` |
| GET | `/admin/messages` | `content.view` |
| GET | `/admin/logs` | `logs.view` |
| PATCH | `/admin/settings` | `settings.update` |
| PATCH | `/admin/restaurant` | `settings.update` |

---

## 6. Response format

Use API Resources and a consistent envelope.

**Single**
```json
{ "data": { ... } }
```

**Collection**
```json
{
  "data": [ ... ],
  "meta": { "total": 240, "page": 1, "perPage": 15, "totalPages": 16 }
}
```

`ApiService.list()` in the Angular client already normalises both JSON Server's shape and this one —
see `normalisePage()` in `src/app/core/services/api.service.ts`. It needs a small edit; the
`MIGRATION_GUIDE` shows exactly what.

**Errors** — Laravel's default is already close to what the client expects:
```json
{ "message": "The given data was invalid.", "errors": { "customerPhone": ["Enter a Pakistani mobile number."] } }
```
`toApiError()` in `api.interceptor.ts` reads `message` and `errors`. Keep field names camelCase so
they line up with the reactive form controls.

---

## 7. Validation

Use Form Requests. The rules below mirror the Angular validators exactly — any divergence produces
errors the UI cannot render next to the right field.

**`StoreOrderRequest`**
```php
'customerName'      => ['required','string','min:3','max:120'],
'customerPhone'     => ['required','regex:/^(\+92|0092|92|0)3\d{9}$/'],
'customerEmail'     => ['nullable','email'],
'fulfilment'        => ['required','in:delivery,dine-in'],
'paymentMethod'     => ['required','in:cash-on-delivery,cash-at-counter'],
'items'             => ['required','array','min:1'],
'items.*.menuItemId'=> ['required','exists:menu_items,id'],
'items.*.variantId' => ['required','exists:menu_variants,id'],
'items.*.quantity'  => ['required','integer','min:1','max:50'],
'items.*.note'      => ['nullable','string','max:180'],
'couponCode'        => ['nullable','string','exists:coupons,code'],
'deliveryAreaId'    => ['required_if:fulfilment,delivery','exists:delivery_areas,id'],
'deliveryAddress.line1' => ['required_if:fulfilment,delivery','string','min:6','max:200'],
'note'              => ['nullable','string','max:400'],
```

**`StoreReservationRequest`**
```php
'date'   => ['required','date','after_or_equal:today','before_or_equal:'.now()->addDays(60)->toDateString()],
'time'   => ['required','date_format:H:i'],
'guests' => ['required','integer','min:1','max:20'],
'zone'   => ['required','in:indoor,outdoor,family-hall'],   // rooftop is not bookable yet
```

> **Do not trust client-side totals.** `StoreOrderRequest` accepts `items` and recalculates
> `subtotal`, `discount`, `deliveryFee` and `grandTotal` server-side from the database. The demo
> sends computed totals because JSON Server cannot do arithmetic; Laravel must ignore them. This is
> the single most important security change in the migration.

---

## 8. Business logic — where it lives

Put logic in **Action classes** (`app/Actions/...`), called from controllers. Keep controllers to
authorisation, validation and a single action call.

```
app/Actions/Orders/PlaceOrder.php
app/Actions/Orders/TransitionOrderStatus.php
app/Actions/Orders/AssignRider.php
app/Actions/Coupons/ValidateCoupon.php
app/Actions/Coupons/RedeemCoupon.php
app/Actions/Reservations/CheckAvailability.php
app/Actions/Reservations/ConfirmReservation.php
app/Actions/Inventory/RecordMovement.php
app/Actions/Reports/BuildSalesReport.php
```

---

## 9. Order lifecycle

### Reference generation

`SLT-` + a per-day sequence. Do **not** use `random_int` in a loop and check for collisions.

```php
DB::transaction(function () {
    $sequence = DB::table('order_sequences')->lockForUpdate()
        ->where('date', today())->value('next') ?? 1;
    // upsert next = sequence + 1
    return 'SLT-'.today()->format('y').str_pad($sequence, 4, '0', STR_PAD_LEFT);
});
```
Readable over the phone, unique, and no collision retry loop.

### State machine

```
pending ──> accepted ──> preparing ──> ready ──┬─> out-for-delivery ──> delivered
   │            │             │                └─> delivered            (dine-in)
   └────────────┴─────────────┴──> cancelled
```

Rules to enforce in `TransitionOrderStatus`:

- Transitions must follow the arrows. Reject a jump from `pending` to `delivered` with 422.
- `out-for-delivery` is only valid when `fulfilment = 'delivery'`.
- `delivered` and `cancelled` are terminal.
- Every transition appends an `order_status_event` **inside the same transaction** as the
  `orders.status` update. The demo does this in two writes and can lose an update; do not repeat it.
- Cancelling after `preparing` requires a `cancel_reason`. The kitchen has already spent money.
- On `delivered`: increment `menu_items.order_count`, award loyalty points, decrement inventory
  (Section 12), fire `OrderDelivered`.

### Concurrency

Two staff members can hit "Accept" at once. Wrap the transition in
`Order::whereKey($id)->lockForUpdate()->first()` inside a transaction and re-check the current status
before writing.

---

## 10. Coupon logic

`ValidateCoupon` returns the exact shape `CouponValidation` in the Angular models:

```json
{ "valid": true, "discount": 500, "freeDelivery": false, "coupon": { ... } }
{ "valid": false, "reason": "Spend at least Rs 1,000 to use this coupon.", "discount": 0, "freeDelivery": false }
```

Checks, in order (return the first failure, with a human message):

1. Code exists and `is_active`
2. `now()` between `starts_at` and `expires_at`
3. `usage_limit = 0` or `used_count < usage_limit`
4. Per-customer: `coupon_redemptions` count for this user `< per_customer_limit`
   (skip for guests, or key on phone number — decide with the client)
5. `subtotal >= minimum_order`

Discount calculation:

| Type | Discount |
|---|---|
| `percentage` | `min(round(subtotal * value / 100), max_discount ?? PHP_INT_MAX)` |
| `fixed` | `min(value, subtotal)` |
| `free-delivery` | `0`, and set `freeDelivery: true` |

**Redeem, do not just validate.** `used_count` increments and a `coupon_redemptions` row is written
inside the order transaction, not at validation time. Otherwise browsing the checkout burns coupons.

---

## 11. Reservation availability

The demo computes this in the browser, which races. Server-side:

```php
// CheckAvailability::handle(Carbon $date, string $zone, int $guests): Collection
$tables = Table::where('branch_id', $branch)
    ->where('zone', $zone)->where('is_active', true)
    ->where('is_coming_soon', false)
    ->where('seats', '>=', $guests)
    ->count();

$held = Reservation::where('date', $date)->where('zone', $zone)
    ->whereIn('status', ['pending','confirmed','seated'])
    ->get(['time']);

// For each 30-minute slot in the service window, a booking blocks the slot if
// |slotMinutes - bookingMinutes| < duration_minutes (90).
```

Return one row per slot: `{time, label, available, remainingTables}` — that is exactly what
`AvailabilitySlot` expects and what the reservation page renders.

**Confirming** must re-check availability under a lock. A slot can fill between the customer seeing
it and the manager confirming.

Reservation state machine:
```
pending ──> confirmed ──> seated ──> completed
   │            │            └──> no-show
   └──> rejected
   └──> cancelled  (customer or staff, any time before seated)
```

---

## 12. Inventory architecture

`RecordMovement` is the only way stock changes. It must be transactional:

```php
DB::transaction(function () use ($item, $movement, $change, $user, $note) {
    $item = InventoryItem::whereKey($item->id)->lockForUpdate()->first();

    $after = round($item->quantity + $change, 2);
    if ($after < 0) {
        throw ValidationException::withMessages([
            'quantity' => "There is only {$item->quantity} {$item->unit} of {$item->name} left.",
        ]);
    }

    $item->update([
        'quantity' => $after,
        'last_restocked_at' => $movement === 'purchase' ? now() : $item->last_restocked_at,
    ]);

    InventoryLog::create([...]);

    if ($after <= $item->reorder_level) {
        event(new StockRunningLow($item));
    }
});
```

**Kitchen consumption on delivery.** When an order reaches `delivered`, deduct ingredients
automatically — but only if the client wants recipe-level tracking. That needs a
`menu_item_ingredients` pivot (`menu_item_id, inventory_item_id, quantity_per_serving`) which the
demo does not model. **Discuss this with the client before building it**; many restaurants find
per-dish deduction more trouble than a nightly stock count. If they decline, keep movements manual —
the admin UI already supports that fully.

**Alerts.** A scheduled command at 07:00 and 16:00 evaluates every item and raises notifications for
`critical` (≤ 50% of reorder level), `low` (≤ reorder level) and `expiring` (≤ 3 days). Severity
thresholds are already implemented client-side in `toStockAlert()` — mirror them exactly so the two
never disagree.

---

## 13. Notifications

**Channels**

| Event | Customer | Staff |
|---|---|---|
| Order placed | SMS + email receipt | Database notification + broadcast to admin channel |
| Order accepted | SMS | — |
| Order out for delivery | SMS | — |
| Order delivered | Email asking for a review (queued, 2h delay) | — |
| Reservation requested | SMS acknowledgement | Database + broadcast |
| Reservation confirmed | SMS with reference and time | — |
| Reservation rejected | SMS + **a phone call is expected** | — |
| Stock low | — | Database notification |
| New review | — | Database notification |
| Contact message | — | Database + email to manager |

**SMS is the primary channel in this market, not email.** Many customers give no email address.

Use a Pakistani SMS gateway (Telenor Bulk SMS, Jazz, or Twilio if the client will pay for it). Wrap
it in a `SmsChannel` so the provider can change without touching notification classes. Queue every
send; never block a request on an SMS API.

Message templates should be short, plain, and include the reference:
> `Salateen: Order SLT-2210451 confirmed. Ready in about 35 minutes. Call 0312-0991116 for anything.`

---

## 14. Events, listeners and broadcasting

**Events**
`OrderPlaced`, `OrderStatusChanged`, `OrderCancelled`, `ReservationRequested`,
`ReservationConfirmed`, `StockRunningLow`, `ReviewSubmitted`, `ContactMessageReceived`

**Broadcast channels**

| Channel | Type | Who |
|---|---|---|
| `orders.{id}` | private | The customer who placed it, plus staff |
| `kitchen` | private | `kitchen`, `manager`, `admin` |
| `admin.notifications` | private | All admin-side roles |

The Angular kitchen display and tracking page currently **poll** (10s and 20s). Replacing the poll
with a websocket subscription is a small, isolated change — see the MIGRATION_GUIDE. Do the polling
first, ship it, then add Reverb. Polling at this scale is genuinely fine.

---

## 15. Queues and scheduled jobs

**Queues** (Horizon, Redis)

| Queue | Jobs |
|---|---|
| `notifications` | SMS, email |
| `media` | Image conversions on upload |
| `reports` | CSV exports, monthly rollups |
| `default` | Everything else |

**Schedule** (`routes/console.php`)

| Cadence | Job |
|---|---|
| Every 5 min | Auto-cancel `pending` orders older than 45 minutes with no staff action, and SMS the customer |
| Hourly | Mark `confirmed` reservations `no-show` 45 minutes past their time |
| 07:00, 16:00 | Stock alert sweep |
| Daily 02:00 | Rebuild `dashboard_stats` and `analytics` rollups |
| Daily 03:00 | Prune `activity_log` older than 90 days |
| Weekly | Email the manager a sales summary |

---

## 16. Payments — deliberately not built

The client takes cash only. There is **no** payment gateway in this system and the UI says so
repeatedly, including a fraud warning on the legal pages ("we never ask for card details").

If a gateway is added later, the correct seam is:

1. Add `payments` table: `id, order_id, provider, provider_reference, amount, status, raw_response json, timestamps`.
2. Add `'online'` to `orders.payment_method`.
3. Insert a `pending_payment` status **before** `accepted` in the state machine.
4. Add `POST /orders/{id}/pay` and a provider webhook endpoint.
5. On the client, `PAYMENT_METHODS` in `app.constants.ts` and the checkout radio group are the only
   places that need touching.

Do not build any of this speculatively.

---

## 17. File uploads

Use `spatie/laravel-medialibrary` on `MenuItem`, `Category`, `GalleryImage`, `BlogPost`, `Chef`,
`Offer`, `Banner`.

Conversions must match what the Angular `ImageComponent` requests — it builds
`srcset` from `-sm` (400w), `-md` (800w), base (1600w) and `-blur` (24w):

```php
$this->addMediaConversion('sm')->width(400)->format('webp')->quality(66);
$this->addMediaConversion('md')->width(800)->format('webp')->quality(72);
$this->addMediaConversion('lg')->width(1600)->format('webp')->quality(76);
$this->addMediaConversion('blur')->width(24)->blur(1)->format('webp')->quality(40);
```

Return the **base path without suffix or extension** in API responses (e.g.
`https://cdn.salateen.pk/menu/kabuli-pulao`), because the component appends `-md.webp` itself.
Getting this wrong breaks every image on the site, so write a test for it.

Validation: `image`, `max:5120`, `mimes:jpg,jpeg,png,webp`. Strip EXIF. Never trust the filename.

---

## 18. Reporting

Do these as database aggregates, not in PHP loops:

```sql
-- Daily revenue, last 30 days
SELECT DATE(created_at) d, COUNT(*) orders, SUM(grand_total) revenue
FROM orders WHERE status != 'cancelled' AND created_at >= ?
GROUP BY d ORDER BY d;

-- Top selling
SELECT oi.menu_item_id, oi.name, SUM(oi.quantity) qty, SUM(oi.line_total) revenue
FROM order_items oi JOIN orders o ON o.id = oi.order_id
WHERE o.status != 'cancelled' AND o.created_at >= ?
GROUP BY oi.menu_item_id, oi.name ORDER BY revenue DESC LIMIT 20;

-- Hourly load (drives staffing)
SELECT HOUR(created_at) h, COUNT(*) c FROM orders
WHERE created_at >= ? GROUP BY h ORDER BY h;
```

Cache the dashboard payload for 60 seconds. Ten staff refreshing a dashboard should not run ten
identical aggregate queries.

CSV export: stream with `response()->streamDownload()` and a cursor. Do not build the string in
memory; a year of orders will exhaust it.

---

## 19. Logging and auditing

- `spatie/laravel-activitylog` on `Order`, `Reservation`, `MenuItem`, `InventoryItem`, `User`,
  `Coupon`, `Setting`.
- Log the **actor**, not just the change. "Who marked this order delivered" is the question that
  gets asked.
- Ship application logs to a file per day plus Sentry (or Flare) for exceptions.
- Never log phone numbers or addresses at `info` level.

---

## 20. Security checklist

- [ ] Sanctum SPA mode, `SESSION_SECURE_COOKIE=true`, `SameSite=Lax`
- [ ] CORS restricted to the site origin only
- [ ] Rate limits: `login` 5/min, `orders` 10/min per IP, `orders/track` 20/min, `contact` 3/min
- [ ] **Totals recalculated server-side.** Never trust the client's `grandTotal`
- [ ] Coupon redemption inside the order transaction
- [ ] Order status transitions validated against the state machine
- [ ] Policies on every model; `manager` must not reach `users` or `roles`
- [ ] Mass-assignment: explicit `$fillable`, never `$guarded = []`
- [ ] Soft deletes on everything operational; hard deletes only via a console command
- [ ] Customer PII (`phone`, `address`) encrypted at rest if the client's risk appetite requires it
- [ ] `/order/track` must not leak: given a phone number, return only orders for that number, and
      rate limit it hard. It is the one unauthenticated endpoint that exposes customer data
- [ ] Uploads validated by MIME sniff, not extension; served from a separate domain or with
      `Content-Disposition: attachment` for non-images

---

## 21. API versioning

Prefix everything `/api/v1`. Version by URL, not by header — the client is a single SPA and URL
versioning is easier to debug in a browser network tab.

Breaking-change policy: add a `/api/v2` route group and keep `v1` for one release cycle. Adding an
optional field is not a breaking change; renaming or removing one is.

---

## 22. Suggested folder structure

```
app/
├── Actions/
│   ├── Coupons/{ValidateCoupon,RedeemCoupon}.php
│   ├── Inventory/RecordMovement.php
│   ├── Orders/{PlaceOrder,TransitionOrderStatus,AssignRider}.php
│   ├── Reports/BuildSalesReport.php
│   └── Reservations/{CheckAvailability,ConfirmReservation}.php
├── Enums/{OrderStatus,ReservationStatus,FulfilmentType,PaymentMethod,InventoryMovement}.php
├── Events/
├── Http/
│   ├── Controllers/Api/V1/
│   │   ├── Public/{MenuController,OrderController,ReservationController,...}
│   │   ├── Customer/{ProfileController,OrderController,...}
│   │   └── Admin/{OrderController,InventoryController,DashboardController,...}
│   ├── Middleware/EnsureUserIsActive.php
│   ├── Requests/{StoreOrderRequest,StoreReservationRequest,...}
│   └── Resources/{OrderResource,MenuItemResource,...}
├── Listeners/
├── Models/
├── Notifications/
├── Observers/{MenuItemObserver,ReviewObserver,AddressObserver}.php
├── Policies/
└── Support/{PhoneNumber,Money}.php
database/{migrations,factories,seeders}
routes/{api.php,console.php,channels.php}
tests/{Feature,Unit}
```

---

## 23. Testing expectations

Minimum before go-live:

- **Feature tests** for: placing an order (guest and authenticated), every legal and illegal status
  transition, coupon validation for all five failure reasons, reservation availability under a
  double booking, inventory movement going negative.
- **Policy tests**: a `manager` cannot reach `/admin/users`; a `kitchen` account cannot change
  prices.
- **A test that asserts the API response shape matches the Angular models.** The fastest way to
  break this project is a silent rename from `grandTotal` to `total`. Snapshot the JSON.

---

## 24. Deployment

**Recommended**: a single VPS is genuinely enough for one restaurant. Do not over-engineer.

| Component | Choice |
|---|---|
| Server | Ubuntu 24.04, 2 vCPU / 4 GB to start |
| PHP | 8.3 FPM with OPcache and JIT |
| Web | Nginx, HTTP/2, Brotli |
| DB | MySQL 8 on the same box; move it off when it hurts |
| Cache/queue | Redis |
| Process manager | Supervisor for Horizon and Reverb |
| TLS | Let's Encrypt via Certbot |
| Backups | Nightly `mysqldump` + media to object storage, retained 30 days, **restore-tested monthly** |
| Deploys | Laravel Envoy or GitHub Actions with zero-downtime symlink swap |

Angular SSR runs as a separate Node process behind Nginx (`server.mjs`, port 4000). Nginx routes
`/api` to PHP-FPM and everything else to Node.

**Go-live checklist**
- [ ] `APP_DEBUG=false`, `APP_ENV=production`
- [ ] `php artisan config:cache route:cache view:cache event:cache`
- [ ] `php artisan storage:link`
- [ ] Horizon and Reverb supervised and restarting on deploy
- [ ] Scheduler cron entry present (`* * * * * php artisan schedule:run`)
- [ ] Health check endpoint monitored (`/api/v1/health`)
- [ ] Sentry DSN configured
- [ ] Backup restore rehearsed once, on a scratch database
- [ ] The client can actually log in and change a price without calling you

---

## 25. Delivery phases

| Phase | Scope | Why this order |
|---|---|---|
| **1** | Auth, users, roles, categories, menu, variants | Nothing else works without the catalogue |
| **2** | Orders, order items, status machine, tracking, delivery areas, coupons | This is the revenue path |
| **3** | Reservations, tables, availability | Second revenue path, independent of phase 2 |
| **4** | Admin CRUD for all content, media uploads | Hands the site to the client |
| **5** | Inventory, suppliers, movement logs | Internal, no customer impact if it slips |
| **6** | Dashboard, analytics, reports, CSV | Needs phases 2–5 to have data worth reporting |
| **7** | Notifications, broadcasting, kitchen realtime | Replaces polling; polling ships fine without it |

Phases 1–3 are the minimum viable replacement for JSON Server. Everything after that can go live
incrementally without the front end changing.

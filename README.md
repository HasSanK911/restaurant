# Salateen Restaurant Swabi

A production-quality demo for **Salateen Restaurant**, Jhangira Road, Mal Lar, Swabi — a Pakhtun BBQ
and family restaurant. Angular 21, TailwindCSS 4, SSR with prerendering, and a JSON Server backend
standing in for the Laravel API that follows.

**Public site** · **Customer accounts** · **Full admin panel** · **Kitchen display**

---

## Quick start

```bash
npm install
npm run seed     # generates db.json (deterministic, ~1.2 MB)
npm start        # API on :3000 and the app on :4200, together
```

Open <http://localhost:4200>.

### Demo accounts

All passwords are `salateen123`.

| Role | Email | Lands on |
|---|---|---|
| Customer | `customer@example.com` | `/account` |
| Administrator | `admin@salateenrestaurant.pk` | `/admin` |
| Manager | `manager@salateenrestaurant.pk` | `/admin` (no users, roles or logs) |
| Kitchen | `kitchen@salateenrestaurant.pk` | `/admin` → `/kitchen` |
| Floor staff | `staff@salateenrestaurant.pk` | `/admin` (orders and bookings only) |

Sign in as the manager and then try to open **Users** — the sidebar hides it and the guard blocks the
URL. Role-based access is real, not decorative.

---

## Scripts

| Command | What it does |
|---|---|
| `npm start` | JSON Server + `ng serve` together |
| `npm run serve` | App only (expects the API already running) |
| `npm run api` | JSON Server on port 3000 |
| `npm run seed` | Regenerates `db.json` from `scripts/seed*.mjs` |
| `npm run build` | **Production build of the demo.** Starts the API, prerenders 101 routes against live data, stops the API |
| `npm run build:laravel` | Production build against the real Laravel API |
| `npm run sitemap` | Regenerates `public/sitemap.xml` from `db.json` |
| `npm run build:netlify` | Production build for the Netlify demo deploy |
| `npm run format` | Prettier |

> `npm run build` deliberately starts the API before building. Angular prerenders by *running* the
> app, so without a reachable API all 101 pages ship as empty shells that look fine until you view
> source. The build script guards against exactly that.

---

## What is in here

### Public site (28 routes)

Home · About · Our Story · Menu · Menu by category · Dish detail · Cart · Checkout · Order
confirmation · Order tracking · Reservation · Reservation confirmation · Gallery · Offers · Offer
detail · Testimonials · Journal · Article · FAQ · Contact · Events · Catering · Branches · Careers ·
Job detail · Privacy · Terms · Refunds · 404 · 500

### Customer account (10 routes)

Overview · Orders · Order detail · Reservations · Wishlist · Addresses · Reviews · Coupons ·
Notifications · Settings

### Admin panel (30 modules)

Dashboard · Analytics · Reports (with CSV export) · Orders · Order detail · Kitchen queue ·
Reservations · Tables · Delivery areas · Categories · Menu items · Offers · Coupons · Inventory ·
Movement logs · Suppliers · Customers · Staff · Users · Roles · Permissions · Reviews ·
Testimonials · Gallery · Journal · FAQs · Messages · Settings · Working hours · Notifications ·
System logs · Profile

### Kitchen display

A separate full-screen route (`/kitchen`) for the screen at the pass: large type, high contrast,
tickets that turn amber at 20 minutes and red at 30, one-tap advance through the kitchen flow.

---

## The data is real

This is not lorem ipsum with stock photography.

- **All 51 photographs** are of the actual restaurant, scraped from its public listing and processed
  into 204 responsive WebP variants (400w / 800w / 1600w / 24w LQIP).
- **Prices marked `REAL`** in `scripts/seed-catalogue.mjs` were transcribed from a photograph of the
  restaurant's own printed menu card (`/assets/images/brand/menu-card`): Chapli Kabab Rs 200/400,
  Mutton Karahi Rs 550/1100, Chicken Karahi Rs 300/600, Handi Rs 350/700, Daal Mash Rs 100, Sabz
  Chai Rs 15. Prices marked `EST` are plausible values on the same scale for dishes the photograph
  did not cover.
- **Address, phone, hours, amenities, cuisine tags and the review themes** come from the restaurant's
  public listing.

> **For the client:** please verify the menu prices before go-live. They came off a photograph of
> your card and may be out of date. Every price lives in `db.json` and is editable from
> **Admin → Menu items** without touching code.

---

## Architecture

```
src/app/
├── core/
│   ├── models/        Domain types — the API contract, shared by every layer
│   ├── services/      All I/O. Nothing above this layer touches HttpClient
│   ├── interceptors/  Auth headers, timeout, retry, error normalisation
│   ├── guards/        auth · guest · role · permission · cart-not-empty
│   └── constants/     Brand facts, navigation, API paths
├── shared/
│   ├── components/ui/ Icon · Image · Badge · Rating · Modal · Drawer · Toast · Chart · …
│   ├── directives/    appReveal (IntersectionObserver) · appParallax (rAF, zoneless)
│   ├── pipes/         pkr · timeAgo · niceDate · clock12 · humanise · articleBody
│   └── validators/    Pakistani phone, non-past date, field matching
├── layouts/public/    Header with mega menu · footer · mobile tab bar · cart drawer
└── features/          One folder per feature, all lazy-loaded
```

**Principles the code actually follows**

- **Zoneless change detection** with signals throughout. `OnPush` on every component.
- **One I/O boundary.** Every network call goes through `ApiService`. Grep for `http://` under
  `src/app` — there are no hits.
- **Endpoints are constants.** Migrating to Laravel is largely editing one file.
- **Twenty admin screens, one component.** `ResourcePageComponent` takes a column and field schema;
  each module page is its configuration. Screens with genuinely bespoke needs (orders, reservations,
  inventory, dashboard, kitchen) are written out in full.
- **SSR-safe by construction.** `StorageService` no-ops on the server, `ChartComponent` skips the
  canvas, directives fall back to a visible state without `IntersectionObserver`.

---

## SEO

- **101 routes prerendered** at build time, including every dish, category, article, offer and job.
- **JSON-LD**: `Restaurant` (site-wide, with hours, geo, amenities and aggregate rating), `Menu`,
  `MenuItem` (with `Offer` and `NutritionInformation`), `BreadcrumbList`, `FAQPage`, `Article`.
- Canonical URLs, Open Graph, Twitter cards, geo meta, generated `sitemap.xml` (98 URLs) and a
  `robots.txt` that excludes admin, account, checkout and kitchen.
- Semantic HTML with one `h1` per page, real alt text on all 51 photographs, skip link, visible
  focus rings, `prefers-reduced-motion` respected throughout.

Verify a build:

```bash
npm run build
grep -o '<title>[^<]*' dist/salateen-restaurant/browser/menu/kabuli-pulao/index.html
grep -c 'ld+json' dist/salateen-restaurant/browser/menu/kabuli-pulao/index.html
```

---

## Payment

**Cash only, by design.** Cash on delivery for home orders, cash at the counter for dine-in. There is
no payment gateway, no card field anywhere in the codebase, and the legal pages carry an explicit
fraud warning that the restaurant never asks for card details. `BACKEND_PLAN.md` §16 documents where
a gateway would attach if the client ever wants one — without building it speculatively.

---

## Known limitations of the demo backend

JSON Server cannot compute, transact or authenticate. Three pieces of logic live client-side that
must move to the server, each marked with a comment in the source explaining why:

| Logic | Where | Risk today |
|---|---|---|
| Coupon validation | `cart.service.ts` | Bypassable from the console |
| Reservation availability | `reservation.service.ts` | Races under concurrent booking |
| Order status transition | `order.service.ts` | Read-then-write, can lose an update |
| Inventory movement | `admin.service.ts` | Two writes, not atomic |
| Authentication | `auth.service.ts` | Passwords compared in the browser |
| Order totals | `checkout.page.ts` | Client-supplied; the server must recompute |

All six are specified in `BACKEND_PLAN.md` and their exact replacements in `MIGRATION_GUIDE.md`.

---

## Deploying the demo to Netlify

```bash
git add -A && git commit -m "Netlify deployment" && git push
```

Netlify builds from the committed tree, so everything below has to be in the
commit — the plugin, `netlify.toml`, the function and `db.json` all matter.

**Netlify site settings**

- Build command and publish directory come from `netlify.toml`; leave both blank
  in the UI so they cannot override it.
- In *Site configuration → Build & deploy → Build plugins*, **remove
  `@netlify/angular-runtime` if it is installed there.** It must come from
  `package.json` instead. A UI-installed copy is not resolvable from the site
  root, and the plugin's check for itself then fails with the misleading
  *"requires '@netlify/angular-runtime@^4.0.0' or later to be installed"* — even
  though 4.0.0 is loaded. Disabling it in one place does not disable it in the other.
- Do not set `NODE_ENV=production`; it makes npm skip devDependencies, and the
  Angular CLI lives there.

**How the deployed demo works**

| Piece | Where it runs |
|---|---|
| 101 prerendered pages | Static, straight off the CDN |
| Unknown URLs, client-only routes | Angular SSR edge function (`/*`) |
| The demo API | `netlify/functions/api.mts` at `/.netlify/functions/api/*` |

The API is a JSON-Server-compatible stand-in over the same `db.json`, so
ordering, booking, sign-in and the admin panel all work on the deployed site.
Writes persist in Netlify Blobs, so an order placed on the storefront really does
appear in the admin panel. `POST /.netlify/functions/api/_reset` restores the
seed — worth doing before a client walkthrough.

It is served from `/.netlify/functions/api` rather than a prettier `/api`
deliberately: the SSR edge function is mounted at `/*` and excludes only
`/.netlify/*`, the static files and the prerendered routes, so `/api/*` would be
swallowed and returned as HTML.

**Verifying a deploy**

```bash
npx netlify build              # runs the exact CI pipeline locally
curl -sI https://<site>/                     # 200
curl -sI https://<site>/this-does-not-exist  # 404, not a soft 404
curl -s  https://<site>/.netlify/functions/api/restaurant | head -c 80
```

`npm run build` fails the build if the prerendered HTML comes out empty. Angular
prerenders by *running* the app, so if the API is unreachable at build time every
page ships as a shell that looks fine in a browser and is blank to every crawler.
That has happened once in this project; the assertion exists so it cannot happen
silently again.

---

## Next steps

1. **[`BACKEND_PLAN.md`](./BACKEND_PLAN.md)** — the Laravel 12 backend: schema, endpoints,
   validation, business rules, queues, security, deployment, delivery phases.
2. **[`MIGRATION_GUIDE.md`](./MIGRATION_GUIDE.md)** — the front-end swap, file by file, with a
   testing and production checklist.

---

## Credits

Photography and business information sourced from the restaurant's public listing at
`salateen-restaurant-swabi.wheree.com`. Typefaces: Fraunces and Outfit (Google Fonts).
Built with Angular 21, TailwindCSS 4 and Chart.js.

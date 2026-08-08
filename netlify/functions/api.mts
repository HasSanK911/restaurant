import type { Config, Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import seed from '../../db.json' with { type: 'json' };

/**
 * Demo API for the deployed site.
 *
 * JSON Server cannot run on Netlify — there is no long-lived process to host
 * it. This function reimplements the subset of JSON Server's behaviour that the
 * Angular client actually uses, over the same `db.json`, so the deployed demo
 * behaves exactly like it does locally: browsing, filtering, ordering, booking,
 * signing in and the whole admin panel all work.
 *
 * PERSISTENCE
 * Writes go to Netlify Blobs, so an order placed on the storefront really does
 * appear in the admin panel afterwards. If Blobs is unavailable (an unlinked
 * `netlify dev`, for instance) it degrades to per-instance memory rather than
 * failing — the demo still works, the writes just do not outlive the container.
 *
 * `POST /api/_reset` restores the seed. Useful before showing the client.
 *
 * This is a demo backend, not a production one. It has no authentication, no
 * transactions and no validation — Laravel provides all three. See
 * BACKEND_PLAN.md.
 */

type Row = Record<string, unknown> & { id?: string };
type Database = Record<string, Row[] | Row>;

/** Resources stored as a single object rather than a collection. */
const SINGLETONS = new Set(['restaurant', 'settings', 'dashboardStats', 'analytics']);

/** db.json carries a `$schema` pointer for json-server. It is not a resource. */
const HIDDEN = new Set(['$schema']);

const STORE_NAME = 'salateen-demo';
const SESSION_COOKIE = 'sal_demo';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

/**
 * Writes are isolated per visitor.
 *
 * A single shared database would mean one person deleting menu items in the
 * admin panel permanently breaks the public site for everyone else — not
 * acceptable for a demo that gets shown to a client. Each visitor gets a cookie
 * and their own copy-on-write snapshot, so they can place orders, edit the menu
 * and delete things freely without affecting anyone else.
 *
 * A snapshot is only written once the visitor actually mutates something;
 * read-only visitors never allocate storage.
 */
let cache: { key: string; db: Database; at: number } | null = null;
const CACHE_MS = 2_000;

function sessionIdFrom(request: Request): string | null {
  const cookie = request.headers.get('cookie');
  if (!cookie) return null;
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([A-Za-z0-9_-]+)`));
  return match ? match[1] : null;
}

function newSessionId(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

async function blobStore() {
  try {
    return getStore({ name: STORE_NAME, consistency: 'strong' });
  } catch {
    // Unlinked `netlify dev`, or Blobs unavailable: fall back to memory.
    return null;
  }
}

const keyFor = (sessionId: string) => `db/${sessionId}`;

async function loadDb(sessionId: string): Promise<Database> {
  const key = keyFor(sessionId);
  if (cache && cache.key === key && Date.now() - cache.at < CACHE_MS) return cache.db;

  const store = await blobStore();
  if (store) {
    try {
      const stored = (await store.get(key, { type: 'json' })) as Database | null;
      if (stored) {
        cache = { key, db: stored, at: Date.now() };
        return stored;
      }
    } catch {
      // Fall through to the seed.
    }
  }

  const fresh = structuredClone(seed) as unknown as Database;
  cache = { key, db: fresh, at: Date.now() };
  return fresh;
}

async function saveDb(sessionId: string, db: Database): Promise<void> {
  const key = keyFor(sessionId);
  cache = { key, db, at: Date.now() };

  const store = await blobStore();
  if (!store) return;
  try {
    await store.setJSON(key, db);
  } catch {
    // Demo data is not worth failing a request over.
  }
}

async function resetDb(sessionId: string): Promise<void> {
  cache = null;
  const store = await blobStore();
  if (!store) return;
  try {
    await store.delete(keyFor(sessionId));
  } catch {
    // Nothing stored yet.
  }
}

/* ------------------------------------------------------------------ query */

/**
 * Loose equality matching json-server: query values arrive as strings, so
 * `?isActive=true` must match the boolean `true` and `?customerId=7` the string
 * `"7"` or the number `7`.
 */
function matches(row: Row, key: string, value: string): boolean {
  const actual = row[key];
  if (actual === null || actual === undefined) return value === '' || value === 'null';
  if (Array.isArray(actual)) return actual.some((entry) => String(entry) === value);
  return String(actual) === value;
}

/** `_sort=name` ascending, `_sort=-createdAt` descending. */
function sortRows(rows: Row[], spec: string): Row[] {
  const desc = spec.startsWith('-');
  const key = desc ? spec.slice(1) : spec;

  return [...rows].sort((a, b) => {
    const left = a[key];
    const right = b[key];
    if (left === right) return 0;
    if (left === null || left === undefined) return 1;
    if (right === null || right === undefined) return -1;

    const result =
      typeof left === 'number' && typeof right === 'number'
        ? left - right
        : String(left).localeCompare(String(right));
    return desc ? -result : result;
  });
}

/** Next id as a string, matching the seed's `"1"`, `"2"` convention. */
function nextId(rows: Row[]): string {
  const highest = rows.reduce((max, row) => {
    const numeric = Number(row.id);
    return Number.isFinite(numeric) && numeric > max ? numeric : max;
  }, 0);
  return String(highest + 1);
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'access-control-allow-headers': 'content-type,authorization,accept',
    },
  });

/* ---------------------------------------------------------------- handler */

export default async (request: Request, _context: Context): Promise<Response> => {
  const existingSession = sessionIdFrom(request);
  const sessionId = existingSession ?? newSessionId();

  /** Stamps the demo session cookie, but only when we just minted one. */
  const reply = (response: Response): Response => {
    if (existingSession) return response;
    const headers = new Headers(response.headers);
    headers.append(
      'set-cookie',
      `${SESSION_COOKIE}=${sessionId}; Path=/; Max-Age=${SESSION_MAX_AGE}; SameSite=Lax; HttpOnly`,
    );
    return new Response(response.body, { status: response.status, headers });
  };

  if (request.method === 'OPTIONS') return reply(json({}, 204));

  const url = new URL(request.url);

  // The canonical path is /.netlify/functions/api/<resource>. `/api/<resource>`
  // is accepted too so the function still works if it is ever remapped, but the
  // app deliberately calls the long form — see environment.netlify.ts.
  const segments = url.pathname
    .replace(/^\/\.netlify\/functions\/api/, '')
    .replace(/^\/api(?=\/|$)/, '')
    .split('/')
    .filter(Boolean);

  const [resource, id] = segments;

  if (!resource) {
    return reply(
      json({
        name: 'Salateen demo API',
        note: 'A JSON-Server-compatible stand-in. See BACKEND_PLAN.md for the real thing.',
        resources: Object.keys(seed as unknown as Database).filter((key) => !HIDDEN.has(key)),
      }),
    );
  }

  // Restores this visitor's data to the seed. Handy before a client walkthrough.
  if (resource === '_reset') {
    if (request.method !== 'POST') return reply(json({ message: 'Use POST to reset.' }, 405));
    await resetDb(sessionId);
    return reply(json({ reset: true, at: new Date().toISOString() }));
  }

  if (HIDDEN.has(resource)) {
    return reply(json({ message: `Unknown resource "${resource}".` }, 404));
  }

  const db = await loadDb(sessionId);
  const entry = db[resource];
  if (entry === undefined) {
    return reply(json({ message: `Unknown resource "${resource}".` }, 404));
  }

  /* --- singletons ------------------------------------------------------ */
  if (SINGLETONS.has(resource) || !Array.isArray(entry)) {
    if (request.method === 'GET') return reply(json(entry));

    if (request.method === 'PATCH' || request.method === 'PUT') {
      const patch = (await request.json().catch(() => ({}))) as Row;
      const updated = request.method === 'PUT' ? patch : { ...(entry as Row), ...patch };
      db[resource] = updated;
      await saveDb(sessionId, db);
      return reply(json(updated));
    }

    return reply(json({ message: 'Method not allowed on this resource.' }, 405));
  }

  const rows = entry as Row[];

  /* --- collection: item by id ------------------------------------------ */
  if (id) {
    const index = rows.findIndex((row) => String(row.id) === id);

    if (request.method === 'GET') {
      return reply(index === -1 ? json({ message: 'Not found.' }, 404) : json(rows[index]));
    }

    if (index === -1) return reply(json({ message: 'Not found.' }, 404));

    if (request.method === 'PATCH' || request.method === 'PUT') {
      const patch = (await request.json().catch(() => ({}))) as Row;
      const updated =
        request.method === 'PUT' ? { ...patch, id: rows[index].id } : { ...rows[index], ...patch };
      rows[index] = updated;
      await saveDb(sessionId, db);
      return reply(json(updated));
    }

    if (request.method === 'DELETE') {
      rows.splice(index, 1);
      await saveDb(sessionId, db);
      return reply(json({}));
    }

    return reply(json({ message: 'Method not allowed.' }, 405));
  }

  /* --- collection: create ---------------------------------------------- */
  if (request.method === 'POST') {
    const body = (await request.json().catch(() => ({}))) as Row;
    const created = { ...body, id: body.id ?? nextId(rows) };
    rows.push(created);
    await saveDb(sessionId, db);
    return reply(json(created, 201));
  }

  if (request.method !== 'GET') return reply(json({ message: 'Method not allowed.' }, 405));

  /* --- collection: list ------------------------------------------------ */
  const params = url.searchParams;
  let result = rows;

  for (const [key, value] of params.entries()) {
    if (key.startsWith('_')) continue;
    result = result.filter((row) => matches(row, key, value));
  }

  const sort = params.get('_sort');
  if (sort) result = sortRows(result, sort);

  const page = Number(params.get('_page'));
  if (!page) return reply(json(result));

  // json-server v1's paginated envelope. `ApiService.normalisePage` reads
  // `data`, `items` and `pages` from this.
  const perPage = Number(params.get('_per_page')) || 10;
  const pages = Math.max(1, Math.ceil(result.length / perPage));
  const current = Math.min(Math.max(1, page), pages);
  const start = (current - 1) * perPage;

  return reply(
    json({
      first: 1,
      prev: current > 1 ? current - 1 : null,
      next: current < pages ? current + 1 : null,
      last: pages,
      pages,
      items: result.length,
      data: result.slice(start, start + perPage),
    }),
  );
};

/**
 * No custom `path` is declared on purpose.
 *
 * A prettier `/api/*` route would be shadowed by the Angular SSR edge function,
 * which @netlify/angular-runtime mounts at `"/*"` and which never calls
 * `context.next()`. Its `excludedPath` covers `/.netlify/*`, the static files
 * and the prerendered routes — so the function's default
 * `/.netlify/functions/api` path is the one that reliably gets through.
 * Declaring a `/api/*` alias would only create a route that looks supported and
 * silently returns HTML.
 */
export const config: Config = {};

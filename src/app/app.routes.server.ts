import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Render strategy per route.
 *
 * - **Prerender**: every page that should be in the search index. These ship as
 *   real HTML with content and structured data already in the markup.
 * - **Client**: anything private or transactional. There is nothing to index,
 *   and prerendering a checkout would only ship an empty shell.
 * - **Server**: the catch-all. Unknown URLs are rendered on demand so the 404
 *   page comes back with the site chrome *and* a real 404 status (see
 *   `src/server.ts`). This must not be Prerender: there is no prerendered file
 *   for an arbitrary URL, so the request would fall through to Express's
 *   default error page with no chrome.
 */
export const serverRoutes: ServerRoute[] = [
  // --- Private / transactional -------------------------------------------
  { path: 'admin', renderMode: RenderMode.Client },
  { path: 'admin/**', renderMode: RenderMode.Client },
  { path: 'account', renderMode: RenderMode.Client },
  { path: 'account/**', renderMode: RenderMode.Client },
  { path: 'kitchen', renderMode: RenderMode.Client },
  { path: 'auth/**', renderMode: RenderMode.Client },
  { path: 'cart', renderMode: RenderMode.Client },
  { path: 'checkout', renderMode: RenderMode.Client },
  { path: 'order/confirmation/:id', renderMode: RenderMode.Client },
  { path: 'order/track', renderMode: RenderMode.Client },
  { path: 'order/track/:reference', renderMode: RenderMode.Client },
  { path: 'reservation/confirmation/:id', renderMode: RenderMode.Client },

  // --- Dynamic detail pages, params enumerated from the seed database -----
  {
    path: 'menu/:slug',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: () => paramsFrom('menu', 'slug'),
  },
  {
    path: 'menu/c/:categorySlug',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: () => paramsFrom('categories', 'categorySlug'),
  },
  {
    path: 'blog/:slug',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: () => paramsFrom('blogs', 'slug'),
  },
  {
    path: 'offers/:slug',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: () => paramsFrom('offers', 'slug'),
  },
  {
    path: 'careers/:slug',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: () => paramsFrom('jobs', 'slug'),
  },

  // --- Static marketing pages --------------------------------------------
  ...[
    '',
    'about',
    'our-story',
    'menu',
    'reservation',
    'gallery',
    'offers',
    'testimonials',
    'blog',
    'faq',
    'contact',
    'events',
    'catering',
    'branches',
    'careers',
    'privacy-policy',
    'terms',
    'refund-policy',
    '404',
    '500',
  ].map((path) => ({ path, renderMode: RenderMode.Prerender }) as ServerRoute),

  // --- Everything else: rendered on demand so unknown URLs 404 properly ---
  { path: '**', renderMode: RenderMode.Server },
];

/**
 * Reads slugs straight out of db.json during the prerender pass.
 *
 * Build-time only: `getPrerenderParams` never runs when serving requests, so
 * the Node filesystem import here does not reach the request path. Once the
 * Laravel API is live this becomes a `fetch` against the public endpoint. See
 * MIGRATION_GUIDE.md, "Prerendering".
 */
async function paramsFrom(collection: string, paramName: string): Promise<Record<string, string>[]> {
  try {
    const { readFile } = await import('node:fs/promises');
    const { fileURLToPath } = await import('node:url');
    const { dirname, resolve } = await import('node:path');

    const here = dirname(fileURLToPath(import.meta.url));
    const candidates = [
      resolve(here, 'db.json'),
      resolve(here, '../db.json'),
      resolve(here, '../../db.json'),
      resolve(here, '../../../db.json'),
      resolve(process.cwd(), 'db.json'),
    ];

    for (const candidate of candidates) {
      try {
        const raw = await readFile(candidate, 'utf8');
        const db = JSON.parse(raw) as Record<string, { slug?: string }[]>;
        const rows = db[collection] ?? [];
        return rows
          .filter((row) => typeof row.slug === 'string' && row.slug.length > 0)
          .map((row) => ({ [paramName]: row.slug as string }));
      } catch {
        // Try the next candidate path.
      }
    }
  } catch {
    // An empty list simply means these routes are served on demand rather than
    // prerendered. The build still succeeds.
  }
  return [];
}

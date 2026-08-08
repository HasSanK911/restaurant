/**
 * Generates public/sitemap.xml from the route table and db.json.
 *
 * Runs as part of `npm run build`, so the sitemap can never drift from the
 * dishes, articles, offers and job openings that actually exist. Private and
 * transactional routes are excluded here as well as in robots.txt.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Site origin for the emitted URLs.
 *
 * Prefers an explicit SITE_URL, then Netlify's injected URL / DEPLOY_PRIME_URL,
 * then the production domain. Each candidate is validated as an absolute http
 * URL — netlify.toml performs no variable interpolation, so a well-meaning
 * `SITE_URL = "$URL"` there would arrive as the literal string `$URL` and
 * silently emit `<loc>$URL/menu</loc>` for all 98 URLs.
 */
const SITE = [process.env['SITE_URL'], process.env['URL'], process.env['DEPLOY_PRIME_URL']]
  .find((candidate) => candidate && /^https?:\/\//i.test(candidate))
  ?.replace(/\/+$/, '') ?? 'https://salateenrestaurant.pk';

/** [path, changefreq, priority] */
const STATIC_ROUTES = [
  ['', 'daily', 1.0],
  ['menu', 'weekly', 0.95],
  ['reservation', 'monthly', 0.9],
  ['offers', 'weekly', 0.85],
  ['about', 'monthly', 0.7],
  ['our-story', 'monthly', 0.7],
  ['gallery', 'monthly', 0.7],
  ['testimonials', 'weekly', 0.65],
  ['blog', 'weekly', 0.75],
  ['faq', 'monthly', 0.7],
  ['contact', 'monthly', 0.8],
  ['events', 'weekly', 0.65],
  ['catering', 'monthly', 0.75],
  ['branches', 'monthly', 0.6],
  ['careers', 'weekly', 0.5],
  ['privacy-policy', 'yearly', 0.3],
  ['terms', 'yearly', 0.3],
  ['refund-policy', 'yearly', 0.3],
];

/** Collections whose slugs become their own URLs. */
const DYNAMIC = [
  { collection: 'menu', prefix: 'menu', changefreq: 'weekly', priority: 0.8 },
  { collection: 'categories', prefix: 'menu/c', changefreq: 'weekly', priority: 0.75 },
  { collection: 'blogs', prefix: 'blog', changefreq: 'monthly', priority: 0.65, publishedKey: 'isPublished' },
  { collection: 'offers', prefix: 'offers', changefreq: 'weekly', priority: 0.6, publishedKey: 'isActive' },
  { collection: 'jobs', prefix: 'careers', changefreq: 'weekly', priority: 0.4, publishedKey: 'isOpen' },
];

const dbPath = path.join(ROOT, 'db.json');
if (!fs.existsSync(dbPath)) {
  console.error('db.json not found. Run "npm run seed" first.');
  process.exit(1);
}
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

const today = new Date().toISOString().slice(0, 10);
const entries = [];

for (const [route, changefreq, priority] of STATIC_ROUTES) {
  entries.push({ loc: `${SITE}/${route}`.replace(/\/$/, '') || SITE, lastmod: today, changefreq, priority });
}

for (const { collection, prefix, changefreq, priority, publishedKey } of DYNAMIC) {
  const rows = db[collection] ?? [];
  for (const row of rows) {
    if (!row.slug) continue;
    if (publishedKey && row[publishedKey] === false) continue;
    entries.push({
      loc: `${SITE}/${prefix}/${row.slug}`,
      lastmod: (row.updatedAt ?? row.publishedAt ?? row.createdAt ?? today).slice(0, 10),
      changefreq,
      priority,
    });
  }
}

const escape = (value) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...entries.map(
    (entry) =>
      `  <url>\n` +
      `    <loc>${escape(entry.loc)}</loc>\n` +
      `    <lastmod>${entry.lastmod}</lastmod>\n` +
      `    <changefreq>${entry.changefreq}</changefreq>\n` +
      `    <priority>${entry.priority.toFixed(2)}</priority>\n` +
      `  </url>`,
  ),
  '</urlset>',
  '',
].join('\n');

const out = path.join(ROOT, 'public', 'sitemap.xml');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, xml);

console.log(`sitemap.xml written with ${entries.length} URLs`);

import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Static assets.
 *
 * Hashed build output can be cached for a year. `index.html` and the prerendered
 * page shells must not be, or a deploy will not reach anyone still holding an
 * old copy.
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
    setHeaders: (res, path) => {
      if (path.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    },
  }),
);

/**
 * Angular render, with one correction.
 *
 * A wildcard route means Angular happily renders the not-found page for any
 * unknown URL and returns 200 — a "soft 404", which search engines treat as a
 * thin duplicate page and which makes crawl budget disappear into typos and
 * stale links.
 *
 * The not-found page emits `<meta name="render-status-code" content="404">`
 * (see SeoService). We read it back out of the rendered HTML and answer with a
 * real 404. Cheap, and it keeps the status decision next to the page that knows
 * about it rather than duplicating a route table here.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then(async (response) => {
      if (!response) return next();

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('text/html')) {
        return writeResponseToNodeResponse(response, res);
      }

      const html = await response.text();
      const match = html.match(/<meta\s+name="render-status-code"\s+content="(\d{3})"/i);
      const status = match ? Number(match[1]) : response.status;

      const headers = new Headers(response.headers);
      headers.delete('content-length');

      return writeResponseToNodeResponse(new Response(html, { status, headers }), res);
    })
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is run via PM2.
 * Listens on PORT, defaulting to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);

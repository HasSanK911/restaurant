import { AngularAppEngine, createRequestHandler } from '@angular/ssr';
import {
  getAllowedHosts,
  getContext,
  getTrustProxyHeaders,
} from '@netlify/angular-runtime/app-engine.js';

/**
 * SSR entry point.
 *
 * MUST export `netlifyAppEngineHandler`. @netlify/angular-runtime inspects this
 * file during `onPreBuild`: if it recognises a stock Angular server.ts it
 * silently swaps in its own, and if it finds neither a known signature nor a
 * `netlifyAppEngineHandler` export it fails the build outright
 * (see node_modules/@netlify/angular-runtime/src/helpers/serverModuleHelpers.js).
 * Because this file exports that name, the plugin leaves it alone and the
 * customisation below survives.
 *
 * `getAllowedHosts()` derives the allowed host list from Netlify's deploy
 * environment variables (URL, DEPLOY_PRIME_URL, SITE_ID, SITE_NAME, DEPLOY_ID),
 * which is what makes SSR work on `*.netlify.app`, branch deploys and deploy
 * previews. Angular unions it with `security.allowedHosts` from angular.json,
 * so the custom domain listed there is still honoured.
 */
const angularAppEngine = new AngularAppEngine({
  allowedHosts: getAllowedHosts(),
  trustProxyHeaders: getTrustProxyHeaders(),
});

export async function netlifyAppEngineHandler(request: Request): Promise<Response> {
  const context = getContext();

  const result = await angularAppEngine.handle(request, context);
  if (!result) return new Response('Not found', { status: 404 });

  // --- Soft-404 correction ------------------------------------------------
  // A wildcard route means Angular happily renders the not-found page for any
  // unknown URL and returns 200 — a "soft 404", which search engines treat as a
  // thin duplicate and which quietly burns crawl budget on typos and dead links.
  //
  // The not-found page emits `<meta name="render-status-code" content="404">`
  // (see SeoService). Reading it back out keeps the status decision next to the
  // page that knows about it, rather than duplicating a route table here.
  const contentType = result.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html')) return result;

  const html = await result.text();
  const match = html.match(/<meta\s+name="render-status-code"\s+content="(\d{3})"/i);

  // Re-reading the body means the original Content-Length can no longer be
  // trusted, so drop it on both paths and let the platform set it.
  const headers = new Headers(result.headers);
  headers.delete('content-length');

  return new Response(html, { status: match ? Number(match[1]) : result.status, headers });
}

/**
 * Request handler used by the Angular CLI (dev-server and during the build).
 */
export const reqHandler = createRequestHandler(netlifyAppEngineHandler);

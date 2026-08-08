/**
 * Production build.
 *
 * Prerendering is the whole point of the SEO work in this project: 101 routes,
 * including every dish, category, article and offer, ship as real HTML. Angular
 * renders those routes at build time by actually running the app, which means
 * it makes the same HTTP calls the browser would. If the API is not up, every
 * prerendered page ships as an empty shell and looks fine until you view source.
 *
 * So this script:
 *   1. starts JSON Server and waits until it answers,
 *   2. points server-side rendering at it via SSR_API_BASE_URL,
 *   3. runs the build,
 *   4. ASSERTS the emitted HTML actually contains data from db.json,
 *   5. shuts the API down.
 *
 * Step 4 exists because every data service swallows network errors to keep the
 * UI resilient — which means a build with no API still exits 0 and prints
 * "success" while emitting 101 empty shells. That has already happened once in
 * this project. A build that silently destroys the site's SEO must fail loudly.
 *
 * Once the Laravel API is live, set SSR_API_BASE_URL to the staging API and
 * delete the spawn block. See MIGRATION_GUIDE.md, "Prerendering".
 */
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API_PORT = Number(process.env['API_PORT'] ?? 3000);
const API_URL = `http://localhost:${API_PORT}`;
const isWindows = process.platform === 'win32';

const ngArgs = process.argv.slice(2);

/** Resolve a local binary rather than reaching for the registry via npx. */
const localBin = (relative) => path.join(ROOT, 'node_modules', relative);

function run(command, args, options = {}) {
  return spawn(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    ...options,
    env: { ...process.env, ...(options.env ?? {}) },
  });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForApi(timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${API_URL}/restaurant`);
      if (response.ok) return true;
    } catch {
      // Not up yet.
    }
    await wait(400);
  }
  return false;
}

/**
 * Reads back a few emitted pages and checks they contain values that can only
 * have come from db.json. `waitForApi` proves the API answered; this proves the
 * data actually reached the HTML.
 */
async function assertPrerenderedContent(outputRoot) {
  const db = JSON.parse(await readFile(path.join(ROOT, 'db.json'), 'utf8'));

  const dish = db.menu?.[0];
  const post = db.blogs?.[0];

  const checks = [
    {
      file: path.join(outputRoot, 'index.html'),
      label: 'home page',
      needles: [db.restaurant?.name, db.menu?.[0]?.name].filter(Boolean),
    },
    dish && {
      file: path.join(outputRoot, 'menu', dish.slug, 'index.html'),
      label: `dish page (${dish.slug})`,
      needles: [dish.name, 'application/ld+json'],
    },
    post && {
      file: path.join(outputRoot, 'blog', post.slug, 'index.html'),
      label: `article page (${post.slug})`,
      needles: [post.title],
    },
  ].filter(Boolean);

  const failures = [];

  for (const check of checks) {
    if (!existsSync(check.file)) {
      failures.push(`${check.label}: ${path.relative(ROOT, check.file)} was not emitted`);
      continue;
    }
    const html = await readFile(check.file, 'utf8');
    const missing = check.needles.filter((needle) => !html.includes(needle));
    if (missing.length) {
      failures.push(
        `${check.label}: rendered but missing ${missing.map((m) => JSON.stringify(m)).join(', ')} ` +
          `(${Math.round(html.length / 1024)} kB — an empty shell is ~25 kB)`,
      );
    }
  }

  return failures;
}

function stopApi(api) {
  if (!api?.pid) return;
  try {
    if (isWindows) {
      // json-server runs under a shell wrapper on Windows; kill the tree.
      spawn('taskkill', ['/pid', String(api.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      // Spawned detached, so the negative pid kills the whole process group.
      // Without this the build can hang to the Netlify timeout after succeeding.
      process.kill(-api.pid, 'SIGTERM');
    }
  } catch {
    // Already gone.
  }
}

async function main() {
  console.log('> generating sitemap');
  const sitemapCode = await new Promise((resolve) => {
    run('node', [path.join('scripts', 'generate-sitemap.mjs')]).on('exit', (code) =>
      resolve(code ?? 1),
    );
  });
  if (sitemapCode !== 0) {
    console.error('sitemap generation failed');
    process.exit(sitemapCode);
  }

  console.log(`> starting the demo API on ${API_URL}`);
  const jsonServerBin = localBin(path.join('json-server', 'lib', 'bin.js'));
  if (!existsSync(jsonServerBin)) {
    console.error(
      `\njson-server is not installed at ${path.relative(ROOT, jsonServerBin)}.\n` +
        'Run "npm install" (including devDependencies) and try again.',
    );
    process.exit(1);
  }

  const api = run(process.execPath, [jsonServerBin, 'db.json', '--port', String(API_PORT)], {
    stdio: 'ignore',
    detached: !isWindows,
  });
  api.unref?.();

  let exitCode = 1;
  try {
    if (!(await waitForApi())) {
      console.error(
        '\nThe demo API did not start, so prerendered pages would ship empty.\n' +
          'Run "npm run api" in another terminal and try again.',
      );
      process.exit(1);
    }
    console.log('> API is up, prerendering against live data');

    exitCode = await new Promise((resolve) => {
      run(process.execPath, [localBin(path.join('@angular', 'cli', 'bin', 'ng.js')), 'build', ...ngArgs], {
        // Server-side rendering resolves a relative apiUrl against this, so
        // prerendering talks to the JSON Server above rather than to a deployed
        // API that does not exist yet.
        env: { SSR_API_BASE_URL: API_URL },
      }).on('exit', (code) => resolve(code ?? 1));
    });

    if (exitCode !== 0) return;

    console.log('> verifying prerendered pages contain real content');
    const outputRoot = path.join(ROOT, 'dist', 'salateen-restaurant', 'browser');
    const failures = await assertPrerenderedContent(outputRoot);

    if (failures.length) {
      console.error('\nPrerender check FAILED. The build produced pages without data:\n');
      for (const failure of failures) console.error(`  - ${failure}`);
      console.error(
        '\nThis would ship a site that looks fine in a browser and is empty to every crawler.\n' +
          'Check that the API was reachable during the build.\n',
      );
      exitCode = 1;
      return;
    }

    console.log('> build complete, prerendered pages contain real content');
  } finally {
    stopApi(api);
  }

  process.exit(exitCode);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

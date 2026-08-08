/**
 * Production build.
 *
 * Prerendering is the whole point of the SEO work in this project: 101 routes,
 * including every dish, category, article and offer, ship as real HTML. Angular
 * renders those routes at build time by actually running the app, which means
 * it makes the same HTTP calls the browser would. If the API is not up, every
 * prerendered page ships as an empty shell and looks fine until you view source.
 *
 * So this script starts JSON Server, waits until it answers, runs the build,
 * and shuts the API down again. Once the Laravel API is live, point
 * `API_URL` at the staging API and delete the spawn block. See
 * MIGRATION_GUIDE.md, "Prerendering".
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API_PORT = Number(process.env['API_PORT'] ?? 3000);
const API_URL = `http://localhost:${API_PORT}`;
const isWindows = process.platform === 'win32';

const run = (command, args, options = {}) =>
  spawn(command, args, { cwd: ROOT, shell: isWindows, stdio: 'inherit', ...options });

async function waitForApi(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${API_URL}/restaurant`);
      if (response.ok) return true;
    } catch {
      // Not up yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return false;
}

async function main() {
  console.log('> generating sitemap');
  await new Promise((resolve, reject) => {
    const sitemap = run('node', ['scripts/generate-sitemap.mjs']);
    sitemap.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('sitemap failed'))));
  });

  console.log(`> starting the demo API on ${API_URL}`);
  const api = run('npx', ['json-server', 'db.json', '--port', String(API_PORT)], {
    stdio: 'ignore',
  });

  const ready = await waitForApi();
  if (!ready) {
    api.kill();
    console.error(
      '\nThe demo API did not start, so prerendered pages would ship empty.\n' +
        'Run "npm run api" in another terminal and try again.',
    );
    process.exit(1);
  }
  console.log('> API is up, prerendering against live data');

  const exitCode = await new Promise((resolve) => {
    const build = run('npx', ['ng', 'build', ...process.argv.slice(2)]);
    build.on('exit', (code) => resolve(code ?? 1));
  });

  api.kill();
  // json-server spawns through a shell on Windows, so kill the tree.
  if (isWindows && api.pid) {
    try {
      spawn('taskkill', ['/pid', String(api.pid), '/T', '/F'], { stdio: 'ignore' });
    } catch {
      // Already gone.
    }
  }

  if (exitCode !== 0) process.exit(exitCode);
  console.log('\n> build complete, prerendered pages contain real content');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

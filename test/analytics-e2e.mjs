// Checks lib/analytics.ts against the real Amplitude SDK in a real browser: nothing typed
// into a page's address reaches Amplitude, and the SDK is not part of the page's first load.
//
// kp-design has no node_modules of its own, so this borrows esbuild, Playwright and the
// Amplitude packages from a site that uses it:
//
//   SITE=../recipe-search node test/analytics-e2e.mjs
//
// It bundles lib/analytics.ts the way a site would, serves a small page on a made-up host
// (kp.test), answers Amplitude's hosts itself and reads what the SDK tried to send.
// Nothing leaves this computer.

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = path.resolve(process.env.SITE || path.join(root, '../recipe-search'));
const require = createRequire(pathToFileURL(path.join(site, 'package.json')));
const esbuild = require('esbuild');
const { chromium } = require('playwright');

const out = await mkdtemp(path.join(tmpdir(), 'kp-analytics-'));
await esbuild.build({
  entryPoints: { page: path.join(root, 'test/analytics-e2e-page.ts') },
  bundle: true,
  splitting: true,
  format: 'esm',
  minify: true,
  outdir: out,
  nodePaths: [path.join(site, 'node_modules')],
  logLevel: 'silent',
});

// The entry file is what a page loads up front. Amplitude must not be in it.
const entry = await readFile(path.join(out, 'page.js'), 'utf8');
assert.ok(!/amplitude\.com/.test(entry), 'the Amplitude SDK is in the first-load file');
assert.ok(entry.length < 8000, `the first-load file is ${entry.length} bytes; expected a few KB`);
const chunks = (await readdir(out)).filter((name) => name !== 'page.js');
assert.ok(chunks.length > 0, 'the SDK should be in its own file');

const HTML = `<!doctype html><title>Test page</title>
<a id="link" href="/?q=linked+walnuts">A link</a>
<input id="box" value="typed radish"><p>Visible words</p>
<script type="module" src="/page.js"></script>`;
// Words that stand in for something a person typed. None may reach Amplitude.
const TYPED = ['onions', 'anchovy', 'walnuts', 'capers', 'saffron', 'fragment', 'radish', 'Visible words'];

const browser = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });

async function visit(url, { referer, before, steps } = {}) {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  });
  const page = await context.newPage();
  const sent = [];
  const requested = [];
  await page.route('**/*', async (route) => {
    const request = route.request();
    const { hostname, pathname } = new URL(request.url());
    if (hostname.endsWith('amplitude.com')) {
      // The SDK gzips what it sends; unpack it so the checks below read plain text.
      const raw = request.postDataBuffer() || Buffer.alloc(0);
      const body = raw[0] === 0x1f && raw[1] === 0x8b ? gunzipSync(raw).toString('utf8') : raw.toString('utf8');
      sent.push({ url: request.url(), body });
      // Session Replay asks for its settings first and won't record without an answer.
      const answer = hostname.startsWith('sr-client-cfg')
        ? { configs: { sessionReplay: { sr_sampling_config: { capture_enabled: true, sample_rate: 1 }, sr_privacy_config: {} } } }
        : { code: 200 };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(answer) });
    }
    if (!hostname.endsWith('kp.test')) return route.abort();
    requested.push(pathname);
    if (pathname.endsWith('.js')) {
      const body = await readFile(path.join(out, path.basename(pathname)));
      return route.fulfill({ status: 200, contentType: 'text/javascript', body });
    }
    return route.fulfill({ status: 200, contentType: 'text/html', body: HTML });
  });
  if (before) await page.addInitScript(before);
  await page.goto(url, { referer });
  if (steps) await steps(page);
  await page.waitForTimeout(2500); // Amplitude sends its queue about once a second.
  await context.close();
  const events = sent
    .filter(({ url }) => url.includes('/2/httpapi'))
    .flatMap(({ body }) => JSON.parse(body).events);
  return { sent, events, requested };
}

try {
  // 1. A search page: typed words in the address, the referrer, a link and later history changes.
  const run = await visit('https://kp.test/?q=onions+and+fish&utm_source=news#fragment', {
    referer: 'https://kp.test/?q=anchovy+toast',
    steps: async (page) => {
      await page.waitForFunction(() => window.kpReady === true);
      await page.evaluate(() => history.pushState({}, '', '/?q=capers+and+lemon'));
      await page.evaluate(() => history.replaceState({}, '', '/?q=capers+and+lemons&time=30'));
      await page.evaluate(() => {
        document.getElementById('link').addEventListener('click', (event) => event.preventDefault());
      });
      await page.click('#link');
      await page.evaluate(() => window.kpTrack('Searched Recipes', { results: 3, from: 'https://kp.test/?q=saffron' }));
      await page.evaluate(() => history.pushState({}, '', '/about/?q=saffron+rice#fragment'));
    },
  });

  const everything = JSON.stringify(run.sent);
  for (const word of TYPED) assert.ok(!everything.includes(word), `"${word}" reached Amplitude: ${everything.slice(Math.max(0, everything.indexOf(word) - 200), everything.indexOf(word) + 80)}`);

  const types = run.events.map((event) => event.event_type);
  const views = run.events.filter((event) => event.event_type === '[Amplitude] Page Viewed');
  assert.deepEqual(
    views.map((event) => event.event_properties['[Amplitude] Page Location']),
    ['https://kp.test/?utm_source=news', 'https://kp.test/about/'],
    'one page view per path, with only campaign tags kept',
  );
  assert.equal(views[0].event_properties['[Amplitude] Page Path'], '/');
  assert.equal(views[0].event_properties.utm_source, 'news');
  assert.ok(types.includes('[Amplitude] Element Clicked'), `no click event in ${types}`);
  const click = run.events.find((event) => event.event_type === '[Amplitude] Element Clicked');
  assert.equal(click.event_properties['[Amplitude] Element Href'], 'https://kp.test/');
  assert.equal(click.event_properties['[Amplitude] Page URL'], 'https://kp.test/');

  // Events tracked before the SDK loaded arrive, with the time they happened.
  const early = run.events.find((event) => event.event_type === 'Opened Test Page');
  assert.ok(early, `the early event was lost: ${types}`);
  assert.deepEqual(early.event_properties.step, 1);
  const searched = run.events.find((event) => event.event_type === 'Searched Recipes');
  assert.equal(searched.event_properties.results, 3);
  assert.equal(searched.event_properties.from, 'https://kp.test/');
  const identify = run.events.find((event) => event.event_type === '$identify' && event.user_properties?.$set?.internal_user !== undefined);
  assert.equal(identify.user_properties.$set.internal_user, false);
  console.log(`ok  search page: ${run.events.length} events sent (${[...new Set(types)].join(', ')}), none with typed words`);

  // 2. The SDK is fetched after the page has loaded, not with it.
  const order = run.requested.filter((p) => p.endsWith('.js'));
  assert.equal(order[0], '/page.js');
  assert.ok(order.some((p) => p.includes('analytics-sdk')), 'the SDK was never fetched');
  console.log(`ok  first load is page.js (${entry.length} bytes); the SDK came later, in its own files`);

  // 3. A session picked for Session Replay: the recording has no typed words, addresses or page text.
  const replay = await visit('https://kp.test/?q=onions+and+fish#fragment', {
    before: () => {
      window.kpReplayRate = 1;
    },
    steps: async (page) => {
      await page.waitForFunction(() => window.kpReady === true);
      await page.waitForTimeout(1000);
      await page.evaluate(() => history.pushState({}, '', '/?q=capers+and+lemon'));
      await page.fill('#box', 'saffron rice');
      await page.waitForTimeout(4000);
    },
  });
  const recordings = replay.sent.filter(({ url }) => url.includes('api-sr.amplitude.com'));
  assert.ok(recordings.length > 0, 'Session Replay sent nothing, so there was nothing to check');
  assert.ok(recordings.some(({ body }) => body.includes('https://kp.test/')), 'the recording should still have the clean address');
  const recorded = JSON.stringify(replay.sent);
  for (const word of TYPED) assert.ok(!recorded.includes(word), `"${word}" reached Session Replay: ${recorded.slice(Math.max(0, recorded.indexOf(word) - 200), recorded.indexOf(word) + 80)}`);
  console.log(`ok  Session Replay: ${recordings.length} upload(s), none with typed words or page text`);

  // 4. Not a live host, opted out, Global Privacy Control: the SDK is never fetched.
  const quiet = [
    ['another host', 'https://preview.kp.test/?q=onions', undefined],
    ['the opt-out', 'https://kp.test/?q=onions', () => localStorage.setItem('kp-analytics-opt-out', '1')],
    ['Global Privacy Control', 'https://kp.test/?q=onions', () => Object.defineProperty(Navigator.prototype, 'globalPrivacyControl', { get: () => true })],
  ];
  for (const [name, url, before] of quiet) {
    const off = await visit(url, {
      before,
      steps: async (page) => {
        await page.waitForFunction(() => window.kpReady === true);
        await page.evaluate(() => window.kpTrack('Searched Recipes', { results: 1 }));
      },
    });
    assert.equal(off.sent.length, 0, `${name}: something was sent`);
    assert.ok(!off.requested.some((p) => p.includes('analytics-sdk')), `${name}: the SDK was fetched`);
    console.log(`ok  ${name}: nothing fetched, nothing sent`);
  }
} finally {
  await browser.close();
  await rm(out, { recursive: true, force: true });
}

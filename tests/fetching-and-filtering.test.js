'use strict';

// The fetch as a whole: caching, the fallback list, custom user agents, and the
// source/device/browser filters the popup applies to the result.

const test = require('node:test');
const assert = require('node:assert');
const { loadBackground, ok, status, notFound } = require('./helpers/load-extension');
const { dataset, UA } = require('./helpers/fixtures');

const full = () => dataset({ desktop: [UA.chrome155], mobile: [UA.iphone], tablet: [UA.ipad] });

test('caches the built list under a key of its own', async () => {
  // A cache written before the schema change holds a different shape, so the key
  // is versioned rather than reused.
  const b = await loadBackground({ routes: full() });
  await b.spoofer.fetchUserAgents();
  assert.ok(b.store.userAgentCacheV2, 'expected a versioned cache key');
  assert.ok(Array.isArray(b.store.userAgentCacheV2.userAgents));
  assert.strictEqual(b.store.userAgentCacheV2.userAgents.length, b.spoofer.userAgents.length);
});

test('a warm cache is used without fetching again', async () => {
  const b = await loadBackground({ routes: full() });
  await b.spoofer.fetchUserAgents();
  const first = b.calls.length;
  await b.spoofer.fetchUserAgents();
  assert.strictEqual(b.calls.length, first, 'should not refetch inside the TTL');
  assert.ok(b.spoofer.userAgents.length > 0);
});

test('an expired cache is refetched', async () => {
  const store = {};
  const b = await loadBackground({ routes: full(), store });
  await b.spoofer.fetchUserAgents();
  const first = b.calls.length;
  store.userAgentCacheV2.timestamp = Date.now() - (25 * 60 * 60 * 1000);
  await b.spoofer.fetchUserAgents();
  assert.ok(b.calls.length > first, 'should refetch past the 24h TTL');
});

test('a cache entry from the old layout is ignored', async () => {
  // What an upgrading user already has on disk: a positional array of parsed
  // JSON bodies, not a list of entries.
  const store = { userAgentCache: { timestamp: Date.now(), data: [{ user_agents: ['stale'] }] } };
  const b = await loadBackground({ routes: full(), store });
  await b.spoofer.fetchUserAgents();
  assert.ok(!b.spoofer.userAgents.some(e => e.ua === 'stale'));
  assert.ok(b.spoofer.userAgents.some(e => e.ua === UA.chrome155));
});

test('a failing required file falls back to the built-in list', async () => {
  const b = await loadBackground({ routes: { ...full(), 'data/desktop.json': status(500) } });
  await b.spoofer.fetchUserAgents();
  assert.ok(b.spoofer.userAgents.length > 0);
  assert.ok(b.spoofer.userAgents.every(e => e.source.includes('fallback')), 'every entry should be tagged fallback');
  assert.ok(b.spoofer.userAgents.every(e => typeof e.ua === 'string'));
});

test('a schema break falls back rather than serving an empty list', async () => {
  const b = await loadBackground({
    routes: { ...full(), 'data/desktop.json': ok({ schema_version: 5, user_agents: [{ ua_string: UA.chrome155 }] }) }
  });
  await b.spoofer.fetchUserAgents();
  assert.ok(b.spoofer.userAgents.every(e => e.source.includes('fallback')));
});

test('a missing optional file does not trigger the fallback', async () => {
  const routes = full();
  delete routes['synthetic/desktop.json'];
  const b = await loadBackground({ routes });
  await b.spoofer.fetchUserAgents();
  assert.ok(!b.spoofer.userAgents.some(e => e.source.includes('fallback')));
});

test('nothing is cached when the fetch failed', async () => {
  const b = await loadBackground({ routes: { ...full(), 'data/desktop.json': notFound() } });
  await b.spoofer.fetchUserAgents();
  assert.ok(!b.store.userAgentCacheV2, 'a fallback list should not be cached for 24h');
});

test('saved custom user agents are appended and tagged custom', async () => {
  const b = await loadBackground({ routes: full(), store: { customUserAgents: [{ ua: 'my-own-ua' }] } });
  await b.spoofer.fetchUserAgents();
  const custom = b.spoofer.userAgents.find(e => e.ua === 'my-own-ua');
  assert.ok(custom);
  assert.deepStrictEqual(custom.source, ['custom']);
});

test('a newly added custom user agent is tagged immediately', async () => {
  // Otherwise it is invisible to the Custom filter until the background script
  // reloads and re-reads storage.
  const b = await loadBackground({ routes: full() });
  await b.spoofer.fetchUserAgents();
  await b.spoofer.addCustomUserAgent('just-added-ua');
  const custom = b.spoofer.userAgents.find(e => e.ua === 'just-added-ua');
  assert.ok(custom);
  assert.deepStrictEqual(custom.source, ['custom']);
  assert.ok(b.spoofer.getFilteredUserAgents(['all'], ['all'], ['custom']).some(e => e.ua === 'just-added-ua'));
});

test('a removed custom user agent leaves the list', async () => {
  const b = await loadBackground({ routes: full(), store: { customUserAgents: [{ ua: 'my-own-ua' }] } });
  await b.spoofer.fetchUserAgents();
  await b.spoofer.removeCustomUserAgent('my-own-ua');
  assert.ok(!b.spoofer.userAgents.some(e => e.ua === 'my-own-ua'));
});

// Filtering is exercised against one hand-built list rather than a fetched one,
// so each expectation below is exact.
const LIST = [
  { ua: UA.chrome120, source: ['latest', 'most_common'], device: 'desktop' },
  { ua: UA.chrome155, source: ['latest'], device: 'desktop' },
  { ua: UA.firefox157, source: ['latest'], device: 'desktop' },
  { ua: UA.macSafari, source: ['latest'], device: 'desktop' },
  { ua: UA.androidChrome, source: ['latest'], device: 'mobile' },
  { ua: UA.iphone, source: ['latest'], device: 'mobile' },
  { ua: UA.ipad, source: ['latest'], device: 'tablet' },
  { ua: 'custom-ua', source: ['custom'], device: 'desktop' },
  { ua: 'fallback-ua', source: ['fallback'], device: 'desktop' }
];

const LATEST = [UA.chrome120, UA.chrome155, UA.firefox157, UA.macSafari, UA.androidChrome, UA.iphone, UA.ipad];

const withList = () => {
  const b = loadBackground({ routes: full() });
  b.spoofer.userAgents = LIST.map(e => ({ ...e, source: [...e.source] }));
  return b;
};

const shown = (b, device, browser, source) => b.spoofer.getFilteredUserAgents(device, browser, source).map(e => e.ua);

test('filtering by latest returns every latest string', () => {
  assert.deepStrictEqual(shown(withList(), ['all'], ['all'], ['latest']), LATEST);
});

test('filtering by source matches any source a string was published in', () => {
  // chrome120 is in common/ as well, and common/ is generated from data/, so it
  // is both a most_common string and a latest one.
  const list = shown(withList(), ['all'], ['all'], ['latest']);
  assert.ok(list.includes(UA.chrome120), 'a most_common string is also a latest one');
});

test('filtering by most_common returns the merged strings', () => {
  assert.deepStrictEqual(shown(withList(), ['all'], ['all'], ['most_common']), [UA.chrome120]);
});

test('several selected sources return the union without double counting', () => {
  assert.deepStrictEqual(shown(withList(), ['all'], ['all'], ['most_common', 'latest']), LATEST);
});

test("'all' as a source disables source filtering", () => {
  const b = withList();
  assert.strictEqual(b.spoofer.getFilteredUserAgents(['all'], ['all'], ['all']).length, LIST.length);
});

test('a single source can be passed as a plain string', () => {
  assert.deepStrictEqual(shown(withList(), ['all'], ['all'], 'most_common'), [UA.chrome120]);
});

test('a source nothing matches returns nothing', () => {
  assert.deepStrictEqual(shown(withList(), ['all'], ['all'], ['nonexistent']), []);
});

test('custom and fallback strings are reachable but not part of latest', () => {
  const b = withList();
  assert.deepStrictEqual(shown(b, ['all'], ['all'], ['custom']), ['custom-ua']);
  assert.deepStrictEqual(shown(b, ['all'], ['all'], ['fallback']), ['fallback-ua']);
  assert.ok(!shown(b, ['all'], ['all'], ['latest']).includes('custom-ua'));
});

test('a legacy scalar source still matches', () => {
  // Records built before source became a list are still in some users' caches.
  const b = withList();
  b.spoofer.userAgents.push({ ua: 'legacy-ua', source: 'latest', device: 'desktop' });
  assert.ok(shown(b, ['all'], ['all'], ['latest']).includes('legacy-ua'));
});

test('device and source filters combine', () => {
  assert.deepStrictEqual(shown(withList(), ['android'], ['all'], ['latest']), [UA.androidChrome]);
  assert.deepStrictEqual(shown(withList(), ['ipad'], ['all'], ['latest']), [UA.ipad]);
  assert.deepStrictEqual(shown(withList(), ['ipad'], ['all'], ['most_common']), []);
});

test('browser filtering still works', () => {
  assert.deepStrictEqual(shown(withList(), ['all'], ['firefox'], ['latest']), [UA.firefox157]);
  // Safari covers desktop and iOS, and must not pick up the Chrome strings.
  assert.deepStrictEqual(shown(withList(), ['all'], ['safari'], ['latest']), [UA.macSafari, UA.iphone, UA.ipad]);
  assert.deepStrictEqual(shown(withList(), ['all'], ['chrome'], ['latest']), [UA.chrome120, UA.chrome155, UA.androidChrome]);
});

test('an empty list filters to empty rather than throwing', async () => {
  const b = await loadBackground({ routes: full() });
  assert.deepStrictEqual(b.spoofer.getFilteredUserAgents(['all'], ['all'], ['latest']), []);
});

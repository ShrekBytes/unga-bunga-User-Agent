'use strict';

// Scope mirroring: the injection layer must cover exactly the pages whose
// request headers get rewritten. A page with spoofed headers but a real
// navigator (or the reverse) is the detection webbrowsertools.com and
// Cloudflare-style checks flag, which is the core of issue #4.

const test = require('node:test');
const assert = require('node:assert');
const { loadBackground } = require('./helpers/load-extension');

const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36';

async function loaded(store = { isEnabled: true, currentUserAgent: CHROME }) {
  const { spoofer, ready } = loadBackground({ store });
  await ready;
  return spoofer;
}

test('all mode: scope is all urls, nothing excluded', async () => {
  const spoofer = await loaded({ isEnabled: true, currentUserAgent: CHROME, mode: 'all' });
  const scope = spoofer.injectionScope();
  assert.deepStrictEqual(scope, { all: true, include: [], exclude: [] });
});

test('blacklist mode: scope is all urls minus normalized blacklist hosts', async () => {
  const spoofer = await loaded({
    isEnabled: true,
    currentUserAgent: CHROME,
    mode: 'blacklist',
    blacklist: ['https://Ads.Example.com/', '*.meta.example.org', 'bad host']
  });
  const scope = spoofer.injectionScope();
  assert.strictEqual(scope.all, true);
  assert.deepStrictEqual(scope.exclude, ['ads.example.com', 'meta.example.org']);
});

test('whitelist mode with entries: scope is exactly the listed hosts', async () => {
  const spoofer = await loaded({
    isEnabled: true,
    currentUserAgent: CHROME,
    mode: 'whitelist',
    whitelist: ['example.com', 'https://Foo.Bar.example.org/page']
  });
  const scope = spoofer.injectionScope();
  assert.strictEqual(scope.all, false);
  assert.deepStrictEqual(scope.include, ['example.com', 'foo.bar.example.org']);
});

test('whitelist mode with no entries: every page spoofs, so scope is all urls', async () => {
  const spoofer = await loaded({
    isEnabled: true,
    currentUserAgent: CHROME,
    mode: 'whitelist',
    whitelist: []
  });
  assert.strictEqual(spoofer.injectionScope().all, true);
});

test('disabled extension: scope is empty, matching the header layer doing nothing', async () => {
  const spoofer = await loaded({ isEnabled: false, currentUserAgent: CHROME, mode: 'all' });
  const scope = spoofer.injectionScope();
  assert.deepStrictEqual(scope, { all: false, include: [], exclude: [] });
});

test('injection scope and header decisions agree for the same request', async () => {
  const spoofer = await loaded({
    isEnabled: true,
    currentUserAgent: CHROME,
    mode: 'whitelist',
    whitelist: ['example.com']
  });

  const covered = 'https://example.com/page';
  const uncovered = 'https://other.org/page';

  // The page whose headers get rewritten must be inside the injection scope...
  assert.strictEqual(spoofer.shouldApplyUserAgent(covered), true);
  assert.strictEqual(spoofer.injectionScope().include.includes('example.com'), true);

  // ...and the page whose headers stay real must be outside it.
  assert.strictEqual(spoofer.shouldApplyUserAgent(uncovered), false);
  assert.strictEqual(spoofer.injectionScope().all, false);
  assert.strictEqual(spoofer.injectionScope().include.includes('other.org'), false);
});

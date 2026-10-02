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

// unregister + register is not atomic. A document that starts loading between
// the two calls never runs a content script at all, so a startup that has
// nothing to change must not open that window -- it is the "closed and
// reopened the browser and the page still leaked the real UA" report in #4.

test('applying an unchanged scope leaves the registration alone', async () => {
  const { spoofer, scripting, ready } = loadBackground({
    store: { isEnabled: true, currentUserAgent: CHROME, mode: 'all' }
  });
  await ready;

  const afterInit = {
    register: scripting.registerCalls,
    unregister: scripting.unregisterCalls
  };
  assert.ok(afterInit.register >= 1, 'init must register the content scripts once');

  await spoofer.applyInjectionScope();

  assert.strictEqual(scripting.registerCalls, afterInit.register,
    'a startup with nothing to change must not rewrite the registration');
  assert.strictEqual(scripting.unregisterCalls, afterInit.unregister,
    'a startup with nothing to change must not unregister, which is the leaking gap');
});

test('a scope that actually moved still rewrites the registration', async () => {
  const { spoofer, scripting, ready } = loadBackground({
    store: { isEnabled: true, currentUserAgent: CHROME, mode: 'all' }
  });
  await ready;

  const before = scripting.registerCalls;
  spoofer.mode = 'whitelist';
  spoofer.whitelist = ['example.com'];
  await spoofer.applyInjectionScope();

  assert.ok(scripting.registerCalls > before,
    'narrowing the scope must re-register, or the new scope never takes effect');
});

test('scopeSignature ignores ordering but not behaviour', () => {
  const { UserAgentSpoofer } = loadBackground({
    store: { isEnabled: true, currentUserAgent: CHROME, mode: 'all' }
  });
  const base = [{
    id: 'a',
    js: ['inject/main.js'],
    matches: ['*://b.example/*', '*://a.example/*'],
    runAt: 'document_start',
    world: 'MAIN',
    allFrames: true
  }];
  const reordered = [{ ...base[0], matches: ['*://a.example/*', '*://b.example/*'] }];
  const same = UserAgentSpoofer.scopeSignature(base);

  assert.strictEqual(UserAgentSpoofer.scopeSignature(reordered), same,
    'the same scope reported in a different order is the same scope');

  for (const [field, value] of [
    ['matches', ['*://*/*']],
    ['js', ['inject/no-op.js']],
    ['world', 'ISOLATED'],
    ['runAt', 'document_idle'],
    ['allFrames', false]
  ]) {
    const changed = [{ ...base[0], [field]: value }];
    assert.notStrictEqual(UserAgentSpoofer.scopeSignature(changed), same,
      `a changed ${field} must be visible to the comparison`);
  }

  const dropped = [];
  assert.notStrictEqual(UserAgentSpoofer.scopeSignature(dropped), same,
    'losing the registration entirely must force a rewrite');
});

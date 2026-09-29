'use strict';

// How a single upstream file is read. Every case here is a way the dataset can
// break: the retired `latest/` paths, the schema v4 move from bare strings to
// records, and a future rename of the field the User-Agent header depends on.

const test = require('node:test');
const assert = require('node:assert');
const { loadBackground, ok, status, notFound } = require('./helpers/load-extension');
const { commonFile, observedFile, syntheticFile, record, UA } = require('./helpers/fixtures');

const file = (over = {}) => ({ url: 'https://example.test/data/desktop.json', source: 'latest', category: 'desktop', ...over });
const read = async (payload, over) => {
  const b = loadBackground({ routes: { 'data/desktop.json': ok(payload) } });
  return b.spoofer.fetchUserAgentFile(file(over));
};

test('reads bare strings from common/ (keys unchanged since v1)', async () => {
  const b = await loadBackground({ routes: { 'common/desktop.json': ok(commonFile('desktop', [UA.chrome120, UA.macSafari])) } });
  const strings = await b.spoofer.fetchUserAgentFile(file({ url: 'x/common/desktop.json', source: 'most_common' }));
  assert.deepStrictEqual(strings, [UA.chrome120, UA.macSafari]);
});

test('reads the user_agent field from schema v4 records', async () => {
  const strings = await read(observedFile('desktop', [UA.chrome155, UA.firefox157]));
  assert.deepStrictEqual(strings, [UA.chrome155, UA.firefox157]);
});

test('reads records whose count is null, which is not the same as absent', async () => {
  const strings = await read(observedFile('desktop', [record(UA.chrome155, { count: null, percentage: null, count_source: null })]));
  assert.deepStrictEqual(strings, [UA.chrome155]);
});

test('accepts a file mixing strings and records', async () => {
  const strings = await read({ user_agents: [UA.chrome120, record(UA.chrome155)] });
  assert.deepStrictEqual(strings, [UA.chrome120, UA.chrome155]);
});

test('never lets a record object through as a user agent', async () => {
  const strings = await read(observedFile('desktop', [UA.chrome155]));
  for (const ua of strings) assert.strictEqual(typeof ua, 'string');
});

test('drops non-string and empty entries', async () => {
  const strings = await read({ user_agents: [UA.chrome155, null, 42, '', {}, record(UA.firefox157)] });
  assert.deepStrictEqual(strings, [UA.chrome155, UA.firefox157]);
});

test('an empty list is legitimate and is not an error', async () => {
  // Upstream publishes an empty common/ when the source that orders it is down.
  assert.deepStrictEqual(await read({ user_agents: [] }), []);
});

test('a 404 on an optional file yields nothing rather than failing', async () => {
  // synthetic/ is published per category only while the manifest supports a
  // template, so absence is the normal case, not an outage.
  const b = await loadBackground({ routes: { 'synthetic/desktop.json': notFound() } });
  assert.deepStrictEqual(await b.spoofer.fetchUserAgentFile(file({ url: 'x/synthetic/desktop.json', optional: true })), []);
});

test('a 500 on an optional file is still a failure', async () => {
  const b = await loadBackground({ routes: { 'synthetic/desktop.json': status(500) } });
  await assert.rejects(() => b.spoofer.fetchUserAgentFile(file({ url: 'x/synthetic/desktop.json', optional: true })), /responded 500/);
});

for (const code of [404, 403, 500, 503]) {
  test(`a ${code} on a required file is a failure, not an empty category`, async () => {
    const b = await loadBackground({ routes: { 'data/desktop.json': status(code) } });
    await assert.rejects(() => b.spoofer.fetchUserAgentFile(file()), new RegExp(`responded ${code}`));
  });
}

test('a retired path 404s rather than returning a stale file', async () => {
  // The bug this replaces: latest/*.json 404s, and reading the body as JSON is
  // what used to abort the whole fetch.
  const b = await loadBackground();
  await assert.rejects(() => b.spoofer.fetchUserAgentFile(file({ url: 'x/latest/windows.json' })), /responded 404/);
});

test('a body that is not JSON is a failure', async () => {
  const b = await loadBackground({ routes: { 'data/desktop.json': { ok: true, status: 200, json: async () => { throw new SyntaxError('Unexpected token <'); } } } });
  await assert.rejects(() => b.spoofer.fetchUserAgentFile(file()), SyntaxError);
});

test('a missing user_agents key is a failure', async () => {
  await assert.rejects(() => read({ records: [] }), /no user_agents list/);
});

test('a user_agents key that is no longer a list is a failure', async () => {
  await assert.rejects(() => read({ user_agents: { desktop: [] } }), /no user_agents list/);
});

test('records we recognise none of means the field was renamed', async () => {
  // A v5 file whose records carry `ua_string` instead of `user_agent` would
  // otherwise parse to an empty category and look like a quiet outage.
  await assert.rejects(() => read({ schema_version: 5, user_agents: [{ ua_string: UA.chrome155 }] }), /no recognisable user agent field/);
});

test('synthetic/ files parse the same way as data/ files', async () => {
  const b = await loadBackground({ routes: { 'synthetic/desktop.json': ok(syntheticFile('desktop', [UA.chrome155])) } });
  const strings = await b.spoofer.fetchUserAgentFile(file({ url: 'x/synthetic/desktop.json', source: 'latest' }));
  assert.deepStrictEqual(strings, [UA.chrome155]);
});

'use strict';

// How the fetched files become the list the popup shows: what order it is in,
// what gets cut by the 200 cap, and how the cap is shared between categories.

const test = require('node:test');
const assert = require('node:assert');
const { loadBackground } = require('./helpers/load-extension');
const { dataset, UA } = require('./helpers/fixtures');

const build = async routes => (await loadBackground({ routes })).build();

/** `count` distinct, plausible strings for a category. */
function filler(category, count) {
  return Array.from({ length: count }, (_, i) =>
    `Mozilla/5.0 (${category === 'tablet' ? 'iPad; CPU OS 26_7' : 'Windows NT 10.0; Win64; x64'}) Filler/${category}-${i}`);
}

const versions = count => Array.from({ length: count }, (_, i) => 100 + i);
const chrome = major => `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36`;
const iphone = os => `Mozilla/5.0 (iPhone; CPU iPhone OS ${os}_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${os}.6 Mobile/15E148 Safari/604.1`;

test('merges a string published in both common/ and data/ into one entry', async () => {
  // common/ is generated from data/ upstream, so this is the normal case, not
  // an edge one. Without merging, every measured string appears twice.
  const list = await build(dataset({
    desktop: [UA.chrome155],
    common: { desktop: [UA.chrome155] }
  }));
  const entry = list.find(e => e.ua === UA.chrome155);
  assert.ok(entry, 'string should be present');
  assert.strictEqual(list.filter(e => e.ua === UA.chrome155).length, 1, 'should not be duplicated');
});

test('a merged entry keeps every source it was published in', async () => {
  // Otherwise the Most Common filter would only ever match strings the Latest
  // filter also offers, and would be empty.
  const list = await build(dataset({
    desktop: [UA.chrome155, UA.chrome120],
    common: { desktop: [UA.chrome155] }
  }));
  assert.deepStrictEqual(list.find(e => e.ua === UA.chrome155).source, ['latest', 'most_common']);
  assert.deepStrictEqual(list.find(e => e.ua === UA.chrome120).source, ['latest']);
});

test('a string only in common/ is still offered, as most_common', async () => {
  const list = await build(dataset({ common: { desktop: [UA.chrome120] } }));
  const entry = list.find(e => e.ua === UA.chrome120);
  assert.deepStrictEqual(entry.source, ['most_common']);
});

test('every entry carries a list of sources, never a bare string', async () => {
  const list = await build(dataset({
    desktop: [UA.chrome155], mobile: [UA.iphone], tablet: [UA.ipad],
    common: { desktop: [UA.chrome120], mobile: [UA.iphone], tablet: [] }
  }));
  for (const entry of list) {
    assert.ok(Array.isArray(entry.source), `source should be a list: ${JSON.stringify(entry)}`);
    assert.ok(entry.source.length > 0, 'source should not be empty');
  }
});

test('no entry ever holds a record object', async () => {
  const list = await build(dataset({ desktop: [UA.chrome155], synthetic: { desktop: [UA.chrome155] } }));
  for (const entry of list) assert.strictEqual(typeof entry.ua, 'string');
});

test('synthetic leads, because it is built from currently-shipping versions', async () => {
  // data/ orders measured high-traffic records first, which is deliberately
  // where the old versions sit, so it cannot lead on its own.
  const list = await build(dataset({
    desktop: [UA.chrome120, UA.chrome155],
    synthetic: { desktop: [UA.firefox157] }
  }));
  assert.strictEqual(list[0].ua, UA.firefox157);
  assert.ok(list.indexOf(list.find(e => e.ua === UA.firefox157)) < list.indexOf(list.find(e => e.ua === UA.chrome120)));
});

test('ties fall back to upstream order', async () => {
  // Ranking is by currency, so upstream's order only decides between strings
  // that score the same. Chrome 155 appears twice here, as a plain and an
  // Edge-flavoured string.
  const edge155 = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36 Edg/155.0.0.0';
  const list = await build(dataset({ desktop: [edge155, UA.chrome155] }));
  const order = list.filter(e => e.device === 'desktop').map(e => e.ua);
  assert.deepStrictEqual(order, [edge155, UA.chrome155], 'equal scores should keep upstream order');
});

test('stale versions are cut before current ones', async () => {
  // The reason this exists: selection is a uniform random pick, so a stale
  // string anywhere in the list is as likely to be handed out as a current one.
  // Ordering alone does not fix that, the cut has to.
  const versions = [21, 30, 38, 78, 120, 131, 137, 150, 152, 153, 154, 155];
  const b = await loadBackground({ routes: dataset({ desktop: versions.map(v => chrome(v)) }) });
  const list = await b.build();
  const kept = list.map(e => Number(/Chrome\/(\d+)/.exec(e.ua)[1]));
  assert.deepStrictEqual(kept, [155, 154, 153, 152, 150, 137, 131, 120, 78, 38, 30, 21],
    'with room to spare, order should be newest first');
});

test('the cap cuts the oldest versions when it has to', async () => {
  // More strings than the cap, so a cut actually happens: 300 desktop entries
  // compete for the whole 200.
  const b = await loadBackground({ routes: dataset({ desktop: versions(300).map(chrome) }) });
  const list = await b.build();
  const kept = list.map(e => Number(/Chrome\/(\d+)/.exec(e.ua)[1]));
  assert.strictEqual(kept.length, 200);
  assert.ok(Math.min(...kept) >= 200, `oldest kept was Chrome ${Math.min(...kept)}, expected the stale tail to be cut`);
});

test('a string with no browser token ranks last and is cut first', async () => {
  // A bare WebKit string is the worst thing to hand someone as a spoofed
  // browser, and it must never outrank a real browser version.
  const b = await loadBackground({
    routes: dataset({ desktop: ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', ...versions(300).map(chrome)] })
  });
  const list = await b.build();
  assert.ok(!list.some(e => e.ua.endsWith('AppleWebKit/537.36')), 'the bare WebKit string should have been cut');
});

test('a current iOS version is not mistaken for an old browser', async () => {
  // Safari 26 is current iOS. Ranked as one number against Chrome majors it
  // sorts below Chrome 30 and gets cut, which is the bug this guards.
  const b = await loadBackground({
    routes: dataset({ mobile: [iphone(26), ...versions(300).map(chrome)] })
  });
  const list = await b.build();
  assert.ok(list.some(e => e.ua.includes('iPhone OS 26')), 'current iOS should survive alongside Chrome majors');
});

test('the list is capped at 200', async () => {
  // Pinned to the literal, not to UA_LIST_LIMIT: a test that reads the constant
  // it is asserting on passes just as happily at 5000.
  assert.strictEqual(loadBackground({ routes: {} }).UA_LIST_LIMIT, 200);
  const b = await loadBackground({ routes: dataset({ desktop: filler('desktop', 400) }) });
  assert.strictEqual((await b.build()).length, 200);
});

test('bots are not fetched', async () => {
  // Every string here goes straight into a User-Agent header, and a crawler
  // string is never the answer being looked for.
  const b = await loadBackground({ routes: dataset({ desktop: [UA.chrome155] }) });
  await b.spoofer.fetchUserAgents();
  assert.ok(!b.UA_CATEGORIES.includes('bot'));
  assert.ok(!b.UA_FILES.some(file => file.url.includes('/bot')), 'no bot file should be requested');
  assert.ok(!b.calls.some(url => url.includes('bot')), `bot was requested: ${b.calls.join(', ')}`);
});

test('a synthetic string is published in the latest bucket', async () => {
  // Synthetic is folded into Latest on purpose, so it must be reachable by the
  // Latest filter and not appear as a source of its own.
  const b = await loadBackground({ routes: dataset({ desktop: [UA.chrome120], synthetic: { desktop: [UA.chrome155] } }) });
  const list = await b.build();
  const entry = list.find(e => e.ua === UA.chrome155);
  assert.deepStrictEqual(entry.source, ['latest']);
  assert.ok(!b.spoofer.getFilteredUserAgents(['all'], ['all'], ['latest']).length < 1);
});

test('the cap does not fall over into a single category', async () => {
  // data/desktop plus data/mobile alone is more than the cap, so a global cut
  // would leave the iPad filter with nothing to show.
  const b = await loadBackground({
    routes: dataset({ desktop: filler('desktop', 120), mobile: filler('mobile', 100), tablet: filler('tablet', 30) })
  });
  const list = await b.build();
  const byCategory = list.reduce((acc, e) => ({ ...acc, [e.device]: (acc[e.device] || 0) + 1 }), {});
  assert.strictEqual(list.length, b.UA_LIST_LIMIT);
  assert.ok(byCategory.tablet >= 25, `tablet should keep nearly all it has, got ${byCategory.tablet}`);
  assert.ok(Math.abs(byCategory.desktop - byCategory.mobile) <= 2, `desktop ${byCategory.desktop} vs mobile ${byCategory.mobile}`);
  assert.ok(byCategory.tablet > 0, 'tablet must not be starved');
});

test('a short category hands its unused share to the others', async () => {
  const b = await loadBackground({ routes: dataset({ desktop: filler('desktop', 200), mobile: filler('mobile', 200) }) });
  const list = await b.build();
  const byCategory = list.reduce((acc, e) => ({ ...acc, [e.device]: (acc[e.device] || 0) + 1 }), {});
  assert.deepStrictEqual(byCategory, { desktop: 100, mobile: 100 });
  assert.strictEqual(list.length, 200);
});

test('a category with no data at all does not stall the others', async () => {
  const list = await build(dataset({ desktop: [UA.chrome155], mobile: [], tablet: [] }));
  assert.deepStrictEqual(list.map(e => e.ua), [UA.chrome155]);
});

test('a dataset smaller than the cap is passed through whole', async () => {
  const list = await build(dataset({ desktop: [UA.chrome155], mobile: [UA.iphone], tablet: [UA.ipad] }));
  assert.strictEqual(list.length, 3);
});

test('every device the popup filters on has something to show', async () => {
  // The six checkboxes in popup.html. A regression here is invisible until
  // someone selects iPad and gets an empty list.
  const b = await loadBackground({
    routes: dataset({
      desktop: [UA.chrome155, UA.firefox157, UA.macSafari, UA.linux],
      mobile: [UA.androidChrome, UA.iphone],
      tablet: [UA.ipad]
    })
  });
  const list = await b.build();
  for (const device of ['android', 'iphone', 'ipad', 'linux', 'mac', 'windows']) {
    const shown = list.filter(e => b.spoofer.checkDeviceMatch(e.ua.toLowerCase(), device));
    assert.ok(shown.length > 0, `device filter "${device}" matched nothing`);
  }
});

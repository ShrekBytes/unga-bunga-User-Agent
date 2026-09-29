'use strict';

// How the fetched files become the list the popup shows: what order it is in,
// which strings the freshness floor drops, and how the cap is shared between
// categories.

const test = require('node:test');
const assert = require('node:assert');
const { loadBackground } = require('./helpers/load-extension');
const { dataset, UA } = require('./helpers/fixtures');

const build = async routes => (await loadBackground({ routes })).build();

/**
 * `count` distinct, plausible strings for a category, all at one browser major
 * so they all clear the freshness floor. The `major` is in the string, not just
 * the index, so a test can offer two tiers of the same browser and check which
 * one survives.
 */
function filler(category, count, major = 155) {
  const platform = category === 'tablet' ? 'iPad; CPU OS 26_7' : 'Windows NT 10.0; Win64; x64';
  return Array.from({ length: count }, (_, i) =>
    `Mozilla/5.0 (${platform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Filler/${category}-${i} Safari/537.36`);
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

test('stale versions are dropped even when the list has room', async () => {
  // The reason this exists: selection is a uniform random pick, so a stale
  // string anywhere in the list is as likely to be handed out as a current one.
  // Ordering alone does not fix that, the strings have to go.
  //
  // Only 9 of these 12 clear the floor, so the list has room and the drop is
  // the floor's doing rather than the cap's.
  const offered = [21, 30, 38, 78, 120, 131, 137, 150, 152, 153, 154, 155];
  const b = await loadBackground({ routes: dataset({ desktop: offered.map(v => chrome(v)) }) });
  const list = await b.build();
  const kept = list.map(e => Number(/Chrome\/(\d+)/.exec(e.ua)[1]));
  assert.deepStrictEqual(kept, [155, 154, 153, 152, 150, 137, 131, 120, 78],
    'the order should still be newest first, and the pre-78 tail should be gone');
});

test('the cap cuts the list when the floor leaves more than it can hold', async () => {
  // 400 strings that all clear the floor, so the floor cannot be what trims the
  // list: only the cap can, and it has to.
  const b = await loadBackground({ routes: dataset({ desktop: filler('desktop', 400) }) });
  assert.strictEqual((await b.build()).length, 333);
});

test('a string with no browser token is dropped, not just ranked last', async () => {
  // A bare WebKit string is the worst thing to hand someone as a spoofed
  // browser. It used to survive whenever the list had room, because the only
  // thing cutting was the cap and the cap had stopped binding.
  const b = await loadBackground({
    routes: dataset({ desktop: ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', ...filler('desktop', 10)] })
  });
  const list = await b.build();
  assert.ok(!list.some(e => e.ua.endsWith('AppleWebKit/537.36')), 'the bare WebKit string should have been dropped');
  assert.strictEqual(list.length, 10, 'the real browser strings should all survive');
});

test('a third-party in-app browser is dropped', async () => {
  // GSA and Flipboard are apps with an embedded browser, not browsers.
  // Upstream publishes seven near-identical GSA strings for iOS, so without a
  // floor they crowd out the real iOS browsers they sit beside.
  const gsa = os => `Mozilla/5.0 (iPhone; CPU iPhone OS ${os} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/439.4.980558000 Mobile/15E148 Safari/604.1`;
  const b = await loadBackground({
    routes: dataset({ mobile: [gsa('26_5_2'), gsa('26_6_0'), gsa('26_6_1'), gsa('26_6_2'), UA.iphone] })
  });
  const list = await b.build();
  assert.deepStrictEqual(list.map(e => e.ua), [UA.iphone], 'only the real iOS browser should survive');
});

test('the floor is measured against the newest version published, not the newest kept', async () => {
  // If the reference were computed after filtering, a family whose newest
  // string was itself stale would drag the bar down and keep even older ones.
  // Chrome 155 is the newest published, so Chrome 30 scores 0.19 and goes.
  const b = await loadBackground({ routes: dataset({ desktop: [chrome(155), chrome(30)] }) });
  assert.deepStrictEqual((await b.build()).map(e => e.ua), [chrome(155)]);
});

test('a current Chrome on iOS is ranked, not dropped for having no token', async () => {
  // iOS forbids third-party engines, so Chrome on an iPhone ships as CriOS and
  // never carries a `Chrome/` token. Without a token for it, every current
  // Chrome-on-iOS string scores zero and falls below the floor, which is what
  // had emptied the iPhone filter down to 20.
  const crios = (os, major) => `Mozilla/5.0 (iPhone; CPU iPhone OS ${os} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/${major}.0.8037.55 Mobile/15E148 Safari/604.1`;
  const b = await loadBackground({
    routes: dataset({ mobile: [crios('26_6_2', 154), crios('15_8_1', 43), UA.iphone] })
  });
  const kept = (await b.build()).map(e => e.ua);
  assert.ok(kept.includes(crios('26_6_2', 154)), 'CriOS 154 matches the current Chrome and should stay');
  assert.ok(!kept.includes(crios('15_8_1', 43)), 'CriOS 43 is genuinely old and should go');
  assert.ok(kept.includes(UA.iphone), 'the real iOS browser should be unaffected');
});

test('a current Firefox on iOS is ranked, not dropped for having no token', async () => {
  const fxios = (os, major) => `Mozilla/5.0 (iPhone; CPU iPhone OS ${os} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/${major}.0 Mobile/15E148 Safari/605.1.15`;
  const b = await loadBackground({
    routes: dataset({ mobile: [fxios('18_7', 157), fxios('15_8_1', 70), UA.iphone] })
  });
  const kept = (await b.build()).map(e => e.ua);
  assert.ok(kept.includes(fxios('18_7', 157)), 'FxiOS 157 matches the current Firefox and should stay');
  assert.ok(!kept.includes(fxios('15_8_1', 70)), 'FxiOS 70 is 0.45 of current and should go');
});

test('an iOS version is ranked against the newest Safari published, whichever category it came from', async () => {
  // The reference is one number per family across the whole dataset, not per
  // category. iOS 17 is two years old and sits at 0.65 of Safari 26, so it
  // stays; a version that is genuinely far behind is the one that goes.
  const b = await loadBackground({ routes: dataset({ desktop: [UA.macSafari], mobile: [iphone(17), iphone(12)] }) });
  const kept = (await b.build()).map(e => e.ua);
  assert.deepStrictEqual(kept, [UA.macSafari, iphone(17)], 'iOS 12 is 0.46 of Safari 26 and goes');
});

test('a version at exactly half the newest is kept, below it is not', async () => {
  // The floor's boundary, pinned so that moving the constant is a deliberate act.
  const b = await loadBackground({ routes: dataset({ desktop: [chrome(155), chrome(78), chrome(77)] }) });
  const kept = (await b.build()).map(e => Number(/Chrome\/(\d+)/.exec(e.ua)[1]));
  assert.deepStrictEqual(kept, [155, 78], '78/155 is 0.50 and stays, 77/155 is 0.48 and goes');
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

test('the list is capped at 333', async () => {
  // Pinned to the literal, not to UA_LIST_LIMIT: a test that reads the constant
  // it is asserting on passes just as happily at 5000.
  assert.strictEqual(loadBackground({ routes: {} }).UA_LIST_LIMIT, 333);
  const b = await loadBackground({ routes: dataset({ desktop: filler('desktop', 500) }) });
  assert.strictEqual((await b.build()).length, 333);
});

test('the cap sits above the published dataset, so nothing is cut for being last', async () => {
  // Upstream publishes 242 distinct strings today, so at 333 the cap is headroom
  // rather than a cut. This is the property that lets the freshness floor be a
  // real rule instead of a side effect of the cap happening to bind.
  const b = await loadBackground({
    routes: dataset({ desktop: filler('desktop', 112), mobile: filler('mobile', 94), tablet: filler('tablet', 36) })
  });
  assert.strictEqual((await b.build()).length, 242);
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
  // More strings in total than the cap, so a global cut would have to pick a
  // winner. Upstream publishes 112 desktop against 36 tablet, so the cut would
  // go to desktop and leave the iPad filter with nothing to show.
  const b = await loadBackground({
    routes: dataset({ desktop: filler('desktop', 400), mobile: filler('mobile', 100), tablet: filler('tablet', 36) })
  });
  const list = await b.build();
  const byCategory = list.reduce((acc, e) => ({ ...acc, [e.device]: (acc[e.device] || 0) + 1 }), {});
  assert.strictEqual(list.length, b.UA_LIST_LIMIT);
  // The guarantee is that a category is never cut below what it published, not
  // that the three end up equal. Shares only stay level while every category
  // still has strings to hand out; once tablet runs dry its unused share passes
  // to the others, and once mobile runs dry the remainder goes to desktop.
  assert.strictEqual(byCategory.tablet, 36, 'tablet should keep all it published');
  assert.strictEqual(byCategory.mobile, 100, 'mobile should keep all it published');
  assert.strictEqual(byCategory.desktop, 197, 'desktop absorbs what the others could not use');
});

test('a short category hands its unused share to the others', async () => {
  // 400 across two categories for a budget of 333, so the split is 167/166
  // rather than half and half. A category that cannot use its share must not
  // leave that share unspent.
  const b = await loadBackground({ routes: dataset({ desktop: filler('desktop', 200), mobile: filler('mobile', 200) }) });
  const list = await b.build();
  const byCategory = list.reduce((acc, e) => ({ ...acc, [e.device]: (acc[e.device] || 0) + 1 }), {});
  assert.deepStrictEqual(byCategory, { desktop: 167, mobile: 166 });
  assert.strictEqual(list.length, 333);
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

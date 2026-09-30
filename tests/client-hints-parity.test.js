'use strict';

// Client hints parity: the Sec-CH-UA headers (background.js) and the
// navigator.userAgentData spoof (inject/override.js) must derive from the
// same algorithms, or a page sees headers that disagree with its own
// navigator — the class of mismatch issue #4 is about. The functions live in
// two separate bundles, so both are loaded the way Firefox loads them and
// their outputs are compared here.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const { UA } = require('./helpers/fixtures');

const { loadBackground } = require('./helpers/load-extension');

// The header-layer builders are loaded the way manifest.json loads
// background.js (plain script, top-level consts), so loadBackground exposes
// them directly from the same evaluation the tests already run.
function loadHeaderLayer() {
  const { clientHintsHeaders, chBrandListOf, chPlatformOf } = loadBackground({});
  return { clientHintsHeaders, chBrandListOf, chPlatformOf };
}

// Load the MAIN-world override in a bare sandbox: it is written as a top-level
// block that reads `port` from getElementById, so a stub with the same surface
// (getElementById, addEventListener) is enough to run it and capture `override`.
function loadOverrideLayer() {
  const subscribed = [];
  const port = {
    dataset: {
      // isolated.js stamps its frame id on the port before dispatching; the
      // override handler routes on it
      id: 'x',
      str: encodeURIComponent(JSON.stringify({
        userAgent: UA.chrome155,
        appVersion: '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36',
        platform: 'Win32',
        vendor: 'Google Inc.',
        product: 'Gecko',
        appName: 'Netscape',
        appCodeName: 'Mozilla',
        oscpu: '[delete]',
        buildID: '[delete]',
        productSub: '20030107',
        userAgentDataBuilder: { p: { browser: { name: 'Chrome', major: '155' }, os: { name: 'Windows' } }, ua: UA.chrome155 },
        type: 'user',
        strictParity: false
      })),
      ready: 'false'
    },
    addEventListener(name, handler) {
      subscribed.push({ name, handler });
    },
    // main.js assigns this on the real port before override.js can run
    prepare() {
      this.prefs = JSON.parse(decodeURIComponent(this.dataset.str));
      this.dataset.ready = 'true';
    }
  };
  const document = { getElementById: () => port };
  const navProto = {};
  const navigator = Object.create(navProto);

  // navigator is passed in as a parameter: Node >= 21 ships its own global
  // navigator, which would otherwise swallow the prototype accessors.
  const sandbox = new Function('document', 'port', 'console', 'subscribed', 'navigator', `
    const self = {
      HTMLIFrameElement: undefined
    };
    ${read('inject/override.js')}
    return { events: subscribed };
  `);
  const { events } = sandbox(document, port, console, subscribed, navigator);

  return {
    navigator,
    navProto,
    dispatch: () => events.find(e => e.name === 'override').handler({ detail: { id: 'x', reason: 'test' } })
  };
}

test('header layer and navigator layer agree on the brands list', () => {
  const headerLayer = loadHeaderLayer();
  const spoofer = loadBackground({});
  const parsed = spoofer.spoofer.agent.parse(UA.chrome155);

  const hints = headerLayer.clientHintsHeaders(parsed, UA.chrome155);
  const brands = headerLayer.chBrandListOf(parsed.userAgentDataBuilder.p, UA.chrome155);
  const expectedSecChUa = brands.map(e => `"${e.brand}";v="${e.version}"`).join(', ');
  assert.strictEqual(hints['sec-ch-ua'], expectedSecChUa);

  // Chrome 155: GREASE chars/versions are drawn with modulus over the full
  // arrays (11 chars, 3 versions) and the order permutation by seed 155 % 6.
  assert.strictEqual(
    hints['sec-ch-ua'],
    '"Google Chrome";v="155", "Chromium";v="155", "Not(A:Brand";v="24"'
  );

  // And the MAIN-world spoof of the same UA produces exactly the same list.
  const layer = loadOverrideLayer();
  layer.dispatch();
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(layer.navigator.userAgentData.brands)),
    brands
  );
});

test('platform header value is one of the 8 spec values, never a distro name', () => {
  const headerLayer = loadHeaderLayer();
  const spoofer = loadBackground({});
  const linuxParsed = spoofer.spoofer.agent.parse(UA.linux);
  const hints = headerLayer.clientHintsHeaders(linuxParsed, UA.linux);
  assert.strictEqual(hints['sec-ch-ua-platform'], '"Linux"');
});

test('the mobileness regex is identical in both layers', () => {
  const headerLayer = loadHeaderLayer();
  const spoofer = loadBackground({});
  const androidParsed = spoofer.spoofer.agent.parse(UA.androidChrome);
  const hints = headerLayer.clientHintsHeaders(androidParsed, UA.androidChrome);
  assert.strictEqual(hints['sec-ch-ua-mobile'], '?1');
  const desktopHints = headerLayer.clientHintsHeaders(
    spoofer.spoofer.agent.parse(UA.chrome155), UA.chrome155
  );
  assert.strictEqual(desktopHints['sec-ch-ua-mobile'], '?0');
});

test('override.js places accessors on the prototype, not the instance', () => {
  const layer = loadOverrideLayer();
  layer.dispatch();

  // The instance must carry no own properties (real Chrome has none)...
  assert.strictEqual(Object.getOwnPropertyNames(layer.navigator).length, 0);
  // ...and the prototype accessors must answer with the spoofed values.
  assert.strictEqual(layer.navigator.userAgent, UA.chrome155);
  assert.strictEqual(layer.navigator.userAgentData.brands[1].version, '155');
});

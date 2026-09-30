'use strict';

// appVersion derivation: the "[normal] navigator.userAgent is different from
// [aggressive] navigator.appVersion" failure in issue #4 was a parse-shape
// bug. Real Chromium appVersion is the UA minus the "Mozilla/" token; real
// Firefox is the fixed "5.0 (<os>)" shape and never mirrors the rest of the
// string. The spoofed pair must be byte-consistent or the test page flags it.

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const { loadBackground } = require('./helpers/load-extension');
const { UA } = require('./helpers/fixtures');

function parse(ua) {
  const { spoofer } = loadBackground({});
  return spoofer.agent.parse(ua);
}

test('a Chrome UA derives Chromium-shaped appVersion (UA minus Mozilla/)', () => {
  const o = parse(UA.chrome155);
  assert.strictEqual(o.appVersion, UA.chrome155.replace(/^Mozilla\//, ''));
  assert.ok(o.appVersion.startsWith('5.0 (Windows NT 10.0'), o.appVersion);
});

test('a Firefox UA derives the real Firefox appVersion shape', () => {
  // Real Firefox 157 on Windows: appVersion === "5.0 (Windows)", never a
  // mirror of the platform string or the Gecko token.
  const o = parse(UA.firefox157);
  assert.strictEqual(o.appVersion, '5.0 (Windows)');
});

test('a Firefox UA pins vendor to empty and Firefox-only fields to real values', () => {
  const o = parse(UA.firefox157);
  assert.strictEqual(o.vendor, '');
  assert.strictEqual(o.productSub, '20100101');
  assert.strictEqual(o.oscpu, 'Windows 10');
});

test('a Chrome UA keeps the Chromium vendor and productSub', () => {
  const o = parse(UA.chrome155);
  assert.strictEqual(o.vendor, 'Google Inc.');
  assert.strictEqual(o.productSub, '20030107');
  // The builder replaces the flag entirely (upstream deletes the key), so
  // override.js never sees a plain userAgentData value to define for CH UAs.
  assert.strictEqual(o.userAgentData, undefined);
});

test('a Safari UA marks userAgentData for deletion, like real Safari', () => {
  const o = parse(UA.macSafari);
  assert.strictEqual(o.userAgentData, '[delete]');
});

test('a Safari UA keeps the Apple vendor', () => {
  const o = parse(UA.macSafari);
  assert.strictEqual(o.vendor, 'Apple Computer, Inc.');
});

test('the parsed payload feeds both header and injection layers consistently', () => {
  const o = parse(UA.chrome155);
  // background.js serializes this same object into the Server-Timing marker
  // and the async fallback answer; override.js reads userAgent/appVersion/
  // platform/vendor/... off it. One parse, two layers: the pair the page sees
  // in navigator and the pair it sees in Sec-CH-UA cannot disagree.
  assert.strictEqual(o.userAgent, UA.chrome155);
  assert.ok(o.userAgentDataBuilder, 'a Chrome UA must carry the userAgentData builder');
  assert.strictEqual(o.userAgentDataBuilder.ua, UA.chrome155);
  assert.strictEqual(o.userAgentDataBuilder.p.browser.name, 'Chrome');
  assert.strictEqual(o.userAgentDataBuilder.p.browser.major, '155');
});

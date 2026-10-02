'use strict';

// Cross-file wiring. background.js and popup.js both call `sourceMatchesAny`,
// which lives in shared/source-match.js and is loaded as a plain script. If the
// load order or the packaged file list is wrong, the extension throws at runtime
// in a way no unit test can see, because the test loader injects the helper
// itself rather than loading it the way Firefox does.
//
// Since v5.0.0 the injection scripts are registered at runtime with
// browser.scripting (Firefox 128+, world MAIN), not statically listed in the
// manifest. A wiring mistake there (missing file, wrong world, scope drift
// between the header layer and the injection layer) fails silently in the
// same way, so it is checked here against the real files.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const manifest = JSON.parse(read('manifest.json'));
const SHARED = 'shared/source-match.js';

test('the background scripts load the shared helper before its consumer', () => {
  const scripts = manifest.background.scripts;
  const helper = scripts.indexOf(SHARED);
  const consumer = scripts.indexOf('background.js');
  assert.ok(helper !== -1, `${SHARED} must be in manifest.json background.scripts`);
  assert.ok(consumer !== -1, 'background.js must be in manifest.json background.scripts');
  assert.ok(helper < consumer, 'the helper must load before background.js, or the call throws at load');
});

test('the popup loads the shared helper before popup.js', () => {
  const html = read('popup.html');
  const helper = html.indexOf(`src="${SHARED}"`);
  const consumer = html.indexOf('src="popup.js"');
  assert.ok(helper !== -1, `${SHARED} must be loaded by popup.html`);
  assert.ok(consumer !== -1, 'popup.js must be loaded by popup.html');
  assert.ok(helper < consumer, 'the helper must load before popup.js');
});

test('the shared and inject directories are packaged into the XPI', () => {
  // The build zips an explicit file list. A helper that is not on it works in
  // about:debugging and fails for everyone who installs the released add-on.
  const lines = read('.github/workflows/build-and-release-xpi.yml').split('\n');
  const start = lines.findIndex(line => line.includes('zip -r'));
  assert.ok(start !== -1, 'could not find the zip step');

  // The command is a backslash continuation; take its arguments and nothing else.
  const listed = [];
  for (const line of lines.slice(start + 1)) {
    const continued = line.trimEnd().endsWith('\\');
    listed.push(line.trim().replace(/\\$/, '').trim());
    if (!continued) break;
  }

  // Either the shared directory or the file itself covers the helper; the
  // directory is preferable, since it picks up anything added there later.
  const covers = listed.includes('shared') || listed.includes(SHARED);
  assert.ok(covers, `the XPI must package the shared helper; listed: ${listed.join(', ')}`);
  for (const required of ['manifest.json', 'background.js', 'popup.js', 'icons', 'inject']) {
    assert.ok(listed.includes(required), `the XPI must still package ${required}; listed: ${listed.join(', ')}`);
  }
  // The static injector is gone; shipping it would mean two injection paths.
  assert.ok(!listed.includes('content.js'), 'content.js was removed and must not be packaged');
});

test('every script the manifest and popup reference exists on disk', () => {
  const referenced = [
    ...manifest.background.scripts,
    ...[...read('popup.html').matchAll(/<script src="([^"]+)"/g)].map(m => m[1])
  ];
  for (const file of referenced) {
    assert.ok(fs.existsSync(path.join(ROOT, file)), `${file} is referenced but missing`);
  }
});

test('every dynamically registered injection script exists on disk', () => {
  const source = read('background.js');
  const files = [...source.matchAll(/'(inject\/[a-z-]+\.js)'/g)].map(m => m[1]);
  assert.ok(files.includes('inject/main.js'), 'the MAIN-world bootstrap must be registered');
  assert.ok(files.includes('inject/override.js'), 'the MAIN-world override must be registered');
  assert.ok(files.includes('inject/request-headers.js'), 'the MAIN-world request patch must be registered');
  assert.ok(files.includes('inject/isolated.js'), 'the ISOLATED coordinator must be registered');
  assert.ok(files.includes('inject/no-op.js'), 'the disabled-scope placeholder must be registered');
  for (const file of [...new Set(files)]) {
    assert.ok(fs.existsSync(path.join(ROOT, file)), `${file} is registered but missing`);
  }
});

test('the injection scripts are registered with world MAIN where required', () => {
  const source = read('background.js');
  const mainBlock = source.match(/id: 'unga-bunga-spoof',\s*js: \['inject\/main\.js', 'inject\/override\.js', 'inject\/request-headers\.js'\],\s*world: 'MAIN'/);
  assert.ok(mainBlock, 'the spoof scripts must register into the MAIN world, or CSP and frames break spoofing');
  const isolatedBlock = source.match(/id: 'unga-bunga-coordinator',\s*js: \['inject\/isolated\.js'\]/);
  assert.ok(isolatedBlock, 'the coordinator must be registered separately from the spoof scripts');
  // request-headers.js patches fetch/XHR on the page's own objects, so it is
  // useless outside the MAIN world
  assert.match(source, /'inject\/request-headers\.js'[\s\S]{0,80}world: 'MAIN'/,
    'the request patch must run in the MAIN world to see the page\'s fetch');
});

test('the manifest declares what the dynamic registration needs', () => {
  assert.ok(manifest.permissions.includes('scripting'), 'registerContentScripts needs the scripting permission');
  assert.ok(manifest.permissions.includes('webRequestBlocking'), 'header rewriting needs blocking webRequest');
  const min = manifest.browser_specific_settings.gecko.strict_min_version;
  assert.ok(
    Number(min.split('.')[0]) >= 128,
    `world MAIN needs Firefox 128+, manifest requires ${min}`
  );
  // scripts registered at runtime never load as page-hosed inline <script>s;
  // main.js and override.js must stay out of web_accessible_resources
  const war = manifest.web_accessible_resources || [];
  assert.ok(!war.includes('inject/main.js'), 'main.js is registered natively, not fetched by content.js');
  assert.ok(!war.includes('inject/override.js'), 'override.js is registered natively, not fetched by content.js');
  assert.ok(!fs.existsSync(path.join(ROOT, 'content.js')), 'the inline injector was removed in v5.0.0');
});

test('the payload layers stay consistent', () => {
  const source = read('background.js');
  // The async fallback must answer with the same payload the Server-Timing
  // marker carries, or a cached/about:blank frame spoofs different data than
  // its siblings.
  assert.ok(source.includes('serverTimingPayload()'), 'the async fallback must reuse the shared payload builder');
  assert.match(source, /uasw-json-data/, 'the Server-Timing marker name must not drift');
  // override.js consumes strictParity from the payload
  const override = read('inject/override.js');
  assert.ok(override.includes('strictParity'), 'the override must honor the strictParity pref');
});

'use strict';

// Cross-file wiring. background.js and popup.js both call `sourceMatchesAny`,
// which lives in shared/source-match.js and is loaded as a plain script. If the
// load order or the packaged file list is wrong, the extension throws at runtime
// in a way no unit test can see, because the test loader injects the helper
// itself rather than loading it the way Firefox does.

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

test('the shared directory is packaged into the XPI', () => {
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

test('the helper is a single global function both consumers can see', () => {
  // Loaded the way Firefox loads it: as a plain script, no module wrapper.
  const source = read(SHARED);
  assert.match(source, /^function sourceMatchesAny\(/m, 'must declare a top-level function');
  assert.doesNotMatch(source, /\bmodule\.exports\b|\bexport\b/, 'must not be a module, it is loaded as a script');
});

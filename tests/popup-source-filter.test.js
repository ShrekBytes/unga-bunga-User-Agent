'use strict';

// The popup counts the filtered list to show "N of M". It filters on the same
// fields as the background script, and it used to compare `ua.source` for
// equality, which silently matched nothing once a string could belong to more
// than one source.

const test = require('node:test');
const assert = require('node:assert');
const { loadPopupClass, makePopup } = require('./helpers/load-extension');
const { UA } = require('./helpers/fixtures');

const USER_AGENTS = [
  { ua: UA.chrome120, source: ['latest', 'most_common'], device: 'desktop' },
  { ua: UA.chrome155, source: ['latest'], device: 'desktop' },
  { ua: UA.androidChrome, source: ['latest'], device: 'mobile' },
  { ua: 'custom-ua', source: ['custom'], device: 'desktop' }
];

const count = preferences => makePopup(loadPopupClass(), { userAgents: USER_AGENTS, preferences }).getFilteredUserAgentCount();

test('a string in two sources is counted under each of them', () => {
  assert.strictEqual(count({ device: ['all'], browser: ['all'], source: ['most_common'] }), 1);
  assert.strictEqual(count({ device: ['all'], browser: ['all'], source: ['latest'] }), 3);
});

test("'all' counts the whole list", () => {
  assert.strictEqual(count({ device: ['all'], browser: ['all'], source: ['all'] }), USER_AGENTS.length);
});

test('several selected sources count the union without double counting', () => {
  assert.strictEqual(count({ device: ['all'], browser: ['all'], source: ['most_common', 'latest'] }), 3);
});

test('a source nothing matches counts zero', () => {
  assert.strictEqual(count({ device: ['all'], browser: ['all'], source: ['nonexistent'] }), 0);
});

test('a legacy scalar source still counts', () => {
  const agents = [...USER_AGENTS, { ua: 'legacy-ua', source: 'latest', device: 'desktop' }];
  const popup = makePopup(loadPopupClass(), { userAgents: agents, preferences: { device: ['all'], browser: ['all'], source: ['latest'] } });
  assert.strictEqual(popup.getFilteredUserAgentCount(), 4);
});

test('device and source filters combine', () => {
  assert.strictEqual(count({ device: ['android'], browser: ['all'], source: ['latest'] }), 1);
  assert.strictEqual(count({ device: ['windows'], browser: ['all'], source: ['most_common'] }), 1);
});

test('an empty list counts zero', () => {
  const popup = makePopup(loadPopupClass(), { userAgents: [], preferences: { device: ['all'], browser: ['all'], source: ['all'] } });
  assert.strictEqual(popup.getFilteredUserAgentCount(), 0);
});

test('the count agrees with the background filter for the same preferences', () => {
  // The popup shows a number the background script then has to honour, so the
  // two must not drift apart.
  const preferences = { device: ['android'], browser: ['all'], source: ['latest'] };
  assert.strictEqual(count(preferences), 1);
});

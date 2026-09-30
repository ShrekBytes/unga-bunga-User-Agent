'use strict';

// background.js and popup.js are WebExtension scripts, not modules: they declare
// top-level consts and instantiate themselves on load, and background.js reads
// browser.storage while doing it. So run each in a function body with the
// globals Firefox would hand it, then pass back the internals under test.
//
// Running in this realm rather than a vm context on purpose: arrays built inside
// a vm carry that realm's Array.prototype, which assert.deepStrictEqual rejects.
// These tests load the real shipped files, not a refactored copy of them.

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const { UAParser } = require(path.join(ROOT, 'ua-parser.min.js'));

// shared/source-match.js is loaded the way Firefox loads it: as a plain script
// that puts one function on the global, ahead of its two consumers.
const sourceMatchesAny = new Function(`${read('shared/source-match.js')}\n;return sourceMatchesAny;`)();

const noop = () => {};
const event = () => ({ addListener: noop, removeListener: noop });

function stubBrowser(store) {
  return {
    storage: {
      local: {
        async get(keys) {
          const out = {};
          for (const key of [].concat(keys)) {
            if (store[key] !== undefined) out[key] = store[key];
          }
          return out;
        },
        async set(obj) { Object.assign(store, obj); }
      },
      onChanged: event()
    },
    browserAction: { setBadgeText: noop, setBadgeBackgroundColor: noop },
    webRequest: { onBeforeSendHeaders: event(), onHeadersReceived: event() },
    scripting: {
      getRegisteredContentScripts: async () => [],
      registerContentScripts: async () => {},
      unregisterContentScripts: async () => {},
      executeScript: async () => []
    },
    runtime: { onMessage: event(), onInstalled: event(), getURL: p => p },
    tabs: { query: async () => [], onUpdated: event(), onRemoved: event() }
  };
}

const TIMERS = { setInterval: () => 0, clearInterval: noop, setTimeout: () => 0, clearTimeout: noop };

// agent.js only reaches for navigator when a UA string carries ${...}
// replacements, but it is passed regardless so a fixture can.
const NAVIGATOR = { userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:157.0) Gecko/20100101 Firefox/157.0', platform: 'Linux x86_64' };

/**
 * Load background.js. `routes` maps a path such as `data/desktop.json` to a
 * fetch Response-alike; anything unmapped 404s, which is what the retired
 * `latest/` directory does and what `synthetic/` does for a category upstream
 * has no template for.
 */
function loadBackground({ routes = {}, store = {} } = {}) {
  const calls = [];
  const fetchImpl = async url => {
    // Key on "<dir>/<file>.json" so a route table reads the same whether the URL
    // is the real raw.githubusercontent.com one or a hand-written stand-in.
    const parts = new URL(String(url), 'https://raw.test').pathname.split('/').filter(Boolean);
    const key = parts.slice(-2).join('/');
    calls.push(key);
    return Object.prototype.hasOwnProperty.call(routes, key) ? routes[key] : notFound();
  };

  const browser = stubBrowser(store);
  const Agent = new Function(
    'UAParser', 'navigator', 'console', ...Object.keys(TIMERS),
    `${read('agent.js')}\n;return Agent;`
  )(UAParser, NAVIGATOR, console, ...Object.values(TIMERS));

  const exp = new Function(
    'UAParser', 'Agent', 'sourceMatchesAny', 'browser', 'fetch', 'console', ...Object.keys(TIMERS),
    `${read('background.js')}\n;return { spoofer, UA_FILES, UA_CATEGORIES, UA_LIST_LIMIT, UA_SOURCES, clientHintsHeaders, chBrandListOf, chPlatformOf };`
  )(UAParser, Agent, sourceMatchesAny, browser, fetchImpl, console, ...Object.values(TIMERS));

  return {
    ...exp,
    store,
    calls,
    /** Resolves once the spoofer has loaded its settings and registered everything. */
    ready: exp.spoofer.initPromise || Promise.resolve(),
    /** Run the real fetch + build pipeline over the routes, in UA_FILES order. */
    async build() {
      const perFile = [];
      for (const file of exp.UA_FILES) perFile.push(await exp.spoofer.fetchUserAgentFile(file));
      return exp.spoofer.buildUserAgentList(perFile);
    }
  };
}

// popup.js is DOM-bound, so only its class is of interest. The prototype is
// reachable without running the constructor, which calls init() and the DOM.
function loadPopupClass() {
  const document = { addEventListener: noop, getElementById: () => null, querySelectorAll: () => [] };
  return new Function(
    'document', 'browser', 'sourceMatchesAny', 'console', ...Object.keys(TIMERS),
    `${read('popup.js')}\n;return PopupUI;`
  )(document, stubBrowser({}), sourceMatchesAny, console, ...Object.values(TIMERS));
}

/** A PopupUI with just the fields getFilteredUserAgentCount reads. */
function makePopup(PopupUI, { userAgents, preferences }) {
  const popup = Object.create(PopupUI.prototype);
  popup.userAgents = userAgents;
  popup.preferences = preferences;
  popup.cachedFilterCount = null;
  popup.lastPreferencesHash = null;
  return popup;
}

function ok(body) {
  return { ok: true, status: 200, json: async () => body };
}

function status(code) {
  return { ok: false, status: code, json: async () => { throw new Error('not json'); } };
}

const notFound = () => status(404);

module.exports = { loadBackground, loadPopupClass, makePopup, ok, status, notFound };

'use strict';

// Payload shapes as published by https://github.com/ShrekBytes/useragents-data.
// Kept small and hand-built: the point is the schema, not the volume.

/** A schema v4 record, as published in `data/` and `synthetic/`. */
function record(userAgent, extra = {}) {
  return {
    user_agent: userAgent,
    kind: 'observed',
    os: 'Windows 10',
    browser: 'Chrome 153.0.0.0',
    device: null,
    count: 1029,
    percentage: 2.59,
    count_source: 'useragents.me',
    sources: ['useragents.me', 'winfuture23'],
    synthesized_from: null,
    ...extra
  };
}

/** `data/<category>.json` — schema v4, records. */
function observedFile(category, userAgents) {
  return {
    schema_version: 4,
    kind: 'observed',
    generated_at: '2026-09-29T17:20:11.168281+00:00',
    category,
    sources: [{ name: 'useragents.me', status: 'ok', error: null, collected_at: '2026-09-29T17:20:09.842549+00:00', records: 126, by_category: { desktop: 47, mobile: 39 } }],
    freshness: { manifest: { versions: { windows: 155, firefox: 156 }, errors: [] }, collection_max_majors: { chrome: 155 }, in_this_file_max_majors: { chrome: 153 } },
    user_agents: userAgents.map(ua => (typeof ua === 'string' ? record(ua) : ua))
  };
}

/** `synthetic/<category>.json` — schema v4, records, no provenance block. */
function syntheticFile(category, userAgents) {
  return {
    schema_version: 4,
    kind: 'synthetic',
    generated_at: '2026-09-29T17:20:11.168281+00:00',
    category,
    generated_from: { manifest: { versions: { windows: 155, firefox: 157 }, errors: [] }, templates: ['chrome-windows'] },
    user_agents: userAgents.map(ua => record(ua, { kind: 'synthetic', os: 'Windows 10', browser: 'Chrome 155', count: null, percentage: null, count_source: null, sources: [], synthesized_from: 'chrome-windows' }))
  };
}

/** `common/<category>.json` — legacy shape, keys unchanged since v1: bare strings. */
function commonFile(category, strings) {
  return {
    scraped_at: '2026-09-29T17:20:11.168281+00:00',
    scraped_from: ['useragents.me'],
    type: `most_common_${category}`,
    user_agents: strings
  };
}

const UA = {
  chrome155: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36',
  firefox157: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:157.0) Gecko/20100101 Firefox/157.0',
  chrome120: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  macSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',
  androidChrome: 'Mozilla/5.0 (Linux; Android 15; Pixel 9 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.6 Mobile/15E148 Safari/604.1',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 26_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.7 Mobile/15E148 Safari/604.1',
  linux: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36'
};

/**
 * A route table covering every path the extension asks for, for a dataset with
 * the given per-category counts. Anything above the published counts 404s, which
 * is how `synthetic/` behaves for a category upstream has no template for.
 */
function dataset({ desktop = [], mobile = [], tablet = [], synthetic = [], common } = {}) {
  const routes = {};
  for (const [category, list] of [['desktop', desktop], ['mobile', mobile], ['tablet', tablet]]) {
    routes[`data/${category}.json`] = { ok: true, status: 200, json: async () => observedFile(category, list) };
  }
  const synth = { desktop: [], mobile: [], tablet: [], ...synthetic };
  for (const category of ['desktop', 'mobile', 'tablet']) {
    if (synth[category] && synth[category].length) {
      routes[`synthetic/${category}.json`] = { ok: true, status: 200, json: async () => syntheticFile(category, synth[category]) };
    }
  }
  const commons = common || { desktop: [], mobile: [], tablet: [] };
  for (const category of ['desktop', 'mobile', 'tablet']) {
    routes[`common/${category}.json`] = { ok: true, status: 200, json: async () => commonFile(category, commons[category] || []) };
  }
  return routes;
}

module.exports = { record, observedFile, syntheticFile, commonFile, dataset, UA };

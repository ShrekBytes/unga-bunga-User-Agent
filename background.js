// Background script for User Agent Spoofer
// UAParser and Agent are loaded via manifest.json background.scripts

// User agent dataset: https://github.com/ShrekBytes/useragents-data
// Upstream retired its `latest/` directory: those files sat frozen at browser
// 134 while claiming to be current, and every one of the six paths this
// extension used to fetch now 404s. The replacements are `common/` (observed,
// with a measured frequency), `data/` (observed, current) and `synthetic/`
// (built from currently-shipping product versions, never witnessed).
const UA_DATA_BASE = 'https://raw.githubusercontent.com/ShrekBytes/useragents-data/main';

// `bot` is deliberately not fetched. Every string in this list is handed
// straight to a User-Agent header, and a crawler string such as
// `python-requests/2.34.2` is never the answer being looked for.
const UA_CATEGORIES = ['desktop', 'mobile', 'tablet'];

// `bucket` is the popup's source filter, not the upstream directory: a record's
// `source` says which filters it answers to. Synthetic leads because it is built
// from currently-shipping versions, so it is the freshest data available;
// `common/` trails because upstream generates it from `data/`, so those strings
// only add a second, measured claim on ones already in the list.
const UA_SOURCES = [
  // Upstream publishes a synthetic category only while its version manifest
  // supports a template for it, and deletes the file once it stops
  // qualifying. A 404 on one of these is expected, not a failure.
  { path: 'synthetic', bucket: 'latest', optional: true },
  { path: 'data', bucket: 'latest', optional: false },
  { path: 'common', bucket: 'most_common', optional: false }
];

const UA_FILES = UA_CATEGORIES.flatMap(category => UA_SOURCES.map(src => ({
  url: `${UA_DATA_BASE}/${src.path}/${category}.json`,
  source: src.bucket,
  category,
  optional: src.optional
})));

// A ceiling on how many entries the list may hold, not a way to keep it
// current. Upstream publishes 242 distinct strings today, so this is set above
// the whole dataset: nothing should be dropped merely for being the 333rd
// entry. Which strings belong in the list at all is decided by MIN_CURRENCY
// below, and how the ceiling is shared out is decided by the round robin. That
// leaves 210 entries at the time of writing, so the cap is not binding and is
// here to catch the dataset growing rather than to trim it.
const UA_LIST_LIMIT = 333;

// A version this far behind the newest one seen for its own browser family is
// not a current browser. This used to be implicit: the cap sat below the
// published pool, so the cap cut the stale tail as a side effect of wanting to
// be short. That stopped being true once the cap was raised past the pool size,
// so it is stated as a rule instead of relied on as an accident. Half the
// current version is where the published data breaks: every string it drops
// scores below 0.5, every string it keeps scores at or above.
const MIN_CURRENCY = 0.5;

// Browser versions are only comparable inside a family: Safari 26 is current
// iOS, not a browser from 1998. Ranked as one number, a current iPhone string
// sorts below Chrome 30 and gets cut, so each string is ranked against the
// newest version seen for its own family instead. Ordered most specific first,
// so an Edge string is not read as the Chrome it also names.
//
// Every browser on iOS must be here. iOS forbids third-party engines, so Chrome
// and Firefox on an iPhone ship as CriOS and FxiOS and never carry a `Chrome/`
// or `Firefox/` token at all. Without these two, every current Chrome-on-iOS
// string is unrankable, scores zero and falls below the floor, which is what
// had emptied the iPhone and iPad filters: 22 current strings dropped to leave
// 20 iPhone and 9 iPad against 44 Windows. They are ranked against the same
// `chrome` and `firefox` families as their desktop equivalents, since they are
// the same browsers at the same versions.
const BROWSER_TOKENS = [
  [/Firefox\/(\d+)/, 'firefox'],
  [/FxiOS\/(\d+)/, 'firefox'],
  [/Edg(?:e|A|iOS)?\/(\d+)/, 'edge'],
  [/OPR\/(\d+)/, 'opera'],
  [/Vivaldi\/(\d+)/, 'vivaldi'],
  [/Silk\/(\d+)/, 'silk'],
  [/CriOS\/(\d+)/, 'chrome'],
  [/Chrome\/(\d+)/, 'chrome'],
  [/Version\/(\d+)/, 'safari']
];

// ---------------------------------------------------------------------------
// Client hints: the single source of truth for the Sec-CH-UA* request headers.
// inject/override.js derives navigator.userAgentData from the same algorithms;
// keep the two implementations in sync or a page ends up with navigator data
// that disagrees with its own request headers, which is exactly the
// "normal vs aggressive" mismatch webbrowsertools.com flags (issue #4).
// Derived from "UserAgent-Switcher" by ray-lothian (MPL-2.0).
// Chromium derives the GREASE brand and the brands order from the browser's
// major version (components/embedder_support/user_agent_utils.cc ->
// GetGreasedUserAgentBrandVersion + ShuffleBrandList); a hardcoded
// "Not/A)Brand";v="8" with a fixed order is a reliable detection signal.
// ---------------------------------------------------------------------------
const CH_GREASY_CHARS = [' ', '(', ':', '-', '.', '/', ')', ';', '=', '?', '_'];
const CH_GREASED_VERSIONS = ['8', '99', '24'];
const CH_BRAND_ORDERS = [
  [0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]
];

const chGreaseBrand = major => {
  const m = Number(major);
  if (Number.isInteger(m) && m >= 0) {
    return {
      brand: 'Not' + CH_GREASY_CHARS[m % CH_GREASY_CHARS.length] + 'A' +
        CH_GREASY_CHARS[(m + 1) % CH_GREASY_CHARS.length] + 'Brand',
      version: CH_GREASED_VERSIONS[m % CH_GREASED_VERSIONS.length]
    };
  }
  // unknown major -> the legacy pair this extension always used
  return {brand: 'Not/A)Brand', version: '8'};
};

// brands carry their commercial name, not the UA token; Android Chrome
// parses as "Mobile Chrome" but reports the regular "Google Chrome" brand
const chBrandName = name => {
  if (name === 'Chrome' || name === 'Mobile Chrome') {
    return 'Google Chrome';
  }
  if (name === 'Edge') {
    return 'Microsoft Edge';
  }
  return name || 'Chromium';
};

const chBrandListOf = (p, ua) => {
  const browser = p?.browser || {};
  const name = browser.name || 'Chrome';
  const major = String(browser.major || '');
  const g = chGreaseBrand(major);
  const m = Number(major);
  const seed = Number.isInteger(m) && m >= 0 ? m : 0;

  // the Chromium entry always reflects the Chromium core (the Chrome/ token
  // of the UA), not the browser brand's own version; Opera for example
  // reports "Opera";v="105", "Chromium";v="119"
  const chromeMajor = (ua || '').match(/Chrome\/(\d+)/)?.[1] || major;

  let list = [{
    brand: g.brand,
    version: g.version
  }, {
    brand: 'Chromium',
    version: chromeMajor
  }, {
    brand: chBrandName(name),
    version: major
  }];

  // Edge and Opera prepend their own brand instead of shuffling; unbranded
  // Chromium only reports two brands
  if (name === 'Edge' || name === 'Opera') {
    list = [list[2], list[1], list[0]];
  }
  else if (name === 'Chromium') {
    list = [list[0], list[1]];
    const shuffled = [];
    [seed % 2, (seed + 1) % 2].forEach((pos, i) => shuffled[pos] = list[i]);
    list = shuffled;
  }
  else {
    const shuffled = [];
    CH_BRAND_ORDERS[seed % CH_BRAND_ORDERS.length].forEach((pos, i) => shuffled[pos] = list[i]);
    list = shuffled;
  }
  return list;
};

// real Chrome only reports the 8 platform values from the spec
// (https://wicg.github.io/ua-client-hints/#sec-ch-ua-platform); leaking
// "Ubuntu" instead of "Linux" is a giveaway
const chPlatformOf = os => {
  const name = (os?.name || '').toLowerCase();
  if (name.includes('mac')) {
    return 'macOS';
  }
  if (name.includes('windows')) {
    return 'Windows';
  }
  if (name.includes('android')) {
    return 'Android';
  }
  if (name.includes('ios')) {
    return 'iOS';
  }
  if (name.includes('chrome os') || name.includes('chromium os')) {
    return 'Chrome OS';
  }
  if (name.includes('fuchsia')) {
    return 'Fuchsia';
  }
  // every Linux distribution (Ubuntu, Debian, Fedora, Mint, ...) reports
  // plain "Linux"
  if (/linux|debian|ubuntu|fedora|mint|centos|red ?hat|arch|suse|gentoo|kubuntu|xubuntu|lubuntu|kali|manjaro|deepin|raspbian|elementary|zorin|pop!_os|mandriva|pclinuxos|zenwalk/.test(name)) {
    return 'Linux';
  }
  return 'Unknown';
};

/**
 * The three Sec-CH-UA* header values for a parsed user agent, shared by the
 * request-header rewriter and the async fallback's consistency checks.
 */
function clientHintsHeaders(parsedUA, uaString) {
  const uaData = parsedUA.userAgentDataBuilder;
  const version = uaData.p?.browser?.major || '107';
  const name = uaData.p?.browser?.name || 'Google Chrome';
  const platform = chPlatformOf(uaData.p?.os);
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(uaString || '');

  return {
    'sec-ch-ua-platform': `"${platform}"`,
    'sec-ch-ua': chBrandListOf(uaData.p, uaString).map(e => `"${e.brand}";v="${e.version}"`).join(', '),
    'sec-ch-ua-mobile': isMobile ? '?1' : '?0'
  };
}

class UserAgentSpoofer {
  constructor() {
    this.userAgents = [];
    this.customUserAgents = [];
    this.isEnabled = false;
    this.currentUserAgent = null;
    this.currentParsedUA = null; // Store parsed UA for injection
    this.mode = 'all'; // 'all', 'blacklist', 'whitelist'
    this.whitelist = [];
    this.blacklist = [];
    this.strictParity = true;
    this.agent = new Agent();
    this.agent.prefs({ userAgentData: true, parser: {} });
    this.initPromise = this.init();
  }

  async init() {
    await this.loadSettings();

    // Register listeners first so early navigations are covered even if
    // remote user-agent list fetching is still in progress.
    this.setupRequestListener();
    this.setupResponseListener();
    this.setupInjectionManager();
    this.updateBadge();

    // Sync the registered content scripts with the persisted scope. Startup,
    // extension updates and browser restarts all land here, so the injection
    // scope can never drift from the settings it mirrors.
    await this.applyInjectionScope();

    this.fetchUserAgents().catch(error => {
      console.error('[Unga Bunga UA] Failed to refresh UA list during init:', error);
    });
  }

  async loadSettings() {
    const result = await browser.storage.local.get([
      'isEnabled',
      'currentUserAgent',
      'customUserAgents',
      'mode',
      'whitelist',
      'blacklist',
      'strictParity'
    ]);
    
    this.isEnabled = result.isEnabled || false;
    this.currentUserAgent = result.currentUserAgent || null;
    this.customUserAgents = result.customUserAgents || [];
    this.mode = result.mode || 'all';
    this.whitelist = result.whitelist || [];
    this.blacklist = result.blacklist || [];
    this.strictParity = result.strictParity !== false;
    
    // Parse the current user agent on load
    try {
      if (this.currentUserAgent) {
        this.currentParsedUA = this.agent.parse(this.currentUserAgent);
      }
    } catch (error) {
      console.error('[Unga Bunga UA] Error parsing saved user agent:', error);
      this.currentParsedUA = null;
    }
  }

  async saveSettings() {
    await browser.storage.local.set({
      isEnabled: this.isEnabled,
      currentUserAgent: this.currentUserAgent,
      customUserAgents: this.customUserAgents,
      mode: this.mode,
      whitelist: this.whitelist,
      blacklist: this.blacklist,
      strictParity: this.strictParity
    });
    this.updateBadge();
  }

  updateBadge() {
    let badgeText = '';
    let badgeColor = '#666666'; // Default gray
    
    if (!this.isEnabled) {
      badgeText = 'OFF';
      badgeColor = '#ef4444'; // Red for disabled
    } else {
      switch (this.mode) {
        case 'all':
          badgeText = 'ALL';
          badgeColor = '#10b981'; // Green for all sites
          break;
        case 'whitelist':
          badgeText = 'WL';
          badgeColor = '#3b82f6'; // Blue for whitelist
          break;
        case 'blacklist':
          badgeText = 'BL';
          badgeColor = '#8b5cf6'; // Dark violet for blacklist
          break;
        default:
          badgeText = 'ON';
          badgeColor = '#10b981'; // Green for enabled
      }
    }

    try {
      if (typeof browser.browserAction !== 'undefined' && browser.browserAction.setBadgeText) {
        browser.browserAction.setBadgeText({ text: badgeText });
        browser.browserAction.setBadgeBackgroundColor({ color: badgeColor });
      }
    } catch (error) {
      console.error('Error updating badge:', error);
    }
  }

  async fetchUserAgentFile(file) {
    const response = await fetch(file.url);
    if (!response.ok) {
      if (file.optional && response.status === 404) {
        return [];
      }
      throw new Error(`${file.url} responded ${response.status}`);
    }

    const payload = await response.json();
    if (!payload || !Array.isArray(payload.user_agents)) {
      throw new Error(`${file.url} has no user_agents list`);
    }

    // `common/` publishes bare strings; `data/` and `synthetic/` (schema v4)
    // publish records. Take the string out of whichever shape arrived rather
    // than assuming one, so a record object never reaches the User-Agent header.
    const strings = payload.user_agents
      .map(record => (typeof record === 'string' ? record : record && record.user_agent))
      .filter(ua => typeof ua === 'string' && ua.length > 0);

    // An empty list is legitimate: upstream publishes one when the source that
    // orders `common/` is down. Records we understood none of are not, and mean
    // the field was renamed rather than that there is nothing to report.
    if (payload.user_agents.length > 0 && strings.length === 0) {
      throw new Error(`${file.url} published records with no recognisable user agent field`);
    }

    return strings;
  }

  browserVersion(ua) {
    for (const [pattern, family] of BROWSER_TOKENS) {
      const match = ua.match(pattern);
      if (match) {
        return { family, major: parseInt(match[1], 10) };
      }
    }
    // No browser token at all: a bare WebKit string, an in-app webview, or a
    // third-party app's embedded browser such as GSA or Flipboard. These are
    // the worst thing to hand someone as a spoofed browser, so they score zero
    // and fall below the floor.
    return null;
  }

  buildUserAgentList(perFile) {
    // Merge within a category. `common/` is generated from `data/` upstream, so
    // the same string arrives from both; keep every source it was published in,
    // otherwise the Most Common filter would only ever match strings the Latest
    // filter also offers, and the list would carry each of them twice.
    const byCategory = new Map(UA_CATEGORIES.map(category => [category, new Map()]));
    UA_FILES.forEach((file, index) => {
      const category = byCategory.get(file.category);
      for (const ua of perFile[index]) {
        let entry = category.get(ua);
        if (!entry) {
          entry = { ua, source: [], device: file.category };
          category.set(ua, entry);
        }
        if (!entry.source.includes(file.source)) {
          entry.source.push(file.source);
        }
      }
    });

    const categories = UA_CATEGORIES.map(name => ({ name, entries: byCategory.get(name), quota: 0 }));

    // Rank each string against the newest version seen for its own browser
    // family, and drop the ones that fall too far behind it. This is the part
    // that actually delivers "prioritise the latest": list position alone is
    // not enough, because selection is a uniform random pick, so a stale string
    // anywhere in the list is just as likely to be handed out as a current one.
    // Sorting is stable, so equal scores keep upstream's own order as the
    // tiebreak. `newest` is built from every entry, not just the ones that
    // clear the floor, so the reference is always the newest thing published
    // rather than the newest thing that happened to survive.
    const newest = new Map();
    for (const { entries } of categories) {
      for (const entry of entries.values()) {
        const version = this.browserVersion(entry.ua);
        if (!version) continue;
        const best = newest.get(version.family) || 0;
        if (version.major > best) {
          newest.set(version.family, version.major);
        }
      }
    }
    const currency = entry => {
      const version = this.browserVersion(entry.ua);
      if (!version) return 0;
      return version.major / (newest.get(version.family) || version.major);
    };
    for (const category of categories) {
      category.ordered = Array.from(category.entries.values())
        .filter(entry => currency(entry) >= MIN_CURRENCY)
        .sort((a, b) => currency(b) - currency(a));
    }

    // Share the cap between categories instead of letting it be filled by
    // whichever is largest. Upstream publishes 112 desktop strings against 36
    // tablet ones, so a single global cut hands the whole budget to desktop
    // and the iPad filter ends up with nothing. Handing out one slot at a time,
    // round robin, balances the list without needing a table of per-category
    // numbers: each category gets an equal share, and whatever a short category
    // cannot use passes to the others rather than being lost.
    //
    // Tablet cannot use a full share: upstream only publishes 36 tablet strings
    // and no synthetic tablet file, so it is supply-limited rather than
    // starved by the budget. Its unused share goes to desktop and mobile, which
    // is why the finished list is not exactly a third each.
    let budget = UA_LIST_LIMIT;
    let open = categories.filter(category => category.ordered.length > 0);
    while (budget > 0 && open.length) {
      for (const category of open) {
        if (budget === 0) break;
        if (category.quota < category.ordered.length) {
          category.quota++;
          budget--;
        }
      }
      // Categories that ran out drop out; when they have all dropped out the
      // loop ends, so there is no separate no-progress check to keep in step.
      open = open.filter(category => category.quota < category.ordered.length);
    }

    const list = [];
    for (const category of categories) {
      list.push(...category.ordered.slice(0, category.quota));
    }
    return list;
  }

  async fetchUserAgents() {
    try {
      // Caching: check if we have a recent cache (24h)
      const CACHE_KEY = 'userAgentCacheV2';
      const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
      const cache = await browser.storage.local.get([CACHE_KEY]);
      const now = Date.now();
      let userAgents = null;
      if (cache[CACHE_KEY] && cache[CACHE_KEY].timestamp && (now - cache[CACHE_KEY].timestamp < CACHE_TTL)) {
        userAgents = cache[CACHE_KEY].userAgents;
      }

      if (!userAgents) {
        const perFile = await Promise.all(UA_FILES.map(file => this.fetchUserAgentFile(file)));
        userAgents = this.buildUserAgentList(perFile);
        // Save to cache
        await browser.storage.local.set({
          [CACHE_KEY]: {
            timestamp: now,
            userAgents: userAgents
          }
        });
      }

      // Add custom user agents
      userAgents.push(...this.customUserAgents.map(ua => ({ ...ua, source: ['custom'] })));
      this.userAgents = userAgents;
    } catch (error) {
      console.error('Failed to fetch user agents:', error);
      // Fallback to basic user agents
      this.userAgents = [
        {
          ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
          source: ['fallback'],
          device: 'windows'
        },
        {
          ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
          source: ['fallback'],
          device: 'mac'
        },
        {
          ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
          source: ['fallback'],
          device: 'iphone'
        },
        {
          ua: 'Mozilla/5.0 (Linux; Android 15; Pixel 9 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36',
          source: ['fallback'],
          device: 'android'
        },
        {
          ua: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
          source: ['fallback'],
          device: 'ipad'
        },
        {
          ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
          source: ['fallback'],
          device: 'linux'
        },
        {
          ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0',
          source: ['fallback'],
          device: 'windows'
        },
        {
          ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13.5; rv:142.0) Gecko/20100101 Firefox/142.0',
          source: ['fallback'],
          device: 'mac'
        }
      ];
    }
  }

  ensureParsedUA() {
    if (this.currentParsedUA || !this.currentUserAgent) {
      return;
    }
    try {
      this.currentParsedUA = this.agent.parse(this.currentUserAgent);
    } catch (error) {
      console.error('[Unga Bunga UA] Lazy parse failed:', error);
      this.currentParsedUA = null;
    }
  }

  setupRequestListener() {
    browser.webRequest.onBeforeSendHeaders.addListener(
      (details) => {
        this.ensureParsedUA();
        if (!this.isEnabled || !this.currentUserAgent || !this.currentParsedUA) {
          return {};
        }

        // Check if we should apply user agent based on mode and site lists
        if (!this.shouldApplyUserAgent(details.url)) {
          return {};
        }

        let headers = details.requestHeaders.map(header => {
          if (header.name.toLowerCase() === 'user-agent') {
            return { name: header.name, value: this.currentUserAgent };
          }
          return header;
        });

        // Remove all Client Hints headers first
        const headersToRemove = [
          'sec-ch-ua', 'sec-ch-ua-mobile', 'sec-ch-ua-platform',
          'sec-ch-ua-arch', 'sec-ch-ua-bitness', 'sec-ch-ua-full-version',
          'sec-ch-ua-full-version-list', 'sec-ch-ua-model', 'sec-ch-ua-platform-version'
        ];
        
        headers = headers.filter(header => 
          !headersToRemove.includes(header.name.toLowerCase())
        );

        // Add Client Hints headers for Chrome-based user agents, built by
        // the same algorithms inject/override.js uses for navigator.userAgentData
        if (this.currentParsedUA.userAgentDataBuilder) {
          const hints = clientHintsHeaders(this.currentParsedUA, this.currentUserAgent);
          for (const [name, value] of Object.entries(hints)) {
            headers.push({ name, value });
          }
        }

        return { requestHeaders: headers };
      },
      { urls: ['<all_urls>'] },
      ['blocking', 'requestHeaders']
    );
  }

  setupResponseListener() {
    // Inject Server-Timing header for JavaScript-based UA spoofing
    browser.webRequest.onHeadersReceived.addListener(
      (details) => {
        this.ensureParsedUA();
        if (!this.isEnabled || !this.currentParsedUA) {
          return {};
        }

        // Only inject for main_frame and sub_frame
        if (details.type !== 'main_frame' && details.type !== 'sub_frame') {
          return {};
        }

        // Check if we should apply user agent based on mode and site lists
        if (!this.shouldApplyUserAgent(details.url)) {
          return {};
        }

        try {
          const headers = details.responseHeaders || [];
          headers.push({
            name: 'Server-Timing',
            value: this.serverTimingHeader()
          });

          return { responseHeaders: headers };
        } catch (error) {
          console.error('[Unga Bunga UA] Error injecting Server-Timing header:', error);
          return {};
        }
      },
      { urls: ['<all_urls>'], types: ['main_frame', 'sub_frame'] },
      ['blocking', 'responseHeaders']
    );
  }

  /**
   * The encoded navigator config, delivered to inject/main.js through the
   * response's Server-Timing header. Carries the scope mirrors (protected) so
   * every layer evaluates the same URL rules.
   */
  serverTimingHeader() {
    const uaObject = Object.assign({}, this.currentParsedUA, {
      type: 'user',
      strictParity: this.strictParity,
      protected: []
    });
    return `uasw-json-data;dur=0;desc="${encodeURIComponent(JSON.stringify(uaObject))}"`;
  }

  /** The exact payload inside serverTimingHeader(), for the async fallback. */
  serverTimingPayload() {
    const uaObject = Object.assign({}, this.currentParsedUA, {
      type: 'user',
      strictParity: this.strictParity,
      protected: []
    });
    return encodeURIComponent(JSON.stringify(uaObject));
  }

  /**
   * Header-mirrored scope: the exact set of hosts whose pages may spoof, as
   * match patterns for content-script registration. shouldApplyUserAgent is
   * the single decision maker; this only reshapes its inputs so the injected
   * scripts and the rewritten headers never disagree (issue #4).
   */
  injectionScope() {
    const all = this.isEnabled && (
      this.mode === 'all' ||
      this.mode === 'blacklist' ||
      (this.mode === 'whitelist' && this.whitelist.length === 0)
    );

    const hosts = list => [...new Set(
      (list || [])
        .map(site => String(site).toLowerCase().trim()
          .replace(/^https?:\/\//, '')
          .replace(/^\*\./, '')
          .split('/')[0]
          .split(':')[0]
          .replace(/\.$/, ''))
        .filter(site => /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(site))
    )];

    return {
      all,
      // exclude: blacklist never inherits (all is true there, so exclude is
      // what narrows it); whitelist is exact-only by hostMatchesSite, so a
      // subdomain entry cannot be widened to its parent
      exclude: all && this.mode === 'blacklist' ? hosts(this.blacklist) : [],
      include: !all && this.mode === 'whitelist' ? hosts(this.whitelist) : []
    };
  }

  /**
   * Keep the registered content scripts exactly as wide as the header layer's
   * scope. The no-op script is always registered so per-tab or late changes
   * can flip scope back on without re-navigating; unregistering everything
   * would leave already-loaded pages without the coordinator forever.
   */
  async applyInjectionScope() {
    const noop = 'inject/no-op.js';
    try {
      await browser.scripting.unregisterContentScripts();
    }
    catch (e) {
      console.error('[Unga Bunga UA] unregistering content scripts failed:', e);
    }

    const { all, include, exclude } = this.injectionScope();
    const patterns = list => list.map(host => `*://*.${host}/*`);
    const { fingerprintNoise } = await browser.storage.local.get(['fingerprintNoise']);

    const props = {
      allFrames: true,
      matchOriginAsFallback: true,
      runAt: 'document_start',
      world: 'ISOLATED'
    };

    // The MAIN-world scripts run in the page where they define the navigator
    // accessors (Firefox 128+); the ISOLATED script coordinates them. Ids are
    // per script: the API rejects duplicate ids in one call.
    const scripts = [{
      ...props,
      id: 'unga-bunga-spoof',
      js: ['inject/main.js', 'inject/override.js'],
      world: 'MAIN'
    }, {
      ...props,
      id: 'unga-bunga-coordinator',
      js: ['inject/isolated.js']
    }];

    if (all || include.length) {
      scripts[0].matches = all ? ['*://*/*'] : patterns(include);
      scripts[1].matches = scripts[0].matches;
      if (all && exclude.length) {
        scripts[0].excludeMatches = patterns(exclude);
        scripts[1].excludeMatches = scripts[0].excludeMatches;
      }
      // Optional canvas/audio/webgl noise, off by default; registered natively
      // (MAIN world) now that the inline injector is gone.
      if (fingerprintNoise === true) {
        scripts.push({
          ...props,
          js: ['inject/fingerprint-noise.js'],
          world: 'MAIN',
          id: 'unga-bunga-noise',
          matches: scripts[0].matches,
          ...(scripts[0].excludeMatches ? { excludeMatches: scripts[0].excludeMatches } : {})
        });
      }
    }
    else {
      // The placeholder must still carry a matches list (the API requires
      // one); all-urls is harmless for a script that does nothing.
      scripts.forEach(script => {
        script.js = [noop];
        script.world = 'ISOLATED';
        script.matches = ['*://*/*'];
      });
    }

    // Firefox validates at call time and rejects the whole batch; wipe any
    // partial registration and retry with the widest scope. Over-injection is
    // harmless (payloads decide what actually spoofs), under-injection is not:
    // a spoofed page must never run without the coordinator.
    try {
      await browser.scripting.registerContentScripts(scripts);
    }
    catch (e) {
      console.error('[Unga Bunga UA] content script registration failed:', e);
      try {
        const safe = scripts.map(script => ({
          ...script,
          matches: ['*://*/*']
        }));
        delete safe[0].excludeMatches;
        delete safe[1].excludeMatches;
        await browser.scripting.registerContentScripts(safe);
      }
      catch (err) {
        console.error('[Unga Bunga UA] injection is unusable:', err);
      }
    }
  }

  /**
   * Re-register the content scripts whenever anything that moves the scope
   * changes. Error-tolerant: a rejected write must not stop the popup's own
   * save, and a failed registration leaves the previous rules in place.
   */
  setupInjectionManager() {
    browser.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') {
        return;
      }
      const scopeKeys = [
        'isEnabled', 'mode', 'whitelist', 'blacklist', 'currentUserAgent', 'strictParity', 'fingerprintNoise'
      ];
      if (scopeKeys.some(key => key in changes)) {
        Promise.resolve().then(async () => {
          await this.loadSettings();
          await this.applyInjectionScope();
        }).catch(e => console.error('[Unga Bunga UA] injection scope update failed:', e));
      }
    });
  }

  hostMatchesSite(hostname, site) {
    const host = (hostname || '').toLowerCase();
    const rule = (site || '').toLowerCase().trim();

    if (!rule) {
      return false;
    }

    // Support exact hostname matches and subdomain matches.
    return host === rule || host.endsWith(`.${rule}`);
  }

  shouldApplyUserAgent(url) {
    let hostname = '';
    try {
      hostname = new URL(url).hostname;
    } catch (error) {
      return false;
    }
    const normalizedHost = hostname.toLowerCase();
    const isLocalHost = normalizedHost === 'localhost' || normalizedHost === '127.0.0.1' || normalizedHost === '::1' || normalizedHost === '[::1]';

    const inWhitelist = this.whitelist.some(site => this.hostMatchesSite(normalizedHost, site));
    const inBlacklist = this.blacklist.some(site => this.hostMatchesSite(normalizedHost, site));

    // Local development hosts are excluded by default.
    // To enable spoofing on localhost, add localhost (or 127.0.0.1/::1) to the whitelist.
    if (isLocalHost) {
      if (inBlacklist) {
        return false;
      }
      return inWhitelist;
    }
    
    switch (this.mode) {
      case 'all':
        return true;
      case 'blacklist':
        return !inBlacklist;
      case 'whitelist':
        return inWhitelist;
      default:
        return true;
    }
  }

  async toggleEnabled() {
    this.isEnabled = !this.isEnabled;
    await this.saveSettings();
    return this.isEnabled;
  }

  async setEnabled(enabled) {
    this.isEnabled = Boolean(enabled);
    await this.saveSettings();
    return this.isEnabled;
  }

  async setUserAgent(userAgent) {
    this.currentUserAgent = userAgent;
    // Parse the user agent for injection
    try {
      if (userAgent) {
        this.currentParsedUA = this.agent.parse(userAgent);
      } else {
        this.currentParsedUA = null;
      }
    } catch (error) {
      console.error('[Unga Bunga UA] Error parsing user agent:', error);
      this.currentParsedUA = null;
    }
    await this.saveSettings();
  }

  async addCustomUserAgent(userAgent) {
    const customUA = {
      ua: userAgent,
      // Tagged here too, or a newly added user agent stays invisible to the
      // Custom source filter until the background script reloads.
      source: ['custom']
    };
    
    this.customUserAgents.push(customUA);
    this.userAgents.push(customUA);
    await this.saveSettings();
  }

  async removeCustomUserAgent(userAgent) {
    this.customUserAgents = this.customUserAgents.filter(ua => ua.ua !== userAgent);
    this.userAgents = this.userAgents.filter(ua => ua.ua !== userAgent);
    await this.saveSettings();
  }

  async setMode(mode) {
    this.mode = mode;
    await this.saveSettings();
  }

  async addSite(site, listType) {
    const cleanSite = site.toLowerCase().trim();
    if (cleanSite && !this[listType].includes(cleanSite)) {
      this[listType].push(cleanSite);
      await this.saveSettings();
    }
  }

  async removeSite(site, listType) {
    this[listType] = this[listType].filter(s => s !== site);
    await this.saveSettings();
  }

  getRandomUserAgent() {
    if (this.userAgents.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * this.userAgents.length);
    return this.userAgents[randomIndex].ua;
  }

  getFilteredUserAgents(device, browser, source = 'all') {
    if (this.userAgents.length === 0) return [];
    
    return this.userAgents.filter(ua => {
      const uaLower = ua.ua.toLowerCase();
      
      // Filter by source - handle both string and array
      let sourceMatch = true;
      if (source && source !== 'all') {
        if (Array.isArray(source)) {
          sourceMatch = source.includes('all') || sourceMatchesAny(ua.source, source);
        } else {
          sourceMatch = sourceMatchesAny(ua.source, [source]);
        }
      }
      if (!sourceMatch) return false;
      
      // Check device match - handle both string and array
      let deviceMatch = true;
      if (device) {
        if (Array.isArray(device)) {
          deviceMatch = device.some(d => this.checkDeviceMatch(uaLower, d));
        } else {
          deviceMatch = this.checkDeviceMatch(uaLower, device);
        }
      }
      if (!deviceMatch) return false;
      
      // Check browser match - handle both string and array
      let browserMatch = true;
      if (browser) {
        if (Array.isArray(browser)) {
          browserMatch = browser.some(b => this.checkBrowserMatch(uaLower, b));
        } else {
          browserMatch = this.checkBrowserMatch(uaLower, browser);
        }
      }
      
      return deviceMatch && browserMatch;
    });
  }

  getSmartRandomUserAgent(device, browser, source = 'all') {
    const filteredAgents = this.getFilteredUserAgents(device, browser, source);
    
    if (filteredAgents.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * filteredAgents.length);
    return filteredAgents[randomIndex].ua;
  }

  checkDeviceMatch(userAgent, device) {
    switch (device) {
      case 'android': return userAgent.includes('android');
      case 'iphone': return userAgent.includes('iphone');
      case 'ios': return userAgent.includes('iphone') || userAgent.includes('ipad');
      case 'ipad': return userAgent.includes('ipad');
      case 'linux': return userAgent.includes('linux') && !userAgent.includes('android');
      case 'mac': return userAgent.includes('macintosh');
      case 'windows': return userAgent.includes('windows');
      default: return true;
    }
  }

  checkBrowserMatch(userAgent, browser) {
    switch (browser) {
      case 'chrome':
        // Chrome but NOT Edge, Opera, Vivaldi
        return userAgent.includes('chrome') &&
          !userAgent.includes('edg') &&
          !userAgent.includes('edge') &&
          !userAgent.includes('opr') &&
          !userAgent.includes('opera') &&
          !userAgent.includes('vivaldi');
      case 'edge':
        // Edge (Chromium or Legacy)
        return userAgent.includes('edg/') || userAgent.includes('edge/');
      case 'opera':
        // Opera (OPR or Opera)
        return userAgent.includes('opr/') || userAgent.includes('opera');
      case 'vivaldi':
        return userAgent.includes('vivaldi');
      case 'firefox':
        return userAgent.includes('firefox') && !userAgent.includes('seamonkey');
      case 'safari':
        // Safari but NOT Chrome, Edge, Opera, Vivaldi
        return userAgent.includes('safari') &&
          !userAgent.includes('chrome') &&
          !userAgent.includes('crios') &&
          !userAgent.includes('edg') &&
          !userAgent.includes('edge') &&
          !userAgent.includes('opr') &&
          !userAgent.includes('opera') &&
          !userAgent.includes('vivaldi');
      default:
        return true;
    }
  }

  getStatus() {
    return {
      isEnabled: this.isEnabled,
      currentUserAgent: this.currentUserAgent,
      userAgents: this.userAgents,
      customUserAgents: this.customUserAgents,
      mode: this.mode,
      whitelist: this.whitelist,
      blacklist: this.blacklist,
      strictParity: this.strictParity
    };
  }

  async setStrictParity(enabled) {
    this.strictParity = Boolean(enabled);
    await this.saveSettings();
    return this.strictParity;
  }
}

// Initialize the spoofer
const spoofer = new UserAgentSpoofer();

let autoRandomTimer = null;

async function getPreferences() {
  const prefs = await browser.storage.local.get([
    'preferredDevice',
    'preferredBrowser',
    'preferredSource',
    'intervalMinutes',
    'enableInterval',
    'randomSource'
  ]);
  return {
    device: prefs.preferredDevice || ['all'],
    browser: prefs.preferredBrowser || ['all'],
    source: prefs.preferredSource || ['all'],
    intervalMinutes: prefs.intervalMinutes || 5,
    enableInterval: prefs.enableInterval || false,
    randomSource: prefs.randomSource || 'filtered'
  };
}

function clearAutoRandomTimer() {
  if (autoRandomTimer) {
    clearInterval(autoRandomTimer);
    autoRandomTimer = null;
  }
}

async function startAutoRandomTimer() {
  clearAutoRandomTimer();
  const prefs = await getPreferences();
  if (!prefs.enableInterval) return;
  let minutes = parseInt(prefs.intervalMinutes);
  if (isNaN(minutes) || minutes < 1) minutes = 1;
  if (minutes > 60) minutes = 60;
  const ms = minutes * 60 * 1000;
  autoRandomTimer = setInterval(runSmartRandom, ms);
}

async function runSmartRandom() {
  const prefs = await getPreferences();
  let randomUA;
  
  if (prefs.randomSource === 'favorites') {
    // Random from favorites
    const result = await browser.storage.local.get(['favoriteUserAgents']);
    const favorites = result.favoriteUserAgents || [];
    if (favorites.length > 0) {
      randomUA = favorites[Math.floor(Math.random() * favorites.length)];
    }
  } else if (prefs.randomSource === 'all') {
    // Random from all UAs
    if (spoofer.userAgents.length > 0) {
      randomUA = spoofer.userAgents[Math.floor(Math.random() * spoofer.userAgents.length)].ua;
    }
  } else {
    // Random from filtered (default)
    const filteredAgents = spoofer.getFilteredUserAgents(prefs.device, prefs.browser, prefs.source);
    if (filteredAgents.length > 0) {
      randomUA = filteredAgents[Math.floor(Math.random() * filteredAgents.length)].ua;
    }
  }
  
  if (randomUA) {
    await spoofer.setUserAgent(randomUA);
  }
}

// Listen for storage changes
browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && ('enableInterval' in changes || 'intervalMinutes' in changes || 'randomSource' in changes || 'preferredDevice' in changes || 'preferredBrowser' in changes || 'preferredSource' in changes)) {
    getPreferences().then(prefs => {
      if (prefs.enableInterval) {
        startAutoRandomTimer();
      } else {
        clearAutoRandomTimer();
      }
    });
  }
});

// On background startup, start timer if needed
getPreferences().then(prefs => {
  if (prefs.enableInterval) {
    startAutoRandomTimer();
  }
});

// Handle messages from popup and content scripts
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const messageAction = message.action || message.method;
  switch (messageAction) {
    case 'getStatus':
      sendResponse(spoofer.getStatus());
      break;
      
    case 'toggleEnabled':
      spoofer.toggleEnabled().then(enabled => sendResponse({ enabled }));
      return true;

    case 'setEnabled':
      spoofer.setEnabled(message.enabled).then(enabled => sendResponse({ enabled }));
      return true;
      
    case 'setUserAgent':
      spoofer.setUserAgent(message.userAgent).then(() => sendResponse({ success: true }));
      return true;
      
    case 'addCustomUserAgent':
      spoofer.addCustomUserAgent(message.userAgent).then(() => sendResponse({ success: true }));
      return true;
      
    case 'removeCustomUserAgent':
      spoofer.removeCustomUserAgent(message.userAgent).then(() => sendResponse({ success: true }));
      return true;
      
    case 'setMode':
      spoofer.setMode(message.mode).then(() => sendResponse({ success: true }));
      return true;
      
    case 'addSite':
      spoofer.addSite(message.site, message.listType).then(() => sendResponse({ success: true }));
      return true;
      
    case 'removeSite':
      spoofer.removeSite(message.site, message.listType).then(() => sendResponse({ success: true }));
      return true;
      
    case 'getRandomUserAgent':
      const randomUA = spoofer.getRandomUserAgent();
      sendResponse({ userAgent: randomUA });
      break;
      
    case 'getFilteredUserAgents':
      const filteredAgents = spoofer.getFilteredUserAgents(message.device, message.browser, message.source);
      sendResponse({ userAgents: filteredAgents });
      break;
      
    case 'getSmartRandomUserAgent':
      const smartRandomUA = spoofer.getSmartRandomUserAgent(message.device, message.browser, message.source);
      sendResponse({ userAgent: smartRandomUA });
      break;
      
    case 'refreshUserAgents':
      spoofer.fetchUserAgents().then(() => sendResponse({ success: true }));
      return true;

    // New messages for robust injection
    case 'tab-spoofing':
      // Update tab icon/title to indicate spoofing is active
      if (spoofer.isEnabled && sender.tab && sender.tab.id) {
        browser.browserAction.setTitle({
          tabId: sender.tab.id,
          title: '[Unga Bunga UA] Active'
        });
      }
      break;

    case 'get-port-string':
      // Return UA config only when spoofing is enabled and should apply.
      // Mirrors the Server-Timing marker exactly (same payload, same scope
      // check) so a frame resolved through this path spoofs the same data as
      // one resolved through the response header.
      {
        const senderUrl = (sender && sender.url) || (sender.tab && sender.tab.url) || '';
        const topUrl = (sender.tab && sender.tab.url) || senderUrl;
        // about:blank and srcdoc frames resolve through the top-level URL, so
        // the tab-level decision is the one that must match the header layer.
        const allowed = topUrl ? spoofer.shouldApplyUserAgent(topUrl) : false;
        if (spoofer.isEnabled && spoofer.currentParsedUA && allowed) {
          sendResponse(spoofer.serverTimingPayload());
        } else if (spoofer.isEnabled && spoofer.currentUserAgent) {
          // Settings may still be loading on a cold background start; wait for
          // init instead of answering from half-loaded state. This is the fix
          // for the "passes only after reloading the page" report in #4.
          spoofer.initPromise.then(() => {
            if (spoofer.currentParsedUA && spoofer.shouldApplyUserAgent(topUrl)) {
              sendResponse(spoofer.serverTimingPayload());
            }
            else {
              sendResponse('');
            }
          });
        } else {
          sendResponse('');
        }
      }
      // the response may be deferred behind initPromise; keep the channel open
      return true;

    case 'setStrictParity':
      spoofer.setStrictParity(message.enabled).then(strictParity => sendResponse({ strictParity }));
      return true;
  }
}); 
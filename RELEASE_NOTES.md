# Unga Bunga User-Agent

## v5.0.0

### Iframes and aggressive detection (fixes #4)

- The injection mechanism was rebuilt from the ground up, following the
  architecture of [ray-lothian's UserAgent-Switcher](https://github.com/ray-lothian/UserAgent-Switcher),
  which passes the same tests this extension failed.
- `inject/main.js` and `inject/override.js` are no longer pushed into pages as
  inline `<script>` tags by a content script. That approach silently died on
  pages with a strict Content-Security-Policy and always lost the race against
  aggressive detectors. They are now registered as native `MAIN`-world content
  scripts (`browser.scripting.registerContentScripts`), which the browser
  injects before any page script in every frame, CSP or no CSP. Requires
  Firefox 128 or newer; every currently supported Firefox release qualifies.
- `about:blank`, `srcdoc` and sandboxed frames resolve their user agent
  synchronously from their parent frame, with an async fallback through the
  background script for cross-origin frames and cached pages. Previously these
  frames could keep the real navigator while the tab's headers were spoofed.
- The `Server-Timing` marker that carries the spoof payload is scrubbed from
  the performance timeline in the same tick the injected scripts read it, so
  page scripts running after them can no longer read the injected
  configuration back.
- Navigator overrides are defined on the navigator prototype with native-shaped
  getters, matching how the real browser exposes them. Instance-level getters
  (which `Object.getOwnPropertyNames(navigator)` reveals) and `toString`
  mismatches are gone.
- `navigator.appVersion` now matches the real Firefox shape (a fixed
  `5.0 (Windows)` / `5.0 (Macintosh)` string instead of a mirror of the rest of
  the user agent), `navigator.vendor` is empty on Firefox spoofs, and Firefox
  strings no longer inherit a Chromium-style vendor.
- Client hints (`Sec-CH-UA*` headers and `navigator.userAgentData`) are derived
  from one shared set of algorithms: the GREASE brand and brand order are
  computed from the browser major version exactly as Chromium does, and
  platforms only ever report the eight values the spec defines (no `Ubuntu`, no
  `Chromium OS` leaks).
- The header layer and the injection layer now compute their site scope through
  the same decision function, so a page whose request headers are rewritten is
  always the same page whose navigator is spoofed, in whitelist, blacklist and
  per-site modes alike.
- The injected scripts are re-registered automatically when the enabled state,
  mode, site lists or the chosen user agent change; previously a mode switch
  could leave already-loaded pages with stale injection coverage.
- The first load after a cold browser start no longer needs a refresh: the
  async fallback now waits for settings to finish loading instead of answering
  from a half-initialized state.
- The optional canvas/audio/webgl noise hooks are registered natively too, so
  they also work on CSP-strict pages.
- `content.js` is gone; the static `content_scripts` entry was removed from the
  manifest and `web_accessible_resources` shrank accordingly.

---

## v4.6.0

### Current user agents (fixes #6)

- The upstream dataset retired the `latest/` files this extension was reading, so
  the whole list silently fell back to eight built-in strings. Every user agent
  now comes from the replacement files.
- Strings are ranked by how current their browser version is, against the newest
  version seen for their own browser family, and anything more than half a
  version behind is dropped. Previously the list was ordered but selection is a
  uniform random pick, so ordering alone did nothing and a Chrome/Windows user
  could still be handed Chrome 21.
- Chrome and Firefox on iOS are now ranked. iOS forbids third-party engines, so
  they ship as `CriOS` and `FxiOS` and never carry a `Chrome/` or `Firefox/`
  token. Without those tokens every current Chrome-on-iOS string scored zero
  and was treated as unrankable, which had emptied the iPhone and iPad filters.
- The list holds up to 333 entries, shared out between desktop, mobile and
  tablet so no single device takes the whole budget. The cap sits above the
  dataset's 242 distinct strings, so it is headroom rather than a cut, and
  freshness is decided by the ranking rule above rather than by the cap binding.
  In practice that leaves 210 entries: android 56, windows 44, iphone 35,
  mac 33, linux 26, ipad 15.
- A string published in more than one file is listed once and matches both source
  filters, so **Most Common** still returns results.
- Synthetic user agents, which upstream builds from currently-shipping versions,
  are included in **Latest**.
- Bot user agents are not offered.

### Reliability

- Strings that are not browsers at all are no longer offered: bare WebKit
  webviews, and in-app browsers such as Google Search (`GSA`) and Flipboard.
  Upstream publishes seven near-identical `GSA` strings for iOS, which crowded
  out real iOS browsers.
- A dataset that 404s, returns a non-JSON body, or changes the field the User
  Agent is read from now fails visibly and falls back, instead of quietly
  serving a stale or empty list.
- The cached list is versioned, so a list cached under the old format is ignored
  after upgrading.

---

## v4.2.0

### Parity improvements

- Added strict parity mode (default on) to avoid exposing spoofed `navigator.userAgentData` in engines where it is not natively available.

### Notes

- Service worker and full anti-fingerprinting coverage remain out of scope for WebExtension-level spoofing.

## v4.1.0

### Fingerprint noise (optional, experimental)

- Optional Canvas / Audio / WebGL noise hooks in `inject/fingerprint-noise.js`.
- Controlled by a popup preference toggle. Off by default.
- Reload tabs after changing this setting.

### Stability hardening

- Startup flow hardened so request/response listeners initialize earlier.
- Async spoof fallback now respects enabled state and site-application checks.
- Reliability-first behavior for opaque frame contexts (about:blank / sandbox) when URL metadata is missing.
- MAIN-world override bootstrap improved for late-arriving payload timing.

### TODO (Known Issue)

- Intermittent new-tab race still exists in rare cases: `navigator.userAgent` can disagree with aggressive `navigator.appVersion` detection on first load; refresh consistently passes. Keep investigating timing/order in about:blank and early iframe contexts.

---

## v3.0.0

## What's New

### 🔒 Enhanced Stealth

- Complete rewrite with advanced multi-layer injection mechanism
- Client Hints API spoofing for Chromium-based user agents
- Improved spoofing consistency across common browsing contexts

### ⭐ Favorites System

- Star your frequently-used user agents
- Dedicated Favorites tab for quick access
- Randomize from favorites only

### 🎨 Improved UI/UX

- Tabbed interface: Filtered, Favorites, All
- Unified randomization source for manual and auto modes
- Visual indicators for active/inactive extension status
- Clean, modern dark theme

### 🎲 Smart Randomization

- Select random UA from Filtered/Favorites/All
- Auto-rotation with configurable intervals
- One source controls both manual and automatic randomization

### 🛠️ Other Improvements

- Enhanced performance and reliability
- Better error handling
- Cleaner codebase

---

A powerful Firefox extension for advanced user agent spoofing with maximum stealth and excellent user experience.

# Unga Bunga User-Agent

## v4.6.0

### Current user agents (fixes #6)

- The upstream dataset retired the `latest/` files this extension was reading, so
  the whole list silently fell back to eight built-in strings. Every user agent
  now comes from the replacement files.
- Strings are ranked by how current their browser version is, against the newest
  version seen for their own browser family. Previously the list was ordered but
  selection is a uniform random pick, so ordering alone did nothing and a
  Chrome/Windows user could still be handed Chrome 21.
- The list is capped at 200 entries, shared out between desktop, mobile and
  tablet so no single device takes the whole budget.
- A string published in more than one file is listed once and matches both source
  filters, so **Most Common** still returns results.
- Synthetic user agents, which upstream builds from currently-shipping versions,
  are included in **Latest**.
- Bot user agents are not offered.

### Reliability

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

# Unga Bunga User-Agent

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

// Main injection script - creates the communication port
// This runs in the MAIN world (page context), registered by background.js via
// browser.scripting.registerContentScripts with world: "MAIN" at document_start.
// Native registration is what makes this CSP-proof and race-free; never inject
// this file as inline <script> text, that path is subject to the page's CSP.

// Portions of this file are from "UserAgent-Switcher" by ray-lothian,
// licensed under the Mozilla Public License 2.0 (MPL-2.0).
// Modifications made under the GNU General Public License v3.0 (GPLv3).

{
  const port = document.createElement('span');
  port.id = 'uas-port';
  self.__uaswPort = port;

  // Prepare function to parse and activate UA configuration
  port.prepare = () => {
    port.prefs = JSON.parse(decodeURIComponent(port.dataset.str));
    port.dataset.ready = true;
    port.dataset.type = port.prefs.type;
  };

  // Map to store references to sandboxed iframe navigators
  port.ogs = new Map();
  port.addEventListener('register', e => {
    const win = e.detail.hierarchy.reduce((p, c) => {
      return p.frames[c];
    }, parent);
    port.ogs.set(e.detail.id, win);
  });

  // XML document -> https://www.w3schools.com/xml/note.xml
  if (port.dataset) {
    document.documentElement.append(port);

    // Find user-agent data from the Server-Timing header of this document's
    // own response. The background script adds it to main_frame and sub_frame
    // responses; the page can read it back through the performance timeline.
    for (const entry of performance.getEntriesByType('navigation')) {
      for (const timing of entry.serverTiming || []) {
        if (timing.name === 'uasw-json-data') {
          port.dataset.str = timing.description;
        }
      }
    }

    // The payload rode the Server-Timing header, which any page script can
    // read back through the performance timeline; strip our marker from every
    // observable surface. Installed after the extraction above, which is the
    // last read that needs the raw value. Upstream reference: ray-lothian
    // issue #270.
    {
      const MARKER = 'uasw-json-data';
      try {
        // serverTiming is specified on the subclass prototypes (navigation /
        // resource timings), not on the shared PerformanceEntry interface;
        // patching the wrong table is a silent no-op.
        for (const ctor of [PerformanceNavigationTiming, PerformanceResourceTiming]) {
          const d = Object.getOwnPropertyDescriptor(ctor.prototype, 'serverTiming');
          if (d && d.get) {
            // native serverTiming is a [SameObject] FrozenArray; repeated reads
            // must hand out one stable (filtered) array per entry
            const filtered = new WeakMap();
            const props = {
              get: function serverTiming() {
                let out = filtered.get(this);
                if (out === undefined) {
                  out = Object.freeze(
                    (d.get.call(this) || []).filter(t => t.name !== MARKER)
                  );
                  filtered.set(this, out);
                }
                return out;
              },
              configurable: true,
              enumerable: d.enumerable
            };
            if (d.set) {
              props.set = d.set;
            }
            Object.defineProperty(ctor.prototype, 'serverTiming', props);
          }
          // native toJSON reads internal slots and bypasses the patched
          // getter, so the serializer needs its own wrapper; the method may
          // live on the subclass prototype or on the shared base
          const t = Object.getOwnPropertyDescriptor(ctor.prototype, 'toJSON') ||
            Object.getOwnPropertyDescriptor(PerformanceEntry.prototype, 'toJSON');
          if (t && t.value) {
            Object.defineProperty(ctor.prototype, 'toJSON', {
              value: function toJSON() {
                const j = t.value.call(this);
                if (j && Array.isArray(j.serverTiming)) {
                  j.serverTiming = j.serverTiming.filter(e => e.name !== MARKER);
                }
                return j;
              },
              writable: true,
              configurable: true,
              enumerable: t.enumerable
            });
          }
        }
      }
      catch (e) {}
    }

    // Fully cached documents may never fire the webRequest events the async
    // fallback listens on, so those need a different resolution path.
    for (const entry of performance.getEntriesByType('navigation')) {
      if (entry.deliveryType === 'cache-storage') {
        port.dataset.cached = true;
        break;
      }
    }

    if (port.dataset.str) {
      port.prepare();
    }
    else {
      // Extension is not active for this tab, or the top-level request never
      // carried the marker (e.g. served from a service worker). Frames inherit
      // or resolve their state later in inject/isolated.js; a top-level page
      // with no payload is intentionally disabled so its frames inherit that.
      if (self.top === self) {
        if (port.dataset.cached !== 'true') {
          port.dataset.disabled = true;
        }
      }
    }
  }
  else {
    console.info(
      '[Unga Bunga UA] Cannot spoof this context: this might be an XML document',
      location.href
    );
  }
}

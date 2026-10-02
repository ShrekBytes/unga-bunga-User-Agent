// Request-level User-Agent for page-initiated requests.
// This runs in the MAIN world (page context), registered by background.js via
// browser.scripting.registerContentScripts with world: "MAIN" at document_start,
// immediately after inject/override.js. Native registration is CSP-proof; never
// inject this file as inline <script> text.

// Why this exists (issue #4):
// A service worker observes a page-initiated request BEFORE the network layer,
// so it never sees the User-Agent header the background rewrites on the wire.
// On Firefox the header is not present in the service worker's fetch event at
// all. webbrowsertools.com's "[aggressive] UA Header" method reads exactly that
// value (its worker answers /echo/ua with
// `e.request.headers.get('user-agent')`), so no amount of header rewriting can
// reach it -- which is why patching the request header with webRequest or
// declarativeNetRequest changed nothing for the reporter.
//
// Firefox does let a page attach a user-agent header to its own request, and a
// service worker then reads the spoofed string out of `e.request.headers`.
// Only same-origin requests are touched: a service worker's scope is always
// same-origin, and attaching the header to a cross-origin request would make it
// preflight (a page-visible behaviour change on servers that do not allow it).
// The wire value is unaffected either way -- the background's
// onBeforeSendHeaders rewrite still runs last and wins -- so this closes the
// service-worker gap without introducing a second, conflicting source of truth.

{
  // main.js publishes the port on the window as well as in the DOM; prefer the
  // window copy so this script keeps working even if the coordinator has
  // already detached the element.
  const port = self.__uaswPort || document.getElementById('uas-port');

  if (port && port.dataset && port.dataset.disabled !== 'true') {
    const KEY = 'user-agent';

    // Read the payload lazily. On the top frame main.js has already resolved it
    // when this script runs; a frame whose payload arrives through the parent
    // or async path gets it later, and every request after that must still pick
    // it up.
    const spoofedUA = () => {
      try {
        if (port.dataset.disabled === 'true') {
          return '';
        }
        if (!port.prefs) {
          if (!port.dataset.str) {
            return '';
          }
          port.prepare();
        }
        const ua = port.prefs && port.prefs.userAgent;
        return typeof ua === 'string' ? ua : '';
      }
      catch (e) {
        return '';
      }
    };

    const sameOrigin = url => {
      try {
        return new URL(url, location.href).origin === location.origin;
      }
      catch (e) {
        return false;
      }
    };

    const urlOf = input => {
      if (typeof input === 'string') {
        return input;
      }
      if (typeof URL !== 'undefined' && input instanceof URL) {
        return input.href;
      }
      return (input && input.url) || '';
    };

    // The patched builtins must keep the native name, arity and toString()
    // output; a page comparing them is the same class of check override.js
    // already answers for the navigator accessors.
    const mimic = (fn, name, native) => {
      Object.defineProperty(fn, 'name', {value: name, configurable: true});
      Object.defineProperty(fn, 'length', {value: native.length, configurable: true});
      fn.toString = () => `function ${name}() { [native code] }`;
      return fn;
    };

    const nativeFetch = self.fetch;
    if (typeof nativeFetch === 'function') {
      const patchedFetch = mimic(function(input, init) {
        let next = init;
        try {
          const ua = spoofedUA();
          if (ua && sameOrigin(urlOf(input))) {
            if (init == null && input instanceof self.Request) {
              // No init, so the headers live on the Request itself; clone it
              // before touching them rather than mutating the caller's object.
              const req = new self.Request(input);
              req.headers.set(KEY, ua);
              return nativeFetch.call(this, req);
            }
            const headers = new self.Headers(init && init.headers);
            headers.set(KEY, ua);
            next = Object.assign({}, init, {headers});
          }
        }
        catch (e) {
          // Turning an ordinary fetch into a page-visible failure would be far
          // worse than a missed header, so any refusal degrades to the
          // untouched call.
        }
        return nativeFetch.call(this, input, next);
      }, 'fetch', nativeFetch);

      try {
        self.fetch = patchedFetch;
      }
      catch (e) {
        console.info('[Unga Bunga UA] fetch patch failed', e);
      }
    }

    const nativeXHR = self.XMLHttpRequest;
    const nativeOpen = nativeXHR && nativeXHR.prototype.open;
    const nativeSend = nativeXHR && nativeXHR.prototype.send;
    const nativeSetHeader = nativeXHR && nativeXHR.prototype.setRequestHeader;
    if (typeof nativeOpen === 'function' && typeof nativeSend === 'function') {
      // open() is the only place the URL is known, send() is the last moment a
      // header may be set, and setRequestHeader() is the only way to learn that
      // the page already picked a User-Agent of its own. XHR *appends* a
      // repeated header rather than replacing it, so injecting over the page's
      // own value would send "theirs, ours"; when the page chose one, it wins
      // here and the background's onBeforeSendHeaders rewrite still makes the
      // wire value the spoofed string. A WeakMap keeps both pairings off the
      // page-visible object, where an expando would be a fingerprinting signal.
      const opened = new WeakMap();
      const chosen = new WeakMap();
      try {
        nativeXHR.prototype.open = mimic(function(method, url) {
          try {
            opened.set(this, urlOf(url));
            chosen.set(this, new Set());
          }
          catch (e) {}
          return nativeOpen.apply(this, arguments);
        }, 'open', nativeOpen);

        if (typeof nativeSetHeader === 'function') {
          nativeXHR.prototype.setRequestHeader = mimic(function(name) {
            try {
              const set = chosen.get(this);
              if (set) {
                set.add(String(name).toLowerCase());
              }
            }
            catch (e) {}
            return nativeSetHeader.apply(this, arguments);
          }, 'setRequestHeader', nativeSetHeader);
        }

        nativeXHR.prototype.send = mimic(function() {
          try {
            const ua = spoofedUA();
            const set = chosen.get(this);
            if (ua && sameOrigin(opened.get(this)) && !(set && set.has(KEY))) {
              this.setRequestHeader(KEY, ua);
            }
          }
          catch (e) {}
          return nativeSend.apply(this, arguments);
        }, 'send', nativeSend);
      }
      catch (e) {
        console.info('[Unga Bunga UA] XMLHttpRequest patch failed', e);
      }
    }
  }
}

// Content script for robust user agent injection
// This script coordinates the injection of scripts into the page context

(function() {
  'use strict';

  // Inject scripts into page context synchronously at document_start.
  // This minimizes timing leaks in aggressive fingerprint checks.
  function injectScriptInline(file) {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', browser.runtime.getURL(file), false); // synchronous
      xhr.send();

      if (xhr.status === 200 && xhr.responseText) {
        const script = document.createElement('script');
        script.textContent = xhr.responseText;
        const target = document.head || document.documentElement;
        if (target) {
          target.appendChild(script);
          script.remove();
          return true;
        }
      }
    } catch (e) {
      console.error('[Unga Bunga UA] Failed to inject script:', file, e);
    }
    return false;
  }

  // Inject main.js and override.js into page context (MAIN world)
  // before page scripts get a chance to run.
  injectScriptInline('inject/main.js');
  injectScriptInline('inject/override.js');

  // Optional experimental noise hooks; loaded only when user enabled it.
  browser.storage.local.get('fingerprintNoise').then(stored => {
    if (stored && stored.fingerprintNoise === true) {
      injectScriptInline('inject/fingerprint-noise.js');
    }
  }).catch(e => {
    console.info('[Unga Bunga UA] fingerprintNoise pref read failed, default off:', e);
  });

  // Run isolated script code in the content script context (ISOLATED world)
  try {
      /* global cloneInto */
      let port = self.port = document.getElementById('uas-port');
      const id = (Math.random() + 1).toString(36).substring(7);
      let overrideApplied = false;

      const override = reason => {
        if (overrideApplied) {
          return;
        }
        overrideApplied = true;
        const detail = typeof cloneInto === 'undefined' ? {id, reason} : cloneInto({id, reason}, self);
        port.dispatchEvent(new CustomEvent('override', {
          detail
        }));
      };

      const requestAsyncOverride = () => {
        browser.runtime.sendMessage({
          action: 'get-port-string'
        }, str => {
          if (str && !port.dataset.str) {
            port.dataset.str = str;
          }
          if (port.dataset.str) {
            console.info('[Unga Bunga UA] user-agent leaked, using async method:', location.href);
            override('async');
          }
        });
      };

      if (port) {
        // Only touch the port if it looks like the extension-managed element.
        const isExtensionPort = port.tagName === 'SPAN' && port.id === 'uas-port';
        if (!isExtensionPort) {
          console.warn('[Unga Bunga UA] Found non-extension element with id "uas-port"; skipping override path.');
          return;
        }

        port.dataset.id = id;
        port.remove();

        if (self.top === self) {
          if (port.dataset.disabled !== 'true') {
            browser.runtime.sendMessage({
              action: 'tab-spoofing',
              str: port.dataset.str,
              type: port.dataset.type
            });
          }
        }

        // Start async fallback immediately when server-timing data is missing.
        if (!port.dataset.str) {
          requestAsyncOverride();
        }
      }
      else { // iframe[sandbox]
        try {
          const hierarchy = [];
          let [p, s] = [parent, self];
          for (;;) {
            for (let n = 0; n < p.frames.length; n += 1) {
              if (p.frames[n] === s) {
                hierarchy.unshift(n);
              }
            }
            if (p.port) {
              port = p.port;
              if (port.dataset.disabled !== 'true') {
                port.dispatchEvent(new CustomEvent('register', {
                  detail: {
                    id,
                    hierarchy
                  }
                }));
              }
              break;
            }
            [s, p] = [p, p.parent];

            if (s === p) {
              break;
            }
          }
        }
        catch (e) {
          console.info('[Unga Bunga UA] user-agent leaked:', e, location.href);
        }
      }

      if (port) {
        if (port.dataset.str) {
          if (port.dataset.disabled !== 'true') {
            override('normal');
          }
        }
        else {
          try {
            let [p, s] = [parent, self];
            for (;;) {
              if (p.port) {
                if (p.port.dataset.disabled === 'true') {
                  port.dataset.disabled = true;
                }
                else {
                  if ('str' in p.port.dataset) {
                    port.dataset.str = p.port.dataset.str;
                    override('parent');
                  }
                }
                break;
              }
              [s, p] = [p, p.parent];

              if (s === p) {
                break;
              }
            }
            if (!port.dataset.str) {
              throw Error('UA_SET_FAILED');
            }
          }
          catch (e) {
            requestAsyncOverride();
          }
        }
      }
  } catch (e) {
    console.error('[Unga Bunga UA] Failed to execute isolated script:', e);
  }
})();

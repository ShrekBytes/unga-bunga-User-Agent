// Content script for robust user agent injection
// This script coordinates the injection of scripts into the page context

(function() {
  'use strict';

  // Inject scripts into page context synchronously at document_start
  // This is critical for proper spoofing before page scripts run
  
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
  // These must run synchronously before any page scripts
  injectScriptInline('inject/main.js');
  injectScriptInline('inject/override.js');
  
  // Now run isolated script code in the content script context (ISOLATED world)
  // This coordinates with the page context scripts
  // Inlined to avoid eval() warning
  try {
    /* global cloneInto */
    let port = self.port = document.getElementById('uas-port');
    const id = (Math.random() + 1).toString(36).substring(7);

    const override = reason => {
      const detail = typeof cloneInto === 'undefined' ? {id, reason} : cloneInto({id, reason}, self);
      port.dispatchEvent(new CustomEvent('override', {
        detail
      }));
    };

    if (port) {
      port.dataset.id = id;
      port.remove();

      if (self.top === self) {
        if (port.dataset.disabled !== 'true') {
          browser.runtime.sendMessage({
            method: 'tab-spoofing',
            str: port.dataset.str,
            type: port.dataset.type
          });
        }
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
          console.info('[Unga Bunga UA] user-agent leaked, using async method:', location.href);
          browser.runtime.sendMessage({
            method: 'get-port-string'
          }, str => {
            if (str) {
              port.dataset.str = str;
              override('async');
            }
          });
        }
      }
    }
  } catch (e) {
    console.error('[Unga Bunga UA] Failed to execute isolated script:', e);
  }
})();

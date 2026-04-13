// Override script - modifies navigator properties
// This runs in the MAIN world (page context)

// Portions of this file are from "UserAgent-Switcher" by ray-lothian,
// licensed under the Mozilla Public License 2.0 (MPL-2.0).
// Modifications made under the GNU General Public License v3.0 (GPLv3).

{
  const override = (nav, reason) => {
    // Ensure port data is prepared
    if (port.dataset.ready !== 'true') {
      port.prepare();
    }

    try {
      // Handle navigator.userAgentData for Chromium-based browsers
      if (port.prefs.userAgentDataBuilder) {
        const v = new class NavigatorUAData {
          #p;

          constructor({p, ua}) {
            this.#p = p;

            const version = p.browser.major;
            const name = p.browser.name === 'Chrome' ? 'Google Chrome' : p.browser.name;

            this.brands = [{
              brand: 'Not/A)Brand',
              version: '8'
            }, {
              brand: 'Chromium',
              version
            }, {
              brand: name,
              version
            }];

            this.mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

            // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-UA-Platform
            this.platform = 'Unknown';
            if (p.os && p.os.name) {
              const name = p.os.name.toLowerCase();
              if (name.includes('mac')) {
                this.platform = 'macOS';
              }
              else if (name.includes('debian')) {
                this.platform = 'Linux';
              }
              else {
                this.platform = p.os.name;
              }
            }
          }
          toJSON() {
            return {
              brands: this.brands,
              mobile: this.mobile,
              platform: this.platform
            };
          }
          getHighEntropyValues(hints) {
            if (!hints || Array.isArray(hints) === false) {
              return Promise.reject(Error(`Failed to execute 'getHighEntropyValues' on 'NavigatorUAData'`));
            }

            const r = this.toJSON();

            if (hints.includes('architecture')) {
              r.architecture = this.#p?.cpu?.architecture || 'x86';
            }
            if (hints.includes('bitness')) {
              r.bitness = '64';
            }
            if (hints.includes('model')) {
              r.model = '';
            }
            if (hints.includes('platformVersion')) {
              r.platformVersion = this.#p?.os?.version || '10.0.0';
            }
            if (hints.includes('uaFullVersion')) {
              r.uaFullVersion = this.brands[0].version;
            }
            if (hints.includes('fullVersionList')) {
              r.fullVersionList = this.brands;
            }
            return Promise.resolve(r);
          }
        }(port.prefs.userAgentDataBuilder);

        nav.__defineGetter__('userAgentData', () => {
          return v;
        });
      }
      delete port.prefs.userAgentDataBuilder;

      // Override all navigator properties
      for (const key of Object.keys(port.prefs)) {
        if (key === 'type') {
          continue;
        }
        if (port.prefs[key] === '[delete]') {
          delete Object.getPrototypeOf(nav)[key];
        }
        else {
          nav.__defineGetter__(key, () => {
            if (port.prefs[key] === 'empty') {
              return '';
            }
            return port.prefs[key];
          });
        }
      }
    }
    catch (e) {
      console.error('[Unga Bunga UA] Failed to override navigator properties:', e);
    }
  };

  const overrideFrameNavigator = (win, reason) => {
    try {
      if (win && win.navigator) {
        override(win.navigator, reason);
      }
    }
    catch (e) {
      // Cross-origin frames can throw; ignore and continue.
    }
  };

  const installIframeHooks = () => {
    if (self.top !== self) {
      return;
    }

    try {
      const frameProto = self.HTMLIFrameElement && self.HTMLIFrameElement.prototype;
      if (!frameProto || frameProto.__uaswContentWindowHooked) {
        return;
      }

      Object.defineProperty(frameProto, '__uaswContentWindowHooked', {
        value: true,
        configurable: true
      });

      const contentWindowDesc = Object.getOwnPropertyDescriptor(frameProto, 'contentWindow');
      if (contentWindowDesc && typeof contentWindowDesc.get === 'function') {
        Object.defineProperty(frameProto, 'contentWindow', {
          configurable: contentWindowDesc.configurable !== false,
          enumerable: contentWindowDesc.enumerable === true,
          get() {
            const win = contentWindowDesc.get.call(this);
            if (port.dataset.disabled !== 'true') {
              overrideFrameNavigator(win, 'iframe-contentWindow-getter');
            }
            return win;
          }
        });
      }

      const hookFrame = frame => {
        if (!frame || frame.tagName !== 'IFRAME') {
          return;
        }

        if (frame.__uaswLoadHooked) {
          return;
        }
        frame.__uaswLoadHooked = true;

        frame.addEventListener('load', () => {
          if (port.dataset.disabled !== 'true') {
            overrideFrameNavigator(frame.contentWindow, 'iframe-load');
          }
        }, true);

        if (port.dataset.disabled !== 'true') {
          overrideFrameNavigator(frame.contentWindow, 'iframe-immediate');
        }
      };

      const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType !== Node.ELEMENT_NODE) {
              continue;
            }

            if (node.tagName === 'IFRAME') {
              hookFrame(node);
            }

            if (typeof node.querySelectorAll === 'function') {
              node.querySelectorAll('iframe').forEach(hookFrame);
            }
          }
        }
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });

      document.querySelectorAll('iframe').forEach(hookFrame);
    }
    catch (e) {
      console.info('[Unga Bunga UA] Failed to install iframe hooks:', e);
    }
  };

  const port = document.getElementById('uas-port');
  installIframeHooks();
  port.addEventListener('override', e => {
    if (e.detail.id === port.dataset.id) {
      override(navigator, e.detail.reason);
    }
    else {
      try {
        const nav = port.ogs.get(e.detail.id).navigator;
        override(nav, e.detail.reason);
      }
      catch (err) {
        console.info('[Failed to override]', err);
      }
    }
  });
}


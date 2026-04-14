/* global UAParser */
class Agent {
  #prefs = {}; // userAgentData, parser

  deriveAppVersion(userAgent) {
    // Keep appVersion structurally consistent with userAgent.
    const mozillaMatch = userAgent.match(/^Mozilla\/([^\s]+)\s?(.*)$/);
    if (mozillaMatch) {
      const [, version, rest] = mozillaMatch;
      return `${version}${rest ? ` ${rest}` : ''}`.trim();
    }

    const operaMatch = userAgent.match(/^Opera\/([^\s]+)\s?(.*)$/);
    if (operaMatch) {
      const [, version, rest] = operaMatch;
      return `${version}${rest ? ` ${rest}` : ''}`.trim();
    }

    return userAgent;
  }

  prefs(prefs) {
    this.#prefs = prefs;
  }

  linuxNavigatorPlatform(uaString, parsed) {
    const fromUa = uaString.match(/\((?:[^)]*;\s*)?Linux\s+([^;)]+)\)/i);
    if (fromUa) {
      const tail = fromUa[1].trim();
      if (tail) {
        return tail.toLowerCase().startsWith('linux ') ? tail : `Linux ${tail}`;
      }
    }

    const arch = (parsed.cpu && parsed.cpu.architecture) || '';
    const map = {
      amd64: 'x86_64',
      x64: 'x86_64',
      ia32: 'i686',
      i686: 'i686',
      arm: 'armv7l',
      armhf: 'armv7l',
      aarch64: 'aarch64',
      arm64: 'aarch64'
    };
    const normalized = map[String(arch).toLowerCase()] || arch;
    if (normalized) {
      return `Linux ${normalized}`;
    }
    return 'Linux x86_64';
  }
  
  parse(s = '') {
    if (this.#prefs.parser && this.#prefs.parser[s]) {
      return Object.assign({
        userAgent: s
      }, this.#prefs.parser[s]);
    }

    // build ua string from the navigator object or from a custom UAParser;
    // examples: ${platform}, ${browser.version|ua-parser}
    s = s.replace(/\${([^}]+)}/g, (a, b) => {
      const key = (parent, keys) => {
        for (const key of keys) {
          parent = parent[key] || {};
        }
        return parent;
      };

      let [childs, object] = b.split('|');
      object = object || 'navigator';

      let v;
      if (object.startsWith('ua-parser')) {
        const [a, b] = object.split('@');
        object = a;

        v = key((new UAParser(b || navigator.userAgent)).getResult(), childs.split('.'));
      }
      v = v || key(navigator, childs.split('.'));
      return typeof v === 'string' ? v : 'cannot parse your ${...} replacements.';
    });
    
    const o = {};
    o.userAgent = s;
    o.appVersion = this.deriveAppVersion(s);

    const isFF = /Firefox/.test(s);
    const isCH = /Chrome/.test(s);
    const isSF = /Safari/.test(s) && isCH === false;

    const p = (new UAParser(s)).getResult();

    // platform
    if (p.os.name === 'Mac OS' || p.os.name === 'macOS') {
      o.platform = 'MacIntel';
    }
    else if (p.os.name === 'Windows') {
      o.platform = 'Win32';
    }
    else if (p.os.name === 'Linux') {
      o.platform = this.linuxNavigatorPlatform(s, p);
    }
    else if (p.os.name === 'Android') {
      if (p.cpu.architecture) {
        o.platform = 'Linux ' + p.cpu.architecture;
      }
      else {
        o.platform = 'Linux armv81';
      }
    }
    else if (p.os.name === 'iOS') {
      o.platform = p.device.model;
    }
    // backup plan
    if (!o.platform) {
      if (p.os.name === 'Linux') {
        o.platform = this.linuxNavigatorPlatform(s, p);
      }
      else {
        o.platform = (p.cpu.architecture ? ('Linux ' + p.cpu.architecture) : (p.os.name || ''));
      }
    }

    o.vendor = p.device.vendor || '';
    if (isSF) {
      o.vendor = 'Apple Computer, Inc.';
    }
    else if (isFF === false) {
      o.vendor = 'Google Inc.';
    }
    o.product = p.engine.name || '';
    if (s.indexOf('Gecko') !== -1) {
      o.product = 'Gecko';
    }
    
    // Set appName and appCodeName
    o.appName = 'Netscape';
    o.appCodeName = 'Mozilla';
    
    o.userAgentData = '[delete]';
    if (isFF) {
      o.oscpu = ((p.os.name || '') + ' ' + (p.os.version || '')).trim();
      o.productSub = '20100101';
      o.buildID = '20181001000000';
    }
    else {
      o.oscpu = '[delete]';
      o.buildID = '[delete]';
      o.productSub = '20030107';

      if (this.#prefs.userAgentData && p.browser && p.browser.major) {
        if (['Opera', 'Chrome', 'Edge'].includes(p.browser.name)) {
          o.userAgentDataBuilder = {p, ua: s};
          delete o.userAgentData;
        }
      }
    }

    if (o.userAgent === 'empty') {
      Object.keys(o).forEach(key => {
        if (key !== 'userAgent') {
          o[key] = '';
        }
      });
    }
    return o;
  }
}


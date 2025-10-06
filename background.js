// Background script for User Agent Spoofer
// UAParser and Agent are loaded via manifest.json background.scripts
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
    this.agent = new Agent();
    this.agent.prefs({ userAgentData: true, parser: {} });
    this.init();
  }

  async init() {
    await this.loadSettings();
    await this.fetchUserAgents();
    this.setupRequestListener();
    this.setupResponseListener();
    this.updateBadge();
  }

  async loadSettings() {
    const result = await browser.storage.local.get([
      'isEnabled',
      'currentUserAgent',
      'customUserAgents',
      'mode',
      'whitelist',
      'blacklist'
    ]);
    
    this.isEnabled = result.isEnabled || false;
    this.currentUserAgent = result.currentUserAgent || null;
    this.customUserAgents = result.customUserAgents || [];
    this.mode = result.mode || 'all';
    this.whitelist = result.whitelist || [];
    this.blacklist = result.blacklist || [];
    
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
      blacklist: this.blacklist
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

  async fetchUserAgents() {
    try {
      // Caching: check if we have a recent cache (24h)
      const CACHE_KEY = 'userAgentCache';
      const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
      const cache = await browser.storage.local.get([CACHE_KEY]);
      const now = Date.now();
      let useCache = false;
      let cachedData = null;
      if (cache[CACHE_KEY] && cache[CACHE_KEY].timestamp && (now - cache[CACHE_KEY].timestamp < CACHE_TTL)) {
        cachedData = cache[CACHE_KEY].data;
        useCache = true;
      }

      let data;
      if (useCache) {
        data = cachedData;
      } else {
        // Fetch all user agent sources
        const urls = [
          // Most Common
          'https://raw.githubusercontent.com/ShrekBytes/useragents-data/main/common/desktop.json',
          'https://raw.githubusercontent.com/ShrekBytes/useragents-data/main/common/mobile.json',
          // Latest
          'https://raw.githubusercontent.com/ShrekBytes/useragents-data/main/latest/android.json',
          'https://raw.githubusercontent.com/ShrekBytes/useragents-data/main/latest/ipad.json',
          'https://raw.githubusercontent.com/ShrekBytes/useragents-data/main/latest/iphone.json',
          'https://raw.githubusercontent.com/ShrekBytes/useragents-data/main/latest/linux.json',
          'https://raw.githubusercontent.com/ShrekBytes/useragents-data/main/latest/mac.json',
          'https://raw.githubusercontent.com/ShrekBytes/useragents-data/main/latest/windows.json'
        ];
        const responses = await Promise.all(urls.map(url => fetch(url)));
        data = await Promise.all(responses.map(response => response.json()));
        // Save to cache
        await browser.storage.local.set({
          [CACHE_KEY]: {
            timestamp: now,
            data: data
          }
        });
      }

      // Process and tag user agents
      const userAgents = [];
      // Process most common
      if (data[0] && data[0].user_agents) {
        for (const ua of data[0].user_agents) {
          userAgents.push({ ua, source: 'most_common', device: 'desktop' });
        }
      }
      if (data[1] && data[1].user_agents) {
        for (const ua of data[1].user_agents) {
          userAgents.push({ ua, source: 'most_common', device: 'mobile' });
        }
      }
      // Process latest
      const latestDevices = ['android', 'ipad', 'iphone', 'linux', 'mac', 'windows'];
      for (let i = 2; i < data.length; i++) {
        if (data[i] && data[i].user_agents) {
          for (const ua of data[i].user_agents) {
            userAgents.push({ ua, source: 'latest', device: latestDevices[i - 2] });
          }
        }
      }
      // Add custom user agents
      userAgents.push(...this.customUserAgents.map(ua => ({ ...ua, source: 'custom' })));
      this.userAgents = userAgents;
    } catch (error) {
      console.error('Failed to fetch user agents:', error);
      // Fallback to basic user agents
      this.userAgents = [
        {
          ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
          source: 'fallback',
          device: 'windows'
        },
        {
          ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
          source: 'fallback',
          device: 'mac'
        },
        {
          ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
          source: 'fallback',
          device: 'iphone'
        },
        {
          ua: 'Mozilla/5.0 (Linux; Android 15; Pixel 9 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36',
          source: 'fallback',
          device: 'android'
        },
        {
          ua: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
          source: 'fallback',
          device: 'ipad'
        },
        {
          ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
          source: 'fallback',
          device: 'linux'
        },
        {
          ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0',
          source: 'fallback',
          device: 'windows'
        },
        {
          ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13.5; rv:142.0) Gecko/20100101 Firefox/142.0',
          source: 'fallback',
          device: 'mac'
        }
      ];
    }
  }

  setupRequestListener() {
    browser.webRequest.onBeforeSendHeaders.addListener(
      (details) => {
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

        // Add Client Hints headers for Chrome-based user agents
        if (this.currentParsedUA.userAgentDataBuilder) {
          const uaData = this.currentParsedUA.userAgentDataBuilder;
          let platform = uaData.p?.os?.name || 'Windows';
          
          if (platform.toLowerCase().includes('mac')) {
            platform = 'macOS';
          } else if (platform.toLowerCase().includes('debian')) {
            platform = 'Linux';
          }

          const version = uaData.p?.browser?.major || '107';
          let name = uaData.p?.browser?.name || 'Google Chrome';
          if (name === 'Chrome') {
            name = 'Google Chrome';
          }

          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(this.currentUserAgent);

          // Add the essential Client Hints headers
          headers.push({
            name: 'sec-ch-ua-platform',
            value: `"${platform}"`
          });
          headers.push({
            name: 'sec-ch-ua',
            value: `"Not/A)Brand";v="8", "Chromium";v="${version}", "${name}";v="${version}"`
          });
          headers.push({
            name: 'sec-ch-ua-mobile',
            value: isMobile ? '?1' : '?0'
          });
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
          
          // Create the UA object for injection
          const uaObject = Object.assign({}, this.currentParsedUA, { type: 'user' });
          
          // Add Server-Timing header with UA data
          headers.push({
            name: 'Server-Timing',
            value: `uasw-json-data;dur=0;desc="${encodeURIComponent(JSON.stringify(uaObject))}"`
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

  shouldApplyUserAgent(url) {
    const hostname = new URL(url).hostname;
    
    switch (this.mode) {
      case 'all':
        return true;
      case 'blacklist':
        return !this.blacklist.some(site => hostname.includes(site));
      case 'whitelist':
        return this.whitelist.some(site => hostname.includes(site));
      default:
        return true;
    }
  }

  async toggleEnabled() {
    this.isEnabled = !this.isEnabled;
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
      ua: userAgent
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
          sourceMatch = source.includes('all') || source.includes(ua.source);
        } else {
          sourceMatch = ua.source === source;
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
      blacklist: this.blacklist
    };
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
  switch (message.action) {
    case 'getStatus':
      sendResponse(spoofer.getStatus());
      break;
      
    case 'toggleEnabled':
      spoofer.toggleEnabled().then(enabled => sendResponse({ enabled }));
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
      if (sender.tab && sender.tab.id) {
        browser.browserAction.setTitle({
          tabId: sender.tab.id,
          title: '[Unga Bunga UA] Active'
        });
      }
      break;

    case 'get-port-string':
      // Return the current UA configuration for cross-origin frames
      if (spoofer.currentParsedUA) {
        const uaObject = Object.assign({}, spoofer.currentParsedUA, { type: 'user' });
        sendResponse(encodeURIComponent(JSON.stringify(uaObject)));
      } else {
        sendResponse('');
      }
      break;
  }
}); 
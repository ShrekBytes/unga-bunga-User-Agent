// Background script for User Agent Spoofer
class UserAgentSpoofer {
  constructor() {
    this.userAgents = [];
    this.customUserAgents = [];
    this.isEnabled = false;
    this.currentUserAgent = null;
    this.mode = 'all'; // 'all', 'blacklist', 'whitelist'
    this.whitelist = [];
    this.blacklist = [];
    this.init();
  }

  async init() {
    await this.loadSettings();
    await this.fetchUserAgents();
    this.setupRequestListener();
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
        if (!this.isEnabled || !this.currentUserAgent) {
          return {};
        }

        // Check if we should apply user agent based on mode and site lists
        if (!this.shouldApplyUserAgent(details.url)) {
          return {};
        }

        const headers = details.requestHeaders.map(header => {
          if (header.name.toLowerCase() === 'user-agent') {
            return { name: header.name, value: this.currentUserAgent };
          }
          return header;
        });

        return { requestHeaders: headers };
      },
      { urls: ['<all_urls>'] },
      ['blocking', 'requestHeaders']
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

  getSmartRandomUserAgent(device, browser) {
    if (this.userAgents.length === 0) return null;
    
    const filteredAgents = this.userAgents.filter(ua => {
      const uaLower = ua.ua.toLowerCase();
      
      // Check device match
      const deviceMatch = this.checkDeviceMatch(uaLower, device);
      
      // Check browser match
      const browserMatch = this.checkBrowserMatch(uaLower, browser);
      
      return deviceMatch && browserMatch;
    });
    
    if (filteredAgents.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * filteredAgents.length);
    return filteredAgents[randomIndex].ua;
  }

  checkDeviceMatch(userAgent, device) {
    switch (device) {
      case 'android': return userAgent.includes('android');
      case 'ios': return userAgent.includes('iphone') || userAgent.includes('ipad');
      case 'linux': return userAgent.includes('linux') && !userAgent.includes('android');
      case 'mac': return userAgent.includes('macintosh');
      case 'windows': return userAgent.includes('windows');
      default: return true;
    }
  }

  checkBrowserMatch(userAgent, browser) {
    switch (browser) {
      case 'chrome': return userAgent.includes('chrome') && !userAgent.includes('edg');
      case 'edge': return userAgent.includes('edg');
      case 'firefox': return userAgent.includes('firefox');
      case 'opera': return userAgent.includes('opera');
      case 'safari': return userAgent.includes('safari') && !userAgent.includes('chrome');
      case 'vivaldi': return userAgent.includes('vivaldi');
      default: return true;
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
    'enableInterval'
  ]);
  return {
    device: prefs.preferredDevice || 'android',
    browser: prefs.preferredBrowser || 'chrome',
    source: prefs.preferredSource || 'all',
    intervalMinutes: prefs.intervalMinutes || 5,
    enableInterval: prefs.enableInterval || false
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
  // Use the same logic as smartRandom in popup.js
  const filteredAgents = spoofer.userAgents.filter(ua => {
    if (prefs.source && prefs.source !== 'all' && ua.source !== prefs.source) return false;
    const uaLower = ua.ua.toLowerCase();
    const deviceMatch = spoofer.checkDeviceMatch(uaLower, prefs.device);
    const browserMatch = spoofer.checkBrowserMatch(uaLower, prefs.browser);
    return deviceMatch && browserMatch;
  });
  if (filteredAgents.length > 0) {
    const randomUA = filteredAgents[Math.floor(Math.random() * filteredAgents.length)].ua;
    await spoofer.setUserAgent(randomUA);
  }
}

// Listen for storage changes
browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && ('enableInterval' in changes || 'intervalMinutes' in changes || 'preferredDevice' in changes || 'preferredBrowser' in changes || 'preferredSource' in changes)) {
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
      
    case 'getSmartRandomUserAgent':
      const smartRandomUA = spoofer.getSmartRandomUserAgent(message.device, message.browser);
      sendResponse({ userAgent: smartRandomUA });
      break;
      
    case 'refreshUserAgents':
      spoofer.fetchUserAgents().then(() => sendResponse({ success: true }));
      return true;
  }
}); 
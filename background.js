// Background script for User Agent Spoofer (Manifest V3 - Firefox)

class UserAgentSpoofer {
  constructor() {
    this.userAgents = [];
    this.customUserAgents = [];
    this.isEnabled = false;
    this.currentUserAgent = null;
    this.mode = 'all'; // 'all', 'blacklist', 'whitelist'
    this.whitelist = [];
    this.blacklist = [];
    this.ruleId = 1;
    this.init();
  }

  async init() {
    try {
      await this.loadSettings();
      await this.fetchUserAgents();
      await this.updateDeclarativeRules();
      await this.updateBadge();
    } catch (error) {
      console.error('Failed to initialize UserAgentSpoofer:', error);
    }
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.local.get([
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
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.local.set({
        isEnabled: this.isEnabled,
        currentUserAgent: this.currentUserAgent,
        customUserAgents: this.customUserAgents,
        mode: this.mode,
        whitelist: this.whitelist,
        blacklist: this.blacklist
      });
      await this.updateDeclarativeRules();
      await this.updateBadge();
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  async updateBadge() {
    try {
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

      if (chrome.action && chrome.action.setBadgeText) {
        await chrome.action.setBadgeText({ text: badgeText });
        await chrome.action.setBadgeBackgroundColor({ color: badgeColor });
      }
    } catch (error) {
      console.error('Error updating badge:', error);
    }
  }

  async fetchUserAgents() {
    try {
      // Caching: check if we have a recent cache (24h)
      const CACHE_KEY = 'userAgentCache';
      const CACHE_TTL = Utils ? Utils.CACHE_TTL : 24 * 60 * 60 * 1000; // 24 hours
      const cache = await chrome.storage.local.get([CACHE_KEY]);
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
        const urls = Utils ? Utils.USER_AGENT_SOURCES : [
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
        
        const responses = await Promise.all(
          urls.map(url => fetch(url).catch(err => {
            console.warn(`Failed to fetch ${url}:`, err);
            return null;
          }))
        );
        
        data = await Promise.all(
          responses.map(response => 
            response ? response.json().catch(() => null) : null
          )
        );
        
        // Save to cache
        await chrome.storage.local.set({
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
      this.userAgents = Utils ? Utils.FALLBACK_USER_AGENTS : [
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

  async updateDeclarativeRules() {
    try {
      // Clear existing rules
      const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
      const ruleIds = existingRules.map(rule => rule.id);
      
      if (ruleIds.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: ruleIds
        });
      }

      // If disabled or no user agent, don't add any rules
      if (!this.isEnabled || !this.currentUserAgent) {
        return;
      }

      // Create new rule
      const rule = {
        id: this.ruleId,
        priority: 1,
        action: {
          type: 'modifyHeaders',
          requestHeaders: [
            {
              header: 'user-agent',
              operation: 'set',
              value: this.currentUserAgent
            }
          ]
        },
        condition: this.createRuleCondition()
      };

      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: [rule]
      });
      
    } catch (error) {
      console.error('Failed to update declarative rules:', error);
    }
  }

  createRuleCondition() {
    const condition = {
      resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest', 'other']
    };

    switch (this.mode) {
      case 'all':
        condition.urlFilter = '*';
        break;
      case 'blacklist':
        if (this.blacklist.length > 0) {
          condition.excludedRequestDomains = this.blacklist.slice();
        }
        condition.urlFilter = '*';
        break;
      case 'whitelist':
        if (this.whitelist.length > 0) {
          condition.requestDomains = this.whitelist.slice();
        } else {
          // If whitelist is empty, don't match anything
          condition.urlFilter = 'impossible-url-that-never-matches';
        }
        break;
      default:
        condition.urlFilter = '*';
    }

    return condition;
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
    // Validate user agent
    if (Utils && !Utils.isValidUserAgent(userAgent)) {
      throw new Error('Invalid user agent format');
    }
    
    const customUA = { ua: userAgent };
    
    // Check if already exists
    const exists = this.customUserAgents.some(ua => ua.ua === userAgent);
    if (exists) {
      throw new Error('User agent already exists in custom list');
    }
    
    this.customUserAgents.push(customUA);
    this.userAgents.push({ ...customUA, source: 'custom' });
    await this.saveSettings();
  }

  async removeCustomUserAgent(userAgent) {
    this.customUserAgents = this.customUserAgents.filter(ua => ua.ua !== userAgent);
    this.userAgents = this.userAgents.filter(ua => !(ua.ua === userAgent && ua.source === 'custom'));
    await this.saveSettings();
  }

  async setMode(mode) {
    if (!['all', 'blacklist', 'whitelist'].includes(mode)) {
      throw new Error('Invalid mode');
    }
    this.mode = mode;
    await this.saveSettings();
  }

  async addSite(site, listType) {
    if (!['whitelist', 'blacklist'].includes(listType)) {
      throw new Error('Invalid list type');
    }
    
    const cleanSite = Utils ? Utils.cleanSiteDomain(site) : site.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (cleanSite && !this[listType].includes(cleanSite)) {
      this[listType].push(cleanSite);
      await this.saveSettings();
    } else if (!cleanSite) {
      throw new Error('Invalid domain format');
    }
  }

  async removeSite(site, listType) {
    if (!['whitelist', 'blacklist'].includes(listType)) {
      throw new Error('Invalid list type');
    }
    
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
      // Filter by source first
      if (source && source !== 'all' && ua.source !== source) {
        return false;
      }
      
      const uaLower = ua.ua.toLowerCase();
      
      // Check device match
      const deviceMatch = this.checkDeviceMatch(uaLower, device);
      
      // Check browser match
      const browserMatch = this.checkBrowserMatch(uaLower, browser);
      
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

// Auto-random timer management
let autoRandomTimer = null;

async function getPreferences() {
  try {
    const prefs = await chrome.storage.local.get([
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
  } catch (error) {
    console.error('Failed to get preferences:', error);
    return {
      device: 'android',
      browser: 'chrome',
      source: 'all',
      intervalMinutes: 5,
      enableInterval: false
    };
  }
}

function clearAutoRandomTimer() {
  if (autoRandomTimer) {
    clearInterval(autoRandomTimer);
    autoRandomTimer = null;
  }
}

async function startAutoRandomTimer() {
  clearAutoRandomTimer();
  try {
    const prefs = await getPreferences();
    if (!prefs.enableInterval) return;
    
    let minutes = Utils ? Utils.validateInterval(prefs.intervalMinutes) : parseInt(prefs.intervalMinutes);
    if (!Utils) {
      if (isNaN(minutes) || minutes < 1) minutes = 1;
      if (minutes > 60) minutes = 60;
    }
    const ms = minutes * 60 * 1000;
    autoRandomTimer = setInterval(runSmartRandom, ms);
  } catch (error) {
    console.error('Failed to start auto random timer:', error);
  }
}

async function runSmartRandom() {
  try {
    const prefs = await getPreferences();
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
  } catch (error) {
    console.error('Failed to run smart random:', error);
  }
}

// Listen for storage changes
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === 'local' && ('enableInterval' in changes || 'intervalMinutes' in changes || 'preferredDevice' in changes || 'preferredBrowser' in changes || 'preferredSource' in changes)) {
    try {
      const prefs = await getPreferences();
      if (prefs.enableInterval) {
        await startAutoRandomTimer();
      } else {
        clearAutoRandomTimer();
      }
    } catch (error) {
      console.error('Failed to handle storage changes:', error);
    }
  }
});

// Background script startup
chrome.runtime.onStartup.addListener(async () => {
  try {
    const prefs = await getPreferences();
    if (prefs.enableInterval) {
      await startAutoRandomTimer();
    }
  } catch (error) {
    console.error('Failed to handle startup:', error);
  }
});

// Extension installation/update
chrome.runtime.onInstalled.addListener(async () => {
  try {
    const prefs = await getPreferences();
    if (prefs.enableInterval) {
      await startAutoRandomTimer();
    }
  } catch (error) {
    console.error('Failed to handle installation:', error);
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.action) {
        case 'getStatus':
          sendResponse(spoofer.getStatus());
          break;
          
        case 'toggleEnabled':
          const enabled = await spoofer.toggleEnabled();
          sendResponse({ enabled });
          break;
          
        case 'setUserAgent':
          await spoofer.setUserAgent(message.userAgent);
          sendResponse({ success: true });
          break;
          
        case 'addCustomUserAgent':
          await spoofer.addCustomUserAgent(message.userAgent);
          sendResponse({ success: true });
          break;
          
        case 'removeCustomUserAgent':
          await spoofer.removeCustomUserAgent(message.userAgent);
          sendResponse({ success: true });
          break;
          
        case 'setMode':
          await spoofer.setMode(message.mode);
          sendResponse({ success: true });
          break;
          
        case 'addSite':
          await spoofer.addSite(message.site, message.listType);
          sendResponse({ success: true });
          break;
          
        case 'removeSite':
          await spoofer.removeSite(message.site, message.listType);
          sendResponse({ success: true });
          break;
          
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
          await spoofer.fetchUserAgents();
          sendResponse({ success: true });
          break;
          
        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Message handler error:', error);
      sendResponse({ error: error.message });
    }
  })();
  
  return true; // Will respond asynchronously
});
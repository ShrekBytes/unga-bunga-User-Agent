// Background script for User Agent Spoofer
class UserAgentSpoofer {
  constructor() {
    this.userAgents = [];
    this.customUserAgents = [];
    this.isEnabled = false;
    this.currentUserAgent = null;
    this.init();
  }

  async init() {
    await this.loadSettings();
    await this.fetchUserAgents();
    this.setupRequestListener();
  }

  async loadSettings() {
    const result = await browser.storage.local.get([
      'isEnabled',
      'currentUserAgent',
      'customUserAgents'
    ]);
    
    this.isEnabled = result.isEnabled || false;
    this.currentUserAgent = result.currentUserAgent || null;
    this.customUserAgents = result.customUserAgents || [];
  }

  async saveSettings() {
    await browser.storage.local.set({
      isEnabled: this.isEnabled,
      currentUserAgent: this.currentUserAgent,
      customUserAgents: this.customUserAgents
    });
  }

  async fetchUserAgents() {
    try {
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
      const data = await Promise.all(responses.map(response => response.json()));

      // Process and tag user agents
      this.userAgents = [];
      
      // Process most common
      if (data[0] && data[0].user_agents) {
        data[0].user_agents.forEach(ua => {
          this.userAgents.push({
            ua: ua,
            source: 'most_common',
            device: 'desktop',
            pct: 100
          });
        });
      }
      
      if (data[1] && data[1].user_agents) {
        data[1].user_agents.forEach(ua => {
          this.userAgents.push({
            ua: ua,
            source: 'most_common',
            device: 'mobile',
            pct: 100
          });
        });
      }

      // Process latest
      const latestDevices = ['android', 'ipad', 'iphone', 'linux', 'mac', 'windows'];
      for (let i = 2; i < data.length; i++) {
        if (data[i] && data[i].user_agents) {
          data[i].user_agents.forEach(ua => {
            this.userAgents.push({
              ua: ua,
              source: 'latest',
              device: latestDevices[i - 2],
              pct: 100
            });
          });
        }
      }

      // Add custom user agents
      this.userAgents.push(...this.customUserAgents.map(ua => ({ ...ua, source: 'custom' })));
    } catch (error) {
      console.error('Failed to fetch user agents:', error);
      // Fallback to basic user agents
      this.userAgents = [
        {
          ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          source: 'fallback',
          device: 'windows',
          pct: 100
        },
        {
          ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          source: 'fallback',
          device: 'mac',
          pct: 100
        },
        {
          ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1.2 Mobile/15E148 Safari/604.1',
          source: 'fallback',
          device: 'iphone',
          pct: 100
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
      ua: userAgent,
      pct: 100
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

  getRandomUserAgent() {
    if (this.userAgents.length === 0) return null;
    
    const totalWeight = this.userAgents.reduce((sum, ua) => sum + ua.pct, 0);
    let random = Math.random() * totalWeight;
    
    for (const ua of this.userAgents) {
      random -= ua.pct;
      if (random <= 0) {
        return ua.ua;
      }
    }
    
    return this.userAgents[0].ua;
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
    
    const totalWeight = filteredAgents.reduce((sum, ua) => sum + ua.pct, 0);
    let random = Math.random() * totalWeight;
    
    for (const ua of filteredAgents) {
      random -= ua.pct;
      if (random <= 0) {
        return ua.ua;
      }
    }
    
    return filteredAgents[0].ua;
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
      customUserAgents: this.customUserAgents
    };
  }
}

// Initialize the spoofer
const spoofer = new UserAgentSpoofer();

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
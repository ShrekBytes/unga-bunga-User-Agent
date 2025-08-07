// Popup script for User Agent Spoofer
class PopupUI {
  constructor() {
    this.userAgents = [];
    this.customUserAgents = [];
    this.preferences = {
      device: 'android',
      browser: 'chrome',
      source: 'all'
    };
    this.lastAppliedUA = null;
    this.intervalTimer = null;
    this.init();
  }

  showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  async init() {
    this.setupEventListeners();
    await this.loadPreferences();
    await this.loadStatus();
    await this.loadUserAgents();
  }

  setupEventListeners() {
    // Toggle switch
    document.getElementById('enabled').addEventListener('change', (e) => {
      this.toggleEnabled(e.target.checked);
    });

    // Quick action buttons
    document.getElementById('randomBtn').addEventListener('click', () => {
      this.setRandomUserAgent();
    });

    document.getElementById('updateBtn').addEventListener('click', () => {
      this.refreshUserAgents();
    });

    // Smart Random and Interval
    document.getElementById('smartRandomBtn').addEventListener('click', () => {
      this.smartRandom();
    });

    document.getElementById('enableInterval').addEventListener('change', (e) => {
      this.toggleInterval(e.target.checked);
    });

    document.getElementById('intervalMinutes').addEventListener('input', (e) => {
      if (this.intervalTimer) {
        this.startInterval();
      }
    });

    // Custom user agent input
    document.getElementById('addCustomBtn').addEventListener('click', () => {
      this.addCustomUserAgent();
    });

    document.getElementById('customUA').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.addCustomUserAgent();
      }
    });

    // Current UA Apply/Random/Reset Default
    document.getElementById('applyUA').addEventListener('click', async () => {
      const ua = document.getElementById('currentUATextarea').value.trim();
      if (ua) {
        this.lastAppliedUA = ua;
        await browser.runtime.sendMessage({ action: 'setUserAgent', userAgent: ua });
        await this.loadStatus();
        this.renderUserAgentList();
        this.showToast('User agent applied successfully', 'success');
      } else {
        this.showToast('Please enter a user agent', 'warning');
      }
    });
    document.getElementById('resetDefaultUA').addEventListener('click', async () => {
      await browser.runtime.sendMessage({ action: 'setUserAgent', userAgent: null });
      await this.loadStatus();
      this.renderUserAgentList();
      this.showToast('Reset to default user agent', 'info');
    });

    // Filter tabs (removed since we integrated the list into preferences)
  }

  async loadPreferences() {
    try {
      // Load saved preferences
      const result = await browser.storage.local.get(['preferredDevice', 'preferredBrowser', 'preferredSource', 'enableInterval', 'intervalMinutes']);
      
      if (result.preferredDevice) {
        this.preferences.device = result.preferredDevice;
        document.querySelector(`input[name="preferredDevice"][value="${result.preferredDevice}"]`).checked = true;
      }
      if (result.preferredBrowser) {
        this.preferences.browser = result.preferredBrowser;
        document.querySelector(`input[name="preferredBrowser"][value="${result.preferredBrowser}"]`).checked = true;
      }
      if (result.preferredSource) {
        this.preferences.source = result.preferredSource;
        document.querySelector(`input[name="preferredSource"][value="${result.preferredSource}"]`).checked = true;
      }
      if (result.intervalMinutes) {
        document.getElementById('intervalMinutes').value = result.intervalMinutes;
      }
      if (result.enableInterval) {
        document.getElementById('enableInterval').checked = true;
        this.startInterval();
      }

      // Add change listeners
      document.querySelectorAll('input[name="preferredDevice"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
          this.preferences.device = e.target.value;
          browser.storage.local.set({ preferredDevice: e.target.value });
          this.renderUserAgentList();
        });
      });

      document.querySelectorAll('input[name="preferredBrowser"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
          this.preferences.browser = e.target.value;
          browser.storage.local.set({ preferredBrowser: e.target.value });
          this.renderUserAgentList();
        });
      });

      document.querySelectorAll('input[name="preferredSource"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
          this.preferences.source = e.target.value;
          browser.storage.local.set({ preferredSource: e.target.value });
          this.renderUserAgentList();
        });
      });

      // Save intervalMinutes on input
      document.getElementById('intervalMinutes').addEventListener('input', (e) => {
        let val = parseInt(e.target.value);
        if (isNaN(val) || val < 1) val = 1;
        if (val > 60) val = 60;
        e.target.value = val;
        browser.storage.local.set({ intervalMinutes: val });
        if (this.intervalTimer) {
          this.startInterval();
        }
      });
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  }

  async loadStatus() {
    try {
      const status = await browser.runtime.sendMessage({ action: 'getStatus' });
      this.updateUI(status);
    } catch (error) {
      console.error('Failed to load status:', error);
    }
  }

  async loadUserAgents() {
    try {
      const status = await browser.runtime.sendMessage({ action: 'getStatus' });
      this.userAgents = status.userAgents || [];
      this.customUserAgents = status.customUserAgents || [];
      this.renderUserAgentList();
      this.renderCustomUserAgentList();
    } catch (error) {
      console.error('Failed to load user agents:', error);
    }
  }

  updateUI(status) {
    // Update toggle
    document.getElementById('enabled').checked = status.isEnabled;

    // Update current user agent textarea
    const currentUATextarea = document.getElementById('currentUATextarea');
    if (status.currentUserAgent) {
      currentUATextarea.value = status.currentUserAgent;
    } else {
      currentUATextarea.value = '';
      currentUATextarea.placeholder = 'No user agent selected';
    }
  }

  async toggleEnabled(enabled) {
    try {
      const response = await browser.runtime.sendMessage({ action: 'toggleEnabled' });
      this.updateUI({ isEnabled: response.enabled });
    } catch (error) {
      console.error('Failed to toggle enabled:', error);
    }
  }

  async setRandomUserAgent() {
    try {
      const response = await browser.runtime.sendMessage({ 
        action: 'getRandomUserAgent'
      });
      if (response.userAgent) {
        await browser.runtime.sendMessage({ 
          action: 'setUserAgent', 
          userAgent: response.userAgent 
        });
        await this.loadStatus();
        this.renderUserAgentList();
        this.showToast('Random user agent applied', 'success');
      }
    } catch (error) {
      console.error('Failed to set random user agent:', error);
      this.showToast('Failed to get random user agent', 'warning');
    }
  }

  async refreshUserAgents() {
    try {
      await browser.runtime.sendMessage({ action: 'refreshUserAgents' });
      await this.loadUserAgents();
      this.showToast('User agents updated successfully', 'success');
    } catch (error) {
      console.error('Failed to refresh user agents:', error);
      this.showToast('Failed to update user agents', 'warning');
    }
  }

  async addCustomUserAgent() {
    const input = document.getElementById('customUA');
    const userAgent = input.value.trim();
    
    if (!userAgent) {
      this.showToast('Please enter a user agent', 'warning');
      return;
    }

    try {
      await browser.runtime.sendMessage({ 
        action: 'addCustomUserAgent', 
        userAgent: userAgent
      });
      input.value = '';
      await this.loadUserAgents();
      this.showToast('Custom user agent added', 'success');
    } catch (error) {
      console.error('Failed to add custom user agent:', error);
      this.showToast('Failed to add custom user agent', 'warning');
    }
  }

  renderCustomUserAgentList() {
    const container = document.getElementById('customUAList');
    
    if (this.customUserAgents.length === 0) {
      container.innerHTML = '<div class="loading">No custom user agents</div>';
      return;
    }

    const html = this.customUserAgents.map(ua => {
      return `
        <div class="user-agent-item" data-ua="${ua.ua}">
          <div class="user-agent-text">${ua.ua}</div>
          <button class="remove-btn" data-ua="${ua.ua}">×</button>
        </div>
      `;
    }).join('');

    container.innerHTML = html;

    // Add click listeners for remove buttons
    container.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeCustomUserAgent(e.target.dataset.ua);
      });
    });
  }

  async removeCustomUserAgent(userAgent) {
    try {
      await browser.runtime.sendMessage({ 
        action: 'removeCustomUserAgent', 
        userAgent: userAgent 
      });
      await this.loadUserAgents();
      this.showToast('Custom user agent removed', 'info');
    } catch (error) {
      console.error('Failed to remove custom user agent:', error);
      this.showToast('Failed to remove custom user agent', 'warning');
    }
  }

  // Removed setFilter method as it's no longer needed

  renderUserAgentList() {
    const container = document.getElementById('uaList');
    const countContainer = document.getElementById('uaCount');
    
    // Filter user agents based on current preferences
    let filteredAgents = this.userAgents;
    
    // Filter by source
    if (this.preferences.source && this.preferences.source !== 'all') {
      filteredAgents = filteredAgents.filter(ua => ua.source === this.preferences.source);
    }
    
    // Filter by device and browser
    if (this.preferences.device && this.preferences.browser) {
      filteredAgents = filteredAgents.filter(ua => {
        const uaLower = ua.ua.toLowerCase();
        // Check device match
        const deviceMatch = this.checkDeviceMatch(uaLower, this.preferences.device);
        // Check browser match
        const browserMatch = this.checkBrowserMatch(uaLower, this.preferences.browser);
        return deviceMatch && browserMatch;
      });
    }

    // Update counts
    const globalCount = this.userAgents.length;
    const filteredCount = filteredAgents.length;
    countContainer.innerHTML = `
      <span>Filtered: ${filteredCount} user agents</span>
      <span class="global-count">Global: ${globalCount} user agents</span>
    `;

    if (filteredAgents.length === 0) {
      container.innerHTML = '<div class="loading">No user agents match your preferences</div>';
      return;
    }

    // Get current user agent for highlighting
    browser.runtime.sendMessage({ action: 'getStatus' }).then(status => {
      const currentUA = status.currentUserAgent;
      
      const html = filteredAgents.map(ua => {
        const isSelected = ua.ua === currentUA;
        const isCustom = this.customUserAgents.some(custom => custom.ua === ua.ua);
        return `
          <div class="user-agent-item ${isSelected ? 'selected' : ''}" data-ua="${ua.ua}">
            <div class="user-agent-text">${ua.ua}</div>
            ${isCustom ? `<button class="remove-btn" data-ua="${ua.ua}">×</button>` : ''}
          </div>
        `;
      }).join('');

      container.innerHTML = html;

      // Add click listeners
      container.querySelectorAll('.user-agent-item').forEach(item => {
        item.addEventListener('click', (e) => {
          if (e.target.classList.contains('remove-btn')) {
            e.stopPropagation();
            this.removeCustomUserAgent(e.target.dataset.ua);
            return;
          }
          this.selectUserAgent(item.dataset.ua);
        });
      });
    });
  }

  async selectUserAgent(userAgent) {
    try {
      await browser.runtime.sendMessage({ 
        action: 'setUserAgent', 
        userAgent: userAgent 
      });
      await this.loadStatus();
      this.renderUserAgentList();
    } catch (error) {
      console.error('Failed to select user agent:', error);
    }
  }

  async applyPreferences() {
    try {
      // Save preferences
      await browser.storage.local.set({
        preferredDevice: this.preferences.device,
        preferredBrowser: this.preferences.browser
      });

      // Filter user agents based on preferences
      const filteredAgents = this.userAgents.filter(ua => {
        const uaLower = ua.ua.toLowerCase();
        
        // Check device match
        const deviceMatch = this.checkDeviceMatch(uaLower, this.preferences.device);
        
        // Check browser match
        const browserMatch = this.checkBrowserMatch(uaLower, this.preferences.browser);
        
        return deviceMatch && browserMatch;
      });

      if (filteredAgents.length > 0) {
        // Select the first matching user agent
        await this.selectUserAgent(filteredAgents[0].ua);
      }
    } catch (error) {
      console.error('Failed to apply preferences:', error);
    }
  }

  async smartRandom() {
    try {
      const response = await browser.runtime.sendMessage({ 
        action: 'getSmartRandomUserAgent', 
        device: this.preferences.device,
        browser: this.preferences.browser
      });
      if (response.userAgent) {
        await browser.runtime.sendMessage({ 
          action: 'setUserAgent', 
          userAgent: response.userAgent 
        });
        await this.loadStatus();
        this.renderUserAgentList();
        this.showToast('Smart random user agent applied', 'success');
      } else {
        this.showToast('No matching user agents found', 'warning');
      }
    } catch (error) {
      console.error('Failed to get smart random user agent:', error);
      this.showToast('Failed to get smart random user agent', 'warning');
    }
  }

  checkDeviceMatch(userAgent, preferredDevice) {
    switch (preferredDevice) {
      case 'android': return userAgent.includes('android');
      case 'ios': return userAgent.includes('iphone') || userAgent.includes('ipad');
      case 'linux': return userAgent.includes('linux') && !userAgent.includes('android');
      case 'mac': return userAgent.includes('macintosh');
      case 'windows': return userAgent.includes('windows');
      default: return true;
    }
  }

  checkBrowserMatch(userAgent, preferredBrowser) {
    switch (preferredBrowser) {
      case 'chrome': return userAgent.includes('chrome') && !userAgent.includes('edg');
      case 'edge': return userAgent.includes('edg');
      case 'firefox': return userAgent.includes('firefox');
      case 'opera': return userAgent.includes('opera');
      case 'safari': return userAgent.includes('safari') && !userAgent.includes('chrome');
      case 'vivaldi': return userAgent.includes('vivaldi');
      default: return true;
    }
  }

  toggleInterval(enabled) {
    if (enabled) {
      this.startInterval();
      browser.storage.local.set({ enableInterval: true });
    } else {
      this.stopInterval();
      browser.storage.local.set({ enableInterval: false });
    }
  }

  startInterval() {
    this.stopInterval(); // Clear any existing timer
    const minutes = parseInt(document.getElementById('intervalMinutes').value) || 5;
    const milliseconds = minutes * 60 * 1000;
    
    this.intervalTimer = setInterval(() => {
      this.smartRandom();
    }, milliseconds);
    
    browser.storage.local.set({ intervalMinutes: minutes });
  }

  stopInterval() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  new PopupUI();
}); 
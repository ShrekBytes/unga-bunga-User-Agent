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
    this.mode = 'all';
    this.whitelist = [];
    this.blacklist = [];
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

    // Advanced Options
    this.setupAdvancedOptions();
  }

  setupAdvancedOptions() {
    // Advanced options toggle
    document.getElementById('advancedToggle').addEventListener('click', () => {
      this.toggleAdvancedOptions();
    });

    // Mode selection
    document.querySelectorAll('input[name="mode"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.mode = e.target.value;
        browser.runtime.sendMessage({ action: 'setMode', mode: this.mode });
        this.updateSiteListVisibility();
        this.updateSiteListTitle();
        this.renderSiteList();
        this.showToast(`Mode changed to ${this.mode}`, 'info');
      });
    });

    // Add site button
    document.getElementById('addSiteBtn').addEventListener('click', () => {
      this.showSiteInput();
    });

    // Confirm site button
    document.getElementById('confirmSiteBtn').addEventListener('click', () => {
      this.addSite();
    });

    // Cancel site button
    document.getElementById('cancelSiteBtn').addEventListener('click', () => {
      this.hideSiteInput();
    });

    // Site input enter key
    document.getElementById('siteInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.addSite();
      }
    });
  }

  toggleAdvancedOptions() {
    const advancedOptions = document.getElementById('advancedOptions');
    const toggleBtn = document.getElementById('advancedToggle');
    
    if (advancedOptions.style.display === 'none') {
      advancedOptions.style.display = 'block';
      toggleBtn.textContent = 'Hide';
    } else {
      advancedOptions.style.display = 'none';
      toggleBtn.textContent = 'Show';
    }
  }

  updateSiteListVisibility() {
    const siteListSection = document.getElementById('siteListSection');
    if (this.mode === 'all') {
      siteListSection.style.display = 'none';
    } else {
      siteListSection.style.display = 'block';
    }
  }

  showSiteInput() {
    document.getElementById('siteInputGroup').style.display = 'flex';
    document.getElementById('siteInput').focus();
  }

  hideSiteInput() {
    document.getElementById('siteInputGroup').style.display = 'none';
    document.getElementById('siteInput').value = '';
  }

  async addSite() {
    const siteInput = document.getElementById('siteInput');
    const site = siteInput.value.trim();
    
    if (!site) {
      this.showToast('Please enter a site domain', 'warning');
      return;
    }

    const listType = this.mode === 'whitelist' ? 'whitelist' : 'blacklist';
    
    try {
      await browser.runtime.sendMessage({ 
        action: 'addSite', 
        site: site, 
        listType: listType 
      });
      this.hideSiteInput();
      await this.loadStatus();
      this.renderSiteList();
      this.showToast(`Site added to ${listType}`, 'success');
    } catch (error) {
      console.error('Failed to add site:', error);
      this.showToast('Failed to add site', 'warning');
    }
  }

  async removeSite(site) {
    const listType = this.mode === 'whitelist' ? 'whitelist' : 'blacklist';
    
    try {
      await browser.runtime.sendMessage({ 
        action: 'removeSite', 
        site: site, 
        listType: listType 
      });
      await this.loadStatus();
      this.renderSiteList();
      this.showToast(`Site removed from ${listType}`, 'info');
    } catch (error) {
      console.error('Failed to remove site:', error);
      this.showToast('Failed to remove site', 'warning');
    }
  }

  updateSiteListTitle() {
    const title = document.getElementById('siteListTitle');
    if (this.mode === 'whitelist') {
      title.textContent = 'Whitelisted Sites';
    } else if (this.mode === 'blacklist') {
      title.textContent = 'Blacklisted Sites';
    } else {
      title.textContent = 'Site Lists';
    }
  }

  renderSiteList() {
    const container = document.getElementById('siteList');
    const sites = this.mode === 'whitelist' ? this.whitelist : this.blacklist;
    
    if (this.mode === 'all') {
      container.innerHTML = '<div class="loading">Select blacklist or whitelist mode to manage sites</div>';
      return;
    }
    
    if (sites.length === 0) {
      container.innerHTML = '<div class="loading">No sites added</div>';
      return;
    }

    const html = sites.map(site => {
      return `
        <div class="site-item" data-site="${site}">
          <div class="site-text">${site}</div>
          <button class="site-remove-btn" data-site="${site}">×</button>
        </div>
      `;
    }).join('');

    container.innerHTML = html;

    // Add click listeners for remove buttons
    container.querySelectorAll('.site-remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeSite(e.target.dataset.site);
      });
    });
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
      this.mode = status.mode || 'all';
      this.whitelist = status.whitelist || [];
      this.blacklist = status.blacklist || [];
      this.updateSiteListVisibility();
      this.updateSiteListTitle();
      this.renderSiteList();
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

    // Update mode selection
    if (status.mode) {
      document.querySelector(`input[name="mode"][value="${status.mode}"]`).checked = true;
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
      this.showToast('User agent selected and applied', 'success');
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
      case 'ipad': return userAgent.includes('ipad');
      case 'linux': return userAgent.includes('linux') && !userAgent.includes('android');
      case 'mac': return userAgent.includes('macintosh');
      case 'windows': return userAgent.includes('windows');
      default: return true;
    }
  }

  checkBrowserMatch(userAgent, preferredBrowser) {
    switch (preferredBrowser) {
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
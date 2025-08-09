// Popup script for User Agent Spoofer (Manifest V3)
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
    this.isInitialized = false;
  }

  async init() {
    try {
      this.setupEventListeners();
      await Promise.all([
        this.loadPreferences(),
        this.loadStatus(),
        this.loadUserAgents()
      ]);
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize popup:', error);
      this.showToast('Failed to initialize extension popup', 'warning');
    }
  }

  showToast(message, type = 'success') {
    try {
      const toast = document.getElementById('toast');
      if (!toast) return;
      
      toast.textContent = message;
      toast.className = `toast ${type} show`;
      
      setTimeout(() => {
        toast.classList.remove('show');
      }, 3000);
    } catch (error) {
      console.error('Failed to show toast:', error);
    }
  }

  setupEventListeners() {
    try {
      // Toggle switch
      this.addEventListenerSafe('enabled', 'change', (e) => {
        this.toggleEnabled(e.target.checked);
      });

      // Quick action buttons
      this.addEventListenerSafe('randomBtn', 'click', () => {
        this.setRandomUserAgent();
      });

      this.addEventListenerSafe('updateBtn', 'click', () => {
        this.refreshUserAgents();
      });

      // Smart Random and Interval
      this.addEventListenerSafe('smartRandomBtn', 'click', () => {
        this.smartRandom();
      });

      this.addEventListenerSafe('enableInterval', 'change', (e) => {
        this.toggleInterval(e.target.checked);
      });

      this.addEventListenerSafe('intervalMinutes', 'input', (e) => {
        this.handleIntervalChange(e);
      });

      // Custom user agent input
      this.addEventListenerSafe('addCustomBtn', 'click', () => {
        this.addCustomUserAgent();
      });

      this.addEventListenerSafe('customUA', 'keypress', (e) => {
        if (e.key === 'Enter') {
          this.addCustomUserAgent();
        }
      });

      // Current UA Apply/Reset Default
      this.addEventListenerSafe('applyUA', 'click', async () => {
        await this.applyCurrentUserAgent();
      });

      this.addEventListenerSafe('resetDefaultUA', 'click', async () => {
        await this.resetToDefaultUserAgent();
      });

      // Advanced Options
      this.setupAdvancedOptions();
    } catch (error) {
      console.error('Failed to setup event listeners:', error);
    }
  }

  addEventListenerSafe(elementId, event, handler) {
    try {
      const element = document.getElementById(elementId);
      if (element) {
        element.addEventListener(event, handler);
      } else {
        console.warn(`Element with id '${elementId}' not found`);
      }
    } catch (error) {
      console.error(`Failed to add event listener for ${elementId}:`, error);
    }
  }

  handleIntervalChange(e) {
    try {
      const val = Utils ? Utils.validateInterval(e.target.value) : (() => {
        let v = parseInt(e.target.value);
        if (isNaN(v) || v < 1) v = 1;
        if (v > 60) v = 60;
        return v;
      })();
      e.target.value = val;
      chrome.storage.local.set({ intervalMinutes: val });
    } catch (error) {
      console.error('Failed to handle interval change:', error);
    }
  }

  async applyCurrentUserAgent() {
    try {
      const ua = document.getElementById('currentUATextarea')?.value?.trim();
      if (!ua) {
        this.showToast('Please enter a user agent', 'warning');
        return;
      }

      await chrome.runtime.sendMessage({ action: 'setUserAgent', userAgent: ua });
      await Promise.all([
        this.loadStatus(),
        this.renderUserAgentList()
      ]);
      this.showToast('User agent applied successfully', 'success');
    } catch (error) {
      console.error('Failed to apply user agent:', error);
      this.showToast('Failed to apply user agent', 'warning');
    }
  }

  async resetToDefaultUserAgent() {
    try {
      await chrome.runtime.sendMessage({ action: 'setUserAgent', userAgent: null });
      await Promise.all([
        this.loadStatus(),
        this.renderUserAgentList()
      ]);
      this.showToast('Reset to default user agent', 'info');
    } catch (error) {
      console.error('Failed to reset user agent:', error);
      this.showToast('Failed to reset user agent', 'warning');
    }
  }

  setupAdvancedOptions() {
    try {
      // Advanced options toggle
      this.addEventListenerSafe('advancedToggle', 'click', () => {
        this.toggleAdvancedOptions();
      });

      // Mode selection
      const modeRadios = document.querySelectorAll('input[name="mode"]');
      modeRadios.forEach(radio => {
        radio.addEventListener('change', async (e) => {
          await this.handleModeChange(e.target.value);
        });
      });

      // Site management
      this.addEventListenerSafe('addSiteBtn', 'click', () => {
        this.showSiteInput();
      });

      this.addEventListenerSafe('confirmSiteBtn', 'click', () => {
        this.addSite();
      });

      this.addEventListenerSafe('cancelSiteBtn', 'click', () => {
        this.hideSiteInput();
      });

      this.addEventListenerSafe('siteInput', 'keypress', (e) => {
        if (e.key === 'Enter') {
          this.addSite();
        }
      });
    } catch (error) {
      console.error('Failed to setup advanced options:', error);
    }
  }

  async handleModeChange(mode) {
    try {
      this.mode = mode;
      await chrome.runtime.sendMessage({ action: 'setMode', mode: this.mode });
      this.updateSiteListVisibility();
      this.updateSiteListTitle();
      this.renderSiteList();
      this.showToast(`Mode changed to ${this.mode}`, 'info');
    } catch (error) {
      console.error('Failed to change mode:', error);
      this.showToast('Failed to change mode', 'warning');
    }
  }

  toggleAdvancedOptions() {
    try {
      const advancedOptions = document.getElementById('advancedOptions');
      const toggleBtn = document.getElementById('advancedToggle');
      
      if (!advancedOptions || !toggleBtn) return;
      
      if (advancedOptions.style.display === 'none') {
        advancedOptions.style.display = 'block';
        toggleBtn.textContent = 'Hide';
      } else {
        advancedOptions.style.display = 'none';
        toggleBtn.textContent = 'Show';
      }
    } catch (error) {
      console.error('Failed to toggle advanced options:', error);
    }
  }

  updateSiteListVisibility() {
    try {
      const siteListSection = document.getElementById('siteListSection');
      if (!siteListSection) return;
      
      if (this.mode === 'all') {
        siteListSection.style.display = 'none';
      } else {
        siteListSection.style.display = 'block';
      }
    } catch (error) {
      console.error('Failed to update site list visibility:', error);
    }
  }

  showSiteInput() {
    try {
      const siteInputGroup = document.getElementById('siteInputGroup');
      const siteInput = document.getElementById('siteInput');
      
      if (siteInputGroup) {
        siteInputGroup.style.display = 'flex';
      }
      if (siteInput) {
        siteInput.focus();
      }
    } catch (error) {
      console.error('Failed to show site input:', error);
    }
  }

  hideSiteInput() {
    try {
      const siteInputGroup = document.getElementById('siteInputGroup');
      const siteInput = document.getElementById('siteInput');
      
      if (siteInputGroup) {
        siteInputGroup.style.display = 'none';
      }
      if (siteInput) {
        siteInput.value = '';
      }
    } catch (error) {
      console.error('Failed to hide site input:', error);
    }
  }

  async addSite() {
    try {
      const siteInput = document.getElementById('siteInput');
      if (!siteInput) return;
      
      const site = siteInput.value.trim();
      if (!site) {
        this.showToast('Please enter a site domain', 'warning');
        return;
      }

      const listType = this.mode === 'whitelist' ? 'whitelist' : 'blacklist';
      
      await chrome.runtime.sendMessage({ 
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
    try {
      const listType = this.mode === 'whitelist' ? 'whitelist' : 'blacklist';
      
      await chrome.runtime.sendMessage({ 
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
    try {
      const title = document.getElementById('siteListTitle');
      if (!title) return;
      
      switch (this.mode) {
        case 'whitelist':
          title.textContent = 'Whitelisted Sites';
          break;
        case 'blacklist':
          title.textContent = 'Blacklisted Sites';
          break;
        default:
          title.textContent = 'Site Lists';
      }
    } catch (error) {
      console.error('Failed to update site list title:', error);
    }
  }

  renderSiteList() {
    try {
      const container = document.getElementById('siteList');
      if (!container) return;
      
      const sites = this.mode === 'whitelist' ? this.whitelist : this.blacklist;
      
      // Clear container
      container.innerHTML = '';
      
      if (this.mode === 'all') {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading';
        loadingDiv.textContent = 'Select blacklist or whitelist mode to manage sites';
        container.appendChild(loadingDiv);
        return;
      }
      
      if (sites.length === 0) {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading';
        loadingDiv.textContent = 'No sites added';
        container.appendChild(loadingDiv);
        return;
      }

      // Create site elements
      sites.forEach(site => {
        const siteItem = this.createSiteElement(site);
        container.appendChild(siteItem);
      });
    } catch (error) {
      console.error('Failed to render site list:', error);
    }
  }

  createSiteElement(site) {
    const siteItem = document.createElement('div');
    siteItem.className = 'site-item';
    siteItem.dataset.site = site;
    
    const siteText = document.createElement('div');
    siteText.className = 'site-text';
    siteText.textContent = site;
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'site-remove-btn';
    removeBtn.textContent = '×';
    removeBtn.dataset.site = site;
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeSite(site);
    });
    
    siteItem.appendChild(siteText);
    siteItem.appendChild(removeBtn);
    
    return siteItem;
  }

  async loadPreferences() {
    try {
      const result = await chrome.storage.local.get([
        'preferredDevice', 
        'preferredBrowser', 
        'preferredSource', 
        'enableInterval', 
        'intervalMinutes'
      ]);
      
      // Update preferences and UI
      if (result.preferredDevice) {
        this.preferences.device = result.preferredDevice;
        this.setRadioValue('preferredDevice', result.preferredDevice);
      }
      
      if (result.preferredBrowser) {
        this.preferences.browser = result.preferredBrowser;
        this.setRadioValue('preferredBrowser', result.preferredBrowser);
      }
      
      if (result.preferredSource) {
        this.preferences.source = result.preferredSource;
        this.setRadioValue('preferredSource', result.preferredSource);
      }
      
      if (result.intervalMinutes) {
        const intervalInput = document.getElementById('intervalMinutes');
        if (intervalInput) {
          intervalInput.value = result.intervalMinutes;
        }
      }
      
      if (result.enableInterval) {
        const enableIntervalCheckbox = document.getElementById('enableInterval');
        if (enableIntervalCheckbox) {
          enableIntervalCheckbox.checked = true;
        }
      }

      // Setup preference change listeners
      this.setupPreferenceListeners();
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  }

  setRadioValue(name, value) {
    try {
      const radio = document.querySelector(`input[name="${name}"][value="${value}"]`);
      if (radio) {
        radio.checked = true;
      }
    } catch (error) {
      console.error(`Failed to set radio value for ${name}:`, error);
    }
  }

  setupPreferenceListeners() {
    try {
      // Device preference
      document.querySelectorAll('input[name="preferredDevice"]').forEach(radio => {
        radio.addEventListener('change', async (e) => {
          this.preferences.device = e.target.value;
          await chrome.storage.local.set({ preferredDevice: e.target.value });
          await this.renderUserAgentList();
        });
      });

      // Browser preference
      document.querySelectorAll('input[name="preferredBrowser"]').forEach(radio => {
        radio.addEventListener('change', async (e) => {
          this.preferences.browser = e.target.value;
          await chrome.storage.local.set({ preferredBrowser: e.target.value });
          await this.renderUserAgentList();
        });
      });

      // Source preference
      document.querySelectorAll('input[name="preferredSource"]').forEach(radio => {
        radio.addEventListener('change', async (e) => {
          this.preferences.source = e.target.value;
          await chrome.storage.local.set({ preferredSource: e.target.value });
          await this.renderUserAgentList();
        });
      });
    } catch (error) {
      console.error('Failed to setup preference listeners:', error);
    }
  }

  async loadStatus() {
    try {
      const status = await chrome.runtime.sendMessage({ action: 'getStatus' });
      if (status && !status.error) {
        this.updateUI(status);
        this.mode = status.mode || 'all';
        this.whitelist = status.whitelist || [];
        this.blacklist = status.blacklist || [];
        this.updateSiteListVisibility();
        this.updateSiteListTitle();
        this.renderSiteList();
      }
    } catch (error) {
      console.error('Failed to load status:', error);
      this.showToast('Failed to load extension status', 'warning');
    }
  }

  async loadUserAgents() {
    try {
      const status = await chrome.runtime.sendMessage({ action: 'getStatus' });
      if (status && !status.error) {
        this.userAgents = status.userAgents || [];
        this.customUserAgents = status.customUserAgents || [];
        await this.renderUserAgentList();
        this.renderCustomUserAgentList();
      }
    } catch (error) {
      console.error('Failed to load user agents:', error);
      this.showToast('Failed to load user agents', 'warning');
    }
  }

  updateUI(status) {
    try {
      // Update toggle
      const enabledToggle = document.getElementById('enabled');
      if (enabledToggle) {
        enabledToggle.checked = status.isEnabled;
      }

      // Update current user agent textarea
      const currentUATextarea = document.getElementById('currentUATextarea');
      if (currentUATextarea) {
        if (status.currentUserAgent) {
          currentUATextarea.value = status.currentUserAgent;
        } else {
          currentUATextarea.value = '';
          currentUATextarea.placeholder = 'No user agent selected';
        }
      }

      // Update mode selection
      if (status.mode) {
        this.setRadioValue('mode', status.mode);
      }
    } catch (error) {
      console.error('Failed to update UI:', error);
    }
  }

  async toggleEnabled(enabled) {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'toggleEnabled' });
      if (response && !response.error) {
        this.updateUI({ isEnabled: response.enabled });
        this.showToast(response.enabled ? 'Extension enabled' : 'Extension disabled', 'info');
      }
    } catch (error) {
      console.error('Failed to toggle enabled:', error);
      this.showToast('Failed to toggle extension', 'warning');
    }
  }

  async setRandomUserAgent() {
    try {
      // First check if extension is enabled, if not enable it
      const status = await chrome.runtime.sendMessage({ action: 'getStatus' });
      if (status && !status.isEnabled) {
        await chrome.runtime.sendMessage({ action: 'toggleEnabled' });
        this.showToast('Extension enabled', 'info');
      }

      const response = await chrome.runtime.sendMessage({ action: 'getRandomUserAgent' });
      if (response && response.userAgent) {
        await chrome.runtime.sendMessage({ 
          action: 'setUserAgent', 
          userAgent: response.userAgent 
        });
        await this.loadStatus();
        await this.renderUserAgentList(response.userAgent);
        this.showToast('Random user agent applied', 'success');
      } else {
        this.showToast('No user agents available', 'warning');
      }
    } catch (error) {
      console.error('Failed to set random user agent:', error);
      this.showToast('Failed to get random user agent', 'warning');
    }
  }

  async refreshUserAgents() {
    try {
      this.showToast('Updating user agents...', 'info');
      await chrome.runtime.sendMessage({ action: 'refreshUserAgents' });
      await this.loadUserAgents();
      this.showToast('User agents updated successfully', 'success');
    } catch (error) {
      console.error('Failed to refresh user agents:', error);
      this.showToast('Failed to update user agents', 'warning');
    }
  }

  async addCustomUserAgent() {
    try {
      const input = document.getElementById('customUA');
      if (!input) return;
      
      const userAgent = input.value.trim();
      if (!userAgent) {
        this.showToast('Please enter a user agent', 'warning');
        return;
      }

      await chrome.runtime.sendMessage({ 
        action: 'addCustomUserAgent', 
        userAgent: userAgent
      });
      
      input.value = '';
      await this.loadUserAgents();
      this.showToast('Custom user agent added', 'success');
    } catch (error) {
      console.error('Failed to add custom user agent:', error);
      if (error.message && error.message.includes('already exists')) {
        this.showToast('User agent already exists', 'warning');
      } else {
        this.showToast('Failed to add custom user agent', 'warning');
      }
    }
  }

  renderCustomUserAgentList() {
    try {
      const container = document.getElementById('customUAList');
      if (!container) return;
      
      container.innerHTML = '';
      
      if (this.customUserAgents.length === 0) {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading';
        loadingDiv.textContent = 'No custom user agents';
        container.appendChild(loadingDiv);
        return;
      }

      this.customUserAgents.forEach(ua => {
        const item = this.createUserAgentElement(ua.ua, true);
        container.appendChild(item);
      });
    } catch (error) {
      console.error('Failed to render custom user agent list:', error);
    }
  }

  async removeCustomUserAgent(userAgent) {
    try {
      await chrome.runtime.sendMessage({ 
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

  async renderUserAgentList(currentUserAgent = null) {
    try {
      const container = document.getElementById('uaList');
      const countContainer = document.getElementById('uaCount');
      
      if (!container || !countContainer) return;
      
      // Get filtered user agents from background script
      const response = await chrome.runtime.sendMessage({
        action: 'getFilteredUserAgents',
        device: this.preferences.device,
        browser: this.preferences.browser,
        source: this.preferences.source
      });
      
      if (!response || response.error) {
        container.innerHTML = '<div class="loading">Failed to load user agents</div>';
        return;
      }
      
      const filteredAgents = response.userAgents || [];

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
      let currentUA = currentUserAgent;
      if (!currentUA) {
        const status = await chrome.runtime.sendMessage({ action: 'getStatus' });
        currentUA = status?.currentUserAgent;
      }
      
      this.renderUserAgentItems(container, filteredAgents, currentUA);
    } catch (error) {
      console.error('Failed to render user agent list:', error);
      const container = document.getElementById('uaList');
      if (container) {
        container.innerHTML = '<div class="loading">Error loading user agents</div>';
      }
    }
  }

  renderUserAgentItems(container, filteredAgents, currentUA) {
    try {
      container.innerHTML = '';
      
      filteredAgents.forEach(ua => {
        const isSelected = ua.ua === currentUA;
        const isCustom = this.customUserAgents.some(custom => custom.ua === ua.ua);
        
        const item = this.createUserAgentElement(ua.ua, isCustom, isSelected);
        container.appendChild(item);
      });
    } catch (error) {
      console.error('Failed to render user agent items:', error);
    }
  }

  createUserAgentElement(userAgent, isCustom = false, isSelected = false) {
    const item = document.createElement('div');
    item.className = 'user-agent-item';
    if (isSelected) {
      item.classList.add('selected');
    }
    item.dataset.ua = userAgent;
    
    const text = document.createElement('div');
    text.className = 'user-agent-text';
    text.textContent = userAgent;
    
    item.appendChild(text);
    
    if (isCustom) {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn';
      removeBtn.textContent = '×';
      removeBtn.dataset.ua = userAgent;
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeCustomUserAgent(userAgent);
      });
      item.appendChild(removeBtn);
    }
    
    // Add click listener for selection
    item.addEventListener('click', () => {
      this.selectUserAgent(userAgent);
    });
    
    return item;
  }

  async selectUserAgent(userAgent) {
    try {
      await chrome.runtime.sendMessage({ 
        action: 'setUserAgent', 
        userAgent: userAgent 
      });
      await this.loadStatus();
      await this.renderUserAgentList();
      this.showToast('User agent selected and applied', 'success');
    } catch (error) {
      console.error('Failed to select user agent:', error);
      this.showToast('Failed to select user agent', 'warning');
    }
  }

  async smartRandom() {
    try {
      // First check if extension is enabled, if not enable it
      const status = await chrome.runtime.sendMessage({ action: 'getStatus' });
      if (status && !status.isEnabled) {
        await chrome.runtime.sendMessage({ action: 'toggleEnabled' });
        this.showToast('Extension enabled', 'info');
      }

      const response = await chrome.runtime.sendMessage({ 
        action: 'getSmartRandomUserAgent', 
        device: this.preferences.device,
        browser: this.preferences.browser,
        source: this.preferences.source
      });
      
      if (response && response.userAgent) {
        await chrome.runtime.sendMessage({ 
          action: 'setUserAgent', 
          userAgent: response.userAgent 
        });
        await this.loadStatus();
        await this.renderUserAgentList(response.userAgent);
        this.showToast('Smart random user agent applied', 'success');
      } else {
        this.showToast('No matching user agents found', 'warning');
      }
    } catch (error) {
      console.error('Failed to get smart random user agent:', error);
      this.showToast('Failed to get smart random user agent', 'warning');
    }
  }

  toggleInterval(enabled) {
    try {
      chrome.storage.local.set({ enableInterval: enabled });
    } catch (error) {
      console.error('Failed to toggle interval:', error);
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  try {
    new PopupUI().init();
  } catch (error) {
    console.error('Failed to initialize popup UI:', error);
  }
});
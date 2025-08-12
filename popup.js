// Popup script for User Agent Spoofer
class PopupUI {
  constructor() {
    this.userAgents = [];
    this.customUserAgents = [];
    this.preferences = {
      device: ['all'],
      browser: ['all'],
      source: ['all']
    };
    this.mode = 'all';
    this.whitelist = [];
    this.blacklist = [];
    this.updateTimeout = null;
    this.isUpdatingPreferences = false;
    
    // Performance optimizations
    this.cachedFilterCount = null;
    this.lastPreferencesHash = null;
    
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
    
    // Single, efficient initialization with DOM ready check
    this.waitForDOMReady().then(async () => {
      this.setupCheckboxEventListeners();
      await this.updateAllUIComponents();
    });
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
      let val = parseInt(e.target.value);
      if (isNaN(val) || val < 1) val = 1;
      if (val > 60) val = 60;
      e.target.value = val;
      browser.storage.local.set({ intervalMinutes: val });
      // Background script will handle the timer restart
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
        await this.renderUserAgentList();
        this.showToast('User agent applied successfully', 'success');
      } else {
        this.showToast('Please enter a user agent', 'warning');
      }
    });
    document.getElementById('resetDefaultUA').addEventListener('click', async () => {
      await browser.runtime.sendMessage({ action: 'setUserAgent', userAgent: null });
      await this.loadStatus();
      await this.renderUserAgentList();
      this.showToast('Reset to default user agent', 'info');
    });

    // Advanced Options
    this.setupAdvancedOptions();
  }

  setupCheckboxEventListeners() {
    try {
      // Add change listeners for checkboxes
      const deviceCheckboxes = document.querySelectorAll('input[name="preferredDevice"]');
      if (deviceCheckboxes.length === 0) {
        console.error('No device checkboxes found!');
        return;
      }
      deviceCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', async (e) => {
          try {
            this.debouncedUpdatePreferences('device');
            await this.renderUserAgentList();
          } catch (error) {
            console.error('Error handling device checkbox change:', error);
          }
        });
      });

      const browserCheckboxes = document.querySelectorAll('input[name="preferredBrowser"]');
      if (browserCheckboxes.length === 0) {
        console.error('No browser checkboxes found!');
        return;
      }
      browserCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', async (e) => {
          try {
            this.debouncedUpdatePreferences('browser');
            await this.renderUserAgentList();
          } catch (error) {
            console.error('Error handling browser checkbox change:', error);
          }
        });
      });

      const sourceCheckboxes = document.querySelectorAll('input[name="preferredSource"]');
      if (sourceCheckboxes.length === 0) {
        console.error('No source checkboxes found!');
        return;
      }
      sourceCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', async (e) => {
          try {
            this.debouncedUpdatePreferences('source');
            await this.renderUserAgentList();
          } catch (error) {
            console.error('Error handling source checkbox change:', error);
          }
        });
      });
    } catch (error) {
      console.error('Error setting up checkbox event listeners:', error);
    }
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
      container.textContent = '';
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'loading';
      loadingDiv.textContent = 'Select blacklist or whitelist mode to manage sites';
      container.appendChild(loadingDiv);
      return;
    }
    
    if (sites.length === 0) {
      container.textContent = '';
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'loading';
      loadingDiv.textContent = 'No sites added';
      container.appendChild(loadingDiv);
      return;
    }

    // Clear container safely
    container.textContent = '';
    
    // Create elements safely
    sites.forEach(site => {
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
      
      siteItem.appendChild(siteText);
      siteItem.appendChild(removeBtn);
      container.appendChild(siteItem);
    });

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
      
      // Load device preferences
      if (result.preferredDevice) {
        this.preferences.device = Array.isArray(result.preferredDevice) ? result.preferredDevice : [result.preferredDevice];
      }
      
      // Load browser preferences
      if (result.preferredBrowser) {
        this.preferences.browser = Array.isArray(result.preferredBrowser) ? result.preferredBrowser : [result.preferredBrowser];
      }
      
      // Load source preferences
      if (result.preferredSource) {
        this.preferences.source = Array.isArray(result.preferredSource) ? result.preferredSource : [result.preferredSource];
      }
      
      if (result.intervalMinutes) {
        document.getElementById('intervalMinutes').value = result.intervalMinutes;
      }
      if (result.enableInterval) {
        document.getElementById('enableInterval').checked = true;
      }

      // Update checkbox states
      this.updateCheckboxStates();

      // Save intervalMinutes on input
      document.getElementById('intervalMinutes').addEventListener('input', (e) => {
        let val = parseInt(e.target.value);
        if (isNaN(val) || val < 1) val = 1;
        if (val > 60) val = 60;
        e.target.value = val;
        browser.storage.local.set({ intervalMinutes: val });
        // Background script will handle the timer restart
      });
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  }

  updateCheckboxStates() {
    // Update device checkboxes
    document.querySelectorAll('input[name="preferredDevice"]').forEach(checkbox => {
      checkbox.checked = this.preferences.device.includes(checkbox.value);
    });

    // Update browser checkboxes
    document.querySelectorAll('input[name="preferredBrowser"]').forEach(checkbox => {
      checkbox.checked = this.preferences.browser.includes(checkbox.value);
    });

    // Update source checkboxes
    document.querySelectorAll('input[name="preferredSource"]').forEach(checkbox => {
      checkbox.checked = this.preferences.source.includes(checkbox.value);
    });
  }

  async updatePreferencesFromCheckboxes(preferenceType) {
    // Prevent recursive calls
    if (this.isUpdatingPreferences) {
      return;
    }
    
    try {
      this.isUpdatingPreferences = true;
      
      const checkboxes = document.querySelectorAll(`input[name="preferred${preferenceType.charAt(0).toUpperCase() + preferenceType.slice(1)}"]`);
      
      // Get current checkbox states
      const selectedValues = [];
      let hasAllOption = false;
      
      checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
          if (checkbox.value === 'all') {
            hasAllOption = true;
          }
          selectedValues.push(checkbox.value);
        }
      });

      console.log('Processing preferences for:', preferenceType, 'Selected values:', selectedValues, 'Has all:', hasAllOption);

      // Determine what the user wants based on the current state
      let finalSelectedValues = [];
      
      // Check if this is a fresh "All" selection (user just clicked "All")
      const allCheckbox = document.querySelector(`input[name="preferred${preferenceType.charAt(0).toUpperCase() + preferenceType.slice(1)}"][value="all"]`);
      const wasAllPreviouslySelected = this.preferences[preferenceType].includes('all');
      
      if (hasAllOption && selectedValues.length === 1) {
        // User clicked "All" and only "All" is selected - this is what we want
        finalSelectedValues = ['all'];
        console.log('Only all is selected, keeping it');
      } else if (hasAllOption && selectedValues.length > 1 && !wasAllPreviouslySelected) {
        // User just clicked "All" while having other options - they want "All" now
        finalSelectedValues = ['all'];
        console.log('User clicked All while having other options, switching to All');
      } else if (hasAllOption && selectedValues.length > 1 && wasAllPreviouslySelected) {
        // User has "All" + other options and "All" was previously selected - they want individual selections
        finalSelectedValues = selectedValues.filter(val => val !== 'all');
        console.log('All was selected with others, now keeping individual selections:', finalSelectedValues);
      } else if (!hasAllOption && selectedValues.length > 0) {
        // User has only individual options selected
        finalSelectedValues = selectedValues;
        console.log('Individual options selected:', finalSelectedValues);
      } else {
        // Nothing selected - default to "All"
        finalSelectedValues = ['all'];
        console.log('No options selected, defaulting to all');
      }

      // Update preferences
      this.preferences[preferenceType] = finalSelectedValues;
      
      // Invalidate cache since preferences changed
      this.cachedFilterCount = null;
      this.lastPreferencesHash = null;
      
      // Update checkbox states to match the final selection
      this.updateCheckboxStates();
      
      // Save to storage
      const storageKey = `preferred${preferenceType.charAt(0).toUpperCase() + preferenceType.slice(1)}`;
      try {
        await browser.storage.local.set({ [storageKey]: finalSelectedValues });
        
        // Ensure all UI components are updated consistently
        await this.updateAllUIComponents();
      } catch (error) {
        console.error('Error saving to storage:', error);
      }
    } catch (error) {
      console.error('Error in updatePreferencesFromCheckboxes:', error);
    } finally {
      this.isUpdatingPreferences = false;
    }
  }

  debouncedUpdatePreferences(preferenceType) {
    // Clear any existing timeout
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    
    // Set a new timeout to update preferences after a short delay
    this.updateTimeout = setTimeout(() => {
      this.updatePreferencesFromCheckboxes(preferenceType);
    }, 150); // Increased slightly for better performance
  }

  async updateAllUIComponents() {
    try {
      // Only log in development mode
      if (this.isDevelopmentMode()) {
        console.log('Updating all UI components...');
        console.log('Current preferences:', this.preferences);
      }
      
      // Update the user agent list with current preferences
      await this.renderUserAgentList();
      
      // Update the filter count display
      this.updateFilterCount();
      
      // Update any other UI elements that depend on preferences
      this.updatePreferenceDependentUI();
      
      if (this.isDevelopmentMode()) {
        console.log('UI components updated successfully');
      }
    } catch (error) {
      console.error('Error updating UI components:', error);
    }
  }

  updateFilterCount() {
    try {
      if (this.isDevelopmentMode()) {
        console.log('Updating filter count...');
      }
      
      const countContainer = document.getElementById('uaCount');
      if (!countContainer) {
        if (this.isDevelopmentMode()) {
          console.log('Count container not found');
        }
        return;
      }

      // Get the current filtered count based on preferences
      const filteredCount = this.getFilteredUserAgentCount();
      const globalCount = this.userAgents.length;
      
      if (this.isDevelopmentMode()) {
        console.log('Filtered count:', filteredCount, 'Global count:', globalCount);
      }

      // Clear and create count elements safely
      countContainer.textContent = '';
      const filteredSpan = document.createElement('span');
      filteredSpan.textContent = `Filtered: ${filteredCount} user agents`;
      const globalSpan = document.createElement('span');
      globalSpan.className = 'global-count';
      globalSpan.textContent = `Global: ${globalCount} user agents`;
      countContainer.appendChild(filteredSpan);
      countContainer.appendChild(globalSpan);
      
      if (this.isDevelopmentMode()) {
        console.log('Filter count updated successfully');
      }
    } catch (error) {
      console.error('Error updating filter count:', error);
    }
  }

    getFilteredUserAgentCount() {
    try {
      // Check cache first
      const currentHash = this.getPreferencesHash();
      if (this.cachedFilterCount !== null && this.lastPreferencesHash === currentHash) {
        return this.cachedFilterCount;
      }
      
      if (this.isDevelopmentMode()) {
        console.log('Getting filtered user agent count...');
        console.log('User agents loaded:', this.userAgents.length);
        console.log('Preferences:', this.preferences);
      }
      
      // Early return if no user agents loaded
      if (!this.userAgents.length) return 0;
      
      // Early return if all preferences are 'all'
      if (this.preferences.device.includes('all') && 
          this.preferences.browser.includes('all') && 
          this.preferences.source.includes('all')) {
        this.cachedFilterCount = this.userAgents.length;
        this.lastPreferencesHash = currentHash;
        return this.cachedFilterCount;
      }
      
      // Use the same filtering logic as the background script
      const filteredAgents = this.userAgents.filter(ua => {
        const uaLower = ua.ua.toLowerCase();
        
        // Filter by source
        let sourceMatch = true;
        if (this.preferences.source && this.preferences.source.length > 0) {
          if (this.preferences.source.includes('all')) {
            sourceMatch = true;
          } else {
            sourceMatch = this.preferences.source.includes(ua.source);
          }
        }
        if (!sourceMatch) return false;
        
        // Filter by device
        let deviceMatch = true;
        if (this.preferences.device && this.preferences.device.length > 0) {
          if (this.preferences.device.includes('all')) {
            deviceMatch = true;
          } else {
            deviceMatch = this.preferences.device.some(d => this.checkDeviceMatch(uaLower, d));
          }
        }
        if (!deviceMatch) return false;
        
        // Filter by browser
        let browserMatch = true;
        if (this.preferences.browser && this.preferences.browser.length > 0) {
          if (this.preferences.browser.includes('all')) {
            browserMatch = true;
          } else {
            browserMatch = this.preferences.browser.some(b => this.checkBrowserMatch(uaLower, b));
          }
        }
        
        return deviceMatch && browserMatch;
      });
      
      // Cache the result
      this.cachedFilterCount = filteredAgents.length;
      this.lastPreferencesHash = currentHash;
      
      if (this.isDevelopmentMode()) {
        console.log('Filtered agents count:', filteredAgents.length);
      }
      return this.cachedFilterCount;
    } catch (error) {
      console.error('Error getting filtered user agent count:', error);
      return 0;
    }
  }

  checkDeviceMatch(userAgent, device) {
    switch (device) {
      case 'android': return userAgent.includes('android');
      case 'iphone': return userAgent.includes('iphone');
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
        return userAgent.includes('chrome') &&
          !userAgent.includes('edg') &&
          !userAgent.includes('edge') &&
          !userAgent.includes('opr') &&
          !userAgent.includes('opera') &&
          !userAgent.includes('vivaldi');
      case 'edge':
        return userAgent.includes('edg/') || userAgent.includes('edge/');
      case 'opera':
        return userAgent.includes('opr/') || userAgent.includes('opera');
      case 'vivaldi':
        return userAgent.includes('vivaldi');
      case 'firefox':
        return userAgent.includes('firefox') && !userAgent.includes('seamonkey');
      case 'safari':
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

  updatePreferenceDependentUI() {
    // Update any other UI elements that depend on preferences
    // This can be expanded as needed
  }

  waitForDOMReady() {
    return new Promise((resolve) => {
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        resolve();
      } else {
        document.addEventListener('DOMContentLoaded', resolve, { once: true });
      }
    });
  }

  isDevelopmentMode() {
    // Check if we're in development mode (you can toggle this)
    return false; // Set to true for debugging, false for production
  }

  getPreferencesHash() {
    // Create a simple hash of preferences for caching
    return JSON.stringify(this.preferences);
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
      await this.renderUserAgentList();
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
      // First check if extension is enabled, if not enable it
      const status = await browser.runtime.sendMessage({ action: 'getStatus' });
      if (!status.isEnabled) {
        await browser.runtime.sendMessage({ action: 'toggleEnabled' });
        this.showToast('Extension enabled', 'info');
      }

      const response = await browser.runtime.sendMessage({ 
        action: 'getRandomUserAgent'
      });
      if (response.userAgent) {
        await browser.runtime.sendMessage({ 
          action: 'setUserAgent', 
          userAgent: response.userAgent 
        });
        await this.loadStatus();
        // Pass the selected user agent directly to ensure proper highlighting
        this.renderUserAgentList(response.userAgent);
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
      container.textContent = '';
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'loading';
      loadingDiv.textContent = 'No custom user agents';
      container.appendChild(loadingDiv);
      return;
    }

    // Clear container safely
    container.textContent = '';
    
    // Create elements safely
    this.customUserAgents.forEach(ua => {
      const item = document.createElement('div');
      item.className = 'user-agent-item';
      item.dataset.ua = ua.ua;
      
      const text = document.createElement('div');
      text.className = 'user-agent-text';
      text.textContent = ua.ua;
      
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn';
      removeBtn.textContent = '×';
      removeBtn.dataset.ua = ua.ua;
      
      item.appendChild(text);
      item.appendChild(removeBtn);
      container.appendChild(item);
    });

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

  async renderUserAgentList(currentUserAgent = null) {
    const container = document.getElementById('uaList');
    
    // Get filtered user agents from background script (same logic as smart random)
    const response = await browser.runtime.sendMessage({
      action: 'getFilteredUserAgents',
      device: this.preferences.device,
      browser: this.preferences.browser,
      source: this.preferences.source
    });
    
    const filteredAgents = response.userAgents || [];

    if (filteredAgents.length === 0) {
      container.textContent = '';
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'loading';
      loadingDiv.textContent = 'No user agents match your preferences';
      container.appendChild(loadingDiv);
      return;
    }

    // If currentUserAgent is provided, use it directly, otherwise get from status
    if (currentUserAgent) {
      this.renderUserAgentItems(container, filteredAgents, currentUserAgent);
    } else {
      // Get current user agent for highlighting
      const status = await browser.runtime.sendMessage({ action: 'getStatus' });
      const currentUA = status.currentUserAgent;
      this.renderUserAgentItems(container, filteredAgents, currentUA);
    }
  }

  renderUserAgentItems(container, filteredAgents, currentUA) {
    // Clear container safely
    container.textContent = '';
    
    // Create elements safely
    filteredAgents.forEach(ua => {
      const isSelected = ua.ua === currentUA;
      const isCustom = this.customUserAgents.some(custom => custom.ua === ua.ua);
      
      const item = document.createElement('div');
      item.className = 'user-agent-item';
      if (isSelected) {
        item.classList.add('selected');
      }
      item.dataset.ua = ua.ua;
      
      const text = document.createElement('div');
      text.className = 'user-agent-text';
      text.textContent = ua.ua;
      
      item.appendChild(text);
      
      if (isCustom) {
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = '×';
        removeBtn.dataset.ua = ua.ua;
        item.appendChild(removeBtn);
      }
      
      container.appendChild(item);
    });

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
  }

  async selectUserAgent(userAgent) {
    try {
      await browser.runtime.sendMessage({ 
        action: 'setUserAgent', 
        userAgent: userAgent 
      });
      await this.loadStatus();
      await this.renderUserAgentList();
      this.showToast('User agent selected and applied', 'success');
    } catch (error) {
      console.error('Failed to select user agent:', error);
    }
  }

  async smartRandom() {
    try {
      // First check if extension is enabled, if not enable it
      const status = await browser.runtime.sendMessage({ action: 'getStatus' });
      if (!status.isEnabled) {
        await browser.runtime.sendMessage({ action: 'toggleEnabled' });
        this.showToast('Extension enabled', 'info');
      }

      const response = await browser.runtime.sendMessage({ 
        action: 'getSmartRandomUserAgent', 
        device: this.preferences.device,
        browser: this.preferences.browser,
        source: this.preferences.source
      });
      if (response.userAgent) {
        await browser.runtime.sendMessage({ 
          action: 'setUserAgent', 
          userAgent: response.userAgent 
        });
        await this.loadStatus();
        // Pass the selected user agent directly to ensure proper highlighting
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
    browser.storage.local.set({ enableInterval: enabled });
    // Background script will handle the timer management
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  new PopupUI();
}); 
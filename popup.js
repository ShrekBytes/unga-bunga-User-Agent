// Popup script for User Agent Spoofer
class PopupUI {
  constructor() {
    this.userAgents = [];
    this.customUserAgents = [];
    this.favoriteUserAgents = [];
    this.currentTab = 'filtered';
    this.randomSource = 'filtered';
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
    this.setupTabListeners();
    this.setupDropdownListeners();
    await this.loadPreferences();
    await this.loadStatus();
    await this.loadUserAgents();
    
    // Single, efficient initialization with DOM ready check
    this.waitForDOMReady().then(async () => {
      this.setupCheckboxEventListeners();
      await this.updateAllUIComponents();
      // Set initial tab
      this.setTab(this.currentTab);
      // Initialize dropdown button labels
      this.updateRandomSourceButtonText(this.randomSource);
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

    // Interval settings
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
        // Apply the user agent
        await browser.runtime.sendMessage({ action: 'setUserAgent', userAgent: ua });
        
        // Enable the extension if it's not already enabled
        const status = await browser.runtime.sendMessage({ action: 'getStatus' });
        if (!status.isEnabled) {
          await browser.runtime.sendMessage({ action: 'toggleEnabled' });
        }
        
        await this.loadStatus();
        await this.renderUserAgentList();
        this.showToast('User agent applied', 'success');
      } else {
        this.showToast('Please enter a user agent', 'warning');
      }
    });
    document.getElementById('resetDefaultUA').addEventListener('click', async () => {
      // Reset UA to null/default
      await browser.runtime.sendMessage({ action: 'setUserAgent', userAgent: null });
      
      // Disable the extension
      const status = await browser.runtime.sendMessage({ action: 'getStatus' });
      if (status.isEnabled) {
        await browser.runtime.sendMessage({ action: 'toggleEnabled' });
      }
      
      await this.loadStatus();
      await this.renderUserAgentList();
      this.showToast('Reset to default and extension disabled', 'info');
    });

    // Advanced Options
    this.setupAdvancedOptions();
  }

  setupTabListeners() {
    document.querySelectorAll('.ua-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.setTab(tab.dataset.tab);
      });
    });
  }

  setupDropdownListeners() {
    // Random source dropdown
    const randomSourceBtn = document.getElementById('randomSourceBtn');
    const randomSourceMenu = document.getElementById('randomSourceMenu');
    
    randomSourceBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      randomSourceMenu.classList.toggle('show');
      randomSourceBtn.classList.toggle('open');
      // Update selected state when opening
      this.updateDropdownSelection('randomSourceMenu', this.randomSource);
    });
    
    randomSourceMenu.querySelectorAll('.dropdown-item').forEach(item => {
      item.addEventListener('click', async (e) => {
        e.stopPropagation();
        this.randomSource = item.dataset.source;
        await browser.storage.local.set({ randomSource: this.randomSource });
        this.updateDropdownSelection('randomSourceMenu', this.randomSource);
        randomSourceMenu.classList.remove('show');
        randomSourceBtn.classList.remove('open');
      });
    });
    
    // Randomize button
    document.getElementById('randomizeBtn').addEventListener('click', async () => {
      await this.randomizeFromSource();
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
      document.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.remove('show'));
      document.querySelectorAll('.dropdown-btn').forEach(btn => btn.classList.remove('open'));
    });
  }

  updateDropdownSelection(menuId, selectedSource) {
    const menu = document.getElementById(menuId);
    menu.querySelectorAll('.dropdown-item').forEach(item => {
      if (item.dataset.source === selectedSource) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });
    
    // Update button text based on selection
    if (menuId === 'randomSourceMenu') {
      this.updateRandomSourceButtonText(selectedSource);
    }
  }

  updateRandomSourceButtonText(source) {
    const btn = document.getElementById('randomSourceBtn');
    const sourceLabels = {
      'filtered': 'Filtered',
      'favorites': 'Favorites',
      'all': 'All'
    };
    const label = sourceLabels[source] || 'Filtered';
    // Clear and rebuild button content safely
    btn.textContent = label + ' ';
    const arrow = document.createElement('span');
    arrow.className = 'dropdown-arrow';
    arrow.textContent = '▼';
    btn.appendChild(arrow);
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
      const result = await browser.storage.local.get([
        'preferredDevice', 'preferredBrowser', 'preferredSource', 
        'enableInterval', 'intervalMinutes',
        'favoriteUserAgents', 'currentTab', 'randomSource'
      ]);
      
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
      
      // Load favorites
      if (result.favoriteUserAgents) {
        this.favoriteUserAgents = result.favoriteUserAgents;
      }
      
      // Load tab state
      if (result.currentTab) {
        this.currentTab = result.currentTab;
      }
      
      // Load Random source
      if (result.randomSource) {
        this.randomSource = result.randomSource;
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

      // Determine what the user wants based on the current state
      let finalSelectedValues = [];
      
      // Check if this is a fresh "All" selection (user just clicked "All")
      const allCheckbox = document.querySelector(`input[name="preferred${preferenceType.charAt(0).toUpperCase() + preferenceType.slice(1)}"][value="all"]`);
      const wasAllPreviouslySelected = this.preferences[preferenceType].includes('all');
      
      if (hasAllOption && selectedValues.length === 1) {
        // User clicked "All" and only "All" is selected - this is what we want
        finalSelectedValues = ['all'];
      } else if (hasAllOption && selectedValues.length > 1 && !wasAllPreviouslySelected) {
        // User just clicked "All" while having other options - they want "All" now
        finalSelectedValues = ['all'];
      } else if (hasAllOption && selectedValues.length > 1 && wasAllPreviouslySelected) {
        // User has "All" + other options and "All" was previously selected - they want individual selections
        finalSelectedValues = selectedValues.filter(val => val !== 'all');
      } else if (!hasAllOption && selectedValues.length > 0) {
        // User has only individual options selected
        finalSelectedValues = selectedValues;
      } else {
        // Nothing selected - default to "All"
        finalSelectedValues = ['all'];
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
      // Update the user agent list with current preferences
      await this.renderUserAgentList();
      
      // Update the filter count display
      this.updateFilterCount();
      
      // Update any other UI elements that depend on preferences
      this.updatePreferenceDependentUI();
    } catch (error) {
      console.error('Error updating UI components:', error);
    }
  }

  updateFilterCount() {
    try {
      const countContainer = document.getElementById('uaCount');
      if (!countContainer) {
        return;
      }

      // Get the current filtered count based on preferences
      const filteredCount = this.getFilteredUserAgentCount();
      const globalCount = this.userAgents.length;

      // Clear and create count elements safely
      countContainer.textContent = '';
      const filteredSpan = document.createElement('span');
      filteredSpan.textContent = `Filtered: ${filteredCount} user agents`;
      const globalSpan = document.createElement('span');
      globalSpan.className = 'global-count';
      globalSpan.textContent = `Global: ${globalCount} user agents`;
      countContainer.appendChild(filteredSpan);
      countContainer.appendChild(globalSpan);
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
      // Show the selected/spoofed user agent
      currentUATextarea.value = status.currentUserAgent;
    } else {
      // Show the browser's real/default user agent when nothing is selected
      currentUATextarea.value = navigator.userAgent;
      currentUATextarea.placeholder = 'Browser default user agent';
    }

    // Update visual state of textarea based on enabled status and UA selection
    if (status.isEnabled && status.currentUserAgent) {
      // Extension is ON and UA is selected - show active state
      currentUATextarea.classList.remove('inactive');
      currentUATextarea.classList.add('active');
    } else {
      // Extension is OFF or no UA selected - show inactive state
      currentUATextarea.classList.remove('active');
      currentUATextarea.classList.add('inactive');
    }

    // Update mode selection
    if (status.mode) {
      document.querySelector(`input[name="mode"][value="${status.mode}"]`).checked = true;
    }
  }

  async toggleEnabled(enabled) {
    try {
      const response = await browser.runtime.sendMessage({ action: 'toggleEnabled' });
      // Reload full status to ensure UI is properly updated with active/inactive state
      await this.loadStatus();
      this.showToast(response.enabled ? 'Extension enabled' : 'Extension disabled', 'info');
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
    const countElement = document.getElementById('uaCount');
    
    let agentsToDisplay = [];
    
    if (this.currentTab === 'favorites') {
      // Show only favorites
      agentsToDisplay = this.userAgents.filter(ua => this.favoriteUserAgents.includes(ua.ua));
      countElement.textContent = '';
      const span = document.createElement('span');
      span.textContent = `Favorites: ${agentsToDisplay.length} user agents`;
      countElement.appendChild(span);
    } else if (this.currentTab === 'all') {
      // Show all user agents
      agentsToDisplay = this.userAgents;
      countElement.textContent = '';
      const span = document.createElement('span');
      span.textContent = `All: ${agentsToDisplay.length} user agents`;
      countElement.appendChild(span);
    } else {
      // Show filtered user agents
      const response = await browser.runtime.sendMessage({
        action: 'getFilteredUserAgents',
        device: this.preferences.device,
        browser: this.preferences.browser,
        source: this.preferences.source
      });
      agentsToDisplay = response.userAgents || [];
      countElement.textContent = '';
      const span1 = document.createElement('span');
      span1.textContent = `Filtered: ${agentsToDisplay.length} user agents`;
      const span2 = document.createElement('span');
      span2.className = 'global-count';
      span2.textContent = `Global: ${this.userAgents.length} user agents`;
      countElement.appendChild(span1);
      countElement.appendChild(span2);
    }

    if (agentsToDisplay.length === 0) {
      container.textContent = '';
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'loading';
      loadingDiv.textContent = this.currentTab === 'favorites' ? 'No favorites yet - star some UAs to add them' : 'No user agents match your preferences';
      container.appendChild(loadingDiv);
      return;
    }

    // If currentUserAgent is provided, use it directly, otherwise get from status
    if (currentUserAgent) {
      this.renderUserAgentItems(container, agentsToDisplay, currentUserAgent);
    } else {
      // Get current user agent for highlighting
      const status = await browser.runtime.sendMessage({ action: 'getStatus' });
      const currentUA = status.currentUserAgent;
      this.renderUserAgentItems(container, agentsToDisplay, currentUA);
    }
  }

  renderUserAgentItems(container, filteredAgents, currentUA) {
    // Clear container safely
    container.textContent = '';
    
    // Create elements safely
    filteredAgents.forEach(ua => {
      const isSelected = ua.ua === currentUA;
      const isCustom = this.customUserAgents.some(custom => custom.ua === ua.ua);
      const isFavorited = this.favoriteUserAgents.includes(ua.ua);
      
      const item = document.createElement('div');
      item.className = 'user-agent-item';
      if (isSelected) {
        item.classList.add('selected');
      }
      item.dataset.ua = ua.ua;
      
      // Add star icon
      const star = document.createElement('span');
      star.className = 'favorite-star';
      if (isFavorited) {
        star.classList.add('favorited');
        star.textContent = '⭐';
      } else {
        star.textContent = '☆';
      }
      star.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleFavorite(ua.ua);
      });
      
      const contentWrapper = document.createElement('div');
      contentWrapper.className = 'user-agent-item-content';
      
      contentWrapper.appendChild(star);
      
      const text = document.createElement('div');
      text.className = 'user-agent-text';
      text.textContent = ua.ua;
      
      contentWrapper.appendChild(text);
      item.appendChild(contentWrapper);
      
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
        if (e.target.classList.contains('favorite-star')) {
          return; // Star has its own listener
        }
        this.selectUserAgent(item.dataset.ua);
      });
    });
  }

  async toggleFavorite(userAgent) {
    const index = this.favoriteUserAgents.indexOf(userAgent);
    if (index > -1) {
      // Remove from favorites
      this.favoriteUserAgents.splice(index, 1);
      this.showToast('Removed from favorites', 'info');
    } else {
      // Add to favorites
      this.favoriteUserAgents.push(userAgent);
      this.showToast('Added to favorites', 'success');
    }
    
    // Save to storage
    await browser.storage.local.set({ favoriteUserAgents: this.favoriteUserAgents });
    
    // Re-render the list
    await this.renderUserAgentList();
  }

  async setTab(tab) {
    this.currentTab = tab;
    await browser.storage.local.set({ currentTab: tab });
    
    // Update tab UI
    document.querySelectorAll('.ua-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });
    
    // Re-render the list
    await this.renderUserAgentList();
  }

  async selectUserAgent(userAgent) {
    try {
      // Apply the user agent
      await browser.runtime.sendMessage({ 
        action: 'setUserAgent', 
        userAgent: userAgent 
      });
      
      // Enable the extension if it's not already enabled
      const status = await browser.runtime.sendMessage({ action: 'getStatus' });
      if (!status.isEnabled) {
        await browser.runtime.sendMessage({ action: 'toggleEnabled' });
      }
      
      await this.loadStatus();
      await this.renderUserAgentList();
      this.showToast('User agent selected', 'success');
    } catch (error) {
      console.error('Failed to select user agent:', error);
    }
  }

  async randomizeFromSource() {
    try {
      // First check if extension is enabled, if not enable it
      const status = await browser.runtime.sendMessage({ action: 'getStatus' });
      if (!status.isEnabled) {
        await browser.runtime.sendMessage({ action: 'toggleEnabled' });
      }

      let userAgent;
      let targetTab = this.randomSource; // Switch to the source tab
      
      if (this.randomSource === 'favorites') {
        // Random from favorites
        if (this.favoriteUserAgents.length === 0) {
          this.showToast('No favorites yet', 'warning');
          return;
        }
        const randomIndex = Math.floor(Math.random() * this.favoriteUserAgents.length);
        userAgent = this.favoriteUserAgents[randomIndex];
      } else if (this.randomSource === 'all') {
        // Random from all UAs
        if (this.userAgents.length === 0) {
          this.showToast('No user agents available', 'warning');
          return;
        }
        const randomIndex = Math.floor(Math.random() * this.userAgents.length);
        userAgent = this.userAgents[randomIndex].ua;
      } else {
        // Random from filtered (default)
        const response = await browser.runtime.sendMessage({ 
          action: 'getSmartRandomUserAgent', 
          device: this.preferences.device,
          browser: this.preferences.browser,
          source: this.preferences.source
        });
        if (!response.userAgent) {
          this.showToast('No matching user agents found', 'warning');
          return;
        }
        userAgent = response.userAgent;
        targetTab = 'filtered'; // Stay on filtered tab
      }
      
      // Apply the user agent
      await browser.runtime.sendMessage({ 
        action: 'setUserAgent', 
        userAgent: userAgent 
      });
      
      // Switch to the appropriate tab to show context
      await this.setTab(targetTab);
      
      await this.loadStatus();
      await this.renderUserAgentList(userAgent);
      
      const sourceLabels = {
        'filtered': 'Filtered',
        'favorites': 'Favorites',
        'all': 'All'
      };
      this.showToast(`Random UA from ${sourceLabels[this.randomSource]} applied`, 'success');
    } catch (error) {
      console.error('Failed to randomize user agent:', error);
      this.showToast('Failed to randomize user agent', 'warning');
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
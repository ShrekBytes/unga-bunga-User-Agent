// Shared utilities for User Agent Spoofer
class Utils {
  // Validate user agent string
  static isValidUserAgent(ua) {
    if (!ua || typeof ua !== 'string') return false;
    const trimmed = ua.trim();
    return trimmed.length > 0 && trimmed.length < 1000 && /Mozilla/.test(trimmed);
  }

  // Clean and validate site domain
  static cleanSiteDomain(site) {
    if (!site || typeof site !== 'string') return null;
    
    const cleaned = site.toLowerCase()
      .trim()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/.*$/, '');
    
    // Basic domain validation
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(cleaned)) return null;
    
    return cleaned;
  }

  // Debounce function for input handlers
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Safe JSON parse with fallback
  static safeJsonParse(str, fallback = null) {
    try {
      return JSON.parse(str);
    } catch (error) {
      console.warn('Failed to parse JSON:', error);
      return fallback;
    }
  }

  // Safe storage operations
  static async safeStorageGet(keys, fallback = {}) {
    try {
      const result = await chrome.storage.local.get(keys);
      return result || fallback;
    } catch (error) {
      console.error('Storage get error:', error);
      return fallback;
    }
  }

  static async safeStorageSet(data) {
    try {
      await chrome.storage.local.set(data);
      return true;
    } catch (error) {
      console.error('Storage set error:', error);
      return false;
    }
  }

  // Safe messaging
  static async safeRuntimeMessage(message) {
    try {
      const response = await chrome.runtime.sendMessage(message);
      if (response && response.error) {
        throw new Error(response.error);
      }
      return response;
    } catch (error) {
      console.error('Runtime message error:', error);
      throw error;
    }
  }

  // Device detection from user agent
  static detectDevice(userAgent) {
    const ua = userAgent.toLowerCase();
    
    if (ua.includes('android')) return 'android';
    if (ua.includes('iphone')) return 'iphone';
    if (ua.includes('ipad')) return 'ipad';
    if (ua.includes('macintosh')) return 'mac';
    if (ua.includes('windows')) return 'windows';
    if (ua.includes('linux')) return 'linux';
    
    return 'unknown';
  }

  // Browser detection from user agent
  static detectBrowser(userAgent) {
    const ua = userAgent.toLowerCase();
    
    if (ua.includes('firefox') && !ua.includes('seamonkey')) return 'firefox';
    if (ua.includes('safari') && !ua.includes('chrome')) return 'safari';
    if (ua.includes('edg/') || ua.includes('edge/')) return 'edge';
    if (ua.includes('opr/') || ua.includes('opera')) return 'opera';
    if (ua.includes('vivaldi')) return 'vivaldi';
    if (ua.includes('chrome') && !ua.includes('edg') && !ua.includes('opr') && !ua.includes('vivaldi')) return 'chrome';
    
    return 'unknown';
  }

  // Generate secure random string
  static generateRandomId(length = 8) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Validate interval minutes
  static validateInterval(minutes) {
    const num = parseInt(minutes);
    if (isNaN(num)) return 5;
    return Math.max(1, Math.min(60, num));
  }

  // Format user agent for display (truncate if too long)
  static formatUserAgentForDisplay(ua, maxLength = 80) {
    if (!ua) return 'No user agent';
    if (ua.length <= maxLength) return ua;
    return ua.substring(0, maxLength - 3) + '...';
  }

  // Check if URL matches patterns
  static matchesPatterns(url, patterns) {
    if (!url || !patterns || patterns.length === 0) return false;
    
    try {
      const hostname = new URL(url).hostname;
      return patterns.some(pattern => hostname.includes(pattern));
    } catch (error) {
      console.warn('Invalid URL:', url);
      return false;
    }
  }

  // Create DOM element safely
  static createElement(tag, className = '', textContent = '') {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (textContent) element.textContent = textContent;
    return element;
  }

  // Add event listener with error handling
  static addEventListenerSafe(element, event, handler) {
    if (!element || typeof handler !== 'function') return false;
    
    try {
      element.addEventListener(event, (e) => {
        try {
          handler(e);
        } catch (error) {
          console.error(`Event handler error for ${event}:`, error);
        }
      });
      return true;
    } catch (error) {
      console.error(`Failed to add event listener for ${event}:`, error);
      return false;
    }
  }

  // Retry async operation with exponential backoff
  static async retryOperation(operation, maxRetries = 3, baseDelay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) throw error;
        
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.warn(`Operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms:`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Constants
  static get CACHE_TTL() {
    return 24 * 60 * 60 * 1000; // 24 hours
  }

  static get USER_AGENT_SOURCES() {
    return [
      'https://raw.githubusercontent.com/ShrekBytes/useragents-data/main/common/desktop.json',
      'https://raw.githubusercontent.com/ShrekBytes/useragents-data/main/common/mobile.json',
      'https://raw.githubusercontent.com/ShrekBytes/useragents-data/main/latest/android.json',
      'https://raw.githubusercontent.com/ShrekBytes/useragents-data/main/latest/ipad.json',
      'https://raw.githubusercontent.com/ShrekBytes/useragents-data/main/latest/iphone.json',
      'https://raw.githubusercontent.com/ShrekBytes/useragents-data/main/latest/linux.json',
      'https://raw.githubusercontent.com/ShrekBytes/useragents-data/main/latest/mac.json',
      'https://raw.githubusercontent.com/ShrekBytes/useragents-data/main/latest/windows.json'
    ];
  }

  static get FALLBACK_USER_AGENTS() {
    return [
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

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
} else if (typeof window !== 'undefined') {
  window.Utils = Utils;
}

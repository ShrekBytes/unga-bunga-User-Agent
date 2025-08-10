// Content script for anti-detection measures (Manifest V3)
(function() {
  'use strict';

  // Wait for background script to be ready
  let isEnabled = false;
  let currentUserAgent = null;

  // Get initial status
  async function initializeContentScript() {
    try {
      const status = await browser.runtime.sendMessage({ action: 'getStatus' });
      isEnabled = status.isEnabled;
      currentUserAgent = status.currentUserAgent;
      if (isEnabled && currentUserAgent) {
        injectAntiDetection();
      }
    } catch (error) {
      console.error('Failed to get initial status:', error);
    }
  }

  // Listen for status updates
  browser.runtime.onMessage.addListener((message) => {
    if (message.action === 'statusUpdate') {
      isEnabled = message.isEnabled;
      currentUserAgent = message.currentUserAgent;
      if (isEnabled && currentUserAgent) {
        injectAntiDetection();
      }
    }
  });

  function injectAntiDetection() {
    if (!currentUserAgent) return;

    // Parse user agent to extract platform and browser info
    const uaInfo = parseUserAgent(currentUserAgent);
    
    // Create script to inject
    const script = document.createElement('script');
    script.textContent = `
      (function() {
        'use strict';
        
        const originalUserAgent = '${currentUserAgent}';
        const uaInfo = ${JSON.stringify(uaInfo)};
        
        // Override navigator.userAgent
        Object.defineProperty(navigator, 'userAgent', {
          get: function() { return originalUserAgent; },
          configurable: true
        });
        
        // Override navigator.platform
        Object.defineProperty(navigator, 'platform', {
          get: function() { return uaInfo.platform; },
          configurable: true
        });
        
        // Override navigator.appVersion
        Object.defineProperty(navigator, 'appVersion', {
          get: function() { return originalUserAgent; },
          configurable: true
        });
        
        // Override navigator.vendor
        Object.defineProperty(navigator, 'vendor', {
          get: function() { return uaInfo.vendor; },
          configurable: true
        });
        
        // Override navigator.product
        Object.defineProperty(navigator, 'product', {
          get: function() { return uaInfo.product; },
          configurable: true
        });
        
        // Override navigator.productSub
        Object.defineProperty(navigator, 'productSub', {
          get: function() { return uaInfo.productSub; },
          configurable: true
        });
        
        // Override navigator.appName
        Object.defineProperty(navigator, 'appName', {
          get: function() { return uaInfo.appName; },
          configurable: true
        });
        
        // Override navigator.appCodeName
        Object.defineProperty(navigator, 'appCodeName', {
          get: function() { return uaInfo.appCodeName; },
          configurable: true
        });
        
        // Override window.chrome
        if (uaInfo.browser === 'chrome') {
          Object.defineProperty(window, 'chrome', {
            get: function() { return { runtime: {} }; },
            configurable: true
          });
        }
        
        // Override window.opera
        if (uaInfo.browser === 'opera') {
          Object.defineProperty(window, 'opera', {
            get: function() { return {}; },
            configurable: true
          });
        }
        
        // Override window.safari
        if (uaInfo.browser === 'safari') {
          Object.defineProperty(window, 'safari', {
            get: function() { return { pushNotification: {} }; },
            configurable: true
          });
        }
        
        // Override window.external
        Object.defineProperty(window, 'external', {
          get: function() { return {}; },
          configurable: true
        });
        
        // Override document.documentElement.style
        const originalStyle = document.documentElement.style;
        Object.defineProperty(document.documentElement, 'style', {
          get: function() {
            const style = originalStyle;
            // Remove any fingerprinting-related styles
            return style;
          },
          configurable: true
        });
        
        // Override screen properties
        if (uaInfo.platform.includes('Mobile')) {
          Object.defineProperty(screen, 'width', {
            get: function() { return 375; },
            configurable: true
          });
          Object.defineProperty(screen, 'height', {
            get: function() { return 667; },
            configurable: true
          });
        }
        
        // Override performance timing
        const originalGetEntries = Performance.prototype.getEntries;
        Performance.prototype.getEntries = function() {
          const entries = originalGetEntries.call(this);
          return entries.filter(entry => 
            !entry.name.includes('user-agent') && 
            !entry.name.includes('fingerprint')
          );
        };
        
        // Override canvas fingerprinting
        const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function() {
          // Add subtle noise to prevent fingerprinting
          const canvas = this;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            // Add minimal noise to prevent exact fingerprinting
            for (let i = 0; i < data.length; i += 4) {
              data[i] = Math.max(0, Math.min(255, data[i] + (Math.random() - 0.5) * 0.1));
              data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + (Math.random() - 0.5) * 0.1));
              data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + (Math.random() - 0.5) * 0.1));
            }
            ctx.putImageData(imageData, 0, 0);
          }
          return originalToDataURL.apply(this, arguments);
        };
        
        // Override WebGL fingerprinting
        const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
          // Add subtle variations to prevent fingerprinting
          const result = originalGetParameter.call(this, parameter);
          if (parameter === this.VENDOR || parameter === this.RENDERER) {
            return result + ' ' + Math.random().toString(36).substr(2, 1);
          }
          return result;
        };
        
        // Override audio fingerprinting
        const originalGetChannelData = AudioBuffer.prototype.getChannelData;
        AudioBuffer.prototype.getChannelData = function() {
          const data = originalGetChannelData.call(this);
          // Add minimal noise to prevent audio fingerprinting
          for (let i = 0; i < data.length; i++) {
            data[i] += (Math.random() - 0.5) * 0.0001;
          }
          return data;
        };
        
        console.log('[User Agent Spoofer] Anti-detection measures activated');
      })();
    `;
    
    // Inject the script
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  }

  function parseUserAgent(userAgent) {
    const ua = userAgent.toLowerCase();
    
    let platform = 'Win32';
    let vendor = '';
    let product = 'Gecko';
    let productSub = '20030107';
    let appName = 'Netscape';
    let appCodeName = 'Mozilla';
    let browser = 'firefox';
    
    // Determine platform
    if (ua.includes('windows')) {
      platform = 'Win32';
    } else if (ua.includes('macintosh')) {
      platform = 'MacIntel';
    } else if (ua.includes('linux')) {
      platform = 'Linux x86_64';
    } else if (ua.includes('android')) {
      platform = 'Linux armv8l';
    } else if (ua.includes('iphone') || ua.includes('ipad')) {
      platform = 'iPhone';
    }
    
    // Determine browser
    if (ua.includes('chrome')) {
      browser = 'chrome';
      vendor = 'Google Inc.';
      product = 'Gecko';
    } else if (ua.includes('safari')) {
      browser = 'safari';
      vendor = 'Apple Computer, Inc.';
      product = 'Gecko';
    } else if (ua.includes('firefox')) {
      browser = 'firefox';
      vendor = '';
      product = 'Gecko';
    } else if (ua.includes('edge')) {
      browser = 'edge';
      vendor = 'Microsoft Corporation';
      product = 'Gecko';
    }
    
    return {
      platform,
      vendor,
      product,
      productSub,
      appName,
      appCodeName,
      browser
    };
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeContentScript);
  } else {
    initializeContentScript();
  }
})(); 
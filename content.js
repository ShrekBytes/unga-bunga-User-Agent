// Content script for anti-detection measures (Manifest V3)
(function() {
  'use strict';

  let isEnabled = false;
  let currentUserAgent = null;

  // Initialize content script
  async function init() {
    try {
      // Retry mechanism for service worker communication
      const maxRetries = 3;
      let status = null;
      
      for (let i = 0; i < maxRetries; i++) {
        try {
          status = await chrome.runtime.sendMessage({ action: 'getStatus' });
          if (status && !status.error) break;
        } catch (error) {
          if (i === maxRetries - 1) throw error;
          await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
        }
      }
      
      if (status && !status.error) {
    isEnabled = status.isEnabled;
    currentUserAgent = status.currentUserAgent;
        
    if (isEnabled && currentUserAgent) {
      injectAntiDetection();
    }
      }
    } catch (error) {
      console.warn('[User Agent Spoofer] Failed to initialize:', error);
    }
  }

  // Listen for status updates from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
    if (message.action === 'statusUpdate') {
      isEnabled = message.isEnabled;
      currentUserAgent = message.currentUserAgent;
        
      if (isEnabled && currentUserAgent) {
        injectAntiDetection();
      }
      }
      sendResponse({ success: true });
    } catch (error) {
      console.warn('[User Agent Spoofer] Message handler error:', error);
      sendResponse({ error: error.message });
    }
  });

    function injectAntiDetection() {
    if (!currentUserAgent) return;

    try {
      // Parse user agent to extract platform and browser info
      const uaInfo = parseUserAgent(currentUserAgent);
      
      // Create and inject script immediately using multiple methods for better coverage
      const scriptContent = createAntiDetectionScript(currentUserAgent, uaInfo);
      
      // Method 1: Direct script injection
      const script = document.createElement('script');
      script.textContent = scriptContent;
      
      // Inject the script as early as possible - before any other scripts can run
      const target = document.head || document.documentElement || document;
      if (target.firstChild) {
        target.insertBefore(script, target.firstChild);
      } else {
        target.appendChild(script);
      }
      script.remove();
      
      // Method 2: Direct evaluation as backup (more stealthy)
      try {
        const func = new Function(scriptContent);
        func();
      } catch (e) {
        // Fallback failed, but main injection should work
      }
      
    } catch (error) {
      console.warn('[User Agent Spoofer] Failed to inject anti-detection:', error);
    }
  }

  function createAntiDetectionScript(userAgent, uaInfo) {
    return `
      (function() {
        'use strict';
        
        const originalUserAgent = '${userAgent.replace(/'/g, "\\'")}';
        const uaInfo = ${JSON.stringify(uaInfo)};
        
        // Override navigator properties with enhanced protection
        const navigatorOverrides = {
          userAgent: originalUserAgent,
          platform: uaInfo.platform,
          appVersion: uaInfo.appVersion,
          vendor: uaInfo.vendor,
          product: uaInfo.product,
          productSub: uaInfo.productSub,
          appName: uaInfo.appName,
          appCodeName: uaInfo.appCodeName
        };
        
        // Store original descriptors to prevent detection
        const originalDescriptors = {};
        Object.keys(navigatorOverrides).forEach(prop => {
          try {
            originalDescriptors[prop] = Object.getOwnPropertyDescriptor(navigator, prop) || 
                                       Object.getOwnPropertyDescriptor(Navigator.prototype, prop);
          } catch (e) {
            // Ignore errors
          }
        });
        
        // Override properties with enhanced stealth
        Object.keys(navigatorOverrides).forEach(prop => {
          try {
            // Try to override on navigator object first
            Object.defineProperty(navigator, prop, {
              get: function() { return navigatorOverrides[prop]; },
              configurable: true,
              enumerable: true
            });
            
            // Also override on Navigator prototype to catch iframe access
            if (Navigator && Navigator.prototype) {
              Object.defineProperty(Navigator.prototype, prop, {
                get: function() { return navigatorOverrides[prop]; },
                configurable: true,
                enumerable: true
              });
            }
          } catch (e) {
            // Silently fail if property can't be overridden
          }
        });
        
        // Prevent navigator object cloning detection
        const originalNavigator = navigator;
        const navigatorHandler = {
          get: function(target, prop) {
            if (navigatorOverrides.hasOwnProperty(prop)) {
              return navigatorOverrides[prop];
            }
            return target[prop];
          },
          getOwnPropertyDescriptor: function(target, prop) {
            if (navigatorOverrides.hasOwnProperty(prop)) {
              return {
                value: navigatorOverrides[prop],
                writable: false,
                enumerable: true,
          configurable: true
              };
            }
            return Object.getOwnPropertyDescriptor(target, prop);
          }
        };
        
        // Try to replace navigator with proxy (advanced protection)
        try {
          const proxiedNavigator = new Proxy(navigator, navigatorHandler);
          Object.defineProperty(window, 'navigator', {
            get: function() { return proxiedNavigator; },
          configurable: true
        });
        } catch (e) {
          // Fallback to direct property override
        }
        
        // Browser-specific window object overrides
        const browserOverrides = {
          chrome: { runtime: {}, csi: function() {}, loadTimes: function() {} },
          opera: { version: function() { return '12.0'; } },
          safari: { pushNotification: {} }
        };
        
        if (browserOverrides[uaInfo.browser]) {
          try {
            Object.defineProperty(window, uaInfo.browser, {
              get: function() { return browserOverrides[uaInfo.browser]; },
            configurable: true
          });
          } catch (e) {
            // Silently fail
          }
        }
        
        // Override external object
        try {
          Object.defineProperty(window, 'external', {
            get: function() { return {}; },
            configurable: true
          });
        } catch (e) {
          // Silently fail
        }
        
        // Mobile device screen overrides
        if (uaInfo.isMobile) {
          const mobileScreenProps = {
            width: 375,
            height: 667,
            availWidth: 375,
            availHeight: 667
          };
          
          Object.keys(mobileScreenProps).forEach(prop => {
            try {
              Object.defineProperty(screen, prop, {
                get: function() { return mobileScreenProps[prop]; },
            configurable: true
              });
            } catch (e) {
              // Silently fail
            }
          });
        }
        
        // Protect against iframe-based detection
        const originalCreateElement = document.createElement;
        document.createElement = function(tagName) {
          const element = originalCreateElement.call(this, tagName);
          
          if (tagName && tagName.toLowerCase() === 'iframe') {
            // Override navigator in iframe when it loads
            const originalOnLoad = element.onload;
            element.onload = function() {
              try {
                if (element.contentWindow && element.contentWindow.navigator) {
                  Object.keys(navigatorOverrides).forEach(prop => {
                    try {
                      Object.defineProperty(element.contentWindow.navigator, prop, {
                        get: function() { return navigatorOverrides[prop]; },
                        configurable: true,
                        enumerable: true
                      });
                    } catch (e) {
                      // Ignore errors
                    }
                  });
                }
              } catch (e) {
                // Cross-origin iframe, can't access
              }
              
              if (originalOnLoad) {
                originalOnLoad.call(this);
              }
            };
          }
          
          return element;
        };
        
        // Protect against early navigator cloning
        const navigatorCloneProtection = function() {
          const currentTime = Date.now();
          if (window.navigatorCloneTime && (currentTime - window.navigatorCloneTime) < 100) {
            // Detected potential early cloning, return spoofed values
            return true;
          }
          window.navigatorCloneTime = currentTime;
          return false;
        };
        
        // Override Object.assign to prevent navigator cloning
        const originalAssign = Object.assign;
        Object.assign = function(target, ...sources) {
          if (sources.some(source => source === navigator)) {
            navigatorCloneProtection();
            // Replace navigator source with our overridden version
            const newSources = sources.map(source => 
              source === navigator ? navigatorOverrides : source
            );
            return originalAssign.call(this, target, ...newSources);
          }
          return originalAssign.call(this, target, ...sources);
        };
        
        // Anti-fingerprinting measures
        setupAntiFingerprinting();
        
        function setupAntiFingerprinting() {
          // Canvas fingerprinting protection
          try {
            const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
            const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
            
            HTMLCanvasElement.prototype.toDataURL = function() {
              addCanvasNoise(this);
              return originalToDataURL.apply(this, arguments);
            };
            
            CanvasRenderingContext2D.prototype.getImageData = function() {
              const result = originalGetImageData.apply(this, arguments);
              addImageDataNoise(result);
              return result;
            };
          } catch (e) {
            // Silently fail
          }
          
          // WebGL fingerprinting protection
          try {
            const contexts = [WebGLRenderingContext, WebGL2RenderingContext];
            contexts.forEach(Context => {
              if (Context && Context.prototype) {
                const originalGetParameter = Context.prototype.getParameter;
                Context.prototype.getParameter = function(parameter) {
                  const result = originalGetParameter.call(this, parameter);
                  return addWebGLNoise(result, parameter, this);
                };
              }
            });
          } catch (e) {
            // Silently fail
          }
          
          // Audio fingerprinting protection
          try {
            const originalGetChannelData = AudioBuffer.prototype.getChannelData;
            AudioBuffer.prototype.getChannelData = function() {
              const data = originalGetChannelData.call(this, arguments);
              addAudioNoise(data);
              return data;
            };
          } catch (e) {
            // Silently fail
          }
        }
        
        function addCanvasNoise(canvas) {
          try {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              addImageDataNoise(imageData);
              ctx.putImageData(imageData, 0, 0);
            }
          } catch (e) {
            // Silently fail
          }
        }
        
        function addImageDataNoise(imageData) {
          try {
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
              const noise = (Math.random() - 0.5) * 0.1;
              data[i] = Math.max(0, Math.min(255, data[i] + noise));
              data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
              data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
            }
          } catch (e) {
            // Silently fail
          }
        }
        
        function addWebGLNoise(result, parameter, context) {
          try {
            if (parameter === context.VENDOR || parameter === context.RENDERER) {
            return result + ' ' + Math.random().toString(36).substr(2, 1);
            }
          } catch (e) {
            // Silently fail
          }
          return result;
        }
        
        function addAudioNoise(data) {
          try {
          for (let i = 0; i < data.length; i++) {
            data[i] += (Math.random() - 0.5) * 0.0001;
            }
          } catch (e) {
            // Silently fail
          }
        }
        
        console.log('[User Agent Spoofer] Anti-detection measures activated for:', originalUserAgent.substring(0, 50) + '...');
      })();
    `;
  }

  function parseUserAgent(userAgent) {
    const ua = userAgent.toLowerCase();
    
    const info = {
      platform: 'Win32',
      vendor: '',
      product: 'Gecko',
      productSub: '20030107',
      appName: 'Netscape',
      appCodeName: 'Mozilla',
      browser: 'firefox',
      isMobile: false,
      appVersion: userAgent // Default to full user agent
    };
    
    // Determine platform
    if (ua.includes('windows')) {
      info.platform = 'Win32';
    } else if (ua.includes('macintosh')) {
      info.platform = 'MacIntel';
    } else if (ua.includes('linux')) {
      info.platform = 'Linux x86_64';
    } else if (ua.includes('android')) {
      info.platform = 'Linux armv8l';
      info.isMobile = true;
    } else if (ua.includes('iphone')) {
      info.platform = 'iPhone';
      info.isMobile = true;
    } else if (ua.includes('ipad')) {
      info.platform = 'iPad';
      info.isMobile = true;
    }
    
    // Determine browser and vendor, and create appropriate appVersion
    if (ua.includes('chrome') && !ua.includes('edg') && !ua.includes('opr') && !ua.includes('vivaldi')) {
      info.browser = 'chrome';
      info.vendor = 'Google Inc.';
      info.product = 'Gecko';
      // Chrome appVersion is typically the full UA string
      info.appVersion = userAgent;
    } else if (ua.includes('safari') && !ua.includes('chrome')) {
      info.browser = 'safari';
      info.vendor = 'Apple Computer, Inc.';
      info.product = 'Gecko';
      // Safari appVersion is typically the version part
      const match = userAgent.match(/Version\/([0-9.]+)/);
      info.appVersion = match ? `${match[1]} (${info.platform})` : userAgent;
    } else if (ua.includes('firefox')) {
      info.browser = 'firefox';
      info.vendor = '';
      info.product = 'Gecko';
      // Firefox appVersion should match the pattern inside parentheses
      const match = userAgent.match(/Mozilla\/[0-9.]+\s*\(([^)]+)\)/);
      info.appVersion = match ? match[1] : userAgent.replace(/^Mozilla\/[0-9.]+\s*\(/, '').replace(/\).*$/, '');
    } else if (ua.includes('edg')) {
      info.browser = 'edge';
      info.vendor = 'Microsoft Corporation';
      info.product = 'Gecko';
      // Edge appVersion is typically the full UA string
      info.appVersion = userAgent;
    } else if (ua.includes('opr') || ua.includes('opera')) {
      info.browser = 'opera';
      info.vendor = 'Opera Software ASA';
      info.product = 'Gecko';
      // Opera appVersion is typically the full UA string
      info.appVersion = userAgent;
    } else if (ua.includes('vivaldi')) {
      info.browser = 'vivaldi';
      info.vendor = 'Vivaldi Technologies AS';
      info.product = 'Gecko';
      // Vivaldi appVersion is typically the full UA string
      info.appVersion = userAgent;
    }
    
    return info;
  }

  // Try immediate injection if we already have a user agent stored
  (async function immediateInit() {
    try {
      const stored = await chrome.storage.local.get(['isEnabled', 'currentUserAgent']);
      if (stored.isEnabled && stored.currentUserAgent) {
        isEnabled = stored.isEnabled;
        currentUserAgent = stored.currentUserAgent;
        injectAntiDetection();
      }
    } catch (error) {
      // Ignore errors, will be handled by main init
    }
  })();

  // Initialize when DOM is ready or immediately if already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(); 
// Content script for robust user agent injection
// This script coordinates the injection of scripts into the page context

(function() {
  'use strict';

  // Inject scripts into page context synchronously at document_start
  // This is critical for proper spoofing before page scripts run
  
  function injectScriptInline(file) {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', browser.runtime.getURL(file), false); // synchronous
      xhr.send();
      
      if (xhr.status === 200 && xhr.responseText) {
        const script = document.createElement('script');
        script.textContent = xhr.responseText;
        const target = document.head || document.documentElement;
        if (target) {
          target.appendChild(script);
          script.remove();
          return true;
        }
      }
    } catch (e) {
      console.error('[Unga Bunga UA] Failed to inject script:', file, e);
    }
    return false;
  }

  // Inject main.js and override.js into page context (MAIN world)
  // These must run synchronously before any page scripts
  injectScriptInline('inject/main.js');
  injectScriptInline('inject/override.js');
  
  // Now run isolated.js in the content script context (ISOLATED world)
  // This coordinates with the page context scripts
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', browser.runtime.getURL('inject/isolated.js'), false);
    xhr.send();
    
    if (xhr.status === 200 && xhr.responseText) {
      // Use indirect eval to run in content script scope
      (1, eval)(xhr.responseText);
    }
  } catch (e) {
    console.error('[Unga Bunga UA] Failed to execute isolated script:', e);
  }
})();

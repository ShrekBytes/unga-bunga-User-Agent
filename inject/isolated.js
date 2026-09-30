// Isolated content script - coordinates the MAIN-world override
// This runs in the ISOLATED world, registered by background.js via
// browser.scripting.registerContentScripts at document_start, after the two
// MAIN-world scripts. It dispatches the 'override' event the port carries to
// inject/override.js, and resolves payloads for frames the Server-Timing
// marker never reached (about:blank, srcdoc, sandboxed, cross-origin).

// Portions of this file are from "UserAgent-Switcher" by ray-lothian,
// licensed under the Mozilla Public License 2.0 (MPL-2.0).
// Modifications made under the GNU General Public License v3.0 (GPLv3).

/* global cloneInto */

// the port element this frame's own MAIN world created (null in sandboxed
// frames); distinct from `port`, which may later point at an ancestor's port
const mainPort = self.port = document.getElementById('uas-port');

let port = mainPort;

const id = (Math.random() + 1).toString(36).substring(7);

const report = () => {
  if (window === window.top && port.dataset.str) {
    browser.runtime.sendMessage({
      action: 'tab-spoofing',
      str: port.dataset.str,
      type: port.dataset.type
    });
  }
};

const override = reason => {
  const detail = typeof cloneInto === 'undefined' ? {id, reason} : cloneInto({id, reason}, self);
  port.dispatchEvent(new CustomEvent('override', {
    detail
  }));
  report();
};

if (port) {
  // ignore XML documents
  if (port.dataset) {
    port.dataset.id = id;
    port.remove();
  }
}
else { // iframe[sandbox]
  try {
    const hierarchy = [];
    let [p, s] = [parent, self];
    for (;;) {
      for (let n = 0; n < p.frames.length; n += 1) {
        if (p.frames[n] === s) {
          hierarchy.unshift(n);
        }
      }
      if (p.port) {
        port = p.port;
        if (port.dataset.disabled !== 'true') {
          port.dispatchEvent(new CustomEvent('register', {
            detail: {
              id,
              hierarchy
            }
          }));
        }
        break;
      }
      [s, p] = [p, p.parent];

      if (s === p) {
        break;
      }
    }
  }
  // cross-origin sandboxed iframe
  catch (e) {
    console.info('[Unga Bunga UA] user-agent leaked:', e, location.href);
  }
}

if (port && port.dataset) {
  // on per-tab only UA set, all tabs get injected, but only the spoofed tab
  // has "port.dataset.str"; others are intentionally disabled. bail out for
  // any disabled context (top or frame) so the async path never falsely logs
  // "[user-agent leaked]"
  if (port.dataset.disabled === 'true') {
    if (self === self.top) {
      console.info('[Unga Bunga UA]', 'disabled on this tab');
    }
  }
  else if (port.dataset.str) {
    // override.js already applied the payload directly at document_start; only
    // fall back to the event when that has not happened (payload arrived via
    // parent/async after the MAIN-world scripts ran). The top-frame state is
    // still reported so the badge stays correct. A sandboxed frame reaching
    // this branch has port pointing at an ANCESTOR's port, so it always
    // dispatches: the listener resolves this frame's window via port.ogs.
    if (port === mainPort && port.dataset.applied === 'true') {
      report();
    }
    else {
      override('normal');
    }
  }
  // sub-frames and cross-origin frames
  else {
    try {
      let [p, s] = [parent, self];
      for (;;) {
        if (p.port) {
          if (p.port.dataset.disabled === 'true') {
            port.dataset.disabled = true;
          }
          else {
            if ('str' in p.port.dataset) {
              port.dataset.str = p.port.dataset.str;
              // always dispatch: the event carries THIS frame's id and the
              // override listener resolves it through port.ogs; only the
              // port owner's own apply is suppressed by dataset.applied
              port.dataset.applied = 'true';
              override('parent');
            }
          }
          break;
        }
        [s, p] = [p, p.parent];

        if (s === p) {
          break;
        }
      }
      // Firefox -> iframe[about:blank]
      if (port.dataset.disabled === 'true') {
        // parent context is intentionally disabled (e.g. per-tab only UA);
        // nothing to spoof here, so do not fall back to the async path
      }
      else if (!port.dataset.str) {
        throw Error('UA_SET_FAILED');
      }
    }
    catch (e) { // cross-origin frame or when top-level is from service worker
      console.info('[Unga Bunga UA] user-agent leaked, using async method:', location.href, mainPort && mainPort.dataset.cached);

      browser.runtime.sendMessage({
        action: 'get-port-string',
        cached: !!mainPort && mainPort.dataset.cached === 'true',
        top: self.top === self
      }, str => {
        if (!str) {
          return;
        }
        // the payload must land on a port this frame can dispatch on: our
        // own port, or the nearest reachable same-origin ancestor's port.
        // Throwing here is what used to silently drop the payload and leak
        // the real UA
        if (mainPort && mainPort.dataset) {
          port = mainPort;
        }
        if (port && port.dataset) {
          port.dataset.str = str;
          port.dataset.applied = 'true';
          override('async');
        }
      });
    }
  }
}

// Main injection script - creates the communication port
// This runs in the MAIN world (page context)

// Portions of this file are from "UserAgent-Switcher" by ray-lothian,
// licensed under the Mozilla Public License 2.0 (MPL-2.0).
// Modifications made under the GNU General Public License v3.0 (GPLv3).

{
  const port = document.createElement('span');
  port.id = 'uas-port';
  
  // Prepare function to parse and activate UA configuration
  port.prepare = () => {
    port.prefs = JSON.parse(decodeURIComponent(port.dataset.str));
    port.dataset.ready = true;
    port.dataset.type = port.prefs.type;
  };
  
  // Map to store references to sandboxed iframe navigators
  port.ogs = new Map();
  port.addEventListener('register', e => {
    const win = e.detail.hierarchy.reduce((p, c) => {
      return p.frames[c];
    }, parent);
    port.ogs.set(e.detail.id, win);
  });

  // Append port element to DOM before any page scripts run
  document.documentElement.append(port);

  // Find user-agent data from Server-Timing header
  for (const entry of performance.getEntriesByType('navigation')) {
    for (const timing of entry.serverTiming || []) {
      if (timing.name === 'uasw-json-data') {
        port.dataset.str = timing.description;
      }
    }
  }

  // Prepare UA data if found, otherwise mark as disabled
  if (port.dataset.str) {
    port.prepare();
  }
  else if (self.top === self) {
    port.dataset.disabled = true;
  }
}


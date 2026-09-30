'use strict';

// Frame-walk coverage for inject/isolated.js, pinning its behaviour before any
// refactor. The two ancestor walks are the highest-risk untested code in the
// extension: they run in every frame, they are the only path that resolves
// sandboxed, about:blank and cross-origin frames, and a regression here leaks
// the real user agent exactly the way issue #4 described.
//
// isolated.js is loaded the way tests/client-hints-parity.test.js loads
// inject/override.js: in a bare sandbox whose globals are stubs. The stubs
// mirror the real DOM semantics isolated.js relies on:
//   - `dataset` assignments coerce to string (DOMString), so the boolean
//     `port.dataset.disabled = true` the walk writes reads back as 'true';
//   - cross-origin windows throw on custom property access (Firefox:
//     SecurityError), which is what routes a frame to the async fallback;
//   - a top window's `parent` is itself, which terminates the walks.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

// --- stubs -----------------------------------------------------------------

// DOMString semantics: dataset writes stringify, so `"str" in dataset` and
// `=== 'true'` comparisons behave like they do on a real element.
const makeDataset = () => {
  const store = {};
  return new Proxy(store, {
    get: (t, k) => t[k],
    set: (t, k, v) => { t[k] = String(v); return true; },
    has: (t, k) => k in t,
    deleteProperty: (t, k) => { delete t[k]; return true; }
  });
};

const makePort = (events, { str, type, disabled, cached } = {}) => {
  const dataset = makeDataset();
  if (str !== undefined) dataset.str = str;
  if (type !== undefined) dataset.type = type;
  if (disabled !== undefined) dataset.disabled = disabled;
  if (cached !== undefined) dataset.cached = cached;
  return {
    dataset,
    remove() {},
    dispatchEvent(evt) {
      events.push({ port: this, type: evt.type, detail: evt.detail });
    }
  };
};

const makeFrame = ({ parentFrame } = {}) => {
  const win = { frames: [] };
  win.parent = parentFrame || win;
  win.top = parentFrame ? parentFrame.top : win;
  return win;
};

// top -> parent -> running, with the frames arrays the walks index into
function makeChain() {
  const events = [];
  const top = makeFrame();
  const parent = makeFrame({ parentFrame: top });
  const running = makeFrame({ parentFrame: parent });
  top.frames.push(parent);
  parent.frames.push(running);
  return { events, top, parent, running };
}

// Runs inject/isolated.js once inside `runningFrame`, with `runningPort` as
// what document.getElementById('uas-port') hands it (null for sandboxed
// frames, which get no port element of their own). `events` is the SAME array
// every port under test was built with, so dispatches from any frame's port
// land where the test asserts on them.
function runIsolatedScript({ events, runningFrame, runningPort }) {
  const sent = [];

  const document = { getElementById: () => runningPort };
  const browser = {
    runtime: {
      sendMessage(msg, respond) {
        sent.push({ msg, respond });
      }
    }
  };
  const consoleStub = { info() {}, error() {}, warn() {} };

  class CustomEvent {
    constructor(type, init) {
      this.type = type;
      this.detail = init && init.detail;
    }
  }

  const portId = new Function(
    'document', 'self', 'parent', 'window', 'browser', 'console', 'location', 'CustomEvent',
    `${read('inject/isolated.js')}\n;return typeof id === 'string' ? id : null;`
  )(
    document, runningFrame, runningFrame.parent, runningFrame,
    browser, consoleStub, { href: 'https://frame.example/page' }, CustomEvent
  );

  return {
    events,
    sent,
    portId,
    getPortStringRequests: () => sent.filter(s => s.msg.action === 'get-port-string'),
    answer: str => {
      const call = sent.find(s => s.msg.action === 'get-port-string');
      assert.ok(call, 'expected the async fallback to request get-port-string');
      call.respond(str);
    }
  };
}

// --- top-level frames ------------------------------------------------------

test('top frame with a payload: override normal on its own port plus tab-spoofing', () => {
  const events = [];
  const top = makeFrame();
  const port = makePort(events, { str: 'ENCODED', type: 'user' });
  top.port = port;

  const r = runIsolatedScript({ events, runningFrame: top, runningPort: port });

  assert.deepStrictEqual(r.events.map(e => e.type), ['override']);
  assert.strictEqual(r.events[0].port, port);
  assert.strictEqual(r.events[0].detail.reason, 'normal');
  assert.strictEqual(r.events[0].detail.id, r.portId);
  assert.strictEqual(port.dataset.id, r.portId, 'the frame stamps its id on the port');
  assert.deepStrictEqual(r.sent.map(s => s.msg), [
    { action: 'tab-spoofing', str: 'ENCODED', type: 'user' }
  ]);
});

test('top frame marked disabled: inert, no dispatch, no message', () => {
  const events = [];
  const top = makeFrame();
  const port = makePort(events, { disabled: 'true' });
  top.port = port;

  const r = runIsolatedScript({ events, runningFrame: top, runningPort: port });

  assert.deepStrictEqual(r.events, []);
  assert.deepStrictEqual(r.sent, []);
});

// --- sub-frame inheritance walk --------------------------------------------

test('sub-frame: copies the parent payload and overrides with reason parent', () => {
  const { events, parent, running } = makeChain();
  parent.port = makePort(events, { str: 'PARENT' });
  const runningPort = makePort(events, {});

  const r = runIsolatedScript({ events, runningFrame: running, runningPort });

  assert.strictEqual(runningPort.dataset.str, 'PARENT');
  assert.deepStrictEqual(r.events.map(e => e.type), ['override']);
  assert.strictEqual(r.events[0].port, runningPort);
  assert.strictEqual(r.events[0].detail.reason, 'parent');
  assert.ok(!r.sent.some(s => s.msg.action === 'tab-spoofing'), 'frames never report tab-spoofing');
  assert.deepStrictEqual(r.getPortStringRequests(), []);
});

test('sub-frame with a disabled parent: marked disabled, async fallback skipped', () => {
  const { events, parent, running } = makeChain();
  parent.port = makePort(events, { str: 'PARENT', disabled: 'true' });
  const runningPort = makePort(events, {});

  const r = runIsolatedScript({ events, runningFrame: running, runningPort });

  // the walk assigns boolean true; DOMString coercion makes it read back 'true'
  assert.strictEqual(runningPort.dataset.disabled, 'true');
  assert.deepStrictEqual(r.events, []);
  assert.deepStrictEqual(r.sent, []);
});

test('sub-frame with nothing up the chain: async fallback resolves on its own port', () => {
  const { events, parent, running } = makeChain();
  parent.port = makePort(events, {}); // reachable, but carries no payload
  const runningPort = makePort(events, {});

  const r = runIsolatedScript({ events, runningFrame: running, runningPort });
  assert.deepStrictEqual(r.events, [], 'nothing dispatched before the background answers');

  const [req] = r.getPortStringRequests();
  assert.deepStrictEqual(req.msg, { action: 'get-port-string', cached: false, top: false });

  r.answer('ASYNC');
  assert.deepStrictEqual(r.events.map(e => e.type), ['override']);
  assert.strictEqual(r.events[0].port, runningPort);
  assert.strictEqual(r.events[0].detail.reason, 'async');
  assert.strictEqual(runningPort.dataset.str, 'ASYNC');
});

test('async fallback with an empty answer stays inert', () => {
  const { events, parent, running } = makeChain();
  parent.port = makePort(events, {});
  const runningPort = makePort(events, {});

  const r = runIsolatedScript({ events, runningFrame: running, runningPort });
  r.answer('');

  assert.deepStrictEqual(r.events, []);
  assert.strictEqual(runningPort.dataset.str, undefined);
});

// --- sandboxed-frame register walk ------------------------------------------

test('sandboxed frame two levels down: registers on the ancestor port, then overrides through it', () => {
  const { events, top, running } = makeChain();
  const topPort = makePort(events, { str: 'TOP' });
  top.port = topPort;
  // parent deliberately has no port: the walk must continue past it

  const r = runIsolatedScript({ events, runningFrame: running, runningPort: null });

  assert.deepStrictEqual(r.events.map(e => e.type), ['register', 'override']);
  const [reg, ov] = r.events;
  assert.strictEqual(reg.port, topPort);
  assert.deepStrictEqual(reg.detail.hierarchy, [0, 0]);
  assert.strictEqual(ov.port, topPort, 'override rides the ancestor port, whose ogs maps this frame');
  assert.strictEqual(ov.detail.reason, 'normal');
  assert.strictEqual(ov.detail.id, reg.detail.id, 'register and override carry the same frame id');
  assert.ok(!r.sent.some(s => s.msg.action === 'tab-spoofing'));
});

test('sandboxed frame under a disabled ancestor: no register, inert', () => {
  const { events, top, running } = makeChain();
  top.port = makePort(events, { str: 'TOP', disabled: 'true' });

  const r = runIsolatedScript({ events, runningFrame: running, runningPort: null });

  assert.deepStrictEqual(r.events, []);
  assert.deepStrictEqual(r.sent, []);
});

test('sandboxed frame with no port anywhere: the walk terminates at the top', () => {
  const { events, running } = makeChain();

  const r = runIsolatedScript({ events, runningFrame: running, runningPort: null });

  assert.deepStrictEqual(r.events, []);
  assert.deepStrictEqual(r.sent, []);
});

// --- cross-origin frames ----------------------------------------------------

test('cross-origin parent: property access throws, async fallback reports tab-level scope', () => {
  const { events, top } = makeChain();
  const crossParent = { frames: { length: 0 }, parent: top, top };
  Object.defineProperty(crossParent, 'port', {
    get() { throw new Error('SecurityError: cross-origin access'); }
  });
  const running = makeFrame({ parentFrame: crossParent });
  const runningPort = makePort(events, { cached: 'true' });

  const r = runIsolatedScript({ events, runningFrame: running, runningPort });

  const [req] = r.getPortStringRequests();
  assert.deepStrictEqual(req.msg, { action: 'get-port-string', cached: true, top: false });

  r.answer('ASYNC');
  assert.deepStrictEqual(r.events.map(e => e.type), ['override']);
  assert.strictEqual(r.events[0].port, runningPort);
  assert.strictEqual(r.events[0].detail.reason, 'async');
});

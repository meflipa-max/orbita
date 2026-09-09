/* ═══════════════════════════════════════════════════════════════
   ORBITA — banco di prova headless.

   Carica i sorgenti veri in un contesto Node con uno stub minimo di
   DOM, canvas e audio: abbastanza da far girare la simulazione, niente
   di piu'. Non disegna nulla — il canvas e' un Proxy che accetta ogni
   chiamata e non fa niente — quindi una partita da venti minuti gira in
   qualche decina di secondi invece che in venti minuti.

   Serve a misurare invece di stimare, che e' il modo in cui sono state
   bilanciate le rune, i formati e le congiunzioni. Espone `ORBITA`, la
   stessa maniglia che il gioco mette su window in un browser.

     import { O, IN } from './banco.mjs';
     O.reset('vega', 12345, 'incursione');
     O.G.state = 'play';
     for (let i = 0; i < 60 * 60; i++) O.step(1 / 60);
     console.log(O.G.kills, O.G.roster.map(b => b.n));

   `IN` e' il vettore di ingresso: scrivendoci dentro si muove il
   giocatore, ed e' cosi' che il bot di misura.mjs schiva.
   ═══════════════════════════════════════════════════════════════ */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
/* stesso ordine del build: i file sono un unico script concatenato */
const js = readdirSync(SRC).filter(f => f.endsWith('.js')).sort()
  .map(f => readFileSync(join(SRC, f), 'utf8')).join('\n');

const noop = () => {};

/* Il contesto 2D. Ogni proprieta' letta e' una funzione che non fa
   niente, tranne le poche che devono restituire un oggetto per non far
   esplodere il chiamante. */
function fakeCtx() {
  return new Proxy({}, {
    get(t, k) {
      if (k === 'canvas') return { width: 1280, height: 800 };
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => ({ addColorStop: noop });
      if (k === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      return noop;
    },
    set() { return true; }
  });
}

function fakeEl(tag) {
  return {
    tagName: (tag || 'div').toUpperCase(),
    /* setProperty deve essere una funzione: l'HUD la usa per il colore del Nodo */
    style: new Proxy({}, {
      get: (t, k) => (k === 'setProperty' || k === 'removeProperty' ? noop : k === 'getPropertyValue' ? (() => '') : ''),
      set: () => true
    }),
    dataset: {}, children: [], value: '', textContent: '', innerHTML: '', className: '',
    width: 1280, height: 800, clientWidth: 1280, clientHeight: 800, open: false,
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    getContext: () => fakeCtx(), appendChild: noop, removeChild: noop, remove: noop,
    addEventListener: noop, removeEventListener: noop, setAttribute: noop,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 800 }),
    querySelector: () => fakeEl('div'), querySelectorAll: () => [],
    closest: () => null, focus: noop, select: noop, setSelectionRange: noop, scrollTo: noop
  };
}

const doc = {
  documentElement: fakeEl('html'), body: fakeEl('body'),
  createElement: t => fakeEl(t), createElementNS: t => fakeEl(t),
  querySelector: () => fakeEl('div'), querySelectorAll: () => [],
  getElementById: () => fakeEl('div'),
  addEventListener: noop, removeEventListener: noop, hidden: false,
  execCommand: () => true, fonts: { ready: Promise.resolve() }
};

/* L'audio procedurale: i nodi accettano tutto e non suonano niente. */
class FakeParam { constructor() { this.value = 1; } setValueAtTime() {} linearRampToValueAtTime() {}
  exponentialRampToValueAtTime() {} cancelScheduledValues() {} setTargetAtTime() {} }
class FakeNode {
  constructor() {
    this.gain = new FakeParam(); this.frequency = new FakeParam(); this.Q = new FakeParam();
    this.detune = new FakeParam(); this.playbackRate = new FakeParam();
    this.type = 'sine'; this.buffer = null; this.loop = false;
  }
  connect() { return new FakeNode(); } disconnect() {} start() {} stop() {}
}
class FakeAudioCtx {
  constructor() { this.currentTime = 0; this.state = 'running'; this.destination = new FakeNode(); this.sampleRate = 44100; }
  createGain() { return new FakeNode(); } createOscillator() { return new FakeNode(); }
  createBiquadFilter() { return new FakeNode(); } createBufferSource() { return new FakeNode(); }
  createDynamicsCompressor() { return new FakeNode(); } createWaveShaper() { return new FakeNode(); }
  createStereoPanner() { return new FakeNode(); } createDelay() { return new FakeNode(); }
  createBuffer(a, n) { return { getChannelData: () => new Float32Array(n), length: n }; }
  resume() { return Promise.resolve(); } close() { return Promise.resolve(); }
}

const memoria = new Map();
const win = {
  document: doc, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1,
  addEventListener: noop, removeEventListener: noop,
  requestAnimationFrame: () => 0, cancelAnimationFrame: noop,
  setTimeout: () => 0, clearTimeout: noop, setInterval: () => 0, clearInterval: noop,
  performance: { now: () => Date.now() },
  localStorage: {
    getItem: k => (memoria.has(k) ? memoria.get(k) : null),
    setItem: (k, v) => memoria.set(k, String(v)),
    removeItem: k => memoria.delete(k), clear: () => memoria.clear()
  },
  AudioContext: FakeAudioCtx, webkitAudioContext: FakeAudioCtx,
  matchMedia: () => ({ matches: false, addEventListener: noop, addListener: noop }),
  navigator: { userAgent: 'node', maxTouchPoints: 0, clipboard: null },
  btoa: s => Buffer.from(s, 'binary').toString('base64'),
  atob: s => Buffer.from(s, 'base64').toString('binary'),
  console, Math, Date, JSON, Set, Map, Array, Object, String, Number, Boolean,
  Float32Array, Uint8ClampedArray, Uint32Array, Promise, Error, isNaN, isFinite,
  parseInt, parseFloat, encodeURIComponent, decodeURIComponent, escape: s => s, unescape: s => s
};
win.window = win; win.globalThis = win; win.self = win;

const ctx = vm.createContext(win);
vm.runInContext(js, ctx, { filename: 'orbita.js' });

export const O = win.ORBITA;
export const IN = vm.runInContext('IN', ctx);

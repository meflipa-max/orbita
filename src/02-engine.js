/* ═══════════════════════════════════════════════════════════════
   ORBITA — motore: stato, salvataggio, audio, input, entità.
   ═══════════════════════════════════════════════════════════════ */

const ARENA = 1700;              /* semilato dell'arena */
const app = $('#app'), cv = $('#cv'), ctx = cv.getContext('2d', { alpha: false });
let W = 800, H = 600, DPR = 1;

function resize() {
  /* un viewport nullo (scheda nascosta, transizioni della barra del browser) azzererebbe il canvas */
  W = Math.max(1, app.clientWidth); H = Math.max(1, app.clientHeight);
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  const budget = 2400000;
  if (W * H * dpr * dpr > budget) dpr = Math.max(1, Math.sqrt(budget / (W * H)));
  DPR = dpr;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => { resize(); setTimeout(resize, 260); });
/* su mobile la barra del browser cambia altezza dopo il caricamento e l'evento
   'resize' della finestra non sempre scatta: visualViewport sì */
if (window.visualViewport) {
  visualViewport.addEventListener('resize', resize);
  visualViewport.addEventListener('scroll', resize);
}

/* ── salvataggio ──────────────────────────────────────────────
   localStorage non è garantito: è bloccato nelle URL data:, in alcuni
   contesti file:// e in navigazione privata — e in quei casi lancia già
   sull'accesso alla proprietà, non solo in lettura. Senza rete di
   sicurezza i progressi sparirebbero in silenzio, che per un gioco
   costruito sulla progressione è il peggior modo di fallire.            */
const SAVEKEY = 'orbita.save.v1';
const DEFAULT_SAVE = { shards: 0, meta: {}, chars: ['vega'], char: 'vega', best: 0, bestKills: 0, wins: 0, runs: 0, sfx: 1, mus: 1, seen: 0, asc: 0, ascSel: 0, sfide: [] };
let SAVE = Object.assign({}, DEFAULT_SAVE);
let STORE_OK = false;            /* la memoria del browser è utilizzabile? */
const MEM = {};                  /* ripiego: dura quanto la scheda aperta */

function probeStore() {
  try {
    const k = '__orbita_probe';
    localStorage.setItem(k, '1');
    const ok = localStorage.getItem(k) === '1';
    localStorage.removeItem(k);
    STORE_OK = ok;
  } catch (e) { STORE_OK = false; }
  return STORE_OK;
}
function storeGet(k) {
  if (STORE_OK) { try { return localStorage.getItem(k); } catch (e) { STORE_OK = false; } }
  return k in MEM ? MEM[k] : null;
}
function storeSet(k, v) {
  MEM[k] = v;
  if (STORE_OK) { try { localStorage.setItem(k, v); return true; } catch (e) { STORE_OK = false; } }
  return false;
}

function sanitizeSave(o) {
  const s = Object.assign({}, DEFAULT_SAVE, o || {});
  if (!Array.isArray(s.chars) || !s.chars.length) s.chars = ['vega'];
  s.chars = s.chars.filter(id => CHARS.some(c => c.id === id));
  if (!s.chars.length) s.chars = ['vega'];
  if (!s.meta || typeof s.meta !== 'object' || Array.isArray(s.meta)) s.meta = {};
  if (!Array.isArray(s.sfide)) s.sfide = [];
  s.sfide = s.sfide.filter(id => SFIDE.some(x => x.id === id));
  if (s.chars.indexOf(s.char) < 0) s.char = s.chars[0];
  s.asc = Math.min(s.asc | 0, ASC.length - 1);
  s.ascSel = Math.min(Math.max(s.ascSel | 0, 0), s.asc);
  for (const k of ['shards', 'best', 'bestKills', 'wins', 'runs', 'asc', 'ascSel']) {
    const n = Number(s[k]); s[k] = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  }
  return s;
}
function loadSave() {
  probeStore();
  try {
    const raw = storeGet(SAVEKEY);
    SAVE = sanitizeSave(raw ? JSON.parse(raw) : null);
  } catch (e) { SAVE = sanitizeSave(null); }
}
function storeSave() { try { storeSet(SAVEKEY, JSON.stringify(SAVE)); } catch (e) { } }

/* codice di backup: l'unico modo di non perdere i progressi dove il
   browser non concede memoria, e di spostarli fra dispositivi */
function exportSave() {
  try { return btoa(unescape(encodeURIComponent(JSON.stringify(SAVE)))).replace(/=+$/, ''); }
  catch (e) { return ''; }
}
function importSave(code) {
  try {
    const s = (code || '').trim().replace(/\s+/g, '');
    if (!s) return false;
    const json = decodeURIComponent(escape(atob(s + '==='.slice(0, (4 - s.length % 4) % 4))));
    const o = JSON.parse(json);
    /* un array o un oggetto senza nessuna chiave nota non è un salvataggio:
       meglio dire "codice non valido" che annunciare un ripristino finto */
    if (!o || typeof o !== 'object' || Array.isArray(o)) return false;
    if (!['shards', 'meta', 'chars', 'best', 'wins'].some(k => k in o)) return false;
    SAVE = sanitizeSave(o); storeSave(); return true;
  } catch (e) { return false; }
}
const mlv = id => SAVE.meta[id] | 0;

/* ── audio procedurale ──────────────────────────────────────── */
const AU = {
  ctx: null, master: null, sfxG: null, musG: null, noise: null, ready: false,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    try { this.ctx = new C(); } catch (e) { return; }
    const c = this.ctx;
    /* Limitatore sul bus principale: con dodici rune che sparano insieme
       le somme saturavano e il mix diventava una poltiglia distorta. */
    this.comp = c.createDynamicsCompressor();
    this.comp.threshold.value = -14; this.comp.knee.value = 26;
    this.comp.ratio.value = 9; this.comp.attack.value = .004; this.comp.release.value = .22;
    this.comp.connect(c.destination);
    this.master = c.createGain(); this.master.gain.value = .9; this.master.connect(this.comp);
    this.sfxG = c.createGain(); this.sfxG.gain.value = SAVE.sfx ? .30 : 0; this.sfxG.connect(this.master);
    this.musG = c.createGain(); this.musG.gain.value = SAVE.mus ? .26 : 0; this.musG.connect(this.master);
    const len = c.sampleRate * .5, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf; this.ready = true;
    this.mNext = c.currentTime + .1; this.mStep = 0;
  },
  vol() { if (!this.ready) return; this.sfxG.gain.value = SAVE.sfx ? .30 : 0; this.musG.gain.value = SAVE.mus ? .26 : 0; },
  tone(f, d, type, gain, f2, dest) {
    if (!this.ready) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + d);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + .008);
    g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g); g.connect(dest || this.sfxG); o.start(t); o.stop(t + d + .02);
  },
  burst(d, gain, freq, q) {
    if (!this.ready) return;
    const c = this.ctx, t = c.currentTime;
    const s = c.createBufferSource(); s.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1;
    const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    s.connect(f); f.connect(g); g.connect(this.sfxG); s.start(t); s.stop(t + d);
  },
  /* effetti — con limitatore per non saturare durante le raffiche */
  _last: {},
  play(k) {
    if (!this.ready || !SAVE.sfx) return;
    /* Griglia anti-mitraglia: senza, con l'anello pieno si sovrappongono
       decine di suoni al secondo e la musica sparisce sotto il rumore. */
    const t = this.ctx.currentTime, gate = { shoot: .10, hit: .07, kill: .085, pick: .075, crit: .09 }[k];
    if (gate) { if (t - (this._last[k] || 0) < gate) return; this._last[k] = t; }
    switch (k) {
      case 'shoot': this.tone(620 + crand(80), .07, 'triangle', .07, 300); break;
      case 'hit': this.burst(.05, .09, 2000, 1.4); break;
      case 'kill': this.burst(.13, .13, 900, .8); this.tone(180, .1, 'sawtooth', .045, 60); break;
      case 'crit': this.tone(1180, .1, 'square', .1, 700); this.burst(.08, .12, 3200, 2); break;
      case 'hurt': this.tone(160, .26, 'sawtooth', .2, 52); this.burst(.18, .16, 420, .7); break;
      case 'pick': this.tone(880 + crand(200), .06, 'sine', .09, 1300); break;
      case 'level': [0, 4, 7, 12].forEach((n, i) => setTimeout(() => this.tone(440 * Math.pow(2, n / 12), .3, 'triangle', .12), i * 62)); break;
      case 'boss': this.tone(70, 1.4, 'sawtooth', .26, 42); this.burst(.9, .2, 200, .5); break;
      case 'blast': this.burst(.34, .26, 320, .5); this.tone(120, .34, 'sawtooth', .16, 40); break;
      case 'ui': this.tone(760, .05, 'square', .05, 640); break;
      case 'buy': this.tone(520, .09, 'triangle', .12, 780); setTimeout(() => this.tone(780, .16, 'triangle', .1, 1040), 70); break;
      case 'die': this.tone(220, 1.1, 'sawtooth', .22, 40); this.burst(.9, .18, 260, .4); break;
      case 'awake': [0, 7, 12, 19].forEach((n, i) => setTimeout(() => this.tone(330 * Math.pow(2, n / 12), .55, 'sawtooth', .09), i * 55)); break;
    }
  },
  /* ── musica generativa ──────────────────────────────────────
     Quattro strati che entrano con l'intensità: cassa, basso, arpeggio, pad.
     La progressione di accordi la tiene viva per venti minuti; con un
     guardiano in campo passa a una cadenza tesa e più veloce.            */
  mNext: 0, mStep: 0, mBoss: 0,
  PROG:  [0, -4, 3, -2],   /* La minore · Fa · Do · Sol */
  PROGB: [0, 1, 0, -5],    /* boss: La minore · Sib · La minore · Mi */
  ARP:   [0, 7, 12, 15, 12, 7, 3, 10],
  TRIAD: [0, 3, 7, 10],
  note(t, freq, dur, type, peak, cutoff, atk) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = cutoff; f.Q.value = 2;
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + (atk || .012));
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(this.musG);
    o.start(t); o.stop(t + dur + .02);
  },
  tick(intensity, boss) {
    if (!this.ready || !SAVE.mus) return;
    const c = this.ctx;
    /* Se la scheda è rimasta in secondo piano il sequencer è indietro di secondi:
       si riparte dalla battuta successiva invece di sparare tutte le note arretrate. */
    if (this.mNext < c.currentTime - .4) {
      this.mNext = c.currentTime + .05;
      this.mStep = Math.ceil(this.mStep / 16) * 16;
    }
    /* la transizione a/da modalità boss è morbida, non uno scatto */
    this.mBoss += ((boss ? 1 : 0) - this.mBoss) * .04;
    const bpm = 92 + intensity * 30 + this.mBoss * 14, spb = 60 / bpm / 4;
    let guard = 0;
    while (this.mNext < c.currentTime + .18 && guard++ < 48) {
      const t = this.mNext, s = this.mStep;
      const bar = (s / 16 | 0) % 4;
      const root = (this.mBoss > .5 ? this.PROGB : this.PROG)[bar];
      const hz = n => 55 * Math.pow(2, n / 12);

      if (s % 4 === 0) {                                   /* cassa */
        const o = c.createOscillator(), gg = c.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(125, t); o.frequency.exponentialRampToValueAtTime(40, t + .12);
        gg.gain.setValueAtTime(.5, t); gg.gain.exponentialRampToValueAtTime(.001, t + .16);
        o.connect(gg); gg.connect(this.musG); o.start(t); o.stop(t + .18);
      }
      if (s % 16 === 0 || s % 16 === 6 || s % 16 === 11) {  /* basso sulla fondamentale */
        this.note(t, hz(root), .5, 'sawtooth', .30, 400 + intensity * 260);
      }
      if (intensity > .10 && s % 2 === 0) {                /* arpeggio sull'accordo */
        const n = root + this.ARP[(s / 2 | 0) % 8] + 12;
        this.note(t, hz(n), .22, 'square', .062, 900 + intensity * 2800);
      }
      if (intensity > .34 && s % 16 === 0) {               /* pad: la triade tenuta */
        for (const iv of this.TRIAD)
          this.note(t, hz(root + iv + 24), spb * 15, 'sawtooth', .022, 700 + intensity * 900, .18);
      }
      if (intensity > .5 && s % 4 === 2) {                 /* charleston */
        const sN = c.createBufferSource(); sN.buffer = this.noise;
        const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7200;
        const gg = c.createGain(); gg.gain.setValueAtTime(.075, t); gg.gain.exponentialRampToValueAtTime(.001, t + .05);
        sN.connect(f); f.connect(gg); gg.connect(this.musG); sN.start(t); sN.stop(t + .06);
      }
      if (this.mBoss > .5 && s % 8 === 4) {                /* rullante: solo coi guardiani */
        const sN = c.createBufferSource(); sN.buffer = this.noise;
        const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = .7;
        const gg = c.createGain(); gg.gain.setValueAtTime(.17, t); gg.gain.exponentialRampToValueAtTime(.001, t + .12);
        sN.connect(f); f.connect(gg); gg.connect(this.musG); sN.start(t); sN.stop(t + .14);
      }
      this.mNext += spb; this.mStep++;
    }
    if (this.mNext < c.currentTime) this.mNext = c.currentTime + .05;
  }
};

/* ── input ──────────────────────────────────────────────────── */
const IN = { ax: 0, ay: 0, keys: {}, touchId: null, ox: 0, oy: 0 };
const joyEl = $('#joy'), joyNub = joyEl.querySelector('.nub');

addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  IN.keys[k] = 1;
  if (k === 'escape' || k === 'p') { e.preventDefault(); UI.togglePause(); }
  if (k === ' ' && G.state !== 'play') e.preventDefault();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
});
addEventListener('keyup', e => { IN.keys[e.key.toLowerCase()] = 0; });
addEventListener('blur', () => { IN.keys = {}; });

function joyStart(e) {
  if (G.state !== 'play' || IN.touchId !== null) return;
  IN.touchId = e.pointerId; IN.ox = e.clientX; IN.oy = e.clientY;
  joyEl.style.left = e.clientX + 'px'; joyEl.style.top = e.clientY + 'px';
  joyEl.classList.add('on'); joyNub.style.transform = 'translate(0,0)';
  /* può lanciare NotFoundError se il dito si stacca fra l'evento e il gestore:
     senza questa rete la levetta resterebbe agganciata a metà partita */
  try { cv.setPointerCapture && cv.setPointerCapture(e.pointerId); } catch (err) { }
}
function joyMove(e) {
  if (e.pointerId !== IN.touchId) return;
  let dx = e.clientX - IN.ox, dy = e.clientY - IN.oy;
  const d = Math.hypot(dx, dy), max = 46;
  if (d > max) {
    /* L'origine insegue il dito invece di restare inchiodata dov'era il
       primo tocco. Tenendo premuto a lungo la mano scivola: prima la
       levetta restava indietro e il dito finiva chissà dove, spesso in
       mezzo allo schermo. Così resta sempre sotto il pollice. */
    const f = 1 - max / d;
    IN.ox += dx * f; IN.oy += dy * f;
    joyEl.style.left = IN.ox + 'px'; joyEl.style.top = IN.oy + 'px';
    dx = dx / d * max; dy = dy / d * max;
  }
  joyNub.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
  const n = Math.min(d, max) / max, a = Math.atan2(dy, dx);
  const s = d < 6 ? 0 : n;
  IN.ax = Math.cos(a) * s; IN.ay = Math.sin(a) * s;
}
function joyEnd(e) {
  if (e.pointerId !== IN.touchId) return;
  IN.touchId = null; IN.ax = IN.ay = 0; joyEl.classList.remove('on');
}
cv.addEventListener('pointerdown', joyStart);
cv.addEventListener('pointermove', joyMove);
cv.addEventListener('pointerup', joyEnd);
cv.addEventListener('pointercancel', joyEnd);
cv.addEventListener('contextmenu', e => e.preventDefault());

function readInput() {
  let x = 0, y = 0;
  const k = IN.keys;
  if (k['a'] || k['arrowleft']) x -= 1;
  if (k['d'] || k['arrowright']) x += 1;
  if (k['w'] || k['arrowup']) y -= 1;
  if (k['s'] || k['arrowdown']) y += 1;
  if (x || y) { const m = Math.hypot(x, y); return { x: x / m, y: y / m }; }
  return { x: IN.ax, y: IN.ay };
}

/* ── griglia spaziale ───────────────────────────────────────── */
const GRID = {
  cs: 84, m: new Map(),
  clear() { this.m.clear(); },
  add(e) {
    const k = (Math.floor(e.x / this.cs)) + ':' + (Math.floor(e.y / this.cs));
    let a = this.m.get(k); if (!a) { a = []; this.m.set(k, a); } a.push(e);
  },
  near(x, y, r, out) {
    out.length = 0;
    const cs = this.cs;
    const x0 = Math.floor((x - r) / cs), x1 = Math.floor((x + r) / cs);
    const y0 = Math.floor((y - r) / cs), y1 = Math.floor((y + r) / cs);
    for (let i = x0; i <= x1; i++) for (let j = y0; j <= y1; j++) {
      const a = this.m.get(i + ':' + j);
      if (a) for (let n = 0; n < a.length; n++) out.push(a[n]);
    }
    return out;
  }
};
const _q = [];   /* buffer condiviso: SOLO per query che non infliggono danno */
/* hitEnemy può rientrare (catena, collasso): chi itera e colpisce usa un buffer proprio */

/* ── stato ──────────────────────────────────────────────────── */
const G = {
  state: 'title', t: 0, scale: 1, hitstop: 0,
  p: { x: 0, y: 0, vx: 0, vy: 0, r: 15, inv: 0, hurt: 0 },
  ring: [], slots: 6, ringRot: 0,
  passives: {}, char: CHARS[0],
  enemies: [], bullets: [], ebul: [], gems: [], zones: [], parts: [], floats: [], drops: [],
  cam: { x: 0, y: 0 }, shake: 0,
  level: 1, xp: 0, xpNeed: 12, kills: 0, shards: 0, dmgDone: 0, pending: 0,
  awaken: { fuoco: 0, gelo: 0, fulmine: 0, vuoto: 0, luce: 0 },
  spawnAcc: 0, eliteT: 26, bossIdx: 0, boss: null, revives: 0, healCd: 0, gemT: 1.5,
  starfield: [], flashT: 0, victory: false, q: 1, diff: 0, hint: 0, hintOff: 0, asc: ascMods(0), ascLv: 0, ev: null, evT: 70, fireBoost: 1,
  evoCount: 0, reorders: 0, awakeMax: 0, awakeAt: 0, lowHp: 0, pieno: 0, rocks: [], nodo: null, nodoK: null, biasX: 0, biasY: 0, rerolls: 2
};
const P = {}; /* statistiche derivate */

/* Livelli più rari e più pesanti: meglio poche scelte che contano
   di un flusso continuo di potenziamenti obbligatori. */
/* Curva cubica: i primi livelli restano rapidi — servono a riempire l'anello e
   ad accendere il primo Risveglio, che è il cuore del gioco — poi si impenna,
   così a metà partita ogni scelta pesa invece di essere l'ennesima di una fila. */
function xpFor(lv) { return Math.floor(9 + 7 * lv + lv * lv * .9 + lv * lv * lv * .12); }

/* ── statistiche derivate ───────────────────────────────────── */
function recalc() {
  const m = G.char.mod || {}, pv = G.passives;
  const lv = id => pv[id] | 0;
  /* i passivi crescono col ritmo delle rune: meno livelli, ma ognuno si sente */
  const base = 100 * (1 + .08 * mlv('nucleo')) * (m.hp || 1) * (1 + .18 * lv('vigore'));
  const oldMax = P.maxHp || base;
  P.maxHp = Math.round(base);
  if (P.hp === undefined) P.hp = P.maxHp; else if (P.maxHp > oldMax) P.hp += (P.maxHp - oldMax);
  P.spd = 196 * (1 + .04 * mlv('passo')) * (m.spd || 1) * (1 + .09 * lv('celerita'));
  P.dmgMul = (1 + .05 * mlv('furia')) * (m.dmg || 1) * (1 + .12 * lv('impeto'));
  P.cdMul = Math.max(.32, 1 - .10 * lv('frenesia'));
  P.areaMul = (m.area || 1) * (1 + .14 * lv('ampiezza'));
  P.pickR = 78 * (1 + .22 * mlv('calamita')) * (1 + .38 * lv('magnete'));
  P.xpMul = (1 + .08 * mlv('avidita')) * (m.xp || 1) * (1 + .20 * lv('sapienza'));
  P.crit = .05 + .03 * mlv('occhio') + (m.crit || 0) + .08 * lv('precisione') + [0, .12, .22, .35][G.awaken.luce];
  P.critD = 2 + (m.critD || 0);
  P.dr = Math.max(.35, 1 - .10 * lv('corazza'));
  P.regen = .3 * mlv('linfa') + .7 * lv('linfa');
  P.projMul = 1 + .22 * lv('vortice');
  P.shardMul = 1 + .12 * mlv('fortuna');
  P.hp = Math.min(P.hp, P.maxHp);
}

/* ── anello: risonanze e risvegli ───────────────────────────── */
function compat(a, b) { return a.el === b.el || a.el === 'iride' || b.el === 'iride'; }
function maxRun(ok, isE, n) {
  let all = true; for (let i = 0; i < n; i++) if (!ok[i]) { all = false; break; }
  if (all) { for (let i = 0; i < n; i++) if (isE[i]) return n; return 0; }
  let best = 0;
  for (let s = 0; s < n; s++) {
    if (!ok[s] || ok[(s - 1 + n) % n]) continue;
    let len = 0, has = false;
    for (let k = 0; k < n; k++) { const i = (s + k) % n; if (!ok[i]) break; len++; if (isE[i]) has = true; }
    if (has && len > best) best = len;
  }
  return best;
}
function recalcRing(announce) {
  const n = G.slots, R = G.ring;
  const rule = G.char && G.char.rule;
  for (let i = 0; i < n; i++) if (R[i]) R[i].res = 0;
  for (let i = 0; i < n; i++) {
    const a = R[i], b = R[(i + 1) % n];
    if (a && b && compat(a, b)) { a.res++; b.res++; }
  }
  /* Nadir: l'eco arriva anche un alloggiamento più in là, quindi si possono
     costruire anelli alternati che con chiunque altro non risuonerebbero */
  if (rule === 'ecoLunga' && n >= 5) {
    for (let i = 0; i < n; i++) {
      const a = R[i], b = R[(i + 2) % n];
      if (a && b && compat(a, b)) { a.res = Math.min(3, a.res + 1); b.res = Math.min(3, b.res + 1); }
    }
  }
  const ok = new Array(n), isE = new Array(n);
  for (const e of ELKEYS) {
    for (let i = 0; i < n; i++) {
      const r = R[i];
      ok[i] = !!r && (r.el === e || r.el === 'iride');
      isE[i] = !!r && r.el === e;
    }
    /* Lyra: quattro alloggiamenti soli, ma ogni runa vale doppia nella
       catena — due rune bastano per un Risveglio, tre per il secondo grado */
    /* dentro un Nodo, la catena del suo elemento conta una runa in più:
       due rune adiacenti bastano ad accendere il Risveglio finché resti lì */
    const run = maxRun(ok, isE, n) * (rule === 'anelloCorto' ? 2 : 1) + (G.nodo === e ? 1 : 0);
    const c0 = G.asc.chain;
    const tier = run >= c0 + 4 ? 3 : run >= c0 + 2 ? 2 : run >= c0 ? 1 : 0;
    const prev = G.awaken[e];
    G.awaken[e] = tier;
    if (tier && !G.awakeAt) G.awakeAt = G.t;
    if (announce && tier > prev) {
      UI.toast('RISVEGLIO · ' + EL[e].aw.toUpperCase(), EL[e].awd[tier - 1], EL[e].c);
      AU.play('awake'); G.shake = Math.max(G.shake, 9);
    }
  }
  /* traccia per le sfide: quanti Risvegli insieme, e se uno ha toccato il terzo grado */
  let acc = 0;
  for (const k of ELKEYS) { if (G.awaken[k]) acc++; if (G.awaken[k] >= 3) G.tier3 = 1; }
  if (acc > G.awakeMax) G.awakeMax = acc;
  recalc();
  UI.renderAwake();
}

/* Poche scelte, ma grosse: se i livelli arrivano più di rado,
   ognuno deve pesare di più. Unica manopola per tutta la progressione delle rune. */
const GROWTH = 1.35;
function runeStats(r) {
  const d = RUNES[r.id], g = d.g || {}, k = (r.lv - 1) * GROWTH, s = {};
  for (const key in d.base) s[key] = d.base[key] + (g[key] || 0) * k;
  s.dmg *= (1 + .3 * r.res) * P.dmgMul;
  if (s.cd !== undefined) s.cd = Math.max(.07, s.cd * P.cdMul);
  if (s.area !== undefined) s.area *= P.areaMul;
  if (s.spd !== undefined && d.tag !== 'faro' && d.tag !== 'orbitante') s.spd *= P.projMul;
  if (s.count !== undefined) s.count = Math.max(1, Math.floor(s.count));
  if (s.pierce !== undefined) s.pierce = Math.floor(s.pierce);
  s.el = d.el;
  if (G.nodo && G.nodo === d.el) s.dmg *= 1.35;   /* rune sintonizzate col Nodo */
  return s;
}

/* ── entità: creazione ──────────────────────────────────────── */
function addPart(x, y, vx, vy, life, size, color, kind) {
  if (G.parts.length > 460) return;
  G.parts.push({ x, y, vx, vy, life, max: life, size, c: color, k: kind || 0 });
}
function burstPart(x, y, n, color, spd, size, life) {
  n = Math.max(1, Math.round(n * G.q));
  for (let i = 0; i < n; i++) {
    const a = crand(TAU), s = crand(spd, spd * .25);
    addPart(x, y, Math.cos(a) * s, Math.sin(a) * s, crand(life || .55, (life || .55) * .4), crand(size || 3.4, 1.4), color);
  }
}
function addFloat(x, y, txt, color, big) {
  if (G.floats.length > 24) return;
  G.floats.push({ x: x + crand(14, -14), y, t: 0, txt, c: color, big: !!big });
}
function addGem(x, y, v, kind) {
  G.gems.push({ x, y, v, k: kind || 0, t: 0, vx: rand(90, -90), vy: rand(90, -90) });
}

function spawnEnemy(type, x, y, opts) {
  const d = MOBS[type], o = opts || {};
  /* nella vetrina del menu il tempo scorre ma la difficoltà resta ferma:
     altrimenti dopo dieci minuti sul titolo comparirebbero mostri corazzati */
  const mins = G.demo ? 1.1 : G.t / 60;
  /* proporzionato alla crescita del giocatore, ora più lenta */
  /* compensa i nemici ridotti a schermo: meno bersagli, ognuno più duro,
     così la pressione resta quella ma il campo si legge */
  const hpScale = (1 + mins * .37 + mins * mins * .023) * (o.hpMul || 1);
  const e = {
    type, x, y, vx: 0, vy: 0, r: d.r * (o.rMul || 1), c: d.c, shape: d.shape,
    hp: d.hp * hpScale * G.asc.hp, maxHp: d.hp * hpScale * G.asc.hp, spd: d.spd * (o.spdMul || 1) * (1 + mins * .012) * G.asc.spd,
    dmg: d.dmg * (1 + mins * .07), xp: d.xp * (o.xpMul || 1), flash: 0, slow: 0, slowT: 0,
    burn: 0, burnT: 0, froze: 0, elite: !!o.elite, boss: null, ph: rand(TAU),
    atk: d.ranged ? rand(d.ranged.cd) : 0, kb: 0, kbx: 0, kby: 0
  };
  if (o.elite) { e.hp = e.maxHp = e.maxHp * 4.2; e.xp *= 5; }
  G.enemies.push(e); return e;
}

function spawnBoss(def) {
  const a = rand(TAU), d = Math.max(W, H) * .62 + 120;
  const mins = G.t / 60;
  const e = {
    type: 'boss', x: clamp(G.p.x + Math.cos(a) * d, -ARENA + def.r, ARENA - def.r),
    y: clamp(G.p.y + Math.sin(a) * d, -ARENA + def.r, ARENA - def.r),
    vx: 0, vy: 0, r: def.r, c: def.c, shape: 'boss',
    hp: def.hp * (1 + G.diff * .55) * G.asc.hp, maxHp: def.hp * (1 + G.diff * .55) * G.asc.hp, spd: def.spd * G.asc.spd,
    dmg: def.dmg, xp: def.xp, flash: 0, slow: 0, slowT: 0, burn: 0, burnT: 0, froze: 0,
    elite: false, boss: def, ph: 0, atk: 2, atk2: 5, kb: 0, kbx: 0, kby: 0, charge: 0, cdir: 0
  };
  G.enemies.push(e); G.boss = e;
  UI.toast(def.n, 'Guardiano risvegliato', def.c);
  AU.play('boss'); G.shake = 16;
  return e;
}

/* ── proiettili ─────────────────────────────────────────────── */
function shoot(o) {
  o.life = o.life === undefined ? 2.4 : o.life;
  o.hit = null; o.t = 0;
  G.bullets.push(o);
}
function eShoot(x, y, vx, vy, dmg, r, c) {
  G.ebul.push({ x, y, vx, vy, dmg, r: r || 6, c: c || '#ff5b8a', t: rand(TAU), life: 3.6 });
}

/* ── danno ──────────────────────────────────────────────────── */
let HDEPTH = 0;
function hitEnemy(e, amount, opt) {
  if (e.hp <= 0 || HDEPTH > 6) return;
  HDEPTH++;
  try { _hit(e, amount, opt || {}); } finally { HDEPTH--; }
}
function _hit(e, amount, opt) {
  let dmg = amount, crit = false;
  if (!opt.noCrit && chance(P.crit)) { crit = true; dmg *= P.critD; }
  /* la statistica conta il danno utile, non l'eccesso (una bomba fa 99999 a testa) */
  G.dmgDone += Math.max(0, Math.min(dmg, e.hp));
  e.hp -= dmg;
  e.flash = .13;
  /* Un numero per ogni colpo, con otto rune e trecento nemici, era una
     bufera di cifre che copriva l'azione. Restano i colpi che dicono
     qualcosa: critici, bersagli importanti, e le mazzate vere. */
  if (crit || e.boss || e.elite || dmg >= e.maxHp * .22)
    addFloat(e.x, e.y - e.r - 4, Math.round(dmg), crit ? '#ffffff' : (opt.color || '#ffd2e4'), crit);
  if (crit) {
    AU.play('crit');
    /* Sirio: ogni critico accorcia la ricarica di tutto l'anello */
    if (G.char.rule === 'cadenza') for (const rr of G.ring) if (rr) rr.cd = Math.max(0, rr.cd - .04);
    burstPart(e.x, e.y, 4, '#fff', 190, 3, .28);
    if (G.awaken.luce && G.healCd <= 0) {
      G.healCd = .55; const h = [0, 1, 2, 3.5][G.awaken.luce];
      P.hp = Math.min(P.maxHp, P.hp + h); addFloat(G.p.x, G.p.y - 26, '+' + h, '#6ff2c4');
    }
  } else AU.play('hit');

  if (opt.kb) { e.kbx += (opt.kbx || 0) * opt.kb; e.kby += (opt.kby || 0) * opt.kb; e.kb = .18; }
  burstPart(e.x, e.y, crit ? 5 : 2, opt.color || e.c, 140, 2.6, .26);

  /* risvegli: regole globali del run */
  const aw = G.awaken;
  if (aw.fuoco && !opt.noStatus) { e.burn = Math.max(e.burn, [0, 5, 11, 24][aw.fuoco] * P.dmgMul); e.burnT = 3.2; }
  if (aw.gelo && !opt.noStatus) {
    e.slow = Math.max(e.slow, [0, .26, .42, .56][aw.gelo]); e.slowT = 2.2;
    const fc = [0, 0, .1, .2][aw.gelo];
    if (fc && !e.boss && chance(fc)) { e.froze = Math.max(e.froze, .9 + aw.gelo * .25); }
  }
  if (aw.fulmine && !opt.noChain && !opt.noStatus) {
    const ch = [0, .2, .34, .5][aw.fulmine];
    if (chance(ch)) {
      const jumps = [0, 1, 2, 4][aw.fulmine];
      chainFrom(e, dmg * .5, jumps, 250);
    }
  }

  if (e.hp <= 0) killEnemy(e, opt);
}

function chainFrom(src, dmg, jumps, range) {
  let cur = src; const used = new Set([cur]);
  for (let j = 0; j < jumps; j++) {
    GRID.near(cur.x, cur.y, range, _q);
    let best = null, bd = range * range;
    for (let i = 0; i < _q.length; i++) {
      const o = _q[i]; if (used.has(o) || o.hp <= 0) continue;
      const dd = (o.x - cur.x) * (o.x - cur.x) + (o.y - cur.y) * (o.y - cur.y);
      if (dd < bd) { bd = dd; best = o; }
    }
    if (!best) break;
    G.zones.push({ k: 'spark', x1: cur.x, y1: cur.y, x2: best.x, y2: best.y, t: 0, dur: .16, c: '#ffe14f' });
    used.add(best); cur = best;
    hitEnemy(best, dmg, { noChain: true, color: '#ffe14f', noCrit: true });
  }
}

function killEnemy(e, opt) {
  e.hp = 0; e.dead = true;
  G.kills++;
  AU.play('kill');
  burstPart(e.x, e.y, e.boss ? 60 : (e.elite ? 24 : 6), e.c, e.boss ? 420 : 230, e.boss ? 6 : 3.4, e.boss ? 1.1 : .48);
  G.zones.push({ k: 'ring', x: e.x, y: e.y, r0: e.r * .6, r1: e.r * (e.boss ? 8 : 2.6), t: 0, dur: e.boss ? .7 : .3, c: e.c });

  if (G.awaken.vuoto) {
    const f = [0, .3, .5, .8][G.awaken.vuoto];
    const rr = 78 + e.r * 2.2 + G.awaken.vuoto * 22;
    const dm = Math.min(e.maxHp * f, 420 * G.awaken.vuoto);
    G.zones.push({ k: 'ring', x: e.x, y: e.y, r0: 4, r1: rr, t: 0, dur: .34, c: '#b06bff' });
    const near = GRID.near(e.x, e.y, rr, []);
    for (let i = 0; i < near.length; i++) {
      const o = near[i]; if (o === e || o.hp <= 0) continue;
      if ((o.x - e.x) * (o.x - e.x) + (o.y - e.y) * (o.y - e.y) < rr * rr) hitEnemy(o, dm, { color: '#b06bff', noCrit: true, noChain: true, noStatus: G.awaken.vuoto < 3 });
    }
  }

  const n = e.boss ? 26 : e.elite ? 9 : 1;
  for (let i = 0; i < n; i++) addGem(e.x + rand(30, -30), e.y + rand(30, -30), Math.max(1, Math.round(e.xp / n)));
  if (e.elite || e.boss) { if (G.asc.noChest) addGem(e.x, e.y, 45, 1); else G.drops.push({ x: e.x, y: e.y, k: 'chest', t: 0 }); }
  else if (!G.asc.noDrops && chance(.012)) G.drops.push({ x: e.x, y: e.y, k: 'cuore', t: 0 });
  else if (!G.asc.noDrops && chance(.006)) G.drops.push({ x: e.x, y: e.y, k: 'bomba', t: 0 });
  if (chance(.05) || e.elite) addGem(e.x, e.y, e.boss ? 60 : e.elite ? 12 : 3, 1);

  if (e.type === 'scissore' && !e.small && !e.elite && G.enemies.length < 330) {
    for (let i = 0; i < 2; i++) {
      const c = spawnEnemy('scissore', e.x + rand(24, -24), e.y + rand(24, -24), { hpMul: .3, rMul: .62, spdMul: 1.3, xpMul: .5 });
      c.small = true;
    }
  }
  if (e.boss) {
    G.boss = null; G.shake = 26; G.hitstop = .16;
    UI.toast('ABBATTUTO', e.boss.n, e.boss.c);
    if (G.asc.noChest) addGem(e.x, e.y, 140, 1);
    else for (let i = 0; i < 2; i++) G.drops.push({ x: e.x + rand(60, -60), y: e.y + rand(60, -60), k: 'chest', t: 0 });
    if (e.boss.id === 'eclissi') winRun();
  }
}

function hurtPlayer(amount) {
  if (G.p.inv > 0 || G.state !== 'play') return;
  const d = amount * P.dr;
  P.hp -= d; G.p.inv = .62; G.p.hurt = .3;
  if (G.char.rule === 'contraccolpo')
    G.zones.push({ k: 'nova', x: G.p.x, y: G.p.y, r0: 14, r1: 210 * P.areaMul, t: 0, dur: .45, dmg: 45 * P.dmgMul, hit: new Set(), c: EL.fuoco.c, kb: 320 });
  G.shake = Math.max(G.shake, 8); G.flashT = .16;
  AU.play('hurt');
  burstPart(G.p.x, G.p.y, 10, '#ff3d6e', 200, 3.4, .5);
  if (P.hp <= 0) {
    if (G.revives > 0) {
      G.revives--; P.hp = P.maxHp * .6; G.p.inv = 2.4;
      UI.toast('RINASCITA', 'Il nucleo si riaccende', '#6ff2c4');
      G.zones.push({ k: 'ring', x: G.p.x, y: G.p.y, r0: 10, r1: 620, t: 0, dur: .6, c: '#6ff2c4' });
      const near = GRID.near(G.p.x, G.p.y, 620, []);
      for (let i = 0; i < near.length; i++) if (!near[i].boss) hitEnemy(near[i], 9999, { noCrit: true });
    } else { P.hp = 0; endRun(false); }
  }
}

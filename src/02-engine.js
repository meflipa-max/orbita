/* ═══════════════════════════════════════════════════════════════
   ORBITA — motore: stato, salvataggio, audio, input, entità.
   ═══════════════════════════════════════════════════════════════ */

const ARENA = 1700;              /* semilato dell'arena */
const app = $('#app'), cv = $('#cv'), ctx = cv.getContext('2d', { alpha: false });
let W = 800, H = 600, DPR = 1;

/* ── quanto mondo entra nello schermo ────────────────────────────
   Il mondo era disegnato uno a uno in pixel, quindi lo schermo non
   decideva quanto e' grande la grafica: decideva QUANTA ARENA esiste per
   te. Misurato: un desktop 1280x800 vede l'8,9% dell'arena, un telefono
   430x880 il 3,3% — un terzo. E infatti sul telefono si vedevano 3-9
   nemici alla volta contro i 16-35 del desktop: un bullet heaven con
   l'orda quasi tutta fuori campo, proprio sul dispositivo per cui il
   gioco e' fatto. Dalla parte opposta, un 4K vedeva quattro volte
   l'arena di un 1080p e la partita gli si apriva in mano.
   Adesso la telecamera si allarga o si stringe per tenere l'area di
   mondo confrontabile. Non del tutto: compensare per intero (esponente
   .5) rimpicciolirebbe le sagome sul telefono fino a renderle illeggibili,
   che e' il difetto opposto. L'esponente .28 e' il compromesso misurato -
   il telefono passa dal 37% al 66% del mondo che vede un desktop - e i
   contorni dei nemici e le scritte a terra si ispessiscono di 1/zoom per
   restare della stessa grandezza fisica. */
const AREA_RIF = 1050000;             /* il desktop di riferimento, 1280x800 */
function calcolaZoom() {
  G.zoom = clamp(Math.pow(W * H / AREA_RIF, .28), .74, 1.55);
  G.vw = W / G.zoom; G.vh = H / G.zoom;     /* il mondo visibile, in unita' di mondo */
}

function resize() {
  /* un viewport nullo (scheda nascosta, transizioni della barra del browser) azzererebbe il canvas */
  W = Math.max(1, app.clientWidth); H = Math.max(1, app.clientHeight);
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  const budget = 2400000;
  if (W * H * dpr * dpr > budget) dpr = Math.max(1, Math.sqrt(budget / (W * H)));
  DPR = dpr;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  calcolaZoom();
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
const DEFAULT_SAVE = {
  shards: 0, meta: {}, chars: ['vega'], char: 'vega', apertura: 'fuoco', skin: 'nucleo',
  best: 0, bestKills: 0, wins: 0, runs: 0, sfx: 1, mus: 1, seen: 0, asc: 0, ascSel: 0, sfide: [],
  /* quali rune sono entrate nel mazzo: vedi SBLOCCHI in 01-data */
  runes: RUNE_BASE.slice(),
  /* le reliquie comprate, i tre contratti in corso, il modo scelto */
  reliquie: [], contratti: [], modo: 'corsa',
  /* le ultime venti partite: è lo storico che si legge nell'Osservatorio ed
     è anche l'unica telemetria possibile in un gioco che non tocca la rete */
  storico: [],
  /* le prime volte già spiegate: vedi BRIEFING in 01-data */
  visti: [],
  /* versione del salvataggio: serve alle riparazioni una tantum, vedi
     sanitizeSave. Non è la versione del gioco, è quella dei DATI. */
  v: 2,
  /* la corsa del giorno: quale data, e il miglior risultato di oggi */
  giorno: { d: '', t: 0, k: 0, w: 0 }
};
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
  /* copia, non riferimento: senza questa riga un salvataggio senza 'meta'
     si portava dietro l'oggetto di DEFAULT_SAVE e comprare un potenziamento
     sporcava i valori predefiniti — cioe' l'azzeramento non azzerava. */
  if (!s.meta || typeof s.meta !== 'object' || Array.isArray(s.meta)) s.meta = {};
  else s.meta = Object.assign({}, s.meta);
  if (!Array.isArray(s.sfide)) s.sfide = [];
  s.sfide = s.sfide.filter(id => SFIDE.some(x => x.id === id));
  if (s.chars.indexOf(s.char) < 0) s.char = s.chars[0];
  if (!APERTURE.some(a => a.el === s.apertura)) s.apertura = 'fuoco';
  if (!SKINS.some(k => k.id === s.skin)) s.skin = 'nucleo';
  /* le rune sbloccate: le otto di partenza non si possono perdere, così un
     salvataggio vecchio (che non ha il campo) non resta senza mazzo */
  if (!Array.isArray(s.runes)) s.runes = [];
  s.runes = s.runes.filter(id => RUNEIDS.indexOf(id) >= 0);
  for (const id of RUNE_BASE) if (s.runes.indexOf(id) < 0) s.runes.push(id);
  if (!Array.isArray(s.reliquie)) s.reliquie = [];
  s.reliquie = s.reliquie.filter(id => RELIQUIE.some(r => r.id === id));
  if (!Array.isArray(s.contratti)) s.contratti = [];
  s.contratti = s.contratti.filter(id => CONTRATTI.some(c => c.id === id));
  if (!MODI.some(m => m.id === s.modo)) s.modo = 'corsa';
  if (!Array.isArray(s.visti)) s.visti = [];
  s.visti = s.visti.filter(id => PRIMEVOLTE.indexOf(id) >= 0);
  /* Riparazione una tantum. Per una versione la vetrina del menu — dove
     gira il gioco vero, gemme comprese — raccoglieva una scheggia da sola
     e segnava la lezione sulle particelle come imparata prima ancora che
     si toccasse Gioca. Il difetto è corretto (updateGems ora ignora la
     vetrina), ma la correzione non ripara i salvataggi che quel flag ce
     l'hanno già: e siccome prima della correzione anche azzerare i
     progressi lo faceva rimettere subito, chi ha provato quella versione
     non avrebbe visto l'indicazione MAI PIÙ. Qui si toglie una volta
     sola, e solo quello: gli altri flag li ha messi il gioco vero. */
  /* Si legge `o`, il salvataggio GREZZO, non `s`: Object.assign ha già
     riempito i campi mancanti coi valori predefiniti, quindi su `s` la
     versione risulterebbe sempre quella nuova e la riparazione non
     scatterebbe mai. */
  if (!o || (o.v | 0) < 2) {
    const k = s.visti.indexOf('gemme');
    if (k >= 0) s.visti.splice(k, 1);
  }
  s.v = 2;
  if (!Array.isArray(s.storico)) s.storico = [];
  s.storico = s.storico.filter(r => r && typeof r === 'object').slice(0, 20);
  if (!s.giorno || typeof s.giorno !== 'object' || Array.isArray(s.giorno)) s.giorno = { d: '', t: 0, k: 0, w: 0 };
  else s.giorno = Object.assign({ d: '', t: 0, k: 0, w: 0 }, s.giorno);
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
/* azzeramento: l'unico modo di ricominciare davvero da capo. Sta sotto al
   codice di backup apposta — chi vuole ripartire senza bruciare i progressi
   lo copia prima. Le preferenze audio non sono progressi: restano. */
function wipeSave() {
  const sfx = SAVE.sfx, mus = SAVE.mus;
  SAVE = sanitizeSave(null);
  SAVE.sfx = sfx; SAVE.mus = mus;
  storeSave();
}

/* ── la corsa in sospeso ──────────────────────────────────────
   Su un telefono una partita da venti minuti non finisce quando decidi
   tu: finisce quando arriva una telefonata, quando cambi scheda, quando
   Android sfratta la pagina per fare posto. Perdere quindici minuti di
   corsa per un messaggio e' il modo piu' rapido di far chiudere un gioco.
   Quindi la corsa si annota, e alla riapertura si riprende.
   Si annota il PROGRESSO, non il mondo: seme, modo, orologio, anello,
   passivi, vita, contatori. L'arena si rigenera identica dallo stesso
   seme (genRocks pesca dal flusso col seme), i nemici no — quelli
   ricompaiono al riavvio, e per non regalare un'arena sgombra a chi
   esce e rientra ne rimettiamo subito una quota (vedi riprendiCorsa).
   Sta in una chiave sua e non dentro SAVE: e' roba che dura un giorno,
   non deve gonfiare il codice di backup dei progressi.               */
const RUNKEY = 'orbita.run.v1';
function salvaCorsa() {
  if (G.state !== 'play' && G.state !== 'pause' && G.state !== 'level') return;
  if (G.demo || G.victory) return;
  try {
    const r = {
      v: 1, seed: G.seed >>> 0, modo: G.modo.id, char: G.char.id, asc: G.ascLv | 0,
      giorno: G.giornaliera ? 1 : 0, quando: Date.now(),
      t: G.t, level: G.level, xp: G.xp, xpNeed: G.xpNeed, kills: G.kills, shards: G.shards,
      dmg: G.dmgDone, diff: G.diff, ten: G.tenacia, bossIdx: G.bossIdx,
      hp: P.hp, rer: G.rerolls, riv: G.revives,
      ring: G.ring.map(x => (x ? { id: x.id, lv: x.lv, slot: x.slot } : null)),
      pas: G.passives,
      /* i contatori che pagano sfide e contratti: senza, riprendere
         cancellerebbe mezz'ora di obiettivi gia' guadagnati */
      bk: G.bossKills | 0, ml: G.maxLv | 0, t2: G.tier2 ? 1 : 0, t3: G.tier3 ? 1 : 0,
      evo: G.evoCount | 0, reo: G.reorders | 0, aM: G.awakeMax | 0, aA: G.awakeAt | 0,
      low: G.lowHp ? 1 : 0, pieno: G.pieno ? 1 : 0, ru: G.rerollUsati | 0,
      resp: G.respiro ? 1 : 0, lez: G.lezioneGemme | 0, sal: G.saldato | 0
    };
    storeSet(RUNKEY, JSON.stringify(r));
  } catch (e) { }
}
function leggiCorsa() {
  try {
    const raw = storeGet(RUNKEY);
    if (!raw) return null;
    const r = JSON.parse(raw);
    if (!r || r.v !== 1 || !Array.isArray(r.ring)) return null;
    if (!MODI.some(m => m.id === r.modo)) return null;
    if (SAVE.chars.indexOf(r.char) < 0) return null;
    /* una corsa di dieci secondi non vale la pena di riprenderla, e una
       di ieri l'altro non se la ricorda piu' nessuno */
    if (!(r.t > 25) || Date.now() - (r.quando || 0) > 3 * 24 * 3600e3) return null;
    return r;
  } catch (e) { return null; }
}
function scordaCorsa() {
  try { delete MEM[RUNKEY]; if (STORE_OK) localStorage.removeItem(RUNKEY); } catch (e) { }
}

const mlv = id => SAVE.meta[id] | 0;

/* Tre contratti sempre in corso. Si ripescano qui e non a fine partita,
   così un salvataggio vecchio ne trova tre alla prima apertura e non
   esiste lo stato «nessun obiettivo». Il sorteggio usa Math.random e non
   il flusso col seme: è roba di menu, non deve entrare nella simulazione. */
function pescaContratti() {
  if (!Array.isArray(SAVE.contratti)) SAVE.contratti = [];
  let cambiato = false;
  let giri = 0;
  while (SAVE.contratti.length < 3 && giri++ < 60) {
    const liberi = CONTRATTI.filter(c => SAVE.contratti.indexOf(c.id) < 0);
    if (!liberi.length) break;
    SAVE.contratti.push(liberi[(Math.random() * liberi.length) | 0].id);
    cambiato = true;
  }
  return cambiato;
}

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
  /* ── il pop ───────────────────────────────────────────────────
     Il suono di uccisione era sempre lo stesso: stessa nota, stesso
     rumore, dodici volte al secondo. Suoni identici ripetuti in fretta
     l'orecchio smette di sentirli come eventi e li fonde in un ronzio —
     e' letteralmente il contrario della soddisfazione, perche' la
     soddisfazione E' distinguere il singolo colpo.
     Due cambi. Primo, l'altezza CICLA su una pentatonica minore invece di
     stare ferma: a ritmo alto diventa un arpeggio, a ritmo basso un
     rintocco che sale. Ciclare invece di salire senza fine e' voluto —
     una scala che sale sempre, a venti uccisioni al secondo, si inchioda
     sull'acuto dopo un secondo e strilla per venti minuti.
     Secondo, quando cadono in molti nello stesso istante non suonano in
     venti: suona UN colpo piu' grosso e piu' basso. Meno rumore, piu'
     evento. */
  scala: [0, 3, 5, 7, 10, 12],
  /* Il pop parte SUBITO, nel fotogramma in cui il nemico muore: mezzo
     decimo di secondo di ritardo e la ricompensa si stacca dal gesto, che
     e' esattamente quello che la rende insoddisfacente. */
  pop(n, indice) {
    if (!this.ready || !SAVE.sfx) return;
    const t = this.ctx.currentTime;
    if (t - (this._last.pop || 0) < .062) return;   /* non piu' di sedici al secondo */
    this._last.pop = t;
    const semi = this.scala[indice % this.scala.length];
    const f = 430 * Math.pow(2, semi / 12);
    this.tone(f, .075, 'triangle', n > 1 ? .075 : .058, f * .38);
    this.burst(.055, .085, 1500 + semi * 55, 1.3);
  },
  /* La raffica e' un secondo strato, non un sostituto: si aggiunge sopra i
     pop quando ne cadono tanti ravvicinati (una Nova, una cascata di
     implosioni). Ha una pausa obbligata fra una e l'altra, se no a ritmo
     alto diventerebbe un tamburo continuo e smetterebbe di voler dire
     "adesso e' successo qualcosa". */
  raffica(forza) {
    if (!this.ready || !SAVE.sfx) return;
    const v = clamp(forza, .5, 1.35);
    this.tone(124, .28, 'sine', .15 * v, 42);
    this.tone(310, .13, 'triangle', .06 * v, 148);
    this.burst(.18, .11 * v, 2000, .9);
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
    const t = this.ctx.currentTime, gate = { shoot: .10, hit: .07, pick: .075, crit: .09 }[k];
    if (gate) { if (t - (this._last[k] || 0) < gate) return; this._last[k] = t; }
    switch (k) {
      case 'shoot': this.tone(620 + crand(80), .07, 'triangle', .07, 300); break;
      case 'hit': this.burst(.05, .09, 2000, 1.4); break;
      /* 'kill' non si usa piu': la morte di un nemico passa da AU.pop,
         raccolta una volta per fotogramma da flushUccisioni */
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
const JOY_MAX = 46, JOY_GIOCO = 28;
function joyMove(e) {
  if (e.pointerId !== IN.touchId) return;
  let dx = e.clientX - IN.ox, dy = e.clientY - IN.oy;
  const d = Math.hypot(dx, dy), max = JOY_MAX;
  if (d > max + JOY_GIOCO) {
    /* L'origine insegue il dito invece di restare inchiodata dov'era il
       primo tocco: tenendo premuto a lungo la mano scivola, e la levetta
       restava indietro. Ma inseguirlo pixel per pixel era peggio in un
       altro modo: oltre il massimo spingere non fa andare piu' veloce, solo
       che nessuno lo sa, quindi si spinge - e la base seguiva, trascinando
       il dito fino in mezzo allo schermo. Adesso c'e' un margine: la
       spinta in eccesso non sposta niente, la base si muove solo quando ti
       stai davvero riposizionando. */
    const f = 1 - (max + JOY_GIOCO) / d;
    IN.ox += dx * f; IN.oy += dy * f;
    joyEl.style.left = IN.ox + 'px'; joyEl.style.top = IN.oy + 'px';
    dx = e.clientX - IN.ox; dy = e.clientY - IN.oy;
  }
  const dd = Math.hypot(dx, dy) || 1;
  if (dd > max) { dx = dx / dd * max; dy = dy / dd * max; }
  joyNub.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
  const n = Math.min(d, max) / max, a = Math.atan2(dy, dx);
  const s = d < 6 ? 0 : n;
  IN.ax = Math.cos(a) * s; IN.ay = Math.sin(a) * s;
  /* a fondo corsa la levetta si accende e smette di sbiadire: e' l'unico
     modo che ha il giocatore di sapere che ha finito la corsa */
  joyEl.classList.toggle('max', d >= max);
}
function joyEnd(e) {
  if (e.pointerId !== IN.touchId) return;
  IN.touchId = null; IN.ax = IN.ay = 0; joyEl.classList.remove('on'); joyEl.classList.remove('max');
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
  passives: {}, char: CHARS[0], skin: SKINS[0],
  enemies: [], bullets: [], ebul: [], gems: [], zones: [], parts: [], floats: [], drops: [],
  cam: { x: 0, y: 0 }, shake: 0,
  level: 1, xp: 0, xpNeed: 12, kills: 0, shards: 0, dmgDone: 0, pending: 0,
  awaken: { fuoco: 0, gelo: 0, fulmine: 0, vuoto: 0, luce: 0 },
  spawnAcc: 0, eliteT: 26, bossIdx: 0, boss: null, bosses: [], eliteHint: 0, revives: 0, healCd: 0, gemT: 1.5, cadT: 0, dissolto: 0, maxT: 0, maxHint: 0,
  starfield: [], flashT: 0, flashC: HPC, victory: false, q: 1, diff: 0, hint: 0, hintOff: 0, asc: ascMods(0), ascLv: 0, ev: null, evT: 70, fireBoost: 1,
  evoCount: 0, reorders: 0, awakeMax: 0, awakeAt: 0, lowHp: 0, pieno: 0, rocks: [], nodo: null, nodoK: null, biasX: 0, biasY: 0, rerolls: 2,
  /* il direttore: vedi updateSpawns. raggio = a che distanza muoiono i
     nemici, tenacia = quanto sono duri perche' arrivino piu' vicino.
     chiarezza = quanto spazio visivo resta agli effetti: vedi 04-render. */
  raggio: 0, tenacia: 1, chiarezza: 1, kps: 0, kAcc: 0,
  /* vedi calcolaZoom: quanto mondo entra nello schermo di questo dispositivo */
  zoom: 1, vw: 1280, vh: 800,
  /* il colpo di grazia: vedi flushUccisioni in 06-main */
  raffN: 0, raffX: 0, raffY: 0, raffR: 0, raffC: '#ffffff', combo: 0, comboT: 0, raffFin: 0, raffCd: 0,
  /* che partita è questa: il modo dice quanto dura e con quanti guardiani,
     la congiunzione è la regola sorteggiata dal seme (vedi 01-data). `cong`
     è la carta, `cg` sono i suoi modificatori già fusi coi valori neutri,
     così chi li legge non deve sapere se una congiunzione c'è o no. */
  modo: MODI[0], cong: CONGIUNZIONI[0], cg: congMods(null),
  /* l'ordine dei guardiani di QUESTA partita: numeri dallo slot, identità e
     pattern rimescolati. Vedi rosterGuardiani(). */
  roster: BOSSES,
  /* tracce per sblocchi e contratti */
  /* la ripresa al rallentatore dopo una schermata, e la prima volta da
     spiegare che aspetta di essere mostrata (vedi 06-main) */
  ripresa: 0, briefing: null, elAnello: new Set(),
  /* 0 = non spiegato, 1 = spiegato ma non ancora raccolto, 2 = imparato */
  lezioneGemme: 0,
  bossKills: 0, maxLv: 1, tier2: 0, rerollUsati: 0, respiro: 0, giornaliera: false,
  runaNuova: null, contrattiFatti: [], sfideNuove: []
};
const P = {}; /* statistiche derivate */

/* Livelli più rari e più pesanti: meglio poche scelte che contano
   di un flusso continuo di potenziamenti obbligatori. */
/* Curva cubica: i primi livelli restano rapidi — servono a riempire l'anello e
   ad accendere il primo Risveglio, che è il cuore del gioco — poi si impenna,
   così a metà partita ogni scelta pesa invece di essere l'ennesima di una fila. */
/* Quanta esperienza per salire. La curva vecchia era ripida in fondo e
   piatta all'inizio, e dava il ritmo sbagliato: un livello ogni quindici
   secondi per tutta la prima meta' della partita - una schermata di carte
   in mezzo all'azione di continuo - e poi uno ogni sessanta nella seconda,
   quando si secca. Questa e' piu' cara nei primi livelli e piu' economica
   dal ventesimo in su: meno interruzioni quando sono troppe, e qualcosa da
   scegliere ancora quando prima non arrivava piu' niente. */
/* I primi due livelli restano a buon mercato: nei primi secondi devi
   sbloccare qualcosa, non guardare una barra. Da li' in poi sale piu'
   ripida di prima, ed e' li' che stavano le interruzioni di troppo. */
function xpFor(lv) { return Math.floor(4 + 13 * lv + lv * lv * 3 + lv * lv * lv * .07); }

/* ── statistiche derivate ───────────────────────────────────── */
function recalc() {
  const m = G.char.mod || {}, pv = G.passives;
  const lv = id => pv[id] | 0;
  /* i passivi crescono col ritmo delle rune: meno livelli, ma ognuno si sente */
  const base = 100 * (1 + .08 * mlv('nucleo')) * (m.hp || 1) * (1 + .18 * lv('vigore'));
  const oldMax = P.maxHp || base;
  P.maxHp = Math.round(base);
  if (P.hp === undefined) P.hp = P.maxHp; else if (P.maxHp > oldMax) P.hp += (P.maxHp - oldMax);
  P.spd = 196 * (1 + .04 * mlv('passo')) * (m.spd || 1) * (1 + .09 * lv('celerita')) * G.cg.pspd;
  /* Coro di stelle: i Risvegli pagano due volte — la loro regola, e un
     bonus secco per averli accesi. È la reliquia che premia chi progetta
     l'anello per averne due invece di uno solo grosso. */
  let coro = 1;
  if (hasRel('coro')) { let n = 0; for (const k of ELKEYS) if (G.awaken[k]) n++; coro = 1 + .07 * n; }
  P.dmgMul = (1 + .05 * mlv('furia')) * (1 + .015 * mlv('dominio')) * (m.dmg || 1) * (1 + .12 * lv('impeto')) * G.cg.dmg * coro;
  P.cdMul = Math.max(.32, 1 - .10 * lv('frenesia'));
  P.areaMul = (m.area || 1) * (1 + .14 * lv('ampiezza'));
  P.pickR = 78 * (1 + .22 * mlv('calamita')) * (1 + .38 * lv('magnete'));
  /* nell'Incursione si sale di livello quasi il doppio più in fretta: la
     corsa dura otto minuti invece di venti, e senza questo la build non
     farebbe in tempo a esistere prima dell'ultimo guardiano */
  P.xpMul = (1 + .08 * mlv('avidita')) * (m.xp || 1) * (1 + .20 * lv('sapienza')) * (G.modo.xp || 1);
  P.crit = .05 + .03 * mlv('occhio') + (m.crit || 0) + .08 * lv('precisione') + [0, .12, .22, .35][G.awaken.luce];
  P.critD = 2 + (m.critD || 0);
  P.dr = Math.max(.35, 1 - .10 * lv('corazza'));
  P.regen = .3 * mlv('linfa') + .7 * lv('linfa');
  P.projMul = 1 + .22 * lv('vortice');
  P.shardMul = (1 + .12 * mlv('fortuna')) * G.cg.shard;
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
    /* Eco toglie una runa al requisito, ma mai sotto due: a uno ogni runa
       isolata accenderebbe il suo Risveglio e la risonanza smetterebbe di
       essere una decisione. */
    const c0 = Math.max(2, G.asc.chain + G.cg.chain);
    const tier = run >= c0 + 4 ? 3 : run >= c0 + 2 ? 2 : run >= c0 ? 1 : 0;
    const prev = G.awaken[e];
    G.awaken[e] = tier;
    if (tier && !G.awakeAt) G.awakeAt = G.t;
    if (announce && tier > prev) {
      UI.toast('RISVEGLIO · ' + EL[e].aw.toUpperCase(), EL[e].awd[tier - 1], EL[e].c);
      AU.play('awake'); G.shake = Math.max(G.shake, 9);
    }
  }
  /* Quali elementi hai davvero nell'anello. Serve al terreno: un Nodo si
     accende solo se e' sintonizzato su un elemento che stai giocando
     (vedi drawRocce in 04-render). L'Iride vale come tutti, perche' in
     campo si comporta come i suoi vicini. */
  /* L'Iride NON conta qui, anche se conta per le catene. Il Nodo dà due
     cose: +35% di danno alle rune del suo elemento, e una runa in più alla
     catena di quell'elemento. Il +35% guarda `d.el` (vedi runeStats), e
     per l'Iride quello vale 'iride', mai un elemento vero: quindi un
     anello con la sola Iride vedeva TUTTI i Nodi accesi e non prendeva
     niente da nessuno — e anche la catena resta a zero, perché maxRun
     vuole almeno una runa dell'elemento vero. «Acceso» dev'essere vero. */
  G.elAnello.clear();
  for (let i = 0; i < n; i++) {
    const r = R[i];
    if (r && r.el !== 'iride') G.elAnello.add(r.el);
  }
  /* traccia per le sfide: quanti Risvegli insieme, e se uno ha toccato il terzo grado */
  let acc = 0;
  for (const k of ELKEYS) { if (G.awaken[k]) acc++; if (G.awaken[k] >= 2) G.tier2 = 1; if (G.awaken[k] >= 3) G.tier3 = 1; }
  if (acc > G.awakeMax) G.awakeMax = acc;
  /* il livello più alto toccato da una runa in questa partita: serve a uno
     degli sblocchi, e va letto qui perché una runa dissolta sparisce */
  for (let i = 0; i < n; i++) if (R[i] && R[i].lv > G.maxLv) G.maxLv = R[i].lv;
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
  /* cchance e non chance: le scintille sono cosmetiche e non devono
     consumare il flusso col seme, o due partite con lo stesso numero
     divergerebbero fra un telefono e un desktop */
  if (G.chiarezza < 1 && !cchance(G.chiarezza)) return;
  G.parts.push({ x, y, vx, vy, life, max: life, size, c: color, k: kind || 0 });
}
/* Detriti che vanno DA QUALCHE PARTE. Un'esplosione radiale e' una palla
   che si gonfia; una schizzata nella direzione del colpo si legge come
   impatto — sai da dove e' arrivata la botta. Il cono e' largo (mezzo
   giro), non un getto: deve sembrare che la sagoma si sfaldi, non che
   sputi. */
function burstDir(x, y, n, color, spd, size, life, dx, dy) {
  n = Math.max(1, Math.round(n * G.q));
  const a0 = (dx || dy) ? Math.atan2(dy, dx) : crand(TAU);
  for (let i = 0; i < n; i++) {
    const a = a0 + crand(1.5, -1.5), sp = crand(spd, spd * .3);
    addPart(x, y, Math.cos(a) * sp, Math.sin(a) * sp, crand(life, life * .4), crand(size, 1.4), color);
  }
}
function burstPart(x, y, n, color, spd, size, life) {
  n = Math.max(1, Math.round(n * G.q));
  for (let i = 0; i < n; i++) {
    const a = crand(TAU), s = crand(spd, spd * .25);
    addPart(x, y, Math.cos(a) * s, Math.sin(a) * s, crand(life || .55, (life || .55) * .4), crand(size || 3.4, 1.4), color);
  }
}
function addFloat(x, y, txt, color, big) {
  /* i numeri che volano sono la cosa che l'occhio insegue per istinto, e
     in mezzo alla folla sono quella che serve meno: sotto pressione ne
     restano pochi, e solo i piu' grossi */
  if (G.floats.length > (G.chiarezza < .7 && !big ? 8 : 24)) return;
  G.floats.push({ x: x + crand(14, -14), y, t: 0, txt, c: color, big: !!big });
}
function addGem(x, y, v, kind) {
  G.gems.push({ x, y, v, k: kind || 0, t: 0, vx: rand(90, -90), vy: rand(90, -90) });
}

function spawnEnemy(type, x, y, opts) {
  const d = MOBS[type], o = opts || {};
  /* nella vetrina del menu il tempo scorre ma la difficoltà resta ferma:
     altrimenti dopo dieci minuti sul titolo comparirebbero mostri corazzati */
  /* `tempra` comprime il calendario dei contenuti nell'Incursione: a otto
     minuti reali i nemici sono duri quanto al tredicesimo di una Corsa,
     perché anche tu ci arrivi con la build del tredicesimo. */
  const mins = G.demo ? 1.1 : G.t * G.modo.tempra / 60;
  /* proporzionato alla crescita del giocatore, ora più lenta */
  /* compensa i nemici ridotti a schermo: meno bersagli, ognuno più duro,
     così la pressione resta quella ma il campo si legge */
  /* La tenacia decisa dal direttore moltiplica la vita: e' cosi' che un
     nemico sopravvive abbastanza da arrivarti addosso invece di sciogliersi
     a mezzo schermo. L'esperienza sale con lo stesso fattore, perche' il
     ritmo di comparsa scende della stessa quota: meno nemici, ognuno che
     conta di piu', stessa esperienza al secondo. */
  const ten = o.grezzo ? 1 : G.tenacia;
  const hpScale = (1 + mins * .37 + mins * mins * .023) * (o.hpMul || 1) * ten;
  const e = {
    type, x, y, vx: 0, vy: 0, r: d.r * (o.rMul || 1), c: d.c, shape: d.shape,
    /* La crescita di velocita' ha un tetto. Senza, al minuto 20 lo Spettro
       arrivava esattamente ai 196 px/s della tua andatura base e al minuto
       30 la superava (215): da li' in poi, senza Celerita', non potevi piu'
       staccarti da niente — cioe' Celerita' smetteva di essere una scelta e
       diventava una tassa, e un passivo obbligatorio e' una carta in meno di
       varieta' a ogni partita. Il tetto tiene il piu' veloce sotto la tua
       andatura base; la difficolta' la fa il direttore, non la corsa. */
    hp: d.hp * hpScale * G.asc.hp * G.cg.hp, maxHp: d.hp * hpScale * G.asc.hp * G.cg.hp, spd: d.spd * (o.spdMul || 1) * Math.min(1.22, 1 + mins * .012) * G.asc.spd * G.cg.spd,
    /* Un nemico temprato picchia anche piu' forte, non solo piu' a lungo:
       senza questo una build che si cura 9 vite al secondo pareggiava il
       contatto e restava in stallo per sempre a vita piena. */
    dmg: d.dmg * (1 + mins * .07) * (1 + (ten - 1) * .12), xp: d.xp * (o.xpMul || 1) * ten, flash: 0, slow: 0, slowT: 0,
    ten,
    burn: 0, burnT: 0, froze: 0, elite: !!o.elite, boss: null, ph: rand(TAU),
    atk: d.ranged ? rand(d.ranged.cd) : 0, kb: 0, kbx: 0, kby: 0
  };
  if (o.elite) { e.hp = e.maxHp = e.maxHp * 4.2; e.xp *= 5; }
  G.enemies.push(e); return e;
}

/* I guardiani in campo possono essere più d'uno: in coppia con l'ascensione,
   o perché il successivo si sveglia mentre il primo è ancora vivo. Prima
   G.boss teneva solo l'ultimo arrivato, quindi in alto si vedeva la vita del
   gemello e uccidendolo sparivano tutte e due le barre. G.boss resta il
   capofila (a chi chiede solo "c'è un guardiano?" basta), G.bosses è
   l'elenco che l'interfaccia disegna. */
function syncBosses() {
  const b = G.bosses;
  for (let i = b.length - 1; i >= 0; i--) if (b[i].hp <= 0 || b[i].dead) b.splice(i, 1);
  G.boss = b[0] || null;
}

function spawnBoss(def) {
  const a = rand(TAU), d = Math.max(G.vw, G.vh) * .62 + 120;   /* mondo, non schermo */
  const mins = G.t / 60;
  /* La tenacia arriva a meta' sui guardiani: a piena dose un direttore alto
     li trasformerebbe in muri da tre minuti, ma senza affatto una build che
     scioglie la folla scioglie anche loro. E ha un tetto: serve a regolare il
     raggio a cui muore la FOLLA, e su un guardiano faceva una spugna da
     settantamila punti vita (misurata) che restava in campo quaranta secondi
     senza fare un solo danno. Con il tetto lo scontro resta un evento invece
     che un muro il cui unico effetto e' durare. */
  /* `def.hpMul` lo mette il modo: nell'Incursione un guardiano non può
     avere la vita del suo slot, perché ci arrivi con meno livelli addosso. */
  const vita = def.hp * (def.hpMul || 1) * (1 + G.diff * .55) * G.asc.hp * G.cg.bossHp * (1 + (Math.min(G.tenacia, 10) - 1) * .5);
  const e = {
    type: 'boss', x: clamp(G.p.x + Math.cos(a) * d, -ARENA + def.r, ARENA - def.r),
    y: clamp(G.p.y + Math.sin(a) * d, -ARENA + def.r, ARENA - def.r),
    vx: 0, vy: 0, r: def.r, c: def.c, shape: 'boss', ten: 1,
    hp: vita, maxHp: vita, spd: def.spd * G.asc.spd * G.cg.spd,
    dmg: def.dmg, xp: def.xp, flash: 0, slow: 0, slowT: 0, burn: 0, burnT: 0, froze: 0,
    elite: false, boss: def, ph: 0, atk: 1.4, atk2: 5, kb: 0, kbx: 0, kby: 0, charge: 0, cdir: 0
  };
  G.enemies.push(e); G.bosses.push(e); syncBosses();
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
  /* Il lampo di "colpito" durava 0.13s. Con otto rune che sparano da sole
     un nemico viene colpito molto piu' spesso di così, quindi restava
     bianco pieno praticamente sempre: un segnale sempre acceso non dice
     piu' niente, e soprattutto rubava il bianco saturo alla MORTE, che e'
     l'unica cosa che deve saturare. Adesso e' un guizzo. */
  e.flash = .07;
  /* Un numero per ogni colpo, con otto rune e trecento nemici, era una
     bufera di cifre che copriva l'azione. Restano i colpi che dicono
     qualcosa: critici, bersagli importanti, e le mazzate vere. */
  if (crit || e.boss || e.elite || dmg >= e.maxHp * .22)
    addFloat(e.x, e.y - e.r - 4, Math.round(dmg), crit ? '#ffffff' : (opt.color || '#ffd2e4'), crit);
  if (crit) {
    AU.play('crit');
    /* Sirio: ogni critico accorcia la ricarica di tutto l'anello.
       Si autoalimentava: piu' colpi -> piu' critici -> ricariche piu' corte
       -> piu' colpi. Con sei rune in mezzo alla folla i critici sono
       centinaia al secondo, quindi drenava piu' ricarica di quanta se ne
       accumulasse e l'anello sparava a ogni fotogramma (45 uccisioni al
       secondo contro le 17 di Vega, stessa build). Adesso conta un critico
       ogni .18s: il taglio non supera un quarto di secondo al secondo. */
    if (G.char.rule === 'cadenza' && G.cadT <= 0) {
      G.cadT = .18;
      for (const rr of G.ring) if (rr) rr.cd = Math.max(0, rr.cd - .04);
    }
    burstPart(e.x, e.y, 4, '#fff', 190, 3, .28);
    if (G.awaken.luce && G.healCd <= 0) {
      G.healCd = .55; const h = [0, 1, 2, 3.5][G.awaken.luce];
      P.hp = Math.min(P.maxHp, P.hp + h); addFloat(G.p.x, G.p.y - 26, '+' + h, '#6ff2c4');
    }
  } else AU.play('hit');

  /* Il contraccolpo ACCUMULAVA: e.kbx += direzione * forza, e non veniva mai
     azzerato. Un solo colpo spostava un nemico di 1478px, e l'arena e' 1700
     di semilarghezza. Su un bersaglio che sopravvive a migliaia di colpi -
     un guardiano - il vettore cresceva senza fine finche' il salto in un
     fotogramma superava i millesettecento pixel: il Custode spariva e
     ricompariva dall'altra parte. Sui nemici normali non si vedeva il salto
     ma si vedeva il risultato: a quindici secondi da una mischia, ZERO
     nemici entro 400px dal giocatore e mediana 1083 - un bullet heaven in
     cui l'orda non ti raggiunge mai.
     Adesso e' un impulso: si assegna invece di sommarsi, ha una scala in
     pixel (forza/110, cioe' una quindicina per un colpo normale) e chi e'
     grosso lo sente meno. Un guardiano non lo si sposta a fucilate. */
  if (opt.kb) {
    const massa = e.boss ? .12 : e.elite ? .45 : 1;
    const f = opt.kb / 110 * massa;
    e.kbx = (opt.kbx || 0) * f; e.kby = (opt.kby || 0) * f; e.kb = .18;
  }
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
  /* ── il colpo di grazia ────────────────────────────────────────
     Prima un nemico spariva e basta: sei scintille e un anello. Il piacere
     di un bullet heaven sta tutto nel POP, e il pop non e' una cosa grossa
     — e' una cosa BREVE e precisa, sincronizzata all'istante esatto. Tre
     pezzi, nessuno dei quali dura piu' di un settimo di secondo:
       · il GUSCIO: la sagoma che stavi colpendo lampeggia bianca e si
         sfalda verso l'esterno. E' la forma che riconoscevi che si rompe,
         quindi l'occhio lega la ricompensa al bersaglio giusto.
       · i DETRITI vanno nella direzione del colpo invece che in tondo: si
         legge come impatto e non come palloncino che scoppia.
       · il SUONO non parte da qui ma finisce in coda, e viene raccolto una
         volta per fotogramma (vedi flushUccisioni): venti uccisioni al
         secondo di suoni identici sono una raffica di mitra, non venti
         soddisfazioni.
     Niente sussulto e niente tremore sui nemici comuni: a venti al secondo
     lo schermo non si fermerebbe piu'. Quelli restano ai bersagli che
     contano. */
  const kbx = (opt && opt.kbx) || 0, kby = (opt && opt.kby) || 0;
  const rot = Math.atan2(G.p.y - e.y, G.p.x - e.x) + PI / 2;
  G.zones.push({ k: 'guscio', x: e.x, y: e.y, r: e.r, forma: e.shape, rot,
    t: 0, dur: e.boss ? .38 : e.elite ? .28 : .2, c: e.c, grosso: e.boss ? 2 : e.elite ? 1 : 0 });
  burstDir(e.x, e.y, e.boss ? 60 : (e.elite ? 24 : 7), e.c, e.boss ? 420 : 250, e.boss ? 6 : 3.4, e.boss ? 1.1 : .46, kbx, kby);
  G.zones.push({ k: 'ring', x: e.x, y: e.y, r0: e.r * .6, r1: e.r * (e.boss ? 8 : 2.6), t: 0, dur: e.boss ? .7 : .3, c: e.c });
  /* in coda per il riepilogo di fine fotogramma */
  G.raffN++; G.raffX += e.x; G.raffY += e.y;
  if (e.r > G.raffR) { G.raffR = e.r; G.raffC = e.c; }
  /* il sussulto resta ai bersagli che contano: un elite e' una carta */
  if (e.elite && !e.boss) G.hitstop = Math.max(G.hitstop, .05);

  /* Implosione: ogni uccisione detona i vicini. Ma chi moriva DENTRO
     un'implosione ne scatenava un'altra, e quella un'altra ancora: una
     reazione a catena che si autoalimenta. Finche' il contraccolpo rotto
     teneva l'orda sparpagliata non si vedeva; con i nemici di nuovo
     addosso, la stessa build faceva sedici volte il danno per colpa della
     catena (Falce da 5.8 a 95.4 uccisioni al secondo col solo Risveglio
     acceso, contro il x1.0 di Ardore e Torpore). Adesso e' una detonazione,
     non una reazione: chi cade nell'implosione non ne accende una nuova. */
  if (G.awaken.vuoto && !(opt && opt.implosione)) {
    const f = [0, .3, .5, .8][G.awaken.vuoto];
    const rr = 78 + e.r * 2.2 + G.awaken.vuoto * 22;
    const dm = Math.min(e.maxHp * f, 420 * G.awaken.vuoto);
    G.zones.push({ k: 'ring', x: e.x, y: e.y, r0: 4, r1: rr, t: 0, dur: .34, c: '#b06bff' });
    const near = GRID.near(e.x, e.y, rr, []);
    for (let i = 0; i < near.length; i++) {
      const o = near[i]; if (o === e || o.hp <= 0) continue;
      if ((o.x - e.x) * (o.x - e.x) + (o.y - e.y) * (o.y - e.y) < rr * rr) hitEnemy(o, dm, { color: '#b06bff', noCrit: true, noChain: true, implosione: 1, noStatus: G.awaken.vuoto < 3 });
    }
  }

  /* Il segnale del direttore. Solo i nemici comuni: elite e guardiani hanno
     una vita loro e falserebbero la misura. Media mobile corta - circa tre
     secondi di uccisioni - cosi' segue la build senza inseguire il rumore. */
  /* La bomba e la Rinascita spazzano decine di nemici in un colpo, molti
     lontanissimi: senza escluderli la media schizzerebbe e il direttore
     leggerebbe "li disintegro a mille pixel" un istante dopo che hai
     ripulito il campo, indurendo l'arena proprio come premio. */
  if (!e.boss && !e.elite && !e.corriere && !(opt && opt.spazzata)) {
    const d = Math.hypot(e.x - G.p.x, e.y - G.p.y);
    G.raggio += (d - G.raggio) * .02;
    G.kAcc++;
  }

  const n = e.boss ? 26 : e.elite ? 9 : 1;
  for (let i = 0; i < n; i++) addGem(e.x + rand(30, -30), e.y + rand(30, -30), Math.max(1, Math.round(e.xp / n)));
  if (e.elite || e.boss) { if (G.asc.noChest) addGem(e.x, e.y, 45, 1); else G.drops.push({ x: e.x, y: e.y, k: 'chest', t: 0 }); }
  else if (!G.asc.noDrops && !G.cg.noDrops && chance(.012)) G.drops.push({ x: e.x, y: e.y, k: 'cuore', t: 0 });
  else if (!G.asc.noDrops && !G.cg.noDrops && chance(.006)) G.drops.push({ x: e.x, y: e.y, k: 'bomba', t: 0 });
  if (chance(.05) || e.elite) addGem(e.x, e.y, e.boss ? 60 : e.elite ? 12 : 3, 1);

  if (e.type === 'scissore' && !e.small && !e.elite && G.enemies.length < 330) {
    for (let i = 0; i < 2; i++) {
      const c = spawnEnemy('scissore', e.x + rand(24, -24), e.y + rand(24, -24), { hpMul: .3, rMul: .62, spdMul: 1.3, xpMul: .5 });
      c.small = true;
    }
  }
  if (e.boss) {
    syncBosses(); G.shake = 26; G.hitstop = .16;
    UI.toast('ABBATTUTO', e.boss.n, e.boss.c);
    if (G.asc.noChest) addGem(e.x, e.y, 140, 1);
    /* un guardiano vale uno scrigno grosso, non due schermate di carte
       di fila: la seconda arrivava mentre stavi ancora leggendo la prima */
    else { G.drops.push({ x: e.x, y: e.y, k: 'chest', t: 0 }); addGem(e.x, e.y, 220, 1); }
    G.bossKills++;
    /* Prima si controllava `id === 'eclissi'`. Adesso l'ordine dei guardiani
       si rimescola e l'Incursione ne salta due, quindi «è l'ultimo» è una
       proprietà della partita, non un nome. */
    if (e.boss.fine) winRun();
  }
}

function hurtPlayer(amount) {
  if (G.p.inv > 0 || G.state !== 'play') return;
  const d = amount * P.dr;
  P.hp -= d; G.p.inv = .62; G.p.hurt = .3;
  /* Respiro: una volta per partita, il colpo che ti porta sotto un quarto
     di vita ti dà tre secondi per uscire invece di ammazzarti nel mucchio.
     Sta qui e non in updatePlayer perché deve scattare sul colpo, non al
     fotogramma dopo: nel mezzo ce ne stanno altri due. */
  if (!G.respiro && hasRel('respiro') && P.hp > 0 && P.hp < P.maxHp * .25) {
    G.respiro = 1;
    P.hp = Math.min(P.maxHp, P.hp + P.maxHp * .3);
    G.p.inv = 3;
    G.zones.push({ k: 'ring', x: G.p.x, y: G.p.y, r0: 10, r1: 420, t: 0, dur: .8, c: '#6ff2c4' });
    UI.toast('RESPIRO', 'Tre secondi per uscire', '#6ff2c4');
    AU.play('awake');
  }
  if (G.char.rule === 'contraccolpo')
    G.zones.push({ k: 'nova', x: G.p.x, y: G.p.y, r0: 14, r1: 210 * P.areaMul, t: 0, dur: .45, dmg: 45 * P.dmgMul, hit: new Set(), c: EL.fuoco.c, kb: 320 });
  G.shake = Math.max(G.shake, 8); G.flashT = .16; G.flashC = HPC;
  AU.play('hurt');
  burstPart(G.p.x, G.p.y, 10, '#ff3d6e', 200, 3.4, .5);
  if (P.hp <= 0) {
    if (G.revives > 0) {
      G.revives--; P.hp = P.maxHp * .6; G.p.inv = 2.4;
      UI.toast('RINASCITA', 'Il nucleo si riaccende', '#6ff2c4');
      G.zones.push({ k: 'ring', x: G.p.x, y: G.p.y, r0: 10, r1: 620, t: 0, dur: .6, c: '#6ff2c4' });
      const near = GRID.near(G.p.x, G.p.y, 620, []);
      for (let i = 0; i < near.length; i++) if (!near[i].boss) hitEnemy(near[i], 9999, { noCrit: true, spazzata: 1 });
    } else { P.hp = 0; endRun(false); }
  }
}

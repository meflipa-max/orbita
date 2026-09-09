"use strict";
/* ═══════════════════════════════════════════════════════════════
   ORBITA — dati di gioco.
   La build è un anello di rune: la posizione conta.
   ═══════════════════════════════════════════════════════════════ */

/* ── util ───────────────────────────────────────────────────── */
const TAU = Math.PI * 2, PI = Math.PI;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
/* ── casualità con seme ─────────────────────────────────────────
   Mulberry32: piccolo, veloce, di qualità sufficiente per un gioco.
   Serve a due cose: poter rigiocare la stessa identica partita, e —
   soprattutto — misurare il bilanciamento senza rumore. Prima ogni
   misura oscillava del 25% e servivano cinque partite per leggere una
   modifica; con lo stesso seme due partite identiche danno lo stesso
   identico risultato.
   Il pulviscolo, le stelle e il rumore audio restano su Math.random:
   non toccano il gioco e non vale la pena legarli al seme.            */
let RNG_S = 1;
function srand(seed) { RNG_S = (seed >>> 0) || 1; }
function nextRand() {
  RNG_S = (RNG_S + 0x6D2B79F5) >>> 0;
  let t = RNG_S;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const chance = p => nextRand() < p;
const newSeed = () => (Math.random() * 0xFFFFFFFF) >>> 0;

/* Casualità COSMETICA, deliberatamente fuori dal seme.
   Scintille, tremolii e intonazione dei suoni girano alla frequenza dello
   schermo e dell'audio, non a quella della simulazione: se pescassero dal
   flusso con seme, due partite con lo stesso numero divergerebbero perché
   una gira a 60 fotogrammi e l'altra a 144. Il seme deve governare solo
   ciò che decide la partita. */
const crand = (a = 1, b = 0) => b + Math.random() * (a - b);
const cchance = p => Math.random() < p;

const rand = (a = 1, b = 0) => b + nextRand() * (a - b);
const randi = (a, b = 0) => Math.floor(b + nextRand() * (a - b));
const pick = a => a[(nextRand() * a.length) | 0];
const $ = s => document.querySelector(s);
const fmtTime = s => ((s / 60) | 0).toString().padStart(2, '0') + ':' + ((s | 0) % 60).toString().padStart(2, '0');
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (nextRand() * (i + 1)) | 0; const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

const HEXC = new Map();
function rgbOf(hex) {
  let v = HEXC.get(hex); if (v) return v;
  const h = hex.replace('#', '');
  v = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  HEXC.set(hex, v); return v;
}
const rgba = (hex, a) => { const c = rgbOf(hex); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };

/* il rosa della barra del giocatore (--hp nel foglio di stile): ogni barra
   della vita ci vira dentro mentre si svuota, così il colore stesso dice
   "vita" e dice "sta finendo" */
const HPC = '#ff3d6e';
const mixc = (h1, h2, t) => {
  const a = rgbOf(h1), b = rgbOf(h2);
  return 'rgb(' + ((a[0] + (b[0] - a[0]) * t) | 0) + ',' + ((a[1] + (b[1] - a[1]) * t) | 0) + ',' + ((a[2] + (b[2] - a[2]) * t) | 0) + ')';
};

/* sprite di bagliore pre-renderizzati — shadowBlur è troppo lento nel loop */
const GLOW = new Map();
function glowTex(hex, size) {
  const key = hex + '_' + size;
  let c = GLOW.get(key); if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = size * 2;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(size, size, 0, size, size, size);
  gr.addColorStop(0, rgba(hex, 1)); gr.addColorStop(.22, rgba(hex, .6));
  gr.addColorStop(.55, rgba(hex, .16)); gr.addColorStop(1, rgba(hex, 0));
  g.fillStyle = gr; g.fillRect(0, 0, size * 2, size * 2);
  GLOW.set(key, c); return c;
}

/* ── elementi ───────────────────────────────────────────────── */
const EL = {
  fuoco:   { n: 'Fuoco',   c: '#ff6a2b', aw: 'Ardore',       awd: ['I colpi incendiano i nemici', 'Incendio più intenso e duraturo', 'Rogo devastante, danno raddoppiato'] },
  gelo:    { n: 'Gelo',    c: '#45d7ff', aw: 'Torpore',      awd: ['I colpi rallentano', 'Rallentamento severo, a volte congela', 'Congelamento frequente e prolungato'] },
  fulmine: { n: 'Fulmine', c: '#ffe14f', aw: 'Sovraccarico', awd: ['I colpi si propagano a un altro nemico', 'Propagazione doppia e più ampia', 'Tempesta a catena su quattro nemici'] },
  vuoto:   { n: 'Vuoto',   c: '#b06bff', aw: 'Collasso',     awd: ['I nemici uccisi implodono', 'Implosione violenta e più ampia', 'Cascata di collassi a catena'] },
  luce:    { n: 'Luce',    c: '#ffe9b0', aw: 'Radianza',     awd: ['+12% critico, i critici curano', '+22% critico, cura maggiore', '+35% critico, i critici accecano'] },
  iride:   { n: 'Iride',   c: '#ff7de3', aw: null, awd: [] }
};
const ELKEYS = ['fuoco', 'gelo', 'fulmine', 'vuoto', 'luce'];

/* Da dove parti. Era una proprietà del nucleo, quindi la scelta che decide
   davvero la partita — il primo elemento, cioè la prima catena e il primo
   Risveglio — arrivava appiccicata a un blocco di statistiche e a un prezzo
   in frammenti. Sul Fulmine non si poteva proprio cominciare: nessuno dei
   sei nuclei ci apriva. Adesso il nucleo dice che REGOLA giochi, l'apertura
   da DOVE parti, e sono due scelte separate.
   Per ogni elemento la runa più semplice che ce l'ha: la prima arma deve
   spiegare l'elemento, non sorprenderti. */
const APERTURE = [
  { el: 'fuoco',   id: 'scintilla' },
  { el: 'gelo',    id: 'scheggia' },
  { el: 'fulmine', id: 'arco' },
  { el: 'vuoto',   id: 'sciame' },
  { el: 'luce',    id: 'raggio' },
  /* L'Iride non ha un elemento suo: prende quello dei vicini. Da sola è la
     partenza più debole di tutte (misurata: un terzo delle uccisioni della
     Scheggia nei primi minuti), circondata è la più forte, perché conta
     come i vicini e accende il Risveglio con due rune invece di tre. Chi
     la sceglie deve saperlo prima, non scoprirlo al terzo minuto. */
  { el: 'iride',   id: 'iride', nota: 'Non ha un elemento suo: prende quello dei vicini. La più debole finché resta sola, la più forte quando l’anello si riempie — conta come i vicini, quindi accende un Risveglio con due rune invece di tre.' }
];

/* ── glifi (24×24, tracciati) ───────────────────────────────── */
const ICO = {
  scintilla: 'M12 3.2c3.4 3.6 5.4 6.1 5.4 9.4a5.4 5.4 0 1 1-10.8 0c0-3.3 2-5.8 5.4-9.4Z|M12 12.6c1.3 1.4 2 2.3 2 3.4a2 2 0 1 1-4 0c0-1.1.7-2 2-3.4Z',
  pira: 'M4 17.2c2.4-1.5 4.6-1.5 7 0s4.6 1.5 7 0|M8.8 13c0-2.1 1.6-2.9 1.6-4.8 1.4 1.1 2.1 2.2 2.1 3.8|M14.6 13.4c0-1.4 1-2.1 1-3.3.9.7 1.4 1.4 1.4 2.5',
  nova: 'M12 9.6a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8Z|M7.4 7.4a6.5 6.5 0 0 1 9.2 9.2|M16.6 7.4a6.5 6.5 0 0 1-9.2 9.2|M4.4 5.6A10 10 0 0 1 19.6 5.6|M19.6 18.4A10 10 0 0 1 4.4 18.4',
  scheggia: 'M12 2.5 15.6 12 12 21.5 8.4 12Z|M12 2.5v19',
  bruma: 'M4.5 8h10|M7 11.6h12|M3.5 15.2h9|M15.5 15.2h4.5|M9 18.8h8',
  cristallo: 'M12 2.5 19 9l-7 12.5L5 9Z|M5 9h14|M12 2.5v19',
  arco: 'M13.6 2.5 6 12.6h5l-1.6 8.9L18 11.4h-5l.6-8.9Z',
  tempesta: 'M6.2 3 3.6 8.6h3l-1 5.4|M13.2 2.6 10.2 9.8h3.6l-1.6 8.6|M20.2 5.4 18.2 10h2.6l-1 4.4',
  filo: 'M2.5 12h11|M19.8 12a2.6 2.6 0 1 1-5.2 0 2.6 2.6 0 0 1 5.2 0Z|M5 8.4 2.5 12 5 15.6',
  singolarita: 'M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0|M20.2 12A8.2 8.2 0 0 0 6.4 6.1|M3.8 12a8.2 8.2 0 0 0 13.8 5.9',
  falce: 'M4.2 4.2a11.4 11.4 0 0 1 15.6 15.6A15 15 0 0 0 4.2 4.2Z|M4.2 4.2 2.6 2.6',
  sciame: 'M3 8.4 10.4 12 3 15.6|M9 8.4 16.4 12 9 15.6|M15 8.4 22.4 12 15 15.6',
  raggio: 'M10.6 12m-1.8 0a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0-3.6 0|M12.2 11 21 6.6|M12.2 13 21 17.4|M21 6.6a9.5 9.5 0 0 1 0 10.8',
  prisma: 'M12 3.8 21 19H3Z|M1.8 12.4h6.6|M16.4 12 22.6 9.4|M16.8 13.6h5.8|M16.4 15.2 22 18.2',
  aureola: 'M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0|M12 2.2v3|M12 18.8v3|M2.2 12h3|M18.8 12h3|M5.1 5.1 7.2 7.2|M16.8 16.8l2.1 2.1|M18.9 5.1l-2.1 2.1|M7.2 16.8l-2.1 2.1',
  iride: 'M12 2.4 14.5 9.5 21.6 12l-7.1 2.5L12 21.6l-2.5-7.1L2.4 12l7.1-2.5Z',
  cometa: 'M18.6 7.4a3.9 3.9 0 1 1-7.8 0 3.9 3.9 0 0 1 7.8 0Z|M11.4 10.2 2.6 20.4|M14 12.1 7.4 20.6|M9.8 7.6 2.2 13.6',
  glaciale: 'M12 2.2v19.6|M3.5 7 20.5 17|M20.5 7 3.5 17|M12 6.6 9.4 4M12 6.6l2.6-2.6|M12 17.4 9.4 20M12 17.4l2.6 2.6|M7.6 9.4 4.2 9M7.6 14.6l-3.4.4|M16.4 9.4l3.4-.4M16.4 14.6l3.4.4',
  fulgore: 'M13.5 2.6 7.2 12h4.6l-1.5 9.4L17 11.2h-4.6Z|M3.4 6.6 1.4 5.2|M3.4 17.4 1.4 18.8|M20.6 6.6l2-1.4|M20.6 17.4l2 1.4',
  mietitore: 'M4.4 4.4a11 11 0 0 1 15.2 15.2A14.4 14.4 0 0 0 4.4 4.4Z|M19.6 4.4a11 11 0 0 0-15.2 15.2A14.4 14.4 0 0 1 19.6 4.4Z',
  alba: 'M6.4 17.2a5.6 5.6 0 0 1 11.2 0|M2.4 17.2h19.2|M12 3.6v2.8|M5.4 6.4 7.5 8.5|M18.6 6.4l-2.1 2.1|M2.6 11.6h2.8|M18.6 11.6h2.8',
  vigore: 'M12 20.8S4 16.2 4 10.6A4.8 4.8 0 0 1 12 6.8a4.8 4.8 0 0 1 8 3.8c0 5.6-8 10.2-8 10.2Z',
  impeto: 'M5 15.4 12 3.6l7 11.8|M8.4 20.6h7.2',
  celerita: 'M3 8h9|M3 12h12.5|M3 16h7|M15.5 7.6 20.4 12l-4.9 4.4',
  frenesia: 'M12 12m-8.6 0a8.6 8.6 0 1 0 17.2 0a8.6 8.6 0 1 0-17.2 0|M12 6.8V12l3.6 2.2',
  ampiezza: 'M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0|M4.6 4.6 8 8|M19.4 4.6 16 8|M4.6 19.4 8 16|M19.4 19.4 16 16|M2.6 2.6v4|M2.6 2.6h4|M21.4 21.4v-4|M21.4 21.4h-4',
  magnete: 'M6 4v7a6 6 0 0 0 12 0V4h-4v7a2 2 0 0 1-4 0V4Z|M6 8h4|M14 8h4',
  sapienza: 'M4 5.4h5.6A2.4 2.4 0 0 1 12 7.8a2.4 2.4 0 0 1 2.4-2.4H20v13.2h-5.6a2.4 2.4 0 0 0-2.4 2.4 2.4 2.4 0 0 0-2.4-2.4H4Z|M12 7.8v12.6',
  precisione: 'M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0|M12 1.8v4.2|M12 18v4.2|M1.8 12H6|M18 12h4.2|M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0',
  corazza: 'M12 2.4 4.4 5.8v6.4c0 4.7 3.2 8.2 7.6 9.6 4.4-1.4 7.6-4.9 7.6-9.6V5.8Z',
  linfa: 'M12 2.8s6 6.6 6 10.6a6 6 0 1 1-12 0c0-4 6-10.6 6-10.6Z',
  vortice: 'M20.2 12a8.2 8.2 0 1 1-3.1-6.4|M20.4 2.8v4.2h-4.2',
  orbita: 'M12 12m-2.6 0a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0-5.2 0|M12 12m-9 0a9 4.6 0 1 0 18 0a9 4.6 0 1 0-18 0|M20.6 5.6a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0Z',
  rinascita: 'M12 21a9 9 0 1 0-8.6-11.6|M3 3.4v5.4h5.4|M12 7.6v5l3.4 2',
  innesco: 'M12 3.2v6|M12 14.6a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Z|M6.8 6.6 9.4 9.2|M17.2 6.6 14.6 9.2',
  ventaglio: 'M4.2 19.4 8 6.6l3.6 1.1|M10 19.6V6.4h4.2v13.2Z|M16.4 19.4 17.4 7l3.2 1',
  presagio: 'M3.2 12s3.4-5.4 8.8-5.4S20.8 12 20.8 12s-3.4 5.4-8.8 5.4S3.2 12 3.2 12Z|M12 9.6a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8Z',
  dominio: 'M12 3v18|M4.2 7.5 19.8 16.5|M19.8 7.5 4.2 16.5',
  congiunzione: 'M9.4 12a4.6 4.6 0 1 1 9.2 0 4.6 4.6 0 0 1-9.2 0Z|M5.4 12a4.6 4.6 0 1 0 9.2 0 4.6 4.6 0 0 0-9.2 0Z',
  contratto: 'M6.6 3.6h7.4l3.9 4v12.8H6.6Z|M14 3.6V7.7h3.9|M9.2 12.4h5.6|M9.2 15.8h3.8',
  reliquia: 'M12 3.2 19.8 9.4 16.9 20.6H7.1L4.2 9.4Z|M4.2 9.4h15.6|M12 3.2 8.6 20.6|M12 3.2l3.4 17.4',
  storico: 'M4.4 9.2A8 8 0 1 1 4 12.6|M4.4 4.6v4.6h4.6|M12 7.6v4.9l3.2 1.9',
  giorno: 'M4.6 6.4h14.8v13.2H4.6Z|M4.6 10.4h14.8|M8.4 3.4v4|M15.6 3.4v4|M10.8 14.4h2.4',
  chiave: 'M14.6 4.8a4.6 4.6 0 1 1-3.3 7.9L4.8 19.2v-2.6h2.6V14h2.7l1.2-1.3a4.6 4.6 0 0 1 3.3-7.9Z|M16.2 8.4h.01',
  modo: 'M7 4h10|M7 20h10|M7 4c0 4 5 5.4 5 8s-5 4-5 8|M17 4c0 4-5 5.4-5 8s5 4 5 8',
  frammento: 'M12 2.2 15.4 8.6 22 12l-6.6 3.4L12 21.8 8.6 15.4 2 12l6.6-3.4Z'
};
function svg(id, cls) {
  const p = (ICO[id] || 'M4 12h16').split('|').map(d => '<path d="' + d + '"/>').join('');
  return '<svg viewBox="0 0 24 24" class="' + (cls || '') + '" aria-hidden="true">' + p + '</svg>';
}

/* ── rune (8 livelli ciascuna) ──────────────────────────────── */
const RUNES = {
  scintilla: { n: 'Scintilla', el: 'fuoco', tag: 'proiettile', d: 'Sfere ardenti verso il nemico più vicino.',
    base: { dmg: 15, cd: .78, spd: 430, count: 1, pierce: 0, size: 7 }, g: { dmg: 6.6, cd: -.045, count: .42, spd: 14 } },
  pira: { n: 'Pira', el: 'fuoco', tag: 'terreno', d: 'Lascia pozze di fuoco lungo il tuo cammino.',
    base: { dmg: 17, cd: 1.75, area: 54, dur: 3.4 }, g: { dmg: 7, cd: -.09, area: 5.5, dur: .26 } },
  nova: { n: 'Nova', el: 'fuoco', tag: 'esplosione', d: 'Onda d’urto che respinge e incenerisce.',
    base: { dmg: 30, cd: 3.5, area: 142 }, g: { dmg: 14, cd: -.22, area: 16 } },
  scheggia: { n: 'Scheggia', el: 'gelo', tag: 'perforante', d: 'Lame di ghiaccio che trapassano più nemici.',
    base: { dmg: 16, cd: 1.0, spd: 560, count: 1, pierce: 2, size: 6 }, g: { dmg: 6.4, cd: -.055, count: .3, pierce: .45 } },
  bruma: { n: 'Bruma', el: 'gelo', tag: 'aura', d: 'Un alone gelido che logora e frena.',
    base: { dmg: 5.6, cd: .34, area: 100 }, g: { dmg: 2.5, area: 11 } },
  cristallo: { n: 'Cristallo', el: 'gelo', tag: 'orbitante', d: 'Schegge che ruotano con il tuo anello.',
    base: { dmg: 21, cd: .5, count: 1, area: 104, spd: 1.9, size: 12 }, g: { dmg: 8, count: .42, spd: .11, size: .7 } },
  arco: { n: 'Arco', el: 'fulmine', tag: 'catena', d: 'Una scarica che salta di nemico in nemico.',
    base: { dmg: 21, cd: 1.5, count: 3, area: 215 }, g: { dmg: 8.2, cd: -.08, count: .55, area: 11 } },
  tempesta: { n: 'Tempesta', el: 'fulmine', tag: 'area', d: 'Saette casuali si abbattono intorno a te.',
    base: { dmg: 33, cd: 1.2, count: 1, area: 330, size: 46 }, g: { dmg: 13.5, cd: -.055, count: .5, size: 3.4 } },
  filo: { n: 'Filo', el: 'fulmine', tag: 'raggio', d: 'Un filamento elettrico agganciato al bersaglio.',
    base: { dmg: 6.8, cd: .11, area: 265 }, g: { dmg: 2.9, area: 14 } },
  singolarita: { n: 'Singolarità', el: 'vuoto', tag: 'controllo', d: 'Un pozzo gravitazionale che attira e divora.',
    base: { dmg: 11, cd: 6.4, area: 112, dur: 3.4 }, g: { dmg: 4.6, cd: -.32, area: 11, dur: .26 } },
  falce: { n: 'Falce', el: 'vuoto', tag: 'boomerang', d: 'Una lama spettrale che va e ritorna.',
    base: { dmg: 31, cd: 2.1, spd: 330, count: 1, size: 17 }, g: { dmg: 13, cd: -.13, count: .3, spd: 11 } },
  sciame: { n: 'Sciame', el: 'vuoto', tag: 'ventaglio', d: 'Raffica di dardi d’ombra a ventaglio.',
    base: { dmg: 12, cd: 1.3, count: 3, spd: 400, pierce: 0, size: 6 }, g: { dmg: 5.2, cd: -.06, count: .62, spd: 12 } },
  raggio: { n: 'Raggio', el: 'luce', tag: 'faro', d: 'Un fascio rotante che incenerisce di continuo.',
    base: { dmg: 4.6, cd: .1, area: 225, spd: .85 }, g: { dmg: 2, area: 14, spd: .04 } },
  prisma: { n: 'Prisma', el: 'luce', tag: 'frammentante', d: 'Un colpo che si frantuma all’impatto.',
    base: { dmg: 21, cd: 1.6, spd: 470, count: 3, size: 8 }, g: { dmg: 8, cd: -.08, count: .42 } },
  aureola: { n: 'Aureola', el: 'luce', tag: 'pulsazione', d: 'Pulsa luce: ferisce intorno e ti risana.',
    base: { dmg: 22, cd: 2.6, area: 126, heal: 1.6 }, g: { dmg: 9, cd: -.14, area: 12, heal: .5 } },
  iride: { n: 'Iride', el: 'iride', tag: 'jolly', d: 'Si accorda a ogni elemento vicino e ne prende la forza.',
    base: { dmg: 17, cd: 1.0, spd: 500, count: 1, size: 8 }, g: { dmg: 7.2, cd: -.05, count: .3 } },

  /* ── trasformazioni ──────────────────────────────────────────
     Non compaiono fra le carte normali: si ottengono solo portando la
     runa a livello 8 mentre risuona da entrambi i lati e il suo elemento
     è risvegliato. La condizione è POSIZIONALE: obbliga a progettare
     l'anello dal primo minuto invece di prendere quel che capita.      */
  cometa: { n: 'Cometa', el: 'fuoco', tag: 'trasformazione', evo: 1, d: 'Sfere enormi che lasciano una scia ardente e si frantumano su ogni uccisione.',
    base: { dmg: 38, cd: .60, spd: 420, count: 2, pierce: 1, size: 13 }, g: { dmg: 15, cd: -.03, count: .3, spd: 12 } },
  /* kb e gelo sono le due manopole dell'anello: quanto respinge e quanto
     trattiene. Sono l'una il freno dell'altra, e stavano nascoste nel codice */
  glaciale: { n: 'Glaciale', el: 'gelo', tag: 'trasformazione', evo: 1, d: 'Un anello di schegge che congela tutto ciò che tocca.',
    base: { dmg: 60, cd: .5, count: 4, area: 132, spd: 2.4, size: 21, kb: 32, gelo: .6 }, g: { dmg: 25, count: .4, spd: .1, size: 1.1 } },
  fulgore: { n: 'Fulgore', el: 'fulmine', tag: 'trasformazione', evo: 1, d: 'La scarica rimbalza su tutto il campo e a ogni salto si sdoppia.',
    base: { dmg: 46, cd: 1.0, count: 8, area: 340 }, g: { dmg: 19, cd: -.05, count: .8, area: 15 } },
  /* dur e hit sono le manopole vere della lama: quanto resta in volo e ogni
     quanto morde. Con dur 4.2 e ricarica .35 se ne accumulavano quaranta in
     aria insieme, e mordendo dieci volte al secondo l'una */
  mietitore: { n: 'Mietitore', el: 'vuoto', tag: 'trasformazione', evo: 1, d: 'Lame che spiraleggiano a lungo risucchiando i nemici lungo il cammino.',
    base: { dmg: 56, cd: 1.25, spd: 320, count: 3, size: 27, dur: 2.6, hit: .24 }, g: { dmg: 22, cd: -.07, count: .3, spd: 10 } },
  alba: { n: 'Alba', el: 'luce', tag: 'trasformazione', evo: 1, d: 'Due fasci opposti che spazzano l’arena senza fermarsi mai.',
    base: { dmg: 8, cd: .09, area: 335, spd: 1.05 }, g: { dmg: 2.9, area: 17, spd: .04 } }
};
/* quale runa diventa cosa */
const EVO = { scintilla: 'cometa', cristallo: 'glaciale', arco: 'fulgore', falce: 'mietitore', raggio: 'alba' };
const RUNEIDS = Object.keys(RUNES).filter(id => !RUNES[id].evo);

/* una runa può trasformarsi? livello massimo, risonanza da entrambi i lati,
   elemento risvegliato */
function canEvolve(r) {
  /* Crogiolo (reliquia) sposta la soglia a 7: non toglie la condizione
     posizionale, che è ciò che rende la trasformazione un progetto — la
     anticipa di un livello, cioè di qualche minuto. */
  const soglia = hasRel('crogiolo') ? 7 : 8;
  return !!(r && EVO[r.id] && r.lv >= soglia && r.res >= 2 && G.awaken[r.el] >= 1);
}

/* ── passivi ────────────────────────────────────────────────── */
const PASSIVES = {
  vigore:     { n: 'Vigore',     max: 5, d: '+18% Vita massima',                  ico: 'vigore',     c: '#ff3d6e' },
  impeto:     { n: 'Impeto',     max: 5, d: '+12% Danno inflitto',                ico: 'impeto',     c: '#ff6a2b' },
  celerita:   { n: 'Celerità',   max: 5, d: '+9% Velocità di movimento',          ico: 'celerita',   c: '#6ff2c4' },
  frenesia:   { n: 'Frenesia',   max: 5, d: '−10% Tempo di ricarica',             ico: 'frenesia',   c: '#ffe14f' },
  ampiezza:   { n: 'Ampiezza',   max: 5, d: '+14% Area d’effetto',                ico: 'ampiezza',   c: '#b06bff' },
  magnete:    { n: 'Magnete',    max: 3, d: '+38% Raggio di raccolta',            ico: 'magnete',    c: '#45d7ff' },
  sapienza:   { n: 'Sapienza',   max: 4, d: '+20% Esperienza guadagnata',         ico: 'sapienza',   c: '#6ff2c4' },
  precisione: { n: 'Precisione', max: 5, d: '+8% Probabilità di critico',         ico: 'precisione', c: '#ffe9b0' },
  corazza:    { n: 'Corazza',    max: 4, d: '−10% Danno subito',                  ico: 'corazza',    c: '#9c93c6' },
  linfa:      { n: 'Linfa',      max: 4, d: '+0,7 Rigenerazione al secondo',      ico: 'linfa',      c: '#6ff2c4' },
  vortice:    { n: 'Vortice',    max: 3, d: '+22% Velocità di orbita e proiettili', ico: 'vortice',  c: '#ff7de3' }
};
const PASSIDS = Object.keys(PASSIVES);

/* ── nemici ─────────────────────────────────────────────────── */
/* Gerarchia visiva. Prima ogni nemico aveva la sua tinta satura — sette
   arcobaleni che urlavano tutti uguale — e due erano verde e oro, cioè
   esattamente i colori delle gemme e dei frammenti: i nemici sembravano
   roba da raccogliere. Ora vale una regola sola:
     · verde e oro sono RISERVATI a ciò che si raccoglie
     · rosso è RISERVATO a ciò che fa male (colpi nemici)
     · i nemici comuni stanno in una famiglia fredda viola-ardesia
     · la LUMINOSITÀ misura la minaccia: più è chiaro e caldo, più pesa
   L'identità la porta la forma, non la tinta.                          */
const MOBS = {
  sciamante: { n: 'Sciamante', hp: 9,   spd: 126, r: 9,  dmg: 6,  xp: 1, c: '#6d78b8', shape: 'tri' },
  vagante:   { n: 'Vagante',   hp: 24,  spd: 80,  r: 13, dmg: 10, xp: 2, c: '#8b7ddb', shape: 'dia' },
  scissore:  { n: 'Scissore',  hp: 52,  spd: 74,  r: 18, dmg: 13, xp: 4, c: '#7f96d8', shape: 'sq', split: 2 },
  spettro:   { n: 'Spettro',   hp: 20,  spd: 158, r: 12, dmg: 14, xp: 3, c: '#b9a6f5', shape: 'gho' },
  dardo:     { n: 'Dardo',     hp: 30,  spd: 66,  r: 14, dmg: 9,  xp: 4, c: '#d98fd6', shape: 'tri', ranged: { cd: 2.9, spd: 210, dmg: 9, n: 1, spread: 0 } },
  lancia:    { n: 'Lanciere',  hp: 44,  spd: 58,  r: 15, dmg: 11, xp: 5, c: '#f08ab0', shape: 'dia', ranged: { cd: 1.9, spd: 265, dmg: 12, n: 3, spread: .34 } },
  bruto:     { n: 'Bruto',     hp: 120, spd: 50,  r: 25, dmg: 22, xp: 8, c: '#ff7aa8', shape: 'hex' }
};
const WAVES = [
  { t: 0,    pool: ['sciamante', 'sciamante', 'vagante'] },
  { t: 70,   pool: ['sciamante', 'vagante', 'vagante'] },
  { t: 150,  pool: ['sciamante', 'vagante', 'dardo'] },
  { t: 240,  pool: ['vagante', 'dardo', 'scissore', 'sciamante'] },
  { t: 330,  pool: ['vagante', 'scissore', 'spettro', 'dardo'] },
  /* senza il Dardo qui, fra il 7:30 e il 9:30 non arrivava un solo colpo a
     distanza: l'unico gradino all'indietro in tutta la curva di pressione */
  { t: 450,  pool: ['scissore', 'spettro', 'bruto', 'vagante', 'dardo'] },
  { t: 570,  pool: ['spettro', 'bruto', 'lancia', 'scissore'] },
  { t: 700,  pool: ['bruto', 'lancia', 'spettro', 'scissore', 'dardo'] },
  { t: 860,  pool: ['bruto', 'lancia', 'spettro', 'bruto', 'scissore'] },
  { t: 1020, pool: ['bruto', 'lancia', 'bruto', 'spettro', 'scissore', 'vagante'] }
];
/* Guardiani ogni ~3,5 minuti. Il cronometro si ferma durante le scelte,
   quindi gli intervalli sono più stretti di quanto sembri all'orologio da polso. */
/* `passo` e' il pavimento di velocita' sotto i 450 pixel, in frazione di
   quella del giocatore: senza, nessun guardiano arrivava a toccare chi si
   muove. Ma un pavimento unico li appiattiva tutti sulla stessa andatura —
   e a pagarlo era il piu' lento, il Custode, che al 2:30 saltava da 118 a
   172 px/s (+46%, +86% a fine partita) proprio mentre la tua build e' la
   piu' debole. Ora il pavimento segue la velocita' di ciascuno, quindi
   l'ordine resta quello scritto qui: il Custode si stacca ancora, l'Eclissi
   quasi no.                                                              */
const BOSSES = [
  { t: 150,  id: 'custode', n: 'CUSTODE', hp: 1150,  spd: 118, passo: .72, r: 44, dmg: 22, c: '#ff6a2b', xp: 90,  pat: 'summon' },
  { t: 360,  id: 'aracne',  n: 'ARACNE',  hp: 3600,  spd: 132, passo: .80, r: 40, dmg: 28, c: '#b06bff', xp: 170, pat: 'radial' },
  { t: 570,  id: 'titano',  n: 'TITANO',  hp: 7800,  spd: 120, passo: .74, r: 52, dmg: 34, c: '#45d7ff', xp: 260, pat: 'charge' },
  { t: 810,  id: 'aurora',  n: 'AURORA',  hp: 13500, spd: 145, passo: .86, r: 46, dmg: 34, c: '#ffe14f', xp: 380, pat: 'mix' },
  { t: 1080, id: 'eclissi', n: 'ECLISSI', hp: 26000, spd: 158, passo: .92, r: 58, dmg: 44, c: '#ff3d6e', xp: 700, pat: 'final', fine: 1 }
];
const RUN_LEN = 1200; /* 20 minuti: la Corsa. L'Incursione dura MODI[1].len */

/* Chi arriva, quando, e con che pattern.
   Cinque guardiani sempre nello stesso ordine agli stessi secondi erano
   metà del motivo per cui la partita 2 era il copione della partita 1.
   Adesso i NUMERI restano dello slot — vita, velocità, pavimento di
   velocità, raggio, danno, esperienza sono tarati su quel minuto e non si
   toccano — mentre IDENTITÀ e PATTERN ruotano fra i primi quattro. Così
   puoi trovarti le cariche del Titano al 2:30 senza che il 2:30 diventi
   più duro: cambia cosa devi schivare, non quanto incassi.
   L'ultimo slot non ruota: il finale deve restare il finale, e la sua
   bandierina `fine` è ciò che decide la vittoria (vedi 02-engine).        */
function rosterGuardiani(modo) {
  const idx = [0, 1, 2, 3];
  shuffle(idx);
  const out = [];
  const piano = modo && modo.guardiani
    ? modo.guardiani
    : BOSSES.map((b, i) => ({ i, t: b.t, hp: 1 }));
  for (let k = 0; k < piano.length; k++) {
    const passo = piano[k];
    const slot = BOSSES[passo.i];
    /* l'identità: per gli slot finali resta la propria, per gli altri quella
       rimescolata. `pat` e `n`/`c` viaggiano insieme — un guardiano che si
       chiama Aracne e carica come il Titano non si legge. */
    const alter = passo.i < 4 ? BOSSES[idx[passo.i]] : slot;
    out.push({
      id: alter.id, n: alter.n, c: alter.c, pat: alter.pat,
      t: passo.t, hp: slot.hp, hpMul: passo.hp || 1,
      spd: slot.spd, passo: slot.passo, r: slot.r, dmg: slot.dmg, xp: slot.xp,
      fine: k === piano.length - 1 ? 1 : 0
    });
  }
  return out;
}

/* ── personaggi ─────────────────────────────────────────────── */
/* Nuclei. Le statistiche da sole non cambiano come si gioca: si scelgono
   una volta e si dimenticano. Ognuno porta anche una REGOLA che riscrive
   qualcosa del gioco — e le due che toccano l'anello (Nadir e Lyra) lo
   riscrivono davvero, perché l'anello è il gioco.                        */
const CHARS = [
  { id: 'vega',    n: 'Vega',    c: '#bff6ff', cost: 0,
    d: 'Equilibrata sotto ogni aspetto.', mod: {} },
  { id: 'rigel',   n: 'Rigel',   c: '#45d7ff', cost: 400,
    d: '+24% velocità · −20% vita', mod: { spd: 1.24, hp: .8 },
    rule: 'slancio', ruleD: 'In movimento le rune sparano il 18% più in fretta.' },
  { id: 'antares', n: 'Antares', c: '#ff6a2b', cost: 900,
    d: '+50% vita · +12% area · −12% velocità', mod: { hp: 1.5, area: 1.12, spd: .88 },
    rule: 'contraccolpo', ruleD: 'Ogni ferita che subisci scatena una Nova.' },
  { id: 'sirio',   n: 'Sirio',   c: '#ffe9b0', cost: 1600,
    d: '+15% critico · +40% danno critico · −18% vita', mod: { crit: .15, critD: .4, hp: .82 },
    rule: 'cadenza', ruleD: 'Ogni critico accorcia di 0,04s la ricarica di tutte le rune.' },
  { id: 'nadir',   n: 'Nadir',   c: '#b06bff', cost: 2600,
    d: '+25% esperienza · −8% danno', mod: { xp: 1.25, dmg: .92 },
    rule: 'ecoLunga', ruleD: 'Le rune risuonano anche saltando un alloggiamento.' },
  { id: 'lyra',    n: 'Lyra',    c: '#ff7de3', cost: 3800,
    d: 'Due alloggiamenti in meno · +20% danno', mod: { dmg: 1.2 },
    rule: 'anelloCorto', ruleD: 'Anello dimezzato, ma ogni runa conta doppia per le catene.' }
];

/* ── aspetto del nucleo ─────────────────────────────────────────
   Solo estetica: nessuna di queste forme tocca una statistica, e si
   cambiano quando si vuole senza costo. Vale la stessa regola dei nemici —
   «l'identità la porta la forma, non la tinta» — che qui serve due volte:
   il colore resta quello del nucleo che stai giocando, e il centro resta
   bianco e pieno, l'unica cosa bianca e piena dello schermo. Se un giorno
   in campo ci sarà più di un giocatore, la sagoma è ciò che si legge da
   lontano, quando il colore è già sepolto sotto gli effetti.
   `lati` sono i vertici (0 = cerchio), `punte` accorcia quelli dispari per
   le forme a stella, `rot` è quanto in fretta gira.                       */
const SKINS = [
  { id: 'nucleo',  n: 'Nucleo',  d: 'Esagono',    lati: 6, rot: .7 },
  { id: 'prisma',  n: 'Prisma',  d: 'Triangolo',  lati: 3, rot: .5 },
  { id: 'rombo',   n: 'Rombo',   d: 'Quadrato',   lati: 4, rot: .55 },
  { id: 'sigillo', n: 'Sigillo', d: 'Pentagono',  lati: 5, rot: .6 },
  { id: 'quarzo',  n: 'Quarzo',  d: 'Ottagono',   lati: 8, rot: .45 },
  { id: 'anello',  n: 'Anello',  d: 'Cerchio',    lati: 0, rot: 0 },
  { id: 'astro',   n: 'Astro',   d: 'Sei punte',  lati: 6, punte: .54, rot: .35 }
];
/* i vertici della sagoma, in ordine, su un raggio dato: la usano il gioco
   (canvas) e l'anteprima nell'Osservatorio (svg), così quello che scegli è
   esattamente quello che vedi in partita */
function skinPunti(sk, r) {
  const out = [];
  const n = sk.punte ? sk.lati * 2 : sk.lati;
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU;
    const rr = sk.punte && (i % 2) ? r * sk.punte : r;
    out.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  return out;
}

/* ── potenziamenti permanenti ─────────────────────────
   L'ordine e i prezzi sono la prima cosa che si incontra dopo la prima
   sconfitta, quindi decidono se ci sarà una terza partita. Prima le prime
   spese possibili erano tutte percentuali piccole (+8% vita, +5% danno), e
   le uniche due voci che cambiano COME giochi — Orbita Estesa e Rinascita —
   costavano 700 e 1500, cioè più di quanto rende una partita persa al
   minuto otto (misurato: 942). Le prime tre o quattro iterazioni del giro
   ricompensa consegnavano quindi zero cambiamento percepito, ed è
   esattamente lì che si smetteva.
   Ora in cima ci sono REGOLE a buon mercato, comprabili dopo una partita
   sola, e i numeri vengono dopo.                                          */
const META = [
  /* la prima spesa possibile, e cambia la partita invece di ritoccarla:
     l'apertura a livello 3 vuol dire che il primo Risveglio arriva prima */
  { id: 'innesco',   n: 'Innesco',        max: 1,  c: 110,  step: 1,    ico: 'innesco',    d: 'La runa d’apertura parte al livello 3' },
  { id: 'presagio',  n: 'Presagio',       max: 1,  c: 160,  step: 1,    ico: 'presagio',   d: 'Il primo elite arriva al primo minuto' },
  { id: 'ventaglio', n: 'Ventaglio',      max: 1,  c: 230,  step: 1,    ico: 'ventaglio',  d: 'Quattro carte nei primi tre livelli' },
  /* è il potenziamento che sblocca la libertà di build: con sei alloggiamenti
     la runa iniziale ti obbliga a usare il suo elemento. Costava 700, cioè
     stava dietro a cinque o sei partite, proprio la voce che più di tutte
     fa dire «adesso posso provare un'altra cosa». */
  { id: 'orbita',    n: 'Orbita Estesa',  max: 2,  c: 260,  step: 1.9,  ico: 'orbita',     d: '+1 alloggiamento nell’anello' },
  { id: 'ripensamento', n: 'Ripensamento', max: 3, c: 140,  step: 1.8,  ico: 'vortice',    d: '+1 Rilancio per partita' },
  { id: 'rinascita', n: 'Rinascita',      max: 1,  c: 1500, step: 1,    ico: 'rinascita',  d: 'Torni in vita una volta per partita' },

  { id: 'nucleo',    n: 'Nucleo Denso',   max: 5,  c: 60,   step: 1.7,  ico: 'vigore',     d: '+8% Vita massima' },
  { id: 'furia',     n: 'Furia',          max: 5,  c: 85,   step: 1.8,  ico: 'impeto',     d: '+5% Danno' },
  { id: 'passo',     n: 'Passo Leggero',  max: 4,  c: 70,   step: 1.7,  ico: 'celerita',   d: '+4% Velocità' },
  { id: 'occhio',    n: 'Occhio Acuto',   max: 4,  c: 95,   step: 1.8,  ico: 'precisione', d: '+3% Critico' },
  { id: 'avidita',   n: 'Avidità',        max: 4,  c: 75,   step: 1.8,  ico: 'sapienza',   d: '+8% Esperienza' },
  { id: 'calamita',  n: 'Calamita',       max: 3,  c: 65,   step: 1.8,  ico: 'magnete',    d: '+22% Raggio di raccolta' },
  { id: 'linfa',     n: 'Linfa Stellare', max: 3,  c: 120,  step: 1.9,  ico: 'linfa',      d: '+0,3 Rigenerazione al secondo' },
  { id: 'fortuna',   n: 'Fortuna',        max: 4,  c: 90,   step: 1.8,  ico: 'frammento',  d: '+12% Frammenti raccolti' },
  /* Il pozzo senza fondo. Comprato tutto il resto — 12.404 frammenti di
     potenziamenti più 9.300 di nuclei — i frammenti smettevano di comprare
     qualcosa mentre payout() continuava a versarli, e una valuta che non
     compra più niente è un giro rotto. Quaranta livelli a passo 1,14 costano
     oltre mezzo milione: nessuno lo finisce, ed è esattamente il punto. */
  { id: 'dominio',   n: 'Dominio',        max: 40, c: 400,  step: 1.14, ico: 'dominio',    d: '+1,5% Danno · senza fine' }
];
const metaCost = (m, lv) => Math.round(m.c * Math.pow(m.step, lv));

/* ── sfide ──────────────────────────────────────────────────────
   Non medaglie da vetrina: chiavi. Danno una direzione alle partite e
   soprattutto insegnano i sistemi, spingendoti a usarli in modi che da
   solo non proveresti. Due sbloccano un nucleo, scavalcando i frammenti. */
const SFIDE = [
  { id: 'vittoria',  n: 'Prima luce',      d: 'Vinci una partita.',                              r: 400,  f: s => s.win },
  { id: 'pieno',     n: 'Anello completo', d: 'Riempi ogni alloggiamento in una partita.',        r: 200,  f: s => s.pieno },
  { id: 'presto',    n: 'Fuoco precoce',   d: 'Accendi un Risveglio entro il quinto minuto.',     r: 250,  f: s => s.awakeAt > 0 && s.awakeAt <= 300 },
  { id: 'duplice',   n: 'Doppia voce',     d: 'Tieni due Risvegli accesi insieme.',               r: 300,  f: s => s.awakeMax >= 2 },
  { id: 'ponte',     n: 'Ponte iridato',   d: 'Due Risvegli con un’Iride nell’anello.',           r: 450,  f: s => s.awakeMax >= 2 && s.iride },
  { id: 'terzo',     n: 'Terzo grado',     d: 'Porta un Risveglio al terzo grado.',               r: 600,  f: s => s.tier3 },
  { id: 'trasforma', n: 'Metamorfosi',     d: 'Trasforma una runa.',                              r: 400,  f: s => s.evo >= 1 },
  { id: 'massacro',  n: 'Marea rossa',     d: '1500 eliminazioni in una sola partita.',           r: 300,  f: s => s.kills >= 1500 },
  { id: 'intatto',   n: 'Senza un graffio',d: 'Arriva al quinto minuto senza scendere a metà vita.', r: 350, f: s => s.t >= 300 && !s.lowHp },
  { id: 'duetrasf',  n: 'Doppia forma',    d: 'Trasforma due rune nella stessa partita.',         r: 700,  f: s => s.evo >= 2, unlock: 'lyra' },
  { id: 'purista',   n: 'Purista',         d: 'Vinci senza mai riordinare l’anello.',             r: 900,  f: s => s.win && s.reorders === 0 },
  { id: 'ascesa',    n: 'Ascesa',          d: 'Vinci ad ascensione 3 o superiore.',               r: 1000, f: s => s.win && s.ascLv >= 3, unlock: 'nadir' }
];

/* ── ascensioni ─────────────────────────────────────────────────
   Ogni livello aggiunge UNA regola, e le regole si sommano. Non è un
   moltiplicatore generico: ricontestualizza il gioco che c'è già invece
   di aggiungere contenuto. Si sblocca vincendo al livello precedente.  */
const ASC = [
  { d: 'La corsa base, senza modifiche.' },
  { d: 'I nemici hanno il 25% di vita in più.', hp: 1.25 },
  { d: 'Gli scrigni danno frammenti, non potenziamenti.', noChest: 1 },
  { d: 'I nemici si muovono il 12% più veloci.', spd: 1.12 },
  { d: 'I guardiani arrivano 30 secondi prima.', boss: -30 },
  { d: 'Un alloggiamento in meno nell’anello.', slots: -1 },
  { d: 'I nemici hanno un altro 50% di vita.', hp: 1.5 },
  { d: 'Niente cuori né bombe sul terreno.', noDrops: 1 },
  { d: 'Parti con metà vita.', startHp: .5 },
  { d: 'I Risvegli richiedono quattro rune in fila.', chain: 4 },
  { d: 'Le ondate sono più fitte del 25%.', rate: 1.25 },
  { d: 'I guardiani arrivano in coppia dal terzo in poi.', twin: 1 },
  { d: 'I nemici hanno il doppio della vita.', hp: 2 }
];
function ascMods(lv) {
  const m = { hp: 1, spd: 1, slots: 0, boss: 0, rate: 1, chain: 3, startHp: 1, noChest: 0, noDrops: 0, twin: 0 };
  const top = Math.min(lv | 0, ASC.length - 1);
  for (let i = 1; i <= top; i++) {
    const a = ASC[i];
    if (a.hp) m.hp *= a.hp;
    if (a.spd) m.spd *= a.spd;
    if (a.slots) m.slots += a.slots;
    if (a.boss) m.boss += a.boss;
    if (a.rate) m.rate *= a.rate;
    if (a.chain) m.chain = a.chain;
    if (a.startHp) m.startHp *= a.startHp;
    if (a.noChest) m.noChest = 1;
    if (a.noDrops) m.noDrops = 1;
    if (a.twin) m.twin = 1;
  }
  return m;
}

/* ── modi di gioco ──────────────────────────────────────────────
   La Corsa da venti minuti era l'unico formato, e per chi comincia venti
   minuti sono una decisione, non un impulso: la prima conclusione arrivava
   dopo ore, cioè SAVE.wins restava 0 abbastanza a lungo da far smettere
   prima — e tutta la coda lunga del gioco, le tredici ascensioni, sta
   dietro a quella prima vittoria.
   L'Incursione non è la Corsa tagliata a metà: è ritarata. Il calendario
   dei contenuti scorre più in fretta (`onda`), i nemici si irrobustiscono
   più in fretta (`tempra`), tu sali di livello più in fretta (`xp`), e i
   tre guardiani hanno una vita loro invece di quella dello slot — perché a
   parità di minuti la tua build è più debole di quanto sarebbe nella Corsa.
     len    quanto dura, in secondi
     onda   moltiplicatore del tempo per ondate e ritmo di comparsa
     tempra moltiplicatore del tempo per la crescita di vita dei nemici
     xp     quanto più in fretta sali di livello
     guardiani  quale slot di BOSSES, a che secondo, con quanta della sua vita */
const MODI = [
  { id: 'corsa', n: 'Corsa', d: '20 minuti · cinque guardiani',
    sub: 'Il formato pieno: cinque guardiani, poi modalità senza fine.',
    len: 1200, onda: 1, tempra: 1, xp: 1,
    guardiani: null },
  { id: 'incursione', n: 'Incursione', d: '8 minuti · tre guardiani',
    sub: 'Una partita intera, vittoria compresa, nel tempo di un caffè.',
    len: 480, onda: 2.15, tempra: 1.65, xp: 1.85, paga: .8,
    guardiani: [{ i: 0, t: 100, hp: .85 }, { i: 2, t: 245, hp: .5 }, { i: 4, t: 410, hp: .36 }] }
];
const modoDi = id => MODI.find(m => m.id === id) || MODI[0];

/* ── congiunzioni ───────────────────────────────────────────────
   Il Nodo elementale è la cosa che dà più varietà fra una corsa e l'altra,
   perché non cambia un numero: cambia la domanda della corsa. La
   congiunzione porta lo stesso principio a tutta l'arena — una regola
   sorteggiata dal seme e DICHIARATA prima di partire, così è una cosa che
   scegli come giocare, non una sorpresa che subisci.
   La Quiete pesa il doppio delle altre: una corsa su quattro deve restare
   quella di sempre, o «modificata» smette di voler dire qualcosa.          */
const CONGIUNZIONI = [
  { id: 'quiete', n: 'Quiete', c: '#9c93c6', w: 6,
    d: 'Nessuna congiunzione: l’arena è quella di sempre.', m: {} },
  /* il direttore ricompensa in parte la vita tolta — è il suo mestiere —
     ma il ritmo di comparsa non lo tocca: la marea si vede lo stesso */
  { id: 'sciame', n: 'Sciame', c: '#6d78b8', w: 3,
    d: 'Molti più nemici, ognuno molto più fragile.', m: { rate: 1.75, hp: .5 } },
  { id: 'carestia', n: 'Carestia', c: '#ffc857', w: 3,
    d: 'Niente cuori né bombe a terra, ma i frammenti rendono il 70% in più.', m: { noDrops: 1, shard: 1.7 } },
  { id: 'eco', n: 'Eco', c: '#ff7de3', w: 3,
    d: 'I Risvegli richiedono una runa in meno, i guardiani hanno il 40% di vita in più.', m: { chain: -1, bossHp: 1.4 } },
  { id: 'cintura', n: 'Cintura', c: '#8b7ddb', w: 3,
    d: 'Il doppio degli asteroidi, e il doppio dei Nodi elementali.', m: { rocce: 1.9, nodo: 1.9 } },
  { id: 'tempesta', n: 'Tempesta', c: '#45d7ff', w: 3,
    d: 'Un evento d’arena ogni quaranta secondi invece che ogni novanta.', m: { ev: .45 } },
  { id: 'vetro', n: 'Vetro', c: '#ff3d6e', w: 3,
    d: 'Parti con metà vita, ma infliggi il 40% di danno in più.', m: { startHp: .5, dmg: 1.4 } },
  { id: 'fuga', n: 'Fuga', c: '#6ff2c4', w: 3,
    d: 'Tutti si muovono il 18% più veloci, tu compreso.', m: { spd: 1.18, pspd: 1.18 } }
];
/* Sorteggiata dal seme e non dal flusso della partita: il seme decide la
   corsa PRIMA che cominci, quindi si può mostrare sotto al bottone che la
   fa partire, e «ripeti questa semenza» ripete anche la congiunzione. */
function congiunzioneDi(seed) {
  let h = ((seed >>> 0) ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 2246822507) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  let tot = 0; for (const c of CONGIUNZIONI) tot += c.w;
  let r = (h % 10000) / 10000 * tot;
  for (const c of CONGIUNZIONI) { r -= c.w; if (r <= 0) return c; }
  return CONGIUNZIONI[0];
}
/* i modificatori attivi, già fusi coi valori neutri: chi li legge non deve
   sapere se c'è una congiunzione o no */
function congMods(c) {
  const m = Object.assign({ rate: 1, hp: 1, chain: 0, bossHp: 1, rocce: 1, nodo: 1, ev: 1, startHp: 1, dmg: 1, spd: 1, pspd: 1, shard: 1, noDrops: 0 }, (c && c.m) || {});
  return m;
}

/* ── rune da sbloccare ──────────────────────────────────────────
   Tutte e sedici le rune stavano nel mazzo al primo livello della prima
   partita: non esisteva, in tutta la vita del giocatore, il momento «ho
   trovato una runa nuova». Adesso si parte con otto — le sei aperture, che
   devono restare tutte scegliibili, più due — e le altre otto arrivano una
   per traguardo, cioè una quasi ogni partita per le prime dieci.
   I traguardi non sono arbitrari: ognuno chiede di fare una cosa che il
   gioco vuole insegnarti (durare, accendere un Risveglio, abbattere un
   guardiano, portare una runa in alto).                                    */
const RUNE_BASE = ['scintilla', 'scheggia', 'arco', 'sciame', 'raggio', 'iride', 'nova', 'falce'];
const SBLOCCHI = [
  { id: 'pira',         d: 'Sopravvivi quattro minuti in una partita.',  f: s => s.t >= 240 },
  { id: 'filo',         d: 'Accendi un Risveglio.',                      f: s => s.awakeMax >= 1 },
  { id: 'cristallo',    d: 'Abbatti un guardiano.',                      f: s => s.bossKills >= 1 },
  { id: 'bruma',        d: 'Porta una runa al livello 5.',               f: s => s.maxLv >= 5 },
  { id: 'prisma',       d: '500 eliminazioni in una partita.',           f: s => s.kills >= 500 },
  { id: 'tempesta',     d: 'Sopravvivi otto minuti in una partita.',     f: s => s.t >= 480 },
  { id: 'aureola',      d: 'Porta un Risveglio al secondo grado.',       f: s => s.tier2 },
  { id: 'singolarita',  d: 'Abbatti tre guardiani in una sola partita.', f: s => s.bossKills >= 3 }
];

/* ── contratti ──────────────────────────────────────────────────
   Le dodici sfide sono chiavi: si prendono una volta e finiscono. Dopo
   quelle non restava nessun obiettivo a portata, e «ascendi» — che chiede
   di vincere una corsa da venti minuti — non è un obiettivo a portata.
   I contratti sono tre alla volta, si rinnovano appena li completi, e il
   premio segue l'ascensione massima raggiunta così non diventano spiccioli.
   Sono valutati con lo stesso oggetto di statistiche delle sfide.          */
const CONTRATTI = [
  { id: 'lungo',    n: 'Corsa lunga',    d: 'Sopravvivi dodici minuti in una partita.',            r: 320, f: s => s.t >= 720 },
  { id: 'falciata', n: 'Falciata',       d: '900 eliminazioni in una partita.',                    r: 300, f: s => s.kills >= 900 },
  { id: 'coro',     n: 'Coro',           d: 'Tieni due Risvegli accesi insieme.',                  r: 340, f: s => s.awakeMax >= 2 },
  { id: 'apice',    n: 'Apice',          d: 'Porta un Risveglio al terzo grado.',                  r: 540, f: s => s.tier3 },
  { id: 'forma',    n: 'Cambio di forma',d: 'Trasforma una runa.',                                 r: 400, f: s => s.evo >= 1 },
  { id: 'cerchio',  n: 'Cerchio chiuso', d: 'Riempi ogni alloggiamento dell’anello.',              r: 260, f: s => s.pieno },
  { id: 'illeso',   n: 'Illeso',         d: 'Arriva al sesto minuto senza scendere a metà vita.',  r: 360, f: s => s.t >= 360 && !s.lowHp },
  { id: 'terna',    n: 'Terna',          d: 'Abbatti tre guardiani in una partita.',               r: 420, f: s => s.bossKills >= 3 },
  { id: 'cinque',   n: 'Cinquina',       d: 'Abbatti cinque guardiani in una partita.',            r: 640, f: s => s.bossKills >= 5 },
  { id: 'fretta',   n: 'Fretta',         d: 'Accendi un Risveglio entro il quarto minuto.',        r: 320, f: s => s.awakeAt > 0 && s.awakeAt <= 240 },
  { id: 'ordine',   n: 'Ordine',         d: 'Sopravvivi dieci minuti senza riordinare l’anello.',  r: 440, f: s => s.t >= 600 && s.reorders === 0 },
  { id: 'ponte',    n: 'Ponte',          d: 'Due Risvegli con un’Iride nell’anello.',              r: 400, f: s => s.awakeMax >= 2 && s.iride },
  { id: 'ardore',   n: 'Ardore',         d: 'Arriva al decimo minuto con Ardore acceso.',          r: 380, f: s => s.t >= 600 && s.aw.fuoco >= 1 },
  { id: 'torpore',  n: 'Torpore',        d: 'Arriva al decimo minuto con Torpore acceso.',         r: 380, f: s => s.t >= 600 && s.aw.gelo >= 1 },
  { id: 'carica',   n: 'Sovraccarico',   d: 'Arriva al decimo minuto con Sovraccarico acceso.',    r: 380, f: s => s.t >= 600 && s.aw.fulmine >= 1 },
  { id: 'collasso', n: 'Collasso',       d: 'Arriva al decimo minuto con Collasso acceso.',        r: 380, f: s => s.t >= 600 && s.aw.vuoto >= 1 },
  { id: 'radianza', n: 'Radianza',       d: 'Arriva al decimo minuto con Radianza accesa.',        r: 380, f: s => s.t >= 600 && s.aw.luce >= 1 },
  { id: 'frugale',  n: 'Frugale',        d: 'Arriva all’ottavo minuto senza rilanciare una carta.',r: 360, f: s => s.t >= 480 && s.rerollUsati === 0 },
  { id: 'lampo',    n: 'Lampo',          d: 'Vinci un’Incursione.',                                r: 520, f: s => s.win && s.modo === 'incursione' },
  { id: 'trionfo',  n: 'Trionfo',        d: 'Vinci una partita.',                                  r: 700, f: s => s.win },
  { id: 'salita',   n: 'Salita',         d: 'Vinci ad ascensione 2 o superiore.',                  r: 900, f: s => s.win && s.ascLv >= 2 }
];
/* il premio sale con l'ascensione massima raggiunta: a livello 6 un
   contratto da 320 ne vale 550, o smetterebbe di essere un motivo */
const contrattoPremio = (c) => Math.round(c.r * (1 + (SAVE.asc | 0) * .12));

/* ── reliquie ───────────────────────────────────────────────────
   Il capitolo caro dell'Osservatorio, e l'unico dove ogni voce è una
   regola: i potenziamenti sono numeri, le reliquie cambiano cosa succede.
   Si comprano una volta e valgono per sempre, e servono a dare ai
   frammenti qualcosa di grosso da comprare quando le prime spese —
   quelle che devono essere a buon mercato — sono finite.                   */
const RELIQUIE = [
  { id: 'semenza',   n: 'Semenza',        c: 1400, ico: 'innesco',   d: 'Inizi ogni partita con un livello già preso.' },
  { id: 'mercante',  n: 'Mercante',       c: 1600, ico: 'frammento', d: 'Dissolvere una runa rende il doppio dei frammenti.' },
  { id: 'richiamo',  n: 'Richiamo',       c: 1800, ico: 'orbita',    d: 'Gli eventi d’arena arrivano il 35% più spesso.' },
  { id: 'avanzo',    n: 'Avanzo',         c: 1900, ico: 'linfa',     d: 'Saltare una carta cura il doppio e dà 120 frammenti.' },
  { id: 'bussola',   n: 'Bussola',        c: 2300, ico: 'magnete',   d: 'Un Nodo dell’arena è sempre sintonizzato sulla tua apertura.' },
  { id: 'crogiolo',  n: 'Crogiolo',       c: 2600, ico: 'cometa',    d: 'Le trasformazioni arrivano al livello 7 invece che all’8.' },
  { id: 'coro',      n: 'Coro di stelle', c: 3000, ico: 'vortice',   d: 'Ogni Risveglio acceso dà +7% danno a tutte le rune.' },
  { id: 'respiro',   n: 'Respiro',        c: 3400, ico: 'rinascita', d: 'Una volta per partita, scendere sotto un quarto di vita ti cura del 30% e ti rende intoccabile per tre secondi.' }
];
const hasRel = id => SAVE.reliquie.indexOf(id) >= 0;

/* ── corsa del giorno ───────────────────────────────────────────
   Stessa data, stesso seme, quindi stessa arena, stesse carte e stessa
   congiunzione per chiunque la giochi: è l'unico modo, in un gioco senza
   rete, di avere una partita che si può confrontare — e un motivo per
   riaprirlo domani invece che mai.                                          */
function dataOggi(d) {
  const x = d || new Date();
  return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
}
function semeDelGiorno(iso) {
  const s = iso || dataOggi();
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return (h || 1) >>> 0;
}

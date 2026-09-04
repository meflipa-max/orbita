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
  mietitore: { n: 'Mietitore', el: 'vuoto', tag: 'trasformazione', evo: 1, d: 'Lame che spiraleggiano a lungo risucchiando i nemici lungo il cammino.',
    base: { dmg: 76, cd: 1.25, spd: 320, count: 3, size: 27 }, g: { dmg: 31, cd: -.07, count: .3, spd: 10 } },
  alba: { n: 'Alba', el: 'luce', tag: 'trasformazione', evo: 1, d: 'Due fasci opposti che spazzano l’arena senza fermarsi mai.',
    base: { dmg: 8, cd: .09, area: 335, spd: 1.05 }, g: { dmg: 2.9, area: 17, spd: .04 } }
};
/* quale runa diventa cosa */
const EVO = { scintilla: 'cometa', cristallo: 'glaciale', arco: 'fulgore', falce: 'mietitore', raggio: 'alba' };
const RUNEIDS = Object.keys(RUNES).filter(id => !RUNES[id].evo);

/* una runa può trasformarsi? livello massimo, risonanza da entrambi i lati,
   elemento risvegliato */
function canEvolve(r) {
  return !!(r && EVO[r.id] && r.lv >= 8 && r.res >= 2 && G.awaken[r.el] >= 1);
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
  { t: 450,  pool: ['scissore', 'spettro', 'bruto', 'vagante'] },
  { t: 570,  pool: ['spettro', 'bruto', 'lancia', 'scissore'] },
  { t: 700,  pool: ['bruto', 'lancia', 'spettro', 'scissore', 'dardo'] },
  { t: 860,  pool: ['bruto', 'lancia', 'spettro', 'bruto', 'scissore'] },
  { t: 1020, pool: ['bruto', 'lancia', 'bruto', 'spettro', 'scissore', 'vagante'] }
];
/* Guardiani ogni ~3,5 minuti. Il cronometro si ferma durante le scelte,
   quindi gli intervalli sono più stretti di quanto sembri all'orologio da polso. */
const BOSSES = [
  { t: 150,  id: 'custode', n: 'CUSTODE', hp: 1150,  spd: 118, r: 44, dmg: 22, c: '#ff6a2b', xp: 90,  pat: 'summon' },
  { t: 360,  id: 'aracne',  n: 'ARACNE',  hp: 3600,  spd: 132, r: 40, dmg: 28, c: '#b06bff', xp: 170, pat: 'radial' },
  { t: 570,  id: 'titano',  n: 'TITANO',  hp: 7800,  spd: 120, r: 52, dmg: 34, c: '#45d7ff', xp: 260, pat: 'charge' },
  { t: 810,  id: 'aurora',  n: 'AURORA',  hp: 13500, spd: 145, r: 46, dmg: 34, c: '#ffe14f', xp: 380, pat: 'mix' },
  { t: 1080, id: 'eclissi', n: 'ECLISSI', hp: 26000, spd: 158, r: 58, dmg: 44, c: '#ff3d6e', xp: 700, pat: 'final' }
];
const RUN_LEN = 1200; /* 20 minuti */

/* ── personaggi ─────────────────────────────────────────────── */
/* Nuclei. Le statistiche da sole non cambiano come si gioca: si scelgono
   una volta e si dimenticano. Ognuno porta anche una REGOLA che riscrive
   qualcosa del gioco — e le due che toccano l'anello (Nadir e Lyra) lo
   riscrivono davvero, perché l'anello è il gioco.                        */
const CHARS = [
  { id: 'vega',    n: 'Vega',    c: '#bff6ff', start: 'scintilla',   cost: 0,
    d: 'Equilibrata sotto ogni aspetto.', mod: {} },
  { id: 'rigel',   n: 'Rigel',   c: '#45d7ff', start: 'scheggia',    cost: 400,
    d: '+24% velocità · −20% vita', mod: { spd: 1.24, hp: .8 },
    rule: 'slancio', ruleD: 'In movimento le rune sparano il 18% più in fretta.' },
  { id: 'antares', n: 'Antares', c: '#ff6a2b', start: 'nova',        cost: 900,
    d: '+50% vita · +12% area · −12% velocità', mod: { hp: 1.5, area: 1.12, spd: .88 },
    rule: 'contraccolpo', ruleD: 'Ogni ferita che subisci scatena una Nova.' },
  { id: 'sirio',   n: 'Sirio',   c: '#ffe9b0', start: 'raggio',      cost: 1600,
    d: '+15% critico · +40% danno critico · −18% vita', mod: { crit: .15, critD: .4, hp: .82 },
    rule: 'cadenza', ruleD: 'Ogni critico accorcia di 0,04s la ricarica di tutte le rune.' },
  { id: 'nadir',   n: 'Nadir',   c: '#b06bff', start: 'singolarita', cost: 2600,
    d: '+25% esperienza · −8% danno', mod: { xp: 1.25, dmg: .92 },
    rule: 'ecoLunga', ruleD: 'Le rune risuonano anche saltando un alloggiamento.' },
  { id: 'lyra',    n: 'Lyra',    c: '#ff7de3', start: 'iride',       cost: 3800,
    d: 'Due alloggiamenti in meno · +20% danno', mod: { dmg: 1.2 },
    rule: 'anelloCorto', ruleD: 'Anello dimezzato, ma ogni runa conta doppia per le catene.' }
];

/* ── potenziamenti permanenti ───────────────────────────────── */
const META = [
  { id: 'nucleo',    n: 'Nucleo Denso',   max: 5, c: 60,   step: 1.7, ico: 'vigore',     d: '+8% Vita massima' },
  { id: 'furia',     n: 'Furia',          max: 5, c: 85,   step: 1.8, ico: 'impeto',     d: '+5% Danno' },
  { id: 'passo',     n: 'Passo Leggero',  max: 4, c: 70,   step: 1.7, ico: 'celerita',   d: '+4% Velocità' },
  { id: 'occhio',    n: 'Occhio Acuto',   max: 4, c: 95,   step: 1.8, ico: 'precisione', d: '+3% Critico' },
  { id: 'avidita',   n: 'Avidità',        max: 4, c: 75,   step: 1.8, ico: 'sapienza',   d: '+8% Esperienza' },
  { id: 'calamita',  n: 'Calamita',       max: 3, c: 65,   step: 1.8, ico: 'magnete',    d: '+22% Raggio di raccolta' },
  { id: 'linfa',     n: 'Linfa Stellare', max: 3, c: 120,  step: 1.9, ico: 'linfa',      d: '+0,3 Rigenerazione al secondo' },
  { id: 'fortuna',   n: 'Fortuna',        max: 4, c: 90,   step: 1.8, ico: 'frammento',  d: '+12% Frammenti raccolti' },
  { id: 'ripensamento', n: 'Ripensamento', max: 3, c: 140, step: 1.8, ico: 'vortice',   d: '+1 Rilancio per partita' },
  /* è il potenziamento che sblocca la libertà di build: con sei alloggiamenti
     la runa iniziale ti obbliga a usare il suo elemento. Costo ridotto. */
  { id: 'orbita',    n: 'Orbita Estesa',  max: 2, c: 700,  step: 1.9, ico: 'orbita',     d: '+1 alloggiamento nell’anello' },
  { id: 'rinascita', n: 'Rinascita',      max: 1, c: 1500, step: 1,   ico: 'rinascita',  d: 'Torni in vita una volta per partita' }
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

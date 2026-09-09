/* ═══════════════════════════════════════════════════════════════
   ORBITA — partite simulate.

     npm run misura            una corsa e un'incursione, ascensione 0
     npm run misura -- asc     la scala di difficolta' dei due formati
     npm run misura -- cong    ogni congiunzione, novanta secondi ciascuna

   Il bot schiva scegliendo, ogni mezzo secondo, la piu' libera fra
   ventiquattro direzioni, e insegue le gemme perche' senza livelli non
   c'e' build da misurare. Va preso per quello che e': schiva meglio di
   un essere umano e sceglie le carte peggio, quindi misura la COERENZA
   di una curva, non la difficolta' percepita.
   ═══════════════════════════════════════════════════════════════ */
import { O, IN } from './banco.mjs';

const G = O.G, P = O.P;
const MAZZO_BASE = ['scintilla', 'scheggia', 'arco', 'sciame', 'raggio', 'iride', 'nova', 'falce'];
const MAZZO_PIENO = Object.keys(O.RUNES).filter(k => !O.RUNES[k].evo);

/* ── il bot ─────────────────────────────────────────────────── */
let botT = 0, botA = 0;
function bot(dt) {
  botT -= dt;
  if (botT > 0) { IN.ax = Math.cos(botA); IN.ay = Math.sin(botA); return; }
  botT = .5;
  let best = -1e9;
  for (let k = 0; k < 24; k++) {
    const a = k / 24 * Math.PI * 2;
    const px = G.p.x + Math.cos(a) * 190, py = G.p.y + Math.sin(a) * 190;
    /* Il muro conta come una minaccia. Senza, il bot scappava in linea
       retta fino all'angolo dell'arena e ci moriva dentro: una morte del
       bot, non del gioco, che falsava ogni riga della tabella. */
    if (Math.abs(px) > 1620 || Math.abs(py) > 1620) continue;
    let s = -Math.max(0, Math.abs(px) - 1200) * 3 - Math.max(0, Math.abs(py) - 1200) * 3;
    for (const e of G.enemies) {
      const d = Math.hypot(e.x - px, e.y - py);
      if (d < 260) s -= (260 - d) * (e.boss ? 4 : 1);
    }
    for (const g of G.gems) { const d = Math.hypot(g.x - px, g.y - py); if (d < 340) s += (340 - d) * .35; }
    if (s > best) { best = s; botA = a; }
  }
  IN.ax = Math.cos(botA); IN.ay = Math.sin(botA);
}

/* ── le carte ───────────────────────────────────────────────── */
function scegli() {
  let giri = 0;
  while (G.pending > 0 && giri++ < 40) {
    const ch = O.roll(3);
    const c = ch.find(x => x.t === 'evo') || ch.find(x => x.t === 'rnew')
           || ch.find(x => x.t === 'rup') || ch.find(x => x.t === 'pas') || ch[0];
    const serve = O.apply(c);
    G.pending--;
    if (serve === true) {
      /* accanto a una runa compatibile, se si puo': altrimenti misureremmo
         un anello che nessun giocatore costruirebbe */
      let slot = -1, best = -1;
      for (let i = 0; i < G.slots; i++) {
        if (G.ring[i]) continue;
        const a = G.ring[(i - 1 + G.slots) % G.slots], b = G.ring[(i + 1) % G.slots];
        const el = O.RUNES[c.id].el;
        let p = 0;
        if (a && (a.el === el || a.el === 'iride' || el === 'iride')) p++;
        if (b && (b.el === el || b.el === 'iride' || el === 'iride')) p++;
        if (p > best) { best = p; slot = i; }
      }
      if (slot >= 0) O.place(c.id, slot);
    }
  }
  G.pending = 0;
}

/* ── una partita ────────────────────────────────────────────── */
export function partita(opt = {}) {
  const S = O.save();
  S.modo = opt.modo || 'corsa';
  S.asc = S.ascSel = opt.asc || 0;
  S.runes = opt.mazzoPieno ? MAZZO_PIENO.slice() : MAZZO_BASE.slice();
  S.visti = ['breccia', 'marea', 'caccia', 'nodo', 'gemme'];   /* niente briefing nella misura */
  O.reset(opt.char || 'vega', opt.seed || 12345, S.modo, false);
  G.state = 'play';
  const dt = 1 / 60, max = Math.round((opt.secondi || G.modo.len + 90) / dt);
  for (let i = 0; i < max; i++) {
    bot(dt);
    O.step(dt);
    if (G.briefing) G.briefing = null;
    if (G.pending > 0) scegli();
    if (opt.immortale) P.hp = P.maxHp;
    if (P.hp <= 0 || G.victory) break;
  }
  return {
    modo: G.modo.id, cong: G.cong.id, t: Math.round(G.t), lv: G.level,
    kills: G.kills, boss: G.bossKills, vinta: G.victory ? 1 : 0,
    guardiani: G.roster.map(b => b.n + '@' + b.t + 's').join(' ')
  };
}

/* ── i tre banchi ───────────────────────────────────────────── */
const semi = [1111, 2222, 3333, 4444];
const media = (a, f) => Math.round(a.reduce((s, x) => s + f(x), 0) / a.length);

function banchoBase() {
  console.log('formato      seme   cong       tempo  lv   uccisioni  guardiani  vinta');
  for (const modo of ['corsa', 'incursione'])
    for (const s of semi.slice(0, 2)) {
      const r = partita({ modo, seed: s, mazzoPieno: true });
      console.log(modo.padEnd(12), String(s).padEnd(6), r.cong.padEnd(10),
        String(r.t).padEnd(6), String(r.lv).padEnd(4), String(r.kills).padEnd(10),
        String(r.boss).padEnd(10), r.vinta ? 'sì' : 'no');
    }
}

function bancoAsc() {
  console.log('formato      asc  vinte  tempo medio  livello medio  guardiani');
  for (const modo of ['corsa', 'incursione'])
    for (const asc of [0, 4, 8, 12]) {
      const r = semi.map(s => partita({ modo, seed: s, asc, mazzoPieno: true }));
      console.log(modo.padEnd(12), String(asc).padEnd(4),
        (r.filter(x => x.vinta).length + '/' + r.length).padEnd(6),
        String(media(r, x => x.t)).padEnd(12), String(media(r, x => x.lv)).padEnd(14),
        (media(r, x => x.boss * 10) / 10).toFixed(1));
    }
}

function bancoCong() {
  console.log('congiunzione  uccisioni  nemici vivi  rocce  nodi');
  for (const c of O.CONGIUNZIONI) {
    let seed = 1; while (O.congiunzioneDi(seed).id !== c.id) seed++;
    partita({ modo: 'corsa', seed, secondi: 90, immortale: true, mazzoPieno: true });
    console.log(c.n.padEnd(13), String(G.kills).padEnd(10), String(G.enemies.length).padEnd(12),
      String(G.rocks.length).padEnd(6), G.rocks.filter(r => r.nodo).length);
  }
}

const quale = process.argv[2] || 'base';
console.log('— banco: ' + quale + ' —\n');
({ base: banchoBase, asc: bancoAsc, cong: bancoCong }[quale] || banchoBase)();

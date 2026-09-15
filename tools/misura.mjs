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
    /* Gli eventi d'arena si giocano: un bot che li ignora ne paga il prezzo
       — i nemici che la Fermata richiama, il giro dell'Allineamento — senza
       mai incassarne il premio, e misura una difficolta' che nessuno vive.
       La Fermata tira dentro il cerchio e ci tiene; l'Allineamento vale
       come una gemma molto grossa su ogni sigillo ancora acceso. */
    const ev = G.ev;
    if (ev && ev.k === 'fermata') {
      const d = Math.hypot(ev.x - px, ev.y - py);
      s += d < ev.r * .8 ? 900 : -d * 1.2;
    } else if (ev && ev.k === 'allineamento') {
      for (const sg of ev.sig) {
        if (sg.preso || sg.morto) continue;
        const d = Math.hypot(sg.x - px, sg.y - py);
        if (d < 900) s += (900 - d) * .7;
      }
    } else if (ev && ev.k === 'breccia' && !ev.preso) {
      const d = Math.hypot(ev.x - px, ev.y - py);
      if (d < 1000) s += (1000 - d) * .5;
    }
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
  /* niente briefing nella misura: l'elenco esce da BRIEFING, cosi'
     aggiungendo un evento d'arena il bot non si ferma sulla spiegazione */
  S.visti = Object.keys(O.BRIEFING).concat(['gemme', 'raffica', 'culmine']);
  O.reset(opt.char || 'vega', opt.seed || 12345, S.modo, false);
  /* ── la scala delle ascensioni si misura in Quiete ───────────────
     La congiunzione esce dal seme, quindi quattro semi fissi portano
     dentro anche la regola che quel seme sorteggia — e basta aggiungere
     una riga a CONGIUNZIONI perche' il peso totale cambi e TUTTI i semi
     rimappino su congiunzioni diverse. E' successo aggiungendone tre: i
     quattro semi storici sono passati da (Tempesta, Quiete, …) a (Fuga,
     Quiete, Vetro, Fuga) e la riga «corsa asc 12» e' crollata da 354
     secondi medi a 45, perche' il Vetro dimezza la vita su un'ascensione
     che la dimezza gia'. Sembrava che il gioco fosse diventato
     impossibile: era la misura a essere cambiata sotto i piedi.
     Un banco che misura una cosa deve tenere ferme le altre. La
     congiunzione ha il suo, di banco. */
  if (opt.quiete) {
    G.cong = O.CONGIUNZIONI.find(c => c.id === 'quiete');
    G.cg = O.congMods(null);
  }
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
      const r = semi.map(s => partita({ modo, seed: s, asc, mazzoPieno: true, quiete: true }));
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

/* ── l'economia ─────────────────────────────────────────────────
   Quanto rende una partita e quanto costa il negozio, misurati insieme:
   sono l'unico modo di dire se i frammenti valgono qualcosa. La domanda a
   cui risponde e' «dopo quante corse il negozio e' finito?», e la risposta
   giusta non e' «una».                                                    */
function bancoSoldi() {
  const fmt = n => n.toLocaleString('it-IT');
  let meta = 0, senzaDominio = 0;
  for (const m of O.META) {
    let c = 0; for (let lv = 0; lv < m.max; lv++) c += O.metaCost(m, lv);
    meta += c; if (m.id !== 'dominio') senzaDominio += c;
  }
  const nuclei = O.CHARS.reduce((a, c) => a + (c.cost || 0), 0);
  const rel = O.RELIQUIE.reduce((a, r) => a + r.c, 0);
  const tutto = senzaDominio + nuclei + rel;
  console.log('il negozio, tutto quello che ha un fondo:');
  console.log('  potenziamenti (senza Dominio) ' + fmt(senzaDominio));
  console.log('  nuclei                        ' + fmt(nuclei));
  console.log('  reliquie                      ' + fmt(rel));
  console.log('  TOTALE                        ' + fmt(tutto));
  console.log('  (il Dominio, senza fondo, ne costa ' + fmt(meta - senzaDominio) + ')\n');
  console.log('formato      seme  tempo  lv   uccisioni  vinta  paga   corse per il negozio');
  const righe = [];
  for (const modo of ['corsa', 'incursione'])
    for (const s of semi.slice(0, 2)) {
      const r = partita({ modo, seed: s, mazzoPieno: true, immortale: true });
      const paga = O.payout();
      righe.push(paga);
      console.log(modo.padEnd(12), String(s).padEnd(5), String(r.t).padEnd(6),
        String(r.lv).padEnd(4), String(r.kills).padEnd(10), (r.vinta ? 'sì' : 'no').padEnd(6),
        String(paga).padEnd(6), (tutto / paga).toFixed(1));
    }
  console.log('\nmedia paga: ' + media(righe, x => x) + ' · corse per comprare tutto: ' +
    (tutto / (righe.reduce((a, b) => a + b, 0) / righe.length)).toFixed(1));
  /* La prima corsa della vita: mazzo base, cinque minuti, persa. Deve pagare
     le prime due REGOLE del negozio — Innesco 110 e Presagio 160 — perche' e'
     su quella promessa che il negozio e' costruito: «in cima ci sono regole a
     buon mercato, comprabili dopo una partita sola». Un'economia si sbaglia
     in due modi, e questo e' l'altro. */
  console.log('\nla prima corsa (mazzo base, 5 minuti, persa)');
  for (const s of semi.slice(0, 2)) {
    partita({ modo: 'corsa', seed: s, secondi: 300 });
    const paga = O.payout();
    console.log('  seme ' + s + ': ' + G.kills + ' uccisioni, livello ' + G.level +
      ' → ' + paga + ' frammenti (Innesco 110' + (paga >= 110 ? ' ✓' : ' ✗') +
      ', Innesco+Presagio 270' + (paga >= 270 ? ' ✓' : ' ✗') + ')');
  }
}

/* ── il prezzo del Perigeo ───────────────────────────────────────
   Chiudere l'anello costa TUTTO il danno per la sua durata e restituisce
   un'onda che vale quanto ha tenuto. Le due cose vanno lette insieme, o non
   si sa se il Perigeo sia una scelta o un regalo: qui si misura il danno al
   secondo di un anello vero a tre tappe della corsa, e accanto si mette
   quello che l'onda restituisce con zero, venti e quaranta punti assorbiti.
   L'onda deve restare SOTTO il buco che lascia: il Perigeo deve convenire
   per quello che evita, non per quello che fa.                          */
function bancoPerigeo() {
  const S = O.save();
  S.modo = 'corsa'; S.asc = S.ascSel = 0; S.runes = MAZZO_PIENO.slice();
  S.visti = Object.keys(O.BRIEFING).concat(['gemme', 'raffica', 'culmine']);
  O.reset('vega', 1111, 'corsa', false);
  G.state = 'play';
  const dt = 1 / 60, tappe = [300, 600, 900];
  const passo = n => { for (let j = 0; j < n; j++) {
    bot(dt); O.step(dt);
    if (G.briefing) G.briefing = null;
    if (G.pending > 0) scegli();
    G.state = 'play'; P.hp = P.maxHp;
  } };
  console.log('minuto   danno/s   il buco (2,2s)   onda a 0   a 20   a 40   il buco lo ripaga?');
  for (const t of tappe) {
    while (G.t < t) passo(60);
    const d0 = G.dmgDone, t0 = G.t;
    passo(600);
    const dps = (G.dmgDone - d0) / (G.t - t0);
    const buco = dps * 2.2;
    const onda = n => Math.round((24 + 16 * Math.min(40, n)) * P.dmgMul);
    console.log(String(Math.round(t / 60)).padEnd(8), String(Math.round(dps)).padEnd(9),
      String(Math.round(buco)).padEnd(16), String(onda(0)).padEnd(10), String(onda(20)).padEnd(6),
      String(onda(40)).padEnd(6), (onda(40) / buco * 100).toFixed(0) + '%');
  }
  console.log('\n(il bot non prende danno: qui si misura il prezzo, non quanto il Perigeo salvi)');
}

/* ── quante volte la partita si ferma ────────────────────────────
   Ogni carta e' una schermata, e ogni schermata e' il gioco che si ferma. I
   livelli sono la meta' del conto; l'altra meta' sono gli scrigni, e quelli
   non li decide la curva dell'esperienza ma quattro sorgenti diverse che non
   si parlano fra loro: gli elite (uno ogni ottanta secondi circa), i cinque
   guardiani, e gli eventi d'arena che ne pagano uno a testa — breccia,
   allineamento, fermata, corriere. Se la somma diventa una schermata ogni
   quindici secondi, scegliere una carta smette di essere un momento e
   diventa un intralcio, e le tre carte si premono senza guardarle.
   Qui si contano davvero, una corsa intera, minuto per minuto.          */
function bancoScrigni() {
  for (const modo of ['corsa', 'incursione']) { console.log('— ' + modo + ' —'); unaCorsa(modo); console.log(''); }
}
function unaCorsa(modo) {
  const S = O.save();
  S.modo = modo; S.asc = S.ascSel = 0; S.runes = MAZZO_PIENO.slice();
  S.visti = Object.keys(O.BRIEFING).concat(['gemme', 'raffica', 'culmine']);
  O.reset('vega', 1111, modo, false);
  G.state = 'play';
  const dt = 1 / 60;
  let lv = G.level, scr = G.chests | 0;
  let livelli = 0, scrigni = 0, pilaMax = 0;
  const perMin = [];
  for (let i = 0; i < 60 * 1300; i++) {
    bot(dt); O.step(dt);
    if (G.briefing) G.briefing = null;
    if (G.level > lv) { const n = G.level - lv; livelli += n; segna(n, 0); lv = G.level; }
    if ((G.chests | 0) > scr) { const n = (G.chests | 0) - scr; scrigni += n; segna(n, 1); }
    if (G.pending > pilaMax) pilaMax = G.pending;
    if (G.pending > 0) scegli();
    scr = G.chests | 0;
    G.state = 'play'; P.hp = P.maxHp;
    if (G.victory) break;
  }
  function segna(n, tipo) {
    const m = Math.floor(G.t / 60);
    const o = perMin[m] || (perMin[m] = { l: 0, s: 0 });
    if (tipo) o.s += n; else o.l += n;
  }
  const carte = livelli + scrigni;
  console.log('corsa di ' + Math.round(G.t) + 's, livello ' + G.level + ', ' + G.kills + ' uccisioni\n');
  console.log('  carte totali      ' + carte);
  console.log('  di cui livelli    ' + livelli);
  console.log('  di cui scrigni    ' + scrigni + '  (' + Math.round(scrigni / carte * 100) + '%)');
  console.log('  guardiani abbattuti ' + G.bossKills);
  console.log('  una schermata ogni ' + (G.t / carte).toFixed(1) + 's');
  console.log('  pila massima      ' + pilaMax + ' carte insieme\n');
  const mm = [];
  for (let m = 0; m <= Math.floor(G.t / 60); m++) mm.push(perMin[m] || { l: 0, s: 0 });
  console.log('  minuto:   ' + mm.map((o, i) => String(i).padStart(2)).join(' '));
  console.log('  livelli:  ' + mm.map(o => String(o.l).padStart(2)).join(' '));
  console.log('  scrigni:  ' + mm.map(o => String(o.s).padStart(2)).join(' '));
  console.log('  insieme:  ' + mm.map(o => String(o.l + o.s).padStart(2)).join(' '));
}

const quale = process.argv[2] || 'base';
console.log('— banco: ' + quale + ' —\n');
({ base: banchoBase, asc: bancoAsc, cong: bancoCong, soldi: bancoSoldi, perigeo: bancoPerigeo, scrigni: bancoScrigni }[quale] || banchoBase)();

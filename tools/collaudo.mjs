/* ═══════════════════════════════════════════════════════════════
   ORBITA — collaudo.  `npm run collaudo`

   Controlli che girano sul gioco vero, non su una copia delle regole.
   Ognuno esiste perché un difetto c'era davvero: il commento sopra dice
   quale, così chi lo trova rotto sa cosa stava proteggendo.
   ═══════════════════════════════════════════════════════════════ */
import { O, IN } from './banco.mjs';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const G = O.G, P = O.P, S = O.save;
let ko = 0, tot = 0;
const ok = (c, m) => { tot++; if (!c) { ko++; console.log('  ✗ ' + m); } else console.log('  ✓ ' + m); };
const sez = t => console.log('\n— ' + t + ' —');
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/, '');
const gioca = (s, f) => { for (let i = 0; i < 60 * s; i++) { if (f) f(i); O.step(1 / 60); P.hp = P.maxHp; G.pending = 0; } };

sez('ogni bottone ha il suo gestore');
/* Estraendo UI.chiudiBriefing() da uno `switch` ho tagliato via
   ventiquattro `case` insieme al blocco che stavo togliendo: modo,
   apertura, nucleo, ascensione, acquisti, pausa, abbandona, riprendi...
   Il gioco si compilava, le schermate si disegnavano, e i test passavano
   tutti — perché nessuno di loro toccava un bottone. Sono andati in
   produzione tre commit così. Questo controllo legge il sorgente e basta:
   costa niente e quella classe di errore non passa più. */
{
  const ui = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', '05-ui.js'), 'utf8');
  const casi = new Set([...ui.matchAll(/^\s*case '([a-z0-9]+)':/gm)].map(m => m[1]));
  const bottoni = new Set([...ui.matchAll(/data-a="([a-z0-9]+)"/g)].map(m => m[1]));
  const orfani = [...bottoni].filter(x => !casi.has(x));
  const morti = [...casi].filter(x => !bottoni.has(x));
  ok(orfani.length === 0, bottoni.size + ' bottoni, nessuno senza gestore' + (orfani.length ? ': ' + orfani.join(' ') : ''));
  ok(morti.length === 0, casi.size + ' gestori, nessuno senza bottone' + (morti.length ? ': ' + morti.join(' ') : ''));
}

sez('la corsa in sospeso');
/* Su un telefono una partita da venti minuti finisce quando arriva una
   notifica, non quando decidi tu: perderla e' il modo piu' rapido di far
   chiudere il gioco. */
S().visti = ['gemme','breccia','marea','caccia','nodo'];
O.reset('vega', 4242, 'incursione', false); G.state = 'play';
gioca(90);
const primaT = G.t, primaLv = G.level, primaK = G.kills;
O.salvaCorsa();
const nota = O.leggiCorsa();
ok(!!nota, 'una corsa in corso viene annotata');
ok(nota && Math.abs(nota.t - primaT) < 1 && nota.level === primaLv, 'con orologio e livello giusti');
O.reset('vega', 1, 'corsa', false);            /* come se il gioco fosse stato riaperto */
O.riprendiCorsa(nota);
ok(Math.abs(G.t - primaT) < 1 && G.level === primaLv && G.kills === primaK,
   'riprendendo tornano orologio (' + Math.round(G.t) + 's), livello (' + G.level + ') e uccisioni');
ok(G.modo.id === 'incursione' && (G.seed >>> 0) === 4242, 'e anche formato e semenza');
ok(G.enemies.length > 10, 'il campo non riparte sgombro: ' + G.enemies.length + ' nemici');
O.endRun(false);
ok(!O.leggiCorsa(), 'finita la partita non resta niente da riprendere');

sez('salvataggio');
ok(O.importSave(b64({ shards: 500, meta: { nucleo: 2 }, chars: ['vega'], wins: 1 })), 'si apre un salvataggio della versione precedente');
ok(S().runes.length === 8, 'riceve le otto rune di partenza');
ok(S().contratti !== undefined, 'ha il campo dei contratti');
S().shards = 1234; O.storeSave();
const codice = S() && O.exportSave(), prima = JSON.stringify(S());
ok(O.importSave(codice) && JSON.stringify(S()) === prima, 'il codice di backup fa andata e ritorno');
/* La vetrina del menu raccoglieva una scheggia da sola e segnava la lezione
   come imparata prima di toccare Gioca: chi ha aperto quella versione non
   l'avrebbe vista mai piu'. Questa e' la riparazione una tantum. */
ok(O.importSave(b64({ shards: 9, visti: ['gemme', 'breccia'] })) && S().visti.indexOf('gemme') < 0,
   'un salvataggio senza numero di versione perde il flag messo per sbaglio dalla vetrina');
ok(S().visti.indexOf('breccia') >= 0, '...ma tiene quelli messi dal gioco vero');

sez('le spiegazioni si possono chiudere');
/* «Ho capito» chiamava riprendiGioco(), che una modifica aveva cancellato:
   il gioco restava congelato per sempre sulla carta. node --check non lo
   vede, perche' e' un errore a tempo di esecuzione. */
for (const id of Object.keys(O.BRIEFING)) {
  O.reset('vega', 7, 'corsa', false); G.state = 'play';
  S().visti = [];
  try {
    G.briefing = id; O.UI.briefing(id); G.state = 'briefing';
    O.UI.chiudiBriefing();
    ok(G.state === 'play' && !G.briefing && S().visti.indexOf(id) >= 0, id + ': si apre, si chiude, il gioco riparte');
  } catch (e) { ok(false, id + ' lancia: ' + e.message); }
}

sez('la lezione sulle schegge');
S().visti = []; O.storeSave();
O.reset('vega', 21, 'corsa', false); G.state = 'play';
gioca(6, i => { IN.ax = Math.cos(i / 60); IN.ay = Math.sin(i / 60); });
ok(G.briefing === 'gemme' || S().visti.indexOf('gemme') >= 0, 'compare entro i primi sei secondi');
G.briefing = null; S().visti.push('gemme'); G.lezioneGemme = 1;
gioca(15, i => { IN.ax = Math.cos(i / 60); IN.ay = Math.sin(i / 60); });
ok(G.lezioneGemme === 2, 'si chiude raccogliendo una scheggia, non a tempo');
/* la vetrina del menu non deve consumarla */
S().visti = []; G.lezioneGemme = 1; G.demo = true;
gioca(10);
ok(G.lezioneGemme === 1, 'la vetrina del menu non la consuma');
G.demo = false;

sez('la diagnosi dice la condizione giusta');
/* La fine partita accusava sempre la risonanza: con un'Iride a livello 7 fra
   due vicine — che risuonava benissimo — diceva di riordinare un anello
   già a posto, e la regola vera (all'Iride servono DUE Risvegli accesi
   insieme) restava un segreto. Stessa radice nell'anello in pausa, che al
   jolly chiedeva "il Risveglio null", perché un elemento suo non ce l'ha.
   Adesso le condizioni stanno scritte in un posto solo, mancaEvo(). */
{
  const testo = () => O.UI.diagnosi(true);
  const anello = () => O.UI.evoLine();
  const mk = (id, lv, res) => ({ id, el: O.RUNES[id].el, lv, res });
  S().visti = ['gemme','breccia','marea','caccia','nodo'];
  O.reset('vega', 4242, 'incursione', false); G.state = 'play';
  G.slots = 6; G.evoCount = 0; G.culms = 5; G.dmgSrc = { iride: 10 };

  /* lo scenario vero: Iride 7, risuona da entrambi i lati, un Risveglio solo */
  G.ring = [null, mk('arco',5,1), mk('iride',7,2), mk('sciame',4,2), mk('falce',3,2), mk('nova',2,1)];
  G.awaken = { fuoco:0, gelo:0, fulmine:0, vuoto:1, luce:0 };
  ok(!/risuonava/.test(testo()), 'a chi risuonava da entrambi i lati non dice il contrario');
  ok(/due Risvegli/.test(testo()), 'e all\u2019Iride chiede i due Risvegli che le mancano');
  ok(!/null|undefined/.test(anello()), 'l\u2019anello non chiede all\u2019Iride "il Risveglio null"');

  /* una runa normale che risuona ma senza il Risveglio del suo elemento */
  G.ring = [null, mk('arco',6,2), null, null, null, null];
  ok(/Sovraccarico/.test(testo()) && !/risuonava/.test(testo()), 'nomina il Risveglio spento, non la risonanza');

  /* e quando non risuona davvero, lo dice — col consiglio che costa zero */
  G.awaken = { fuoco:0, gelo:0, fulmine:1, vuoto:0, luce:0 };
  G.ring = [mk('arco',6,1), null, null, null, null, null];
  ok(/risuonava/.test(testo()) && /Riordina/.test(testo()), 'e quando è la risonanza a mancare lo dice');

  /* pronta e mai presa: c'era un "ma" senza niente dietro */
  G.awaken = { fuoco:0, gelo:0, fulmine:1, vuoto:0, luce:0 };
  G.ring = [mk('arco',6,2), null, null, null, null, null];
  ok(/pronta/.test(testo()) && !/ma \./.test(testo()), 'chi era già pronta non si sente dire che le mancava qualcosa');
}

sez('le schermate si disegnano');
S().visti = ['gemme']; O.reset('vega', 4, 'corsa', false);
for (const [n, f] of [['titolo', () => O.UI.title()], ['guida', () => O.UI.guide()],
                      ['fine', () => O.UI.end(false, 900)], ['pausa', () => O.UI.pause()],
                      ['anello', () => O.UI.ringEdit(null)], ['carte', () => { G.pending = 1; O.UI.levelup(); }]])
  try { f(); ok(true, n); } catch (e) { ok(false, n + ': ' + e.message); }
for (const sc of ['partita', 'frammenti', 'obiettivi', 'archivio'])
  try { O.UI.hub(sc); ok(true, 'Osservatorio · ' + sc); } catch (e) { ok(false, sc + ': ' + e.message); }

sez('una partita intera');
for (const modo of ['corsa', 'incursione']) {
  O.reset('vega', 1111, modo, false); G.state = 'play';
  gioca(30);
  ok(G.kills > 0 && G.roster.length === (modo === 'corsa' ? 5 : 3),
     modo + ': gira, e ha ' + G.roster.length + ' guardiani in calendario');
}

console.log('\n' + (ko ? ko + ' CONTROLLI FALLITI su ' + tot : 'tutti i ' + tot + ' controlli passano'));
process.exit(ko ? 1 : 0);

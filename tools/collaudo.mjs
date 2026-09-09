/* ═══════════════════════════════════════════════════════════════
   ORBITA — collaudo.  `npm run collaudo`

   Controlli che girano sul gioco vero, non su una copia delle regole.
   Ognuno esiste perché un difetto c'era davvero: il commento sopra dice
   quale, così chi lo trova rotto sa cosa stava proteggendo.
   ═══════════════════════════════════════════════════════════════ */
import { O, IN } from './banco.mjs';

const G = O.G, P = O.P, S = O.save;
let ko = 0, tot = 0;
const ok = (c, m) => { tot++; if (!c) { ko++; console.log('  ✗ ' + m); } else console.log('  ✓ ' + m); };
const sez = t => console.log('\n— ' + t + ' —');
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/, '');
const gioca = (s, f) => { for (let i = 0; i < 60 * s; i++) { if (f) f(i); O.step(1 / 60); P.hp = P.maxHp; G.pending = 0; } };

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

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
/* Tutte le spiegazioni gia' viste. Era un elenco scritto a mano in sei
   punti: aggiungendo due eventi d'arena, due di quei sei si sarebbero
   fermati al primo Allineamento con G.state a 'briefing' e la partita
   simulata avrebbe smesso di avanzare senza dire perche'. */
const TUTTI_I_BRIEFING = () => Object.keys(O.BRIEFING).concat(['gemme', 'raffica', 'culmine']);
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

sez('ogni carta che si sa disegnare si sa anche pescare');
/* Stessa famiglia del controllo qui sopra, e lo stesso difetto: la carta
   «120 frammenti» era disegnata da cardHTML, applicata da applyChoice e
   cercata in tre punti come «la carta meno preziosa da sacrificare», ma
   nessuno la metteva piu' nel mazzo da quando l'Ascesi ne ha preso il
   posto come pavimento della pool. Misurato: zero su dodicimila carte
   pescate. Codice che finge di essere una funzione del gioco e' peggio di
   codice morto, perche' chi lo legge ci costruisce sopra.               */
{
  const ui = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', '05-ui.js'), 'utf8');
  const gestiti = new Set([...ui.matchAll(/[co]\.t === '([a-z]+)'/g)].map(m => m[1]));
  const pescabili = new Set([...ui.matchAll(/\{ t: '([a-z]+)'/g)].map(m => m[1]));
  const fantasmi = [...gestiti].filter(x => !pescabili.has(x));
  ok(fantasmi.length === 0,
     gestiti.size + ' tipi di carta, nessuno che il mazzo non possa produrre' +
     (fantasmi.length ? ': ' + fantasmi.join(' ') : ''));
  ok(pescabili.size >= 6, 'e il mazzo ne produce ' + pescabili.size);
}

sez('la corsa in sospeso');
/* Su un telefono una partita da venti minuti finisce quando arriva una
   notifica, non quando decidi tu: perderla e' il modo piu' rapido di far
   chiudere il gioco. */
S().visti = TUTTI_I_BRIEFING();
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

sez('la prima partita dura otto minuti');
/* L'Incursione esiste perche' «la prima conclusione deve stare nella prima
   sessione»: le tredici ascensioni stanno tutte dietro alla prima vittoria.
   Ma il formato preselezionato era la Corsa, cioe' a chi apriva il gioco
   per la prima volta venivano chiesti venti minuti — la decisione che
   l'Incursione e' stata costruita per non dover chiedere.               */
ok(O.importSave(b64({ shards: 0 })) && S().modo === 'incursione', 'un salvataggio nuovo parte dall\u2019Incursione');
ok(O.importSave(b64({ shards: 900, runs: 12, wins: 1 })) && S().modo === 'corsa', 'chi ha gi\u00e0 giocato tiene la Corsa');
ok(O.importSave(b64({ shards: 0, modo: 'corsa' })) && S().modo === 'corsa', 'e la scelta gi\u00e0 fatta non si tocca');

sez('azzerare e ripristinare buttano via la corsa in sospeso');
/* La corsa annotata e' costruita sui potenziamenti, sulle reliquie e
   sull'ascensione del salvataggio che c'era: azzerando i progressi — o
   ripristinando il codice di backup di un altro dispositivo — il titolo
   continuava a offrire «Riprendi» su una partita che con quei numeri non
   esiste piu'.                                                          */
{
  S().visti = TUTTI_I_BRIEFING();
  O.reset('vega', 5150, 'corsa', false); G.state = 'play';
  gioca(20); O.salvaCorsa();
  ok(!!O.leggiCorsa(), 'una corsa annotata c’è');
  O.wipeSave();
  ok(!O.leggiCorsa(), 'azzerando i progressi non c’è piu’');
  O.reset('vega', 5151, 'corsa', false); G.state = 'play';
  gioca(20); O.salvaCorsa();
  O.importSave(b64({ shards: 700, meta: { orbita: 1 }, chars: ['vega'], wins: 2 }));
  ok(!O.leggiCorsa(), 'e nemmeno ripristinando un backup');
}

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
  S().visti = TUTTI_I_BRIEFING();
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

sez('il pop delle uccisioni percorre la scala');
/* L'altezza del pop cicla su una pentatonica minore apposta: venti suoni
   identici al secondo l'orecchio li fonde in un ronzio, che e' il contrario
   della soddisfazione. L'indice della nota si chiamava pero' `combo`, lo
   stesso nome che updateCombo riscrive a ogni fotogramma col ritmo di
   uccisione: non era un contatore che avanza, era il numero di uccisioni al
   secondo — a ritmo costante, una nota sola. Misurato prima: su 154 pop il
   semitono usciva 0 o 1 nel 75% dei casi e non superava mai il 3.        */
{
  S().visti = TUTTI_I_BRIEFING();
  O.reset('vega', 777, 'corsa', false); G.state = 'play';
  const visti = new Set();
  const vero = O.AU.pop.bind(O.AU);
  O.AU.pop = (n, i) => { visti.add(i % 6); };
  gioca(120);
  O.AU.pop = vero;
  ok(visti.size >= 5, 'la pentatonica si percorre tutta (' + visti.size + ' semitoni su 6)');
}

sez('il Culmine si carica con quello che uccidi');
/* La carica stava DENTRO al ramo del direttore, che esclude guardiani ed
   elite: il `e.boss ? 14 : e.elite ? 5 : 1` scritto li' dentro era codice
   morto e valeva sempre 1. Cioe' abbattere un guardiano — la cosa piu'
   grossa di tutta la corsa — caricava il Culmine di zero.
   Rimettendo indietro la correzione questo controllo legge 0,0000.       */
{
  O.reset('vega', 42, 'corsa', false); G.state = 'play';
  gioca(20);
  const e = G.enemies.find(x => x.hp > 0 && !x.boss);
  G.enemies.length = 0; G.enemies.push(e);
  e.elite = true; e.x = G.p.x + 46; e.y = G.p.y; e.hp = 2; e.froze = 0; e.slow = 0;
  G.charge = 0; G.culm = 0;
  for (let i = 0; i < 180 && e.hp > 0; i++) { O.step(1 / 60); P.hp = P.maxHp; G.pending = 0; }
  ok(e.hp <= 0 && G.charge > .05, 'un elite abbattuto carica l’indicatore (' + G.charge.toFixed(3) + ')');
}

sez('riprendere una corsa non cambia la corsa');
/* Due difetti nella stessa riga di codice mancante. L'Ascesi e' il
   potenziamento ripetibile senza limite — danno, vita e area accumulati per
   tutta la partita — e non veniva annotata: riprendere la azzerava. E la
   Semenza (reliquia) mette una carta in mano a inizio partita: siccome
   riprendere ripassa da resetRun, ne regalava una NUOVA a ogni ripresa,
   cioe' un potenziamento gratis per ogni volta che uscivi dal gioco.      */
{
  S().reliquie = ['semenza'];
  O.reset('vega', 99, 'corsa', false); G.state = 'play';
  gioca(20);
  for (let i = 0; i < 6; i++) O.apply({ t: 'ascesi' });
  const dmg = P.dmgMul, vita = P.maxHp;
  G.pending = 0;
  O.salvaCorsa();
  O.riprendiCorsa(O.leggiCorsa());
  ok(G.ascesi === 6 && Math.abs(P.dmgMul - dmg) < 1e-9 && Math.abs(P.maxHp - vita) < 1,
     'sei Ascesi restano sei dopo la ripresa');
  ok(G.pending === 0, 'la Semenza non regala una carta a ogni ripresa');
  S().reliquie = [];
}

sez('la modalità senza fine');
/* «Continua senza fine» promette sul bottone che la difficolta' cresce. La
   condizione che la faceva crescere chiedeva pero' anche `!G.victory`, e
   nel senza fine G.victory e' vero per definizione: si entra li' DOPO aver
   vinto. Misurato: sessanta secondi con G.diff fermo a zero.             */
{
  O.reset('vega', 7, 'corsa', false); G.state = 'play';
  G.t = G.modo.len + 40; G.victory = true;
  gioca(20);
  ok(G.diff > .05, 'oltre la durata del formato la difficoltà sale (' + G.diff.toFixed(3) + ')');
}

sez('le rune che girano invece di volare');
/* `spd` per il Cristallo e per il Raggio e' una velocita' ANGOLARE, non di
   un proiettile, e non deve prendere il moltiplicatore di Vortice due
   volte. Erano riconosciuti dal `tag`, ma le trasformazioni hanno tutte tag
   'trasformazione': il Glaciale se lo prendeva in runeStats E in
   updateRunes, cioe' Vortice gli valeva al quadrato — 1,96 volte il
   Cristallo invece di 1,18.                                              */
{
  const giroPerPasso = (id) => {
    O.reset('vega', 5, 'corsa', false); G.state = 'play';
    G.ring.fill(null);
    G.ring[0] = { id, el: 'gelo', lv: 5, cd: 0, res: 0, slot: 0, st: {} };
    G.passives = { vortice: 3 }; O.recalc(); O.recalcRing(false);
    O.step(1 / 60); const a = G.ring[0].st.orb[0].p;
    O.step(1 / 60); return G.ring[0].st.orb[0].p - a;
  };
  const rap = giroPerPasso('glaciale') / giroPerPasso('cristallo');
  ok(rap > 1.1 && rap < 1.3, 'il Glaciale gira 1,18 volte il Cristallo, non 1,96 (' + rap.toFixed(2) + ')');
  /* E la stessa lista dice a chi disegnare: il filtro del disegno chiedeva
     `r.id === 'cristallo'`, quindi il Glaciale — che orbita e fa danno —
     non veniva disegnato affatto. Un'arma invisibile. */
  const rnd = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', '04-render.js'), 'utf8');
  ok(/ORBITANTI/.test(rnd), 'e chi orbita lo disegna la stessa lista che lo fa girare');
}

sez('il gelo che tocca');
/* «L'alone diventa una stagione: congela al tocco» — ma il congelamento
   arrivava all'areaHit dentro un `opt` che il codice del danno non leggeva
   mai, quindi l'Inverno non congelava niente.                            */
{
  O.reset('vega', 11, 'corsa', false); G.state = 'play';
  gioca(12);
  G.ring.fill(null);
  G.ring[0] = { id: 'inverno', el: 'gelo', lv: 5, cd: 0, res: 0, slot: 0, st: {} };
  O.recalcRing(false);
  const e = G.enemies.find(x => x.hp > 0 && !x.boss);
  e.x = G.p.x + 30; e.y = G.p.y; e.hp = e.maxHp = 1e7; e.froze = 0;
  for (let i = 0; i < 40; i++) { O.step(1 / 60); P.hp = P.maxHp; G.pending = 0; e.x = G.p.x + 30; e.y = G.p.y; }
  ok(e.froze > 0, 'l’Inverno congela chi tocca');
}

sez('la runa pronta a trasformarsi lo dice');
/* La trasformazione e' la cosa che il gioco chiede di progettare dal primo
   minuto, e l'istante in cui le tre condizioni si chiudono non aveva
   nessun annuncio: lo scoprivi solo se la carta usciva, cioe' alla salita
   di livello dopo — magari due minuti piu' tardi, o mai. Peggio quando a
   chiudere la condizione e' l'arena: entri in un Nodo, il Risveglio si
   accende, la runa diventa pronta, e nessuno te lo dice.               */
{
  O.reset('vega', 17, 'corsa', false); G.state = 'play';
  G.slots = 6;
  const mk = (id, lv) => ({ id, el: O.RUNES[id].el, lv, cd: 0, res: 0, st: {} });
  G.ring = [mk('pira', 6), mk('scintilla', 6), mk('nova', 6), null, null, null];
  for (let i = 0; i < 6; i++) if (G.ring[i]) G.ring[i].slot = i;
  G.evoAnn = {};
  O.recalcRing(true);
  ok(G.evoAnn.scintilla === 1, 'quella in mezzo alla catena viene annunciata');
  ok(!G.evoAnn.pira && !G.evoAnn.nova, 'quelle ai lati, che risuonano da una parte sola, no');
  const quante = Object.keys(G.evoAnn).length;
  O.recalcRing(true); O.recalcRing(true);
  ok(Object.keys(G.evoAnn).length === quante, 'e una volta sola per partita');
}

sez('le carte non si ripescano di nascosto');
/* «Riordina l'anello» dalla schermata delle carte e poi «Fatto» tornava a
   levelup(), che ripesca: era un Rilancio gratis e infinito accanto a un
   bottone Rilancia che ne concede due per partita — e il contratto «senza
   rilanciare una carta» restava vero lo stesso.                          */
{
  O.reset('vega', 33, 'corsa', false); G.state = 'play';
  gioca(20);
  G.pending = 1; O.UI.levelup();
  const prima = O.UI.choices.map(c => c.t + ':' + (c.id || '')).join(',');
  O.UI.ringEdit(null);
  O.UI.levelup(true);
  const dopo = O.UI.choices.map(c => c.t + ':' + (c.id || '')).join(',');
  ok(prima === dopo, 'tornando dall’anello le tre carte sono le stesse');
  const ui = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', '05-ui.js'), 'utf8');
  ok(/case 'ringdone':[^\n]*levelup\(true\)/.test(ui), 'ed è così che ci torna il bottone Fatto');
}

sez('una carta che non si può giocare non resta in mano');
/* Tenere le tre carte tornando dall'anello e' giusto, ma riordinare cambia
   l'anello sotto di loro: con sei rune in due catene da tre nessuna e'
   sacrificabile e nessun alloggiamento e' libero, quindi una runa NUOVA
   non si potrebbe collocare da nessuna parte — e la schermata di
   collocazione non ha il bottone «Fatto». La partita resterebbe li'.    */
{
  O.reset('vega', 55, 'corsa', false); G.state = 'play';
  G.slots = 6;
  const mk = (id) => ({ id, el: O.RUNES[id].el, lv: 3, cd: 0, res: 0, st: {} });
  G.ring = ['scintilla', 'pira', 'nova', 'scheggia', 'bruma', 'cristallo'].map(mk);
  for (let i = 0; i < 6; i++) G.ring[i].slot = i;
  O.recalcRing(false);
  ok(G.awaken.fuoco >= 1 && G.awaken.gelo >= 1, 'due catene accese, anello pieno');
  O.UI.choices = [{ t: 'rnew', id: 'arco' }, { t: 'ascesi' }, { t: 'gold' }];
  G.pending = 1; G.chests = 0;
  O.UI.levelup(true);
  ok(!O.UI.choices.some(c => c.t === 'rnew'), 'la runa nuova senza posto viene ripescata');
}

sez('uno scrigno si annuncia come uno scrigno');
/* `levelup(chest)` prendeva un parametro che NESSUNO le passava mai: le
   righe che distinguono uno scrigno da una salita di livello — titolo,
   occhiello, e la regola che il Ventaglio non vale sugli scrigni — erano
   codice morto, e uno scrigno raccolto diceva «Livello N».               */
{
  O.reset('vega', 8, 'corsa', false); G.state = 'play';
  G.pending = 1; G.chests = 1; O.UI.levelup();
  ok(/Scrigno stellare/.test(O.schermo()), 'la carta di uno scrigno dice scrigno');
  G.chests = 0; O.UI.levelup();
  ok(/Livello /.test(O.schermo()), 'quella di un livello dice livello');
}

sez('la guida dice i numeri del gioco');
/* Diceva «a cinque rune il secondo grado, a sette il terzo»: erano le
   soglie di due versioni fa, e sette rune in fila su un anello che ne
   tiene sei non si fanno. Adesso i numeri escono dalla stessa costante che
   li decide in recalcRing.                                               */
{
  O.UI.guide();
  const h = O.schermo();
  ok(/<b>4<\/b> rune in fila/.test(h) && /<b>5<\/b> al terzo/.test(h),
     'secondo grado a 4 rune, terzo a 5');
  ok(!/<b>sette<\/b>/.test(h), 'e non chiede piu’ sette rune a un anello che ne tiene sei');
}

sez('il Corriere non attacca');
/* Il briefing dice «Non ti attacca: scappa», ma era uno spettro normale:
   sbatterci contro toglieva vita, cioe' la caccia puniva esattamente il
   momento in cui lo raggiungi.                                           */
{
  O.reset('vega', 2024, 'corsa', false); G.state = 'play';
  G.t = 120;
  let trovato = null;
  for (let k = 0; k < 60 && !trovato; k++) {
    G.ev = null; G.evT = 0; G.bosses.length = 0; G.boss = null;
    O.step(1 / 60);
    if (G.ev && G.ev.k === 'caccia') trovato = G.ev.e;
  }
  ok(!!trovato, 'la caccia si apre');
  ok(trovato && trovato.dmg === 0, 'e il Corriere non fa danno da contatto');
  /* hurtPlayer(0) non toglieva vita ma accendeva tutto il resto: mezzo
     secondo di invulnerabilita' regalata, il velo rosa, il suono della
     ferita e il nome dell'assassino nella schermata di fine. Toccarlo —
     che e' quello che la caccia chiede — si vedeva come una botta.       */
  if (trovato) {
    G.p.inv = 0; G.killer = null; G.flashT = 0; P.hp = P.maxHp;
    trovato.x = G.p.x; trovato.y = G.p.y;
    O.step(1 / 60);
    ok(G.p.inv <= 0 && !G.killer, 'e toccarlo non si vede come una ferita');
  }
}

sez('le schermate si disegnano');
S().visti = ['gemme']; O.reset('vega', 4, 'corsa', false);
for (const [n, f] of [['titolo', () => O.UI.title()], ['guida', () => O.UI.guide()],
                      ['fine', () => O.UI.end(false, 900)], ['pausa', () => O.UI.pause()],
                      ['anello', () => O.UI.ringEdit(null)], ['carte', () => { G.pending = 1; O.UI.levelup(); }]])
  try { f(); ok(true, n); } catch (e) { ok(false, n + ': ' + e.message); }
for (const sc of ['partita', 'frammenti', 'obiettivi', 'archivio'])
  try { O.UI.hub(sc); ok(true, 'Osservatorio · ' + sc); } catch (e) { ok(false, sc + ': ' + e.message); }

sez('l’Incursione contiene tutto il gioco');
/* Otto minuti che devono contenere «una partita intera, vittoria compresa»:
   il calendario del contenuto scorre 2,15 volte piu' in fretta, e ondate,
   tetto di nemici ed elite lo seguono gia'. Formazioni e Dissonante no:
   erano rimasti sull'orologio da polso, quindi il Dissonante — il nemico
   che attacca la BUILD, la cosa che nessun altro gioco del genere ha —
   entrava in campo solo dopo il quarto minuto di otto.                   */
{
  const quando = (modo) => {
    S().visti = TUTTI_I_BRIEFING();
    O.reset('vega', 3131, modo, false); G.state = 'play';
    let t = -1;
    for (let i = 0; i < 60 * G.modo.len && t < 0; i++) {
      O.step(1 / 60); P.hp = P.maxHp; G.pending = 0;
      if (G.enemies.some(e => e.type === 'dissonante')) t = G.t;
    }
    return t;
  };
  const inc = quando('incursione');
  ok(inc > 0 && inc < 260, 'nell’Incursione il Dissonante arriva nella prima metà (' + (inc < 0 ? 'mai' : inc.toFixed(0) + 's') + ')');
  const cor = quando('corsa');
  ok(cor > 250, 'nella Corsa resta dov’era (' + (cor < 0 ? 'mai' : cor.toFixed(0) + 's') + ')');
}

sez('il campo si disegna');
/* Il canvas e' meta' del gioco e non era mai passato di qui: nel banco
   mancava Path2D, quindi render() lanciava alla prima runa disegnata e
   nessun controllo poteva toccarlo. E' cosi' che una funzione intera
   (drawEvento) e' rimasta a lungo senza essere mai chiamata — la breccia
   senza faro, il Corriere senza niente addosso — e che il Glaciale faceva
   danno restando invisibile.
   Qui si disegna un fotogramma in ogni situazione che il gioco sa
   produrre: e' un controllo di non esplosione, ma copre il codice di
   disegno che nessun altro tocca.                                        */
{
  const prova = (n, f) => { try { f(); O.render(); ok(true, n); } catch (e) { ok(false, n + ': ' + e.message); } };
  S().visti = TUTTI_I_BRIEFING();
  O.reset('vega', 606, 'corsa', false); G.state = 'play';
  gioca(40);
  prova('una partita in corso', () => { });
  prova('con le rune che orbitano', () => {
    G.ring[1] = { id: 'cristallo', el: 'gelo', lv: 4, cd: 0, res: 0, slot: 1, st: {} };
    G.ring[2] = { id: 'glaciale', el: 'gelo', lv: 6, cd: 0, res: 0, slot: 2, st: {} };
    O.recalcRing(false); gioca(2);
  });
  prova('con un guardiano in campo', () => { G.t = 148; gioca(6); });
  prova('con una breccia aperta', () => { G.ev = { k: 'breccia', x: G.p.x + 900, y: G.p.y, t: 4, dur: 22, r: 74, preso: 0 }; });
  prova('con una marea in corso', () => { G.ev = { k: 'marea', t: 4, dur: 18, a: 1.1, acc: 0 }; });
  prova('con il Corriere in fuga', () => {
    G.ev = null; G.evT = 0; G.t = 130;
    for (let k = 0; k < 60 && !(G.ev && G.ev.k === 'caccia'); k++) { G.ev = null; G.evT = 0; G.bosses.length = 0; G.boss = null; O.step(1 / 60); }
  });
  prova('con una formazione in arrivo', () => { G.form = { k: 'muro', a: .7, mezzo: .4, t: .5, dur: 4.6 }; });
  prova('con un accerchiamento', () => { G.form = { k: 'accerchiamento', a: null, mezzo: Math.PI, t: .5, dur: 4.6 }; });
  prova('con i doni a terra', () => {
    G.drops.push({ x: G.p.x + 60, y: G.p.y, k: 'chest', t: 0 });
    G.drops.push({ x: G.p.x + 1400, y: G.p.y + 900, k: 'cuore', t: 0 });
    G.drops.push({ x: G.p.x - 1400, y: G.p.y - 900, k: 'bomba', t: 0 });
  });
  prova('con un Nodo da raggiungere', () => {
    const k = G.rocks.find(r => r.nodo);
    if (k) { G.elAnello.add(k.nodo); k.x = G.p.x + 1200; k.y = G.p.y; G.nodo = null; }
  });
  prova('dentro a un Nodo', () => { const k = G.rocks.find(r => r.nodo); if (k) { G.p.x = k.x; G.p.y = k.y + k.r + 30; O.step(1 / 60); } });
  prova('con un Allineamento acceso', () => {
    G.form = null;
    G.ev = { k: 'allineamento', t: 4, dur: 23, r: 72, presi: 0, sig: [
      { x: G.p.x + 600, y: G.p.y, dur: 11, preso: 0, morto: 0 },
      { x: G.p.x - 300, y: G.p.y + 700, dur: 17, preso: 0, morto: 0 },
      { x: G.p.x - 1400, y: G.p.y - 900, dur: 23, preso: 0, morto: 0 }] };
  });
  prova('con una Fermata da tenere', () => {
    G.ev = { k: 'fermata', x: G.p.x + 120, y: G.p.y, t: 5, dur: 21, r: 168, carica: .4, acc: 0 };
  });
  prova('con la Fermata fuori campo', () => { G.ev.x = G.p.x + 1500; G.ev.y = G.p.y + 900; });
  prova('durante il Culmine', () => { G.ev = null; G.charge = 1; G.culm = 3; O.recalcRing(false); gioca(1); });
  prova('la vetrina del menu', () => { G.demo = true; G.state = 'menu'; gioca(2); G.demo = false; });
}

sez('una partita intera');
for (const modo of ['corsa', 'incursione']) {
  O.reset('vega', 1111, modo, false); G.state = 'play';
  gioca(30);
  ok(G.kills > 0 && G.roster.length === (modo === 'corsa' ? 5 : 3),
     modo + ': gira, e ha ' + G.roster.length + ' guardiani in calendario');
}

sez('il conto del danno tiene tutto il danno');
/* «Da dove è venuto il danno» è la statistica che fa venire voglia di
   ricostruire, e contava un quarto del danno. Tre Risvegli fanno danno —
   l'incendio dell'Ardore, la catena del Sovraccarico, l'implosione del
   Collasso — e nessuno dei tre lo attribuiva a niente; la scia della
   Cometa nemmeno, e la scia è il 19% di quello che fa la Cometa. Misurato
   su quattro corse da venti minuti col bot: dal 55% all'82% del danno
   finiva nel totale e spariva dall'elenco, quindi le percentuali mostrate
   erano quelle del pezzo rimasto — cioè la forma sbagliata della build. */
{
  const perso = (setup, sec) => {
    O.reset('vega', 321, 'corsa', false); G.state = 'play';
    G.ring.fill(null); setup();
    O.recalcRing(false);
    G.t = 200; G.dmgDone = 0; G.dmgSrc = {};
    gioca(sec);
    const attr = Object.values(G.dmgSrc).reduce((a, b) => a + b, 0);
    return { perso: 1 - attr / G.dmgDone, src: G.dmgSrc };
  };
  /* un anello di Fuoco: l'Ardore è acceso, e l'incendio paga */
  const fuoco = perso(() => {
    ['scintilla', 'pira', 'nova'].forEach((id, i) => O.place(id, i));
    G.ring.forEach(r => { if (r) r.lv = 6; });
  }, 30);
  ok(fuoco.perso < .03, 'con l’Ardore acceso non si perde danno per strada (' + Math.round(fuoco.perso * 100) + '%)');
  ok((fuoco.src['aw:fuoco'] || 0) > 0, 'e l’incendio ha la sua riga');
  /* un anello di Vuoto: il Collasso è la parte grossa, e non aveva riga */
  const vuoto = perso(() => {
    ['sciame', 'falce', 'singolarita'].forEach((id, i) => O.place(id, i));
    G.ring.forEach(r => { if (r) r.lv = 6; });
  }, 30);
  ok(vuoto.perso < .03, 'con il Collasso acceso nemmeno (' + Math.round(vuoto.perso * 100) + '%)');
  ok((vuoto.src['aw:vuoto'] || 0) > 0, 'e l’implosione ha la sua riga');
  /* la scia della Cometa brucia davvero: va contata alla Cometa */
  const cometa = perso(() => { O.place('cometa', 0); G.ring[0].lv = 6; }, 25);
  ok(cometa.perso < .02, 'la scia della Cometa è della Cometa (' + Math.round(cometa.perso * 100) + '%)');
  /* e il Risveglio si legge col suo nome, non con la chiave interna */
  G.dmgSrc = { 'aw:vuoto': 900, scintilla: 100 };
  O.UI.end(false, 0);
  const h = O.schermo();
  ok(/Collasso/.test(h) && !/aw:vuoto/.test(h), 'la schermata di fine lo chiama Collasso');

  /* La bomba a terra cancella ogni nemico della mappa: al quindicesimo
     minuto vale la vita di centocinquanta nemici, e misurata col bot era
     il 68% del DANNO scritto a fine partita. Il codice la escludeva gia'
     dal raggio del direttore e dalla carica del Culmine per la stessa
     ragione; il contatore del danno era l'ultimo posto in cui contava. */
  O.reset('vega', 99, 'corsa', false); G.state = 'play';
  gioca(40);
  const primaD = G.dmgDone, vivi = G.enemies.filter(e => !e.boss).length;
  G.drops.push({ x: G.p.x, y: G.p.y, k: 'bomba', t: 0 });
  O.step(1 / 60);
  const rimasti = G.enemies.filter(e => !e.boss && e.hp > 0).length;
  ok(vivi > 12 && rimasti === 0, 'la bomba spazza il campo (' + vivi + ' nemici, ne restano ' + rimasti + ')');
  ok(G.dmgDone - primaD < 1, 'e non la conta come danno della tua build');
}

sez('il Crogiolo dice la soglia che il gioco usa');
/* La reliquia costa 2600 frammenti e prometteva «il livello 7 invece che
   l'8»: i numeri di due versioni fa, di quando la trasformazione arrivava
   nell'ultimo minuto della corsa e non arrivava mai. La soglia vera era
   6, e 5 col Crogiolo. Adesso la riga si scrive dalle due costanti che la
   decidono, e questo controllo verifica che il gioco si comporti davvero
   come la riga dice.                                                     */
{
  const rel = O.RELIQUIE.find(r => r.id === 'crogiolo');
  const n = rel.d.match(/(\d+)[^\d]+(\d+)/);
  ok(!!n, 'la scheda del Crogiolo nomina due livelli: ' + rel.d);
  /* pronta = la catena la annuncia. Tre rune di Fuoco in fila: quella in
     mezzo risuona da entrambi i lati e il Risveglio è acceso, quindi le
     manca solo il livello. */
  const pronta = (lv, crogiolo) => {
    S().reliquie = crogiolo ? ['crogiolo'] : [];
    O.reset('vega', 17, 'corsa', false); G.state = 'play'; G.slots = 6;
    const mk = (id) => ({ id, el: O.RUNES[id].el, lv, cd: 0, res: 0, st: {} });
    G.ring = ['pira', 'scintilla', 'nova', null, null, null].map(x => x && mk(x));
    for (let i = 0; i < 6; i++) if (G.ring[i]) G.ring[i].slot = i;
    G.evoAnn = {}; O.recalcRing(true);
    return G.evoAnn.scintilla === 1;
  };
  const conCrog = +n[1], senza = +n[2];
  ok(pronta(conCrog, true) && !pronta(conCrog - 1, true), 'col Crogiolo si trasforma al ' + conCrog + ', non prima');
  ok(pronta(senza, false) && !pronta(senza - 1, false), 'senza, al ' + senza + ' e non prima');
  S().reliquie = [];
}

sez('la trasformazione non costa livelli');
/* Il livello della forma evoluta era scritto a mano: 5. Giusto quando la
   soglia per trasformarsi era 8 — si scendevano tre gradini in cambio dei
   numeri nuovi — ma la soglia e' scesa a 6 (5 col Crogiolo) e il 5 e'
   rimasto. La regola che ne usciva era impossibile da scrivere: chi arriva
   al 6 perde un livello, chi arriva all'8 ne perde tre, chi ha il Crogiolo
   non ne perde nessuno. Cioe' piu' avevi investito nella runa su cui il
   gioco ti chiede di investire dal primo minuto, piu' ti costava
   trasformarla.                                                           */
{
  const trasforma = lv => {
    O.reset('vega', 7, 'corsa', false); G.state = 'play'; G.slots = 6;
    const mk = id => ({ id, el: O.RUNES[id].el, lv, cd: 0, res: 0, st: {} });
    G.ring = ['pira', 'scintilla', 'nova', null, null, null].map(x => x && mk(x));
    for (let i = 0; i < 6; i++) if (G.ring[i]) G.ring[i].slot = i;
    O.recalcRing(false);
    O.apply({ t: 'evo', id: 'scintilla', to: 'cometa' });
    return G.ring[1];
  };
  const a = trasforma(6), b = trasforma(8);
  ok(a && a.id === 'cometa' && a.lv === 6, 'presa al livello 6 resta al 6' + (a ? ' (era ' + a.lv + ')' : ''));
  ok(b && b.id === 'cometa' && b.lv === 8, 'presa al livello 8 resta all’8' + (b ? ' (era ' + b.lv + ')' : ''));
}

sez('i cinque eventi d’arena');
/* Erano tre, con un intervallo di rand(80,105) secondi: una Corsa ne fa
   undici, quindi ognuno tornava quasi quattro volte nella stessa partita e
   una volta su tre tornava subito dopo se stesso. Adesso sono cinque, e
   non si ripetono mai di fila.                                            */
{
  S().visti = TUTTI_I_BRIEFING();
  const visti = {};
  let difila = 0, prec = null, n = 0;
  for (let giro = 0; giro < 220 && n < 90; giro++) {
    O.reset('vega', 1000 + giro, 'corsa', false); G.state = 'play';
    G.t = 120;
    for (let k = 0; k < 40 && n < 90; k++) {
      G.ev = null; G.evT = 0; G.bosses.length = 0; G.boss = null;
      O.step(1 / 60);
      if (!G.ev) continue;
      const kk = G.ev.k;
      visti[kk] = (visti[kk] || 0) + 1; n++;
      if (kk === prec) difila++;
      prec = kk;
    }
    prec = null;   /* fra una partita e l'altra non c'e' un "di fila" */
  }
  const quanti = Object.keys(visti).length;
  ok(quanti === 5, 'ne escono cinque diversi (' + Object.keys(visti).sort().join(' ') + ')');
  ok(difila === 0, 'e nessuno esce due volte di fila su ' + n + ' sorteggi');
}

sez('l’Allineamento si prende e si spegne a turno');
/* Tre sigilli con scadenze scaglionate: il piu' vicino non e' quasi mai il
   primo da prendere. Senza scadenze diverse sarebbe una breccia in tre
   copie, cioe' un altro viaggio invece di un giro.                        */
{
  O.reset('vega', 404, 'corsa', false); G.state = 'play'; G.t = 120;
  G.ev = { k: 'allineamento', t: 0, dur: 23, r: 72, presi: 0, sig: [
    { x: G.p.x + 200, y: G.p.y, dur: 11, preso: 0, morto: 0 },
    { x: G.p.x, y: G.p.y + 200, dur: 17, preso: 0, morto: 0 },
    { x: G.p.x - 200, y: G.p.y, dur: 23, preso: 0, morto: 0 }] };
  const sig = G.ev.sig;
  ok(sig[0].dur < sig[1].dur && sig[1].dur < sig[2].dur, 'i tre non scadono insieme');
  /* toccandone uno si prende */
  G.p.x = sig[1].x; G.p.y = sig[1].y;
  O.step(1 / 60);
  ok(sig[1].preso === 1 && G.ev && G.ev.presi === 1, 'passarci sopra lo prende');
  /* lasciando scadere il primo, si spegne senza chiudere l’evento */
  G.p.x = 9999; G.p.y = 9999; G.ev.t = 12;
  O.step(1 / 60);
  ok(sig[0].morto === 1 && !!G.ev, 'quello scaduto si spegne, l’evento continua');
  /* prendendo il terzo si chiude con due su tre, senza scrigno */
  G.drops.length = 0;
  G.ev.t = 24;
  O.step(1 / 60);
  ok(!G.ev, 'finiti i sigilli l’evento si chiude');
  ok(!G.drops.some(d => d.k === 'chest'), 'due su tre non pagano lo scrigno');
}

sez('la Fermata paga chi resta');
/* L'unico evento che chiede di NON muoversi: tutto il resto del gioco
   premia chi non si ferma mai. Uscire non azzera — azzerare farebbe
   smettere di provarci chi e' stato spinto fuori da un contraccolpo — ma
   mette in pausa, e il cerchio e' largo abbastanza da girarci dentro.   */
{
  O.reset('vega', 505, 'corsa', false); G.state = 'play'; G.t = 120;
  G.ev = { k: 'fermata', x: G.p.x, y: G.p.y, t: 0, dur: 21, r: 168, carica: 0, acc: 0 };
  const v = G.ev;
  gioca(3, () => { G.p.x = v.x; G.p.y = v.y; });
  const dentro = v.carica;
  ok(dentro > .2, 'stando dentro si riempie (' + Math.round(dentro * 100) + '% in 3s)');
  G.p.x = v.x + 900; G.p.y = v.y;
  gioca(3);
  ok(Math.abs(G.ev.carica - dentro) < .02, 'uscendo non si azzera: si ferma');
  /* tenendola fino in fondo: scrigno e un po' di vita */
  /* fino in fondo, un fotogramma alla volta: lo scrigno cade sotto ai
     piedi e verrebbe raccolto subito, quindi si guarda nell'istante in cui
     l'evento si chiude */
  G.drops.length = 0;
  P.hp = P.maxHp * .5;
  const feriti = P.hp;
  let premio = 0;
  /* intoccabile: restare fermi in mezzo alla folla costa vita per davvero
     — e' il punto dell'evento — e qui si sta misurando la cura, non lei */
  for (let i = 0; i < 60 * 14 && G.ev; i++) {
    G.p.x = v.x; G.p.y = v.y; G.p.inv = 9;
    const gemmePrima = G.gems.filter(g => g.big && g.k === 0).length;
    O.step(1 / 60);
    premio += G.gems.filter(g => g.big && g.k === 0).length - gemmePrima;
  }
  ok(!G.ev, 'piena, l’evento si chiude');
  /* la carta la paga solo il guardiano: un evento paga una gemma grossa
     d'esperienza — vedi XP_EVENTO in 01-data */
  ok(premio >= 1, 'e lascia un premio d’esperienza (' + premio + ' gemma grossa)');
  ok(P.hp > feriti, 'e un po’ di vita (' + Math.round(feriti) + ' → ' + Math.round(P.hp) + ')');
}

sez('il terzo grado conta anche quando lo fa il Culmine');
/* «Porta un Risveglio al terzo grado» e' un contratto da 540 frammenti e
   una sfida da 600. Il contatore leggeva G.awaken — il grado costruito con
   l'anello — mentre il Culmine alza di un grado ogni Risveglio acceso, che
   e' la ragione per cui il Culmine esiste. Per cinque secondi e mezzo quel
   Risveglio faceva danno di terzo grado, la targhetta in basso a sinistra
   accendeva la terza tacca, e l'obiettivo restava chiuso.                */
{
  O.reset('vega', 88, 'corsa', false); G.state = 'play'; G.slots = 6;
  const mk = id => ({ id, el: O.RUNES[id].el, lv: 3, cd: 0, res: 0, st: {} });
  /* quattro di Fuoco in fila: secondo grado, non terzo */
  G.ring = ['scintilla', 'pira', 'nova', 'cometa', null, null].map(x => x && mk(x));
  for (let i = 0; i < 6; i++) if (G.ring[i]) G.ring[i].slot = i;
  G.tier3 = 0; G.culm = 0;
  O.recalcRing(false);
  ok(G.awaken.fuoco === 2, 'quattro rune in fila fanno il secondo grado');
  ok(!G.tier3, 'e da sole non contano come terzo');
  /* il Culmine lo alza: la targhetta lo dice, e adesso lo dice anche il conto */
  G.charge = 1;
  ok(O.attivaCulmine(), 'il Culmine si accende');
  ok(G.awk.fuoco === 3, 'e porta l’Ardore al terzo grado');
  ok(!!G.tier3, 'che adesso conta per il contratto');
  const h = (O.UI.renderAwake(), O.statoPartita());
  ok(h.tier3 === true, 'e arriva fino allo stato di fine partita');
}

sez('le congiunzioni fanno quello che dicono');
/* Una congiunzione e' una regola sorteggiata dal seme e DICHIARATA prima
   di partire: e' la riga che si legge sotto al bottone Gioca. Se la riga
   promette e il codice non ha il gancio, la promessa e' scritta e basta —
   ed e' esattamente cosi' che «l'Inverno non congelava niente». Qui ogni
   voce della tabella viene messa in una partita vera e le si chiede di
   dimostrarsi.                                                           */
{
  const semeDi = id => { let s = 1; while (O.congiunzioneDi(s).id !== id && s < 200000) s++; return s; };
  const parti = id => { O.reset('vega', semeDi(id), 'corsa', false); G.state = 'play'; return G.cong.id === id; };
  /* la Quiete resta il riferimento */
  parti('quiete');
  const slotBase = G.slots, sogliaBase = O.RELIQUIE && 6;
  const bossBase = Math.max(45, G.roster[0].t);
  ok(G.cong.id === 'quiete', 'la Quiete non cambia niente');

  ok(parti('eclissi'), 'Eclissi si sorteggia');
  ok(G.cg.boss === -40, 'e sposta il calendario dei guardiani di 40s');
  {
    /* il primo guardiano arriva davvero prima, e rende il doppio */
    let arriva = -1;
    for (let i = 0; i < 60 * 400 && arriva < 0; i++) { O.step(1 / 60); P.hp = P.maxHp; G.pending = 0; if (G.bosses.length) arriva = G.t; }
    const atteso = Math.max(45, G.roster[0].t - 40);
    ok(arriva > 0 && Math.abs(arriva - atteso) < 3, 'il primo guardiano entra al ' + Math.round(arriva) + 's invece che al ' + bossBase + 's');
    const b = G.bosses[0];
    ok(b && Math.abs(b.xp - G.roster[0].xp * 2) < 1, 'e vale il doppio di esperienza (' + (b ? Math.round(b.xp) : '?') + ')');
  }

  ok(parti('fornace'), 'Fornace si sorteggia');
  ok(G.slots === slotBase - 1, 'toglie un alloggiamento (' + G.slots + ' invece di ' + slotBase + ')');
  {
    /* tre rune in fila, il Risveglio acceso: alla soglia abbassata e' pronta */
    const mk = id => ({ id, el: O.RUNES[id].el, lv: 5, cd: 0, res: 0, st: {} });
    G.ring = new Array(G.slots).fill(null);
    ['pira', 'scintilla', 'nova'].forEach((id, i) => { G.ring[i] = mk(id); G.ring[i].slot = i; });
    G.evoAnn = {}; O.recalcRing(true);
    ok(G.evoAnn.scintilla === 1, 'e la trasformazione arriva al livello 5 invece che al 6');
  }

  ok(parti('apogeo'), 'Apogeo si sorteggia');
  {
    G.charge = 1;
    O.attivaCulmine();
    ok(Math.abs(G.culm - 11) < .01, 'il Culmine dura il doppio (' + G.culm.toFixed(1) + 's)');
    /* stesso elite, stesso istante, due congiunzioni: con Apogeo carica
       la meta'. Serve un campo popolato, quindi venti secondi prima. */
    const caricaElite = id => {
      parti(id); G.t = 0;
      gioca(20);
      const e = G.enemies.find(x => x.hp > 0 && !x.boss);
      if (!e) return 0;
      G.enemies.length = 0; G.enemies.push(e);
      e.elite = true; e.x = G.p.x + 46; e.y = G.p.y; e.hp = 2; e.froze = 0; e.slow = 0;
      G.charge = 0; G.culm = 0;
      for (let i = 0; i < 180 && e.hp > 0; i++) { O.step(1 / 60); P.hp = P.maxHp; G.pending = 0; }
      return G.charge;
    };
    const conApogeo = caricaElite('apogeo'), quieta = caricaElite('quiete');
    ok(conApogeo > 0 && quieta > 0 && Math.abs(conApogeo * 2 - quieta) < quieta * .12,
       'e si carica la meta\u2019 (' + conApogeo.toFixed(3) + ' contro ' + quieta.toFixed(3) + ')');
  }

  /* la Quiete pesa quanto tre delle altre: una corsa su quattro deve
     restare quella di sempre, e il peso va tenuto in proporzione al
     numero delle altre — con dieci a peso 6 sarebbe scesa a una su sei */
  const conto = {};
  for (let s = 1; s <= 40000; s++) { const c = O.congiunzioneDi(s); conto[c.id] = (conto[c.id] || 0) + 1; }
  ok(Object.keys(conto).length === O.CONGIUNZIONI.length, 'tutte e ' + O.CONGIUNZIONI.length + ' escono da qualche seme');
  const q = conto.quiete / 40000;
  ok(q > .20 && q < .26, 'e la Quiete resta circa una corsa su quattro (' + (q * 100).toFixed(1) + '%)');
}

sez('il record si legge prima di scriverlo');
/* In un gioco di sopravvivenza il proprio tempo migliore E' il punteggio,
   e la schermata di fine non lo nominava: SAVE.best veniva aggiornato in
   payout() PRIMA che UI.end disegnasse, quindi quando la schermata scriveva
   TEMPO 15:40 il record era gia' 15:40 — non poteva ne' dire «nuovo record»
   ne' dire quanto ne era mancato, cioe' proprio il motivo per cui si preme
   Rigioca. E il record era uno solo per due formati che non durano uguale:
   dopo una sola Corsa diventava irraggiungibile per sempre nell'Incursione,
   che e' il formato preselezionato a chi apre il gioco la prima volta.    */
{
  O.importSave(b64({ shards: 0 }));
  S().visti = TUTTI_I_BRIEFING();
  /* prima corsa: primo record */
  O.reset('vega', 31, 'incursione', false); G.state = 'play';
  gioca(30);
  O.endRun(false);
  ok(S().rec.incursione.t >= 29, 'la prima partita fissa il record del formato (' + S().rec.incursione.t + 's)');
  ok(/NUOVO RECORD|PRIMO RECORD/.test(O.schermo()), 'e la schermata di fine lo dice');
  ok(S().rec.corsa.t === 0, 'la Corsa ha il suo, e non l’ha ancora fatto');
  /* seconda corsa piu' corta: il record resta, e la schermata dice quanto manca */
  O.reset('vega', 32, 'incursione', false); G.state = 'play';
  gioca(10);
  const era = S().rec.incursione.t;
  O.endRun(false);
  ok(S().rec.incursione.t === era, 'una partita piu’ corta non lo tocca');
  const h = O.schermo();
  ok(/ti sono mancati/.test(h), 'e la schermata dice quanto ne e’ mancato');
  ok(!/NUOVO RECORD/.test(h), 'senza spacciarla per un record');
  /* una Corsa lunga non deve rendere imbattibile l'Incursione */
  O.reset('vega', 33, 'corsa', false); G.state = 'play';
  gioca(120);
  O.endRun(false);
  ok(S().rec.corsa.t >= 119 && S().rec.incursione.t === era, 'la Corsa scrive il suo record e non quello dell’Incursione');
  /* un salvataggio vecchio ha un solo `best`: va alla Corsa */
  ok(O.importSave(b64({ shards: 10, best: 900, bestKills: 400 })), 'si apre un salvataggio con un record solo');
  ok(S().rec.corsa.t === 900 && S().rec.incursione.t === 0, 'quel record diventa quello della Corsa, e l’Incursione riparte');
}

sez('l’anello dice di chi sta parlando');
/* evoLine() da' il consiglio piu' azionabile del gioco — «Scintilla: manca
   risuonare da entrambi i lati, spostala nell'alloggiamento 3» — e nomina
   due cose che l'interfaccia non mostrava: quale dei sei glifi sia la
   Scintilla, e quale alloggiamento sia il 3. Un'istruzione che nomina cose
   invisibili non si puo' eseguire: si poteva solo contare in senso orario
   partendo dall'alto e sperare di partire da uno e non da zero.           */
{
  O.reset('vega', 61, 'corsa', false); G.state = 'play'; G.slots = 6;
  const mk = (id, lv) => ({ id, el: O.RUNES[id].el, lv, cd: 0, res: 0, st: {} });
  G.ring = [mk('pira', 6), mk('scintilla', 6), mk('nova', 3), mk('sciame', 2), null, null];
  for (let i = 0; i < 6; i++) if (G.ring[i]) G.ring[i].slot = i;
  O.recalcRing(false);
  O.UI.ringEdit(null);
  const h = O.schermo();
  /* ogni alloggiamento porta scritto il proprio numero, da 1 a G.slots */
  const numeri = [...h.matchAll(/class="slotn[^"]*"[^>]*>(\d+)</g)].map(m => +m[1]);
  ok(numeri.length === G.slots, 'ogni alloggiamento ha il suo numero (' + numeri.length + ' su ' + G.slots + ')');
  ok(numeri.join(',') === [1, 2, 3, 4, 5, 6].join(','), 'numerati da 1, in ordine: ' + numeri.join(','));
  /* e il consiglio parla proprio di quei numeri */
  ok(!/alloggiamento 0/.test(h), 'e il consiglio non nomina un alloggiamento 0');

  /* toccando una runa, l'anello dice di chi si tratta */
  ok(!/Scintilla<\/b><\/span> ·/.test(O.UI.runaLine()), 'senza selezione non dice niente');
  O.UI.sel = 1;
  const l = O.UI.runaLine();
  ok(/Scintilla/.test(l), 'toccata, dice il nome: ' + l.replace(/<[^>]+>/g, '').trim());
  ok(/Fuoco/.test(l) && /livello 6/.test(l), 'con elemento e livello');
  ok(/risuona/.test(l), 'e se risuona');
  /* il numero di quella scelta si accende: il contorno bianco e' gia' preso
     da «trasformabile», quindi senza questo non si vede quale hai in mano */
  O.UI.sel = 2;
  const h2 = O.UI.ringHTML(true);
  ok(/class="slotn sel"[^>]*>3</.test(h2), 'e il suo numero e’ marcato');
  ok((h2.match(/class="slotn sel"/g) || []).length === 1, 'uno solo alla volta');
  O.UI.sel = -1;
}

sez('la pausa dice cosa fanno i Risvegli accesi');
/* Il Risveglio e' la regola su cui e' costruito tutto il gioco, e il suo
   nome col grado si legge dappertutto: la targhetta in basso a sinistra, la
   riga sotto le carte, l'anello. Ma COSA FA il grado che hai adesso lo
   diceva un avviso di due secondi nell'istante in cui si e' acceso, e poi
   piu' niente — la guida sta nel menu, mostra solo il primo grado, e dalla
   pausa non ci si arriva. Chi era a «Torpore II» non aveva nessun modo di
   sapere cosa volesse dire.                                              */
{
  O.reset('vega', 71, 'corsa', false); G.state = 'play'; G.slots = 6;
  const mk = (id, lv) => ({ id, el: O.RUNES[id].el, lv, cd: 0, res: 0, st: {} });
  /* quattro di Fuoco in fila: Ardore di secondo grado */
  G.ring = ['scintilla', 'pira', 'nova', 'cometa', null, null].map(x => x && mk(x, 4));
  for (let i = 0; i < 6; i++) if (G.ring[i]) G.ring[i].slot = i;
  O.recalcRing(false);
  ok(G.awaken.fuoco === 2, 'quattro rune di Fuoco in fila: Ardore II');
  O.UI.pause();
  const h = O.schermo();
  const g2 = O.EL.fuoco.awd[1];
  ok(h.indexOf(g2) >= 0, 'la pausa scrive cosa fa il grado II: «' + g2 + '»');
  ok(h.indexOf(O.EL.fuoco.awd[0]) < 0, 'e non quella del grado I');
  /* col Culmine acceso il grado sale davvero: leggere quello sotto sarebbe
     una bugia, ed e' lo stesso grado che la targhetta in campo mostra */
  G.charge = 1;
  ok(O.attivaCulmine(), 'il Culmine si accende');
  O.UI.pause();
  const h2 = O.schermo();
  ok(h2.indexOf(O.EL.fuoco.awd[2]) >= 0, 'col Culmine la pausa passa al grado III');
  ok(/culmine/i.test(h2), 'e dice che e’ il Culmine a portarcelo');
  G.culm = 0;
}

sez('la carta di potenziamento dice il gradino vero');
/* E' la carta che si preme piu' di ogni altra cosa, una trentina di volte
   per corsa, e i suoi numeri venivano da una curva che il gioco non usa
   piu': se li calcolava per conto suo invece di chiedere a runeStats.
   La percentuale di danno era `g.dmg / base.dmg`, un numero FISSO: la
   Scintilla prometteva «+44% danno» dal primo all'ottavo livello mentre il
   guadagno vero scende da +59% a +13%. E «+1 proiettili» era calcolato
   senza GROWTH, cioe' sul gradino sbagliato: la Scintilla dal 3 al 4
   guadagna un proiettile e una perforazione e la carta diceva
   «+velocita'»; dal 4 al 5 non guadagna niente e la carta prometteva un
   proiettile.                                                            */
{
  O.reset('vega', 12, 'corsa', false); G.state = 'play';
  const st = (id, lv) => O.runeStats({ id, el: O.RUNES[id].el, lv, res: 0, st: {} });
  let righe = 0, sbagliate = 0, esempio = '';
  for (const id of Object.keys(O.RUNES)) {
    for (let lv = 1; lv <= 7; lv++) {
      const a = st(id, lv), b = st(id, lv + 1);
      const testo = O.UI.upgradeText(id, lv).replace(/<[^>]+>/g, '');
      righe++;
      const guai = [];
      /* il danno: quello scritto e' quello che si guadagna davvero */
      const atteso = Math.round((b.dmg / a.dmg - 1) * 100);
      const m = testo.match(/\+(\d+)% danno/);
      if (atteso > 0 && (!m || +m[1] !== atteso)) guai.push('danno ' + (m ? m[1] : '—') + ' invece di ' + atteso);
      /* i proiettili e la perforazione: il gradino o c'e' o non c'e' */
      for (const [k, par] of [['count', 'proiettil'], ['pierce', 'perforazion']]) {
        const vero = (b[k] === undefined ? 0 : b[k] - a[k]);
        const detto = new RegExp('\\+\\d+ ' + par).test(testo);
        if (vero > 0 && !detto) guai.push(k + ': guadagna e non lo dice');
        if (vero <= 0 && detto) guai.push(k + ': lo dice e non lo guadagna');
      }
      if (guai.length) { sbagliate++; if (!esempio) esempio = O.RUNES[id].n + ' lv' + lv + '→' + (lv + 1) + ': ' + guai.join('; '); }
    }
  }
  ok(sbagliate === 0, 'su ' + righe + ' carte, nessuna promette un gradino diverso da quello vero' + (esempio ? ' (' + esempio + ')' : ''));
  /* il caso che rendeva il difetto visibile a occhio: la percentuale era
     la stessa a ogni livello */
  const p1 = O.UI.upgradeText('scintilla', 1).match(/\+(\d+)% danno/);
  const p7 = O.UI.upgradeText('scintilla', 7).match(/\+(\d+)% danno/);
  ok(p1 && p7 && +p1[1] > +p7[1] + 20, 'il primo livello rende molto piu’ dell’ultimo (' + p1[1] + '% contro ' + p7[1] + '%)');
}

sez('il Presagio anticipa il primo elite invece di ritardarlo');
/* Il primo elite e' il primo scrigno, cioe' la prima carta in piu', e il
   Presagio costa 160 frammenti per farlo arrivare prima. Il numero pero'
   stava scritto a mano in tre posti: la base in due (lo stato iniziale e
   resetRun) e quello del Presagio in un terzo, fisso a 60. Quando la base
   e' scesa a 26 — «l'apertura era troppo tranquilla» — quel 60 e' rimasto
   li', quindi il potenziamento RITARDAVA il primo elite di trentaquattro
   secondi: si pagava per peggiorare, e la scheda del negozio prometteva
   una cosa che il gioco faceva gia' da solo.                            */
{
  const primoElite = meta => {
    O.importSave(b64({ shards: 0, meta }));
    S().visti = TUTTI_I_BRIEFING();
    O.reset('vega', 4321, 'corsa', false); G.state = 'play';
    for (let i = 0; i < 60 * 150; i++) {
      O.step(1 / 60); P.hp = P.maxHp; G.pending = 0;
      if (G.enemies.some(e => e.elite)) return G.t;
    }
    return 1e9;
  };
  const senza = primoElite({}), con = primoElite({ presagio: 1 });
  ok(senza < 60, 'senza Presagio il primo elite arriva al secondo ' + senza.toFixed(0));
  ok(con < senza, 'col Presagio arriva PRIMA (' + con.toFixed(0) + 's contro ' + senza.toFixed(0) + 's)');
  /* e la riga del negozio non puo' piu' invecchiare da sola: i due numeri
     li scrive la stessa costante che il gioco usa */
  O.UI.hub('frammenti');
  ok(new RegExp(con.toFixed(0) + 's invece di ' + senza.toFixed(0)).test(O.schermo()),
     'e la scheda del negozio dice i due numeri veri (' + con.toFixed(0) + 's invece di ' + senza.toFixed(0) + ')');
}

sez('Lyra sale un grado alla volta come tutti');
/* «Ogni runa conta doppia per le catene» era implementato raddoppiando la
   LUNGHEZZA della catena e lasciando i gradi a un passo di uno: con due
   rune Lyra saltava il primo grado e prendeva direttamente il SECONDO, e
   con tre arrivava al TERZO — quello che a chiunque altro ne costa cinque.
   Il primo grado, per lei, non esisteva proprio. La regola scritta nel
   commento del codice, nella guida e nel README e' sempre stata «due
   bastano per un Risveglio, tre per il secondo grado»: era l'unico posto
   che contava — il gioco — a raccontarne un'altra.                      */
{
  const gradi = (char, n) => {
    O.importSave(b64({ shards: 0, chars: ['vega', 'lyra'], char }));
    S().visti = TUTTI_I_BRIEFING();
    O.reset(char, 77, 'corsa', false);
    const out = [];
    for (let k = 1; k <= n; k++) {
      G.ring = new Array(G.slots).fill(null);
      for (let i = 0; i < k; i++) G.ring[i] = { id: 'scintilla', el: 'fuoco', lv: 1, cd: 0, res: 0, slot: i, st: {} };
      O.recalcRing(false);
      out.push(G.awaken.fuoco);
    }
    return out;
  };
  const lyra = gradi('lyra', 4), vega = gradi('vega', 5);
  ok(G.slots === 6, 'Vega ha sei alloggiamenti');
  ok(vega.join('') === '00123', 'e sale 0·0·I·II·III da una a cinque rune (' + vega.join('·') + ')');
  ok(lyra.join('') === '0123', 'Lyra sale 0·I·II·III da una a quattro (' + lyra.join('·') + ')');
  ok(lyra[1] === 1, 'due rune le accendono il PRIMO grado, non il secondo');
  ok(lyra[2] === 2, 'tre il secondo, non il terzo');
}

sez('la guida dice la soglia che il gioco usa');
/* Il numero della trasformazione era scritto a mano nella guida — «livello
   6» — mentre la soglia la spostano il Crogiolo e la congiunzione Fornace,
   e sogliaEvo() e' l'unico posto che lo sa. La scheda delle forme glielo
   chiedeva gia', la guida no: chi aveva comprato il Crogiolo da 2600
   frammenti leggeva quindi una soglia che il suo gioco non usava piu'. */
{
  O.importSave(b64({ shards: 0 }));
  O.UI.guide();
  ok(/<b>livello 6<\/b>/.test(O.schermo()), 'senza reliquie la guida dice livello 6');
  O.importSave(b64({ shards: 0, reliquie: ['crogiolo'] }));
  O.UI.guide();
  ok(/<b>livello 5<\/b>/.test(O.schermo()), 'col Crogiolo dice livello 5, come la scheda delle forme');
}

sez('la Ritempra cambia l’elemento davvero, non solo la contabilità');
/* La Ritempra riaccorda una runa a un altro elemento. Cambiava `r.el` — che
   e' quello che l'anello disegna e quello con cui si contano le catene — e
   NIENT'ALTRO: runeStats leggeva l'elemento di nascita (`d.el`), e da lui lo
   leggevano tutte le FIRE. Una Scheggia riaccordata al Fuoco era quindi
   rossa nell'anello e di Gelo in campo: sparava schegge azzurre, prendeva il
   +35% dal Nodo di Gelo invece che da quello di Fuoco, e contro un guardiano
   con la corazza di Gelo faceva meta' danno per un elemento che secondo
   l'anello non aveva piu'. Chi la giocava vedeva una runa che cambia colore
   e continua a sparare il colore di prima.
   Rimettendo indietro la correzione la prima riga legge 'gelo'.           */
{
  O.reset('vega', 808, 'corsa', false); G.state = 'play';
  const r = { id: 'scheggia', el: 'fuoco', lv: 3, cd: 0, res: 0, slot: 0, st: {} };
  const st = O.runeStats(r);
  ok(st.el === 'fuoco', 'una Scheggia riaccordata al Fuoco colpisce di Fuoco (' + st.el + ')');
  ok(st.c === O.EL.fuoco.c, 'e del colore del Fuoco (' + st.c + ')');
  /* il Nodo premia l'elemento che la runa ha ADESSO */
  G.nodo = 'fuoco'; const conNodo = O.runeStats(r).dmg;
  G.nodo = 'gelo';  const conGelo = O.runeStats(r).dmg;
  G.nodo = null;    const nudo = O.runeStats(r).dmg;
  ok(conNodo > nudo * 1.3, 'il Nodo di Fuoco la potenzia (+' + Math.round((conNodo / nudo - 1) * 100) + '%)');
  ok(Math.abs(conGelo - nudo) < .01, 'il Nodo di Gelo non piu’');
  /* e i proiettili che escono sono di quell'elemento */
  G.ring = new Array(G.slots).fill(null); G.ring[0] = r;
  O.recalcRing(false);
  G.bullets.length = 0;
  for (let i = 0; i < 90 && !G.bullets.length; i++) { O.step(1 / 60); P.hp = P.maxHp; G.pending = 0; }
  const b = G.bullets[0];
  ok(!!b && b.el === 'fuoco', 'le schegge che spara portano l’elemento Fuoco (' + (b ? b.el : '—') + ')');
  ok(!!b && b.c === O.EL.fuoco.c, 'e il colore del Fuoco');
}

sez('le schegge partono dalla runa, non dal nucleo');
/* Otto rune a proiettile su nove nascono i colpi in `r.wx/r.wy`, cioe' dalla
   runa che gira: la Scheggia e la Zanna li facevano nascere in `G.p`, il
   nucleo. Il ghiaccio sembrava quindi un'abilita' del nucleo e non della runa
   che te lo dava, e con l'anello in rotazione non c'era modo di capire quale
   runa lo stesse facendo.
   Rimettendo indietro la correzione la distanza letta e' zero.            */
{
  for (const id of ['scheggia', 'zanna']) {
    O.reset('vega', 909, 'corsa', false); G.state = 'play';
    G.ring = new Array(G.slots).fill(null);
    G.ring[0] = { id, el: O.RUNES[id].el, lv: 3, cd: 0, res: 0, slot: 0, st: {} };
    O.recalcRing(false);
    G.bullets.length = 0;
    let d = -1;
    for (let i = 0; i < 120 && d < 0; i++) {
      O.step(1 / 60); P.hp = P.maxHp; G.pending = 0;
      const b = G.bullets[0];
      if (b) d = Math.hypot(b.x - G.p.x, b.y - G.p.y);
    }
    ok(d > 20, O.RUNES[id].n + ': il colpo nasce a ' + Math.round(d) + 'px dal nucleo, non addosso');
  }
}

sez('trasformarsi non disfa la Ritempra');
/* Ogni forma evoluta ha l'elemento della runa da cui nasce, quindi
   `RUNES[c.to].el` sembrava innocuo — ma non per una runa riaccordata: una
   Scheggia portata al Fuoco tornava di Gelo nell'istante in cui si
   trasformava. E siccome quella runa reggeva un lato della catena di Fuoco,
   il premio per cui avevi progettato la partita SPEGNEVA il Risveglio che
   serviva ad ottenerlo.
   Rimettendo indietro la correzione la prima riga legge 'gelo' e l'Ardore si
   spegne.                                                                 */
{
  O.reset('vega', 910, 'corsa', false); G.state = 'play';
  const mk = (id, el, lv) => ({ id, el, lv, cd: 0, res: 0, st: {} });
  G.ring = new Array(G.slots).fill(null);
  G.ring[0] = mk('scintilla', 'fuoco', 6); G.ring[1] = mk('scheggia', 'fuoco', 6); G.ring[2] = mk('pira', 'fuoco', 6);
  for (let i = 0; i < 3; i++) G.ring[i].slot = i;
  O.recalcRing(false);
  ok(G.awaken.fuoco >= 1, 'tre rune di Fuoco in fila (una riaccordata): Ardore acceso');
  ok(O.apply({ t: 'evo', id: 'scheggia', to: 'zanna' }) === false, 'la Scheggia si trasforma in Zanna');
  ok(G.ring[1].id === 'zanna', 'la forma e’ cambiata');
  ok(G.ring[1].el === 'fuoco', 'l’elemento riaccordato resta (' + G.ring[1].el + ')');
  ok(G.awaken.fuoco >= 1, 'e l’Ardore resta acceso');
}

sez('riprendere una corsa non riporta le rune all’elemento di nascita');
/* L'annotazione della corsa sospesa teneva id, livello e alloggiamento: non
   l'elemento. Riprendendo, ogni runa riaccordata tornava di nascita — cioe'
   la catena costruita con la Ritempra si scioglieva e il Risveglio si
   spegneva, mentre riprendere deve restituire la corsa che avevi.         */
{
  S().visti = TUTTI_I_BRIEFING();
  O.reset('vega', 911, 'corsa', false); G.state = 'play';
  gioca(20);
  G.ring[0].el = 'luce';                 /* come se l'avessi ritemprata */
  const idPrima = G.ring[0].id;
  O.salvaCorsa();
  const nota = O.leggiCorsa();
  O.reset('vega', 1, 'incursione', false);
  O.riprendiCorsa(nota);
  const r0 = G.ring.find(x => x && x.id === idPrima);
  ok(!!r0 && r0.el === 'luce', 'l’elemento riaccordato sopravvive alla ripresa (' + (r0 ? r0.el : '—') + ')');
  O.scordaCorsa();
}

sez('la Ritempra si capisce e chiede conferma');
/* «La ritempra non si capisce bene come funziona, sembra un toccare a caso
   l'anello.» Era una schermata con qualche runa che pulsa, una freccia col
   nome di un elemento e nessun modo di sapere cosa avrebbe cambiato — e il
   primo tocco era definitivo. Tre difetti in uno: non diceva il guadagno,
   proponeva anche mosse che spengono un Risveglio, e non si poteva
   riflettere.                                                             */
{
  O.reset('vega', 912, 'corsa', false); G.state = 'play';
  const mk = (id, el, lv) => ({ id, el, lv, cd: 0, res: 0, st: {} });
  G.ring = new Array(G.slots).fill(null);
  /* Fuoco, Fuoco, Gelo: riaccordare la terza al Fuoco accende l'Ardore */
  G.ring[0] = mk('scintilla', 'fuoco', 2); G.ring[1] = mk('pira', 'fuoco', 2); G.ring[2] = mk('scheggia', 'gelo', 2);
  for (let i = 0; i < 3; i++) G.ring[i].slot = i;
  O.recalcRing(false);
  O.UI.ringEdit(null, false, true);
  const h = O.schermo();
  ok(/RISVEGLIO/.test(h), 'l’anello marca la runa che accenderebbe un Risveglio');
  ok(/→ FUOCO 3\/3/.test(h), 'e dice verso quale elemento e quanto diventa lunga la catena');
  const b = O.UI.ritBersagli.find(x => x.slot === 2);
  ok(!!b && b.accende, 'il bersaglio sa che accende un Risveglio');
  /* primo tocco: non applica ancora niente */
  O.UI.ritSel = 2;
  const h2 = O.UI.ritLine();
  ok(/Tocca di nuovo per confermare/.test(h2), 'il primo tocco chiede conferma');
  ok(/Ardore/.test(h2) && /da <span[^>]*>Gelo/.test(h2), 'e la riga dice da cosa a cosa, e cosa accende');
  ok(G.ring[2].el === 'gelo', 'e la runa non e’ ancora cambiata');
}

sez('la Ritempra non propone l’Iride né mosse che spengono un Risveglio');
/* Il punteggio dei bersagli sommava solo i guadagni — `Math.max(0, …)` —
   quindi proponeva con entusiasmo la riaccordatura che allunga una catena di
   una runa e spegne il Risveglio dall'altra parte. E metteva fra i bersagli
   l'Iride, che vale GIA' come qualunque elemento: fissarla su uno e' l'unica
   mossa che le toglie qualcosa.                                           */
{
  O.reset('vega', 913, 'corsa', false); G.state = 'play';
  const mk = (id, el, lv) => ({ id, el, lv, cd: 0, res: 0, st: {} });
  G.ring = new Array(G.slots).fill(null);
  /* Fuoco Fuoco Fuoco | Gelo Gelo — riaccordare un Fuoco di bordo al Gelo
     allungherebbe il Gelo e spegnerebbe l'Ardore */
  const el = ['fuoco', 'fuoco', 'fuoco', 'gelo', 'gelo', 'iride'];
  const idd = ['scintilla', 'pira', 'nova', 'scheggia', 'bruma', 'iride'];
  for (let i = 0; i < 6; i++) { G.ring[i] = mk(idd[i], el[i], 2); G.ring[i].slot = i; }
  O.recalcRing(false);
  ok(G.awaken.fuoco >= 1, 'l’Ardore e’ acceso');
  O.UI.ringEdit(null, false, true);
  const b = O.UI.ritBersagli;
  ok(!b.some(x => x.slot === 5), 'l’Iride non e’ un bersaglio');
  ok(!b.some(x => x.gradi < 0), 'nessun bersaglio abbassa il conto dei Risvegli');
}

sez('una corsa vinta resta vinta');
/* «Il mio record e' una partita da oltre 21 minuti, ma ho dovuto
   abbandonarla e risulta che ho perso.» La Corsa si vince abbattendo
   l'ultimo guardiano, che arriva al diciottesimo minuto: da li' la corsa e'
   vinta, pagata e segnata nello storico. Ma qualunque cosa la chiudesse dopo
   — la morte nel senza fine, o il bottone Abbandona — chiamava
   `endRun(false)`, e quel `false` arrivava intero fino allo schermo: FINE,
   «Il nucleo si spegne», e la diagnosi da sconfitta. Peggio: statoPartita
   diceva `win:false` a sfide, sblocchi e contratti.
   Rimettendo indietro la correzione la schermata legge FINE.              */
{
  O.importSave(b64({ shards: 0, runs: 3, asc: 0 }));
  S().visti = TUTTI_I_BRIEFING();
  O.reset('vega', 914, 'corsa', false); G.state = 'play';
  gioca(5);
  const vintePrima = S().wins | 0;
  G.victory = true; G.vintaT = G.t; G.oltre = 1;     /* vinta, e proseguita senza fine */
  P.hp = P.maxHp;
  G.abbandonata = 1; O.endRun(false);                /* poi abbandonata */
  const h = O.schermo();
  ok(/VITTORIA/.test(h), 'la schermata di fine dice VITTORIA');
  ok(!/>FINE</.test(h), 'e non FINE');
  ok(/senza fine/i.test(h), 'e racconta che e’ proseguita senza fine');
  ok(!/data-a="endless"/.test(h), 'senza offrire di continuare una corsa che non c’e’ piu’');
  ok((S().wins | 0) === vintePrima + 1, 'la vittoria e’ contata una volta sola (' + (S().wins | 0) + ')');
  ok(S().storico[0] && S().storico[0].w === 1, 'e lo storico la segna vinta');
  /* e la seconda chiusura non la conta di nuovo */
  O.endRun(false);
  ok((S().wins | 0) === vintePrima + 1, 'nemmeno chiudendola due volte');
}

sez('abbandonare non è morire');
/* La schermata di fine conosceva due uscite — vinta e finita — e chiamava
   «Il nucleo si spegne» anche l'unica in cui il nucleo non si spegne: quella
   di chi abbandona. E «Ucciso da» valeva `!win`, quindi nominava l'ultima
   cosa che aveva sfiorato chi abbandonava, e taceva a chi cadeva nel senza
   fine dopo aver vinto — cioe' proprio a chi vuole saperlo.               */
{
  O.reset('vega', 915, 'corsa', false); G.state = 'play';
  gioca(5); P.hp = P.maxHp;
  G.abbandonata = 1; O.endRun(false);
  const h = O.schermo();
  ok(/ABBANDONATA/.test(h), 'chi abbandona legge ABBANDONATA');
  ok(!/nucleo si spegne/.test(h), 'e non «Il nucleo si spegne»');
  O.reset('vega', 916, 'corsa', false); G.state = 'play';
  gioca(5); P.hp = 0; G.killer = 'SCIAMANTE'; O.endRun(false);
  const h2 = O.schermo();
  ok(/>FINE</.test(h2), 'chi muore legge FINE');
  ok(/Ucciso da/.test(h2), 'e da cosa');
}

sez('il negozio non si compra in cinque partite');
/* Una Corsa da venti minuti vinta pagava 8106 frammenti (misurato col bot,
   semi 1111 e 2222: 8106 e 7720) contro un negozio che, tutto quello che ha
   un fondo, ne costa 38.928: cinque partite e non restava piu' niente da
   comprare tranne il Dominio. I pesi erano nati quando il negozio aveva un
   terzo delle voci di adesso. Il pezzo piu' grosso era la riga delle
   uccisioni, .5 per nemico, che e' anche la quantita' meno decisa da chi
   gioca: sale col tetto dei nemici e con la durata.
   L'altro modo di sbagliare un'economia e' la prima partita: le prime due
   voci del negozio sono REGOLE da 110 e 160 frammenti, comprabili «dopo una
   partita sola», e quella promessa deve restare vera.
   `npm run misura -- soldi` rimisura le due cose insieme.                 */
{
  let negozio = 0;
  for (const m of O.META) { if (m.id === 'dominio') continue; for (let lv = 0; lv < m.max; lv++) negozio += O.metaCost(m, lv); }
  negozio += O.CHARS.reduce((a, c) => a + (c.cost || 0), 0) + O.RELIQUIE.reduce((a, r) => a + r.c, 0);
  O.importSave(b64({ shards: 0 }));
  O.reset('vega', 917, 'corsa', false);
  /* i numeri misurati col bot su una Corsa vinta di venti minuti */
  G.kills = 6832; G.t = 1159; G.level = 25; G.victory = true; G.shards = 945;
  const corsa = O.payout();
  ok(negozio / corsa > 10, 'una Corsa vinta paga ' + corsa + ': il negozio (' + negozio + ') chiede ' +
     (negozio / corsa).toFixed(1) + ' corse, non cinque');
  /* la prima corsa della vita: cinque minuti, persa */
  O.reset('vega', 918, 'corsa', false);
  G.kills = 1995; G.t = 300; G.level = 13; G.victory = false; G.shards = 180;
  const prima = O.payout();
  const innesco = O.META.find(m => m.id === 'innesco'), presagio = O.META.find(m => m.id === 'presagio');
  ok(prima >= innesco.c + presagio.c, 'la prima corsa ne paga ' + prima + ': bastano per le prime due regole (' +
     (innesco.c + presagio.c) + ')');
}

sez('il Culmine è un momento, non uno stato');
/* Misurato col bot su una Corsa intera (seme 1111, 10.145 uccisioni in
   18:44, spendendolo appena pronto): cinquantuno Culmini, uno ogni ventidue
   secondi. Ne dura cinque e mezzo, quindi era acceso per un quarto della
   corsa — e una cosa che succede ogni venti secondi non e' un momento, e' uno
   stato. Il difetto stava nella pendenza: il costo saliva di .085 al secondo
   mentre il ritmo delle uccisioni, misurato, sale da una al secondo a
   venticinque.                                                             */
{
  O.reset('vega', 919, 'corsa', false); G.state = 'play';
  const c0 = O.culmineCost(0), c900 = O.culmineCost(900);
  ok(c0 <= 80, 'il primo Culmine costa ' + Math.round(c0) + ' uccisioni: arriva ancora entro il primo minuto');
  ok(c900 >= 400, 'al quindicesimo minuto ne costa ' + Math.round(c900) + ', non centoventi');
  ok(c900 / c0 > 4, 'il prezzo sale col ritmo delle uccisioni, non sotto (×' + (c900 / c0).toFixed(1) + ')');
  /* e un elite ne vale cinque: le proporzioni restano quelle */
  G.t = 0; G.charge = 0; G.culm = 0;
  const passo = 1 / O.culmineCost(0);
  ok(Math.abs(passo * 51 - 1) < .25, 'ci vogliono una cinquantina di nemici comuni per il primo (' + Math.round(1 / passo) + ')');
}

sez('il Culmine si annuncia, e dice cosa fa');
/* Il suo effetto principale — ogni Risveglio acceso sale di un grado — stava
   scritto in un avviso di due secondi che non nominava nessun Risveglio:
   chi non sapeva cosa fosse un grado restava senza saperlo. */
{
  O.reset('vega', 920, 'corsa', false); G.state = 'play';
  const mk = (id, el, lv) => ({ id, el, lv, cd: 0, res: 0, st: {} });
  G.ring = new Array(G.slots).fill(null);
  for (let i = 0; i < 3; i++) { G.ring[i] = mk(['scintilla', 'pira', 'nova'][i], 'fuoco', 3); G.ring[i].slot = i; }
  O.recalcRing(false);
  G.charge = 1; G.culm = 0;
  let html = '';
  const fx = { style: { setProperty() {}, removeProperty() {} }, set innerHTML(v) { html = v; }, get innerHTML() { return html; },
    className: '', offsetWidth: 1, clientWidth: 400, querySelector: () => ({ scrollWidth: 10 }) };
  ok(O.attivaCulmine(), 'il Culmine si accende');
  ok(G.hitstop > .2, 'con un fermo immagine vero (' + G.hitstop.toFixed(2) + 's)');
  ok(G.zones.filter(z => z.k === 'ring').length >= 3, 'e piu’ di un’onda (' + G.zones.filter(z => z.k === 'ring').length + ')');
  ok(G.flashC === '#ffe9b0', 'e il velo d’oro, che non e’ ne’ il rosa del male ne’ il bianco della spazzata');
}

sez('il lessico dice tutto quello che il gioco nomina');
/* «Un giocatore vede apparire scritte e nomi di cose che accadono ma non ne
   capisce il significato.» Ogni nome proprio del gioco compariva dentro un
   avviso di due secondi in mezzo all'azione, e la sua spiegazione — quando
   c'era — stava nella guida, nel menu, raggiungibile solo abbandonando la
   partita. Il lessico si apre DALLA PAUSA, ed e' l'unico posto in cui si
   possa cercare una parola mentre la partita e' ferma.                    */
{
  O.reset('vega', 921, 'corsa', false); G.state = 'play';
  const voci = [];
  for (const g of O.lessico()) for (const v of g.v) voci.push(v);
  ok(voci.length >= 35, 'il lessico ha ' + voci.length + ' voci');
  ok(voci.every(v => v[0] && v[1] && v[1].length > 20), 'ognuna ha un nome e una spiegazione');
  /* le cose che il gioco NOMINA a schermo ci devono essere tutte */
  const testo = voci.map(v => v[0] + ' ' + v[1]).join(' ');
  const attese = ['Risveglio', 'Risonanza', 'Catena', 'Culmine', 'Ritempra', 'Dissolvi', 'Ascesi',
                  'Eccesso', 'Iride', 'Corazza elementale', 'Dissonante', 'Nodo', 'Congiunzione',
                  'Semenza', 'Ascensione', 'Scrigno', 'Temprato', 'Trasformazione'];
  const mancano = attese.filter(n => testo.indexOf(n) < 0);
  ok(mancano.length === 0, 'e nomina ' + attese.length + ' meccaniche' + (mancano.length ? ', tranne: ' + mancano.join(', ') : ''));
  /* e i cinque nomi dei Risvegli escono dai dati, non da una copia */
  O.UI.lessicoApri('pause');
  const h = O.schermo();
  for (const e of ['fuoco', 'gelo']) ok(h.indexOf(O.EL[e].aw) >= 0, 'la schermata nomina ' + O.EL[e].aw);
  ok(h.indexOf(O.EL.fuoco.awd[0]) >= 0, 'e dice cosa fa');
  ok(/data-a="lesback"/.test(h), 'e da qui si torna indietro');
  /* si apre dalla pausa senza buttare fuori dalla corsa */
  ok(G.state === 'play' || G.state === 'pause', 'aprirlo non abbandona la partita (' + G.state + ')');
}

sez('il Dissonante e la corazza si spiegano la prima volta');
/* Sono le due regole che, non capite, si leggono come un difetto del gioco:
   una runa che smette di sparare da sola, e un guardiano che incassa il
   doppio senza motivo visibile. Il Dissonante aveva un avviso di due secondi
   alla comparsa, cioe' lontano dal momento in cui zittisce la runa; la
   corazza aveva scritto «Corazza di Gelo» e mai cosa volesse dire.        */
{
  ok(!!O.BRIEFING.dissonante && !!O.BRIEFING.corazza, 'i due briefing esistono');
  for (const id of ['dissonante', 'corazza']) {
    const b = O.BRIEFING[id];
    ok(b.p.length >= 2 && b.p.join(' ').length > 120, id + ': dice cos’e’ e cosa fare');
  }
  ok(/meta. danno|metà danno/.test(O.BRIEFING.corazza.p[0]), 'la corazza dice che dimezza');
  /* e scattano davvero: il Dissonante quando zittisce, non quando compare */
  O.importSave(b64({ shards: 0 }));
  S().visti = [];
  O.reset('vega', 922, 'corsa', false); G.state = 'play';
  gioca(3);
  G.ring[0].mutata = 0;
  G.enemies.length = 0;
  const e = { type: 'dissonante', x: G.p.x + 300, y: G.p.y, vx: 0, vy: 0, r: 14, c: '#e0d0ff', hp: 50, maxHp: 50,
    spd: 90, slow: 0, slowT: 0, froze: 0, burn: 0, burnT: 0, flash: 0, kb: 0, dead: false, shape: 'diss', ten: 1 };
  G.enemies.push(e);
  G.briefing = null;
  for (let i = 0; i < 240 && !G.briefing; i++) { O.step(1 / 60); P.hp = P.maxHp; G.pending = 0; }
  ok(G.briefing === 'dissonante', 'il Dissonante si spiega quando zittisce una runa (' + G.briefing + ')');
}

sez('la soglia della trasformazione non si confonde col livello massimo');
/* «Non ho capito se la trasformazione e' a 6 o a 8.» Ed era colpa di due
   segnali: la carta di potenziamento disegna OTTO pallini — il livello
   massimo — e l'anello scriveva «MAX» sulla runa che ha raggiunto la SOGLIA,
   che e' il 6. Due numeri diversi per due cose diverse, e nessun posto in
   cui stesse scritto che sono due cose.                                   */
{
  O.importSave(b64({ shards: 0 }));
  O.reset('vega', 923, 'corsa', false); G.state = 'play';
  const t5 = O.UI.upgradeText('scintilla', 5), t4 = O.UI.upgradeText('scintilla', 4);
  ok(/Livello 6 di 8/.test(t5), 'la carta dice «Livello 6 di 8», non solo 6');
  ok(/soglia della trasformazione/i.test(t5), 'e che il 6 e’ la soglia della trasformazione');
  ok(!/soglia della trasformazione/i.test(t4), 'solo su quel livello');
  /* i pallini: quello della soglia e' marcato */
  O.UI.choices = [{ t: 'rup', id: 'scintilla' }];
  const card = O.UI.cardHTML({ t: 'rup', id: 'scintilla' }, 0);
  ok((card.match(/<i class="[^"]*sog[^"]*">/g) || []).length === 1, 'e un pallino su otto porta il segno della soglia');
  /* l'anello non dice piu' MAX */
  const ui = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'shell.html'), 'utf8');
  ok(!/\.slot\.vicino::after\{content:"MAX"/.test(ui), 'e l’anello non scrive piu’ MAX su una runa al livello 6');
}

sez('il traguardo della Corsa si vede');
/* L'ultimo guardiano e' la condizione di vittoria del formato e la sua barra
   in cima allo schermo era identica a quella degli altri quattro; passati i
   venti minuti perfino l'orologio smetteva di mostrare il traguardo. Chi lo
   teneva a distanza per tre minuti e poi smetteva non aveva modo di sapere di
   aver lasciato li' la vittoria.                                          */
{
  O.reset('vega', 924, 'corsa', false); G.state = 'play';
  gioca(3);
  const nb = G.roster[G.bossIdx];
  ok(/\d/.test(O.UI.obiettivo().h), 'prima dice quanto manca al prossimo guardiano: ' +
     O.UI.obiettivo().h.replace(/<[^>]+>/g, ''));
  /* l'ultimo guardiano in campo */
  const b = { boss: { n: 'ECLISSI', fine: 1, c: '#ff3d6e' }, c: '#ff3d6e', hp: 100, maxHp: 100, x: G.p.x, y: G.p.y, r: 40 };
  G.bosses.length = 0; G.bosses.push(b); G.boss = b; G.bossIdx = G.roster.length;
  const o1 = O.UI.obiettivo();
  ok(/ULTIMO/.test(o1.h) && /VINTO/.test(o1.h), 'con l’ultimo in campo dice che abbatterlo e’ la vittoria');
  /* e uno non finale non lo dice */
  b.boss.fine = 0;
  ok(!/ULTIMO/.test(O.UI.obiettivo().h), 'e non lo dice degli altri quattro');
  b.boss.fine = 1;
  /* dopo la vittoria, nel senza fine, dice che la corsa e’ gia’ vinta */
  G.victory = true;
  ok(/VINTA/.test(O.UI.obiettivo().h), 'e nel senza fine dice che la corsa e’ vinta');
  G.victory = false;
  O.render();
  ok(true, 'e la barra dei guardiani si disegna senza lanciare');
}

sez('Perigeo: una carica, due atti');
/* Il gioco aveva un verbo — schivare — e un bottone. Il secondo atto non
   aggiunge potere: aggiunge una DOMANDA sulla carica che c'era gia'. Il
   Perigeo chiude l'anello addosso al nucleo, e il suo prezzo e' tutto il
   danno per la sua durata: se fosse uno scudo renderebbe recuperabile
   l'errore che oggi si paga, cioe' toglierebbe tensione invece di darne. */
{
  S().visti = TUTTI_I_BRIEFING();
  O.reset('vega', 930, 'corsa', false); G.state = 'play';
  G.charge = 1; G.culm = 0; G.peri = 0;
  ok(O.attivaPerigeo(), 'con la barra piena l’anello si puo’ chiudere');
  ok(G.charge === 0, 'e costa la carica intera');
  ok(!O.attivaCulmine(), 'quindi il Culmine non si puo’ piu’ usare: o apri o chiudi');
  ok(G.peri > 2 && G.peri <= 2.3, 'dura poco piu’ di due secondi (' + G.peri.toFixed(1) + ')');
  /* e l'anello si stringe davvero */
  const r0 = G.ringR;
  for (let i = 0; i < 30; i++) { O.step(1 / 60); P.hp = P.maxHp; G.pending = 0; }
  ok(G.ringR < r0 * .6, 'l’anello si stringe addosso al nucleo (' + Math.round(r0) + ' → ' + Math.round(G.ringR) + 'px)');
  /* e si riapre da solo */
  for (let i = 0; i < 180; i++) { O.step(1 / 60); P.hp = P.maxHp; G.pending = 0; }
  ok(G.peri === 0 && G.ringR > r0 * .95, 'e si riapre da solo (' + Math.round(G.ringR) + 'px)');
}

sez('l’anello chiuso non spara');
/* E' il prezzo, ed e' quello che impedisce al Perigeo di rendere il gioco
   piu' facile: due secondi senza danno, mentre il calendario delle ondate e
   il direttore continuano a salire. Le ricariche pero' scorrono lo stesso e
   si fermano a zero, cosi' riaprendosi l'anello scarica insieme. */
{
  S().visti = TUTTI_I_BRIEFING();
  O.reset('vega', 931, 'corsa', false); G.state = 'play';
  G.ring = new Array(G.slots).fill(null);
  for (let i = 0; i < 3; i++) {
    G.ring[i] = { id: ['scintilla', 'sciame', 'prisma'][i], el: ['fuoco', 'vuoto', 'luce'][i], lv: 4, cd: 0, res: 0, slot: i, st: {} };
  }
  O.recalcRing(false);
  gioca(2);
  ok(G.bullets.length > 0, 'ad anello aperto le rune sparano');
  /* `gioca()` lascia lo stato su 'level' appena sale un livello, e i due atti
     si possono spendere solo in partita */
  G.state = 'play'; G.charge = 1;
  ok(O.attivaPerigeo(), 'l’anello si chiude');
  G.bullets.length = 0;
  for (let i = 0; i < 100; i++) { O.step(1 / 60); P.hp = P.maxHp; G.pending = 0; }
  ok(G.peri > 0, 'l’anello e’ ancora chiuso');
  ok(G.bullets.length === 0, 'e non e’ uscito un solo colpo (' + G.bullets.length + ')');
  /* riaperto, riparte */
  for (let i = 0; i < 90; i++) { O.step(1 / 60); P.hp = P.maxHp; G.pending = 0; }
  ok(G.bullets.length > 0, 'riaprendosi torna a sparare (' + G.bullets.length + ' colpi)');
}

sez('l’anello chiuso è riparo, e quello che tiene se lo segna');
/* Stessa regola dell'asteroide: il colpo nemico si spegne contro il campo.
   Ma il Perigeo non fa danno mentre e' chiuso — lo ACCUMULA, e lo restituisce
   riaprendosi. E' questo a rendere la giocata «resisti un momento in piu’»
   invece di «premi appena hai paura». */
{
  S().visti = TUTTI_I_BRIEFING();
  O.reset('vega', 932, 'corsa', false); G.state = 'play';
  G.enemies.length = 0; G.ebul.length = 0; G.bullets.length = 0;
  G.charge = 1; O.attivaPerigeo();
  for (let i = 0; i < 20; i++) O.step(1 / 60);       /* lascia chiudere l'anello */
  const vitaPrima = P.hp;
  /* tre colpi nemici in arrivo sul nucleo */
  for (let k = 0; k < 3; k++)
    G.ebul.push({ x: G.p.x + 120, y: G.p.y + k * 4, vx: -600, vy: 0, dmg: 20, r: 6, c: '#f00', t: 0, life: 3, fonte: 'prova' });
  for (let i = 0; i < 30; i++) O.step(1 / 60);
  ok(G.ebul.length === 0, 'i colpi nemici si spengono contro l’anello');
  ok(P.hp === vitaPrima, 'e non tolgono vita');
  ok(G.periAss >= 3, 'e ognuno vale un punto dell’onda (' + G.periAss + ')');
}

sez('il Perigeo tiene la folla, non i guardiani');
/* Un guardiano sfonda gli asteroidi: sei rune non lo fermano, e non devono —
   se no il Perigeo diventerebbe il modo di non giocare lo scontro che il
   gioco costruisce da venti minuti. E non e' invulnerabilita': chi entra lo
   stesso fa danno come sempre. */
{
  S().visti = TUTTI_I_BRIEFING();
  O.reset('vega', 933, 'corsa', false); G.state = 'play';
  G.enemies.length = 0; G.ebul.length = 0;
  G.charge = 1; O.attivaPerigeo();
  for (let i = 0; i < 20; i++) O.step(1 / 60);
  /* un nemico comune addosso al nucleo */
  const mob = { type: 'vagante', x: G.p.x + 6, y: G.p.y, vx: 0, vy: 0, r: 13, c: '#fff', shape: 'dia',
    hp: 999, maxHp: 999, spd: 0, dmg: 10, xp: 1, flash: 0, slow: 0, slowT: 0, burn: 0, burnT: 0,
    froze: 0, kb: 0, kbx: 0, kby: 0, elite: false, boss: null, ten: 1, dead: false };
  G.enemies.push(mob);
  /* senza togliere l'invulnerabilita' d'apertura si misurerebbe quella */
  G.p.inv = 0;
  const v1 = P.hp;
  for (let i = 0; i < 30; i++) O.step(1 / 60);
  const dist = Math.hypot(mob.x - G.p.x, mob.y - G.p.y);
  ok(dist > G.ringR, 'il nemico comune viene respinto oltre l’anello (' + Math.round(dist) + 'px)');
  ok(P.hp === v1, 'e non fa danno da li’');
  /* un guardiano no */
  S().visti = TUTTI_I_BRIEFING();
  O.reset('vega', 934, 'corsa', false); G.state = 'play';
  G.enemies.length = 0; G.charge = 1; O.attivaPerigeo();
  for (let i = 0; i < 20; i++) O.step(1 / 60);
  const guard = { type: 'boss', x: G.p.x + 6, y: G.p.y, vx: 0, vy: 0, r: 44, c: '#f00', shape: 'boss',
    hp: 9e5, maxHp: 9e5, spd: 0, passo: .8, dmg: 30, xp: 1, flash: 0, slow: 0, slowT: 0, burn: 0, burnT: 0,
    froze: 0, kb: 0, kbx: 0, kby: 0, elite: false, ten: 1, dead: false, ph: 0, atk: 99, atk2: 99,
    charge: 0, cdir: 0, mod: { spd: 1 }, corazza: null, boss: { n: 'PROVA', c: '#f00', pat: 'summon', fine: 0, r: 44, dmg: 30 } };
  G.enemies.push(guard); G.bosses.push(guard); G.boss = guard;
  /* la corsa comincia con qualche istante di invulnerabilita': senza
     toglierla si misurerebbe quella, non il Perigeo */
  G.p.inv = 0;
  const v2 = P.hp;
  for (let i = 0; i < 40; i++) O.step(1 / 60);
  ok(P.hp < v2, 'un guardiano passa lo stesso: il Perigeo non e’ invulnerabilita’');
}

sez('l’onda del rilascio vale quanto ha tenuto, e quanto vale l’anello');
/* Premere appena si ha paura deve rendere niente; resistere dentro al mucchio
   deve rendere. E il tetto esiste perche' in mezzo a trecento nemici l'onda
   sarebbe una bomba.
   L'onda restituisce una quota di quello che l'anello AVREBBE sparato nei due
   secondi in cui e' stato chiuso. Prima erano due numeri fissi moltiplicati per
   P.dmgMul, che non vede il livello delle rune: misurato col banco, l'onda
   piena ripagava il 35% del buco al quinto minuto e l'11% al quindicesimo —
   il premio per aver tenuto duro svaniva proprio quando tenere duro costa di
   piu'. Rimettendo indietro la correzione, l'ultima riga legge due onde uguali
   su due anelli di forza diversa.                                         */
{
  S().visti = TUTTI_I_BRIEFING();
  const onda = (ass, lv) => {
    O.reset('vega', 935, 'corsa', false); G.state = 'play';
    G.enemies.length = 0; G.zones.length = 0;
    G.ring = new Array(G.slots).fill(null);
    for (let i = 0; i < 3; i++) {
      G.ring[i] = { id: ['scintilla', 'sciame', 'prisma'][i], el: ['fuoco', 'vuoto', 'luce'][i], lv, cd: 0, res: 0, slot: i, st: {} };
    }
    O.recalcRing(false);
    G.charge = 1; O.attivaPerigeo();
    G.periAss = ass; G.peri = .001;
    O.step(1 / 60);
    const z = G.zones.find(x => x.src === 'perigeo');
    return z ? { dmg: z.dmg, r: z.r1 } : { dmg: 0, r: 0 };
  };
  const vuoto = onda(0, 4), mezzo = onda(20, 4), pieno = onda(40, 4), oltre = onda(500, 4);
  ok(vuoto.dmg === 0, 'chi non ha tenuto niente non rilascia niente: premerlo per paura non paga');
  ok(pieno.dmg > 0 && Math.abs(mezzo.dmg * 2 - pieno.dmg) < 1,
     'e il rilascio e’ proporzionale a quanto ha tenuto (' + Math.round(mezzo.dmg) + ' a venti, ' + Math.round(pieno.dmg) + ' a quaranta)');
  ok(pieno.r > vuoto.r * 1.8, 'l’onda e’ anche piu’ larga (' + Math.round(vuoto.r) + ' → ' + Math.round(pieno.r) + 'px)');
  ok(oltre.dmg === pieno.dmg, 'oltre il tetto non cresce piu’: in mezzo a trecento nemici sarebbe una bomba');
  /* e segue la forza dell'anello, non solo i moltiplicatori del giocatore */
  const debole = onda(40, 1), forte = onda(40, 7);
  ok(forte.dmg > debole.dmg * 2.5,
     'e un anello piu’ forte rilascia molto di piu’ (' + Math.round(debole.dmg) + ' a livello 1, ' + Math.round(forte.dmg) + ' a livello 7)');
}

sez('la prima barra piena spiega che gli atti sono due');
/* Il momento in cui la carica si riempie non e' piu' un avviso: e' una
   domanda. Vale anche per chi gioca da prima — il Culmine lo conosce, il
   Perigeo no, e senza questo non lo scoprirebbe mai. */
{
  ok(!!O.BRIEFING.perigeo, 'il briefing esiste');
  const t = O.BRIEFING.perigeo.p.join(' ');
  ok(/Culmine/.test(t) && /Perigeo/.test(t), 'e nomina tutti e due gli atti');
  ok(/non spari/.test(t), 'e dice il prezzo');
  ok(/guardiani/.test(t), 'e il limite');
  O.importSave(b64({ shards: 0, visti: ['culmine'] }));   /* chi gioca da prima */
  O.reset('vega', 936, 'corsa', false); G.state = 'play';
  G.briefing = null; G.charge = 1; G.culm = 0; G.peri = 0;
  O.UI.hud();
  ok(G.briefing === 'perigeo', 'e si apre alla prima barra piena anche a chi conosce gia’ il Culmine');
  G.briefing = null;
  O.UI.hud();
  ok(G.briefing === null, 'una volta sola');
}

sez('un livello per volta, con un po’ di partita in mezzo');
/* «Ho fatto il livello 20 e tre o quattro volte di fila mi ha detto che il
   nucleo cresce.» Erano tre carte vere: gainXP saliva di TUTTI i livelli che
   l'esperienza appena raccolta copriva, dentro un `while`. Una gemma fusa in
   fondo alla partita ne vale qualche migliaio e i settecento punti di un
   guardiano arrivano in un istante, quindi tre livelli scattavano nello stesso
   fotogramma — misurato col bot: sei livelli nel minuto 5 di un'Incursione, e
   pile di quattro carte. Tre carte di fila non sono tre momenti: sono un
   momento sommerso da se stesso, e si premono senza guardarle.
   Adesso un livello alla volta. L'esperienza in eccesso NON si perde: resta
   nella barra, e il livello dopo arriva dopo un po' di gioco vero.
   Rimettendo indietro la correzione la prima riga conta tre carte.        */
{
  S().visti = TUTTI_I_BRIEFING();
  O.reset('vega', 940, 'corsa', false); G.state = 'play';
  G.level = 20; G.xp = 0; G.xpNeed = 2024; G.pending = 0; G.chests = 0; G.lvCd = 0;
  /* una gemma fusa da settemila: con il vecchio `while` erano tre livelli */
  G.gems.push({ x: G.p.x, y: G.p.y, v: 7000 / P.xpMul, k: 0, t: 1, vx: 0, vy: 0, big: 1 });
  for (let i = 0; i < 30; i++) O.step(1 / 60);
  ok(G.pending === 1, 'una gemma da tre livelli consegna UNA carta (' + G.pending + ')');
  ok(G.level === 21, 'e un livello solo (' + G.level + ')');
  ok(G.xp >= G.xpNeed, 'l’eccesso resta nella barra, non si perde (' + Math.round(G.xp) + ' su ' + G.xpNeed + ')');
  /* il livello dopo non arriva finche' la carta e' in attesa */
  for (let i = 0; i < 120; i++) O.step(1 / 60);
  ok(G.pending === 1 && G.level === 21, 'e con la carta in attesa non ne arrivano altri');
  /* consumata la carta, il prossimo arriva dopo un po' di gioco, non subito */
  G.pending = 0;
  O.step(1 / 60);
  ok(G.level === 21, 'nemmeno il fotogramma dopo: in mezzo ci va della partita');
  /* ── venti secondi, non uno ──
     La pausa era 1,2 secondi: «in un minuto dieci schermate che mi
     propongono che il nucleo cresce». Un secondo di partita fra due carte
     non e' un momento, e' la stessa pila consegnata a rate. Misurato sul
     banco il minuto peggiore — non la media — di una corsa: 5 livelli in
     Corsa, 6 nell'Incursione, 8-10 con l'Avidita' comprata e le gemme
     lasciate indietro, a grappoli di quattro o cinque in pochi secondi.
     Il primo valore, dieci secondi, ha avuto la stessa risposta («anche una
     ogni dieci non e' troppo?»), e rendere i livelli piu' cari non e' una
     leva: triplicando il costo una Corsa perde solo un terzo dei livelli,
     perche' l'esperienza viene dalle uccisioni e le uccisioni dalla build.
     Quindi venti secondi nella Corsa — mai piu' di tre al minuto — e dodici
     nell'Incursione, che comprime tutto in otto minuti (vedi MODI).
     Rimettendo 1,2 la riga qui sotto conta il livello dopo un secondo e
     mezzo, e quella successiva ne conta otto in un minuto.              */
  ok(O.MODI.every(m => m.pausaLv >= 10), 'ogni formato dichiara la sua pausa: ' + O.MODI.map(m => m.n + ' ' + m.pausaLv + 's').join(', '));
  for (let i = 0; i < 90; i++) O.step(1 / 60);
  ok(G.level === 21, 'un secondo e mezzo dopo ancora niente: non e’ un momento, e’ una rata');
  let quando = 0;
  for (let i = 0; i < 60 * 22; i++) { O.step(1 / 60); if (G.pending > 0) { quando = (i + 90) / 60; break; } }
  ok(G.level === 22 && G.pending === 1 && quando >= 19.5 && quando <= 20.5,
     'poi arriva, uno solo, dopo venti secondi di partita (livello ' + G.level + ', a ' + quando.toFixed(1) + 's)');
  /* e il conto torna: niente esperienza sparita per strada */
  const speso = 2024 + 2248;
  ok(Math.abs(G.xp - (7000 - speso)) < 2, 'e l’esperienza spesa e’ esattamente quella dei due livelli');
  /* una barra che copre otto livelli li consegna a uno ogni venti secondi:
     in un minuto di partita tre (il primo subito) */
  G.pending = 0; G.lvCd = 0; G.xp = 30000; G.level = 22; G.xpNeed = 2248;
  let carte = 0;
  for (let i = 0; i < 60 * 60; i++) { O.step(1 / 60); if (G.pending > 0) { carte++; G.pending = 0; } }
  ok(carte === 3, 'trentamila punti in barra: ' + carte + ' carte in un minuto, non dieci');
  ok(O.livelliInAttesa() >= 4, 'e il chip del livello sa quanti ne aspettano ancora: +' + O.livelliInAttesa());
  /* e la schermata delle carte lo dice: chi la rivede venti secondi dopo
     deve sapere che era previsto */
  G.level = 21; G.xp = 2248 + 2741 + 100; G.xpNeed = 2248; G.pending = 1; G.chests = 0;
  O.UI.levelup();
  const occ = (O.schermo().match(/class="eyebrow">([^<]*)</) || [])[1] || '';
  ok(/Livello 21 · altri 2 in arrivo, uno ogni 20 s/.test(occ), 'e la carta dice quanti ne arrivano e ogni quanto: «' + occ + '»');
  G.xp = 2300; O.UI.levelup();
  const occ1 = (O.schermo().match(/class="eyebrow">([^<]*)</) || [])[1] || '';
  ok(/un altro fra 20 s/.test(occ1), 'al singolare quando e’ uno: «' + occ1 + '»');
  G.xp = 100; O.UI.levelup();
  const occ0 = (O.schermo().match(/class="eyebrow">([^<]*)</) || [])[1] || '';
  ok(occ0 === 'Livello 21', 'e niente quando non ne aspetta nessuno: «' + occ0 + '»');
  G.pending = 0; O.UI.close && O.UI.close();
  /* l'Incursione ha la sua pausa, piu' corta: comprime tutto in otto minuti */
  O.reset('vega', 940, 'incursione', false); G.state = 'play';
  G.level = 20; G.xp = 0; G.xpNeed = 2024; G.pending = 0; G.chests = 0; G.lvCd = 0;
  G.gems.push({ x: G.p.x, y: G.p.y, v: 7000 / P.xpMul, k: 0, t: 1, vx: 0, vy: 0, big: 1 });
  for (let i = 0; i < 30; i++) O.step(1 / 60);
  G.pending = 0;
  let quandoInc = 0;
  for (let i = 0; i < 60 * 22; i++) { O.step(1 / 60); if (G.pending > 0) { quandoInc = i / 60; break; } }
  ok(G.level === 22 && quandoInc >= 11.5 && quandoInc <= 12.5,
     'nell’Incursione il livello dopo arriva a dodici secondi, non venti (a ' + quandoInc.toFixed(1) + 's)');
  O.UI.levelup();
  const occI = (O.schermo().match(/class="eyebrow">([^<]*)</) || [])[1] || '';
  ok(/fra 12 s|ogni 12 s/.test(occI), 'e la carta lo dice con il numero del formato: «' + occI + '»');
  G.pending = 0; O.UI.close && O.UI.close();
}

sez('le gemme lontane non sono una banca senza fondo');
/* Le gemme fuse tenevano TUTTO quello che restava indietro, per sempre.
   Misurato: il 79% dell'esperienza di una Corsa entra da li', e una gemma
   sola arrivava a valere 4-5 livelli consegnati in un secondo — 11
   nell'Incursione con la sola pausa allungata, che lascia la banca crescere
   piu' a lungo. Con la pausa di dieci secondi diventavano «il nucleo cresce
   ogni dieci secondi per due minuti»: lo stesso difetto, allungato.
   Adesso le gemme fuse valgono insieme al massimo BANCA_MAX livelli; le
   gemme vicine, quelle che si raccolgono combattendo, non hanno tetto, e
   nemmeno i frammenti. Rimettendo indietro il tetto la prima riga legge
   dieci livelli.                                                          */
{
  S().visti = TUTTI_I_BRIEFING();
  O.reset('vega', 942, 'corsa', false); G.state = 'play';
  G.level = 20; G.xp = 0; G.xpNeed = 2024; G.pending = 0; G.lvCd = 0;
  G.enemies.length = 0; G.gems.length = 0;
  const raw = 2024 * 10 / P.xpMul;          /* dieci livelli, sparsi lontano */
  for (let i = 0; i < 300; i++) {
    const a = i / 300 * Math.PI * 2;
    G.gems.push({ x: G.p.x + Math.cos(a) * 900, y: G.p.y + Math.sin(a) * 900, v: raw / 300, k: 0, t: 1, vx: 0, vy: 0 });
  }
  /* e cinquanta vicine, piu' dei frammenti lontani: quelli non si toccano */
  const vicine = [];
  for (let i = 0; i < 50; i++) vicine.push({ x: G.p.x + 200 + i, y: G.p.y + 200, v: 4, k: 0, t: 1, vx: 0, vy: 0 });
  G.gems.push(...vicine);
  for (let i = 0; i < 20; i++) G.gems.push({ x: G.p.x - 1000, y: G.p.y + i * 10, v: 30, k: 1, t: 1, vx: 0, vy: 0 });
  IN.ax = IN.ay = 0; G.gemT = 0;               /* la fusione gira al primo fotogramma */
  for (let i = 0; i < 60; i++) { O.step(1 / 60); G.enemies.length = 0; }
  const fuse = G.gems.filter(m => m.big && m.k === 0);
  const banca = fuse.reduce((a, m) => a + m.v, 0) * P.xpMul / G.xpNeed;
  ok(fuse.length > 0 && fuse.length <= 4, 'le trecento gemme lontane sono diventate ' + fuse.length + ' gemme grosse');
  ok(banca <= 1.5 + .01 && banca > 1.4, 'che insieme valgono ' + banca.toFixed(2) + ' livelli, non dieci');
  ok(vicine.every(m => G.gems.includes(m) && m.v === 4), 'le cinquanta vicine sono ancora tutte li’, intere');
  ok(Math.round(G.gems.filter(m => m.k === 1).reduce((a, m) => a + m.v, 0)) === 600, 'e i seicento frammenti lontani pure');
}

sez('una pila di carte dice il livello di ognuna, non quello di arrivo');
/* La schermata scriveva `G.level`, cioe' il livello di ARRIVO — che a pila
   piena li ha gia' assorbiti tutti — quindi tre carte dicevano tre volte
   «Livello 23». Una scritta che torna uguale e' indistinguibile da un
   inceppamento, e infatti e' stata segnalata come un difetto.
   Adesso i livelli si consegnano uno per volta, quindi una pila cosi' la
   fanno solo un salvataggio ripreso (`riprendiCorsa` rimette `pend`) e la
   Semenza; la regola resta scritta qui perche' la schermata la deve sapere.
   Rimettendo indietro la correzione le tre righe leggono tutte 23.        */
{
  S().visti = TUTTI_I_BRIEFING();
  O.reset('vega', 941, 'corsa', false); G.state = 'play';
  const occhiello = () => { O.UI.levelup(); const m = O.schermo().match(/class="eyebrow">([^<]*)</); return m ? m[1] : ''; };
  G.level = 23; G.pending = 3; G.chests = 0;
  const righe = [];
  for (let k = 0; k < 3; k++) { righe.push(occhiello()); G.pending--; }
  ok(/Livello 21/.test(righe[0]) && /Livello 22/.test(righe[1]) && /Livello 23/.test(righe[2]),
     'le tre carte dicono tre livelli diversi (' + righe.map(r => r.split(' · ')[0]).join(', ') + ')');
  ok(/poi altre 2/.test(righe[0]) && /poi un/.test(righe[1]) && righe[2].indexOf('poi') < 0,
     'e ognuna dice quante ne restano dopo di lei');
  /* gli scrigni si servono per primi, e non rubano un numero di livello */
  G.level = 30; G.pending = 3; G.chests = 1;
  const r2 = [];
  for (let k = 0; k < 3; k++) { r2.push(occhiello()); G.pending--; if (G.chests > 0) G.chests--; }
  ok(/Scrigno/.test(r2[0]), 'lo scrigno in pila resta uno scrigno');
  ok(/Livello 29/.test(r2[1]) && /Livello 30/.test(r2[2]),
     'e le due carte di livello contano solo i livelli (' + r2.slice(1).map(r => r.split(' · ')[0]).join(', ') + ')');
}

sez('la carta la paga solo il guardiano');
/* Ogni carta e' una schermata, cioe' il gioco che si ferma, e la crescita del
   nucleo usciva da OTTO sorgenti che non si parlavano fra loro: i livelli, sei
   che pagavano uno scrigno — i cinque guardiani, gli elite ogni ottanta
   secondi, quattro eventi d'arena su cinque — piu' la Semenza e il Ventaglio.
   Misurato: 43 carte in venti minuti, e la quota che veniva dagli scrigni
   passava dal 20% dei primi cinque minuti al 71% dei minuti 10-14, perche' i
   livelli decelerano e i timer no. Nella seconda meta' della corsa il nucleo
   cresceva per orologio invece che per merito.
   Adesso la carta la paga solo il traguardo. Elite ed eventi pagano in
   esperienza — una gemma grossa che vale una quota del livello corrente — e in
   frammenti: restano premi, ma rientrano nell'unico rubinetto che decelera.
   Rimettendo indietro la correzione, le prime cinque righe contano uno
   scrigno ciascuna.                                                       */
{
  S().visti = TUTTI_I_BRIEFING();
  const premi = f => {
    O.reset('vega', 950, 'corsa', false); G.state = 'play';
    G.drops.length = 0; G.gems.length = 0; G.chests = 0; G.pending = 0;
    f();
    /* trenta fotogrammi: se una condizione pagasse a ripetizione, qui si
       vedrebbe — le quattro degli eventi restano vere finche' l'evento esiste */
    let big = 0;
    for (let i = 0; i < 30; i++) {
      const prima = G.gems.filter(g => g.big && g.k === 0).length;
      O.step(1 / 60); G.pending = 0; P.hp = P.maxHp;
      big += Math.max(0, G.gems.filter(g => g.big && g.k === 0).length - prima);
    }
    /* gli scrigni cadono ai piedi del nucleo e si raccolgono subito: il conto
       e' quelli raccolti piu' quelli ancora a terra */
    return { carte: (G.chests | 0) + G.drops.filter(d => d.k === 'chest').length, xp: big };
  };
  const nomi = ['la breccia raggiunta', 'l’allineamento completo', 'la fermata tenuta', 'il corriere abbattuto'];
  const eventi = [
    () => { G.ev = { k: 'breccia', x: G.p.x, y: G.p.y, t: 1, dur: 22, r: 70, preso: 0 }; },
    () => { G.ev = { k: 'allineamento', t: 1, dur: 23, r: 72, presi: 3, sig: [
      { x: G.p.x, y: G.p.y, dur: 11, preso: 1, morto: 0 },
      { x: G.p.x, y: G.p.y, dur: 17, preso: 1, morto: 0 },
      { x: G.p.x, y: G.p.y, dur: 23, preso: 1, morto: 0 }] }; },
    () => { G.ev = { k: 'fermata', x: G.p.x, y: G.p.y, t: 5, dur: 21, r: 168, carica: 1, acc: 0 }; },
    () => { G.ev = { k: 'caccia', t: 1, dur: 26, e: null }; }
  ];
  for (let i = 0; i < eventi.length; i++) {
    const r = premi(eventi[i]);
    ok(r.carte === 0 && r.xp === 1, nomi[i] + ': nessuna carta, un premio d’esperienza (' +
       r.carte + ' carte, ' + r.xp + ' gemme grosse)');
  }
  /* un elite lasciato uccidere dall'anello */
  const elite = premi(() => {
    G.enemies.length = 0;
    G.enemies.push({ type: 'vagante', x: G.p.x + 40, y: G.p.y, vx: 0, vy: 0, r: 13, c: '#fff', shape: 'dia',
      hp: 1, maxHp: 30, spd: 0, dmg: 0, xp: 2, flash: 0, slow: 0, slowT: 0, burn: 0, burnT: 0,
      froze: 0, kb: 0, kbx: 0, kby: 0, elite: true, boss: null, ten: 1, dead: false });
  });
  ok(elite.carte === 0 && elite.xp === 1, 'un elite abbattuto: nessuna carta, un premio d’esperienza (' +
     elite.carte + ' carte, ' + elite.xp + ' gemme grosse)');
  /* la marea non paga niente, e il guardiano paga la carta */
  const marea = premi(() => { G.ev = { k: 'marea', t: 1, dur: 18, a: 0 }; });
  ok(marea.carte === 0 && marea.xp === 0, 'la marea non paga niente (' + marea.carte + ', ' + marea.xp + ')');
  const guard = premi(() => {
    G.enemies.length = 0; G.bosses.length = 0;
    const b = { type: 'boss', x: G.p.x + 40, y: G.p.y, vx: 0, vy: 0, r: 40, c: '#f00', shape: 'boss',
      hp: 1, maxHp: 900, spd: 0, passo: .8, dmg: 0, xp: 700, flash: 0, slow: 0, slowT: 0, burn: 0, burnT: 0,
      froze: 0, kb: 0, kbx: 0, kby: 0, elite: false, ten: 1, dead: false, ph: 0, atk: 99, atk2: 99,
      charge: 0, cdir: 0, mod: { spd: 1 }, corazza: null, boss: { n: 'PROVA', c: '#f00', pat: 'summon', fine: 0, r: 40, dmg: 0 } };
    G.enemies.push(b); G.bosses.push(b); G.boss = b;
  });
  ok(guard.carte === 1, 'un guardiano abbattuto paga la carta, e una sola (' + guard.carte + ')');
  /* e la quota e' una frazione del livello corrente, non un numero fisso */
  O.reset('vega', 951, 'corsa', false); G.state = 'play';
  G.level = 3; G.xpNeed = 100; G.gems.length = 0;
  G.enemies.length = 0;
  /* la gemma del premio e' quella grossa: gli altri nemici ne lasciano
     intorno delle normali, e l'ultima dell'elenco non e' detto sia la sua */
  const grossa = () => (G.gems.filter(g => g.big && g.k === 0)[0] || { v: 0 }).v;
  premioProva();
  const piccolo = grossa();
  G.level = 20; G.xpNeed = 2024; G.gems.length = 0;
  premioProva();
  const grande = grossa();
  ok(grande > piccolo * 15, 'il premio segue il livello: ' + piccolo + ' al terzo, ' + grande + ' al ventesimo');
  function premioProva() {
    /* la stessa funzione che paga elite ed eventi */
    G.ev = { k: 'breccia', x: G.p.x, y: G.p.y, t: 1, dur: 22, r: 70, preso: 0 };
    for (let i = 0; i < 4 && G.ev; i++) O.step(1 / 60);
  }
}

sez('i due pulsanti d’azione si premono alzando il dito');
/* Culmine e Perigeo stanno nei due angoli in basso, cioe' dove il pollice si
   appoggia per cominciare a trascinare — e la levetta nasce sotto il dito,
   ovunque. Attivandosi al `pointerdown` il dito che scendeva nell'angolo per
   muoversi spendeva invece la carica: con un pulsante solo era un angolo
   sfortunato, con due erano entrambi gli angoli bassi.
   Gli eventi del puntatore il banco non li puo' simulare — il DOM finto non
   registra nessun gestore — quindi questo controllo legge il sorgente, come
   quello dei bottoni senza gestore: costa niente e quella classe di errore
   (riattaccare l'azione al pointerdown) non passa piu'.                  */
{
  const dir = dirname(fileURLToPath(import.meta.url));
  const eng = readFileSync(join(dir, '..', 'src', '02-engine.js'), 'utf8');
  const main = readFileSync(join(dir, '..', 'src', '06-main.js'), 'utf8');
  ok(/function tastoAzione\(/.test(eng), 'esiste un solo posto che decide come si premono');
  ok(/tastoAzione\(\$\('#culm'\), attivaCulmine\)/.test(main) &&
     /tastoAzione\(\$\('#peri'\), attivaPerigeo\)/.test(main),
     'e i due pulsanti passano tutti e due da li’');
  /* l'azione non deve stare in un gestore di pointerdown */
  const giu = main.match(/pointerdown[^;]*attiva(Culmine|Perigeo)/);
  ok(!giu, 'nessuno dei due si attiva quando il dito scende' + (giu ? ': ' + giu[0] : ''));
  /* dentro tastoAzione: l'azione parte dal pointerup, e solo se il dito e’ fermo */
  const corpo = eng.slice(eng.indexOf('function tastoAzione('), eng.indexOf('cv.addEventListener(\'pointerdown\', joyStart)'));
  const su = corpo.indexOf("'pointerup'");
  ok(su > 0 && /if \(fermo\) azione\(\)/.test(corpo), 'l’azione parte dal dito che si alza, e solo se e’ fermo');
  ok(/TAP_MOSSA/.test(corpo) && /joyStart\(/.test(corpo),
     'e un tocco che si muove diventa la levetta invece di perdersi');
}

sez('le targhette dei Risvegli non stanno sotto al Perigeo');
/* Le targhette stavano nell'angolo in basso a sinistra da prima che ci
   arrivasse il pulsante del Perigeo, che ci si e' appoggiato sopra: «Ardore»
   spariva dietro al pulsante e di «Gelo 2/3» restava mezza targhetta. Il
   banco non fa layout, quindi il controllo legge i numeri dal foglio di
   stile: le targhette devono cominciare dove il pulsante finisce, e non
   allargarsi fin dentro l'angolo del Culmine.                             */
{
  const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'shell.html'), 'utf8');
  const regola = id => { const m = css.match(new RegExp('\\n#' + id + '\\{([^}]*)\\}')); return m ? m[1] : ''; };
  const px = (s, k) => { const m = s.match(new RegExp(k + ':(?:calc\\()?(\\d+)px')); return m ? +m[1] : NaN; };
  const peri = regola('peri'), aw = regola('awake');
  const largo = +(peri.match(/width:(\d+)px/) || [])[1];
  ok(px(peri, 'left') + largo <= px(aw, 'left'),
     'cominciano a ' + px(aw, 'left') + 'px, e il pulsante finisce a ' + (px(peri, 'left') + largo));
  ok(px(aw, 'bottom') === px(peri, 'bottom'), 'sulla stessa linea di base del pulsante');
  ok(/max-width:calc\(100vw - 196px/.test(aw), 'e la riga lascia libero anche l’angolo del Culmine');
}

sez('il premio di un evento arriva intero');
/* Due correzioni fatte lo stesso giorno da due sessioni diverse si sono
   incontrate qui. Elite ed eventi non pagano piu' una carta ma una gemma
   grossa d'esperienza; le gemme lontane si fondono in gemme grosse che
   insieme valgono al massimo BANCA_MAX livelli, e il resto si spegne. Giusto
   per l'esperienza d'ambiente, sbagliato per un premio PROMESSO: il Corriere
   muore dove scappava, cioe' lontano, e su un campo affollato il suo premio
   finiva nella banca e ne usciva tagliato dal tetto — dopo che l'avviso
   aveva appena detto «esperienza e frammenti».
   Rimettendo indietro la correzione, la prima riga non trova piu' il premio. */
{
  S().visti = TUTTI_I_BRIEFING();
  O.reset('vega', 960, 'corsa', false); G.state = 'play';
  G.level = 15; G.xpNeed = 1110; G.gems.length = 0;
  /* un campo affollato, e una banca ben oltre il tetto: duecento gemme
     lontane per ottomila punti, contro un tetto di un livello e mezzo */
  for (let i = 0; i < 200; i++) G.gems.push({ x: G.p.x + 600 + i * 7, y: G.p.y + 600, v: 40, k: 0, t: 5, vx: 0, vy: 0 });
  const ambientePrima = 200 * 40;
  const lontano = { x: G.p.x + 900, y: G.p.y + 900 };
  premioEsperienzaProva(lontano);
  const valore = (G.gems.find(g => g.premio) || { v: 0 }).v;
  ok(valore > 0, 'l’evento lascia un premio d’esperienza (' + valore + ' punti)');
  G.gemT = 0;
  for (let i = 0; i < 40; i++) { O.step(1 / 60); G.pending = 0; P.hp = P.maxHp; }
  const p = G.gems.find(g => g.premio);
  ok(!!p, 'il premio sopravvive alla fusione delle gemme lontane');
  ok(!!p && p.v === valore, 'e vale ancora quello che valeva (' + (p ? p.v : 0) + ' di ' + valore + ')');
  /* dove e' caduto: la gemma rimbalza un attimo appena nasce, non si sposta
     dall'altra parte dell'arena come farebbe entrando nella banca */
  ok(!!p && Math.hypot(p.x - lontano.x, p.y - lontano.y) < 80, 'e sta ancora dove e’ caduto');
  /* mentre l'esperienza d'ambiente il tetto lo prende eccome */
  const ambiente = G.gems.filter(g => g.k === 0 && !g.premio).reduce((a, g) => a + g.v, 0);
  ok(ambiente < ambientePrima * .7, 'la banca invece il tetto lo prende (' + Math.round(ambiente) + ' su ' + ambientePrima + ')');
  function premioEsperienzaProva(dove) {
    /* la stessa strada del gioco: un evento completato */
    G.ev = { k: 'caccia', t: 1, dur: 26, e: { x: dove.x, y: dove.y, hp: 0 } };
    for (let i = 0; i < 4 && G.ev; i++) O.step(1 / 60);
  }
}

sez('i doni a terra non si accumulano per tutta la partita');
/* `G.drops` era l'unico insieme del gioco senza tetto — gemme, nemici,
   particelle, scie e zone ce l'hanno tutti — e i doni restavano dove erano
   caduti fino alla fine. Misurato su una Corsa intera, minuto per minuto:
   0 2 3 7 9 13 17 21 25 29 34 37 38 46 50 48 51 55 60 65. A fine corsa
   quarantaquattro CUORI (uno cura il 30% della vita massima: tredici vite
   sparse per l'arena) e ventuno BOMBE, che uccidono ogni nemico della mappa.
   Una dispensa che non si svuota mai, e la difficolta' non ne sa niente.
   Rimettendo indietro la correzione, la prima riga conta venti doni invece
   di zero.                                                                */
{
  S().visti = TUTTI_I_BRIEFING();
  O.reset('vega', 961, 'corsa', false); G.state = 'play';
  G.enemies.length = 0; G.drops.length = 0;
  /* venti doni comuni, lontani, e uno scrigno */
  for (let i = 0; i < 20; i++) G.drops.push({ x: G.p.x + 900, y: G.p.y + 900 + i * 3, k: i % 2 ? 'cuore' : 'bomba', t: 0 });
  G.drops.push({ x: G.p.x + 900, y: G.p.y - 900, k: 'chest', t: 0 });
  /* mezzo minuto: ci sono ancora tutti */
  for (let i = 0; i < 60 * 30; i++) { O.step(1 / 60); G.pending = 0; P.hp = P.maxHp; G.enemies.length = 0; }
  const meta = G.drops.filter(d => d.k !== 'chest').length;
  ok(meta === 20, 'a mezzo minuto i doni ci sono ancora tutti (' + meta + ' su 20)');
  /* passato il minuto, i doni comuni svaniscono */
  for (let i = 0; i < 60 * 40; i++) { O.step(1 / 60); G.pending = 0; P.hp = P.maxHp; G.enemies.length = 0; }
  const restano = G.drops.filter(d => d.k !== 'chest').length;
  ok(restano === 0, 'dopo un minuto non ne resta nessuno (' + restano + ')');
  ok(G.drops.some(d => d.k === 'chest'), 'lo scrigno di un guardiano invece aspetta');
}

console.log('\n' + (ko ? ko + ' CONTROLLI FALLITI su ' + tot : 'tutti i ' + tot + ' controlli passano'));
process.exit(ko ? 1 : 0);

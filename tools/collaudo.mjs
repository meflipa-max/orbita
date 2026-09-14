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
  let scrigno = false;
  /* intoccabile: restare fermi in mezzo alla folla costa vita per davvero
     — e' il punto dell'evento — e qui si sta misurando la cura, non lei */
  for (let i = 0; i < 60 * 14 && G.ev; i++) {
    G.p.x = v.x; G.p.y = v.y; G.p.inv = 9;
    O.step(1 / 60);
    if (G.drops.some(d => d.k === 'chest')) scrigno = true;
  }
  ok(!G.ev, 'piena, l’evento si chiude');
  ok(scrigno, 'e lascia uno scrigno');
  ok(P.hp > feriti, 'e un po’ di vita (' + Math.round(feriti) + ' → ' + Math.round(P.hp) + ')');
}

console.log('\n' + (ko ? ko + ' CONTROLLI FALLITI su ' + tot : 'tutti i ' + tot + ' controlli passano'));
process.exit(ko ? 1 : 0);

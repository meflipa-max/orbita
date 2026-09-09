/* ═══════════════════════════════════════════════════════════════
   ORBITA — ciclo principale.
   ═══════════════════════════════════════════════════════════════ */

function step(dt) {
  G.t += dt;
  const p = G.p, i = readInput();
  const tx = i.x * P.spd, ty = i.y * P.spd, k = Math.min(1, dt * 16);
  p.vx += (tx - p.vx) * k; p.vy += (ty - p.vy) * k;
  p.x = clamp(p.x + p.vx * dt, -ARENA, ARENA);
  p.y = clamp(p.y + p.vy * dt, -ARENA, ARENA);
  scostaDaRocce(p, p.r);
  /* entrare o uscire da un Nodo cambia le catene: ricalcolo solo sulla
     transizione, non a ogni fotogramma */
  const nd = nodoCorrente();
  if (nd !== G.nodo) {
    G.nodo = nd; recalcRing(!!nd);
    /* entrare in un Nodo cambia le catene, cioè la regola centrale del
       gioco, e finora lo diceva solo una targhetta in un angolo dell'HUD */
    /* solo su un Nodo che ti sta davvero potenziando: spiegare «+35% al
       tuo elemento» dentro l'aura di un elemento che non giochi insegna
       la regola nel momento in cui è falsa */
    if (nd && G.elAnello.has(nd) && !G.demo && !visto('nodo')) G.briefing = 'nodo';
  }
  /* La prima volta che tieni la levetta a fondo corsa per piu' di un
     secondo, diglielo: spingere piu' lontano non aumenta la velocita', e
     spingendo il dito ti cammina addosso all'azione. Solo nelle prime
     partite: dopo basta l'anello che si accende. */
  if (IN.touchId !== null && i.x * i.x + i.y * i.y > .985) {
    G.maxT += dt;
    if (G.maxT > 1.1 && !G.maxHint && (SAVE.runs | 0) <= 3) {
      G.maxHint = 1;
      UI.toast('VELOCITÀ MASSIMA', 'Spingere più lontano non serve', '#bff6ff');
    }
  } else G.maxT = 0;
  if (p.inv > 0) p.inv -= dt;
  if (p.hurt > 0) p.hurt -= dt;
  if (G.healCd > 0) G.healCd -= dt;
  if (P.regen) P.hp = Math.min(P.maxHp, P.hp + P.regen * dt);

  /* Il dito copre lo schermo e non si può togliere: si può però spostare
     l'azione dall'altra parte. La telecamera scivola verso il pollice,
     così il nucleo viene disegnato dal lato opposto e ti restituisce
     proprio la porzione di schermo che la mano ti stava rubando. */
  let bx = 0, by = 0;
  if (IN.touchId !== null) {
    const m = Math.min(G.vw, G.vh) * .13;   /* uno spostamento di mondo, non di schermo */
    bx = clamp((IN.ox - W / 2) / (W / 2), -1, 1) * m;
    by = clamp((IN.oy - H / 2) / (H / 2), -1, 1) * m;
  }
  const bk = Math.min(1, dt * 2.6);
  G.biasX += (bx - G.biasX) * bk; G.biasY += (by - G.biasY) * bk;

  const ck = Math.min(1, dt * 7);
  G.cam.x += (p.x + p.vx * .2 + G.biasX - G.cam.x) * ck;
  G.cam.y += (p.y + p.vy * .2 + G.biasY - G.cam.y) * ck;
  const mx = Math.max(0, ARENA - G.vw / 2 + 70), my = Math.max(0, ARENA - G.vh / 2 + 70);
  G.cam.x = clamp(G.cam.x, -mx, mx); G.cam.y = clamp(G.cam.y, -my, my);

  GRID.clear();
  const E = G.enemies;
  for (let n = 0; n < E.length; n++) if (E[n].hp > 0) GRID.add(E[n]);

  updateRunes(dt);
  updateBullets(dt);
  updateEBullets(dt);
  updateZones(dt);
  updateEnemies(dt);
  updateGems(dt);
  updateParts(dt);
  updateEventi(dt);
  updateSpawns(dt);

  /* Le istruzioni svaniscono al primo movimento, o da sole dopo qualche
     secondo. Questa è l'unica lezione passiva, perché si impara facendo la
     cosa che chiede: quella sulle schegge è una carta con un bottone. */
  if (G.hint > 0) {
    G.hint -= dt;
    if (G.hint <= 0 || Math.hypot(i.x, i.y) > .25) { G.hint = 0; G.hintOff = .5; elHint.classList.add('out'); }
  } else if (G.hintOff > 0) {
    G.hintOff -= dt;
    if (G.hintOff <= 0) elHint.className = 'clip';
  } else if (!G.demo && !visto('gemme') && G.gems.length) {
    /* La lezione sulle schegge non è un pannello che resta lì: è una carta
       che ferma il gioco e se ne va quando tocchi «Ho capito». Un avviso
       passivo o dura poco e non lo leggi, o dura tanto e dà fastidio —
       venticinque secondi di pannello addosso all'azione erano la seconda
       cosa. Con il bottone la durata la decidi tu, ed è la stessa forma che
       il gioco usa già per gli eventi d'arena e per i Nodi. */
    G.briefing = 'gemme';
  }

  flushUccisioni(dt);

  /* ── chiarezza ───────────────────────────────────────────────
     La regola: cio' che ti puo' uccidere e' la cosa piu' visibile dello
     schermo, tutto il resto cede il posto. I tuoi effetti sono decorazione
     — sai gia' che le rune sparano, non le comandi — i nemici invece sono
     informazione, e a meta' partita erano l'unica cosa che NON si vedeva,
     sepolta sotto le tue stesse esplosioni. Quindi piu' il campo si
     affolla, piu' i tuoi effetti si fanno da parte: restano leggibili,
     smettono di essere un muro di luce. Non tocca il gioco, solo l'alfa. */
  const carico = G.enemies.length / 70 + G.zones.length / 22 + G.bullets.length / 55;
  const mira = clamp(1.28 - carico * .42, .42, 1);
  G.chiarezza += (mira - G.chiarezza) * Math.min(1, dt * 2.2);

  G.shake = Math.max(0, G.shake - dt * 42);
  /* il velo a pieno schermo e' rosa quando ti fai male e bianco quando
     spazzi la mappa: due cose opposte non possono avere lo stesso colore */
  if (G.flashT > 0) {
    G.flashT -= dt;
    elFlash.style.background = G.flashC;
    elFlash.style.opacity = String(Math.max(0, G.flashT * 2.4));
  }
  else if (elFlash.style.opacity !== '0') elFlash.style.opacity = '0';

  /* tracce per le sfide */
  if (P.hp < P.maxHp * .5) G.lowHp = 1;
  if (!G.pieno) { let v = 0; for (let n = 0; n < G.slots; n++) if (G.ring[n]) v++; if (v >= G.slots) G.pieno = 1; }

  UI.hud();
  /* La prima volta che succede una cosa che chiede di ANDARE da qualche
     parte, il gioco si ferma e la spiega. Un avviso che passa in due
     secondi mentre schivi non lo legge nessuno, e un evento d'arena che
     non capisci è solo un pezzo di schermo che lampeggia. Ha la
     precedenza sulla schermata delle carte: l'evento è già in corso e il
     suo tempo scorre, la carta aspetta. */
  if (G.briefing) { G.state = 'briefing'; UI.briefing(G.briefing); return; }
  if (G.pending > 0) { G.state = 'level'; UI.levelup(); }
}

/* Il riepilogo di fine fotogramma. Le uccisioni si accumulano durante il
   passo e si tirano le somme qui, una volta sola: cosi' una Nova che ne
   spazza venti insieme e' UN evento con un suono suo, invece di venti
   suoni identici sovrapposti che si annullano a vicenda.
   Il contatore che decide l'altezza avanza anche quando il suono viene
   scartato dal limitatore: cosi' l'arpeggio continua a scorrere invece di
   inchiodarsi sulla stessa nota. */
function flushUccisioni(dt) {
  if (G.raffCd > 0) G.raffCd -= dt;
  /* conto quante ne sono cadute negli ultimi decimi di secondo: decade da
     solo, cosi' non serve tenere una lista di istanti */
  G.raffFin *= Math.exp(-dt / .13);

  if (G.raffN > 0) {
    AU.pop(G.raffN, G.combo);
    G.combo++; G.comboT = .55;
    G.raffFin += G.raffN;
    /* Cinque in un decimo di secondo non capita falciando: capita quando
       una Nova apre un buco o quando una cascata di implosioni si porta
       via un grappolo. Quello e' il momento che merita un tonfo — e la
       pausa obbligata lo tiene un evento invece di un tamburo. */
    if (G.raffFin >= 5 && G.raffCd <= 0) {
      G.raffCd = .34;
      AU.raffica(.55 + G.raffFin / 22);
      /* un anello solo al centro del grappolo, invece di venti anelli
         sovrapposti che fanno una macchia */
      G.zones.push({ k: 'ring', x: G.raffX / G.raffN, y: G.raffY / G.raffN,
        r0: G.raffR, r1: G.raffR + 46 + Math.min(30, G.raffFin) * 8,
        t: 0, dur: .36, c: G.raffC });
      G.raffFin = 0;
    }
    G.raffN = 0; G.raffX = 0; G.raffY = 0; G.raffR = 0;
  } else if (G.comboT > 0) {
    G.comboT -= dt;
    if (G.comboT <= 0) G.combo = 0;     /* la scala riparte dal basso */
  }
}

/* misurazione leggera: sotto i 40 fps riduco le particelle */
let fAcc = 0, fCnt = 0;
function adapt(ms) {
  fAcc += ms; fCnt++;
  if (fCnt >= 45) {
    const avg = fAcc / fCnt; fAcc = 0; fCnt = 0;
    if (avg > 25 && G.q > .35) G.q = Math.max(.35, G.q - .18);
    else if (avg < 15 && G.q < 1) G.q = Math.min(1, G.q + .1);
  }
}

let last = performance.now();
function frame(t) {
  requestAnimationFrame(frame);
  let rdt = (t - last) / 1000; last = t;
  if (rdt > .06) rdt = .06;

  /* Autoriparazione delle dimensioni. Su mobile il canvas poteva restare
     dimensionato su un viewport vecchio finché non ruotavi il telefono:
     il gioco partiva deformato e si sistemava solo cambiando orientamento.
     Confrontare qui copre qualunque causa, invece di indovinarne una. */
  if (app.clientWidth !== W || app.clientHeight !== H) {
    if (app.clientWidth > 0 && app.clientHeight > 0) resize();
  }

  let intensity = .1;
  if (G.state === 'play') {
    let dt = rdt;
    if (G.hitstop > 0) { G.hitstop -= rdt; dt *= .18; }
    /* La ripresa dopo una schermata: vedi riprendiGioco() in 05-ui. Scorre
       sull'orologio vero e non sul tempo di gioco, o rallentandola
       rallenterebbe anche se stessa e non finirebbe mai. La curva è al
       quadrato apposta: il tempo che serve sta tutto all'inizio, quando
       devi capire dove sei, e la velocità piena torna in fretta invece di
       trascinarsi. */
    if (G.ripresa > 0) {
      G.ripresa -= rdt;
      const f = clamp(1 - G.ripresa / RIPRESA, 0, 1);
      dt *= lerp(.16, 1, f * f);
    }
    step(dt);
    intensity = clamp(G.t / 780 * .55 + G.enemies.length / 190 * .35 + (G.boss ? .3 : 0), 0, 1);
  } else if (G.state === 'menu') {
    menuStep(rdt);
    intensity = .16;
  } else {
    /* scelta potenziamento, anello, pausa, fine: la musica NON si interrompe.
       Prima il sequencer veniva alimentato solo in gioco e con i livelli
       frequenti la colonna sonora singhiozzava a ogni schermata. */
    intensity = G.state === 'over' ? .06 : clamp(G.t / 780 * .4 + .2, 0, .6);
  }
  AU.tick(intensity, G.state === 'play' && !!G.boss);
  if (cv.width > 0 && cv.height > 0) render();
  adapt(performance.now() - t);
}

/* ── vetrina del menu ───────────────────────────────────────────
   Dietro al titolo gira il gioco vero: stesse rune, stessi nemici,
   stessi effetti. Un logo su fondo nero non dice cos'è Orbita. */
function demoRing() {
  G.slots = 8;
  G.ring = new Array(8).fill(null);
  /* catena di fuoco, Iride come ponte, catena di gelo: due Risvegli accesi,
     così si vedono subito gli archi di risonanza attorno al nucleo */
  const set = ['scintilla', 'pira', 'nova', 'iride', 'scheggia', 'cristallo', 'bruma', 'arco'];
  set.forEach((id, i) => {
    G.ring[i] = { id, el: RUNES[id].el, lv: 4 + (i % 3), cd: rand(.6), res: 0, slot: i, st: {} };
  });
  recalcRing(false);
}

function enterMenu() {
  G.demo = true;
  G.enemies.length = 0; G.bullets.length = 0; G.ebul.length = 0; G.gems.length = 0;
  G.zones.length = 0; G.parts.length = 0; G.drops.length = 0; G.floats.length = 0;
  G.boss = null; G.bosses.length = 0; G.bossIdx = 99; G.pending = 0; G.spawnAcc = 0; G.shake = 0; G.diff = 0;
  G.ev = null; G.evT = 1e9;              /* nessun evento nella vetrina del menu */
  /* la vetrina non eredita la congiunzione dell'ultima partita: dopo uno
     Sciame il menu spawnava al ritmo dello Sciame, che non è quello che il
     titolo deve mostrare */
  G.modo = MODI[0]; G.cong = CONGIUNZIONI[0]; G.cg = congMods(null); G.giornaliera = false;
  G.rocks.length = 0; G.nodo = null; G.nodoK = null;   /* né ostacoli dietro al titolo */
  G.tenacia = 1; G.raggio = RAGGIO_MIRA; G.chiarezza = 1;
  G.char = CHARS.find(c => c.id === SAVE.char) || CHARS[0];
  G.skin = SKINS.find(k => k.id === SAVE.skin) || SKINS[0];
  G.passives = { impeto: 3, ampiezza: 2, frenesia: 2 };
  G.p.x = 0; G.p.y = 0; G.p.inv = 999; G.cam.x = 0; G.cam.y = 0;
  demoRing();
  P.hp = undefined; recalc(); P.hp = P.maxHp;
}

const DEMO_POOL = ['sciamante', 'sciamante', 'vagante', 'scissore', 'spettro'];
function menuStep(dt) {
  G.t += dt;
  const p = G.p;
  /* percorso di Lissajous: non torna mai sullo stesso giro, non sembra un loop */
  const tx = Math.sin(G.t * .27) * 560 + Math.sin(G.t * .113) * 190;
  const ty = Math.cos(G.t * .19) * 400 + Math.cos(G.t * .071) * 150;
  const k = Math.min(1, dt * 1.7);
  const nx = lerp(p.x, tx, k), ny = lerp(p.y, ty, k);
  p.vx = (nx - p.x) / Math.max(dt, 1e-4); p.vy = (ny - p.y) / Math.max(dt, 1e-4);
  p.x = nx; p.y = ny;

  /* Il nucleo sta dove NON ci sono i pannelli. Prima la regola era «il
     titolo occupa la metà alta, il nucleo sta in quella bassa», e infatti
     la telecamera lo spingeva in basso; da quando l'azione sta in fondo —
     la carta della corsa, Gioca, i tre bottoni — quello è il posto peggiore
     dello schermo, e il nucleo passava metà del tempo dietro ai bottoni.
     Adesso sale, e sale di più su un telefono, dove i pannelli si prendono
     quasi metà schermo. L'offset è in unità di MONDO (G.vh), non di
     schermo: con lo zoom del telefono un offset in pixel valeva un terzo. */
  const ck = Math.min(1, dt * 3);
  /* Lo spazio libero non sta nello stesso posto sui due schermi.
     Su un telefono la colonna dei pannelli è larga quanto lo schermo e
     comincia al 55%: il buco è SOPRA, quindi il nucleo sale al 37%.
     Su un desktop la colonna è alta ma larga solo 760 pixel su 1280: il
     buco è di LATO, quindi il nucleo si sposta a destra invece che in su,
     e resta all'altezza in cui la sfumatura è più limpida. */
  const stretto = W < 700;
  const alza = (stretto ? .11 : 0) * G.vh;
  const sposta = (stretto ? 0 : .30) * G.vw;
  G.cam.x += (p.x - sposta - G.cam.x) * ck;
  G.cam.y += (p.y + alza - G.cam.y) * ck;

  /* flusso generoso: con otto rune e due Risvegli i nemici durano un istante,
     e una vetrina mezza vuota non mostra niente */
  G.spawnAcc += dt * 7;
  while (G.spawnAcc >= 1) {
    G.spawnAcc -= 1;
    if (G.enemies.length < 75) spawnRing(pick(DEMO_POOL));
  }

  GRID.clear();
  for (let i = 0; i < G.enemies.length; i++) if (G.enemies[i].hp > 0) GRID.add(G.enemies[i]);
  updateRunes(dt);
  updateBullets(dt);
  updateZones(dt);
  updateEnemies(dt);
  updateGems(dt);
  updateParts(dt);

  flushUccisioni(dt);

  /* la vetrina non fa progredire niente */
  G.pending = 0; G.drops.length = 0; P.hp = P.maxHp; p.inv = 999;
  G.shake = Math.max(0, G.shake - dt * 42);
}

function boot() {
  loadSave();
  /* tre contratti sempre in corso, anche alla primissima apertura e anche
     per un salvataggio vecchio che non ne ha nessuno */
  if (pescaContratti()) storeSave();
  resize();
  buildStars();
  G.q = 1;
  enterMenu();
  G.state = 'menu';
  UI.title();
  requestAnimationFrame(frame);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.state === 'play') UI.togglePause();
  });
  $('#btnPause').addEventListener('click', e => { e.stopPropagation(); AU.init(); UI.togglePause(); });
  /* handle di debug: utile per collaudo e bilanciamento */
  window.ORBITA = { G, P, UI, AU, RUNES, EL, MODI, CONGIUNZIONI, SBLOCCHI, CONTRATTI, RELIQUIE, BRIEFING, save: () => SAVE, start: startRun, reset: resetRun, endRun, payout, congiunzioneDi, rosterGuardiani, metaCost, contrattoPremio, statoPartita, semeDelGiorno, tettoNemici, step, place: placeRune, roll: rollChoices, apply: applyChoice, recalc, recalcRing, srand, nextRand, seed: () => G.seed, render, dpr: () => DPR, storeOk: () => STORE_OK, exportSave, importSave, wipeSave, storeSave, loadSave };
  addEventListener('pointerdown', () => AU.init(), { once: true });
  addEventListener('keydown', () => AU.init(), { once: true });
}
boot();

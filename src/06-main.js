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
  if (nd !== G.nodo) { G.nodo = nd; recalcRing(!!nd); }
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
    const m = Math.min(W, H) * .13;
    bx = clamp((IN.ox - W / 2) / (W / 2), -1, 1) * m;
    by = clamp((IN.oy - H / 2) / (H / 2), -1, 1) * m;
  }
  const bk = Math.min(1, dt * 2.6);
  G.biasX += (bx - G.biasX) * bk; G.biasY += (by - G.biasY) * bk;

  const ck = Math.min(1, dt * 7);
  G.cam.x += (p.x + p.vx * .2 + G.biasX - G.cam.x) * ck;
  G.cam.y += (p.y + p.vy * .2 + G.biasY - G.cam.y) * ck;
  const mx = Math.max(0, ARENA - W / 2 + 70), my = Math.max(0, ARENA - H / 2 + 70);
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

  /* le istruzioni svaniscono al primo movimento, o da sole dopo qualche secondo */
  if (G.hint > 0) {
    G.hint -= dt;
    if (G.hint <= 0 || Math.hypot(i.x, i.y) > .25) { G.hint = 0; G.hintOff = .5; elHint.classList.add('out'); }
  } else if (G.hintOff > 0) {
    G.hintOff -= dt;
    if (G.hintOff <= 0) elHint.className = 'clip';
  }

  G.shake = Math.max(0, G.shake - dt * 42);
  if (G.flashT > 0) { G.flashT -= dt; elFlash.style.opacity = String(Math.max(0, G.flashT * 2.4)); }
  else if (elFlash.style.opacity !== '0') elFlash.style.opacity = '0';

  /* tracce per le sfide */
  if (P.hp < P.maxHp * .5) G.lowHp = 1;
  if (!G.pieno) { let v = 0; for (let n = 0; n < G.slots; n++) if (G.ring[n]) v++; if (v >= G.slots) G.pieno = 1; }

  UI.hud();
  if (G.pending > 0) { G.state = 'level'; UI.levelup(); }
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
  G.rocks.length = 0; G.nodo = null; G.nodoK = null;   /* né ostacoli dietro al titolo */
  G.char = CHARS.find(c => c.id === SAVE.char) || CHARS[0];
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

  /* il nucleo sta nella metà bassa: il titolo occupa quella alta */
  const ck = Math.min(1, dt * 3);
  G.cam.x += (p.x - G.cam.x) * ck;
  G.cam.y += (p.y - H * .15 - G.cam.y) * ck;

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

  /* la vetrina non fa progredire niente */
  G.pending = 0; G.drops.length = 0; P.hp = P.maxHp; p.inv = 999;
  G.shake = Math.max(0, G.shake - dt * 42);
}

function boot() {
  loadSave();
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
  window.ORBITA = { G, P, UI, AU, RUNES, EL, save: () => SAVE, start: startRun, step, place: placeRune, roll: rollChoices, apply: applyChoice, recalc, recalcRing, srand, nextRand, seed: () => G.seed, storeOk: () => STORE_OK, exportSave, importSave, storeSave, loadSave };
  addEventListener('pointerdown', () => AU.init(), { once: true });
  addEventListener('keydown', () => AU.init(), { once: true });
}
boot();

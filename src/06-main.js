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
  if (p.inv > 0) p.inv -= dt;
  if (p.hurt > 0) p.hurt -= dt;
  if (G.healCd > 0) G.healCd -= dt;
  if (P.regen) P.hp = Math.min(P.maxHp, P.hp + P.regen * dt);

  const ck = Math.min(1, dt * 7);
  G.cam.x += (p.x + p.vx * .2 - G.cam.x) * ck;
  G.cam.y += (p.y + p.vy * .2 - G.cam.y) * ck;
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

  let intensity = .1;
  if (G.state === 'play') {
    let dt = rdt;
    if (G.hitstop > 0) { G.hitstop -= rdt; dt *= .18; }
    step(dt);
    intensity = clamp(G.t / 780 * .55 + G.enemies.length / 190 * .35 + (G.boss ? .3 : 0), 0, 1);
  } else if (G.state === 'menu') {
    G.t += rdt * .5; G.ringRot += rdt * .55;
    G.cam.x = Math.sin(G.t * .085) * 300; G.cam.y = Math.cos(G.t * .062) * 230;
    G.p.x = G.cam.x; G.p.y = G.cam.y;
    for (let n = 0; n < G.slots; n++) {
      const r = G.ring[n]; if (!r) continue;
      const a = G.ringRot + n / G.slots * TAU;
      r.wa = a; r.wx = G.p.x + Math.cos(a) * RING_R; r.wy = G.p.y + Math.sin(a) * RING_R;
    }
    updateParts(rdt);
    G.shake = Math.max(0, G.shake - rdt * 42);
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

/* ── avvio ──────────────────────────────────────────────────── */
function demoRing() {
  G.slots = 8;
  G.ring = new Array(8).fill(null);
  const ids = shuffle(['scintilla', 'cristallo', 'arco', 'falce', 'aureola', 'scheggia', 'prisma', 'tempesta']).slice(0, 6);
  const order = [0, 1, 2, 4, 5, 6];
  ids.forEach((id, i) => {
    G.ring[order[i]] = { id, el: RUNES[id].el, lv: 1, cd: 999, res: 0, slot: order[i], st: {} };
  });
  for (let i = 0; i < 8; i++) {
    const a = G.ring[i], b = G.ring[(i + 1) % 8];
    if (a && b && compat(a, b)) { a.res++; b.res++; }
  }
}

function boot() {
  loadSave();
  resize();
  buildStars();
  G.q = 1; G.diff = 0; G.char = CHARS.find(c => c.id === SAVE.char) || CHARS[0];
  P.hp = undefined; recalc();
  demoRing();
  G.state = 'menu';
  UI.title();
  requestAnimationFrame(frame);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.state === 'play') UI.togglePause();
  });
  $('#btnPause').addEventListener('click', e => { e.stopPropagation(); AU.init(); UI.togglePause(); });
  /* handle di debug: utile per collaudo e bilanciamento */
  window.ORBITA = { G, P, UI, AU, RUNES, EL, save: () => SAVE, start: startRun, step, place: placeRune, roll: rollChoices, apply: applyChoice, recalc, recalcRing };
  addEventListener('pointerdown', () => AU.init(), { once: true });
  addEventListener('keydown', () => AU.init(), { once: true });
}
boot();

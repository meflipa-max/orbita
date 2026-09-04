/* ═══════════════════════════════════════════════════════════════
   ORBITA — rune, nemici, simulazione.
   ═══════════════════════════════════════════════════════════════ */

const RING_R = 64;

function nearest(x, y, maxR, skip) {
  GRID.near(x, y, maxR, _q);
  let best = null, bd = maxR * maxR;
  for (let i = 0; i < _q.length; i++) {
    const e = _q[i]; if (e.hp <= 0 || e === skip) continue;
    const d = (e.x - x) * (e.x - x) + (e.y - y) * (e.y - y);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}
function areaHit(x, y, r, dmg, opt) {
  const list = GRID.near(x, y, r, []);   /* buffer proprio: hitEnemy può rientrare */
  const r2 = r * r;
  for (let i = 0; i < list.length; i++) {
    const e = list[i]; if (e.hp <= 0) continue;
    const dx = e.x - x, dy = e.y - y;
    if (dx * dx + dy * dy < r2 + e.r * e.r) {
      const o = Object.assign({ kbx: dx, kby: dy }, opt);
      const m = Math.hypot(dx, dy) || 1; o.kbx = dx / m; o.kby = dy / m;
      hitEnemy(e, dmg, o);
    }
  }
}

/* ── comportamento delle rune ───────────────────────────────── */
const FIRE = {
  scintilla(r, s) {
    const t = nearest(G.p.x, G.p.y, 940);
    const a0 = t ? Math.atan2(t.y - r.wy, t.x - r.wx) : r.wa;
    for (let i = 0; i < s.count; i++) {
      const a = a0 + (i - (s.count - 1) / 2) * .17;
      shoot({ x: r.wx, y: r.wy, vx: Math.cos(a) * s.spd, vy: Math.sin(a) * s.spd, r: s.size, dmg: s.dmg, el: 'fuoco', c: EL.fuoco.c, pierce: s.pierce, kind: 'orb', life: 2.3, homing: 2.6, trail: 1 });
    }
    AU.play('shoot');
  },
  pira(r, s) {
    G.zones.push({ k: 'pool', x: G.p.x, y: G.p.y, r: s.area, t: 0, dur: s.dur, dps: s.dmg, tick: 0, c: EL.fuoco.c, el: 'fuoco' });
  },
  nova(r, s) {
    G.zones.push({ k: 'nova', x: G.p.x, y: G.p.y, r0: 12, r1: s.area, t: 0, dur: .46, dmg: s.dmg, hit: new Set(), c: EL.fuoco.c, kb: 340 });
    AU.play('blast'); G.shake = Math.max(G.shake, 4);
  },
  scheggia(r, s) {
    let a;
    const mv = Math.hypot(G.p.vx, G.p.vy);
    if (mv > 24) a = Math.atan2(G.p.vy, G.p.vx);
    else { const t = nearest(G.p.x, G.p.y, 940); a = t ? Math.atan2(t.y - G.p.y, t.x - G.p.x) : r.wa; }
    for (let i = 0; i < s.count; i++) {
      const aa = a + (i - (s.count - 1) / 2) * .2;
      shoot({ x: G.p.x, y: G.p.y, vx: Math.cos(aa) * s.spd, vy: Math.sin(aa) * s.spd, r: s.size, dmg: s.dmg, el: 'gelo', c: EL.gelo.c, pierce: s.pierce, kind: 'shard', life: 1.7, ang: aa });
    }
    AU.play('shoot');
  },
  bruma(r, s) { areaHit(G.p.x, G.p.y, s.area, s.dmg, { color: EL.gelo.c, noCrit: true, el: 'gelo' }); },
  cristallo(r, s) {
    if (!r.st.orb || r.st.n !== s.count) { r.st.n = s.count; r.st.orb = []; for (let i = 0; i < s.count; i++) r.st.orb.push({ p: i / s.count * TAU }); }
    return true;
  },
  arco(r, s) {
    const t = nearest(G.p.x, G.p.y, s.area * 1.4);
    if (!t) { r.cd = .18; return; }
    G.zones.push({ k: 'spark', x1: r.wx, y1: r.wy, x2: t.x, y2: t.y, t: 0, dur: .16, c: EL.fulmine.c });
    hitEnemy(t, s.dmg, { color: EL.fulmine.c, el: 'fulmine' });
    chainFrom(t, s.dmg * .78, s.count - 1, s.area);
    AU.play('shoot');
  },
  tempesta(r, s) {
    for (let i = 0; i < s.count; i++) {
      const a = rand(TAU), d = rand(s.area, s.area * .18);
      const x = G.p.x + Math.cos(a) * d, y = G.p.y + Math.sin(a) * d;
      G.zones.push({ k: 'bolt', x, y, r: s.size, t: 0, dur: .42, dmg: s.dmg, done: 0, c: EL.fulmine.c });
    }
  },
  filo(r, s) {
    const t = nearest(r.wx, r.wy, s.area);
    if (!t) { r.st.tgt = null; return; }
    r.st.tgt = t;
    G.zones.push({ k: 'beam', x1: r.wx, y1: r.wy, x2: t.x, y2: t.y, t: 0, dur: .11, c: EL.fulmine.c, w: 3 });
    hitEnemy(t, s.dmg, { color: EL.fulmine.c, noCrit: nextRand() > .3, el: 'fulmine' });
  },
  singolarita(r, s) {
    const t = nearest(G.p.x, G.p.y, 620);
    const x = t ? t.x : G.p.x + rand(240, -240), y = t ? t.y : G.p.y + rand(240, -240);
    G.zones.push({ k: 'hole', x, y, r: s.area, t: 0, dur: s.dur, dps: s.dmg, tick: 0, c: EL.vuoto.c, el: 'vuoto' });
    AU.play('blast');
  },
  falce(r, s) {
    const t = nearest(G.p.x, G.p.y, 900);
    const a0 = t ? Math.atan2(t.y - G.p.y, t.x - G.p.x) : r.wa;
    for (let i = 0; i < s.count; i++) {
      const a = a0 + i * (TAU / s.count);
      shoot({ x: G.p.x, y: G.p.y, vx: Math.cos(a) * s.spd, vy: Math.sin(a) * s.spd, r: s.size, dmg: s.dmg, el: 'vuoto', c: EL.vuoto.c, pierce: 99, kind: 'scythe', life: 2.6, spin: rand(9, 6), back: 0, retime: .42 });
    }
    AU.play('shoot');
  },
  sciame(r, s) {
    const t = nearest(G.p.x, G.p.y, 940);
    const a0 = t ? Math.atan2(t.y - r.wy, t.x - r.wx) : r.wa;
    for (let i = 0; i < s.count; i++) {
      const a = a0 + (i - (s.count - 1) / 2) * .19;
      shoot({ x: r.wx, y: r.wy, vx: Math.cos(a) * s.spd, vy: Math.sin(a) * s.spd, r: s.size, dmg: s.dmg, el: 'vuoto', c: EL.vuoto.c, pierce: s.pierce, kind: 'bolt', life: 1.9, ang: a });
    }
    AU.play('shoot');
  },
  raggio(r, s) {
    const a = r.st.a || 0;
    const x2 = G.p.x + Math.cos(a) * s.area, y2 = G.p.y + Math.sin(a) * s.area;
    G.zones.push({ k: 'beam', x1: G.p.x, y1: G.p.y, x2, y2, t: 0, dur: .1, c: EL.luce.c, w: 7 });
    /* danno lungo il segmento */
    const steps = Math.ceil(s.area / 46);
    for (let i = 1; i <= steps; i++) {
      const f = i / steps;
      areaHit(G.p.x + (x2 - G.p.x) * f, G.p.y + (y2 - G.p.y) * f, 26, s.dmg, { color: EL.luce.c, noCrit: nextRand() > .2, el: 'luce' });
    }
  },
  prisma(r, s) {
    const t = nearest(G.p.x, G.p.y, 940);
    const a = t ? Math.atan2(t.y - r.wy, t.x - r.wx) : r.wa;
    shoot({ x: r.wx, y: r.wy, vx: Math.cos(a) * s.spd, vy: Math.sin(a) * s.spd, r: s.size, dmg: s.dmg, el: 'luce', c: EL.luce.c, pierce: 0, kind: 'orb', life: 2.2, split: s.count, trail: 1 });
    AU.play('shoot');
  },
  aureola(r, s) {
    G.zones.push({ k: 'nova', x: G.p.x, y: G.p.y, r0: 8, r1: s.area, t: 0, dur: .4, dmg: s.dmg, hit: new Set(), c: EL.luce.c, kb: 90 });
    P.hp = Math.min(P.maxHp, P.hp + s.heal);
    addFloat(G.p.x, G.p.y - 30, '+' + s.heal.toFixed(1), '#6ff2c4');
  },
  iride(r, s) {
    const n = G.ring, sl = G.slots;
    const a1 = n[(r.slot - 1 + sl) % sl], a2 = n[(r.slot + 1) % sl];
    let el = 'iride';
    if (a1 && a1.el !== 'iride') el = a1.el; else if (a2 && a2.el !== 'iride') el = a2.el;
    const col = EL[el].c;
    const t = nearest(G.p.x, G.p.y, 940);
    const a0 = t ? Math.atan2(t.y - r.wy, t.x - r.wx) : r.wa;
    for (let i = 0; i < s.count; i++) {
      const aa = a0 + (i - (s.count - 1) / 2) * .18;
      shoot({ x: r.wx, y: r.wy, vx: Math.cos(aa) * s.spd, vy: Math.sin(aa) * s.spd, r: s.size, dmg: s.dmg * (1 + .22 * r.res), el, c: col, pierce: 1, kind: 'orb', life: 2.2, homing: 1.6, trail: 1 });
    }
    AU.play('shoot');
  },

  /* ── forme evolute ──────────────────────────────────────── */
  cometa(r, s) {
    const t = nearest(G.p.x, G.p.y, 1000);
    const a0 = t ? Math.atan2(t.y - r.wy, t.x - r.wx) : r.wa;
    for (let i = 0; i < s.count; i++) {
      const a = a0 + (i - (s.count - 1) / 2) * .2;
      shoot({ x: r.wx, y: r.wy, vx: Math.cos(a) * s.spd, vy: Math.sin(a) * s.spd, r: s.size, dmg: s.dmg,
        el: 'fuoco', c: EL.fuoco.c, pierce: s.pierce, kind: 'orb', life: 2.6, homing: 3.2, trail: 1,
        scia: 1, splitKill: 3 });
    }
    AU.play('blast');
  },
  glaciale(r, s) {
    if (!r.st.orb || r.st.n !== s.count) { r.st.n = s.count; r.st.orb = []; for (let i = 0; i < s.count; i++) r.st.orb.push({ p: i / s.count * TAU }); }
  },
  fulgore(r, s) {
    const t = nearest(G.p.x, G.p.y, s.area * 1.6);
    if (!t) { r.cd = .16; return; }
    G.zones.push({ k: 'spark', x1: r.wx, y1: r.wy, x2: t.x, y2: t.y, t: 0, dur: .18, c: EL.fulmine.c });
    hitEnemy(t, s.dmg, { color: EL.fulmine.c, el: 'fulmine' });
    /* due catene che partono dallo stesso bersaglio: si sdoppia */
    chainFrom(t, s.dmg * .8, Math.ceil(s.count / 2), s.area);
    chainFrom(t, s.dmg * .8, Math.floor(s.count / 2), s.area);
    G.zones.push({ k: 'ring', x: t.x, y: t.y, r0: 6, r1: 90, t: 0, dur: .3, c: EL.fulmine.c });
    AU.play('blast');
  },
  mietitore(r, s) {
    const t = nearest(G.p.x, G.p.y, 900);
    const a0 = t ? Math.atan2(t.y - G.p.y, t.x - G.p.x) : r.wa;
    for (let i = 0; i < s.count; i++) {
      const a = a0 + i * (TAU / s.count);
      shoot({ x: G.p.x, y: G.p.y, vx: Math.cos(a) * s.spd, vy: Math.sin(a) * s.spd, r: s.size, dmg: s.dmg,
        el: 'vuoto', c: EL.vuoto.c, pierce: 99, kind: 'scythe', life: 4.2, spin: rand(11, 7),
        retime: 1.5, risucchio: 150, hitRate: .1 });
    }
    AU.play('shoot');
  },
  alba(r, s) {
    const a = r.st.a || 0;
    for (let k = 0; k < 2; k++) {
      const aa = a + k * PI;
      const x2 = G.p.x + Math.cos(aa) * s.area, y2 = G.p.y + Math.sin(aa) * s.area;
      G.zones.push({ k: 'beam', x1: G.p.x, y1: G.p.y, x2, y2, t: 0, dur: .1, c: EL.luce.c, w: 11 });
      const steps = Math.ceil(s.area / 44);
      for (let i = 1; i <= steps; i++) {
        const f = i / steps;
        areaHit(G.p.x + (x2 - G.p.x) * f, G.p.y + (y2 - G.p.y) * f, 34, s.dmg, { color: EL.luce.c, noCrit: nextRand() > .25, el: 'luce' });
      }
    }
  }
};

function updateRunes(dt) {
  const sl = G.slots;
  /* Rigel: chi corre spara più in fretta — la regola premia la sua identità */
  G.fireBoost = (G.char.rule === 'slancio' && Math.hypot(G.p.vx, G.p.vy) > 40) ? 1.18 : 1;
  G.ringRot += dt * (.42 * P.projMul);
  for (let i = 0; i < sl; i++) {
    const r = G.ring[i]; if (!r) continue;
    const a = G.ringRot + i / sl * TAU;
    r.wa = a; r.wx = G.p.x + Math.cos(a) * RING_R; r.wy = G.p.y + Math.sin(a) * RING_R;
    const s = runeStats(r);
    if (r.id === 'raggio' || r.id === 'alba') { r.st.a = (r.st.a || 0) + dt * s.spd; }
    if (r.id === 'cristallo' || r.id === 'glaciale') {
      const gelido = r.id === 'glaciale';
      FIRE[r.id](r, s);
      const orbR = s.area, sp = s.spd * P.projMul;
      for (const o of r.st.orb) {
        o.p += dt * sp;
        o.x = G.p.x + Math.cos(o.p + a) * orbR; o.y = G.p.y + Math.sin(o.p + a) * orbR;
        const list = GRID.near(o.x, o.y, s.size + 26, []);
        for (let n = 0; n < list.length; n++) {
          const e = list[n]; if (e.hp <= 0 || (e.cryCd || 0) > 0) continue;
          const dx = e.x - o.x, dy = e.y - o.y, rr = e.r + s.size;
          if (dx * dx + dy * dy < rr * rr) {
            e.cryCd = gelido ? .26 : .34;
            const m = Math.hypot(dx, dy) || 1;
            hitEnemy(e, s.dmg, { color: EL.gelo.c, kb: 170, kbx: dx / m, kby: dy / m, el: 'gelo' });
            if (gelido && !e.boss) e.froze = Math.max(e.froze, 1.1);   /* congela al tocco */
          }
        }
      }
      continue;
    }
    r.cd -= dt * G.fireBoost;
    if (r.cd <= 0) { r.cd += Math.max(.06, s.cd); FIRE[r.id](r, s); }
  }
}

/* ── proiettili del giocatore ───────────────────────────────── */
function updateBullets(dt) {
  const B = G.bullets;
  for (let i = B.length - 1; i >= 0; i--) {
    const b = B[i];
    b.t += dt; b.life -= dt;
    if (b.kind === 'scythe') {
      b.retime -= dt;
      if (b.retime <= 0) {
        const dx = G.p.x - b.x, dy = G.p.y - b.y, d = Math.hypot(dx, dy) || 1;
        const sp = 420;
        b.vx = lerp(b.vx, dx / d * sp, dt * 3.4); b.vy = lerp(b.vy, dy / d * sp, dt * 3.4);
        if (d < 26 && b.t > .8) { B.splice(i, 1); continue; }
      } else { b.vx *= (1 - dt * 1.2); b.vy *= (1 - dt * 1.2); }
      b.rot = (b.rot || 0) + dt * b.spin;
      b.hitCd = Math.max(0, (b.hitCd || 0) - dt);
    }
    if (b.homing) {
      const t = nearest(b.x, b.y, 340);
      if (t) {
        const a = Math.atan2(t.y - b.y, t.x - b.x), sp = Math.hypot(b.vx, b.vy);
        const ca = Math.atan2(b.vy, b.vx);
        let d = a - ca; while (d > PI) d -= TAU; while (d < -PI) d += TAU;
        const na = ca + clamp(d, -b.homing * dt, b.homing * dt);
        b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp;
      }
    }
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.ang !== undefined) b.ang = Math.atan2(b.vy, b.vx);
    if (b.trail && b.t % .04 < dt) addPart(b.x, b.y, crand(20, -20), crand(20, -20), .26, b.r * .7, b.c);
    /* Cometa: la scia brucia davvero, non è solo grafica */
    if (b.scia) {
      b.sciaT = (b.sciaT || 0) - dt;
      if (b.sciaT <= 0) {
        b.sciaT = .13;
        G.zones.push({ k: 'pool', x: b.x, y: b.y, r: b.r * 2.6, t: 0, dur: 1.5, dps: b.dmg * .5, tick: 0, c: EL.fuoco.c, el: 'fuoco' });
      }
    }
    /* Mietitore: le lame risucchiano lungo il cammino */
    if (b.risucchio) {
      const near = GRID.near(b.x, b.y, b.risucchio, []);
      for (let n = 0; n < near.length; n++) {
        const e = near[n]; if (e.hp <= 0 || e.boss) continue;
        const dx = b.x - e.x, dy = b.y - e.y, d = Math.hypot(dx, dy) || 1;
        if (d < b.risucchio) { const f = (1 - d / b.risucchio) * 210; e.x += dx / d * f * dt; e.y += dy / d * f * dt; }
      }
    }

    if (b.life <= 0 || Math.abs(b.x) > ARENA + 400 || Math.abs(b.y) > ARENA + 400) { B.splice(i, 1); continue; }

    const list = GRID.near(b.x, b.y, b.r + 34, []);
    for (let n = 0; n < list.length; n++) {
      const e = list[n]; if (e.hp <= 0) continue;
      const dx = e.x - b.x, dy = e.y - b.y, rr = e.r + b.r;
      if (dx * dx + dy * dy > rr * rr) continue;
      if (b.kind === 'scythe') { if (b.hitCd > 0) continue; b.hitCd = b.hitRate || .16; }
      else { if (!b.hitIds) b.hitIds = []; if (b.hitIds.indexOf(e) >= 0) continue; b.hitIds.push(e); }
      const m = Math.hypot(dx, dy) || 1;
      hitEnemy(e, b.dmg, { color: b.c, kb: 120, kbx: dx / m, kby: dy / m, el: b.el });
      /* Cometa: ogni uccisione frantuma la sfera in schegge nuove */
      if (b.splitKill && e.hp <= 0) {
        for (let k = 0; k < b.splitKill; k++) {
          const a = rand(TAU);
          shoot({ x: e.x, y: e.y, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, r: b.r * .5,
            dmg: b.dmg * .45, el: b.el, c: b.c, pierce: 0, kind: 'orb', life: .9, homing: 2, trail: 1 });
        }
      }
      if (b.split) {
        for (let k = 0; k < b.split; k++) {
          const a = rand(TAU);
          shoot({ x: b.x, y: b.y, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380, r: b.r * .62, dmg: b.dmg * .55, el: b.el, c: b.c, pierce: 0, kind: 'orb', life: .8 });
        }
        B.splice(i, 1); break;
      }
      if (b.kind !== 'scythe') {
        if (b.pierce > 0) b.pierce--;
        else { burstPart(b.x, b.y, 4, b.c, 140, 2.6, .26); B.splice(i, 1); break; }
      }
    }
  }
}

/* ── zone ed effetti persistenti ────────────────────────────── */
function updateZones(dt) {
  const Z = G.zones;
  for (let i = Z.length - 1; i >= 0; i--) {
    const z = Z[i]; z.t += dt;
    if (z.k === 'pool') {
      z.tick -= dt;
      if (z.tick <= 0) { z.tick = .26; areaHit(z.x, z.y, z.r, z.dps * .26, { color: z.c, noCrit: true, el: z.el }); }
      if (cchance(dt * 22)) addPart(z.x + crand(z.r, -z.r) * .8, z.y + crand(z.r, -z.r) * .8, 0, crand(-42, -12), .6, crand(4, 2), z.c);
    } else if (z.k === 'hole') {
      z.tick -= dt;
      GRID.near(z.x, z.y, z.r * 3.1, _q);
      for (let n = 0; n < _q.length; n++) {
        const e = _q[n]; if (e.hp <= 0 || e.boss) continue;
        const dx = z.x - e.x, dy = z.y - e.y, d = Math.hypot(dx, dy) || 1;
        if (d < z.r * 3.1) { const f = (1 - d / (z.r * 3.1)) * 300; e.x += dx / d * f * dt; e.y += dy / d * f * dt; }
      }
      if (z.tick <= 0) { z.tick = .24; areaHit(z.x, z.y, z.r, z.dps * .24, { color: z.c, noCrit: true, el: z.el }); }
      if (cchance(dt * 30)) {
        const a = rand(TAU), d = z.r * rand(3, 1.4);
        addPart(z.x + Math.cos(a) * d, z.y + Math.sin(a) * d, -Math.cos(a) * 130, -Math.sin(a) * 130, .5, rand(3, 1.4), z.c);
      }
    } else if (z.k === 'nova') {
      const f = z.t / z.dur, r = lerp(z.r0, z.r1, f < 1 ? Math.sqrt(f) : 1);
      const list = GRID.near(z.x, z.y, r + 40, []);
      for (let n = 0; n < list.length; n++) {
        const e = list[n]; if (e.hp <= 0 || z.hit.has(e)) continue;
        const dx = e.x - z.x, dy = e.y - z.y, d = Math.hypot(dx, dy);
        if (d < r + e.r) {
          z.hit.add(e);
          hitEnemy(e, z.dmg, { color: z.c, kb: z.kb, kbx: dx / (d || 1), kby: dy / (d || 1) });
        }
      }
      z.r = r;
    } else if (z.k === 'bolt') {
      if (!z.done && z.t > .16) { z.done = 1; areaHit(z.x, z.y, z.r, z.dmg, { color: z.c, el: 'fulmine' }); burstPart(z.x, z.y, 8, z.c, 190, 3, .35); }
    }
    if (z.t >= z.dur) Z.splice(i, 1);
  }
}

/* ── nemici ─────────────────────────────────────────────────── */
function bossAI(e, dt) {
  const d = e.boss, px = G.p.x, py = G.p.y;
  const dx = px - e.x, dy = py - e.y, dd = Math.hypot(dx, dy) || 1;
  const hpf = e.hp / e.maxHp;
  e.atk -= dt; e.atk2 -= dt;

  if (d.pat === 'charge' || (d.pat === 'final' && hpf < .4)) {
    if (e.charge > 0) {
      e.charge -= dt;
      if (e.charge > .5) { e.vx = 0; e.vy = 0; e.tell = 1; }
      else { e.tell = 0; e.vx = Math.cos(e.cdir) * 780; e.vy = Math.sin(e.cdir) * 780; }
      e.x += e.vx * dt; e.y += e.vy * dt;
      if (cchance(dt * 40)) burstPart(e.x, e.y, 2, d.c, 120, 4, .4);
      /* si schianta contro il muro invece di uscire dall'arena */
      const w = ARENA - e.r;
      if (Math.abs(e.x) >= w || Math.abs(e.y) >= w) {
        e.charge = 0; e.vx = e.vy = 0; G.shake = Math.max(G.shake, 14);
        burstPart(e.x, e.y, 22, d.c, 320, 5, .7); AU.play('blast');
      }
      return;
    }
    if (e.atk <= 0) { e.atk = 3.2; e.charge = 1.3; e.cdir = Math.atan2(dy, dx); return; }
  }
  if (d.pat === 'radial' || d.pat === 'mix' || d.pat === 'final') {
    if (e.atk <= 0) {
      e.atk = d.pat === 'final' ? 2.1 : 3.0;
      const n = d.pat === 'final' ? 22 : 15, off = rand(TAU);
      for (let i = 0; i < n; i++) {
        const a = off + i / n * TAU;
        eShoot(e.x, e.y, Math.cos(a) * 220, Math.sin(a) * 220, d.dmg * .55, 8, d.c);
      }
      AU.play('blast');
    }
  }
  if (d.pat === 'summon' || d.pat === 'mix' || d.pat === 'final') {
    if (e.atk2 <= 0) {
      e.atk2 = d.pat === 'summon' ? 6.5 : 9;
      const n = d.pat === 'final' ? 8 : 5;
      for (let i = 0; i < n; i++) {
        const a = rand(TAU), r = 110;
        spawnEnemy(d.pat === 'summon' ? 'sciamante' : 'spettro', e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, { spdMul: 1.1 });
      }
      G.zones.push({ k: 'ring', x: e.x, y: e.y, r0: 20, r1: 170, t: 0, dur: .4, c: d.c });
    }
  }
  if (d.pat === 'final' && hpf < .7 && chance(dt * 2.4)) {
    const a = Math.atan2(dy, dx) + rand(.5, -.5);
    eShoot(e.x, e.y, Math.cos(a) * 300, Math.sin(a) * 300, d.dmg * .5, 9, d.c);
  }
  /* Elastico: più il guardiano resta indietro, più accelera. Senza questo
     un boss più lento del giocatore non lo raggiunge mai e la battaglia
     non avviene: resta a bordo mappa e sembra parcheggiato in un angolo. */
  const rincorsa = 1 + clamp((dd - 450) / 780, 0, 2.0);
  const sp = e.spd * (1 - e.slow) * (hpf < .35 ? 1.25 : 1) * rincorsa;
  e.vx = dx / dd * sp; e.vy = dy / dd * sp;
  e.x += e.vx * dt; e.y += e.vy * dt;
  e.rush = rincorsa;
}

function updateEnemies(dt) {
  const E = G.enemies, px = G.p.x, py = G.p.y;
  for (let i = E.length - 1; i >= 0; i--) {
    const e = E[i];
    if (e.hp <= 0) { E.splice(i, 1); continue; }
    if (e.flash > 0) e.flash -= dt;
    if (e.cryCd > 0) e.cryCd -= dt;
    if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slow = 0; }
    if (e.froze > 0) e.froze -= dt;
    if (e.burnT > 0) {
      e.burnT -= dt; e.burnAcc = (e.burnAcc || 0) + dt;
      if (e.burnAcc > .3) {
        e.burnAcc = 0; G.dmgDone += Math.max(0, Math.min(e.burn * .3, e.hp)); e.hp -= e.burn * .3;
        addPart(e.x + rand(10, -10), e.y, 0, -40, .4, 2.4, EL.fuoco.c);
        if (e.hp <= 0) { killEnemy(e); continue; }
      }
    }
    if (e.kb > 0) { e.kb -= dt; e.x += e.kbx * e.kb * 14; e.y += e.kby * e.kb * 14; }

    if (e.boss) { bossAI(e, dt); }
    else if (e.froze > 0) { /* congelato */ }
    else {
      const dx = px - e.x, dy = py - e.y, d = Math.hypot(dx, dy) || 1;
      let sp = e.spd * (1 - e.slow);
      const md = MOBS[e.type];
      if (md && md.ranged) {
        e.atk -= dt;
        if (d < 460 && e.atk <= 0) {
          e.atk = md.ranged.cd;
          const a0 = Math.atan2(dy, dx), n = md.ranged.n || 1;
          for (let k = 0; k < n; k++) {
            const a = a0 + (k - (n - 1) / 2) * (md.ranged.spread || 0);
            eShoot(e.x, e.y, Math.cos(a) * md.ranged.spd, Math.sin(a) * md.ranged.spd, md.ranged.dmg * (1 + G.t / 60 * .08), 6, e.c);
          }
        }
        if (d < 300) sp *= -.55;
      }
      if (e.type === 'spettro') {
        e.ph += dt * 3;
        sp *= 1 + Math.sin(e.ph) * .55;
      }
      e.vx = dx / d * sp; e.vy = dy / d * sp;
      e.x += e.vx * dt; e.y += e.vy * dt;
    }

    /* separazione morbida */
    if (!e.boss) {
      GRID.near(e.x, e.y, e.r * 2.1, _q);
      let sx = 0, sy = 0, c = 0;
      for (let n = 0; n < _q.length && c < 5; n++) {
        const o = _q[n]; if (o === e || o.hp <= 0) continue;
        const dx = e.x - o.x, dy = e.y - o.y, rr = e.r + o.r;
        const d2 = dx * dx + dy * dy;
        if (d2 < rr * rr && d2 > .01) { const d = Math.sqrt(d2); sx += dx / d; sy += dy / d; c++; }
      }
      if (c) { e.x += sx / c * 42 * dt * e.r * .1; e.y += sy / c * 42 * dt * e.r * .1; }
    }

    /* nessuno esce dai confini: la telecamera è agganciata all'arena, quindi
       un nemico oltre il muro sembrerebbe sparito dalla mappa. */
    const lim = ARENA - e.r;
    e.x = clamp(e.x, -lim, lim); e.y = clamp(e.y, -lim, lim);
    if (!e.boss) scostaDaRocce(e, e.r);   /* i guardiani sfondano gli asteroidi */

    /* contatto */
    const dx = px - e.x, dy = py - e.y, rr = e.r + G.p.r;
    if (dx * dx + dy * dy < rr * rr) hurtPlayer(e.dmg);
  }
}

function updateEBullets(dt) {
  const B = G.ebul;
  for (let i = B.length - 1; i >= 0; i--) {
    const b = B[i]; b.t += dt; b.life -= dt;
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.life <= 0 || Math.abs(b.x) > ARENA + 500 || Math.abs(b.y) > ARENA + 500) { B.splice(i, 1); continue; }
    /* la roccia è riparo: assorbe i colpi nemici */
    if (dentroRoccia(b.x, b.y, b.r)) { burstPart(b.x, b.y, 4, b.c, 120, 2.6, .3); B.splice(i, 1); continue; }
    const dx = G.p.x - b.x, dy = G.p.y - b.y, rr = b.r + G.p.r * .8;
    if (dx * dx + dy * dy < rr * rr) { hurtPlayer(b.dmg); B.splice(i, 1); }
  }
}

/* ── raccolta ───────────────────────────────────────────────── */
function updateGems(dt) {
  const g = G.gems, px = G.p.x, py = G.p.y, pr = P.pickR;
  /* chi scappa lascia dietro centinaia di gemme: le più lontane si fondono.
     Nessuna esperienza va persa, ma il numero di oggetti resta sotto controllo. */
  G.gemT -= dt;
  if (G.gemT <= 0) {
    G.gemT = 1.2;
    if (g.length > 220) {
      g.sort((a, b) => ((b.x - px) * (b.x - px) + (b.y - py) * (b.y - py)) - ((a.x - px) * (a.x - px) + (a.y - py) * (a.y - py)));
      const far = g.splice(0, Math.min(110, g.length - 150));
      for (let kind = 0; kind < 2; kind++) {
        let v = 0, sx = 0, sy = 0, n = 0;
        for (let i = 0; i < far.length; i++) if (far[i].k === kind) { v += far[i].v; sx += far[i].x; sy += far[i].y; n++; }
        if (n) g.push({ x: sx / n, y: sy / n, v, k: kind, t: 1, vx: 0, vy: 0, big: 1 });
      }
    }
  }
  for (let i = g.length - 1; i >= 0; i--) {
    const m = g[i]; m.t += dt;
    if (m.t < .4) { m.x += m.vx * dt; m.y += m.vy * dt; m.vx *= (1 - dt * 5); m.vy *= (1 - dt * 5); }
    const dx = px - m.x, dy = py - m.y, d = Math.hypot(dx, dy) || 1;
    if (d < pr || m.pull) {
      m.pull = 1;
      const sp = Math.min(900, 260 + (pr - d) * 4.5);
      m.x += dx / d * sp * dt; m.y += dy / d * sp * dt;
      if (d < 22) {
        g.splice(i, 1);
        if (m.k === 1) { G.shards += m.v; }
        else { gainXP(m.v); }
        AU.play('pick');
        addPart(px, py, 0, 0, .3, 6, m.k === 1 ? '#ffc857' : '#6ff2c4');
      }
    }
  }
  const D = G.drops;
  for (let i = D.length - 1; i >= 0; i--) {
    const d0 = D[i]; d0.t += dt;
    const dx = px - d0.x, dy = py - d0.y;
    if (dx * dx + dy * dy < 40 * 40) {
      D.splice(i, 1);
      if (d0.k === 'chest') { G.pending++; UI.toast('SCRIGNO', 'Potenziamento in arrivo', '#ffc857'); }
      else if (d0.k === 'cuore') { P.hp = Math.min(P.maxHp, P.hp + P.maxHp * .3); addFloat(px, py - 30, '+VITA', '#6ff2c4', true); }
      else if (d0.k === 'bomba') {
        G.zones.push({ k: 'ring', x: px, y: py, r0: 10, r1: 900, t: 0, dur: .6, c: '#fff' });
        G.shake = 20; AU.play('blast');
        for (const e of G.enemies) if (!e.boss) hitEnemy(e, 99999, { noCrit: true });
        addFloat(px, py - 30, 'ANNICHILIMENTO', '#fff', true);
      }
      AU.play('buy');
    }
  }
}

function gainXP(v) {
  G.xp += v * P.xpMul;
  while (G.xp >= G.xpNeed) {
    G.xp -= G.xpNeed; G.level++; G.xpNeed = xpFor(G.level); G.pending++;
    G.zones.push({ k: 'ring', x: G.p.x, y: G.p.y, r0: 10, r1: 190, t: 0, dur: .5, c: '#6ff2c4' });
  }
}

/* ── particelle ─────────────────────────────────────────────── */
function updateParts(dt) {
  const p = G.parts;
  for (let i = p.length - 1; i >= 0; i--) {
    const a = p[i]; a.life -= dt;
    if (a.life <= 0) { p.splice(i, 1); continue; }
    a.x += a.vx * dt; a.y += a.vy * dt;
    a.vx *= (1 - dt * 2.2); a.vy *= (1 - dt * 2.2);
  }
  const f = G.floats;
  for (let i = f.length - 1; i >= 0; i--) {
    const a = f[i]; a.t += dt; a.y -= dt * 38;
    if (a.t > .82) f.splice(i, 1);
  }
}

/* ── generazione ────────────────────────────────────────────── */
function currentPool() {
  let p = WAVES[0].pool;
  for (const w of WAVES) if (G.t >= w.t) p = w.pool;
  return p;
}
function spawnRing(type, opts) {
  /* i nemici compaiono fuori campo. Contro un muro non basta schiacciare la posizione
     dentro l'arena — comparirebbero addosso: si riprova l'angolo, poi si ripiega
     verso il centro, che a questa distanza cade sempre dentro i confini. */
  const d = Math.max(520, Math.hypot(W, H) * .5) + rand(180, 60);
  let x = 0, y = 0, ok = false;
  for (let i = 0; i < 12 && !ok; i++) {
    const a = rand(TAU);
    x = G.p.x + Math.cos(a) * d; y = G.p.y + Math.sin(a) * d;
    ok = Math.abs(x) <= ARENA && Math.abs(y) <= ARENA;
  }
  if (!ok) {
    const a = Math.atan2(-G.p.y, -G.p.x) + rand(1.1, -1.1);
    x = clamp(G.p.x + Math.cos(a) * d, -ARENA, ARENA);
    y = clamp(G.p.y + Math.sin(a) * d, -ARENA, ARENA);
  }
  return spawnEnemy(type, x, y, opts);
}
/* ── terreno ───────────────────────────────────────────────────
   Prima ogni punto dell'arena valeva esattamente quanto ogni altro, ed è
   per questo che muoversi era meccanico. Gli asteroidi fermano te e i
   nemici e assorbono i colpi nemici — sono riparo. I tuoi proiettili
   passano sopra: bloccarli punirebbe un attacco che è automatico.      */
function genRocks() {
  G.rocks.length = 0;
  const n = 40;
  for (let i = 0; i < n * 8 && G.rocks.length < n; i++) {
    const r = rand(126, 54);
    const x = rand(ARENA - r - 120, -ARENA + r + 120);
    const y = rand(ARENA - r - 120, -ARENA + r + 120);
    if (x * x + y * y < 460 * 460) continue;          /* mai addosso alla partenza */
    let libero = true;
    for (const k of G.rocks) {
      const dd = Math.hypot(k.x - x, k.y - y);
      if (dd < k.r + r + 130) { libero = false; break; }
    }
    if (!libero) continue;
    const m = 7 + (nextRand() * 4 | 0), pts = [];
    for (let a = 0; a < m; a++) pts.push(rand(1.14, .82));
    G.rocks.push({ x, y, r, m, pts, rot: rand(TAU) });
  }
}
/* spinge un corpo fuori dagli asteroidi */
function scostaDaRocce(o, raggio) {
  for (let i = 0; i < G.rocks.length; i++) {
    const k = G.rocks[i];
    const dx = o.x - k.x, dy = o.y - k.y;
    const min = k.r + raggio;
    const d2 = dx * dx + dy * dy;
    if (d2 < min * min && d2 > .01) {
      const d = Math.sqrt(d2);
      o.x = k.x + dx / d * min; o.y = k.y + dy / d * min;
    }
  }
}
function dentroRoccia(x, y, raggio) {
  for (let i = 0; i < G.rocks.length; i++) {
    const k = G.rocks[i], dx = x - k.x, dy = y - k.y, min = k.r + (raggio || 0);
    if (dx * dx + dy * dy < min * min) return k;
  }
  return null;
}

/* ── eventi d'arena ────────────────────────────────────────────
   Ogni novanta secondi succede qualcosa che HA UN LUOGO. Senza, i minuti
   centrali sono una salita monotona in uno spazio identico ovunque: non
   c'è mai un posto dove valga la pena andare.                          */
const EVENTI = ['breccia', 'marea', 'caccia'];

function apriEvento() {
  const k = pick(EVENTI);
  if (k === 'breccia') {
    /* lontano abbastanza da essere una scelta, non un passo */
    const a = rand(TAU), d = rand(1000, 620);
    let x = clamp(G.p.x + Math.cos(a) * d, -ARENA + 160, ARENA - 160);
    let y = clamp(G.p.y + Math.sin(a) * d, -ARENA + 160, ARENA - 160);
    /* una breccia dentro un asteroide sarebbe irraggiungibile */
    const roc = dentroRoccia(x, y, 90);
    if (roc) { const a2 = Math.atan2(y - roc.y, x - roc.x); x = roc.x + Math.cos(a2) * (roc.r + 130); y = roc.y + Math.sin(a2) * (roc.r + 130); }
    x = clamp(x, -ARENA + 90, ARENA - 90); y = clamp(y, -ARENA + 90, ARENA - 90);
    G.ev = { k, x, y, t: 0, dur: 22, r: 74, preso: 0 };
    for (let i = 0; i < 3; i++) spawnEnemy(pick(currentPool()), x + rand(150, -150), y + rand(150, -150), { elite: i === 0, rMul: i === 0 ? 1.5 : 1 });
    UI.toast('BRECCIA', 'Raggiungila prima che si chiuda', '#b06bff');
  } else if (k === 'marea') {
    G.ev = { k, t: 0, dur: 18, a: rand(TAU), acc: 0 };
    UI.toast('MAREA', 'Ondata da una sola direzione', '#45d7ff');
  } else {
    const a = rand(TAU), d = 420;
    const e = spawnEnemy('spettro', G.p.x + Math.cos(a) * d, G.p.y + Math.sin(a) * d, { hpMul: 7, spdMul: 1.5, xpMul: 8 });
    e.c = '#6ff2c4'; e.corriere = 1;
    G.ev = { k, t: 0, dur: 26, e };
    UI.toast('CORRIERE', 'Abbattilo prima che sparisca', '#6ff2c4');
  }
  AU.play('awake');
}

function updateEventi(dt) {
  if (!G.ev) {
    G.evT -= dt;
    if (G.evT <= 0 && G.t > 55 && !G.boss) { G.evT = rand(105, 80); apriEvento(); }
    return;
  }
  const v = G.ev; v.t += dt;

  if (v.k === 'breccia') {
    const dx = G.p.x - v.x, dy = G.p.y - v.y;
    if (!v.preso && dx * dx + dy * dy < v.r * v.r) {
      v.preso = 1;
      if (G.asc.noChest) { addGem(v.x, v.y, 220, 1); }
      else for (let i = 0; i < 2; i++) G.drops.push({ x: v.x + rand(50, -50), y: v.y + rand(50, -50), k: 'chest', t: 0 });
      addGem(v.x, v.y, 120, 1);
      G.zones.push({ k: 'ring', x: v.x, y: v.y, r0: 10, r1: 460, t: 0, dur: .7, c: '#b06bff' });
      UI.toast('BRECCIA APERTA', 'Ricompensa raccolta', '#b06bff');
      AU.play('buy'); G.shake = Math.max(G.shake, 10);
      G.ev = null; return;
    }
  } else if (v.k === 'marea') {
    v.acc += dt * 9;
    while (v.acc >= 1) {
      v.acc -= 1;
      if (G.enemies.length < 260) {
        const a = v.a + rand(.5, -.5), d = Math.max(560, Math.hypot(W, H) * .55);
        spawnEnemy(pick(currentPool()),
          clamp(G.p.x + Math.cos(a) * d, -ARENA, ARENA),
          clamp(G.p.y + Math.sin(a) * d, -ARENA, ARENA), { spdMul: 1.15 });
      }
    }
  } else if (v.k === 'caccia') {
    const e = v.e;
    if (!e || e.hp <= 0) {
      if (!G.asc.noChest) G.drops.push({ x: e ? e.x : G.p.x, y: e ? e.y : G.p.y, k: 'chest', t: 0 });
      addGem(e ? e.x : G.p.x, e ? e.y : G.p.y, 160, 1);
      UI.toast('CORRIERE ABBATTUTO', 'Bottino recuperato', '#6ff2c4');
      AU.play('buy'); G.ev = null; return;
    }
    /* Fugge, ma al guinzaglio: se lo lasci scappare libero si incastra in un
       angolo a 1800px e la caccia diventa impossibile. Sotto i 420 scappa,
       oltre gli 820 torna a farsi vedere: resta sempre raggiungibile. */
    const dx = e.x - G.p.x, dy = e.y - G.p.y, d = Math.hypot(dx, dy) || 1;
    if (d < 420) { e.x += dx / d * 205 * dt; e.y += dy / d * 205 * dt; }
    else if (d > 820) { e.x -= dx / d * 150 * dt; e.y -= dy / d * 150 * dt; }
    e.x = clamp(e.x, -ARENA + e.r, ARENA - e.r); e.y = clamp(e.y, -ARENA + e.r, ARENA - e.r);
    if (cchance(dt * 26)) addPart(e.x, e.y, crand(40, -40), crand(40, -40), .5, 3, '#6ff2c4');
  }

  if (v.t >= v.dur) {
    if (v.k === 'caccia' && v.e && v.e.hp > 0) { v.e.hp = 0; v.e.dead = true; }
    if (v.k === 'breccia' && !v.preso) UI.toast('BRECCIA CHIUSA', null, '#6a6199');
    G.ev = null;
  }
}

function updateSpawns(dt) {
  /* la pressione cresce nel tempo: né un vuoto iniziale né un muro al 4° minuto */
  const cap = (W < 700 ? 165 : 245);
  const maxE = Math.round(cap * clamp(.42 + G.t / 900 + G.diff, .42, 1));
  /* apertura tranquilla (impari a muoverti), pressione vera dal sesto minuto */
  const rate = Math.min(13, (.8 + G.t / 26 + G.diff * 2.4) * G.asc.rate);
  G.spawnAcc += dt * rate;
  const pool = currentPool();
  while (G.spawnAcc >= 1) {
    G.spawnAcc -= 1;
    if (G.enemies.length < maxE) spawnRing(pick(pool));
  }
  G.eliteT -= dt;
  if (G.eliteT <= 0) {
    G.eliteT = Math.max(44, 70 - G.t / 45);   /* gli scrigni erano la fonte dominante di potenziamenti */
    const e = spawnRing(pick(pool), { elite: true, rMul: 1.55, spdMul: .88 });
    if (e) { e.c = '#ffc857'; }
  }
  if (G.bossIdx < BOSSES.length && G.t >= Math.max(45, BOSSES[G.bossIdx].t + G.asc.boss)) {
    const def = BOSSES[G.bossIdx];
    spawnBoss(def);
    /* in coppia dal terzo guardiano: il gemello è più fragile, ma raddoppia
       le cose da schivare contemporaneamente */
    if (G.asc.twin && G.bossIdx >= 2) {
      const g = spawnBoss(def);
      g.hp = g.maxHp = g.maxHp * .55; g.r *= .82;
    }
    G.bossIdx++;
  }
  if (G.t > RUN_LEN && !G.victory) { G.diff += dt * .006; }
}

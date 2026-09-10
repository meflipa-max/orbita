/* ═══════════════════════════════════════════════════════════════
   ORBITA — rendering.
   ═══════════════════════════════════════════════════════════════ */

const RPATH = {};
function runePaths(id) {
  let p = RPATH[id];
  if (!p) { p = (ICO[id] || 'M4 12h16').split('|').map(d => new Path2D(d)); RPATH[id] = p; }
  return p;
}

/* campo stellare: tre strati pre-renderizzati, ripetuti con parallasse */
const STAR_TS = 1024;
const starLayers = [];
/* Le stelle erano bianco-azzurre, cioè quasi il colore delle gemme di
   esperienza: due puntini della stessa tinta e della stessa taglia, uno
   da raccogliere e uno no. La cura non è la forma, è la TINTA: il cielo
   passa sui caldi (bianco, ambra, rosa) e lascia il verde-menta alle
   gemme, che restano l'unica cosa fredda e piccola dello schermo. */
function buildStars() {
  starLayers.length = 0;
  const cfg = [
    { n: 170, s: 1, a: .34, p: .10, big: 0 },
    { n: 95, s: 1.5, a: .50, p: .26, big: 0 },
    { n: 34, s: 2.2, a: .78, p: .46, big: 1 }
  ];
  for (const c of cfg) {
    const cn = document.createElement('canvas'); cn.width = cn.height = STAR_TS;
    const g = cn.getContext('2d');
    for (let i = 0; i < c.n; i++) {
      const x = Math.round(Math.random() * STAR_TS), y = Math.round(Math.random() * STAR_TS);
      const tint = Math.random();
      const col = tint > .88 ? '255,204,214' : tint > .68 ? '255,226,186' : '255,248,240';
      /* alone morbido solo per le più vicine: dà profondità senza sporcare */
      if (c.big && tint > .55) {
        const gr = g.createRadialGradient(x + c.s / 2, y + c.s / 2, 0, x + c.s / 2, y + c.s / 2, 9);
        gr.addColorStop(0, 'rgba(' + col + ',.30)');
        gr.addColorStop(1, 'rgba(' + col + ',0)');
        g.fillStyle = gr; g.fillRect(x - 9, y - 9, 20, 20);
      }
      g.fillStyle = 'rgba(' + col + ',' + c.a + ')';
      g.fillRect(x, y, c.s, c.s);
      /* croce di diffrazione sulle più luminose: le fa leggere come stelle
         e non come pallini, che è esattamente la differenza che serviva */
      if (c.big && tint > .74) {
        g.globalAlpha = .34;
        g.fillRect(x - 3, y + (c.s - 1) / 2, c.s + 6, 1);
        g.fillRect(x + (c.s - 1) / 2, y - 3, 1, c.s + 6);
        g.globalAlpha = 1;
      }
    }
    starLayers.push({ cn, p: c.p });
  }
}

const NEB = [
  { x: -900, y: -700, r: 1100, c: '#3b1c6e' }, { x: 1000, y: 500, r: 1300, c: '#0d3a55' },
  { x: 300, y: -1400, r: 900, c: '#5a1840' }, { x: -1200, y: 1100, r: 1000, c: '#123a2e' }
];

function drawBG(cx, cy) {
  ctx.fillStyle = '#070613'; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  for (const n of NEB) {
    const z = G.zoom, nr = n.r * z;
    const sx = (n.x - cx) * z + W / 2, sy = (n.y - cy) * z + H / 2;
    if (sx < -nr || sx > W + nr || sy < -nr || sy > H + nr) continue;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, nr);
    g.addColorStop(0, rgba(n.c, .34)); g.addColorStop(.55, rgba(n.c, .11)); g.addColorStop(1, rgba(n.c, 0));
    ctx.fillStyle = g; ctx.fillRect(sx - nr, sy - nr, nr * 2, nr * 2);
  }
  ctx.globalCompositeOperation = 'source-over';
  /* respiro lento e sfasato per strato: il cielo vive, e il ritmo è
     diverso da quello delle gemme, che pulsano molto più in fretta */
  for (let i = 0; i < starLayers.length; i++) {
    const L = starLayers[i];
    ctx.globalAlpha = .84 + Math.sin(G.t * (.22 + i * .09) + i * 2.1) * .13;
    let ox = (-cx * L.p * G.zoom) % STAR_TS; if (ox > 0) ox -= STAR_TS;
    let oy = (-cy * L.p * G.zoom) % STAR_TS; if (oy > 0) oy -= STAR_TS;
    for (let x = ox; x < W; x += STAR_TS) for (let y = oy; y < H; y += STAR_TS) ctx.drawImage(L.cn, x | 0, y | 0);
  }
  ctx.globalAlpha = 1;
}

/* Il suolo. Senza un riferimento fisso nel mondo si vola in un nero uniforme:
   non capisci in che direzione stai andando e viene il mal di mare. Le stelle
   non bastano perché scorrono in parallasse, cioè quasi ferme. Questa trama
   sta a distanza 1:1 e scorre esattamente come ti muovi. */
const FLOOR_TS = 420;
let floorTile = null;
function buildFloor() {
  const c = document.createElement('canvas');
  c.width = c.height = FLOOR_TS;
  const g = c.getContext('2d');
  /* reticolo fine: la maglia stretta dà la velocità, quella larga la direzione */
  g.strokeStyle = 'rgba(126,110,205,.075)'; g.lineWidth = 1;
  g.beginPath();
  for (let i = 1; i < 4; i++) {
    const p = Math.round(FLOOR_TS / 4 * i) + .5;
    g.moveTo(p, 0); g.lineTo(p, FLOOR_TS); g.moveTo(0, p); g.lineTo(FLOOR_TS, p);
  }
  g.stroke();
  g.strokeStyle = 'rgba(150,132,240,.17)'; g.lineWidth = 1.2;
  g.strokeRect(.5, .5, FLOOR_TS - 1, FLOOR_TS - 1);
  /* pulviscolo: i granelli sono ciò che l'occhio usa davvero per la velocità */
  for (let i = 0; i < 46; i++) {
    const x = Math.random() * FLOOR_TS, y = Math.random() * FLOOR_TS;
    const s = Math.random() < .18 ? 2.4 : 1.2;
    g.fillStyle = Math.random() < .25 ? 'rgba(180,205,255,.30)' : 'rgba(150,135,225,.22)';
    g.fillRect(x, y, s, s);
  }
  /* qualche segno più grande: punti di riferimento riconoscibili */
  g.strokeStyle = 'rgba(150,132,240,.16)'; g.lineWidth = 1.4;
  for (let i = 0; i < 3; i++) {
    const x = Math.random() * FLOOR_TS, y = Math.random() * FLOOR_TS, r = 5 + Math.random() * 7;
    g.beginPath(); g.moveTo(x - r, y); g.lineTo(x + r, y); g.moveTo(x, y - r); g.lineTo(x, y + r); g.stroke();
  }
  floorTile = c;
}

function drawSuolo() {
  if (!floorTile) buildFloor();
  const x0 = Math.floor((G.cam.x - G.vw / 2) / FLOOR_TS) * FLOOR_TS;
  const y0 = Math.floor((G.cam.y - G.vh / 2) / FLOOR_TS) * FLOOR_TS;
  const x1 = G.cam.x + G.vw / 2, y1 = G.cam.y + G.vh / 2;
  for (let x = x0; x < x1; x += FLOOR_TS)
    for (let y = y0; y < y1; y += FLOOR_TS) ctx.drawImage(floorTile, x, y);
  ctx.strokeStyle = 'rgba(255,61,110,.42)'; ctx.lineWidth = 3;
  ctx.strokeRect(-ARENA, -ARENA, ARENA * 2, ARENA * 2);
  ctx.strokeStyle = 'rgba(255,61,110,.10)'; ctx.lineWidth = 22;
  ctx.strokeRect(-ARENA - 11, -ARENA - 11, ARENA * 2 + 22, ARENA * 2 + 22);
}

/* Gli asteroidi si disegnano DOPO le zone a terra, e la ragione e' una sola:
   la Singolarita' e' un disco nero pieno, e disegnata sopra copriva le rocce
   che stanno sotto. Ci si muoveva dentro un buco nero convinti che fosse
   spazio libero e ci si sbatteva contro un masso invisibile. Quello che ti
   ferma sta sopra a quello che non ti ferma: sempre. */
function drawRocce() {
  /* asteroidi: corpo scuro e bordo illuminato, così leggono come solidi
     e non come un altro effetto luminoso in mezzo agli altri */
  const cx = G.cam.x, cy = G.cam.y, mw = G.vw / 2 + 180, mh = G.vh / 2 + 180;
  /* Un solo Nodo per volta porta la scritta: il più vicino, e solo se sei
     abbastanza vicino da doverci decidere qualcosa. Stessa regola dei doni
     a terra — dieci etichette a schermo diventano loro il rumore. */
  let nodoVicino = null, nvd = 1e18;
  for (let i = 0; i < G.rocks.length; i++) {
    const k = G.rocks[i]; if (!k.nodo) continue;
    const q = (k.x - G.p.x) * (k.x - G.p.x) + (k.y - G.p.y) * (k.y - G.p.y);
    if (q < nvd && q < (k.aura + 260) * (k.aura + 260)) { nvd = q; nodoVicino = k; }
  }
  for (let i = 0; i < G.rocks.length; i++) {
    const k = G.rocks[i];
    if (Math.abs(k.x - cx) > mw || Math.abs(k.y - cy) > mh) continue;
    const col = k.nodo ? EL[k.nodo].c : null;
    /* Aura del Nodo. Prima si accendeva uguale per tutti, quindi «si
       illumina» non voleva dire niente e si leggeva come «sto raccogliendo
       un potenziamento» — che e' il modo in cui un giocatore nuovo capisce
       una luce addosso al suo personaggio. Adesso il Nodo si accende solo
       se e' sintonizzato su un elemento che stai DAVVERO giocando: quello
       che brilla e' quello che ti serve. E siccome l'anello cambia durante
       la partita, un Nodo spento puo' accendersi al minuto sei quando
       peschi la runa giusta — cioe' l'arena reagisce alla tua build sotto
       i tuoi occhi, che e' il modo migliore di spiegare la regola. */
    const utile = k.nodo ? G.elAnello.has(k.nodo) : false;
    if (k.nodo) {
      const dentro = G.nodoK === k;
      const pul = 1 + Math.sin(G.t * (dentro ? 3.4 : 1.5)) * (dentro ? .035 : .015);
      /* spento: nessun alone, solo un anello sottile e tratteggiato che
         dice «c'e' un confine qui», senza promettere niente */
      if (utile) {
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(k.x, k.y, k.r * .8, k.x, k.y, k.aura * pul);
        g.addColorStop(0, rgba(col, dentro ? .17 : .05));
        g.addColorStop(.72, rgba(col, dentro ? .09 : .028));
        g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(k.x, k.y, k.aura * pul, 0, TAU); ctx.fill();
      } else ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba(col, utile ? (dentro ? .62 : .22) : .12);
      ctx.lineWidth = utile && dentro ? 2.4 : 1;
      ctx.setLineDash(utile && dentro ? [] : [9, 11]);
      ctx.save(); ctx.translate(k.x, k.y); ctx.rotate(G.t * .2);
      ctx.beginPath(); ctx.arc(0, 0, k.aura * pul, 0, TAU); ctx.stroke();
      ctx.restore(); ctx.setLineDash([]);
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.save(); ctx.translate(k.x, k.y); ctx.rotate(k.rot);
    ctx.beginPath();
    for (let j = 0; j < k.m; j++) {
      const a = j / k.m * TAU, rr = k.r * k.pts[j];
      if (j) ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = k.nodo ? rgba(col, .12) : 'rgba(13,10,30,.96)';
    if (k.nodo) { ctx.fillStyle = 'rgba(13,10,30,.94)'; ctx.fill(); ctx.fillStyle = rgba(col, utile ? .16 : .05); }
    ctx.fill();
    ctx.strokeStyle = k.nodo ? rgba(col, utile ? .8 : .32) : 'rgba(132,118,206,.5)';
    ctx.lineWidth = k.nodo ? 2.6 : 2; ctx.stroke();
    ctx.strokeStyle = k.nodo ? rgba(col, utile ? .34 : .14) : 'rgba(196,182,255,.16)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let j = 0; j < k.m; j++) {
      const a = j / k.m * TAU, rr = k.r * k.pts[j] * .72;
      if (j) ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.stroke();
    /* cuore del cristallo: raggi verso i vertici, si legge come formazione viva */
    if (k.nodo) {
      ctx.strokeStyle = rgba(col, .5); ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let j = 0; j < k.m; j += 2) {
        const a = j / k.m * TAU, rr = k.r * k.pts[j] * .68;
        ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.stroke();
      /* il cuore acceso e' riservato ai Nodi che ti servono */
      if (utile) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(glowTex(col, 40), -k.r * .5, -k.r * .5, k.r, k.r);
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    ctx.restore();

    /* La scritta. Un cristallo che brilla, da solo, un giocatore nuovo lo
       legge come «bottino»: la parola dice che è TERRENO, e dice cosa
       cambia. Quando il Nodo non è del tuo elemento dice anche perché è
       spento — che è l'unica informazione utile in quel momento. */
    if (k === nodoVicino) {
      const dentro = G.nodoK === k;
      const titolo = 'NODO DI ' + EL[k.nodo].n.toUpperCase();
      const nome = EL[k.nodo].n.toLowerCase();
      /* Quante rune di questo elemento hai davvero. Serve a non promettere
         la metà del bonus che non sta ancora funzionando: con una runa
         sola il +35% si applica eccome — è il 35% di tutto il tuo danno —
         ma «catena +1» non fa niente, perché una catena di uno più uno fa
         due e il Risveglio ne vuole tre. Scriverlo lo stesso è una bugia
         piccola, e questo è il cartello che deve insegnare la regola. */
      let mie = 0;
      for (let q = 0; q < G.slots; q++) if (G.ring[q] && G.ring[q].el === k.nodo) mie++;
      const sotto = !utile ? 'ti serve una runa di ' + nome
        : !dentro ? 'entra per potenziare il ' + nome
        : mie >= 2 ? '+35% danno · catena +1'
        : '+35% danno alle tue rune di ' + nome;
      ctx.globalCompositeOperation = 'source-over';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = sz(3.5); ctx.strokeStyle = 'rgba(4,2,12,.9)';
      const ty = k.y + k.r + sz(17);
      ctx.font = '700 ' + sz(10).toFixed(1) + 'px "Chakra Petch",system-ui,sans-serif';
      ctx.strokeText(titolo, k.x, ty);
      ctx.fillStyle = rgba(col, utile ? .95 : .45); ctx.fillText(titolo, k.x, ty);
      ctx.font = '600 ' + sz(8.5).toFixed(1) + 'px "Chakra Petch",system-ui,sans-serif';
      ctx.strokeText(sotto, k.x, ty + sz(12));
      ctx.fillStyle = utile ? 'rgba(236,232,255,.7)' : 'rgba(156,147,198,.55)';
      ctx.fillText(sotto, k.x, ty + sz(12));
    }
    /* velo di campo: appena percettibile da fermo, ma dice che la roccia
       è qualcosa di attivo e non solo un sasso. Ruota lentamente. */
    ctx.save(); ctx.translate(k.x, k.y); ctx.rotate(G.t * .12);
    ctx.strokeStyle = k.nodo ? rgba(col, .18) : 'rgba(158,198,255,.13)'; ctx.lineWidth = 1;
    ctx.setLineDash([6, 9]);
    ctx.beginPath(); ctx.arc(0, 0, k.r + 7, 0, TAU); ctx.stroke();
    ctx.setLineDash([]); ctx.restore();
    /* crepe: una roccia gia' sfondata da un guardiano si vede che ha ceduto */
    if (k.crepe) {
      ctx.save(); ctx.translate(k.x, k.y); ctx.rotate(k.rot);
      ctx.strokeStyle = 'rgba(255,168,120,' + (.18 + k.crepe * .5) + ')'; ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let j = 0; j < k.m; j += 3) {
        const a = j / k.m * TAU;
        ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * k.r * .9, Math.sin(a) * k.r * .9);
      }
      ctx.stroke(); ctx.restore();
    }
  }
}

function shape(e) {
  const r = e.r;
  ctx.beginPath();
  switch (e.shape) {
    case 'tri': ctx.moveTo(0, -r * 1.15); ctx.lineTo(r, r * .82); ctx.lineTo(-r, r * .82); ctx.closePath(); break;
    case 'dia': ctx.moveTo(0, -r * 1.2); ctx.lineTo(r * .88, 0); ctx.lineTo(0, r * 1.2); ctx.lineTo(-r * .88, 0); ctx.closePath(); break;
    case 'sq': ctx.rect(-r * .82, -r * .82, r * 1.64, r * 1.64); break;
    case 'hex': for (let i = 0; i < 6; i++) { const a = i / 6 * TAU - PI / 2; const fn = i ? 'lineTo' : 'moveTo'; ctx[fn](Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); break;
    /* anello spezzato: la forma dice da sola "questo rompe qualcosa" */
    case 'diss': ctx.arc(0, 0, r * .92, -PI * .72, PI * .72); ctx.moveTo(0, -r * .34); ctx.lineTo(0, r * .34); break;
    case 'gho': ctx.arc(0, -r * .18, r * .9, PI, 0); ctx.lineTo(r * .9, r * .8); ctx.lineTo(r * .45, r * .45); ctx.lineTo(0, r * .8); ctx.lineTo(-r * .45, r * .45); ctx.lineTo(-r * .9, r * .8); ctx.closePath(); break;
    default: for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; const rr = i % 2 ? r * .62 : r; const fn = i ? 'lineTo' : 'moveTo'; ctx[fn](Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath();
  }
}

function drawEnemies() {
  const E = G.enemies, cx = G.cam.x, cy = G.cam.y, mw = G.vw / 2 + 90, mh = G.vh / 2 + 90;
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < E.length; i++) {
    const e = E[i];
    if (Math.abs(e.x - cx) > mw || Math.abs(e.y - cy) > mh) continue;
    /* trecento aloni additivi facevano un muro di luce in cui non si
       distingueva più niente: l'alone resta a chi conta davvero */
    const gs = e.r * (e.boss || e.elite ? 2.6 : 1.7), t = glowTex(e.froze > 0 ? '#8fe6ff' : e.c, 48);
    ctx.globalAlpha = e.boss ? .62 : e.elite ? .5 : .15;
    ctx.drawImage(t, e.x - gs, e.y - gs, gs * 2, gs * 2);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < E.length; i++) {
    const e = E[i];
    if (Math.abs(e.x - cx) > mw || Math.abs(e.y - cy) > mh) continue;
    ctx.save(); ctx.translate(e.x, e.y);
    if (e.boss) ctx.rotate(Math.sin(G.t * 1.2) * .12); else ctx.rotate(Math.atan2(G.p.y - e.y, G.p.x - e.x) + PI / 2);
    const flash = e.flash > 0, col = e.froze > 0 ? '#a5eaff' : e.c;
    shape(e);
    /* corpo scuro e pieno sotto il contorno acceso: i nemici diventano
       sagome solide invece di contorni trasparenti persi nel caos luminoso */
    /* colpito: il corpo scuro resta e sopra ci va un velo bianco, cosi' si
       vede il morso senza che la sagoma diventi una macchia bianca. Il
       bianco pieno e' riservato al guscio della morte. */
    if (flash) {
      ctx.fillStyle = 'rgba(10,6,26,.88)'; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.62)'; ctx.fill();
    } else {
      ctx.fillStyle = e.type === 'spettro' ? 'rgba(10,6,26,.44)' : 'rgba(10,6,26,.88)';
      ctx.fill();
      ctx.fillStyle = rgba(col, e.type === 'spettro' ? .3 : .22);
      ctx.fill();
    }
    /* Il contorno era sottile e della tinta piena del nemico — viola pallido
       su fondo viola scuro: la cosa meno visibile dello schermo era quella
       che ti ammazza. Piu' spesso, e schiarito verso il bianco, cosi' la
       sagoma regge anche sopra le tue esplosioni. */
    if (e.ten > 1.6) {
      /* temprato dal direttore: un bordo caldo dice che questo incassa piu'
         del normale, invece di lasciartelo scoprire a furia di colpi */
      ctx.strokeStyle = rgba('#ffc089', clamp((e.ten - 1.6) / 6, .2, .62));
      ctx.lineWidth = sz((e.boss ? 3.5 : e.elite ? 2.6 : 2.4) + 3.4); ctx.stroke();
    }
    ctx.lineWidth = sz(e.boss ? 3.5 : e.elite ? 2.6 : 2.4);
    ctx.strokeStyle = flash ? '#ffffff' : mixc(col, '#ffffff', .26); ctx.stroke();
    if (e.burnT > 0) { ctx.strokeStyle = rgba(EL.fuoco.c, .8); ctx.lineWidth = 1.4; ctx.stroke(); }
    if (e.elite) { ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1; ctx.setLineDash([4, 5]); ctx.stroke(); ctx.setLineDash([]); }
    if (e.boss && e.tell) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.globalAlpha = .3 + Math.sin(G.t * 40) * .3; ctx.stroke(); ctx.globalAlpha = 1; }
    ctx.restore();
  }
  drawBarreVita();
}

/* Una barra sopra la testa, da sola, può voler dire qualsiasi cosa: carica,
   scudo, tempo che scade. Perché si legga come VITA parla la stessa lingua
   della barra del giocatore: binario vuoto visibile, tacche regolari, scia
   bianca del danno appena subito, e il rosa di pericolo quando si svuota. */
function barraVita(x, y, w, h, f, g, col) {
  f = clamp(f, 0, 1);
  x = Math.round(x); y = Math.round(y); w = Math.round(w);
  ctx.fillStyle = 'rgba(4,2,12,.86)'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = rgba(col, .16); ctx.fillRect(x, y, w, h);
  if (g > f) { ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x + w * f, y, w * (g - f), h); }
  ctx.fillStyle = f < .55 ? mixc(col, HPC, (.55 - f) / .55 * .9) : col;
  ctx.fillRect(x, y, w * f, h);
  /* tacche: la firma visiva della barra della vita del giocatore */
  const step = Math.max(10, w / 10), tw = h > 7 ? 2 : 1;
  ctx.fillStyle = 'rgba(6,4,18,.8)';
  for (let sx = step; sx < w - 1; sx += step) ctx.fillRect(x + Math.round(sx), y, tw, h);
  ctx.strokeStyle = rgba(col, .6); ctx.lineWidth = 1;
  ctx.strokeRect(x - .5, y - .5, w + 1, h + 1);
}

/* passata a parte: prima le barre finivano sotto ai corpi dei nemici
   disegnati dopo, e in mezzo alla folla sparivano */
function drawBarreVita() {
  const E = G.enemies, cx = G.cam.x, cy = G.cam.y, mw = G.vw / 2 + 90, mh = G.vh / 2 + 90;
  for (let i = 0; i < E.length; i++) {
    const e = E[i];
    if (e.dead || e.hp <= 0 || !(e.elite || e.boss || e.corriere)) continue;
    if (Math.abs(e.x - cx) > mw || Math.abs(e.y - cy) > mh) continue;
    const w = Math.max(38, e.r * 2.6), h = e.boss ? 7 : 5;
    barraVita(e.x - w / 2, e.y - e.r - 16, w, h, e.hp / e.maxHp, e.hpG, e.boss ? e.c : e.elite ? '#ffc857' : e.c);
    /* corazza elementale: un cerchio del colore dell'elemento che dimezza.
       Va vista addosso a lui, non solo scritta in un avviso che passa. */
    if (e.boss && e.corazza) {
      const cc = EL[e.corazza].c;
      ctx.strokeStyle = rgba(cc, .5 + Math.sin(G.t * 2.4) * .18); ctx.lineWidth = 2.4;
      ctx.setLineDash([10, 8]); ctx.lineDashOffset = -G.t * 26;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 13, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '700 9px "Chakra Petch",system-ui,sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(4,2,12,.92)';
      const et = 'CORAZZA DI ' + EL[e.corazza].n.toUpperCase();
      ctx.strokeText(et, e.x, e.y - e.r - 27);
      ctx.fillStyle = cc; ctx.fillText(et, e.x, e.y - e.r - 27);
    }
  }
  /* il Dissonante mostra a COSA è attaccato: senza il filo, una runa che
     smette di sparare sembra un difetto invece che un attacco */
  for (let i = 0; i < E.length; i++) {
    const e = E[i];
    if (!e.attiva || e.hp <= 0 || e.slot === undefined || !G.ring[e.slot]) continue;
    const r = G.ring[e.slot];
    ctx.save();
    ctx.strokeStyle = 'rgba(224,208,255,.72)'; ctx.lineWidth = 2;
    ctx.setLineDash([5, 7]); ctx.lineDashOffset = G.t * 46;
    ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(r.wx, r.wy); ctx.stroke();
    ctx.setLineDash([]); ctx.restore();
  }
}

/* una zona fuori campo costa quanto una dentro: gradiente, arco, contorno.
   Con le pozze a decine erano tutte disegnate comunque */
function zonaVisibile(z, r) {
  const mx = G.vw / 2 + r + 40, my = G.vh / 2 + r + 40;
  if (z.x === undefined) {                     /* zone a segmento: saetta, fascio */
    return Math.max(z.x1, z.x2) > G.cam.x - mx && Math.min(z.x1, z.x2) < G.cam.x + mx &&
           Math.max(z.y1, z.y2) > G.cam.y - my && Math.min(z.y1, z.y2) < G.cam.y + my;
  }
  return Math.abs(z.x - G.cam.x) < mx && Math.abs(z.y - G.cam.y) < my;
}

function drawZonesUnder() {
  ctx.globalCompositeOperation = 'lighter';
  for (const z of G.zones) {
    if (z.k === 'pool') {
      if (!zonaVisibile(z, z.r)) continue;
      const f = 1 - z.t / z.dur, a = clamp(f * 1.4, 0, .42) * G.chiarezza;
      if (z.scia) {
        /* La scia è un alone morbido che pulsa, non un cerchio col contorno:
           erano quei cerchi netti, accavallati a centinaia, a fare il muro di
           bolle arancioni. Lo sprite pre-renderizzato costa anche molto meno
           di un gradiente nuovo per pozza a ogni fotogramma. */
        const t = glowTex(z.c, 48), s = z.r * 1.4;
        ctx.globalAlpha = clamp(a * 1.5, 0, .8) * (.86 + Math.sin(G.t * 9 + z.x * .05) * .14);
        ctx.drawImage(t, z.x - s, z.y - s, s * 2, s * 2);
        ctx.globalAlpha = 1;
        continue;
      }
      const g = ctx.createRadialGradient(z.x, z.y, 0, z.x, z.y, z.r);
      g.addColorStop(0, rgba(z.c, a)); g.addColorStop(.6, rgba(z.c, a * .4)); g.addColorStop(1, rgba(z.c, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba(z.c, a * .8); ctx.lineWidth = 2; ctx.stroke();
    } else if (z.k === 'hole') {
      const f = clamp(z.t / .3, 0, 1) * clamp((z.dur - z.t) / .35, 0, 1);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(2,0,10,' + (.92 * f) + ')';
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r * .72 * f, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const rr = z.r * (.8 + i * .55) * f, a2 = G.t * (1.4 + i * .7) + i;
        ctx.strokeStyle = rgba(z.c, .3 * f); ctx.lineWidth = 2 - i * .4;
        ctx.beginPath(); ctx.arc(z.x, z.y, rr, a2, a2 + 2.2); ctx.stroke();
      }
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}

function drawZonesOver() {
  ctx.globalCompositeOperation = 'lighter';
  for (const z of G.zones) {
    if (!zonaVisibile(z, Math.max(z.r || 0, z.r1 || 0, 60))) continue;
    const f = z.t / z.dur;
    if (z.k === 'nova' || z.k === 'ring') {
      const r = z.k === 'nova' ? z.r : lerp(z.r0, z.r1, Math.sqrt(f));
      const ch = G.chiarezza;
      ctx.strokeStyle = rgba(z.c, (1 - f) * .95 * ch); ctx.lineWidth = (3 + (1 - f) * 7) * (.55 + ch * .45);
      ctx.beginPath(); ctx.arc(z.x, z.y, r, 0, TAU); ctx.stroke();
      ctx.strokeStyle = rgba('#ffffff', (1 - f) * .5 * ch); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(z.x, z.y, r, 0, TAU); ctx.stroke();
    } else if (z.k === 'spark' || z.k === 'beam') {
      const a = 1 - f;
      ctx.strokeStyle = rgba(z.c, a * .9); ctx.lineWidth = (z.w || 4) * (.6 + a * .8);
      ctx.beginPath();
      if (z.k === 'spark') {
        const seg = 5; ctx.moveTo(z.x1, z.y1);
        for (let i = 1; i < seg; i++) {
          const t = i / seg, jx = crand(16, -16), jy = crand(16, -16);
          ctx.lineTo(lerp(z.x1, z.x2, t) + jx, lerp(z.y1, z.y2, t) + jy);
        }
        ctx.lineTo(z.x2, z.y2);
      } else { ctx.moveTo(z.x1, z.y1); ctx.lineTo(z.x2, z.y2); }
      ctx.stroke();
      ctx.strokeStyle = rgba('#ffffff', a * .75); ctx.lineWidth = (z.w || 4) * .35; ctx.stroke();
    } else if (z.k === 'scudo') {
      /* il colpo nemico si spegne contro il campo: arco luminoso nel punto
         d'impatto, l'unico momento in cui il riparo deve farsi notare */
      const a = 1 - f, rr = z.r + 4 + f * 12, mez = .58 - f * .22;
      ctx.strokeStyle = rgba('#9ec6ff', a * .85); ctx.lineWidth = 3 + a * 5;
      ctx.beginPath(); ctx.arc(z.x, z.y, rr, z.a - mez, z.a + mez); ctx.stroke();
      ctx.strokeStyle = rgba('#ffffff', a * .7); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(z.x, z.y, rr, z.a - mez * .6, z.a + mez * .6); ctx.stroke();
    } else if (z.k === 'guscio') {
      /* Il guscio: la sagoma che stavi colpendo lampeggia e si sfalda.
         La prima versione non si vedeva, e misurando ho capito perche':
         alzava la luminosita' media del riquadro di 3.5 su un fondo di 11
         per due fotogrammi, e il suo pixel piu' luminoso non superava mai
         quelli che c'erano gia'. Era un velo, non un lampo — e un lampo si
         riconosce proprio dal fatto che per un istante SATURA.
         Due errori. Il primo: era legato alla chiarezza, che a meta'
         partita sta a .42-.7, quindi sbiadiva proprio quando uccidi di
         piu'. Ma la chiarezza serve a spegnere la DECORAZIONE per far
         posto all'informazione, e questo lampo e' informazione: dice che
         hai ucciso. Adesso la chiarezza lo smorza al massimo di un quinto.
         Il secondo: durava 0.14s con un contorno sottile. Ora il primo
         quinto e' la sagoma piena di bianco additivo — satura davvero — e
         il resto e' il contorno che si allarga e svanisce. */
      const ch = .8 + G.chiarezza * .2;
      const e = 1 - (1 - f) * (1 - f);                 /* scatta, poi rallenta */
      const sc = 1 + e * (z.grosso ? 1.9 : 1.35);
      const a = (f < .3 ? 1 : 1 - (f - .3) / .7) * ch;
      ctx.save(); ctx.translate(z.x, z.y); ctx.rotate(z.rot); ctx.scale(sc, sc);
      shape({ shape: z.forma, r: z.r });
      /* Pieno SOLO durante il lampo. Riempiendolo anche dopo — col colore
         del nemico, in additivo — restava una sagoma piena per due decimi
         di secondo e tornava a leggersi come un oggetto solido in mezzo ai
         nemici veri. Dopo il lampo resta solo il contorno che si allarga:
         un fantasma, non una cosa. */
      if (f < .22) { ctx.fillStyle = rgba('#ffffff', (1 - f / .22) * ch); ctx.fill(); }
      ctx.strokeStyle = rgba(mixc(z.c, '#ffffff', .7), a);
      ctx.lineWidth = sz(3.4 + (z.grosso ? 2.6 : 0)) * (.5 + a);
      ctx.stroke();
      ctx.restore();
    } else if (z.k === 'bolt') {
      if (z.t < .17) {
        ctx.strokeStyle = rgba(z.c, .55); ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(z.x, z.y, z.r * (z.t / .17), 0, TAU); ctx.stroke();
      } else {
        const a = 1 - (z.t - .17) / (z.dur - .17);
        ctx.strokeStyle = rgba(z.c, a); ctx.lineWidth = 7 * a + 2;
        ctx.beginPath(); ctx.moveTo(z.x + crand(20, -20), z.y - 460);
        for (let i = 1; i <= 4; i++) ctx.lineTo(z.x + crand(26, -26) * (1 - i / 5), z.y - 460 + 460 * i / 4);
        ctx.stroke();
        ctx.fillStyle = rgba(z.c, a * .45); ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill();
      }
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}

/* eventi d'arena: devono leggersi da lontano, sono l'unico motivo per
   attraversare la mappa invece di girare in tondo.
   Questa funzione c'era gia' ed era scritta bene, ma NON VENIVA MAI
   CHIAMATA: il ciclo di disegno saltava da drawZonesUnder a drawPickups.
   Quindi la breccia non aveva il suo faro viola e il Corriere non aveva
   niente addosso — nasceva a quattrocento pixel, cioe' dentro lo schermo,
   dove la bussola di bordo non compare, e in mezzo alla folla era una
   sagoma turchese uguale alle altre. Da qui "il Corriere quando spawna non si
   capisce dove sta": letteralmente non era segnato in nessun modo. */
function drawEvento() {
  const v = G.ev; if (!v) return;
  if (v.k === 'breccia') {
    const rest = 1 - v.t / v.dur, pul = 1 + Math.sin(G.t * 4) * .07;
    ctx.globalCompositeOperation = 'lighter';
    const gt = glowTex('#b06bff', 64);
    ctx.globalAlpha = .5 * pul; ctx.drawImage(gt, v.x - 150, v.y - 150, 300, 300); ctx.globalAlpha = 1;
    for (let i = 0; i < 3; i++) {
      const rr = v.r * (.55 + i * .38) * pul, a = G.t * (1.6 - i * .4) + i * 2;
      ctx.strokeStyle = rgba('#b06bff', .75 - i * .18); ctx.lineWidth = 3 - i * .6;
      ctx.beginPath(); ctx.arc(v.x, v.y, rr, a, a + 3.6); ctx.stroke();
    }
    /* quanto resta, letto come arco che si consuma */
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(v.x, v.y, v.r + 16, -PI / 2, -PI / 2 + TAU * rest); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  } else if (v.k === 'caccia' && v.e && v.e.hp > 0) {
    bersaglio(v.e, 1 - v.t / v.dur);
  }
}

/* Quel che si disegna dentro la telecamera viene rimpicciolito dallo zoom
   insieme a tutto il resto. Per le scritte e per i contorni non va bene:
   una scritta di dieci pixel su un telefono zoomato a .74 ne diventa sette
   e non si legge piu'. Questi due la annullano, e restano della stessa
   grandezza fisica ovunque. */
const sz = v => v / G.zoom;

/* Il marchio del Corriere. Deve dire tre cose a colpo d'occhio e da
   qualunque distanza: DOV'E', che e' quello e non un altro nemico, e
   QUANTO MANCA. Un cerchietto sottile addosso non bastava: in mezzo a
   cinquanta sagome non lo vedevi nemmeno sapendo che c'era. */
function bersaglio(e, rest) {
  const R = e.r + 30, c = '#6ff2c4';
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  /* colonna di luce: si vede sopra la folla, che e' il punto */
  const g = ctx.createLinearGradient(e.x, e.y - 620, e.x, e.y + 40);
  g.addColorStop(0, rgba(c, 0)); g.addColorStop(.78, rgba(c, .16)); g.addColorStop(1, rgba(c, .42));
  ctx.fillStyle = g; ctx.fillRect(e.x - 15, e.y - 620, 30, 660);
  ctx.globalAlpha = .55; ctx.drawImage(glowTex(c, 48), e.x - 110, e.y - 110, 220, 220); ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  /* quattro parentesi che ruotano: la forma universale di "bersaglio" */
  ctx.translate(e.x, e.y); ctx.rotate(G.t * .9);
  ctx.strokeStyle = c; ctx.lineWidth = sz(3); ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const a0 = i * (TAU / 4) - .34;
    ctx.beginPath(); ctx.arc(0, 0, R, a0, a0 + .68); ctx.stroke();
  }
  ctx.rotate(-G.t * .9);
  /* il tempo che resta, come arco che si consuma */
  ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = sz(3);
  ctx.beginPath(); ctx.arc(0, 0, R + 9, -PI / 2, -PI / 2 + TAU * clamp(rest, 0, 1)); ctx.stroke();
  ctx.font = '700 ' + sz(11).toFixed(1) + 'px "Chakra Petch",system-ui,sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = sz(3.5); ctx.strokeStyle = 'rgba(4,2,12,.9)';
  ctx.strokeText('CORRIERE', 0, -R - sz(20)); ctx.fillStyle = c; ctx.fillText('CORRIERE', 0, -R - sz(20));
  ctx.restore();
}

/* Freccia a bordo schermo verso un punto fuori campo. Con etichetta:
   la sola direzione non basta a trovare una breccia a ottocento pixel,
   serve sapere quanto manca e quanto tempo resta. */
function bussola(x, y, col, size, etichetta, pulsa) {
  const sx = (x - G.cam.x) * G.zoom + W / 2, sy = (y - G.cam.y) * G.zoom + H / 2;
  if (sx > 26 && sx < W - 26 && sy > 26 && sy < H - 26) return;
  const a = Math.atan2(y - G.cam.y, x - G.cam.x);
  const k = pulsa ? 1 + Math.sin(G.t * 5) * .16 : 1;
  const rad = Math.min(W, H) * .40;
  const ix = W / 2 + Math.cos(a) * rad, iy = H / 2 + Math.sin(a) * rad;

  if (etichetta) {
    /* scia tratteggiata dal nucleo verso la freccia: dice "di là" senza
       tracciare una linea su tutto lo schermo */
    ctx.save();
    ctx.strokeStyle = col; ctx.globalAlpha = .34; ctx.lineWidth = 2;
    ctx.setLineDash([9, 12]); ctx.lineDashOffset = -G.t * 40;
    ctx.beginPath();
    ctx.moveTo(W / 2 + Math.cos(a) * 92, H / 2 + Math.sin(a) * 92);
    ctx.lineTo(W / 2 + Math.cos(a) * (rad - 22), H / 2 + Math.sin(a) * (rad - 22));
    ctx.stroke();
    ctx.setLineDash([]); ctx.restore();
  }

  ctx.save(); ctx.translate(ix, iy);
  ctx.save(); ctx.rotate(a); ctx.scale(k, k);
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(size, 0); ctx.lineTo(-size * .6, size * .62); ctx.lineTo(-size * .6, -size * .62);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  if (etichetta) {
    ctx.font = '700 11px "Chakra Petch",system-ui,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const oy = Math.sin(a) > 0 ? -size - 12 : size + 12;
    ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(4,2,12,.9)';
    ctx.strokeText(etichetta, 0, oy); ctx.fillStyle = col; ctx.fillText(etichetta, 0, oy);
  }
  ctx.restore();
}

function drawBullets() {
  ctx.globalCompositeOperation = 'lighter';
  for (const b of G.bullets) {
    const t = glowTex(b.c, 44), gs = b.r * 3.4;
    ctx.globalAlpha = .55 * G.chiarezza; ctx.drawImage(t, b.x - gs, b.y - gs, gs * 2, gs * 2); ctx.globalAlpha = 1;
    ctx.save(); ctx.translate(b.x, b.y);
    if (b.kind === 'shard' || b.kind === 'bolt') {
      ctx.rotate(b.ang || 0);
      ctx.fillStyle = b.c; ctx.beginPath();
      ctx.moveTo(b.r * 2.4, 0); ctx.lineTo(-b.r, b.r * .8); ctx.lineTo(-b.r * .4, 0); ctx.lineTo(-b.r, -b.r * .8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.r * .6, 0, b.r * .34, 0, TAU); ctx.fill();
    } else if (b.kind === 'scythe') {
      ctx.rotate(b.rot || 0);
      ctx.strokeStyle = b.c; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, 0, b.r, .5, 3.9); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(0, 0, b.r, .7, 3.6); ctx.stroke();
    } else {
      ctx.fillStyle = b.c; ctx.beginPath(); ctx.arc(0, 0, b.r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, b.r * .45, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  /* i colpi nemici hanno sempre la stessa forma e lo stesso rosso:
     in mezzo al caos "spigoloso e rosa" deve voler dire soltanto "pericolo" */
  for (const b of G.ebul) {
    const gs = b.r * 3.4, t = glowTex('#ff2d5f', 40);
    ctx.globalAlpha = .62; ctx.drawImage(t, b.x - gs, b.y - gs, gs * 2, gs * 2); ctx.globalAlpha = 1;
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.t * 6.5);
    ctx.fillStyle = '#ff2d5f';
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU, rr = (i % 2) ? b.r * .42 : b.r * 1.55;
      if (i) ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, b.r * .42, 0, TAU); ctx.fill();
    ctx.restore();
  }
  ctx.globalCompositeOperation = 'source-over';
}

/* Linguaggio visivo, una regola sola:
     da raccogliere = pieno, luminoso, tondo, con alone che pulsa
     nemico        = contornato, spigoloso, riempimento scuro
   Prima gemme e nemici erano entrambi rombi: impossibile distinguerli al volo. */
function drawPickups() {
  const cx = G.cam.x, cy = G.cam.y, mw = G.vw / 2 + 60, mh = G.vh / 2 + 60;

  ctx.globalCompositeOperation = 'lighter';
  /* la gemma piu' vicina, e solo finche' non se n'e' mai raccolta una */
  let primaGemma = null;
  if (!G.demo && G.lezioneGemme === 1) {
    let pd = 1e18;
    for (const m of G.gems) {
      if (m.k !== 0) continue;
      const q = (m.x - G.p.x) * (m.x - G.p.x) + (m.y - G.p.y) * (m.y - G.p.y);
      if (q < pd) { pd = q; primaGemma = m; }
    }
  }
  for (const m of G.gems) {
    if (Math.abs(m.x - cx) > mw || Math.abs(m.y - cy) > mh) continue;
    /* Tondo e pieno basta a distinguerle dai nemici (spigolosi e contornati).
       I raggi restano solo a frammenti e gemme fuse: su cento gemme a schermo
       farebbero più rumore dei nemici. */
    const raro = m.k === 1 || m.big;
    const c = m.k === 1 ? '#ffc857' : '#6ff2c4', s = (m.k === 1 ? 6.5 : 4.2) * (m.big ? 1.9 : 1);
    const pul = 1 + Math.sin(G.t * 3.4 + m.t * 5) * .14;
    /* Centinaia di gemme accese tutte uguali diventavano la cosa più
       rumorosa dello schermo. Brillano quelle che stai per raccogliere,
       le altre restano una polvere di fondo. */
    const dx = m.x - G.p.x, dy = m.y - G.p.y, pr = P.pickR * 1.7;
    const vicino = dx * dx + dy * dy < pr * pr;
    const fade = vicino ? 1 : .42;
    ctx.globalAlpha = (raro ? .5 : .26) * fade;
    const gr = s * (raro ? 3.4 : 2.4);
    ctx.drawImage(glowTex(c, 32), m.x - gr, m.y - gr, gr * 2, gr * 2);
    ctx.globalAlpha = raro ? 1 : .55 + fade * .45;
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(m.x, m.y, s * .66 * pul, 0, TAU); ctx.fill();
    if (raro) {
      ctx.strokeStyle = c; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      const ray = s * 1.8 * pul;
      ctx.beginPath();
      ctx.moveTo(m.x - ray, m.y); ctx.lineTo(m.x + ray, m.y);
      ctx.moveTo(m.x, m.y - ray); ctx.lineTo(m.x, m.y + ray);
      ctx.stroke();
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(m.x, m.y, s * .3, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    /* Finche' non ne hai raccolta UNA in vita tua, la scheggia piu' vicina
       porta scritto cos'e'. I doni a terra hanno gia' questa regola, le
       gemme no — e chi comincia non ha modo di sapere che quei puntini
       turchesi sono l'esperienza: li scavalca, non sale di livello, e conclude
       che il gioco e' impossibile. Una parola sola, su una gemma sola, e
       sparisce per sempre al primo tocco. */
    if (m === primaGemma) {
      ctx.font = '700 ' + sz(10).toFixed(1) + 'px "Chakra Petch",system-ui,sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = sz(3.5); ctx.strokeStyle = 'rgba(4,2,12,.9)';
      const ty = m.y + sz(17);
      ctx.strokeText('ESPERIENZA', m.x, ty);
      ctx.fillStyle = 'rgba(111,242,196,.95)'; ctx.fillText('ESPERIENZA', m.x, ty);
    }
  }

  /* un solo dono per volta porta la scritta: quello piu' vicino */
  let vicino = null, vd = 1e18;
  for (const d of G.drops) {
    const q = (d.x - G.p.x) * (d.x - G.p.x) + (d.y - G.p.y) * (d.y - G.p.y);
    if (q < vd) { vd = q; vicino = d; }
  }
  for (const d of G.drops) {
    const c = d.k === 'chest' ? '#ffc857' : d.k === 'cuore' ? '#ff3d6e' : '#ffffff';
    const bob = Math.sin(G.t * 3 + d.t) * 4, s = 13, y = d.y + bob;
    ctx.globalAlpha = .6; ctx.drawImage(glowTex(c, 40), d.x - 46, y - 46, 92, 92); ctx.globalAlpha = 1;
    /* anello che si espande: dice "vieni a prendermi" a colpo d'occhio */
    const ph = (G.t * .9 + d.t) % 1;
    ctx.strokeStyle = rgba(c, (1 - ph) * .55); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(d.x, y, s + ph * 26, 0, TAU); ctx.stroke();
    ctx.save(); ctx.translate(d.x, y); ctx.rotate(G.t * .8);
    ctx.fillStyle = c;
    ctx.beginPath();
    if (d.k === 'cuore') ctx.arc(0, 0, s * .78, 0, TAU);
    else for (let i = 0; i < 4; i++) { const a = i / 4 * TAU; const fn = i ? 'lineTo' : 'moveTo'; ctx[fn](Math.cos(a) * s, Math.sin(a) * s); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, 0, s * .34, 0, TAU); ctx.fill();
    ctx.restore();
    /* Una losanga bianca che gira non dice cosa fa, e la bomba fa la cosa
       piu' grossa del gioco: spazza l'intera mappa. Una parola sotto toglie
       ogni dubbio — ma SOLO a quella che stai per raccogliere: i doni non
       raccolti restano a terra per sempre e scritti tutti diventavano loro
       il rumore, sei etichette a schermo al posto di sei losanghe. */
    if (d !== vicino) continue;
    const nome = d.k === 'chest' ? 'SCRIGNO' : d.k === 'cuore' ? 'VITA' : 'BOMBA · TUTTA LA MAPPA';
    ctx.globalCompositeOperation = 'source-over';
    ctx.font = '700 ' + sz(10).toFixed(1) + 'px "Chakra Petch",system-ui,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = sz(3.5); ctx.strokeStyle = 'rgba(4,2,12,.9)';
    const ty = y + s + sz(15);
    ctx.strokeText(nome, d.x, ty);
    ctx.fillStyle = rgba(c, .95); ctx.fillText(nome, d.x, ty);
    ctx.globalCompositeOperation = 'lighter';
  }
  ctx.globalCompositeOperation = 'source-over';
}

function sagomaNucleo(sk, r) {
  ctx.beginPath();
  if (!sk.lati) { ctx.arc(0, 0, r, 0, TAU); return; }
  const pt = skinPunti(sk, r);
  for (let i = 0; i < pt.length; i++) ctx[i ? 'lineTo' : 'moveTo'](pt[i][0], pt[i][1]);
  ctx.closePath();
}

function drawPlayer() {
  const p = G.p, sl = G.slots;
  /* anello di orbita */
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(160,190,255,.13)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(p.x, p.y, RING_R, 0, TAU); ctx.stroke();

  /* archi di risonanza — spezzati dove un Dissonante ha agganciato */
  for (let i = 0; i < sl; i++) {
    const a = G.ring[i], b = G.ring[(i + 1) % sl];
    if (!a || !b || !compat(a, b)) continue;
    const el = a.el === 'iride' ? b.el : a.el;
    const a1 = G.ringRot + i / sl * TAU, a2 = a1 + TAU / sl;
    const rotto = a.mutata || b.mutata;
    const pulse = .45 + Math.sin(G.t * 4 + i) * .22;
    ctx.strokeStyle = rotto ? 'rgba(224,208,255,.30)' : rgba(EL[el].c, pulse);
    ctx.lineWidth = rotto ? 2 : 3.4;
    if (rotto) ctx.setLineDash([4, 9]);
    ctx.beginPath(); ctx.arc(p.x, p.y, RING_R, a1, a2); ctx.stroke();
    if (rotto) ctx.setLineDash([]);
  }

  /* cristalli orbitanti */
  for (let i = 0; i < sl; i++) {
    const r = G.ring[i];
    if (!r || r.id !== 'cristallo' || !r.st.orb) continue;
    for (const o of r.st.orb) {
      if (o.x === undefined) continue;
      const t = glowTex(EL.gelo.c, 40);
      ctx.globalAlpha = .6; ctx.drawImage(t, o.x - 34, o.y - 34, 68, 68); ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(G.t * 3);
      ctx.fillStyle = rgba(EL.gelo.c, .55); ctx.strokeStyle = '#dff6ff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(9, 0); ctx.lineTo(0, 13); ctx.lineTo(-9, 0); ctx.closePath();
      ctx.fill(); ctx.stroke(); ctx.restore();
    }
  }

  /* bagliore del nucleo */
  const gt = glowTex(p.hurt > 0 ? '#ff3d6e' : G.char.c, 64);
  const pul = 1 + Math.sin(G.t * 4) * .07;
  /* l'alone del nucleo era largo centoventi pixel a piena opacita': in
     mezzo alle tue stesse pozze diventava una palla di fuoco dentro cui il
     nucleo — cioe' tu — non si vedeva piu' */
  ctx.globalAlpha = .8 * (.42 + G.chiarezza * .58);
  ctx.drawImage(gt, p.x - 62 * pul, p.y - 62 * pul, 124 * pul, 124 * pul); ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  /* rune — quella agganciata si spegne, e si vede che è spenta */
  for (let i = 0; i < sl; i++) {
    const r = G.ring[i]; if (!r) continue;
    const c = r.mutata ? '#6a6199' : EL[r.el].c;
    ctx.save(); ctx.translate(r.wx, r.wy);
    if (!r.mutata) {
      ctx.globalCompositeOperation = 'lighter';
      const t = glowTex(c, 32);
      ctx.globalAlpha = .5 + r.res * .18; ctx.drawImage(t, -26, -26, 52, 52); ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    } else {
      ctx.strokeStyle = 'rgba(224,208,255,.75)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-11, -11); ctx.lineTo(11, 11); ctx.stroke();
    }
    ctx.scale(.82, .82); ctx.translate(-12, -12);
    ctx.globalAlpha = r.mutata ? .45 : 1;
    ctx.strokeStyle = c; ctx.lineWidth = 1.9; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const pp of runePaths(r.id)) ctx.stroke(pp);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /* ── il Culmine e' pronto, e lo dice qui ────────────────────
     Il pulsante sta nell'angolo, dove arriva il pollice. Ma gli occhi
     stanno al centro dello schermo, sul nucleo, e da li' non si vede: la
     cosa piu' grossa che puoi premere restava carica per interi minuti
     senza che te ne accorgessi. Un anello d'oro che respira attorno al
     nucleo lo dice dove stai gia' guardando, e non ruba niente al resto:
     e' l'unico oro nell'arena, ed e' fuori dalla sagoma. */
  if (G.charge >= 1 && G.culm <= 0 && !G.demo) {
    const b = .5 + Math.sin(G.t * 3.4) * .5;
    ctx.strokeStyle = rgba('#ffe9b0', .30 + b * .42);
    ctx.lineWidth = 1.6 + b * 1.2;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 9 + b * 5, 0, TAU); ctx.stroke();
  }

  /* nucleo */
  /* Il nucleo deve restare l'unica cosa bianca e piena dello schermo:
     doppio contorno e centro pieno, così non si perde nella mischia. La
     sagoma la sceglie il giocatore (SKINS): cambia la forma, non la regola. */
  const sk = G.skin || SKINS[0];
  ctx.save(); ctx.translate(p.x, p.y);
  const inv = p.inv > 0 && (Math.floor(G.t * 22) % 2 === 0);
  ctx.globalAlpha = inv ? .45 : 1;
  ctx.rotate(G.t * (sk.rot || 0));
  ctx.fillStyle = 'rgba(6,4,18,.85)';
  sagomaNucleo(sk, p.r + 3); ctx.fill();
  ctx.strokeStyle = G.char.c; ctx.lineWidth = 3;
  sagomaNucleo(sk, p.r); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.2;
  sagomaNucleo(sk, p.r - 4); ctx.stroke();
  ctx.fillStyle = p.hurt > 0 ? '#ff8fae' : '#ffffff';
  ctx.beginPath(); ctx.arc(0, 0, p.r * .46, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawParts() {
  ctx.globalCompositeOperation = 'lighter';
  for (const a of G.parts) {
    const f = a.life / a.max;
    ctx.globalAlpha = clamp(f, 0, 1) * .9;
    ctx.fillStyle = a.c;
    const s = a.size * (.4 + f * .8);
    ctx.fillRect(a.x - s / 2, a.y - s / 2, s, s);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

function drawFloats() {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const f of G.floats) {
    const a = clamp(1 - (f.t - .45) / .37, 0, 1);
    ctx.globalAlpha = a;
    ctx.font = '' + (f.big ? '700 ' + sz(21).toFixed(1) : '600 ' + sz(14).toFixed(1)) + 'px "Chakra Petch",system-ui,sans-serif';
    ctx.lineWidth = sz(3); ctx.strokeStyle = 'rgba(4,2,12,.85)';
    ctx.strokeText(f.txt, f.x, f.y); ctx.fillStyle = f.c; ctx.fillText(f.txt, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

/* HUD disegnato nel canvas: barra dei guardiani e indicatori fuori campo */
function drawScreenUI() {
  /* Una riga sola, sempre: impilare una barra per guardiano mangiava mezzo
     schermo di telefono. Quando i guardiani sono più d'uno la barra si
     DIVIDE in un tratto per ciascuno, largo quanto la sua stazza: la riga
     misura la battaglia intera, i tratti dicono a che punto è ognuno. */
  const B = G.bosses;
  if (B.length) {
    const w = Math.min(W - 40, 520), x = (W - w) / 2, y = 76, h = 11;
    const font = '"Chakra Petch",system-ui,sans-serif';
    /* i doppioni si contano invece di ripetersi: "ARACNE ×2" */
    const voci = [];
    let tot = 0, viva = 0;
    for (const b of B) {
      const u = voci[voci.length - 1];
      if (u && u.n === b.boss.n) u.k++; else voci.push({ n: b.boss.n, k: 1, c: b.c });
      tot += b.maxHp; viva += Math.max(0, b.hp);
    }
    for (const v of voci) v.t = v.k > 1 ? v.n + ' ×' + v.k : v.n;
    const pct = Math.ceil(clamp(viva / tot, 0, 1) * 100) + '%';

    /* il nome si stringe finché non sta nella riga, invece di sbordare */
    const sep = '  +  ';
    let px = 12, lw = 0;
    for (; px > 8; px--) {
      ctx.font = '700 ' + px + 'px ' + font;
      lw = ctx.measureText(sep).width * (voci.length - 1);
      for (const v of voci) lw += ctx.measureText(v.t).width;
      if (lw <= w - 62) break;
    }
    /* ogni nome è del colore del suo tratto: dice quale barra è quale */
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(4,2,12,.85)';
    let lx = W / 2 - lw / 2;
    for (let i = 0; i < voci.length; i++) {
      if (i) {
        ctx.strokeText(sep, lx, y - 8); ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillText(sep, lx, y - 8);
        lx += ctx.measureText(sep).width;
      }
      const v = voci[i];
      ctx.strokeText(v.t, lx, y - 8);
      ctx.fillStyle = voci.length > 1 ? mixc(v.c, '#ffffff', .45) : 'rgba(255,255,255,.92)';
      ctx.fillText(v.t, lx, y - 8);
      lx += ctx.measureText(v.t).width;
    }
    /* la percentuale toglie ogni dubbio su cosa misuri la barra */
    ctx.font = '700 10px ' + font; ctx.textAlign = 'right';
    ctx.strokeText(pct, x + w, y - 8);
    ctx.fillStyle = viva / tot < .3 ? HPC : 'rgba(255,255,255,.75)'; ctx.fillText(pct, x + w, y - 8);
    ctx.textAlign = 'center';

    /* larghezza dei tratti: per lo più proporzionale alla vita massima, ma
       con una quota fissa a testa, così il gemello non diventa un filo */
    const gap = 5, utile = w - gap * (B.length - 1);
    let bx = x;
    for (let i = 0; i < B.length; i++) {
      const b = B[i];
      const sw = utile * (.62 * b.maxHp / tot + .38 / B.length);
      barraVita(bx, y, sw, h, b.hp / b.maxHp, b.hpG, b.c);
      bx += sw + gap;
      const sx = (b.x - G.cam.x) * G.zoom + W / 2, sy = (b.y - G.cam.y) * G.zoom + H / 2;
      if (sx < 30 || sx > W - 30 || sy < 30 || sy > H - 30) {
        const a = Math.atan2(b.y - G.cam.y, b.x - G.cam.x);
        const ix = W / 2 + Math.cos(a) * Math.min(W, H) * .38;
        let iy = H / 2 + Math.sin(a) * Math.min(W, H) * .38;
        if (Math.abs(ix - W / 2) < w / 2 + 24) iy = Math.max(iy, y + h + 16);   /* mai sopra alla barra */
        ctx.save(); ctx.translate(ix, iy); ctx.rotate(a);
        ctx.fillStyle = b.c; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, 8); ctx.lineTo(-8, -8); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
  }
  /* Bussola per i doni fuori campo. Gli scrigni la portano tutti: sono
     pochi e li raccogli. Cuori e bombe no — restano a terra per sempre e a
     fine partita sono decine, quindi una freccia a testa sarebbe una
     corona di frecce sul bordo dello schermo invece di un'indicazione.
     Ne porta una il piu' vicino di ciascun tipo: e' la stessa regola
     dell'etichetta a terra, ed e' l'unico che ha senso andare a prendere.
     Senza, un cuore caduto trecento pixel fuori campo non esisteva: la
     misura dice che meta' dei doni di una corsa non viene mai raccolta. */
  let vCuore = null, vcd = 1e18, vBomba = null, vbd = 1e18;
  for (const d of G.drops) {
    const q = (d.x - G.p.x) * (d.x - G.p.x) + (d.y - G.p.y) * (d.y - G.p.y);
    if (d.k === 'chest') bussola(d.x, d.y, 'rgba(255,200,87,.9)', 9);
    else if (d.k === 'cuore') { if (q < vcd) { vcd = q; vCuore = d; } }
    else if (d.k === 'bomba' && q < vbd) { vbd = q; vBomba = d; }
  }
  if (vCuore) bussola(vCuore.x, vCuore.y, 'rgba(255,61,110,.9)', 8);
  if (vBomba) bussola(vBomba.x, vBomba.y, 'rgba(255,255,255,.85)', 8);
  if (G.ev) {
    if (G.ev.k === 'breccia' && !G.ev.preso) {
      const d = Math.round(Math.hypot(G.ev.x - G.p.x, G.ev.y - G.p.y));
      const s = Math.max(0, Math.ceil(G.ev.dur - G.ev.t));
      bussola(G.ev.x, G.ev.y, 'rgba(190,130,255,.98)', 15, d + '  ·  ' + s + 's', s <= 8);
    }
    if (G.ev.k === 'caccia' && G.ev.e && G.ev.e.hp > 0) {
      const d = Math.round(Math.hypot(G.ev.e.x - G.p.x, G.ev.e.y - G.p.y));
      const s = Math.max(0, Math.ceil(G.ev.dur - G.ev.t));
      bussola(G.ev.e.x, G.ev.e.y, 'rgba(111,242,196,.98)', 15, d + '  ·  ' + s + 's', s <= 8);
    }
    /* La marea non ha un posto dove andare, quindi non ha una freccia: ha
       un LATO. Un arco sul bordo dello schermo dice da dove arrivano, e il
       conto alla rovescia dice per quanto ancora — le due sole cose che
       servono a decidere da che parte scansarsi. Senza, dopo il messaggio
       iniziale l'evento diventava invisibile: nemici più fitti e basta. */
    if (G.ev.k === 'marea') maree(G.ev);
  }
  if (G.form) formazione(G.form);
}

/* ── il lato da cui arriva una formazione ──────────────────────
   Stessa grammatica della marea, in arancione e per pochi secondi: la
   fascia larga dice il settore, il filo netto lo delimita, le tacche
   entrano verso il nucleo. Il messaggio diceva «aggiralo» di una cosa che
   non era ancora sullo schermo, e senza direzione «aggiralo» non e' un
   consiglio: e' un indovinello. L'accerchiamento non ha un lato, e infatti
   riceve il cerchio intero — che e' l'informazione giusta. */
function formazione(v) {
  const col = '#ff8a5c';
  const cx = W / 2, cy = H / 2;
  /* Un'ELLISSE, non un cerchio. Un cerchio di raggio `min(W,H)` su un
     telefono in verticale finisce a un terzo dell'altezza: la fascia
     galleggiava in mezzo allo schermo come un oggetto invece di stare
     appoggiata al bordo, che e' il posto in cui si legge «da fuori».
     L'ellisse tiene la stessa distanza relativa dai bordi su tutti e due
     gli assi, quindi funziona in verticale come in orizzontale. */
  const rx = W * .40, ry = H * .40;
  /* Da direzione VERA a parametro dell'ellisse. Sull'ellisse il parametro
     non e' l'angolo geometrico: senza questa conversione l'arco avrebbe
     indicato una direzione diversa da quella da cui arrivano davvero. */
  const par = a => Math.atan2(Math.sin(a) / ry, Math.cos(a) / rx);
  const pt = (a, k) => [cx + Math.cos(par(a)) * rx * k, cy + Math.sin(par(a)) * ry * k];
  /* entra in fretta e se ne va sfumando: e' un avviso, non uno stato */
  const alfa = clamp(Math.min(v.t / .22, (1 - v.t / v.dur) * 3.4), 0, 1);
  const puls = .6 + Math.sin(G.t * 5) * .18;
  const tondo = v.a === null;
  const p0 = tondo ? 0 : par(v.a - v.mezzo), p1 = tondo ? TAU : par(v.a + v.mezzo);

  ctx.save();
  ctx.globalAlpha = alfa;
  ctx.lineCap = tondo ? 'butt' : 'round';
  ctx.strokeStyle = rgba(col, .13 * puls + .07);
  ctx.lineWidth = 26;
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, p0, p1); ctx.stroke();
  ctx.strokeStyle = rgba(col, .88);
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(cx, cy, rx * 1.06, ry * 1.06, 0, p0, p1); ctx.stroke();
  /* le tacche che entrano: "da fuori verso di te" */
  ctx.strokeStyle = rgba(col, .55); ctx.lineWidth = 2.2;
  ctx.setLineDash([11, 14]); ctx.lineDashOffset = G.t * 52;
  const n = tondo ? 8 : 3;
  for (let k = 0; k < n; k++) {
    const a = tondo ? k / n * TAU : v.a + (k - 1) * v.mezzo * .6;
    const da = pt(a, 1.02), a2 = pt(a, .88);
    ctx.beginPath(); ctx.moveTo(da[0], da[1]); ctx.lineTo(a2[0], a2[1]); ctx.stroke();
  }
  ctx.setLineDash([]);

  const et = { muro: 'MURO', accerchiamento: 'ACCERCHIAMENTO', cuneo: 'CUNEO' }[v.k] || '';
  const tp = pt(tondo ? -PI / 2 : v.a, .74);
  ctx.font = '700 12px "Chakra Petch",system-ui,sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(4,2,12,.92)';
  ctx.strokeText(et, tp[0], tp[1]); ctx.fillStyle = col; ctx.fillText(et, tp[0], tp[1]);
  ctx.restore();
}

function maree(v) {
  const s = Math.max(0, Math.ceil(v.dur - v.t));
  const col = '#45d7ff';
  const rad = Math.min(W, H) * .46;
  const cx = W / 2, cy = H / 2;
  /* l'arco si stringe mentre il tempo scorre: la lunghezza È il timer */
  const resta = clamp(1 - v.t / v.dur, 0, 1);
  const mezzo = .62 * (.45 + resta * .55);
  const puls = .55 + Math.sin(G.t * 4) * .16;

  ctx.save();
  ctx.lineCap = 'round';
  /* la fascia larga e tenue: da qui arrivano */
  ctx.strokeStyle = rgba(col, .12 * puls + .06);
  ctx.lineWidth = 46;
  ctx.beginPath(); ctx.arc(cx, cy, rad, v.a - mezzo, v.a + mezzo); ctx.stroke();
  /* il filo netto: quanto manca */
  ctx.strokeStyle = rgba(col, .85);
  ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.arc(cx, cy, rad + 16, v.a - mezzo, v.a + mezzo); ctx.stroke();
  /* tre tacche che entrano, per dire "da fuori verso di te" */
  ctx.strokeStyle = rgba(col, .5); ctx.lineWidth = 2.4;
  ctx.setLineDash([13, 16]); ctx.lineDashOffset = G.t * 46;
  for (let k = -1; k <= 1; k++) {
    const a = v.a + k * mezzo * .58;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (rad + 8), cy + Math.sin(a) * (rad + 8));
    ctx.lineTo(cx + Math.cos(a) * (rad - 74), cy + Math.sin(a) * (rad - 74));
    ctx.stroke();
  }
  ctx.setLineDash([]);

  const tx = cx + Math.cos(v.a) * (rad - 36), ty = cy + Math.sin(v.a) * (rad - 36);
  ctx.font = '700 13px "Chakra Petch",system-ui,sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(4,2,12,.92)';
  const et = 'MAREA · ' + s + 's';
  ctx.strokeText(et, tx, ty); ctx.fillStyle = col; ctx.fillText(et, tx, ty);
  ctx.restore();
}

function render() {
  const p = G.p;
  let sx = 0, sy = 0;
  if (G.shake > .1) { sx = crand(G.shake, -G.shake); sy = crand(G.shake, -G.shake); }
  drawBG(G.cam.x + sx, G.cam.y + sy);
  ctx.save();
  ctx.translate(Math.round(W / 2 + sx), Math.round(H / 2 + sy));
  ctx.scale(G.zoom, G.zoom);
  ctx.translate(-G.cam.x, -G.cam.y);
  drawSuolo();
  drawZonesUnder();
  drawRocce();
  drawEvento();
  drawPickups();
  drawEnemies();
  drawBullets();
  drawPlayer();
  drawZonesOver();
  drawParts();
  drawFloats();
  ctx.restore();
  drawScreenUI();
}

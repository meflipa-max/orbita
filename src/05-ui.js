/* ═══════════════════════════════════════════════════════════════
   ORBITA — interfaccia, schermate, ciclo di partita.
   ═══════════════════════════════════════════════════════════════ */

const SCR = $('#screens'), HUD = $('#hud');
const elLv = $('#lvnum'), elXp = $('#xpfill'), elHpF = $('#hpfill'), elHpG = $('#hpghost'),
  elHpT = $('#hptxt'), elClock = $('#clock'), elKills = $('#kills'), elAwake = $('#awake'),
  elFlash = $('#flash'), elToasts = $('#toasts'), elHint = $('#movehint'), elNext = $('#nextboss'), elAsc = $('#ascchip');

/* dito o tastiera? Deciso a ogni partita, non al caricamento:
   così regge anche i portatili con schermo touch e i cambi di contesto. */
function isCoarse() {
  return (window.matchMedia && matchMedia('(pointer: coarse)').matches) || navigator.maxTouchPoints > 0;
}
function showMoveHint() {
  elHint.innerHTML = isCoarse()
    ? '<span class="joyd"><i></i></span><b>Trascina ovunque per muoverti</b><small>Le rune sparano da sole</small>'
    : '<span class="keys"><i>W</i><i>A</i><i>S</i><i>D</i></span><b>Muoviti con WASD o le frecce</b><small>Le rune sparano da sole</small>';
  elHint.className = 'clip on';
  G.hint = 9; G.hintOff = 0;
}
function hideMoveHint() { elHint.className = 'clip'; G.hint = 0; G.hintOff = 0; }

function shardIcon() { return svg('frammento'); }
const ARC = (r, a1, a2) => {
  const x1 = 50 + Math.cos(a1) * r, y1 = 50 + Math.sin(a1) * r;
  const x2 = 50 + Math.cos(a2) * r, y2 = 50 + Math.sin(a2) * r;
  let d = a2 - a1; while (d < 0) d += TAU;
  return 'M' + x1.toFixed(2) + ' ' + y1.toFixed(2) + ' A ' + r + ' ' + r + ' 0 ' + (d > PI ? 1 : 0) + ' 1 ' + x2.toFixed(2) + ' ' + y2.toFixed(2);
};

const UI = {
  cur: null, sel: -1, placing: null, chestMode: false,

  /* ── infrastruttura ─────────────────────────────────────── */
  open(name, html) {
    this.cur = name;
    if (name === 'title' || name === 'hub' || name === 'guide') {
      if (G.state !== 'menu') enterMenu();
      G.state = 'menu'; HUD.classList.remove('on');
    }
    SCR.innerHTML = '<section class="screen on" data-s="' + name + '">' + html + '</section>';
    const s = SCR.firstElementChild; if (s) s.scrollTop = 0;
  },
  close() { this.cur = null; SCR.innerHTML = ''; },

  toast(t, sub, c) {
    /* al massimo due per volta: impilati coprivano la barra del boss e l'azione */
    while (elToasts.children.length >= 2) elToasts.firstElementChild.remove();
    const d = document.createElement('div');
    d.className = 'toast clip'; d.style.color = c || '#ffffff';
    d.innerHTML = t + (sub ? '<small>' + sub + '</small>' : '');
    elToasts.appendChild(d);
    setTimeout(() => d.remove(), 2200);
  },

  hud() {
    elLv.textContent = G.level;
    elXp.style.width = (clamp(G.xp / G.xpNeed, 0, 1) * 100) + '%';
    const f = clamp(P.hp / P.maxHp, 0, 1);
    elHpF.style.transform = 'scaleX(' + f + ')';
    elHpG.style.transform = 'scaleX(' + f + ')';
    elHpT.textContent = Math.ceil(Math.max(0, P.hp)) + ' / ' + Math.round(P.maxHp);
    elClock.textContent = fmtTime(G.t);
    elKills.textContent = G.kills + ' ELIMINAZIONI';
    const nb = BOSSES[G.bossIdx];
    if (nb && !G.boss) {
      const left = Math.max(0, nb.t - G.t);
      elNext.className = left < 25 ? 'on soon' : 'on';
      elNext.innerHTML = '<i></i>' + nb.n + ' ' + fmtTime(left);
    } else elNext.className = '';
    if (G.ascLv > 0) { elAsc.className = 'clip on'; elAsc.textContent = 'ASCENSIONE ' + G.ascLv; }
    else elAsc.className = 'clip';
  },

  renderAwake() {
    let h = '';
    for (const e of ELKEYS) {
      const t = G.awaken[e]; if (!t) continue;
      h += '<div class="awchip clip" style="color:' + EL[e].c + '">' + EL[e].aw +
        '<span class="pips">' + '<i></i>'.repeat(t) + '</span></div>';
    }
    elAwake.innerHTML = h;
  },

  /* ── titolo ─────────────────────────────────────────────── */
  title() {
    const best = SAVE.best ? fmtTime(SAVE.best) : '—';
    const chips = ELKEYS.map((e, i) =>
      '<span class="el clip" style="--c:' + EL[e].c + ';animation-delay:' + (.7 + i * .09).toFixed(2) + 's"><b></b>' + EL[e].n + '</span>'
    ).join('');
    this.open('title',
      '<div class="hero">' +
      '<div class="eyebrow">Sopravvivenza · Roguelite</div>' +
      '<h1 class="logo">ORBITA</h1>' +
      '<p class="sub">Le tue rune ti girano intorno. Quelle vicine dello stesso elemento <em>risuonano</em>: tre di fila accendono un Risveglio che cambia le regole della partita.</p>' +
      '<div class="legend elrow">' + chips + '</div>' +
      '<div class="cta">' +
      '<button class="btn primary clip" data-a="go"><span class="face">Gioca</span></button>' +
      '<div class="btnrow">' +
      '<button class="btn ghost clip" data-a="guide"><span class="face">Guida</span></button>' +
      '<button class="btn ghost clip" data-a="hub"><span class="face">Osservatorio</span></button>' +
      '</div></div>' +
      '<div class="hint">Record ' + best + ' · ' + (SAVE.wins || 0) + ' vittorie · <b style="color:#ffc857">' + SAVE.shards + '</b> frammenti</div>' +
      (STORE_OK ? '' : '<div class="warn clip">Questo browser non concede memoria: i progressi durano solo finché la scheda resta aperta. Nell’Osservatorio trovi il codice di backup.</div>') +
      '</div>'
    );
  },

  guide() {
    const legend = ELKEYS.map(e => '<span class="el clip" style="--c:' + EL[e].c + '"><b></b>' + EL[e].n + '</span>').join('');
    this.open('guide',
      '<h2 class="ttl">Come si gioca</h2>' +
      '<div class="frame clip" style="max-width:600px;margin:0 auto"><div class="inner clip" style="padding:18px 20px;display:flex;flex-direction:column;gap:14px">' +
      '<div><div class="eyebrow" style="text-align:left">Comandi</div><p class="sub" style="text-align:left;margin-top:6px">Trascina ovunque sullo schermo per muoverti: la levetta compare sotto il dito, con la destra o con la sinistra. Da tastiera <kbd>WASD</kbd> o le frecce, <kbd>Esc</kbd> per la pausa. Le rune sparano da sole: l’unica cosa che fai con le mani è schivare.</p></div>' +
      '<div><div class="eyebrow" style="text-align:left">L’anello</div><p class="sub" style="text-align:left;margin-top:6px">Ogni livello scegli una runa e <em style="color:#ece8ff;font-style:normal">dove metterla</em> nell’anello. Due rune adiacenti compatibili guadagnano <b style="color:#fff">+30% danno ciascuna</b>. L’Iride fa da ponte fra elementi diversi.</p></div>' +
      '<div><div class="eyebrow" style="text-align:left">Risvegli</div><p class="sub" style="text-align:left;margin-top:6px">Tre rune dello stesso elemento in fila accendono un Risveglio che vale per <em style="color:#ece8ff;font-style:normal">tutti</em> i tuoi colpi. A cinque e a sette di fila diventa più forte.</p><div class="legend" style="margin-top:10px">' + legend + '</div></div>' +
      '<div><div class="eyebrow" style="text-align:left">Sopravvivere</div><p class="sub" style="text-align:left;margin-top:6px">Cinque guardiani nell’arco di venti minuti. Gli scrigni dorati regalano potenziamenti. I frammenti restano fra una partita e l’altra: spendili nell’Osservatorio.</p></div>' +
      '</div></div>' +
      '<button class="btn clip" style="max-width:280px;margin:0 auto" data-a="title"><span class="face">Indietro</span></button>'
    );
  },

  /* ── osservatorio ───────────────────────────────────────── */
  hub() {
    const chars = CHARS.map(c => {
      const own = SAVE.chars.indexOf(c.id) >= 0, on = SAVE.char === c.id;
      return '<button class="ch clip' + (on ? ' on' : '') + (own ? '' : ' locked') + '" data-a="char" data-id="' + c.id + '"><span class="face">' +
        '<span class="av" style="--c:' + c.c + '"></span>' +
        '<span class="nm">' + c.n + '</span>' +
        '<span class="ds">' + c.d + '</span>' +
        (own ? '' : '<span class="lk">' + shardIcon() + c.cost + '</span>') +
        '</span></button>';
    }).join('');
    const ups = META.map(m => {
      const lv = mlv(m.id), max = lv >= m.max, cost = metaCost(m, lv);
      const poor = !max && SAVE.shards < cost;
      return '<button class="up clip' + (max ? ' max' : '') + (poor ? ' poor' : '') + '" data-a="meta" data-id="' + m.id + '"><span class="face">' +
        '<span class="ico clip">' + svg(m.ico) + '</span>' +
        '<span><span class="nm">' + m.n + ' <span style="color:#6a6199">' + lv + '/' + m.max + '</span></span><span class="ds">' + m.d + '</span></span>' +
        '<span class="cost' + (max ? ' done' : '') + '">' + (max ? 'MAX' : shardIcon() + cost) + '</span>' +
        '</span></button>';
    }).join('');
    this.open('hub',
      '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap">' +
      '<h2 class="ttl" style="text-align:left">Osservatorio</h2>' +
      '<div class="reward">' + shardIcon() + SAVE.shards + '</div></div>' +
      '<div class="eyebrow" style="text-align:left">Nucleo</div>' +
      '<div class="chars">' + chars + '</div>' +
      this.ascHTML() +
      '<div class="eyebrow" style="text-align:left;margin-top:4px">Potenziamenti permanenti</div>' +
      '<div class="grid2">' + ups + '</div>' +
      '<div class="btnrow" style="max-width:420px;margin:8px auto 0">' +
      '<button class="btn ghost clip" data-a="title"><span class="face">Indietro</span></button>' +
      '<button class="btn primary clip" data-a="start"><span class="face">Inizia</span></button>' +
      '</div>' +
      (STORE_OK ? '' : '<div class="warn clip" style="max-width:none">Questo browser non concede memoria al gioco: senza backup i progressi si perdono chiudendo la scheda.</div>') +
      '<details class="backup"><summary>Backup dei progressi</summary>' +
      '<p class="hint" style="text-align:left;margin:0 0 8px">Il codice contiene frammenti, potenziamenti, nuclei e record. Conservalo per spostare i progressi su un altro dispositivo o per recuperarli se il browser cancella i dati del sito.</p>' +
      '<textarea id="savecode" readonly rows="3" spellcheck="false">' + exportSave() + '</textarea>' +
      '<div class="btnrow" style="margin-top:8px">' +
      '<button class="btn ghost clip" data-a="copy"><span class="face">Copia codice</span></button></div>' +
      '<input id="loadcode" placeholder="Incolla qui un codice da ripristinare" spellcheck="false" autocomplete="off">' +
      '<div class="btnrow"><button class="btn ghost clip" data-a="import"><span class="face">Ripristina</span></button></div>' +
      '</details>'
    );
  },

  /* ── ascensioni ─────────────────────────────────────────── */
  ascHTML() {
    const max = SAVE.asc | 0, sel = Math.min(SAVE.ascSel | 0, max);
    if (max === 0 && !SAVE.wins) {
      return '<div class="eyebrow" style="text-align:left;margin-top:4px">Ascensione</div>' +
        '<div class="hint" style="text-align:left">Vinci una partita per sbloccare il primo livello. Ogni livello aggiunge una regola nuova, e le regole si sommano.</div>';
    }
    let pips = '';
    for (let i = 0; i <= ASC.length - 1; i++) {
      const bloc = i > max;
      pips += '<button class="asc' + (i === sel ? ' on' : '') + (bloc ? ' lock' : '') + '"' +
        (bloc ? ' disabled' : ' data-a="asc" data-i="' + i + '"') + '>' + i + '</button>';
    }
    const attive = [];
    for (let i = 1; i <= sel; i++) attive.push('<li>' + ASC[i].d + '</li>');
    return '<div class="eyebrow" style="text-align:left;margin-top:4px">Ascensione ' + sel + ' di ' + (ASC.length - 1) + '</div>' +
      '<div class="ascrow">' + pips + '</div>' +
      (attive.length
        ? '<ul class="ascrules">' + attive.join('') + '</ul>'
        : '<div class="hint" style="text-align:left">Nessuna regola aggiuntiva. Vinci per sbloccare il livello successivo.</div>');
  },

  /* ── anello (compatto, informativo) ─────────────────────── */
  ringHTML(interactive, highlight) {
    const n = G.slots, R = 35;
    let arcs = '';
    for (let i = 0; i < n; i++) {
      const a = G.ring[i], b = G.ring[(i + 1) % n];
      if (!a || !b || !compat(a, b)) continue;
      const el = a.el === 'iride' ? b.el : a.el;
      const a1 = -PI / 2 + i / n * TAU, a2 = -PI / 2 + (i + 1) / n * TAU;
      arcs += '<path d="' + ARC(R, a1, a2) + '" fill="none" stroke="' + EL[el].c + '" stroke-width="2.4" stroke-linecap="round" opacity=".85"/>';
    }
    /* in collocazione: evidenzio gli alloggiamenti che creerebbero risonanza */
    const pel = this.placing ? RUNES[this.placing].el : null;
    const fits = x => !!x && (x.el === pel || x.el === 'iride' || pel === 'iride');
    let slots = '';
    for (let i = 0; i < n; i++) {
      const r = G.ring[i], a = -PI / 2 + i / n * TAU;
      const x = 50 + Math.cos(a) * R, y = 50 + Math.sin(a) * R;
      let c = r ? EL[r.el].c : '#6a6199';
      let good = '';
      if (pel && !r && (fits(G.ring[(i - 1 + n) % n]) || fits(G.ring[(i + 1) % n]))) { good = ' good'; c = EL[pel].c; }
      /* un alloggiamento vuoto deve gridare "qui", non essere un contorno
         tratteggiato appena percepibile su fondo nero */
      /* stato di trasformazione: senza dirlo, la regola posizionale resta
         invisibile e la trasformazione non capita mai */
      let evoCls = '';
      if (r && EVO[r.id]) evoCls = canEvolve(r) ? ' pronto' : (r.lv >= 8 ? ' vicino' : '');
      const vuoto = !r;
      const dentro = r ? svg(r.id)
        : '<svg viewBox="0 0 24 24" class="plus" aria-hidden="true"><path d="M12 7v10M7 12h10"/></svg>';
      slots += '<button class="slot' + (vuoto ? ' empty' : '') + good + evoCls + (this.sel === i ? ' sel' : '') + (highlight === i ? ' sel' : '') + (vuoto && pel ? ' aperto' : '') + '"' +
        (interactive ? ' data-a="slot" data-i="' + i + '"' : ' disabled tabindex="-1"') +
        ' style="left:' + x.toFixed(2) + '%;top:' + y.toFixed(2) + '%;--c:' + c + '">' +
        '<span class="in clip" style="--c:' + c + '">' + dentro + '</span>' +
        (r && r.lv > 1 ? '<span class="lv" style="--c:' + c + '">' + r.lv + '</span>' : '') +
        '</button>';
    }
    let aw = 0; for (const e of ELKEYS) if (G.awaken[e]) aw++;
    return '<div class="ringwrap">' +
      '<svg class="arcs" viewBox="0 0 100 100"><circle cx="50" cy="50" r="' + R + '" fill="none" stroke="rgba(158,138,255,.16)" stroke-width="1"/>' + arcs + '</svg>' +
      '<div class="ringcore"><div><div class="n">' + aw + '</div><div class="l">RISVEGLI</div></div></div>' +
      slots + '</div>';
  },

  /* Cosa manca per trasformare. È l'informazione più importante dell'anello
     e non era scritta da nessuna parte: senza, la regola posizionale resta
     un segreto e la trasformazione non capita mai. */
  evoLine() {
    const parts = [];
    for (const r of G.ring) {
      if (!r || !EVO[r.id]) continue;
      const nome = RUNES[r.id].n, col = EL[r.el].c;
      if (canEvolve(r)) { parts.push('<b style="color:' + col + '">' + nome + ' può trasformarsi</b>'); continue; }
      if (r.lv < 8) continue;
      const manca = [];
      if (r.res < 2) manca.push('rune compatibili su <b>entrambi</b> i lati');
      if (!G.awaken[r.el]) manca.push('il Risveglio ' + EL[r.el].aw);
      parts.push('<span style="color:' + col + '">' + nome + '</span> è al massimo: manca ' + manca.join(' e '));
    }
    return parts.join('<br>');
  },

  awakeLine() {
    const parts = [];
    for (const e of ELKEYS) { const t = G.awaken[e]; if (t) parts.push('<span style="color:' + EL[e].c + '">' + EL[e].aw + ' ' + 'I'.repeat(t) + '</span>'); }
    return parts.length ? parts.join(' · ') : '<span style="color:#6a6199">Nessun risveglio attivo</span>';
  },

  /* ── scelta potenziamento ───────────────────────────────── */
  levelup(chest) {
    this.chestMode = !!chest;
    const ch = rollChoices(3);
    this.choices = ch;
    const cards = ch.map((c, i) => this.cardHTML(c, i)).join('');
    this.open('level',
      '<div class="eyebrow">' + (chest ? 'Scrigno stellare' : 'Livello ' + G.level) + '</div>' +
      '<h2 class="ttl">' + (chest ? 'Un dono dal vuoto' : 'Il nucleo cresce') + '</h2>' +
      '<div id="cards">' + cards + '</div>' +
      '<div class="hint" style="margin-top:2px">' + this.awakeLine() + (this.evoLine() ? '<br>' + this.evoLine() : '') + '</div>' +
      '<button class="btn ghost clip" style="max-width:280px;margin:0 auto" data-a="ringedit"><span class="face">Riordina l’anello</span></button>'
    );
  },

  cardHTML(c, i) {
    if (c.t === 'evo') {
      const from = RUNES[c.id], to = RUNES[c.to], el = EL[to.el];
      return '<button class="card evo clip" data-a="pick" data-i="' + i + '" style="--c:' + el.c + '"><span class="face">' +
        '<span class="newtag" style="--c:' + el.c + '">TRASFORMA</span>' +
        '<span class="ico clip">' + svg(c.to) + '</span><span class="body">' +
        '<span class="kicker">' + from.n + ' → ' + to.n + '</span><h3>' + to.n + '</h3><p>' + to.d + '</p>' +
        '</span></span></button>';
    }
    if (c.t === 'gold') {
      return '<button class="card clip" data-a="pick" data-i="' + i + '" style="--c:#ffc857"><span class="face">' +
        '<span class="ico clip">' + svg('frammento') + '</span><span class="body">' +
        '<span class="kicker">Tesoro</span><h3>Frammenti</h3><p>Ottieni <em>120 frammenti</em> da spendere nell’Osservatorio.</p>' +
        '</span></span></button>';
    }
    if (c.t === 'pas') {
      const d = PASSIVES[c.id], lv = G.passives[c.id] | 0;
      let pips = ''; for (let k = 0; k < d.max; k++) pips += '<i class="' + (k < lv + 1 ? 'f' : '') + '"></i>';
      return '<button class="card clip" data-a="pick" data-i="' + i + '" style="--c:' + d.c + '"><span class="face">' +
        '<span class="ico clip">' + svg(d.ico) + '</span><span class="body">' +
        '<span class="kicker">Passivo · liv ' + (lv + 1) + '</span><h3>' + d.n + '</h3><p><em>' + d.d + '</em></p>' +
        '<span class="pips">' + pips + '</span></span></span></button>';
    }
    const d = RUNES[c.id], el = EL[d.el];
    const isNew = c.t === 'rnew';
    const cur = isNew ? 0 : (G.ring.find(r => r && r.id === c.id) || { lv: 0 }).lv;
    let pips = ''; for (let k = 0; k < 8; k++) pips += '<i class="' + (k < cur + 1 ? 'f' : '') + '"></i>';
    const detail = isNew ? d.d : this.upgradeText(c.id, cur);
    /* quante rune di questo elemento ho già: è l'informazione che guida verso un Risveglio */
    let same = 0;
    for (const r of G.ring) if (r && r.id !== c.id && (r.el === d.el || r.el === 'iride' || d.el === 'iride')) same++;
    const kick = d.el === 'iride'
      ? 'Iride · ponte fra elementi'
      : el.n + ' · ' + d.tag + (same ? ' · <b style="color:' + el.c + '">' + same + ' nell’anello</b>' : '');
    return '<button class="card clip" data-a="pick" data-i="' + i + '" style="--c:' + el.c + '"><span class="face">' +
      (isNew ? '<span class="newtag" style="--c:' + el.c + '">NUOVA</span>' : '') +
      '<span class="ico clip">' + svg(c.id) + '</span><span class="body">' +
      '<span class="kicker">' + kick + '</span><h3>' + d.n + '</h3><p>' + detail + '</p>' +
      '<span class="pips">' + pips + '</span></span></span></button>';
  },

  upgradeText(id, lv) {
    const d = RUNES[id], g = d.g || {}, bits = [];
    const lbl = { dmg: 'danno', cd: 'ricarica', count: 'proiettili', area: 'area', spd: 'velocità', pierce: 'perforazione', dur: 'durata', size: 'raggio', heal: 'cura' };
    for (const k in g) {
      if (!g[k]) continue;
      if (k === 'count' || k === 'pierce') {
        const a = Math.floor(d.base[k] + g[k] * (lv - 1)), b = Math.floor(d.base[k] + g[k] * lv);
        if (b > a) bits.push('+1 ' + lbl[k]);
      } else if (k === 'cd') bits.push('ricarica più rapida');
      else if (k === 'dmg') bits.push('+' + Math.round(g[k] / d.base.dmg * 100) + '% danno');
      else if (bits.length < 3) bits.push('+' + lbl[k]);
    }
    return '<em>Livello ' + (lv + 1) + '</em> · ' + bits.slice(0, 3).join(', ') + '.';
  },

  /* ── editor dell’anello ─────────────────────────────────── */
  ringEdit(placing) {
    this.placing = placing || null; this.sel = -1;
    const t = this.placing
      ? 'Scegli dove collocare <span style="color:' + EL[RUNES[this.placing].el].c + '">' + RUNES[this.placing].n + '</span>'
      : 'Tocca due rune per scambiarle';
    this.open('ring',
      '<div class="eyebrow">Anello · ' + G.slots + ' alloggiamenti</div>' +
      '<h2 class="ttl">' + (this.placing ? 'Collocazione' : 'Riordina') + '</h2>' +
      '<p class="sub" style="margin-top:-8px">' + t + '</p>' +
      this.ringHTML(true) +
      '<div class="hint" id="ringinfo">' + this.awakeLine() + (this.evoLine() ? '<br>' + this.evoLine() : '') + '</div>' +
      (this.placing ? '' : '<button class="btn primary clip" style="max-width:280px;margin:0 auto" data-a="ringdone"><span class="face">Fatto</span></button>')
    );
  },
  refreshRing() {
    const w = SCR.querySelector('.ringwrap');
    if (w) w.outerHTML = this.ringHTML(true);
    const inf = SCR.querySelector('#ringinfo');
    if (inf) inf.innerHTML = this.awakeLine() + (this.evoLine() ? '<br>' + this.evoLine() : '');
  },

  /* ── pausa ──────────────────────────────────────────────── */
  togglePause() {
    if (G.state === 'play') { G.state = 'pause'; this.pause(); }
    else if (G.state === 'pause') { G.state = 'play'; this.close(); }
  },
  pause() {
    this.open('pause',
      '<div class="eyebrow">Pausa</div><h2 class="ttl">' + fmtTime(G.t) + '</h2>' +
      this.ringHTML(false) +
      '<div class="hint">' + this.awakeLine() + '</div>' +
      '<div class="hint">' + (isCoarse()
        ? 'Trascina ovunque per muoverti · le rune sparano da sole'
        : '<kbd>WASD</kbd> o frecce per muoverti · <kbd>Esc</kbd> pausa · le rune sparano da sole') + '</div>' +
      '<div style="display:flex;flex-direction:column;gap:9px;max-width:340px;margin:0 auto">' +
      '<button class="btn primary clip" data-a="resume"><span class="face">Riprendi</span></button>' +
      '<button class="btn clip" data-a="ringedit2"><span class="face">Riordina l’anello</span></button>' +
      '<div class="btnrow">' +
      '<button class="btn ghost clip" data-a="sfx"><span class="face">Suoni ' + (SAVE.sfx ? 'ON' : 'OFF') + '</span></button>' +
      '<button class="btn ghost clip" data-a="mus"><span class="face">Musica ' + (SAVE.mus ? 'ON' : 'OFF') + '</span></button>' +
      '</div>' +
      '<button class="btn ghost clip" data-a="quit"><span class="face">Abbandona</span></button>' +
      '</div>'
    );
  },

  /* ── fine partita ───────────────────────────────────────── */
  end(win, gained) {
    const stats = [['TEMPO', fmtTime(G.t)], ['LIVELLO', G.level], ['ELIMINAZIONI', G.kills], ['DANNO', Math.round(G.dmgDone).toLocaleString('it-IT')]];
    this.open('end',
      '<div class="eyebrow">' + (win ? 'Eclissi dissolta' : 'Il nucleo si spegne') + '</div>' +
      '<h1 class="logo" style="font-size:clamp(38px,11vw,72px)">' + (win ? 'VITTORIA' : 'FINE') + '</h1>' +
      '<div class="stats">' + stats.map(s => '<div class="stat"><div class="v">' + s[1] + '</div><div class="k">' + s[0] + '</div></div>').join('') + '</div>' +
      '<div class="reward">' + shardIcon() + '+' + gained + '</div>' +
      this.ringHTML(false) +
      '<div class="hint">' + this.awakeLine() + '</div>' +
      '<div style="display:flex;flex-direction:column;gap:9px;max-width:340px;margin:0 auto">' +
      (win ? '<button class="btn primary clip" data-a="endless"><span class="face">Continua senza fine</span></button>' : '') +
      '<button class="btn ' + (win ? '' : 'primary ') + 'clip" data-a="retry"><span class="face">Rigioca</span></button>' +
      '<div class="btnrow">' +
      '<button class="btn ghost clip" data-a="hub"><span class="face">Osservatorio</span></button>' +
      '<button class="btn ghost clip" data-a="title"><span class="face">Menu</span></button>' +
      '</div></div>'
    );
  }
};

/* ── generazione delle scelte ───────────────────────────────── */
function rollChoices(n) {
  const pool = [];
  const inRing = G.ring.filter(Boolean);
  let empty = false;
  for (let i = 0; i < G.slots; i++) if (!G.ring[i]) empty = true;
  /* Con l'anello mezzo vuoto le rune nuove hanno la precedenza: senza rune
     adiacenti non esistono risonanze né Risvegli, cioè manca il gioco. */
  /* una trasformazione disponibile domina le altre carte: è il momento
     che ripaga tutta la pianificazione dell'anello, non va sprecato */
  for (const r of inRing) if (canEvolve(r)) pool.push({ t: 'evo', id: r.id, to: EVO[r.id], w: 26 });
  const vuoti = G.slots - inRing.length;
  const wNew = 3.6 + vuoti * 1.3;
  for (const r of inRing) if (r.lv < 8) pool.push({ t: 'rup', id: r.id, w: 3.4 });
  if (empty) for (const id of RUNEIDS) {
    if (inRing.some(r => r.id === id)) continue;
    pool.push({ t: 'rnew', id, w: id === 'iride' ? wNew * .55 : wNew });
  }
  for (const id of PASSIDS) { const lv = G.passives[id] | 0; if (lv < PASSIVES[id].max) pool.push({ t: 'pas', id, w: 2.5 }); }
  const out = [];
  let total = 0; for (const o of pool) total += o.w;
  while (out.length < n && pool.length) {
    let r = Math.random() * total, k = 0;
    for (; k < pool.length - 1; k++) { r -= pool[k].w; if (r <= 0) break; }
    total -= pool[k].w; out.push(pool.splice(k, 1)[0]);
  }
  while (out.length < n) out.push({ t: 'gold' });
  return out;
}

function applyChoice(c) {
  if (c.t === 'evo') {
    const i = G.ring.findIndex(x => x && x.id === c.id);
    if (i >= 0) {
      const el = RUNES[c.to].el;
      G.ring[i] = { id: c.to, el, lv: 5, cd: 0, res: 0, slot: i, st: {} };
      recalcRing(true);
      UI.toast('TRASFORMAZIONE', RUNES[c.to].n, EL[el].c);
      AU.play('awake'); G.shake = Math.max(G.shake, 16); G.hitstop = .12;
      G.zones.push({ k: 'ring', x: G.p.x, y: G.p.y, r0: 10, r1: 460, t: 0, dur: .7, c: EL[el].c });
    }
    return false;
  }
  if (c.t === 'gold') { G.shards += 120; UI.toast('+120', 'Frammenti', '#ffc857'); return false; }
  if (c.t === 'pas') {
    G.passives[c.id] = (G.passives[c.id] | 0) + 1;
    recalc(); UI.toast(PASSIVES[c.id].n, PASSIVES[c.id].d, PASSIVES[c.id].c);
    return false;
  }
  if (c.t === 'rup') {
    const r = G.ring.find(x => x && x.id === c.id);
    if (r) { r.lv++; UI.toast(RUNES[c.id].n + ' ' + r.lv, 'Potenziata', EL[r.el].c); }
    recalcRing(true);
    return false;
  }
  return true; /* rnew → richiede collocazione */
}

function placeRune(id, slot) {
  G.ring[slot] = { id, el: RUNES[id].el, lv: 1, cd: rand(.3), res: 0, slot, st: {} };
  recalcRing(true);
  AU.play('buy');
}

/* ── ciclo di partita ───────────────────────────────────────── */
function resetRun(charId) {
  const c = CHARS.find(x => x.id === charId) || CHARS[0];
  G.char = c;
  G.ascLv = Math.min(SAVE.ascSel | 0, SAVE.asc | 0, ASC.length - 1);
  G.asc = ascMods(G.ascLv);
  G.slots = Math.max(4, 6 + mlv('orbita') + G.asc.slots);
  G.ring = new Array(G.slots).fill(null);
  G.passives = {};
  G.enemies.length = 0; G.bullets.length = 0; G.ebul.length = 0; G.gems.length = 0;
  G.zones.length = 0; G.parts.length = 0; G.floats.length = 0; G.drops.length = 0;
  G.t = 0; G.level = 1; G.xp = 0; G.xpNeed = xpFor(1); G.kills = 0; G.shards = 0;
  G.dmgDone = 0; G.pending = 0; G.spawnAcc = 0; G.eliteT = 26; G.bossIdx = 0; G.boss = null;
  G.diff = 0; G.gemT = 1.5; G.ev = null; G.evT = 70; G.shake = 0; G.hitstop = 0; G.victory = false; G.healCd = 0; G.ringRot = 0;
  G.awaken = { fuoco: 0, gelo: 0, fulmine: 0, vuoto: 0, luce: 0 };
  G.p.x = 0; G.p.y = 0; G.p.vx = 0; G.p.vy = 0; G.p.inv = 1.2; G.p.hurt = 0;
  G.cam.x = 0; G.cam.y = 0;
  G.revives = mlv('rinascita');
  G.demo = false;
  hideMoveHint();
  P.hp = undefined; recalc(); P.hp = P.maxHp * G.asc.startHp;
  placeRune(c.start, 0);
  recalcRing(false);
  UI.renderAwake();
}
function startRun(charId) {
  AU.init();
  resetRun(charId);
  HUD.classList.add('on');
  UI.close(); G.state = 'play';
  UI.hud();
  showMoveHint();
  SAVE.runs = (SAVE.runs | 0) + 1; storeSave();
}
function payout() {
  const asc = 1 + (G.ascLv || 0) * .18;   /* salire di ascensione deve convenire */
  const g = Math.round((G.kills * .5 + G.t * .85 + G.level * 9 + (G.victory ? 700 : 0)) * P.shardMul * asc) + G.shards;
  return Math.max(1, g);
}
function endRun(win) {
  const g = payout();
  SAVE.shards += g;
  if (G.t > (SAVE.best || 0)) SAVE.best = Math.floor(G.t);
  if (G.kills > (SAVE.bestKills || 0)) SAVE.bestKills = G.kills;
  if (win) {
    SAVE.wins = (SAVE.wins | 0) + 1;
    /* si sblocca il livello dopo solo vincendo al proprio massimo:
       non si scala l'ascensione rigiocando quelle facili */
    if (G.ascLv >= (SAVE.asc | 0) && SAVE.asc < ASC.length - 1) {
      SAVE.asc = G.ascLv + 1; SAVE.ascSel = SAVE.asc;
      setTimeout(() => UI.toast('ASCENSIONE ' + SAVE.asc, ASC[SAVE.asc].d, '#ffc857'), 800);
    }
  }
  storeSave();
  G.state = 'over';
  HUD.classList.remove('on');
  AU.play(win ? 'level' : 'die');
  UI.end(win, g);
}
function winRun() {
  if (G.victory) return;
  G.victory = true;
  G.zones.push({ k: 'ring', x: G.p.x, y: G.p.y, r0: 10, r1: 1200, t: 0, dur: 1, c: '#ffffff' });
  setTimeout(() => { if (G.state === 'play') endRun(true); }, 900);
}

/* ── azioni dell’interfaccia ────────────────────────────────── */
SCR.addEventListener('click', ev => {
  const b = ev.target.closest('[data-a]'); if (!b) return;
  const a = b.dataset.a;
  AU.init();
  if (a !== 'slot') AU.play('ui');
  switch (a) {
    case 'go': case 'hub': UI.hub(); break;
    case 'title': UI.title(); break;
    case 'guide': UI.guide(); break;
    case 'start': startRun(SAVE.char); break;
    case 'retry': startRun(SAVE.char); break;
    case 'resume': UI.togglePause(); break;
    case 'quit': G.state = 'over'; HUD.classList.remove('on'); endRunSilent(); break;
    case 'sfx': SAVE.sfx = SAVE.sfx ? 0 : 1; storeSave(); AU.vol(); UI.pause(); break;
    case 'mus': SAVE.mus = SAVE.mus ? 0 : 1; storeSave(); AU.vol(); UI.pause(); break;
    case 'endless': G.victory = true; G.state = 'play'; HUD.classList.add('on'); UI.close(); UI.toast('SENZA FINE', 'La difficoltà cresce', '#ff3d6e'); break;
    case 'ringedit': UI.ringEdit(null); break;
    case 'ringedit2': UI.ringEdit(null); break;
    case 'ringdone': if (G.state === 'pause') UI.pause(); else if (G.pending > 0) UI.levelup(); else { UI.close(); G.state = 'play'; } break;
    case 'char': {
      const c = CHARS.find(x => x.id === b.dataset.id);
      if (SAVE.chars.indexOf(c.id) >= 0) { SAVE.char = c.id; storeSave(); UI.hub(); }
      else if (SAVE.shards >= c.cost) { SAVE.shards -= c.cost; SAVE.chars.push(c.id); SAVE.char = c.id; storeSave(); AU.play('buy'); UI.hub(); UI.toast(c.n, 'Nucleo sbloccato', c.c); }
      else UI.toast('FRAMMENTI INSUFFICIENTI', null, '#ff3d6e');
      break;
    }
    case 'asc': {
      const i = +b.dataset.i;
      if (i <= (SAVE.asc | 0)) { SAVE.ascSel = i; storeSave(); UI.hub(); }
      break;
    }
    case 'copy': {
      const ta = SCR.querySelector('#savecode'); if (!ta) return;
      ta.select(); ta.setSelectionRange(0, 99999);
      let done = false;
      try { done = document.execCommand && document.execCommand('copy'); } catch (e) { }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(ta.value).then(
          () => UI.toast('COPIATO', 'Codice negli appunti', '#6ff2c4'),
          () => { if (!done) UI.toast('SELEZIONATO', 'Copia a mano con Ctrl+C', '#ffc857'); }
        );
      } else UI.toast(done ? 'COPIATO' : 'SELEZIONATO', done ? 'Codice negli appunti' : 'Copia a mano con Ctrl+C', done ? '#6ff2c4' : '#ffc857');
      break;
    }
    case 'import': {
      const inp = SCR.querySelector('#loadcode'); if (!inp) return;
      if (!inp.value.trim()) { UI.toast('NESSUN CODICE', 'Incolla prima un codice', '#ff3d6e'); return; }
      if (importSave(inp.value)) { AU.play('buy'); UI.hub(); UI.toast('RIPRISTINATO', SAVE.shards + ' frammenti', '#6ff2c4'); }
      else UI.toast('CODICE NON VALIDO', 'Controlla di averlo copiato tutto', '#ff3d6e');
      break;
    }
    case 'meta': {
      const m = META.find(x => x.id === b.dataset.id), lv = mlv(m.id);
      if (lv >= m.max) return;
      const cost = metaCost(m, lv);
      if (SAVE.shards < cost) { UI.toast('FRAMMENTI INSUFFICIENTI', null, '#ff3d6e'); return; }
      SAVE.shards -= cost; SAVE.meta[m.id] = lv + 1; storeSave(); AU.play('buy'); UI.hub();
      break;
    }
    case 'pick': {
      const c = UI.choices[+b.dataset.i];
      const needsPlace = applyChoice(c);
      G.pending--;
      if (needsPlace) UI.ringEdit(c.id);
      else if (G.pending > 0) UI.levelup();
      else { UI.close(); G.state = 'play'; }
      break;
    }
    case 'slot': {
      const i = +b.dataset.i;
      if (UI.placing) {
        if (G.ring[i]) { UI.toast('ALLOGGIAMENTO OCCUPATO', 'Scegline uno vuoto', '#ff3d6e'); return; }
        placeRune(UI.placing, i); UI.placing = null;
        if (G.pending > 0) UI.levelup(); else { UI.close(); G.state = 'play'; }
        return;
      }
      if (UI.sel < 0) { if (!G.ring[i]) return; UI.sel = i; AU.play('ui'); }
      else if (UI.sel === i) { UI.sel = -1; }
      else {
        const t = G.ring[i]; G.ring[i] = G.ring[UI.sel]; G.ring[UI.sel] = t;
        if (G.ring[i]) G.ring[i].slot = i;
        if (G.ring[UI.sel]) G.ring[UI.sel].slot = UI.sel;
        UI.sel = -1; recalcRing(true); AU.play('buy');
      }
      UI.refreshRing();
      break;
    }
  }
});
function endRunSilent() { const g = payout(); SAVE.shards += g; if (G.t > (SAVE.best || 0)) SAVE.best = Math.floor(G.t); storeSave(); UI.end(false, g); }

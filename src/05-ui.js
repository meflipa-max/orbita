/* ═══════════════════════════════════════════════════════════════
   ORBITA — interfaccia, schermate, ciclo di partita.
   ═══════════════════════════════════════════════════════════════ */

const SCR = $('#screens'), HUD = $('#hud');
const elLv = $('#lvnum'), elLvPiu = $('#lvpiu'), elXp = $('#xpfill'), elXpLine = $('#xpline'), elHpF = $('#hpfill'), elHpG = $('#hpghost'),
  elHpT = $('#hptxt'), elClock = $('#clock'), elKills = $('#kills'), elAwake = $('#awake'),
  elFlash = $('#flash'), elToasts = $('#toasts'), elHint = $('#movehint'), elNext = $('#nextboss'), elAsc = $('#ascchip'), elNodo = $('#nodochip'),
  elCulm = $('#culm'), elPeri = $('#peri'), elCombo = $('#combo');

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

/* Si torna a giocare da una schermata sola: una schermata di carte, la
   pausa, l'anello, un briefing. In tutti questi casi il mondo era fermo e
   riparte esattamente com'era — con i nemici dove li avevi lasciati, che
   spesso vuol dire addosso — mentre il tuo pollice era su un bottone e non
   sulla levetta. Quello e' un colpo che non hai potuto evitare.
   Quindi non si riparte a velocita' piena: si riparte al 16% e si accelera
   in un secondo e mezzo. Non e' invulnerabilita' — un nemico che ti sta
   addosso ti fa male lo stesso — e' il tempo di rimettere il dito dove
   serve e decidere da che parte andare. */
const RIPRESA = 1.6;
function riprendiGioco() {
  UI.close();
  G.state = 'play';
  G.ripresa = RIPRESA;
}

function shardIcon() { return svg('frammento'); }
/* la corsa del giorno di OGGI è già stata giocata? Il record di ieri non
   conta: il seme è cambiato, quindi non è più lo stesso confronto. */
function giornoFatto() { return SAVE.giorno && SAVE.giorno.d === dataOggi() && SAVE.giorno.t > 0; }
/* Copiare un testo senza un campo gia' nella pagina: serve al risultato
   della corsa del giorno, che e' una riga sola e non un pannello. Prima il
   ripiego con execCommand, poi l'API moderna, perche' su iOS in un gesto
   utente il primo funziona e la seconda a volte no. */
function copiaTesto(t, okMsg) {
  let fatto = false;
  try {
    const ta = document.createElement('textarea');
    ta.value = t; ta.setAttribute('readonly', '');
    ta.style.position = 'fixed'; ta.style.top = '-1000px'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select(); ta.setSelectionRange(0, 99999);
    fatto = !!(document.execCommand && document.execCommand('copy'));
    document.body.removeChild(ta);
  } catch (e) { }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(t).then(
      () => UI.toast('COPIATO', okMsg, '#6ff2c4'),
      () => { if (!fatto) UI.toast('NON COPIATO', 'Il browser non lo permette', '#ffc857'); }
    );
    return true;
  }
  UI.toast(fatto ? 'COPIATO' : 'NON COPIATO', fatto ? okMsg : 'Il browser non lo permette', fatto ? '#6ff2c4' : '#ffc857');
  return fatto;
}
/* La riga da incollare a qualcuno. La corsa del giorno esiste per essere
   confrontata — stessa data, stesso seme, stessa arena, stessa
   congiunzione per chiunque la giochi — e non c'era un solo modo di
   passare il proprio risultato a un altro: l'unico punteggio comparabile
   del gioco moriva dentro al salvataggio di chi l'aveva fatto. */
function testoGiorno() {
  const g = SAVE.giorno || {};
  const c = congiunzioneDi(semeDelGiorno());
  return 'ORBITA · corsa del giorno ' + (g.d || dataOggi()) + '\n' +
    modoDi('incursione').n + ' · ' + c.n + '\n' +
    fmtTime(g.t | 0) + ' · ' + (g.k | 0) + ' eliminazioni' + (g.w ? ' · vinta' : '');
}
const ARC = (r, a1, a2) => {
  const x1 = 50 + Math.cos(a1) * r, y1 = 50 + Math.sin(a1) * r;
  const x2 = 50 + Math.cos(a2) * r, y2 = 50 + Math.sin(a2) * r;
  let d = a2 - a1; while (d < 0) d += TAU;
  return 'M' + x1.toFixed(2) + ' ' + y1.toFixed(2) + ' A ' + r + ' ' + r + ' 0 ' + (d > PI ? 1 : 0) + ' 1 ' + x2.toFixed(2) + ' ' + y2.toFixed(2);
};

const UI = {
  cur: null, sel: -1, placing: null, dissolving: false, ritemprando: false, ritSel: -1, chestMode: false,
  /* armato: cosa attende conferma ("char:lyra"); spesa: quanto e' appena
     uscito dal borsello, per farlo vedere sul contatore. */
  armato: null, spesa: 0,
  /* l'Osservatorio si ridisegna a ogni tocco: senza ricordarsi che il
     pannello Backup era aperto, si richiuderebbe in faccia a chi ci sta
     lavorando — proprio mentre conferma un azzeramento. */
  backupOpen: false,

  /* ── infrastruttura ─────────────────────────────────────── */
  open(name, html) {
    /* Ridipingere la stessa schermata non deve riportare in cima: comprare
       nell'Osservatorio faceva saltare la pagina e sembrava un difetto. */
    const vecchia = SCR.firstElementChild;
    const stessa = !!(vecchia && this.cur === name);
    const scorr = stessa ? vecchia.scrollTop : 0;
    this.cur = name;
    if (name === 'title' || name.slice(0, 3) === 'hub' || name === 'guide') {
      if (G.state !== 'menu') enterMenu();
      G.state = 'menu'; HUD.classList.remove('on');
    }
    SCR.innerHTML = '<section class="screen on' + (stessa ? ' ferma' : '') + '" data-s="' + name + '">' + html + '</section>';
    const s = SCR.firstElementChild; if (s) s.scrollTop = scorr;
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
    /* Culmine: il suo indicatore deve stare dove il pollice lo cerca e dirsi
       da solo, perché è l'unica cosa che si preme in tutta la partita. */
    if (elCulm) {
      const pieno = G.charge >= 1, att = G.culm > 0;
      /* ── i due momenti del Culmine ──────────────────────
         Il pulsante e' l'unica cosa che PREMI in tutta la partita, e i suoi
         due istanti — quando si carica e quando parte — non avevano niente
         addosso: il primo era un suono e un cambio di colore, il secondo
         proprio nulla. Qui si riconoscono i passaggi di stato e si accende
         un'animazione sola, che poi si spegne da sola: `className` viene
         riscritto a ogni fotogramma, quindi una classe CSS non basterebbe a
         far partire un fotogramma chiave una volta. */
      const stato = att ? 'attivo' : pieno ? 'pronto' : (G.charge >= .85 ? 'quasi' : 'carica');
      const ora = performance.now();
      if (stato !== this._culmSt) {
        if (stato === 'pronto') {
          this._culmFx = 'arrivo'; this._culmFxFino = ora + 900;
          /* La prima volta in assoluto: il Culmine e' l'unica abilita'
             attiva del gioco e finora si presentava da solo, con un
             pulsante che cambiava colore in un angolo. */
          /* ── una barra, due atti ─────────────────────────────
             Da quando la stessa carica si puo' spendere in due modi opposti,
             il momento in cui si riempie non e' piu' un avviso: e' una
             domanda, e va posta per intero e una volta sola. Il briefing
             vale anche per chi gioca da prima — il Culmine lo conosce, il
             Perigeo no, e senza questo non lo scoprirebbe mai. */
          if (!visto('perigeo')) this.primaVolta('perigeo'), G.briefing = 'perigeo';
          else if (!visto('culmine')) {
            this.primaVolta('culmine');
            this.toast('CULMINE PRONTO', isCoarse() ? 'Toccalo: l’anello spara tutto insieme' : 'Spazio: l’anello spara tutto insieme', '#ffe9b0');
          }
        } else if (stato === 'attivo' && this._culmSt === 'pronto') {
          this._culmFx = 'scarica'; this._culmFxFino = ora + 620;
        }
        this._culmSt = stato;
      }
      const fx = this._culmFx && ora < this._culmFxFino ? ' ' + this._culmFx : '';
      elCulm.className = 'on ' + stato + fx;
      /* con Apogeo il Culmine dura il doppio: l'anello che si svuota deve
         misurare la durata VERA, se no si svuotava a meta' e restava li'
         mentre l'effetto era ancora acceso */
      elCulm.style.setProperty('--f', att ? 1 - G.culm / (CULM_DUR * G.cg.culmDur) : clamp(G.charge, 0, 1));
      elCulm.querySelector('.lab').textContent = att ? Math.ceil(G.culm) + 's'
        : (pieno ? (isCoarse() ? 'TOCCA' : 'SPAZIO') : Math.round(G.charge * 100) + '%');
    }
    /* ── il Perigeo, nell'angolo opposto ────────────────────────────
       Stessa barra del Culmine, quindi stesso riempimento: quando sono pronti
       lo sono tutti e due, ed e' li' che comincia la scelta. Da chiuso
       l'etichetta mostra QUANTO HA TENUTO, che e' il numero da cui dipende
       l'onda del rilascio — l'unica cosa del gioco che il giocatore deve
       guardare mentre decide se resistere ancora un momento. */
    if (elPeri) {
      const pronto = G.charge >= 1, att = G.peri > 0;
      elPeri.className = 'on ' + (att ? 'attivo' : pronto ? 'pronto' : 'carica');
      elPeri.style.setProperty('--f', att ? G.peri / PERI_DUR : clamp(G.charge, 0, 1));
      const l = elPeri.querySelector('.lab');
      if (l) l.textContent = att ? (G.periAss | 0) + ' TENUTI'
        : (pronto ? (isCoarse() ? 'TOCCA' : 'MAIUSC') : Math.round(G.charge * 100) + '%');
    }
    if (elCombo) {
      if (G.combo >= 6) {
        elCombo.className = 'clip on g' + G.comboLv;
        elCombo.innerHTML = '<b>' + G.combo + '</b><small>al secondo</small>';
      } else elCombo.className = 'clip';
    }
    elLv.textContent = G.level;
    elXp.style.width = (clamp(G.xp / G.xpNeed, 0, 1) * 100) + '%';
    /* La barra puo' essere piena con un livello ancora da consegnare: i
       livelli arrivano uno per volta (vedi avanzaLivello) e l'eccesso resta
       qui. Una barra piena e ferma si legge come un inceppamento, quindi lo
       dice: pulsa finche' non ha finito di consegnare. */
    const carico = G.xp >= G.xpNeed && G.state === 'play';
    if (carico !== this._carico) { this._carico = carico; elXpLine.classList.toggle('carico', carico); }
    /* e quanti ne aspettano, sul chip del livello: vedi .lvchip i */
    const attesa = carico ? livelliInAttesa() : 0;
    if (attesa !== this._attesa) { this._attesa = attesa; elLvPiu.hidden = !attesa; elLvPiu.textContent = '+' + attesa; }
    const f = clamp(P.hp / P.maxHp, 0, 1);
    elHpF.style.transform = 'scaleX(' + f + ')';
    elHpG.style.transform = 'scaleX(' + f + ')';
    elHpT.textContent = Math.ceil(Math.max(0, P.hp)) + ' / ' + Math.round(P.maxHp);
    /* L'orologio diceva solo da quanto stai giocando. Ma una Corsa e' lunga
       venti minuti e un'Incursione otto, e quel numero — cioe' «quanto
       manca alla fine» — durante la partita non stava scritto da nessuna
       parte: il traguardo si sapeva solo dal menu, prima di partire.
       Vedere il traguardo e' meta' della ragione per cui si tiene duro
       nell'ultimo minuto. Nel senza fine sparisce, perche' li' un traguardo
       non c'e'. */
    const oro = fmtTime(G.t) + (G.victory || G.t > G.modo.len ? '' : '<i>/' + fmtTime(G.modo.len) + '</i>');
    if (oro !== this._oro) { this._oro = oro; elClock.innerHTML = oro; }
    elKills.textContent = G.kills + ' ELIMINAZIONI';
    /* il roster della partita, non la tabella globale: l'ordine si rimescola
       e l'Incursione ne salta due, quindi il prossimo nome è quello vero */
    const ob = this.obiettivo();
    elNext.className = ob.c;
    if (ob.h && ob.h !== this._ob) { this._ob = ob.h; elNext.innerHTML = ob.h; }
    if (G.ascLv > 0) { elAsc.className = 'clip on'; elAsc.textContent = 'ASCENSIONE ' + G.ascLv; }
    else elAsc.className = 'clip';
    /* La targhetta si accende solo se il Nodo ti sta davvero potenziando.
       Dentro l'aura di un elemento che non giochi non succede niente, e un
       cartello che annuncia «NODO DI FUOCO» mentre non ricevi nulla è
       esattamente il modo in cui si legge un potenziamento che non c'è.
       Chi è lì dentro lo sa già dalla scritta sul cristallo. */
    if (G.nodo && G.elAnello.has(G.nodo)) {
      elNodo.className = 'clip on';
      elNodo.style.setProperty('--c', EL[G.nodo].c);
      elNodo.innerHTML = '<i></i>NODO DI ' + EL[G.nodo].n.toUpperCase() + ' · ATTIVO';
    } else elNodo.className = 'clip';
  },

  /* ── dov'e' il traguardo ────────────────────────────────────────
     «La mia ultima partita e' durata oltre 21 minuti ma risulta che ho perso:
     perche' non l'ho vinta?» La Corsa si vince abbattendo l'ULTIMO guardiano,
     che arriva al diciottesimo minuto, e questo non stava scritto da nessuna
     parte: la sua barra in cima allo schermo era identica a quella degli altri
     quattro, e l'orologio, passati i venti minuti, smetteva perfino di
     mostrare il traguardo. Chi lo teneva a distanza per tre minuti e poi
     smetteva non aveva modo di sapere di aver lasciato li' la vittoria.
     La targhetta in alto a destra conta i guardiani che stanno per arrivare, e
     resta libera proprio da li' in poi: prima dice che quello in campo e'
     l'ultimo, poi dice che la corsa e' vinta.
     E' una funzione e non tre righe dentro hud() perche' il collaudo deve
     poter leggere la frase: l'HUD e' un elemento del DOM e da fuori non si
     rilegge. */
  obiettivo() {
    const nb = G.roster[G.bossIdx];
    if (nb && !G.boss) {
      const left = Math.max(0, Math.max(45, nb.t + G.asc.boss + G.cg.boss) - G.t);
      return { c: left < 25 ? 'on soon' : 'on', h: '<i></i>' + nb.n + ' ' + fmtTime(left) };
    }
    if (!G.victory && G.bosses.some(b => b.boss && b.boss.fine))
      return { c: 'on soon', h: '<i></i>ULTIMO · ABBATTILO E HAI VINTO' };
    if (G.victory) return { c: 'on', h: '<i></i>CORSA VINTA · SENZA FINE' };
    return { c: '', h: '' };
  },

  /* Le targhette dei Risvegli, in basso a sinistra. Leggevano G.awaken, cioe'
     il grado BASE costruito con l'anello, e non G.awk, cioe' quello che
     infligge davvero danno: il Culmine ALZA DI UN GRADO ogni Risveglio
     acceso — e' meta' del suo effetto, ed e' la ragione per cui premia chi
     l'anello l'ha costruito bene — e a schermo non se ne vedeva traccia da
     nessuna parte. Adesso il grado in piu' e' una tacca bianca che si
     accende per i cinque secondi e mezzo in cui c'e'. */
  renderAwake() {
    let h = '';
    for (const e of ELKEYS) {
      const base = G.awaken[e]; if (!base) continue;
      const eff = Math.max(base, G.awk[e] | 0);
      let pips = '';
      for (let i = 0; i < eff; i++) pips += i < base ? '<i></i>' : '<i class="su"></i>';
      h += '<div class="awchip clip' + (eff > base ? ' su' : '') + '" style="color:' + EL[e].c + '">' + EL[e].aw +
        '<span class="pips">' + pips + '</span></div>';
    }
    /* A una runa dal Risveglio non c'era nessun segnale, ed e' l'informazione
       piu' azionabile del gioco: «eri a due rune di Fuoco di fila su tre, una
       in piu' e la partita cambiava» e' quello che la diagnosi dice a fine
       partita a chi non ci e' mai arrivato — cioe' quando non serve piu'.
       Stava solo nella schermata delle carte, a gioco fermo. Una targhetta
       sola e tratteggiata, e solo quando manca davvero una runa: due o tre
       sarebbero rumore. */
    const c0 = catenaRichiesta();
    let quasi = null, lung = 0;
    for (const e of ELKEYS) {
      if (G.awaken[e]) continue;
      const run = catenaDi(e);
      if (run >= c0 - 1 && run > lung) { lung = run; quasi = e; }
    }
    if (quasi) h += '<div class="awchip verso clip" style="color:' + EL[quasi].c + '">' +
      EL[quasi].n + ' ' + lung + '/' + c0 + '</div>';
    elAwake.innerHTML = h;
  },

  /* ── titolo ─────────────────────────────────────────────── */
  /* Il seme della PROSSIMA partita, pescato dal menu invece che dall'avvio.
     Serve a una cosa sola: la congiunzione è sorteggiata dal seme, quindi
     fissandolo qui si può scriverla sotto al bottone che fa partire la
     corsa. Una regola che scopri al terzo minuto è una sorpresa; una che
     leggi prima di toccare Gioca è una scelta. */
  seme: 0,
  prossimoSeme() { return this.seme || (this.seme = newSeed()); },

  /* i due formati, come due bersagli da pollice: è la scelta che decide se
     la prima sessione conterrà una conclusione o no */
  modoHTML() {
    return '<div class="modorow">' + MODI.map(m =>
      '<button class="modo clip' + (SAVE.modo === m.id ? ' on' : '') + '" data-a="modo" data-id="' + m.id + '">' +
      '<span class="face"><span class="mn">' + m.n + '</span><span class="md">' + m.d + '</span></span></button>'
    ).join('') + '</div>';
  },

  /* la congiunzione, dichiarata. `congCard` prende la congiunzione e non
     il seme, così la stessa carta serve sia a dichiarare quella della
     PROSSIMA corsa (dal seme, nel menu) sia a ricordare quella in vigore
     in QUESTA (da G.cong, in pausa). */
  congCard(c, quale) {
    const quiete = c.id === 'quiete';
    /* La riga diceva «Vetro» e cosa fa, ma non che cosa FOSSE: un nome
       proprio mai visto, senza una categoria sopra, non si può indovinare.
       Ogni altra carta del gioco ha la sua etichetta — «EVENTO D'ARENA»,
       «IL TERRENO CONTA», «RUNA SBLOCCATA» — e questa no. E la parola da
       sola non basterebbe: quello che serve sapere è che cambia a ogni
       corsa, altrimenti sembra una statistica del tuo nucleo. */
    return '<div class="cong clip' + (quiete ? ' calma' : '') + '" style="--c:' + c.c + '">' +
      '<span class="ci clip">' + svg('congiunzione') + '</span>' +
      '<span class="ct"><span class="ck">Congiunzione · ' + (quale || 'cambia a ogni corsa') + '</span>' +
      '<b>' + c.n + '</b>' + c.d + '</span></div>';
  },
  congHTML(seed) { return this.congCard(congiunzioneDi(seed)); },

  /* ── l'ascensione, dichiarata come la congiunzione ─────────
     L'ascensione era un NUMERO: «Asc 7» nella riga di riepilogo e nella
     targhetta dell'HUD, e le regole scritte solo dentro una scheda
     dell'Osservatorio in cui non si passa per giocare. Ma il livello 7
     toglie cuori e bombe da terra — la stessa identica regola della
     Carestia, che invece sta scritta per esteso sotto al bottone che fa
     partire la corsa. Due regole uguali, una dichiarata e una no.
     E si arriva al 7 senza sceglierlo: vincendo al proprio massimo il
     livello successivo si sblocca E si auto-seleziona, quindi la partita
     dopo una vittoria cambia regole da sola. L'unico annuncio era un
     avviso che passa 800 ms dopo la schermata di fine.
     Adesso porta la stessa carta della congiunzione, nello stesso posto:
     in grassetto la regola appena aggiunta — quella che non ti aspetti —
     e di seguito le altre in vigore. */
  ascCard(lv) {
    const sel = Math.min(lv | 0, ASC.length - 1);
    if (sel <= 0) return '';
    const altre = [];
    for (let i = 1; i < sel; i++) altre.push(ASC[i].d);
    return '<div class="cong asce clip" style="--c:#ffc857">' +
      '<span class="ci clip">' + svg('ascensione') + '</span>' +
      '<span class="ct"><span class="ck">Ascensione ' + sel + ' · ' + sel +
      (sel === 1 ? ' regola in vigore' : ' regole in vigore') + '</span>' +
      '<b>' + ASC[sel].d + '</b>' + altre.join(' ') + '</span></div>';
  },
  ascCardHTML() { return this.ascCard(Math.min(SAVE.ascSel | 0, SAVE.asc | 0)); },

  /* Che partita sto per giocare. Formato, nucleo, apertura, ascensione e
     congiunzione erano cinque oggetti separati sparsi per la schermata:
     sono una cosa sola, quindi sono un blocco solo. La riga di mezzo
     porta all'Osservatorio, che è dove si cambiano davvero. */
  runcardHTML(seed) {
    const nu = CHARS.find(c => c.id === SAVE.char) || CHARS[0];
    const ap = APERTURE.find(a => a.el === SAVE.apertura) || APERTURE[0];
    const apEl = EL[ap.el] || { n: 'Iride', c: '#ff7de3' };
    const asc = Math.min(SAVE.ascSel | 0, SAVE.asc | 0);
    return '<div class="runcard clip">' +
      '<div class="seg">' + MODI.map(m =>
        '<button class="segb' + (SAVE.modo === m.id ? ' on' : '') + '" data-a="modo" data-id="' + m.id + '">' +
        '<b>' + m.n + '</b><em>' + m.d.split(' · ')[0] + '</em></button>').join('') + '</div>' +
      '<button class="runrow" data-a="hub">' +
      '<span class="pt" style="--c:' + nu.c + '">' + nu.n + '</span>' +
      '<span class="pt" style="--c:' + apEl.c + '">' + apEl.n + '</span>' +
      (asc ? '<span class="pt" style="--c:#ffc857">Ascensione ' + asc + '</span>' : '') +
      '<span class="cam">cambia</span></button>' +
      this.ascCardHTML() +
      this.congHTML(seed) +
      '</div>';
  },

  title() {
    /* il record del formato scelto: quello assoluto mescolava una Corsa da
       venti minuti con un'Incursione che ne dura otto, e all'Incursione
       mostrava un numero che quel formato non puo' raggiungere */
    const rm = (SAVE.rec && SAVE.rec[SAVE.modo]) || { t: 0 };
    const best = rm.t ? fmtTime(rm.t) : '—';
    /* Il testo di presentazione è per chi non ha mai giocato. Alla decima
       partita è duecento pixel di cose che sai già, in cima allo schermo,
       fra te e il bottone — e chi torna è esattamente la persona che
       vogliamo far tornare. */
    const nuovo = !(SAVE.runs | 0);
    /* una corsa lasciata a metà — dal pulsante «esci», o perché il telefono
       ha sfrattato la pagina — torna qui come azione principale */
    const sospesa = leggiCorsa();
    const chips = ELKEYS.map((e, i) =>
      '<span class="el clip" style="--c:' + EL[e].c + ';animation-delay:' + (.7 + i * .09).toFixed(2) + 's"><b></b>' + EL[e].n + '</span>'
    ).join('');
    this.open('title',
      '<div class="hero">' +
      '<div class="eyebrow">Sopravvivenza · Roguelite</div>' +
      '<h1 class="logo">ORBITA</h1>' +
      (nuovo
        ? '<p class="sub">Le tue rune ti girano intorno. Quelle vicine dello stesso elemento <em>risuonano</em>: tre di fila accendono un Risveglio che cambia le regole della partita.</p>' +
          '<div class="legend elrow">' + chips + '</div>'
        : '') +
      /* Tutto quello che decide la partita in un blocco, e sotto il
         bottone che la fa partire: su un telefono l'azione sta in fondo,
         dove arriva il pollice, non in mezzo allo schermo. */
      '<div class="cta">' +
      (sospesa
        ? '<button class="btn primary clip grande" data-a="riprendi"><span class="face">Riprendi · ' + fmtTime(sospesa.t) + '</span></button>' +
          '<div class="sospesa">' + modoDi(sospesa.modo).n + ' · livello ' + sospesa.level + ' · ' + sospesa.kills + ' eliminazioni' +
          '<button data-a="scorda">ricomincia</button></div>'
        : '') +
      this.runcardHTML(this.prossimoSeme()) +
      '<button class="btn ' + (sospesa ? 'clip' : 'primary clip grande') + '" data-a="go"><span class="face">' +
      (sospesa ? 'Nuova partita' : 'Gioca') + '</span></button>' +
      '<div class="btnrow tre">' +
      '<button class="btn ghost clip giorno" data-a="giorno"><span class="face">' +
      svg('giorno') + (giornoFatto() ? fmtTime(SAVE.giorno.t) : 'Del giorno') + '</span></button>' +
      '<button class="btn ghost clip" data-a="guide"><span class="face">Guida</span></button>' +
      '<button class="btn ghost clip" data-a="hub"><span class="face">Osservatorio</span></button>' +
      '</div>' +
      /* «Del giorno» non parte dal seme dichiarato qui sopra: parte da
         quello della data, che sorteggia una congiunzione tutta sua. La
         carta sopra al bottone diceva quindi una regola e il bottone ne
         faceva partire un'altra — e una corsa del giorno con la Carestia
         cominciava senza che niente, da nessuna parte, avesse mai scritto
         «niente cuori». Una riga sola: la corsa del giorno è un formato
         fisso, non ha bisogno di una seconda carta intera. */
      '<div class="giornoline">Del giorno · ' + modoDi('incursione').n + ' · <b style="--c:' +
      congiunzioneDi(semeDelGiorno()).c + '">' + congiunzioneDi(semeDelGiorno()).n + '</b>' +
      (giornoFatto() ? '<button data-a="condividi">condividi</button>' : '') + '</div>' +
      '</div>' +
      '<div class="hint">Record ' + best + ' · ' + modoDi(SAVE.modo).n + ' · ' + (SAVE.wins || 0) + ' vittorie · <b style="color:#ffc857">' + SAVE.shards + '</b> frammenti</div>' +
      (STORE_OK ? '' : '<div class="warn clip">Questo browser non concede memoria: i progressi durano solo finché la scheda resta aperta. Nell’Osservatorio trovi il codice di backup.</div>') +
      '</div>'
    );
  },

  guide() {
    /* la tabella dei Risvegli nasce dai dati veri: non può andare fuori sincrono */
    const awRows = ELKEYS.map(e =>
      '<div class="awrow" style="--c:' + EL[e].c + '">' +
      '<span class="awn">' + EL[e].aw + '</span>' +
      '<span class="awe">' + EL[e].n + '</span>' +
      '<span class="awd">' + EL[e].awd[0] + '</span></div>').join('');
    const sec = (t, body) => '<div class="gsec"><div class="eyebrow">' + t + '</div>' + body + '</div>';
    const p = s => '<p>' + s + '</p>';

    this.open('guide',
      '<h2 class="ttl">Come si gioca</h2>' +
      '<div class="frame clip guide"><div class="inner clip">' +

      sec('Comandi',
        /* <kbd>P</kbd> mette in pausa come <kbd>Esc</kbd>, e <kbd>R</kbd> sulla
           schermata di fine fa ripartire senza passare da nessun menu — il
           tempo fra una morte e la partita dopo e' la leva di ritenzione piu'
           forte del genere. Erano due tasti che il gioco ascoltava e che non
           stavano scritti in nessun punto dell'interfaccia. */
        p('Trascina ovunque sullo schermo per muoverti: la levetta compare sotto il dito, con la destra o con la sinistra. Da tastiera <kbd>WASD</kbd> o le frecce, <kbd>Esc</kbd> o <kbd>P</kbd> per la pausa, <kbd>Spazio</kbd> per il <b>Culmine</b>, <kbd>Maiusc</kbd> per il <b>Perigeo</b>, <kbd>R</kbd> sulla schermata di fine per ripartire subito. Le rune sparano da sole: tu schivi, e decidi <b>come spendere la carica</b>.')) +

      sec('Una carica, due atti',
        p('In basso c’è un indicatore che si riempie <b>uccidendo</b>. Quando è pieno hai <b>una scelta</b>, non un bottone: puoi aprire l’anello o chiuderlo, e costano tutti e due la carica intera.') +
        p('<b>Culmine</b> (a destra, <kbd>Spazio</kbd>): per ' + culmDurataIt() + ' l’anello <b>spara tutto in una volta</b>, le ricariche vanno quasi al doppio, e <b>ogni Risveglio acceso sale di un grado</b>. Non ne accende di nuovi: moltiplica quelli che hai costruito.') +
        p('<b>Perigeo</b> (a sinistra, <kbd>Maiusc</kbd>): per poco più di due secondi l’anello <b>si chiude addosso a te</b> e diventa un muro — spegne i colpi nemici e respinge la folla, <em>ma non i guardiani</em>. Il prezzo è che <b>per quei due secondi non spari</b>.') +
        p('Il Perigeo non fa danno mentre è chiuso: lo <b>accumula</b>. Ogni colpo spento e ogni nemico tenuto fuori valgono un punto — il numero sul pulsante — e riaprendosi l’anello li restituisce tutti insieme in un’onda. Per questo <b>premerlo tardi rende</b>, e premerlo per paura no.')) +

      sec('L’anello',
        p('Ogni livello scegli una runa e <em>dove metterla</em>. Due rune vicine dello stesso elemento <em>risuonano</em>: <b>+30% danno a ciascuna</b>. Lontane fra loro, zero. L’anello è <b>circolare</b>: l’ultimo alloggiamento confina col primo.')) +

      sec('Che cos’è un Risveglio',
        p(Cap(NUM_IT[CATENA_BASE]) + ' rune dello stesso elemento <b>una di fila all’altra</b> accendono un Risveglio: una regola nuova che vale per <em>tutti</em> i tuoi colpi fino a fine partita — anche quelli delle rune di altri elementi.') +
        p('Non è un potenziamento della runa: è un potere aggiunto alla partita. E se ne possono tenere accesi più d’uno insieme.') +
        '<div class="awlist">' + awRows + '</div>' +
        /* Diceva «a cinque il secondo grado, a sette il terzo»: erano le
           soglie di prima, e sette rune in fila su un anello che ne tiene
           sei non si fanno. Adesso i tre numeri escono dalla stessa
           espressione che li decide in recalcRing. */
        p('A <b>' + (CATENA_BASE + 1) + '</b> rune in fila il Risveglio sale al secondo grado, a <b>' +
          (CATENA_BASE + 2) + '</b> al terzo: stesso effetto, molto più forte.')) +

      sec('Tecniche',
        '<ol class="tips">' +
        '<li><b>Raggruppa, non alternare.</b> Con le stesse sei rune, disporle a gruppi invece che alternate vale <b>+27% di danno</b> e due Risvegli invece di nessuno.</li>' +
        '<li><b>Il numero magico è tre.</b> Due rune danno risonanza ma nessun Risveglio: la terza dello stesso elemento vale più di un potenziamento su una runa che hai già.</li>' +
        '<li><b>Chi sta in mezzo conta.</b> In una catena di tre, solo quella centrale ottiene risonanza da entrambi i lati. Mettici la runa che vuoi trasformare, o quella che picchia di più.</li>' +
        '<li><b>L’Iride dipende da cosa vuoi.</b> Sul confine fra due gruppi accende un secondo Risveglio, utile contro la folla. Dentro il tuo gruppo principale fa più danno puro, meglio contro i guardiani.</li>' +
        '<li><b>Riordinare è gratis</b>, dalla pausa, in qualsiasi momento. È spesso l’unica cosa che manca perché una runa si trasformi: l’anello ti dice <em>in quale alloggiamento spostarla</em>.</li>' +
        '<li><b>L’anello non è mai congelato.</b> Tre carte lo rimettono in gioco anche quando è pieno: <b>Dissolvi</b> libera un alloggiamento, <b>Ritempra</b> riaccorda una runa all’elemento di una vicina — o a quello della tua apertura — conservandone forma e livello, e una runa nuova può <em>prendere il posto</em> di una che non regge nessun Risveglio.</li>' +
        '<li><b>Non sei obbligato a prendere.</b> Se nessuna delle tre carte ti convince, <b>Rilancia</b> per pescarne altre tre, o <b>Salta</b>: rinunci al potenziamento ma recuperi vita e frammenti. Una runa che non vuoi ti costa un alloggiamento per sempre, quindi saltare spesso è la scelta giusta.</li>' +
        /* «Con Nadir alternare funziona» si legge come «alternare accende i
           Risvegli», e non e' vero: l'eco lunga tocca la RISONANZA (il +30%
           danno), non la catena — che resta fatta di rune una accanto
           all'altra. Chi ci costruiva sopra un anello alternato restava
           senza nemmeno un Risveglio e non poteva sapere perche'. */
        '<li><b>Nadir e Lyra ribaltano le regole.</b> Con Nadir le rune <em>risuonano</em> anche saltando un alloggiamento, quindi anche una runa isolata prende il +30%: la catena però resta fatta di rune vicine. Con Lyra ogni runa conta doppia nella catena: <b>due</b> bastano per un Risveglio, <b>tre</b> per il secondo grado.</li>' +
        '</ol>') +

      sec('Trasformazioni',
        /* Il numero era scritto a mano: 6. Ma la soglia la spostano il
           Crogiolo (reliquia) e la Fornace (congiunzione), e sogliaEvo()
           e' l'unico posto che lo sa — la scheda delle forme lo chiedeva
           gia' a lui, la guida no. Chi aveva comprato il Crogiolo leggeva
           quindi una soglia che il suo gioco non usava piu'. */
        p('Una runa a <b>livello ' + sogliaEvo() + '</b>, che risuona da <b>entrambi</b> i lati e il cui elemento è <b>risvegliato</b>, si trasforma in qualcosa di diverso. Ne ha una <b>ognuna delle sedici rune</b>, e l’anello dice sempre cosa manca — compreso in quale alloggiamento spostarla.') +
        p('L’Iride fa eccezione, perché non ha un elemento suo: si trasforma quando fa il mestiere per cui esiste, cioè quando è il <b>ponte fra due Risvegli</b> accesi insieme.')) +

      sec('Chi ti viene addosso',
        p('Quasi tutti puntano dritti al nucleo. Tre cose no.') +
        p('Il <b>Dissonante</b> non vuole la tua vita: aggancia un alloggiamento e lo tiene <em>zitto</em>. Vedi il filo che parte da lui e la runa che si spegne. Tiene le distanze apposta: per toglierlo devi smettere di mietere e andarlo a prendere. Non può mai zittire più di due rune insieme.') +
        p('Ogni tanto un gruppo arriva con una <b>forma</b>: un muro si aggira, un accerchiamento va rotto da un lato, un cuneo si schiva di fianco.') +
        p('Dal secondo guardiano in poi ognuno porta una <b>corazza elementale</b>, disegnata attorno a lui: i colpi di quell’elemento fanno metà danno. È il momento in cui una seconda catena, o un’Iride, ripaga davvero.')) +

      sec('Nodi elementali',
        p('Alcune formazioni sono <b>cristalli sintonizzati su un elemento</b>, sorteggiato a ogni partita. Restando nella loro aura le tue rune di quell’elemento fanno <b>+35% danno</b>, e la catena di quell’elemento <b>conta una runa in più</b>: due rune adiacenti bastano ad accendere il Risveglio finché sei lì.') +
        p('Il cuore del cristallo resta solido, quindi ci <em>orbiti intorno</em>. È il compromesso: tenere la posizione rende molto, ma restare fermi in mezzo alla mischia si paga.')) +

      sec('Gli asteroidi sono riparo',
        p('Gli asteroidi fermano te e i nemici, e <b>assorbono i colpi nemici</b>: quando ne bloccano uno lampeggiano nel punto d’impatto. Mettitici dietro quando il fuoco si fa fitto.') +
        p('<em>I tuoi colpi invece li attraversano</em>, ed è voluto: tu non miri, sparano le rune. E metà del tuo arsenale — aure, onde d’urto, pozze — non sarebbe comunque fermabile da un masso. Così la regola è una sola: l’asteroide è riparo tuo, non ostacolo tuo.') +
        p('<b>I guardiani li sfondano davvero</b>: un asteroide addosso a un guardiano prima si crepa e poi si sbriciola, e quel riparo non c’è più. L’unico che regge è il <b>cristallo di un Nodo</b>: quello nemmeno un guardiano te lo porta via.')) +

      sec('Il campo si adatta a te',
        p('I nemici non seguono solo il cronometro: seguono <b>quanto sei forte</b>. Il gioco misura a che distanza da te muoiono, e se li stai disintegrando prima ancora che entrino nello schermo li rende <b>più tenaci</b> — meno nemici, ognuno più duro e che vale di più — finché tornano ad arrivarti a tiro. Un nemico temprato si riconosce dal <b>bordo caldo</b>.') +
        p('Vale anche al contrario: se ti stanno addosso la stretta si allenta da sola, e sotto un terzo di vita smette del tutto. Non è una punizione per chi gioca bene — schivare resta la risposta giusta e funziona sempre — è la garanzia che nessuna build ti renda intoccabile per i venti minuti che restano.')) +

      sec('Due formati',
        p('La <b>Corsa</b> dura venti minuti e ha cinque guardiani, poi continua senza fine. L’<b>Incursione</b> ne dura otto e ne ha tre — non è la Corsa tagliata: sali di livello quasi il doppio più in fretta, le ondate scorrono più veloci e i guardiani hanno una vita loro. Vincere vale ugualmente per l’ascensione.') +
        p('Il formato si sceglie dal menu, sopra al bottone Gioca.')) +

      /* I cinque eventi stanno nel briefing che si apre la prima volta che
         ognuno compare, ma il briefing passa: la guida e' il posto in cui
         si torna a cercare una regola, e qui non c'erano. */
      sec('Eventi d’arena',
        p('Ogni novanta secondi succede qualcosa che <b>ha un luogo</b>, e non capita mai due volte di fila la stessa cosa.') +
        '<ul class="lista">' +
        '<li><b>Breccia</b> — un varco da raggiungere prima che si chiuda. Dentro c’è un premio d’esperienza.</li>' +
        '<li><b>Marea</b> — i nemici arrivano tutti da una parte sola. Il lato opposto resta sgombro.</li>' +
        '<li><b>Corriere</b> — un nemico turchese carico di bottino che <em>scappa</em>, un filo più veloce di te: tagliagli la strada.</li>' +
        '<li><b>Allineamento</b> — tre sigilli che si spengono <b>a turno</b>: il più vicino non è quasi mai il primo da prendere. Tre su tre valgono il premio pieno.</li>' +
        '<li><b>Fermata</b> — un cerchio da tenere mentre arrivano da tutte le parti. Uscire non azzera, mette in pausa.</li>' +
        '</ul>') +

      sec('Congiunzioni',
        p('Ogni corsa ne sorteggia una, ed è <b>scritta prima di partire</b>: nemici molti di più e più fragili, metà vita ma più danno, asteroidi molto più fitti, i Risvegli che chiedono una runa in meno, i guardiani quaranta secondi prima, il Culmine che dura il doppio. Una corsa su quattro è <b>Quiete</b>, cioè nessuna.') +
        p('Non è una difficoltà in più: è una domanda diversa. La stessa semenza dà sempre la stessa congiunzione, quindi «ripeti questa semenza» ripete anche quella.')) +

      sec('Il mazzo cresce',
        p('Si comincia con <b>otto rune</b> su sedici. Le altre entrano nel mazzo una alla volta, per traguardi: sopravvivere quattro minuti, accendere un Risveglio, abbattere un guardiano, portare una runa al quinto livello. L’Osservatorio dice sempre qual è la prossima e cosa chiede.')) +

      sec('Contratti',
        p('Tre obiettivi sempre in corso, e appena ne completi uno ne arriva un altro. Pagano in frammenti, e il premio cresce con l’ascensione più alta che hai raggiunto. Servono a dare una direzione alla partita di stasera quando le dodici <b>sfide</b> — che invece si prendono una volta sola — sono finite.')) +

      sec('Sopravvivere',
        p('I guardiani hanno un conto alla rovescia in alto a destra. <b>Identità e pattern ruotano a ogni partita</b>, i numeri no: puoi trovarti le cariche del Titano al secondo minuto senza che il secondo minuto sia più duro. Un guardiano abbattuto lascia uno <b>scrigno</b> — l’unica cosa che vale una carta in più — ed elite ed eventi pagano in esperienza; ogni novanta secondi succede qualcosa in un punto preciso della mappa.') +
        p('A terra cadono anche <b>cuori</b> (vita) e <b>bombe</b>: la bomba non colpisce i dintorni, <b>uccide ogni nemico della mappa</b> tranne i guardiani. Il dono più vicino porta scritto cos’è.') +
        p('I nemici con una <b>barra sopra la testa</b> — elite dorati, corrieri e guardiani — sono quelli che vale la pena finire: quella barra è la loro <b>vita</b>. La scia bianca è il danno appena inflitto, e il colore vira al rosso quando stanno per cedere. In cima allo schermo c’è la barra dei guardiani: se ne hai addosso più d’uno — gemelli compresi — si <b>divide in un tratto per ciascuno</b>, largo quanto la sua stazza, col nome dello stesso colore.') +
        p('I frammenti restano fra una partita e l’altra: spendili nell’Osservatorio in potenziamenti permanenti, nuclei e <b>reliquie</b> — quelle sono care, ma ognuna è una regola invece di una percentuale.')) +

      '</div></div>' +
      '<div style="display:flex;flex-direction:column;gap:9px;max-width:340px;margin:0 auto">' +
      '<button class="btn clip" data-a="lessico"><span class="face">Lessico · che vuol dire</span></button>' +
      '<button class="btn ghost clip" data-a="title"><span class="face">Indietro</span></button>' +
      '</div>'
    );
  },

  /* ── il lessico ─────────────────────────────────────────────────
     «Un giocatore vede apparire scritte e nomi di cose che accadono ma non
     ne capisce il significato.» Era vero e si vedeva dal codice: ogni nome
     proprio del gioco compariva dentro un avviso di due secondi in mezzo
     all'azione, e la sua spiegazione — quando c'era — stava nella guida,
     nel menu, raggiungibile solo abbandonando la partita.
     Questa schermata e' l'elenco di tutto quello che il gioco nomina, e si
     apre DALLA PAUSA: nel momento in cui uno si ferma a chiedersi cosa
     voglia dire «Torpore II». Le voci le tiene lessico() in 01-data, che le
     prende da dove le regole stanno scritte.
     Si apre anche dalla guida, e l'unico stato che tiene e' da dove si
     arriva: il bottone «Indietro» deve riportare dove si era. */
  lessicoApri(da) {
    this.lesDa = da || (G.state === 'pause' ? 'pause' : 'guide');
    const gruppi = lessico().map(g =>
      '<div class="gsec"><div class="eyebrow">' + g.t + '</div><dl class="lex">' +
      g.v.map(v => '<dt>' + v[0] + '</dt><dd>' + v[1] + '</dd>').join('') +
      '</dl></div>').join('');
    /* i cinque Risvegli con nome, elemento ed effetto: la tabella esiste
       gia' nella guida e nasce dai dati veri, quindi qui non si riscrive */
    const aw = ELKEYS.map(e =>
      '<div class="awrow" style="--c:' + EL[e].c + '">' +
      '<span class="awn">' + EL[e].aw + '</span><span class="awe">' + EL[e].n + '</span>' +
      '<span class="awd">' + EL[e].awd[0] + '</span></div>').join('');
    this.open('lessico',
      '<div class="eyebrow">Che vuol dire</div><h2 class="ttl">Lessico</h2>' +
      '<p class="sub" style="margin-top:-8px">Ogni nome che il gioco ti dice, e cosa vuol dire.</p>' +
      '<div class="frame clip guide"><div class="inner clip">' +
      '<div class="gsec"><div class="eyebrow">I cinque Risvegli</div>' +
      '<div class="awlist">' + aw + '</div></div>' +
      gruppi +
      '</div></div>' +
      '<button class="btn primary clip" style="max-width:280px;margin:0 auto" data-a="lesback"><span class="face">Indietro</span></button>'
    );
  },

  /* ── osservatorio ───────────────────────────────────────── */
  /* Due intenzioni diverse vivevano nella stessa schermata: preparare la
     partita e spendere i frammenti. Il bottone Inizia stava in fondo, dopo
     dodici sfide e nove potenziamenti, e la prima cosa che vedeva chi
     comincia erano cinque carte bloccate su sei con scritto in rosso
     quanto gli manca. Adesso sopra c'e' solo la partenza — apertura,
     nucleo, ascensione, semenza — e si gioca. Sotto la riga c'e' il
     negozio. E un elenco con una voce sola non e' una scelta: il nucleo
     compare come carte solo quando ne possiedi piu' d'uno. */
  /* ══ Osservatorio ═══════════════════════════════════════════
     Era una colonna sola alta 5259 pixel su un telefono: sette schermate,
     diciassette sezioni, sessantuno bottoni, e cinque lavori diversi
     mescolati insieme — preparare la corsa, spendere, seguire gli
     obiettivi, guardare lo storico, gestire il salvataggio. Il bottone
     Inizia stava a millecento pixel dall'alto.
     Quattro schede, e le due cose che servono sempre — quanti frammenti
     hai e far partire la corsa — restano ferme in cima e in fondo.     */
  scheda: 'partita',

  cartaNucleo(c) {
    const own = SAVE.chars.indexOf(c.id) >= 0, on = SAVE.char === c.id;
    const arm = this.armato === 'char:' + c.id, manca = c.cost - SAVE.shards;
    /* Lo stesso tocco prima selezionava (gratis) oppure comprava (caro)
       senza dirlo: il piede della carta dichiara sempre cosa succede. */
    const piede = own
      ? '<span class="lk avuto">' + (on ? 'In uso' : 'Tocca per usarlo') + '</span>'
      : arm
        ? '<span class="lk">Spendi ' + shardIcon() + c.cost + '</span>' +
          '<span class="sub arm">Tocca ancora per confermare · te ne restano ' + (SAVE.shards - c.cost) + '</span>'
        : '<span class="lk">' + shardIcon() + c.cost + '</span>' +
          (manca > 0 && SAVE.shards > 0 ? '<span class="sub caro">te ne mancano ' + manca + '</span>' : '');
    return '<button class="ch clip' + (on ? ' on' : '') + (own ? '' : ' locked') + (arm ? ' arm' : '') +
      '" data-a="char" data-id="' + c.id + '"><span class="face">' +
      '<span class="av" style="--c:' + c.c + '"></span>' +
      '<span class="nm">' + c.n + '</span>' +
      '<span class="ds">' + c.d + '</span>' +
      (c.ruleD ? '<span class="rule" style="--c:' + c.c + '">' + c.ruleD + '</span>' : '') +
      piede + '</span></button>';
  },

  /* c'è qualcosa che posso già permettermi in questa scheda? */
  pallino(scheda) {
    if (scheda === 'frammenti') {
      for (const m of META) { const lv = mlv(m.id); if (lv < m.max && SAVE.shards >= metaCost(m, lv)) return 1; }
      for (const r of RELIQUIE) if (!hasRel(r.id) && SAVE.shards >= r.c) return 1;
      for (const c of CHARS) if (SAVE.chars.indexOf(c.id) < 0 && SAVE.shards >= c.cost) return 1;
    }
    return 0;
  },

  hub(scheda) {
    if (scheda) this.scheda = scheda;
    const sc = this.scheda;
    const SCHEDE = [['partita', 'Partita'], ['frammenti', 'Frammenti'], ['obiettivi', 'Obiettivi'], ['archivio', 'Archivio']];

    const testa =
      '<div class="hubtop">' +
      '<h2 class="ttl">Osservatorio</h2>' +
      '<div class="reward' + (this.spesa ? ' spesa' : '') + '">' + shardIcon() + SAVE.shards +
      (this.spesa ? '<span class="delta">-' + this.spesa + '</span>' : '') + '</div></div>' +
      '<div class="tabs">' + SCHEDE.map(([id, n]) =>
        '<button class="tab clip' + (sc === id ? ' on' : '') + '" data-a="scheda" data-id="' + id + '">' +
        '<span class="face">' + n + (this.pallino(id) ? '<i class="pin"></i>' : '') + '</span></button>').join('') +
      '</div>';

    /* la barra in fondo: dovunque tu sia arrivato a scorrere, la corsa
       parte da qui — e dice sempre quale corsa */
    const nu = CHARS.find(c => c.id === SAVE.char) || CHARS[0];
    const apr = APERTURE.find(a => a.el === SAVE.apertura) || APERTURE[0];
    const aprEl = EL[apr.el] || { n: 'Iride', c: '#ff7de3' };
    const asc = Math.min(SAVE.ascSel | 0, SAVE.asc | 0);
    const coda =
      '<div class="hubaz">' +
      '<div class="riep">' +
      '<b style="--c:#6ff2c4">' + modoDi(SAVE.modo).n + '</b>·' +
      '<b style="--c:' + nu.c + '">' + nu.n + '</b>·' +
      '<b style="--c:' + aprEl.c + '">' + aprEl.n + '</b>' +
      (asc ? '·<b style="--c:#ffc857">Asc ' + asc + '</b>' : '') +
      '·<b style="--c:' + congiunzioneDi(this.prossimoSeme()).c + '">' + congiunzioneDi(this.prossimoSeme()).n + '</b>' +
      '</div>' +
      '<div class="btnrow">' +
      '<button class="btn ghost clip" data-a="title"><span class="face">Menu</span></button>' +
      '<button class="btn primary clip" data-a="start"><span class="face">Inizia</span></button>' +
      '</div></div>';

    let corpo = '';
    if (sc === 'partita') {
      const apCol = e => (EL[e] || { c: '#ff7de3' }).c;
      const apNome = e => (EL[e] || { n: 'Iride' }).n;
      const aprow = APERTURE.map(a =>
        '<button class="ap clip' + (SAVE.apertura === a.el ? ' on' : '') + '" style="--c:' + apCol(a.el) + '"' +
        ' data-a="apertura" data-id="' + a.el + '"><span class="face">' +
        '<span class="ico clip">' + svg(a.id) + '</span>' +
        '<span class="nm">' + apNome(a.el) + '</span><span class="ds">' + RUNES[a.id].n + '</span>' +
        '</span></button>').join('');
      const el = EL[apr.el];
      const apNota = apr.nota ? apr.nota
        : RUNES[apr.id].d + ' Tre di fila accendono <b>' + el.aw + '</b>: ' + el.awd[0].toLowerCase() + '.';
      const posseduti = CHARS.filter(c => SAVE.chars.indexOf(c.id) >= 0);
      corpo =
        '<div class="eyebrow" style="text-align:left">Formato · quanto dura</div>' +
        this.modoHTML() +
        '<div class="apnota" style="--c:#6ff2c4"><b>' + modoDi(SAVE.modo).n + '</b> · ' + modoDi(SAVE.modo).sub + '</div>' +
        '<div class="eyebrow" style="text-align:left">Apertura · da dove parti</div>' +
        '<div class="aprow">' + aprow + '</div>' +
        '<div class="apnota" style="--c:' + apCol(apr.el) + '"><b>' + RUNES[apr.id].n + '</b> · ' + apNota + '</div>' +
        '<div class="eyebrow" style="text-align:left">Nucleo · la regola</div>' +
        (posseduti.length > 1
          ? '<div class="chars">' + posseduti.map(c => this.cartaNucleo(c)).join('') + '</div>'
          : '<div class="unico"><span class="av" style="--c:' + posseduti[0].c + '"></span>' +
            '<span><b>' + posseduti[0].n + '</b> — ' + posseduti[0].d + '</span></div>') +
        this.ascHTML() +
        this.aspettoHTML() +
        '<details class="seedbox"><summary>Semenza</summary>' +
        '<div class="seedrow"><label for="seedin">Numero</label>' +
        '<input id="seedin" inputmode="numeric" autocomplete="off" spellcheck="false" placeholder="vuoto = casuale">' +
        '<span class="sh">Stesso numero, stessa partita: stesse ondate, stessi asteroidi, stesse carte, stessa congiunzione.</span></div></details>';
    } else if (sc === 'frammenti') {
      const ups = META.map(m => {
        const lv = mlv(m.id), max = lv >= m.max, cost = metaCost(m, lv);
        const poor = !max && SAVE.shards < cost;
        const arm = this.armato === 'meta:' + m.id;
        const riga = arm
          ? '<span class="ds conf">Tocca ancora: spendi ' + cost + ', te ne restano ' + (SAVE.shards - cost) + '</span>'
          : poor
            ? '<span class="ds">' + m.d + ' <span class="caro">· te ne mancano ' + (cost - SAVE.shards) + '</span></span>'
            : '<span class="ds">' + m.d + '</span>';
        return '<button class="up clip' + (max ? ' max' : '') + (poor ? ' poor' : '') + (arm ? ' arm' : '') +
          '" data-a="meta" data-id="' + m.id + '"><span class="face">' +
          '<span class="ico clip">' + svg(m.ico) + '</span>' +
          '<span><span class="nm">' + m.n + ' <span style="color:#6a6199">' + lv + '/' + m.max + '</span></span>' + riga + '</span>' +
          '<span class="cost' + (max ? ' done' : '') + '">' + (max ? 'MAX' : shardIcon() + cost) + '</span>' +
          '</span></button>';
      }).join('');
      const bloccati = CHARS.filter(c => SAVE.chars.indexOf(c.id) < 0);
      corpo =
        '<div class="eyebrow" style="text-align:left">Potenziamenti permanenti</div>' +
        '<div class="grid2">' + ups + '</div>' +
        this.reliquieHTML() +
        (bloccati.length
          ? '<div class="eyebrow" style="text-align:left;margin-top:4px">Nuclei da sbloccare</div>' +
            '<div class="chars">' + bloccati.map(c => this.cartaNucleo(c)).join('') + '</div>'
          : '');
    } else if (sc === 'obiettivi') {
      corpo = this.contrattiHTML() + this.runeHTML() + this.formeHTML() + this.sfideHTML();
    } else {
      corpo =
        (this.storicoHTML() || '<div class="hint" style="text-align:left">Nessuna partita ancora. Lo storico tiene le ultime venti.</div>') +
        (STORE_OK ? '' : '<div class="warn clip" style="max-width:none">Questo browser non concede memoria al gioco: senza backup i progressi si perdono chiudendo la scheda.</div>') +
        '<details class="backup"' + (this.backupOpen ? ' open' : '') + '><summary>Backup dei progressi</summary>' +
        '<p class="hint" style="text-align:left;margin:0 0 8px">Il codice contiene frammenti, potenziamenti, nuclei, rune e record. Conservalo per spostare i progressi su un altro dispositivo o per recuperarli se il browser cancella i dati del sito.</p>' +
        '<textarea id="savecode" readonly rows="3" spellcheck="false">' + exportSave() + '</textarea>' +
        '<div class="btnrow" style="margin-top:8px">' +
        '<button class="btn ghost clip" data-a="copy"><span class="face">Copia codice</span></button></div>' +
        '<input id="loadcode" placeholder="Incolla qui un codice da ripristinare" spellcheck="false" autocomplete="off">' +
        '<div class="btnrow"><button class="btn ghost clip" data-a="import"><span class="face">Ripristina</span></button></div>' +
        this.wipeHTML() + '</details>';
    }

    /* il nome porta la scheda: cambiando scheda si riparte dall'alto,
       ridisegnando la stessa (un acquisto) lo scorrimento resta dov'era */
    this.open('hub:' + sc, testa + corpo + coda);
    this.spesa = 0;
  },

  /* ── contratti ───────────────────────────────────────────
     Tre alla volta, e appena ne completi uno ne arriva un altro. Le sfide
     restano quello che sono — chiavi che si prendono una volta — e i
     contratti sono il motivo per la partita di stasera quando le chiavi
     sono finite. */
  contrattiHTML(compatto) {
    const righe = SAVE.contratti.map(id => {
      const c = CONTRATTI.find(x => x.id === id); if (!c) return '';
      return '<div class="sfida clip">' +
        '<span class="sn">' + c.n + '</span>' +
        '<span class="sd">' + c.d + '</span>' +
        '<span class="sr">' + shardIcon() + '+' + contrattoPremio(c) + '</span>' +
        '</div>';
    }).join('');
    return (compatto ? '' : '<div class="eyebrow" style="text-align:left;margin-top:4px">Contratti · si rinnovano</div>') +
      '<div class="sfidelist">' + righe + '</div>';
  },

  /* ── reliquie ────────────────────────────────────────────
     Il capitolo caro, e l'unico dove ogni voce è una regola invece di una
     percentuale. Sta dopo i potenziamenti perché è lì che si arriva quando
     le prime spese, quelle che devono costare poco, sono finite. */
  reliquieHTML() {
    const righe = RELIQUIE.map(r => {
      const own = hasRel(r.id);
      const poor = !own && SAVE.shards < r.c;
      const arm = this.armato === 'rel:' + r.id;
      const riga = arm
        ? '<span class="ds conf">Tocca ancora: spendi ' + r.c + ', te ne restano ' + (SAVE.shards - r.c) + '</span>'
        : poor
          ? '<span class="ds">' + r.d + ' <span class="caro">· te ne mancano ' + (r.c - SAVE.shards) + '</span></span>'
          : '<span class="ds">' + r.d + '</span>';
      return '<button class="up clip' + (own ? ' max' : '') + (poor ? ' poor' : '') + (arm ? ' arm' : '') +
        '" data-a="reliquia" data-id="' + r.id + '"><span class="face">' +
        '<span class="ico clip">' + svg(r.ico) + '</span>' +
        '<span><span class="nm">' + r.n + '</span>' + riga + '</span>' +
        '<span class="cost' + (own ? ' done' : '') + '">' + (own ? 'TUA' : shardIcon() + r.c) + '</span>' +
        '</span></button>';
    }).join('');
    return '<div class="eyebrow" style="text-align:left;margin-top:4px">Reliquie · regole, non numeri</div>' +
      '<div class="grid2">' + righe + '</div>';
  },

  /* ── rune ────────────────────────────────────────────────
     Quali sono nel mazzo e cosa chiede la prossima. Serve a rendere
     visibile una cosa che altrimenti si scoprirebbe solo per caso: che il
     mazzo cresce, e che cresce per merito. */
  runeHTML() {
    const set = SAVE.runes;
    const prossimo = SBLOCCHI.find(sb => set.indexOf(sb.id) < 0);
    const chip = id => '<span class="rn clip' + (set.indexOf(id) >= 0 ? ' on' : '') +
      '" style="--c:' + EL[RUNES[id].el].c + '" title="' + RUNES[id].n + '">' + svg(id) + '</span>';
    return '<div class="eyebrow" style="text-align:left;margin-top:4px">Rune nel mazzo · ' +
      RUNEIDS.filter(id => set.indexOf(id) >= 0).length + ' di ' + RUNEIDS.length + '</div>' +
      '<div class="runerow">' + RUNEIDS.map(chip).join('') + '</div>' +
      (prossimo
        ? '<div class="apnota" style="--c:#6ff2c4"><b>' + RUNES[prossimo.id].n + '</b> · ' + prossimo.d + '</div>'
        : '<div class="hint" style="text-align:left">Tutte le rune sono nel mazzo.</div>');
  },

  /* ── forme scoperte ─────────────────────────────────────
     Sedici trasformazioni, e nessuna traccia di quali avessi gia' visto. Una
     collezione visibile e' l'alimento piu' economico per la coda lunga: dice
     cosa c'e' ancora la' fuori senza chiudere niente dietro un muro. */
  formeHTML() {
    const righe = RUNEIDS.map(base => {
      const evo = EVO[base]; if (!evo) return '';
      const d = RUNES[evo], el = EL[d.el];
      const visto = SAVE.evoVisti.indexOf(evo) >= 0;
      return '<div class="forma clip' + (visto ? ' vista' : '') + '" style="--c:' + el.c + '">' +
        '<span class="fi clip">' + (visto ? svg(evo) : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.6v-1.2c0-1.6 2.6-2 2.6-4a2.6 2.6 0 0 0-5.2 0"/><path d="M12 18.6v.2"/></svg>') + '</span>' +
        '<span class="fb"><span class="fn">' + (visto ? d.n : '???') + '</span>' +
        '<span class="fd">' + (visto ? d.d : 'da ' + RUNES[base].n) + '</span></span></div>';
    }).join('');
    return '<div class="eyebrow" style="text-align:left;margin-top:4px">Forme scoperte · ' +
      SAVE.evoVisti.length + ' di ' + RUNEIDS.length + '</div>' +
      '<div class="hint" style="text-align:left;margin:-4px 0 2px">Ogni runa ne ha una. Livello ' +
      sogliaEvo() + ', risonanza da entrambi i lati, elemento risvegliato.</div>' +
      '<div class="formelist">' + righe + '</div>';
  },

  /* ── storico ─────────────────────────────────────────────
     Le ultime venti partite. In un gioco che non tocca la rete è l'unica
     telemetria che esista: se le corse si fermano tutte fra il sesto e
     l'ottavo minuto, è lì che c'è qualcosa da sistemare. */
  storicoHTML() {
    if (!SAVE.storico.length) return '';
    const nomi = {}; for (const c of CHARS) nomi[c.id] = c.n;
    const righe = SAVE.storico.map(r =>
      '<div class="sr' + (r.w ? ' vinta' : '') + '">' +
      '<span class="st">' + fmtTime(r.t) + '</span>' +
      '<span class="sm">' + (modoDi(r.m).n) + (r.a ? ' · asc ' + r.a : '') + '</span>' +
      '<span class="sc">' + (nomi[r.c] || r.c) + '</span>' +
      '<span class="sk">' + r.k + ' elim.</span>' +
      '<span class="sw">' + (r.w ? 'vinta' : (r.b ? r.b + ' guard.' : '—')) + '</span>' +
      '</div>').join('');
    const n = SAVE.storico.length;
    const med = Math.round(SAVE.storico.reduce((a, r) => a + r.t, 0) / n);
    return '<details class="seedbox"><summary>Storico · ultime ' + n + '</summary>' +
      '<div class="hint" style="text-align:left;margin:0 0 8px">Durata media ' + fmtTime(med) +
      ' · ' + SAVE.storico.filter(r => r.w).length + ' vinte.</div>' +
      '<div class="storico">' + righe + '</div></details>';
  },

  /* ── sfide ──────────────────────────────────────────────── */
  sfideHTML() {
    const fatte = SAVE.sfide.length;
    const righe = SFIDE.map(s => {
      const ok = SAVE.sfide.indexOf(s.id) >= 0;
      const unl = s.unlock ? (CHARS.find(c => c.id === s.unlock) || {}).n : null;
      return '<div class="sfida clip' + (ok ? ' fatta' : '') + '">' +
        '<span class="sn">' + s.n + (ok ? ' ✓' : '') + '</span>' +
        '<span class="sd">' + s.d + '</span>' +
        '<span class="sr">' + shardIcon() + '+' + s.r + (unl ? ' · sblocca ' + unl : '') + '</span>' +
        '</div>';
    }).join('');
    return '<div class="eyebrow" style="text-align:left;margin-top:4px">Sfide · ' + fatte + ' di ' + SFIDE.length + '</div>' +
      '<div class="sfidelist">' + righe + '</div>';
  },

  /* ── aspetto ─────────────────────────────────────────────
     Sta in un pannello richiudibile accanto alla Semenza, non fra le
     scelte di partenza: non cambia niente di come si gioca, e la riga
     sopra a «Inizia» deve restare quella che decide la partita. La
     scelta e' immediata e senza costo — si vede subito sul nucleo che
     gira dietro al menu, quindi il pannello non si richiude e la
     schermata non si ridisegna. */
  skinSvg(sk) {
    const inner = '<circle cx="12" cy="12" r="2.6"/>';
    if (!sk.lati) return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.4"/>' + inner + '</svg>';
    const d = skinPunti(sk, 8.4)
      .map(([x, y], i) => (i ? 'L' : 'M') + (12 + x).toFixed(1) + ' ' + (12 + y).toFixed(1)).join('') + 'Z';
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"/>' + inner + '</svg>';
  },
  aspettoHTML() {
    const c = (CHARS.find(x => x.id === SAVE.char) || CHARS[0]).c;
    const righe = SKINS.map(k =>
      '<button class="ap clip' + (SAVE.skin === k.id ? ' on' : '') + '" style="--c:' + c + '"' +
      ' data-a="skin" data-id="' + k.id + '"><span class="face">' +
      '<span class="ico clip">' + this.skinSvg(k) + '</span>' +
      '<span class="nm">' + k.n + '</span><span class="ds">' + k.d + '</span>' +
      '</span></button>').join('');
    return '<details class="seedbox"><summary>Aspetto</summary>' +
      '<div class="hint" style="text-align:left;margin:0 0 8px">Solo la sagoma del nucleo: nessuna di queste forme cambia una statistica. Il colore resta quello del nucleo che giochi.</div>' +
      '<div class="aprow">' + righe + '</div></details>';
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

  /* ── azzeramento ─────────────────────────────────────────
     Sta in fondo al pannello di backup, non fra i bottoni della partenza:
     l'unico posto in cui ci si arriva e' dopo aver letto come si salva.
     E non parte al primo tocco — il primo tocco apre la domanda, e la
     domanda dice per nome che cosa sparisce. */
  wipeHTML() {
    const arm = this.armato === 'wipe';
    const niente = !SAVE.shards && !SAVE.wins && !(SAVE.runs | 0) && !SAVE.asc &&
      SAVE.chars.length < 2 && !SAVE.sfide.length && !Object.keys(SAVE.meta).length;
    const conta = [
      SAVE.shards + ' frammenti',
      SAVE.chars.length + (SAVE.chars.length === 1 ? ' nucleo' : ' nuclei'),
      SAVE.sfide.length + (SAVE.sfide.length === 1 ? ' sfida' : ' sfide'),
      'ascensione ' + (SAVE.asc | 0),
      (SAVE.runs | 0) + (SAVE.runs === 1 ? ' partita' : ' partite')
    ].join(' · ');
    return '<div class="danger">' +
      '<span class="dt">Azzera i progressi</span>' +
      (arm
        ? '<p class="hint dwarn" style="text-align:left;margin:0 0 9px">Stai per cancellare <b>' + conta + '</b>. Si riparte da Vega, zero frammenti, ascensione 0. Non si torna indietro: senza il codice qui sopra non c\'è modo di recuperarli.</p>' +
          '<div class="btnrow">' +
          '<button class="btn ghost clip" data-a="wipeno"><span class="face">Annulla</span></button>' +
          '<button class="btn ghost clip bad" data-a="wipe"><span class="face">Sì, azzera tutto</span></button>' +
          '</div>'
        : '<p class="hint" style="text-align:left;margin:0 0 9px">Cancella frammenti, potenziamenti, nuclei, sfide, ascensioni e record: il gioco torna come alla prima apertura. Le impostazioni audio restano.</p>' +
          '<div class="btnrow"><button class="btn ghost clip bad"' + (niente ? ' disabled' : ' data-a="wipe"') +
          '><span class="face">' + (niente ? 'Niente da azzerare' : 'Azzera tutto') + '</span></button></div>') +
      '</div>';
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
      /* in dissoluzione il segnale rosso vince su quello di trasformazione:
         altrimenti le rune trasformabili non risultavano rimovibili */
      let evoCls = '', tag = '';
      if (this.ritemprando) {
        const bg = r ? (this.ritBersagli || []).find(x => x.slot === i) : null;
        if (bg) {
          /* La freccia diceva solo l'elemento d'arrivo. Il numero accanto e'
             la ragione per scegliere QUESTA runa: la catena che si allunga,
             e sopra — quando succede — il Risveglio che si accende. */
          const armata = this.ritSel === i;
          evoCls = armata ? ' ritconf' : ' ritemprabile';
          c = EL[bg.el].c;
          tag = '<span class="tagslot" style="--c:' + c + '">' +
            (armata ? 'CONFERMA' : '→ ' + EL[bg.el].n.toUpperCase() + ' ' + bg.dopo + '/' + bg.c0) + '</span>';
          if (bg.accende) tag += '<span class="tagsu" style="--c:' + c + '">RISVEGLIO</span>';
          else if (bg.spegne) tag += '<span class="tagsu" style="--c:#ff3d6e">SPEGNE</span>';
        }
        else if (r) evoCls = ' inerte';
      }
      else if (this.placing && r) {
        /* ad anello pieno si può prendere il posto di una runa che non
           risuona: l'alternativa era restare inchiodati alla composizione
           uscita dai primi cinque sorteggi */
        if (sacrificabile(i)) { evoCls = ' sostituibile'; tag = '<span class="tagslot" style="--c:#ff3d6e">SOSTITUISCI</span>'; }
        else evoCls = ' inerte';
      }
      else if (this.dissolving) evoCls = r ? ' dissolvibile' : '';
      /* «vicino» chiedeva il livello 8, cioe' la soglia di quando la
         trasformazione arrivava a otto: da quando arriva a sei (cinque col
         Crogiolo) una runa gia' al livello giusto non si accendeva, e una
         all'8 si accendeva per un requisito che aveva superato da due
         livelli. La condizione la sa mancaEvo(), che e' dove sta scritta. */
      else if (r && EVO[r.id]) evoCls = canEvolve(r) ? ' pronto' : (mancaEvo(r).indexOf('lv') < 0 ? ' vicino' : '');
      const vuoto = !r;
      const dentro = r ? svg(r.id)
        : '<svg viewBox="0 0 24 24" class="plus" aria-hidden="true"><path d="M12 7v10M7 12h10"/></svg>';
      /* ── il numero dell'alloggiamento ──────────────────────────
         evoLine() dice «spostala nell'alloggiamento 3» — e' il consiglio
         piu' azionabile del gioco, quello che trasforma la regola
         posizionale da segreto in mossa — ma nessun alloggiamento portava
         scritto il proprio numero. L'istruzione nominava una cosa che
         l'interfaccia non mostrava, quindi non si poteva eseguire: si
         poteva solo contare in senso orario partendo dall'alto e sperare
         di partire da uno e non da zero.
         Sta FUORI dall'anello, dalla parte opposta al centro, cosi' non
         ruba spazio al glifo ne' si accavalla col livello. */
      const nx = 50 + Math.cos(a) * (R + 15), ny = 50 + Math.sin(a) * (R + 15);
      /* il numero di quello scelto si accende: «tocca due rune per
         scambiarle» ha bisogno che si veda quale hai gia' in mano, e il
         contorno bianco e' gia' preso da «trasformabile» */
      slots += '<span class="slotn' + (this.sel === i ? ' sel' : '') + '" style="left:' + nx.toFixed(2) + '%;top:' + ny.toFixed(2) + '%">' + (i + 1) + '</span>';
      slots += '<button class="slot' + (vuoto ? ' empty' : '') + good + evoCls + (this.sel === i ? ' sel' : '') + (highlight === i ? ' sel' : '') + (vuoto && pel ? ' aperto' : '') + '"' +
        (interactive ? ' data-a="slot" data-i="' + i + '"' : ' disabled tabindex="-1"') +
        ' style="left:' + x.toFixed(2) + '%;top:' + y.toFixed(2) + '%;--c:' + c + '">' +
        '<span class="in clip" style="--c:' + c + '">' + dentro + '</span>' +
        (r && r.lv > 1 ? '<span class="lv" style="--c:' + c + '">' + r.lv + '</span>' : '') +
        tag + '</button>';
    }
    let aw = 0; for (const e of ELKEYS) if (G.awaken[e]) aw++;
    return '<div class="ringwrap">' +
      '<svg class="arcs" viewBox="0 0 100 100"><circle cx="50" cy="50" r="' + R + '" fill="none" stroke="rgba(158,138,255,.16)" stroke-width="1"/>' + arcs + '</svg>' +
      '<div class="ringcore"><div><div class="n">' + aw + '</div><div class="l">RISVEGLI</div></div></div>' +
      slots + '</div>';
  },

  /* ── chi e' la runa che hai in mano ─────────────────────────────
     L'anello e' l'interfaccia del gioco, ma di una runa mostra un glifo
     di ventiquattro pixel e basta: il nome compare una volta sola, sulla
     carta che te l'ha offerta, e poi mai piu'. Le righe qui sotto pero'
     parlano per nome — «Scintilla: manca risuonare da entrambi i lati,
     spostala nell'alloggiamento 3» — quindi per eseguire il consiglio
     dovevi indovinare quale dei sei glifi fosse la Scintilla.
     Toccando un alloggiamento, adesso, il gioco dice di chi si tratta:
     nome, elemento, livello e se risuona. Il resto — cosa le manca per
     trasformarsi — lo dice gia' evoLine(), e non si riscrive qui: una
     regola, un posto solo. */
  runaLine() {
    const r = this.sel >= 0 ? G.ring[this.sel] : null;
    if (!r) return '';
    const d = RUNES[r.id], c = EL[r.el].c;
    const ris = r.res >= 2 ? 'risuona da <b>entrambi</b> i lati'
      : r.res === 1 ? 'risuona da <b>un lato solo</b>'
      : '<b>non risuona</b> con le vicine';
    return '<span style="color:' + c + '"><b>' + nomeRuna(r) + '</b></span> · ' +
      (r.el === 'iride' ? 'Iride' : EL[r.el].n) + ' · ' + d.tag +
      /* «livello 6» non diceva 6 su quanto, e il massimo e' 8: chi leggeva
         «livello 6» accanto a una trasformazione che arriva al 6 non poteva
         sapere se quella runa fosse finita o a meta' strada. */
      ' · livello ' + r.lv + ' di ' + RUNE_MAX + (r.lv >= sogliaEvo() ? ' (soglia ' + sogliaEvo() + ' superata)' : ' · soglia ' + sogliaEvo()) +
      ' · ' + ris + '<br>';
  },

  /* ── la Ritempra, a parole ──────────────────────────────────────
     La schermata mostrava rune che pulsano e una freccia con un nome di
     elemento: non diceva ne' cosa sia una riaccordatura, ne' cosa cambi
     nella partita, ne' che il tocco fosse definitivo. Chi la giocava
     toccava una runa a caso e vedeva un colore cambiare.
     Adesso la riga dice, della runa in mano, la frase intera: chi e', da
     quale elemento a quale, quanto diventa lunga la catena, che Risveglio
     accende — e cosa perde l'elemento che lascia. Poi chiede conferma,
     perche' un tocco che riscrive una runa per il resto della partita non
     puo' essere lo stesso gesto con cui si esplora l'anello. */
  ritLine() {
    const b = (this.ritBersagli || []).find(x => x.slot === this.ritSel);
    if (!b) return '';
    const r = G.ring[b.slot]; if (!r) return '';
    const ca = EL[b.el].c, cd = EL[b.da].c;
    let t = '<b>' + nomeRuna(r) + '</b> · da <span style="color:' + cd + '">' + EL[b.da].n +
      '</span> a <span style="color:' + ca + '">' + EL[b.el].n + '</span>' +
      ' · forma e livello ' + r.lv + ' restano<br>' +
      '<span style="color:' + ca + '">' + EL[b.el].n + ' ' + b.prima + ' → ' + b.dopo + '/' + b.c0 + '</span>';
    if (b.accende) t += ' · <b style="color:' + ca + '">accende ' + EL[b.el].aw + '</b>';
    if (b.spegne) t += ' · <b style="color:#ff3d6e">spegne ' + EL[b.da].aw + '</b>';
    else if (b.giuDopo < b.giuPrima) t += ' · <span style="color:' + cd + '">' + EL[b.da].n + ' scende a ' + b.giuDopo + '</span>';
    return t + '<br><b>Tocca di nuovo per confermare.</b><br>';
  },

  /* Cosa manca per trasformare. È l'informazione più importante dell'anello
     e non era scritta da nessuna parte: senza, la regola posizionale resta
     un segreto e la trasformazione non capita mai. */
  evoLine() {
    const parts = [];
    const soglia = sogliaEvo();
    for (let i = 0; i < G.slots; i++) {
      const r = G.ring[i];
      if (!r || !EVO[r.id]) continue;
      const nome = nomeRuna(r), col = EL[r.el].c;
      if (canEvolve(r)) { parts.push('<b style="color:' + col + '">' + nome + ' può trasformarsi</b>'); continue; }
      const mancano = mancaEvo(r);
      if (mancano.indexOf('lv') >= 0) continue;
      const manca = [];
      if (mancano.indexOf('res') >= 0) {
        /* Dire "manca la risonanza su entrambi i lati" descrive il problema.
           Dire "spostala nell'alloggiamento 3" lo risolve — ed è la differenza
           fra una regola che si capisce e una che non scatta mai. */
        const j = scambioUtile(i);
        manca.push(j >= 0
          ? 'risuonare da <b>entrambi</b> i lati — <b>spostala nell’alloggiamento ' + (j + 1) + '</b>'
          : 'rune compatibili su <b>entrambi</b> i lati');
      }
      /* L'Iride non ha un elemento suo: chiederle "il Risveglio null" era la
         prova che nessuno aveva mai letto questa riga con un jolly nell'anello. */
      if (mancano.indexOf('iride') >= 0) manca.push('<b>due Risvegli</b> accesi insieme');
      if (mancano.indexOf('aw') >= 0) manca.push('il Risveglio ' + EL[r.el].aw);
      if (manca.length) parts.push('<span style="color:' + col + '">' + nome + '</span>: manca ' + manca.join(' e '));
    }
    return parts.join('<br>');
  },

  /* Chi era a una runa dal momento più importante della partita non lo sapeva:
     l'interfaccia mostrava soltanto i Risvegli GIÀ accesi. */
  catenaLine() {
    const c0 = catenaRichiesta(), parts = [];
    for (const e of ELKEYS) {
      if (G.awaken[e]) continue;
      const run = catenaDi(e);
      if (!run) continue;
      parts.push('<span style="color:' + EL[e].c + '">' + EL[e].n + ' ' + run + '/' + c0 + '</span>');
    }
    return parts.length ? '<br><span style="color:#6a6199">Verso il Risveglio: </span>' + parts.join(' · ') : '';
  },

  /* ── cosa fanno i Risvegli che hai acceso ──────────────────────
     Il nome e il grado si leggono dappertutto: la targhetta in basso a
     sinistra, la riga sotto le carte, l'anello. COSA FA il grado che hai
     adesso lo diceva un avviso di due secondi nell'istante in cui si e'
     acceso, e poi piu' niente. La guida sta nel menu, mostra solo il primo
     grado, e dalla pausa non ci si arriva: un giocatore a «Torpore II» non
     aveva nessun modo di sapere che vuol dire — e il Risveglio e' la regola
     su cui e' costruito tutto il gioco.
     Sta in pausa e non nell'HUD perche' e' una cosa che si legge quando ci
     si ferma a pensare, e l'HUD deve restare la cosa piu' sgombra dello
     schermo. Il grado e' quello EFFETTIVO: durante il Culmine ognuno sale
     di uno, e leggere la riga del grado sotto sarebbe una bugia. */
  risvegliBlocco() {
    const righe = [];
    for (const e of ELKEYS) {
      const base = G.awaken[e]; if (!base) continue;
      const t = Math.max(base, G.awk[e] | 0);
      righe.push('<div class="awrow" style="--c:' + EL[e].c + '">' +
        '<span class="awn">' + EL[e].aw + '</span>' +
        '<span class="awe">grado ' + 'I'.repeat(t) + (t > base ? ' · culmine' : '') + '</span>' +
        '<span class="awd">' + EL[e].awd[t - 1] + '</span></div>');
    }
    return righe.length ? '<div class="awlist" style="max-width:360px;margin:10px auto 2px">' + righe.join('') + '</div>' : '';
  },

  /* Il Risveglio a schermo intero. Era un avviso in alto: il momento attorno
     a cui è costruito tutto il gioco veniva trattato come la raccolta di una
     gemma. */
  awakeFx(e, tier) {
    const el = EL[e], fx = $('#awakefx');
    if (!fx) return;
    fx.style.setProperty('--c', el.c);
    fx.style.removeProperty('--fit');
    fx.innerHTML = '<div class="aw-in">' +
      '<div class="aw-k">Risveglio · grado ' + 'I'.repeat(tier) + '</div>' +
      '<div class="aw-n">' + el.aw.toUpperCase() + '</div>' +
      '<div class="aw-d">' + el.awd[tier - 1] + '</div></div>';
    fx.className = ''; void fx.offsetWidth; fx.className = 'on' + (tier >= 3 ? ' max' : '');
    /* ── il nome dentro lo schermo ─────────────────────────
       Il corpo era una `clamp` sulla larghezza della finestra, cioè tarata
       sul nome medio. Ma i nomi non sono lunghi uguale: SOVRACCARICO ne ha
       tredici di lettere contro le sei di ARDORE, e su un telefono usciva
       dallo schermo — misurato in Chromium, tagliato a destra di 58px a
       390 di larghezza e di 123px al terzo grado, dove il corpo cresce
       ancora. Il CSS non può saperlo da solo: dipende da quanto è larga
       QUELLA parola in QUEL carattere, e nemmeno contare le lettere basta.
       Quindi si misura a parola già scritta e si stringe quel tanto che
       serve. Sui nomi che ci stanno non tocca niente. */
    const n = fx.querySelector('.aw-n');
    const utile = fx.clientWidth - 72;
    if (n.scrollWidth > utile && utile > 0) {
      const corpo = parseFloat(getComputedStyle(n).fontSize);
      fx.style.setProperty('--fit', (corpo * utile / n.scrollWidth) + 'px');
    }
    clearTimeout(this._awT);
    this._awT = setTimeout(() => { fx.className = ''; }, 1800);
  },

  /* ── il Culmine a schermo pieno ──────────────────────────────────
     Stessa forma del Risveglio (#awakefx), perche' e' la stessa scala di
     evento: il Risveglio e' la regola che costruisci, il Culmine e' il
     momento in cui la moltiplichi. Dura meno — un secondo, non due — perche'
     mentre e' acceso si sta ancora schivando, e la riga sotto dice il suo
     effetto CON I NOMI dei Risvegli che sta alzando: «Ardore e Torpore
     salgono di un grado» insegna cos'e' un grado nell'istante in cui uno ne
     guadagna uno. Senza Risvegli accesi dice l'altra meta' del suo effetto,
     che e' l'unica che in quel momento e' vera. */
  culmineFx() {
    const su = ELKEYS.filter(e => G.awaken[e]).map(e => EL[e].aw);
    const d = su.length
      ? '<b>' + (su.length > 1 ? su.slice(0, -1).join(', ') + ' e ' + su[su.length - 1] : su[0]) +
        '</b> ' + (su.length > 1 ? 'salgono' : 'sale') + ' di un grado'
      : 'L’anello spara tutto insieme, ricariche quasi al doppio';
    const fx = $('#awakefx');
    if (!fx) return;
    fx.style.setProperty('--c', '#ffe9b0');
    fx.style.removeProperty('--fit');
    fx.innerHTML = '<div class="aw-in">' +
      '<div class="aw-k">Culmine · ' + numSec(culmSec()) + '</div>' +
      '<div class="aw-n">CULMINE</div>' +
      '<div class="aw-d">' + d + '</div></div>';
    fx.className = ''; void fx.offsetWidth; fx.className = 'on culm';
    clearTimeout(this._awT);
    this._awT = setTimeout(() => { fx.className = ''; }, 1100);
  },

  awakeLine() {
    const parts = [];
    for (const e of ELKEYS) { const t = G.awaken[e]; if (t) parts.push('<span style="color:' + EL[e].c + '">' + EL[e].aw + ' ' + 'I'.repeat(t) + '</span>'); }
    return parts.length ? parts.join(' · ') : '<span style="color:#6a6199">Nessun risveglio attivo</span>';
  },

  /* Chiudere una spiegazione. È un metodo e non solo il corpo di un
     `case` perché il collaudo deve poterlo chiamare: la versione
     precedente non faceva ripartire il gioco — riprendiGioco() era stato
     cancellato da una modifica — e la partita restava congelata per
     sempre sulla carta. Un errore a tempo di esecuzione, che `node
     --check` non vede e nessun test premeva quel bottone. */
  /* «l'ho già visto una volta», per le cose che non passano dal briefing */
  primaVolta(id) {
    if (id && SAVE.visti.indexOf(id) < 0) { SAVE.visti.push(id); storeSave(); }
  },

  chiudiBriefing() {
    const id = G.briefing; G.briefing = null;
    this.primaVolta(id);
    /* «Ho capito» chiude la spiegazione, non la lezione: da qui fino alla
       prima scheggia raccolta la più vicina resta scritta e la barra
       aspetta di lampeggiare. Il nesso si chiude quando lo fai. */
    if (id === 'gemme') G.lezioneGemme = 1;
    /* la carta che stava aspettando dietro al briefing */
    if (G.pending > 0) { G.state = 'level'; UI.levelup(); }
    else riprendiGioco();
  },

  /* ── prima volta ─────────────────────────────────────────
     Una schermata sola, una volta sola per sempre. Non è un tutorial a
     tappe: si apre quando la cosa sta succedendo davvero, con la cosa
     ferma sullo sfondo, quindi quello che leggi ce l'hai davanti. */
  /* La scena. Spiegare un colore a parole è già perso in partenza — «verdi»
     era pure sbagliato: la tinta è 159°, cioè turchese, e «azzurre» sarebbe
     stato peggio perché l'azzurro è l'elemento Gelo. Quindi la scheggia si
     mostra invece di descriverla, e si mostra mentre viene raccolta: il
     nucleo è il TUO, con la sagoma e il colore che hai scelto, così quello
     che vedi qui è quello che vedrai fra due secondi in campo. */
  scenaGemme() {
    const sk = SKINS.find(k => k.id === SAVE.skin) || SKINS[0];
    const c = (CHARS.find(x => x.id === SAVE.char) || CHARS[0]).c;
    /* ferme dove sono cadute, lungo la strada del nucleo */
    const sch = (cl, x, y) => '<i class="dg-s ' + cl + '" style="--x0:' + x + 'px;--y0:' + y + 'px"></i>';
    return '<div class="dgem" style="--c:' + c + '">' +
      '<div class="dg-campo">' +
      '<span class="dg-nucleo">' + this.skinSvg(sk) + '</span>' +
      sch('u', 108, -19) + sch('d', 180, 14) + sch('t', 251, -3) +
      '</div>' +
      '<div class="dg-barra"><i></i></div>' +
      '<div class="dg-eti">vai a prenderle</div>' +
      '</div>';
  },

  briefing(id) {
    const b = BRIEFING[id];
    if (!b) { riprendiGioco(); return; }
    this.open('brief',
      '<div class="brief clip" style="--c:' + b.c + '">' +
      '<span class="bi clip">' + svg(b.ico) + '</span>' +
      '<div class="eyebrow" style="color:var(--c)">' + b.k + '</div>' +
      '<h2 class="ttl">' + b.n + '</h2>' +
      (b.scena === 'gemme' ? this.scenaGemme() : '') +
      b.p.map(t => '<p>' + t + '</p>').join('') +
      '<div class="bnota">Una volta sola</div>' +
      '</div>' +
      '<button class="btn primary clip" style="max-width:300px;margin:0 auto" data-a="briefdone">' +
      '<span class="face">Ho capito</span></button>'
    );
  },

  /* ── scelta potenziamento ───────────────────────────────── */
  /* `chest` arrivava come parametro e NESSUNO glielo passava mai: le sette
     righe che distinguono uno scrigno da una salita di livello — titolo,
     occhiello e la regola che il Ventaglio non vale sugli scrigni — erano
     codice morto, e uno scrigno raccolto si annunciava come «Livello N».
     Adesso lo scrigno e' un contatore dello stato (G.chests), che e' l'unico
     posto da cui si possa sapere da dove viene la carta in cima alla pila.
     `riusa` tiene le stesse tre carte invece di ripescarle: tornando
     dall'anello si ripescava, cioe' «Riordina l'anello → Fatto» era un
     Rilancio gratis e infinito accanto a un bottone Rilancia che ne
     concede due per partita. */
  levelup(riusa) {
    const pila = G.pending | 0;
    const scrigni = Math.min(G.chests | 0, pila);
    const chest = scrigni > 0;
    this.chestMode = chest;
    /* ── il livello di QUESTA carta, non quello a cui sei arrivato ──
       «Ho fatto il livello 20 e tre o quattro volte di fila mi ha detto che
       il nucleo cresce.» Non era un avviso ripetuto: erano tre carte vere,
       una per livello. Ma `gainXP` sale di tutti i livelli in un colpo —
       una gemma fusa in fondo alla partita ne vale qualche migliaio, e il
       `while` gira due o tre volte nello stesso fotogramma — e questa
       schermata scriveva `G.level`, cioe' il livello di ARRIVO. Salendo dal
       20 al 23 usciva quindi «Livello 23» tre volte di seguito, identica:
       non un livello dopo l'altro, la stessa scritta che torna. Uguale al
       cartello che si ripete e' indistinguibile da un difetto — e infatti
       e' stato segnalato come tale.
       Le carte si consumano in ordine e gli scrigni per primi (vedi `chest`
       qui sopra e consumaCarta), quindi quella in cima e' la piu' vecchia:
       il suo livello e' quello di arrivo meno le carte di livello che
       restano. E dire quante ne restano toglie l'ultimo dubbio, perche'
       una fila di schermate senza preavviso si legge come un inceppamento. */
    const lvCarte = pila - scrigni;
    const lvQui = Math.max(1, G.level - lvCarte + 1);
    const altre = Math.max(0, pila - 1);
    /* I livelli gia' pagati e non ancora consegnati (vedi `pausaLv` in MODI):
       non sono una pila — arrivano uno ogni venti secondi di partita, dodici
       nell'Incursione — ma chi legge «Livello 21» e venti secondi dopo rivede
       questa schermata deve sapere che era previsto, e quanti ne restano.
       Sulla carta di uno scrigno non si dice: quella non e' un livello. */
    const inArrivo = (!chest && !altre) ? livelliInAttesa() : 0;
    const arrivo = !inArrivo ? '' : inArrivo === 1 ? ' · un altro fra ' + G.modo.pausaLv + ' s'
      : ' · altri ' + inArrivo + ' in arrivo, uno ogni ' + G.modo.pausaLv + ' s';
    /* Ventaglio: quattro carte invece di tre, ma solo nei primi tre livelli.
       È lì che la scelta conta di più — decide le prime due catene — ed è lì
       che un pescato brutto costa una partita intera. Dopo tornano tre: una
       quarta carta sempre attaccherebbe la varietà, non la fondazione. */
    const quattro = mlv('ventaglio') && !chest && G.level <= 3;
    const ch = (riusa && manoValida(this.choices)) ? this.choices : rollChoices(quattro ? 4 : 3);
    this.choices = ch;
    const cards = ch.map((c, i) => this.cardHTML(c, i)).join('');
    this.open('level',
      '<div class="eyebrow">' + (chest ? 'Scrigno stellare' : 'Livello ' + lvQui) +
      (altre ? (altre === 1 ? ' · poi un’altra' : ' · poi altre ' + altre) : '') + arrivo + '</div>' +
      '<h2 class="ttl">' + (chest ? 'Un dono dal vuoto' : 'Il nucleo cresce') + '</h2>' +
      /* La domanda che questa schermata pone è "questa runa si incastra?", e
         si poneva tenendo l'anello fuori vista, dietro un altro tocco. */
      '<div class="ringmini">' + this.ringHTML(false) + '</div>' +
      '<div id="cards">' + cards + '</div>' +
      /* Nessuna delle tre va bene? Due verbi diversi: Rilancia se speri in
         qualcosa di meglio, Salta se preferisci non toccare la build. In
         Orbita saltare conta davvero, perché una runa nuova ti mangia un
         alloggiamento per sempre. */
      '<div class="btnrow" style="max-width:400px;margin:0 auto">' +
      '<button class="btn ghost clip" data-a="reroll"' + (G.rerolls > 0 ? '' : ' disabled') + '>' +
      '<span class="face">Rilancia' + (G.rerolls > 0 ? ' · ' + G.rerolls : '') + '</span></button>' +
      '<button class="btn ghost clip" data-a="skip"><span class="face">Salta</span></button>' +
      '</div>' +
      '<div class="hint" style="margin-top:2px">' + this.awakeLine() + this.catenaLine() + (this.evoLine() ? '<br>' + this.evoLine() : '') + '</div>' +
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
    if (c.t === 'ritempra') {
      return '<button class="card rit clip" data-a="pick" data-i="' + i + '" style="--c:#ff7de3"><span class="face">' +
        '<span class="ico clip">' + svg('iride') + '</span><span class="body">' +
        '<span class="kicker">Anello</span><h3>Ritempra</h3>' +
        /* Diceva «all'elemento di una vicina», e i candidati sono anche
           l'elemento della tua APERTURA: con un'Iride di fianco — che un
           elemento suo non ce l'ha — la runa cambiava verso un elemento
           che nessuna vicina porta, cioe' la carta faceva una cosa che la
           carta stessa escludeva. L'anello, quando la giochi, dice gia' su
           ogni runa verso che elemento andrebbe. */
        /* «cambia solo con chi risuona» era la meta' vera: cambiava la
           contabilita' delle catene e nient'altro, quindi la runa restava
           dell'elemento di prima in campo — colore dei colpi, Nodo, corazza
           dei guardiani. Adesso l'elemento e' quello nuovo per tutto il
           gioco, e la carta lo dice: e' la ragione per cui la si gioca. */
        '<p>Riaccorda una runa a un altro elemento — quello di una <em>vicina</em>, o quello della tua <em>apertura</em>. ' +
        'Conserva <em>forma e livello</em>: cambia l’elemento, quindi con chi risuona e di che colore colpisce.</p>' +
        '</span></span></button>';
    }
    if (c.t === 'diss') {
      return '<button class="card diss clip" data-a="pick" data-i="' + i + '" style="--c:#ff3d6e"><span class="face">' +
        '<span class="ico clip">' + svg('vortice') + '</span><span class="body">' +
        '<span class="kicker">Anello</span><h3>Dissolvi</h3>' +
        '<p>Rimuovi una runa dall’anello e <em>libera il suo alloggiamento</em>. Ti restituisce frammenti in base al livello.</p>' +
        '</span></span></button>';
    }
    if (c.t === 'ascesi') {
      const na = (G.ascesi | 0) + 1;
      return '<button class="card clip" data-a="pick" data-i="' + i + '" style="--c:#bff6ff"><span class="face">' +
        '<span class="ico clip">' + svg('orbita') + '</span><span class="body">' +
        '<span class="kicker">Ascesi · ' + na + '</span><h3>Ascesi</h3>' +
        '<p><em>+5% danno, +4% vita massima, +3% area.</em> Si accumula senza limite.</p>' +
        '</span></span></button>';
    }
    if (c.t === 'pas') {
      const d = PASSIVES[c.id], lv = G.passives[c.id] | 0, oltre = lv >= d.max;
      let pips = ''; for (let k = 0; k < d.max; k++) pips += '<i class="' + (k < lv + 1 ? 'f' : '') + '"></i>';
      return '<button class="card clip" data-a="pick" data-i="' + i + '" style="--c:' + d.c + '"><span class="face">' +
        '<span class="ico clip">' + svg(d.ico) + '</span><span class="body">' +
        '<span class="kicker">' + (oltre ? 'Eccesso · ' + (lv - d.max + 1) : 'Passivo · liv ' + (lv + 1)) + '</span><h3>' + d.n + '</h3><p><em>' + d.d + '</em></p>' +
        '<span class="pips">' + pips + '</span></span></span></button>';
    }
    const d = RUNES[c.id], el = EL[d.el];
    const isNew = c.t === 'rnew';
    const cur = isNew ? 0 : (G.ring.find(r => r && r.id === c.id) || { lv: 0 }).lv;
    /* il pallino della soglia porta un segno: da li' in poi quella runa
       puo' trasformarsi, e il conto totale dice fin dove sale */
    const sog = sogliaEvo();
    let pips = '';
    for (let k = 0; k < RUNE_MAX; k++)
      pips += '<i class="' + (k < cur + 1 ? 'f' : '') + (k === sog - 1 ? ' sog' : '') + '"></i>';
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

  /* ── cosa compri davvero con questo livello ─────────────────────
     E' la carta che si preme piu' di ogni altra cosa — una trentina di
     volte per corsa — e i suoi numeri venivano da una curva che il gioco
     non usa piu'. Due errori, tutti e due perche' la riga se li calcolava
     per conto suo invece di chiedere a runeStats.
     Il primo: la percentuale di danno era `g.dmg / base.dmg`, cioe' un
     numero FISSO, uguale a ogni livello. La Scintilla prometteva «+44%
     danno» dal primo all'ottavo, mentre il guadagno vero scende da +59% a
     +13% — a meta' corsa la carta prometteva il triplo di quello che dava.
     Manca sia GROWTH (1,35, che moltiplica ogni passo) sia il fatto che
     l'aumento va misurato sul danno di ADESSO, non su quello base.
     Il secondo, peggiore: «+1 proiettili» e «+1 perforazione» erano
     calcolati senza GROWTH, quindi su una curva diversa da quella che il
     gioco percorre. Non era un'imprecisione, era il gradino sbagliato: la
     Scintilla dal 3 al 4 guadagna un proiettile E una perforazione e la
     carta diceva «+velocita'»; dal 4 al 5 non guadagna niente e la carta
     prometteva «+1 proiettili». Lo Sciame dall'1 al 2 guadagna un dardo e
     la carta non lo diceva.
     Adesso i due livelli si chiedono a runeStats — la stessa funzione che
     li usa in campo — e si sottraggono. I moltiplicatori del giocatore
     stanno in tutti e due i termini e si semplificano; quello che resta e'
     il gradino vero. */
  upgradeText(id, lv) {
    const d = RUNES[id];
    const st = n => runeStats({ id, el: d.el, lv: n, res: 0, st: {} });
    const a = st(lv), b = st(lv + 1), bits = [];
    const dd = Math.round((b.dmg / a.dmg - 1) * 100);
    if (dd > 0) bits.push('+' + dd + '% danno');
    const piu = (k, uno, molti) => {
      if (b[k] === undefined || b[k] <= a[k]) return;
      const n = Math.round(b[k] - a[k]);
      if (n > 0) bits.push('+' + n + ' ' + (n > 1 ? molti : uno));
    };
    piu('count', 'proiettile', 'proiettili');
    piu('pierce', 'perforazione', 'perforazioni');
    /* la ricarica scende fino a un pavimento: quando ci e' arrivata non
       migliora piu', e prometterlo sarebbe la stessa bugia di prima */
    if (b.cd !== undefined && b.cd < a.cd - 1e-6) bits.push('ricarica più rapida');
    const altri = { area: 'area', dur: 'durata', size: 'raggio', heal: 'cura', spd: 'velocità' };
    for (const k in altri) {
      if (bits.length >= 3) break;
      if (b[k] !== undefined && b[k] > a[k] + 1e-6) bits.push('+' + altri[k]);
    }
    /* Il livello che apre la trasformazione e' il piu' importante della runa
       e la carta non lo diceva: si scopriva dopo averlo comprato. Sta fuori
       dall'elenco dei gradini, che ne mostra al massimo tre: messo dentro
       spingeva fuori un guadagno vero — la perforazione dell'Iride dal 5 al
       6 — e la carta tornava a promettere meno di quello che dava. */
    const soglia = lv + 1 === sogliaEvo() ? ' <b>È la soglia della trasformazione.</b>' : '';
    return '<em>Livello ' + (lv + 1) + ' di ' + RUNE_MAX + '</em> · ' + bits.slice(0, 3).join(', ') + '.' + soglia;
  },

  /* ── editor dell’anello ─────────────────────────────────── */
  ringEdit(placing, dissolving, ritemprando) {
    this.placing = placing || null; this.dissolving = !!dissolving;
    this.ritemprando = !!ritemprando; this.sel = -1; this.ritSel = -1;
    if (this.ritemprando) this.ritBersagli = bersagliRitempra();
    const t = this.ritemprando
      ? 'Riaccordare vuol dire <b>cambiarle elemento</b>: forma e livello restano, cambia con chi risuona. ' +
        'Le rune che pulsano dicono <b>verso quale elemento</b> e <b>quanto diventa lunga</b> quella catena — ' +
        'toccane una per leggere cosa cambia, toccala di nuovo per confermare.' +
        (this.ritBersagli && this.ritBersagli.length > 1
          ? '<br><span style="color:' + EL[this.ritBersagli[0].el].c + '">Il guadagno più grande è l’alloggiamento ' + (this.ritBersagli[0].slot + 1) + '.</span>'
          : '')
      : this.dissolving
      ? 'Tocca la runa da dissolvere. L’alloggiamento torna libero.'
      : this.placing
        ? 'Scegli dove collocare <span style="color:' + EL[RUNES[this.placing].el].c + '">' + RUNES[this.placing].n + '</span>' +
          (G.ring.every(Boolean) ? '<br><span style="color:#6a6199">L’anello è pieno: può prendere il posto di una runa che non regge un Risveglio.</span>' : '')
        : 'Tocca due rune per scambiarle';
    this.open('ring',
      '<div class="eyebrow">Anello · ' + G.slots + ' alloggiamenti</div>' +
      '<h2 class="ttl">' + (this.ritemprando ? 'Ritempra' : this.dissolving ? 'Dissoluzione' : this.placing ? 'Collocazione' : 'Riordina') + '</h2>' +
      '<p class="sub" style="margin-top:-8px">' + t + '</p>' +
      this.ringHTML(true) +
      '<div class="hint" id="ringinfo">' + this.ritLine() + this.runaLine() + this.awakeLine() + this.catenaLine() + (this.evoLine() ? '<br>' + this.evoLine() : '') + '</div>' +
      (this.placing || this.dissolving || this.ritemprando ? '' : '<button class="btn primary clip" style="max-width:280px;margin:0 auto" data-a="ringdone"><span class="face">Fatto</span></button>')
    );
  },
  refreshRing() {
    if (this.ritemprando) this.ritBersagli = bersagliRitempra();
    const w = SCR.querySelector('.ringwrap');
    if (w) w.outerHTML = this.ringHTML(true);
    const inf = SCR.querySelector('#ringinfo');
    if (inf) inf.innerHTML = this.ritLine() + this.runaLine() + this.awakeLine() + this.catenaLine() + (this.evoLine() ? '<br>' + this.evoLine() : '');
  },

  /* ── pausa ──────────────────────────────────────────────── */
  togglePause() {
    if (G.state === 'play') { G.state = 'pause'; this.pause(); }
    else if (G.state === 'pause') riprendiGioco();
  },
  pause() {
    /* ── le regole di QUESTA corsa ─────────────────────────
       La dichiarazione nel menu vale solo per il bottone «Gioca»: «Del
       giorno» parte su un altro seme, «Ripeti questa semenza» sul seme
       di prima, e chi scrive un seme a mano non la legge affatto. Da lì
       in poi, in partita, non c'era un solo posto in cui si potesse
       scoprire perché i cuori non cadono — né l'HUD, né la pausa, né la
       carta delle scelte: solo la riga della semenza a partita FINITA,
       cioè quando non serve più. Qui invece la corsa in corso dice le
       sue regole, e le dice con le stesse due carte del menu. */
    this.open('pause',
      '<div class="eyebrow">Pausa</div><h2 class="ttl">' + fmtTime(G.t) + '</h2>' +
      this.ringHTML(false) +
      '<div class="hint">' + this.awakeLine() + this.catenaLine() + '</div>' +
      this.risvegliBlocco() +
      ((G.cong.id !== 'quiete' || G.ascLv > 0)
        ? '<div style="display:flex;flex-direction:column;gap:8px;max-width:340px;margin:0 auto 4px">' +
          this.ascCard(G.ascLv) +
          (G.cong.id !== 'quiete' ? this.congCard(G.cong, 'in vigore in questa corsa') : '') +
          '</div>'
        : '') +
      '<div class="hint">' + (isCoarse()
        ? 'Trascina ovunque per muoverti · le rune sparano da sole · la carica si spende a destra (Culmine) o a sinistra (Perigeo)'
        : '<kbd>WASD</kbd> o frecce per muoverti · <kbd>Esc</kbd> pausa · <kbd>Spazio</kbd> Culmine · <kbd>Maiusc</kbd> Perigeo') + '</div>' +
      '<div style="display:flex;flex-direction:column;gap:9px;max-width:340px;margin:0 auto">' +
      '<button class="btn primary clip" data-a="resume"><span class="face">Riprendi</span></button>' +
      '<button class="btn clip" data-a="ringedit2"><span class="face">Riordina l’anello</span></button>' +
      /* La pausa e' il posto in cui si torna a chiedersi cosa voleva dire
         quella scritta: la guida sta nel menu e da qui non ci si arriva
         senza abbandonare la corsa. */
      '<button class="btn clip" data-a="lessico"><span class="face">Lessico · che vuol dire</span></button>' +
      '<div class="btnrow">' +
      '<button class="btn ghost clip" data-a="sfx"><span class="face">Suoni ' + (SAVE.sfx ? 'ON' : 'OFF') + '</span></button>' +
      '<button class="btn ghost clip" data-a="mus"><span class="face">Musica ' + (SAVE.mus ? 'ON' : 'OFF') + '</span></button>' +
      '</div>' +
      '<button class="btn clip" data-a="sospendi"><span class="face">Esci e riprendi dopo</span></button>' +
      '<button class="btn ghost clip" data-a="quit"><span class="face">Abbandona la corsa</span></button>' +
      '</div>'
    );
  },

  /* ── fine partita ───────────────────────────────────────── */
  /* ── il gancio ───────────────────────────────────────────
     La schermata finale mostrava un consuntivo: tempo, livello,
     eliminazioni, danno, frammenti. Un consuntivo si legge e si chiude —
     ma è esattamente il momento in cui si decide se ci sarà un'altra
     partita, quindi deve dire cosa c'è DOPO: la prossima runa e cosa
     chiede, la cosa più vicina da comprare e quanto manca, il contratto
     più a portata, e con che congiunzione parte la corsa successiva. */
  prossimoHTML() {
    const voci = [];

    /* la prossima runa del mazzo */
    const sb = SBLOCCHI.find(x => SAVE.runes.indexOf(x.id) < 0);
    if (sb) voci.push(['#6ff2c4', svg(sb.id), RUNES[sb.id].n, sb.d]);

    /* la cosa più vicina da comprare, qualunque sia */
    let best = null;
    for (const m of META) {
      const lv = mlv(m.id); if (lv >= m.max) continue;
      const c = metaCost(m, lv);
      if (!best || c < best.c) best = { c, n: m.n, d: m.d, ico: m.ico };
    }
    for (const r of RELIQUIE) {
      if (hasRel(r.id)) continue;
      if (!best || r.c < best.c) best = { c: r.c, n: r.n, d: r.d, ico: r.ico };
    }
    for (const ch of CHARS) {
      if (SAVE.chars.indexOf(ch.id) >= 0) continue;
      if (!best || ch.cost < best.c) best = { c: ch.cost, n: ch.n, d: ch.ruleD || ch.d, ico: 'orbita' };
    }
    if (best) {
      const manca = best.c - SAVE.shards;
      voci.push(manca > 0
        ? ['#ffc857', svg(best.ico), best.n, 'Ti mancano ' + manca + ' frammenti. ' + best.d]
        /* «comprarla» andava a genere: le voci qui dentro sono potenziamenti
           (maschili), reliquie (femminili) e nuclei. Una formula che non
           concorda con niente non sbaglia mai. */
        : ['#ffc857', svg(best.ico), best.n, 'Già alla tua portata: ' + best.c + ' frammenti. ' + best.d]);
    }

    /* il contratto più economico fra quelli in corso: è il più vicino */
    const cs = SAVE.contratti.map(id => CONTRATTI.find(x => x.id === id)).filter(Boolean);
    if (cs.length) {
      const c = cs.reduce((a, b) => (b.r < a.r ? b : a));
      voci.push(['#b06bff', svg('contratto'), c.n, c.d + ' · ' + contrattoPremio(c) + ' frammenti']);
    }

    if (!voci.length) return '';
    return '<div class="eyebrow" style="margin-top:2px">Dopo</div>' +
      '<div class="dopo">' + voci.map(v =>
        '<div class="dv clip" style="--c:' + v[0] + '"><span class="di clip">' + v[1] + '</span>' +
        '<span class="dt"><b>' + v[2] + '</b>' + v[3] + '</span></div>').join('') + '</div>';
  },

  /* Quale runa ha fatto davvero il lavoro. È la statistica che fa venire
     voglia di ricostruire: la schermata diceva quanto eri sopravvissuto, mai
     perché. */
  dannoLine() {
    const tot = Object.values(G.dmgSrc).reduce((a, b) => a + b, 0);
    if (tot < 1) return '';
    /* Sei righe e non cinque: da quando i Risvegli hanno la loro, un anello
       con due catene accese ne occupa due, e con cinque righe le rune
       scivolavano fuori proprio dalla schermata che serve a leggerle. */
    const righe = Object.entries(G.dmgSrc).sort((a, b) => b[1] - a[1]).slice(0, 6).map(function (kv) {
      const k = kv[0], v = kv[1];
      /* `aw:elemento` e' il danno del Risveglio: porta il nome del Risveglio
         (Ardore, Sovraccarico, Collasso) e il colore del suo elemento. */
      const risv = k.slice(0, 3) === 'aw:' ? k.slice(3) : null;
      const el = risv ? risv : RUNES[k] ? RUNES[k].el : 'iride';
      /* l'onda del Perigeo non la fa ne' una runa ne' un Risveglio: la fa
         l'anello, e ha la sua riga — se no comparirebbe in fondo all'elenco
         scritta «perigeo» in minuscolo, che e' il modo in cui si riconosce
         una chiave finita a schermo per sbaglio */
      const nome = risv ? EL[risv].aw : k === 'nucleo' ? G.char.n : k === 'perigeo' ? 'Perigeo' : RUNES[k] ? RUNES[k].n : k;
      const pct = v / tot * 100;
      return '<div class="dmgrow" style="--c:' + (k === 'nucleo' ? G.char.c : k === 'perigeo' ? PERI_C : EL[el].c) + '">' +
        '<span class="dn">' + nome + '</span>' +
        '<span class="db"><i style="width:' + pct.toFixed(1) + '%"></i></span>' +
        '<span class="dp">' + (pct < 1 ? '<1' : Math.round(pct)) + '%</span></div>';
    }).join('');
    return '<div class="eyebrow" style="margin-top:2px">Da dove è venuto il danno</div><div class="dmglist">' + righe + '</div>';
  },

  /* Una diagnosi sola, la più utile, presa dai contatori della partita. */
  diagnosi(win) {
    const acceso = ELKEYS.filter(e => G.awaken[e]).length;
    const c0 = catenaRichiesta();
    if (!acceso) {
      let best = null, bl = 0;
      for (const e of ELKEYS) { const n = catenaDi(e); if (n > bl) { bl = n; best = e; } }
      return best
        ? 'Non hai mai acceso un Risveglio: eri arrivato a <b style="color:' + EL[best].c + '">' + bl + ' rune di ' + EL[best].n + '</b> di fila su ' + c0 + '. Una in più e la partita cambiava.'
        : 'Non hai mai acceso un Risveglio. Servono <b>' + c0 + ' rune dello stesso elemento una accanto all’altra</b>.';
    }
    if (!G.evoCount) {
      const soglia = sogliaEvo();
      /* Accusare sempre la risonanza era la diagnosi sbagliata più comoda da
         dare: un'Iride a livello 7 fra due vicine risuonava benissimo, e quel
         che le mancava erano DUE Risvegli accesi insieme. Chi leggeva andava
         a riordinare dalla pausa un anello che era già a posto, non trovava
         niente da spostare, e la regola vera restava un segreto.
         Fra le rune arrivate alla soglia si sceglie quella a cui manca meno:
         è quella che alla prossima partita si trasforma davvero. */
      const quasi = G.ring.filter(r => r && EVO[r.id] && r.lv >= soglia)
        .sort((a, b) => mancaEvo(a).length - mancaEvo(b).length)[0];
      if (quasi) {
        const m = mancaEvo(quasi), voci = [];
        /* Zero condizioni mancanti e nessuna trasformazione vuol dire una cosa
           sola: la carta era nel mazzo e non e' mai stata presa. Dire "manca"
           a chi non aveva piu' niente da fare era la diagnosi piu' sbagliata
           di tutte — e la frase usciva pure monca, senza un motivo da
           elencare dopo il "ma". */
        if (!m.length) return '<b style="color:' + EL[quasi.el].c + '">' + nomeRuna(quasi) +
          '</b> era pronta a trasformarsi e la sua carta poteva uscire a ogni salita di livello. Quando compare, prendila: è la scelta più forte del mazzo.';
        if (m.indexOf('res') >= 0) voci.push('non risuonava da <b>entrambi</b> i lati');
        if (m.indexOf('iride') >= 0) voci.push('le servono <b>due Risvegli</b> accesi insieme (ne avevi ' + acceso + ')');
        if (m.indexOf('aw') >= 0) voci.push('il <b>' + EL[quasi.el].aw + '</b> non era acceso');
        /* Il consiglio dev'essere quello che risolve la condizione che manca:
           l'anello si riordina gratis, un Risveglio no. */
        const come = m.indexOf('res') >= 0
          ? ' Riordina l’anello dalla pausa — è gratis.'
          : ' Serve un’altra catena: <b>' + c0 + ' rune dello stesso elemento</b> una accanto all’altra.';
        return 'Nessuna trasformazione: <b style="color:' + EL[quasi.el].c + '">' + nomeRuna(quasi) +
          '</b> era al livello giusto, ma ' + voci.join(' e ') + '.' + come;
      }
      return 'Nessuna trasformazione. Serve una runa a <b>livello ' + soglia + '</b> che risuoni da entrambi i lati, con il suo elemento risvegliato.';
    }
    if ((G.culms | 0) < 3) return 'Hai usato il Culmine <b>' + (G.culms | 0) + ' volte</b>. Si ricarica uccidendo: tenerlo in tasca non serve a niente.';
    if (acceso < 2) return 'Un solo Risveglio acceso. Con un’<b>Iride</b> fra due gruppi se ne accendono due insieme.';
    if (!win) return 'Build solida. Il prossimo passo è un’ascensione in più, o un’apertura che non hai ancora provato.';
    return 'Vittoria pulita. Sali di ascensione: ogni livello aggiunge <b>una regola sola</b>, e si sommano.';
  },

  /* Quanto ci e' andata vicino. E' il punteggio del gioco — in un
     sopravvivenza il proprio tempo migliore E' il punteggio — e la
     schermata di fine non lo nominava: scriveva TEMPO 15:40 senza dire che
     il record era 18:02, cioe' senza dare il motivo per cui si preme
     Rigioca. Il record e' quello del FORMATO: una Corsa da venti minuti e
     un'Incursione che ne dura otto non si confrontano. */
  recordLine() {
    const r = G.rec; if (!r) return '';
    if (r.nuovoT && r.t) return '<div class="recline nuovo">NUOVO RECORD · superato ' + fmtTime(r.t) + '</div>';
    if (r.nuovoT) return '<div class="recline nuovo">PRIMO RECORD · ' + fmtTime(G.t) + '</div>';
    if (!r.t) return '';
    const manca = Math.max(1, Math.round(r.t - G.t));
    return '<div class="recline">Record ' + G.modo.n + ' <b>' + fmtTime(r.t) + '</b> · ti sono mancati ' + fmtTime(manca) + '</div>';
  },

  end(win, gained) {
    const r = G.rec || { t: 0, k: 0, nuovoT: false, nuovoK: false };
    const stats = [['TEMPO', fmtTime(G.t), r.nuovoT], ['LIVELLO', G.level], ['ELIMINAZIONI', G.kills, r.nuovoK], ['DANNO', Math.round(G.dmgDone).toLocaleString('it-IT')]];
    /* ── tre uscite, non due ────────────────────────────────────
       La schermata conosceva «vinta» e «finita», e chiamava «Il nucleo si
       spegne» anche l'unica uscita in cui il nucleo non si spegne: quella di
       chi abbandona. E chi vinceva, continuava senza fine e poi cadeva —
       oppure smetteva — leggeva FINE su una corsa che era vinta e pagata.
       Adesso il titolo dice il fatto (la corsa e' vinta o no) e la riga
       sotto dice come e' andata a finire, che sono due cose diverse. */
    const morto = P.hp <= 0;
    const uscita = win
      ? (G.oltre
          ? 'Vinta al ' + fmtTime(G.vintaT || 0) + ', poi senza fine ' +
            (morto ? 'fino a qui' : 'e lasciata in piedi')
          : 'Eclissi dissolta')
      : (morto ? 'Il nucleo si spegne' : 'Corsa abbandonata');
    this.open('end',
      '<div class="eyebrow">' + uscita + '</div>' +
      '<h1 class="logo" style="font-size:clamp(38px,11vw,72px)">' + (win ? 'VITTORIA' : morto ? 'FINE' : 'ABBANDONATA') + '</h1>' +
      /* «Ucciso da» valeva `!win`, quindi lo diceva anche a chi abbandonava
         — nominando l'ultima cosa che l'aveva sfiorato — e lo taceva a chi
         cadeva nel senza fine dopo aver vinto, che e' proprio chi vuole
         saperlo. La domanda e' «sei morto?», non «hai perso?». */
      (morto && G.killer ? '<div class="killer">Ucciso da <b>' + G.killer + '</b></div>' : '') +
      '<div class="stats">' + stats.map(s => '<div class="stat' + (s[2] ? ' rec' : '') + '"><div class="v">' + s[1] + '</div><div class="k">' + s[0] + '</div></div>').join('') + '</div>' +
      this.recordLine() +
      '<div class="reward">' + shardIcon() + '+' + gained + '</div>' +
      this.dannoLine() +
      '<div class="diag clip">' + this.diagnosi(win) + '</div>' +
      '<div class="seedout">SEMENZA <b>' + (G.seed >>> 0) + '</b> · ' + G.modo.n +
      (G.cong.id !== 'quiete' ? ' · ' + G.cong.n : '') + '</div>' +
      /* Una runa nuova nel mazzo è la cosa più bella che possa dire questa
         schermata, quindi sta in cima e non in mezzo a un elenco. */
      (G.runaNuova
        ? '<div class="runanuova clip" style="--c:' + EL[RUNES[G.runaNuova.id].el].c + '">' +
          '<span class="ri clip">' + svg(G.runaNuova.id) + '</span>' +
          '<span class="rt"><span class="rk">Runa sbloccata</span><b>' + RUNES[G.runaNuova.id].n + '</b>' +
          RUNES[G.runaNuova.id].d + '</span></div>'
        : '') +
      ((G.contrattiFatti && G.contrattiFatti.length)
        ? '<div class="eyebrow" style="margin-top:2px">Contratti completati</div><div class="sfidelist">' +
          G.contrattiFatti.map(x => '<div class="sfida fatta clip"><span class="sn">' + x.c.n + '</span>' +
            '<span class="sd">' + x.c.d + '</span><span class="sr">' + shardIcon() + '+' + x.r + '</span></div>').join('') +
          '</div>'
        : '') +
      ((G.sfideNuove && G.sfideNuove.length)
        ? '<div class="eyebrow" style="margin-top:2px">Sfide completate</div><div class="sfidelist">' +
          G.sfideNuove.map(s => '<div class="sfida fatta clip"><span class="sn">' + s.n + '</span>' +
            '<span class="sd">' + s.d + '</span><span class="sr">' + shardIcon() + '+' + s.r +
            (s.unlock ? ' · ' + (CHARS.find(c => c.id === s.unlock) || {}).n + ' sbloccata' : '') + '</span></div>').join('') +
          '</div>'
        : '') +
      this.ringHTML(false) +
      '<div class="hint">' + this.awakeLine() + '</div>' +
      this.prossimoHTML() +
      '<div style="display:flex;flex-direction:column;gap:9px;max-width:340px;margin:0 auto">' +
      /* la modalità senza fine è della Corsa: l'Incursione è un formato
         chiuso, e allungarla all'infinito la cancellerebbe */
      /* Solo se la corsa puo' davvero continuare: il bottone riprende la
         partita in corso, quindi offrirlo a chi e' morto o ha abbandonato
         rimetteva in piedi una corsa finita. */
      (win && G.modo.id === 'corsa' && !morto && !G.abbandonata
        ? '<button class="btn primary clip" data-a="endless"><span class="face">Continua senza fine</span></button>' : '') +
      /* la congiunzione della prossima corsa, sotto al bottone che la fa
         partire: è il gancio vero — «ancora una» è più facile da dire
         quando la prossima è già diversa da quella appena finita */
      /* dopo una vittoria l'ascensione e' appena salita da sola: la carta
         qui sotto e' l'unico posto in cui lo si legge prima di rigiocare */
      this.ascCardHTML() +
      this.congHTML(this.prossimoSeme()) +
      '<button class="btn ' + (win && G.modo.id === 'corsa' && !morto && !G.abbandonata ? '' : 'primary ') + 'clip" data-a="retry"><span class="face">Rigioca</span></button>' +
      '<button class="btn ghost clip" data-a="replay"><span class="face">Ripeti questa semenza</span></button>' +
      (G.giornaliera ? '<button class="btn ghost clip" data-a="condividi"><span class="face">Copia il risultato di oggi</span></button>' : '') +
      '<div class="btnrow">' +
      '<button class="btn ghost clip" data-a="hub"><span class="face">Osservatorio</span></button>' +
      '<button class="btn ghost clip" data-a="title"><span class="face">Menu</span></button>' +
      '</div></div>'
    );
  }
};

/* ── generazione delle scelte ───────────────────────────────── */
/* Quali rune possono uscire. Le otto di partenza più quelle guadagnate,
   e le aperture non si possono perdere per nessun motivo: se scegli di
   aprire col Fulmine, l'Arco deve restare pescabile. */
function runeSbloccate() {
  const set = SAVE.runes && SAVE.runes.length ? SAVE.runes : RUNE_BASE;
  return RUNEIDS.filter(id => set.indexOf(id) >= 0 || APERTURE.some(a => a.id === id));
}
/* ── analisi dell'anello ──────────────────────────────
   Funzioni pure: rispondono a "quanto sarebbe lunga la catena SE…" senza
   toccare lo stato. Servono a tre cose che prima non esistevano — non
   proporre mai tre carte che non possono sbloccare niente, sapere quando la
   Ritempra ha senso, e dire DOVE spostare una runa perché si trasformi.
   La catena la misura catenaDi() in 02-engine, lo stesso che la trasforma
   in gradi: qui ce n'era una seconda copia, e una seconda copia della
   stessa regola prima o poi racconta quella sbagliata. */
/* ── quali rune conviene riaccordare, e a cosa serve ──────────────
   Diceva soltanto «questa, verso il Fuoco». Bastava a far comparire la
   carta, non a farla capire: in campo la Ritempra era una schermata con
   qualche runa che pulsa e nessun motivo visibile per preferirne una, cioe'
   «toccare a caso l'anello». Adesso ogni bersaglio si porta dietro il
   PERCHE' — quanto diventa lunga la catena, se accende un Risveglio, e cosa
   l'elemento di prima ci rimette — e l'anello lo scrive sopra alle rune.
   Due cose che prima non guardava affatto:
   · l'Iride non e' un bersaglio. Vale GIA' come qualunque elemento, quindi
     fissarla su uno e' l'unica mossa che le toglie qualcosa.
   · un bersaglio che ABBASSA il conto dei Risvegli non si offre. Il vecchio
     punteggio sommava solo i guadagni — `Math.max(0, ...)` — quindi
     proponeva con entusiasmo la riaccordatura che allungava una catena di
     una runa spegnendo il Risveglio dall'altra parte.
   Il grado lo misura gradoCatena(), lo stesso che accende i Risvegli:
   una regola, un posto solo. */
function bersagliRitempra() {
  const out = [], n = G.slots, R = G.ring, c0 = catenaRichiesta();
  const base = {}, grado = {};
  for (const e of ELKEYS) { base[e] = catenaDi(e); grado[e] = gradoCatena(base[e], c0); }
  for (let i = 0; i < n; i++) {
    const r = R[i]; if (!r || r.el === 'iride') continue;
    const cand = new Set();
    const a = R[(i - 1 + n) % n], b = R[(i + 1) % n];
    if (a && a.el !== 'iride') cand.add(a.el);
    if (b && b.el !== 'iride') cand.add(b.el);
    if (SAVE.apertura && SAVE.apertura !== 'iride') cand.add(SAVE.apertura);
    let best = null;
    for (const el of cand) {
      if (el === r.el) continue;
      let gradi = 0, dopo = 0, giu = 0;
      for (const e of ELKEYS) {
        const q = catenaDi(e, { i, el });
        if (e === el) dopo = q;
        if (e === r.el) giu = q;
        gradi += gradoCatena(q, c0) - grado[e];
      }
      if (dopo <= base[el] || gradi < 0) continue;
      const v = {
        slot: i, el, da: r.el, gain: dopo - base[el], gradi,
        prima: base[el], dopo, c0,
        accende: gradoCatena(dopo, c0) > grado[el],
        /* cosa lascia indietro l'elemento di prima: e' la meta' della
           decisione, e non era scritta da nessuna parte */
        giuPrima: base[r.el], giuDopo: giu,
        spegne: gradoCatena(giu, c0) < grado[r.el]
      };
      if (!best || v.gradi > best.gradi || (v.gradi === best.gradi && v.gain > best.gain)) best = v;
    }
    if (best) out.push(best);
  }
  /* il migliore per primo: l'anello lo marca, e la riga sotto lo nomina */
  out.sort((x, y) => (y.gradi - x.gradi) || (y.gain - x.gain));
  return out;
}
/* risonanza che avrebbe la runa in posizione i, su un anello ipotetico */
function resInPosizione(arr, i) {
  const n = G.slots, a = arr[i];
  if (!a) return 0;
  let res = 0;
  const b1 = arr[(i - 1 + n) % n], b2 = arr[(i + 1) % n];
  if (b1 && compat(a, b1)) res++;
  if (b2 && compat(a, b2)) res++;
  if (G.char && G.char.rule === 'ecoLunga' && n >= 5) {
    const c1 = arr[(i - 2 + n) % n], c2 = arr[(i + 2) % n];
    if (c1 && compat(a, c1)) res = Math.min(3, res + 1);
    if (c2 && compat(a, c2)) res = Math.min(3, res + 1);
  }
  return res;
}
/* Questa runa si può sacrificare? Il criterio "non risuona" non bastava:
   con un'Iride nell'anello risuona tutto, e le rune nuove sparivano di nuovo
   dal mazzo. Quello che conta davvero è se toglierla SPEGNEREBBE un Risveglio.
   Se no, è materiale di scambio — e il giocatore vede gli archi, quindi la
   conseguenza non è nascosta. */
function sacrificabile(i) {
  const r = G.ring[i];
  if (!r) return false;
  const c0 = catenaRichiesta();
  for (const e of ELKEYS) {
    if (!G.awaken[e]) continue;
    if (catenaDi(e, { i, el: null }) < c0) return false;
  }
  return true;
}

/* dove spostare la runa dell'alloggiamento i perché risuoni da entrambi i lati */
function scambioUtile(i) {
  const n = G.slots, R = G.ring;
  if (!R[i]) return -1;
  for (let j = 0; j < n; j++) {
    if (j === i) continue;
    const arr = R.slice();
    const t = arr[j]; arr[j] = arr[i]; arr[i] = t;
    if (resInPosizione(arr, j) >= 2) return j;
  }
  return -1;
}
/* questa carta può cambiare la COMPOSIZIONE dell'anello? */
function aiutaAnello(c) {
  if (c.t === 'evo' || c.t === 'ritempra' || c.t === 'diss') return true;
  if (c.t === 'rnew') {
    const el = RUNES[c.id].el, n = G.slots;
    const fit = x => x && (x.el === el || x.el === 'iride' || el === 'iride');
    for (let i = 0; i < n; i++) {
      const libero = !G.ring[i] || sacrificabile(i);
      if (!libero) continue;
      if (fit(G.ring[(i - 1 + n) % n]) || fit(G.ring[(i + 1) % n])) return true;
    }
  }
  return false;
}

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
  /* Dissolvere. Senza, la runa iniziale è una tassa permanente: con sei
     alloggiamenti ti obbliga a usare il suo elemento come una delle due
     catene, o a rinunciare al secondo Risveglio. Pesa di più ad anello
     pieno, che è quando è l'unico modo di cambiare idea. */
  if (inRing.length >= 3) pool.push({ t: 'diss', w: empty ? 1.8 : 4.2 });
  /* Ritempra: riaccorda una runa all'elemento di una vicina, conservandone
     forma e livello. Compare solo se c'è davvero una runa che, riaccordata,
     allungherebbe una catena — altrimenti sarebbe una carta vuota travestita
     da carta interessante. È il secondo modo di scongelare l'anello, e a
     differenza di Dissolvi non lascia un buco. */
  const rit = bersagliRitempra();
  if (rit.length) pool.push({ t: 'ritempra', w: empty ? 2.2 : 6.5 });
  const vuoti = G.slots - inRing.length;
  const wNew = 3.6 + vuoti * 1.3;
  for (const r of inRing) if (r.lv < RUNE_MAX) pool.push({ t: 'rup', id: r.id, w: 3.4 });
  /* Solo le rune sbloccate. Prima ci finivano tutte e sedici dal primo
     livello della prima partita, quindi non esisteva — mai, in tutta la
     vita del giocatore — il momento «ho trovato una runa nuova». Le sei
     aperture sono sempre nel mazzo, così ogni apertura resta giocabile. */
  /* Le rune nuove restavano fuori dal mazzo appena l'anello si riempiva, cioè
     dopo cinque o sei livelli: da lì la composizione elementale era decisa per
     il resto della partita. Misurato su una corsa vera: al quarto minuto sei
     elementi diversi, nessun Risveglio, e nel mazzo nemmeno una `rnew`. Ora si
     offrono sempre — ad anello pieno la nuova runa PRENDE IL POSTO di una che
     non risuona, e quella si dissolve in frammenti. */
  let sostituibili = 0;
  for (let i = 0; i < G.slots; i++) if (G.ring[i] && sacrificabile(i)) sostituibili++;
  if (empty || sostituibili) for (const id of runeSbloccate()) {
    if (inRing.some(r => r.id === id)) continue;
    let w = id === 'iride' ? wNew * .55 : wNew;
    if (!empty) w *= .5;                      /* sostituire costa: pesa meno di riempire */
    /* un elemento già presente pesa di più: è così che la catena si forma da
       sola invece di dipendere da sei sorteggi indipendenti */
    const gia = inRing.filter(r => r.el === RUNES[id].el).length;
    if (gia) w *= 1 + gia * .7;
    pool.push({ t: 'rnew', id, w });
  }
  for (const id of PASSIDS) {
    const lv = G.passives[id] | 0, max = PASSIVES[id].max;
    if (lv < max) pool.push({ t: 'pas', id, w: 2.5 });
    /* oltre il massimo, a valore ridotto: senza, in una corsa lunga la pool si
       svuota e restano "Dissolvi" e due mucchi di frammenti */
    else if (lv < max + ECCESSO_MAX) pool.push({ t: 'pas', id, w: .8 });
  }
  /* Ascesi: piccola, ripetibile all'infinito, sempre valida. È il pavimento
     della pool — con questa nessuna schermata può ridursi a un riempitivo.
     Il pavimento di prima era una carta «120 frammenti», e quando l'Ascesi
     l'ha sostituita e' rimasta disegnata, applicabile e cercata in tre
     punti senza che nulla la mettesse piu' nel mazzo: una carta che il
     gioco sapeva fare e non poteva pescare. Vedi il controllo «ogni carta
     che si sa disegnare si sa anche pescare» in tools/collaudo.mjs. */
  pool.push({ t: 'ascesi', w: pool.length <= 4 ? 9 : 1.2 });
  const out = [];
  let total = 0; for (const o of pool) total += o.w;
  while (out.length < n && pool.length) {
    let r = nextRand() * total, k = 0;
    for (; k < pool.length - 1; k++) { r -= pool[k].w; if (r <= 0) break; }
    total -= pool[k].w; out.push(pool.splice(k, 1)[0]);
  }
  while (out.length < n) out.push({ t: 'ascesi' });
  /* Ad anello pieno le rune nuove non entrano nemmeno nel mazzo, quindi
     Dissolvere e' l'unico modo di cambiare idea. Ma era in due tempi:
     dissolvi adesso e SPERI che al livello dopo esca la runa. Nel frattempo
     l'alloggiamento vuoto spegne risonanze e Risvegli — la stessa cosa che
     dissolvere doveva servire a sistemare. Ora dopo un Dissolvi la runa
     nuova e' garantita, finche' non ne piazzi una: il costo resta (un
     livello, e il buco nell'anello), la scommessa no. */
  if (G.dissolto && empty && !out.some(o => o.t === 'rnew')) {
    const nuove = runeSbloccate().filter(id => !inRing.some(r => r.id === id));
    if (nuove.length) {
      /* sacrifica la carta meno preziosa, mai una trasformazione */
      let k = out.findIndex(o => o.t === 'pas');
      if (k < 0) k = out.findIndex(o => o.t === 'rup');
      if (k < 0) k = out.length - 1;
      out[k] = { t: 'rnew', id: nuove[(nextRand() * nuove.length) | 0] };
    }
  }
  /* Nessuna mano morta. Finché non hai acceso un Risveglio, almeno una delle
     tre carte deve poter cambiare la composizione dell'anello: era questo, più
     di ogni altra cosa, a far finire partite intere senza mai vedere la
     meccanica principale. E fra quelle utili vince, se c'è, una runa della tua
     apertura — la direzione che hai scelto deve poter essere seguita. */
  const acceso = ELKEYS.some(e => G.awaken[e]);
  if (!acceso && !out.some(aiutaAnello)) {
    const utili = pool.filter(aiutaAnello);
    if (utili.length) {
      const pref = utili.filter(c => c.t === 'rnew' && RUNES[c.id].el === SAVE.apertura);
      const src = pref.length ? pref : utili;
      src.sort((a, b) => b.w - a.w);
      let k = out.findIndex(o => o.t === 'pas');
      if (k < 0) k = out.length - 1;
      out[k] = src[0];
    }
  }
  return out;
}

function applyChoice(c) {
  if (c.t === 'diss') return 'diss';       /* quale runa lo si sceglie nell'anello */
  if (c.t === 'ritempra') return 'ritempra';
  if (c.t === 'evo') {
    const i = G.ring.findIndex(x => x && x.id === c.id);
    if (i >= 0) {
      /* ── la trasformazione non disfa la Ritempra ────────────────
         L'elemento della forma evoluta era `RUNES[c.to].el`, cioe' quello di
         NASCITA. Ogni evoluzione resta nel proprio elemento, quindi per una
         runa qualunque e' lo stesso numero — ma non per una riaccordata: una
         Scheggia portata al Fuoco dalla Ritempra tornava di Gelo nell'istante
         in cui si trasformava, davanti agli occhi di chi l'aveva riaccordata
         per costruirci una catena.
         E non era solo il colore: quella runa reggeva un lato della catena di
         Fuoco, quindi il premio per cui avevi progettato tutta la partita
         SPEGNEVA il Risveglio che serviva ad ottenerlo. Misurato: anello
         Scintilla-Scheggia(→fuoco)-Pira, Ardore acceso, la Scheggia si
         trasforma in Zanna e l'Ardore si spegne nello stesso fotogramma.
         L'elemento e' quello che la runa ha ADESSO, come il livello. */
      const el = G.ring[i].el;
      /* ── la trasformazione non costa livelli ────────────────────
         Il livello della runa nuova era scritto a mano: 5. Era il numero
         giusto quando la soglia per trasformarsi era 8 — si scendeva di
         tre gradini e si compravano in cambio i numeri della forma
         evoluta. Poi la soglia e' scesa a 6 (5 col Crogiolo) e questo 5 e'
         rimasto li', e la regola che ne usciva non la si puo' scrivere:
         chi ci arriva al 6 perde un livello, chi ci arriva all'8 ne perde
         tre, e chi ha comprato il Crogiolo non ne perde nessuno. Cioe'
         piu' avevi investito nella runa, piu' ti costava trasformarla —
         proprio la runa su cui il gioco ti chiede di investire dal primo
         minuto — e una reliquia da 2600 frammenti aveva un secondo effetto
         che non dichiarava.
         Il livello se lo tiene. Il salto di potenza sta gia' tutto nei
         numeri della forma evoluta: misurato a parita' di livello, fra il
         +7% e il +124% sulla runa di partenza. */
      G.ring[i] = { id: c.to, el, lv: G.ring[i].lv, cd: 0, res: 0, slot: i, st: {} };
      G.evoCount++;
      if (SAVE.evoVisti.indexOf(c.to) < 0) { SAVE.evoVisti.push(c.to); storeSave(); }
      recalcRing(true);
      UI.toast('TRASFORMAZIONE', RUNES[c.to].n, EL[el].c);
      AU.play('awake'); G.shake = Math.max(G.shake, 16); G.hitstop = .12;
      G.zones.push({ k: 'ring', x: G.p.x, y: G.p.y, r0: 10, r1: 460, t: 0, dur: .7, c: EL[el].c });
    }
    return false;
  }
  if (c.t === 'ascesi') {
    G.ascesi = (G.ascesi | 0) + 1;
    recalc();
    UI.toast('ASCESI ' + G.ascesi, '+5% danno · +4% vita · +3% area', '#bff6ff');
    return false;
  }
  if (c.t === 'pas') {
    G.passives[c.id] = (G.passives[c.id] | 0) + 1;
    recalc(); UI.toast(PASSIVES[c.id].n, PASSIVES[c.id].d, PASSIVES[c.id].c);
    return false;
  }
  if (c.t === 'rup') {
    const r = G.ring.find(x => x && x.id === c.id);
    if (r) { r.lv++; UI.toast(nomeRuna(r) + ' ' + r.lv, 'Potenziata', EL[r.el].c); }
    recalcRing(true);
    return false;
  }
  return true; /* rnew → richiede collocazione */
}

/* Le tre carte tenute da parte valgono ancora? Tenerle e' giusto — se no
   «Riordina l'anello → Fatto» sarebbe un Rilancio gratis e infinito — ma
   riordinare cambia l'anello sotto di loro, e due carte hanno bisogno che
   l'anello sia in un certo stato per poter essere applicate: una runa
   nuova vuole un alloggiamento libero o una runa sacrificabile, la
   Ritempra vuole almeno una runa che riaccordata allunghi una catena.
   Senza questo controllo bastava riordinare fino a rendere ogni runa
   portante — sei rune, due catene da tre — per ritrovarsi con una carta
   che apre l'anello e nessun alloggiamento che la accetti: quella
   schermata non ha il bottone «Fatto», quindi la partita restava li'.  */
function manoValida(ch) {
  if (!ch || !ch.length) return false;
  if (ch.some(c => c.t === 'rnew')) {
    let posti = 0;
    for (let i = 0; i < G.slots; i++) if (!G.ring[i] || sacrificabile(i)) posti++;
    if (!posti) return false;
  }
  if (ch.some(c => c.t === 'ritempra') && !bersagliRitempra().length) return false;
  return true;
}

/* Una carta consumata: la pila scende, e con lei la quota di carte che
   veniva da uno scrigno. Sono due contatori perche' G.pending non sa da
   dove arriva quello che contiene. */
function consumaCarta() {
  G.pending--;
  if ((G.chests | 0) > 0) G.chests--;
}

function placeRune(id, slot) {
  G.dissolto = 0;
  G.ring[slot] = { id, el: RUNES[id].el, lv: 1, cd: rand(.3), res: 0, slot, st: {} };
  recalcRing(true);
  AU.play('buy');
}

/* ── ciclo di partita ───────────────────────────────────────── */
function resetRun(charId, seed, modoId, giorno) {
  /* il seme va fissato PRIMA di qualunque altra cosa: rocce, runa iniziale
     e ricariche pescano già da qui */
  G.seed = (seed >>> 0) || newSeed();
  srand(G.seed);
  /* Il modo dice quanto dura e con quanti guardiani; la congiunzione è la
     regola che il SEME sorteggia per questa corsa, quindi è già decisa
     prima che si tocchi Gioca ed è scritta sotto al bottone. `cg` sono i
     suoi modificatori fusi coi valori neutri: chi li legge non deve sapere
     se una congiunzione c'è o no. */
  G.modo = modoDi(modoId || SAVE.modo);
  G.cong = congiunzioneDi(G.seed);
  G.cg = congMods(G.cong);
  G.giornaliera = !!giorno;
  /* Chi arriva e quando: identità e pattern rimescolati, numeri dello slot. */
  G.roster = rosterGuardiani(G.modo);
  const c = CHARS.find(x => x.id === charId) || CHARS[0];
  G.char = c;
  G.skin = SKINS.find(k => k.id === SAVE.skin) || SKINS[0];
  G.ascLv = Math.min(SAVE.ascSel | 0, SAVE.asc | 0, ASC.length - 1);
  G.asc = ascMods(G.ascLv);
  G.slots = Math.max(4, 6 + mlv('orbita') + G.asc.slots + G.cg.slots);
  if (c.rule === 'anelloCorto') G.slots = Math.max(3, G.slots - 2);
  G.ring = new Array(G.slots).fill(null);
  G.passives = {};
  G.enemies.length = 0; G.bullets.length = 0; G.ebul.length = 0; G.gems.length = 0;
  G.zones.length = 0; G.parts.length = 0; G.floats.length = 0; G.drops.length = 0;
  G.t = 0; G.level = 1; G.xp = 0; G.xpNeed = xpFor(1); G.kills = 0; G.shards = 0; G.lvCd = 0;
  G.dmgDone = 0; G.pending = 0; G.chests = 0; G.spawnAcc = 0; G.eliteT = ELITE_T; G.bossIdx = 0; G.boss = null; G.bosses.length = 0; G.eliteHint = 0;
  G.diff = 0; G.gemT = 1.5; G.ev = null; G.evT = 70; G.evUltimo = null; G.form = null; G.shake = 0; G.cadT = 0; G.dissolto = 0; G.maxT = 0; G.maxHint = 0;
  G.nodo = null; G.nodoK = null; G.biasX = 0; G.biasY = 0;
  G.evoCount = 0; G.reorders = 0; G.awakeMax = 0; G.awakeAt = 0; G.lowHp = 0; G.pieno = 0; G.tier3 = 0; G.hitstop = 0; G.victory = false; G.healCd = 0; G.ringRot = 0;
  G.bossKills = 0; G.maxLv = 1; G.tier2 = 0; G.rerollUsati = 0; G.respiro = 0;
  /* il confronto col record lo scrive payout(): finche' non c'e' non deve
     restare quello della partita prima */
  G.rec = null;
  /* quanto e' gia' stato pagato per QUESTA corsa, e se ha gia' una riga
     nello storico: servono a «Continua senza fine», che chiude la partita
     una volta e poi la fa finire una seconda */
  G.saldato = 0; G.registrata = 0; G.lezioneGemme = 0;
  /* la vittoria di questa corsa: se e' gia' stata contata (una sola, anche
     quando la corsa finisce due volte), a che minuto e' arrivata, se e'
     proseguita nel senza fine e se e' stata abbandonata invece che persa */
  G.vintaContata = 0; G.vintaT = 0; G.oltre = 0; G.abbandonata = 0;
  /* il Perigeo: l'anello riparte aperto, e i contatori del suo assorbimento
     non devono sopravvivere alla corsa di prima */
  G.peri = 0; G.periAss = 0; G.peris = 0; G.ringR = RING_R;
  /* una spiegazione rimasta in sospeso non appartiene alla corsa nuova:
     `G.briefing` sopravviveva a resetRun, e chi ricomincia si ritrovava
     fermo su una schermata della partita di prima */
  G.briefing = null;
  G.raggio = RAGGIO_MIRA; G.tenacia = 1; G.chiarezza = 1; G.kps = 0; G.kAcc = 0;
  G.raffN = 0; G.raffX = 0; G.raffY = 0; G.raffR = 0; G.popIdx = 0; G.popT = 0; G.raffFin = 0; G.raffCd = 0;
  G.awaken = { fuoco: 0, gelo: 0, fulmine: 0, vuoto: 0, luce: 0 };
  G.awk = { fuoco: 0, gelo: 0, fulmine: 0, vuoto: 0, luce: 0 };
  G.awakeVisto = {}; G.evoAnn = {};
  G.charge = 0; G.culm = 0; G.culms = 0; G.chargeAnn = 0;
  UI._culmSt = null; UI._culmFx = null;   /* niente lampi ereditati dalla corsa di prima */
  G.combo = 0; G.comboMax = 0; G.comboLv = 0; G.kb0 = 0; G.kb1 = 0; G.kbT = .5;
  G.dmgSrc = {}; G.killer = null;
  G.dissT = 34; G.dissAtt = 0; G.formT = 52; G.ascesi = 0;
  G.p.x = 0; G.p.y = 0; G.p.vx = 0; G.p.vy = 0; G.p.inv = 1.2; G.p.hurt = 0;
  G.cam.x = 0; G.cam.y = 0;
  G.revives = mlv('rinascita');
  G.rerolls = 2 + mlv('ripensamento');
  genRocks();
  G.demo = false;
  hideMoveHint();
  /* Presagio: il primo elite, cioè il primo scrigno, cioè la prima carta
     in più, arriva in metà tempo. È la spesa da 160 frammenti che si vede
     alla prima partita dopo averla fatta — e per tre versioni ha fatto
     l'opposto, perché il numero era scritto a mano qui (60) mentre quello
     base scendeva altrove (da 90 a 26). Vedi ELITE_T in 01-data. */
  if (mlv('presagio')) G.eliteT = ELITE_T_PRESAGIO;
  /* Un pavimento al 30%: l'ascensione 8 parte a metà vita e la congiunzione
     Vetro pure, e moltiplicate darebbero un quarto — cioè una partita già
     persa prima del primo nemico, per una regola che non hai scelto. */
  P.hp = undefined; recalc(); P.hp = P.maxHp * Math.max(.3, G.asc.startHp * G.cg.startHp);
  const ap = APERTURE.find(a => a.el === SAVE.apertura) || APERTURE[0];
  placeRune(ap.id, 0);
  /* Innesco: l'apertura parte al terzo livello. Non è un +x%: vuol dire che
     la prima catena morde subito, quindi il primo Risveglio arriva prima. */
  if (mlv('innesco') && G.ring[0]) G.ring[0].lv = 3;
  recalcRing(false);
  /* Semenza (reliquia): una carta in mano prima ancora di cominciare. */
  if (hasRel('semenza')) G.pending = 1;
  UI.renderAwake();
}
/* Rimettere in piedi una corsa annotata. Si ricostruisce da resetRun con
   lo STESSO seme, così l'arena, gli asteroidi e i Nodi tornano identici;
   poi si riscrive sopra il progresso. I nemici non erano stati annotati —
   sarebbero centinaia — quindi ne rimettiamo subito una quota pari al
   tetto del momento: senza, uscire e rientrare sarebbe un pulsante per
   ripulire lo schermo, e diventerebbe una tattica invece di un rimedio. */
function riprendiCorsa(r) {
  AU.init();
  SAVE.ascSel = Math.min(r.asc | 0, SAVE.asc | 0);
  resetRun(r.char, r.seed, r.modo, !!r.giorno);
  G.t = r.t; G.level = r.level; G.xp = r.xp; G.xpNeed = r.xpNeed;
  G.kills = r.kills; G.shards = r.shards; G.dmgDone = r.dmg || 0;
  G.diff = r.diff || 0; G.tenacia = r.ten || 1; G.bossIdx = r.bossIdx | 0;
  G.rerolls = r.rer | 0; G.revives = r.riv | 0;
  G.bossKills = r.bk | 0; G.maxLv = r.ml || 1; G.tier2 = r.t2; G.tier3 = r.t3;
  G.evoCount = r.evo | 0; G.reorders = r.reo | 0; G.awakeMax = r.aM | 0; G.awakeAt = r.aA | 0;
  G.lowHp = r.low; G.pieno = r.pieno; G.rerollUsati = r.ru | 0; G.respiro = r.resp;
  G.lezioneGemme = r.lez | 0; G.saldato = r.sal | 0;
  /* L'Ascesi va rimessa PRIMA di recalc(), o la vita massima esce sbagliata.
     E `pending` va riletto dall'annotazione invece di restare quello che
     resetRun ha appena messo: con la Semenza quello vale 1, cioe' ogni
     ripresa regalava una carta. */
  G.ascesi = r.asc2 | 0; G.culms = r.cul | 0; G.pending = r.pend | 0; G.chests = r.chs | 0;
  /* la carica e la pausa: vedi salvaCorsa. I limiti servono perche'
     l'annotazione sta in localStorage, cioe' e' scrivibile: senza, una
     carica a 9 varrebbe nove Culmini e una pausa negativa non finirebbe mai.
     Un'annotazione vecchia non ha i due campi, e allora vale zero — come
     prima, cioe' come oggi si comporta chi ha salvato ieri. */
  G.charge = clamp(+r.car || 0, 0, 1); G.chargeAnn = G.charge >= 1 ? 1 : 0;
  G.lvCd = clamp(+r.lvc || 0, 0, G.modo.pausaLv);
  G.dmgSrc = (r.src && typeof r.src === 'object' && !Array.isArray(r.src)) ? Object.assign({}, r.src) : {};
  G.passives = Object.assign({}, r.pas || {});
  G.ring = new Array(G.slots).fill(null);
  for (const x of r.ring) {
    if (!x || !RUNES[x.id] || x.slot >= G.slots) continue;
    /* l'elemento annotato, non quello di nascita: vedi salvaCorsa. Le
       annotazioni vecchie non ce l'hanno, e allora vale quello di nascita. */
    const el = (x.el && EL[x.el]) ? x.el : RUNES[x.id].el;
    G.ring[x.slot] = { id: x.id, el, lv: x.lv, cd: rand(.4), res: 0, slot: x.slot, st: {} };
  }
  recalc(); P.hp = Math.max(1, Math.min(r.hp, P.maxHp));
  recalcRing(false);
  UI.renderAwake();
  /* la pressione che c'era: il campo non riparte sgombro */
  const quota = Math.round(tettoNemici() * .55);
  for (let i = 0; i < quota; i++) spawnRing(pick(currentPool()));
  HUD.classList.add('on');
  UI.close(); G.state = 'play'; G.ripresa = RIPRESA;
  UI.hud();
  hideMoveHint();
}

function startRun(charId, seed, modoId, giorno) {
  AU.init();
  /* il seme che il menu ha già mostrato: la congiunzione scritta sotto al
     bottone dev'essere quella che si gioca, o non era una dichiarazione */
  resetRun(charId, seed || UI.seme || 0, modoId, giorno);
  UI.seme = 0;
  HUD.classList.add('on');
  UI.close(); G.state = 'play'; G.ripresa = 0;
  UI.hud();
  showMoveHint();
  SAVE.runs = (SAVE.runs | 0) + 1; storeSave();
  scordaCorsa();
  /* la Semenza consegna una carta prima del primo nemico */
  if (G.pending > 0) { G.state = 'level'; UI.levelup(); }
}
function payout() {
  const asc = 1 + (G.ascLv || 0) * .18;   /* salire di ascensione deve convenire */
  /* `paga` tiene onesto il confronto fra i modi: un'Incursione vinta dura
     otto minuti e prende lo stesso premio di vittoria di una Corsa da venti,
     quindi senza questo rendeva molto di più al minuto e la Corsa diventava
     una perdita di tempo. Con .8 l'Incursione rende ancora un po' di più
     all'ora — è giusto, sono otto minuti più intensi — ma non tanto da
     cancellare l'altro formato. */
  /* i quattro pesi stanno in PAGA (01-data), con la misura che li ha
     decisi: qui c'era una riga di numeri scritti a mano, nati quando il
     negozio aveva un terzo delle voci di adesso. */
  const g = Math.round((G.kills * PAGA.kill + G.t * PAGA.sec + G.level * PAGA.lv +
    (G.victory ? PAGA.vittoria : 0)) * P.shardMul * asc * (G.modo.paga || 1)) + G.shards;
  return Math.max(1, g);
}

/* L'istantanea della partita appena finita. La leggono le sfide, gli
   sblocchi delle rune e i contratti: un oggetto solo, così una condizione
   scritta una volta vale per tutti e tre.                                */
function statoPartita(win) {
  return {
    win: !!win, t: G.t, kills: G.kills, level: G.level, ascLv: G.ascLv || 0,
    awakeMax: G.awakeMax | 0, awakeAt: G.awakeAt | 0, evo: G.evoCount | 0,
    reorders: G.reorders | 0, pieno: !!G.pieno, lowHp: !!G.lowHp,
    tier2: !!G.tier2, tier3: !!G.tier3,
    bossKills: G.bossKills | 0, maxLv: G.maxLv | 0, rerollUsati: G.rerollUsati | 0,
    modo: G.modo.id, aw: G.awaken,
    iride: G.ring.some(r => r && r.el === 'iride')
  };
}
/* Valuta le sfide a fine partita. Restituisce quelle appena completate,
   così la schermata finale può mostrarle invece di farle passare inosservate. */
function valutaSfide(s) {
  const nuove = [];
  for (const sf of SFIDE) {
    if (SAVE.sfide.indexOf(sf.id) >= 0) continue;
    let ok = false;
    try { ok = !!sf.f(s); } catch (e) { ok = false; }
    if (!ok) continue;
    SAVE.sfide.push(sf.id);
    SAVE.shards += sf.r;
    if (sf.unlock && SAVE.chars.indexOf(sf.unlock) < 0) SAVE.chars.push(sf.unlock);
    nuove.push(sf);
  }
  return nuove;
}

/* Le rune che questa partita ha portato nel mazzo. Ne esce al massimo una
   per partita, apposta: due sblocchi insieme si annullano a vicenda, e la
   fine di ogni corsa deve avere UNA cosa nuova da guardare. */
function valutaSblocchi(s) {
  for (const sb of SBLOCCHI) {
    if (SAVE.runes.indexOf(sb.id) >= 0) continue;
    let ok = false;
    try { ok = !!sb.f(s); } catch (e) { ok = false; }
    if (!ok) continue;
    SAVE.runes.push(sb.id);
    return sb;
  }
  return null;
}

/* I contratti completati si pagano e si sostituiscono subito: il posto
   liberato viene ripescato qui, così non esiste mai lo stato «nessun
   obiettivo». Un contratto ripescato può essere lo stesso di prima solo
   quando il mazzo è finito, e quello è un caso che non si raggiunge. */
function valutaContratti(s) {
  const fatti = [];
  const restano = [];
  for (const id of SAVE.contratti) {
    const c = CONTRATTI.find(x => x.id === id);
    if (!c) continue;
    let ok = false;
    try { ok = !!c.f(s); } catch (e) { ok = false; }
    if (ok) { const r = contrattoPremio(c); SAVE.shards += r; fatti.push({ c, r }); }
    else restano.push(id);
  }
  SAVE.contratti = restano;
  pescaContratti();
  return fatti;
}

/* Le ultime venti partite. È lo storico che si legge nell'Osservatorio, ed
   è anche l'unica telemetria possibile in un gioco che non tocca la rete:
   con dieci amici e una settimana si vede DOVE si smette, invece di
   dedurlo. Campi corti perché finisce nel codice di backup. */
function registraStorico(win, g) {
  const r = {
    t: Math.floor(G.t), k: G.kills, l: G.level, c: G.char.id,
    /* `win` arriva gia' vero per una corsa vinta e poi continuata: la
       regola sta in endRun, e riscriverla qui era la seconda copia */
    m: G.modo.id, a: G.ascLv | 0, w: win ? 1 : 0, s: g,
    g: G.cong.id, b: G.bossKills | 0, d: Date.now(), sd: G.seed >>> 0
  };
  /* Una corsa continuata senza fine finisce due volte: la riga e' la
     stessa, aggiornata, non due partite diverse nell'elenco. */
  if (G.registrata && SAVE.storico[0] && SAVE.storico[0].sd === r.sd) {
    r.s = (SAVE.storico[0].s | 0) + g;
    SAVE.storico[0] = r;
    return;
  }
  SAVE.storico.unshift(r);
  G.registrata = 1;
  if (SAVE.storico.length > 20) SAVE.storico.length = 20;
}

function endRun(win) {
  /* ── una corsa vinta resta vinta ────────────────────────────────
     «Il mio record e' una partita da oltre 21 minuti, ma ho dovuto
     abbandonarla e risulta che ho perso.» Succedeva davvero, e la Corsa e'
     costruita perche' succeda: l'ultimo guardiano arriva al diciottesimo
     minuto, lo abbatti, la schermata dice VITTORIA e offre «Continua senza
     fine». Da quel momento la corsa e' vinta — il premio di 700 frammenti e'
     pagato, la riga dello storico e' segnata `w:1`, l'ascensione e' salita —
     ma qualunque cosa la chiudesse dopo chiamava `endRun(false)`, e quel
     `false` arrivava intero fino allo schermo: «FINE», «Il nucleo si
     spegne», e la diagnosi da sconfitta. Peggio: statoPartita(false) diceva
     `win:false` a sfide, sblocchi e contratti, cioe' alla seconda chiusura
     nessuno di quelli che chiedono una vittoria poteva completarsi.
     La vittoria e' un fatto della corsa, non dell'ultimo istante: `G.victory`
     lo sa, e da qui in giu' `win` e' quel fatto.
     Quello che invece si paga UNA VOLTA SOLA resta protetto: i frammenti da
     `G.saldato`, la riga dello storico da `G.registrata`, e il conto delle
     vittorie — con l'ascensione che sblocca — da `G.vintaContata`, che senza
     questo avrebbe contato due vittorie per la stessa corsa. */
  win = !!(win || G.victory);
  /* `Continua senza fine` chiude la partita e poi la fa finire di nuovo:
     senza questo la stessa corsa veniva pagata due volte per intero — e
     con lei il premio di vittoria. Adesso si paga solo la differenza. */
  const lordo = payout();
  const g = Math.max(0, lordo - (G.saldato | 0));
  G.saldato = lordo;
  SAVE.shards += g;
  const s = statoPartita(win);
  const sfideNuove = valutaSfide(s);
  G.sfideNuove = sfideNuove;
  G.runaNuova = valutaSblocchi(s);
  G.contrattiFatti = valutaContratti(s);
  registraStorico(win, g);
  /* la corsa del giorno tiene il proprio record, ed è l'unico punteggio del
     gioco che si può confrontare con qualcun altro: stessa data, stesso
     seme, stessa arena, stessa congiunzione */
  if (G.giornaliera) {
    const oggi = dataOggi();
    if (SAVE.giorno.d !== oggi) SAVE.giorno = { d: oggi, t: 0, k: 0, w: 0 };
    if (G.t > SAVE.giorno.t) { SAVE.giorno.t = Math.floor(G.t); SAVE.giorno.k = G.kills; }
    if (win) SAVE.giorno.w = 1;
  }
  /* ── il record si batteva in silenzio ────────────────────────
     SAVE.best veniva aggiornato qui, cioe' PRIMA che UI.end disegnasse la
     schermata: quando quella schermata scriveva TEMPO 15:40 il record era
     gia' 15:40, quindi non poteva ne' dire «nuovo record» ne' dire quanto
     ne era mancato. In un gioco di sopravvivenza il proprio tempo migliore
     e' il punteggio, e il momento in cui si decide di rigiocare e' proprio
     questo: il record va letto prima di scriverlo. */
  const prec = (SAVE.rec && SAVE.rec[G.modo.id]) || { t: 0, k: 0 };
  G.rec = { t: prec.t | 0, k: prec.k | 0, nuovoT: G.t > (prec.t | 0), nuovoK: G.kills > (prec.k | 0) };
  if (!SAVE.rec) SAVE.rec = {};
  if (!SAVE.rec[G.modo.id]) SAVE.rec[G.modo.id] = { t: 0, k: 0 };
  if (G.rec.nuovoT) SAVE.rec[G.modo.id].t = Math.floor(G.t);
  if (G.rec.nuovoK) SAVE.rec[G.modo.id].k = G.kills;
  if (G.t > (SAVE.best || 0)) SAVE.best = Math.floor(G.t);
  if (G.kills > (SAVE.bestKills || 0)) SAVE.bestKills = G.kills;
  if (win && !G.vintaContata) {
    G.vintaContata = 1;
    SAVE.wins = (SAVE.wins | 0) + 1;
    /* si sblocca il livello dopo solo vincendo al proprio massimo:
       non si scala l'ascensione rigiocando quelle facili */
    if (G.ascLv >= (SAVE.asc | 0) && SAVE.asc < ASC.length - 1) {
      SAVE.asc = G.ascLv + 1; SAVE.ascSel = SAVE.asc;
      setTimeout(() => UI.toast('ASCENSIONE ' + SAVE.asc, ASC[SAVE.asc].d, '#ffc857'), 800);
    }
  }
  storeSave();
  scordaCorsa();
  G.state = 'over';
  HUD.classList.remove('on');
  AU.play(win ? 'level' : 'die');
  UI.end(win, g);
}
function winRun() {
  if (G.victory) return;
  G.victory = true; G.vintaT = G.t;
  G.zones.push({ k: 'ring', x: G.p.x, y: G.p.y, r0: 10, r1: 1200, t: 0, dur: 1, c: '#ffffff' });
  setTimeout(() => { if (G.state === 'play') endRun(true); }, 900);
}

/* ── azioni dell’interfaccia ────────────────────────────────── */
/* 'toggle' non risale: serve la fase di cattura per sapere che il pannello
   Backup e' aperto e ridisegnarlo aperto. */
SCR.addEventListener('toggle', ev => {
  const d = ev.target;
  if (d && d.classList && d.classList.contains('backup')) UI.backupOpen = !!d.open;
}, true);
SCR.addEventListener('click', ev => {
  const b = ev.target.closest('[data-a]');
  /* toccare altrove annulla una spesa in attesa di conferma */
  if (!b) { if (UI.armato) { UI.armato = null; UI.hub(); } return; }
  const armato = UI.armato; UI.armato = null;
  const a = b.dataset.a;
  AU.init();
  if (a !== 'slot') AU.play('ui');
  switch (a) {
    /* Gioca gioca. L'Osservatorio era diventato una dogana: per una
       partita dovevi attraversare il negozio anche quando non compravi
       niente. Ora ci vai quando vuoi cambiare qualcosa o spendere. */
    case 'go': startRun(SAVE.char); break;
    case 'hub': UI.hub(); break;
    case 'riprendi': { const r = leggiCorsa(); if (r) riprendiCorsa(r); else UI.title(); break; }
    case 'scorda': scordaCorsa(); UI.title(); break;
    /* Due modi di smettere, e la differenza va scritta: questo tiene la
       corsa per dopo, «Abbandona» la chiude e la paga. Prima c'era solo il
       secondo, quindi «esco un attimo» voleva dire ricominciare da capo. */
    case 'sospendi': {
      salvaCorsa();
      G.state = 'menu'; HUD.classList.remove('on');
      UI.title();
      UI.toast('CORSA IN SOSPESO', 'La riprendi dal menu quando vuoi', '#6ff2c4');
      break;
    }
    case 'condividi': copiaTesto(testoGiorno(), 'Incollalo a chi gioca la stessa data'); break;
    case 'scheda': UI.hub(b.dataset.id); break;
    case 'briefdone': UI.chiudiBriefing(); break;
    case 'modo': {
      SAVE.modo = b.dataset.id; storeSave();
      if (UI.cur && UI.cur.slice(0, 3) === 'hub') UI.hub(); else UI.title();
      break;
    }
    /* La corsa del giorno è un'Incursione: otto minuti, così è una cosa che
       si fa davvero ogni giorno, e stessa data uguale stesso seme, quindi
       stessa arena e stessa congiunzione per chiunque la giochi. */
    case 'giorno': startRun(SAVE.char, semeDelGiorno(), 'incursione', true); break;
    case 'apertura': SAVE.apertura = b.dataset.id; storeSave(); AU.play('ui'); UI.hub(); break;
    case 'skin': {
      SAVE.skin = b.dataset.id; storeSave();
      G.skin = SKINS.find(k => k.id === SAVE.skin) || SKINS[0];
      for (const el of SCR.querySelectorAll('[data-a="skin"]')) el.classList.toggle('on', el.dataset.id === SAVE.skin);
      /* se c'era una spesa in attesa il tocco l'ha disarmata: quella riga
         va ridisegnata, o resta a dire «tocca ancora per confermare» */
      if (armato) UI.hub();
      break;
    }
    case 'title': UI.title(); break;
    case 'guide': UI.guide(); break;
    /* Il lessico si apre dalla pausa e dalla guida, e «Indietro» riporta da
       dove si e' arrivati: aprirlo in partita non deve poter buttare fuori
       dalla corsa (open() manda al menu solo i nomi title/hub/guide). */
    case 'lessico': UI.lessicoApri(UI.cur === 'guide' ? 'guide' : 'pause'); break;
    case 'lesback': if (UI.lesDa === 'guide') UI.guide(); else UI.pause(); break;
    case 'start': { const el = SCR.querySelector('#seedin'); const v = el ? parseInt(el.value, 10) : NaN; startRun(SAVE.char, Number.isFinite(v) && v > 0 ? v : 0); break; }
    case 'retry': startRun(SAVE.char); break;
    case 'replay': startRun(SAVE.char, G.seed); break;
    case 'resume': UI.togglePause(); break;
    /* Abbandonare passa dalla stessa porta di una morte. Prima saltava la
       valutazione: chi usciva al dodicesimo minuto perdeva il contratto
       «sopravvivi dodici minuti» che aveva appena completato, il che è
       esattamente il tipo di sorpresa che fa smettere. */
    /* Abbandonare non e' morire: la schermata diceva «Il nucleo si spegne»
       e, se la corsa era gia' vinta, «FINE». Sono due uscite diverse e
       adesso si distinguono. */
    case 'quit': scordaCorsa(); G.abbandonata = 1; endRun(false); break;
    case 'sfx': SAVE.sfx = SAVE.sfx ? 0 : 1; storeSave(); AU.vol(); UI.pause(); break;
    case 'mus': SAVE.mus = SAVE.mus ? 0 : 1; storeSave(); AU.vol(); UI.pause(); break;
    /* `G.oltre` dice che la corsa vinta e' proseguita: serve alla schermata
       di fine, che senza di lui riproponeva «Continua senza fine» a chi era
       appena morto nel senza fine — e quel bottone riprendeva una partita
       finita. */
    case 'endless': G.victory = true; G.oltre = 1; HUD.classList.add('on'); riprendiGioco(); UI.toast('SENZA FINE', 'La difficoltà cresce · la corsa resta vinta', '#ff3d6e'); break;
    case 'ringedit': UI.ringEdit(null); break;
    case 'ringedit2': UI.ringEdit(null); break;
    case 'ringdone': if (G.state === 'pause') UI.pause(); else if (G.pending > 0) UI.levelup(true); else riprendiGioco(); break;
    case 'char': {
      const c = CHARS.find(x => x.id === b.dataset.id);
      if (SAVE.chars.indexOf(c.id) >= 0) { SAVE.char = c.id; storeSave(); UI.hub(); }
      else if (SAVE.shards < c.cost) UI.toast('TROPPO CARO', 'Ti mancano ' + (c.cost - SAVE.shards) + ' frammenti', '#ff3d6e');
      else if (armato !== 'char:' + c.id) { UI.armato = 'char:' + c.id; UI.hub(); }
      else {
        SAVE.shards -= c.cost; SAVE.chars.push(c.id); SAVE.char = c.id; storeSave();
        AU.play('buy'); UI.spesa = c.cost; UI.hub();
        UI.toast(c.n + ' sbloccata', '-' + c.cost + ' frammenti · te ne restano ' + SAVE.shards, c.c);
      }
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
    /* due passaggi, come per gli acquisti: il primo tocco arma la domanda,
       il secondo cancella davvero. Toccare altrove la disarma da solo. */
    case 'wipe': {
      if (armato !== 'wipe') { UI.armato = 'wipe'; UI.hub(); return; }
      wipeSave();
      /* dietro al menu gira il gioco vero: se il nucleo e la sagoma restano
         quelli di prima, l'azzeramento sembra a meta' */
      G.char = CHARS.find(c => c.id === SAVE.char) || CHARS[0];
      G.skin = SKINS.find(k => k.id === SAVE.skin) || SKINS[0];
      AU.play('die');
      UI.hub();
      UI.toast('PROGRESSI AZZERATI', 'Si riparte da zero', '#ff3d6e');
      break;
    }
    case 'wipeno': {
      UI.hub();
      break;
    }
    case 'meta': {
      const m = META.find(x => x.id === b.dataset.id), lv = mlv(m.id);
      if (lv >= m.max) return;
      const cost = metaCost(m, lv);
      if (SAVE.shards < cost) { UI.toast('TROPPO CARO', 'Ti mancano ' + (cost - SAVE.shards) + ' frammenti', '#ff3d6e'); return; }
      if (armato !== 'meta:' + m.id) { UI.armato = 'meta:' + m.id; UI.hub(); return; }
      SAVE.shards -= cost; SAVE.meta[m.id] = lv + 1; storeSave(); AU.play('buy');
      UI.spesa = cost; UI.hub();
      UI.toast(m.n + ' ' + (lv + 1) + ' di ' + m.max, '-' + cost + ' frammenti · te ne restano ' + SAVE.shards, '#ffc857');
      break;
    }
    case 'reliquia': {
      const r = RELIQUIE.find(x => x.id === b.dataset.id);
      if (!r || hasRel(r.id)) return;
      if (SAVE.shards < r.c) { UI.toast('TROPPO CARO', 'Ti mancano ' + (r.c - SAVE.shards) + ' frammenti', '#ff3d6e'); return; }
      if (armato !== 'rel:' + r.id) { UI.armato = 'rel:' + r.id; UI.hub(); return; }
      SAVE.shards -= r.c; SAVE.reliquie.push(r.id); storeSave(); AU.play('buy');
      UI.spesa = r.c; UI.hub();
      UI.toast(r.n, '-' + r.c + ' frammenti · te ne restano ' + SAVE.shards, '#ffc857');
      break;
    }
    case 'reroll': {
      if (G.rerolls <= 0) return;
      G.rerolls--; G.rerollUsati++; AU.play('ui'); UI.levelup();
      break;
    }
    case 'skip': {
      /* saltare non è pura rinuncia: cura e frammenti rendono la
         rinuncia una scelta fra potenza e sopravvivenza */
      const avanzo = hasRel('avanzo');
      const cura = Math.round(P.maxHp * (avanzo ? .3 : .15));
      /* la carta saltata paga la stessa scala di tutto il resto: il numero
         che l'avviso promette e' quello che finisce nel borsello */
      const premio = fram(avanzo ? 120 : 40);
      P.hp = Math.min(P.maxHp, P.hp + cura);
      G.shards += premio;
      UI.toast('SALTATO', '+' + cura + ' vita · +' + premio + ' frammenti', '#6ff2c4');
      AU.play('buy');
      consumaCarta();
      if (G.pending > 0) UI.levelup(); else riprendiGioco();
      break;
    }
    case 'pick': {
      const c = UI.choices[+b.dataset.i];
      const needsPlace = applyChoice(c);
      consumaCarta();
      if (needsPlace === 'diss') UI.ringEdit(null, true);
      else if (needsPlace === 'ritempra') UI.ringEdit(null, false, true);
      else if (needsPlace) UI.ringEdit(c.id);
      else if (G.pending > 0) UI.levelup();
      else riprendiGioco();
      break;
    }
    case 'slot': {
      const i = +b.dataset.i;
      if (UI.ritemprando) {
        const r = G.ring[i];
        const t = (UI.ritBersagli || []).find(x => x.slot === i);
        /* Il rifiuto diceva sempre la stessa frase, anche quando il motivo
           era un altro: un alloggiamento vuoto, o l'Iride — che un elemento
           suo non ce l'ha. Un «no» che non dice quale regola hai incontrato
           insegna solo che la schermata e' capricciosa. */
        if (!r) { UI.toast('ALLOGGIAMENTO VUOTO', 'La Ritempra riaccorda una runa che c’è già', '#ff3d6e'); return; }
        if (r.el === 'iride') { UI.toast('L’IRIDE È GIÀ OGNI ELEMENTO', 'Fissarla su uno le toglierebbe il suo mestiere', '#ff7de3'); return; }
        if (!t) {
          const b0 = (UI.ritBersagli || [])[0];
          UI.toast('NESSUN GUADAGNO', 'Riaccordare ' + RUNES[r.id].n + ' non allunga nessuna catena' +
            (b0 ? ' · prova l’alloggiamento ' + (b0.slot + 1) : ''), '#ff3d6e');
          return;
        }
        /* primo tocco: la scelgo e la riga sotto dice cosa cambia. Il
           secondo conferma — vedi ritLine(). */
        if (UI.ritSel !== i) { UI.ritSel = i; AU.play('ui'); UI.refreshRing(); return; }
        const da = EL[r.el].n;
        r.el = t.el; UI.ritemprando = false; UI.ritSel = -1;
        recalcRing(true);
        UI.toast('RITEMPRATA', nomeRuna(r) + ' · da ' + da + ' a ' + EL[t.el].n + ' · forma e livello restano', EL[t.el].c);
        AU.play('buy'); G.shake = Math.max(G.shake, 9);
        /* ── e si vede in campo ──────────────────────────────────
           La Ritempra e' l'unica delle tre carte dell'anello a non lasciare
           traccia a schermo: la trasformazione ha l'onda e il fermo
           immagine, la dissoluzione il tonfo, e riaccordare una runa era un
           colore che cambiava in una schermata ferma. Al rientro in campo
           non c'era modo di riconoscere quale runa fosse cambiata.
           Due onde del colore nuovo — una dal nucleo, una dalla runa — e le
           scintille addosso a lei: la seconda e' quella che conta, perche'
           dice QUALE. */
        G.zones.push({ k: 'ring', x: G.p.x, y: G.p.y, r0: 10, r1: 380, t: 0, dur: .55, c: EL[t.el].c });
        if (r.wx !== undefined) {
          G.zones.push({ k: 'ring', x: r.wx, y: r.wy, r0: 4, r1: 120, t: 0, dur: .5, wait: .1, c: EL[t.el].c });
          burstPart(r.wx, r.wy, 16, EL[t.el].c, 220, 3.4, .6);
        }
        if (G.pending > 0) UI.levelup(); else riprendiGioco();
        return;
      }
      if (UI.dissolving) {
        const r = G.ring[i];
        if (!r) return;
        /* mai svuotare del tutto l'anello: resteresti senza attacchi */
        if (G.ring.filter(Boolean).length <= 1) { UI.toast('SERVE ALMENO UNA RUNA', null, '#ff3d6e'); return; }
        const reso = fram(25 + r.lv * 20) * (hasRel('mercante') ? 2 : 1);
        G.shards += reso; G.ring[i] = null; UI.dissolving = false; G.dissolto = 1;
        recalcRing(true);
        UI.toast('DISSOLTA', nomeRuna(r) + ' · +' + reso + ' frammenti', '#ff3d6e');
        AU.play('blast'); G.shake = Math.max(G.shake, 8);
        if (G.pending > 0) UI.levelup(); else riprendiGioco();
        return;
      }
      if (UI.placing) {
        const occ = G.ring[i];
        if (occ && !sacrificabile(i)) { UI.toast('SPEGNEREBBE UN RISVEGLIO', 'Scegli una runa che non regge una catena accesa', '#ff3d6e'); return; }
        if (occ) {
          const reso = fram(20 + occ.lv * 16) * (hasRel('mercante') ? 2 : 1);
          G.shards += reso;
          UI.toast('SOSTITUITA', nomeRuna(occ) + ' · +' + reso + ' frammenti', '#ff3d6e');
          G.shake = Math.max(G.shake, 6);
        }
        placeRune(UI.placing, i); UI.placing = null;
        if (G.pending > 0) UI.levelup(); else riprendiGioco();
        return;
      }
      if (UI.sel < 0) { if (!G.ring[i]) return; UI.sel = i; AU.play('ui'); }
      else if (UI.sel === i) { UI.sel = -1; }
      else {
        const t = G.ring[i]; G.ring[i] = G.ring[UI.sel]; G.ring[UI.sel] = t;
        if (G.ring[i]) G.ring[i].slot = i;
        if (G.ring[UI.sel]) G.ring[UI.sel].slot = UI.sel;
        UI.sel = -1; G.reorders++; recalcRing(true); AU.play('buy');
      }
      UI.refreshRing();
      break;
    }
  }
});


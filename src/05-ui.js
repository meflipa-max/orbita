/* ═══════════════════════════════════════════════════════════════
   ORBITA — interfaccia, schermate, ciclo di partita.
   ═══════════════════════════════════════════════════════════════ */

const SCR = $('#screens'), HUD = $('#hud');
const elLv = $('#lvnum'), elXp = $('#xpfill'), elXpLine = $('#xpline'), elHpF = $('#hpfill'), elHpG = $('#hpghost'),
  elHpT = $('#hptxt'), elClock = $('#clock'), elKills = $('#kills'), elAwake = $('#awake'),
  elFlash = $('#flash'), elToasts = $('#toasts'), elHint = $('#movehint'), elNext = $('#nextboss'), elAsc = $('#ascchip'), elNodo = $('#nodochip');

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
const ARC = (r, a1, a2) => {
  const x1 = 50 + Math.cos(a1) * r, y1 = 50 + Math.sin(a1) * r;
  const x2 = 50 + Math.cos(a2) * r, y2 = 50 + Math.sin(a2) * r;
  let d = a2 - a1; while (d < 0) d += TAU;
  return 'M' + x1.toFixed(2) + ' ' + y1.toFixed(2) + ' A ' + r + ' ' + r + ' 0 ' + (d > PI ? 1 : 0) + ' 1 ' + x2.toFixed(2) + ' ' + y2.toFixed(2);
};

const UI = {
  cur: null, sel: -1, placing: null, dissolving: false, chestMode: false,
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
    elLv.textContent = G.level;
    elXp.style.width = (clamp(G.xp / G.xpNeed, 0, 1) * 100) + '%';
    const f = clamp(P.hp / P.maxHp, 0, 1);
    elHpF.style.transform = 'scaleX(' + f + ')';
    elHpG.style.transform = 'scaleX(' + f + ')';
    elHpT.textContent = Math.ceil(Math.max(0, P.hp)) + ' / ' + Math.round(P.maxHp);
    elClock.textContent = fmtTime(G.t);
    elKills.textContent = G.kills + ' ELIMINAZIONI';
    /* il roster della partita, non la tabella globale: l'ordine si rimescola
       e l'Incursione ne salta due, quindi il prossimo nome è quello vero */
    const nb = G.roster[G.bossIdx];
    if (nb && !G.boss) {
      const left = Math.max(0, Math.max(45, nb.t + G.asc.boss) - G.t);
      elNext.className = left < 25 ? 'on soon' : 'on';
      elNext.innerHTML = '<i></i>' + nb.n + ' ' + fmtTime(left);
    } else elNext.className = '';
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

  /* la congiunzione di questa corsa, dichiarata */
  congHTML(seed) {
    const c = congiunzioneDi(seed);
    const quiete = c.id === 'quiete';
    /* La riga diceva «Vetro» e cosa fa, ma non che cosa FOSSE: un nome
       proprio mai visto, senza una categoria sopra, non si può indovinare.
       Ogni altra carta del gioco ha la sua etichetta — «EVENTO D'ARENA»,
       «IL TERRENO CONTA», «RUNA SBLOCCATA» — e questa no. E la parola da
       sola non basterebbe: quello che serve sapere è che cambia a ogni
       corsa, altrimenti sembra una statistica del tuo nucleo. */
    return '<div class="cong clip' + (quiete ? ' calma' : '') + '" style="--c:' + c.c + '">' +
      '<span class="ci clip">' + svg('congiunzione') + '</span>' +
      '<span class="ct"><span class="ck">Congiunzione · cambia a ogni corsa</span>' +
      '<b>' + c.n + '</b>' + c.d + '</span></div>';
  },

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
      this.congHTML(seed) +
      '</div>';
  },

  title() {
    const best = SAVE.best ? fmtTime(SAVE.best) : '—';
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
      '</div></div>' +
      '<div class="hint">Record ' + best + ' · ' + (SAVE.wins || 0) + ' vittorie · <b style="color:#ffc857">' + SAVE.shards + '</b> frammenti</div>' +
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
        p('Trascina ovunque sullo schermo per muoverti: la levetta compare sotto il dito, con la destra o con la sinistra. Da tastiera <kbd>WASD</kbd> o le frecce, <kbd>Esc</kbd> per la pausa. Le rune sparano da sole: l’unica cosa che fai con le mani è schivare.')) +

      sec('L’anello',
        p('Ogni livello scegli una runa e <em>dove metterla</em>. Due rune vicine dello stesso elemento <em>risuonano</em>: <b>+30% danno a ciascuna</b>. Lontane fra loro, zero. L’anello è <b>circolare</b>: l’ultimo alloggiamento confina col primo.')) +

      sec('Che cos’è un Risveglio',
        p('Tre rune dello stesso elemento <b>una di fila all’altra</b> accendono un Risveglio: una regola nuova che vale per <em>tutti</em> i tuoi colpi fino a fine partita — anche quelli delle rune di altri elementi.') +
        p('Non è un potenziamento della runa: è un potere aggiunto alla partita. E se ne possono tenere accesi più d’uno insieme.') +
        '<div class="awlist">' + awRows + '</div>' +
        p('A <b>cinque</b> rune in fila il Risveglio sale al secondo grado, a <b>sette</b> al terzo: stesso effetto, molto più forte.')) +

      sec('Tecniche',
        '<ol class="tips">' +
        '<li><b>Raggruppa, non alternare.</b> Con le stesse sei rune, disporle a gruppi invece che alternate vale <b>+27% di danno</b> e due Risvegli invece di nessuno.</li>' +
        '<li><b>Il numero magico è tre.</b> Due rune danno risonanza ma nessun Risveglio: la terza dello stesso elemento vale più di un potenziamento su una runa che hai già.</li>' +
        '<li><b>Chi sta in mezzo conta.</b> In una catena di tre, solo quella centrale ottiene risonanza da entrambi i lati. Mettici la runa che vuoi trasformare, o quella che picchia di più.</li>' +
        '<li><b>L’Iride dipende da cosa vuoi.</b> Sul confine fra due gruppi accende un secondo Risveglio, utile contro la folla. Dentro il tuo gruppo principale fa più danno puro, meglio contro i guardiani.</li>' +
        '<li><b>Riordinare è gratis</b>, dalla pausa, in qualsiasi momento. E la carta <b>Dissolvi</b> ti libera un alloggiamento: non sei legato per sempre alla runa di partenza.</li>' +
        '<li><b>Non sei obbligato a prendere.</b> Se nessuna delle tre carte ti convince, <b>Rilancia</b> per pescarne altre tre, o <b>Salta</b>: rinunci al potenziamento ma recuperi vita e frammenti. Una runa che non vuoi ti costa un alloggiamento per sempre, quindi saltare spesso è la scelta giusta.</li>' +
        '<li><b>Nadir e Lyra ribaltano le regole.</b> Con Nadir le rune risuonano anche saltando un alloggiamento, quindi alternare funziona. Con Lyra ogni runa conta doppia: due bastano per un Risveglio.</li>' +
        '</ol>') +

      sec('Trasformazioni',
        p('Una runa a <b>livello 8</b>, che risuona da <b>entrambi</b> i lati e il cui elemento è <b>risvegliato</b>, si trasforma in qualcosa di diverso. L’anello ti dice quando è pronta e cosa manca.')) +

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

      sec('Congiunzioni',
        p('Ogni corsa ne sorteggia una, ed è <b>scritta prima di partire</b>: nemici molti di più e più fragili, metà vita ma più danno, il doppio degli asteroidi, i Risvegli che chiedono una runa in meno. Una corsa su quattro è <b>Quiete</b>, cioè nessuna.') +
        p('Non è una difficoltà in più: è una domanda diversa. La stessa semenza dà sempre la stessa congiunzione, quindi «ripeti questa semenza» ripete anche quella.')) +

      sec('Il mazzo cresce',
        p('Si comincia con <b>otto rune</b> su sedici. Le altre entrano nel mazzo una alla volta, per traguardi: sopravvivere quattro minuti, accendere un Risveglio, abbattere un guardiano, portare una runa al quinto livello. L’Osservatorio dice sempre qual è la prossima e cosa chiede.')) +

      sec('Contratti',
        p('Tre obiettivi sempre in corso, e appena ne completi uno ne arriva un altro. Pagano in frammenti, e il premio cresce con l’ascensione più alta che hai raggiunto. Servono a dare una direzione alla partita di stasera quando le dodici <b>sfide</b> — che invece si prendono una volta sola — sono finite.')) +

      sec('Sopravvivere',
        p('I guardiani hanno un conto alla rovescia in alto a destra. <b>Identità e pattern ruotano a ogni partita</b>, i numeri no: puoi trovarti le cariche del Titano al secondo minuto senza che il secondo minuto sia più duro. Gli scrigni dorati regalano potenziamenti, e ogni novanta secondi succede qualcosa in un punto preciso della mappa.') +
        p('A terra cadono anche <b>cuori</b> (vita) e <b>bombe</b>: la bomba non colpisce i dintorni, <b>uccide ogni nemico della mappa</b> tranne i guardiani. Il dono più vicino porta scritto cos’è.') +
        p('I nemici con una <b>barra sopra la testa</b> — elite dorati, corrieri e guardiani — sono quelli che vale la pena finire: quella barra è la loro <b>vita</b>. La scia bianca è il danno appena inflitto, e il colore vira al rosso quando stanno per cedere. In cima allo schermo c’è la barra dei guardiani: se ne hai addosso più d’uno — gemelli compresi — si <b>divide in un tratto per ciascuno</b>, largo quanto la sua stazza, col nome dello stesso colore.') +
        p('I frammenti restano fra una partita e l’altra: spendili nell’Osservatorio in potenziamenti permanenti, nuclei e <b>reliquie</b> — quelle sono care, ma ognuna è una regola invece di una percentuale.')) +

      '</div></div>' +
      '<button class="btn clip" style="max-width:280px;margin:0 auto" data-a="title"><span class="face">Indietro</span></button>'
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
      corpo = this.contrattiHTML() + this.runeHTML() + this.sfideHTML();
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
      let evoCls = '';
      if (this.dissolving) evoCls = r ? ' dissolvibile' : '';
      else if (r && EVO[r.id]) evoCls = canEvolve(r) ? ' pronto' : (r.lv >= 8 ? ' vicino' : '');
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

  /* Chiudere una spiegazione. È un metodo e non solo il corpo di un
     `case` perché il collaudo deve poterlo chiamare: la versione
     precedente non faceva ripartire il gioco — riprendiGioco() era stato
     cancellato da una modifica — e la partita restava congelata per
     sempre sulla carta. Un errore a tempo di esecuzione, che `node
     --check` non vede e nessun test premeva quel bottone. */
  chiudiBriefing() {
    const id = G.briefing; G.briefing = null;
    if (id && SAVE.visti.indexOf(id) < 0) { SAVE.visti.push(id); storeSave(); }
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
  levelup(chest) {
    this.chestMode = !!chest;
    /* Ventaglio: quattro carte invece di tre, ma solo nei primi tre livelli.
       È lì che la scelta conta di più — decide le prime due catene — ed è lì
       che un pescato brutto costa una partita intera. Dopo tornano tre: una
       quarta carta sempre attaccherebbe la varietà, non la fondazione. */
    const quattro = mlv('ventaglio') && !chest && G.level <= 3;
    const ch = rollChoices(quattro ? 4 : 3);
    this.choices = ch;
    const cards = ch.map((c, i) => this.cardHTML(c, i)).join('');
    this.open('level',
      '<div class="eyebrow">' + (chest ? 'Scrigno stellare' : 'Livello ' + G.level) + '</div>' +
      '<h2 class="ttl">' + (chest ? 'Un dono dal vuoto' : 'Il nucleo cresce') + '</h2>' +
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
    if (c.t === 'diss') {
      return '<button class="card diss clip" data-a="pick" data-i="' + i + '" style="--c:#ff3d6e"><span class="face">' +
        '<span class="ico clip">' + svg('vortice') + '</span><span class="body">' +
        '<span class="kicker">Anello</span><h3>Dissolvi</h3>' +
        '<p>Rimuovi una runa dall’anello e <em>libera il suo alloggiamento</em>. Ti restituisce frammenti in base al livello.</p>' +
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
  ringEdit(placing, dissolving) {
    this.placing = placing || null; this.dissolving = !!dissolving; this.sel = -1;
    const t = this.dissolving
      ? 'Tocca la runa da dissolvere. L’alloggiamento torna libero.'
      : this.placing
        ? 'Scegli dove collocare <span style="color:' + EL[RUNES[this.placing].el].c + '">' + RUNES[this.placing].n + '</span>'
        : 'Tocca due rune per scambiarle';
    this.open('ring',
      '<div class="eyebrow">Anello · ' + G.slots + ' alloggiamenti</div>' +
      '<h2 class="ttl">' + (this.dissolving ? 'Dissoluzione' : this.placing ? 'Collocazione' : 'Riordina') + '</h2>' +
      '<p class="sub" style="margin-top:-8px">' + t + '</p>' +
      this.ringHTML(true) +
      '<div class="hint" id="ringinfo">' + this.awakeLine() + (this.evoLine() ? '<br>' + this.evoLine() : '') + '</div>' +
      (this.placing || this.dissolving ? '' : '<button class="btn primary clip" style="max-width:280px;margin:0 auto" data-a="ringdone"><span class="face">Fatto</span></button>')
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
    else if (G.state === 'pause') riprendiGioco();
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

  end(win, gained) {
    const stats = [['TEMPO', fmtTime(G.t)], ['LIVELLO', G.level], ['ELIMINAZIONI', G.kills], ['DANNO', Math.round(G.dmgDone).toLocaleString('it-IT')]];
    this.open('end',
      '<div class="eyebrow">' + (win ? 'Eclissi dissolta' : 'Il nucleo si spegne') + '</div>' +
      '<h1 class="logo" style="font-size:clamp(38px,11vw,72px)">' + (win ? 'VITTORIA' : 'FINE') + '</h1>' +
      '<div class="stats">' + stats.map(s => '<div class="stat"><div class="v">' + s[1] + '</div><div class="k">' + s[0] + '</div></div>').join('') + '</div>' +
      '<div class="reward">' + shardIcon() + '+' + gained + '</div>' +
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
      (win && G.modo.id === 'corsa' ? '<button class="btn primary clip" data-a="endless"><span class="face">Continua senza fine</span></button>' : '') +
      /* la congiunzione della prossima corsa, sotto al bottone che la fa
         partire: è il gancio vero — «ancora una» è più facile da dire
         quando la prossima è già diversa da quella appena finita */
      this.congHTML(this.prossimoSeme()) +
      '<button class="btn ' + (win && G.modo.id === 'corsa' ? '' : 'primary ') + 'clip" data-a="retry"><span class="face">Rigioca</span></button>' +
      '<button class="btn ghost clip" data-a="replay"><span class="face">Ripeti questa semenza</span></button>' +
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
  if (inRing.length >= 3) pool.push({ t: 'diss', w: empty ? 1.8 : 5.5 });
  const vuoti = G.slots - inRing.length;
  const wNew = 3.6 + vuoti * 1.3;
  for (const r of inRing) if (r.lv < 8) pool.push({ t: 'rup', id: r.id, w: 3.4 });
  /* Solo le rune sbloccate. Prima ci finivano tutte e sedici dal primo
     livello della prima partita, quindi non esisteva — mai, in tutta la
     vita del giocatore — il momento «ho trovato una runa nuova». Le sei
     aperture sono sempre nel mazzo, così ogni apertura resta giocabile. */
  if (empty) for (const id of runeSbloccate()) {
    if (inRing.some(r => r.id === id)) continue;
    pool.push({ t: 'rnew', id, w: id === 'iride' ? wNew * .55 : wNew });
  }
  for (const id of PASSIDS) { const lv = G.passives[id] | 0; if (lv < PASSIVES[id].max) pool.push({ t: 'pas', id, w: 2.5 }); }
  const out = [];
  let total = 0; for (const o of pool) total += o.w;
  while (out.length < n && pool.length) {
    let r = nextRand() * total, k = 0;
    for (; k < pool.length - 1; k++) { r -= pool[k].w; if (r <= 0) break; }
    total -= pool[k].w; out.push(pool.splice(k, 1)[0]);
  }
  while (out.length < n) out.push({ t: 'gold' });
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
      let k = out.findIndex(o => o.t === 'gold');
      if (k < 0) k = out.findIndex(o => o.t === 'pas');
      if (k < 0) k = out.findIndex(o => o.t === 'rup');
      if (k < 0) k = out.length - 1;
      out[k] = { t: 'rnew', id: nuove[(nextRand() * nuove.length) | 0] };
    }
  }
  return out;
}

function applyChoice(c) {
  if (c.t === 'diss') return 'diss';   /* la scelta di quale runa avviene nell'anello */
  if (c.t === 'evo') {
    const i = G.ring.findIndex(x => x && x.id === c.id);
    if (i >= 0) {
      const el = RUNES[c.to].el;
      G.ring[i] = { id: c.to, el, lv: 5, cd: 0, res: 0, slot: i, st: {} };
      G.evoCount++;
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
  G.slots = Math.max(4, 6 + mlv('orbita') + G.asc.slots);
  if (c.rule === 'anelloCorto') G.slots = Math.max(3, G.slots - 2);
  G.ring = new Array(G.slots).fill(null);
  G.passives = {};
  G.enemies.length = 0; G.bullets.length = 0; G.ebul.length = 0; G.gems.length = 0;
  G.zones.length = 0; G.parts.length = 0; G.floats.length = 0; G.drops.length = 0;
  G.t = 0; G.level = 1; G.xp = 0; G.xpNeed = xpFor(1); G.kills = 0; G.shards = 0;
  G.dmgDone = 0; G.pending = 0; G.spawnAcc = 0; G.eliteT = 26; G.bossIdx = 0; G.boss = null; G.bosses.length = 0; G.eliteHint = 0;
  G.diff = 0; G.gemT = 1.5; G.ev = null; G.evT = 70; G.shake = 0; G.cadT = 0; G.dissolto = 0; G.maxT = 0; G.maxHint = 0;
  G.nodo = null; G.nodoK = null; G.biasX = 0; G.biasY = 0;
  G.evoCount = 0; G.reorders = 0; G.awakeMax = 0; G.awakeAt = 0; G.lowHp = 0; G.pieno = 0; G.tier3 = 0; G.hitstop = 0; G.victory = false; G.healCd = 0; G.ringRot = 0;
  G.bossKills = 0; G.maxLv = 1; G.tier2 = 0; G.rerollUsati = 0; G.respiro = 0;
  /* quanto e' gia' stato pagato per QUESTA corsa, e se ha gia' una riga
     nello storico: servono a «Continua senza fine», che chiude la partita
     una volta e poi la fa finire una seconda */
  G.saldato = 0; G.registrata = 0; G.lezioneGemme = 0;
  G.raggio = RAGGIO_MIRA; G.tenacia = 1; G.chiarezza = 1; G.kps = 0; G.kAcc = 0;
  G.raffN = 0; G.raffX = 0; G.raffY = 0; G.raffR = 0; G.combo = 0; G.comboT = 0; G.raffFin = 0; G.raffCd = 0;
  G.awaken = { fuoco: 0, gelo: 0, fulmine: 0, vuoto: 0, luce: 0 };
  G.p.x = 0; G.p.y = 0; G.p.vx = 0; G.p.vy = 0; G.p.inv = 1.2; G.p.hurt = 0;
  G.cam.x = 0; G.cam.y = 0;
  G.revives = mlv('rinascita');
  G.rerolls = 2 + mlv('ripensamento');
  genRocks();
  G.demo = false;
  hideMoveHint();
  /* Presagio: il primo elite, cioè il primo scrigno, cioè la prima carta
     in più, arriva al minuto invece che a un minuto e mezzo. È la spesa da
     160 frammenti che si vede alla prima partita dopo averla fatta. */
  if (mlv('presagio')) G.eliteT = 60;
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
  G.passives = Object.assign({}, r.pas || {});
  G.ring = new Array(G.slots).fill(null);
  for (const x of r.ring) {
    if (!x || !RUNES[x.id] || x.slot >= G.slots) continue;
    G.ring[x.slot] = { id: x.id, el: RUNES[x.id].el, lv: x.lv, cd: rand(.4), res: 0, slot: x.slot, st: {} };
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
  const g = Math.round((G.kills * .5 + G.t * .85 + G.level * 9 + (G.victory ? 700 : 0)) * P.shardMul * asc * (G.modo.paga || 1)) + G.shards;
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
    m: G.modo.id, a: G.ascLv | 0, w: (win || G.victory) ? 1 : 0, s: g,
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
  scordaCorsa();
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
    case 'start': { const el = SCR.querySelector('#seedin'); const v = el ? parseInt(el.value, 10) : NaN; startRun(SAVE.char, Number.isFinite(v) && v > 0 ? v : 0); break; }
    case 'retry': startRun(SAVE.char); break;
    case 'replay': startRun(SAVE.char, G.seed); break;
    case 'resume': UI.togglePause(); break;
    /* Abbandonare passa dalla stessa porta di una morte. Prima saltava la
       valutazione: chi usciva al dodicesimo minuto perdeva il contratto
       «sopravvivi dodici minuti» che aveva appena completato, il che è
       esattamente il tipo di sorpresa che fa smettere. */
    case 'quit': scordaCorsa(); endRun(false); break;
    case 'sfx': SAVE.sfx = SAVE.sfx ? 0 : 1; storeSave(); AU.vol(); UI.pause(); break;
    case 'mus': SAVE.mus = SAVE.mus ? 0 : 1; storeSave(); AU.vol(); UI.pause(); break;
    case 'endless': G.victory = true; HUD.classList.add('on'); riprendiGioco(); UI.toast('SENZA FINE', 'La difficoltà cresce', '#ff3d6e'); break;
    case 'ringedit': UI.ringEdit(null); break;
    case 'ringedit2': UI.ringEdit(null); break;
    case 'ringdone': if (G.state === 'pause') UI.pause(); else if (G.pending > 0) UI.levelup(); else riprendiGioco(); break;
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
      const fram = avanzo ? 120 : 40;
      P.hp = Math.min(P.maxHp, P.hp + cura);
      G.shards += fram;
      UI.toast('SALTATO', '+' + cura + ' vita · +' + fram + ' frammenti', '#6ff2c4');
      AU.play('buy');
      G.pending--;
      if (G.pending > 0) UI.levelup(); else riprendiGioco();
      break;
    }
    case 'pick': {
      const c = UI.choices[+b.dataset.i];
      const needsPlace = applyChoice(c);
      G.pending--;
      if (needsPlace === 'diss') UI.ringEdit(null, true);
      else if (needsPlace) UI.ringEdit(c.id);
      else if (G.pending > 0) UI.levelup();
      else riprendiGioco();
      break;
    }
    case 'slot': {
      const i = +b.dataset.i;
      if (UI.dissolving) {
        const r = G.ring[i];
        if (!r) return;
        /* mai svuotare del tutto l'anello: resteresti senza attacchi */
        if (G.ring.filter(Boolean).length <= 1) { UI.toast('SERVE ALMENO UNA RUNA', null, '#ff3d6e'); return; }
        const reso = (25 + r.lv * 20) * (hasRel('mercante') ? 2 : 1);
        G.shards += reso; G.ring[i] = null; UI.dissolving = false; G.dissolto = 1;
        recalcRing(true);
        UI.toast('DISSOLTA', RUNES[r.id].n + ' · +' + reso + ' frammenti', '#ff3d6e');
        AU.play('blast'); G.shake = Math.max(G.shake, 8);
        if (G.pending > 0) UI.levelup(); else riprendiGioco();
        return;
      }
      if (UI.placing) {
        if (G.ring[i]) { UI.toast('ALLOGGIAMENTO OCCUPATO', 'Scegline uno vuoto', '#ff3d6e'); return; }
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


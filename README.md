# ORBITA

Bullet heaven roguelite. **La tua build è un anello di rune che ti gira intorno**: non c'è
una schermata inventario separata, le rune che vedi orbitare *sono* l'interfaccia.

- Rune **adiacenti** dello stesso elemento **risuonano**: +30% danno a testa.
- **Tre di fila** accendono un **Risveglio**, una regola che vale per tutti i tuoi colpi
  (incendio, rallentamento, catene, implosioni, critici che curano). A cinque e a sette
  di fila diventa più forte.
- L'**Iride** conta come qualsiasi elemento: messa fra due gruppi, ne accende due insieme.
- Riordinare l'anello è quindi il vero puzzle strategico, e si può fare in qualsiasi momento
  dalla pausa.

Partita da 20 minuti, cinque guardiani, poi modalità senza fine. I **frammenti** restano fra
una partita e l'altra e si spendono nell'Osservatorio in potenziamenti permanenti e nuovi nuclei.

### Trasformazioni

Una runa portata a livello 8 **mentre risuona da entrambi i lati e il suo elemento è
risvegliato** si trasforma. Non diventa più grande: diventa un'altra cosa. La Cometa lascia
una scia che brucia davvero e si frantuma a ogni uccisione; il Glaciale congela al tocco; il
Fulgore sdoppia la catena a ogni salto; il Mietitore risucchia i nemici lungo il cammino;
l'Alba spazza con due fasci opposti. La condizione è **posizionale**: obbliga a progettare
l'anello dal primo minuto.

### Ascensioni

Vinci e sblocchi un livello di difficoltà. Ognuno aggiunge **una regola sola**, e le regole si
sommano: scrigni che non danno più potenziamenti, un alloggiamento in meno, metà vita
iniziale, Risvegli che richiedono quattro rune in fila, guardiani in coppia. Tredici livelli.

### Nuclei

Sei nuclei, e ognuno oltre alle statistiche porta **una regola**. Due riscrivono l'anello,
che è il gioco: **Nadir** fa risuonare le rune anche saltando un alloggiamento (anelli
alternati impossibili per chiunque altro), **Lyra** ha l'anello dimezzato ma ogni runa conta
doppia per le catene — due rune bastano per un Risveglio.

Il nucleo dice *che regola* giochi. Da *dove parti* è una scelta a parte: l'**apertura**
decide la prima runa dell'anello, cioè la tua prima catena e il primo Risveglio a cui punti.
Sei aperture, una per elemento più l'Iride, e non costano nulla: si scelgono a ogni partita.

### Sfide

Dodici obiettivi che danno una direzione alle partite e insegnano i sistemi. Non medaglie:
pagano in frammenti, e due sbloccano un nucleo scavalcando il prezzo.

### Terreno

Asteroidi che fermano te e i nemici e **assorbono i colpi nemici**: sono riparo, e lampeggiano
nel punto d'impatto quando bloccano qualcosa. I tuoi proiettili passano sopra, perché bloccarli
punirebbe un attacco che è automatico — e metà dell'arsenale (aure, onde d'urto, pozze) non
sarebbe comunque fermabile da un masso.

I guardiani li **sfondano davvero**: la roccia prima si crepa, poi si sbriciola in detriti, e
quel riparo non c'è più. Prima ci passavano attraverso lasciandola intatta, che non si legge
come una regola — si legge come un difetto di collisione. L'unico che regge è il cristallo di
un Nodo: la tua ancora non te la porta via nemmeno un guardiano.

Un quarto delle formazioni sono **Nodi elementali**: cristalli sintonizzati su un elemento,
sorteggiato a ogni partita. Nella loro aura le rune di quell'elemento fanno +35% danno e la
catena di quell'elemento **conta una runa in più** — due rune adiacenti accendono il Risveglio
finché resti lì. Il cuore resta solido, quindi ci orbiti intorno: tenere la posizione rende
molto, ma restare fermi in mezzo alla mischia si paga. È l'arena stessa a favorire build
diverse a ogni corsa.

### Eventi d'arena

Ogni novanta secondi succede qualcosa che **ha un luogo**: una breccia da raggiungere prima
che si chiuda, una marea di nemici da una sola direzione, un Corriere da abbattere prima che
sparisca. Servono a dare un motivo per andare da qualche parte, quindi devono **vedersi da
lontano**: la breccia ha il suo faro, il Corriere una colonna di luce e un reticolo col conto
alla rovescia, e finché sono fuori campo una freccia a bordo schermo con distanza e secondi.

### Il direttore

La difficoltà non segue il cronometro: segue **quanto sei forte davvero**. Il gioco misura a
che distanza da te muoiono i nemici e la tiene intorno ai 250 pixel. Se li disintegri prima
ancora che entrino nello schermo, diventano più **tenaci** — meno nemici, ognuno più duro, che
vale di più in esperienza — finché tornano ad arrivarti a tiro; un nemico temprato si riconosce
dal bordo caldo. Se invece ti stanno addosso, la stretta si allenta da sola.

Tre regole lo tengono onesto: **non spinge mai sotto un terzo di vita** (così una brutta
partita non diventa una valanga), **molla più in fretta di quanto stringa** (una pausa dopo un
guardiano non ti lascia l'arena indurita), e **si ferma se il ritmo di uccisioni cala troppo**
— un bullet heaven è anche la falciata, e quella condizione ha la precedenza su tutto.

Siccome è il direttore a fare la difficoltà, la **velocità** dei nemici smette di farla: la
sua crescita ha un tetto che la tiene sotto la tua andatura base. Senza, al minuto 20 lo
Spettro ti pareggiava e al 30 ti superava — cioè Celerità smetteva di essere una scelta e
diventava una tassa, e un passivo obbligatorio è una carta in meno di varietà a ogni partita.

Misurato prima: con una build forte si stava **fermi, senza toccare niente, a zero danno** al
minuto 8, 14, 20 e 28. Dopo: fermi si muore, muovendosi bene si sopravvive prendendo colpi
veri. Chi gioca con una build modesta non si accorge del direttore, perché per lui la tenacia
resta a uno.

### Quanto mondo entra nello schermo

Il mondo era disegnato uno a uno in pixel, quindi lo schermo non decideva quanto è grande la
grafica: decideva **quanta arena esiste per te**. Un telefono vedeva un terzo di quello che
vede un desktop, e un 4K quattro volte tanto — sullo stesso gioco, con le stesse regole.

| | prima: nemici a schermo | ora |
|---|---|---|
| telefono 390×750 | **2** | 20 |
| telefono 430×880 | 9 | 24 |
| tablet 820×1180 | 41 | 37 |
| desktop 1280×800 | 42 | 38 |
| 4K 2560×1440 | **132** | 55 |

Adesso la telecamera si allarga o si stringe per tenere confrontabile l'area di mondo. Non del
tutto: compensare per intero rimpicciolirebbe le sagome sul telefono fino a renderle
illeggibili, che è il difetto opposto. Contorni e scritte disegnati nel mondo si ingrandiscono
di `1/zoom`, così restano della stessa grandezza fisica ovunque.

### Il colpo di grazia

Il piacere di un bullet heaven è il **pop**, e il pop non è una cosa grossa: è una cosa
**breve** e sincronizzata all'istante esatto. Un nemico che muore lascia un *guscio* — la sua
stessa sagoma che lampeggia bianca e si sfalda in un settimo di secondo — e detriti che vanno
nella direzione del colpo invece che in tondo, così si legge come impatto.

Il suono non parte dalla morte: le uccisioni si accumulano e si tirano le somme una volta per
fotogramma. Venti suoni identici al secondo l'orecchio li fonde in un ronzio, che è
letteralmente il contrario della soddisfazione — la soddisfazione *è* distinguere il singolo
colpo. Quindi l'altezza **cicla su una pentatonica minore**: a ritmo alto diventa un arpeggio,
a ritmo basso un rintocco. E quando ne cadono cinque in un decimo di secondo — una Nova che
apre un buco, una cascata di implosioni — sopra ai pop si aggiunge **un tonfo solo**, con una
pausa obbligata perché resti un evento e non un tamburo.

Misurato in partita: 4–5 pop al secondo (il limite è 16), una raffica ogni 3–10 secondi, e in
media **1,4 gusci a schermo**. Niente sussulto e niente tremore sui nemici comuni: a venti
uccisioni al secondo lo schermo non si fermerebbe più.

### Leggibilità

Regola unica: **ciò che ti può uccidere è la cosa più visibile dello schermo**. Le tue
esplosioni sono decorazione — non le comandi — i nemici sono informazione. Quindi più il campo
si affolla, più i tuoi effetti si fanno da parte: aloni, anelli, scintille e numeri volanti
perdono peso insieme, mentre le sagome dei nemici hanno contorno spesso e schiarito. Le gemme
a terra si fondono presto in poche gemme grosse — erano centonovanta in campo, quasi il
quadruplo dei nemici — e i doni a terra dicono a parole cosa fanno.

Niente dipendenze a runtime a parte due font Google, che degradano su stack di sistema se manca
la rete. Tutto il resto — grafica, effetti, musica generativa — è prodotto a runtime da ~2.500
righe di JavaScript, canvas 2D puro.

## Comandi

| | |
|---|---|
| Mobile | Trascina ovunque: la levetta compare sotto il dito, con la destra o con la sinistra |
| Desktop | `WASD` o frecce · `Esc` / `P` pausa |

Le rune sparano da sole. L'unica cosa che fai con le mani è schivare.

## Sviluppo

```bash
npm run build     # genera orbita.html e dist/index.html
npm run dev       # build + server statico su http://localhost:5173
```

`build.mjs` (Node, cross-platform) e `build.ps1` (Windows) producono output identico.

```
src/shell.html     markup + CSS (tema unico, "console" con angoli tagliati)
src/01-data.js     rune, passivi, nemici, boss, personaggi, potenziamenti · tutti i numeri
src/02-engine.js   stato, salvataggio, audio procedurale, input, griglia spaziale, danno
src/03-systems.js  comportamento delle rune, nemici, IA dei boss, zone, generazione
src/04-render.js   canvas: campo stellare, entità, effetti, HUD di gioco
src/05-ui.js       schermate, carte, editor dell'anello, ciclo di partita
src/06-main.js     ciclo principale, avvio
```

Due output dagli stessi sorgenti:

- **`orbita.html`** — formato Artifact (senza `doctype`/`head`/`body`: li aggiunge la piattaforma).
- **`dist/index.html`** — standalone completo. È questo che serve Vercel e che impacchetti per Android.

Entrambi sono in `.gitignore`: si rigenerano a ogni build.

## Deploy su Vercel

`vercel.json` è già configurato (`node build.mjs` → `dist/`). Basta importare il repository
da [vercel.com/new](https://vercel.com/new): Vercel rileva la configurazione, compila e pubblica.
Nessuna variabile d'ambiente, nessun servizio esterno — il gioco non fa richieste di rete.

Da riga di comando:

```bash
npx vercel --prod
```

## Impacchettare per Android

`dist/index.html` è già una WebView app: schermo intero, `viewport-fit=cover`, aree sicure
per il notch, `touch-action` gestito, salvataggio su `localStorage`.

```bash
npm i -D @capacitor/cli @capacitor/core @capacitor/android
npx cap init Orbita com.tuonome.orbita --web-dir=dist
npx cap add android
npx cap sync
npx cap open android
```

Per l'app conviene incorporare i due font come `@font-face` base64, così l'identità tipografica
regge anche offline. Il gioco non fa richieste di rete: nel manifest non serve alcun permesso.

## Bilanciamento

Tutti i numeri stanno in `src/01-data.js`. Le manopole della progressione:

| Manopola | Dove | Cosa fa |
|---|---|---|
| `xpFor()` | `02-engine.js` | curva dei livelli: cubica, rapida all'inizio per riempire l'anello, poi ripida |
| `GROWTH` | `02-engine.js` | quanto cresce una runa per livello — meno livelli, ognuno più pesante |
| `hpScale` | `02-engine.js` → `spawnEnemy` | crescita dei nemici, proporzionata a quella del giocatore |
| `rate` / `maxE` | `03-systems.js` → `updateSpawns` | ritmo di comparsa e tetto di nemici vivi |
| `G.eliteT` | `03-systems.js` → `updateSpawns` | frequenza degli elite, cioè degli scrigni |
| `rincorsa` | `03-systems.js` → `bossAI` | elastico del boss: accelera quanto più resta indietro |
| `RAGGIO_MIRA` | `03-systems.js` → `direttore` | la distanza a cui devono morire i nemici: è **la** manopola della difficoltà |
| `G.tenacia` | `03-systems.js` → `direttore` | quanto il direttore ha indurito i nemici in questo momento (1 = non è intervenuto) |
| `G.chiarezza` | `06-main.js` → `step` | quanto spazio visivo resta ai tuoi effetti: 1 quando il campo è vuoto, .42 quando è pieno |
| `AREA_RIF` | `02-engine.js` → `calcolaZoom` | l'area di schermo di riferimento: da qui esce `G.zoom`, cioè quanto mondo vedi |

In console è esposto `window.ORBITA` con `G` (stato), `P` (statistiche derivate), `step()`,
`start()`, `roll()`, `apply()`, `place()`, `recalc()`, `recalcRing()`: serve a far girare partite
simulate senza renderizzare, che è come sono state misurate e bilanciate le rune.

```js
// DPS di una runa a livello 5, 25 secondi simulati
const O = ORBITA;
O.start('vega'); O.G.state = 'play';
O.G.ring.fill(null); O.place('scintilla', 0); O.G.ring[0].lv = 5; O.recalcRing(false);
O.G.t = 120;
for (let i = 0; i < 1500; i++) { O.step(1/60); O.P.hp = O.P.maxHp; O.G.pending = 0; }
console.log(Math.round(O.G.dmgDone / 25));
```

Il salvataggio sta in `localStorage` sotto `orbita.save.v1`.

## Licenza

MIT — vedi [LICENSE](LICENSE).

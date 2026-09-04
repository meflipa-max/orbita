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
sarebbe comunque fermabile da un masso. I guardiani li sfondano.

Un quarto delle formazioni sono **Nodi elementali**: cristalli sintonizzati su un elemento,
sorteggiato a ogni partita. Nella loro aura le rune di quell'elemento fanno +35% danno e la
catena di quell'elemento **conta una runa in più** — due rune adiacenti accendono il Risveglio
finché resti lì. Il cuore resta solido, quindi ci orbiti intorno: tenere la posizione rende
molto, ma restare fermi in mezzo alla mischia si paga. È l'arena stessa a favorire build
diverse a ogni corsa.

### Eventi d'arena

Ogni novanta secondi succede qualcosa che **ha un luogo**: una breccia da raggiungere prima
che si chiuda, una marea di nemici da una sola direzione, un Corriere da abbattere prima che
sparisca. Servono a dare un motivo per andare da qualche parte.

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

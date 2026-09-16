# ORBITA

Bullet heaven roguelite. **La tua build è un anello di rune che ti gira intorno**: non c'è
una schermata inventario separata, le rune che vedi orbitare *sono* l'interfaccia.

- Rune **adiacenti** dello stesso elemento **risuonano**: +30% danno a testa.
- **Tre di fila** accendono un **Risveglio**, una regola che vale per tutti i tuoi colpi
  (incendio, rallentamento, catene, implosioni, critici che curano). A **quattro** e a
  **cinque** di fila diventa più forte — erano cinque e sette, cioè un terzo grado che
  chiedeva più rune di quante l'anello ne tenga.
- L'**Iride** conta come qualsiasi elemento: messa fra due gruppi, ne accende due insieme.
- Riordinare l'anello è quindi il vero puzzle strategico, e si può fare in qualsiasi momento
  dalla pausa.

Due formati: la **Corsa** da 20 minuti con cinque guardiani, poi modalità senza fine, e
l'**Incursione** da 8 minuti con tre. I **frammenti** restano fra una partita e l'altra e si
spendono nell'Osservatorio in potenziamenti permanenti, nuclei e reliquie.

### Perigeo — l'altro modo di spendere la carica

Il gioco aveva **un verbo** — schivare — e **un bottone**. Ma la difesa, qui, esiste già ed è il
movimento: un bottone che desse scudo, cura o invulnerabilità non aggiungerebbe difesa,
toglierebbe **tensione**, perché renderebbe recuperabile l'errore che oggi si paga.

Quello che mancava non era un'abilità difensiva: era una **seconda decisione con un costo**. Il
**Culmine** è il punto più alto di un'orbita; il **Perigeo** è il punto più vicino. Stessa
barra, stesso prezzo — la carica intera — e due atti opposti: l'anello si **apre** oppure si
**chiude**.

Chiuso, per poco più di due secondi, l'anello è un muro addosso al nucleo: spegne i colpi
nemici come fa un asteroide, e respinge la folla. **Non i guardiani** — un guardiano sfonda gli
asteroidi, figurarsi sei rune — e non è invulnerabilità: chi entra lo stesso fa danno come
sempre. Il prezzo è che **per quei due secondi non spari**.

E non fa danno mentre è chiuso: lo **accumula**. Ogni colpo spento e ogni nemico tenuto fuori
valgono un punto — il numero scritto sul pulsante — e riaprendosi l'anello li restituisce tutti
insieme in un'onda che cresce con loro. Quindi la giocata giusta non è premere appena si ha
paura: è **premere tardi**, dentro al mucchio, e resistere un momento in più. Chi lo usa per
scappare ottiene un buco nel proprio danno e un'onda da niente.

**Non rende il gioco più facile, e si può misurare.** `npm run misura -- perigeo` mette in fila
il danno al secondo di un anello vero e quello che l'onda restituisce:

| minuto | danno/s | il buco (2,2 s) | onda a 40 punti | ripaga |
|---|---|---|---|---|
| 5 | 866 | 1905 | 1143 | 60% |
| 10 | 1724 | 3792 | 2275 | 60% |
| 15 | 2653 | 5837 | 3502 | 60% |

L'onda restituisce **una quota di quello che l'anello avrebbe sparato** nei due secondi in cui è
stato chiuso, in proporzione a quanto ha tenuto: a tetto pieno il 60% del buco, a mani vuote
niente. Erano due numeri fissi moltiplicati per il moltiplicatore di danno del giocatore — che non
vede il *livello* delle rune — e misurandolo con un banco che gioca bene ripagavano il 35% al
quinto minuto e l'**11%** al quindicesimo: il premio per aver tenuto duro svaniva proprio quando
tenere duro costa di più. Una quota dichiarata non può andare fuori taratura da sola.

L'onda resta sempre **sotto** il buco che lascia: il Perigeo conviene per quello che **evita**,
mai per quello che fa. Ed è la ragione per cui il Culmine non
diventa mai la scelta sbagliata — 5,5 secondi a cadenza quasi doppia con ogni Risveglio di un
grado più alto valgono molto più di 664 — quindi ogni barra piena è davvero una domanda:
*apro o chiudo?*

Una cosa che questo non può misurare, e va detta: **il bot del banco non prende danno**, quindi
il prezzo del Perigeo è misurato e il suo beneficio no. Il bilanciamento di quanto *salvi* è
l'unica cosa qui dentro che resta da verificare giocando.

L'altra idea che era sul tavolo — una seconda risorsa caricata **sfiorando** il pericolo — è
stata scartata, e per una ragione misurata: la prossimità in questo gioco ha la stessa
patologia che il Culmine aveva prima di questa sessione, perché il ritmo delle uccisioni passa
da 1 al secondo a 25. Una barra che si riempie con la folla sarebbe vuota quando serve e piena
quando non serve — e col banco cieco al danno non sarebbe nemmeno tarabile.

### Il lessico

Un giocatore vede apparire scritte e **nomi di cose che accadono** senza capirne il
significato. Era vero, e si vedeva dal codice: «Torpore II», «Ritempra», «Corazza di Gelo»,
«Dissonante», «Ascesi», «Eccesso» comparivano per la prima volta dentro un avviso di due
secondi in mezzo all'azione, e la spiegazione — quando c'era — stava nella guida, nel menu,
raggiungibile solo abbandonando la partita.

Adesso dalla **pausa** si apre il **Lessico**: quarantatré voci, tutto quello che il gioco
nomina, con la riga che dice cosa vuol dire. Quello che sta scritto altrove lo prende da dove
sta scritto — i Risvegli da `EL`, gli eventi d'arena dal briefing che li spiega, la soglia
della trasformazione da `sogliaEvo()` — così una regola cambiata in un posto non resta vecchia
lì dentro.

E le due regole che, non capite, si leggono come un **difetto del gioco** hanno finalmente la
loro spiegazione a schermo intero, la prima volta e una volta sola:

- il **Dissonante** si spiega *quando zittisce la prima runa*, non quando compare: il fatto —
  una tua runa che si spegne e un filo che la tiene — arrivava dopo l'avviso, e senza una
  spiegazione si legge come un bug;
- la **corazza elementale** diceva «Corazza di Gelo», cioè il nome della regola e non la
  regola. Il mezzo danno — che è il momento in cui una seconda catena ripaga — non stava
  scritto da nessuna parte, né nell'avviso né sul cerchio disegnato addosso al guardiano.

### La Ritempra fa quello che dice

La Ritempra riaccorda una runa a un altro elemento. Cambiava `r.el` — l'elemento con cui
l'anello disegna e conta le catene — e **nient'altro**: `runeStats` leggeva l'elemento di
*nascita*, e da lì lo leggevano tutte le funzioni di tiro. Una Scheggia riaccordata al Fuoco
era quindi rossa nell'anello e di Gelo in campo: sparava schegge azzurre, prendeva il +35% dal
Nodo di Gelo invece che da quello di Fuoco, e contro un guardiano con la corazza di Gelo faceva
metà danno per un elemento che secondo l'anello non aveva più. Chi la giocava vedeva una runa
cambiare colore e continuare a sparare il colore di prima.

Adesso l'elemento della runa è **uno solo**, e ce l'ha `s.el`: da lì lo leggono tutti i colpi,
tutte le zone, la catena del Sovraccarico e il bonus del Nodo. Tre posti in cui si disfaceva:

- **trasformarsi** riportava la runa all'elemento di nascita. Ogni forma evoluta ha l'elemento
  della runa da cui nasce, quindi `RUNES[c.to].el` sembrava innocuo — ma quella Scheggia
  reggeva un lato della catena di Fuoco, e il premio per cui avevi progettato la partita
  **spegneva il Risveglio** che serviva a ottenerlo.
- **riprendere una corsa sospesa** la riportava indietro allo stesso modo: l'annotazione
  teneva id, livello e alloggiamento, non l'elemento.
- il **nome** restava quello della forma, cioè quello della versione di Gelo. Sedici forme per
  cinque elementi sarebbero ottanta nomi da inventare; l'elemento invece si dice: **«Scheggia
  di Fuoco»**, e solo quando c'è qualcosa da dire.

E il momento in cui succede adesso si vede: due onde del colore nuovo, una dal nucleo e una
**dalla runa** — è quella che dice quale.

### Ritemprare non è toccare a caso l'anello

La schermata era qualche runa che pulsa, una freccia con un nome di elemento e nessun modo di
sapere cosa sarebbe cambiato. Il primo tocco era definitivo. Tre difetti in uno.

- Ogni bersaglio adesso porta scritto il **guadagno**: `→ FUOCO 3/3` sotto, e sopra
  **RISVEGLIO** quando quella mossa ne accende uno.
- Il punteggio dei bersagli sommava solo i guadagni — `Math.max(0, …)` — quindi proponeva con
  entusiasmo la riaccordatura che allunga una catena di una runa e **spegne il Risveglio**
  dall'altra parte. Ora si misura in gradi di Risveglio, e una mossa che ne toglie non si
  offre. L'**Iride** è fuori dai bersagli: vale già come qualunque elemento, fissarla su uno è
  l'unica mossa che le toglie qualcosa.
- Il primo tocco **sceglie**, il secondo conferma, e in mezzo una riga dice la frase intera:
  *«Scheggia · da Gelo a Fuoco · forma e livello 6 restano — Fuoco 2 → 3/3 · accende Ardore»*.

Anche i «no» dicono quale regola hai incontrato: l'alloggiamento vuoto, l'Iride, o la runa che
riaccordata non allunga niente — con l'alloggiamento che invece conviene.

### Il ghiaccio parte dalla runa

Otto rune a proiettile su nove fanno nascere i colpi in `r.wx/r.wy`, cioè **dalla runa che
gira**. La Scheggia e la Zanna li facevano nascere nel nucleo: il ghiaccio sembrava un'abilità
del nucleo e non della runa che te lo stava dando, e con l'anello in rotazione non c'era modo
di capire quale runa lo facesse. Anche la direzione adesso si misura dalla runa — il corridoio
più pieno visto dal centro non è quello che le schegge attraversano se partono trentadue pixel
più in là.

### Una corsa vinta resta vinta

> «Il mio record è una partita da oltre 21 minuti, ma ho dovuto abbandonarla e risulta che ho
> perso. Perché non l'ho vinta?»

La Corsa si vince abbattendo l'**ultimo guardiano**, che arriva al diciottesimo minuto: da lì
la corsa è vinta, pagata, segnata vinta nello storico e l'ascensione è salita. Ma qualunque
cosa la chiudesse dopo — la morte nel senza fine, o il bottone Abbandona — chiamava
`endRun(false)`, e quel `false` arrivava intero fino allo schermo: **FINE**, «Il nucleo si
spegne», e la diagnosi da sconfitta. Peggio: `statoPartita(false)` diceva `win:false` a sfide,
sblocchi e contratti, cioè alla seconda chiusura nessuno di quelli che chiedono una vittoria
poteva completarsi.

La vittoria è un fatto della corsa, non dell'ultimo istante. Quello che si paga una volta sola
resta protetto — i frammenti, la riga dello storico, e adesso anche il **conto delle vittorie**
con l'ascensione che sblocca, che senza il nuovo guardiano avrebbe contato due vittorie per la
stessa corsa.

E la schermata di fine conosce **tre uscite** invece di due: vinta, persa e **abbandonata** —
«Il nucleo si spegne» era l'unica frase sbagliata proprio nell'unica uscita in cui il nucleo
non si spegne. «Ucciso da» valeva `!win`, quindi nominava l'ultima cosa che aveva sfiorato chi
abbandonava e taceva a chi cadeva nel senza fine dopo aver vinto, cioè proprio a chi vuole
saperlo: la domanda è «sei morto?», non «hai perso?». E «Continua senza fine» non viene più
offerto a chi è morto o ha abbandonato — quel bottone rimetteva in piedi una corsa finita.

Soprattutto: il **traguardo adesso si vede**. La targhetta in alto a destra conta i guardiani
che stanno per arrivare e resta libera proprio da lì in poi — ora dice **ULTIMO · ABBATTILO E
HAI VINTO** finché è in campo, e **CORSA VINTA · SENZA FINE** dopo. La sua barra in cima allo
schermo porta scritto `· ULTIMO`.

### Il Culmine torna a essere un momento

`npm run misura -- culmine` registra il ritmo vero con cui si uccide in una corsa e integra:
quante volte l'indicatore si riempirebbe, spendendolo appena pronto. Su una Corsa intera —
11.066 uccisioni in 18:40 — la curva di prima dava **sessantadue Culmini, uno ogni diciotto
secondi**. Ne dura cinque e mezzo, quindi il Culmine era acceso per un terzo della corsa: una
cosa che succede ogni diciotto secondi non è un momento, è uno stato.

Il difetto stava nella pendenza: il costo saliva di `.085` al secondo mentre il ritmo delle
uccisioni, misurato, sale da una al secondo a venticinque. Cioè il prezzo cresceva trenta volte
più piano di quello che lo paga, e più avanti andava la corsa più spesso arrivava. Con
`65 + t·.55` la stessa corsa ne dà **ventisette**, uno ogni quarantun secondi — e da quando la
stessa barra paga anche il Perigeo sono ventisette *scelte*, non ventisette Culmini. Il primo
arriva ancora entro il primo minuto.

E adesso che costa può **valere**: fermo immagine vero, velo d'oro (il rosa è il male, il
bianco è la spazzata: l'oro è il tuo momento), tre onde sfasate invece di una, e il nome a
schermo pieno — la stessa forma del Risveglio, perché è la stessa scala di evento. Il banner
dice **cosa fa con i nomi dei Risvegli che sta alzando**: «Ardore e Torpore salgono di un
grado» insegna cos'è un grado nell'istante in cui uno ne guadagna uno.

### Il negozio non si compra in cinque partite

Una Corsa da venti minuti vinta pagava **8106 frammenti** (misurato col bot, semi 1111 e 2222:
8106 e 7720) contro un negozio che, tutto quello che ha un fondo, ne costa **38.928**: cinque
partite e non restava più niente da comprare tranne il Dominio. Non è un caso — i pesi sono
nati quando il negozio aveva un terzo delle voci di adesso.

Il pezzo più grosso era la riga delle uccisioni, `.5` per nemico, cioè 3416 frammenti su 6832
nemici: è anche la quantità **meno decisa da chi gioca**, perché sale col tetto dei nemici e
con la durata, non con la costruzione dell'anello. E un terzo dell'incasso erano i frammenti
raccolti in campo, di cui mille dal solo gocciolio del 5% su ogni nemico.

Ora i quattro pesi stanno in un posto solo (`PAGA`) e i frammenti che cadono hanno una scala
sola (`FRAM_RESA`), così i numeri che gli avvisi promettono restano quelli che finiscono nel
borsello. Misurato, e poi **rimisurato** quando il banco ha smesso di giocare male — il bot prendeva una
runa nuova a ogni occasione anche ad anello pieno, cioè se le sostituiva addosso, e una corsa
faceva 6832 uccisioni invece di 11066. Con lo strumento sano i pesi sono scesi ancora: **3121 e
3164 per una Corsa vinta, cioè il negozio in dodici partite e mezza**. Ricalcolando i pesi di
partenza sulla stessa corsa, senza il bot che giocava male, erano dodicimila frammenti: **tre
partite** e il negozio era finito. E la prima corsa — cinque minuti, persa, mazzo base — ne paga
ancora 469-579, che basta per le prime due regole del negozio (110 e 160). Un'economia si sbaglia
in due modi, e quello è l'altro. `npm run misura -- soldi` rimisura i due capi insieme.

### Sei o otto

«Non ho capito se la trasformazione è a 6 o a 8.» Ed era colpa di due segnali che dicevano
numeri diversi per due cose diverse: la carta di potenziamento disegna **otto** pallini — il
livello massimo di una runa — e l'anello scriveva **MAX** sulla runa che ha raggiunto la
**soglia**, che è il 6. Chi contava i pallini leggeva otto; chi leggeva MAX su una runa al 6
concludeva sei.

Sono due cose e adesso si vedono come due cose: la carta dice «**Livello 6 di 8**», il pallino
della soglia porta un segno, e su quel livello — solo su quello — la carta aggiunge «**È la
soglia della trasformazione**». L'anello non scrive più MAX ma **SOGLIA OK**, che è quello che
vuol dire: il livello c'è, manca altro. Il massimo stava scritto a mano in due punti e adesso
si chiama `RUNE_MAX`.

### «Il nucleo cresce», tre volte di fila

Segnalato come un bug, e lo era — ma non quello che sembrava. Le tre schermate erano **tre
carte vere**, una per livello: `gainXP` sale di *tutti* i livelli in un colpo, e una gemma fusa
in fondo alla partita ne vale qualche migliaio, quindi il `while` gira due o tre volte nello
stesso fotogramma. Il difetto stava nel numero: la schermata scriveva `G.level`, cioè il
livello di **arrivo**. Salendo dal 20 al 23 usciva «Livello 23» tre volte identiche — non un
livello dopo l'altro, la stessa scritta che torna.

Ora ogni carta porta **il proprio** livello — 21, 22, 23 — e dice quante ne restano dopo di
lei: *«Livello 21 · poi altre 2»*. Gli scrigni si servono per primi e non rubano un numero di
livello, quindi una pila mista legge «Scrigno stellare · poi altre 2», «Livello 29 · poi
un'altra», «Livello 30».

Misurato: una gemma da settemila punti esperienza al livello 20 produce esattamente tre carte,
e le tre schermate adesso dicono tre cose diverse.

### Un livello per volta

`gainXP` saliva di **tutti** i livelli che l'esperienza appena raccolta copriva, dentro un
`while`: una gemma fusa in fondo alla partita ne vale qualche migliaio e i settecento punti di un
guardiano arrivano tutti in un istante, quindi tre livelli scattavano nello stesso fotogramma. Il
risultato erano tre schermate di carte una dietro l'altra — e tre carte di fila non sono tre
momenti, sono un momento sommerso da se stesso: si premono senza guardarle, ed è la schermata su
cui il gioco chiede la sua unica decisione.

Ora un livello alla volta, e in mezzo un po' di partita. **L'esperienza in eccesso non si perde**:
resta nella barra — che si vede piena e pulsa, perché una barra piena e ferma si legge come un
inceppamento — e il livello dopo arriva dopo `LV_PAUSA` secondi di **gioco vero**. La pausa scorre
solo giocando, e la schermata delle carte ferma il tempo: fra un livello e il successivo c'è
sempre partita, non un altro pannello. Un livello non parte nemmeno se c'è già una carta in attesa,
quindi uno scrigno raccolto un istante prima non diventa una pila.

### Quanto cresce il nucleo, e da dove

`npm run misura -- crescita` segue una corsa intera e chiede, a cinque tappe, cosa ha in mano il
giocatore: composizione dell'anello, livelli, passivi, e un **indice di potenza** — la somma di
danno×colpi/ricarica di tutte le rune, coi moltiplicatori dentro — contro la vita di un nemico
comune a quel minuto.

```
minuto  liv  potenza  vita comune  nemici/s   rune (livelli)   passivi
1        4     324         12       26,0      4 rune: 1111        0
5       13     940         98        9,6      6 rune: 113232      2
10      21    1762        361        4,9      6 rune: 234343      5
15      25    1867        607        3,1      6 rune: 334343      9
19      31    3978       1863        2,1      6 rune: 454544      9
```

Due cose che questa tabella dice e che nessuno aveva misurato:

- la potenza cresce **dodici volte** in diciannove minuti e la vita dei nemici **centocinquanta**:
  il rapporto *scende*. Il gioco non si fa più facile mentre va avanti — si fa più duro, ed è il
  direttore che lo decide (vedi «Il campo si adatta a te»);
- ma **la build ha ancora posto**: a fine corsa le rune stanno fra il 3 e il 5 su 8, i passivi a 9
  livelli su 47. Le carte ci stanno dentro, quindi il problema non era la capienza.

E una terza, la più scomoda, che si vede solo confrontando due corse identiche in cui cambia solo
il giocatore (stesso seme, nessuno dei due muore):

```
                 tempo  livello  uccisioni  carte  scrigni  potenza  vinta
bot che gioca     1092     29       9650      32       4      3937    sì
bot immobile      1181     22       7360      24       3       539    sì
```

Giocare vale **sette volte la potenza** — quindi la crescita è premio del gioco. Ma il
**pavimento è alto**: chi non si muove mai, non raccoglie mai niente, non insegue un evento e non
schiva, arriva comunque a 24 carte e **abbatte l'ultimo guardiano**. L'anello gioca da solo.

E qui una cosa che sembrava ovvia e la misura ha **smentito**. L'idea era: se le gemme lontane
scadessero, la crescita chiederebbe di andare a prenderla. Misurato su una corsa da fermo:

```
raggio di raccolta: 78 px
esperienza raccolta da fermo: 376
  nata già a tiro (meno di ,35s):  376  (100%) · 256 gemme
  ha viaggiato fino a te:            0  (  0%) ·   0 gemme
```

**Il 100% dell'esperienza che raccoglie chi sta fermo nasce già dentro il raggio di raccolta**: i
nemici gli muoiono addosso. Nessuna gemma viaggia — una gemma lontana non si muove finché non ti
avvicini. Quindi far scadere le gemme lontane non toccherebbe il pavimento di un millimetro:
punirebbe *solo* chi si muove e rimanda la raccolta, cioè l'opposto dell'intenzione. Il pavimento
non è nelle gemme lontane, è nel fatto che l'orda si consegna da sola — e quello è il patto del
genere.

### La carta la paga solo il guardiano

Ogni carta è una schermata, e ogni schermata è il gioco che si ferma. La crescita del nucleo
usciva da **otto sorgenti che non si parlavano fra loro**: i livelli, sei che pagavano uno scrigno
— i cinque guardiani, gli elite ogni ottanta secondi, quattro eventi d'arena su cinque — più la
Semenza e il Ventaglio. Ognuna difendibile da sola; nessuno aveva mai sommato il totale.

Il guaio non era il numero, era la **composizione**. I livelli decelerano come devono, da tre al
minuto a uno; gli scrigni no, perché elite, eventi e guardiani arrivano a orologio per sempre.
Quindi la quota di crescita che veniva dagli scrigni passava dal **20%** dei primi cinque minuti al
**71%** dei minuti 10-14: nella seconda metà della corsa il nucleo cresceva *per orologio*, non per
merito, e due terzi delle carte arrivavano da timer che non sanno niente di come stia andando la
partita. È questo che si sente come «è troppo facile far crescere il nucleo».

Adesso la carta la paga **solo il traguardo: il guardiano**. Elite ed eventi pagano in esperienza —
una gemma sola, grossa e visibile, che vale una quota del livello *corrente*, così resta un premio
anche al diciottesimo minuto — e in frammenti. Restano ricompense, ma rientrano nell'unico
rubinetto che decelera e che dipende da quanto stai uccidendo.

`npm run misura -- scrigni` conta tutto, minuto per minuto. Prima e dopo, stesso seme:

```
— prima —      43 carte: 24 livelli + 19 scrigni · una ogni 27,5s
  scrigni:   1  0  0  2  2  0  1  1  1  0  3  0  0  2  1  1  1  1  1  1
— dopo —       32 carte: 28 livelli +  4 scrigni · una ogni 35,0s
  scrigni:   0  0  1  0  0  0  1  0  0  1  0  0  0  0  1  0  0  0  0
```

Gli scrigni scendono dal **44% al 13%** della crescita, le interruzioni da una ogni 27 secondi a
una ogni 35, e la corsa resta vinta su tutti e quattro i semi del banco. I livelli *salgono* da 24
a 28, perché l'esperienza degli elite e degli eventi rientra da lì: il totale scende di undici
carte, non di quindici, e la potenza a fine corsa non cambia. Cambia da dove viene.

E una sorgente che pagasse uno scrigno **per ogni fotogramma** in cui la sua condizione è vera non
si vedrebbe in nessuna media: si vedrebbe solo come «arrivano troppi scrigni». Le quattro
condizioni degli eventi restano vere finché l'evento esiste, quindi ognuna chiude con
`G.ev = null; return;` — e c'è un controllo per ciascuna: togliendo quel `return` alla Fermata, la
sua riga conta **30 premi invece di 1**.

### Culmine

Un indicatore che si riempie **uccidendo**. Quando è pieno, `Spazio` (o il tasto in basso a
destra) e per cinque secondi e mezzo l'anello spara tutto insieme, le ricariche vanno quasi al
doppio, e **ogni Risveglio acceso sale di un grado**. Non ne accende di nuovi: moltiplica
quello che hai costruito, e per questo premia chi l'anello l'ha costruito bene. È l'unica cosa
che fai con le mani oltre a schivare.

Si carica con **quello che uccidi**, e un guardiano vale quattordici nemici comuni, un elite
cinque. Lo diceva il codice e non lo faceva: la riga che aggiunge carica stava dentro al ramo
che il direttore riserva ai nemici comuni, quindi il `guardiano ? 14 : elite ? 5 : 1` era
codice morto e abbattere la cosa più grossa della corsa caricava **zero**. Misurato su un elite
ucciso da solo: 0,000 invece di 0,113.

E il grado in più adesso **si vede**: le targhette in basso a sinistra leggono il Risveglio
effettivo, non quello di base, quindi durante il Culmine ognuna guadagna una tacca bianca. Era
l'unico effetto del Culmine di cui non c'era traccia a schermo — cioè quello per cui esiste.

### L'anello non è mai congelato

Le rune nuove si offrivano solo con un alloggiamento libero: dopo cinque livelli la
composizione elementale era decisa per il resto della partita. Misurato su una corsa vera, seme
2026: al quarto minuto sei elementi diversi, nessun Risveglio, e nel mazzo nemmeno una runa
nuova. Ora tre carte lo rimettono in gioco anche da pieno — **Dissolvi** libera un
alloggiamento, **Ritempra** riaccorda una runa all'elemento di una vicina conservandone forma e
livello, e una runa nuova può **prendere il posto** di una che non regge nessun Risveglio.
E finché non hai acceso un Risveglio, almeno una delle tre carte può sempre cambiare l'anello.
Stesso seme: primo Risveglio al secondo 26.

### Chi ti viene addosso

Il **Dissonante** non vuole la tua vita: aggancia un alloggiamento e lo tiene *zitto*. Vedi il
filo che parte da lui e la runa che si spegne. Tiene le distanze apposta, quindi va inseguito —
e non può mai zittire più di due rune insieme. Ogni tanto un gruppo arriva con una **forma**: un
muro si aggira, un accerchiamento va rotto da un lato, un cuneo si schiva di fianco. E dal
secondo guardiano in poi ognuno porta una **corazza elementale**: quell'elemento fa metà danno.

### Quando finisce tutto il resto

In una corsa lunga i passivi arrivano tutti al massimo e le rune al livello 8: la pool si
svuotava e restavano «Dissolvi» e due mucchi di frammenti — una schermata di scelta senza
scelte. Ora un passivo può superare il proprio massimo a **valore ridotto**, e l'**Ascesi**
(+5% danno, +4% vita, +3% area) è ripetibile all'infinito: è il pavimento della pool.

I guardiani portano ognuno un **modificatore sorteggiato** — corazzato, rapido, vorace,
riflesso — che non tocca la tabella di vita, quindi il bilanciamento resta quello ma lo
scontro no. E l'Osservatorio tiene la collezione delle **sedici forme**: quali trasformazioni
hai già visto, e da quale runa nascono quelle che ti mancano.

### La schermata di fine

Dice **chi ti ha ucciso**, **da dove è venuto il danno** — la percentuale riga per riga, che è
la statistica che fa venire voglia di ricostruire — e una diagnosi presa dai contatori della
partita: *«Non hai mai acceso un Risveglio: eri arrivato a due rune di Fuoco di fila su tre.»*

E adesso quell'elenco contiene **tutto** il danno. Tre Risvegli fanno danno — l'incendio
dell'Ardore, la catena del Sovraccarico, l'implosione del Collasso — e nessuno dei tre lo
attribuiva a niente: finiva nel totale e spariva dall'elenco. Così la scia della Cometa, che è
il 19% di quello che fa la Cometa, e la Nova del contraccolpo di Antares, che per chi gioca
Antares è metà della build. Misurato col bot su quattro corse intere, **dal 55% all'82%** del
danno fatto non compariva in nessuna riga: le percentuali mostrate erano quelle del pezzo
rimasto, cioè la forma sbagliata della build.

I Risvegli hanno una riga loro e non vengono cuciti addosso alla runa che ha colpito, perché la
domanda a cui la schermata risponde è *«cosa sta facendo il lavoro»* e «il Collasso 34%» è la
risposta più utile che ci sia — è la ragione per cui quella catena di Vuoto vale la pena di
essere tenuta in piedi.

E dice **quanto ci sei andato vicino**. In un gioco di sopravvivenza il proprio tempo migliore
*è* il punteggio, e questa schermata non lo nominava: scriveva `TEMPO 15:40` senza dire che il
record era 18:02, cioè senza dare il motivo per cui si preme Rigioca. Il motivo tecnico è che
`SAVE.best` veniva aggiornato in `payout()` **prima** che la schermata si disegnasse: quando
arrivava a scrivere 15:40 il record era già 15:40. Adesso il record si legge prima di
scriverlo, e la schermata dice *«Record Corsa 18:02 · ti sono mancati 02:22»* — oppure **NUOVO
RECORD**, con le caselle di TEMPO ed ELIMINAZIONI in oro.

Il record è **del formato**. Era uno solo per due formati che non durano uguale: l'Incursione
finisce a otto minuti e non ha modalità senza fine, la Corsa arriva a venti e poi prosegue.
Dopo una sola Corsa il record diventava irraggiungibile per sempre nell'Incursione — che è il
formato preselezionato a chi apre il gioco la prima volta. Un record che non si può battere non
è un record. Un salvataggio vecchio ha un numero solo e non dice di quale formato fosse: va
alla Corsa, dove quel tempo è plausibile, e l'Incursione riparte da zero.

L'ultima voce rimasta era la **bomba**, che cancella ogni nemico della mappa: al quindicesimo
minuto vale la vita di centocinquanta nemici, e da sola era il **68%** del DANNO scritto a fine
partita — il numero che dovrebbe dire quanto ha reso il tuo anello diceva soprattutto quante
losanghe avevi raccolto camminando. Il codice la escludeva già dal raggio di mira del direttore
e dalla carica del Culmine per la stessa ragione; il contatore del danno era l'ultimo posto in
cui contava. Adesso vale un'invariante: **ogni punto di DANNO ha la sua riga**, misurato a zero
su quattro corse da venti minuti.

La **pausa** dice cosa fanno i Risvegli che hai acceso. Il nome e il grado si leggono
dappertutto — la targhetta in basso a sinistra, la riga sotto le carte, l'anello — ma *cosa fa*
il grado che hai adesso lo diceva un avviso di due secondi nell'istante in cui si è acceso, e
poi più niente: la guida sta nel menu, mostra solo il primo grado, e dalla pausa non ci si
arriva. Chi era a «Torpore II» non aveva nessun modo di sapere cosa volesse dire — ed è la
regola su cui è costruito tutto il gioco. Il grado scritto è quello **effettivo**: durante il
Culmine ognuno sale di uno, e leggere la riga del grado sotto sarebbe una bugia.

### Trasformazioni

Una runa portata a livello 6 **mentre risuona da entrambi i lati e il suo elemento è
risvegliato** si trasforma. Ne ha una **ognuna delle sedici rune**. Non diventa più grande: diventa un'altra cosa. La Cometa lascia
una scia che brucia davvero e si frantuma a ogni uccisione; il Glaciale congela al tocco; il
Fulgore sdoppia la catena a ogni salto; il Mietitore risucchia i nemici lungo il cammino;
l'Alba spazza con due fasci opposti. La condizione è **posizionale**: obbliga a progettare
l'anello dal primo minuto.

L'anello dice sempre cosa manca, e da quando lo dice **si può anche eseguire**. Il consiglio
più azionabile del gioco è *«Scintilla: manca risuonare da entrambi i lati — spostala
nell'alloggiamento 3»*, e nominava due cose che l'interfaccia non mostrava: quale dei sei glifi
fosse la Scintilla — il nome di una runa compariva una volta sola, sulla carta che te l'aveva
offerta, e poi mai più — e quale alloggiamento fosse il 3, che si poteva solo contare in senso
orario dall'alto sperando di partire da uno e non da zero. Adesso ogni alloggiamento porta il
suo numero, fuori dall'anello, e toccare una runa scrive chi è: **nome, elemento, forma,
livello e se risuona**.

La runa **si tiene il livello**. Il numero era scritto a mano — 5 — ed era quello giusto quando
la soglia per trasformarsi era 8: si scendeva di tre gradini e in cambio si compravano i numeri
della forma evoluta. Poi la soglia è scesa a 6, e quel 5 è rimasto: chi ci arrivava al 6
perdeva un livello, chi ci arrivava all'8 ne perdeva tre, e chi aveva comprato il Crogiolo non
ne perdeva nessuno. Cioè più avevi investito nella runa — proprio quella su cui il gioco chiede
di investire dal primo minuto — più ti costava trasformarla. Il salto di potenza sta già tutto
nei numeri della forma evoluta: misurato a parità di livello, fra il **+7%** (Inverno) e il
**+124%** (Mietitore) sulla runa di partenza.

### Ascensioni

Vinci e sblocchi un livello di difficoltà. Ognuno aggiunge **una regola sola**, e le regole si
sommano: scrigni che non danno più potenziamenti, un alloggiamento in meno, metà vita
iniziale, Risvegli che richiedono quattro rune in fila, guardiani in coppia. Tredici livelli.

### Perché si torna

Il difetto misurabile non era il minuto per minuto: era che **il gioco non prometteva niente
alla partita successiva**. Quattro cose lo producevano, e ognuna si legge nei numeri.

- **La partita 2 era il copione della partita 1.** `WAVES` è una tabella fissa a tempo e i
  cinque guardiani arrivavano sempre nello stesso ordine agli stessi secondi. Le uniche
  variabili erano l'RNG delle carte, l'elemento del Nodo e tre eventi d'arena.
- **Non esisteva il momento «ho trovato una runa nuova».** `rollChoices` pescava da tutte e
  sedici le rune al primo livello della prima partita. In tutta la vita del giocatore, mai.
- **Le prime spese non si sentivano.** Nove voci su undici erano percentuali piccole, e le due
  che cambiano *come* giochi costavano 700 e 1500 — più di quanto rende una partita persa al
  minuto otto (misurato: 942). Le prime tre o quattro iterazioni del giro ricompensa
  consegnavano zero cambiamento percepito.
- **L'economia finiva.** Tutto il comprabile costava 21.704 frammenti: verso la partita
  dodici i frammenti non compravano più niente, mentre `payout()` continuava a versarli.

E sopra tutto questo, **la prima conclusione stava a venti minuti**: chi non ha mai visto un
finale non ha nessun motivo per tornare, e le tredici ascensioni — cioè tutta la coda lunga —
stanno dietro a quella prima vittoria.

### Formati

L'**Incursione** dura otto minuti e ha tre guardiani. Non è la Corsa tagliata a metà: è
ritarata. Il calendario dei contenuti scorre 2,15 volte più in fretta, i nemici si
irrobustiscono 1,65 volte più in fretta, tu sali di livello 1,85 volte più in fretta, e i tre
guardiani hanno una vita loro invece di quella del loro slot — perché a parità di minuti la
tua build è più debole di quanto sarebbe nella Corsa.

E il calendario del contenuto vale per **tutto** il contenuto. Ondate, tetto di nemici ed elite
lo seguivano già; **formazioni e Dissonante** erano rimasti sull'orologio da polso, e il
Dissonante entra in campo dopo il quarto minuto: in una partita da otto, su un seme misurato,
**non compariva affatto**. Cioè il nemico che attacca la build — la cosa che nessun altro gioco
del genere può avere — mancava dalla metà delle partite giocate, perché la corsa del giorno è
un'Incursione.

Per la stessa ragione l'Incursione è il formato **preselezionato alla prima apertura**. Tutta
la coda lunga sta dietro alla prima vittoria, e chiedere venti minuti a chi ha appena aperto il
gioco è esattamente la decisione che questo formato è stato costruito per non dover chiedere.
Chi ha già una partita alle spalle tiene la Corsa.

Vincere un'Incursione sblocca l'ascensione come vincere una Corsa: è il punto — la prima
conclusione deve stare nella prima sessione. La domanda era quindi una sola: **l'Incursione è
una scorciatoia per scalare la scala di difficoltà?** Misurato col banco headless e un bot che
ogni mezzo secondo schiva scegliendo fra ventiquattro direzioni, quattro semi per riga, **in
Quiete**:

| | asc 0 | asc 4 | asc 8 | asc 12 |
|---|---|---|---|---|
| Corsa | 4/4 | 4/4 | 1/4 | 0/4 |
| Incursione | 4/4 | 4/4 | 3/4 | 0/4 |

«In Quiete» non è un dettaglio: è la riparazione di una misura che mentiva. La congiunzione
esce dal **seme**, quindi quattro semi fissi si portavano dentro anche la regola che quel seme
sorteggia — e basta aggiungere una riga a `CONGIUNZIONI` perché il peso totale cambi e *tutti*
i semi rimappino. Aggiungendone tre, i quattro semi storici sono passati da (Tempesta, Quiete,
…) a (Fuga, Quiete, Vetro, Fuga) e la riga «corsa asc 12» è crollata da 354 secondi medi a 45,
perché il Vetro dimezza la vita su un'ascensione che la dimezza già. Sembrava che il gioco
fosse diventato impossibile: era la misura a essere cambiata sotto i piedi. Adesso `partita()`
accetta `quiete: true` e il banco delle ascensioni misura **una** cosa sola; la congiunzione ha
il suo banco.

Questa tabella è stata **rimisurata da capo** quando il banco ha smesso di giocare male (vedi
sotto): prima dava 0/4 e 2/4 nella colonna asc 8. Un bot che si sostituiva le rune addosso
moriva prima, e la differenza è tutta lì — la *forma* non cambia: comoda a 0 e 4, che cede a 8,
fuori portata a 12.

Lo stesso banco sul gioco di prima dei due eventi d'arena nuovi dà 4/4, 3/4, 0/4, 0/4 e 4/4,
4/4, 0/4, 0/4: la curva è la stessa. A quattro semi però una singola cella **non si può
leggere** — la differenza fra 3/4 e 4/4 è una partita — quindi la riga più mossa è stata
rimisurata su otto semi prima e dopo: `corsa asc 4` dà **5/8 in entrambi i casi**, tempo medio
1235 contro 1212 secondi, 4,6 guardiani in entrambi. La tabella va guardata per la *forma* — le
due colonne che si muovono insieme — non cella per cella.

I due eventi nuovi sono **neutri sul numero di nemici**, per costruzione. La Fermata segue la
regola della marea (*«l'evento non è più nemici, è da dove arrivano»*): mentre è aperta il
flusso normale scende della quota che le sue comparse rimettono dentro. L'Allineamento non
pianta nessun nemico — la breccia ne pianta tre perché custodiscono uno scrigno fermo in un
punto, qui i punti sono tre e ci si passa sopra di corsa. Misurato su otto semi ad ascensione 8,
un bot che li gioca e uno che li ignora sopravvivono uguale (977 contro 971 secondi): la
ricompensa si paga andandosela a prendere, e non andarci non costa niente.

Quello che resta — 977 contro i 1290 di prima — è che due degli undici eventi di una corsa
adesso pagano solo se li giochi, e il bot li gioca male: insegue un sigillo a ottocento pixel
con metà vita perché la sua unica abilità è schivare. È lo stesso limite scritto sopra, e va
letto così: **misura la coerenza della curva, non la difficoltà percepita**.

Le due colonne si muovono insieme, quindi il formato si sceglie per il tempo che hai, non
per scavalcare un'ascensione. E al finale il divario di potenza è quello previsto — livello
20–29 nell'Incursione contro 29–38 nella Corsa, misurato a parte con giocatore invulnerabile
per leggere la curva invece della bravura — ed è per questo che i tre guardiani dell'Incursione
hanno un moltiplicatore di vita proprio (0,85 · 0,5 · 0,36) invece di quello del loro slot.

Il premio ha un fattore `paga` di 0,8, perché il bonus di vittoria è lo stesso in un terzo del
tempo e senza quel fattore la Corsa diventava una perdita di tempo. La modalità senza fine
resta della Corsa: allungare l'Incursione la cancellerebbe.

Il bot va preso per quello che è: schiva meglio di un essere umano e sceglie le carte peggio,
quindi misura la **coerenza** della curva, non la difficoltà percepita. Le ascensioni alte che
non vince restano un problema aperto per lui, non necessariamente per chi progetta l'anello.

### Congiunzioni

I Nodi elementali sono la cosa che dà più varietà fra una corsa e l'altra, perché non cambiano
un numero: cambiano la domanda della corsa. La congiunzione porta lo stesso principio a tutta
l'arena — una regola sorteggiata **dal seme** e **dichiarata prima di partire**, sotto al
bottone che fa partire la corsa. Una regola che leggi prima è una scelta; una che scopri al
terzo minuto è una sorpresa.

Sciame (molti più nemici, molto più fragili), Carestia (niente cuori né bombe, frammenti +70%),
Eco (Risvegli con una runa in meno, guardiani +40% vita), Cintura (asteroidi da 40 a 58 e Nodi
da 10 a 19), Tempesta (un evento ogni quaranta secondi), Vetro (metà vita, +40% danno), Fuga (tutti
più veloci del 18%, tu compreso).

Le sette di sopra muovevano *quante cose ci sono*, *quanto rendono*, *quanto sei fragile*,
*quanto si corre* e *quanto è lunga una catena*. Restavano fuori tre cose che decidono una
partita quanto quelle, e adesso ognuna ha la sua:

- **Eclissi** — i guardiani arrivano **quaranta secondi prima**, ma rendono il doppio di
  esperienza. Cambia il *ritmo* della corsa: il primo guardiano al 1:50 invece che al 2:30,
  quando la build è ancora quella dei primi livelli.
- **Fornace** — le rune si trasformano **un livello prima**, ma l'anello ha **un alloggiamento
  in meno**. Meno spazio e una catena più corta da tenere: è la congiunzione che spinge a
  progettare la trasformazione invece di sperarci.
- **Apogeo** — il Culmine **dura il doppio** e **si carica il doppio più lentamente**. Tocca
  l'unico tasto che premi: da quattro o cinque scariche brevi si passa a due lunghe, quindi
  *quando* lo spendi conta molto di più.

E **Quiete**, che pesa quanto tre delle altre: una corsa su quattro deve restare quella di
sempre, o «modificata» smette di voler dire qualcosa. Il peso va tenuto in proporzione al
numero delle altre — con sette pesava 6 e usciva il 22%, con dieci a 6 sarebbe scesa al 17%,
cioè una su sei. Misurato su 40.000 semi con peso 9: **Quiete 23,2%**, le altre fra 7,5% e
7,9%.

La sola che poteva rompere la leggibilità era **Tempesta**, perché più eventi vuol dire più
maree. La prima misura diceva picchi di 260-280 nemici contro un tetto di 160, e per un po'
quel numero è rimasto scritto qui — **era sbagliato**: il bot di quella misura non sceglieva
le carte, quindi restava al livello 1 per dieci minuti, non uccideva più niente e i guardiani
si accumulavano vivi evocando all'infinito (al picco, 128 dei 262 nemici erano evocati). Con un
bot che sale di livello come farebbe chiunque, dieci minuti di gioco danno **picco 133, media
66, e zero minuti con picchi sopra il tetto**. La densità sta sotto il soffitto: era il metodo
a essere rotto, non il gioco.

Vale la pena scriverlo perché è il modo tipico in cui una misura mente: il banco funzionava,
il bot no, e il numero sembrava plausibile.

La riga sul titolo diceva il nome («Vetro») e cosa fa, ma non **che cosa fosse**: un nome
proprio mai visto, senza una categoria sopra, non si può indovinare — ogni altra carta del
gioco ha la sua etichetta (`EVENTO D'ARENA`, `IL TERRENO CONTA`, `RUNA SBLOCCATA`) e questa no.
E la sola parola «congiunzione» non sarebbe bastata: quello che serve sapere è che **cambia a
ogni corsa**, altrimenti sembra una statistica del proprio nucleo.

Siccome esce dal seme, `Ripeti questa semenza` ripete anche la congiunzione.

### I guardiani ruotano

I **numeri** restano dello slot — vita, velocità, pavimento di velocità, raggio, danno,
esperienza sono tarati su quel minuto e non si toccano. **Identità e pattern** ruotano fra i
primi quattro. Così puoi trovarti le cariche del Titano al 2:30 senza che il 2:30 diventi più
duro: cambia cosa devi schivare, non quanto incassi. L'ultimo slot non ruota, perché il finale
deve restare il finale — e la vittoria adesso la decide una bandierina `fine` sul guardiano,
non il controllo `id === 'eclissi'` che il rimescolamento avrebbe rotto.

### Il mazzo cresce

Si comincia con **otto rune** su sedici: le sei aperture, che devono restare tutte scegliibili,
più Nova e Falce. Le altre otto entrano una per traguardo — sopravvivere quattro minuti,
accendere un Risveglio, abbattere un guardiano, portare una runa al livello 5, 500
eliminazioni, otto minuti, un Risveglio di secondo grado, tre guardiani in una partita. Ne
esce **al massimo una per partita**, apposta: due sblocchi insieme si annullano a vicenda, e la
fine di ogni corsa deve avere una cosa nuova da guardare.

I traguardi non sono arbitrari: ognuno chiede di fare una cosa che il gioco vuole insegnare.

### Contratti

Le dodici sfide sono chiavi: si prendono una volta e finiscono. Dopo quelle non restava nessun
obiettivo a portata, e «ascendi» — che chiede di vincere una corsa da venti minuti — non è un
obiettivo a portata. I **contratti** sono tre alla volta, si rinnovano appena li completi, e il
premio segue l'ascensione massima raggiunta (`× 1 + asc × 0,12`) così non diventano spiccioli.
Ventuno modelli, valutati con lo stesso oggetto di statistiche delle sfide.

### Reliquie

Il capitolo caro dell'Osservatorio, e l'unico dove ogni voce è **una regola invece di una
percentuale**: Semenza (inizi con un livello già preso), Mercante (dissolvere rende il doppio),
Richiamo (eventi il 35% prima), Avanzo (saltare cura il doppio e dà 120 frammenti),
Bussola (un Nodo è sempre sintonizzato sulla tua apertura), Crogiolo (trasformazioni al livello
5 invece che al 6), Coro di stelle (+7% danno per ogni Risveglio acceso), Respiro (una volta per partita,
scendere sotto un quarto di vita ti cura e ti rende intoccabile per tre secondi).

E **Dominio**, che è il pozzo senza fondo: quaranta livelli a passo 1,14, cioè 536.811
frammenti. Nessuno lo finisce, ed è esattamente il punto — una valuta che non compra più
niente è un giro rotto.

| | prima | ora |
|---|---|---|
| prima spesa possibile | 60 (+8% vita) | **110 (l'apertura parte al livello 3)** |
| +1 alloggiamento | 700 | **260** |
| totale del comprabile finito | 21.704 | 38.928 |
| pozzo senza fondo | — | 536.811 |

Dopo una sola partita persa al minuto otto (~940 frammenti) si comprano **tutte e quattro** le
voci che cambiano come si gioca: Innesco, Presagio, Ventaglio e Orbita Estesa, 760 in totale.

### Corsa del giorno e storico

Stessa data, stesso seme, quindi stessa arena, stesse carte e stessa congiunzione per chiunque
la giochi: in un gioco senza rete è l'unico punteggio che si possa confrontare con qualcuno. È
un'**Incursione**, così è una cosa che si fa davvero ogni giorno.

«Si può confrontare» però era un modo di dire: non c'era **nessun modo** di passare il proprio
risultato a un altro — l'unico punteggio comparabile del gioco moriva dentro al salvataggio di
chi l'aveva fatto. Ora dal titolo e dalla schermata di fine si copia una riga di tre righe —
data, congiunzione, tempo ed eliminazioni — e si incolla dove si vuole.

Lo **storico** tiene le ultime venti partite — durata, formato, ascensione, nucleo,
eliminazioni, guardiani abbattuti, congiunzione. È anche l'unica telemetria possibile: con
dieci amici e una settimana si vede *dove* si smette invece di dedurlo. Il salvataggio non
tocca la rete, quindi il codice di backup se lo porta dietro.

### Nuclei

Sei nuclei, e ognuno oltre alle statistiche porta **una regola**. Due riscrivono l'anello,
che è il gioco: **Nadir** fa risuonare le rune anche saltando un alloggiamento (anelli
alternati impossibili per chiunque altro), **Lyra** ha l'anello dimezzato ma ogni runa conta
doppia per le catene — due rune bastano per un Risveglio, tre per il secondo grado, quattro
per il terzo.

Il nucleo dice *che regola* giochi. Da *dove parti* è una scelta a parte: l'**apertura**
decide la prima runa dell'anello, cioè la tua prima catena e il primo Risveglio a cui punti.
Sei aperture, una per elemento più l'Iride, e non costano nulla: si scelgono a ogni partita.

### Aspetto

La sagoma del nucleo si sceglie: esagono, triangolo, quadrato, pentagono, ottagono, cerchio,
stella a sei punte. È solo estetica — nessuna forma tocca una statistica, si cambiano quando si
vuole e non costano niente — e vale la stessa regola dei nemici: **l'identità la porta la
forma, non la tinta**. Il colore resta quello del nucleo che giochi e il centro resta bianco e
pieno, l'unica cosa bianca e piena dello schermo. Se un giorno in campo ci sarà più di un
giocatore, la sagoma è ciò che si legge da lontano, quando il colore è già sepolto sotto gli
effetti.

### Sfide

Dodici obiettivi che danno una direzione alle partite e insegnano i sistemi. Non medaglie:
pagano in frammenti, e due sbloccano un nucleo scavalcando il prezzo. Si prendono una volta —
per gli obiettivi che si rinnovano ci sono i **contratti**.

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

E adesso si trovano. Ogni altra cosa lontana ha la sua freccia a bordo schermo — scrigni,
cuori, bombe, breccia, Corriere — e proprio quella che chiede di andare a piantarti da qualche
parte non l'aveva: in un'arena di 3400 pixel per lato, con lo schermo che ne mostra 1700, un
cristallo si incontrava per caso. La freccia c'è solo per il Nodo **utile** più vicino, solo se
non ci sei già dentro e solo entro milleseicento pixel, e non porta la scia tratteggiata che
hanno breccia e Corriere: quelle scadono, il Nodo no — una linea permanente in mezzo allo
schermo sarebbe un guinzaglio invece di un invito.

### Eventi d'arena

Ogni novanta secondi succede qualcosa che **ha un luogo**. Sono **cinque**: una breccia da
raggiungere prima che si chiuda, una marea di nemici da una sola direzione, un Corriere da
abbattere prima che sparisca, un **Allineamento** di tre sigilli che si spengono a turno, e
una **Fermata** da tenere.

Erano tre, e l'intervallo fra due eventi è `rand(80,105)` secondi: una Corsa ne fa undici,
quindi ognuno dei tre tornava **quasi quattro volte nella stessa partita**, e una volta su tre
tornava *subito dopo se stesso* — due brecce di fila, due maree di fila. Un evento che si
ripete non è più «succede qualcosa»: è il fondale. Adesso sono cinque e non si ripetono mai di
fila.

I due nuovi chiedono col corpo qualcosa che gli altri tre non chiedevano mai.

L'**Allineamento** accende tre sigilli intorno a te e li spegne **a turno**, a sei secondi di
distanza l'uno dall'altro: il più vicino non è quasi mai il primo da prendere, quindi la
domanda non è «dove vado» ma **in che ordine**. È il solo evento che chieda di pianificare un
giro invece di un viaggio, e l'unico la cui ricompensa cresce con quanto bene l'hai fatto — due
su tre pagano in schegge, tre su tre valgono uno scrigno. Un tratteggio unisce quelli ancora
accesi, così il giro si legge come figura invece che come tre punti sparsi.

La **Fermata** è la nota tenuta: un cerchio turchese che si riempie **finché ci stai dentro**,
mentre i nemici arrivano da tutte le parti. È l'unico momento in cui il gioco chiede di *non*
muoversi — tutto il resto, schivare, raccogliere, inseguire, premia chi non si ferma mai,
quindi «resta» è la sola richiesta che questo gioco non aveva ancora fatto. Uscire non azzera:
**mette in pausa**, perché azzerare farebbe smettere di provarci chi è stato spinto fuori da un
contraccolpo. Il cerchio è largo 168 pixel, cioè abbastanza per girarci dentro: non chiede di
stare fermo, chiede di restare. Piena vale uno scrigno e il 20% di vita.

Due difetti nella marea e nel Corriere, trovati misurando.

**Il Corriere non scappava: ti veniva addosso.** Era uno spettro normale — che insegue a 237
px/s — con sopra una correzione di fuga da 205, e la correzione perdeva. Misurato: arrivava a
**quattro pixel** dal nucleo e ci restava per tutti i ventisei secondi. Da lì due cose insieme:
la caccia non era una caccia, e la freccia a bordo schermo non compariva **mai**, perché
compare solo quando il bersaglio è fuori campo e lui non usciva mai dallo schermo. Adesso il
verso è invertito, la velocità è sua (212 contro i tuoi 196) e il richiamo esterno è più forte
della fuga, quindi la distanza si stabilizza intorno ai 700 pixel: fuori campo su un telefono,
dove la freccia serve; al limite della vista su un desktop, dove non serve. Misurato dopo:
freccia visibile il **100%** del tempo su telefono contro l'8% di prima, e un giocatore che lo
insegue lo abbatte al secondo 23,9 dei 26.

**La marea era strozzata dalle comparse normali.** L'evento non è «più nemici», è «i nemici
arrivano tutti da una parte»: lasciando acceso anche il flusso circolare, un terzo di quelli
che comparivano veniva comunque da dietro, e i due flussi insieme riempivano il tetto in pochi
secondi soffocando proprio la marea — **38 nemici invece di 162** in diciotto secondi. Adesso
durante una marea le comparse normali si fermano: la marea *è* il flusso, misurato a **9,0 al
secondo e 100% dalla direzione dichiarata**. E ha un indicatore: una fascia sul bordo dello
schermo dal lato da cui arrivano, che si stringe mentre il tempo scorre, col conto alla
rovescia. Non ha una freccia perché non ha un posto dove andare: ha un lato.

Il consiglio che le dava il briefing era anche sbagliato — «spostati di fianco e lasciala
passare» — perché una marea di nemici che ti inseguono non passa: ti segue. Quello che è vero è
che il lato **opposto** alla fascia resta sgombro, ed è di là che si va, allungandoli in fila
invece di attraversarli.

Il tetto di nemici della marea era anche un numero fisso, 260, scritto prima che il tetto normale
scendesse da 240 a 160 per leggibilità — quindi lo contraddiceva, e soprattutto **non scalava
con niente**: né col dispositivo (su un telefono il tetto normale è 115, quindi 260 era 2,3
volte contro le 1,6 di un desktop) né col momento della partita. Misurato col bot:

| | tetto del momento | picco della marea | prima | ora |
|---|---|---|---|---|
| minuto 2 | 92 | 239 → 120 | **2,60×** | 1,30× |
| minuto 6 | 134 | 260 → 220 | 1,94× | 1,64× |
| minuto 10 | 160 | 171 → 213 | 1,07× | 1,33× |

Era una valanga al minuto 2 — quando hai due rune e la build più debole della partita — e non
faceva **niente** al minuto 10, quando invece potresti reggerla: esattamente al contrario.
Adesso la valvola è **1,3 volte il tetto del momento**, quindi l'evento vuol dire la stessa
cosa a ogni minuto e su ogni schermo. E resta una valvola, non la manopola: l'intensità della
marea la fa il ritmo di comparsa — nove al secondo, tutti da una parte sola. Servono a dare un motivo per andare da qualche parte, quindi devono **vedersi da
lontano**: la breccia ha il suo faro, il Corriere una colonna di luce e un reticolo col conto
alla rovescia, e finché sono fuori campo una freccia a bordo schermo con distanza e secondi.

### La corsa non si perde

Su un telefono una partita da venti minuti non finisce quando decidi tu: finisce quando arriva
una notifica, quando cambi scheda, quando Android sfratta la pagina per fare posto. Perdere
quindici minuti di corsa per un messaggio è il modo più rapido di far chiudere un gioco.

Quindi la corsa si **annota** — ogni quattro secondi, e in più quando la pagina sparisce — e
alla riapertura il titolo offre `Riprendi · 12:34` al posto di `Gioca`. Nella pausa c'è
**«Esci e riprendi dopo»** accanto ad «Abbandona la corsa»: due modi di smettere, e la
differenza è scritta.

Si annota il **progresso**, non il mondo: seme, formato, orologio, anello, passivi, vita, e
tutti i contatori che pagano sfide e contratti. L'arena si rigenera identica dallo stesso seme,
perché `genRocks` pesca dal flusso col seme; i nemici no, e per non regalare un'arena sgombra a
chi esce e rientra ne ricompare subito una quota pari al 55% del tetto del momento — altrimenti
uscire diventava un pulsante per ripulire lo schermo. Sta in una chiave sua (`orbita.run.v1`) e
non dentro il salvataggio: dura un giorno, non deve gonfiare il codice di backup.

### Il menu

L'Osservatorio era **una colonna sola alta 5259 pixel** su un telefono: sette schermate,
diciassette sezioni, sessantuno bottoni. E faceva cinque lavori diversi mescolati insieme —
preparare la corsa, spendere, seguire gli obiettivi, guardare lo storico, gestire il
salvataggio. Il bottone *Inizia* stava a millecento pixel dall'alto, cioè dopo una schermata e
mezza di scorrimento; Reliquie, Sfide e Storico stavano a 2773, 4207 e 5155, dove non arriva
nessuno.

Quattro schede — **Partita, Frammenti, Obiettivi, Archivio** — e le due cose che servono sempre
restano ferme: quanti frammenti hai in cima, e la barra che fa partire la corsa in fondo,
sopra l'area sicura del telefono.

| | prima | ora (390×750) |
|---|---|---|
| Osservatorio | 5259px in colonna unica | 1020 / 2661 / 1568 / 750 per scheda |
| *Inizia* | y≈1100, da cercare | sempre a vista, barra fissa |
| Titolo | *Gioca* a metà schermo | *Gioca* a 587–647, zona del pollice |

Sul titolo, formato, nucleo, apertura, ascensione e congiunzione erano cinque oggetti sparsi:
sono una cosa sola — «che partita sto per giocare» — quindi sono **un blocco solo**, e sotto c'è
il bottone. Il testo di presentazione compare solo a chi non ha mai giocato: alla decima
partita erano duecento pixel di cose che sai già, in cima allo schermo, fra te e il bottone.

Una regola che il menu non rispettava: dietro gira il gioco vero, quindi **ogni pannello che
porta testo ha una base opaca sotto la tinta**. Misurato, la carta della corsa era al 72% e la
cella del formato scelto al **17%** — il nucleo e le gemme passavano attraverso le scritte.

E la vetrina è tornata a vedersi. Due cose erano tarate sul titolo vecchio, quello col testo in
alto e lo spazio libero in basso: la telecamera spingeva il nucleo **verso il basso**, cioè da
quando l'azione sta in fondo lo mandava dietro ai bottoni; e la sfumatura dello schermo era
quasi nera in cima (.86–.95) e limpida al 58–74%, cioè apriva il suo unico buco proprio dietro
ai pannelli. Adesso il buco sta dove gira il gioco. E lo spazio libero non è nello stesso posto
sui due schermi: su un telefono la colonna dei pannelli è larga quanto lo schermo e comincia al
55%, quindi il nucleo **sale** al 37%; su un desktop è alta ma larga 760 pixel su 1280, quindi
il nucleo **si sposta di lato**, all'82%, dove la colonna non arriva.

### Quello che nessuno ti aveva detto

Tre cose il gioco le faceva senza spiegarle, e chi cominciava le capiva male.

**Le schegge.** Sono l'esperienza, ma niente lo diceva: un giocatore nuovo le scavalca,
non sale di livello, e conclude che il gioco è impossibile. I doni a terra avevano già la
regola giusta — *una parola sotto a quello più vicino* — le gemme no. Adesso, e **solo finché
non ne hai raccolta una in vita tua**, la scheggia più vicina porta scritto `ESPERIENZA`; al
primo tocco la barra in alto si ingrossa e pulsa, e la scritta non torna mai più. Misurato: la
prima gemma cade a terra al secondo 2,5 e un giocatore fermo ne raccoglie una al 15,5 — tredici
secondi in cui la parola è lì da leggere, poi il concetto è insegnato e ripeterlo sarebbe
rumore addosso alla cosa più numerosa dello schermo.

**I Nodi.** Un cristallo che si illumina quando ci passi dentro, per chi comincia, è un
potenziamento raccolto. Il difetto era che si illuminavano **tutti allo stesso modo**, quindi
«si accende» non voleva dire niente. Adesso un Nodo si accende solo se è sintonizzato su un
elemento che stai davvero giocando: quello che brilla è quello che ti serve, gli altri restano
cristalli scuri con un anello tratteggiato — terreno, non bottino. E siccome l'anello cambia
durante la partita, un Nodo spento **si accende al minuto sei** quando peschi la runa giusta:
l'arena reagisce alla tua build sotto i tuoi occhi, che è il modo migliore di spiegare la
regola. Sotto al cristallo c'è scritto cosa fa, o perché è spento (`ti serve una runa di
fuoco`), e la targhetta nell'HUD compare solo quando il bonus lo stai ricevendo davvero.

Due cose che «acceso» prometteva senza mantenere. La prima: **l'Iride accendeva tutti i Nodi e
non prendeva niente da nessuno.** Il Nodo dà +35% di danno alle rune del suo elemento — e il
+35% guarda `d.el`, che per l'Iride vale `iride` e mai un elemento vero — più una runa alla
catena, che con la sola Iride resta comunque a zero perché `maxRun` vuole almeno una runa
dell'elemento. Adesso l'Iride non conta per accendere un Nodo, anche se continua a contare
nelle catene. La seconda: il cartello scriveva `+35% danno · catena +1` sempre, ma **quella runa in più
serve a una cosa sola**, alzare il grado del Risveglio, e quasi sempre non lo alzava. Il primo
criterio era «ho almeno due rune di questo elemento», che sbaglia in tutti e due i versi: due
rune *lontane* fra loro non fanno catena (uno più uno fa due, e il Risveglio ne vuole tre), e
con l'Eco o con Lyra i conti cambiano ancora. Adesso il cartello lo chiede a chi lo sa — il
grado con il Nodo contro il grado senza — e quando sono uguali promette solo il +35%, che
invece è verissimo: è il 35% di tutto il tuo danno.

**Gli eventi d'arena.** Una breccia sembra una decorazione, una marea sembra sfortuna, il
Corriere sembra un nemico che non muore. L'avviso in alto durava due secondi e passava mentre
stavi schivando, cioè esattamente quando non puoi leggere. La prima volta — **e una volta sola
per sempre** — il gioco si ferma e lo spiega, con la cosa ferma sullo sfondo. Due righe, non
tre paragrafi: un pannello che ferma il gioco si legge solo se si legge in fretta. Vale anche
per il primo Nodo utile in cui entri.

La carta della lezione **fa vedere** una scheggia invece di descriverla: il tuo nucleo — con la
sagoma e il colore che hai scelto — che ne raccoglie tre mentre la barra sale. Un colore a
parole è perso in partenza, e «verdi» era pure sbagliato: la tinta è **159°**, cioè turchese, e
«azzurre» sarebbe stato peggio, perché l'azzurro nel gioco è l'elemento Gelo.

Ci sono volute due versioni sbagliate. La prima si leggeva **al contrario** — sembrava che il
nucleo sputasse i puntini invece di attirarli — perché nascevano dentro al riquadro, andavano a
velocità costante e non avevano scia: tre puntini in fila accanto a un nucleo si leggono come
emessi. La seconda aveva la direzione giusta ma **insegnava la cosa sbagliata**: il nucleo era
fermo e le schegge gli volavano dentro, cioè «arrivano da sole», che è il contrario di quello
che dice il testo lì sopra e di quello che si fa in partita. Il magnete esiste, ma tira solo
l'ultimo pezzo: la distanza la copri tu.

Adesso le schegge stanno ferme dove sono cadute e **il nucleo attraversa il campo** a
prendersele, con la scia dietro, e il risucchio scatta solo quando arriva addosso — che è
esattamente il raggio di raccolta del gioco. A ogni presa il nucleo emette un anello e la barra
scatta nello stesso fotogramma; alla quarta la barra riparte da capo, che è quello che succede
salendo di livello.

Verificato misurando e non a occhio, fermando le animazioni e facendole avanzare a mano: il
nucleo avanza in **dodici passi su dodici e non torna mai indietro**, e ogni scheggia resta
immobile finché lui non la raggiunge — l'unico spostamento è il risucchio di 13-26 pixel
all'istante del contatto.

E la lezione delle schegge è **una carta con un bottone**, come gli eventi d'arena: il gioco si
ferma alla prima scheggia caduta e riparte quando tocchi «Ho capito». Un avviso passivo o dura
poco e non lo leggi, o dura tanto e dà fastidio — un pannello addosso all'azione per
venticinque secondi era il secondo difetto. Con il bottone la durata la decidi tu.
«Ho capito» però chiude la spiegazione, non la lezione: da lì fino alla prima scheggia
raccolta la più vicina resta scritta `ESPERIENZA` e la barra aspetta di lampeggiare. Il nesso
si chiude quando lo fai, non quando lo leggi. Perché l'etichetta da sola non bastava: misurato, chi si
muove — cioè chiunque, visto che la prima lezione è «muoviti» — raccoglie la sua prima gemma
**3,5 secondi** dopo che ne è caduta una, e in quei tre secondi sta ancora guardando la
levetta. Una lezione attaccata a un oggetto che sparisce in tre secondi non è una lezione.

Ci sono voluti quattro tentativi, e i difetti che la tenevano invisibile valgono più della
soluzione. Il primo: **la vetrina del menu raccoglieva una scheggia da sola**. Dietro al titolo
gira il gioco vero, gemme comprese, e il nucleo della vetrina segnava la lezione come imparata
prima che tu toccassi Gioca — misurato, il flag risultava già preso al secondo **1,7** della
prima partita di un salvataggio appena azzerato. Il secondo: il pannello stava al **63%**
dell'altezza, che su un telefono è esattamente dove sta la mano che regge la levetta. Su
puntatore grossolano ora sale al 38%. E non scade più dopo sette secondi: finisce quando la
lezione è imparata, cioè quando raccogli una scheggia.

Il terzo non era un difetto del codice ma delle **conseguenze** del primo: correggere la
vetrina impedisce che risucceda, ma non ripara i salvataggi che quel flag ce l'hanno già —
e prima della correzione anche azzerare i progressi lo faceva rimettere subito dalla vetrina.
Chi aveva aperto quella versione non avrebbe visto l'indicazione mai più, per sempre. Il
salvataggio ha quindi adesso un numero di versione (`v`), e alla prima apertura di un
salvataggio più vecchio quel flag — e solo quello, gli altri li ha messi il gioco vero — viene
tolto una volta sola. Il controllo legge il salvataggio **grezzo** e non quello già fuso coi
valori predefiniti, o la versione risulterebbe sempre quella nuova e la riparazione non
scatterebbe mai.

### Rientrare in gioco

Si torna a giocare da una schermata di carte, dalla pausa, dall'anello, da un briefing. In
tutti questi casi il mondo era fermo e ripartiva esattamente com'era — coi nemici dove li avevi
lasciati, che spesso vuol dire addosso — mentre il tuo pollice era su un bottone e non sulla
levetta. Quello è un colpo che non hai potuto evitare.

Quindi non si riparte a velocità piena: si riparte al **16%** e si accelera in un secondo e
mezzo, con una curva al quadrato — il tempo serve tutto all'inizio, quando devi capire dove
sei. Non è invulnerabilità, un nemico addosso fa male lo stesso. Misurato: nei primi 0,4
secondi d'orologio il mondo avanza di 0,07, e in 1,6 di 0,71. Circa un secondo di orologio
regalato per rimettere il dito dove serve.

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

### Colpi nemici e guardiani

Misurato col gioco vero e non a occhio: banco di prova headless, un contatore su ogni colpo
sparato, assorbito, mancato e andato a segno, e un bot che schiva scegliendo fra ventiquattro
direzioni quella più libera a mezzo secondo.

**Prima.** In una partita vinta da venti minuti i cinque guardiani facevano **zero danni**. Non
pochi: zero, in otto partite su quattro livelli di ascensione. E i colpi rossi dei tiratori
erano decorazione: di novecento passati vicino, **sei** entravano nei trenta pixel, e in venti
minuti dieci arrivavano addosso. Tre cause, tutte geometriche:

- **si mirava a dove sei**, non a dove sarai — e il proiettile più lento (210 px/s) è appena
  più veloce di un giocatore fermo a piedi (196). Fermi si veniva colpiti il 98% delle volte,
  in movimento lo 0,7%: non una schivata, un interruttore.
- **la volata radiale è uno steccato**: fra due colpi ci sono `2πr/n` pixel e ne bastano 40 per
  passare, quindi oltre i 95 pixel dal guardiano il cerchio ha già i buchi — e a 220 px/s ci
  arriva in mezzo secondo.
- **nessun guardiano tiene il passo**: il più veloce fa 158 px/s. Nei duelli isolati restavano
  parcheggiati a 143–172 pixel dietro le spalle per un minuto intero, e le diciannove cariche
  del Titano andavano a vuoto tutte e diciannove.

E il volume di fuoco non era progettato: un tiratore spara a cadenza fissa finché è vivo,
quindi **tutto ciò che allunga la vita dei nemici lo moltiplica** — il direttore, che scambia
numero per durezza, e le ascensioni. Dalla 0 alla 12 la quota di colpi che va a segno passava
dallo 0,7% al 25% senza che nessuna regola di ascensione nominasse i tiratori.

**Adesso.** I tiratori mirano dove sarai, con metà del tempo di volo di anticipo: schivare
torna a essere una decisione — cambiare direzione — invece che uno stato. Il danno ha un tetto
a 2,2× (cresceva dell'8% al minuto senza fine: era l'unica cosa del gioco a non fermarsi mai).
La cadenza compensa il direttore ma **non** l'ascensione, che è una scala di difficoltà e deve
pesare. E l'ondata del 7:30 ha di nuovo un tiratore: erano due minuti senza un colpo a
distanza, l'unico gradino all'indietro in tutta la curva di pressione.

I guardiani sparano **due corone sfalsate di mezzo passo** a 0,35 s l'una dall'altra: stessa
densità nello stesso istante, buchi dimezzati, minaccia vera fino a ~200 pixel, cioè alla
distanza a cui li si combatte. Sotto i 450 pixel hanno un **pavimento di velocità**, in
frazione della tua e diverso per ciascuno — 72% il Custode, 92% l'Eclissi — messo sotto al
rallentamento, così congelarli funziona ancora. Un pavimento unico per tutti li appiattiva
sulla stessa andatura, e a pagarlo era il più lento: il Custode saltava da 118 a 172 px/s
(+46%, e +86% a fine partita) proprio al 2:30, quando la tua build è la più debole. E quando è
il guardiano a starti addosso, gli evocati non compaiono più dentro di te: uno su cinque nasceva
entro sessanta pixel dal nucleo, il più vicino a otto — non una minaccia da schivare, un danno
già successo. La loro vita non segue più il direttore all'infinito: aveva prodotto un'Aracne da
**settantamila** punti vita, quaranta secondi in campo senza lasciare un graffio.

Misurato dopo, stessi duelli isolati: i contatti al minuto su un giocatore che gira seguono
finalmente l'ordine dei guardiani invece di essere tutti uguali — 39 il Custode, 54 l'Aracne,
41 il Titano, 106 l'Aurora, **350** l'Eclissi (erano 15, 24, 29, 47, 95) — e la distanza a cui
ti tengono scende da 143–172 pixel a 148, 127, 225, 107, **81**. I colpi radiali a segno
raddoppiano. Su partite intere ad ascensione 0 il danno preso dai colpi rossi va da una media di
63 a **194**, e si vince ancora; alla 6 il danno da contatto quasi triplica.

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

Il **bianco saturo è riservato alla morte**. Prima non lo era: il lampo di "colpito" durava
0,13 s e riempiva il nemico di bianco pieno, ma con otto rune che sparano da sole un nemico
viene colpito molto più spesso di così — quindi restava bianco quasi sempre. Un segnale sempre
acceso non dice più niente, e rubava la saturazione all'unica cosa che deve saturare. Ora
essere colpiti è un guizzo di 0,07 s sopra il corpo scuro; morire è l'unica cosa che diventa
davvero bianca.

Misurato leggendo i pixel del canvas, su un fondo di 11 di luminosità media: il pop alza la
media del riquadro di **11** e il suo pixel più luminoso di **+110 su 255** per due fotogrammi,
poi lascia un contorno che si allarga per 200 ms. (La prima versione alzava la media di 3,5 e
il picco di **2**: era un velo, non un lampo — e infatti non si notava.) Nel fotogramma
peggiore di una partita — 14 gusci in volo con 48 nemici a schermo — i pixel saturi sono
l'**1,99%** contro l'1,56% di un fotogramma senza morti: lo schermo non si sbianca.

In partita: 4–5 pop al secondo (il limite è 16), una raffica ogni 3–10 secondi, in media **2
gusci a schermo**. Niente sussulto e niente tremore sui nemici comuni: a venti uccisioni al
secondo lo schermo non si fermerebbe più.

### Quello che il codice diceva e non faceva

Un giro di correzioni tutte della stessa famiglia: una regola scritta in due posti, e il
secondo che racconta quella sbagliata. Nessuna si vedeva leggendo il gioco — si vedono
misurandolo, ed è per questo che ognuna adesso porta il suo controllo in `collaudo`.

**La carta di potenziamento prometteva i numeri di un'altra curva.** È la carta che si preme
più di ogni altra cosa — una trentina di volte per corsa — e si calcolava i numeri per conto
suo invece di chiedere a `runeStats`. La percentuale di danno era `g.dmg / base.dmg`, cioè un
numero **fisso**: la Scintilla prometteva «+44% danno» dal primo all'ottavo livello, mentre il
guadagno vero scende da **+59% a +13%** — a metà corsa la carta prometteva il triplo di quello
che dava. Mancava sia `GROWTH` (1,35, che moltiplica ogni passo) sia il fatto che l'aumento va
misurato sul danno di *adesso*. Peggio: «+1 proiettili» e «+1 perforazione» erano calcolati
senza `GROWTH`, quindi sul gradino sbagliato — la Scintilla dal 3 al 4 guadagna un proiettile
*e* una perforazione e la carta diceva «+velocità»; dal 4 al 5 non guadagna niente e la carta
prometteva un proiettile. Adesso i due livelli si chiedono a `runeStats`, la stessa funzione che
li usa in campo, e si sottraggono: i moltiplicatori del giocatore stanno in entrambi i termini e
si semplificano. Il controllo verifica tutte e **224** le carte, runa per runa e livello per
livello.

**Il terzo grado non contava quando a farlo era il Culmine.** «Porta un Risveglio al terzo
grado» è un contratto da 540 frammenti e una sfida da 600, e il contatore leggeva `G.awaken` —
il grado *costruito con l'anello*. Ma il Culmine alza di un grado ogni Risveglio acceso, che è
la ragione per cui il Culmine esiste: per cinque secondi e mezzo quel Risveglio infligge danno
di terzo grado per davvero, e la targhetta in basso a sinistra accende la terza tacca. Quindi
lo schermo scriveva «Ardore ●●●» e l'obiettivo restava chiuso. Adesso il conto sta in
`recalcAwk`, che è l'unico posto a sapere quanto vale un Risveglio *in questo istante* — ci si
passa quando cambia l'anello e quando il Culmine si accende o si spegne.

**L'arpeggio delle uccisioni non scorreva mai.** Il pop di ogni nemico cicla su una pentatonica
minore apposta: venti suoni identici al secondo l'orecchio li fonde in un ronzio, che è il
contrario della soddisfazione. L'indice della nota si chiamava però `combo`, lo stesso nome che
il contatore del ritmo di uccisione riscrive a ogni fotogramma: l'altezza non era un contatore
che avanza, era il numero di uccisioni al secondo — a ritmo costante, una nota sola. Misurato:
su 154 pop il semitono usciva 0 o 1 nel **75%** dei casi; adesso la scala si percorre tutta. Lo
stesso scontro faceva dire al contatore a schermo un'uccisione in più di quelle vere.

**Il Glaciale faceva danno senza farsi vedere.** L'anello di schegge che congela al tocco è la
trasformazione del Cristallo e si comporta come lui, ma il disegno filtrava per
`id === 'cristallo'`: un'arma invisibile che colpiva. E il suo `spd` — che è una velocità
*angolare*, non di un proiettile — prendeva il moltiplicatore di Vortice due volte, perché
l'esclusione guardava il `tag` e le trasformazioni hanno tutte tag `trasformazione`: misurato
con Vortice 3, girava **1,96 volte** il Cristallo invece di 1,18. Adesso chi gira e chi spazza
stanno in due elenchi soli, letti sia da chi calcola sia da chi disegna.

**L'Inverno non congelava niente.** «L'alone diventa una stagione: congela al tocco» — e il
congelamento arrivava alla funzione del danno dentro un campo che nessuno leggeva. Il gelo
portato da un colpo era scritto in due posti e mancava nel terzo: ora sta in uno.

**La modalità senza fine non cresceva.** Il bottone promette che la difficoltà sale; la
condizione che la fa salire chiedeva `!G.victory`, e nel senza fine la vittoria c'è per
definizione — ci si entra dopo aver vinto. Misurato: sessanta secondi con il contatore fermo a
zero.

**«Riordina l'anello» era un Rilancio gratis e infinito.** Dalla schermata delle carte si può
andare a riordinare e tornare: tornando si ripescava. Accanto a un bottone *Rilancia* che ne
concede due per partita, e a un contratto che chiede di arrivare all'ottavo minuto senza
rilanciare. Ora le tre carte restano quelle — tranne quando riordinare le ha rese
impossibili da giocare: sei rune in due catene da tre non lasciano un alloggiamento
sacrificabile, e la schermata di collocazione non ha un bottone per uscire.

**Riprendere una corsa la cambiava.** L'Ascesi è il potenziamento ripetibile senza limite, cioè
danno, vita e area accumulati per tutta la partita: non veniva annotata, e riprendere la
azzerava — misurato, sei Ascesi e il 30% di danno spariti. Le carte in attesa nemmeno, e chi ha
la reliquia Semenza ne riceveva una **nuova a ogni ripresa**: un potenziamento gratis per ogni
volta che usciva dal gioco.

**Uno scrigno si annunciava come una salita di livello.** La schermata delle carte sa dire
«Scrigno stellare» e sa che il Ventaglio non vale sugli scrigni, ma il parametro che glielo
dice non le veniva passato da nessuno: sette righe di codice morto.

**Il Corriere che non ti attacca ti attaccava.** Il briefing dice «non ti attacca: scappa», ed
era uno spettro normale: sbatterci contro toglieva vita, cioè la caccia puniva esattamente il
momento in cui lo raggiungi. E anche a danno zero la ferita si accendeva lo stesso — mezzo
secondo di invulnerabilità regalata, il velo rosa, il suono, e il suo nome nella schermata di
fine come assassino.

**La guida raccontava le soglie di due versioni fa**: «a cinque rune il secondo grado, a sette
il terzo», cioè sette rune in fila su un anello che ne tiene sei. Adesso i tre numeri escono
dalla stessa costante che li decide in partita.

E una che non era un difetto del gioco ma del banco: **il canvas non era mai stato collaudato**.
Nello stub headless mancava `Path2D`, quindi `render()` esplodeva alla prima runa disegnata e
nessun controllo poteva toccarlo — ed è così che una funzione intera era rimasta a lungo senza
essere mai chiamata, e che il Glaciale è stato invisibile per un pezzo. Adesso si disegna un
fotogramma in tredici situazioni diverse: con un guardiano, con ogni evento d'arena, con le
formazioni, con i doni a terra, dentro e fuori da un Nodo, durante il Culmine, nella vetrina
del menu.

### Quello che la scheda prometteva e il gioco non manteneva

Stessa famiglia di sopra, vista dall'altra parte: non una regola scritta due volte nel codice,
ma una regola scritta una volta **nel codice** e una volta **nella scheda che la vende**. La
seconda non si sbaglia mai da sola: si sbaglia quando la prima cambia e nessuno torna a
rileggere l'altra.

**Il Presagio ritardava il primo elite di trentaquattro secondi.** È il terzo potenziamento del
negozio, 160 frammenti, e la scheda dice *«il primo elite arriva al primo minuto»* — cioè il
primo scrigno, cioè la prima carta in più. Il numero però stava scritto a mano in tre posti: la
base in due (lo stato iniziale e `resetRun`) e quello del Presagio in un terzo, fisso a 60.
Quando la base è scesa a 26 — *«l'apertura era troppo tranquilla: a mezzo minuto c'erano undici
nemici e il primo livello arrivava dopo venti secondi di niente»* — quel 60 è rimasto dov'era.
Da allora si pagava per **peggiorare**: misurato, primo elite al secondo 26 senza e al secondo
60 con. Adesso i due numeri stanno uno accanto all'altro in `01-data` (26 e 13), la riga del
negozio se li scrive da sola, e il controllo verifica che il potenziamento anticipi invece di
ritardare — non che valga 13, che è un numero e può cambiare.

**Lyra saltava il primo grado di Risveglio.** La sua regola è *«anello dimezzato, ma ogni runa
conta doppia per le catene»*, e ovunque fosse scritta — nel commento del codice, nella guida,
in questo README — diceva «due rune bastano per un Risveglio, tre per il secondo grado».
L'implementazione raddoppiava però la **lunghezza** della catena lasciando i gradi a un passo
di uno: con due rune Lyra prendeva direttamente il **secondo** grado, con tre il **terzo** —
quello che a chiunque altro ne costa cinque — e il primo grado, per lei, non esisteva proprio.
Il passo fra un grado e l'altro adesso segue la runa e non il punteggio: 0 · I · II · III da una
a quattro rune, che è la scala che tutti e tre i testi raccontavano già.

Con la correzione la lunghezza della catena e il grado che ne esce stanno in tre funzioni sole
(`catenaDi`, `catenaRichiesta`, `gradoCatena`) invece che sparse: la lunghezza era scritta due
volte — nel motore e nell'interfaccia, che dice «Fuoco 2/3» e «spostala nell'alloggiamento 3» —
e il requisito **cinque** volte.

**La guida raccontava una soglia di trasformazione che metà dei giocatori non ha.** «Una runa a
livello 6»: il numero era scritto a mano, mentre la soglia la spostano il Crogiolo (reliquia da
2600 frammenti, la porta a 5) e la congiunzione Fornace. `sogliaEvo()` è l'unico posto che lo
sa e la scheda delle forme glielo chiedeva già; la guida no.

**Una carta che il gioco sapeva disegnare e non poteva pescare.** «120 frammenti» era il
pavimento del mazzo prima che l'Ascesi ne prendesse il posto, ed è rimasta disegnata da
`cardHTML`, applicata da `applyChoice` e cercata in tre punti come *la carta meno preziosa da
sacrificare* — senza che nessuno la mettesse più nel mazzo. Misurato: zero su dodicimila carte
pescate. Adesso un controllo confronta i tipi di carta che l'interfaccia sa gestire con quelli
che `rollChoices` sa produrre, come quello che accoppia bottoni e gestori.

**Due regole che dicevano metà della verità.** La *Ritempra* prometteva «l'elemento di una
vicina», e fra i candidati c'è anche l'elemento della tua **apertura**: con un'Iride di fianco —
che un elemento suo non ce l'ha — la runa cambiava verso un elemento che nessuna vicina porta.
E la regola di *Sirio*, «ogni critico accorcia di 0,04s la ricarica di tutte le rune», taceva la
pausa obbligata che la tiene in piedi: senza, con sei rune in mezzo alla folla i critici sono
centinaia al secondo e l'anello sparerebbe a ogni fotogramma (misurato prima che la pausa
esistesse: 45 uccisioni al secondo contro le 17 di Vega, stessa build). Adesso la scheda dice
anche «fino a cinque volte al secondo», e il numero esce dalla costante che lo applica.

**E una riga della guida che si leggeva al contrario.** «Con Nadir le rune risuonano anche
saltando un alloggiamento, quindi *alternare funziona*»: l'eco lunga tocca la **risonanza** (il
+30% di danno), non la catena, che resta fatta di rune una accanto all'altra. Chi ci costruiva
sopra un anello alternato restava senza nemmeno un Risveglio e non aveva modo di sapere perché.

### Tre cose che il gioco sa e non diceva

L'orologio diceva da quanto stai giocando, mai **quanto manca**: una Corsa dura venti minuti e
un'Incursione otto, e quel numero si sapeva solo dal menu, prima di partire. Vedere il
traguardo è metà della ragione per cui si stringe i denti nell'ultimo minuto. Nel senza fine
sparisce, perché lì un traguardo non c'è.

A **una runa dal Risveglio** non c'era nessun segnale. È l'informazione più azionabile del
gioco — è la stessa cosa che la diagnosi di fine partita dice a chi non ci è mai arrivato, «eri
a due rune di Fuoco di fila su tre, una in più e la partita cambiava» — e stava solo nella
schermata delle carte, cioè a gioco fermo. Adesso c'è una targhetta tratteggiata accanto alle
altre, e una sola: due o tre sarebbero rumore.

E il momento in cui una runa diventa **pronta a trasformarsi** passava in silenzio. Lo scoprivi
solo se la carta usciva, e la carta esce a una salita di livello: magari due minuti dopo, o
mai. Peggio quando a chiudere la condizione è l'arena — entri in un Nodo, il Risveglio si
accende, la runa diventa pronta e nessuno te lo dice. L'avviso è una volta per runa e per
partita, ma il segnale resta: quella runa porta un **cerchio d'oro che respira** finché non la
trasformi, addosso all'anello, cioè dove gli occhi stanno già. L'oro è riservato a lei e
all'indicatore del Culmine, ed è una cosa che capita una o due volte per partita.

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
| Desktop | `WASD` o frecce · `Spazio` Culmine · `R` rigioca dalla fine · `Esc` / `P` pausa |

Le rune sparano da sole. L'unica cosa che fai con le mani è schivare.

## Sviluppo

```bash
npm run build          # genera orbita.html e dist/index.html
npm run dev            # build + server statico su http://localhost:5173
npm run collaudo       # 292 controlli sul gioco vero, headless
npm run rami           # niente è rimasto fuori da main
```

I sei banchi di misura. Ognuno risponde a **una** domanda, e ogni numero del
bilanciamento in questo README esce da uno di loro:

```bash
npm run misura              # gira: una corsa e un'incursione, chi vince
npm run misura -- asc       # la scala di difficoltà dei due formati, in Quiete
npm run misura -- cong      # ogni congiunzione, novanta secondi ciascuna
npm run misura -- soldi     # quanto rende una corsa, e quanto costa il negozio
npm run misura -- scrigni   # quante volte la partita si ferma, e per cosa
npm run misura -- crescita  # quanto cresce il nucleo, e se ha dove crescere
npm run misura -- culmine   # ogni quanto arriva il Culmine, con altre curve
npm run misura -- perigeo   # quanto costa chiudere l'anello, e quanto rende
```

**Il bot del banco giocava male, e per un po' l'ha fatto in silenzio.** Prendeva
una runa nuova a ogni occasione anche ad anello pieno — e lì una runa nuova
*sostituisce* quella che c'era: 36 carte su 43 erano rune nuove, l'anello
restava a livello 1-2 per tutta la corsa e la potenza non cresceva mai. Il banco
misurava una build che nessuno costruisce. Due tarature fatte con lui (l'economia
e l'onda del Perigeo) sono andate rifatte, e la tabella delle ascensioni
rimisurata. Resta un limite noto, scritto anche dove serve: **il bot non prende
danno** (`hurtPlayer` esce subito quando lo stato non è `play`, e il banco lo
lascia su `level` dopo una salita di livello), quindi misura la coerenza di una
curva, non la difficoltà percepita — e di una meccanica difensiva sa dire il
prezzo, non il beneficio.

`build.mjs` (Node, cross-platform) e `build.ps1` (Windows) producono output identico.

```
tools/banco.mjs    banco headless: stub di DOM, canvas e audio — nessun disegno
tools/collaudo.mjs controlli di non-regressione: ogni voce protegge un difetto vero
tools/misura.mjs   il bot che schiva, e i tre banchi di misura
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
| `ELITE_T` / `ELITE_T_PRESAGIO` | `01-data.js` | quando arriva il primo elite, cioè il primo scrigno, senza e con il Presagio |
| `G.eliteT` | `03-systems.js` → `updateSpawns` | ogni quanto ne arriva un altro |
| `rincorsa` | `03-systems.js` → `bossAI` | elastico del boss: accelera quanto più resta indietro |
| `RAGGIO_MIRA` | `03-systems.js` → `direttore` | la distanza a cui devono morire i nemici: è **la** manopola della difficoltà |
| `MODI` | `01-data.js` | i due formati: durata, quanto scorrono ondate (`onda`) e vita nemica (`tempra`), quanto si sale (`xp`), chi arriva e con quanta vita (`guardiani`), quanto rende (`paga`) |
| `CONGIUNZIONI` | `01-data.js` | le undici regole sorteggiate a ogni corsa, col peso `w`: la Quiete pesa quanto tre delle altre |
| `EVENTI` | `03-systems.js` | i cinque eventi d'arena, e il ritmo con cui si aprono (`G.evT`) |
| `CATENA_BASE` | `01-data.js` | quante rune in fila accendono un Risveglio; `catenaDi`, `catenaRichiesta` e `gradoCatena` in `02-engine.js` sono gli unici tre posti che lo applicano |
| `EVO_LV` | `01-data.js` | la soglia della trasformazione, e il gradino che il Crogiolo le toglie |
| `SBLOCCHI` | `01-data.js` | quale runa entra nel mazzo per quale traguardo, in ordine |
| `CONTRATTI` | `01-data.js` | i ventuno obiettivi che si rinnovano, e il loro premio base |
| `RELIQUIE` | `01-data.js` | le otto regole comprabili, col prezzo |
| `CULM_DUR` / `culmineCost()` | `01-data.js` | quanto dura il Culmine e quanto costa caricarlo |
| `G.tenacia` | `03-systems.js` → `direttore` | quanto il direttore ha indurito i nemici in questo momento (1 = non è intervenuto) |
| `G.chiarezza` | `06-main.js` → `step` | quanto spazio visivo resta ai tuoi effetti: 1 quando il campo è vuoto, .42 quando è pieno |
| `AREA_RIF` | `02-engine.js` → `calcolaZoom` | l'area di schermo di riferimento: da qui esce `G.zoom`, cioè quanto mondo vedi |

In console è esposto `window.ORBITA` con `G` (stato), `P` (statistiche derivate), `step()`,
`start()`, `reset()`, `endRun()`, `payout()`, `roll()`, `apply()`, `place()`, `recalc()`,
`recalcRing()`, più le tabelle nuove (`MODI`, `CONGIUNZIONI`, `SBLOCCHI`, `CONTRATTI`,
`RELIQUIE`) e `congiunzioneDi()`, `congMods()`, `rosterGuardiani()`, `metaCost()`, `contrattoPremio()`,
`statoPartita()`, `semeDelGiorno()`, `attivaCulmine()`, `runeStats()`. Serve a far girare partite simulate senza renderizzare,
che è come sono state misurate e bilanciate le rune, i formati e le congiunzioni.

`reset(nucleo, seme, formato)` prepara una partita senza avviare l'interfaccia, quindi si può
girare un formato intero in pochi secondi e leggere `G.roster`, `G.cong`, `G.bossKills`.

```js
// DPS di una runa a livello 5, 25 secondi simulati
const O = ORBITA;
O.start('vega'); O.G.state = 'play';
O.G.ring.fill(null); O.place('scintilla', 0); O.G.ring[0].lv = 5; O.recalcRing(false);
O.G.t = 120;
for (let i = 0; i < 1500; i++) { O.step(1/60); O.P.hp = O.P.maxHp; O.G.pending = 0; }
console.log(Math.round(O.G.dmgDone / 25));
```

Il salvataggio sta in `localStorage` sotto `orbita.save.v1`, porta un numero di versione `v`
per le riparazioni una tantum, e contiene anche `runes` (il mazzo
sbloccato), `reliquie`, `contratti`, `modo`, `storico` e `giorno`. Un salvataggio della versione
precedente si apre senza perdere niente: `sanitizeSave` gli assegna le otto rune di partenza e
tre contratti alla prima apertura.

## Nessun commit resta indietro

Il deploy parte da `main`: finché un commit non è lì, quel lavoro non esiste per chi gioca.
È già costato due volte — l'ultima, otto commit fermi su un ramo per due giorni mentre il
gioco in produzione mostrava ancora il tasto vecchio, senza che niente lo segnalasse.

```
npm run rami
```

Esce con 1 se esiste anche un solo commit fuori da `main`, elenca quali e dà il comando per
recuperarli. Non serve ricordarsi di lanciarlo: gira all'avvio di ogni sessione di lavoro
(`.claude/hooks/session-start.sh`) e su GitHub a ogni push su `main` e una volta al giorno
(`.github/workflows/rami.yml`), dove pota anche i rami già assorbiti — sei rami fermi sono
la confusione da cui nasce l'errore.

## Licenza

MIT — vedi [LICENSE](LICENSE).

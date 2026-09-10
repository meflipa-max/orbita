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

### Culmine

Un indicatore che si riempie **uccidendo**. Quando è pieno, `Spazio` (o il tasto in basso a
destra) e per cinque secondi e mezzo l'anello spara tutto insieme, le ricariche vanno quasi al
doppio, e **ogni Risveglio acceso sale di un grado**. Non ne accende di nuovi: moltiplica
quello che hai costruito, e per questo premia chi l'anello l'ha costruito bene. È l'unica cosa
che fai con le mani oltre a schivare.

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

Dice **chi ti ha ucciso**, **da dove è venuto il danno** — la percentuale runa per runa, che è
la statistica che fa venire voglia di ricostruire — e una diagnosi presa dai contatori della
partita: *«Non hai mai acceso un Risveglio: eri arrivato a due rune di Fuoco di fila su tre.»*

### Trasformazioni

Una runa portata a livello 8 **mentre risuona da entrambi i lati e il suo elemento è
risvegliato** si trasforma. Ne ha una **ognuna delle sedici rune**. Non diventa più grande: diventa un'altra cosa. La Cometa lascia
una scia che brucia davvero e si frantuma a ogni uccisione; il Glaciale congela al tocco; il
Fulgore sdoppia la catena a ogni salto; il Mietitore risucchia i nemici lungo il cammino;
l'Alba spazza con due fasci opposti. La condizione è **posizionale**: obbliga a progettare
l'anello dal primo minuto.

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

Vincere un'Incursione sblocca l'ascensione come vincere una Corsa: è il punto — la prima
conclusione deve stare nella prima sessione. La domanda era quindi una sola: **l'Incursione è
una scorciatoia per scalare la scala di difficoltà?** Misurato col banco headless e un bot che
ogni mezzo secondo schiva scegliendo fra ventiquattro direzioni, quattro semi per riga:

| | asc 0 | asc 4 | asc 8 | asc 12 |
|---|---|---|---|---|
| Corsa | 4/4 | 3/4 | 0/4 | 0/4 |
| Incursione | 4/4 | 2/4 | 1/4 | 0/4 |

No: le due colonne si muovono insieme, quindi il formato si sceglie per il tempo che hai, non
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
più veloci del 18%, tu compreso). E **Quiete**, che pesa il doppio delle altre: una corsa su
quattro deve restare quella di sempre, o «modificata» smette di voler dire qualcosa. Misurato
su 40.000 semi: Quiete 22,2%, le altre fra 10,8% e 11,3%.

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
Richiamo (eventi il 35% più spessi), Avanzo (saltare cura il doppio e dà 120 frammenti),
Bussola (un Nodo è sempre sintonizzato sulla tua apertura), Crogiolo (trasformazioni al livello
7), Coro di stelle (+7% danno per ogni Risveglio acceso), Respiro (una volta per partita,
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

Lo **storico** tiene le ultime venti partite — durata, formato, ascensione, nucleo,
eliminazioni, guardiani abbattuti, congiunzione. È anche l'unica telemetria possibile: con
dieci amici e una settimana si vede *dove* si smette invece di dedurlo. Il salvataggio non
tocca la rete, quindi il codice di backup se lo porta dietro.

### Nuclei

Sei nuclei, e ognuno oltre alle statistiche porta **una regola**. Due riscrivono l'anello,
che è il gioco: **Nadir** fa risuonare le rune anche saltando un alloggiamento (anelli
alternati impossibili per chiunque altro), **Lyra** ha l'anello dimezzato ma ogni runa conta
doppia per le catene — due rune bastano per un Risveglio.

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

### Eventi d'arena

Ogni novanta secondi succede qualcosa che **ha un luogo**: una breccia da raggiungere prima
che si chiuda, una marea di nemici da una sola direzione, un Corriere da abbattere prima che
sparisca.

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
nelle catene. La seconda: il cartello scriveva `+35% danno · catena +1` sempre, ma **con una
runa sola la catena non fa niente** — uno più uno fa due, e il Risveglio ne vuole tre. Con una
runa il cartello dice solo il +35%, che invece è verissimo: è il 35% di tutto il tuo danno.

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
npm run collaudo       # 34 controlli sul gioco vero, headless
npm run misura         # partite simulate: una corsa e un'incursione
npm run misura -- asc  # la scala di difficoltà dei due formati
npm run misura -- cong # ogni congiunzione, novanta secondi ciascuna
```

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
| `G.eliteT` | `03-systems.js` → `updateSpawns` | frequenza degli elite, cioè degli scrigni |
| `rincorsa` | `03-systems.js` → `bossAI` | elastico del boss: accelera quanto più resta indietro |
| `RAGGIO_MIRA` | `03-systems.js` → `direttore` | la distanza a cui devono morire i nemici: è **la** manopola della difficoltà |
| `MODI` | `01-data.js` | i due formati: durata, quanto scorrono ondate (`onda`) e vita nemica (`tempra`), quanto si sale (`xp`), chi arriva e con quanta vita (`guardiani`), quanto rende (`paga`) |
| `CONGIUNZIONI` | `01-data.js` | le regole sorteggiate a ogni corsa, col peso `w`: la Quiete pesa il doppio |
| `SBLOCCHI` | `01-data.js` | quale runa entra nel mazzo per quale traguardo, in ordine |
| `CONTRATTI` | `01-data.js` | i ventuno obiettivi che si rinnovano, e il loro premio base |
| `RELIQUIE` | `01-data.js` | le otto regole comprabili, col prezzo |
| `G.tenacia` | `03-systems.js` → `direttore` | quanto il direttore ha indurito i nemici in questo momento (1 = non è intervenuto) |
| `G.chiarezza` | `06-main.js` → `step` | quanto spazio visivo resta ai tuoi effetti: 1 quando il campo è vuoto, .42 quando è pieno |
| `AREA_RIF` | `02-engine.js` → `calcolaZoom` | l'area di schermo di riferimento: da qui esce `G.zoom`, cioè quanto mondo vedi |

In console è esposto `window.ORBITA` con `G` (stato), `P` (statistiche derivate), `step()`,
`start()`, `reset()`, `endRun()`, `payout()`, `roll()`, `apply()`, `place()`, `recalc()`,
`recalcRing()`, più le tabelle nuove (`MODI`, `CONGIUNZIONI`, `SBLOCCHI`, `CONTRATTI`,
`RELIQUIE`) e `congiunzioneDi()`, `rosterGuardiani()`, `metaCost()`, `contrattoPremio()`,
`statoPartita()`, `semeDelGiorno()`. Serve a far girare partite simulate senza renderizzare,
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

## Licenza

MIT — vedi [LICENSE](LICENSE).

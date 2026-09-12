# Orbita — regole di lavoro

## Il lavoro finisce in main. Sempre.

Non su un ramo, non in una PR lasciata aperta: **in `main`**. Il deploy parte
da li', quindi finche' un commit non e' in `main` quel lavoro non esiste per
chi gioca. L'unica eccezione e' una richiesta esplicita di fare diversamente,
in quella sessione, a voce.

E' la regola numero uno perche' e' l'errore che questo repository ha gia'
fatto due volte. L'ultima: otto commit — il tasto del Culmine riprogettato,
i cuori dell'ascensione 7, il Corriere che si incastrava negli angoli —
fermi su un ramo per due giorni, con il gioco in produzione che mostrava
ancora la versione vecchia. Se ne e' accorto il giocatore, non il
repository: «ricordavo che avevi migliorato quel tasto, ma vedo ancora
quello vecchio». Nessuna PR era aperta, e nessuno aveva motivo di sospettare
che ci fosse qualcosa da guardare.

Quindi, chiudendo una sessione:

    npm run collaudo     # i controlli passano
    npm run rami         # niente e' rimasto fuori da main

`npm run rami` esce con 1 se esiste anche un solo commit che non e' in
`main`, e dice il comando per recuperarlo. Gira da solo all'avvio di ogni
sessione (`.claude/hooks/session-start.sh`) e su GitHub a ogni push su main
e una volta al giorno (`.github/workflows/rami.yml`), dove pota anche i rami
gia' assorbiti — perche' sei rami fermi sono la confusione da cui nasce
l'errore.

Se `rami` parla, non e' un avviso da archiviare: e' lavoro che si sta
perdendo.

## Come si scrive qui

- **Niente dipendenze.** Il gioco e' JavaScript a mano, `npm run build`
  cuce i sorgenti di `src/` in un unico file. Deve restare cosi'.
- **I commenti dicono PERCHE', non cosa.** Quasi ogni commento nel codice
  descrive il difetto che quella riga ha corretto, cosi' chi la trova sa
  cosa stava proteggendo prima di toglierla.
- **Una regola, un posto solo.** Quando la stessa condizione e' scritta in
  due punti, il secondo prima o poi racconta quella sbagliata: la fine
  partita accusava la risonanza a una runa che risuonava benissimo, perche'
  si era riscritta per conto suo le condizioni di `canEvolve()`.
- **Ogni correzione porta il suo controllo.** In `tools/collaudo.mjs`, con
  sopra il commento che dice quale difetto esisteva davvero. Un controllo
  che non fallirebbe sul codice di prima non sta proteggendo niente:
  verificalo mettendo per un attimo indietro la correzione.
- **I messaggi di commit raccontano il difetto**, in italiano: cosa si
  vedeva, perche' succedeva, cosa e' cambiato.

#!/bin/bash
# Avvio sessione. Due compiti, e il secondo e' il motivo per cui esiste.
#
# Otto commit — il tasto del Culmine riprogettato, i cuori dell'ascensione 7,
# il Corriere che si incastrava — sono rimasti fermi su un ramo per due
# giorni, mentre il gioco in produzione mostrava ancora la versione vecchia.
# Nessuno se n'e' accorto perche' niente lo diceva: bisognava pensare di
# andare a guardare. Adesso lo dice il repository, prima che si cominci a
# lavorare, in faccia a chi apre la sessione.
set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

# Le dipendenze: qui non ce ne sono, ma se un giorno ce ne fossero si
# installano da sole invece di far fallire il primo comando della sessione.
if [ -f package.json ] && [ -n "$(node -p "Object.keys({...(require('./package.json').dependencies||{}),...(require('./package.json').devDependencies||{})}).length" 2>/dev/null)" ]; then
  [ "$(node -p "Object.keys({...(require('./package.json').dependencies||{}),...(require('./package.json').devDependencies||{})}).length" 2>/dev/null)" != "0" ] && npm install --no-audit --no-fund >/dev/null 2>&1
fi

# La guardia. Non blocca mai la sessione (exit 0 in ogni caso): informa.
node tools/rami.mjs --fetch 2>/dev/null || true
exit 0

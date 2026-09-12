/* ═══════════════════════════════════════════════════════════════
   ORBITA — rami.  `npm run rami`

   Dice se esiste lavoro committato che NON e' in main.

   Esiste perche' e' successo due volte. L'ultima: otto commit — il tasto
   del Culmine riprogettato, i cuori dell'ascensione 7, il Corriere che si
   incastrava negli angoli — sono rimasti fermi su un ramo per due giorni.
   Nessuna PR aperta, nessun avviso, e il gioco in produzione mostrava
   ancora la versione vecchia. Se ne e' accorto il giocatore, non il
   repository: «ricordavo che avevi migliorato quel tasto, ma vedo ancora
   quello vecchio».

   Un commit che non e' in main non e' lavoro fatto: e' lavoro perso che
   non lo sa ancora. Questo controllo lo dice ad alta voce, e da' l'unico
   comando che serve a recuperarlo.
   ═══════════════════════════════════════════════════════════════ */
import { execFileSync } from 'node:child_process';

const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();
const conta = (da, a) => Number(git('rev-list', '--count', da + '..' + a));

/* --fetch prima di guardare: su una copia vecchia il verdetto e' vecchio
   anche lui, e questo controllo esiste apposta per non fidarsi */
if (process.argv.includes('--fetch')) {
  try { git('fetch', '--prune', 'origin'); } catch { console.log('· niente rete: guardo la copia locale'); }
}

/* main remoto se c'e', perche' e' quello da cui parte il deploy */
let base = 'origin/main';
try { git('rev-parse', '--verify', base); } catch { base = 'main'; }

const rami = git('for-each-ref', '--format=%(refname:short)\t%(committerdate:short)', 'refs/heads', 'refs/remotes/origin')
  .split('\n').filter(Boolean)
  .map(r => { const [nome, data] = r.split('\t'); return { nome, data }; })
  .filter(r => r.nome !== 'main' && r.nome !== 'origin/main' && r.nome !== 'origin/HEAD');

const fuori = [];
for (const r of rami) {
  const n = conta(base, r.nome);
  if (n) fuori.push({ ...r, n });
}

/* il caso piu' stupido e piu' frequente: commit fatti e mai spediti */
let locale = 0;
try { locale = conta('origin/main', 'main'); } catch { /* nessun remoto */ }

if (!fuori.length && !locale) {
  console.log('rami: tutto quello che e\' stato committato e\' in ' + base + '.');
  process.exit(0);
}

console.log('\n  ⚠  C\'E\' LAVORO COMMITTATO CHE NON E\' IN MAIN\n');
if (locale) {
  console.log('  main locale: ' + locale + ' commit mai spediti');
  console.log('    git push origin main\n');
}
for (const r of fuori) {
  console.log('  ' + r.nome + ': ' + r.n + ' commit fuori da main  (ultimo ' + r.data + ')');
  for (const riga of git('log', '--format=%s', base + '..' + r.nome).split('\n').slice(0, 8)) console.log('    · ' + riga);
  console.log('    git merge ' + r.nome + '  &&  git push origin main\n');
}
console.log('  Finche\' questa riga esiste, il gioco in produzione non ha quel lavoro.\n');
process.exit(1);

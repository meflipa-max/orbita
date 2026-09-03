/* ORBITA - build cross-platform (Node).
   Stesso risultato di build.ps1, ma gira anche su Linux: e' questo che usa Vercel.
     orbita.html      formato Artifact (senza doctype/head/body)
     dist/index.html  standalone, per browser, Vercel e WebView Android          */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, 'src');

const shell = readFileSync(join(src, 'shell.html'), 'utf8');
const js = readdirSync(src)
  .filter(f => f.endsWith('.js'))
  .sort()
  .map(f => `/* ==== ${f} ==== */\n` + readFileSync(join(src, f), 'utf8'))
  .join('\n');

/* split/join invece di replace: il JS contiene $ e \, che replace tratterebbe
   come riferimenti al match */
const page = shell.split('/*__ORBITA_JS__*/').join(js);
writeFileSync(join(root, 'orbita.html'), page);

const standalone = `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<meta name="theme-color" content="#070613">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="description" content="Orbita — bullet heaven roguelite in cui la tua build è un anello di rune che ti gira intorno.">
<meta property="og:title" content="Orbita">
<meta property="og:description" content="Le rune ti girano intorno. Quelle vicine risuonano: tre di fila accendono un Risveglio.">
<meta property="og:type" content="website">
</head>
<body>
${page}
</body>
</html>
`;

const dist = join(root, 'dist');
if (!existsSync(dist)) mkdirSync(dist, { recursive: true });
writeFileSync(join(dist, 'index.html'), standalone);

const kb = (Buffer.byteLength(standalone) / 1024).toFixed(1);
console.log(`build ok - orbita.html + dist/index.html - ${kb} KB`);

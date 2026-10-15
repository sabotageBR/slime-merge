// Monta a pagina de avaliacao no formato do Artifact do claude.ai em .tmp/artifact/:
//   index.html      o hub (modelos/index.html sem doctype/html/head/body: o publicador poe o
//                   esqueleto), com os caminhos trocados para os arquivos publicados ao lado;
//   jogo-N.html     o jogo com window.__slimeModelo = 'N' e SEM a tag do SDK da Poki (no
//                   claude.ai nao ha Poki; o wrapper segue sem anuncios);
//   src/**, modelos/*.gif e as fontes.
// Imprime o mapa de arquivos (JSON) para o campo `files` do publish.
// Uso: node tools/artifact-modelos.mjs
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { RAIZ } from './servir.mjs';

const pasta = join(RAIZ, '.tmp/artifact');
rmSync(pasta, { recursive: true, force: true });
mkdirSync(pasta, { recursive: true });
const MODELOS = ['lab', '1', '2', '3', '4', '5'];

let h = readFileSync(join(RAIZ, 'modelos/index.html'), 'utf8');
h = h.replace(/<!doctype html>\s*/i, '')
  .replace(/<html[^>]*>\s*/i, '').replace(/<\/html>\s*/i, '')
  .replace(/<head>\s*/i, '').replace(/<\/head>\s*/i, '')
  .replace(/<body>\s*/i, '').replace(/<\/body>\s*/i, '')
  .replace(/<meta charset="utf-8">\s*/i, '')
  .replace(/<meta name="viewport"[^>]*>\s*/i, '')
  .replace(/\.\.\/docs\/modelos\//g, 'modelos/')
  .replace(/\.\.\/index\.html\?modelo=([a-z0-9]+)/g, 'jogo-$1.html')
  .replace(/, url\('\.\.\/src\/ui\/fontes\/[^']+'\) format\('woff2'\)/g, '');
writeFileSync(join(pasta, 'index.html'), h);

// paginas de escolha (com o proprio doctype): estudio de visuais, escolhas de 2026-10-15 e os
// estudios de sons e de skins; prints em visuais/, jogo em jogo-1.html, modulos em src/
for (const pagina of ['visuais', 'escolhas', 'sons', 'skins']) {
  let v;
  try { v = readFileSync(join(RAIZ, `modelos/${pagina}.html`), 'utf8'); } catch { continue; }
  v = v.replace(/\.\.\/docs\/visuais\//g, 'visuais/')
    .replace(/\.\.\/docs\/skins\//g, 'skins/')
    .replace(/(src|href)="\.\.\/index\.html\?modelo=1"/g, '$1="jogo-1.html"')
    .replace(/, url\('\.\.\/src\/ui\/fontes\/[^']+'\) format\('woff2'\)/g, '')
    // './src/' e nao 'src/': nos imports dos modulos 'src/...' e um especificador nu e falha
    .replace(/\.\.\/src\//g, './src/');
  writeFileSync(join(pasta, `${pagina}.html`), v);
}
// modulos das paginas que ficam em modelos/: no Artifact moram na raiz, ao lado de src/
for (const extra of ['skins-candidatas.js']) {
  try { writeFileSync(join(pasta, extra), readFileSync(join(RAIZ, 'modelos', extra), 'utf8').replace(/'\.\.\/src\//g, "'./src/")); } catch { /* ainda nao existe */ }
}
try { cpSync(join(RAIZ, 'docs/skins'), join(pasta, 'skins'), { recursive: true }); } catch { /* sem prints de skins */ }
mkdirSync(join(pasta, 'visuais'), { recursive: true });
for (const f of readdirSync(join(RAIZ, 'docs/visuais'))) cpSync(join(RAIZ, 'docs/visuais', f), join(pasta, 'visuais', f));

const jogo = readFileSync(join(RAIZ, 'index.html'), 'utf8');
const semSdk = jogo.replace(/<!-- Unico script externo permitido pela Poki. -->\s*<script src="https:\/\/game-cdn\.poki\.com\/scripts\/v2\/poki-sdk\.js"><\/script>\s*/, '');
if (semSdk === jogo) throw new Error('nao achei a tag do SDK no index.html');
for (const m of MODELOS) {
  writeFileSync(join(pasta, `jogo-${m}.html`), semSdk.replace('<script type="module" src="src/main.js"></script>',
    `<script>window.__slimeModelo = '${m}';</script>\n<script type="module" src="src/main.js"></script>`));
}
cpSync(join(RAIZ, 'src'), join(pasta, 'src'), { recursive: true });
mkdirSync(join(pasta, 'modelos'), { recursive: true });
for (const m of MODELOS) cpSync(join(RAIZ, `docs/modelos/${m}.gif`), join(pasta, `modelos/${m}.gif`));
for (const f of ['fredoka-latin-700-normal.woff2', 'fredoka-latin-600-normal.woff2']) cpSync(join(RAIZ, 'src/ui/fontes', f), join(pasta, f));

/** @param {string} d @returns {string[]} */
const listar = (d) => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  return statSync(p).isDirectory() ? listar(p) : [p];
});
const mapa = {};
let total = 0;
for (const p of listar(pasta)) {
  const r = relative(pasta, p);
  total += statSync(p).size;
  if (r !== 'index.html') mapa[r] = relative(RAIZ, p);
}
process.stdout.write(JSON.stringify(mapa) + '\n');
process.stderr.write(`${Object.keys(mapa).length + 1} arquivos, ${(total / 1024 / 1024).toFixed(2)} MB em ${relative(RAIZ, pasta)}\n`);

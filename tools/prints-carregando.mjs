// Prints da tela de carregamento (o bequer enchendo de slime, 2026-10-17) para a aprovacao do
// usuario: o index.html sem o SDK e sem o main.js (a tela fica parada nela), em 3 momentos, no
// retrato e na paisagem. Folha em docs/visuais/carregando.jpg.
// Uso: node tools/prints-carregando.mjs
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { abrirChrome, espera } from './cdp.mjs';
import { RAIZ, servir } from './servir.mjs';

const pasta = join(RAIZ, '.tmp/carregando');
rmSync(pasta, { recursive: true, force: true });
mkdirSync(pasta, { recursive: true });
const html = readFileSync(join(RAIZ, 'index.html'), 'utf8')
  .replace('<head>', '<head>\n<base href="/">')
  .replace(/<script src="https:\/\/game-cdn[^>]*><\/script>/, '')
  .replace('<script type="module" src="src/main.js"></script>', '');
writeFileSync(join(pasta, 'index.html'), html);

const porta = 5378;
const fechar = await servir(porta);
const quadros = [];
try {
  for (const [w, h] of [[390, 844], [1031, 580]]) {
    const c = await abrirChrome({ largura: w, altura: h, porta: 9378 });
    try {
      await c.ir(`http://127.0.0.1:${porta}/.tmp/carregando/index.html`, 0);
      let t = 0;
      for (const ms of [300, 1500, 4000]) {
        await espera(ms - t);
        t = ms;
        const nome = join(pasta, `${w}x${h}-${ms}.png`);
        writeFileSync(nome, await c.print());
        quadros.push(nome);
      }
    } finally {
      await c.fechar();
    }
  }
} finally {
  fechar();
}
const entradas = quadros.flatMap((n) => ['-i', n]);
const filtro = quadros.map((_, k) => `[${k}]scale=-1:600[q${k}]`).join(';') + ';' + quadros.map((_, k) => `[q${k}]`).join('') + `hstack=inputs=${quadros.length}`;
const folha = join(RAIZ, 'docs/visuais/carregando.jpg');
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...entradas, '-filter_complex', filtro, '-q:v', '3', folha]);
console.log('folha', folha);

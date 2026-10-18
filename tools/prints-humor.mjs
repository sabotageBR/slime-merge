// Folha dos humores de cada slime (2026-10-17) para a aprovacao do usuario: cada humor (neutro,
// contente, amassado, chorinho, apatico, furioso e o berreiro do missil) em cada estilo de
// personagem com rosto, e um pote de verdade (o bot jogando) com os humores misturados.
// Chrome headless pelo DevTools Protocol, laco pausado; o humor e posto direto nos slimes e
// __slime.avancar(0) so desenha. Folha em docs/visuais/humor-<LxA>.jpg e o pote em
// docs/visuais/humor-pote-<LxA>.jpg.
// Uso: node tools/prints-humor.mjs [--tam=480x600]
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { abrirChrome, espera } from './cdp.mjs';
import { RAIZ, servir } from './servir.mjs';

const opt = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), ''] : [a.slice(2, i), a.slice(i + 1)]; }));
const tam = opt.tam || '480x600';
const [W, H] = tam.split('x').map(Number);
const porta = 5376;
const destino = join(RAIZ, 'docs/visuais');
const pasta = join(RAIZ, '.tmp/humor', tam);
rmSync(pasta, { recursive: true, force: true });
mkdirSync(pasta, { recursive: true });

const ESTILOS = ['classico', 'kawaii', 'bichinhos', 'monstrinhos', 'chapeus', 'boneco', 'frutinhas'];
const HUMORES = ['', 'contente', 'amassado', 'chorinho', 'apatico', 'furioso', 'choro'];

const fechar = await servir(porta);
const c = await abrirChrome({ largura: W, altura: H, porta: 9376 });
const celulas = [];
/** recorte do fundo do pote na tela (px CSS): [x, y, w, h] */
let recorte = [0, 0, W, H];
try {
  for (const estilo of ESTILOS) {
    await c.ir(`http://127.0.0.1:${porta}/index.html?modelo=1&vitrine=4&semente=3&passos=240&semhud&lang=pt&semanuncio&objeto=${estilo}&zoom=-4.9,-0.3,4.9,4.6`, 3000);
    if (!(await c.avaliar('!!(window.__slime && __slime.J.modo)'))) throw new Error('o jogo nao subiu');
    await c.avaliar('__slime.laco.pausar(true); true');
    // o zoom enquadra o fundo do pote dentro da #area do HUD: recorta so ele
    recorte = await c.avaliar(`(() => { const a = __slime.cena.paraTela(-4.9, 4.6); const b = __slime.cena.paraTela(4.9, -0.3);
      return [Math.round(a[0]), Math.round(a[1]), Math.round(b[0] - a[0]), Math.round(b[1] - a[1])]; })()`);
    for (const h of HUMORES) {
      await c.avaliar(`(() => { for (const s of __slime.J.modo.S.mundo.vivos()) { s.dados.expr = '${h}'; s.dados.exprT = 0; } __slime.avancar(0); return true; })()`);
      await espera(40);
      const nome = join(pasta, `${estilo}-${h || 'neutro'}.png`);
      writeFileSync(nome, await c.print());
      celulas.push(nome);
    }
  }
  // um pote de verdade: o bot jogando 4 min, o humor de cada um vem da fisica
  await c.ir(`http://127.0.0.1:${porta}/index.html?modelo=1&semente=5&auto=1500&passos=14000&lang=pt&semanuncio`, 4000);
  await c.avaliar('__slime.laco.pausar(true); __slime.pararAuto(); __slime.avancar(30); true');
  await espera(60);
  writeFileSync(join(destino, `humor-pote-${tam}.jpg`.replace('.jpg', '.png')), await c.print());
  if (c.erros.length) throw new Error('erro na pagina: ' + c.erros.join(' | '));
} finally {
  await c.fechar();
  fechar();
}

// folha: uma linha por estilo, uma coluna por humor (o pote recortado)
const col = HUMORES.length;
const larg = 300;
const entradas = celulas.flatMap((n) => ['-i', n]);
const corte = `crop=${recorte[2]}:${recorte[3]}:${recorte[0]}:${recorte[1]}`;
const filtro = celulas.map((_, k) => `[${k}]${corte},scale=${larg}:-1[q${k}]`).join(';') + ';'
  + celulas.map((_, k) => `[q${k}]`).join('') + `xstack=inputs=${celulas.length}:layout=`
  + celulas.map((_, k) => {
    const x = k % col ? Array.from({ length: k % col }, () => 'w0').join('+') : '0';
    const y = k >= col ? Array.from({ length: Math.floor(k / col) }, () => 'h0').join('+') : '0';
    return `${x}_${y}`;
  }).join('|');
const folha = join(destino, `humor-${tam}.jpg`);
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...entradas, '-filter_complex', filtro, '-q:v', '3', folha]);
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', join(destino, `humor-pote-${tam}.png`), '-q:v', '3', join(destino, `humor-pote-${tam}.jpg`)]);
rmSync(join(destino, `humor-pote-${tam}.png`));
console.log('folha', folha);
console.log('pote', join(destino, `humor-pote-${tam}.jpg`));

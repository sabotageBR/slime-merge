// Quadros do slime que cai na parede (2026-10-18, video do usuario: o slime solto em cima da borda
// ficava parado nela e depois pulava para dentro, longe do vidro; ele tem que escorrer pela parede).
// Chrome headless pelo DevTools Protocol, laco pausado e __slime.avancar(n). GIF de cada cena em
// docs/visuais/parede-<cena>-<LxA>.gif e a folha com os quadros-chave em docs/visuais/parede-<LxA>.jpg.
// Uso: node tools/prints-parede.mjs [--tam=560x700] [--cenas=borda,encosta,grande] [--saida=parede] [--zoom=x0,y0,x1,y1]
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { abrirChrome, espera } from './cdp.mjs';
import { RAIZ, servir } from './servir.mjs';

const opt = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), ''] : [a.slice(2, i), a.slice(i + 1)]; }));
const tam = opt.tam || '640x900';
/** o lado direito do pote (mundo: o vidro em x = 4,85, a borda em y = 11,2) */
const zoom = opt.zoom || '1.5,0.5,8,15';
const [W, H] = tam.split('x').map(Number);
const saida = opt.saida || 'parede';
const porta = 5376;
const destino = join(RAIZ, 'docs/visuais');
mkdirSync(destino, { recursive: true });

/** Pote largo com uma camada de slimes no fundo, como no video (JS da pagina). */
const FUNDO = `const S = __slime.J.modo.S; const J = S.jogadores[0]; J.pote.crescer(0); J.jogadas = 9;
  const por = (k, x, y) => { const s = S.R.criar(S, J, { nivel: k }, x, y, false); s.dados.pote = 0; s.dados.solto = -10; return s; };
  [[2, -3.6], [5, -1.6], [3, 0.4], [6, 2.2], [4, 3.9]].forEach(([k, x]) => por(k, x, 1.6));
  __slime.avancar(90);`;

/** Troca a peca presa pelo nivel k e solta com o centro a `d` u do topo da parede direita (d < 0: em cima dela). */
const SOLTAR = (k, d) => `const S = __slime.J.modo.S; const J = S.jogadores[0]; const P = J.pote;
  if (P.preso) { S.mundo.remover(P.preso); P.preso = null; }
  const s = S.R.criar(S, J, { nivel: ${k} }, P.mira, P.ySoltar, true); s.dados.pote = 0; P.prender(s);
  const ps = S.mundo.paredes; const xd = ps[P.idxParedes[P.idxParedes.length - 1]].bx;
  __slime.J.modo.apontar(xd - ${d} - (${d} > 0 ? s.raio0 : 0), 0, 'baixo');
  __slime.J.modo.apontar(xd - ${d} - (${d} > 0 ? s.raio0 : 0), 0, 'cima'); true`;

/** Cenas: [nome, nivel, distancia, passos entre quadros, quadros, marcos { quadro: nome }] */
const CENAS = [
  ['borda', 3, -1, 2, 90, { 0: 'solta', 10: 'borda', 25: 'escorre', 50: 'desce', 89: 'fim' }],
  ['encosta', 4, 0.05, 2, 70, { 6: 'toca', 20: 'escorre', 40: 'desce', 69: 'fim' }],
  ['grande', 7, -1, 2, 90, { 10: 'borda', 30: 'escorre', 60: 'desce', 89: 'fim' }],
];
const quais = opt.cenas ? opt.cenas.split(',') : CENAS.map((c) => c[0]);

const fechar = await servir(porta);
const c = await abrirChrome({ largura: W, altura: H, porta: 9376 });
const chaves = [];
try {
  for (const [nome, nivel, d, passo, qtd, marcos] of CENAS) {
    if (!quais.includes(nome)) continue;
    const pasta = join(RAIZ, '.tmp/parede', saida, tam, nome);
    rmSync(pasta, { recursive: true, force: true });
    mkdirSync(join(pasta, 'gif'), { recursive: true });
    await c.ir(`http://127.0.0.1:${porta}/index.html?modelo=1&semente=3&lang=pt&semanuncio&semhud&zoom=${zoom}`, 3000);
    if (!(await c.avaliar('!!(window.__slime && __slime.J.modo)'))) throw new Error('o jogo nao subiu');
    await c.avaliar('__slime.laco.pausar(true); true');
    await c.avaliar(`(() => { ${FUNDO} return true; })()`);
    await c.avaliar(`(() => { ${SOLTAR(nivel, d)} })()`);
    for (let k = 0; k < qtd; k++) {
      await c.avaliar(`__slime.avancar(${passo}); true`);
      await espera(30);
      const png = await c.print();
      writeFileSync(join(pasta, 'gif', String(k).padStart(4, '0') + '.png'), png);
      if (marcos[k]) { writeFileSync(join(pasta, marcos[k] + '.png'), png); chaves.push(join(pasta, marcos[k] + '.png')); }
    }
    const gif = join(destino, `${saida}-${nome}-${tam}.gif`);
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', String(Math.round(60 / passo)), '-i', join(pasta, 'gif', '%04d.png'),
      '-vf', `scale=${Math.min(W, 520)}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer`, gif]);
    console.log('gif', gif);
  }
  if (c.erros.length) throw new Error('erro na pagina: ' + c.erros.join(' | '));
} finally {
  await c.fechar();
  fechar();
}

// folha com os quadros-chave (5 por linha)
if (chaves.length) {
  const col = 5;
  const larg = Math.round(2400 / col);
  const linhas = Math.ceil(chaves.length / col);
  const total = linhas * col;
  const entradas = [];
  for (let k = 0; k < total; k++) entradas.push('-i', chaves[Math.min(k, chaves.length - 1)]);
  const filtro = Array.from({ length: total }, (_, k) => `[${k}]scale=${larg}:-1${k >= chaves.length ? ',drawbox=c=white:t=fill' : ''}[q${k}]`).join(';') + ';'
    + Array.from({ length: total }, (_, k) => `[q${k}]`).join('') + `xstack=inputs=${total}:layout=`
    + Array.from({ length: total }, (_, k) => {
      const x = k % col ? Array.from({ length: k % col }, () => 'w0').join('+') : '0';
      const y = k >= col ? Array.from({ length: Math.floor(k / col) }, () => 'h0').join('+') : '0';
      return `${x}_${y}`;
    }).join('|');
  const folha = join(destino, `${saida}-${tam}.jpg`);
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...entradas, '-filter_complex', filtro, '-q:v', '3', folha]);
  console.log('folha', folha);
}

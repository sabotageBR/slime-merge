// Quadros da fusao animada (2026-10-17) para a aprovacao do usuario: o par com o combo em cadeia
// e o selo, o grande | vao | grande que vira k+2, o 14 que nasce, comemora e estoura (o super slime), e o
// terremoto com o pote tremendo. Chrome headless pelo DevTools Protocol, laco pausado e
// __slime.avancar(n). GIF de cada cena em docs/visuais/fusao-<cena>-<LxA>.gif e a folha com os
// quadros-chave em docs/visuais/fusao-<LxA>.jpg.
// Uso: node tools/prints-fusao.mjs [--tam=1031x580] [--cenas=par,trio,super,terremoto]
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { abrirChrome, espera } from './cdp.mjs';
import { RAIZ, servir } from './servir.mjs';

const opt = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), ''] : [a.slice(2, i), a.slice(i + 1)]; }));
const tam = opt.tam || '1031x580';
const [W, H] = tam.split('x').map(Number);
const porta = 5375;
const destino = join(RAIZ, 'docs/visuais');
mkdirSync(destino, { recursive: true });

/** Poe um slime parado no pote (JS da pagina). */
const POR = `const por = (k, x, y, extra) => { const S = __slime.J.modo.S; const s = S.R.criar(S, S.jogadores[0], { nivel: k, ...(extra || {}) }, x, y, false); s.dados.pote = 0; s.dados.solto = -10; return s; };
  const S = __slime.J.modo.S; const J = S.jogadores[0]; J.pote.crescer(0); J.jogadas = 9;`;

/**
 * Cenas: [nome, url extra, preparo (JS), [antes do 1o quadro, passos entre quadros, quadros], marcos { quadro: nome }]
 */
const CENAS = [
  ['par', '', `${POR} const b = por(5, 0, 1.3); por(4, -0.9, b.raio0 * 2 + 1.2); por(4, 0.9, b.raio0 * 2 + 1.2); true`,
    [20, 2, 70], { 0: 'cai', 12: 'abraco', 20: 'escoa', 30: 'estalo-combo', 40: 'segunda', 52: 'x2' }],
  ['trio', '', `${POR} const a = por(7, 0, 3); const r = a.raio0; S.mundo.remover(a); por(7, -1.8 * r, r + 0.2); por(7, 1.8 * r, r + 0.2); true`,
    [40, 2, 60], { 0: 'grandes', 1: 'gota' }],
  ['super', '', `${POR} const a = por(13, 0, 3); const r = a.raio0; S.mundo.remover(a); por(13, 0, r * 0.8); por(13, 0.4, r * 2.6 + 0.3); true`,
    [2, 3, 70], { 4: 'abraco', 14: 'nasce14', 30: 'comemora', 56: 'estoura', 62: 'super' }],
  ['terremoto', '&auto=1500&passos=6000', `__slime.pararAuto(); __slime.J.modo.S.jogadores[0].jogadas = 9; __slime.J.modo.forcarEvento('terremoto'); true`,
    [118, 2, 60], { 2: 'comeca', 8: 'treme', 14: 'treme2', 40: 'para' }],
];
const quais = opt.cenas ? opt.cenas.split(',') : CENAS.map((c) => c[0]);

const fechar = await servir(porta);
const c = await abrirChrome({ largura: W, altura: H, porta: 9375 });
const chaves = [];
try {
  for (const [nome, extra, preparo, [antes, passo, qtd], marcos] of CENAS) {
    if (!quais.includes(nome)) continue;
    const pasta = join(RAIZ, '.tmp/fusao', tam, nome);
    rmSync(pasta, { recursive: true, force: true });
    mkdirSync(join(pasta, 'gif'), { recursive: true });
    await c.ir(`http://127.0.0.1:${porta}/index.html?modelo=1&semente=3&lang=pt&semanuncio${extra}`, 3000);
    if (!(await c.avaliar('!!(window.__slime && __slime.J.modo)'))) throw new Error('o jogo nao subiu');
    await c.avaliar('__slime.laco.pausar(true); true');
    await c.avaliar(`(() => { ${preparo} })()`);
    if (nome === 'trio') {
      await c.avaliar(`__slime.avancar(${antes}); true`);
      await c.avaliar(`(() => { ${POR} por(7, 0.2, 9); return true; })()`);
    } else {
      await c.avaliar(`__slime.avancar(${antes}); true`);
    }
    for (let k = 0; k < qtd; k++) {
      await c.avaliar(`__slime.avancar(${passo}); true`);
      await espera(30);
      const png = await c.print();
      writeFileSync(join(pasta, 'gif', String(k).padStart(4, '0') + '.png'), png);
      if (marcos[k]) { writeFileSync(join(pasta, marcos[k] + '.png'), png); chaves.push(join(pasta, marcos[k] + '.png')); }
    }
    const gif = join(destino, `fusao-${nome}-${tam}.gif`);
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', String(Math.round(60 / passo)), '-i', join(pasta, 'gif', '%04d.png'),
      '-vf', `scale=${Math.min(W, 520)}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer`, gif]);
    console.log('gif', gif);
  }
  if (c.erros.length) throw new Error('erro na pagina: ' + c.erros.join(' | '));
} finally {
  await c.fechar();
  fechar();
}

// folha com os quadros-chave (4 por linha)
if (chaves.length) {
  const col = 4;
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
  const folha = join(destino, `fusao-${tam}.jpg`);
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...entradas, '-filter_complex', filtro, '-q:v', '3', folha]);
  console.log('folha', folha);
}

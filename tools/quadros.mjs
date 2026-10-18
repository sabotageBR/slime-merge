// Quadros do missil da mira (Chrome headless pelo DevTools Protocol, laco pausado e
// __slime.avancar(n) andando quadro a quadro): reticulas, choro, voo, explosao e a gosma
// escorrendo na tela. Grava a tira em docs/visuais/missil-<LxA>.jpg e o GIF em
// docs/visuais/missil-<LxA>.gif.
// Uso: node tools/quadros.mjs [--tam=1031x580] [--semente=3] [--objeto=classico] [--alvo=pequeno]
// (--alvo=pequeno: o menor slime do pote; a gosma e do tamanho dele; grava missil-pequeno-<LxA>)
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { abrirChrome, espera } from './cdp.mjs';
import { RAIZ, servir } from './servir.mjs';

const opt = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), ''] : [a.slice(2, i), a.slice(i + 1)]; }));
const tam = opt.tam || '1031x580';
const [W, H] = tam.split('x').map(Number);
const porta = 5373;
const fechar = await servir(porta);
const pasta = join(RAIZ, '.tmp/quadros', tam);
rmSync(pasta, { recursive: true, force: true });
mkdirSync(pasta, { recursive: true });
const destino = join(RAIZ, 'docs/visuais');
mkdirSync(destino, { recursive: true });

const c = await abrirChrome({ largura: W, altura: H, porta: 9373 });
try {
  const extra = opt.objeto ? `&objeto=${opt.objeto}` : '';
  await c.ir(`http://127.0.0.1:${porta}/index.html?modelo=1&semente=${opt.semente || 3}&auto=700&passos=1500&lang=pt&semanuncio${extra}`, 3000);
  if (!(await c.avaliar('!!(window.__slime && __slime.J.modo)'))) throw new Error('o jogo nao subiu');
  // laco parado: daqui em diante so o avancar mexe no jogo (quadros exatos)
  await c.avaliar('__slime.laco.pausar(true); __slime.pararAuto(); __slime.J.modo.S.jogadores[0].poderes.mira = 1; true');
  const quadro = async (nome) => { await espera(60); writeFileSync(join(pasta, nome + '.png'), await c.print()); };
  const avancar = (n) => c.avaliar(`__slime.avancar(${n}); true`);
  await avancar(1);
  await c.avaliar("__slime.J.modo.poder('mira'); true");
  await avancar(1);
  await quadro('a-reticulas');
  // alvo: o slime mais alto do pote (bem visivel)
  const alvo = await c.avaliar(`(() => {
    const vivos = __slime.J.modo.S.mundo.vivos().filter((s) => !s.preso && s.raio0 > ${opt.alvo === 'pequeno' ? 0.3 : 0.9});
    vivos.sort((a, b) => ${opt.alvo === 'pequeno' ? 'a.raio0 - b.raio0' : 'b.cy - a.cy'});
    const s = vivos[${opt.alvo === 'pequeno' ? 0 : 'Math.min(1, vivos.length - 1)'}];
    __slime.J.modo.apontar(s.cx, s.cy, 'baixo');
    return [s.cx, s.cy];
  })()`);
  if (!alvo) throw new Error('sem alvo');
  // GIF: um quadro a cada 2 passos, da escolha ate a gosma sumir
  const gif = join(pasta, 'gif');
  mkdirSync(gif, { recursive: true });
  const marcos = { 4: 'b-choro', 20: 'c-lancamento', 30: 'd-voo', 40: 'e-mergulho', 46: 'f-impacto', 56: 'g-gosma', 80: 'h-escorre', 110: 'i-some' };
  for (let k = 0; k <= 130; k += 2) {
    await avancar(2);
    await espera(30);
    const png = await c.print();
    // numeracao seguida (o image2 do ffmpeg para no primeiro buraco)
    writeFileSync(join(gif, String(k / 2).padStart(4, '0') + '.png'), png);
    if (marcos[k]) writeFileSync(join(pasta, marcos[k] + '.png'), png);
  }
  if (c.erros.length) throw new Error('erro na pagina: ' + c.erros.join(' | '));
} finally {
  await c.fechar();
  fechar();
}

// tira com os quadros-chave (largura total ~2400 px)
const nomes = ['a-reticulas', 'b-choro', 'c-lancamento', 'd-voo', 'e-mergulho', 'f-impacto', 'g-gosma', 'h-escorre'];
const larg = Math.round(2400 / 4);
const entradas = nomes.flatMap((n) => ['-i', join(pasta, n + '.png')]);
const filtro = nomes.map((_, k) => `[${k}]scale=${larg}:-1[q${k}]`).join(';') + ';'
  + nomes.map((_, k) => `[q${k}]`).join('') + `xstack=inputs=${nomes.length}:layout=`
  + nomes.map((_, k) => `${(k % 4) ? Array.from({ length: k % 4 }, () => 'w0').join('+') : '0'}_${k >= 4 ? 'h0' : '0'}`).join('|');
const sufixo = opt.alvo === 'pequeno' ? 'pequeno-' : '';
const tira = join(destino, `missil-${sufixo}${tam}.jpg`);
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...entradas, '-filter_complex', filtro, '-q:v', '3', tira]);
const saidaGif = join(destino, `missil-${sufixo}${tam}.gif`);
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', '30', '-i', join(pasta, 'gif', '%04d.png'),
  '-vf', `scale=${Math.min(W, 640)}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer`, saidaGif]);
console.log('quadros em', pasta);
console.log('tira', tira);
console.log('gif', saidaGif);

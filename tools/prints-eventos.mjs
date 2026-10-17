// Prints dos eventos da pressao do sem fim (2.0.0) para a aprovacao do usuario: cada evento no
// aviso e ativo, a "Evolucao!" da escada e o pedido com o nivel pedido, no retrato e na paisagem.
// Chrome headless pelo DevTools Protocol, laco pausado e __slime.avancar(n) (quadros exatos; com o
// rAF solto o headless quase nao anda). Folha em docs/visuais/eventos-<LxA>.jpg.
// Uso: node tools/prints-eventos.mjs [--tam=390x844] [--semente=3] [--lang=pt]
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { abrirChrome, espera } from './cdp.mjs';
import { RAIZ, servir } from './servir.mjs';

const opt = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), ''] : [a.slice(2, i), a.slice(i + 1)]; }));
const tams = opt.tam ? [opt.tam] : ['390x844', '1031x580'];
const porta = 5374;
const fechar = await servir(porta);
const destino = join(RAIZ, 'docs/visuais');
mkdirSync(destino, { recursive: true });

/** [nome do quadro, evento, passos depois do forcar] (o aviso dura 120 passos) */
const CENAS = [
  ['a-aviso-gosma', 'gosma', 30],
  ['b-gosma', 'gosma', 200],
  ['c-gosma-cor', 'gosma', 520],
  ['d-coringas', 'coringas', 140],
  ['e-pedido', 'pedido', 150],
  ['f-terremoto', 'terremoto', 150],
  ['g-gigante', 'gigante', 140],
  ['h-gelo', 'gelo', 200],
];

try {
  for (const tam of tams) {
    const [W, H] = tam.split('x').map(Number);
    const pasta = join(RAIZ, '.tmp/eventos', tam);
    rmSync(pasta, { recursive: true, force: true });
    mkdirSync(pasta, { recursive: true });
    const c = await abrirChrome({ largura: W, altura: H, porta: 9374 });
    try {
      const nomes = [];
      for (const [nome, id, passos] of CENAS) {
        // o mesmo pote para todos: 150 s de partida com o bot a cada 1,8 s
        await c.ir(`http://127.0.0.1:${porta}/index.html?modelo=1&semente=${opt.semente || 3}&auto=1800&passos=9000&lang=${opt.lang || 'pt'}&semanuncio`, 4000);
        if (!(await c.avaliar('!!(window.__slime && __slime.J.modo)'))) throw new Error('o jogo nao subiu');
        await c.avaliar(`__slime.laco.pausar(true); __slime.pararAuto(); __slime.J.modo.forcarEvento('${id}'); true`);
        for (let k = 0; k < passos; k += 10) await c.avaliar('__slime.avancar(10); true');
        await espera(80);
        writeFileSync(join(pasta, nome + '.png'), await c.print());
        nomes.push(nome);
      }
      // a escada: o pote passa do 8 para o 9 e os pequenos evoluem
      await c.ir(`http://127.0.0.1:${porta}/index.html?modelo=1&semente=${opt.semente || 3}&auto=1800&passos=9000&lang=${opt.lang || 'pt'}&semanuncio`, 4000);
      await c.avaliar(`__slime.laco.pausar(true); __slime.pararAuto();
        (() => { const S = __slime.J.modo.S; S.jogadores[0].maxNivel = 9; S.extra.evoluir = 2; S.extra.agenda.prox = 9999; S.extra.agenda.ev = null; })(); true`);
      await c.avaliar('__slime.avancar(12); true');
      await espera(80);
      writeFileSync(join(pasta, 'i-evolucao.png'), await c.print());
      nomes.push('i-evolucao');
      if (c.erros.length) throw new Error('erro na pagina: ' + c.erros.join(' | '));
      // folha: 3 colunas no retrato, 3 na paisagem
      const col = 3;
      const larg = W > H ? 640 : 390;
      const entradas = nomes.flatMap((n) => ['-i', join(pasta, n + '.png')]);
      const filtro = nomes.map((_, k) => `[${k}]scale=${larg}:-1[q${k}]`).join(';') + ';'
        + nomes.map((_, k) => `[q${k}]`).join('') + `xstack=inputs=${nomes.length}:layout=`
        + nomes.map((_, k) => {
          const x = k % col;
          const y = Math.floor(k / col);
          const px = x ? Array.from({ length: x }, () => 'w0').join('+') : '0';
          const py = y ? Array.from({ length: y }, () => 'h0').join('+') : '0';
          return `${px}_${py}`;
        }).join('|');
      const folha = join(destino, `eventos-${tam}.jpg`);
      execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...entradas, '-filter_complex', filtro, '-q:v', '3', folha]);
      console.log('folha', folha);
    } finally {
      await c.fechar();
    }
  }
} finally {
  fechar();
}

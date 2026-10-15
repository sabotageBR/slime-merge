// Jogo de verdade, em tempo real, com mouse e teclado injetados pelo DevTools Protocol:
// cada modelo sobe, recebe gestos (mirar, soltar, despejar, sovar, inclinar), abre e fecha a
// pausa, liga o mudo, usa um reforco, e no Merge Lab forca o fim para testar o "Jogar de novo"
// e o revive (anuncio simulado de 3 s em localhost). Falha com excecao na pagina, laco parado
// ou estado errado. Mede o fps. Prints em .tmp/jogar/.
// Uso: node tools/jogar.mjs [modelo...] [--tam=390x844]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { abrirChrome, espera } from './cdp.mjs';
import { RAIZ, servir } from './servir.mjs';

const args = process.argv.slice(2);
const opt = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const modelos = args.filter((a) => !a.startsWith('--'));
const lista = modelos.length ? modelos : ['1', '2', '3', '4', '5', 'lab'];
const [W, H] = (opt.tam || '390x844').split('x').map(Number);
const porta = 5371;
const fechar = await servir(porta);
const pasta = join(RAIZ, '.tmp/jogar');
mkdirSync(pasta, { recursive: true });
let ok = true;

/** Coordenadas de tela de um ponto do mundo. */
const tela = (c, x, y) => c.avaliar(`(() => { const cam = __slime.cena.camera; return [cam.sx + (${x} - cam.cx) * cam.s, cam.sy - (${y} - cam.cy) * cam.s]; })()`);
const estado = (c) => c.avaliar('__slime.J.estado');
const rect = (c, id) => c.avaliar(`(() => { const r = document.getElementById('${id}').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.width, r.height]; })()`);

for (const m of lista) {
  const c = await abrirChrome({ largura: W, altura: H });
  const falhas = [];
  try {
    await c.ir(`http://127.0.0.1:${porta}/index.html?modelo=${m}&semente=9&lang=pt`, 2500);
    if (!(await c.avaliar('!!(window.__slime && __slime.J.modo)'))) throw new Error('o jogo nao subiu');
    const q0 = await c.avaliar('__slime.J.t');
    // gestos do modelo
    if (['1', '2', '5'].includes(m)) {
      for (let k = 0; k < 6; k++) {
        const [x0, y0] = await tela(c, -3 + k * 1.2, 13);
        const [x1] = await tela(c, -3.5 + k * 1.4, 13);
        await c.arrastar(x0, y0 + 40, x1, y0 + 40, 6, 200);
        await espera(650);
      }
      await c.tecla('ArrowLeft', 300);
      await c.tecla('Space');
    } else if (m === '3') {
      const [bx, by] = await tela(c, 0, 10.2);
      await c.segurar(bx, by, 1500);
      const [cx, cy] = await tela(c, 0, 1.2);
      await espera(800);
      await c.arrastar(cx - 60, cy, cx + 60, cy, 12, 600);
      await c.arrastar(cx + 60, cy, cx - 60, cy - 10, 12, 600);
    } else if (m === '4') {
      const [bx, by] = await tela(c, 0, 10.3);
      await c.segurar(bx, by, 2500);
      const [cx, cy] = await tela(c, 0, 2);
      await c.arrastar(cx, cy + 120, cx - 60, cy + 120, 8, 500);
    } else {
      const [x, y] = await tela(c, -7, 5);
      await c.clicar(x, y);
    }
    await espera(800);
    const q1 = await c.avaliar('__slime.J.t');
    if (!(q1 > q0)) falhas.push('o laco parou');
    // pausa e volta (Esc)
    await c.tecla('Escape');
    await espera(200);
    if ((await estado(c)) !== 'pausa') falhas.push('Esc nao pausou');
    if (await c.avaliar('document.getElementById("menu").hidden')) falhas.push('menu de pausa nao abriu');
    const [bcx, bcy] = await rect(c, 'bContinuar');
    await c.clicar(bcx, bcy);
    await espera(200);
    if ((await estado(c)) !== 'jogando') falhas.push('Continuar nao voltou ao jogo');
    // mudo
    const [bpx, bpy] = await rect(c, 'bPausa');
    await c.clicar(bpx, bpy);
    await espera(150);
    const [bsx, bsy] = await rect(c, 'bSom');
    await c.clicar(bsx, bsy);
    if (!(await c.avaliar('document.body.classList.contains("mudo")'))) falhas.push('o botao de som nao mutou');
    await c.clicar(bsx, bsy);
    await c.tecla('Escape');
    await espera(150);
    // um reforco pelo HUD (o primeiro botao visivel)
    const temPoder = await c.avaliar('!!document.querySelector("#base .poder:not([hidden])")');
    if (temPoder) {
      const p = await c.avaliar('(() => { const r = document.querySelector("#base .poder:not([hidden])").getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()');
      await c.clicar(p[0], p[1]);
      await espera(400);
    }
    // fim de jogo, revive e jogar de novo (Merge Lab)
    if (m === '1') {
      await c.avaliar('(() => { const S = __slime.J.modo.S; S.tempo = 999; S.jogadores[0].pote.perigoT = 9; })()');
      await espera(600);
      if ((await estado(c)) !== 'fim' || (await c.avaliar('document.getElementById("fim").hidden'))) falhas.push('o fim nao apareceu');
      const [rx, ry] = await rect(c, 'bReviver');
      await c.clicar(rx, ry);
      await espera(3900);
      if ((await estado(c)) !== 'jogando') falhas.push('o revive nao voltou ao jogo: ' + (await estado(c)));
      await c.avaliar('(() => { const S = __slime.J.modo.S; S.tempo = 999; S.jogadores[0].pote.perigoT = 9; })()');
      await espera(600);
      const [dx, dy] = await rect(c, 'bDeNovo');
      await c.clicar(dx, dy);
      await espera(800);
      if ((await estado(c)) !== 'jogando') falhas.push('Jogar de novo nao reiniciou');
      if ((await c.avaliar('__slime.J.modo.hud().pontos')) !== 0) falhas.push('Jogar de novo nao zerou os pontos');
    }
    await espera(1500);
    const fps = await c.avaliar('__slime.laco.medidas.fps');
    writeFileSync(join(pasta, `${m}-${W}x${H}.png`), await c.print());
    if (c.erros.length) falhas.push('erros na pagina: ' + [...new Set(c.erros)].slice(0, 3).join(' | '));
    process.stdout.write(`${m.padEnd(4)} ${falhas.length ? 'FALHOU: ' + falhas.join('; ') : 'passou'}  (fps ${fps.toFixed(0)}, headless sem GPU)\n`);
  } catch (e) {
    falhas.push(String(e.message || e));
    process.stdout.write(`${m.padEnd(4)} FALHOU: ${falhas.join('; ')} ${c.erros.slice(0, 2).join(' | ')}\n`);
  }
  if (falhas.length) ok = false;
  await c.fechar();
}
await fechar();
process.exit(ok ? 0 : 1);

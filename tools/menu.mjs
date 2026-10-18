// Fluxo da build (sem ?modelo): sequencia diaria ao abrir, gotas no fim da partida, dobrar por
// video, loja (comprar e equipar), missoes, troca de modo pelo menu (Desafio, Duelo, 2P) e as skins
// (Loja > Skins, a Minha no editor de pixel).
// Jogo de verdade no Chrome headless com cliques pelo DevTools Protocol. Prints de cada aba
// em .tmp/menu/. Falha com excecao na pagina ou estado errado.
// Uso: node tools/menu.mjs [--tam=390x844] [--lang=pt]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { abrirChrome, espera } from './cdp.mjs';
import { RAIZ, servir } from './servir.mjs';

const opt = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const tamanhos = (opt.tam ? [opt.tam] : ['390x844', '836x470']).map((t) => t.split('x').map(Number));
const lang = opt.lang || 'pt';
const porta = 5372;
const fechar = await servir(porta);
const pasta = join(RAIZ, '.tmp/menu');
mkdirSync(pasta, { recursive: true });
let ok = true;

for (const [W, H] of tamanhos) {
  const c = await abrirChrome({ largura: W, altura: H });
  const falhas = [];
  const estado = () => c.avaliar('__slime.J.estado');
  /** clica no centro de um elemento (seletor CSS) */
  const clicar = async (sel) => {
    const r = await c.avaliar(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e || e.closest('[hidden]')) return null; e.scrollIntoView({ block: 'nearest' }); const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
    if (!r) { falhas.push(`nao achei ${sel}`); return false; }
    await c.clicar(r[0], r[1]);
    await espera(250);
    return true;
  };
  const foto = async (nome) => writeFileSync(join(pasta, `${nome}-${W}x${H}.png`), await c.print());
  try {
    // perfil limpo: primeiro dia
    await c.ir(`http://127.0.0.1:${porta}/index.html?semente=9&lang=${lang}&semanuncio`, 400);
    await c.avaliar('localStorage.clear()');
    await c.ir(`http://127.0.0.1:${porta}/index.html?semente=9&lang=${lang}&semanuncio`, 2600);
    if (!(await c.avaliar('!!(window.__slime && __slime.J.modo)'))) throw new Error('o jogo nao subiu');
    if ((await c.avaliar('__slime.J.chave')) !== 'semfim') falhas.push('a build nao abriu no sem fim');
    if ((await c.avaliar('__slime.perfil.gotas')) !== 20) falhas.push('a sequencia do dia 1 nao pagou 20 gotas');
    // o aviso da sequencia vem com o "Congratulations!" no primeiro gesto (o audio destrava nele)
    await c.clicar(Math.round(W / 2), Math.round(H * 0.4));
    await espera(900);
    if (await c.avaliar('document.getElementById("aviso").hidden')) falhas.push('o aviso da sequencia nao apareceu no primeiro toque');
    await foto('1-jogo');

    // o sem fim nao acaba (2.0.0): o transbordo depois dos 3 min e um "Ufa!" e o jogo segue
    await c.avaliar('(() => { const S = __slime.J.modo.S; S.tempo = 999; S.jogadores[0].pote.perigoT = 9; })()');
    await espera(500);
    if ((await estado()) !== 'jogando') falhas.push('o sem fim acabou no transbordo: ' + (await estado()));
    // fim com pontos (a tela de fim do desafio e do duelo; aqui com o resgate permanente desligado):
    // gotas pela raiz dos pontos, e o dobrar (video simulado de 3 s)
    const antes = await c.avaliar('__slime.perfil.gotas');
    await c.avaliar('(() => { const S = __slime.J.modo.S; S.R.resgatarSempre = () => false; S.jogadores[0].pontos = 10000; S.tempo = 999; S.jogadores[0].pote.perigoT = 9; })()');
    await espera(700);
    if ((await estado()) !== 'fim') falhas.push('o fim nao apareceu: ' + (await estado()));
    const ganho = await c.avaliar('document.getElementById("fimGotas").textContent');
    if (ganho !== '+90') falhas.push('gotas do fim: ' + ganho + ' (esperava +90)');
    await foto('2-fim');
    await clicar('#bDobrar');
    await espera(3600);
    if ((await c.avaliar('document.getElementById("fimGotas").textContent')) !== '+180') falhas.push('o dobrar nao dobrou');
    if (!(await c.avaliar('document.getElementById("bDobrar").hidden'))) falhas.push('o dobrar continuou visivel');
    // 180 da partida, mais a missao de pontos se ela caiu hoje
    const missaoPontos = await c.avaliar('__slime.perfil.missoes().filter((m) => m.tipo === "pontos" && m.meta <= 10000).reduce((a, m) => a + m.premio, 0)');
    const gotas = await c.avaliar('__slime.perfil.gotas');
    if (gotas !== antes + 180 + missaoPontos) falhas.push(`saldo depois do dobrar: ${gotas} (esperava ${antes + 180 + missaoPontos})`);

    // menu pelo fim: loja (compra o vime por 200 e ele vale na proxima partida)
    await clicar('#bMenuFim');
    if ((await estado()) !== 'menuFim') falhas.push('Menu do fim: estado ' + (await estado()));
    if (!(await c.avaliar('document.getElementById("bContinuar").hidden'))) falhas.push('Continuar visivel no menu do fim');
    await foto('3-menu-jogar');
    await clicar('.aba[data-aba="loja"]');
    await foto('4-loja');
    await clicar('#gradeLoja [data-item="vime"][data-acao="comprar"]');
    if ((await c.avaliar('__slime.perfil.equipado.cesto')) !== 'vime') falhas.push('a compra do vime nao equipou');
    if ((await c.avaliar('__slime.perfil.gotas')) !== gotas - 200) falhas.push('a compra nao descontou');
    await c.avaliar('__slime.perfil.ganhar(500)');
    await c.avaliar('__slime.abrirMenu("loja")');
    await clicar('.abaLoja[data-grupo="cenario"]');
    await clicar('#gradeLoja [data-item="mar"][data-acao="comprar"]');
    if ((await c.avaliar('__slime.cena.visual ? __slime.cena.visual.cenario : "?"')) === 'jardim') falhas.push('o cenario nao trocou na hora');
    await foto('5-loja-cenario');
    await clicar('.aba[data-aba="missoes"]');
    await foto('6-missoes');
    if ((await c.avaliar('document.querySelectorAll("#listaMissoes .missao").length')) !== 3) falhas.push('missoes do dia != 3');

    // Recomecar do menu do fim = jogar de novo, ja com o vime
    await clicar('.aba[data-aba="jogar"]');
    await clicar('#bRecomecar');
    await espera(600);
    if ((await estado()) !== 'jogando') falhas.push('Recomecar nao voltou ao jogo');
    if ((await c.avaliar('__slime.J.cesto')) !== 'vime') falhas.push('o cesto novo nao entrou na partida nova');

    // troca de modo: Desafio do dia, Duelo vs CPU, 2 jogadores, e de volta ao sem fim
    for (const chave of ['desafio', 'duelo', 'duelo2', 'semfim']) {
      await c.tecla('Escape');
      await espera(200);
      if ((await estado()) !== 'pausa') { falhas.push(`Esc nao pausou antes de ${chave}`); break; }
      await clicar(`#listaModos [data-modo="${chave}"]`);
      await espera(900);
      if ((await c.avaliar('__slime.J.chave')) !== chave) falhas.push(`o modo ${chave} nao entrou`);
      if ((await estado()) !== 'jogando') falhas.push(`${chave}: estado ${await estado()}`);
      await espera(500);
      await foto('7-' + chave);
    }

    // skins: Loja > Skins, compra uma pronta do nivel 1 (equipa e vale na hora), compra a Minha
    // (abre o editor), pinta, Enter salva, Esc fecha so o editor e Esc de novo volta ao jogo
    await c.avaliar('__slime.perfil.ganhar(400)');
    await c.tecla('Escape');
    await espera(200);
    await clicar('.aba[data-aba="loja"]');
    await clicar('.abaLoja[data-grupo="skins"]');
    await espera(400);
    await clicar('#gradeLoja [data-skin]:not([data-skin="minha"])[data-acao="comprar"]');
    const pronta = await c.avaliar('__slime.perfil.skins.equipado[1] || ""');
    if (!pronta) falhas.push('a compra da skin nao equipou');
    if ((await c.avaliar('__slime.J.modo.aparencias[1].id')) !== pronta) falhas.push('a skin comprada nao entrou na partida');
    await foto('8-skins');
    await clicar('#gradeLoja [data-skin="minha"][data-acao="comprar"]');
    await espera(500);
    if (await c.avaliar('document.getElementById("telaEditor").hidden')) falhas.push('a Minha comprada nao abriu o editor');
    const g = await c.avaliar('(() => { const r = document.querySelector(".edGrade").getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; })()');
    await c.arrastar(g[0] + g[2] * 0.25, g[1] + g[3] * 0.3, g[0] + g[2] * 0.75, g[1] + g[3] * 0.6, 8, 240);
    await foto('9-editor');
    await c.tecla('Enter');
    await espera(200);
    if (/^A+$/.test(await c.avaliar('__slime.perfil.skins.minhas[1].px'))) falhas.push('o editor nao salvou o desenho');
    await c.tecla('Escape');
    await espera(300);
    if (!(await c.avaliar('document.getElementById("telaEditor").hidden'))) falhas.push('Esc nao fechou o editor');
    if ((await estado()) !== 'pausa') falhas.push('o Esc do editor mexeu no jogo: ' + (await estado()));
    await c.tecla('Escape');
    await espera(300);
    if ((await estado()) !== 'jogando') falhas.push('depois do editor, Esc nao voltou ao jogo');
    if ((await c.avaliar('__slime.J.modo.aparencias[1].id')) !== 'minha') falhas.push('a Minha nao entrou na partida');
    // 2 jogadores no toque: o dedo do lado direito mira o pote direito
    if (c.erros.length) falhas.push('erros na pagina: ' + [...new Set(c.erros)].slice(0, 3).join(' | '));
    // missoes: progresso gravado
    const salvo = await c.avaliar('JSON.parse(localStorage.getItem("slime.perfil") || "{}").gotas');
    if (typeof salvo !== 'number') falhas.push('o perfil nao foi gravado');
    process.stdout.write(`${W}x${H} ${falhas.length ? 'FALHOU: ' + falhas.join('; ') : 'passou'}\n`);
  } catch (e) {
    falhas.push(String(e.message || e));
    process.stdout.write(`${W}x${H} FALHOU: ${falhas.join('; ')} ${c.erros.slice(0, 2).join(' | ')}\n`);
  }
  if (falhas.length) ok = false;
  await c.fechar();
}
await fechar();
process.exit(ok ? 0 : 1);

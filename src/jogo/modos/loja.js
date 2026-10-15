// Modelo 3: Loja de Slime (pedidos, ASMR).
// O cliente pede uma cor (em figura). Segurar um bico despeja goo daquela tinta no pote; as
// gotas se juntam numa massa so, que toma a forma do pote; arrastar dentro do pote SOVA
// (o cisalhamento mistura a tinta de verdade, com marmorizado); tocar cutuca. Entregar compara
// a cor medida com o pedido (OKLab): 3, 2 ou 1 estrela. A dica e uma gota pulando no bico da
// tinta que mais aproxima a cor (serve tambem para daltonicos). Ralo esvazia o pote.

import { criarMundo } from '../../fisica/mundo.js';
import { poteTrapezio } from '../../fisica/paredes.js';
import { material } from '../../fisica/materiais.js';
import { difundir, pigmentoMedio } from '../../cor/difusao.js';
import { misturar, deltaE, hexDaMistura, TINTAS } from '../../cor/km.js';
import { CORES, nomeDe } from '../cores.js';
import { gota, juntarGoo, desuniformidade } from '../goo.js';

const BICOS = [
  { x: -3.2, pig: TINTAS.ciano },
  { x: -1.6, pig: TINTAS.magenta },
  { x: 0, pig: TINTAS.amarelo },
  { x: 1.6, pig: TINTAS.branco },
  { x: 3.2, pig: TINTAS.preto },
];
const Y_BICO = 10.4;
const LINHA = 3.0; // volume minimo do pedido
const MAX_PART = 620;
const ORDEM = ['verde', 'laranja', 'violeta', 'rosa', 'ceu', 'limao', 'vermelho', 'turquesa', 'lavanda', 'coral', 'pessego',
  'marinho', 'menta', 'oliva', 'ameixa', 'mostarda', 'chocolate', 'vinho', 'petroleo', 'areia', 'esmeralda', 'ferrugem', 'pistache', 'lilas'];
const FAIXAS = [4, 9, 16]; // dE para 3, 2 e 1 estrela

/** @param {{ semente?: number, salvo?: any, toque?: boolean, lang?: string }} [o] */
export function criarModo(o = {}) {
  const salvo = o.salvo || {};
  const lang = o.lang || 'en';
  const goo = material('goo', { k: 0.0015, coesao: 0.03, xsph: 0.2, atritoS: 0.12, atritoK: 0.08 });
  /** @type {any[]} */
  const eventos = [];
  let estrelasTotal = salvo.estrelas || 0;
  let melhor = salvo.melhor || 0;
  let pedido = salvo.pedido || 0;
  /** @type {any} */
  let S = null;

  function nova() {
    const mundo = criarMundo({ semente: (o.semente || 1) + pedido });
    mundo.definirParedes(poteTrapezio({ topo: 9.4, fundo: 7.2, altura: 6.8 }));
    S = {
      mundo, tempo: 0, despejando: -1, tDespejo: 0, sovando: null, alvo: CORES.find((c) => c.id === ORDEM[pedido % ORDEM.length]) || CORES[5],
      dE: 99, dica: -1, uniforme: 1, resultado: null, tRes: 0, tMed: 0, cheio: false, sessao: 0,
    };
    eventos.push({ tipo: 'nivel', n: pedido + 1, acao: 'start' });
  }

  function massas() {
    return S.mundo.slimes.filter((s) => s.ativo && !s.preso);
  }

  function medir() {
    const m = S.mundo;
    const lista = massas().filter((s) => s.cy < 7.5);
    const media = [0, 0, 0, 0];
    let M = 0;
    let topo = -1;
    for (const s of lista) {
      const p = pigmentoMedio(m, s);
      for (let k = 0; k < 4; k++) media[k] += p[k] * s.n;
      M += s.n;
      if (s.topo > topo) topo = s.topo;
    }
    if (!M) { S.dE = 99; S.dica = -1; S.uniforme = 1; S.topo = -1; S.media = null; return; }
    for (let k = 0; k < 4; k++) media[k] /= M;
    S.media = media;
    S.topo = topo;
    const alvo = misturar(S.alvo.pig);
    S.dE = deltaE(misturar(media), alvo);
    // dica: a tinta que mais aproxima (simula 6% a mais de cada uma)
    let melhorK = -1;
    let melhorD = S.dE - 0.5;
    BICOS.forEach((b, k) => {
      const p = media.map((v, i) => v * 0.94 + 0.06 * b.pig[i]);
      const d = deltaE(misturar(p), alvo);
      if (d < melhorD) { melhorD = d; melhorK = k; }
    });
    S.dica = melhorK;
    const maior = lista.reduce((a, b) => (b.n > a.n ? b : a), lista[0]);
    S.uniforme = maior ? desuniformidade(m, maior) : 0;
  }

  function servir() {
    if (S.resultado) return;
    medir();
    if (S.topo < LINHA) {
      eventos.push({ tipo: 'texto', x: 0, y: LINHA + 1.2, texto: '↑', cor: '#ffd23a', escala: 1.6 });
      eventos.push({ tipo: 'som', nome: 'recusa' });
      return;
    }
    const est = S.dE <= FAIXAS[0] ? 3 : S.dE <= FAIXAS[1] ? 2 : S.dE <= FAIXAS[2] ? 1 : 0;
    S.resultado = { estrelas: est };
    S.tRes = 2.2;
    estrelasTotal += est;
    S.sessao += est;
    if (estrelasTotal > melhor) melhor = estrelasTotal;
    eventos.push({ tipo: 'texto', x: 0, y: 8.4, texto: est ? '★'.repeat(est) : '✗', cor: est ? '#ffd23a' : '#ff6f6f', escala: 2 });
    eventos.push({ tipo: 'texto', x: 0, y: 7, texto: nomeDe(S.alvo, lang), cor: hexDaMistura(S.alvo.pig), escala: 1 });
    eventos.push({ tipo: 'som', nome: est ? 'yes' : 'fim' });
    eventos.push({ tipo: 'nivel', n: pedido + 1, acao: est ? 'complete' : 'fail' });
    for (const s of massas()) if (!s.dados.gota) { s.dados.expr = est ? 'feliz' : 'medo'; s.dados.exprT = 2; }
  }

  function ralo() {
    for (const s of massas()) {
      eventos.push({ tipo: 'estouro', x: s.cx, y: s.cy, cor: hexDaMistura(pigmentoMedio(S.mundo, s)) });
      S.mundo.remover(s);
    }
    S.cheio = false;
  }

  nova();

  return {
    id: 'loja',
    get mundo() { return S.mundo; },
    janela: [-6.6, -0.9, 6.6, 12.2],
    campoJanela: [-6.8, -1.2, 6.8, 12],
    eventos,
    passo(dt) {
      const m = S.mundo;
      S.tempo += dt;
      if (S.resultado) {
        S.tRes -= dt;
        if (S.tRes <= 0) {
          pedido++;
          // a troca de pedido e uma pausa natural: o intervalo comercial pode vir aqui
          eventos.push({ tipo: 'intervalo' });
          nova();
          return;
        }
      }
      if (S.botSolta > 0) { S.botSolta -= dt; if (S.botSolta <= 0) S.despejando = -1; }
      if (S.despejando >= 0 && !S.resultado) {
        S.tDespejo -= dt;
        if (S.tDespejo <= 0) {
          if (m.n >= MAX_PART) {
            if (!S.cheio) { S.cheio = true; eventos.push({ tipo: 'som', nome: 'recusa' }); }
          } else {
            const b = BICOS[S.despejando];
            gota(m, b.x + (S.tempo * 7.3 % 1 - 0.5) * 0.3, Y_BICO - 0.9, b.pig, goo, 9);
            eventos.push({ tipo: 'som', nome: 'tique' });
          }
          S.tDespejo = 0.07;
        }
      }
      if (S.sovando) {
        const v = S.sovando;
        m.puxar(v.x, v.y, 1.4, v.vx, v.vy, 0.22);
        v.vx *= 0.8;
        v.vy *= 0.8;
      }
      // goo nao dorme na loja: duas massas paradas lado a lado precisam se juntar
      m.acordarTodos();
      m.avancar(4);
      m.medir(dt);
      juntarGoo(m);
      difundir(m, dt, { taxa: 1.2 });
      // o que caiu fora do pote some
      const fora = [];
      for (let i = 0; i < m.n; i++) if (m.y[i] < -3) fora.push(i);
      if (fora.length) m.removerParticulas(fora);
      for (const s of m.slimes) {
        if (s.ativo && s.dados.exprT > 0) { s.dados.exprT -= dt; if (s.dados.exprT <= 0) s.dados.expr = ''; }
      }
      S.tMed -= dt;
      if (S.tMed <= 0) { medir(); S.tMed = 0.2; }
    },
    apontar(x, y, fase) {
      if (S.resultado) return;
      if (fase === 'baixo') {
        const k = BICOS.findIndex((b) => Math.abs(x - b.x) < 0.78 && y > Y_BICO - 1.6);
        if (k >= 0) { S.despejando = k; S.tDespejo = 0; return; }
        if (y < 8) S.sovando = { x, y, vx: 0, vy: 0, x0: x, y0: y, t0: S.tempo };
        return;
      }
      if (fase === 'mover' && S.sovando) {
        const v = S.sovando;
        v.vx = Math.max(-25, Math.min(25, (x - v.x) * 60));
        v.vy = Math.max(-25, Math.min(25, (y - v.y) * 60));
        v.x = x;
        v.y = y;
        return;
      }
      if (fase === 'cima') {
        if (S.sovando) {
          const v = S.sovando;
          // toque curto sem arrastar: cutucar (empurrao para fora)
          if (Math.hypot(x - v.x0, y - v.y0) < 0.3 && S.tempo - v.t0 < 0.3) {
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) S.mundo.puxar(x + dx * 0.4, y + dy * 0.4, 0.9, dx * 10, dy * 10, 0.5);
            eventos.push({ tipo: 'pouso', x, y, forca: 1 });
          }
        }
        S.despejando = -1;
        S.sovando = null;
      }
    },
    tecla(codigo, baixo) {
      const k = /^Digit[1-5]$/.test(codigo) ? Number(codigo.slice(5)) - 1 : -1;
      if (k >= 0) { S.despejando = baixo ? k : (S.despejando === k ? -1 : S.despejando); S.tDespejo = 0; return; }
      if (!baixo) return;
      if (codigo === 'Enter' || codigo === 'Space') servir();
      else if (codigo === 'Backspace' || codigo === 'Delete') ralo();
    },
    poder(id) {
      if (id === 'servir') servir();
      else if (id === 'ralo') ralo();
    },
    bot() {
      if (S.resultado) return;
      if (S.topo >= LINHA + 0.5 && (S.dica < 0 || S.dE < FAIXAS[0])) { servir(); return; }
      // comeca pela tinta que mais pesa no pedido (o branco e o que sobra)
      const p = S.alvo.pig;
      const pesos = [p[0], p[1], p[2], 1 - p[0] - p[1] - p[2] - p[3], p[3]];
      const maior = pesos.indexOf(Math.max(...pesos));
      const k = S.topo < 1 ? maior : S.dica >= 0 ? S.dica : maior;
      S.despejando = k;
      S.tDespejo = 0;
      S.botSolta = 0.35;
    },
    hud() {
      const est = S.dE <= FAIXAS[0] ? 3 : S.dE <= FAIXAS[1] ? 2 : S.dE <= FAIXAS[2] ? 1 : 0;
      const atual = S.media ? hexDaMistura(S.media) : '#ffffff';
      const pct = Math.max(0, Math.min(1, 1 - S.dE / 30));
      return {
        pontos: '★ ' + estrelasTotal,
        recorde: '#' + (pedido + 1),
        metaHtml: `<div class="pedido"><i class="alvo" style="background:${hexDaMistura(S.alvo.pig)}"></i>`
          + `<span class="seta">→</span><i class="atual" style="background:${atual}"></i>`
          + `<div class="medidor"><b style="width:${(pct * 100).toFixed(0)}%"></b></div><span class="est">${'★'.repeat(est)}${'☆'.repeat(3 - est)}</span>`
          + `${S.uniforme > 0.12 && S.media ? '<span class="sovar">🌀</span>' : ''}</div>`,
        poderes: [{ id: 'servir', ativo: est === 3 && S.topo >= LINHA }, { id: 'ralo' }],
      };
    },
    visual() {
      return {
        bicos: BICOS.map((b, k) => ({ x: b.x, y: Y_BICO, cor: hexDaMistura(b.pig), ativo: S.despejando === k, dica: S.dica === k && !S.resultado })),
        linha: { y: LINHA, x0: -3.8, x1: 3.8, alerta: 0 },
        olhar: S.sovando ? [S.sovando.x, S.sovando.y] : null,
      };
    },
    reiniciar() { nova(); },
    salvar() { return { estrelas: estrelasTotal, melhor, pedido }; },
  };
}

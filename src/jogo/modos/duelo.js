// Modelo 5: Duelo de Slime (vs CPU; 2 jogadores no mesmo teclado: A/D/S contra setas/Enter).
// Dois potes. Cada fusao de nivel k >= 3 manda (k-1)/2 gosmas cinzentas para o rival. A gosma
// cinza nao funde com nada, mas ABSORVE pigmento das vizinhas coloridas (difusao entre slimes)
// e, quando pega cor suficiente, vira um slime do nivel 1 normal: a fisica de cor vira arma.
// Perde a rodada quem transbordar; melhor de 3.

import { criarSoltar } from '../soltar.js';
import { NIVEIS, particulasNivel, pontosNivel } from '../niveis.js';
import { pintarCinza, taxaCinza, passoCinza } from '../cinza.js';
import { colorir, transmutar, tabelaDaPartida, ligarAparencias } from './merge.js';

const PESOS = [34, 28, 22, 16];
const CPU = [
  { espera: 1.25, erro: 2.2 },
  { espera: 0.95, erro: 1.2 },
  { espera: 0.7, erro: 0.5 },
];

/**
 * @param {{ semente?: number, salvo?: any, toque?: boolean, lang?: string, liga?: number, doisJogadores?: boolean, cesto?: string,
 *   aparencias?: Array<any> }} [o]
 *   liga: 0..2, a forca da CPU (perfil); doisJogadores: os dois potes sao de gente desde o inicio;
 *   aparencias: skin de cada nivel (as do jogador valem para os dois potes, CPU inclusive).
 *   Sem nenhum dos dois (prototipo do hub), as setas ligam o 2o jogador e a CPU sobe com as vitorias.
 */
export function criarModo(o = {}) {
  const salvo = o.salvo || {};
  let vitorias = salvo.vitorias || 0;
  const placar = [0, 0];
  let rodada = 1;
  let doisJogadores = !!o.doisJogadores;
  const producao = o.liga !== undefined || o.doisJogadores !== undefined;
  const { AP, ap } = tabelaDaPartida(o.aparencias);
  /** @type {any} */
  let jogo = null;

  function criar(S, J, spec, x, y, preso) {
    const s = S.mundo.criarSlime({ x, y, n: particulasNivel(spec.nivel), material: 'gelatina', nivel: spec.nivel, preso });
    if (!s) return null;
    s.dados.pote = J.idx;
    if (spec.cinza) pintarCinza(S.mundo, s);
    else {
      s.dados.hex = ap(spec.nivel).hex;
      colorir(S.mundo, s, ap(spec.nivel));
    }
    return s;
  }

  jogo = criarSoltar({
    id: 'duelo',
    potes: [-6.2, 6.2],
    janela: [-12.4, -0.9, 12.4, 15.0],
    // o slime pousado na borda de fora do pote alargado passa da janela: o campo vai alem
    campoJanela: [-13.6, -1.2, 13.6, 15.2],
    sortear(S) {
      let x = S.rng() * 100;
      for (let k = 0; k < PESOS.length; k++) {
        if (x < PESOS[k]) return { nivel: k + 1 };
        x -= PESOS[k];
      }
      return { nivel: 1 };
    },
    criar,
    fusao(S, a, b) {
      if (a.dados.cinza || b.dados.cinza) return 0;
      if ((a.dados.pote || 0) !== (b.dados.pote || 0)) return 0;
      return a.nivel === b.nivel && a.nivel < NIVEIS.length ? a.nivel + 1 : 0;
    },
    // fusao animada como a do Merge (soltar.js FUSAO): 3 iguais juntos pulam um nivel, ate o 14,
    // que comemora e estoura (2026-10-18)
    animar: true,
    particulas: particulasNivel,
    nivelGrupo: (S, k, n) => Math.min(NIVEIS.length, n >= 3 ? k + 1 : k),
    maxNivel: NIVEIS.length,
    comemora: (S, k) => k >= NIVEIS.length,
    estourar(S, J, base, info) {
      const px = base.cx;
      const py = base.cy;
      S.mundo.remover(base);
      J.pontos += pontosNivel(NIVEIS.length) * 2 * info.n * info.combo;
      S.eventos.push({ tipo: 'estouro', x: px, y: py, cor: ap(NIVEIS.length).hex, corTela: '#ffc93a', grande: true });
      S.eventos.push({ tipo: 'texto', x: px, y: py + 1.5, texto: 'super', cor: '#ffd23a', escala: 1.6 });
      // o super slime manda uma chuva de gosma para o rival
      const R = S.jogadores[1 - J.idx];
      R.lixo = (R.lixo || 0) + 6;
      R.tLixo = 1.2;
      S.eventos.push({ tipo: 'texto', x: R.pote.cx, y: 13.6, texto: '+6 ☁', cor: '#b9b9c2', escala: 1 });
      S.eventos.push({ tipo: 'som', nome: 'ataque', pote: J.idx, qtd: 6 });
    },
    agrupa(S, F, c) {
      return F.membros.every((s) => S.R.fusao(S, s, c) === F.k);
    },
    juntar(S, J, base, k, px, py) {
      base.nivel = k;
      base.dados.expr = 'feliz';
      base.dados.exprT = 1.1;
      transmutar(S.mundo, base, ap(k), px, py);
    },
    concluir(S, J, base, k, px, py, combo, info) {
      base.dados.expr = 'feliz';
      base.dados.exprT = 0.6;
      J.pontos += (info.n >= 3 ? pontosNivel(k - 1) + pontosNivel(k) : pontosNivel(k)) * combo;
      if (k > J.maxNivel) J.maxNivel = k;
      S.eventos.push({ tipo: 'fusao', x: px, y: py, cor: ap(k).hex, combo, brilhos: Math.min(8, info.saidas / 3), grupo: info.n, pote: J.idx,
        texto: info.n >= 3 ? 'triplo' : '', corTexto: '#ff6fd8', escala: 1.4 });
      // ataque: gosma cinza para o rival
      const qtd = (k >= 3 ? Math.floor((k - 1) / 2) : 0) + (combo >= 3 ? 1 : 0);
      if (qtd > 0) {
        const R = S.jogadores[1 - J.idx];
        R.lixo = (R.lixo || 0) + qtd;
        R.tLixo = 1.2;
        S.eventos.push({ tipo: 'texto', x: R.pote.cx, y: 13.6, texto: '+' + qtd + ' ☁', cor: '#b9b9c2', escala: 1 });
        S.eventos.push({ tipo: 'som', nome: 'ataque', pote: J.idx, qtd });
      }
    },
    // a gosma cinza puxa o pigmento das vizinhas coloridas
    difusao: {
      entreSlimes(a, b) {
        return 0;
      },
    },
    passo(S, dt) {
      const m = S.mundo;
      if (S.extra.fimRodada > 0) {
        S.extra.fimRodada -= dt;
        if (S.extra.fimRodada <= 0) {
          rodada++;
          jogo.reiniciar();
        }
        return;
      }
      // CPU (e a troca para 2 jogadores)
      const P2 = S.jogadores[1];
      const forca = o.liga !== undefined ? o.liga : vitorias + rodada - 2;
      if (!doisJogadores && !P2.cpu) P2.cpu = { ...CPU[Math.min(2, Math.max(0, forca))], t: 1.5 };
      if (doisJogadores) P2.cpu = null;
      for (const J of S.jogadores) {
        // chuva de cinza
        if (J.lixo > 0) {
          J.tLixo -= dt;
          if (J.tLixo <= 0) {
            const x = J.pote.cx + (S.rng() - 0.5) * 6;
            const s = criar(S, J, { nivel: 1, cinza: true }, x, 12.5, false);
            if (s) { s.dados.solto = S.mundo.tempo; s.dados.pote = J.idx; }
            J.lixo--;
            J.tLixo = 0.25;
          }
        }
      }
      // cinza que pegou cor vira nivel 1 normal
      passoCinza(m, (s) => {
        s.nivel = 1;
        transmutar(m, s, ap(1), s.cx, s.cy);
        S.eventos.push({ tipo: 'som', nome: 'graduar' });
      });
    },
    transbordou(S, J) {
      // perde a rodada quem transbordar
      if (S.extra.fimRodada > 0) return true;
      J.perdeu = true;
      const V = S.jogadores[1 - J.idx];
      placar[V.idx]++;
      const texto = doisJogadores ? (V.idx === 0 ? 'vence1' : 'vence2') : V.idx === 0 ? 'vitoria' : 'derrota';
      S.eventos.push({ tipo: 'texto', x: V.pote.cx, y: 8, texto, cor: V.idx === 0 ? '#7fe36b' : '#ff6f6f', escala: 1.3 });
      if (placar[0] >= 2 || placar[1] >= 2) {
        const venceu = placar[0] >= 2;
        if (venceu) vitorias++;
        const titulo = doisJogadores ? (venceu ? 'vence1' : 'vence2') : venceu ? 'vitoria' : 'derrota';
        jogo.terminar(S.jogadores[0], { titulo, sub: `${placar[0]} - ${placar[1]}`, reviver: false, venceu, vsCpu: !doisJogadores });
        placar[0] = 0;
        placar[1] = 0;
        rodada = 1;
      } else {
        S.extra.fimRodada = 1.6;
      }
      return true;
    },
    // 2 jogadores: sem reforcos (os botoes e as teclas 1-5 seriam so do jogador 1)
    semReforcos: () => doisJogadores,
    pigDe: (S, spec) => ap(spec.nivel).pig,
    escalaDe: (spec) => 0.62 + spec.nivel * 0.08,
    hud(S) {
      const lixo = S.jogadores.map((J) => J.lixo || 0);
      const quem = doisJogadores ? ['P1', 'P2'] : ['P1', 'CPU'];
      return {
        metaHtml: `<div class="placarDuelo"><b class="p1">${quem[0]}</b><span>${placar[0]} – ${placar[1]}</span><b class="p2">${quem[1]}</b>`
          + `<small>${'☁'.repeat(Math.min(6, lixo[0]))}</small></div>`,
      };
    },
    salvarMeta: () => ({ vitorias }),
  }, o);

  ligarAparencias(jogo, AP, (s) => !!s.dados.cinza);

  // gosma cinza: troca de pigmento entre slimes diferentes so quando um deles e cinza
  jogo.S.R.difusao.entreSlimes = taxaCinza(() => jogo.S.mundo);

  const tecla = jogo.tecla;
  jogo.tecla = (codigo, baixo) => {
    // setas ou Enter no teclado ligam o segundo jogador humano
    if (baixo && !producao && !doisJogadores && !o.toque && ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'Enter'].includes(codigo)) {
      doisJogadores = true;
      jogo.S.jogadores[1].cpu = null;
      jogo.eventos.push({ tipo: 'texto', x: 6.2, y: 13, texto: '2P!', cor: '#ffd23a', escala: 1.3 });
    }
    tecla(codigo, baixo);
  };
  return jogo;
}

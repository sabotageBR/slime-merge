// Pote de soltar (Merge Lab, Croma e Duelo): mira, slime preso no alto, recarga, linha de
// perigo com graca, combo e os reforcos fisicos do pote (chacoalhar e alargar).
// Logica pura: sem DOM, sem relogio, sem Math.random (o tempo entra por dt).

import { polilinha } from '../fisica/paredes.js';
import { cesto as acharCesto } from './cestos.js';

/** Alargar: o cesto inteiro abre 14% na horizontal (vale para qualquer formato). */
const ALARGAR = 1.14;
const RECARGA = 0.5;
const GRACA = 2; // s acima da linha ate transbordar
const SO_DEPOIS = 1.4; // s depois de solto ate o slime contar para o perigo
const COMBO_JANELA = 1.6;
/** Guia invisivel da borda: aba de 1 u a 30 graus para fora e para cima no topo de cada parede. */
const GUIA = [0.87, 0.5];
/** Folga minima entre a guia e o meio entre dois potes (Duelo). */
const FOLGA_MEIO = 0.25;

/**
 * @param {{ mundo: any, cx?: number, cesto?: string, eventos: any[], indice?: number, faixa?: number[], largura?: number }} o
 *   faixa: [xmin, xmax] livre para este pote (no Duelo, ate o meio entre os potes)
 *   largura: fator da largura no comeco (o Merge Lab nasce estreito e `crescer` leva a 1)
 */
export function criarPote({ mundo, cx = 0, cesto = 'becher', eventos, indice = 0, faixa = [-Infinity, Infinity], largura = 1 }) {
  const C = acharCesto(cesto);
  const base = C.linhas.flatMap((l) => polilinha(l, 0.22));
  // a polilinha do cesto vai do topo esquerdo ao topo direito (as pontas da borda)
  const pts = C.linhas[0];
  const topos = [pts[0], pts[pts.length - 1]];
  // Alargar por lado, sem invadir a faixa do vizinho (Duelo): no pote sozinho, 14% dos dois lados
  let maxE = 0;
  let maxD = 0;
  for (const [x] of C.linhas.flat()) { if (-x > maxE) maxE = -x; if (x > maxD) maxD = x; }
  const fatorE = Math.max(1, Math.min(ALARGAR, (cx - faixa[0] - 0.35) / maxE));
  const fatorD = Math.max(1, Math.min(ALARGAR, (faixa[1] - cx - 0.35) / maxD));
  /** largura atual: o pote estreito do comeco cresce ate 1 (crescer) */
  let larg = Math.min(1, largura);
  /** x do mundo de um ponto do cesto (relativo ao centro), aberto ou nao pelo Alargar */
  const xDe = (x, aberto) => cx + x * larg * (aberto ? (x < 0 ? fatorE : fatorD) : 1);
  /** quanto a mira recua de cada borda: o que a guia perdeu no corte perto do vizinho */
  const recuo = [0, 0];
  /**
   * Guia invisivel no topo de uma parede: comeca na ponta da borda e sobe para fora; quem pousa
   * na borda escorrega por ela de volta para dentro. Cortada antes do meio entre dois potes;
   * sem espaco para ela, a mira nao chega ate a ponta (o slime nao fica em cima das duas bordas).
   */
  function guia(k, aberto) {
    const lado = k === 0 ? -1 : 1;
    const ax = xDe(topos[k][0], aberto);
    const ay = topos[k][1];
    const lim = lado < 0 ? faixa[0] + FOLGA_MEIO : faixa[1] - FOLGA_MEIO;
    const d = Math.max(0, Math.min(1, ((lim - ax) * lado) / GUIA[0]));
    recuo[k] = (1 - d) * GUIA[0];
    return { ax, ay, bx: ax + lado * GUIA[0] * d, by: ay + GUIA[1] * d, r: 0.22, oculta: true };
  }
  const idxParedes = [];
  const idxGuias = [];
  const caps = mundo.paredes.map((p) => ({ ax: p.ax, ay: p.ay, bx: p.bx, by: p.by, r: p.r, oculta: p.oculta }));
  for (const p of base) {
    idxParedes.push(caps.length);
    caps.push({ ax: xDe(p.ax, false), ay: p.ay, bx: xDe(p.bx, false), by: p.by, r: p.r });
  }
  for (const k of [0, 1]) {
    idxGuias.push(caps.length);
    caps.push(guia(k, false));
  }
  mundo.definirParedes(caps);

  const linha = C.linha;
  // a peca presa fica acima da borda e das guias (o contato nao age nela; na soltura, uma
  // guia dentro do slime o espetaria)
  const ySoltar = Math.max(linha + 2.3, Math.max(topos[0][1], topos[1][1]) + 2.0);
  const P = {
    indice,
    cx,
    cesto: C,
    idxParedes,
    idxGuias,
    linha,
    ySoltar,
    /** metade da largura da borda (linha de perigo) */
    meiaLinha: Math.max(maxE, maxD) * larg - 0.3,
    /** nasceu estreito e ainda nao cresceu (Merge Lab) */
    estreito: larg < 1,
    mira: cx,
    /** @type {any} */
    preso: null,
    recarga: 0,
    teclaEsq: false,
    teclaDir: false,
    perigoT: 0,
    alerta: 0,
    combo: 0,
    comboT: 0,
    alargado: false,
    chacoalhar: 0,
    tChac: 0,
  };

  /**
   * Limite da mira: o centro do slime vai ate o topo de cada parede (pode soltar em cima da
   * borda; a guia o devolve para dentro). Le as pontas atuais: acompanha o Alargar andando.
   */
  function limitarMira(x) {
    const ps = mundo.paredes;
    const e = ps[idxParedes[0]].ax + recuo[0];
    const d = ps[idxParedes[idxParedes.length - 1]].bx - recuo[1];
    return Math.max(e, Math.min(d, x));
  }

  return Object.assign(P, {
    /** O slime da vez fica preso no alto, seguindo a mira. @param {any} s */
    prender(s) {
      P.preso = s;
      if (s) {
        P.mira = limitarMira(P.mira);
        mundo.moverPreso(s, P.mira, ySoltar);
      }
    },
    /** @param {number} x */
    apontar(x) {
      P.mira = limitarMira(x);
      if (P.preso) mundo.moverPreso(P.preso, P.mira, ySoltar);
    },
    /**
     * Altura onde a linha guia termina sob x: o topo da parede (ou da borda) se x passa por
     * cima dela, senao o fundo.
     * @param {number} x
     */
    pousoEm(x) {
      let y = 0.2;
      for (const k of idxParedes) {
        const p = mundo.paredes[k];
        const x0 = Math.min(p.ax, p.bx) - p.r;
        const x1 = Math.max(p.ax, p.bx) + p.r;
        if (x < x0 || x > x1) continue;
        let yp;
        if (Math.abs(p.bx - p.ax) < 1e-6) yp = Math.max(p.ay, p.by);
        else {
          const t = Math.max(0, Math.min(1, (x - p.ax) / (p.bx - p.ax)));
          yp = p.ay + t * (p.by - p.ay);
        }
        if (yp + p.r > y && yp < ySoltar) y = yp + p.r;
      }
      return y;
    },
    /** Solta o slime preso. @returns {any} o slime solto (ou null) */
    soltar() {
      if (!P.preso || P.recarga > 0) return null;
      const s = P.preso;
      mundo.soltar(s, -2);
      s.dados.solto = mundo.tempo;
      P.preso = null;
      P.recarga = RECARGA;
      eventos.push({ tipo: 'gota', x: s.cx, y: s.cy, pote: indice, nivel: s.nivel });
      return s;
    },
    pronto() { return !P.preso && P.recarga <= 0; },
    /**
     * Um quadro: mira por teclado, recarga, chacoalhar, perigo e combo.
     * @param {number} dt
     * @returns {{ perdeu: boolean, culpado: any }}
     */
    passo(dt) {
      if (P.recarga > 0) P.recarga -= dt;
      if (P.teclaEsq || P.teclaDir) P.apontar(P.mira + (P.teclaDir ? 1 : -1) * 9 * dt);
      if (P.comboT > 0) { P.comboT -= dt; if (P.comboT <= 0) P.combo = 0; }
      // rede de seguranca: quem escapou do pote (nao deve acontecer) sai do mundo
      for (const s of mundo.slimes) {
        if (!s.ativo || s.preso || s.dados.pote !== indice) continue;
        if (s.cy < mundo.chaoY - 1.5) { eventos.push({ tipo: 'fora', pote: indice, x: s.cx, y: s.cy }); mundo.remover(s); }
      }
      // chacoalhar: onda quadrada na gravidade lateral (sem trigonometria)
      if (P.chacoalhar > 0) {
        P.chacoalhar -= dt;
        P.tChac += dt;
        const fase = ((P.tChac / 0.07) | 0) & 1;
        mundo.gx = P.chacoalhar > 0 ? (fase ? 28 : -28) : 0;
      }
      // perigo: o topo de um slime solto ha um tempo passou da linha
      let acima = null;
      for (const s of mundo.slimes) {
        if (!s.ativo || s.preso || s.dados.pote !== indice) continue;
        if (s.dados.solto !== undefined && mundo.tempo - s.dados.solto < SO_DEPOIS) continue;
        const marca = s.topo - 0.15;
        if (marca > linha) { acima = s; break; }
      }
      for (const s of mundo.slimes) {
        if (!s.ativo || s.dados.pote !== indice) continue;
        if (s.dados.expr === 'medo') s.dados.expr = '';
        if (acima && s.topo > linha - 1.5 && !s.preso) s.dados.expr = 'medo';
      }
      if (acima) P.perigoT += dt; else P.perigoT = Math.max(0, P.perigoT - dt * 2);
      P.alerta = Math.min(1, P.perigoT / GRACA);
      return { perdeu: P.perigoT >= GRACA, culpado: acima };
    },
    /** Registra uma fusao no combo; devolve o degrau do combo (1, 2, 3...). */
    fundiu() {
      P.combo = P.comboT > 0 ? P.combo + 1 : 1;
      P.comboT = COMBO_JANELA;
      return P.combo;
    },
    /** Reforco Chacoalhar: 0,8 s de sacudida. */
    sacudir() {
      P.chacoalhar = 0.8;
      P.tChac = 0;
      mundo.acordarTodos();
      for (const s of mundo.slimes) if (s.ativo && !s.preso && s.dados.pote === indice) s.dados.expr = 'tonto';
    },
    /** Reforco Alargar: o cesto abre 14% para os lados. */
    alargar() {
      if (P.alargado) return false;
      P.alargado = true;
      base.forEach((p, k) => {
        mundo.moverParede(idxParedes[k], { ax: xDe(p.ax, true), ay: p.ay, bx: xDe(p.bx, true), by: p.by }, 0.6);
      });
      // as guias andam junto (mesmo tempo: nao descolam da borda)
      idxGuias.forEach((i, k) => mundo.moverParede(i, guia(k, true), 0.6));
      return true;
    },
    /**
     * O pote estreito do comeco cresce ate a largura de sempre (mantendo o Alargar, se usado).
     * @param {number} [tempo] s da animacao (0 = na hora, ao restaurar a partida)
     */
    crescer(tempo = 0.9) {
      if (!P.estreito) return false;
      P.estreito = false;
      larg = 1;
      P.meiaLinha = Math.max(maxE, maxD) - 0.3;
      base.forEach((p, k) => {
        mundo.moverParede(idxParedes[k], { ax: xDe(p.ax, P.alargado), ay: p.ay, bx: xDe(p.bx, P.alargado), by: p.by }, tempo);
      });
      idxGuias.forEach((i, k) => mundo.moverParede(i, guia(k, P.alargado), tempo));
      return true;
    },
    /** Fim do chacoalhar: tira o tonto. */
    limparTonto() {
      if (P.chacoalhar > 0) return;
      for (const s of mundo.slimes) if (s.ativo && s.dados.expr === 'tonto') s.dados.expr = '';
    },
    reiniciarPerigo() { P.perigoT = 0; P.alerta = 0; },
  });
}

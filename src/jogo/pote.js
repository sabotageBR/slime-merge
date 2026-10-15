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

/**
 * @param {{ mundo: any, cx?: number, cesto?: string, eventos: any[], indice?: number }} o
 */
export function criarPote({ mundo, cx = 0, cesto = 'becher', eventos, indice = 0 }) {
  const C = acharCesto(cesto);
  const base = C.linhas.flatMap((l) => polilinha(l, 0.22));
  const idxParedes = [];
  const caps = mundo.paredes.map((p) => ({ ax: p.ax, ay: p.ay, bx: p.bx, by: p.by, r: p.r }));
  for (const p of base) {
    idxParedes.push(caps.length);
    caps.push({ ax: p.ax + cx, ay: p.ay, bx: p.bx + cx, by: p.by, r: p.r });
  }
  mundo.definirParedes(caps);

  const linha = C.linha;
  const ySoltar = linha + 2.3;
  const P = {
    indice,
    cx,
    cesto: C,
    idxParedes,
    linha,
    ySoltar,
    meiaFundo: C.meiaMira,
    /** metade da largura da borda (linha de perigo) */
    meiaLinha: Math.max(...C.linhas.flat().map((p) => Math.abs(p[0]))) - 0.3,
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
    /** talas pregadas pelo Alargar: pontos [x, y] da borda do cesto */
    madeira: /** @type {number[][]} */ ([]),
  };

  /**
   * Limite da mira para um slime de raio r: ele cabe inteiro na parte livre mais estreita do
   * cesto (o fundo do pote, a boca do aquario) e cai reto, sem raspar na parede.
   */
  function limitarMira(x, r) {
    const folga = Math.max(0, P.meiaFundo - r - 0.1);
    return Math.max(cx - folga, Math.min(cx + folga, x));
  }

  return Object.assign(P, {
    /** O slime da vez fica preso no alto, seguindo a mira. @param {any} s */
    prender(s) {
      P.preso = s;
      if (s) {
        P.mira = limitarMira(P.mira, s.raio0);
        mundo.moverPreso(s, P.mira, ySoltar);
      }
    },
    /** @param {number} x */
    apontar(x) {
      P.mira = limitarMira(x, P.preso ? P.preso.raio0 : 0.6);
      if (P.preso) mundo.moverPreso(P.preso, P.mira, ySoltar);
    },
    /** Solta o slime preso. @returns {any} o slime solto (ou null) */
    soltar() {
      if (!P.preso || P.recarga > 0) return null;
      const s = P.preso;
      mundo.soltar(s, -2);
      s.dados.solto = mundo.tempo;
      P.preso = null;
      P.recarga = RECARGA;
      eventos.push({ tipo: 'gota', x: s.cx, y: s.cy, pote: indice });
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
    /** Reforco Alargar: as paredes abrem para fora, com talas de madeira. */
    /** Reforco Alargar: o cesto abre 14% para os lados, com talas de madeira nas laterais. */
    alargar() {
      if (P.alargado) return false;
      P.alargado = true;
      base.forEach((p, k) => {
        mundo.moverParede(idxParedes[k], { ax: cx + p.ax * ALARGAR, ay: p.ay, bx: cx + p.bx * ALARGAR, by: p.by }, 0.6);
      });
      P.meiaFundo *= ALARGAR;
      // talas na altura marcada do cesto (ou a 60% da borda), nos dois lados
      const yt = (C.talas && C.talas[0]) || linha * 0.6;
      let xe = 0;
      let xd = 0;
      for (const p of base) {
        if ((p.ay - yt) * (p.by - yt) > 0 || p.ay === p.by) continue;
        const x = (p.ax + ((yt - p.ay) * (p.bx - p.ax)) / (p.by - p.ay)) * ALARGAR;
        if (x < xe) xe = x;
        if (x > xd) xd = x;
      }
      P.madeira = [[cx + xe, yt], [cx + xd, yt]];
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

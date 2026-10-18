// Pote de soltar (Merge Lab, Croma e Duelo): mira, slime preso no alto, recarga, linha de
// perigo com graca, combo, os reforcos fisicos do pote (chacoalhar e alargar) e o tremor do
// pote inteiro (terremoto).
// Logica pura: sem DOM, sem relogio, sem Math.random (o tempo entra por dt).

import { polilinha, ESPESSURA } from '../fisica/paredes.js';
import { R_PART } from '../fisica/mundo.js';
import { cesto as acharCesto } from './cestos.js';

/** Alargar: o cesto inteiro abre 14% na horizontal (vale para qualquer formato). */
const ALARGAR = 1.14;
const RECARGA = 0.5;
const GRACA = 2; // s acima da linha ate transbordar
const SO_DEPOIS = 1.4; // s depois de solto ate o slime contar para o perigo
export const COMBO_JANELA = 1.6;
/**
 * Tremor do pote inteiro (terremoto do sem fim): as paredes e as guias andam juntas, ate `ax` u
 * na horizontal a `hz` e `ay` u na vertical a `hzY`, com envelope que sobe em `sobe` s e desce
 * nos ultimos `desce` s. Pico de velocidade 4*ax*hz = 11,4 u/s (0,05 u por subpasso, contra
 * ~0,36 u de raio de particula + parede).
 */
export const TREMOR = Object.freeze({ ax: 0.38, ay: 0.12, hz: 7.5, hzY: 10, sobe: 0.25, desce: 0.5 });

/** Onda triangular de periodo 1 entre -1 e 1 (sem trigonometria: o jogo alimenta a fisica). @param {number} u */
function tri(u) {
  const f = u - Math.floor(u);
  return f < 0.25 ? 4 * f : f < 0.75 ? 2 - 4 * f : 4 * f - 4;
}
/** Guia invisivel da borda: aba de 1 u a 30 graus para fora e para cima no topo de cada parede. */
const GUIA = [0.87, 0.5];
/** Folga minima entre a guia e o meio entre dois potes (Duelo). */
const FOLGA_MEIO = 0.25;
/** Distancia do eixo da parede ao centro de uma particula encostada nela (por dentro). */
const ENCOSTA = ESPESSURA + R_PART;
/**
 * Rede de seguranca (2026-10-18, print do iPhone com um nivel 11 atravessado na parede): a parede e
 * uma capsula de dois lados, e a particula que passa do eixo dela fica do lado de fora para
 * sempre. Quem tem particulas fora do pote (abaixo da borda) por `REDE_T` s volta inteiro para dentro.
 */
export const REDE_T = 0.4;
/** Ate esta fracao do slime fora, so as particulas de fora voltam (o resto do corpo fica). */
const POUCAS = 0.15;

/** Distancia do ponto ao segmento. */
function distSeg(x, y, ax, ay, bx, by) {
  const ex = bx - ax;
  const ey = by - ay;
  const l2 = ex * ex + ey * ey;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / l2)) : 0;
  const dx = x - ax - t * ex;
  const dy = y - ay - t * ey;
  return Math.sqrt(dx * dx + dy * dy);
}

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
  /** capsulas da primeira polilinha (o contorno do pote, as primeiras de `base`) */
  const nContorno = pts.length - 1;
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
    /** terremoto: tempo do tremor em curso e a duracao dele (0 = parado) */
    tremorT: 0,
    tremorDur: 0,
    /** fusao em andamento neste pote: a janela do combo nao corre (a animacao nao quebra a cadeia) */
    segurarCombo: false,
    /** particulas que a rede de seguranca puxou de volta para dentro (testes e a cacada de tools/vazamento.mjs) */
    puxadas: 0,
  };

  /**
   * Limite da mira: o centro do slime vai ate o topo de cada parede (pode soltar em cima da
   * borda; a guia o devolve para dentro). Le as pontas atuais: acompanha o Alargar andando.
   */
  function limitarMira(x) {
    const ps = mundo.paredes;
    const r = P.preso ? P.preso.raio0 : 0;
    const e = ps[idxParedes[0]].ax + recuo[0] + folgaGrande(0, r);
    const d = ps[idxParedes[idxParedes.length - 1]].bx - recuo[1] - folgaGrande(1, r);
    return Math.max(e, Math.min(d, x));
  }

  /**
   * Quanto a mira recua da borda k para o slime de raio r nao nascer espetado na guia ou no topo
   * da parede (o 8 e o gigante 9 nasciam com particulas do lado de fora). O pequeno continua indo
   * ate o topo do vidro (escolha de 2026-10-15).
   * @param {number} k 0 esquerda, 1 direita @param {number} r
   */
  function folgaGrande(k, r) {
    if (r <= 0) return 0;
    const ps = mundo.paredes;
    const lado = k === 0 ? 1 : -1;
    const x0 = k === 0 ? ps[idxParedes[0]].ax + recuo[0] : ps[idxParedes[idxParedes.length - 1]].bx - recuo[1];
    // o tremor do terremoto anda com as paredes: a folga cobre o pico dele
    const D = r + ENCOSTA + 0.05 + (P.tremorDur > 0 ? TREMOR.ax : 0);
    const lista = [...idxParedes, ...idxGuias];
    for (let s = 0; s < 6; s += 0.05) {
      const X = x0 + lado * s;
      let ok = true;
      for (const i of lista) {
        const p = ps[i];
        if (distSeg(X, ySoltar, p.ax, p.ay, p.bx, p.by) < D) { ok = false; break; }
      }
      if (ok) return s;
    }
    return 6;
  }

  /**
   * Contorno do pote agora (eixo das paredes, com o tremor), do topo esquerdo ao topo direito.
   * @returns {number[]} [x0, y0, x1, y1, ...]
   */
  function contorno() {
    const ps = mundo.paredes;
    const pts = [];
    for (let k = 0; k < nContorno; k++) {
      const p = ps[idxParedes[k]];
      const tx = p.tx || 0;
      const ty = p.ty || 0;
      if (!k) pts.push(p.ax + tx, p.ay + ty);
      pts.push(p.bx + tx, p.by + ty);
    }
    return pts;
  }

  /**
   * Eixo das paredes na altura y: [x da esquerda, x da direita]. Acima de uma borda vale a ponta
   * dela; abaixo do fundo, null.
   * @param {number[]} pts contorno @param {number} y
   */
  function paredesEm(pts, y) {
    const u = pts.length - 2;
    const meio = (pts[0] + pts[u]) / 2;
    let e = -Infinity;
    let d = Infinity;
    for (let i = 0; i < u; i += 2) {
      const ay = pts[i + 1];
      const by = pts[i + 3];
      if (ay === by || y < Math.min(ay, by) || y > Math.max(ay, by)) continue;
      const xi = pts[i] + ((y - ay) * (pts[i + 2] - pts[i])) / (by - ay);
      if (xi < meio) { if (xi > e) e = xi; } else if (xi < d) d = xi;
    }
    if (e === -Infinity) { if (y < pts[1]) return null; e = pts[0]; }
    if (d === Infinity) { if (y < pts[u + 1]) return null; d = pts[u]; }
    return [e, d];
  }

  /**
   * Um lugar para um disco de raio r inteiro dentro do pote, o mais perto de (x, y): x preso entre
   * as paredes; sem espaco nessa altura, sobe.
   * @param {number} r @param {number} x @param {number} y
   * @returns {number[]} [x, y]
   */
  function lugar(r, x, y) {
    const pts = contorno();
    for (let k = 0; k < 120; k++, y += 0.1) {
      // o fundo do disco com a folga da parede tem que ficar acima do fundo
      if (!paredesEm(pts, y - r - ENCOSTA)) continue;
      let lo = -Infinity;
      let hi = Infinity;
      let ok = true;
      for (const f of [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1]) {
        const w = paredesEm(pts, y + f * r);
        if (!w) { ok = false; break; }
        const meia = r * Math.sqrt(1 - f * f);
        lo = Math.max(lo, w[0] + ENCOSTA + meia);
        hi = Math.min(hi, w[1] - ENCOSTA - meia);
      }
      if (ok && lo <= hi) return [Math.max(lo, Math.min(hi, x)), y];
    }
    return [P.cx, y];
  }

  /**
   * Prende os pontos [x0, y0, x1, y1, ...] do lado de dentro das paredes, encostados nelas (a
   * partida salva no meio de um tremor volta com o pote parado). Acima da borda, nada muda.
   * @param {number[]} lista (alterada no lugar)
   */
  function prenderPontos(lista) {
    const pts = contorno();
    const borda = Math.min(pts[1], pts[pts.length - 1]);
    for (let i = 0; i + 1 < lista.length; i += 2) {
      let y = lista[i + 1];
      if (y >= borda) continue;
      for (let k = 0; k < 60 && !paredesEm(pts, y - ENCOSTA); k++) y += 0.02;
      const w = paredesEm(pts, y);
      if (!w) continue;
      const e = w[0] + ENCOSTA;
      const d = w[1] - ENCOSTA;
      if (e < d) lista[i] = Math.max(e, Math.min(d, lista[i]));
      lista[i + 1] = y;
    }
    return lista;
  }

  /** O ponto esta entre as paredes (abaixo da borda) ou acima da boca do pote? */
  function contem(x, y) {
    const w = paredesEm(contorno(), y);
    return !!w && x > w[0] && x < w[1];
  }

  /**
   * As particulas do lado de fora do pote, abaixo da borda mais baixa (o que esta acima da boca, em
   * cima da pilha ou da borda, nao conta), por slime. Uma passada por todas: o miolo seguro de cada
   * faixa de 0,25 u decide a maioria; o teste exato so perto das paredes.
   * @param {number[]} pts contorno
   * @returns {Map<number, number[]>} indice do slime -> indices das particulas
   */
  function particulasFora(pts) {
    const out = new Map();
    const u = pts.length - 2;
    const meio = (pts[0] + pts[u]) / 2;
    const borda = Math.min(pts[1], pts[u + 1]);
    let fundo = Infinity;
    for (let i = 1; i < pts.length; i += 2) if (pts[i] < fundo) fundo = pts[i];
    const H = 0.25;
    const nf = Math.max(1, Math.ceil((borda - fundo) / H));
    const mioloE = new Float64Array(nf);
    const mioloD = new Float64Array(nf);
    for (let k = 0; k < nf; k++) {
      const y0 = fundo + k * H;
      const a = paredesEm(pts, y0);
      const b = paredesEm(pts, y0 + H);
      if (!a || !b) { mioloE[k] = Infinity; mioloD[k] = -Infinity; continue; }
      let e = Math.max(a[0], b[0]);
      let d = Math.min(a[1], b[1]);
      // um vertice dentro da faixa pode apertar o miolo (a aba do aquario)
      for (let i = 0; i <= u; i += 2) {
        if (pts[i + 1] <= y0 || pts[i + 1] >= y0 + H) continue;
        if (pts[i] < meio) e = Math.max(e, pts[i]); else d = Math.min(d, pts[i]);
      }
      mioloE[k] = e;
      mioloD[k] = d;
    }
    const { x, y, sl } = mundo;
    for (let i = 0, n = mundo.n; i < n; i++) {
      const yi = y[i];
      if (yi >= borda) continue;
      const k = Math.floor((yi - fundo) / H);
      if (k >= 0 && k < nf && x[i] > mioloE[k] && x[i] < mioloD[k]) continue;
      const w = paredesEm(pts, yi);
      if (w && x[i] >= w[0] && x[i] <= w[1]) continue;
      const lista = out.get(sl[i]);
      if (lista) lista.push(i); else out.set(sl[i], [i]);
    }
    return out;
  }

  /**
   * Rede de seguranca. Poucas particulas fora (a que escorregou por cima da borda ao soltar)
   * voltam na hora para a face de dentro da parede; um pedaco grande fora por REDE_T s (o slime
   * atravessado do print, ou o que caiu inteiro por fora) volta o slime inteiro, em disco, por
   * cima da pilha. A fusao, o alvo do missil e o preso ficam de fora: cada um acaba sozinho.
   * @param {number} dt
   */
  function rede(dt) {
    const pts = contorno();
    const fora = particulasFora(pts);
    for (const s of mundo.slimes) {
      if (!s.ativo || s.preso || s.dados.pote !== indice || s.dados.fundindo || s.dados.marcado) continue;
      const lista = fora.get(s.idx);
      if (!lista) { s.dados.foraT = 0; continue; }
      if (lista.length <= Math.max(3, POUCAS * s.n)) {
        const alvo = [];
        for (const i of lista) alvo.push(mundo.x[i], mundo.y[i]);
        mundo.reposicionar(lista, prenderPontos(alvo));
        P.puxadas += lista.length;
        s.dados.foraT = 0;
        continue;
      }
      s.dados.foraT = (s.dados.foraT || 0) + dt;
      if (s.dados.foraT < REDE_T) continue;
      s.dados.foraT = 0;
      const r = s.raio0;
      // em cima de quem esta embaixo dele (dentro do pote), na coluna mais perto
      const [x0] = lugar(r, s.cx, linha);
      let topo = mundo.chaoY;
      for (const o of mundo.slimes) {
        if (!o.ativo || o === s || o.preso || o.dados.pote !== indice) continue;
        if (o.dir > x0 - r && o.esq < x0 + r && o.topo > topo) topo = o.topo;
      }
      const [x1, y1] = lugar(r, x0, topo + r + 0.2);
      mundo.recolocar(s, x1, y1);
      s.dados.solto = mundo.tempo;
      s.dados.pousou = false;
      s.dados.caindo = false;
      s.dados.queda = 0;
      eventos.push({ tipo: 'volta', pote: indice, x: x1, y: y1, cor: s.dados.hex, nivel: s.nivel });
    }
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
      if (P.comboT > 0 && !P.segurarCombo) { P.comboT -= dt; if (P.comboT <= 0) P.combo = 0; }
      // rede de seguranca: quem ficou espetado na parede ou caiu por fora volta para dentro
      rede(dt);
      // chacoalhar: onda quadrada na gravidade lateral (sem trigonometria)
      if (P.chacoalhar > 0) {
        P.chacoalhar -= dt;
        P.tChac += dt;
        const fase = ((P.tChac / 0.07) | 0) & 1;
        mundo.gx = P.chacoalhar > 0 ? (fase ? 28 : -28) : 0;
      }
      // terremoto: as paredes vao ate o deslocamento do fim deste quadro (a fisica anda no proximo)
      if (P.tremorDur > 0) {
        P.tremorT += dt;
        const t = P.tremorT;
        const T = TREMOR;
        const e = Math.max(0, Math.min(1, t / T.sobe, (P.tremorDur - t) / T.desce));
        const ox = t >= P.tremorDur ? 0 : T.ax * e * tri(t * T.hz);
        const oy = t >= P.tremorDur ? 0 : T.ay * e * tri(t * T.hzY + 0.25);
        mundo.tremerParedes([...idxParedes, ...idxGuias], ox, oy, dt);
        if (t >= P.tremorDur) { P.tremorDur = 0; P.tremorT = 0; }
      }
      // perigo: o topo de um slime solto ha um tempo passou da linha
      let acima = null;
      for (const s of mundo.slimes) {
        if (!s.ativo || s.preso || s.dados.pote !== indice) continue;
        if (s.dados.solto !== undefined && mundo.tempo - s.dados.solto < SO_DEPOIS) continue;
        // a fusao em andamento passa da linha por um instante (os membros se abracam)
        if (s.dados.fundindo) continue;
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
    /**
     * Terremoto: o pote inteiro treme por `dur` s (o cesto, desenhado das paredes, treme junto).
     * @param {number} dur
     */
    tremer(dur) {
      P.tremorDur = dur;
      P.tremorT = 0;
      mundo.acordarTodos();
      for (const s of mundo.slimes) if (s.ativo && !s.preso && s.dados.pote === indice) s.dados.expr = 'tonto';
      eventos.push({ tipo: 'tremor', pote: indice, dur });
    },
    /** Deslocamento do tremor agora (u), ou null parado. */
    tremor() {
      const p = mundo.paredes[idxParedes[0]];
      return p && (P.tremorDur > 0 || p.tx || p.ty) ? { x: p.tx, y: p.ty } : null;
    },
    /**
     * Reforco Alargar: o cesto abre 14% para os lados.
     * @param {number} [tempo] s da animacao (0 = na hora, ao restaurar a partida)
     */
    alargar(tempo = 0.6) {
      if (P.alargado) return false;
      P.alargado = true;
      base.forEach((p, k) => {
        mundo.moverParede(idxParedes[k], { ax: xDe(p.ax, true), ay: p.ay, bx: xDe(p.bx, true), by: p.by }, tempo);
      });
      // as guias andam junto (mesmo tempo: nao descolam da borda)
      idxGuias.forEach((i, k) => mundo.moverParede(i, guia(k, true), tempo));
      return true;
    },
    lugar,
    contem,
    prenderPontos,
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
    /** Fim do chacoalhar e do tremor: tira o tonto. */
    limparTonto() {
      if (P.chacoalhar > 0 || P.tremorDur > 0) return;
      for (const s of mundo.slimes) if (s.ativo && s.dados.expr === 'tonto') s.dados.expr = '';
    },
    reiniciarPerigo() { P.perigoT = 0; P.alerta = 0; },
  });
}

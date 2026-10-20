// Corrida na Janela (ideia #52, prototipo: so por ?modelo=janela, sai da build).
// Dia de chuva: o slime escorre pelo vidro da janela numa corrida de ~30 s contra 3 rivais com
// rosto. Arrastar para o lado (ou setas, A/D) escolhe o caminho. Engolir gotas deixa o slime
// pesado e rapido, mas grande demais ele espreme entre os adesivos; pontos secos freiam e o rastro
// molhado de quem vai na frente da vacuo. Os corredores nao fundem: trombam. Campeonato de 3
// corridas (10/6/3/1 pontos), cada uma com outro desenho de pista pela semente.
// A camera desce com o jogador: o campo do render fica parado numa janela local (campoJanela) e o
// campoMovel desloca o mundo antes de acumular (src/render/prototipos/campo-movel.js).

import { criarMundo } from '../../fisica/mundo.js';
import { polilinha } from '../../fisica/paredes.js';
import { material } from '../../fisica/materiais.js';
import { difundir, pintar, pigmentoMedio } from '../../cor/difusao.js';
import { hexDaMistura } from '../../cor/km.js';
import { criarRng } from '../../core/rng.js';
import { sentir, careta, PANCADA } from '../humor.js';
import { criarCampoMovel } from '../../render/prototipos/campo-movel.js';
import { cenario, fundo, topo } from '../../render/prototipos/janela.js';

/** Geometria do vidro (u): meia largura util, eixo das paredes da moldura, travessa e peitoril. */
export const PISTA = Object.freeze({
  xv: 7,
  moldura: 7.3,
  rMoldura: 0.3,
  topo: 4.2,
  largada: 0,
  chegada: -130,
  peitoril: -141.5,
});
/** Janela da camera (meia largura e meia altura, u) e o campo local, fixo (o render nao recria). */
const MEIA_W = 8.2;
const MEIA_H = 13;
const CAMPO = Object.freeze([-8.8, -MEIA_H - 2, 8.8, MEIA_H + 2]);
const LIMITES = [-9.5, PISTA.peitoril - 8, 9.5, PISTA.topo + 6];

/**
 * Descida: velocidade-limite pelo atrito do vidro, maior quanto mais particulas.
 *   n0 particulas de cada corredor na largada; v0 u/s de quem tem n0; tam: ganho por (n-n0)/n0;
 *   vmax: teto; seco: fator no ponto seco; vacuo: fator no rastro molhado de outro;
 *   ky, kx: fracao da diferenca de velocidade puxada por quadro; g: gravidade baixa (u/s2)
 */
export const DESCIDA = Object.freeze({ n0: 56, v0: 4.3, tam: 0.5, vmax: 7.6, seco: 0.42, vacuo: 1.18, ky: 0.1, kx: 0.14, g: 4, vLado: 6.5 });
/**
 * Forma de gota escorrendo (o corpo em pe, cabeca larga embaixo, cauda fina em cima, e a cabeca
 * puxando para o lado do arrasto). A forma de repouso do slime e puxada para ela no referencial
 * dele (`al` por quadro) e cada particula e puxada para ela no mundo (`g`, 1/s2: trava o giro, o
 * slime no vidro nao rola).
 *   alto: quanto estica na vertical na velocidade-limite; ponta: afina a cauda; cisalha: a cabeca
 *   vai para o lado do movimento
 */
export const FORMA = Object.freeze({ alto: 0.18, ponta: 0.12, cisalha: 0.4, al: 0.05, g: 40 });
/** Pontos do campeonato por lugar, corridas e segundos da contagem. */
export const PONTOS = Object.freeze([10, 6, 3, 1]);
export const CORRIDAS = 3;
const CONTA = 3;
/** s de rastro molhado que ainda conta (e aparece) */
const RASTRO_T = 6;
/** s entre dois pontos do rastro */
const RASTRO_PASSO = 0.07;

const AGUA = [0.1, 0.015, 0, 0];
/** Gotas coloridas: tinta forte o bastante para a cor do corredor mudar (KM), fraca o bastante para ele continuar reconhecivel. */
const COLORIDAS = [
  { pig: [0, 0.55, 0, 0] },
  { pig: [0, 0, 0.7, 0] },
  { pig: [0.4, 0, 0, 0] },
  { pig: [0.3, 0.4, 0, 0] },
];

/**
 * Os 4 corredores: voce e 3 rivais com personalidade.
 *   gula: peso das gotas; cautela: medo de adesivo e ponto seco; trombar: vontade de empurrar;
 *   reacao: s entre decisoes; largada: fator de velocidade (acima de 1,08 so nos primeiros T_LARGADA s, e
 *   depois 2 - f: o rapido no comeco que cansa)
 */
export const CORREDORES = Object.freeze([
  { nome: 'Você', pig: [0.2, 0, 0.8, 0], perfil: { gula: 0.9, cautela: 1, trombar: 0.5, reacao: 0.12, largada: 1 } },
  { nome: 'Bolota', pig: [0, 0.1, 0.8, 0], perfil: { gula: 2.6, cautela: 0.45, trombar: 0.35, reacao: 0.16, largada: 1.06 } },
  { nome: 'Dona Calma', pig: [0.45, 0.45, 0, 0], perfil: { gula: 0.7, cautela: 2.2, trombar: 0, reacao: 0.26, largada: 0.98 } },
  { nome: 'Faísca', pig: [0, 0, 0.7, 0], perfil: { gula: 0.55, cautela: 0.9, trombar: 0.75, reacao: 0.1, largada: 1.13 } },
]);
const T_LARGADA = 7;
/** Acima disso o corredor nao engole mais (a gota passa por ele). */
const N_MAX = 150;

/** Formas dos adesivos (contorno fechado, raio ~1, y para cima). */
const FORMAS = {
  estrela: Array.from({ length: 10 }, (_, k) => {
    const a = Math.PI / 2 + (k * Math.PI) / 5;
    const r = k % 2 ? 0.5 : 1;
    return [Math.cos(a) * r, Math.sin(a) * r - 0.08];
  }),
  coracao: Array.from({ length: 18 }, (_, k) => {
    const t = (k / 18) * Math.PI * 2;
    const s = Math.sin(t);
    return [(16 * s * s * s) / 16.5, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16.5 + 0.14];
  }),
  flor: Array.from({ length: 20 }, (_, k) => {
    const a = (k / 20) * Math.PI * 2 + Math.PI / 2;
    const r = 0.76 + 0.24 * Math.cos(5 * (a - Math.PI / 2));
    return [Math.cos(a) * r, Math.sin(a) * r];
  }),
  patinho: [[-1, 0.18], [-0.84, -0.12], [-0.72, -0.44], [-0.36, -0.68], [0.14, -0.7], [0.58, -0.52], [0.8, -0.22], [0.76, 0.04],
    [0.6, 0.18], [0.96, 0.3], [0.99, 0.42], [0.72, 0.5], [0.62, 0.72], [0.4, 0.78], [0.2, 0.64], [0.14, 0.38], [0, 0.1],
    [-0.4, 0.05], [-0.76, 0.12]],
};
const TIPOS = ['estrela', 'coracao', 'patinho', 'flor'];
const CORES_ADESIVO = { estrela: '#ffcf3a', coracao: '#ff5d8f', patinho: '#ffe14d', flor: '#8f7bff' };

const lim = (v, a, b) => (v < a ? a : v > b ? b : v);

/**
 * Pista de uma corrida: adesivos (contorno, caixa), pontos secos (elipses) e gotas.
 * @param {() => number} rng
 */
export function gerarPista(rng) {
  /** @type {any[]} */
  const adesivos = [];
  /** @type {{ x: number, y: number, rx: number, ry: number }[]} */
  const secos = [];
  /** @type {{ x: number, y: number, n: number, pig: number[], colorida: boolean }[]} */
  const gotas = [];
  const xv = PISTA.xv;
  let tipoK = Math.floor(rng() * 4);

  function adesivo(x, y, r, rot = 0) {
    const tipo = TIPOS[tipoK++ % TIPOS.length];
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    const espelho = tipo === 'patinho' && x > 0 ? -1 : 1;
    const pts = FORMAS[tipo].map(([px, py]) => [x + (px * espelho * c - py * s) * r, y + (px * espelho * s + py * c) * r]);
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const [px, py] of pts) {
      x0 = Math.min(x0, px); x1 = Math.max(x1, px);
      y0 = Math.min(y0, py); y1 = Math.max(y1, py);
    }
    const a = { tipo, x, y, r, rot, espelho, pts, cor: CORES_ADESIVO[tipo], caixa: [x0 - 0.14, y0 - 0.14, x1 + 0.14, y1 + 0.14] };
    adesivos.push(a);
    return a;
  }
  function gota(x, y, colorida = false) {
    const c = COLORIDAS[Math.floor(rng() * COLORIDAS.length)];
    gotas.push({ x, y, n: colorida ? 10 : 6 + Math.floor(rng() * 3), pig: colorida ? c.pig : AGUA, colorida });
  }

  let y = -8.5;
  const fim = PISTA.chegada + 8;
  let ultimo = '';
  while (y > fim) {
    const sorteio = rng();
    let tipo = sorteio < 0.3 ? 'par' : sorteio < 0.55 ? 'solo' : sorteio < 0.78 ? 'trio' : 'zigue';
    if (tipo === ultimo && tipo !== 'solo') tipo = 'solo';
    // perto da chegada so cabe um adesivo sozinho (a fita fica livre)
    if (y - 14 < PISTA.chegada + 3) tipo = 'solo';
    ultimo = tipo;
    if (tipo === 'par') {
      // dois adesivos com uma passagem estreita no meio (atalho de quem esta pequeno), gotas no
      // atalho e um ponto seco num dos lados de fora
      const r = 1.1 + rng() * 0.15;
      const gap = 1.8 + rng() * 0.3;
      const gx = (rng() - 0.5) * 1.4;
      const yc = y - r;
      adesivo(gx - gap / 2 - r * 0.95, yc, r, (rng() - 0.5) * 0.4);
      adesivo(gx + gap / 2 + r * 0.95, yc, r, (rng() - 0.5) * 0.4);
      gota(gx, yc + r + 1.4);
      gota(gx + (rng() - 0.5) * 0.4, yc - r - 1.3, rng() < 0.5);
      const lado = rng() < 0.5 ? -1 : 1;
      const ex = gx + lado * (gap / 2 + 2 * r * 0.95);
      const sx = (ex + lado * xv) / 2;
      secos.push({ x: sx, y: yc - 0.5, rx: Math.abs(lado * xv - ex) / 2 + 0.3, ry: 2.6 + rng() * 1.2 });
      y = yc - r - 6 - rng() * 3;
    } else if (tipo === 'trio') {
      // tres adesivos (os dos lados encostados na moldura): duas passagens de ~3 u, cada uma com
      // uma gota depois
      const rl = 1.6 + rng() * 0.2;
      const rc = 1.2 + rng() * 0.2;
      const xc = (rng() - 0.5) * 0.8;
      const yc = y - rl;
      adesivo(-(xv - rl * 0.6), yc, rl, (rng() - 0.5) * 0.4);
      adesivo(xc, yc + 0.3, rc, (rng() - 0.5) * 0.5);
      adesivo(xv - rl * 0.6, yc, rl, (rng() - 0.5) * 0.4);
      const meio = (xv - rl * 1.6 + rc + Math.abs(xc)) / 2;
      gota(-meio, yc - rl - 1.2, rng() < 0.3);
      gota(meio, yc - rl - 1.2, rng() < 0.3);
      y = yc - rl - 6.5 - rng() * 3;
    } else if (tipo === 'zigue') {
      // um encostado numa moldura e outro mais abaixo, encostado na outra
      const lado = rng() < 0.5 ? -1 : 1;
      const r = 1.5 + rng() * 0.3;
      adesivo(lado * (xv - r * 0.7), y - r, r, (rng() - 0.5) * 0.4);
      gota(-lado * 2.5, y - 0.5);
      const y2 = y - r * 2 - 4.5;
      adesivo(-lado * (xv - r * 0.7), y2 - r, r, (rng() - 0.5) * 0.4);
      gota(lado * 2.2, y2 - r, rng() < 0.4);
      secos.push({ x: lado * 1.2, y: y2 + 1.2, rx: 1.6, ry: 2.2 });
      y = y2 - 2 * r - 6 - rng() * 2.5;
    } else {
      // um adesivo grande no meio (ou quase)
      const r = 1.35 + rng() * 0.35;
      const x = (rng() - 0.5) * 3.2;
      adesivo(x, y - r, r, (rng() - 0.5) * 0.6);
      gota(x + (rng() < 0.5 ? -1 : 1) * (r + 1.4), y - r * 2 - 0.6, rng() < 0.35);
      if (rng() < 0.6) secos.push({ x: x + (rng() < 0.5 ? -1 : 1) * 3.6, y: y - r * 2 - 3, rx: 1.8 + rng(), ry: 2.4 + rng() });
      y = y - 2 * r - 6 - rng() * 3;
    }
  }
  // gotas soltas pelo vidro, longe dos adesivos e umas das outras
  const livre = (x, yy, folga) => !adesivos.some((a) => x > a.caixa[0] - folga && x < a.caixa[2] + folga && yy > a.caixa[1] - folga && yy < a.caixa[3] + folga)
    && !gotas.some((g) => (g.x - x) * (g.x - x) + (g.y - yy) * (g.y - yy) < 1.6 * 1.6);
  for (const g of gotas.slice()) if (!livre(g.x, g.y, 0.5)) gotas.splice(gotas.indexOf(g), 1);
  for (let k = 0, tentou = 0; k < 30 && tentou < 400; tentou++) {
    const x = (rng() - 0.5) * 2 * (xv - 0.8);
    const yy = -5 - rng() * (-PISTA.chegada - 9);
    if (!livre(x, yy, 0.6)) continue;
    gota(x, yy, rng() < 0.2);
    k++;
  }
  return { adesivos, secos, gotas };
}

/**
 * @param {{ semente?: number, salvo?: any, toque?: boolean, lang?: string }} [o]
 */
export function criarModo(o = {}) {
  const semente = o.semente || 1;
  const salvo = o.salvo || {};
  /** @type {any[]} */
  const eventos = [];
  const gel = material('gelatina', { atritoS: 0.22, atritoK: 0.14 });
  const movel = criarCampoMovel();
  const rngIa = criarRng(semente * 13 + 5);
  let melhor = salvo.melhor || 0;
  let titulos = salvo.titulos || 0;
  let camY = PISTA.topo + 1 - MEIA_H;
  /** @type {any} */
  let S = null;
  /** campeonato */
  let corrida = 0;
  let totais = [0, 0, 0, 0];
  /** ja arrastou alguma vez (some a mao) */
  let arrastou = false;
  const teclas = { esq: false, dir: false };
  let tocando = false;

  function novaCorrida() {
    const sem = (Math.imul(semente, 7919) + corrida * 104729 + 17) >>> 0;
    const rng = criarRng(sem);
    const m = criarMundo({ semente: sem || 1, limites: LIMITES, config: { kAltura: 0 } });
    m.gy = 0;
    const pista = gerarPista(rng);
    const P = PISTA;
    const paredes = [
      { ax: -P.moldura, ay: P.topo, bx: -P.moldura, by: P.peitoril, r: P.rMoldura, oculta: true },
      { ax: P.moldura, ay: P.topo, bx: P.moldura, by: P.peitoril, r: P.rMoldura, oculta: true },
      { ax: -P.moldura, ay: P.peitoril, bx: P.moldura, by: P.peitoril, r: P.rMoldura, oculta: true },
      { ax: -P.moldura, ay: P.topo, bx: P.moldura, by: P.topo, r: P.rMoldura, oculta: true },
    ];
    for (const a of pista.adesivos) for (const p of polilinha(a.pts, 0.14, true)) paredes.push({ ...p, oculta: true });
    m.definirParedes(paredes);
    // largada: a ordem das raias muda a cada corrida
    const raias = [-4.8, -1.6, 1.6, 4.8];
    const ordem = [0, 1, 2, 3];
    for (let k = 3; k > 0; k--) {
      const j = Math.floor(rng() * (k + 1));
      [ordem[k], ordem[j]] = [ordem[j], ordem[k]];
    }
    const corredores = CORREDORES.map((d, k) => {
      const s = m.criarSlime({ x: raias[ordem[k]], y: P.largada, n: DESCIDA.n0, material: gel, pigmento: d.pig, nivel: 3 });
      s.dados.hex = hexDaMistura(d.pig);
      s.dados.expr = 'bravo';
      s.dados.exprT = CONTA + 0.4;
      return {
        k, eu: k === 0, nome: d.nome, perfil: d.perfil, s, alvoX: raias[ordem[k]], tDecide: 0, chegou: false, lugar: 0, tempo: 0,
        comeu: 0, rastro: [], tRastro: 0, tPreso: 0, tJan: 0, yJan: P.largada, noSeco: false, vacuo: false, tCor: 0,
        escape: 0, escapeX: 0, yEscape: 0, escapes: 0, evitar: null,
      };
    });
    const gotas = pista.gotas.map((g) => {
      const s = m.criarSlime({ x: g.x, y: g.y, n: g.n, material: gel, pigmento: g.pig, preso: true });
      s.dados.semRosto = true;
      s.dados.gota = true;
      s.dados.hex = hexDaMistura(g.pig);
      return { ...g, s };
    });
    S = {
      m, pista, corredores, gotas, fase: 'conta', t: 0, tFase: 0, tCorrida: 0, chegaram: 0, tResumo: 0, contaFeita: 3,
      lugarAntes: 0, tLugar: 0, tromba: new Map(), resumo: null,
    };
    camY = PISTA.topo + 1 - MEIA_H;
    tocando = false;
    eventos.push({ tipo: 'nivel', n: corrida + 1, acao: 'start' });
  }

  const jog = () => S.corredores[0];

  /** Velocidade-limite de agora (u/s, para baixo). @param {any} c */
  function vLimite(c) {
    const s = c.s;
    const D = DESCIDA;
    if (S.fase === 'conta') return 0;
    // depois da chegada continua descendo (abre espaco) ate o peitoril
    if (c.chegou) return 2.2;
    // escapando de cima de um adesivo: sobe um tico enquanto anda de lado
    if (c.escape > 0) return -0.8;
    let v = D.v0 * (1 + (D.tam * (s.n - D.n0)) / D.n0);
    if (v > D.vmax) v = D.vmax;
    const f = c.perfil.largada;
    // o rapido no comeco cansa depois (1 < f); f >= 1 o tempo todo nos outros (Bolota: pesadao embalado)
    v *= S.tCorrida < T_LARGADA || f <= 1.08 ? f : 2 - f;
    if (c.noSeco) v *= D.seco;
    if (c.vacuo) v *= D.vacuo;
    // a IA fica perto do jogador (a corrida tem drama): longe na frente freia um pouco, longe atras acelera
    if (!c.eu && !jog().chegou) {
      const d = jog().s.cy - s.cy;
      if (d > 7) v *= d > 14 ? 0.86 : 0.92;
      else if (d < -7) v *= d < -14 ? 1.12 : 1.06;
    }
    return v;
  }

  /**
   * Puxa a velocidade das particulas do corredor para a descida e para o alvo em x, e o corpo para
   * a forma de gota escorrendo (FORMA).
   * @param {any} c @param {number} dt
   */
  function conduzir(c, dt) {
    const m = S.m;
    const s = c.s;
    const D = DESCIDA;
    const F = FORMA;
    const v = vLimite(c);
    // o pesado desce rapido mas vira devagar
    const vLado = D.vLado * lim(Math.sqrt(D.n0 / s.n), 0.62, 1);
    const alvoX = c.escape > 0 ? c.escapeX : c.alvoX;
    const vx = S.fase === 'resumo' || S.fase === 'final' ? 0 : lim((alvoX - s.cx) * 3.2, -vLado, vLado);
    const dir = vx > 0.3 ? 1 : vx < -0.3 ? -1 : 0;
    const R = s.raio0 || 1;
    // a forma de gota cede quando o corpo espreme (entre adesivos, amolecido, escapando)
    const cede = c.escape > 0 || s.estado === 'calor' ? 0 : v > 0.5 ? lim(-s.vy / (0.7 * v), 0.2, 1) : 1;
    s.dormindo = false;
    s.tParado = 0;
    const ky = S.fase === 'conta' ? 0.25 : D.ky;
    // a gota: mais comprida quanto mais rapido, a cabeca para o lado do movimento
    const E = 1 + F.alto * lim(-s.vy / 7, 0, 1);
    const fx = 1 / E;
    const sh = lim(s.vx / D.vLado, -1, 1) * F.cisalha;
    const co = s.cos;
    const si = s.sin;
    const g = F.g * dt * cede;
    const al = F.al * cede;
    for (let a = m.iniSl[s.idx]; a < m.iniSl[s.idx + 1]; a++) {
      const i = m.membros[a];
      const rx = lim((m.x[i] - s.cx) / R, -1, 1);
      m.vy[i] += (-v - m.vy[i]) * ky;
      m.vx[i] += (vx * (1 + 0.2 * rx * dir) - m.vx[i]) * D.kx;
      const ox = m.ox[i];
      const oy = m.oy[i];
      const wx = ox * fx * (1 - (F.ponta * oy) / R) - sh * oy;
      const wy = oy * E;
      // forma de repouso (no referencial do slime) e particula (no mundo) para a gota
      m.qx[i] += al * (co * wx + si * wy - m.qx[i]);
      m.qy[i] += al * (-si * wx + co * wy - m.qy[i]);
      m.vx[i] += g * (s.cx + wx - m.x[i]);
      m.vy[i] += g * (s.cy + wy - m.y[i]);
    }
  }

  /** Ponto seco e vacuo (rastro molhado de outro corredor na frente). @param {any} c */
  function sentirVidro(c) {
    const s = c.s;
    c.noSeco = false;
    for (const z of S.pista.secos) {
      const dx = (s.cx - z.x) / (z.rx + s.raio0 * 0.3);
      const dy = (s.cy - z.y) / (z.ry + s.raio0 * 0.3);
      if (dx * dx + dy * dy < 1) { c.noSeco = true; break; }
    }
    c.vacuo = false;
    if (c.noSeco || c.chegou) return;
    for (const o of S.corredores) {
      // so o rastro fresco de quem esta logo a frente
      if (o === c || o.s.cy > s.cy - 0.5 || o.s.cy < s.cy - 14) continue;
      for (const p of o.rastro) {
        if (S.t - p.t > 3) continue;
        if (Math.abs(p.x - s.cx) < p.w * 0.9 && p.y > s.base && p.y < s.cy + s.raio0 * 0.5) { c.vacuo = true; break; }
      }
      if (c.vacuo) break;
    }
  }

  /**
   * IA: escolhe a raia (x) olhando a pista a frente: gotas (gula), adesivos e pontos secos
   * (cautela), rastro molhado dos outros e, as vezes, um rival para trombar.
   * @param {any} c
   */
  function decidir(c) {
    const s = c.s;
    const P = c.perfil;
    const r = s.raio0;
    const v = Math.max(2, -s.vy);
    const L = 4.5 + v * 1.1;
    const y0 = s.cy;
    // o guloso acha que cabe em qualquer lugar
    const hw = r * (0.78 - 0.22 * Math.min(1, P.gula / 2.6));
    let melhorX = s.cx;
    let melhorV = -Infinity;
    for (let x = -6.2; x <= 6.21; x += 0.4) {
      let sc = 0;
      for (const g of S.gotas) {
        if (!g.s.ativo) continue;
        const dy = y0 - g.y;
        if (dy < -0.2 || dy > L) continue;
        if (Math.abs(g.x - x) > r * 0.7 + 0.35) continue;
        sc += P.gula * (g.n / 9) * (1 - dy / (L * 1.4)) * (g.colorida ? 1.3 : 1);
      }
      for (const a of S.pista.adesivos) {
        const [ax0, ay0, ax1, ay1] = a.caixa;
        if (ay0 > y0 + r * 0.3) continue;
        const dy = y0 - ay1;
        if (dy > L) continue;
        const sobre = Math.min(x + hw, ax1) - Math.max(x - hw, ax0);
        if (sobre <= 0) continue;
        const perto = 1 - Math.max(0, dy) / (L * 1.6);
        sc -= (2.2 + 4 * P.cautela) * Math.min(1, sobre / hw) * perto;
      }
      for (const z of S.pista.secos) {
        const dy = y0 - (z.y + z.ry);
        if (z.y - z.ry > y0 || dy > L) continue;
        const sobre = Math.min(x + hw, z.x + z.rx) - Math.max(x - hw, z.x - z.rx);
        if (sobre <= 0) continue;
        sc -= 1.6 * P.cautela * Math.min(1, sobre / hw);
      }
      for (const o of S.corredores) {
        if (o === c || o.chegou) continue;
        const dy = y0 - o.s.cy;
        if (dy < 1 || dy > L) continue;
        if (Math.abs(o.s.cx - x) < o.s.raio0 * 0.7) sc += 0.7;
      }
      // onde ja entalou nao volta
      if (c.evitar && s.cy > c.evitar.y && x + hw > c.evitar.x0 && x - hw < c.evitar.x1) sc -= 10;
      sc -= Math.abs(x - s.cx) * 0.1 + Math.abs(x - c.alvoX) * 0.08;
      if (Math.abs(x) > 5.8) sc -= 0.4;
      if (sc > melhorV) { melhorV = sc; melhorX = x; }
    }
    // trombar: um rival do lado, quase na mesma altura
    if (P.trombar > 0 && rngIa() < P.trombar * 0.35) {
      for (const o of S.corredores) {
        if (o === c || o.chegou) continue;
        const dx = o.s.cx - s.cx;
        if (Math.abs(dx) < 3.6 && Math.abs(o.s.cy - s.cy) < 1.4) { melhorX = o.s.cx + Math.sign(dx) * 0.4; break; }
      }
    }
    return lim(melhorX, -6.2, 6.2);
  }

  /** Gota encostada: solta e funde no corredor (cresce, acelera, a cor mistura). */
  function engolir(c, g) {
    const m = S.m;
    const s = c.s;
    const gs = g.s;
    if (!g.colorida) {
      // agua dilui um pouco a cor de quem engole
      const p = pigmentoMedio(m, s);
      pintar(m, gs, p.map((v, k) => v * 0.85 + AGUA[k] * 0.15));
    }
    m.soltar(gs, s.vy);
    // a forma de repouso volta ao disco (a de origem da gota escorrendo) e o corpo amolece um
    // instante: o "gulp"
    m.fundir(s, gs, { px: gs.cx, py: gs.cy, rampa: 0.45 });
    m.reconstruir();
    c.comeu++;
    if (!PANCADA.includes(s.dados.expr)) { s.dados.expr = 'feliz'; s.dados.exprT = 0.8; }
    const cor = g.colorida ? hexDaMistura(g.pig) : '#cfe9ff';
    if (c.eu) {
      eventos.push({ tipo: 'fusao', x: gs.cx, y: gs.cy, cor, combo: 1, nivel: 2, brilhos: g.colorida ? 4 : 0 });
      if (g.colorida) eventos.push({ tipo: 'texto', x: s.cx, y: s.topo + 0.8, texto: 'cor nova!', cor, escala: 0.8, grupo: 'gota' });
    } else if (naVista(gs.cy)) {
      eventos.push({ tipo: 'pouso', x: gs.cx, y: gs.cy, forca: 0.35, cor });
    }
  }

  const naVista = (y) => y > camY - MEIA_H - 1 && y < camY + MEIA_H + 1;

  /** Ordem da corrida: quem chegou pelo lugar, depois quem esta mais abaixo. */
  function ordem() {
    return S.corredores.slice().sort((a, b) => {
      if (a.chegou && b.chegou) return a.lugar - b.lugar;
      if (a.chegou) return -1;
      if (b.chegou) return 1;
      return a.s.cy - b.s.cy;
    });
  }

  function chegar(c) {
    c.chegou = true;
    c.lugar = ++S.chegaram;
    c.tempo = S.tCorrida;
    const s = c.s;
    if (c.lugar === 1) { s.dados.expr = 'feliz'; s.dados.exprT = 6; } else if (c.lugar === 4) { s.dados.expr = 'choro'; s.dados.exprT = 3; }
    if (c.eu) {
      const txt = c.lugar + 'º!';
      eventos.push({ tipo: 'texto', x: s.cx, y: s.topo + 1.2, texto: txt, cor: c.lugar === 1 ? '#ffd23a' : '#ffffff', escala: 2.2, grupo: 'lugar' });
      eventos.push({ tipo: 'som', nome: c.lugar <= 2 ? 'nivelNovo' : 'completar' });
      if (c.lugar === 1) eventos.push({ tipo: 'som', frase: 'uhuu', nome: 'falas' });
    } else if (naVista(s.cy)) {
      eventos.push({ tipo: 'som', nome: 'tique' });
    }
  }

  /** Fim da corrida: pontos e o resumo; na ultima, a classificacao final. */
  function fecharCorrida() {
    // quem nao chegou (tempo esgotado) entra pela ordem de agora
    for (const c of ordem()) if (!c.chegou) chegar(c);
    for (const c of S.corredores) totais[c.k] += PONTOS[c.lugar - 1];
    const final = corrida + 1 >= CORRIDAS;
    const geral = S.corredores.slice().sort((a, b) => totais[b.k] - totais[a.k] || a.lugar - b.lugar);
    S.resumo = {
      corrida: corrida + 1, final,
      linhas: S.corredores.slice().sort((a, b) => a.lugar - b.lugar).map((c) => ({
        nome: c.nome, cor: c.s.dados.hex, lugar: c.lugar, pts: PONTOS[c.lugar - 1], total: totais[c.k], eu: c.eu, tempo: c.tempo,
      })),
      geral: geral.map((c, k) => ({ nome: c.nome, cor: c.s.dados.hex, total: totais[c.k], eu: c.eu, pos: k + 1 })),
    };
    S.fase = 'resumo';
    S.tResumo = 0;
    const eu = jog();
    eventos.push({ tipo: 'nivel', n: corrida + 1, acao: eu.lugar <= 2 ? 'complete' : 'fail' });
  }

  function seguir() {
    if (!S || S.fase !== 'resumo' || S.tResumo < 1.2) return;
    if (S.resumo.final) {
      const pos = S.resumo.geral.findIndex((g) => g.eu) + 1;
      const pts = totais[0];
      if (!melhor || pos < melhor) melhor = pos;
      if (pos === 1) titulos++;
      S.fase = 'final';
      eventos.push({
        tipo: 'fim', pontos: pts, titulo: pos === 1 ? 'Campeão!' : pos + 'º lugar', semGotas: true, reviver: false, venceu: pos === 1,
        sub: S.resumo.geral.map((g) => `${g.pos}º ${g.nome} ${g.total}`).join(' · '),
      });
      return;
    }
    corrida++;
    novaCorrida();
  }

  function passo(dt) {
    const m = S.m;
    S.t += dt;
    S.tFase += dt;
    m.reconstruir();
    const eu = jog();
    // contagem 3-2-1-ja
    if (S.fase === 'conta') {
      const falta = CONTA - S.tFase;
      if (falta < S.contaFeita && S.contaFeita > 0) {
        // a primeira batida da primeira corrida e a fala "Ready?" (som 'falas' com a frase; o main toca pelo sons.tocar)
        eventos.push({ tipo: 'som', frase: 'pronto', nome: S.contaFeita === 3 && corrida === 0 ? 'falas' : 'tique' });
        S.contaFeita--;
      }
      if (falta <= 0) {
        S.fase = 'corre';
        S.tFase = 0;
        m.gy = -DESCIDA.g;
        eventos.push({ tipo: 'som', frase: 'vai', nome: 'falas' });
        eventos.push({ tipo: 'texto', x: 0, y: eu.s.cy + 3, texto: 'Já!', cor: '#7fe36b', escala: 2.6, grupo: 'conta' });
      }
    } else if (S.fase === 'corre') {
      S.tCorrida += dt;
    } else if (S.fase === 'resumo') {
      S.tResumo += dt;
      if (S.tResumo > 6) seguir();
    }
    // teclas: o alvo anda na frente do slime para o lado apertado
    if (teclas.esq !== teclas.dir) eu.alvoX = lim(eu.s.cx + (teclas.dir ? 2.8 : -2.8), -6.4, 6.4);
    // IA dos rivais
    for (const c of S.corredores) {
      if (c.eu || c.chegou || c.escape > 0 || S.fase === 'conta') continue;
      c.tDecide -= dt;
      if (c.tDecide <= 0) { c.alvoX = decidir(c); c.tDecide = c.perfil.reacao; }
    }
    for (const c of S.corredores) {
      sentirVidro(c);
      conduzir(c, dt);
    }
    m.avancar(4);
    m.medir(dt);
    difundir(m, dt, { taxa: 1.6 });
    if (S.fase === 'corre') {
      // gotas encostadas
      for (const c of S.corredores) {
        if (c.chegou || c.s.n >= N_MAX) continue;
        const s = c.s;
        for (const g of S.gotas) {
          const gs = g.s;
          if (!gs.ativo || gs.base > s.topo + 0.1 || gs.topo < s.base - 0.1 || gs.esq > s.dir + 0.1 || gs.dir < s.esq - 0.1) continue;
          if (m.pertoDe(s, gs, 0.04)) engolir(c, g);
        }
      }
      // a cabeca (a ponta de baixo) cruza a fita
      for (const c of S.corredores) if (!c.chegou && c.s.base < PISTA.chegada - 0.2) chegar(c);
      if (S.chegaram === 4 || S.tCorrida > 75 || (eu.chegou && S.tCorrida - eu.tempo > 12)) {
        S.fase = 'fecha';
        S.tFase = 0;
      }
    } else if (S.fase === 'fecha' && S.tFase > 1.2) {
      fecharCorrida();
    }
    for (const c of S.corredores) acompanhar(c, dt);
    trombadas();
    lugarDoJogador(dt);
    // camera: segue o jogador mostrando mais abaixo dele (mais quanto mais rapido)
    let alvo = eu.s.cy - 3.2 + Math.min(0, eu.s.vy) * 0.25;
    if (S.fase === 'resumo' || S.fase === 'final' || S.fase === 'fecha') alvo = -Infinity;
    alvo = lim(alvo, PISTA.peitoril - 2.6 + MEIA_H, PISTA.topo + 1 - MEIA_H);
    camY += (alvo - camY) * Math.min(1, dt * 4);
  }

  /** Por quadro: rastro, preso, cor, humor. @param {any} c @param {number} dt */
  function acompanhar(c, dt) {
    const m = S.m;
    const s = c.s;
    const d = s.dados;
    // rastro molhado (so correndo)
    if (S.fase === 'corre' && !c.chegou) {
      c.tRastro -= dt;
      if (c.tRastro <= 0) {
        c.tRastro = RASTRO_PASSO;
        c.rastro.push({ x: s.cx, y: s.cy + s.raio0 * 0.15, w: s.raio0 * 0.78, t: S.t });
      }
    }
    while (c.rastro.length && S.t - c.rastro[0].t > RASTRO_T) c.rastro.shift();
    // entalado (quase nao desce ha meio segundo): primeiro amolece e espreme (escoa pelo vao ou
    // pela quina do adesivo, perdendo tempo); se nao sai, sobe um tico e escorre de lado ate o vao
    // livre mais perto (o jogador tem um pouco mais de tempo para sair sozinho)
    if (S.fase === 'corre' && !c.chegou) {
      c.tJan += dt;
      if (c.tJan >= 0.5) {
        const desceu = c.yJan - s.cy;
        if (desceu < 0.35 && c.escape <= 0) c.tPreso += c.tJan; else if (desceu > 0.7) c.tPreso = 0;
        c.tJan = 0;
        c.yJan = s.cy;
      }
      if (c.escape > 0) {
        // escapa ate chegar no vao (ou descer), no maximo 2,2 s
        c.escape -= dt;
        if (Math.abs(s.cx - c.escapeX) < 0.5 || s.cy < c.yEscape - 1) c.escape = 0;
        if (c.escape <= 0) { c.escape = 0; c.tPreso = 0; c.alvoX = s.cx; }
      } else if (c.tPreso >= (c.eu ? 2.5 : 2)) {
        c.escapeX = vaoLivre(c);
        c.escape = 2.2;
        c.yEscape = s.cy;
        c.escapes++;
        c.evitar = { x0: s.esq - 0.2, x1: s.dir + 0.2, y: s.cy - 5 };
        s.estado = 'calor';
        s.tEstado = 1;
      } else if (c.tPreso >= 0.5) {
        s.estado = 'calor';
        s.tEstado = 0.3;
      }
    }
    // cor de rosto e efeitos
    c.tCor -= dt;
    if (c.tCor <= 0) { d.hex = hexDaMistura(pigmentoMedio(m, s)); c.tCor = 0.25; }
    // humor: o passageiro (feliz da gota, careta da trombada) passa por cima do de base
    if (d.exprT > 0) { d.exprT -= dt; if (d.exprT <= 0) { d.expr = ''; d.bravoDe = undefined; } }
    if (!(d.exprT > 0)) {
      if (c.noSeco && S.fase === 'corre') { d.expr = 'amassado'; } else {
        let viz = 0;
        for (const o of S.corredores) if (o !== c && m.pertoDe(s, o.s, 0.1)) viz++;
        sentir(s, viz, dt);
      }
    }
  }

  /**
   * O vao livre mais perto na altura do corredor (entre adesivos e moldura), preferindo os que
   * cabem nele; devolve o x do meio do vao.
   * @param {any} c
   */
  function vaoLivre(c) {
    const s = c.s;
    const r = s.raio0;
    const y0 = s.base - 1.4;
    const y1 = s.cy + 0.4;
    const obs = [[-99, -PISTA.xv + 0.1], [PISTA.xv - 0.1, 99]];
    for (const a of S.pista.adesivos) if (a.caixa[1] < y1 && a.caixa[3] > y0) obs.push([a.caixa[0], a.caixa[2]]);
    obs.sort((p, q) => p[0] - q[0]);
    let melhor = s.cx > 0 ? -3 : 3;
    let custo = Infinity;
    let fim = obs[0][1];
    for (let k = 1; k < obs.length; k++) {
      const [a, b] = obs[k];
      if (a > fim) {
        const w = a - fim;
        const meio = (a + fim) / 2;
        const cx = w > 2 * r ? lim(s.cx, fim + r, a - r) : meio;
        const k2 = Math.abs(cx - s.cx) + (w < 1.2 * r ? 8 : w < 1.8 * r ? 2 : 0) + (w < 1.1 ? 40 : 0);
        if (k2 < custo) { custo = k2; melhor = cx; }
      }
      if (b > fim) fim = b;
    }
    // ja esta no vao: anda um pouco para o meio dele (descola da quina)
    if (Math.abs(melhor - s.cx) < 0.3) melhor = s.cx + (melhor >= 0 ? -1 : 1) * 0.8;
    return lim(melhor, -6.3, 6.3);
  }

  /** Trombadas entre corredores: careta em quem leva, respingo e som. */
  function trombadas() {
    const m = S.m;
    for (const [i, j, p] of m.contatos()) {
      const a = S.corredores.find((c) => c.s.idx === i);
      const b = S.corredores.find((c) => c.s.idx === j);
      if (!a || !b || p > 16) continue;
      const chave = i * 128 + j;
      if ((S.tromba.get(chave) || -9) > S.t - 0.9) continue;
      const rel = Math.hypot(a.s.vx - b.s.vx, a.s.vy - b.s.vy);
      if (rel < 1.6) continue;
      S.tromba.set(chave, S.t);
      const [forte, leva] = a.s.n >= b.s.n ? [a, b] : [b, a];
      const d = leva.s.dados;
      if (!PANCADA.includes(d.expr)) d.expr = careta(leva.s);
      d.pancadas = (d.pancadas || 0) + 1;
      d.exprT = 1.4;
      d.bravoDe = forte.s.idx;
      const x = (a.s.cx + b.s.cx) / 2;
      const y = (a.s.cy + b.s.cy) / 2;
      if (naVista(y)) eventos.push({ tipo: 'pouso', x, y, forca: Math.min(1.5, rel / 4), cor: forte.s.dados.hex });
      if ((a.eu || b.eu) && rel > 3) eventos.push({ tipo: 'texto', x, y: y + 1.2, texto: 'Pof!', cor: '#ffffff', escala: 0.9, grupo: 'tromba' });
    }
  }

  /** Subiu ou caiu de posicao: seta e numero perto do jogador. @param {number} dt */
  function lugarDoJogador(dt) {
    if (S.fase !== 'corre') return;
    const eu = jog();
    const pos = ordem().indexOf(eu) + 1;
    S.tLugar -= dt;
    if (S.lugarAntes && pos !== S.lugarAntes && S.tLugar <= 0 && !eu.chegou) {
      const subiu = pos < S.lugarAntes;
      eventos.push({ tipo: 'texto', x: eu.s.cx, y: eu.s.topo + 1, texto: (subiu ? '▲ ' : '▼ ') + pos + 'º', cor: subiu ? '#7fe36b' : '#ff7a7a', escala: 1.1, grupo: 'lugar' });
      S.tLugar = 0.6;
    }
    if (S.tLugar <= 0 || !S.lugarAntes) S.lugarAntes = pos;
  }

  novaCorrida();

  return {
    id: 'janela',
    semGotas: true,
    get mundo() { return S.m; },
    get janela() { return [-MEIA_W, camY - MEIA_H, MEIA_W, camY + MEIA_H]; },
    campoJanela: CAMPO,
    /** @param {any} c campo parado na janela local */
    campoMovel(c) { return movel(c, 0, camY); },
    desenho: { cenario, fundo, topo },
    eventos,
    passo,
    apontar(x, _y, fase) {
      if (fase === 'baixo') {
        tocando = true;
        if (S.fase === 'resumo') { seguir(); return; }
        jog().alvoX = lim(x, -6.4, 6.4);
        if (S.fase === 'corre' || S.fase === 'conta') arrastou = arrastou || S.fase === 'corre' || Math.abs(x - jog().s.cx) > 0.8;
      } else if (fase === 'mover' && tocando) {
        jog().alvoX = lim(x, -6.4, 6.4);
        arrastou = true;
      } else if (fase === 'cima') {
        tocando = false;
      }
    },
    tecla(codigo, baixo) {
      if (codigo === 'ArrowLeft' || codigo === 'KeyA') teclas.esq = baixo;
      else if (codigo === 'ArrowRight' || codigo === 'KeyD') teclas.dir = baixo;
      else if (baixo && (codigo === 'Enter' || codigo === 'Space')) seguir();
      if (teclas.esq || teclas.dir) arrastou = true;
      // soltou: fica na raia de agora
      if (!baixo && !teclas.esq && !teclas.dir && (codigo === 'ArrowLeft' || codigo === 'KeyA' || codigo === 'ArrowRight' || codigo === 'KeyD')) jog().alvoX = jog().s.cx;
    },
    poder() {},
    bot() {
      // no resumo, espera um pouco (os GIFs mostram a tabela)
      if (S.fase === 'resumo') { if (S.tResumo > 3) seguir(); return; }
      const eu = jog();
      if (eu.chegou || eu.escape > 0 || S.fase === 'conta') return;
      eu.alvoX = decidir(eu);
    },
    hud() {
      const eu = jog();
      const pos = S.fase === 'resumo' || S.fase === 'final' ? eu.lugar : ordem().indexOf(eu) + 1;
      const t = S.fase === 'conta' ? 0 : eu.chegou ? eu.tempo : S.tCorrida;
      const tam = Math.round((eu.s.n / DESCIDA.n0) * 100);
      const pct = lim((eu.s.n - DESCIDA.n0) / (DESCIDA.n0 * 1.6), 0, 1);
      return {
        pontos: pos + 'º',
        recorde: `Corrida ${corrida + 1}/${CORRIDAS}`,
        metaHtml: `<div class="pedido proto"><span style="min-width:3.6em;text-align:right">⏱ ${t.toFixed(1).replace('.', ',')}s</span>`
          + `<span class="sub">tamanho</span><div class="medidor"><b style="width:${(8 + pct * 92).toFixed(0)}%"></b></div>`
          + `<span class="sub" style="min-width:3.2em">${tam}%</span><span class="sub" style="min-width:3.4em">${totais[0]} pts</span></div>`,
        poderes: [],
      };
    },
    visual() {
      const eu = jog();
      const lista = ordem();
      const naCorrida = S.fase === 'conta' || S.fase === 'corre';
      return {
        olhar: [eu.s.cx, eu.s.cy - 12],
        mao: corrida === 0 && !arrastou && naCorrida && S.tCorrida < 6
          ? { x: eu.s.cx, y: eu.s.cy - 2.8, amplitude: 2, tecla: false, toque: !!o.toque } : null,
        janela: {
          pista: S.pista, P: PISTA, camY, fase: S.fase, tema: corrida, conta: S.fase === 'conta' ? CONTA - S.tFase : -1, t: S.t,
          tCorrida: S.tCorrida, corrida: corrida + 1, corridas: CORRIDAS,
          // a tabela entre as corridas (e a final fica atras da tela de fim)
          resumo: S.fase === 'resumo' || S.fase === 'final' ? { ...S.resumo, tResumo: S.fase === 'final' ? 0 : S.tResumo } : null,
          dica: corrida === 0 && !arrastou && naCorrida && S.tCorrida < 6 ? (o.toque ? 'arraste para o lado' : 'arraste ou use ← →') : '',
          gotas: S.gotas.filter((g) => g.s.ativo && naVista(g.y)).map((g) => ({ x: g.x, y: g.y, r: g.s.raio0, colorida: g.colorida })),
          corredores: S.corredores.map((c) => ({
            nome: c.nome, eu: c.eu, cor: c.s.dados.hex, cx: c.s.cx, cy: c.s.cy, topo: c.s.topo, raio: c.s.raio0,
            pos: lista.indexOf(c) + 1, chegou: c.chegou, lugar: c.lugar, rastro: c.rastro, vacuo: c.vacuo, seco: c.noSeco,
          })),
        },
      };
    },
    reiniciar() {
      corrida = 0;
      totais = [0, 0, 0, 0];
      novaCorrida();
    },
    salvar() { return { melhor, titulos }; },
    /** depuracao e teste (nao e `S`: o main.js le `modo.S` como o do motor de soltar) */
    get estado() { return S; },
  };
}

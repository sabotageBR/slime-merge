// Prototipo: Vitral de Gelatina (ideia #54, ?modelo=vitral).
// Pintura calma. Um vitral redondo em branco, dividido em pecas (paredes ocultas: so colidem;
// o chumbo e desenhado por cima). Pingar ciano, magenta, amarelo e branco no copo (as gotas de
// goo se juntam e a cor se mistura de verdade, Kubelka-Munk); escolher a peca e despejar: o copo
// esvazia num jorro e a peca enche com gotas de goo que nascem dentro dela e caem, juntando-se num
// slime so. O copo define a PROPORCAO (pigmento medio), a peca define o volume. A peca cheia ganha
// rosto e ACENDE se a cor bate (dE <= 9); senao fica apagada e triste (derreter e refazer).
// Vitral todo aceso: raios de luz, estrelas, galeria, e o proximo (Sol, Flor, Peixe).

import { criarMundo, ESPACO } from '../../fisica/mundo.js';
import { poteTrapezio, polilinha } from '../../fisica/paredes.js';
import { material } from '../../fisica/materiais.js';
import { difundir, pintar, pigmentoMedio } from '../../cor/difusao.js';
import { misturar, deltaE, hexDaMistura, TINTAS } from '../../cor/km.js';
import { CORES, nomeDe } from '../cores.js';
import { juntarGoo } from '../goo.js';
import { desenharCenario, desenharFundo, desenharTopo } from '../../render/prototipos/vitral.js';

const RAD = Math.PI / 180;
/** Centro e raio do vidro do vitral (u). */
const YC = 14;
const R = 5.5;
/** Bicos de tinta em cima do copo (a Loja tem o preto; aqui o pigmento preto e 0). */
const BICOS = [
  { x: -2.25, pig: TINTAS.ciano },
  { x: -0.75, pig: TINTAS.magenta },
  { x: 0.75, pig: TINTAS.amarelo },
  { x: 2.25, pig: TINTAS.branco },
];
const Y_BICO = 4.4;
/** Copo (trapezio): boca, fundo e altura. */
const COPO = { topo: 6, fundo: 4.2, altura: 3 };
const GOTA_N = 7;
/** Limite de gotas no copo. */
const MAX_GOTAS = 18;
/** dE para 3, 2 e 1 estrela; acende com dE <= ACENDE. */
const FAIXAS = [4, 9, 16];
const ACENDE = 9;
/** O bot despeja com dE <= isto. */
const BOT_DESPEJA = 6;
/** Pingar segurando: uma gota a cada TPINGO s. */
const TPINGO = 0.16;
const RAIO_PAREDE = 0.22;
/** Area (u2) de cada particula do goo assentado na peca (medida: o goo se aperta abaixo do ESPACO). */
const A_PART = 0.07;
/** Cobertura (fracao das amostras) em que a peca conta como cheia. */
const ENCHE = 0.93;
/** Celebracao do vitral pronto (s). */
const T_PRONTO = 5;

/** Textos curtos (pt, en, es). */
const TXT = {
  pt: { despejar: 'Despejar', esvaziar: 'Esvaziar', derreter: 'Derreter', pingue: 'Pingue tinta no copo', toque: 'Toque na peça: despejar', cheio: 'Copo cheio', vazio: 'Copo vazio', refazer: 'Derreta e refaça', pronto: 'Vitral pronto!', quase: 'Quase...', espere: 'Enchendo...', nomes: ['Sol', 'Flor', 'Peixe'] },
  en: { despejar: 'Pour', esvaziar: 'Empty', derreter: 'Melt', pingue: 'Drip ink into the cup', toque: 'Tap the piece: pour', cheio: 'Cup full', vazio: 'Cup empty', refazer: 'Melt and redo', pronto: 'Window done!', quase: 'Almost...', espere: 'Filling...', nomes: ['Sun', 'Flower', 'Fish'] },
  es: { despejar: 'Verter', esvaziar: 'Vaciar', derreter: 'Derretir', pingue: 'Gotea tinta en el vaso', toque: 'Toca la pieza: verter', cheio: 'Vaso lleno', vazio: 'Vaso vacío', refazer: 'Derrite y rehaz', pronto: '¡Vitral listo!', quase: 'Casi...', espere: 'Llenando...', nomes: ['Sol', 'Flor', 'Pez'] },
};

/** Icone do botao derreter: gota escorrendo numa poca. */
const SVG_DERRETER = '<svg viewBox="0 0 24 24"><g class="t"><path d="M12 3c-2.6 3.6-5 6.2-5 9a5 5 0 0 0 10 0c0-2.8-2.4-5.4-5-9z"/><path d="M4 21h16"/></g>'
  + '<path d="M12 3c-2.6 3.6-5 6.2-5 9a5 5 0 0 0 10 0c0-2.8-2.4-5.4-5-9z"/><path d="M4 21h16"/></svg>';

// ------------------------------------------------------------------ geometria dos vitrais

/** Arco de raio r de a0 a a1 graus (inclui as pontas), passo maximo em graus. */
function arco(r, a0, a1, passo) {
  const n = Math.max(1, Math.round(Math.abs(a1 - a0) / passo));
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = (a0 + ((a1 - a0) * i) / n) * RAD;
    out.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  return out;
}

/** Sol: disco no meio e o anel em quatro (5 pecas). */
function sol() {
  const r = 2.1;
  const pecas = [{ cor: 'amarelo', pts: arco(r, 0, 345, 15) }];
  // ordem de jogo: cima, direita, esquerda, baixo
  for (const [a0, a1, cor] of [[45, 135, 'ceu'], [-45, 45, 'rosa'], [135, 225, 'laranja'], [225, 315, 'verde']]) {
    pecas.push({ cor, pts: [...arco(R, a0, a1, 7.5), ...arco(r, a1, a0, 15)] });
  }
  return pecas;
}

/** Flor: miolo e seis petalas em catavento (7 pecas). */
function flor() {
  const r = 1.8;
  const giro = 18;
  const borda = (k) => [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const rr = r + (R - r) * f;
    const a = (60 * k + giro * f) * RAD;
    return [rr * Math.cos(a), rr * Math.sin(a)];
  });
  const pecas = [{ cor: 'ambar', pts: arco(r, 0, 345, 15) }];
  const cores = ['pessego', 'rosa', 'lilas', 'lavanda', 'chiclete', 'menta'];
  // a petala de cima primeiro, depois em volta
  for (const k of [1, 0, 5, 4, 3, 2]) {
    const ida = borda(k);
    const volta = borda(k + 1).reverse();
    pecas.push({ cor: cores[k], pts: [...ida, ...arco(R, 60 * k + giro, 60 * (k + 1) + giro, 7.5).slice(1, -1), ...volta, ...arco(r, 60 * (k + 1), 60 * k, 15).slice(1, -1)] });
  }
  return pecas;
}

/** Peixe: cabeca, dorso, barriga, cauda e quatro aguas (8 pecas). */
function peixe() {
  const N = [-4.75, 0.1];
  const H1 = [-2.3, 3.0];
  const H2 = [-2.3, -2.75];
  const B0 = [-2.3, 0.05];
  const J1 = [2.9, 0.75];
  const J0 = [2.9, 0.05];
  const J2 = [2.9, -0.7];
  const C1 = [-0.9, 3.25];
  const C2 = [-0.9, -3.0];
  const ang = (p) => Math.atan2(p[1], p[0]) / RAD;
  const L = [-Math.sqrt(R * R - N[1] * N[1]), N[1]];
  const TS = [C1[0], Math.sqrt(R * R - C1[0] * C1[0])];
  const BS = [C2[0], -Math.sqrt(R * R - C2[0] * C2[0])];
  const cauda = arco(R, 33, -33, 7.5);
  const T1 = cauda[0];
  const T2 = cauda[cauda.length - 1];
  const dorsoA = [[-4.3, 1.5], [-3.4, 2.5]];
  const dorsoB = [[0.5, 3.05], [1.7, 2.35], [2.5, 1.45]];
  const ventreB = [[2.5, -1.4], [1.7, -2.25], [0.5, -2.85]];
  const ventreA = [[-3.4, -2.2], [-4.3, -1.25]];
  const rev = (a) => a.slice().reverse();
  return [
    { cor: 'laranja', pts: [N, ...dorsoA, H1, B0, H2, ...ventreA] },
    { cor: 'coral', pts: [H1, C1, ...dorsoB, J1, J0, B0] },
    { cor: 'pessego', pts: [B0, J0, J2, ...ventreB, C2, H2] },
    { cor: 'framboesa', pts: [J1, ...cauda, J2, J0] },
    { cor: 'ceu', pts: [...arco(R, ang(L), ang(TS), 7.5), C1, H1, ...rev(dorsoA), N] },
    { cor: 'turquesa', pts: [...arco(R, ang(TS), 33, 7.5).slice(0, -1), T1, J1, ...rev(dorsoB), C1] },
    { cor: 'indigo', pts: [...arco(R, ang(BS), ang(L) - 360, 7.5), N, ...rev(ventreA), H2, C2] },
    { cor: 'menta', pts: [T2, ...arco(R, -33, ang(BS), 7.5).slice(1), C2, ...rev(ventreB), J2] },
  ];
}

/** Os tres vitrais (pontos locais, centro em 0,0). */
export const VITRAIS = [
  { id: 'sol', pecas: sol() },
  { id: 'flor', pecas: flor() },
  { id: 'peixe', pecas: peixe() },
];

/** @param {number[]} p @param {number[][]} poli */
export function dentro(p, poli) {
  let d = false;
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const [xi, yi] = poli[i];
    const [xj, yj] = poli[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) d = !d;
  }
  return d;
}

/** Distancia de (x, y) ate a borda do poligono. */
function distBorda(x, y, poli) {
  let m = Infinity;
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const [ax, ay] = poli[j];
    const [bx, by] = poli[i];
    const ex = bx - ax;
    const ey = by - ay;
    const l2 = ex * ex + ey * ey;
    let t = l2 ? ((x - ax) * ex + (y - ay) * ey) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = x - ax - t * ex;
    const dy = y - ay - t * ey;
    const d = dx * dx + dy * dy;
    if (d < m) m = d;
  }
  return Math.sqrt(m);
}

/** Reticulado hexagonal (passo ESPACO) dentro do poligono, a `folga` u da borda. */
export function reticulado(poli, folga, passo = ESPACO) {
  const xs = poli.map((p) => p[0]);
  const ys = poli.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const dy = passo * 0.866;
  const out = [];
  let lin = 0;
  for (let y = y0 + folga; y <= y1 - folga; y += dy, lin++) {
    for (let x = x0 + folga + (lin % 2 ? passo / 2 : 0); x <= x1 - folga; x += passo) {
      if (dentro([x, y], poli) && distBorda(x, y, poli) >= folga) out.push(x, y);
    }
  }
  return out;
}

/**
 * Prepara as pecas de um vitral no mundo: poligono, alvo, amostras do enchimento, lugares onde
 * as gotas nascem, ponto do rosto e quantas particulas cabem.
 * @param {number} v
 */
function montarPecas(v) {
  return VITRAIS[v].pecas.map((P, k) => {
    const pts = P.pts.map(([x, y]) => [x, y + YC]);
    const cor = CORES.find((c) => c.id === P.cor) || CORES[0];
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const caixa = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    // amostras de 0,25 u a 0,3 u da borda (mede o enchimento) e o polo (rosto)
    const amostras = [];
    let polo = [(caixa[0] + caixa[2]) / 2, (caixa[1] + caixa[3]) / 2];
    let raioIn = 0;
    for (let x = caixa[0]; x <= caixa[2]; x += 0.25) {
      for (let y = caixa[1]; y <= caixa[3]; y += 0.25) {
        if (!dentro([x, y], pts)) continue;
        const d = distBorda(x, y, pts);
        if (d >= 0.3) amostras.push(x, y);
        if (d > raioIn + 1e-9) { raioIn = d; polo = [x, y]; }
      }
    }
    // gota maior nas pecas largas (enche mais depressa e com menos costuras); a pequena cabe nos cantos
    const tamanhos = [raioIn > 1.5 ? 19 : raioIn > 1.05 ? 13 : 7, 7, 3, 1].map((n) => {
      const r = n > 1 ? 0.6 * ESPACO * Math.sqrt(n) + 0.14 : 0.14;
      const lugares = [];
      for (let x = caixa[0]; x <= caixa[2]; x += 0.2) {
        for (let y = caixa[1]; y <= caixa[3]; y += 0.2) {
          if (dentro([x, y], pts) && distBorda(x, y, pts) >= (n > 3 ? r + RAIO_PAREDE + 0.02 : n > 1 ? 0.62 : 0.4)) lugares.push([x, y]);
        }
      }
      lugares.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
      return { n, r, lugares, folga: n > 3 ? r : n > 1 ? 0.26 : 0.27 };
    });
    // cheia na hora (partida salva): o reticulado apertado como o goo assentado
    const cheio = reticulado(pts, RAIO_PAREDE + 0.15, 0.29);
    // rosto: cabe na peca (olhos a +-0,36 R e boca), sem passar de 1,25 u
    const rosto = Math.max(0.42, Math.min(1.25, 0.72 * (raioIn - 0.3)));
    return {
      k, pts, cor, hexAlvo: hexDaMistura(cor.pig), rgbAlvo: misturar(cor.pig), caixa, amostras, polo, raioIn, rosto,
      tamanhos, nCheio: Math.round((amostras.length / 2) * 0.0625 / A_PART), cheio,
      estado: 'vazia', acesa: false, dE: 99, est: 0, pig: null, hex: '', tLuz: -9, dorme: 0, tDorme: 0,
    };
  });
}

/** Estrelas pelo dE. */
function estrelas(dE) {
  return dE <= FAIXAS[0] ? 3 : dE <= FAIXAS[1] ? 2 : dE <= FAIXAS[2] ? 1 : 0;
}

/**
 * @param {{ semente?: number, salvo?: any, toque?: boolean, lang?: string, vitrine?: number }} [o]
 */
export function criarModo(o = {}) {
  const salvo = o.salvo || {};
  const lang = o.lang || 'en';
  const T = TXT[lang] || TXT.en;
  // goo da Loja: escoa e toma a forma da peca
  const goo = material('goo', { k: 0.0015, coesao: 0.03, xsph: 0.2, atritoS: 0.12, atritoK: 0.08 });
  // o da peca escorre mais (pouca coesao e atrito): a superficie fica plana e entra nos cantos
  const gooPeca = material('goo', { k: 0.0015, coesao: 0.008, xsph: 0.08, atritoS: 0.05, atritoK: 0.03 });
  /** @type {any[]} */
  const eventos = [];
  /** estrelas dos vitrais prontos */
  let total = salvo.total || 0;
  /** vitrais prontos (galeria): [{ v, cores: [hex...], est }] */
  const galeria = Array.isArray(salvo.galeria) ? salvo.galeria.slice(-12) : [];
  // (o main poe salvo.visto = niveis vistos no perfil; o onboarding daqui tem chave propria)
  let ensinado = !!salvo.ensinado;
  /** @type {any} */
  let S = null;

  /**
   * Copo (paredes 0..2) e as pecas do vitral (ocultas, sem repetir as arestas comuns). Nos encontros
   * em T (o raio que chega no circulo do sol), a haste perde RAIO_PAREDE na ponta: o prolongamento
   * dela entraria na peca vizinha, e a fisica contava a particula que cruzasse esse prolongamento
   * perto da ponta como travessia (e a jogava para o outro lado da parede de la). A tampa da ponta
   * ainda encosta na parede que segue, entao a costura continua fechada.
   */
  function paredesDo(pecas) {
    // o copo encadeado (borda esquerda -> fundo -> borda direita): o vidro desenha o contorno
    const [e, f, d] = poteTrapezio(COPO);
    const caps = [{ ax: e.bx, ay: e.by, bx: e.ax, by: e.ay, r: e.r }, { ...f }, { ...d }];
    const chave = (p) => Math.round(p[0] * 1e4) + ',' + Math.round(p[1] * 1e4);
    /** @type {Map<string, number[]>} aresta -> [ax, ay, bx, by] */
    const arestas = new Map();
    /** @type {Map<string, number[][]>} no -> direcoes das arestas que saem dele */
    const nos = new Map();
    for (const P of pecas) {
      for (const c of polilinha(P.pts, RAIO_PAREDE, true)) {
        const a = chave([c.ax, c.ay]);
        const b = chave([c.bx, c.by]);
        const k = a < b ? a + '|' + b : b + '|' + a;
        if (arestas.has(k) || a === b) continue;
        arestas.set(k, [c.ax, c.ay, c.bx, c.by]);
        const L = Math.hypot(c.bx - c.ax, c.by - c.ay);
        if (!nos.has(a)) nos.set(a, []);
        if (!nos.has(b)) nos.set(b, []);
        nos.get(a).push([(c.bx - c.ax) / L, (c.by - c.ay) / L]);
        nos.get(b).push([(c.ax - c.bx) / L, (c.ay - c.by) / L]);
      }
    }
    // em cada no de 3 ou mais arestas, o par mais alinhado (> 135 graus) e a parede que segue; o resto e haste
    /** @type {Map<string, number[][]>} */
    const seguem = new Map();
    for (const [k, dirs] of nos) {
      if (dirs.length < 3) continue;
      let melhor = -0.7;
      let par = [];
      for (let i = 0; i < dirs.length; i++) for (let j = i + 1; j < dirs.length; j++) {
        const cos = dirs[i][0] * dirs[j][0] + dirs[i][1] * dirs[j][1];
        if (-cos > melhor) { melhor = -cos; par = [dirs[i], dirs[j]]; }
      }
      seguem.set(k, par);
    }
    const encurtar = (no, dx, dy) => {
      const par = seguem.get(no);
      if (!par) return false;
      return !par.some((q) => Math.abs(q[0] - dx) < 1e-9 && Math.abs(q[1] - dy) < 1e-9);
    };
    for (const [ax, ay, bx, by] of arestas.values()) {
      const L = Math.hypot(bx - ax, by - ay);
      const ux = (bx - ax) / L;
      const uy = (by - ay) / L;
      const corta = Math.min(RAIO_PAREDE, L * 0.3);
      const ca = encurtar(chave([ax, ay]), ux, uy) ? corta : 0;
      const cb = encurtar(chave([bx, by]), -ux, -uy) ? corta : 0;
      caps.push({ ax: ax + ux * ca, ay: ay + uy * ca, bx: bx - ux * cb, by: by - uy * cb, r: RAIO_PAREDE, oculta: true });
    }
    return caps;
  }

  /**
   * Monta o vitral v (o copo continua se o mundo ja existe).
   * @param {number} v
   * @param {any[]} [feitas] pecas ja prontas (partida salva): [{ k, pig }]
   */
  function montar(v, feitas = []) {
    const pecas = montarPecas(v);
    let mundo = S && S.mundo;
    if (mundo) {
      for (const s of mundo.slimes) if (s.ativo && s.dados.peca >= 0) mundo.remover(s);
    } else {
      mundo = criarMundo({ semente: (o.semente || 1) * 7 + v, limites: [-8, -3, 8, 22] });
    }
    mundo.definirParedes(paredesDo(pecas));
    const anterior = S;
    S = {
      mundo, v, pecas, sel: 0, tempo: anterior ? anterior.tempo : 0, pingando: -1, tPingo: 0, botSolta: 0, cheioAviso: false,
      despejo: null, pronto: null, media: null, dE: 99, dica: -1, nCopo: 0, tMed: 0, hover: null, tHover: -9,
      despejos: anterior ? anterior.despejos : 0,
    };
    for (const f of feitas) {
      const P = pecas[f.k];
      if (!P || !Array.isArray(f.pig)) continue;
      encherNaHora(P, f.pig);
    }
    S.sel = proxima(-1);
    eventos.push({ tipo: 'nivel', n: v + 1, acao: 'start' });
  }

  /** Enche a peca de uma vez pelo reticulado (partida salva e bancada). */
  function encherNaHora(P, pig) {
    const m = S.mundo;
    const s = m.criarSlime({ x: P.polo[0], y: P.polo[1], pontos: P.cheio, material: gooPeca });
    if (!s) return;
    pintar(m, s, pig);
    s.dados.peca = P.k;
    P.pig = pig.slice();
    P.hex = hexDaMistura(pig);
    s.dados.hex = P.hex;
    P.dE = deltaE(misturar(pig), P.rgbAlvo);
    P.est = estrelas(P.dE);
    P.acesa = P.dE <= ACENDE;
    P.estado = 'cheia';
    P.tLuz = -9;
    P.tDorme = 0.8;
    s.dados.expr = P.acesa ? 'contente' : 'chorinho';
  }

  /** A proxima peca a fazer depois de k: a vazia seguinte; sem vazia, a apagada. */
  function proxima(k) {
    const n = S.pecas.length;
    for (let d = 1; d <= n; d++) {
      const P = S.pecas[(k + d + n) % n];
      if (P.estado === 'vazia') return P.k;
    }
    for (let d = 1; d <= n; d++) {
      const P = S.pecas[(k + d + n) % n];
      if (P.estado === 'cheia' && !P.acesa) return P.k;
    }
    return Math.max(0, k);
  }

  /** Slimes de uma peca (k >= 0) ou do copo (k = -1: no copo e caindo nele). */
  function slimesDe(k) {
    return S.mundo.slimes.filter((s) => s.ativo && (s.dados.peca ?? -1) === k);
  }

  /** Particulas no copo (sem o que ja esta indo no jorro). */
  function particulasCopo() {
    let n = 0;
    for (const s of slimesDe(-1)) if (!s.dados.vai) n += s.n || 0;
    return n;
  }

  /** Cor media do copo (pesada pelas particulas), o dE para a peca escolhida e a dica. */
  function medirCopo() {
    const m = S.mundo;
    // membros em dia (uma gota pode ter nascido, fundido ou saido desde o ultimo medir)
    m.reconstruir();
    const media = [0, 0, 0, 0];
    let M = 0;
    for (const s of slimesDe(-1)) {
      const n = s.n || 0;
      if (!n || s.dados.vai) continue;
      const p = pigmentoMedio(m, s);
      for (let c = 0; c < 4; c++) media[c] += p[c] * n;
      M += n;
    }
    S.nCopo = M;
    const P = S.pecas[S.sel];
    if (!M) {
      S.media = null;
      S.dE = 99;
      // copo vazio: a tinta que mais pesa na peca (o branco e o que sobra)
      if (P && P.estado === 'vazia') {
        const q = P.cor.pig;
        const pesos = [q[0], q[1], q[2], 1 - q[0] - q[1] - q[2] - q[3]];
        S.dica = pesos.indexOf(Math.max(...pesos));
      } else S.dica = -1;
      return;
    }
    for (let c = 0; c < 4; c++) media[c] /= M;
    S.media = media;
    if (!P || P.estado !== 'vazia') { S.dE = 99; S.dica = -1; return; }
    S.dE = deltaE(misturar(media), P.rgbAlvo);
    // dica: a tinta que, com uma gota a mais, mais baixa o dE
    let melhorK = -1;
    let melhorD = S.dE - 0.3;
    if (M + GOTA_N <= MAX_GOTAS * GOTA_N) {
      BICOS.forEach((b, k) => {
        const p = media.map((x, c) => (x * M + b.pig[c] * GOTA_N) / (M + GOTA_N));
        const d = deltaE(misturar(p), P.rgbAlvo);
        if (d < melhorD) { melhorD = d; melhorK = k; }
      });
    }
    S.dica = melhorK;
  }

  /** Uma gota do bico k no copo. */
  function pingar(k) {
    const m = S.mundo;
    if (S.pronto) return false;
    if (particulasCopo() + GOTA_N > MAX_GOTAS * GOTA_N) {
      if (!S.cheioAviso) {
        S.cheioAviso = true;
        eventos.push({ tipo: 'som', nome: 'recusa' });
        eventos.push({ tipo: 'texto', x: 0, y: 3.6, texto: T.cheio, cor: '#ffffff', escala: 0.8 });
      }
      return false;
    }
    const b = BICOS[k];
    const s = m.criarSlime({ x: b.x + ((S.tempo * 7.3) % 1 - 0.5) * 0.2, y: Y_BICO - 0.9, n: GOTA_N, material: goo, vy: -5 });
    if (!s) return false;
    pintar(m, s, b.pig);
    s.dados.peca = -1;
    s.dados.gota = true;
    s.dados.semRosto = true;
    s.dados.hex = hexDaMistura(b.pig);
    eventos.push({ tipo: 'som', nome: 'tique' });
    return true;
  }

  /** Esvazia o copo (ralo). */
  function ralo() {
    const m = S.mundo;
    const lista = slimesDe(-1);
    if (!lista.length) return;
    m.reconstruir();
    for (const s of lista) if (s.n > 12) eventos.push({ tipo: 'estouro', x: s.cx, y: s.cy, cor: hexDaMistura(pigmentoMedio(m, s)) });
    for (const s of lista) m.remover(s);
    S.cheioAviso = false;
    medirCopo();
  }

  /** Despeja o copo na peca escolhida. */
  function despejar() {
    const P = S.pecas[S.sel];
    if (S.pronto || !P) return;
    if (S.despejo) { eventos.push({ tipo: 'texto', x: 0, y: 3.6, texto: T.espere, cor: '#ffffff', escala: 0.7 }); return; }
    if (P.estado !== 'vazia') return;
    medirCopo();
    if (!S.media) {
      eventos.push({ tipo: 'som', nome: 'recusa' });
      eventos.push({ tipo: 'texto', x: 0, y: 3.6, texto: T.vazio, cor: '#ffffff', escala: 0.8 });
      return;
    }
    const pig = S.media.slice();
    // o que esta no copo agora vai no jorro (gotas pingadas durante o enchimento ficam no copo)
    for (const s of slimesDe(-1)) s.dados.vai = true;
    P.estado = 'enchendo';
    P.pig = pig;
    P.hex = hexDaMistura(pig);
    P.dE = deltaE(misturar(pig), P.rgbAlvo);
    P.est = estrelas(P.dE);
    S.despejo = { k: P.k, pig, hex: P.hex, t: 0, n0: Math.max(1, S.nCopo), faltam: P.nCheio, extra: 0, tGota: 0.28, fase: 'jorro', tAssenta: 0, tMed: 0, cobertura: 0, nGotas: 0, preso: 0, fim: -1, voltas: 0, naVolta: 0, semLugar: false };
    S.despejos++;
    S.cheioAviso = false;
    eventos.push({ tipo: 'som', nome: 'soltar' });
  }

  /**
   * Lugar livre no alto da peca para uma gota nascer: { x, y, n } (a gota grande se couber; senao a
   * pequena, que entra nos cantos), ou null.
   */
  function lugarLivre(P, vez) {
    const m = S.mundo;
    const xs = [];
    const ys = [];
    for (const s of slimesDe(P.k)) {
      for (let a = m.iniSl[s.idx]; a < m.iniSl[s.idx + 1]; a++) { const i = m.membros[a]; xs.push(m.x[i]); ys.push(m.y[i]); }
    }
    for (const G of P.tamanhos) {
      const folga = G.folga;
      const livres = [];
      for (const c of G.lugares) {
        let ok = true;
        for (let j = 0; j < xs.length; j++) {
          const dx = xs[j] - c[0];
          const dy = ys[j] - c[1];
          if (dx * dx + dy * dy < folga * folga) { ok = false; break; }
        }
        if (ok) {
          livres.push(c);
          if (livres.length >= 16) break;
        }
      }
      if (!livres.length) continue;
      // so os do alto (ate 0,5 u abaixo do mais alto), variando o x
      const topo = livres[0][1];
      const alto = livres.filter((c) => c[1] > topo - 0.5);
      const c = alto[(vez * 5) % alto.length];
      return { x: c[0], y: c[1], n: G.n };
    }
    return null;
  }

  /** Cobertura da peca (fracao das amostras com goo perto). */
  function cobertura(P) {
    const m = S.mundo;
    const marcadas = new Set();
    for (const s of slimesDe(P.k)) {
      for (let a = m.iniSl[s.idx]; a < m.iniSl[s.idx + 1]; a++) {
        const i = m.membros[a];
        const ci = Math.round(m.x[i] / 0.25);
        const cj = Math.round(m.y[i] / 0.25);
        for (let u = -1; u <= 1; u++) for (let w = -1; w <= 1; w++) {
          const gx = (ci + u) * 0.25 - m.x[i];
          const gy = (cj + w) * 0.25 - m.y[i];
          if (gx * gx + gy * gy < 0.34 * 0.34) marcadas.add((ci + u) * 10007 + (cj + w));
        }
      }
    }
    const A = P.amostras;
    if (!A.length) return 1;
    let ok = 0;
    for (let j = 0; j < A.length; j += 2) if (marcadas.has(Math.round(A[j] / 0.25) * 10007 + Math.round(A[j + 1] / 0.25))) ok++;
    return ok / (A.length / 2);
  }

  /** Velocidade maxima das particulas da peca. */
  function agitacao(P) {
    const m = S.mundo;
    let v2 = 0;
    for (const s of slimesDe(P.k)) {
      if (s.dormindo) continue;
      for (let a = m.iniSl[s.idx]; a < m.iniSl[s.idx + 1]; a++) {
        const i = m.membros[a];
        const q = m.vx[i] * m.vx[i] + m.vy[i] * m.vy[i];
        if (q > v2) v2 = q;
      }
    }
    return Math.sqrt(v2);
  }

  /** Um quadro do despejo: dreno do copo, gotas nascendo na peca, assentar e concluir. */
  function avancarDespejo(dt) {
    const D = S.despejo;
    const m = S.mundo;
    const P = S.pecas[D.k];
    D.t += dt;
    m.reconstruir();
    // o copo esvazia em ~0,5 s (as de cima primeiro)
    const doCopo = [];
    for (const s of slimesDe(-1)) {
      if (!s.dados.vai) continue;
      for (let a = m.iniSl[s.idx]; a < m.iniSl[s.idx + 1]; a++) doCopo.push(m.membros[a]);
    }
    if (doCopo.length) {
      const q = Math.min(doCopo.length, Math.ceil((D.n0 * dt) / 0.5));
      doCopo.sort((a, b) => m.y[b] - m.y[a]);
      m.removerParticulas(doCopo.slice(0, q));
      m.reconstruir();
    }
    if (D.fase === 'jorro') {
      D.tGota -= dt;
      if (D.tGota <= 0 && D.faltam > 0) {
        const c = lugarLivre(P, D.nGotas);
        const s = c ? m.criarSlime({ x: c.x, y: c.y, n: c.n, material: gooPeca, vy: -3 }) : null;
        if (s) {
          pintar(m, s, D.pig);
          s.dados.peca = P.k;
          s.dados.gota = true;
          s.dados.semRosto = true;
          s.dados.hex = D.hex;
          D.faltam -= c.n;
          D.nGotas++;
          D.naVolta++;
          D.preso = 0;
          if (D.nGotas % 3 === 1) eventos.push({ tipo: 'som', nome: 'tique' });
        } else D.preso += 0.08;
        D.tGota = c && c.n <= 3 ? 0.05 : 0.08;
      }
      if (D.faltam <= 0 || D.preso > 0.4) {
        // nao coube mais nenhuma gota nesta volta: a peca esta cheia do jeito que da
        if (D.preso > 0.4 && !D.naVolta) D.semLugar = true;
        D.fase = 'assenta';
        D.tAssenta = 0;
        if (D.fim < 0) D.fim = D.t;
      }
    } else {
      D.tAssenta += dt;
      D.tMed -= dt;
      if (D.tMed <= 0) {
        D.tMed = 0.15;
        D.cobertura = cobertura(P);
        const calmo = agitacao(P) < 2.5;
        if ((D.cobertura >= ENCHE || (D.semLugar && D.cobertura >= 0.8)) && calmo && D.tAssenta > 0.4) concluir(P);
        else if (!D.semLugar && D.tAssenta > 0.7 && D.cobertura < ENCHE && D.extra < P.nCheio * 0.6 && D.voltas < 8) {
          // ainda falta: mais umas gotas no alto (o goo assentou e abriu espaco)
          const mais = Math.max(4, Math.round(P.nCheio * (ENCHE + 0.03 - D.cobertura)));
          D.faltam = mais;
          D.extra += mais;
          D.voltas++;
          D.naVolta = 0;
          D.preso = 0;
          D.fase = 'jorro';
        } else if (D.tAssenta > 2.5) concluir(P);
      }
    }
  }

  /** A peca encheu: um slime so, rosto, acende (ou nao). */
  function concluir(P) {
    const m = S.mundo;
    const lista = slimesDe(P.k);
    S.despejo = null;
    if (!lista.length) { P.estado = 'vazia'; return; }
    let maior = lista[0];
    for (const s of lista) if (s.n > maior.n) maior = s;
    if (lista.length > 1) {
      const d = maior.dados;
      m.fundir(maior, lista, { px: P.polo[0], py: P.polo[1], manterForma: true, rampa: 1 });
      maior.dados = d;
    }
    maior.dados.gota = false;
    maior.dados.semRosto = false;
    maior.dados.hex = P.hex;
    P.estado = 'cheia';
    P.acesa = P.dE <= ACENDE;
    P.tLuz = S.tempo;
    P.tDorme = 2.5;
    maior.dados.expr = P.acesa ? 'feliz' : 'chorinho';
    maior.dados.exprT = P.acesa ? 2.5 : 0;
    const [x, y] = P.polo;
    if (P.acesa) {
      eventos.push({ tipo: 'texto', x, y: y + 0.9, texto: '★'.repeat(P.est), cor: '#ffd23a', escala: 1.3 });
      // faiscas pela borda da peca
      const pts = [];
      for (let j = 0; j < P.pts.length; j += Math.max(1, Math.floor(P.pts.length / 8))) pts.push(P.pts[j][0] * 0.85 + x * 0.15, P.pts[j][1] * 0.85 + y * 0.15);
      eventos.push({ tipo: 'faiscas', pts });
      eventos.push({ tipo: 'som', nome: 'fusao', k: 2 + P.est });
      eventos.push({ tipo: 'som', nome: 'combo', k: P.est + 1 });
    } else {
      eventos.push({ tipo: 'som', nome: 'recusa' });
      eventos.push({ tipo: 'texto', x, y: y + 0.9, texto: T.quase, cor: '#ffffff', escala: 0.9 });
    }
    if (S.pecas.every((Q) => Q.estado === 'cheia' && Q.acesa)) { vitralPronto(); return; }
    if (S.sel === P.k) S.sel = proxima(P.k);
  }

  /** Derrete a peca cheia (volta a ficar vazia e escolhida). */
  function derreter(k) {
    const P = S.pecas[k];
    if (!P || P.estado !== 'cheia' || S.pronto) return;
    const m = S.mundo;
    for (const s of slimesDe(k)) {
      eventos.push({ tipo: 'estouro', x: P.polo[0], y: P.polo[1], cor: P.hex });
      m.remover(s);
    }
    P.estado = 'vazia';
    P.acesa = false;
    P.pig = null;
    P.hex = '';
    P.dE = 99;
    P.est = 0;
    P.tDorme = 0;
    P.dorme = 0;
    S.sel = k;
    medirCopo();
  }

  /** Todas acesas: raios de luz, estrelas, galeria. */
  function vitralPronto() {
    const est = S.pecas.reduce((a, P) => a + P.est, 0);
    total += est;
    galeria.push({ v: S.v, cores: S.pecas.map((P) => P.hex), est });
    while (galeria.length > 12) galeria.shift();
    S.pronto = { t: 0, est };
    eventos.push({ tipo: 'nivel', n: S.v + 1, acao: 'complete' });
    eventos.push({ tipo: 'som', nome: 'nivelNovo' });
    for (const s of S.mundo.slimes) if (s.ativo && s.dados.peca >= 0) { s.dados.expr = 'feliz'; s.dados.exprT = T_PRONTO; }
  }

  /** Toque numa peca: escolhe; tocar de novo despeja (vazia), derrete (apagada) ou faz festa (acesa). */
  function tocarPeca(k) {
    const P = S.pecas[k];
    if (S.sel !== k) {
      S.sel = k;
      medirCopo();
      eventos.push({ tipo: 'som', nome: 'interface' });
      return;
    }
    if (P.estado === 'vazia') despejar();
    else if (P.estado === 'cheia' && !P.acesa) derreter(k);
    else if (P.estado === 'cheia') {
      // a acesa da um pulinho de alegria
      const m = S.mundo;
      for (const s of slimesDe(k)) {
        s.dormindo = false;
        s.tParado = 0;
        s.dados.expr = 'feliz';
        s.dados.exprT = 1.5;
        m.puxar(P.polo[0], P.polo[1], 1.6, 0, 4, 0.5);
      }
      P.dorme = 0;
      P.tDorme = 1.5;
      eventos.push({ tipo: 'pouso', x: P.polo[0], y: P.polo[1], forca: 0.6 });
    }
  }

  /** Peca no ponto (x, y), ou -1. */
  function pecaEm(x, y) {
    const d = Math.hypot(x, y - YC);
    if (d > R) return -1;
    for (const P of S.pecas) {
      if (x < P.caixa[0] || x > P.caixa[2] || y < P.caixa[1] || y > P.caixa[3]) continue;
      if (dentro([x, y], P.pts)) return P.k;
    }
    return -1;
  }

  /** Bico no ponto, ou -1. */
  function bicoEm(x, y) {
    if (y < Y_BICO - 0.7 || y > Y_BICO + 2) return -1;
    return BICOS.findIndex((b) => Math.abs(x - b.x) < 0.72);
  }

  // partida salva: o vitral da vez e as pecas ja feitas
  const v0 = Math.max(0, Math.min(VITRAIS.length - 1, salvo.v | 0));
  // ?vitrine=11..17 so para prints (o hub usa 1..6 para os niveis do Merge e pode mandar aqui)
  const vit = (o.vitrine || 0) >= 11 ? o.vitrine - 10 : 0;
  if (vit === 7) {
    // prints: o peixe vazio e o copo recebendo ciano, amarelo e branco (a mistura acontecendo)
    ensinado = true;
    montar(2);
    S.sel = 5;
    S.demo = [0, 2, 0, 3, 0, 0, 2, 3, 0, 3];
  } else if (vit) {
    // prints (?vitrine=11..13: o vitral quase pronto, com uma peca apagada; 14..16: falta uma so)
    const v = (vit - 1) % VITRAIS.length;
    const apagada = vit <= VITRAIS.length;
    for (let w = 1; w < VITRAIS.length; w++) {
      const u = (v + w) % VITRAIS.length;
      galeria.push({ v: u, cores: VITRAIS[u].pecas.map((P) => hexDaMistura((CORES.find((c) => c.id === P.cor) || CORES[0]).pig)), est: 0 });
    }
    ensinado = true;
    montar(v, VITRAIS[v].pecas.slice(0, -1).map((P, k) => {
      const pig = (CORES.find((c) => c.id === P.cor) || CORES[0]).pig;
      return { k, pig: apagada && k === 1 ? pig.map((x, c) => 0.55 * x + 0.45 * (c < 3 ? pig[(c + 2) % 3] : 0)) : pig };
    }));
  } else montar(v0, Array.isArray(salvo.feitas) ? salvo.feitas : []);

  const modo = {
    id: 'vitral',
    get mundo() { return S.mundo; },
    janela: [-6.6, -1, 6.6, 20.6],
    campoJanela: [-6.8, -1.2, 6.8, 19.9],
    eventos,
    desenho: { cenario: desenharCenario, fundo: desenharFundo, topo: desenharTopo },
    botoes: { servir: { nome: T.despejar }, ralo: { nome: T.esvaziar }, derreter: { svg: SVG_DERRETER, nome: T.derreter } },
    passo(dt) {
      const m = S.mundo;
      S.tempo += dt;
      if (S.pronto) {
        const t0 = S.pronto.t;
        S.pronto.t += dt;
        if (S.pronto.t >= T_PRONTO) { montar((S.v + 1) % VITRAIS.length); return; }
        // festa: palmas e faiscas pela moldura
        if (t0 < 0.7 && S.pronto.t >= 0.7) eventos.push({ tipo: 'som', nome: 'palmas' });
        if (Math.floor(t0 / 0.3) !== Math.floor(S.pronto.t / 0.3) && S.pronto.t < T_PRONTO - 1) {
          const pts = [];
          const base = S.pronto.t * 2.3;
          for (let j = 0; j < 5; j++) {
            const a = base + (j * Math.PI * 2) / 5;
            pts.push(Math.cos(a) * (R + 0.9), YC + Math.sin(a) * (R + 0.9));
          }
          eventos.push({ tipo: 'faiscas', pts });
        }
      }
      if (S.demo && S.demo.length && Math.floor((S.tempo - dt) / 0.14) !== Math.floor(S.tempo / 0.14)) pingar(S.demo.shift());
      if (S.botSolta > 0) { S.botSolta -= dt; if (S.botSolta <= 0) S.pingando = -1; }
      if (S.pingando >= 0) {
        S.tPingo -= dt;
        if (S.tPingo <= 0) { pingar(S.pingando); S.tPingo = TPINGO; }
      }
      if (S.despejo) avancarDespejo(dt);
      // antes da fisica: nas pecas o desenganchar nao age (raio0 enorme; pecas concavas como a
      // agua em volta do peixe teriam o centro do lado de fora) e as prontas dormem
      for (const s of m.slimes) {
        if (!s.ativo) continue;
        const k = s.dados.peca ?? -1;
        if (k < 0) continue;
        s.raio0 = 50;
        const P = S.pecas[k];
        // enchendo, o goo vem quente: escoa e se molda na peca (assenta ao esfriar)
        if (P && P.estado === 'enchendo') { s.estado = 'calor'; s.tEstado = 0.6; }
        if (P && P.dorme) {
          if (!s.dormindo) {
            s.dormindo = true;
            for (let a = m.iniSl[s.idx]; a < m.iniSl[s.idx + 1]; a++) { const i = m.membros[a]; m.vx[i] = 0; m.vy[i] = 0; }
          }
          s.tParado = 9;
        }
      }
      m.avancar(4);
      m.medir(dt);
      // as gotas se juntam so com as da mesma peca (ou do copo); a peca pronta nao junta mais
      juntarGoo(m, (a, b) => (a.dados.peca ?? -1) === (b.dados.peca ?? -1) && !!a.dados.vai === !!b.dados.vai
        && !((a.dados.peca ?? -1) >= 0 && S.pecas[a.dados.peca].estado === 'cheia'));
      difundir(m, dt, { taxa: 3 });
      // a cor do copo uniformiza depressa (pintura calma: nao precisa sovar); conserva o pigmento
      const f = 1 - Math.exp(-1.1 * dt);
      for (const s of slimesDe(-1)) {
        if (s.n < 2 * GOTA_N) continue;
        const med = pigmentoMedio(m, s);
        for (let a = m.iniSl[s.idx]; a < m.iniSl[s.idx + 1]; a++) {
          const i = m.membros[a];
          for (let c = 0; c < 4; c++) m.pig[i * 4 + c] += (med[c] - m.pig[i * 4 + c]) * f;
        }
      }
      // o que caiu fora do mundo some
      const fora = [];
      for (let i = 0; i < m.n; i++) if (m.y[i] < -3 || m.y[i] > 22 || m.x[i] < -8 || m.x[i] > 8) fora.push(i);
      if (fora.length) m.removerParticulas(fora);
      // depois da fisica: rosto do tamanho da peca, no polo dela; o do copo pequeno
      for (const s of m.slimes) {
        if (!s.ativo) continue;
        const k = s.dados.peca ?? -1;
        if (s.dados.exprT > 0) { s.dados.exprT -= dt; if (s.dados.exprT <= 0) { s.dados.exprT = 0; s.dados.expr = ''; } }
        if (k < 0) {
          if (s.n > 20) {
            s.raio0 = Math.min(s.raio0, 0.95);
            s.dados.semRosto = false;
            s.dados.hex = hexDaMistura(pigmentoMedio(m, s));
          }
          continue;
        }
        const P = S.pecas[k];
        if (!P || P.estado !== 'cheia') { s.dados.semRosto = true; s.raio0 = 0.6; continue; }
        s.raio0 = P.rosto / 0.9;
        s.cx = P.polo[0];
        s.cy = P.polo[1];
        if (!s.dados.expr) s.dados.expr = P.acesa ? 'contente' : 'chorinho';
      }
      for (const P of S.pecas) {
        if (P.estado === 'cheia' && !P.dorme && P.tDorme > 0) { P.tDorme -= dt; if (P.tDorme <= 0) P.dorme = 1; }
      }
      S.tMed -= dt;
      if (S.tMed <= 0) { medirCopo(); S.tMed = 0.1; }
      if (!ensinado && S.despejos > 0 && S.pecas.some((P) => P.estado === 'cheia' && P.acesa)) ensinado = true;
    },
    apontar(x, y, fase) {
      if (fase === 'mover') { S.hover = [x, y]; S.tHover = S.tempo; return; }
      if (fase === 'cima') { S.pingando = -1; return; }
      if (fase !== 'baixo' || S.pronto) return;
      S.hover = [x, y];
      S.tHover = S.tempo;
      const b = bicoEm(x, y);
      // a primeira gota sai no toque (um toque rapido, que solta antes do quadro seguinte, tambem pinga)
      if (b >= 0) { S.pingando = b; S.botSolta = 0; pingar(b); S.tPingo = TPINGO; return; }
      const k = pecaEm(x, y);
      if (k >= 0) { tocarPeca(k); return; }
      // cutucar o copo
      if (y < COPO.altura + 0.5 && Math.abs(x) < 3.2) {
        S.mundo.puxar(x, y, 1.1, 0, 7, 0.45);
        for (const s of slimesDe(-1)) if (s.n > 20) { s.dados.expr = 'susto'; s.dados.exprT = 0.6; }
        eventos.push({ tipo: 'pouso', x, y, forca: 0.5 });
      }
    },
    tecla(codigo, baixo) {
      const m = /^(?:Digit|Numpad)([1-4])$/.exec(codigo);
      if (m) {
        const k = Number(m[1]) - 1;
        if (baixo) { S.pingando = k; S.botSolta = 0; pingar(k); S.tPingo = TPINGO; } else if (S.pingando === k) S.pingando = -1;
        return;
      }
      if (!baixo || S.pronto) return;
      if (codigo === 'Enter' || codigo === 'Space' || codigo === 'NumpadEnter') {
        const P = S.pecas[S.sel];
        if (P && P.estado === 'vazia') despejar(); else if (P && P.estado === 'cheia') tocarPeca(P.k);
      } else if (codigo === 'Backspace') ralo();
      else if (codigo === 'Delete' || codigo === 'KeyX') derreter(S.sel);
      else if (codigo === 'ArrowRight' || codigo === 'ArrowDown' || codigo === 'Tab') { S.sel = (S.sel + 1) % S.pecas.length; medirCopo(); }
      else if (codigo === 'ArrowLeft' || codigo === 'ArrowUp') { S.sel = (S.sel - 1 + S.pecas.length) % S.pecas.length; medirCopo(); }
    },
    poder(id) {
      if (S.pronto) return;
      if (id === 'servir') { const P = S.pecas[S.sel]; if (P && P.estado === 'vazia') despejar(); }
      else if (id === 'ralo') ralo();
      else if (id === 'derreter') derreter(S.sel);
    },
    bot() {
      if (S.pronto) return;
      medirCopo();
      let P = S.pecas[S.sel];
      // peca apagada: derrete e refaz; acesa ou enchendo: a proxima vazia
      if (P && P.estado === 'cheia' && !P.acesa) { derreter(P.k); return; }
      if (!P || P.estado !== 'vazia') {
        const k = proxima(S.sel);
        if (S.pecas[k].estado === 'vazia' && k !== S.sel) { S.sel = k; medirCopo(); }
        P = S.pecas[S.sel];
        if (P.estado !== 'vazia') return;
      }
      if (S.despejo) return;
      // espera as gotas pousarem antes de medir de novo
      if (slimesDe(-1).some((s) => s.dados.gota && s.vy < -1.5)) return;
      if (S.media && S.dE <= BOT_DESPEJA) { despejar(); return; }
      if (S.dica < 0) {
        if (S.media && S.dE <= ACENDE) { despejar(); return; }
        ralo();
        return;
      }
      pingar(S.dica);
    },
    hud() {
      const P = S.pecas[S.sel];
      let atual = '#ffffff';
      let dE = 99;
      let seta = '→';
      if (P && P.estado !== 'vazia') { atual = P.hex || '#ffffff'; dE = P.dE; seta = P.estado === 'cheia' ? (P.acesa ? '✓' : '✗') : '…'; }
      else if (S.media) { atual = hexDaMistura(S.media); dE = S.dE; }
      const est = estrelas(dE);
      const pct = Math.max(0, Math.min(1, 1 - dE / 30));
      // as estrelas das acesas do vitral da vez (no pronto ja foram para o total)
      const feitas = S.pronto ? 0 : S.pecas.reduce((a, Q) => a + (Q.acesa ? Q.est : 0), 0);
      const vazia = P && P.estado === 'vazia';
      return {
        pontos: '★ ' + (total + feitas),
        recorde: (lang === 'pt' ? 'Vitral ' : lang === 'es' ? 'Vitral ' : 'Window ') + (S.v + 1) + '/' + VITRAIS.length,
        metaHtml: `<div class="pedido proto"><i class="alvo" title="${P ? nomeDe(P.cor, lang) : ''}" style="background:${P ? P.hexAlvo : '#fff'}"></i>`
          + `<span class="seta">${seta}</span><i class="atual" style="background:${atual}"></i>`
          + `<div class="medidor"><b style="width:${(pct * 100).toFixed(0)}%"></b></div>`
          + `<span class="est">${'★'.repeat(est)}${'☆'.repeat(3 - est)}</span></div>`,
        poderes: [
          { id: 'servir', ativo: !!(vazia && S.media && S.dE <= ACENDE && !S.despejo) },
          { id: 'ralo' },
          { id: 'derreter', oculto: !(P && P.estado === 'cheia') || !!S.pronto },
        ],
      };
    },
    visual() {
      const P = S.pecas[S.sel];
      const D = S.despejo;
      const vazia = P && P.estado === 'vazia';
      // para onde todos olham: o mouse (se andou ha pouco), o jorro, a peca escolhida
      let olhar = P ? P.polo : null;
      if (D) olhar = S.pecas[D.k].polo;
      if (S.hover && S.tempo - S.tHover < 1.5) olhar = S.hover;
      // onboarding: a mao no bico da dica, depois na peca
      let mao = null;
      let dica = null;
      if (!ensinado && !S.pronto && !D && vazia) {
        if (!S.media && S.dica >= 0 && S.despejos === 0) {
          mao = { x: BICOS[S.dica].x, y: Y_BICO + 0.2, amplitude: 0, tecla: false, toque: true };
          dica = { x: 0, y: 1.3, texto: T.pingue };
        } else if (S.media && S.dE <= ACENDE && S.despejos === 0) {
          mao = { x: P.polo[0], y: P.polo[1] - 0.6, amplitude: 0, tecla: false, toque: true };
          dica = { x: P.polo[0], y: P.polo[1] + 1.1, texto: T.toque };
        }
      }
      if (!dica && !S.pronto && P && P.estado === 'cheia' && !P.acesa && S.pecas.every((Q) => Q.estado !== 'vazia')) {
        dica = { x: P.polo[0], y: P.polo[1] + 1.1, texto: T.refazer };
      }
      let jorro = null;
      if (D) {
        const Q = S.pecas[D.k];
        const L = Q.tamanhos[0].lugares;
        const alvo = L.length ? L[0] : Q.polo;
        jorro = { x0: 0, y0: 1.6, x1: alvo[0], y1: alvo[1], cor: D.hex, t: D.t, fim: D.fim };
      }
      return {
        potes: [{ idx: [0, 1, 2], cesto: { estilo: 'vidro' } }],
        bicos: BICOS.map((b, k) => ({ x: b.x, y: Y_BICO, cor: hexDaMistura(b.pig), ativo: S.pingando === k, dica: S.dica === k && vazia && !D && !S.pronto })),
        olhar,
        mao,
        vitral: { cx: 0, cy: YC, R, v: S.v, pecas: S.pecas, sel: S.sel, pronto: S.pronto ? S.pronto.t : -1, tempo: S.tempo },
        copo: COPO,
        jorro,
        dica,
        festa: S.pronto ? { t: S.pronto.t, dur: T_PRONTO, texto: T.pronto, nome: T.nomes[S.v] || '', est: S.pronto.est } : null,
        teclas: !o.toque,
        galeria: galeria.slice(-4).map((g) => ({ geo: VITRAIS[g.v] ? VITRAIS[g.v].pecas : [], cores: g.cores })),
      };
    },
    reiniciar() {
      for (const s of S.mundo.slimes) if (s.ativo) S.mundo.remover(s);
      montar(S.v);
    },
    salvar() {
      return {
        v: S.v, total, galeria, ensinado,
        feitas: S.pecas.filter((P) => P.estado === 'cheia').map((P) => ({ k: P.k, pig: P.pig })),
      };
    },
    /** Estado interno (testes e depuracao). */
    get estado() { return S; },
  };
  return modo;
}

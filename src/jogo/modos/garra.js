// Prototipo #44: Garra de Squishy. Uma maquina de garra cheia de squishies de gelatina: mirar,
// descer, fechar e torcer. A pegada e so fisica (as pincas sao paredes-capsula que andam com
// moverParede; o squishy amassa entre elas e pode escorregar no caminho), sem sorteio escondido.
// O premio cai na rampa e vai para o album de 12 (8 comuns, 3 raros com brilho, 1 lendario de
// ouro); repetido vira ficha. As fichas so saem de jogar (nunca compra).
// Logica pura: sem DOM, sem relogio, sem Math.random (o tempo entra por dt).

import { criarMundo, R_PART } from '../../fisica/mundo.js';
import { material } from '../../fisica/materiais.js';
import { hexDaMistura } from '../../cor/km.js';
import { criarRng } from '../../core/rng.js';
import { sentir } from '../humor.js';
import { DESENHO_GARRA } from '../../render/prototipos/garra.js';

const GRAU = Math.PI / 180;

/** Caixa de vidro (eixo das paredes): x das paredes, chao, divisoria da rampa, teto e bandeja. */
export const CAIXA = Object.freeze({ esq: -6.6, dir: 6.6, div: 2.0, chao: 0, topoDiv: 6.2, teto: 15.2, bandeja: -2.2, r: 0.22 });

/**
 * Garra: cabeca (capsula deitada) e duas pincas, cada uma uma haste que sai da dobradica e uma
 * ponta virada para dentro. Angulos em graus a partir da vertical (positivo abre para fora).
 *   casa      y da cabeca parada no alto
 *   descer    u/s na descida; subir e levar idem
 *   lado      u/s da mira; acel u/s2 de qualquer movimento do carrinho
 */
export const GARRA = {
  meia: 0.55,
  rCabeca: 0.3,
  dobra: 0.45,
  haste: 2.5,
  ponta: 1.0,
  r: 0.17,
  aberta: 50,
  fechada: 22,
  curva: 64,
  casa: 12.7,
  descer: 5.5,
  /** particulas encostadas nas pontas que seguram a descida */
  travaPontas: 16,
  subir: 3.4,
  lado: 7,
  levar: 4.6,
  acel: 14,
  tFecha: 0.6,
  tSegura: 0.35,
  /** particulas apertadas por dentro das pincas que travam o fechamento (a forca da mola) */
  aperto: 19,
  tAbre: 0.35,
  tSolta: 1.1,
  mira: 10,
  /** x do carrinho: o limite da mira (as pincas abertas nao batem no vidro) e o da rampa */
  xMin: -3.8,
  xMax: 3.8,
};

/** Indices das paredes: o contorno de vidro (0..4), a divisoria (5), o teto (6) e a garra (7..11). */
const P_DIV = 5;
const P_GARRA = 7;

/**
 * Album: 8 comuns, 3 raros (brilho e estampa do shader) e o lendario de ouro. `n` = particulas
 * (40 a 60: o grande pesa mais e escorrega mais; os raros sao grandes).
 */
export const SQUISHIES = Object.freeze([
  { id: 'morango', nome: 'Morango', raridade: 0, pig: [0, 0.56, 0.22, 0], textura: 1, n: [44, 54] },
  { id: 'menta', nome: 'Menta', raridade: 0, pig: [0.34, 0, 0.3, 0], textura: 0, n: [40, 50] },
  { id: 'mirtilo', nome: 'Mirtilo', raridade: 0, pig: [0.62, 0.06, 0, 0], textura: 0, n: [46, 56] },
  { id: 'limao', nome: 'Limão', raridade: 0, pig: [0.06, 0, 0.74, 0], textura: 0, n: [40, 50] },
  { id: 'pessego', nome: 'Pêssego', raridade: 0, pig: [0, 0.24, 0.5, 0], textura: 1, n: [42, 52] },
  { id: 'uva', nome: 'Uva', raridade: 0, pig: [0.34, 0.56, 0, 0], textura: 0, n: [46, 58] },
  { id: 'chiclete', nome: 'Chiclete', raridade: 0, pig: [0, 0.42, 0, 0], textura: 2, n: [42, 54] },
  { id: 'nuvem', nome: 'Algodão-doce', raridade: 0, pig: [0.3, 0, 0, 0], textura: 2, n: [44, 56] },
  { id: 'arcoiris', nome: 'Arco-íris', raridade: 1, pig: [0.05, 0.05, 0.05, 0], textura: 3, n: [50, 60] },
  { id: 'purpurina', nome: 'Purpurina', raridade: 1, pig: [0.12, 0.34, 0, 0], textura: 6, n: [48, 58] },
  { id: 'galaxia', nome: 'Galáxia', raridade: 1, pig: [0.46, 0.5, 0, 0.12], textura: 5, n: [50, 60] },
  { id: 'ouro', nome: 'Pepita de Ouro', raridade: 2, pig: [0, 0.14, 0.86, 0], textura: 8, n: [58, 60] },
]);
export const RARIDADE = Object.freeze(['Comum', 'Raro', 'Lendário']);
/** Chance de cada raridade nascer na maquina (o que esta la dentro se ve: nada e sorteado na pegada). */
const PESO = [0.8, 0.17, 0.03];
const CHEIA = 11;
const MINIMO = 6;
const FICHAS_INICIO = 10;
const RECARGA = 5;
/** Botao Pegar do painel (mundo): quem toca nele pega. */
export const BOTAO = Object.freeze({ x: -2.2, y: -1.35, r: 0.95 });
/** Escotilha de reabastecer (canto de cima, a esquerda). */
const ESCOTILHA = { x: -4.5, y: 12.9 };

/** Squishy de gelatina "slow rising": amassa na garra e volta devagar ao formato (memoria 1/s). */
export const MAT = material('gelatina', { k: 0.022, epsY: 1.2, lam: 0.5, mem: 1 });

/** @param {number} a @param {number} b @param {number} t */
const mix = (a, b, t) => a + (b - a) * t;
/** @param {number} v @param {number} a @param {number} b */
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/**
 * Capsulas da garra (cabeca, haste e ponta da esquerda, haste e ponta da direita).
 * @param {number} hx @param {number} hy cabeca @param {number} ab abertura 0 (fechada) .. 1
 */
export function capsulasGarra(hx, hy, ab) {
  const G = GARRA;
  const th = mix(G.fechada, G.aberta, ab) * GRAU;
  const caps = [{ ax: hx - G.meia, ay: hy, bx: hx + G.meia, by: hy, r: G.rCabeca, oculta: true }];
  for (const lado of [-1, 1]) {
    const ax = hx + lado * G.dobra;
    const ay = hy - 0.12;
    const kx = ax + lado * Math.sin(th) * G.haste;
    const ky = ay - Math.cos(th) * G.haste;
    const tp = th - G.curva * GRAU;
    const tx = kx + lado * Math.sin(tp) * G.ponta;
    const ty = ky - Math.cos(tp) * G.ponta;
    caps.push({ ax, ay, bx: kx, by: ky, r: G.r, oculta: true }, { ax: kx, ay: ky, bx: tx, by: ty, r: G.r, oculta: true });
  }
  return caps;
}

/** Distancia ao quadrado do ponto a capsula (so o eixo). */
function dist2Seg(x, y, c) {
  const ex = c.bx - c.ax;
  const ey = c.by - c.ay;
  const l2 = ex * ex + ey * ey;
  let t = l2 > 0 ? ((x - c.ax) * ex + (y - c.ay) * ey) / l2 : 0;
  t = clamp(t, 0, 1);
  const dx = x - c.ax - t * ex;
  const dy = y - c.ay - t * ey;
  return dx * dx + dy * dy;
}

/** SVG dos botoes do HUD (traco branco com contorno de tinta, viewBox 24). */
const SVG_PEGAR = '<svg viewBox="0 0 24 24"><g class="t"><path d="M12 2v5M7.5 8h9M9 8c-4 3.5-4 8.5.5 12M15 8c4 3.5 4 8.5-.5 12"/></g><path d="M12 2v5M7.5 8h9M9 8c-4 3.5-4 8.5.5 12M15 8c4 3.5 4 8.5-.5 12"/></svg>';
const SVG_FICHAS = '<svg viewBox="0 0 24 24"><g class="t"><circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/></g><circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/></svg>';

/** @param {{ semente?: number, salvo?: any, toque?: boolean, lang?: string }} [o] */
export function criarModo(o = {}) {
  const salvo = o.salvo || {};
  const semente = o.semente || 5;
  /** @type {any[]} */
  const eventos = [];
  /** @type {Record<string, number>} quantos de cada squishy o album tem */
  const album = { ...(salvo.album || {}) };
  let fichas = Number.isFinite(salvo.fichas) ? salvo.fichas : FICHAS_INICIO;
  let premios = salvo.premios || 0;
  let tentativas = salvo.tentativas || 0;
  let viuTutorial = !!salvo.tutorial;
  /** @type {any} */
  let S = null;
  let partida = 0;

  function montar() {
    partida++;
    const rng = criarRng(semente * 7919 + partida * 104729);
    const m = criarMundo({ semente: semente + partida, limites: [-9, -6, 9, 19] });
    const C = CAIXA;
    // contorno de vidro (do topo esquerdo ao topo direito, gruda do lado de dentro): parede
    // esquerda, chao, a parede da rampa descendo, a bandeja do premio e a parede direita
    const caps = [
      { ax: C.esq, ay: C.teto, bx: C.esq, by: C.chao, r: C.r, gruda: 1 },
      { ax: C.esq, ay: C.chao, bx: C.div, by: C.chao, r: C.r, gruda: 1 },
      { ax: C.div, ay: C.chao, bx: C.div, by: C.bandeja, r: C.r, gruda: 1 },
      { ax: C.div, ay: C.bandeja, bx: C.dir, by: C.bandeja + 0.6, r: C.r, gruda: 1 },
      { ax: C.dir, ay: C.bandeja + 0.6, bx: C.dir, by: C.teto, r: C.r, gruda: 1 },
      // divisoria baixa da rampa (acrilico), gruda do lado da pilha
      { ax: C.div, ay: C.chao, bx: C.div, by: C.topoDiv, r: C.r, gruda: 1 },
      // teto (so colide)
      { ax: C.esq, ay: C.teto, bx: C.dir, by: C.teto, r: C.r, oculta: true },
      ...capsulasGarra(GARRA.xMax, GARRA.casa, 1),
    ];
    m.definirParedes(caps);
    S = {
      m, rng, t: 0,
      /** mira | desce | fecha | sobe | leva | abre */
      fase: 'mira',
      tFase: 0,
      hx: GARRA.xMax,
      hy: GARRA.casa,
      ab: 1,
      vx: 0,
      vy: 0,
      alvoX: GARRA.xMax,
      teclas: { esq: false, dir: false },
      arrastando: false,
      /** contagem da mira (null = ainda nao comecou: a ficha entra no primeiro gesto) */
      tMira: /** @type {number|null} */ (null),
      /** os squishies que a garra levantou (o "escorregou!" e de quem sai daqui antes de abrir) */
      pegos: /** @type {any[]} */ ([]),
      /** o primeiro deles (ou null) */
      levando: /** @type {any} */ (null),
      /** y da cabeca quando a garra fechou */
      yFechou: 0,
      cartao: /** @type {any} */ (null),
      manchas: /** @type {any[]} */ ([]),
      fila: 0,
      tFila: 0,
      /** onboarding: 0 mao arrastando, 1 mao no botao Pegar, 2 visto */
      tutorial: viuTutorial ? 2 : 0,
      tTutorial: 0,
      ciclos: 0,
      /** particulas que a rede devolveu para dentro do vidro (o teste vigia: quase nunca) */
      puxadas: 0,
    };
    // a maquina cheia: um de cada vez, caindo em colunas desencontradas (ninguem nasce encostado
    // no vidro nem no vizinho: a particula que nasce do outro lado da parede fica la), e assenta
    // antes do primeiro quadro
    const xs = [-4.5, -1.0, -2.75, -4.6, -0.9, -2.7, -4.5, -1.0, -2.8, -4.6, -1.0];
    for (let k = 0; k < CHEIA; k++) {
      criarSquishy(sortear(), xs[k % xs.length] + (rng() - 0.5) * 0.3, 11.2, 0, -4);
      for (let f = 0; f < 24; f++) { m.avancar(4); m.medir(1 / 60); }
    }
    for (let f = 0; f < 90; f++) { m.avancar(4); m.medir(1 / 60); }
  }

  /** Sorteia o tipo do proximo squishy (pela raridade). */
  function sortear() {
    const r = S.rng();
    const rar = r < PESO[2] ? 2 : r < PESO[2] + PESO[1] ? 1 : 0;
    const lista = SQUISHIES.filter((q) => q.raridade === rar);
    return lista[Math.floor(S.rng() * lista.length)];
  }

  /** @param {any} tipo @param {number} x @param {number} y */
  function criarSquishy(tipo, x, y, vx = 0, vy = 0) {
    const n = Math.round(mix(tipo.n[0], tipo.n[1], S.rng()));
    const s = S.m.criarSlime({ x, y, n, material: MAT, pigmento: tipo.pig, vx, vy });
    if (!s) return null;
    s.dados.tipo = tipo;
    s.dados.hex = hexDaMistura(tipo.pig);
    if (tipo.textura) { s.dados.textura = tipo.textura; s.dados.texturaT = 1; }
    s.dados.aderT = 0;
    return s;
  }

  /** Squishies na maquina (fora da rampa). */
  function naMaquina() {
    return S.m.slimes.filter((s) => s.ativo && !s.dados.premio);
  }

  // ------------------------------------------------------------------ garra

  /** Leva as capsulas da garra para a pose de agora (andando em 1/60 s). */
  function moverGarra() {
    const caps = capsulasGarra(S.hx, S.hy, S.ab);
    const ps = S.m.paredes;
    let mudou = false;
    for (let k = 0; k < caps.length; k++) {
      const p = ps[P_GARRA + k];
      const c = caps[k];
      if (Math.abs(p.ax - c.ax) + Math.abs(p.ay - c.ay) + Math.abs(p.bx - c.bx) + Math.abs(p.by - c.by) > 1e-7) { mudou = true; break; }
    }
    if (!mudou) return;
    caps.forEach((c, k) => S.m.moverParede(P_GARRA + k, c, 1 / 60));
  }

  /**
   * Contato com a garra: particulas encostadas na cabeca (por baixo), nas pontas e nas hastes,
   * e quantas de cada slime estao entre as pincas.
   */
  function contatoGarra() {
    const m = S.m;
    const ps = m.paredes;
    const cab = ps[P_GARRA];
    const out = { cabeca: 0, pontas: 0, hastes: 0, dentro: 0, chao: false };
    const lim = (r) => (r + R_PART * 1.1 + 0.05) * (r + R_PART * 1.1 + 0.05);
    const lc = lim(cab.r);
    const lp = lim(GARRA.r);
    let ymin = Infinity;
    for (let k = 1; k <= 4; k++) { const p = ps[P_GARRA + k]; ymin = Math.min(ymin, p.ay, p.by); }
    if (ymin - GARRA.r < CAIXA.chao + CAIXA.r + 0.08) out.chao = true;
    const x0 = S.hx - 3;
    const x1 = S.hx + 3;
    const y0 = ymin - 0.6;
    const y1 = S.hy + 0.8;
    for (let i = 0; i < m.n; i++) {
      const x = m.x[i];
      const y = m.y[i];
      if (x < x0 || x > x1 || y < y0 || y > y1) continue;
      if (y < cab.ay && dist2Seg(x, y, cab) < lc) out.cabeca++;
      if (dist2Seg(x, y, ps[P_GARRA + 2]) < lp || dist2Seg(x, y, ps[P_GARRA + 4]) < lp) out.pontas++;
      const he = dist2Seg(x, y, ps[P_GARRA + 1]) < lp || dist2Seg(x, y, ps[P_GARRA + 2]) < lp;
      const hd = dist2Seg(x, y, ps[P_GARRA + 3]) < lp || dist2Seg(x, y, ps[P_GARRA + 4]) < lp;
      if (dist2Seg(x, y, ps[P_GARRA + 1]) < lp || dist2Seg(x, y, ps[P_GARRA + 3]) < lp) out.hastes++;
      // por dentro: do lado do eixo da garra
      if ((he && x > ps[P_GARRA + 1].bx - 0.05) || (hd && x < ps[P_GARRA + 3].bx + 0.05)) out.dentro++;
    }
    return out;
  }

  /** Os squishies entre as pincas (centro dentro da garra, da cabeca ate um pouco abaixo das pontas). */
  function naGarra() {
    const ps = S.m.paredes;
    const yb = Math.min(ps[P_GARRA + 2].by, ps[P_GARRA + 4].by);
    return naMaquina().filter((s) => s.cy <= S.hy && s.cy >= yb - 0.5 && Math.abs(s.cx - S.hx) <= 1.6);
  }

  /** @param {string} f */
  function irPara(f) {
    S.fase = f;
    S.tFase = 0;
  }

  /** Aperta o Pegar: a ficha entra e a garra desce. */
  function pegar() {
    if (!S || S.fase !== 'mira') return false;
    if (fichas <= 0) {
      eventos.push({ tipo: 'som', nome: 'recusa' });
      return false;
    }
    fichas--;
    tentativas++;
    S.tMira = null;
    if (S.tutorial < 2) { S.tutorial = 2; viuTutorial = true; }
    irPara('desce');
    eventos.push({ tipo: 'som', nome: 'soltar' });
    // o bot (e quem joga) lembra de quem ja tentou: cada squishy embaixo da garra conta uma
    let alvo = null;
    for (const s of naMaquina()) if (Math.abs(s.cx - S.hx) < 1.2 && (!alvo || s.topo > alvo.topo)) alvo = s;
    if (alvo) alvo.dados.tentativas = (alvo.dados.tentativas || 0) + 1;
    // os squishies embaixo da garra ficam com medo
    for (const s of naMaquina()) {
      if (Math.abs(s.cx - S.hx) < 2.2) { s.dados.expr = 'medo'; s.dados.exprT = 1.6; }
    }
    return true;
  }

  function recarregar() {
    if (fichas > 0) return false;
    fichas += RECARGA;
    eventos.push({ tipo: 'som', nome: 'gotas' });
    eventos.push({ tipo: 'texto', x: 0, y: 8, texto: `+${RECARGA} fichas`, cor: '#ffd23a', escala: 1.4 });
    return true;
  }

  /** Comeca a contagem da mira no primeiro gesto (com ficha). */
  function gesto() {
    if (S.fase === 'mira' && S.tMira === null && fichas > 0) S.tMira = GARRA.mira;
    if (S.tutorial === 0) { S.tutorial = 1; S.tTutorial = 0; }
  }

  /**
   * A mola da garra tem forca limitada: as pincas fecham mais devagar quanto mais o squishy
   * resiste (particulas apertadas por dentro) e param quando ele segura `GARRA.aperto`; se ele
   * amassa ou escorrega, a garra fecha mais um pouco. Nunca abre sozinha.
   * @param {number} dt
   */
  function mola(dt) {
    const c = contatoGarra();
    S.aperto = c.dentro;
    const f = Math.max(0, 1 - c.dentro / GARRA.aperto);
    S.ab = Math.max(0, S.ab - (f * dt) / GARRA.tFecha);
  }

  /** Um quadro da garra (antes da fisica). @param {number} dt */
  function passoGarra(dt) {
    const G = GARRA;
    S.tFase += dt;
    /** anda o carrinho na horizontal ate x com velocidade maxima v */
    const andarX = (x, v) => {
      const d = x - S.hx;
      const freio = Math.sqrt(2 * G.acel * Math.abs(d));
      const alvo = Math.sign(d) * Math.min(v, freio);
      S.vx += clamp(alvo - S.vx, -G.acel * dt, G.acel * dt);
      if (Math.abs(d) < 0.01 && Math.abs(S.vx) < 0.3) { S.hx = x; S.vx = 0; return true; }
      S.hx += S.vx * dt;
      return false;
    };
    const andarY = (y, v) => {
      const d = y - S.hy;
      const freio = Math.sqrt(2 * G.acel * Math.abs(d));
      const alvo = Math.sign(d) * Math.min(v, freio);
      S.vy += clamp(alvo - S.vy, -G.acel * dt, G.acel * dt);
      if (Math.abs(d) < 0.01 && Math.abs(S.vy) < 0.3) { S.hy = y; S.vy = 0; return true; }
      S.hy += S.vy * dt;
      return false;
    };
    switch (S.fase) {
      case 'mira': {
        if (S.teclas.esq || S.teclas.dir) S.alvoX = clamp(S.alvoX + (S.teclas.dir ? 1 : -1) * G.lado * dt, G.xMin, G.xMax);
        andarX(S.alvoX, G.lado);
        if (S.tMira !== null && fichas > 0) {
          S.tMira -= dt;
          if (S.tMira <= 0) pegar();
        }
        break;
      }
      case 'desce': {
        // o peso da garra empurra as pincas para baixo: a descida perde velocidade com o que as
        // pontas e a cabeca encostam e para quando a cabeca assenta, as pontas travam ou no fundo
        const c = contatoGarra();
        const resiste = c.cabeca / 3 + c.pontas / G.travaPontas;
        const parou = c.chao || resiste >= 1 || S.hy < 2.6;
        if (parou && S.tFase > 0.15) {
          S.vy = 0;
          S.yFechou = S.hy;
          irPara('fecha');
          eventos.push({ tipo: 'som', nome: 'pouso', forca: 0.4 });
        } else andarY(2.5, G.descer * Math.max(0.15, 1 - resiste));
        break;
      }
      case 'fecha': {
        mola(dt);
        if (S.tFase >= G.tFecha + G.tSegura) {
          irPara('sobe');
          for (const s of naGarra()) { s.dados.expr = 'susto'; s.dados.exprT = 0.8; }
        }
        break;
      }
      case 'sobe': {
        mola(dt);
        if (andarY(G.casa, G.subir) && S.tFase > 0.3) irPara('leva');
        break;
      }
      case 'leva': {
        mola(dt);
        if (andarX(G.xMax, G.levar) && S.tFase > 0.2) {
          irPara('abre');
          eventos.push({ tipo: 'som', nome: 'trocar' });
        }
        break;
      }
      case 'abre': {
        S.ab = Math.min(1, S.tFase / G.tAbre);
        if (S.tFase >= G.tAbre + G.tSolta) {
          S.ciclos++;
          S.alvoX = S.hx;
          irPara('mira');
          if (fichas <= 0) eventos.push({ tipo: 'texto', x: 0, y: 9, texto: 'Sem fichas: recarga grátis!', cor: '#ffd23a', escala: 1 });
        }
        break;
      }
      default:
        break;
    }
    moverGarra();
  }

  /**
   * Quem a garra levantou e quem escorregou dela no caminho (depois da fisica). Conta como pego
   * quem continua entre as pincas depois de a garra subir 1,2 u desde que fechou; sai da garra
   * antes de abrir = escorregou.
   */
  function vigiarPegada() {
    const subindo = S.fase === 'sobe' || S.fase === 'leva';
    const lista = subindo || S.fase === 'fecha' ? naGarra() : [];
    if (subindo && S.hy > S.yFechou + 1.2) {
      for (const q of lista) {
        if (q.dados.pego) continue;
        q.dados.pego = true;
        S.pegos.push(q);
      }
    }
    for (const q of S.pegos.slice()) {
      const saiu = !q.ativo || q.dados.premio || !lista.includes(q);
      if (!saiu && S.fase !== 'abre') continue;
      S.pegos.splice(S.pegos.indexOf(q), 1);
      q.dados.pego = false;
      if (!q.ativo || q.dados.premio) continue;
      q.ader = 1;
      q.dados.aderT = 2.5;
      if (S.fase === 'abre') continue;
      // escorregou no caminho
      q.dados.expr = 'susto';
      q.dados.exprT = 1.2;
      eventos.push({ tipo: 'texto', x: q.cx, y: q.cy + 1.6, texto: 'Escorregou!', cor: '#ffffff', escala: 1, grupo: 'garra' });
      eventos.push({ tipo: 'som', nome: 'choro' });
    }
    S.levando = S.pegos[0] || null;
    // quem esta na garra treme (o rosto do aperto vem do humor de base: amassado)
    for (const q of naMaquina()) q.dados.treme = S.fase !== 'mira' && lista.includes(q);
  }

  /** Aderencia: quem voa ou foi solto gruda no vidro e escorre devagar. @param {number} dt */
  function vigiarVidro(dt) {
    const m = S.m;
    const tocando = new Set();
    for (const [i, j, p] of m.contatos()) {
      if (p < 2) continue;
      tocando.add(i);
      tocando.add(j);
    }
    for (const s of naMaquina()) {
      const d = s.dados;
      const v2 = s.vx * s.vx + s.vy * s.vy;
      if (!d.pego && v2 > 36 && !tocando.has(s.idx)) { s.ader = 1; d.aderT = Math.max(d.aderT, 1.5); }
      if (d.aderT > 0) {
        d.aderT -= dt;
        if (tocando.has(s.idx) && d.aderT < 2.2) d.aderT = Math.min(d.aderT, 0.15);
        s.ader = d.aderT > 0 ? Math.min(1, d.aderT / 0.3) : 0;
      }
      // colado no vidro de lado: escorre devagar e deixa rastro
      d.vidro = false;
      if (s.ader > 0) {
        const lado = s.esq < CAIXA.esq + CAIXA.r + 0.45 ? -1 : s.dir > CAIXA.dir - CAIXA.r - 0.45 ? 1 : s.dir > CAIXA.div - CAIXA.r - 0.45 && s.cx < CAIXA.div && s.base < CAIXA.topoDiv ? 2 : 0;
        if (lado) {
          d.vidro = true;
          if (!d.colou) {
            d.colou = true;
            d.expr = 'amassado';
            d.exprT = 1.5;
            const x = lado < 0 ? CAIXA.esq : lado === 1 ? CAIXA.dir : CAIXA.div;
            eventos.push({ tipo: 'pouso', x, y: s.cy, forca: 0.7, cor: d.hex });
            eventos.push({ tipo: 'som', nome: 'splat' });
            // no ar (nao caiu em cima da pilha): o momento "grudou no vidro"
            if (!tocando.has(s.idx) && s.base > CAIXA.chao + 1) {
              eventos.push({ tipo: 'texto', x: x - (lado < 0 ? -2 : 2), y: s.cy + 1.4, texto: 'Grudou!', cor: '#ffffff', escala: 0.9, grupo: 'vidro' });
            }
          }
          // escorre como gosma na janela (uns 3 u/s para baixo, contra ~20 de queda livre)
          if (s.vy < -2.2) {
            const dv = Math.min(-2.2 - s.vy, 150 * dt);
            for (let a = m.iniSl[s.idx]; a < m.iniSl[s.idx + 1]; a++) m.vy[m.membros[a]] += dv;
          }
          // rastro de gosma no vidro enquanto escorre (lado: para onde o vidro fica)
          if ((d.tRastro = (d.tRastro || 0) - dt) <= 0 && Math.abs(s.vy) > 0.6) {
            d.tRastro = 0.06;
            const x = lado < 0 ? CAIXA.esq + CAIXA.r : lado === 1 ? CAIXA.dir - CAIXA.r : CAIXA.div - CAIXA.r;
            S.manchas.push({ x, y: s.cy, lado: lado < 0 ? -1 : 1, cor: d.hex, t: 0, r: s.raio0 });
            if (S.manchas.length > 120) S.manchas.shift();
          }
        }
      } else d.colou = false;
    }
    for (const k of S.manchas) k.t += dt;
    while (S.manchas.length && S.manchas[0].t > 7) S.manchas.shift();
  }

  /** O squishy que caiu na rampa: estoura no album. @param {number} dt */
  function vigiarRampa(dt) {
    for (const s of S.m.slimes) {
      if (!s.ativo) continue;
      const d = s.dados;
      if (!d.premio && s.cx > CAIXA.div + 0.1 && s.cy < CAIXA.topoDiv - 0.3) {
        d.premio = true;
        d.tPremio = 0;
        d.expr = 'feliz';
        d.exprT = 9;
      }
      if (!d.premio) continue;
      d.tPremio += dt;
      if (d.tPremio > 0.55 || (d.tPremio > 0.25 && s.base < CAIXA.bandeja + 1.2)) ganhar(s);
    }
  }

  /** @param {any} s */
  function ganhar(s) {
    const tipo = s.dados.tipo;
    const novo = !album[tipo.id];
    album[tipo.id] = (album[tipo.id] || 0) + 1;
    premios++;
    if (!novo) fichas++;
    const x = s.cx;
    const y = s.cy;
    S.m.remover(s);
    eventos.push({ tipo: 'estouro', x, y, cor: s.dados.hex });
    eventos.push({ tipo: 'brilhos', x, y: y + 0.5, cor: s.dados.hex });
    const pts = [];
    for (let k = 0; k < 10; k++) pts.push(x + Math.cos(k * 0.63) * 1.4, y + 0.8 + Math.sin(k * 0.63) * 1.4);
    eventos.push({ tipo: 'faiscas', pts });
    eventos.push({ tipo: 'som', nome: novo ? (tipo.raridade ? 'nivelNovo' : 'palmas') : 'gotas' });
    if (!novo) eventos.push({ tipo: 'texto', x: x - 1.5, y: y + 2.2, texto: '+1 ficha', cor: '#ffd23a', escala: 1, grupo: 'ficha' });
    eventos.push({ tipo: 'premio', id: tipo.id, novo, raridade: tipo.raridade });
    const n = SQUISHIES.filter((q) => album[q.id]).length;
    S.cartao = { tipo, hex: s.dados.hex, rotulo: RARIDADE[tipo.raridade], novo, t: 0, qtd: album[tipo.id], n, total: SQUISHIES.length };
    // album completo (a primeira vez): festa
    if (novo && n === SQUISHIES.length) {
      eventos.push({ tipo: 'som', nome: 'missao' });
      eventos.push({ tipo: 'texto', x: 0, y: 4.5, texto: 'Álbum completo!', cor: '#ffd23a', escala: 1.6 });
      for (const [dx, cor] of [[-3, '#ff7ad1'], [0, '#ffd23a'], [3, '#7ae8ff']]) eventos.push({ tipo: 'estouro', x: dx - 1, y: 11, cor });
    }
  }

  /** Reabastece pela escotilha quando sobram menos de MINIMO. @param {number} dt */
  function reabastecer(dt) {
    if (S.fila <= 0 && naMaquina().length < MINIMO) S.fila = CHEIA - naMaquina().length;
    if (S.fila <= 0) return;
    S.tFila -= dt;
    if (S.tFila > 0) return;
    // a garra longe da escotilha
    if (Math.abs(S.hx - ESCOTILHA.x) < 3.8 && S.hy > 8) { S.tFila = 0.3; return; }
    // espaco livre embaixo da escotilha
    for (const s of naMaquina()) if (s.topo > ESCOTILHA.y - 1.8 && Math.abs(s.cx - ESCOTILHA.x) < 2.4) { S.tFila = 0.4; return; }
    const s = criarSquishy(sortear(), ESCOTILHA.x, ESCOTILHA.y - 0.2, 1 + S.rng() * 2.5, -2);
    if (s) {
      s.dados.expr = 'feliz';
      s.dados.exprT = 1.2;
      eventos.push({ tipo: 'som', nome: 'soltar' });
    }
    S.fila--;
    S.tFila = 0.7;
  }

  /**
   * Rede de seguranca: a parede e uma capsula de dois lados, e a particula que passa do eixo dela
   * fica do lado de fora. Quem passou do vidro (ou do chao, fora da rampa) volta encostada na face
   * de dentro. Na pratica nao acontece (o teste conta).
   */
  function rede() {
    const m = S.m;
    const C = CAIXA;
    const lim = C.r + R_PART;
    const lista = [];
    const pts = [];
    for (let i = 0; i < m.n; i++) {
      let x = m.x[i];
      let y = m.y[i];
      const naRampa = x > C.div;
      const fora = x < C.esq || x > C.dir || y > C.teto || (naRampa ? y < C.bandeja : y < C.chao);
      if (!fora) continue;
      x = clamp(x, C.esq + lim, C.dir - lim);
      y = clamp(y, (x > C.div ? C.bandeja + 0.6 : C.chao) + lim, C.teto - lim);
      lista.push(i);
      pts.push(x, y);
    }
    if (!lista.length) return;
    m.reposicionar(lista, pts);
    S.puxadas += lista.length;
  }

  /** Humor de base e os passageiros com prazo. @param {number} dt */
  function humores(dt) {
    const viz = new Map();
    for (const [i, j, p] of S.m.contatos()) {
      if (p < 2) continue;
      viz.set(i, (viz.get(i) || 0) + 1);
      viz.set(j, (viz.get(j) || 0) + 1);
    }
    for (const s of S.m.slimes) {
      if (!s.ativo) continue;
      const d = s.dados;
      if (d.exprT > 0) { d.exprT -= dt; if (d.exprT <= 0) { d.expr = ''; d.exprT = 0; } }
      if (!(d.exprT > 0)) sentir(s, viz.get(s.idx) || 0, dt);
    }
  }

  montar();

  const modo = {
    id: 'garra',
    get mundo() { return S.m; },
    janela: [-8.1, -4.7, 8.1, 18.6],
    campoJanela: [-8.5, -5, 8.5, 19],
    eventos,
    desenho: DESENHO_GARRA,
    botoes: {
      pegar: { svg: SVG_PEGAR, nome: 'Pegar' },
      fichas: { svg: SVG_FICHAS, nome: '+5 fichas' },
    },
    /** estado da maquina para os testes e os prints (nao e `S`: o main.js le `modo.S` como o do soltar) */
    get estado() { return S; },
    passo(dt) {
      S.t += dt;
      if (S.tutorial === 1) S.tTutorial += dt;
      passoGarra(dt);
      reabastecer(dt);
      S.m.avancar(4);
      S.m.medir(dt);
      rede();
      vigiarPegada();
      vigiarVidro(dt);
      vigiarRampa(dt);
      humores(dt);
      if (S.cartao) { S.cartao.t += dt; if (S.cartao.t > 2.4) S.cartao = null; }
    },
    apontar(x, y, fase) {
      if (fase === 'baixo') {
        const dx = x - BOTAO.x;
        const dy = y - BOTAO.y;
        if (dx * dx + dy * dy < BOTAO.r * BOTAO.r * 1.6) {
          if (fichas <= 0) recarregar(); else pegar();
          return;
        }
        if (S.fase !== 'mira') return;
        S.arrastando = true;
        gesto();
        S.alvoX = clamp(x, GARRA.xMin, GARRA.xMax);
        return;
      }
      if (fase === 'mover' && S.arrastando && S.fase === 'mira') {
        S.alvoX = clamp(x, GARRA.xMin, GARRA.xMax);
        return;
      }
      if (fase === 'cima') S.arrastando = false;
    },
    tecla(codigo, baixo) {
      if (codigo === 'ArrowLeft' || codigo === 'KeyA') { S.teclas.esq = baixo; if (baixo) gesto(); }
      else if (codigo === 'ArrowRight' || codigo === 'KeyD') { S.teclas.dir = baixo; if (baixo) gesto(); }
      else if (baixo && (codigo === 'Space' || codigo === 'Enter' || codigo === 'ArrowDown' || codigo === 'KeyS')) {
        if (fichas <= 0) recarregar(); else pegar();
      }
    },
    poder(id) {
      if (id === 'pegar') pegar();
      else if (id === 'fichas') recarregar();
    },
    /** Mira no squishy mais alcancavel (no alto da pilha, perto da rampa) e pega. */
    bot() {
      if (fichas <= 0) { recarregar(); return; }
      if (S.fase !== 'mira') return;
      const lista = naMaquina().filter((s) => s.cy < GARRA.casa - 2 && !s.dados.vidro);
      let melhor = null;
      let nota = -Infinity;
      for (const s of lista) {
        // coberto: alguem por cima dele na largura da garra
        let coberto = 0;
        for (const q of lista) if (q !== s && q.cy > s.cy + 0.4 && Math.abs(q.cx - s.cx) < s.raio0 + q.raio0 - 0.3) coberto++;
        const x = clamp(s.cx, GARRA.xMin, GARRA.xMax);
        const n = s.topo + 0.3 * x - 3 * coberto - 2.5 * Math.abs(x - s.cx) - (s.n > 46 ? 0.8 : 0) - 1.4 * (s.dados.tentativas || 0);
        if (n > nota) { nota = n; melhor = s; }
      }
      if (!melhor) return;
      const x = clamp(melhor.cx, GARRA.xMin, GARRA.xMax);
      if (Math.abs(S.hx - x) > 0.12 || Math.abs(S.vx) > 0.3) { gesto(); S.alvoX = x; return; }
      pegar();
    },
    hud() {
      const n = SQUISHIES.filter((q) => album[q.id]).length;
      const bolas = SQUISHIES.map((q) => {
        const tem = !!album[q.id];
        const fundo = !tem ? '#d9d6e0' : q.raridade === 2 ? 'radial-gradient(circle at 35% 30%, #fff6c8, #f5b82e 55%, #a8700f)'
          : q.textura === 3 ? 'conic-gradient(#ff6b6b, #ffd23a, #7fe36b, #5ec8ff, #b07bff, #ff6b6b)'
            : q.textura === 5 ? 'radial-gradient(circle at 35% 30%, #f3a6ff, #6a3fb5 60%, #2a1650)'
              : q.textura === 6 ? 'radial-gradient(circle at 35% 30%, #ffffff, #f7b8f0 45%, #b78cff)'
                : hexDaMistura(q.pig);
        const anel = q.raridade === 2 ? 'box-shadow:0 0 0 0.12em #ffd23a;' : q.raridade === 1 ? 'box-shadow:0 0 0 0.12em #b9a5ff;' : '';
        return `<i title="${tem ? q.nome : '?'}" style="width:1.15em;height:1.15em;border-width:0.11em;background:${fundo};${tem ? anel : 'opacity:0.55;'}"></i>`;
      }).join('');
      return {
        pontos: `Álbum ${n}/${SQUISHIES.length}`,
        recorde: `Fichas ${fichas}`,
        metaHtml: `<div class="pedido proto" style="gap:0.22em">${bolas}</div>`,
        poderes: [
          { id: 'pegar', ativo: S.fase === 'mira' && fichas > 0, oculto: fichas <= 0 },
          { id: 'fichas', qtd: RECARGA, oculto: fichas > 0 },
        ],
      };
    },
    visual() {
      const ps = S.m.paredes;
      const garra = ps.slice(P_GARRA, P_GARRA + 5).map((p) => ({ ax: p.ax, ay: p.ay, bx: p.bx, by: p.by, r: p.r }));
      let mao = null;
      if (S.tutorial < 2 && S.fase === 'mira' && fichas > 0) {
        mao = S.tutorial === 0 || S.tTutorial < 1.2
          ? { x: -1, y: 9.5, amplitude: 2.6, tecla: !o.toque, toque: !!o.toque }
          : { x: BOTAO.x, y: BOTAO.y - 0.45, amplitude: 0, tecla: false, toque: !!o.toque };
      }
      return {
        potes: [
          { idx: [0, 1, 2, 3, 4], cesto: { estilo: 'vidro' } },
          { idx: [P_DIV], cesto: { estilo: 'vidro' } },
        ],
        olhar: [S.hx, S.hy - 1.6],
        mao,
        garra: { hx: S.hx, hy: S.hy, ab: S.ab, vx: S.vx, caps: garra, fase: S.fase, tFase: S.tFase, segura: !!S.levando },
        caixa: CAIXA,
        botao: BOTAO,
        escotilha: ESCOTILHA,
        fichas,
        tMira: S.tMira,
        cartao: S.cartao,
        manchas: S.manchas,
      };
    },
    reiniciar() {
      montar();
    },
    salvar() {
      return { album: { ...album }, fichas, premios, tentativas, tutorial: viuTutorial };
    },
    /** numeros para os testes: premios, tentativas e o album */
    get placar() { return { premios, tentativas, fichas, album: { ...album } }; },
  };
  return modo;
}

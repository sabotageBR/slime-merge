// Aperta-Gosma (ideia #46, prototipo; chave `aperta`): um slime antiestresse numa caixa de vidro
// no quarto de brinquedos. Ferramentas no HUD: mao (agarra e estica de verdade, arremessa no
// vidro, toque curto cutuca, vai-e-vem rapido faz cocegas), martelo, gelo, calor, tesoura, cola,
// missil e tinta. Ele reage com caretas (album de 10) e ha metas curtas desde os primeiros
// segundos (o risco da carta: brinquedo sem meta perde o jogador).
// Logica pura: sem DOM, sem relogio, sem Math.random (o tempo entra por dt).

import { criarMundo } from '../../fisica/mundo.js';
import { material } from '../../fisica/materiais.js';
import { difundir, iniciarFrente, pigmentoMedio } from '../../cor/difusao.js';
import { hexDaMistura } from '../../cor/km.js';
import { particulasNivel } from '../niveis.js';
import { sentir, careta, BASE, PANCADA } from '../humor.js';
import { MISSIL } from '../soltar.js';
import { criarRng } from '../../core/rng.js';
import { cenario, fundo, topo } from '../../render/prototipos/aperta.js';

/** Faces de dentro do vidro (a caixa fechada: chao, laterais e tampa). */
export const CAIXA = Object.freeze({ x0: -7, y0: 0, x1: 7, y1: 14, r: 0.3 });
/** Nivel do slime (tamanho): o 11 tem ~229 particulas e 5,8 u de diametro. */
const NIVEL = 11;
const COR_BASE = [0.05, 0.3, 0, 0];
/** Cor do frio e do calor (pintura gradual por particula; a cor de antes volta devagar). */
const COR_GELO = [0.36, 0, 0, 0];
const COR_QUENTE = [0, 0.72, 0.42, 0];
/** Ate onde o frio e o calor pintam (o resto e a cor de antes). */
const MAX_GELO = 0.96;
const MAX_QUENTE = 0.85;
/** As 4 tintas do rolo (uma por toque, em rodizio). */
export const TINTAS_ROLO = Object.freeze([
  { nome: 'amarelo', pig: [0, 0.03, 0.8, 0] },
  { nome: 'verde', pig: [0.3, 0, 0.7, 0] },
  { nome: 'laranja', pig: [0, 0.34, 0.84, 0] },
  { nome: 'turquesa', pig: [0.6, 0, 0.22, 0] },
]);
export const FERRAMENTAS = Object.freeze(['mao', 'martelo', 'gelo', 'calor', 'tesoura', 'cola', 'mira', 'tinta']);
/** Album de caretas (10). */
export const ALBUM = Object.freeze(['furioso', 'zonzo', 'susto', 'emburrado', 'xingando', 'choro', 'medo', 'feliz', 'tonto', 'amassado']);
export const NOMES_CARETA = Object.freeze({
  furioso: 'Furioso', zonzo: 'Zonzo', susto: 'Susto', emburrado: 'Emburrado', xingando: 'Xingando',
  choro: 'Chorão', medo: 'Medo', feliz: 'Cócegas', tonto: 'Tonto', amassado: 'Amassado',
});
const MAX_PEDACOS = 10;
/** s que a frente da tinta anda antes de parar (~3 u/s: uma mancha de ~1,5 u de raio). */
const PINTA_T = 0.5;
/** s de cada cartao (meta cumprida, careta nova). */
export const DURA_CARTAO = 1.9;
/** u/s2 (o Merge usa 50). */
const GRAVIDADE = 32;
const MIN_PEDACO = 6;

/**
 * Ajustes do brinquedo (medidos com tools de depuracao no scratchpad):
 *   raio      u: o miolo pego (vai inteiro com o dedo); `queda` u: o resto segue exp(-d/queda)
 *   alcance   u: tocou fora do corpo ate essa distancia, pega a particula mais perto
 *   junto     no ar, o miolo fica mais junto que no corpo (fracao do afastamento original)
 *   mola      1/s: velocidade de cada particula = mola * distancia ate o alvo (teto vMola)
 *   segue     fracao por quadro com que a particula troca a velocidade pela da mola (vezes o peso)
 *   duro      multiplica a mola no slime congelado (amassar nao marca)
 *   mole      rigidez (fracao) do slime enquanto a mao segura: estica de verdade e estala ao soltar
 *   ancora    com a base no chao, o peso minimo que segura o longe onde estava (o peso do corpo)
 *   solta     comprimento / diametro em que a base solta do chao (ploc) e o slime pendura
 *   arremesso u/s do dedo para virar arremesso; fracao: quanto da velocidade do dedo vai para o corpo
 *   escorre   u/s: no vidro, o corpo grudado desce no maximo a isso (a gosma escorre)
 *   impacto   u/s de mudanca de velocidade do corpo em 3 quadros encostado no vidro = pancada
 *   estica    comprimento / diametro para a meta de esticar
 */
export const AJUSTE = Object.freeze({
  raio: 1.0, queda: 1.2, alcance: 2.4, junto: 0.8, mola: 14, vMola: 25, segue: 0.6, duro: 0.3, mole: 0.3, ancora: 0.3, solta: 2.1,
  arremesso: 7, fracao: 0.8, escorre: 3.2, impacto: 9, estica: 1.6,
  toqueCurto: 0.25, cocegasAmp: 2.4, tonto: 3.6,
});

/** Metas curtas, uma de cada vez (a primeira aparece no primeiro segundo). */
export const METAS = Object.freeze([
  { id: 'estica', icone: '✋', texto: 'Estique ele bem comprido' },
  { id: 'vidro', icone: '🪟', texto: 'Arremesse e grude ele no vidro' },
  { id: 'frio', icone: '❄️', texto: 'Deixe ele azul de frio' },
  { id: 'derrete', icone: '🔥', texto: 'Derreta ele' },
  { id: 'corta', icone: '✂️', texto: 'Corte em 4 pedaços', n: 4 },
  { id: 'cola', icone: '🧴', texto: 'Cole tudo de volta' },
  { id: 'caretas', icone: '😝', texto: 'Faça 3 caretas diferentes', n: 3 },
  { id: 'pinta', icone: '🎨', texto: 'Pinte ele de 2 cores', n: 2 },
  { id: 'missil', icone: '🚀', texto: 'Exploda ele com o míssil' },
  { id: 'martela', icone: '🔨', texto: 'Martele ele 5 vezes', n: 5 },
  { id: 'cocegas', icone: '🪶', texto: 'Faça cócegas nele (mão: vai e volta rápido)' },
  { id: 'tonto', icone: '😵', texto: 'Chacoalhe até ele ficar tonto' },
  { id: 'corta6', icone: '✂️', texto: 'Corte em 6 pedaços', n: 6 },
  { id: 'album', icone: '📒', texto: 'Complete o álbum de caretas', n: ALBUM.length },
]);

/** Icones dos botoes sem icone pronto (traco branco com contorno de tinta, viewBox 24). */
const SVG = {
  mao: 'M7.5 12.5V6.8a1.5 1.5 0 0 1 3 0V11M10.5 10.6V4.8a1.5 1.5 0 0 1 3 0v5.8M13.5 10.6V6.2a1.5 1.5 0 0 1 3 0v5M16.5 11.4V8.6a1.5 1.5 0 0 1 3 0v5.2c0 4.2-2.8 7.2-6.8 7.2c-2.8 0-4.4-1.3-5.8-3.3l-3-4.4a1.5 1.5 0 0 1 2.4-1.8L7.5 13.6',
  martelo: 'M3.2 8.6L8.6 3.2l5.2 5.2l-5.4 5.4zM11.2 11.2L20.6 20.6',
  cola: 'M8.2 10.4h7.6v9.4a1.6 1.6 0 0 1-1.6 1.6H9.8a1.6 1.6 0 0 1-1.6-1.6zM10 10.4V7.2h4v3.2M12 7.2V3.4M18.6 3.6c1 1.4 1.6 2.3 1.6 3.1a1.6 1.6 0 0 1-3.2 0c0-.8.6-1.7 1.6-3.1z',
};
const svg = (d) => `<svg viewBox="0 0 24 24"><g class="t"><path d="${d}"/></g><path d="${d}"/></svg>`;

const limitar = (v, a, b) => (v < a ? a : v > b ? b : v);

/**
 * @param {{ semente?: number, salvo?: any, toque?: boolean, lang?: string }} [o]
 */
export function criarModo(o = {}) {
  const salvo = o.salvo || {};
  const semente = o.semente || 7;
  const rng = criarRng(semente * 31 + 5);
  /** progresso que sobrevive ao Recomecar (e vai para o salvar) */
  const P = {
    estrelas: salvo.estrelas || 0,
    meta: salvo.meta || 0,
    album: Array.isArray(salvo.album) ? salvo.album.filter((e) => ALBUM.includes(e)) : [],
  };
  /** @type {any[]} */
  const eventos = [];
  const MAT = material('gelatina', { lam: 0.6, mem: 0.6, amortRig: 0.015 });
  /** na mao o slime vira puxa-puxa: escoa e fica viscoso (o pescoco estica sem rasgar) */
  const MAT_PUXA = material('gelatina', { k: 0.01, epsY: 0.15, lam: 5, mem: 0, coesao: 0.045, xsph: 0.25, amortRig: 0.015 });
  const N0 = particulasNivel(NIVEL);
  const CAP = 1024;
  // cor de antes do frio/calor por particula (os indices so mudam no removerSlime, espelhado aqui)
  const snap = new Float64Array(CAP * 4);
  const tem = new Uint8Array(CAP);
  const frio = new Float64Array(CAP);
  const quente = new Float64Array(CAP);
  /** particulas na mao (o resto do corpo do slime pego pesa) */
  const pegos = new Uint8Array(CAP);
  /** @type {any} */
  let S = null;

  // ------------------------------------------------------------------ mundo
  function novo() {
    const { x0, y0, x1, y1, r } = CAIXA;
    const m = criarMundo({ semente, capacidade: CAP, limites: [x0 - 3, y0 - 3, x1 + 3, y1 + 3] });
    const xe = x0 - r;
    const xd = x1 + r;
    const yb = y0 - r;
    const yt = y1 + r;
    // contorno fechado do alto da esquerda descendo, chao, direita subindo e tampa: `gruda` 1 = por dentro
    m.definirParedes([
      { ax: xe, ay: yt, bx: xe, by: yb, r, gruda: 1 },
      { ax: xe, ay: yb, bx: xd, by: yb, r, gruda: 1 },
      { ax: xd, ay: yb, bx: xd, by: yt, r, gruda: 1 },
      { ax: xd, ay: yt, bx: xe, by: yt, r, gruda: 1 },
    ]);
    // gravidade de brinquedo: arremesso com tempo no ar e gosma que escorre devagar na caixa de 14 u
    m.gy = -GRAVIDADE;
    tem.fill(0);
    pegos.fill(0);
    frio.fill(0);
    quente.fill(0);
    S = {
      m, t: 0, gen: 0, ferramenta: 'mao', tocou: false,
      dedo: { baixo: false, x: 0, y: 4, xq: 0, yq: 4, vx: 0, vy: 0, x0: 0, y0: 0, t0: 0, fonte: '', tMov: -9, sinal: 0, xRev: 0, revs: [] },
      agarre: null, corte: null, martelo: null, missil: null, cola: 0, colaT: 0, tremor: 0,
      roteiro: null, botK: 0, fantasmaT: 0,
      cartoes: [], rastros: [], tHex: 0, tinta: 0, pinta: null, resgates: 0, agito: 0, tCocegas: -9,
      // metas: o que aconteceu desde que a meta da vez comecou
      ev: zerarEv(), metaIni: 0, maxPedacos: 1, usadas: new Set(),
    };
    const s = m.criarSlime({ x: 0, y: 2.95, n: N0, material: MAT, pigmento: COR_BASE, nivel: NIVEL });
    vestir(s);
    S.metaIni = contarPedacos();
  }

  function zerarEv() {
    return { esticou: 0, grudou: false, cortes: 0, colou: 0, caretas: new Set(), cores: new Set(), explodiu: false, marteladas: 0, cocegas: false, tonto: false };
  }

  /**
   * Rosto, textura e cor dos efeitos de um slime novo ou de um pedaco (que herda o estado de `de`).
   * @param {any} s @param {any} [de]
   */
  function vestir(s, de = null) {
    s.dados.textura = 1;
    s.dados.texturaT = 1;
    s.dados.hex = de ? de.dados.hex : hexDaMistura(COR_BASE);
    s.dados.vh = [0, 0, 0, 0, 0, 0];
    if (de) {
      s.estado = de.estado;
      s.tEstado = de.tEstado;
      s.ader = de.ader;
      s.dados.lancado = de.dados.lancado;
    }
  }

  const ativos = () => S.m.slimes.filter((s) => s.ativo);
  const contarPedacos = () => ativos().length;
  /** O maior pedaco. */
  function principal() {
    let b = null;
    for (const s of S.m.slimes) if (s.ativo && (!b || s.n > b.n)) b = s;
    return b;
  }

  /** Copia a particula u para o lugar i nas tabelas do frio/calor (espelho do removerParticulas). */
  function copiarPart(u, i) {
    for (let c = 0; c < 4; c++) snap[i * 4 + c] = snap[u * 4 + c];
    tem[i] = tem[u];
    frio[i] = frio[u];
    quente[i] = quente[u];
  }

  /** Remove o slime inteiro mantendo as tabelas por particula alinhadas. @param {any} s */
  function removerSlime(s) {
    const m = S.m;
    const lista = [];
    for (let i = 0; i < m.n; i++) if (m.sl[i] === s.idx) lista.push(i);
    let n = m.n;
    for (let k = lista.length - 1; k >= 0; k--) {
      const i = lista[k];
      const u = --n;
      if (i !== u) copiarPart(u, i);
    }
    m.remover(s);
    S.gen++;
  }

  /** Slime da particula mais perto do ponto (o toque sempre acha alguem). @returns {any} */
  function slimeEm(x, y) {
    const m = S.m;
    let melhor = -1;
    let dm = Infinity;
    for (let i = 0; i < m.n; i++) {
      const d = (m.x[i] - x) * (m.x[i] - x) + (m.y[i] - y) * (m.y[i] - y);
      if (d < dm) { dm = d; melhor = i; }
    }
    return melhor < 0 ? null : m.slimes[m.sl[melhor]];
  }

  function acordar(s) {
    s.dormindo = false;
    s.tParado = 0;
  }

  /**
   * Rosto passageiro (o de base volta quando o prazo acaba). O medo do alvo do missil fica ate a explosao.
   * @param {any} s @param {string} expr @param {number} t
   */
  function rosto(s, expr, t) {
    if (!s || !s.ativo) return;
    if (s.dados.alvoMissil && expr !== 'medo') return;
    s.dados.expr = expr;
    s.dados.exprT = t;
    delete s.dados.bravoDe;
    s.dados.paradoT = 0;
  }

  /** Careta da pancada em rodizio (ou tonto, depois de muito chacoalhar). @param {any} s @param {number} forca */
  function pancada(s, forca) {
    S.agito += forca;
    if (S.agito >= AJUSTE.tonto) {
      S.agito = 0;
      rosto(s, 'tonto', 2.6);
      S.ev.tonto = true;
      eventos.push({ tipo: 'som', nome: 'chacoalhar' });
      return;
    }
    if (PANCADA.includes(s.dados.expr) && s.dados.exprT > 0.6) { s.dados.exprT = 2; return; }
    rosto(s, careta(s), 2);
    s.dados.pancadas = (s.dados.pancadas || 0) + 1;
  }

  // ------------------------------------------------------------------ ferramentas
  /** Entrada unica (jogador, bot e a mao fantasma do comeco). */
  function entrada(x, y, fase, fonte) {
    const D = S.dedo;
    if (fase === 'mover') {
      D.x = x;
      D.y = y;
      D.tMov = S.t;
      if (D.baixo && S.corte) { S.corte.x1 = x; S.corte.y1 = y; }
      return;
    }
    if (fase === 'baixo') {
      D.baixo = true;
      D.fonte = fonte;
      D.x = D.xq = D.x0 = x;
      D.y = D.yq = D.y0 = y;
      D.vx = 0;
      D.vy = 0;
      D.t0 = S.t;
      D.tMov = S.t;
      D.sinal = 0;
      D.xRev = x;
      D.revs = [];
      const f = fonte === 'fantasma' ? 'mao' : S.ferramenta;
      if (fonte !== 'fantasma') S.usadas.add(f);
      if (f === 'mao') agarrar(x, y);
      else if (f === 'martelo') martelar(x, y);
      else if (f === 'gelo' || f === 'calor') temperar(x, y, f);
      else if (f === 'tesoura') S.corte = { x0: x, y0: y, x1: x, y1: y };
      else if (f === 'cola') colar();
      else if (f === 'mira') mirar(x, y);
      else if (f === 'tinta') pintarEm(x, y);
      return;
    }
    // cima
    if (!D.baixo) return;
    D.baixo = false;
    D.x = x;
    D.y = y;
    if (S.agarre) soltarAgarre(x, y);
    if (S.corte) {
      const c = S.corte;
      S.corte = null;
      if (Math.hypot(c.x1 - c.x0, c.y1 - c.y0) > 0.8) cortar(c.x0, c.y0, c.x1, c.y1);
    }
  }

  /**
   * Mao: pega o slime sob o dedo. Com a base no chao ele vira puxa-puxa: a forma vai para uma
   * deformacao que conserva a area (o eixo da base ao ponto pego estica e o corpo afina no meio, um
   * pescoco; puxar para o lado entorta o pescoco; empurrar para a base achata e alarga), e as
   * particulas seguem essa forma por mola, sem rasgar. Passou de `solta` (ou pegou no ar): a base
   * solta do chao com um ploc, o miolo vai com o dedo e o resto pendura.
   */
  function agarrar(x, y) {
    largar();
    const m = S.m;
    let px = x;
    let py = y;
    let dm = Infinity;
    let perto = -1;
    for (let i = 0; i < m.n; i++) {
      const d = (m.x[i] - x) * (m.x[i] - x) + (m.y[i] - y) * (m.y[i] - y);
      if (d < dm) { dm = d; px = m.x[i]; py = m.y[i]; perto = i; }
    }
    if (perto < 0 || dm > AJUSTE.alcance * AJUSTE.alcance) { S.agarre = null; return; }
    // pegou fora do corpo: o ponto pego e a particula mais perto (o dedo arrasta ele sem salto)
    if (dm > 0.36) { x = px; y = py; }
    const dono = m.sl[perto];
    const s = m.slimes[dono];
    const pts = [];
    // a ancora: o centro da parte longe do ponto pego (no slime no chao, a base)
    let ax = 0;
    let ay = 0;
    let na = 0;
    for (let i = 0; i < m.n; i++) {
      if (m.sl[i] !== dono) continue;
      const dx = m.x[i] - x;
      const dy = m.y[i] - y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const w = d < AJUSTE.raio ? 1 : Math.exp(-(d - AJUSTE.raio) / AJUSTE.queda);
      pts.push({ i, x0: m.x[i], y0: m.y[i], w, s: 0, q: 0 });
      if (w > 0.5) pegos[i] = 1;
      if (w < 0.2) { ax += m.x[i]; ay += m.y[i]; na++; }
    }
    if (na) { ax /= na; ay /= na; } else { ax = 2 * s.cx - x; ay = 2 * s.cy - y; }
    const L0 = Math.hypot(x - ax, y - ay);
    const ux = L0 > 1e-6 ? (x - ax) / L0 : 0;
    const uy = L0 > 1e-6 ? (y - ay) / L0 : 1;
    for (const p of pts) {
      const rx = p.x0 - ax;
      const ry = p.y0 - ay;
      p.s = (rx * ux + ry * uy) / Math.max(0.5, L0);
      p.q = -rx * uy + ry * ux;
    }
    // a mao no slime desliga a aderencia (ele sai do vidro com o dedo)
    s.ader = 0;
    S.agarre = {
      pts, gen: S.gen, dono, px: x, py: y, x0: x - S.dedo.x, y0: y - S.dedo.y, t0: S.t, maxComp: 0,
      ax, ay, L0: Math.max(0.5, L0), ang0: Math.atan2(uy, ux),
      ancorado: s.base < CAIXA.y0 + 0.35 && L0 > 0.8,
    };
    eventos.push({ tipo: 'som', nome: 'pouso', forca: 0.5 });
  }

  /** Um quadro da mao (antes da fisica): cada particula do slime pego vai para o alvo dela por mola. */
  function puxarAgarre() {
    const A = S.agarre;
    if (!A) return;
    const m = S.m;
    if (A.gen !== S.gen) { largar(); return; }
    const s = m.slimes[A.dono];
    if (!s || !s.ativo) { largar(); return; }
    const D = S.dedo;
    // o ponto do dedo (pegou longe: o dedo arrasta o ponto pego, sem salto)
    const fx = D.x + A.x0 * Math.max(0, 1 - (S.t - A.t0) * 4);
    const fy = D.y + A.y0 * Math.max(0, 1 - (S.t - A.t0) * 4);
    const gelo = s.estado === 'gelo';
    const puxa = A.ancorado && !gelo;
    s.mat = puxa ? MAT_PUXA : MAT;
    if (puxa) m.amolecer(s, AJUSTE.mole, 0);
    const k = gelo ? AJUSTE.duro : 1;
    // o eixo de agora: da ancora ao dedo
    const bx = fx - A.ax;
    const by = fy - A.ay;
    const L1 = limitar(Math.sqrt(bx * bx + by * by), 0.45 * A.L0, 2.4 * A.L0);
    const lam = L1 / A.L0;
    let dAng = Math.atan2(by, bx) - A.ang0;
    while (dAng > Math.PI) dAng -= 2 * Math.PI;
    while (dAng < -Math.PI) dAng += 2 * Math.PI;
    for (const p of A.pts) {
      const i = p.i;
      if (i >= m.n || m.sl[i] !== A.dono) continue;
      let tx;
      let ty;
      let a;
      if (A.ancorado) {
        // puxa-puxa que conserva a area: g(s) estica o eixo no meio, c(s) = 1/g'(s) afina
        const sc = limitar(p.s, 0, 1);
        const hh = sc * sc * (3 - 2 * sc);
        const dh = p.s > 0 && p.s < 1 ? 6 * sc * (1 - sc) : 0;
        // metade do estiramento uniforme no corpo todo e metade concentrada no meio (o pescoco)
        const g = p.s + (lam - 1) * (p.s >= 1 ? 1 : 0.5 * sc + 0.5 * hh);
        const c = limitar(1 / Math.max(0.2, 1 + (lam - 1) * (p.s > 0 && p.s < 1 ? 0.5 + 0.5 * dh : 0)), 0.3, 1.8);
        const th = A.ang0 + dAng * (p.s >= 1 ? 1 : hh);
        const ex = Math.cos(th);
        const ey = Math.sin(th);
        tx = A.ax + A.L0 * g * ex - p.q * c * ey;
        ty = A.ay + A.L0 * g * ey + p.q * c * ex;
        a = AJUSTE.segue * (AJUSTE.ancora + (1 - AJUSTE.ancora) * sc);
      } else {
        // no ar: o miolo vai com o dedo e o resto pendura
        if (p.w < 0.5) continue;
        tx = fx + (p.x0 - A.px) * AJUSTE.junto;
        ty = fy + (p.y0 - A.py) * AJUSTE.junto;
        a = AJUSTE.segue * p.w;
      }
      let ux = (tx - m.x[i]) * AJUSTE.mola * k;
      let uy = (ty - m.y[i]) * AJUSTE.mola * k;
      const v = Math.sqrt(ux * ux + uy * uy);
      if (v > AJUSTE.vMola) { ux *= AJUSTE.vMola / v; uy *= AJUSTE.vMola / v; }
      m.vx[i] += a * (ux - m.vx[i]);
      m.vy[i] += a * (uy - m.vy[i]);
    }
    if (s.dormindo) acordar(s);
  }

  /** Comprimento do slime pego (maior lado da caixa / diametro). @param {any} s */
  function comprimento(s) {
    return Math.max(s.dir - s.esq, s.topo - s.base) / (2 * s.raio0);
  }

  /** A mao solta: o slime volta a endurecer (estala de volta a forma). */
  function largar() {
    const A = S.agarre;
    S.agarre = null;
    pegos.fill(0);
    if (!A) return;
    const s = S.m.slimes[A.dono];
    if (s && s.ativo) {
      // volta a ser gelatina e a forma de repouso e o disco de novo: estala de volta (boing);
      // congelado fica como esta
      s.mat = MAT;
      if (s.estado !== 'gelo') S.m.refazerForma(s);
      S.m.amolecer(s, Math.min(s.rampa, 0.3), 1.6);
    }
  }

  function soltarAgarre(x, y) {
    const A = S.agarre;
    largar();
    const D = S.dedo;
    const m = S.m;
    const s = m.slimes[A.dono];
    if (!s || !s.ativo) return;
    const curto = S.t - D.t0 < AJUSTE.toqueCurto && Math.hypot(x - D.x0, y - D.y0) < 0.4;
    const v = Math.hypot(D.vx, D.vy);
    if (curto) { cutucar(x, y, s); return; }
    if (v > AJUSTE.arremesso) {
      // arremesso: o corpo leva parte da velocidade do dedo e gruda no vidro onde bater
      const f = AJUSTE.fracao;
      let ux = D.vx * f;
      let uy = D.vy * f;
      const u = Math.hypot(ux, uy);
      if (u > 24) { ux *= 24 / u; uy *= 24 / u; }
      m.empurrar(ux, uy, s.idx);
      s.ader = 1;
      s.dados.lancado = S.t;
      rosto(s, 'susto', 0.7);
      eventos.push({ tipo: 'som', nome: 'soltar' });
      return;
    }
    // soltou esticado: estala de volta
    if (A.maxComp > 1.5) eventos.push({ tipo: 'som', nome: 'alargar' });
  }

  /** Toque curto: cutucada (empurrao para fora e para cima) e uma careta. */
  function cutucar(x, y, s) {
    const m = S.m;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) m.puxar(x + dx * 0.45, y + dy * 0.45, 1.0, dx * 9, dy * 9 + 5, 0.5);
    acordar(s);
    // cutucar de novo e de novo irrita
    const seguidas = S.t - (S.tCutuca || -9) < 2.5 ? (S.seguidas || 0) + 1 : 1;
    S.seguidas = seguidas;
    S.tCutuca = S.t;
    rosto(s, seguidas >= 3 ? 'emburrado' : 'susto', seguidas >= 3 ? 1.8 : 1);
    eventos.push({ tipo: 'pouso', x, y, forca: 0.7, cor: s.dados.hex });
  }

  /** Martelo: a batida vem de cima no x do toque (o slime embaixo achata e faz careta). */
  function martelar(x, y) {
    if (S.martelo && S.martelo.t < 0.3) return;
    S.martelo = { x: limitar(x, CAIXA.x0 + 0.5, CAIXA.x1 - 0.5), y, t: 0, bateu: false, yAlvo: CAIXA.y0, alvo: -1 };
  }

  function batida() {
    const M = S.martelo;
    const m = S.m;
    M.bateu = true;
    // o mais alto embaixo da cabeca do martelo
    let topo = -Infinity;
    let quem = -1;
    for (let i = 0; i < m.n; i++) {
      if (Math.abs(m.x[i] - M.x) > 0.75) continue;
      if (m.y[i] > topo) { topo = m.y[i]; quem = i; }
    }
    if (quem < 0) {
      M.yAlvo = CAIXA.y0;
      eventos.push({ tipo: 'pouso', x: M.x, y: CAIXA.y0, forca: 0.6 });
      return;
    }
    const s = m.slimes[m.sl[quem]];
    M.yAlvo = topo + 0.14;
    M.alvo = s.idx;
    const gelo = s.estado === 'gelo';
    // achata: quanto mais alto, mais desce (de cima para baixo), e um soco local na cabeca
    const h = Math.max(0.5, s.topo - s.base);
    const forte = gelo ? 6 : 26;
    for (let i = 0; i < m.n; i++) {
      if (m.sl[i] !== s.idx) continue;
      const k = limitar((m.y[i] - s.base) / h, 0, 1);
      m.vy[i] -= forte * k;
      m.vx[i] += (m.x[i] - M.x) * k * (gelo ? 0.5 : 2.2);
    }
    m.puxar(M.x, topo - 0.4, 1.8, 0, gelo ? -4 : -24, gelo ? 0.3 : 0.8);
    acordar(s);
    S.ev.marteladas++;
    S.tremor = 0.18;
    pancada(s, gelo ? 0.6 : 1.2);
    eventos.push({ tipo: 'pouso', x: M.x, y: topo, forca: gelo ? 1 : 3, cor: s.dados.hex });
    eventos.push({ tipo: 'som', nome: gelo ? 'tique' : 'splat' });
  }

  /** Gelo ou calor no slime sob o toque (ou o mais perto). */
  function temperar(x, y, f) {
    const s = slimeEm(x, y);
    if (!s) return;
    s.estado = f;
    s.tEstado = f === 'gelo' ? 6 : 4.5;
    if (f === 'calor') {
      rosto(s, 'zonzo', 1.4);
      S.m.acordarTodos();
      eventos.push({ tipo: 'som', nome: 'febre' });
    } else {
      rosto(s, 'susto', 1);
      acordar(s);
      eventos.push({ tipo: 'som', nome: 'tique' });
    }
    S.sopro = { x, y, f, t: 0 };
  }

  /** Tesoura: a linha corta cada slime que ela atravessa. */
  function cortar(ax, ay, bx, by) {
    const m = S.m;
    const L = Math.hypot(bx - ax, by - ay);
    const tx = (bx - ax) / L;
    const ty = (by - ay) / L;
    const nx = -ty;
    const ny = tx;
    let feitos = 0;
    for (const s of ativos()) {
      if (contarPedacos() >= MAX_PEDACOS) break;
      // a linha passa pelo corpo: particulas dos dois lados dentro do trecho do segmento
      let mais = 0;
      let menos = 0;
      for (let i = 0; i < m.n; i++) {
        if (m.sl[i] !== s.idx) continue;
        const rx = m.x[i] - ax;
        const ry = m.y[i] - ay;
        const t = rx * tx + ry * ty;
        if (t < -0.3 || t > L + 0.3) continue;
        const d = rx * nx + ry * ny;
        if (d > 0.12) mais++;
        else if (d < -0.12) menos++;
      }
      if (mais < 3 || menos < 3) continue;
      // o ponto da linha mais perto do centro
      const t = limitar((s.cx - ax) * tx + (s.cy - ay) * ty, 0, L);
      const pedacos = m.dividir(s, ax + tx * t, ay + ty * t, nx, ny);
      if (pedacos.length < 2) continue;
      const [a, b] = pedacos;
      vestir(b, a);
      // os pedacos se afastam um pouco e choram
      m.empurrar(-nx * 3, -ny * 3 + 1, a.idx);
      m.empurrar(nx * 3, ny * 3 + 1, b.idx);
      rosto(a, 'choro', 1.6);
      rosto(b, 'choro', 1.6);
      feitos++;
    }
    if (feitos) {
      S.ev.cortes += feitos;
      eventos.push({ tipo: 'som', nome: 'choro' });
      eventos.push({ tipo: 'som', nome: 'recusa' });
      if (contarPedacos() >= 8) {
        // picado demais: a cola junta sozinha
        S.cola = 4;
        eventos.push({ tipo: 'texto', x: 0, y: CAIXA.y1 - 2, texto: 'Cola!', cor: '#ffd23a', escala: 1.2 });
      }
    }
  }

  /** Cola: os pedacos se atraem e fundem quando encostam. */
  function colar() {
    if (contarPedacos() < 2) {
      const s = principal();
      if (s) rosto(s, 'feliz', 0.8);
      eventos.push({ tipo: 'som', nome: 'trocar' });
      return;
    }
    S.cola = 3.5;
    eventos.push({ tipo: 'som', nome: 'trocar' });
  }

  /** Missil: mira no slime sob o toque (ele fica com medo) e explode no ponto. */
  function mirar(x, y) {
    if (S.missil) return;
    const s = slimeEm(x, y);
    if (!s) return;
    s.dados.alvoMissil = true;
    rosto(s, 'medo', 9);
    S.missil = { alvo: s.idx, x: s.cx, y: s.cy, r: s.raio0, cor: s.dados.hex, t: 0, zuniu: false };
    eventos.push({ tipo: 'som', id: 'mira', nome: 'alvo' });
  }

  function avancarMissil(dt) {
    const M = S.missil;
    const m = S.m;
    const s = m.slimes[M.alvo];
    const vivo = s && s.ativo && s.dados.alvoMissil;
    if (vivo) { M.x = s.cx; M.y = s.cy; M.r = s.raio0; M.cor = s.dados.hex; }
    M.t += dt;
    if (!M.zuniu && M.t >= MISSIL.choro) { M.zuniu = true; eventos.push({ tipo: 'som', nome: 'missil' }); }
    if (M.t < MISSIL.impacto) return;
    S.missil = null;
    eventos.push({ tipo: 'missil', x: M.x, y: M.y, cor: M.cor, raio: Math.max(1.4, M.r) });
    S.tremor = 0.3;
    S.ev.explodiu = true;
    if (!vivo) return;
    s.dados.alvoMissil = false;
    explodir(s, M.x, M.y);
  }

  /** O alvo voa em pedacos (ate 4) para longe do ponto e gruda no vidro. */
  function explodir(s, x, y) {
    const m = S.m;
    let pedacos = [s];
    const a = rng() * Math.PI;
    const c = Math.cos(a);
    const sn = Math.sin(a);
    if (s.n >= 24 && contarPedacos() < MAX_PEDACOS) {
      const p = m.dividir(s, s.cx, s.cy, c, sn);
      if (p.length > 1) vestir(p[1], p[0]);
      pedacos = p;
      if (s.n >= 60) {
        const mais = [];
        for (const q of p) {
          if (contarPedacos() >= MAX_PEDACOS) { mais.push(q); continue; }
          const r = m.dividir(q, s.cx, s.cy, -sn, c);
          if (r.length > 1) vestir(r[1], r[0]);
          mais.push(...r);
        }
        pedacos = mais;
      }
    }
    m.reconstruir();
    for (const q of pedacos) {
      // centro do pedaco pelas particulas (o medir ainda nao rodou)
      let qx = 0;
      let qy = 0;
      let n = 0;
      for (let i = 0; i < m.n; i++) if (m.sl[i] === q.idx) { qx += m.x[i]; qy += m.y[i]; n++; }
      qx /= n || 1;
      qy /= n || 1;
      let dx = qx - x;
      let dy = qy - y;
      const d = Math.hypot(dx, dy);
      if (d < 0.2) { dx = 0; dy = 1; } else { dx /= d; dy /= d; }
      m.empurrar(dx * 17, dy * 15 + 6, q.idx);
      q.ader = 1;
      q.dados.lancado = S.t;
      q.estado = 'normal';
      q.tEstado = 0;
      rosto(q, PANCADA[(q.idx + 1) % PANCADA.length], 2.2);
    }
    // o resto do mundo leva o sopro
    for (const o of ativos()) {
      if (pedacos.includes(o)) continue;
      let dx = o.cx - x;
      let dy = o.cy - y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > 6) continue;
      dx /= d;
      dy /= d;
      m.empurrar(dx * 10 * (1 - d / 6), dy * 10 * (1 - d / 6) + 3, o.idx);
      rosto(o, 'susto', 1.2);
    }
  }

  /** Tinta: a cor da vez entra pelo toque e avanca pelo corpo. */
  function pintarEm(x, y) {
    const s = slimeEm(x, y);
    if (!s) return;
    const m = S.m;
    // tinta lava o gelo e o calor (a cor de antes volta na hora; a tinta pinta por cima)
    descongelar(s);
    const T = TINTAS_ROLO[S.tinta % TINTAS_ROLO.length];
    S.tinta++;
    // o ponto da tinta: a particula do slime mais perto do toque
    let px = s.cx;
    let py = s.cy;
    let dm = Infinity;
    for (let i = 0; i < m.n; i++) {
      if (m.sl[i] !== s.idx) continue;
      const d = (m.x[i] - x) * (m.x[i] - x) + (m.y[i] - y) * (m.y[i] - y);
      if (d < dm) { dm = d; px = m.x[i]; py = m.y[i]; }
    }
    iniciarFrente(m, s, T.pig, px, py, 0.8);
    // a frente para depois de PINTA_T s: uma mancha da cor (varias cores juntas no mesmo slime)
    S.pinta = { idx: s.idx, pig: s.pigAlvo, t: PINTA_T };
    acordar(s);
    S.ev.cores.add(T.nome);
    rosto(s, 'feliz', 1);
    eventos.push({ tipo: 'gota', x: px, y: py, cor: hexDaMistura(T.pig), nivel: 6 });
  }

  /** Frio e calor saem na hora (a cor de antes volta). @param {any} s */
  function descongelar(s) {
    const m = S.m;
    s.estado = 'normal';
    s.tEstado = 0;
    for (let i = 0; i < m.n; i++) {
      if (m.sl[i] !== s.idx || !tem[i]) continue;
      for (let c = 0; c < 4; c++) m.pig[i * 4 + c] = snap[i * 4 + c];
      tem[i] = 0;
      frio[i] = 0;
      quente[i] = 0;
    }
  }

  // ------------------------------------------------------------------ por quadro
  /** Frio e calor pintam aos poucos (por particula) e devolvem a cor de antes devagar. */
  function temperatura(dt) {
    const m = S.m;
    const sobeF = Math.min(1, 1.5 * dt);
    const sobeQ = Math.min(1, 1.3 * dt);
    for (let i = 0; i < m.n; i++) {
      const s = m.slimes[m.sl[i]];
      const g = s.estado === 'gelo';
      const q = s.estado === 'calor';
      if (!tem[i]) {
        if (!g && !q) continue;
        for (let c = 0; c < 4; c++) snap[i * 4 + c] = m.pig[i * 4 + c];
        tem[i] = 1;
      }
      frio[i] = g ? frio[i] + (1 - frio[i]) * sobeF : Math.max(0, frio[i] - 0.22 * dt);
      quente[i] = q ? quente[i] + (1 - quente[i]) * sobeQ : Math.max(0, quente[i] - 0.3 * dt);
      if (g) quente[i] = Math.max(0, quente[i] - 2 * dt);
      if (q) frio[i] = Math.max(0, frio[i] - 2 * dt);
      const f = frio[i] * MAX_GELO;
      const h = quente[i] * MAX_QUENTE;
      if (f <= 0 && h <= 0) {
        for (let c = 0; c < 4; c++) m.pig[i * 4 + c] = snap[i * 4 + c];
        tem[i] = 0;
        continue;
      }
      const b = 1 - f - h;
      for (let c = 0; c < 4; c++) m.pig[i * 4 + c] = snap[i * 4 + c] * b + COR_GELO[c] * f + COR_QUENTE[c] * h;
    }
  }

  /** Media do frio e do calor por slime (metas e desenho). */
  function medias() {
    const m = S.m;
    const out = new Map();
    for (let i = 0; i < m.n; i++) {
      const k = m.sl[i];
      let o2 = out.get(k);
      if (!o2) { o2 = { f: 0, q: 0, n: 0 }; out.set(k, o2); }
      o2.f += frio[i];
      o2.q += quente[i];
      o2.n++;
    }
    for (const v of out.values()) { v.f /= v.n; v.q /= v.n; }
    return out;
  }

  /** Vidro: o corpo grudado escorre devagar e deixa rastro; a aderencia sai no chao. */
  function vidro(dt) {
    const m = S.m;
    const { x0, x1, y0 } = CAIXA;
    for (const s of ativos()) {
      const d = s.dados;
      if (!(s.ader > 0)) { d.grudadoT = 0; continue; }
      let nE = 0;
      let nD = 0;
      let yE = 0;
      let yD = 0;
      for (let a = m.iniSl[s.idx]; a < m.iniSl[s.idx + 1]; a++) {
        const i = m.membros[a];
        if (m.x[i] < x0 + m.rad[i] + 0.12) { nE++; yE += m.y[i]; }
        if (m.x[i] > x1 - m.rad[i] - 0.12) { nD++; yD += m.y[i]; }
      }
      const noChao = s.base < y0 + 0.3;
      if ((nE >= 3 || nD >= 3) && !noChao) {
        d.grudadoT = (d.grudadoT || 0) + dt;
        if (d.grudadoT > 0.22) S.ev.grudou = true;
        // a gosma escorre: o corpo grudado desce no maximo a AJUSTE.escorre
        if (s.vy < -AJUSTE.escorre) {
          const dv = Math.min(-AJUSTE.escorre - s.vy, 60 * dt);
          for (let a = m.iniSl[s.idx]; a < m.iniSl[s.idx + 1]; a++) m.vy[m.membros[a]] += dv;
        }
        // rastro no vidro (desenho): um ponto a cada 0,06 s do lado grudado
        d.rastroT = (d.rastroT || 0) - dt;
        if (d.rastroT <= 0) {
          d.rastroT = 0.06;
          const esq = nE >= nD;
          const ry = esq ? yE / nE : yD / nD;
          S.rastros.push({ x: esq ? x0 + 0.12 : x1 - 0.12, y: ry, r: 0.18 + 0.03 * Math.min(8, esq ? nE : nD), cor: d.hex, vida: 5 });
          if (S.rastros.length > 160) S.rastros.shift();
        }
      } else d.grudadoT = 0;
      if ((noChao && Math.abs(s.vx) + Math.abs(s.vy) < 1.5) || S.t - (d.lancado || 0) > 7) s.ader = 0;
    }
    for (const r of S.rastros) r.vida -= dt;
    while (S.rastros.length && S.rastros[0].vida <= 0) S.rastros.shift();
  }

  /** Pancada no vidro: mudanca forte de velocidade do corpo perto de uma parede. */
  function impactos(dt) {
    const { x0, y0, x1, y1 } = CAIXA;
    const A = S.agarre;
    for (const s of ativos()) {
      const d = s.dados;
      if (!d.vh) d.vh = [s.vx, s.vy, s.vx, s.vy, s.vx, s.vy];
      const h = d.vh;
      const dv = Math.hypot(s.vx - h[0], s.vy - h[1]);
      h.copyWithin(0, 2);
      h[4] = s.vx;
      h[5] = s.vy;
      d.tImp = (d.tImp || 0) - dt;
      if (A && A.dono === s.idx) continue;
      if (dv < AJUSTE.impacto || d.tImp > 0 || s.n < 10) continue;
      const lado = s.esq < x0 + 0.5 ? 1 : s.dir > x1 - 0.5 ? 2 : s.base < y0 + 0.5 ? 3 : s.topo > y1 - 0.5 ? 4 : 0;
      if (!lado) continue;
      d.tImp = 0.4;
      const px = lado === 1 ? x0 : lado === 2 ? x1 : s.cx;
      const py = lado === 3 ? y0 : lado === 4 ? y1 : s.cy;
      const gelo = s.estado === 'gelo';
      eventos.push({ tipo: 'pouso', x: px, y: py, forca: Math.min(3, dv / 7), cor: d.hex });
      if (dv > 13) eventos.push({ tipo: 'som', nome: gelo ? 'tique' : 'splat' });
      pancada(s, dv / 12);
    }
  }

  /** Cocegas (vai-e-vem curto e rapido) e chacoalhada (vai-e-vem largo) com a mao. */
  function vaiEVem() {
    const D = S.dedo;
    const A = S.agarre;
    if (!D.baixo || !A) return;
    const sx = D.vx > 4 ? 1 : D.vx < -4 ? -1 : 0;
    if (sx && sx !== D.sinal) {
      if (D.sinal) D.revs.push({ t: S.t, amp: Math.abs(D.x - D.xRev) });
      D.sinal = sx;
      D.xRev = D.x;
    }
    D.revs = D.revs.filter((r) => S.t - r.t < 1.4);
    if (D.revs.length < 3) return;
    const s = S.m.slimes[A.dono];
    if (!s || !s.ativo) return;
    const largos = D.revs.filter((r) => r.amp >= AJUSTE.cocegasAmp).length;
    if (largos >= 3) {
      D.revs = [];
      pancada(s, 1.3);
      return;
    }
    if (largos === 0 && D.revs.length >= 4 && S.t - S.tCocegas > 0.5) {
      S.tCocegas = S.t;
      D.revs = D.revs.slice(-2);
      rosto(s, 'feliz', 1.6);
      S.ev.cocegas = true;
      eventos.push({ tipo: 'som', nome: 'combo', k: 2 });
      eventos.push({ tipo: 'texto', x: s.cx, y: s.topo + 0.6, texto: 'hihi', cor: '#ff8ad8', escala: 0.8, grupo: 'cocegas' });
    }
  }

  /** Cola: os pedacos vao para o maior e fundem quando encostam. */
  function passoCola(dt) {
    if (S.cola <= 0) return;
    S.cola -= dt;
    const m = S.m;
    const ancora = principal();
    if (!ancora) return;
    for (const s of ativos()) {
      if (s === ancora) continue;
      m.atrair(s, ancora.cx, ancora.cy, 45, 8, dt);
      s.ader = 0;
    }
    S.colaT -= dt;
    for (const [i, j, p] of m.contatos()) {
      if (p < 2 || S.colaT > 0) continue;
      const a = m.slimes[i];
      const b = m.slimes[j];
      if (!a.ativo || !b.ativo) continue;
      const [gr, pe] = a.n >= b.n ? [a, b] : [b, a];
      m.fundir(gr, pe, { px: pe.cx, py: pe.cy, rampa: 0.35 });
      gr.dados.vh = null;
      rosto(gr, 'feliz', 1.2);
      S.ev.colou++;
      S.colaT = 0.14;
      eventos.push({ tipo: 'fusao', x: (gr.cx + pe.cx) / 2, y: (gr.cy + pe.cy) / 2, cor: gr.dados.hex, combo: 1, brilhos: 4, nivel: 6 });
    }
    if (contarPedacos() <= 1) {
      S.cola = 0;
      const s = principal();
      // inteiro de novo: o volume que estourou volta (gotinha de cola no alto)
      if (s && s.n < N0) {
        const nAntes = S.m.n;
        S.m.redimensionar(s, N0, s.cx, s.topo - 0.2);
        for (let i = nAntes; i < S.m.n; i++) { tem[i] = 0; frio[i] = 0; quente[i] = 0; }
        S.gen++;
      }
    }
  }

  /** Pedaco pequeno demais some com um pop. */
  function pops() {
    for (const s of ativos()) {
      if (s.n === 0 || s.n >= MIN_PEDACO) continue;
      eventos.push({ tipo: 'estouro', x: s.cx, y: s.cy, cor: s.dados.hex });
      removerSlime(s);
    }
  }

  /** Rede de seguranca: nenhuma particula sai da caixa (a parede e capsula de dois lados). */
  function segurar() {
    const m = S.m;
    const { x0, y0, x1, y1 } = CAIXA;
    const lista = [];
    const pts = [];
    for (let i = 0; i < m.n; i++) {
      const x = m.x[i];
      const y = m.y[i];
      if (x > x0 + 0.04 && x < x1 - 0.04 && y > y0 + 0.04 && y < y1 - 0.04) continue;
      lista.push(i);
      pts.push(limitar(x, x0 + 0.16, x1 - 0.16), limitar(y, y0 + 0.16, y1 - 0.16));
    }
    if (lista.length) { m.reposicionar(lista, pts); S.resgates += lista.length; }
  }

  /** Rostos: prazos, humor de base e o album. */
  function rostos(dt) {
    const m = S.m;
    const viz = new Map();
    for (const [i, j] of m.contatos()) {
      viz.set(i, (viz.get(i) || 0) + 1);
      viz.set(j, (viz.get(j) || 0) + 1);
    }
    for (const s of ativos()) {
      const d = s.dados;
      if (d.exprT > 0) {
        d.exprT -= dt;
        if (d.exprT <= 0) { d.exprT = 0; if (!BASE.includes(d.expr || '')) d.expr = ''; }
      }
      sentir(s, viz.get(s.idx) || 0, dt);
      const e = d.expr || '';
      // o album so conta depois do primeiro toque (a mao fantasma do comeco nao vale)
      if (S.tocou && ALBUM.includes(e)) {
        S.ev.caretas.add(e);
        if (!P.album.includes(e)) {
          P.album.push(e);
          S.cartoes.push({ tipo: 'careta', expr: e, titulo: 'Careta nova!', sub: NOMES_CARETA[e], n: P.album.length, cor: d.hex, t: 0 });
          eventos.push({ tipo: 'som', nome: 'combo', k: 3 });
        }
      }
    }
    S.agito = Math.max(0, S.agito - 0.7 * dt);
  }

  // ------------------------------------------------------------------ metas
  const metaAtual = () => METAS[P.meta] || null;

  /** Progresso 0..1 da meta da vez. */
  function progresso(me, med) {
    const E = S.ev;
    const pedacos = contarPedacos();
    switch (me.id) {
      case 'estica': return Math.min(1, E.esticou);
      case 'vidro': return E.grudou ? 1 : 0;
      case 'frio': {
        let f = 0;
        for (const v of med.values()) f = Math.max(f, v.f);
        return Math.min(1, f / 0.8);
      }
      case 'derrete': {
        let q = 0;
        for (const v of med.values()) q = Math.max(q, v.q);
        return Math.min(1, q / 0.75);
      }
      case 'corta': case 'corta6': return Math.min(1, pedacos / me.n);
      case 'cola': return pedacos <= 1 && (E.colou > 0 || S.metaIni <= 1) ? 1 : (S.maxPedacos - pedacos) / Math.max(1, S.maxPedacos - 1);
      case 'caretas': return Math.min(1, E.caretas.size / me.n);
      case 'pinta': return Math.min(1, E.cores.size / me.n);
      case 'missil': return E.explodiu ? 1 : 0;
      case 'martela': return Math.min(1, E.marteladas / me.n);
      case 'cocegas': return E.cocegas ? 1 : 0;
      case 'tonto': return E.tonto ? 1 : 0;
      case 'album': return Math.min(1, P.album.length / me.n);
      default: return 0;
    }
  }

  function metas(med) {
    const me = metaAtual();
    if (!me) return;
    S.maxPedacos = Math.max(S.maxPedacos, contarPedacos());
    S.prog = progresso(me, med);
    if (S.prog < 1) return;
    P.estrelas++;
    P.meta++;
    S.cartoes.push({ tipo: 'meta', titulo: 'Meta cumprida!', sub: me.texto, icone: me.icone, t: 0 });
    eventos.push({ tipo: 'som', nome: 'missao' });
    eventos.push({ tipo: 'nivel', n: P.meta, acao: 'complete' });
    S.ev = zerarEv();
    S.metaIni = contarPedacos();
    S.maxPedacos = S.metaIni;
    S.prog = 0;
  }

  // ------------------------------------------------------------------ bot e mao fantasma
  /**
   * Gesto roteirizado: quadros-chave [t, x, y] com a fase em cada um ('baixo' no primeiro,
   * 'cima' no ultimo); entre eles o dedo anda em linha reta a cada quadro.
   */
  function tocar(pts, fonte) {
    S.roteiro = { pts, t: 0, k: 0, fonte };
  }

  function passoRoteiro(dt) {
    const R = S.roteiro;
    if (!R) return;
    R.t += dt;
    const p = R.pts;
    while (R.k < p.length && p[R.k][0] <= R.t) {
      const [, x, y, f] = p[R.k];
      if (f) entrada(x, y, f, R.fonte);
      else entrada(x, y, 'mover', R.fonte);
      R.k++;
    }
    if (R.k >= p.length) { S.roteiro = null; return; }
    if (R.k > 0 && S.dedo.baixo) {
      const [ta, xa, ya] = p[R.k - 1];
      const [tb, xb, yb] = p[R.k];
      const u = (R.t - ta) / Math.max(1e-6, tb - ta);
      entrada(xa + (xb - xa) * u, ya + (yb - ya) * u, 'mover', R.fonte);
    }
  }

  /** Mao fantasma (onboarding): antes do primeiro toque, puxa o slime de verdade e solta. */
  function fantasma(dt) {
    if (S.tocou || S.roteiro) return;
    S.fantasmaT -= dt;
    if (S.fantasmaT > 0 || S.t < 0.8) return;
    S.fantasmaT = 1.4;
    const s = principal();
    if (!s) return;
    const lado = s.cx <= 0 ? 1 : -1;
    const x = s.cx + lado * 0.9;
    const y = s.topo - 0.5;
    const xf = limitar(x + lado * 1.6, CAIXA.x0 + 0.8, CAIXA.x1 - 0.8);
    const yf = Math.min(CAIXA.y1 - 1, y + 5.5);
    tocar([[0, x, y, 'baixo'], [0.3, x, y], [1.3, xf, yf], [1.8, xf, yf], [1.9, xf, yf, 'cima']], 'fantasma');
  }

  /** Roteiro do bot: todas as ferramentas (uma acao por chamada). */
  const BOT = ['esperar', 'estica', 'arremessa', 'cocegas', 'gelo', 'martelo', 'esperar', 'calor', 'esperar', 'corta', 'corta', 'corta',
    'cola', 'esperar', 'esperar', 'chacoalha', 'martelo', 'cutuca', 'mira', 'esperar', 'cola', 'esperar', 'esperar', 'tinta', 'tinta', 'esperar'];

  function bot() {
    S.tocou = true;
    if (S.roteiro || S.missil) return;
    // o arremessado ainda voa ou escorre no vidro: espera
    if (ativos().some((q) => q.ader > 0 && S.t - (q.dados.lancado || 0) < 1.6)) return;
    const s = principal();
    if (!s) return;
    const passo = BOT[S.botK % BOT.length];
    S.botK++;
    const lado = s.cx <= 0 ? 1 : -1;
    const ferr = (id) => { if (S.ferramenta !== id) S.ferramenta = id; };
    switch (passo) {
      case 'estica': {
        // pega no alto e puxa para cima (a base fica no chao como ventosa)
        ferr('mao');
        const x = s.cx + lado * 0.8;
        const y = s.topo - 0.5;
        const xf = limitar(x + lado * 1.5, CAIXA.x0 + 0.8, CAIXA.x1 - 0.8);
        const yf = Math.min(CAIXA.y1 - 0.6, y + 6.8);
        tocar([[0, x, y, 'baixo'], [1.0, xf, yf], [1.5, xf, yf], [1.8, xf, yf - 1.5], [1.85, xf, yf - 1.5, 'cima']], 'bot');
        break;
      }
      case 'arremessa': {
        ferr('mao');
        const x = s.cx;
        const y = s.cy + 0.4;
        tocar([[0, x, y, 'baixo'], [0.3, x - lado * 0.8, y + 0.4], [0.45, x + lado * 1.8, y + 2.6], [0.47, x + lado * 2, y + 2.8, 'cima']], 'bot');
        break;
      }
      case 'cocegas': {
        ferr('mao');
        const x = s.cx;
        const y = s.topo - 0.5;
        const pts = [[0, x, y, 'baixo']];
        for (let k = 1; k <= 8; k++) pts.push([k * 0.11, x + (k % 2 ? 0.9 : -0.9), y]);
        pts.push([1.0, x, y]);
        pts.push([1.3, x, y]);
        pts.push([1.32, x, y, 'cima']);
        tocar(pts, 'bot');
        break;
      }
      case 'chacoalha': {
        ferr('mao');
        const x = s.cx;
        const y = s.cy + 0.3;
        const pts = [[0, x, y, 'baixo']];
        for (let k = 1; k <= 6; k++) pts.push([k * 0.22, limitar(x + (k % 2 ? 3.2 : -3.2), CAIXA.x0 + 1, CAIXA.x1 - 1), y + 2.5]);
        pts.push([1.5, x, y + 1.5]);
        pts.push([1.8, x, y + 1.5]);
        pts.push([1.82, x, y + 1.5, 'cima']);
        tocar(pts, 'bot');
        break;
      }
      case 'cutuca':
        ferr('mao');
        tocar([[0, s.cx + 0.4, s.topo - 0.4, 'baixo'], [0.08, s.cx + 0.4, s.topo - 0.4, 'cima']], 'bot');
        break;
      case 'gelo': case 'calor': case 'cola': case 'mira': case 'tinta': {
        ferr(passo);
        const dx = passo === 'tinta' ? (S.tinta % 2 ? 1 : -1) * s.raio0 * 0.6 : 0;
        tocar([[0, s.cx + dx, s.cy + 0.3, 'baixo'], [0.1, s.cx + dx, s.cy + 0.3, 'cima']], 'bot');
        break;
      }
      case 'martelo':
        ferr('martelo');
        tocar([[0, s.cx + (S.botK % 3 - 1) * 0.5, s.topo + 1, 'baixo'], [0.1, s.cx, s.topo + 1, 'cima']], 'bot');
        break;
      case 'corta': {
        ferr('tesoura');
        const k = S.botK % 3;
        const r = s.raio0 + 0.8;
        const [ux, uy] = k === 0 ? [0, 1] : k === 1 ? [1, 0.15] : [0.7, 0.7];
        tocar([[0, s.cx - ux * r, s.cy - uy * r, 'baixo'], [0.35, s.cx + ux * r, s.cy + uy * r], [0.4, s.cx + ux * r, s.cy + uy * r, 'cima']], 'bot');
        break;
      }
      default:
        break;
    }
  }

  // ------------------------------------------------------------------ desenho
  /** Visual do quadro (render/prototipos/aperta.js). */
  function visual() {
    const m = S.m;
    const D = S.dedo;
    const M = S.missil;
    const med = S.medias || new Map();
    const gelados = [];
    const quentes = [];
    for (const s of ativos()) {
      const v = med.get(s.idx);
      if (!v) continue;
      if (v.f > 0.05) gelados.push({ idx: s.idx, f: v.f });
      if (v.q > 0.05 || s.estado === 'calor') quentes.push({ cx: s.cx, topo: s.topo, esq: s.esq, dir: s.dir, q: Math.max(v.q, s.estado === 'calor' ? 0.5 : 0) });
    }
    const R = S.roteiro;
    const fant = R && R.fonte === 'fantasma';
    const recente = D.baixo || S.t - D.tMov < 1.6;
    const ancora = S.cola > 0 ? principal() : null;
    return {
      potes: [{ idx: [0, 1, 2, 3], cesto: { estilo: 'vidro' } }],
      olhar: M ? [M.x, M.y] : recente ? [D.x, D.y] : null,
      missil: M ? { x: M.x, y: M.y, r: M.r, cor: M.cor, t: M.t, ...MISSIL } : null,
      tremor: S.tremor > 0 ? { x: Math.sin(S.t * 90) * S.tremor * 1.6, y: Math.cos(S.t * 77) * S.tremor * 1.2 } : null,
      caixa: CAIXA,
      t: S.t,
      ferramenta: S.ferramenta,
      toque: !!o.toque,
      cursor: { x: D.x, y: D.y, baixo: D.baixo, visivel: !fant && (D.baixo || (!o.toque && S.t - D.tMov < 3)), pegou: !!S.agarre },
      fantasma: fant ? { x: D.x, y: D.y, baixo: D.baixo } : null,
      corte: S.corte,
      martelo: S.martelo,
      sopro: S.sopro,
      frio,
      gelados,
      quentes,
      cola: ancora ? { x: ancora.cx, y: ancora.cy, k: Math.min(1, S.cola), pedacos: ativos().filter((s) => s !== ancora).map((s) => [s.cx, s.cy]) } : null,
      rastros: S.rastros,
      cartao: S.cartoes.length ? S.cartoes[0] : null,
      duraCartao: DURA_CARTAO,
    };
  }

  /** Pilula da meta (altura fixa: a camera nao respira). */
  function pilula() {
    const me = metaAtual();
    const box = 'style="height:3.1em;box-sizing:border-box;min-width:15.5em;max-width:94vw"';
    if (!me) {
      return `<div class="pedido proto" ${box}><span style="font-size:1.5em">🏆</span><span>Todas as metas! Brinque à vontade</span>`
        + `<span class="sub">Caretas ${P.album.length}/${ALBUM.length}</span></div>`;
    }
    const pct = Math.round(limitar(S.prog || 0, 0, 1) * 20) * 5;
    return `<div class="pedido proto" ${box}><span style="font-size:1.5em;line-height:1">${me.icone}</span>`
      + '<span style="display:flex;flex-direction:column;gap:0.2em;min-width:0">'
      + `<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:0.92em">${me.texto}</span>`
      + `<span class="medidor" style="width:100%"><b style="width:${pct}%"></b></span></span>`
      + `<span class="sub" style="white-space:nowrap">${Math.min(P.meta + 1, METAS.length)}/${METAS.length}</span></div>`;
  }

  /** Ferramenta da vez (botao do HUD ou teclas 1-8). @param {string} id */
  function escolher(id) {
    if (!FERRAMENTAS.includes(id)) return;
    S.ferramenta = id;
    eventos.push({ tipo: 'som', nome: 'interface' });
  }

  novo();

  return {
    id: 'aperta',
    get mundo() { return S.m; },
    get estado() { return S; },
    janela: [CAIXA.x0 - 0.75, CAIXA.y0 - 1.2, CAIXA.x1 + 0.75, CAIXA.y1 + 0.9],
    campoJanela: [CAIXA.x0 - 0.3, CAIXA.y0 - 0.3, CAIXA.x1 + 0.3, CAIXA.y1 + 0.3],
    eventos,
    semGotas: true,
    botoes: {
      mao: { svg: svg(SVG.mao), nome: 'Mão' },
      martelo: { svg: svg(SVG.martelo), nome: 'Martelo' },
      cola: { svg: svg(SVG.cola), nome: 'Cola' },
    },
    desenho: { cenario, fundo, topo },
    passo(dt) {
      S.t += dt;
      const m = S.m;
      fantasma(dt);
      passoRoteiro(dt);
      // velocidade do dedo (media curta; os eventos de mover chegam em qualquer ritmo)
      const D = S.dedo;
      D.vx += ((D.x - D.xq) / dt - D.vx) * 0.5;
      D.vy += ((D.y - D.yq) / dt - D.vy) * 0.5;
      D.xq = D.x;
      D.yq = D.y;
      puxarAgarre();
      if (S.martelo) {
        S.martelo.t += dt;
        if (!S.martelo.bateu && S.martelo.t >= 0.11) batida();
        if (S.martelo.t > 0.5) S.martelo = null;
      }
      if (S.sopro) { S.sopro.t += dt; if (S.sopro.t > 0.8) S.sopro = null; }
      if (S.tremor > 0) S.tremor = Math.max(0, S.tremor - dt);
      m.avancar(4);
      m.medir(dt);
      difundir(m, dt, { taxa: 1.2 });
      temperatura(dt);
      // (membros valem ate a proxima mudanca de estrutura)
      S.medias = medias();
      vidro(dt);
      impactos(dt);
      vaiEVem();
      rostos(dt);
      if (S.agarre && S.dedo.fonte !== 'fantasma') {
        const s = m.slimes[S.agarre.dono];
        if (s && s.ativo) {
          const c = comprimento(s);
          S.agarre.maxComp = Math.max(S.agarre.maxComp, c);
          if (S.agarre.ancorado && c > AJUSTE.solta) {
            S.agarre.ancorado = false;
            eventos.push({ tipo: 'som', nome: 'splat' });
            rosto(s, 'susto', 0.9);
          }
          S.ev.esticou = Math.max(S.ev.esticou, (c - 1) / (AJUSTE.estica - 1));
        }
      }
      // o calor acabou: a forma de repouso volta a ser o disco (ele se junta de novo, mole)
      for (const s of ativos()) {
        const quente = s.estado === 'calor';
        if (s.dados.eraQuente && !quente) { m.refazerForma(s); m.amolecer(s, 0.25, 0.8); }
        s.dados.eraQuente = quente;
      }
      S.tHex -= dt;
      if (S.tHex <= 0) {
        S.tHex = 0.25;
        for (const s of ativos()) s.dados.hex = hexDaMistura(pigmentoMedio(m, s));
      }
      if (S.pinta) {
        S.pinta.t -= dt;
        if (S.pinta.t <= 0) {
          const q = m.slimes[S.pinta.idx];
          if (q.ativo && q.pigAlvo === S.pinta.pig) {
            q.pigAlvo = null;
            for (let i = 0; i < m.n; i++) if (m.sl[i] === q.idx) m.fr[i] = 0;
          }
          S.pinta = null;
        }
      }
      // mudancas de estrutura (o pop, a cola e o missil): depois das leituras dos membros
      pops();
      if (S.missil) avancarMissil(dt);
      passoCola(dt);
      segurar();
      metas(S.medias);
      if (S.cartoes.length) {
        // fila curta: com outro esperando, o da vez anda mais rapido
        S.cartoes[0].t += dt * (S.cartoes.length > 1 ? 1.8 : 1);
        if (S.cartoes[0].t > DURA_CARTAO) S.cartoes.shift();
        while (S.cartoes.length > 3) S.cartoes.splice(1, 1);
      }
    },
    apontar(x, y, fase) {
      if (fase === 'baixo') {
        // o primeiro toque do jogador tira a mao fantasma
        if (!S.tocou && S.roteiro && S.roteiro.fonte === 'fantasma') {
          S.roteiro = null;
          if (S.dedo.baixo) entrada(S.dedo.x, S.dedo.y, 'cima', 'fantasma');
        }
        S.tocou = true;
      }
      if (S.roteiro && S.roteiro.fonte === 'bot') return;
      entrada(x, y, fase, 'jogador');
    },
    tecla(codigo, baixo) {
      if (!baixo) return;
      const k = /^Digit[1-8]$/.test(codigo) ? Number(codigo.slice(5)) - 1 : -1;
      if (k >= 0) escolher(FERRAMENTAS[k]);
    },
    poder: escolher,
    bot,
    hud() {
      return {
        pontos: '★ ' + P.estrelas,
        recorde: 'Caretas ' + P.album.length + '/' + ALBUM.length,
        metaHtml: pilula(),
        poderes: FERRAMENTAS.map((id) => ({ id, ativo: S.ferramenta === id })),
      };
    },
    visual,
    reiniciar() { novo(); },
    salvar() { return { estrelas: P.estrelas, meta: P.meta, album: P.album.slice() }; },
    /** Para testes e prints: ferramentas usadas na sessao. */
    get usadas() { return [...S.usadas]; },
  };
}

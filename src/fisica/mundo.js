// Motor do slime: particulas PBD com shape matching plastico por cluster (desenho do FLEX,
// Macklin et al. 2014), em subpassos pequenos (Muller et al. 2020: 1 iteracao por subpasso).
//
// Puro e deterministico: sem DOM, sem relogio, sem Math.random; so + - * / e sqrt
// (vigiado por test/estilo.test.js). A mesma semente e as mesmas acoes dao o mesmo
// resultado no Node, no Chrome e no Safari: testes, desafio diario e GIFs reprodutiveis.
//
// Mundo com y para cima; 1 u = 1/10 da boca do pote. Arrays SoA (Float64Array), sem
// alocacao no laco. Cada slime e um cluster de particulas de raio fixo (polidisperso +-12%,
// para nao cristalizar em piramide).
//
// Ordem do subpasso (dt = 1/240 s):
//   1. preve (gravidade, amortecimento, teto de velocidade; o slime "preso" segue o alvo)
//   2. shape matching por slime (+ plasticidade: a forma de repouso rasteja para a atual
//      acima do limite de escoamento; + memoria: sem carga, volta ao disco original)
//   3. pares pela grade (counting sort) e contato entre todas as particulas (com escala de
//      massa pela altura e atrito so entre slimes diferentes), coesao dentro do slime
//   4. paredes (capsulas, com atrito e velocidade propria)
//   5. velocidade = deslocamento / dt, viscosidade XSPH dentro do slime e amortecimento de
//      corpo rigido (mata o tremor sem matar o giro)
//   6. contatos persistentes entre slimes (para a fusao) e despertar de quem foi empurrado.
//      A fusao conta PROXIMIDADE (particulas a ate PERTO * (ri + rj)), e nao a penetracao do
//      solver: encostados em repouso, o contato deixa os dois exatamente na distancia de toque
//      e a penetracao pisca entre 0 e 1 par (iguais encostados nao fundiam). Conta tambem entre
//      dois slimes dormindo (sem isso, iguais que adormeciam encostados ficavam assim).

import { MATERIAIS, ESTADOS } from './materiais.js';
import { discoHex, discoAneis, atribuirAoDisco, particulasGirassol } from './forma.js';
import { criarRng } from '../core/rng.js';

export const R_PART = 0.14;
export const DT = 1 / 240;
export const GRAVIDADE = 50;
export const VMAX = (0.8 * R_PART) / DT;
export const MAX_SLIMES = 128;
export const N_IDS = 4;
export const N_PIG = 4;
/** Velocidade padrao da rampa da rigidez (1/s): 0,25 s de "gloop" depois de fundir, dividir ou mudar de tamanho. */
export const RAMPA_VEL = 4;
const POLI = 0.1;
/** Espacamento do reticulado de repouso: a maior soma de raios (a forma de repouso nunca
 * pede sobreposicao, senao o shape matching briga com o contato e o slime treme). */
export const ESPACO = 2 * R_PART * (1 + POLI);
const ALCANCE = 1.4; // pares guardados ate ALCANCE * (ri + rj): coesao e viscosidade
const PERTO = 1.08; // contato para a fusao: particulas de slimes diferentes ate PERTO * (ri + rj)
/** Ajustes globais do solver (o lab mexe neles pelo ?debug). */
export const CONFIG_PADRAO = Object.freeze({
  amort: 0.3, // amortecimento global (1/s)
  kAltura: 1.5, // escala de massa pela altura (shock propagation), por u
  iter: 3, // passes de contato por subpasso
  membrana: 1.0, // >1 afasta slimes diferentes (testado 1,12: pilha mais mole e fofa)
  celulas: 0.5, // forca da fronteira entre slimes encostados (pelo ponto de toque; 0 desliga)
  preEstab: true, // separa sobreposicoes no inicio do quadro sem gerar velocidade
  posEstab: true, // e no fim de cada subpasso, depois de medir a velocidade
});
const V_DORME = 0.12; // u/s
const T_DORME = 0.5; // s parado para dormir
const JANELA_SONO = 0.25; // s: o sono mede o deslocamento liquido nessa janela
const PEN_ACORDA = 0.03; // u de penetracao que acorda um slime dormindo
const ASSENTAR_QUADROS = 10; // quadros de separacao extra depois de particulas novas
const ASSENTAR_PASSES = 6; // passes so de posicao em cada um deles
const ESTICADA = 2.5; // raios do slime: no personagem, a particula mais longe do centro que isso nao tem atrito com a parede
/**
 * Aderencia ao vidro (slime com `ader` = 1, no lado `gruda` da parede; aderirParedes):
 *   banda   u alem do toque em que a parede ainda puxa a particula
 *   acel    o maximo que a parede puxa cada particula (u/s2)
 *   puxa    fracao da folga ate o toque fechada por subpasso
 *   arrasto fracao da velocidade tangente (relativa a parede) de cada particula encostada tirada por subpasso
 *   cheio   particulas encostadas para o corpo grudar com a forca toda
 *   acelN   o maximo que o vidro segura o corpo que se afasta (u/s2)
 *   vel     velocidade maxima do corpo ao longo do vidro (u/s): o escorrer
 *   acelT   o maximo que o vidro freia o corpo acima de `vel` (u/s2; > gravidade, senao nao freia)
 *   giro    fracao do giro do corpo tirada por subpasso (rolar nao escorrega)
 *   mole    rigidez (fracao do k) do slime grudado na parede de lado
 *   teto    abaixo desta componente vertical da normal (vidro virado para baixo) nao gruda
 *   chao    acima dela (fundo, aba da boca do aquario) tambem nao: escorrer e na parede de lado
 *   vBorda  em cima da borda, a velocidade maxima do corpo para dentro do pote (u/s)
 */
export const ADER = Object.freeze({ banda: 0.2, acel: 200, puxa: 0.3, arrasto: 0.1, cheio: 3, acelN: 150, vel: 3.5, acelT: 150, giro: 0.1, mole: 0.5, teto: -0.25, chao: 0.7, vBorda: 1 });

/**
 * @typedef {Object} Slime
 * @property {number} idx        posicao na tabela (estavel enquanto vivo)
 * @property {boolean} ativo
 * @property {import('./materiais.js').Material} mat
 * @property {'normal'|'calor'|'gelo'} estado
 * @property {number} tEstado   s restantes do estado temporario
 * @property {number} nivel     dado do jogo
 * @property {number} idv       0..3: vetor de identidade do render (linha entre slimes)
 * @property {boolean} preso    cinematico: segue (alvoX, alvoY) sem gravidade
 * @property {number} alvoX
 * @property {number} alvoY
 * @property {number} rampa     0..1: rigidez crescendo depois da fusao ("gloop")
 * @property {number} rampaVel  quanto a rampa sobe por segundo (0 = segura mole: fusao em andamento)
 * @property {boolean} dormindo
 * @property {number} tParado
 * @property {number} nPlast    particulas escoando no ultimo subpasso
 * @property {number} nasceu    tempo do mundo em que nasceu
 * @property {number} n         particulas (medir)
 * @property {number} cx
 * @property {number} cy
 * @property {number} vx
 * @property {number} vy
 * @property {number} topo      maior y + raio
 * @property {number} base
 * @property {number} esq
 * @property {number} dir
 * @property {number} cos       rotacao do shape matching
 * @property {number} sin
 * @property {number} a11       deformacao total em relacao ao disco original (rosto)
 * @property {number} a12
 * @property {number} a21
 * @property {number} a22
 * @property {number} raio0     raio do disco original
 * @property {number} pressao   media de penetracao recebida de outros slimes (medir)
 * @property {boolean} livre    sem contato com outros slimes e andando (a memoria so age assim)
 * @property {number[]|null} pigAlvo  cor nova da frente de transmutacao (src/cor/difusao.js)
 * @property {boolean} misturando     pigmento ainda desigual (nao dorme ate assentar a cor)
 * @property {number} ader      0..1: gruda no lado `gruda` das paredes e escorrega devagar (0 = nao; o jogo liga na soltura)
 * @property {Record<string, any>} dados  livre para o modo de jogo
 */

/**
 * @param {{ capacidade?: number, semente?: number, limites?: number[], config?: Partial<typeof CONFIG_PADRAO> }} [o]
 */
export function criarMundo({ capacidade = 4096, semente = 1, limites = [-16, -8, 16, 34], config } = {}) {
  const cap = capacidade;
  const cfg = { ...CONFIG_PADRAO, ...(config || {}) };
  const x = new Float64Array(cap);
  const y = new Float64Array(cap);
  const px = new Float64Array(cap);
  const py = new Float64Array(cap);
  const vx = new Float64Array(cap);
  const vy = new Float64Array(cap);
  const rad = new Float64Array(cap);
  const inv = new Float64Array(cap);
  const mas = new Float64Array(cap);
  const qx = new Float64Array(cap);
  const qy = new Float64Array(cap);
  const ox = new Float64Array(cap);
  const oy = new Float64Array(cap);
  const pen = new Float64Array(cap); // penetracao recebida de outros slimes no subpasso
  const sl = new Int32Array(cap);
  const pig = new Float64Array(cap * N_PIG);
  const fr = new Float64Array(cap); // frente de transmutacao (src/cor/transmutacao.js)
  const xm = new Float64Array(cap); // posicao no medir anterior (sono por deslocamento)
  const ym = new Float64Array(cap);

  /** @type {Slime[]} */
  const slimes = [];
  for (let k = 0; k < MAX_SLIMES; k++) slimes.push(/** @type {Slime} */ ({ idx: k, ativo: false }));
  const membros = new Int32Array(cap);
  const iniSl = new Int32Array(MAX_SLIMES + 1);
  const marca = new Uint8Array(MAX_SLIMES);
  let sujo = true;
  /** quadros que ainda separam as particulas novas so na posicao (preEstabilizar) */
  let assentarNovas = 0;

  // grade
  const [gx0, gy0, gx1, gy1] = limites;
  const CEL = ALCANCE * 2 * R_PART * (1 + POLI);
  const ncx = Math.ceil((gx1 - gx0) / CEL);
  const ncy = Math.ceil((gy1 - gy0) / CEL);
  const celIni = new Int32Array(ncx * ncy + 1);
  const celCur = new Int32Array(ncx * ncy);
  const celDe = new Int32Array(cap);
  const ordem = new Int32Array(cap);
  // copias na ordem das celulas: as vizinhas que o laco dos pares le ficam juntas na memoria
  const xo = new Float64Array(cap);
  const yo = new Float64Array(cap);
  const ro = new Float64Array(cap);
  const so = new Int32Array(cap);
  const fo = new Uint8Array(cap); // bit 1: parada; bit 2: preso
  let pares = new Int32Array(cap * 16);
  let rijP = new Float64Array(cap * 8);
  let nPares = 0;
  // por particula, marcados no comeco de cada construirPares (e no despertar dentro dos contatos):
  // os lacos dos pares e das paredes nao consultam o objeto do slime a cada vizinho
  const pp = new Uint8Array(cap); // parada (slime dormindo ou preso)
  const pw = new Float64Array(cap); // peso do contato sem a altura: 0 se parada, senao inv
  const pl = new Uint8Array(cap); // slime preso

  // paredes: baldes grossos para achar so as particulas perto de cada parede (antes, cada uma
  // das 14 paredes do pote percorria todas as particulas, 9 vezes por quadro: 15% da fisica)
  const PCEL = 1;
  const pncx = Math.ceil((gx1 - gx0) / PCEL);
  const pncy = Math.ceil((gy1 - gy0) / PCEL);
  const pIni = new Int32Array(pncx * pncy + 1);
  const pCur = new Int32Array(pncx * pncy);
  const pCa = new Int32Array(cap); // balde de (x, y) no comeco da chamada
  const pCb = new Int32Array(cap); // balde de (px, py), -1 se e o mesmo
  const pLista = new Int32Array(cap * 2);
  const pVisto = new Int32Array(cap); // carimbo da parede da vez: cada particula uma vez por parede
  let pCarimbo = 0;
  const pMov = new Int32Array(cap); // carimbo da chamada: a particula ja andou por uma parede
  let pMovCarimbo = 0;
  const movidas = new Int32Array(cap);
  let nMovidas = 0;

  // centroides por subpasso (fronteira entre slimes)
  const cxS = new Float64Array(MAX_SLIMES);
  const cyS = new Float64Array(MAX_SLIMES);
  const carimbo = new Int32Array(MAX_SLIMES).fill(-1);

  // contatos entre slimes
  const toque = new Uint16Array(MAX_SLIMES * MAX_SLIMES);
  // soma dos pontos medios dos pares em contato neste subpasso (fronteira entre slimes)
  const toqueX = new Float64Array(MAX_SLIMES * MAX_SLIMES);
  const toqueY = new Float64Array(MAX_SLIMES * MAX_SLIMES);
  let tocadosAgora = new Int32Array(4096);
  let nAgora = 0;
  // proximidade entre slimes (fusao e vizinhanca): pares de particulas perto neste subpasso,
  // e ha quantos subpassos seguidos o par de slimes esta perto
  const perto = new Uint16Array(MAX_SLIMES * MAX_SLIMES);
  const persist = new Uint8Array(MAX_SLIMES * MAX_SLIMES);
  let pertoAgora = new Int32Array(1024);
  let nPertoAgora = 0;
  let pertoAntes = new Int32Array(1024);
  let nPertoAntes = 0;

  /**
   * Paredes: a base (ax..by, andando com vax..vby por t s: Alargar, crescer) e o tremor (tx, ty)
   * separado da base, que anda com (svx, svy) por st s ate (atx, aty) (terremoto). O contato usa
   * base + tremor; quem le a geometria do pote (mira, pouso, HUD) le a base, que nao treme.
   * @type {{ ax: number, ay: number, bx: number, by: number, r: number, vax: number, vay: number, vbx: number, vby: number, t: number,
   *   tx: number, ty: number, svx: number, svy: number, st: number, atx: number, aty: number, oculta: boolean, gruda: number,
   *   livreA: boolean, livreB: boolean }[]}
   */
  let paredes = [];

  const rng = criarRng(semente);
  let n = 0;
  let passoN = 0;
  const mundo = {
    x, y, px, py, vx, vy, rad, inv, mas, qx, qy, ox, oy, sl, pig, fr, slimes, membros, iniSl, cfg,
    get n() { return n; },
    get pares() { return pares; },
    get nPares() { return nPares; },
    get paredes() { return paredes; },
    tempo: 0,
    gx: 0,
    gy: -GRAVIDADE,
    chaoY: 0,
    /** fator de tempo (valvula de seguranca de desempenho e camera lenta) */
    escalaTempo: 1,
    criarSlime,
    remover,
    removerParticulas,
    fundir,
    redimensionar,
    dividir,
    atrair,
    aparar,
    refazerForma,
    recolocar,
    reposicionar,
    amolecer,
    pertoDe,
    escalarForma,
    soltar,
    moverPreso,
    definirParedes,
    moverParede,
    tremerParedes,
    empurrar,
    puxar,
    acordarTodos,
    avancar,
    medir,
    reconstruir,
    contatos,
    vivos,
    hash,
  };

  // ------------------------------------------------------------------ slimes

  function slotLivre() {
    for (let k = 0; k < MAX_SLIMES; k++) if (!slimes[k].ativo) return k;
    return -1;
  }

  /**
   * Novo slime em disco hexagonal, ou com as particulas em `pontos` (posicoes absolutas [x0, y0,
   * x1, y1, ...]; a forma de repouso e a de agora: a partida salva volta com cada slime achatado
   * como estava).
   * @param {{ x: number, y: number, n?: number, diametro?: number, material?: string|import('./materiais.js').Material,
   *   pigmento?: number[], nivel?: number, preso?: boolean, idv?: number, vx?: number, vy?: number, pontos?: number[] }} o
   * @returns {Slime|null}
   */
  function criarSlime(o) {
    const k = slotLivre();
    if (k < 0) return null;
    const pts = o.pontos && o.pontos.length >= 6 ? o.pontos : null;
    const qtd = pts ? pts.length >> 1 : o.n || particulasGirassol(o.diametro || 1.3, ESPACO);
    if (n + qtd > cap) return null;
    const disco = discoAneis(qtd, ESPACO);
    // com os pontos, a forma de repouso e a posicao de cada um em volta da media
    let mx = o.x;
    let my = o.y;
    if (pts) {
      mx = 0;
      my = 0;
      for (let a = 0; a < qtd; a++) { mx += pts[2 * a]; my += pts[2 * a + 1]; }
      mx /= qtd;
      my /= qtd;
    }
    const s = slimes[k];
    iniciarSlime(s, pts ? { ...o, x: mx, y: my } : o);
    const pg = o.pigmento || [0, 0, 0, 0];
    for (let a = 0; a < qtd; a++) {
      const i = n++;
      const r = R_PART * (1 - POLI + 2 * POLI * rng());
      rad[i] = r;
      const m = (r * r) / (R_PART * R_PART);
      mas[i] = m;
      inv[i] = 1 / m;
      const dx = pts ? pts[2 * a] - mx : disco[2 * a];
      const dy = pts ? pts[2 * a + 1] - my : disco[2 * a + 1];
      qx[i] = ox[i] = dx;
      qy[i] = oy[i] = dy;
      x[i] = px[i] = xm[i] = mx + dx;
      y[i] = py[i] = ym[i] = my + dy;
      vx[i] = o.vx || 0;
      vy[i] = o.vy || 0;
      sl[i] = k;
      pen[i] = 0;
      fr[i] = 0;
      for (let c = 0; c < N_PIG; c++) pig[i * N_PIG + c] = pg[c] || 0;
    }
    s.raio0 = raioDoDisco(disco);
    sujo = true;
    return s;
  }

  /** @param {Slime} s @param {any} o */
  function iniciarSlime(s, o) {
    s.ativo = true;
    s.mat = typeof o.material === 'object' && o.material ? o.material : MATERIAIS[o.material || 'gelatina'] || MATERIAIS.gelatina;
    s.estado = 'normal';
    s.tEstado = 0;
    s.nivel = o.nivel || 0;
    s.idv = o.idv !== undefined ? o.idv : idvLivre(-1);
    s.preso = !!o.preso;
    s.alvoX = o.x;
    s.alvoY = o.y;
    s.rampa = o.rampa !== undefined ? o.rampa : 1;
    s.rampaVel = RAMPA_VEL;
    s.dormindo = false;
    s.tParado = 0;
    s.nPlast = 0;
    s.nasceu = mundo.tempo;
    s.n = 0;
    s.cx = o.x;
    s.cy = o.y;
    s.vx = 0;
    s.vy = 0;
    s.topo = o.y;
    s.base = o.y;
    s.esq = o.x;
    s.dir = o.x;
    s.cos = 1;
    s.sin = 0;
    s.a11 = 1;
    s.a12 = 0;
    s.a21 = 0;
    s.a22 = 1;
    s.pressao = 0;
    s.livre = true;
    s.pigAlvo = null;
    s.misturando = false;
    s.ader = 0;
    s.raio0 = 0;
    s.dados = {};
  }

  /** @param {Float64Array} disco */
  function raioDoDisco(disco) {
    let m = 0;
    for (let a = 0; a < disco.length; a += 2) {
      const d2 = disco[a] * disco[a] + disco[a + 1] * disco[a + 1];
      if (d2 > m) m = d2;
    }
    return Math.sqrt(m) + R_PART;
  }

  /** O menor idv que nenhum vizinho de `idx` usa (sem vizinhos: gira pelos 6). */
  function idvLivre(idx) {
    let usados = 0;
    if (idx >= 0) {
      for (let a = 0; a < nPertoAntes; a++) {
        const key = pertoAntes[a];
        const i = (key / MAX_SLIMES) | 0;
        const j = key - i * MAX_SLIMES;
        if (i === idx && slimes[j].ativo) usados |= 1 << slimes[j].idv;
        if (j === idx && slimes[i].ativo) usados |= 1 << slimes[i].idv;
      }
    }
    const base = idx >= 0 ? 0 : (passoN + n) % N_IDS;
    for (let t = 0; t < N_IDS; t++) {
      const v = (base + t) % N_IDS;
      if (!(usados & (1 << v))) return v;
    }
    return base;
  }

  /** Copia a particula u para a posicao i (remocao por troca com a ultima). */
  function copiar(u, i) {
    x[i] = x[u]; y[i] = y[u]; px[i] = px[u]; py[i] = py[u]; vx[i] = vx[u]; vy[i] = vy[u];
    rad[i] = rad[u]; inv[i] = inv[u]; mas[i] = mas[u]; qx[i] = qx[u]; qy[i] = qy[u];
    ox[i] = ox[u]; oy[i] = oy[u]; sl[i] = sl[u]; pen[i] = pen[u]; fr[i] = fr[u]; xm[i] = xm[u]; ym[i] = ym[u];
    for (let c = 0; c < N_PIG; c++) pig[i * N_PIG + c] = pig[u * N_PIG + c];
  }

  /**
   * Remove particulas pelos indices (qualquer ordem). Devolve [x, y, slime, ...] das removidas.
   * @param {number[]} lista
   */
  function removerParticulas(lista) {
    const ord = lista.slice().sort((a, b) => b - a);
    const out = [];
    let ant = -1;
    for (const i of ord) {
      if (i === ant || i >= n) continue;
      ant = i;
      out.push(x[i], y[i], sl[i]);
      const u = --n;
      if (i !== u) copiar(u, i);
    }
    sujo = true;
    return out;
  }

  /**
   * Remove o slime inteiro. Devolve [x, y, slime, ...] das particulas (VFX).
   * @param {Slime} s
   */
  function remover(s) {
    if (!s.ativo) return [];
    const lista = [];
    for (let i = 0; i < n; i++) if (sl[i] === s.idx) lista.push(i);
    const out = removerParticulas(lista);
    s.ativo = false;
    limparContatos(s.idx);
    acordarTodos();
    return out;
  }

  /** @param {number} idx */
  function limparContatos(idx) {
    for (let k = 0; k < MAX_SLIMES; k++) {
      persist[idx * MAX_SLIMES + k] = 0;
      persist[k * MAX_SLIMES + idx] = 0;
    }
  }

  /**
   * Funde b (um ou varios) em a. Sobram nAlvo particulas (as mais longe do ponto de contato saem
   * e viram brilho; sem nAlvo, ficam todas). A nova forma de repouso e um disco hexagonal com as
   * particulas atribuidas por anel e angulo, e a rigidez cresce de `rampa` a 1 ("gloop").
   * @param {Slime} a
   * @param {Slime|Slime[]} b
   * @param {{ px: number, py: number, nAlvo?: number, rampa?: number, rampaVel?: number, manterForma?: boolean }} o
   *   manterForma: a forma de repouso vira a forma atual (goo que se junta nao vira bola)
   *   rampaVel: quanto a rigidez sobe por segundo (padrao RAMPA_VEL; 0 segura mole)
   * @returns {number[]} [x, y, slime, ...] das particulas que sairam
   */
  function fundir(a, b, o) {
    const outros = Array.isArray(b) ? b : [b];
    for (const c of outros) if (c !== a) marca[c.idx] = 1;
    for (let i = 0; i < n; i++) if (marca[sl[i]]) sl[i] = a.idx;
    for (const c of outros) {
      if (c === a) continue;
      marca[c.idx] = 0;
      c.ativo = false;
      limparContatos(c.idx);
    }
    limparContatos(a.idx);
    sujo = true;
    let membrosA = [];
    for (let i = 0; i < n; i++) if (sl[i] === a.idx) membrosA.push(i);
    let saidas = [];
    const alvo = o.nAlvo || membrosA.length;
    if (alvo < membrosA.length) {
      const dist = membrosA.map((i) => {
        const dx = x[i] - o.px;
        const dy = y[i] - o.py;
        return [dx * dx + dy * dy, i];
      });
      dist.sort((p, q) => (q[0] - p[0]) || (p[1] - q[1]));
      const fora = dist.slice(0, membrosA.length - alvo).map((p) => p[1]);
      saidas = removerParticulas(fora);
      membrosA = [];
      for (let i = 0; i < n; i++) if (sl[i] === a.idx) membrosA.push(i);
    }
    if (o.manterForma) formaAtual(a, membrosA);
    else refazerRepouso(a, membrosA);
    a.rampa = o.rampa !== undefined ? o.rampa : 0;
    a.rampaVel = o.rampaVel !== undefined ? o.rampaVel : RAMPA_VEL;
    a.estado = 'normal';
    a.tEstado = 0;
    acordarTodos();
    return saidas;
  }

  /**
   * Muda o tamanho do slime para nAlvo particulas: as novas nascem num remendo hexagonal em
   * volta de (px, py) com o pigmento da vizinha mais proxima; as que sobram saem pelas mais
   * longe de (px, py). Depois, forma de repouso nova e rigidez crescendo.
   * @param {Slime} s
   * @param {number} nAlvo
   * @param {number} px0
   * @param {number} py0
   * @returns {number[]} [x, y, slime, ...] das que sairam
   */
  function redimensionar(s, nAlvo, px0, py0) {
    let lista = [];
    for (let i = 0; i < n; i++) if (sl[i] === s.idx) lista.push(i);
    let saidas = [];
    if (nAlvo < lista.length) {
      const dist = lista.map((i) => [(x[i] - px0) * (x[i] - px0) + (y[i] - py0) * (y[i] - py0), i]);
      dist.sort((p, q) => (q[0] - p[0]) || (p[1] - q[1]));
      saidas = removerParticulas(dist.slice(0, lista.length - nAlvo).map((p) => p[1]));
    } else if (nAlvo > lista.length) {
      const extra = Math.min(nAlvo - lista.length, cap - n);
      const remendo = discoHex(extra, ESPACO);
      for (let a = 0; a < extra; a++) {
        const i = n++;
        const r = R_PART * (1 - POLI + 2 * POLI * rng());
        rad[i] = r;
        mas[i] = (r * r) / (R_PART * R_PART);
        inv[i] = 1 / mas[i];
        x[i] = px[i] = xm[i] = px0 + remendo[2 * a];
        y[i] = py[i] = ym[i] = py0 + remendo[2 * a + 1];
        vx[i] = 0;
        vy[i] = 0;
        sl[i] = s.idx;
        pen[i] = 0;
        fr[i] = 0;
        // pigmento da vizinha mais perto
        let melhor = lista[0];
        let dm = Infinity;
        for (const j of lista) {
          const d = (x[j] - x[i]) * (x[j] - x[i]) + (y[j] - y[i]) * (y[j] - y[i]);
          if (d < dm) { dm = d; melhor = j; }
        }
        for (let c = 0; c < N_PIG; c++) pig[i * N_PIG + c] = pig[melhor * N_PIG + c];
      }
      assentarNovas = ASSENTAR_QUADROS;
    }
    lista = [];
    for (let i = 0; i < n; i++) if (sl[i] === s.idx) lista.push(i);
    refazerRepouso(s, lista);
    s.rampa = 0.3;
    s.rampaVel = RAMPA_VEL;
    sujo = true;
    acordarTodos();
    return saidas;
  }

  /** Indices das particulas do slime (na ordem dos indices). @param {Slime} s */
  function particulasDe(s) {
    const lista = [];
    for (let i = 0; i < n; i++) if (sl[i] === s.idx) lista.push(i);
    return lista;
  }

  /**
   * Puxa o slime inteiro para (px, py): soma a mesma velocidade a todas as particulas, acel*dt por
   * chamada, sem passar de vmax de aproximacao (fusao em andamento: os membros se abracam).
   * @param {Slime} s @param {number} px0 @param {number} py0
   * @param {number} acel u/s2 @param {number} vmax u/s @param {number} dt s
   */
  function atrair(s, px0, py0, acel, vmax, dt) {
    if (!s.ativo || s.preso) return;
    const dx = px0 - s.cx;
    const dy = py0 - s.cy;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 1e-6) return;
    const ux = dx / d;
    const uy = dy / d;
    const vp = s.vx * ux + s.vy * uy;
    if (vp >= vmax) return;
    let dv = acel * dt;
    if (dv > vmax - vp) dv = vmax - vp;
    for (let i = 0; i < n; i++) {
      if (sl[i] !== s.idx) continue;
      vx[i] += dv * ux;
      vy[i] += dv * uy;
    }
    s.dormindo = false;
    s.tParado = 0;
  }

  /**
   * Tira `qtd` particulas do slime, as mais longe do centroide (desempate pelo indice), sem
   * refazer a forma de repouso nem mexer na rampa (a fusao encolhe aos poucos).
   * @param {Slime} s @param {number} qtd
   * @returns {number[]} [x, y, slime, ...] das que sairam
   */
  function aparar(s, qtd) {
    const lista = particulasDe(s);
    const q = Math.min(qtd, lista.length - 1);
    if (q <= 0) return [];
    let M = 0;
    let cx = 0;
    let cy = 0;
    for (const i of lista) { M += mas[i]; cx += mas[i] * x[i]; cy += mas[i] * y[i]; }
    cx /= M;
    cy /= M;
    const dist = lista.map((i) => [(x[i] - cx) * (x[i] - cx) + (y[i] - cy) * (y[i] - cy), i]);
    dist.sort((p, r) => (r[0] - p[0]) || (p[1] - r[1]));
    return removerParticulas(dist.slice(0, q).map((p) => p[1]));
  }

  /** Disco de repouso novo para as particulas atuais do slime (fim do aparar). @param {Slime} s */
  function refazerForma(s) {
    refazerRepouso(s, particulasDe(s));
  }

  /**
   * Leva as particulas da lista para os pontos dados, paradas (a rede do pote puxa para dentro as
   * poucas que escaparam pela parede); a separacao das vizinhas fica so na posicao.
   * @param {number[]} lista indices @param {number[]} pontos [x0, y0, x1, y1, ...] na mesma ordem
   */
  function reposicionar(lista, pontos) {
    lista.forEach((i, k) => {
      x[i] = px[i] = xm[i] = pontos[2 * k];
      y[i] = py[i] = ym[i] = pontos[2 * k + 1];
      vx[i] = 0;
      vy[i] = 0;
      const s = slimes[sl[i]];
      s.dormindo = false;
      s.tParado = 0;
    });
    if (lista.length) assentarNovas = ASSENTAR_QUADROS;
  }

  /**
   * O slime volta inteiro, em disco parado, com o centro em (x0, y0): as mesmas particulas (e o
   * pigmento de cada uma), na forma de repouso nova. Rede de seguranca do pote (src/jogo/pote.js):
   * quem ficou espetado numa parede ou caiu por fora volta para dentro.
   * @param {Slime} s @param {number} x0 @param {number} y0
   */
  function recolocar(s, x0, y0) {
    const lista = particulasDe(s);
    if (!lista.length) return;
    refazerRepouso(s, lista);
    for (const i of lista) {
      x[i] = px[i] = xm[i] = x0 + qx[i];
      y[i] = py[i] = ym[i] = y0 + qy[i];
      vx[i] = 0;
      vy[i] = 0;
      pen[i] = 0;
    }
    limparContatos(s.idx);
    s.rampa = 0.3;
    s.rampaVel = RAMPA_VEL;
    s.cx = x0;
    s.cy = y0;
    s.vx = 0;
    s.vy = 0;
    sujo = true;
    assentarNovas = ASSENTAR_QUADROS;
    acordarTodos();
  }

  /**
   * A rigidez desce ate `rampa` (se estava acima) e passa a subir `vel` por segundo (0 segura).
   * @param {Slime} s @param {number} rampa @param {number} vel
   */
  function amolecer(s, rampa, vel) {
    if (s.rampa > rampa) s.rampa = rampa;
    s.rampaVel = vel;
    s.dormindo = false;
    s.tParado = 0;
  }

  /**
   * Alguma particula de a a menos de (ri + rj + folga) de uma de b? Pela caixa do ultimo medir,
   * e so as particulas de cada um que estao perto da caixa do outro.
   * @param {Slime} a @param {Slime} b @param {number} folga
   */
  function pertoDe(a, b, folga) {
    const m = folga + 2 * R_PART * (1 + POLI);
    if (a.esq - m > b.dir || b.esq - m > a.dir || a.base - m > b.topo || b.base - m > a.topo) return false;
    const la = [];
    const lb = [];
    for (let i = 0; i < n; i++) {
      const xi = x[i];
      const yi = y[i];
      if (sl[i] === a.idx) {
        if (xi > b.esq - m && xi < b.dir + m && yi > b.base - m && yi < b.topo + m) la.push(i);
      } else if (sl[i] === b.idx) {
        if (xi > a.esq - m && xi < a.dir + m && yi > a.base - m && yi < a.topo + m) lb.push(i);
      }
    }
    for (const i of la) {
      for (const j of lb) {
        const lim = rad[i] + rad[j] + folga;
        const dx = x[i] - x[j];
        const dy = y[i] - y[j];
        if (dx * dx + dy * dy < lim * lim) return true;
      }
    }
    return false;
  }

  /**
   * Escala a forma de repouso (o super slime incha antes de estourar).
   * @param {Slime} s @param {number} f
   */
  function escalarForma(s, f) {
    for (let i = 0; i < n; i++) {
      if (sl[i] !== s.idx) continue;
      qx[i] *= f; qy[i] *= f; ox[i] *= f; oy[i] *= f;
    }
    s.raio0 = (s.raio0 - R_PART) * f + R_PART;
    s.dormindo = false;
    s.tParado = 0;
  }

  /**
   * Forma de repouso = forma atual (relativa ao centroide, sem giro).
   * @param {Slime} s
   * @param {number[]} lista
   */
  function formaAtual(s, lista) {
    let M = 0;
    let cx = 0;
    let cy = 0;
    for (const i of lista) { M += mas[i]; cx += mas[i] * x[i]; cy += mas[i] * y[i]; }
    if (!M) return;
    cx /= M;
    cy /= M;
    let r2 = 0;
    for (const i of lista) {
      qx[i] = ox[i] = x[i] - cx;
      qy[i] = oy[i] = y[i] - cy;
      const d = qx[i] * qx[i] + qy[i] * qy[i];
      if (d > r2) r2 = d;
    }
    s.cos = 1;
    s.sin = 0;
    // raio do disco de mesma area (rosto e mira), nao o da forma esticada
    s.raio0 = Math.sqrt((lista.length * ESPACO * ESPACO * 0.36 * 3.141592653589793) / 3.141592653589793) + R_PART;
    void r2;
  }

  /**
   * Forma de repouso nova (disco hexagonal) para as particulas atuais de um slime.
   * @param {Slime} s
   * @param {number[]} lista
   */
  function refazerRepouso(s, lista) {
    const qtd = lista.length;
    if (!qtd) return;
    let M = 0;
    let cx = 0;
    let cy = 0;
    for (const i of lista) { M += mas[i]; cx += mas[i] * x[i]; cy += mas[i] * y[i]; }
    cx /= M;
    cy /= M;
    const rel = new Float64Array(qtd * 2);
    lista.forEach((i, k) => { rel[2 * k] = x[i] - cx; rel[2 * k + 1] = y[i] - cy; });
    const disco = discoAneis(qtd, ESPACO);
    const at = atribuirAoDisco(rel, disco);
    lista.forEach((i, k) => {
      const d = at[k];
      qx[i] = ox[i] = disco[2 * d];
      qy[i] = oy[i] = disco[2 * d + 1];
    });
    s.raio0 = raioDoDisco(disco);
  }

  /**
   * Divide o slime pela reta que passa por (px, py) com normal (nx, ny).
   * @param {Slime} s
   * @param {number} px0
   * @param {number} py0
   * @param {number} nx
   * @param {number} ny
   * @returns {Slime[]} os dois pedacos (o original e o novo), ou so o original se nao deu
   */
  function dividir(s, px0, py0, nx, ny) {
    const lado = [];
    const resto = [];
    for (let i = 0; i < n; i++) {
      if (sl[i] !== s.idx) continue;
      if ((x[i] - px0) * nx + (y[i] - py0) * ny > 0) lado.push(i);
      else resto.push(i);
    }
    if (lado.length < 3 || resto.length < 3) return [s];
    const k = slotLivre();
    if (k < 0) return [s];
    const novo = slimes[k];
    iniciarSlime(novo, { x: s.cx, y: s.cy, material: s.mat, nivel: s.nivel, idv: idvLivre(s.idx) });
    for (const i of lado) sl[i] = k;
    refazerRepouso(s, resto);
    refazerRepouso(novo, lado);
    s.rampa = 0.3;
    novo.rampa = 0.3;
    s.rampaVel = RAMPA_VEL;
    sujo = true;
    acordarTodos();
    return [s, novo];
  }

  /** @param {Slime} s @param {number} [vy0] */
  function soltar(s, vy0 = 0) {
    if (sujo) reconstruir();
    // cai de onde a mira esta agora (o toque rapido mira e solta no mesmo quadro; a peca
    // presa so chegaria ao alvo no proximo passo)
    let sobre = false;
    for (let a = iniSl[s.idx]; a < iniSl[s.idx + 1]; a++) {
      const i = membros[a];
      x[i] = s.alvoX + s.cos * qx[i] - s.sin * qy[i];
      y[i] = s.alvoY + s.sin * qx[i] + s.cos * qy[i];
      px[i] = x[i];
      py[i] = y[i];
      vx[i] = 0;
      vy[i] = vy0;
      if (sobre) continue;
      for (let j = 0; j < n; j++) {
        if (sl[j] === s.idx) continue;
        const dx = x[i] - x[j];
        const dy = y[i] - y[j];
        const r = rad[i] + rad[j];
        if (dx * dx + dy * dy < r * r) { sobre = true; break; }
      }
    }
    s.preso = false;
    // a peca presa nao tocava ninguem: solta em cima de um slime, a sobreposicao sai so na
    // posicao (sem virar velocidade e lancar os dois)
    if (sobre) assentarNovas = ASSENTAR_QUADROS;
  }

  /** @param {Slime} s @param {number} ax @param {number} ay */
  function moverPreso(s, ax, ay) {
    s.alvoX = ax;
    s.alvoY = ay;
  }

  /**
   * @param {{ ax: number, ay: number, bx: number, by: number, r: number, oculta?: boolean, gruda?: number }[]} caps
   *   oculta: so colide, o render nao desenha (guia da borda); nao conta para o chao
   *   gruda: lado em que o slime com `ader` gruda (1 = a esquerda de a para b, o de dentro do contorno
   *   que vai do topo esquerdo ao topo direito; -1 = a direita; 0 = nenhum)
   */
  function definirParedes(caps) {
    paredes = caps.map((c) => ({ ax: c.ax, ay: c.ay, bx: c.bx, by: c.by, r: c.r, vax: 0, vay: 0, vbx: 0, vby: 0, t: 0, tx: 0, ty: 0, svx: 0, svy: 0, st: 0, atx: 0, aty: 0, oculta: !!c.oculta, gruda: c.gruda || 0, livreA: false, livreB: false }));
    // pontas livres das paredes que grudam (a ponta da borda): nenhuma outra comeca ou acaba ali
    const junta = (px0, py0, eu) => paredes.some((o) => o !== eu && o.gruda
      && ((Math.abs(o.ax - px0) < 1e-6 && Math.abs(o.ay - py0) < 1e-6) || (Math.abs(o.bx - px0) < 1e-6 && Math.abs(o.by - py0) < 1e-6)));
    for (const p of paredes) {
      if (!p.gruda) continue;
      p.livreA = !junta(p.ax, p.ay, p);
      p.livreB = !junta(p.bx, p.by, p);
    }
    let menor = Infinity;
    for (const p of paredes) if (!p.oculta) menor = Math.min(menor, p.ay, p.by);
    mundo.chaoY = menor === Infinity ? 0 : menor;
    acordarTodos();
  }

  /**
   * Move a parede k ate a capsula `c` em `t` segundos (velocidade constante; o atrito
   * leva a velocidade da parede em conta).
   * @param {number} k
   * @param {{ ax: number, ay: number, bx: number, by: number }} c
   * @param {number} t
   */
  function moverParede(k, c, t) {
    const p = paredes[k];
    if (!p) return;
    if (t <= 0) {
      p.ax = c.ax; p.ay = c.ay; p.bx = c.bx; p.by = c.by;
      p.vax = p.vay = p.vbx = p.vby = 0;
      p.t = 0;
    } else {
      p.vax = (c.ax - p.ax) / t;
      p.vay = (c.ay - p.ay) / t;
      p.vbx = (c.bx - p.bx) / t;
      p.vby = (c.by - p.by) / t;
      p.t = t;
    }
    acordarTodos();
  }

  /**
   * Tremor das paredes da lista (o pote inteiro junto): o deslocamento (tx, ty), separado da base,
   * vai ate (dx, dy) em t s com velocidade constante e chega exatamente nele (0 = no lugar). O
   * atrito leva a velocidade do tremor. Acorda todos: slime dormindo nao colide com parede.
   * @param {number[]} lista indices das paredes
   * @param {number} dx @param {number} dy @param {number} t
   */
  function tremerParedes(lista, dx, dy, t) {
    for (const k of lista) {
      const p = paredes[k];
      if (!p) continue;
      p.atx = dx;
      p.aty = dy;
      if (t <= 0) {
        p.tx = dx; p.ty = dy;
        p.svx = p.svy = 0;
        p.st = 0;
      } else {
        p.svx = (dx - p.tx) / t;
        p.svy = (dy - p.ty) / t;
        p.st = t;
      }
    }
    acordarTodos();
  }

  /** Soma velocidade a todas as particulas soltas (chacoalhar). */
  function empurrar(dvx, dvy, so = -1) {
    for (let i = 0; i < n; i++) {
      const s = slimes[sl[i]];
      if (s.preso || (so >= 0 && sl[i] !== so)) continue;
      vx[i] += dvx;
      vy[i] += dvy;
    }
    acordarTodos();
  }

  /**
   * Sovar e mexer: as particulas num raio em volta de (cx, cy) puxam a velocidade para
   * (vx, vy), com peso que cai ate a borda do raio. Acorda quem foi tocado.
   * @param {number} cx
   * @param {number} cy
   * @param {number} raio
   * @param {number} ux
   * @param {number} uy
   * @param {number} forca 0..1 por quadro
   */
  function puxar(cx, cy, raio, ux, uy, forca) {
    const r2 = raio * raio;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - cx;
      const dy = y[i] - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 >= r2) continue;
      const s = slimes[sl[i]];
      if (s.preso) continue;
      const w = forca * (1 - d2 / r2);
      vx[i] += w * (ux - vx[i]);
      vy[i] += w * (uy - vy[i]);
      if (s.dormindo) { s.dormindo = false; s.tParado = 0; }
    }
  }

  function acordarTodos() {
    for (const s of slimes) if (s.ativo) { s.dormindo = false; s.tParado = 0; }
  }

  // ------------------------------------------------------------------ subpasso

  function reconstruir() {
    iniSl.fill(0);
    for (let i = 0; i < n; i++) iniSl[sl[i] + 1]++;
    for (let k = 0; k < MAX_SLIMES; k++) iniSl[k + 1] += iniSl[k];
    const cur = iniSl.slice(0, MAX_SLIMES);
    for (let i = 0; i < n; i++) membros[cur[sl[i]]++] = i;
    sujo = false;
  }

  /** @param {number} i */
  function parada(i) {
    const s = slimes[sl[i]];
    return s.dormindo || s.preso;
  }

  /** Par de slimes perto (fusao), uma vez por subpasso. @param {number} si @param {number} sj */
  function registrarPerto(si, sj) {
    const key = si < sj ? si * MAX_SLIMES + sj : sj * MAX_SLIMES + si;
    if (perto[key]++ === 0) {
      if (nPertoAgora >= pertoAgora.length) {
        const maior = new Int32Array(pertoAgora.length * 2);
        maior.set(pertoAgora);
        pertoAgora = maior;
      }
      pertoAgora[nPertoAgora++] = key;
    }
  }

  /** Marca parada, peso e preso de cada particula (o estado dos slimes neste momento). */
  function marcarParadas() {
    for (let i = 0; i < n; i++) {
      const s = slimes[sl[i]];
      const p = s.dormindo || s.preso;
      pp[i] = p ? 1 : 0;
      pw[i] = p ? 0 : inv[i];
      pl[i] = s.preso ? 1 : 0;
    }
  }

  /** O slime acordou no meio do subpasso: as marcas das particulas dele seguem. @param {Slime} s */
  function remarcar(s) {
    const p = s.dormindo || s.preso;
    for (let a = iniSl[s.idx]; a < iniSl[s.idx + 1]; a++) {
      const i = membros[a];
      pp[i] = p ? 1 : 0;
      pw[i] = p ? 0 : inv[i];
    }
  }

  /** @param {boolean} [registrar] conta a proximidade entre slimes (so no subpasso) */
  function construirPares(registrar = false) {
    marcarParadas();
    const memb = cfg.membrana;
    const nc = ncx * ncy;
    celIni.fill(0);
    for (let i = 0; i < n; i++) {
      let cx = ((x[i] - gx0) / CEL) | 0;
      let cy = ((y[i] - gy0) / CEL) | 0;
      if (cx < 0) cx = 0; else if (cx >= ncx) cx = ncx - 1;
      if (cy < 0) cy = 0; else if (cy >= ncy) cy = ncy - 1;
      const c = cy * ncx + cx;
      celDe[i] = c;
      celIni[c + 1]++;
    }
    for (let c = 0; c < nc; c++) celIni[c + 1] += celIni[c];
    celCur.set(celIni.subarray(0, nc));
    for (let i = 0; i < n; i++) {
      const a = celCur[celDe[i]]++;
      ordem[a] = i;
      xo[a] = x[i];
      yo[a] = y[i];
      ro[a] = rad[i];
      so[a] = sl[i];
      fo[a] = pp[i] | (pl[i] << 1);
    }
    // celCur vira o ponteiro de cada celula: a primeira particula dela com indice maior que o i
    // da vez (os indices crescem dentro da celula e o i so cresce: o ponteiro so anda para a
    // frente). Mesmos pares, na mesma ordem, sem reler os j <= i a cada vizinho.
    celCur.set(celIni.subarray(0, nc));
    nPares = 0;
    for (let i = 0; i < n; i++) {
      const c = celDe[i];
      const cy = (c / ncx) | 0;
      const cx = c - cy * ncx;
      const pi = pp[i] === 1;
      const xi = x[i];
      const yi = y[i];
      const ri = rad[i];
      const si = sl[i];
      const presoI = pl[i] === 1;
      const livreI = registrar && !presoI;
      for (let oy2 = cy - 1; oy2 <= cy + 1; oy2++) {
        if (oy2 < 0 || oy2 >= ncy) continue;
        for (let ox2 = cx - 1; ox2 <= cx + 1; ox2++) {
          if (ox2 < 0 || ox2 >= ncx) continue;
          const cc = oy2 * ncx + ox2;
          const fim = celIni[cc + 1];
          let a0 = celCur[cc];
          while (a0 < fim && ordem[a0] <= i) a0++;
          celCur[cc] = a0;
          for (let a = a0; a < fim; a++) {
            const j = ordem[a];
            const dx = xi - xo[a];
            const dy = yi - yo[a];
            const d2 = dx * dx + dy * dy;
            const sj = so[a];
            const rj = ro[a];
            const fj = fo[a];
            if (livreI && sj !== si && (fj & 2) === 0) {
              const rp = (ri + rj) * PERTO;
              if (d2 < rp * rp) registrarPerto(si, sj);
            }
            if (pi && (fj & 1) === 1) continue;
            // a peca presa nao toca ninguem (ainda nao esta no jogo): empurrada pela mira ou
            // nascendo em cima de um slime parado na borda, ela o enganchava por uma particula
            if (presoI || (fj & 2) !== 0) continue;
            const r = (ri + rj) * ALCANCE;
            if (d2 < r * r) {
              if (nPares * 2 + 2 > pares.length) {
                const maior = new Int32Array(pares.length * 2);
                maior.set(pares);
                pares = maior;
                const maiorR = new Float64Array(pares.length >> 1);
                maiorR.set(rijP);
                rijP = maiorR;
              }
              pares[2 * nPares] = i;
              pares[2 * nPares + 1] = j;
              // distancia de contato do par (a membrana so entre slimes diferentes)
              rijP[nPares] = si === sj ? ri + rj : (ri + rj) * memb;
              nPares++;
            }
          }
        }
      }
    }
  }

  /**
   * Contato entre todas as particulas (a coesao fica em viscosidadeECoesao).
   * @param {boolean} completo  false = pre-estabilizacao (so separa, sem atrito nem registro)
   */
  function contatosPares(completo) {
    const ida = (passoN & 1) === 0;
    const chao = mundo.chaoY;
    const kAlt = cfg.kAltura;
    for (let t = 0; t < nPares; t++) {
      const p = ida ? t : nPares - 1 - t;
      const i = pares[2 * p];
      const j = pares[2 * p + 1];
      const dx = x[i] - x[j];
      const dy = y[i] - y[j];
      const d2 = dx * dx + dy * dy;
      const rij = rijP[p];
      if (d2 < rij * rij) {
        if (d2 < 1e-14) continue;
        const si = sl[i];
        const sj = sl[j];
        // peso efetivo: 0 parada; senao 1/massa, escalado pela altura (shock propagation)
        const hi = y[i] - chao;
        const hj = y[j] - chao;
        const wi = pw[i] * (1 + (hi > 0 ? kAlt * hi : 0));
        const wj = pw[j] * (1 + (hj > 0 ? kAlt * hj : 0));
        const ws = wi + wj;
        if (ws === 0) continue;
        const d = Math.sqrt(d2);
        const nx = dx / d;
        const ny = dy / d;
        const pn = rij - d;
        const s = pn / ws;
        x[i] += wi * s * nx;
        y[i] += wi * s * ny;
        x[j] -= wj * s * nx;
        y[j] -= wj * s * ny;
        if (!completo || si === sj) continue;
        // atrito de Coulomb em posicao (Macklin 2014)
        const A = slimes[si];
        const B = slimes[sj];
        const mus = (A.mat.atritoS + B.mat.atritoS) * 0.5;
        const muk = (A.mat.atritoK + B.mat.atritoK) * 0.5;
        const rx = (x[i] - px[i]) - (x[j] - px[j]);
        const ry = (y[i] - py[i]) - (y[j] - py[j]);
        const rn = rx * nx + ry * ny;
        let tx = rx - rn * nx;
        let ty = ry - rn * ny;
        const tl = Math.sqrt(tx * tx + ty * ty);
        if (tl > 1e-12) {
          if (tl >= mus * pn) {
            const f = muk * pn / tl;
            if (f < 1) { tx *= f; ty *= f; }
          }
          x[i] -= (wi / ws) * tx;
          y[i] -= (wi / ws) * ty;
          x[j] += (wj / ws) * tx;
          y[j] += (wj / ws) * ty;
        }
        pen[i] += pn;
        pen[j] += pn;
        // registro do toque e despertar
        const a = si < sj ? si : sj;
        const b = si < sj ? sj : si;
        const key = a * MAX_SLIMES + b;
        if (toque[key] === 0) { toqueX[key] = 0; toqueY[key] = 0; }
        toqueX[key] += (x[i] + x[j]) * 0.5;
        toqueY[key] += (y[i] + y[j]) * 0.5;
        if (toque[key]++ === 0) {
          if (nAgora >= tocadosAgora.length) {
            const maior = new Int32Array(tocadosAgora.length * 2);
            maior.set(tocadosAgora);
            tocadosAgora = maior;
          }
          tocadosAgora[nAgora++] = key;
        }
        if (pn > PEN_ACORDA) {
          if (A.dormindo && !B.dormindo && !B.preso) { A.dormindo = false; A.tParado = 0; remarcar(A); }
          if (B.dormindo && !A.dormindo && !A.preso) { B.dormindo = false; B.tParado = 0; remarcar(B); }
        }
      }
    }
  }

  // parede da vez (contatosParedes -> paredeEm)
  /** @type {any} */
  let wp = null;
  let wax = 0, way = 0, wex = 0, wey = 0, wl2 = 0, wel = 1, wxmin = 0, wxmax = 0, wymin = 0, wymax = 0;
  let pAtrito = true;
  let pSoTravessia = false;

  /** Balde grosso de um ponto (fora da grade, o da borda). @param {number} xx @param {number} yy */
  function baldeP(xx, yy) {
    let cx = ((xx - gx0) / PCEL) | 0;
    let cy = ((yy - gy0) / PCEL) | 0;
    if (cx < 0) cx = 0; else if (cx >= pncx) cx = pncx - 1;
    if (cy < 0) cy = 0; else if (cy >= pncy) cy = pncy - 1;
    return cy * pncx + cx;
  }

  /** A particula andou por uma parede: as seguintes da mesma chamada a testam pela posicao nova. @param {number} i */
  function andou(i) {
    if (pMov[i] === pMovCarimbo) return;
    pMov[i] = pMovCarimbo;
    movidas[nMovidas++] = i;
  }

  /**
   * Contato com as paredes (capsulas). Cada parede so ve as particulas cuja posicao agora ou do
   * comeco do subpasso cai na caixa dela: os baldes (pela posicao do comeco da chamada e por px)
   * mais as que ja andaram por outra parede nesta chamada. Cada particula so depende dela mesma e
   * da parede, entao a ordem dentro de uma parede nao muda o resultado.
   * @param {boolean} [atrito] false = so separa (pre-estabilizacao: a posicao de partida e a do quadro)
   * @param {boolean} [soTravessia] true = so desfaz quem cruzou o eixo (o empurrao normal fica para o subpasso)
   */
  function contatosParedes(atrito = true, soTravessia = false) {
    if (!paredes.length) return;
    pAtrito = atrito;
    pSoTravessia = soTravessia;
    // baldes por (x, y) e por (px, py)
    const nc = pncx * pncy;
    pIni.fill(0);
    for (let i = 0; i < n; i++) {
      const a = baldeP(x[i], y[i]);
      const b = baldeP(px[i], py[i]);
      pCa[i] = a;
      pCb[i] = b === a ? -1 : b;
      pIni[a + 1]++;
      if (b !== a) pIni[b + 1]++;
    }
    for (let c = 0; c < nc; c++) pIni[c + 1] += pIni[c];
    pCur.set(pIni.subarray(0, nc));
    for (let i = 0; i < n; i++) {
      pLista[pCur[pCa[i]]++] = i;
      if (pCb[i] >= 0) pLista[pCur[pCb[i]]++] = i;
    }
    pMovCarimbo++;
    nMovidas = 0;
    for (let k = 0; k < paredes.length; k++) {
      wp = paredes[k];
      // base + tremor (sem tremor, tx = ty = 0 e a conta e a de sempre)
      wax = wp.ax + wp.tx;
      way = wp.ay + wp.ty;
      const bx = wp.bx + wp.tx;
      const by = wp.by + wp.ty;
      wex = bx - wax;
      wey = by - way;
      wl2 = wex * wex + wey * wey;
      const margem = wp.r + R_PART * (1 + POLI);
      wxmin = (wax < bx ? wax : bx) - margem;
      wxmax = (wax > bx ? wax : bx) + margem;
      wymin = (way < by ? way : by) - margem;
      wymax = (way > by ? way : by) + margem;
      wel = Math.sqrt(wl2) || 1;
      pCarimbo++;
      const c0 = baldeP(wxmin, wymin);
      const c1 = baldeP(wxmax, wymax);
      const cy0 = (c0 / pncx) | 0;
      const cx0 = c0 - cy0 * pncx;
      const cy1 = (c1 / pncx) | 0;
      const cx1 = c1 - cy1 * pncx;
      for (let cy = cy0; cy <= cy1; cy++) {
        for (let cx = cx0; cx <= cx1; cx++) {
          const c = cy * pncx + cx;
          for (let a = pIni[c]; a < pIni[c + 1]; a++) paredeEm(pLista[a]);
        }
      }
      // as que andaram por uma parede anterior podem ter entrado na caixa desta
      const nm = nMovidas;
      for (let a = 0; a < nm; a++) paredeEm(movidas[a]);
    }
  }

  /** Uma particula contra a parede da vez. @param {number} i */
  function paredeEm(i) {
    if (pVisto[i] === pCarimbo) return;
    pVisto[i] = pCarimbo;
    const xi = x[i];
    const yi = y[i];
    const x0 = px[i];
    const y0 = py[i];
    // fora da caixa agora e no comeco do subpasso: longe desta parede
    if ((xi < wxmin || xi > wxmax || yi < wymin || yi > wymax) && (x0 < wxmin || x0 > wxmax || y0 < wymin || y0 > wymax)) return;
    if (parada(i)) return;
    const lim = rad[i] + wp.r;
    // travessia (print do iPhone, 2026-10-18): um empurrao de contato maior que a parede leva a
    // particula para o outro lado do eixo, e a capsula de dois lados a deixava la. Se o caminho
    // do subpasso cruzou o eixo, ela volta encostada no lado de onde veio.
    const c0 = wex * (y0 - way) - wey * (x0 - wax);
    const c1 = wex * (yi - way) - wey * (xi - wax);
    if ((c0 > 0 && c1 < 0) || (c0 < 0 && c1 > 0)) {
      const u = c0 / (c0 - c1);
      const qx0 = x0 + u * (xi - x0);
      const qy0 = y0 + u * (yi - y0);
      const tq = wl2 > 0 ? ((qx0 - wax) * wex + (qy0 - way) * wey) / wl2 : 0;
      const tol = lim / wel;
      if (tq >= -tol && tq <= 1 + tol) {
        let tc = wl2 > 0 ? ((xi - wax) * wex + (yi - way) * wey) / wl2 : 0;
        if (tc < 0) tc = 0; else if (tc > 1) tc = 1;
        const lado = c0 > 0 ? 1 : -1;
        x[i] = wax + tc * wex - (wey / wel) * lado * lim;
        y[i] = way + tc * wey + (wex / wel) * lado * lim;
        andou(i);
        return;
      }
    }
    if (pSoTravessia) return;
    let t = wl2 > 0 ? ((xi - wax) * wex + (yi - way) * wey) / wl2 : 0;
    if (t < 0) t = 0; else if (t > 1) t = 1;
    const cx = wax + t * wex;
    const cy = way + t * wey;
    let dx = xi - cx;
    let dy = yi - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= lim * lim) return;
    const d = Math.sqrt(d2);
    let pn;
    if (d < 1e-9) {
      // em cima do eixo: empurra pela normal do segmento
      dx = -wey / wel;
      dy = wex / wel;
      pn = lim;
    } else {
      dx /= d;
      dy /= d;
      pn = lim - d;
    }
    x[i] += dx * pn;
    y[i] += dy * pn;
    andou(i);
    if (!pAtrito) return;
    // atrito contra a parede (que pode estar andando)
    const s = slimes[sl[i]];
    // no personagem (gelatina), a particula esticada longe do corpo (o resto pendurado embaixo da
    // aba de dentro do aquario) nao tem atrito: o atrito a segurava ali e, sem ele, o corpo a puxa
    // em volta da aba. Liquido e goo espalham longe do centro de proposito
    if (s.mat.separar) {
      const ex = xi - s.cx;
      const ey = yi - s.cy;
      const esticada = s.raio0 * ESTICADA;
      if (ex * ex + ey * ey > esticada * esticada) return;
    }
    const wvx = wp.vax + t * (wp.vbx - wp.vax) + wp.svx;
    const wvy = wp.vay + t * (wp.vby - wp.vay) + wp.svy;
    const rx = x[i] - px[i] - wvx * DT;
    const ry = y[i] - py[i] - wvy * DT;
    const rn = rx * dx + ry * dy;
    let tx = rx - rn * dx;
    let ty = ry - rn * dy;
    const tl = Math.sqrt(tx * tx + ty * ty);
    if (tl > 1e-12) {
      if (tl >= s.mat.atritoS * pn) {
        const f = s.mat.atritoK * pn / tl;
        if (f < 1) { tx *= f; ty *= f; }
      }
      x[i] -= tx;
      y[i] -= ty;
    }
  }

  /** Centroide do slime neste subpasso (calculado uma vez). @param {number} k */
  function centroideS(k) {
    if (carimbo[k] === passoN) return;
    carimbo[k] = passoN;
    let M = 0;
    let cx = 0;
    let cy = 0;
    for (let a = iniSl[k]; a < iniSl[k + 1]; a++) {
      const i = membros[a];
      M += mas[i];
      cx += mas[i] * x[i];
      cy += mas[i] * y[i];
    }
    cxS[k] = M ? cx / M : 0;
    cyS[k] = M ? cy / M : 0;
  }

  /**
   * Fronteira entre slimes encostados: a linha passa pelo ponto medio onde os dois realmente
   * se tocam neste subpasso (media dos pares de particulas em contato) e e perpendicular a
   * reta entre os centros. So corrige INVASORAS: a particula cujo centro passou da linha mais
   * que meio raio volta ate esse limite. O encosto normal fica com o contato (corrigir tudo
   * fazia os slimes se acotovelarem sem parar, porque o ponto de toque anda).
   * Como bolhas de sabao: a juncao vira uma linha limpa e um slime nao engole o outro (sem
   * isso, a fusao que "incha" para virar disco envolvia o vizinho, e particulas de um slime
   * se infiltravam nos vaos do outro sob o peso da pilha). Pela posicao do toque, e nao por
   * discos ideais, ela nao espreme o slime achatado no fundo. So entre materiais com `separar`.
   */
  function separarCelulas() {
    const kf = cfg.celulas;
    if (kf <= 0) return;
    for (let a = 0; a < nAgora; a++) {
      const key = tocadosAgora[a];
      const cnt = toque[key];
      if (!cnt) continue;
      const i = (key / MAX_SLIMES) | 0;
      const j = key - i * MAX_SLIMES;
      const A = slimes[i];
      const B = slimes[j];
      if (!A.ativo || !B.ativo || A.preso || B.preso || !A.mat.separar || !B.mat.separar) continue;
      if (A.dormindo && B.dormindo) continue;
      centroideS(i);
      centroideS(j);
      const gx = cxS[j] - cxS[i];
      const gy = cyS[j] - cyS[i];
      const g2 = gx * gx + gy * gy;
      if (g2 < 1e-8) continue;
      const gl = Math.sqrt(g2);
      const nx = gx / gl;
      const ny = gy / gl;
      const qx0 = toqueX[key] / cnt;
      const qy0 = toqueY[key] / cnt;
      if (!A.dormindo) {
        for (let q = iniSl[i]; q < iniSl[i + 1]; q++) {
          const p = membros[q];
          const exc = (x[p] - qx0) * nx + (y[p] - qy0) * ny - 0.5 * rad[p];
          if (exc > 0) {
            x[p] -= kf * exc * nx;
            y[p] -= kf * exc * ny;
            // choque sem quique: a invasora perde a velocidade que a levava para o outro
            // lado (sem isso ela voltava no subpasso seguinte e o slime grande tremia)
            const vn = vx[p] * nx + vy[p] * ny;
            if (vn > 0) { vx[p] -= vn * nx; vy[p] -= vn * ny; }
          }
        }
      }
      if (!B.dormindo) {
        for (let q = iniSl[j]; q < iniSl[j + 1]; q++) {
          const p = membros[q];
          const exc = -0.5 * rad[p] - ((x[p] - qx0) * nx + (y[p] - qy0) * ny);
          if (exc > 0) {
            x[p] += kf * exc * nx;
            y[p] += kf * exc * ny;
            const vn = vx[p] * nx + vy[p] * ny;
            if (vn < 0) { vx[p] -= vn * nx; vy[p] -= vn * ny; }
          }
        }
      }
    }
  }

  /** Shape matching de um slime, com plasticidade e memoria. @param {Slime} s */
  function forma(s) {
    const ini = iniSl[s.idx];
    const fim = iniSl[s.idx + 1];
    if (fim - ini < 2) return;
    const est = ESTADOS[s.estado] || ESTADOS.normal;
    const mat = s.mat;
    const k = mat.k * est.k * s.rampa;
    const eps = mat.epsY * est.epsY * R_PART;
    const lam = mat.lam * est.lam * DT;
    // memoria so com o slime solto (caindo, quicando): parado, o peso proprio o deixa
    // assentar e ele para quando o desvio cai abaixo do escoamento (sem ciclo eterno)
    const mem = s.livre ? mat.mem * est.mem * DT : 0;
    if (k <= 0 && lam <= 0 && mem <= 0) return;
    let M = 0;
    let cx = 0;
    let cy = 0;
    for (let a = ini; a < fim; a++) {
      const i = membros[a];
      const m = mas[i];
      M += m;
      cx += m * x[i];
      cy += m * y[i];
    }
    cx /= M;
    cy /= M;
    let a11 = 0;
    let a12 = 0;
    let a21 = 0;
    let a22 = 0;
    for (let a = ini; a < fim; a++) {
      const i = membros[a];
      const m = mas[i];
      const dx = x[i] - cx;
      const dy = y[i] - cy;
      a11 += m * dx * qx[i];
      a12 += m * dx * qy[i];
      a21 += m * dy * qx[i];
      a22 += m * dy * qy[i];
    }
    let co = a11 + a22;
    let si = a21 - a12;
    const nn = Math.sqrt(co * co + si * si);
    if (nn < 1e-12) { co = 1; si = 0; } else { co /= nn; si /= nn; }
    s.cos = co;
    s.sin = si;
    const eps2 = eps * eps;
    const memLim = 0.25 * eps2;
    let nPl = 0;
    for (let a = ini; a < fim; a++) {
      const i = membros[a];
      const gxp = cx + co * qx[i] - si * qy[i];
      const gyp = cy + si * qx[i] + co * qy[i];
      const ex = gxp - x[i];
      const ey = gyp - y[i];
      if (k > 0) {
        x[i] += k * ex;
        y[i] += k * ey;
      }
      const e2 = ex * ex + ey * ey;
      if (lam > 0 && e2 > eps2) {
        const rx = x[i] - cx;
        const ry = y[i] - cy;
        qx[i] += lam * (co * rx + si * ry - qx[i]);
        qy[i] += lam * (-si * rx + co * ry - qy[i]);
        nPl++;
      } else if (mem > 0 && e2 < memLim) {
        qx[i] += mem * (ox[i] - qx[i]);
        qy[i] += mem * (oy[i] - qy[i]);
      }
    }
    s.nPlast = nPl;
  }

  /**
   * Dentro do slime, em velocidade (depois do contato, para nao brigar com ele):
   * viscosidade XSPH e coesao (tensao superficial: mola que puxa vizinhas afastadas ate
   * encostarem; o contato inelastico absorve o excesso).
   */
  function viscosidadeECoesao() {
    const idt = 1 / DT;
    for (let p = 0; p < nPares; p++) {
      const i = pares[2 * p];
      const j = pares[2 * p + 1];
      if (sl[i] !== sl[j]) continue;
      const s = slimes[sl[i]];
      if (s.dormindo || s.preso) continue;
      const dx = x[i] - x[j];
      const dy = y[i] - y[j];
      const rij = rad[i] + rad[j];
      const lim = rij * ALCANCE;
      const d2 = dx * dx + dy * dy;
      if (d2 >= lim * lim || d2 < 1e-14) continue;
      const d = Math.sqrt(d2);
      const c = s.mat.xsph;
      if (c > 0) {
        const f = 0.5 * c * (1 - d / lim);
        const dvx = f * (vx[j] - vx[i]);
        const dvy = f * (vy[j] - vy[i]);
        vx[i] += dvx;
        vy[i] += dvy;
        vx[j] -= dvx;
        vy[j] -= dvy;
      }
      const coh = s.mat.coesao;
      if (coh > 0 && d > rij) {
        const wi = inv[i];
        const wj = inv[j];
        const g = (coh * (d - rij) * idt) / (d * (wi + wj));
        vx[i] -= wi * g * dx;
        vy[i] -= wi * g * dy;
        vx[j] += wj * g * dx;
        vy[j] += wj * g * dy;
      }
    }
  }

  /** Puxa as velocidades para a de corpo rigido do slime (Muller 2007). @param {Slime} s */
  function amortecerRigido(s) {
    const kd = s.mat.amortRig;
    if (kd <= 0) return;
    const ini = iniSl[s.idx];
    const fim = iniSl[s.idx + 1];
    if (fim - ini < 2) return;
    let M = 0;
    let cx = 0;
    let cy = 0;
    let vcx = 0;
    let vcy = 0;
    for (let a = ini; a < fim; a++) {
      const i = membros[a];
      const m = mas[i];
      M += m;
      cx += m * x[i];
      cy += m * y[i];
      vcx += m * vx[i];
      vcy += m * vy[i];
    }
    cx /= M;
    cy /= M;
    vcx /= M;
    vcy /= M;
    let L = 0;
    let I = 0;
    for (let a = ini; a < fim; a++) {
      const i = membros[a];
      const m = mas[i];
      const rx = x[i] - cx;
      const ry = y[i] - cy;
      L += m * (rx * vy[i] - ry * vx[i]);
      I += m * (rx * rx + ry * ry);
    }
    const w = I > 1e-12 ? L / I : 0;
    for (let a = ini; a < fim; a++) {
      const i = membros[a];
      const rx = x[i] - cx;
      const ry = y[i] - cy;
      vx[i] += kd * (vcx - w * ry - vx[i]);
      vy[i] += kd * (vcy + w * rx - vy[i]);
    }
  }

  /**
   * Alguma particula do slime (membros ini..fim) encosta, ate ADER.banda alem do toque, na parede
   * p? So nas pontas pedidas (pa: a, pb: b) ou, sem nenhuma, em qualquer lugar dela (a guia).
   */
  function naPontaDe(p, ax, ay, ex, ey, l2, ini, fim, pa, pb) {
    for (let a = ini; a < fim; a++) {
      const i = membros[a];
      let t = ((x[i] - ax) * ex + (y[i] - ay) * ey) / l2;
      if ((pa || pb) && !((pa && t <= 0) || (pb && t >= 1))) continue;
      if (t < 0) t = 0; else if (t > 1) t = 1;
      const dx = x[i] - ax - t * ex;
      const dy = y[i] - ay - t * ey;
      const longe = rad[i] + p.r + ADER.banda;
      if (dx * dx + dy * dy < longe * longe) return true;
    }
    return false;
  }

  /**
   * Aderencia ao vidro (2026-10-18, video do usuario: o slime solto em cima da borda pulava para
   * dentro e caia longe da parede; ele tem que escorrer por ela). So nos slimes com `ader` > 0 (o
   * jogo liga na soltura), no lado `gruda` das paredes (o de dentro do pote; a guia da borda nao
   * gruda) e so de frente para o segmento: puxar para a ponta da borda (um ponto) e um pino, e o
   * slime ficava pendurado nela por uma particula; nas juntas de dentro, o segmento vizinho cobre.
   * Vidro virado para baixo (a boca que fecha do aquario e do caldeirao) tambem nao segura.
   * Em velocidade, depois de medir, em duas escalas:
   *  - cada particula ate ADER.banda alem do toque volta para o vidro (aceleracao limitada) e as
   *    encostadas arrastam um pouco: o lado do vidro achata e fica para tras, o slime estica;
   *  - o corpo inteiro (igual em todas as particulas, sem torque): nao se afasta do vidro (o que
   *    sai da borda com a guia empurrando para dentro fica nele), escorrega no maximo a ADER.vel,
   *    com o giro freado (rolar nao escorrega), e amolece. A forca cresce com o contato ate
   *    ADER.cheio particulas encostadas, para valer igual no nivel 1 e no 13, e so na parede de lado.
   * Em cima da borda (encostado na ponta livre ou na guia), o corpo anda solto; so a velocidade
   * para dentro do pote tem teto (ADER.vBorda).
   * A velocidade e relativa a parede (que pode estar andando: alargar, tremor).
   */
  function aderirParedes() {
    const idt = 1 / DT;
    for (let k = 0; k < MAX_SLIMES; k++) {
      const s = slimes[k];
      if (!s.ativo || !(s.ader > 0) || s.dormindo || s.preso) continue;
      const ini = iniSl[k];
      const fim = iniSl[k + 1];
      let nc = 0;
      let naBorda = false;
      // a ponta livre encostada: onde ela esta e a normal de dentro do vidro dela
      let bx0 = 0;
      let by0 = 0;
      let bnx = 0;
      let bny = 0;
      let snx = 0;
      let sny = 0;
      let swx = 0;
      let swy = 0;
      for (let q = 0; q < paredes.length; q++) {
        const p = paredes[q];
        if (!p.gruda && !p.oculta) continue;
        const ax = p.ax + p.tx;
        const ay = p.ay + p.ty;
        const ex = p.bx + p.tx - ax;
        const ey = p.by + p.ty - ay;
        const l2 = ex * ex + ey * ey;
        if (l2 <= 0) continue;
        if (!p.gruda) {
          // a guia da borda
          if (!naBorda && naPontaDe(p, ax, ay, ex, ey, l2, ini, fim, false, false)) naBorda = true;
          continue;
        }
        if ((p.livreA || p.livreB) && naPontaDe(p, ax, ay, ex, ey, l2, ini, fim, p.livreA, p.livreB)) {
          naBorda = true;
          const el = Math.sqrt(l2);
          bnx = (-ey / el) * p.gruda;
          bny = (ex / el) * p.gruda;
          bx0 = p.livreB ? ax + ex : ax;
          by0 = p.livreB ? ay + ey : ay;
        }
        const wvx0 = p.vax + p.svx;
        const wvy0 = p.vay + p.svy;
        const dwx = p.vbx - p.vax;
        const dwy = p.vby - p.vay;
        for (let a = ini; a < fim; a++) {
          const i = membros[a];
          const xi = x[i];
          const yi = y[i];
          if ((ex * (yi - ay) - ey * (xi - ax)) * p.gruda <= 0) continue;
          const t = ((xi - ax) * ex + (yi - ay) * ey) / l2;
          if (t <= 0 || t >= 1) continue;
          const dx = xi - ax - t * ex;
          const dy = yi - ay - t * ey;
          const d2 = dx * dx + dy * dy;
          const lim = rad[i] + p.r;
          const longe = lim + ADER.banda;
          if (d2 >= longe * longe || d2 < 1e-18) continue;
          const d = Math.sqrt(d2);
          const nx = dx / d;
          const ny = dy / d;
          if (ny < ADER.teto || ny > ADER.chao) continue;
          const g = d > lim ? d - lim : 0;
          const w = s.ader * (1 - g / ADER.banda);
          const wvx = wvx0 + t * dwx;
          const wvy = wvy0 + t * dwy;
          let rvx = vx[i] - wvx;
          let rvy = vy[i] - wvy;
          const vn = rvx * nx + rvy * ny;
          const alvo = -ADER.puxa * g * idt;
          if (vn > alvo) {
            let dv = vn - alvo;
            const mx = ADER.acel * w * DT;
            if (dv > mx) dv = mx;
            vx[i] -= dv * nx;
            vy[i] -= dv * ny;
            rvx -= dv * nx;
            rvy -= dv * ny;
          }
          const vn2 = rvx * nx + rvy * ny;
          const f = ADER.arrasto * w;
          vx[i] -= f * (rvx - vn2 * nx);
          vy[i] -= f * (rvy - vn2 * ny);
          nc += w;
          snx += w * nx;
          sny += w * ny;
          swx += w * wvx;
          swy += w * wvy;
        }
      }
      const nl = Math.sqrt(snx * snx + sny * sny);
      if (fim - ini < 2 || (!naBorda && (nc <= 0 || nl < 1e-9))) continue;
      // o corpo: centro de massa, velocidade e giro
      let M = 0;
      let cx = 0;
      let cy = 0;
      let vcx = 0;
      let vcy = 0;
      for (let a = ini; a < fim; a++) {
        const i = membros[a];
        const m = mas[i];
        M += m;
        cx += m * x[i];
        cy += m * y[i];
        vcx += m * vx[i];
        vcy += m * vy[i];
      }
      cx /= M;
      cy /= M;
      vcx /= M;
      vcy /= M;
      let L = 0;
      let I = 0;
      for (let a = ini; a < fim; a++) {
        const i = membros[a];
        const rx = x[i] - cx;
        const ry = y[i] - cy;
        L += mas[i] * (rx * (vy[i] - vcy) - ry * (vx[i] - vcx));
        I += mas[i] * (rx * rx + ry * ry);
      }
      if (naBorda) {
        // em cima da borda, o corpo anda solto (segurado contra o vidro de dentro, ele nao saia
        // dali; firme, nao fica pendurado nela como uma toalha). So a velocidade para dentro do
        // pote fica no maximo a ADER.vBorda quando o centro ja passou da linha do vidro: a guia
        // o lancava longe da parede
        if (bx0 || by0 || bnx || bny) {
          const vin = vcx * bnx + vcy * bny;
          if ((cx - bx0) * bnx + (cy - by0) * bny > 0 && vin > ADER.vBorda) {
            const dv = vin - ADER.vBorda < ADER.acelN * s.ader * DT ? vin - ADER.vBorda : ADER.acelN * s.ader * DT;
            for (let a = ini; a < fim; a++) {
              const i = membros[a];
              vx[i] -= dv * bnx;
              vy[i] -= dv * bny;
            }
          }
        }
        continue;
      }
      const nx = snx / nl;
      const ny = sny / nl;
      // so na parede de lado (cos2 do angulo com a horizontal): no fundo o corpo assenta solto
      const c = (nc < ADER.cheio ? nc / ADER.cheio : 1) * nx * nx;
      const rvx = vcx - swx / nc;
      const rvy = vcy - swy / nc;
      const vn = rvx * nx + rvy * ny;
      let dvx = 0;
      let dvy = 0;
      if (vn > 0) {
        const dn = vn < ADER.acelN * c * DT ? vn : ADER.acelN * c * DT;
        dvx -= dn * nx;
        dvy -= dn * ny;
      }
      const tx = rvx - vn * nx;
      const ty = rvy - vn * ny;
      const vt = Math.sqrt(tx * tx + ty * ty);
      if (vt > ADER.vel) {
        const dt2 = vt - ADER.vel < ADER.acelT * c * DT ? vt - ADER.vel : ADER.acelT * c * DT;
        dvx -= (dt2 * tx) / vt;
        dvy -= (dt2 * ty) / vt;
      }
      const wg = I > 1e-12 ? (ADER.giro * c * L) / I : 0;
      for (let a = ini; a < fim; a++) {
        const i = membros[a];
        vx[i] += dvx + wg * (y[i] - cy);
        vy[i] += dvy - wg * (x[i] - cx);
      }
      // grudado, fica mole (escorre em vez de deslizar duro); solto, endurece na rampa de sempre
      const mole = 1 - (1 - ADER.mole) * c;
      if (s.rampa > mole) s.rampa = mole;
    }
  }

  function subpasso() {
    if (sujo) reconstruir();
    const dt = DT;
    const amort = 1 - cfg.amort * dt;
    const v2max = VMAX * VMAX;
    const gxs = mundo.gx * dt;
    const gys = mundo.gy * dt;
    // 1. preve
    for (let i = 0; i < n; i++) {
      const s = slimes[sl[i]];
      pen[i] = 0;
      if (s.dormindo) {
        px[i] = x[i];
        py[i] = y[i];
        continue;
      }
      if (s.preso) {
        px[i] = x[i];
        py[i] = y[i];
        x[i] = s.alvoX + s.cos * qx[i] - s.sin * qy[i];
        y[i] = s.alvoY + s.sin * qx[i] + s.cos * qy[i];
        vx[i] = 0;
        vy[i] = 0;
        continue;
      }
      let ux = (vx[i] + gxs) * amort;
      let uy = (vy[i] + gys) * amort;
      const u2 = ux * ux + uy * uy;
      if (u2 > v2max) {
        const f = VMAX / Math.sqrt(u2);
        ux *= f;
        uy *= f;
      }
      vx[i] = ux;
      vy[i] = uy;
      px[i] = x[i];
      py[i] = y[i];
      x[i] += ux * dt;
      y[i] += uy * dt;
    }
    // 2. forma
    for (let k = 0; k < MAX_SLIMES; k++) {
      const s = slimes[k];
      if (!s.ativo || s.dormindo || s.preso) continue;
      forma(s);
    }
    // 3. contato e coesao
    construirPares(true);
    // o primeiro passe e o completo: atrito e registro do toque usam a penetracao real
    for (let it = 0; it < cfg.iter; it++) contatosPares(it === 0);
    // 4. paredes (andam junto)
    for (const p of paredes) {
      if (p.t > 0) {
        const h = p.t < dt ? p.t : dt;
        p.ax += p.vax * h; p.ay += p.vay * h; p.bx += p.vbx * h; p.by += p.vby * h;
        p.t -= h;
        if (p.t <= 0) { p.vax = p.vay = p.vbx = p.vby = 0; p.t = 0; }
      }
      // tremor: chega exatamente no alvo (sem deriva de arredondamento)
      if (p.st > 0) {
        const h = p.st < dt ? p.st : dt;
        p.tx += p.svx * h; p.ty += p.svy * h;
        p.st -= h;
        if (p.st <= 1e-9) { p.st = 0; p.tx = p.atx; p.ty = p.aty; p.svx = p.svy = 0; }
      }
    }
    contatosParedes();
    // 5. velocidade, viscosidade, amortecimento de corpo rigido
    const idt = 1 / dt;
    for (let i = 0; i < n; i++) {
      if (parada(i)) continue;
      vx[i] = (x[i] - px[i]) * idt;
      vy[i] = (y[i] - py[i]) * idt;
    }
    aderirParedes();
    viscosidadeECoesao();
    // pos-estabilizacao: o que sobrou de sobreposicao sai so na posicao (sem virar velocidade)
    if (cfg.posEstab) {
      // fronteira entre slimes encostados (nenhum engole o outro): so na posicao, como a
      // pos-estabilizacao, senao a briga com a gravidade vira tremor e a pilha nao dorme
      separarCelulas();
      contatosPares(false);
      contatosParedes();
    }
    for (let k = 0; k < MAX_SLIMES; k++) {
      const s = slimes[k];
      if (!s.ativo || s.dormindo || s.preso) continue;
      amortecerRigido(s);
      if (s.rampa < 1) s.rampa = s.rampa + dt * s.rampaVel > 1 ? 1 : s.rampa + dt * s.rampaVel;
      if (s.tEstado > 0) {
        s.tEstado -= dt;
        if (s.tEstado <= 0) { s.tEstado = 0; s.estado = 'normal'; }
      }
    }
    // 6. contatos persistentes (fusao): perto neste subpasso soma; quem se afastou zera
    for (let a = 0; a < nPertoAgora; a++) {
      const key = pertoAgora[a];
      if (persist[key] < 255) persist[key]++;
    }
    for (let a = 0; a < nPertoAntes; a++) {
      const key = pertoAntes[a];
      if (perto[key] === 0) persist[key] = 0;
    }
    for (let a = 0; a < nPertoAgora; a++) perto[pertoAgora[a]] = 0;
    const tmp = pertoAntes;
    pertoAntes = pertoAgora;
    nPertoAntes = nPertoAgora;
    pertoAgora = tmp.length >= pertoAntes.length ? tmp : new Int32Array(pertoAntes.length);
    nPertoAgora = 0;
    for (let a = 0; a < nAgora; a++) toque[tocadosAgora[a]] = 0;
    nAgora = 0;
    mundo.tempo += dt;
    passoN++;
  }

  /**
   * Particula enganchada: do outro lado de uma parede em relacao ao centro do proprio slime (a
   * que ficou em cima da aba de dentro da boca do aquario com o corpo embaixo dela; o alvo da forma
   * fica do outro lado e ela trepidava contra a parede para sempre). Volta para o lado do corpo,
   * logo depois da parede, so na posicao. So olha as que estao a mais de um raio do centro (o de
   * agora: o slime que a rede do pote recolocou ainda tem o centro do quadro anterior).
   */
  function desenganchar() {
    for (let k = 0; k < MAX_SLIMES; k++) {
      const s = slimes[k];
      if (!s.ativo || s.preso || s.dormindo) continue;
      const ini = iniSl[k];
      const fim = iniSl[k + 1];
      if (fim - ini < 2) continue;
      let cx = 0;
      let cy = 0;
      for (let a = ini; a < fim; a++) { cx += x[membros[a]]; cy += y[membros[a]]; }
      cx /= fim - ini;
      cy /= fim - ini;
      for (let a = ini; a < fim; a++) desengancharParticula(membros[a], cx, cy, s.raio0);
    }
  }

  /** @param {number} i @param {number} cx @param {number} cy centro do slime @param {number} r raio dele */
  function desengancharParticula(i, cx, cy, r) {
    let dx = cx - x[i];
    let dy = cy - y[i];
    const d2 = dx * dx + dy * dy;
    if (d2 <= r * r) return;
    const d = Math.sqrt(d2);
    dx /= d;
    dy /= d;
    // a parede cruzada mais perto da particula, no caminho ate o centro
    let melhor = d;
    let alvoX = 0;
    let alvoY = 0;
    for (let k = 0; k < paredes.length; k++) {
      const p = paredes[k];
      const ax = p.ax + p.tx;
      const ay = p.ay + p.ty;
      const ex = p.bx + p.tx - ax;
      const ey = p.by + p.ty - ay;
      const den = dx * ey - dy * ex;
      if (den > -1e-12 && den < 1e-12) continue;
      // particula + u * dir = a + v * e
      const wx = ax - x[i];
      const wy = ay - y[i];
      const u = (wx * ey - wy * ex) / den;
      const v = (wx * dy - wy * dx) / den;
      if (u <= 0 || u >= melhor || v < 0 || v > 1) continue;
      melhor = u;
      const passo = u + rad[i] + p.r + 0.02;
      alvoX = x[i] + dx * (passo < d ? passo : d);
      alvoY = y[i] + dy * (passo < d ? passo : d);
    }
    if (melhor < d) {
      x[i] = alvoX;
      y[i] = alvoY;
    }
  }

  /** Pre-estabilizacao: separa sobreposicoes sem injetar velocidade (FLEX). */
  function preEstabilizar() {
    if (sujo) reconstruir();
    if (paredes.length) desenganchar();
    construirPares();
    // particulas novas (redimensionar, recolocar) nascem por cima das vizinhas:
    // nos quadros seguintes a separacao roda mais vezes, so na posicao, com as paredes (a
    // travessia conta a partir daqui). Antes, o empurrao virava velocidade e lancava o vizinho (um
    // nivel 10 subiu 6 u quando o slime de baixo evoluiu e, na volta, atravessou a parede).
    const extra = assentarNovas > 0;
    if (extra) assentarNovas--;
    // a travessia das paredes conta a partir daqui (sem isso, a separacao do comeco do quadro
    // levava particulas para o outro lado sem ninguem ver)
    for (let i = 0; i < n; i++) { px[i] = x[i]; py[i] = y[i]; }
    for (let it = 0; it < (extra ? ASSENTAR_PASSES : 1); it++) contatosPares(false);
    contatosParedes(false, !extra);
  }

  /**
   * Roda `sub` subpassos (um quadro). A valvula `escalaTempo` < 1 roda menos subpassos
   * por quadro (camera lenta) sem mudar dt.
   * @param {number} sub
   */
  function avancar(sub) {
    if (sub <= 0) return;
    if (cfg.preEstab) preEstabilizar();
    for (let k = 0; k < sub; k++) subpasso();
  }

  // ------------------------------------------------------------------ medidas

  /**
   * Medidas por quadro de cada slime (centroide, velocidade, caixa, deformacao para o
   * rosto, pressao), recentra a forma de repouso e decide quem dorme.
   * @param {number} dtQuadro
   */
  function medir(dtQuadro) {
    if (sujo) reconstruir();
    for (let k = 0; k < MAX_SLIMES; k++) {
      const s = slimes[k];
      if (!s.ativo) continue;
      const ini = iniSl[k];
      const fim = iniSl[k + 1];
      s.n = fim - ini;
      if (!s.n) { s.ativo = false; continue; }
      let M = 0;
      let cx = 0;
      let cy = 0;
      let vcx = 0;
      let vcy = 0;
      let mqx = 0;
      let mqy = 0;
      let topo = -Infinity;
      let base = Infinity;
      let esq = Infinity;
      let dir = -Infinity;
      let v2 = 0;
      let pr = 0;
      for (let a = ini; a < fim; a++) {
        const i = membros[a];
        const m = mas[i];
        M += m;
        cx += m * x[i];
        cy += m * y[i];
        vcx += m * vx[i];
        vcy += m * vy[i];
        mqx += m * qx[i];
        mqy += m * qy[i];
        const r = rad[i];
        if (y[i] + r > topo) topo = y[i] + r;
        if (y[i] - r < base) base = y[i] - r;
        if (x[i] - r < esq) esq = x[i] - r;
        if (x[i] + r > dir) dir = x[i] + r;
        // o sono olha o deslocamento liquido numa janela de 0,25 s, nao a velocidade do
        // subpasso (que carrega o ruido de g*dt de um solver de 1 iteracao) nem o quadro a
        // quadro (o vai e volta de milesimos de u entre contato e fronteira nao conta)
        const ddx = x[i] - xm[i];
        const ddy = y[i] - ym[i];
        const u2 = ddx * ddx + ddy * ddy;
        if (u2 > v2) v2 = u2;
        pr += pen[i];
      }
      cx /= M;
      cy /= M;
      mqx /= M;
      mqy /= M;
      s.cx = cx;
      s.cy = cy;
      s.vx = vcx / M;
      s.vy = vcy / M;
      s.topo = topo;
      s.base = base;
      s.esq = esq;
      s.dir = dir;
      s.pressao = pr / s.n;
      s.livre = s.vx * s.vx + s.vy * s.vy > 0.25 && pr === 0;
      // recentra a forma de repouso (a plasticidade desloca o centro) e mede a
      // deformacao total A0 = (sum m r o^T)(sum m o o^T)^-1 em relacao ao disco original
      let p11 = 0;
      let p12 = 0;
      let p21 = 0;
      let p22 = 0;
      let q11 = 0;
      let q12 = 0;
      let q22 = 0;
      for (let a = ini; a < fim; a++) {
        const i = membros[a];
        const m = mas[i];
        qx[i] -= mqx;
        qy[i] -= mqy;
        const rx = x[i] - cx;
        const ry = y[i] - cy;
        p11 += m * rx * ox[i];
        p12 += m * rx * oy[i];
        p21 += m * ry * ox[i];
        p22 += m * ry * oy[i];
        q11 += m * ox[i] * ox[i];
        q12 += m * ox[i] * oy[i];
        q22 += m * oy[i] * oy[i];
      }
      const det = q11 * q22 - q12 * q12;
      if (det > 1e-12) {
        const i11 = q22 / det;
        const i12 = -q12 / det;
        const i22 = q11 / det;
        s.a11 = p11 * i11 + p12 * i12;
        s.a12 = p11 * i12 + p12 * i22;
        s.a21 = p21 * i11 + p22 * i12;
        s.a22 = p21 * i12 + p22 * i22;
      }
      // dormir: a cada janela compara o deslocamento liquido com o limite
      s.tJanela = (s.tJanela || 0) + dtQuadro;
      const fechou = s.tJanela >= JANELA_SONO;
      const lim = V_DORME * s.tJanela;
      const agitado = s.preso || s.rampa < 1 || s.estado !== 'normal' || s.misturando || s.pigAlvo || s.nPlast > Math.max(1, s.n * 0.05);
      if (fechou) {
        for (let a = ini; a < fim; a++) {
          const i = membros[a];
          xm[i] = x[i];
          ym[i] = y[i];
        }
        s.tJanela = 0;
      }
      if (agitado || v2 > lim * lim) {
        s.tParado = 0;
        if (!s.preso && v2 > lim * lim * 4) s.dormindo = false;
      } else if (!s.dormindo && fechou) {
        s.tParado += JANELA_SONO;
        if (s.tParado >= T_DORME) {
          s.dormindo = true;
          for (let a = ini; a < fim; a++) {
            const i = membros[a];
            vx[i] = 0;
            vy[i] = 0;
          }
        }
      }
    }
    // vizinhos com o mesmo idv ganham outro (a linha entre slimes precisa de ids diferentes)
    for (let a = 0; a < nPertoAntes; a++) {
      const key = pertoAntes[a];
      const i = (key / MAX_SLIMES) | 0;
      const j = key - i * MAX_SLIMES;
      const A = slimes[i];
      const B = slimes[j];
      if (!A.ativo || !B.ativo || A.idv !== B.idv) continue;
      const novo = A.nasceu > B.nasceu ? A : B;
      novo.idv = idvLivre(novo.idx);
    }
  }

  /**
   * Pares de slimes perto agora: [a, b, subpassos seguidos com particulas a ate PERTO * (ri + rj)].
   * @returns {number[][]}
   */
  function contatos() {
    const out = [];
    for (let a = 0; a < nPertoAntes; a++) {
      const key = pertoAntes[a];
      const i = (key / MAX_SLIMES) | 0;
      const j = key - i * MAX_SLIMES;
      if (slimes[i].ativo && slimes[j].ativo) out.push([i, j, persist[key]]);
    }
    return out;
  }

  /** @returns {Slime[]} */
  function vivos() {
    return slimes.filter((s) => s.ativo);
  }

  /** FNV-1a das posicoes (teste de determinismo). */
  function hash() {
    let h = 2166136261;
    const buf = new Float64Array(1);
    const bytes = new Uint8Array(buf.buffer);
    for (let i = 0; i < n; i++) {
      for (const v of [x[i], y[i]]) {
        buf[0] = v;
        for (let b = 0; b < 8; b++) {
          h ^= bytes[b];
          h = Math.imul(h, 16777619);
        }
      }
    }
    return (h >>> 0).toString(16);
  }

  return mundo;
}

// Volei de Gosma (ideia #58, ?modelo=volei): dois slimes meia-lua jogam volei de praia, em
// homenagem ao Slime Volleyball classico. O slime e o motor de sempre (gelatina com memoria alta:
// amassa no toque e volta); a bola e um circulo rigido simulado aqui (o PBD nao quica) que bate
// nas PARTICULAS dos slimes: sai pela normal das particulas tocadas, reflete com a velocidade
// delas e empurra o corpo (o slime amassa, e o amassado muda a normal e o angulo da bola).
// Contra a CPU (torneio de 3 rivais com personalidade) ou 2 jogadores no mesmo teclado/tela.
// Partida ate 7 pontos.

import { criarMundo } from '../../fisica/mundo.js';
import { material } from '../../fisica/materiais.js';
import { hexDaMistura } from '../../cor/km.js';
import { pintar } from '../../cor/difusao.js';
import { criarRng } from '../../core/rng.js';
import { desenharCenario, desenharFundo, desenharTopo } from '../../render/prototipos/volei.js';

/** Meia largura da quadra (u): areia de -LARG a LARG. */
export const LARG = 16;
/** Rede: poste em x = 0 ate REDE_H (a bola bate nele; para os slimes a parede vai ate o ceu). */
export const REDE_H = 3.0;
export const REDE_R = 0.17;
/** Raio da meia-lua (u) e passo do reticulado hexagonal (>= ESPACO 0,308). */
const RAIO = 2.2;
const PASSO = 0.31;
/** x de repouso de cada jogador (o lado multiplica). */
const CASA = 8;
/** Bola: raio, gravidade propria (flutua como no classico), limite de velocidade. */
export const RB = 0.68;
const G_BOLA = 23;
const VMAX_BOLA = 20;
const SUB_BOLA = 6;
/** Da particula ate a superficie desenhada do slime (o campo passa um pouco da particula). */
const BORDA = 0.3;
/** Do centro da base do slime ate o centro da bola no contato (a IA planeja com isso). */
const R_EF = RAIO + BORDA + RB - 0.1;
/** Restituicao contra o slime, velocidade minima de saida (para cima) e atrito tangente. */
const E_SLIME = 0.78;
const V_MIN = 10;
const ATRITO_BOLA = 0.12;
/** Quanto do impulso da bola vira velocidade das particulas tocadas (o amassado). */
const AMASSA = 0.5;
/** Achatamento do corpo inteiro no toque (u/s por u/s de impulso). */
const SQUASH = 0.42;
const E_REDE = 0.5;
const E_PAREDE = 0.85;
/** Teto (centro da bola fica abaixo): a bola sempre aparece na tela. */
const TETO = 16.4;
/** Movimento dos slimes: velocidade (u/s) e pulo (u/s; a gravidade das particulas e 50). */
const VEL = 10.5;
const PULO = 15.5;
/** Forma: mola extra para a meia-lua de pe (1/s2), giro amortecido (fracao por quadro) e memoria. */
const MOLA = 110;
const GIRO = 0.35;
const MEM = 0.15;
/** Pontos para vencer a partida. */
export const ALVO = 7;
/** Toques seguidos do mesmo lado permitidos (o seguinte e falta). */
export const TOQUES = 3;

const LARANJA = [0, 0.1, 0.9, 0];

/**
 * Rivais do torneio (a CPU): velocidade, tempo de reacao (s), erro de posicao (u), chance de
 * pular na bola, angulo de saida da bola (rad da vertical: maior = mais rasante), distracao
 * (chance por s de ficar olhando o mar), corte (salta e manda rasante) e mira (longe do rival).
 */
export const RIVAIS = [
  { nome: 'Gota', pig: [0.42, 0, 0.04, 0], vel: 6.6, reacao: 0.4, erro: 1.5, pulo: 0.1, angulo: 0.45, distraida: 0.22, corta: 0, mira: false, acessorio: 'chapeu' },
  { nome: 'Geleia', pig: [0.62, 0.02, 0, 0], vel: 8.8, reacao: 0.2, erro: 0.95, pulo: 0.35, angulo: 0.62, distraida: 0, corta: 0.15, mira: false, acessorio: 'faixa' },
  { nome: 'Rei Gosma', pig: [0.6, 0.38, 0, 0], vel: 10.5, reacao: 0.1, erro: 0.65, pulo: 0.55, angulo: 0.8, distraida: 0, corta: 0.45, mira: true, acessorio: 'coroa' },
];
/** A IA do jogador 1 no ?auto e no teste (a mesma CPU, equilibrada). */
export const BOT = { nome: 'bot', vel: 9.5, reacao: 0.12, erro: 0.8, pulo: 0.4, angulo: 0.68, distraida: 0, corta: 0.2, mira: false };

/** Icone do botao 2P: duas meias-luas e a bola (traco branco com contorno de tinta). */
const SVG_DOIS = '<svg viewBox="0 0 24 24"><g class="t"><path d="M1.8 19.5a4.2 4.2 0 0 1 8.4 0zM13.8 19.5a4.2 4.2 0 0 1 8.4 0z"/><circle cx="12" cy="7" r="2.6"/></g><path d="M1.8 19.5a4.2 4.2 0 0 1 8.4 0zM13.8 19.5a4.2 4.2 0 0 1 8.4 0z"/><circle cx="12" cy="7" r="2.6"/></svg>';

/**
 * Pontos da meia-lua: o contorno (arco e base) com passo PASSO, para a cupula ficar redonda (o
 * reticulado puro deixa o topo chato e a bola sairia sempre na vertical), e o miolo em reticulado
 * hexagonal, so onde fica a PASSO ou mais de todos os outros.
 * @param {number} cx centro da base
 * @returns {number[]} [x0, y0, x1, y1, ...]
 */
export function meiaLua(cx) {
  const pts = [];
  const R = RAIO - 0.02;
  const y0 = 0.15;
  const a0 = Math.asin(y0 / R);
  const nArco = Math.floor(((Math.PI - 2 * a0) * R) / PASSO);
  for (let k = 0; k <= nArco; k++) {
    const a = a0 + (k * (Math.PI - 2 * a0)) / nArco;
    pts.push(Math.cos(a) * R, Math.sin(a) * R);
  }
  const xb = Math.cos(a0) * R;
  // a base em passo exato a partir do meio (as fileiras do miolo encaixam nela)
  for (let k = -Math.floor(xb / PASSO); k <= Math.floor(xb / PASSO); k++) {
    if (Math.abs(k * PASSO) <= xb - PASSO) pts.push(k * PASSO, y0);
  }
  const h = PASSO * Math.sqrt(3) / 2;
  const longe = (x, y) => {
    for (let k = 0; k < pts.length; k += 2) {
      const dx = pts[k] - x;
      const dy = pts[k + 1] - y;
      if (dx * dx + dy * dy < PASSO * PASSO * 0.995) return false;
    }
    return true;
  };
  for (let j = 1; ; j++) {
    const y = y0 + j * h;
    if (y > R - PASSO * 0.8) break;
    const desl = j % 2 ? PASSO / 2 : 0;
    const n = Math.ceil(R / PASSO) + 1;
    for (let i = -n; i <= n; i++) {
      const x = i * PASSO + desl;
      if (x * x + y * y < (R - PASSO * 0.75) * (R - PASSO * 0.75) && longe(x, y)) pts.push(x, y);
    }
  }
  for (let k = 0; k < pts.length; k += 2) pts[k] += cx;
  return pts;
}

/** Altura media dos pontos da meia-lua (centro da forma de repouso, acima da areia). */
const MEDIA_Y = (() => {
  const p = meiaLua(0);
  let s = 0;
  for (let k = 1; k < p.length; k += 2) s += p[k];
  return s / (p.length / 2);
})();

/** @param {number} v @param {number} a @param {number} b */
const limitar = (v, a, b) => (v < a ? a : v > b ? b : v);

/**
 * @param {{ semente?: number, salvo?: any, toque?: boolean, lang?: string }} [o]
 */
export function criarModo(o = {}) {
  const salvo = o.salvo || {};
  let semente = o.semente || 7;
  let rng = criarRng(semente);
  /** torneio: 0..2 (o rival da vez), campeonatos ganhos, partidas vistas (onboarding) */
  let fase = limitar(salvo.fase | 0, 0, RIVAIS.length - 1);
  let campeao = salvo.campeao | 0;
  let vistos = salvo.vistos | 0;
  let dois = false;
  /** s de piloto automatico do jogador 1 (o bot() renova) */
  let autoP1 = 0;
  const eventos = [];
  const mat = material('gelatina', { k: 0.02, mem: 3, epsY: 0.9, lam: 0.5, atritoS: 0.15, atritoK: 0.1, coesao: 0.02 });

  /** @type {any} */
  let m = null;
  /** @type {any[]} */
  let jog = [];
  const bola = { x: 0, y: 9, vx: 0, vy: 0, ang: 0, angV: 0, trilha: /** @type {number[]} */ ([]) };
  /** saque | jogo | ponto | fim */
  let estado = 'saque';
  let tEstado = 0;
  let tempo = 0;
  let tPartida = 0;
  let quemSaca = 0;
  /** toques seguidos do mesmo lado (o 4o e falta: regra dos 3 toques do volei) */
  let seguidos = 0;
  let ultimoToque = -1;
  let ladoBola = -1;
  let tRede = 0;
  let tPresa = 0;
  /** efeitos para o desenho: impactos { x, y, t, f, cor } */
  const impactos = [];
  // buffers do contato da bola
  const contato = new Int32Array(256);
  const pesos = new Float64Array(256);

  /** rival da partida em andamento (a fase ja avanca no fim; o rival novo entra no reiniciar) */
  let atual = fase;
  function rival() { return RIVAIS[atual]; }

  function novoJogador(idx, lado, pig, cpu) {
    const s = m.criarSlime({ x: lado * CASA, y: 1, pontos: meiaLua(lado * CASA), material: mat, pigmento: pig });
    s.dados.hex = hexDaMistura(pig);
    return {
      idx, lado, s, cpu, casa: lado * CASA, pontos: 0,
      esq: false, dir: false, cima: false, pedido: 0, tPulo: 0,
      alvoX: lado * CASA, controle: 'teclas',
      ponteiro: { ativo: false, t0: 0, x0: 0, x: 0, moveu: 0 },
      tToque: -9, exprT: 0,
      ia: { t: 0, alvo: lado * CASA, erro: 0, vaiPular: false, distraida: 0, corte: false, meu: false, tq: 9, pula: false, desvio: 0 },
    };
  }

  function montar() {
    m = criarMundo({ semente, limites: [-17.5, -1.5, 17.5, 22], config: { kAltura: 0 } });
    m.definirParedes([
      { ax: -LARG - 1, ay: -0.5, bx: LARG + 1, by: -0.5, r: 0.5, oculta: true },
      { ax: -LARG - 0.5, ay: -1, bx: -LARG - 0.5, by: 24, r: 0.5, oculta: true },
      { ax: LARG + 0.5, ay: -1, bx: LARG + 0.5, by: 24, r: 0.5, oculta: true },
      { ax: 0, ay: -0.5, bx: 0, by: 24, r: REDE_R, oculta: true },
    ]);
    jog = [novoJogador(0, -1, LARANJA, null), novoJogador(1, 1, rival().pig, rival())];
    m.reconstruir();
    m.medir(1 / 60);
  }

  /** Cor e personalidade do jogador 2 (CPU da fase, ou gente). */
  function vestirRival() {
    const J = jog[1];
    atual = fase;
    const pig = dois ? RIVAIS[1].pig : rival().pig;
    pintar(m, J.s, pig);
    J.s.dados.hex = hexDaMistura(pig);
    J.cpu = dois ? null : rival();
  }

  /** Slime de volta para casa, de pe e parado (reticulado da meia-lua). */
  function recolocar(J) {
    const s = J.s;
    const lista = [];
    const pts = [];
    // o (forma de repouso) e relativo a media dos pontos da meia-lua: a base volta para a areia
    for (let a = m.iniSl[s.idx]; a < m.iniSl[s.idx + 1]; a++) {
      const i = m.membros[a];
      lista.push(i);
      pts.push(J.casa + m.ox[i], MEDIA_Y + m.oy[i]);
      m.qx[i] = m.ox[i];
      m.qy[i] = m.oy[i];
    }
    m.reposicionar(lista, pts);
    J.alvoX = J.casa;
  }

  function sacar(k) {
    quemSaca = k;
    estado = 'saque';
    tEstado = 0.75;
    bola.x = jog[k].casa;
    bola.y = 9.2;
    bola.vx = 0;
    bola.vy = 0;
    bola.angV = 0;
    bola.trilha.length = 0;
    seguidos = 0;
    ultimoToque = -1;
    ladoBola = jog[k].lado;
    for (const J of jog) novaJogada(J);
  }

  function novaPartida() {
    for (const J of jog) {
      J.pontos = 0;
      J.s.dados.expr = '';
      J.exprT = 0;
      recolocar(J);
    }
    tPartida = 0;
    // contra a CPU o primeiro saque cai do lado dela (quem chega ve a bola vir antes de jogar)
    sacar(dois ? 0 : 1);
    const nome = dois ? '2 jogadores' : `Fase ${atual + 1}: ${rival().nome}`;
    eventos.push({ tipo: 'texto', x: 0, y: 11.5, texto: nome, cor: dois ? '#ffd23a' : '#ffffff', escala: 1.5 });
    eventos.push({ tipo: 'nivel', n: atual + 1, acao: 'start' });
  }

  // ------------------------------------------------------------------ forma e movimento

  /**
   * Meia-lua de pe: mola para a forma de repouso sem giro (amassa e volta), giro amortecido e a
   * forma de repouso do solver de volta ao desenho (a plasticidade nao deixa o amassado ficar).
   */
  function manterForma(J) {
    const s = J.s;
    const ini = m.iniSl[s.idx];
    const fim = m.iniSl[s.idx + 1];
    let M = 0;
    let cx = 0;
    let cy = 0;
    let vcx = 0;
    let vcy = 0;
    for (let a = ini; a < fim; a++) {
      const i = m.membros[a];
      const w = m.mas[i];
      M += w;
      cx += w * m.x[i];
      cy += w * m.y[i];
      vcx += w * m.vx[i];
      vcy += w * m.vy[i];
    }
    cx /= M;
    cy /= M;
    vcx /= M;
    vcy /= M;
    let L = 0;
    let I = 0;
    for (let a = ini; a < fim; a++) {
      const i = m.membros[a];
      const w = m.mas[i];
      const rx = m.x[i] - cx;
      const ry = m.y[i] - cy;
      L += w * (rx * (m.vy[i] - vcy) - ry * (m.vx[i] - vcx));
      I += w * (rx * rx + ry * ry);
    }
    const dw = I > 0 ? -GIRO * L / I : 0;
    const k = MOLA / 60;
    for (let a = ini; a < fim; a++) {
      const i = m.membros[a];
      const rx = m.x[i] - cx;
      const ry = m.y[i] - cy;
      m.vx[i] += -dw * ry + k * (m.ox[i] - rx);
      m.vy[i] += dw * rx + k * (m.oy[i] - ry);
      m.qx[i] += MEM * (m.ox[i] - m.qx[i]);
      m.qy[i] += MEM * (m.oy[i] - m.qy[i]);
    }
    s.dormindo = false;
    s.tParado = 0;
  }

  /** O slime esta na areia (pode pular). */
  const noChao = (J) => J.s.base < 0.14 && J.s.vy < 2;

  /**
   * Puxa a velocidade horizontal media do slime para `vAlvo` e pula se pediu e pode.
   * @param {any} J @param {number} vAlvo @param {number} dt
   */
  function andar(J, vAlvo, dt) {
    const s = J.s;
    const chao = noChao(J);
    // nao empurra contra a rede nem contra a parede
    if ((J.lado < 0 && s.dir > -REDE_R - 0.05 && vAlvo > 0) || (J.lado > 0 && s.esq < REDE_R + 0.05 && vAlvo < 0)) vAlvo = 0;
    const dv = (chao ? 0.32 : 0.2) * (vAlvo - s.vx);
    const ini = m.iniSl[s.idx];
    const fim = m.iniSl[s.idx + 1];
    for (let a = ini; a < fim; a++) m.vx[m.membros[a]] += dv;
    J.tPulo -= dt;
    if (J.pedido > 0) J.pedido -= dt;
    if ((J.cima || J.pedido > 0) && chao && J.tPulo <= 0) {
      const vy = PULO - Math.max(0, s.vy);
      for (let a = ini; a < fim; a++) m.vy[m.membros[a]] += vy;
      J.tPulo = 0.25;
      J.pedido = 0;
      J.pulos = (J.pulos || 0) + 1;
    }
  }

  /** Velocidade para chegar em x (desacelera perto). */
  function irPara(J, x, vel) {
    const d = x - J.s.cx;
    return Math.abs(d) < 0.06 ? 0 : limitar(d * 6, -vel, vel);
  }

  /** Limites do centro de cada jogador na propria metade. */
  function limitesX(J) {
    return J.lado < 0 ? [-LARG + RAIO + 0.1, -REDE_R - RAIO - 0.1] : [REDE_R + RAIO + 0.1, LARG - RAIO - 0.1];
  }

  // ------------------------------------------------------------------ CPU

  /**
   * Onde a bola desce ate a altura y (balistica simples com paredes, teto e a rede).
   * @param {number} yAlvo @returns {number[]} [x, t, vx, vy] (t = 9 se nao desce ate la)
   */
  function preverQueda(yAlvo) {
    let x = bola.x;
    let y = bola.y;
    let vx = bola.vx;
    let vy = bola.vy;
    if (estado === 'saque') { vx = 0; vy = 0; }
    const h = 1 / 60;
    for (let k = 0; k < 300; k++) {
      if (vy < 0 && y <= yAlvo) return [x, k * h, vx, vy];
      vy -= G_BOLA * h;
      const x0 = x;
      x += vx * h;
      y += vy * h;
      if (x < -LARG + RB) { x = -LARG + RB; vx = -vx * E_PAREDE; }
      if (x > LARG - RB) { x = LARG - RB; vx = -vx * E_PAREDE; }
      if (y > TETO) { y = TETO; vy = -Math.abs(vy) * 0.8; }
      if (y < REDE_H + RB * 0.3 && Math.abs(x) < REDE_R + RB) {
        x = (x0 < 0 ? -1 : 1) * (REDE_R + RB);
        vx = -vx * E_REDE;
      }
    }
    return [x, 9, vx, vy];
  }

  /**
   * Nova jogada (alguem tocou, ou saque): a CPU sorteia o erro (maior com a bola rapida: o ataque
   * forte engana), se vai pular e se vai cortar, e so replaneja depois do tempo de reacao.
   */
  function novaJogada(J, reage = false) {
    const p = J.cpu || BOT;
    const v = Math.sqrt(bola.vx * bola.vx + bola.vy * bola.vy);
    J.ia.erro = (rng() * 2 - 1) * p.erro * (0.6 + v / 16);
    J.ia.vaiPular = rng() < p.pulo;
    J.ia.corte = rng() < (p.corta || 0);
    J.ia.desvio = (rng() * 2 - 1) * 0.12;
    J.ia.t = reage ? p.reacao : 0;
  }

  /**
   * Plano do toque: onde a bola vai estar na altura do contato e onde o centro do slime tem que
   * estar para a normal (bissetriz entre a chegada e a saida desejada) mandar a bola para o outro
   * lado. Pulando, o contato e mais alto e o slime sobe (soma na velocidade relativa).
   */
  function planejar(J, p) {
    const ia = J.ia;
    // o corte so vale com a bola descendo alta perto da rede
    const [xc] = preverQueda(3.5);
    const corta = ia.corte && xc * J.lado > 0 && Math.abs(xc) < 5.5 && bola.vy < -2 && bola.y > 5;
    // bola fraca depois do 1o toque: o pulo da forca a ela
    const fraca = (ultimoToque === J.idx ? seguidos : 0) >= 1 && bola.vx * bola.vx + bola.vy * bola.vy < 110;
    const pula = ia.vaiPular || corta || fraca;
    const hb = pula ? 1.3 : 0;
    const vs = pula ? 9 : 0;
    // angulo de saida (da vertical, para a rede); o Rei mira longe de quem esta perto da rede
    let th = (corta ? 1.1 : p.angulo) + ia.desvio;
    const meus = ultimoToque === J.idx ? seguidos : 0;
    if (p.mira && !corta) {
      const O = jog[1 - J.idx];
      th = Math.abs(O.s.cx) < 6 ? p.angulo + 0.2 : p.angulo - 0.15;
    }
    let ux = -J.lado * Math.sin(th);
    let uy = Math.cos(th);
    // bola colada na rede e ainda ha toques: levanta para tras (o toque seguinte ataca)
    const [xr] = preverQueda(2.6);
    if (meus < 2 && xr * J.lado > 0 && Math.abs(xr) < 2.6 + p.erro * 0.3) {
      ux = J.lado * 0.3;
      uy = 0.95;
    }
    let yc = hb + R_EF * 0.85;
    let alvo = J.lado * CASA * 0.85;
    let tq = 9;
    let meu = false;
    for (let it = 0; it < 3; it++) {
      const [x, t, vx, vy] = preverQueda(yc);
      tq = t;
      meu = x * J.lado > 0 && t < 9;
      if (!meu) break;
      let ix = vx;
      let iy = vy - vs;
      const li = Math.sqrt(ix * ix + iy * iy) || 1;
      ix /= li;
      iy /= li;
      // saida relativa d (modulo W) tal que (0, vs) + W d aponte para u
      const W = Math.max(V_MIN, li * E_SLIME);
      const uv = uy * vs;
      const lam = uv + Math.sqrt(Math.max(0, uv * uv - vs * vs + W * W));
      const dx = (lam * ux) / W;
      const dy = (lam * uy - vs) / W;
      let nx = dx - ix;
      let ny = dy - iy;
      if (ny < 0.3) ny = 0.3;
      const ln = Math.sqrt(nx * nx + ny * ny);
      nx /= ln;
      ny /= ln;
      yc = hb + ny * R_EF;
      alvo = x - nx * R_EF;
    }
    const [x0, x1] = limitesX(J);
    ia.meu = meu;
    ia.tq = tq;
    ia.pula = pula;
    ia.alvo = limitar(meu ? alvo + ia.erro : J.lado * CASA * 0.85, x0, x1);
    // ja deu os 3 toques: sai de baixo da bola (o 4o seria falta)
    if (meus >= TOQUES && meu) {
      ia.pula = false;
      const fuga = alvo > (x0 + x1) / 2 ? alvo - 5.5 : alvo + 5.5;
      ia.alvo = limitar(fuga, x0, x1);
    }
  }

  /** IA: vai para o ponto do plano e pula na hora certa (ou fica olhando o mar). */
  function pensar(J, p, dt) {
    const s = J.s;
    const ia = J.ia;
    ia.t -= dt;
    ia.tq -= dt;
    if (ia.distraida > 0) {
      ia.distraida -= dt;
      if (ia.distraida <= 0 && s.dados.expr === 'apatico') s.dados.expr = '';
      return 0;
    }
    if (p.distraida && estado === 'jogo' && bola.x * J.lado < 0 && rng() < p.distraida * dt) {
      ia.distraida = 0.6 + rng() * 0.6;
      s.dados.expr = 'apatico';
      J.exprT = ia.distraida;
      return 0;
    }
    if (ia.t <= 0) {
      ia.t = p.reacao;
      planejar(J, p);
    }
    const v = irPara(J, ia.alvo, p.vel);
    // pulo: a bola chega ao ponto do contato em ~0,12 s e o slime esta no lugar
    if (estado === 'jogo' && ia.meu && ia.pula && ia.tq > 0 && ia.tq < 0.14 && Math.abs(s.cx - ia.alvo) < 0.9) J.pedido = 0.05;
    return v;
  }

  // ------------------------------------------------------------------ bola

  /** Contato da bola com as particulas de um slime (um subpasso). */
  function bolaNoSlime(J) {
    const s = J.s;
    const alc = RB + BORDA;
    if (bola.x + alc < s.esq - 0.4 || bola.x - alc > s.dir + 0.4 || bola.y - alc > s.topo + 0.4 || bola.y + alc < s.base - 0.4) return;
    const ini = m.iniSl[s.idx];
    const fim = m.iniSl[s.idx + 1];
    let nx = 0;
    let ny = 0;
    let ws = 0;
    let pvx = 0;
    let pvy = 0;
    let pen = 0;
    let nc = 0;
    const R2 = alc * alc;
    for (let a = ini; a < fim; a++) {
      const i = m.membros[a];
      const dx = bola.x - m.x[i];
      const dy = bola.y - m.y[i];
      const d2 = dx * dx + dy * dy;
      if (d2 >= R2) continue;
      const d = Math.sqrt(d2) || 1e-6;
      const p = alc - d;
      nx += (p * dx) / d;
      ny += (p * dy) / d;
      ws += p;
      pvx += p * m.vx[i];
      pvy += p * m.vy[i];
      if (p > pen) pen = p;
      if (nc < contato.length) { contato[nc] = i; pesos[nc] = p; nc++; }
    }
    if (!nc) return;
    const l = Math.sqrt(nx * nx + ny * ny);
    if (l < 1e-9) { nx = 0; ny = 1; } else { nx /= l; ny /= l; }
    pvx /= ws;
    pvy /= ws;
    // a bola sai de dentro (o slime cede um pouco: a posicao das tocadas recua)
    bola.x += nx * pen * 0.8;
    bola.y += ny * pen * 0.8;
    for (let k = 0; k < nc; k++) {
      const i = contato[k];
      m.x[i] -= nx * pesos[k] * 0.2;
      m.y[i] -= ny * pesos[k] * 0.2;
    }
    const vrx = bola.vx - pvx;
    const vry = bola.vy - pvy;
    const vn = vrx * nx + vry * ny;
    if (vn >= 0) return;
    // relativo ao slime: a normal reflete com restituicao, a tangente perde um pouco (e gira a bola)
    const tx = vrx - vn * nx;
    const ty = vry - vn * ny;
    let sai = -vn * E_SLIME;
    const pn = pvx * nx + pvy * ny;
    // para cima, a bola sempre sai com um minimo (nao morre na cabeca)
    if (ny > 0.25 && pn + sai < V_MIN) sai = V_MIN - pn;
    bola.vx = pvx + tx * (1 - ATRITO_BOLA) + nx * sai;
    bola.vy = pvy + ty * (1 - ATRITO_BOLA) + ny * sai;
    bola.angV += ((tx * -ny + ty * nx) * ATRITO_BOLA * 6) / RB;
    // o impulso amassa o slime: as particulas tocadas levam a bola na direcao contraria (a
    // covinha) e o corpo inteiro achata na direcao da normal e alarga de lado (squash de desenho)
    const imp = sai - vn;
    const dv = Math.min(18, imp * AMASSA);
    for (let k = 0; k < nc; k++) {
      const i = contato[k];
      const w = pesos[k] / pen;
      m.vx[i] -= nx * dv * w;
      m.vy[i] -= ny * dv * w;
    }
    // amolece por um instante (a rigidez volta em ~0,2 s): o achatado aparece e volta balancando
    if (imp > 6) m.amolecer(s, limitar(1 - imp / 26, 0.15, 0.8), 3.5);
    const A = Math.min(12, imp * SQUASH);
    for (let a = ini; a < fim; a++) {
      const i = m.membros[a];
      const rx = m.x[i] - s.cx;
      const ry = m.y[i] - s.cy;
      const dn = (rx * nx + ry * ny) / RAIO;
      const dt0 = (rx * -ny + ry * nx) / RAIO;
      m.vx[i] += A * (-dn * nx - 0.6 * dt0 * ny);
      m.vy[i] += A * (-dn * ny + 0.6 * dt0 * nx);
    }
    s.dormindo = false;
    s.tParado = 0;
    if (tempo - J.tToque > 0.12 && imp > 3) {
      const px = bola.x - nx * RB;
      const py = bola.y - ny * RB;
      eventos.push({ tipo: 'pouso', x: px, y: py, forca: limitar(imp / 14, 0.4, 1.8), cor: s.dados.hex });
      impactos.push({ x: px, y: py, t: 0, f: limitar(imp / 20, 0.3, 1.4), cor: s.dados.hex });
      if (estado === 'jogo') {
        seguidos = ultimoToque === J.idx ? seguidos + 1 : 1;
        ultimoToque = J.idx;
        for (const K of jog) if (K !== J) novaJogada(K, true);
        novaJogada(J);
        // careta no toque forte (amassou), zonzo na bolada de cima
        if (imp > 24 && ny > 0.8 && bola.vy > 0 && pvy < 1) caretar(J, 'zonzo', 0.7);
        else if (imp > 15) caretar(J, 'amassado', 0.35);
        if (seguidos > TOQUES) {
          eventos.push({ tipo: 'texto', x: J.s.cx, y: 6.2, texto: '4 toques!', cor: '#ff6f6f', escala: 1.2 });
          ponto(J.idx);
        } else if (seguidos > 1) {
          eventos.push({ tipo: 'texto', x: bola.x, y: bola.y + RB + 1.1, texto: String(seguidos), cor: seguidos === 3 ? '#ffd23a' : '#ffffff', escala: 0.8, grupo: 'toque' + J.idx });
        }
      }
    }
    J.tToque = tempo;
  }

  function bolaNaRede() {
    const topo = REDE_H - REDE_R;
    const qy = limitar(bola.y, 0, topo);
    const dx = bola.x;
    const dy = bola.y - qy;
    const r = RB + REDE_R;
    const d2 = dx * dx + dy * dy;
    if (d2 >= r * r) return;
    const d = Math.sqrt(d2);
    let nx = bola.vx > 0 ? -1 : 1;
    let ny = 0;
    if (d > 1e-6) { nx = dx / d; ny = dy / d; }
    bola.x = nx * r;
    bola.y = qy + ny * r;
    const vn = bola.vx * nx + bola.vy * ny;
    if (vn < 0) {
      bola.vx -= (1 + E_REDE) * vn * nx;
      bola.vy -= (1 + E_REDE) * vn * ny;
      if (tempo - tRede > 0.2 && vn < -3) {
        tRede = tempo;
        eventos.push({ tipo: 'som', nome: 'pouso', forca: 0.5 });
      }
    }
  }

  function passoBola(dt) {
    if (estado === 'saque' && tEstado > 0) {
      // a bola espera no alto, girando devagar
      bola.ang += dt * 1.5;
      return;
    }
    const h = dt / SUB_BOLA;
    for (let k = 0; k < SUB_BOLA; k++) {
      bola.vy -= G_BOLA * h;
      bola.x += bola.vx * h;
      bola.y += bola.vy * h;
      for (const J of jog) bolaNoSlime(J);
      bolaNaRede();
      if (bola.x < -LARG + RB) { bola.x = -LARG + RB; if (bola.vx < 0) bola.vx = -bola.vx * E_PAREDE; }
      if (bola.x > LARG - RB) { bola.x = LARG - RB; if (bola.vx > 0) bola.vx = -bola.vx * E_PAREDE; }
      if (bola.y > TETO) { bola.y = TETO; if (bola.vy > 0) bola.vy = -bola.vy * 0.8; }
      if (bola.y < RB) {
        bola.y = RB;
        if (estado === 'jogo') ponto(bola.x < 0 ? 0 : 1);
        if (bola.vy < 0) {
          if (bola.vy < -4) eventos.push({ tipo: 'pouso', x: bola.x, y: 0.05, forca: limitar(-bola.vy / 14, 0.4, 1.4), cor: '#e8c27a' });
          bola.vy = -bola.vy * 0.42;
          bola.vx *= 0.7;
          if (bola.vy < 1.2) bola.vy = 0;
        }
        bola.angV = -bola.vx / RB;
      }
      const v2 = bola.vx * bola.vx + bola.vy * bola.vy;
      if (v2 > VMAX_BOLA * VMAX_BOLA) {
        const f = VMAX_BOLA / Math.sqrt(v2);
        bola.vx *= f;
        bola.vy *= f;
      }
    }
    // bola presa (em cima da rede, entalada entre o slime e a parede): um peteleco para cima
    if (estado === 'jogo' && bola.vx * bola.vx + bola.vy * bola.vy < 2.5 && bola.y > RB + 0.1) {
      tPresa += dt;
      if (tPresa > 1.2) {
        bola.vy = 9;
        bola.vx = bola.x < 0 ? 2 : -2;
        tPresa = 0;
      }
    } else tPresa = 0;
    const lado = bola.x < 0 ? -1 : 1;
    if (lado !== ladoBola) {
      ladoBola = lado;
      seguidos = 0;
      ultimoToque = -1;
    }
    bola.angV *= 0.995;
    bola.ang += bola.angV * dt;
    bola.trilha.unshift(bola.x, bola.y);
    if (bola.trilha.length > 10) bola.trilha.length = 10;
  }

  // ------------------------------------------------------------------ pontos

  function caretar(J, expr, t) {
    J.s.dados.expr = expr;
    J.exprT = t;
  }

  /** @param {number} perdeu 0 (bola caiu na esquerda) ou 1 */
  function ponto(perdeu) {
    const V = jog[1 - perdeu];
    const P = jog[perdeu];
    V.pontos++;
    estado = 'ponto';
    tEstado = 1.5;
    quemSaca = perdeu;
    impactos.push({ x: bola.x, y: 0.05, t: 0, f: 1.4, cor: '#e8c27a', areia: true });
    const humano = dois || V.idx === 0;
    eventos.push({ tipo: 'texto', x: V.lado * CASA, y: 7, texto: '+1', cor: V.s.dados.hex, escala: 1.6 });
    eventos.push({ tipo: 'som', nome: humano ? 'gotas' : 'recusa' });
    caretar(V, 'feliz', 1.6);
    V.s.dados.bravoDe = undefined;
    caretar(P, P.pontos + 3 <= V.pontos ? 'chorinho' : 'emburrado', 1.6);
    P.s.dados.bravoDe = V.s.idx;
    if (V.pontos === ALVO - 1 && P.pontos < ALVO - 1) eventos.push({ tipo: 'texto', x: 0, y: 11, texto: 'Ponto da partida!', cor: '#ffd23a', escala: 1.2 });
    // o ultimo ponto: pausa mais longa (todo mundo volta e assenta antes da tela de fim)
    if (V.pontos >= ALVO) {
      tEstado = 2.4;
      caretar(V, 'feliz', 3);
      caretar(P, 'choro', 3);
      const frase = dois ? (V.idx === 0 ? 'Laranja venceu!' : 'Azul venceu!') : V.idx === 0 ? 'Vitória!' : 'Derrota...';
      eventos.push({ tipo: 'texto', x: 0, y: 9.5, texto: frase, cor: V.s.dados.hex, escala: 1.6 });
    }
  }

  function acabar() {
    estado = 'fim';
    const venceu = jog[0].pontos > jog[1].pontos;
    const placar = `${jog[0].pontos} – ${jog[1].pontos}`;
    let titulo;
    let sub;
    if (dois) {
      titulo = venceu ? 'Laranja venceu!' : 'Azul venceu!';
      sub = 'Revanche?';
    } else if (venceu) {
      const vencido = rival().nome;
      if (fase === RIVAIS.length - 1) {
        campeao++;
        fase = 0;
        titulo = 'Campeão da praia!';
        sub = `Você venceu o ${vencido}. O torneio recomeça.`;
      } else {
        fase++;
        titulo = 'Você venceu!';
        sub = `${vencido} caiu. Próximo: ${RIVAIS[fase].nome}`;
      }
    } else {
      titulo = 'Você perdeu';
      sub = `${rival().nome} venceu. Tente de novo!`;
    }
    vistos++;
    const V = jog[venceu ? 0 : 1];
    const P = jog[venceu ? 1 : 0];
    caretar(V, 'feliz', 99);
    caretar(P, 'choro', 99);
    eventos.push({ tipo: 'nivel', n: atual + 1, acao: venceu ? 'complete' : 'fail' });
    eventos.push({ tipo: 'fim', pontos: placar, titulo, sub, reviver: false, venceu: dois || venceu });
  }

  // ------------------------------------------------------------------ quadro

  function passo(dt) {
    tempo += dt;
    tPartida += dt;
    if (autoP1 > 0) autoP1 -= dt;
    if (tEstado > 0) tEstado -= dt;
    if (estado === 'ponto' && tEstado <= 0) {
      if (jog[0].pontos >= ALVO || jog[1].pontos >= ALVO) acabar();
      else sacar(quemSaca);
    } else if (estado === 'saque' && tEstado <= 0) {
      estado = 'jogo';
    }
    for (const J of jog) {
      manterForma(J);
      let v = 0;
      const auto = J.cpu || (autoP1 > 0 && (J.idx === 0 || dois));
      if (estado === 'ponto' && auto) {
        // a CPU volta para casa no intervalo do ponto (quem joga continua no controle)
        v = irPara(J, J.casa, VEL * 0.8);
        J.pedido = 0;
      } else if (estado === 'fim') {
        // quem venceu pula de alegria
        if (J.s.dados.expr === 'feliz' && noChao(J)) J.pedido = 0.05;
        v = irPara(J, J.casa, 4);
      } else if (auto) {
        v = pensar(J, J.cpu || BOT, dt);
      } else if (J.ponteiro.ativo && o.toque && (tempo - J.ponteiro.t0 > 0.12 || J.ponteiro.moveu > 0.4)) {
        J.alvoX = J.ponteiro.x;
        J.controle = 'ponteiro';
        const [x0, x1] = limitesX(J);
        v = irPara(J, limitar(J.alvoX, x0, x1), VEL);
      } else if (J.controle === 'ponteiro') {
        const [x0, x1] = limitesX(J);
        v = irPara(J, limitar(J.alvoX, x0, x1), VEL);
      } else {
        v = ((J.dir ? 1 : 0) - (J.esq ? 1 : 0)) * VEL;
      }
      andar(J, v, dt);
      if (J.exprT > 0) {
        J.exprT -= dt;
        if (J.exprT <= 0) { J.s.dados.expr = ''; J.s.dados.bravoDe = undefined; }
      }
    }
    passoBola(dt);
    m.avancar(4);
    m.medir(dt);
    for (const f of impactos) f.t += dt;
    while (impactos.length && impactos[0].t > 0.5) impactos.shift();
  }

  /** O jogador de uma tecla (2 jogadores: P1 A/D/W, P2 setas; contra a CPU, as duas). */
  function tecla(codigo, baixo) {
    const p1 = { esq: ['KeyA'], dir: ['KeyD'], cima: ['KeyW'] };
    const p2 = { esq: ['ArrowLeft'], dir: ['ArrowRight'], cima: ['ArrowUp'] };
    const mapas = dois ? [[0, p1], [1, p2]] : [[0, { esq: [...p1.esq, ...p2.esq], dir: [...p1.dir, ...p2.dir], cima: [...p1.cima, ...p2.cima, 'Space'] }]];
    for (const [k, mp] of mapas) {
      const J = jog[k];
      let usou = true;
      if (mp.esq.includes(codigo)) J.esq = baixo;
      else if (mp.dir.includes(codigo)) J.dir = baixo;
      else if (mp.cima.includes(codigo)) { J.cima = baixo; if (baixo) J.pedido = 0.15; }
      else usou = false;
      if (usou) { J.controle = 'teclas'; if (k === 0) autoP1 = 0; }
    }
  }

  montar();
  novaPartida();

  return {
    id: 'volei',
    get mundo() { return m; },
    janela: [-LARG, -1.4, LARG, 16.6],
    campoJanela: [-LARG - 0.4, -0.8, LARG + 0.4, 7.8],
    largo: true,
    semGotas: true,
    get multi() { return dois; },
    eventos,
    botoes: { dois: { svg: SVG_DOIS, nome: '2P' } },
    desenho: { cenario: desenharCenario, fundo: desenharFundo, topo: desenharTopo },
    passo,
    /**
     * Toque: segurar ou arrastar leva o slime ate o x do dedo; o toque rapido (em qualquer lugar
     * da sua metade) so pula. Mouse: o slime segue o cursor e o clique pula.
     */
    apontar(x, y, fase0, quem = 0) {
      if (estado === 'fim') return;
      const J = jog[dois ? (quem ? 1 : 0) : 0];
      const P = J.ponteiro;
      if (J.idx === 0 && fase0 === 'baixo') autoP1 = 0;
      if (!o.toque) {
        if (fase0 === 'baixo') J.pedido = 0.15;
        if (fase0 !== 'cima' && (!dois || fase0 === 'baixo' || P.ativo)) {
          J.alvoX = x;
          J.controle = 'ponteiro';
        }
        P.ativo = fase0 === 'baixo' || (P.ativo && fase0 === 'mover');
        return;
      }
      if (fase0 === 'baixo') {
        P.ativo = true;
        P.t0 = tempo;
        P.x0 = x;
        P.x = x;
        P.moveu = 0;
      } else if (fase0 === 'mover' && P.ativo) {
        P.x = x;
        P.moveu = Math.max(P.moveu, Math.abs(x - P.x0));
      } else if (fase0 === 'cima') {
        if (P.ativo && tempo - P.t0 < 0.25 && P.moveu < 0.8) J.pedido = 0.15;
        P.ativo = false;
      }
    },
    tecla,
    poder(id) {
      // ?poder=rival1 (prints): esse rival do torneio (0..2), partida nova
      if (/^rival[0-2]$/.test(id)) {
        fase = Number(id.slice(5));
        dois = false;
        vestirRival();
        novaPartida();
        return;
      }
      if (id !== 'dois') return;
      dois = !dois;
      for (const J of jog) { J.esq = false; J.dir = false; J.cima = false; J.controle = 'teclas'; }
      vestirRival();
      novaPartida();
      eventos.push({ tipo: 'som', nome: 'interface' });
    },
    bot() {
      // o jogador 1 joga pela IA por 2 s (o ?auto e o teste chamam sempre)
      autoP1 = 2;
    },
    hud() {
      const nomes = dois ? ['P1', 'P2'] : ['Você', rival().nome];
      const sub = dois ? '2P' : `${atual + 1}/${RIVAIS.length}${campeao ? ' 🏆' + (campeao > 1 ? campeao : '') : ''}`;
      return {
        pontos: null,
        metaHtml: `<div class="placarDuelo"><b style="color:${jog[0].s.dados.hex}">${nomes[0]}</b><span>${jog[0].pontos} – ${jog[1].pontos}</span>`
          + `<b style="color:${jog[1].s.dados.hex}">${nomes[1]}</b><small>${sub}</small></div>`,
        poderes: [{ id: 'dois', qtd: dois ? 2 : 1, ativo: dois }],
      };
    },
    visual() {
      const J0 = jog[0];
      const ensinar = vistos === 0 && tPartida < 9 && !(J0.pulos > 0 && Math.abs(J0.s.cx - J0.casa) > 2) && !dois && autoP1 <= 0;
      const acessorios = [];
      if (!dois) acessorios.push({ tipo: rival().acessorio, x: jog[1].s.cx, y: jog[1].s.topo, w: jog[1].s.dir - jog[1].s.esq, lado: 1 });
      return {
        olhar: [bola.x, bola.y],
        mao: ensinar && estado !== 'fim' ? { x: J0.casa, y: 6.2, amplitude: 2.6, tecla: !o.toque, toque: !!o.toque } : null,
        volei: {
          bola: { x: bola.x, y: bola.y, r: RB, ang: bola.ang, vx: bola.vx, vy: bola.vy, trilha: bola.trilha, espera: estado === 'saque' && tEstado > 0 ? tEstado : 0 },
          rede: { h: REDE_H, r: REDE_R },
          larg: LARG,
          impactos,
          acessorios,
          dica: ensinar ? { x: J0.casa, y: 11.4, texto: o.toque ? 'arraste para andar · toque para pular' : 'A/D ou ←/→ anda · W ou espaço pula' } : null,
          dica2: dois && tPartida < 6 ? [
            { x: jog[0].casa, y: 12.6, texto: o.toque ? 'arraste · toque pula' : 'A/D anda · W pula', cor: jog[0].s.dados.hex },
            { x: jog[1].casa, y: 12.6, texto: o.toque ? 'arraste · toque pula' : '←/→ anda · ↑ pula', cor: jog[1].s.dados.hex },
          ] : null,
          estado,
        },
      };
    },
    reiniciar() {
      semente = (semente * 1103515245 + 12345) >>> 0;
      rng = criarRng(semente);
      vestirRival();
      novaPartida();
    },
    salvar() {
      return { fase, campeao, vistos };
    },
    /** testes e depuracao */
    get placar() { return [jog[0].pontos, jog[1].pontos]; },
    get bola() { return bola; },
    get jogadores() { return jog; },
    get estado() { return estado; },
    get fase() { return fase; },
  };
}

// Gosma na tela (explosao do missil da mira e do super slime): manchas da cor do slime voam do
// ponto da explosao "para a camera", grudam no vidro da tela e escorrem (2026-10-17, pedido do
// usuario: "algo dinamico com o tamanho dele e o escorrer com uma fisica interessante, mas nao
// demorada"):
//  - o tamanho vem do slime: quanto mais gosma (area do slime), maiores e mais manchas, e mais
//    longe elas vao (o pequeno suja perto da explosao; o grande cobre a tela);
//  - cada mancha chega achatando e balanca (mola amortecida);
//  - da parte de baixo descem pingos: cada um e uma massa com aderencia que escorre em regime
//    viscoso (a velocidade cai com a massa) e deixa um rastro que gasta a massa, ate grudar de
//    novo; o pingo pesado na ponta se solta e cai acelerando;
//  - tudo some em ~1,1 a 1,6 s (mais no grande).
// Coordenadas em px CSS do canvas por cima do HUD; o tempo vem de fora; sorteio por LCG proprio
// (semente do evento: prints reproduziveis).

import { TINTA } from './fundo.js';

/**
 * @typedef {{ x: number, y: number, v: number, m: number, m0: number, lim: number, gasto: number, deriva: number,
 *   solta: boolean, quedaY: number, quedaV: number, quedaM: number, larg: number }} Pingo
 *   x: deslocamento do pe do pingo (fracao do raio); y: quanto ja desceu (px); m: massa (px2 da gota da ponta)
 * @typedef {{ x: number, y: number, dx: number, dy: number, r: number, lobos: number[], pingos: Pingo[],
 *   espera: number }} Mancha
 * @typedef {{ cor: string, t: number, vida: number, lado: number, manchas: Mancha[] }} Respingo
 */

/** Tempo do voo ate grudar (s). */
const VOO = 0.11;
/** Fade no fim (s). */
const SOME = 0.3;

export function criarGosma() {
  /** @type {Respingo[]} */
  let lista = [];

  return {
    /**
     * @param {number} sx @param {number} sy  ponto da explosao (px CSS)
     * @param {string} cor
     * @param {number} rpx raio do slime em px
     * @param {number} semente
     * @param {number} W @param {number} H tamanho da tela (px CSS)
     */
    respingar(sx, sy, cor, rpx, semente, W, H) {
      let s = (semente >>> 0) % 2147483646 + 1;
      const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      const lado = Math.min(W, H);
      // quanto de gosma: 0 no slime pequeno, 1 no que ocupa ~1/5 da tela
      const tam = Math.max(0, Math.min(1, (rpx / lado - 0.025) / 0.17));
      const base = Math.max(lado * 0.05, Math.min(lado * 0.19, rpx * 1.1));
      const qtd = 3 + Math.round(tam * 6);
      /** @type {Mancha[]} */
      const manchas = [];
      for (let k = 0; k < qtd; k++) {
        // a primeira e grande e fica na explosao; as outras voam para longe, mais longe no grande
        const grande = k === 0;
        const a = ((k + rnd() * 0.7) / qtd) * Math.PI * 2;
        const dist = grande ? rnd() * base * 0.3 : Math.min(lado * 0.46, rpx * (1.6 + rnd() * 2.6) + lado * 0.06);
        const r = Math.min(lado * 0.24, base * (grande ? 1.15 + rnd() * 0.25 : 0.4 + rnd() * 0.4));
        const x = Math.max(r * 0.6, Math.min(W - r * 0.6, sx + Math.cos(a) * dist * 1.25));
        const y = Math.max(r * 0.6, Math.min(H - r * 1.2, sy + Math.sin(a) * dist - base * 0.15));
        const nl = 7 + Math.floor(rnd() * 4);
        const lobos = [];
        for (let i = 0; i < nl; i++) lobos.push(0.78 + rnd() * 0.34);
        // pingos: mais nas manchas grandes; cada um com a sua massa, aderencia e caminho
        const np = Math.max(1, Math.min(4, Math.round(r / (lado * 0.05) + rnd() * 0.8)));
        const pingos = [];
        for (let i = 0; i < np; i++) {
          const rh = r * (0.22 + rnd() * 0.12);
          const m0 = rh * rh;
          // o caminho ate grudar de novo: o grande escorre mais
          const L = r * (1.2 + rnd() * 2.2) + lado * (0.04 + tam * 0.08);
          pingos.push({
            x: -0.75 + ((i + 0.1 + rnd() * 0.8) / np) * 1.5, y: 0, v: 0, m: m0, m0,
            lim: m0 * (0.22 + rnd() * 0.12), gasto: (m0 * 0.7) / L, deriva: (rnd() - 0.5) * 0.12,
            solta: rnd() < 0.45 + tam * 0.3, quedaY: -1, quedaV: 0, quedaM: 0, larg: 0.7 + rnd() * 0.25,
          });
        }
        manchas.push({ x, y, dx: x - sx, dy: y - sy, r, lobos, pingos, espera: 0.04 + rnd() * 0.12 });
      }
      lista.push({ cor, t: 0, vida: 1.1 + tam * 0.5 + rnd() * 0.15, lado, manchas });
    },
    /** @param {number} dt */
    passo(dt) {
      for (const R of lista) {
        R.t += dt;
        if (R.t < VOO) continue;
        const vmax = R.lado * 1.6;
        const g = R.lado * 5;
        for (const m of R.manchas) {
          if (R.t < VOO + m.espera) continue;
          for (const p of m.pingos) {
            // a gota que se soltou cai acelerando
            if (p.quedaY >= 0) { p.quedaV += g * dt; p.quedaY += p.quedaV * dt; }
            if (p.m <= p.lim) { p.v *= Math.max(0, 1 - 12 * dt); continue; }
            // regime viscoso: a velocidade de regime cai com a massa que sobra acima da aderencia
            const alvo = vmax * (p.m - p.lim) / (p.m0 - p.lim);
            p.v += (alvo - p.v) * Math.min(1, 14 * dt);
            const dy = p.v * dt;
            p.y += dy;
            // o rastro gasta a massa pelo caminho (afina e para)
            p.m = Math.max(p.lim * 0.9, p.m - p.gasto * dy);
            // ponta pesada e rapida: a gota se solta (uma vez)
            if (p.solta && p.quedaY < 0 && p.v > vmax * 0.45 && p.y > m.r * 0.6) {
              p.quedaY = p.y;
              p.quedaV = p.v;
              p.quedaM = p.m * 0.55;
              p.m *= 0.45;
              p.solta = false;
            }
          }
        }
      }
      lista = lista.filter((R) => R.t < R.vida);
    },
    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} dpr
     */
    desenhar(ctx, dpr) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const R of lista) {
        const voo = Math.min(1, R.t / VOO);
        const tg = R.t - VOO;
        // caixa do respingo (para o fade)
        let x0 = Infinity;
        let y0 = Infinity;
        let x1 = -Infinity;
        let y1 = -Infinity;
        for (const m of R.manchas) {
          // voando: sai do ponto da explosao pequena e cresce ate grudar
          const x = m.x - m.dx * (1 - voo);
          const y = m.y - m.dy * (1 - voo);
          // no vidro: chega achatada e balanca (mola amortecida)
          const mola = voo < 1 ? 0 : 0.32 * Math.exp(-tg / 0.11) * Math.cos(tg * 34);
          const r = m.r * (0.25 + 0.75 * voo);
          // a mancha cede para baixo enquanto os pingos escoam
          let escoou = 0;
          for (const p of m.pingos) escoou += p.y;
          const cede = voo < 1 ? 0 : Math.min(r * 0.22, (escoou / m.pingos.length) * 0.12);
          mancha(ctx, x, y, r, 1 + mola, 1 - mola * 0.8, cede, m.lobos, voo < 1 ? [] : m.pingos, R.cor);
          let baixo = y + r * 1.6 + cede;
          for (const p of m.pingos) baixo = Math.max(baixo, y + r + p.y + Math.sqrt(p.m0) * 1.5, p.quedaY >= 0 ? y + r + p.quedaY + Math.sqrt(p.quedaM) * 2 : 0);
          x0 = Math.min(x0, x - r * 1.6);
          x1 = Math.max(x1, x + r * 1.6);
          y0 = Math.min(y0, y - r * 1.6);
          y1 = Math.max(y1, baixo);
        }
        // fade: apaga o respingo inteiro de uma vez (com globalAlpha o contorno de tinta aparecia
        // por baixo da cor nas emendas dos pingos)
        const fica = Math.min(1, (R.vida - R.t) / SOME);
        if (fica < 1) {
          ctx.save();
          ctx.globalCompositeOperation = 'destination-out';
          ctx.fillStyle = `rgba(0, 0, 0, ${(1 - fica).toFixed(3)})`;
          ctx.fillRect(x0 - 4, y0 - 4, x1 - x0 + 8, y1 - y0 + 8);
          ctx.restore();
        }
      }
    },
    get vazio() { return !lista.length; },
    limpar() { lista = []; },
  };
}

/**
 * Contorno lobulado de uma mancha (achatada sx/sy e cedendo para baixo) com os pingos, como um
 * caminho so: a mancha e cada rastro afinando ate a gota redonda da ponta; as gotas soltas a parte.
 */
function caminhoMancha(ctx, x, y, r, sx, sy, cede, lobos, pingos) {
  const n = lobos.length;
  const ponto = (a, rr) => {
    const c = Math.cos(a);
    const s = Math.sin(a);
    // a metade de baixo cede (y da tela cresce para baixo)
    return [x + c * rr * sx, y + s * rr * sy + (s > 0 ? s * cede : 0)];
  };
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 0.5) / n) * Math.PI * 2;
    const r0 = r * lobos[i % n];
    const r1 = r * lobos[(i + 1) % n];
    const [px, py] = ponto(a0, r0);
    if (i === 0) ctx.moveTo(px, py);
    else {
      const [qx, qy] = ponto(a1 - Math.PI / n, (r0 + r1) * 0.62);
      ctx.quadraticCurveTo(qx, qy, px, py);
    }
  }
  ctx.closePath();
  for (const p of pingos) {
    // pe do pingo: na borda de baixo da mancha
    const px = x + p.x * r * 0.72 * sx;
    const py = y + r * 0.62 * sy + cede * 0.8;
    const rh = Math.sqrt(Math.max(0, p.m));
    const topo = Math.sqrt(p.m0) * p.larg;
    if (p.y > 1) {
      const hx = px + p.deriva * p.y;
      const hy = py + p.y;
      const w = Math.max(1.5, rh * 0.92);
      // rastro: largo no pe, afinando ate a gota da ponta (um fio de gosma, nao um pirulito)
      const meio = Math.max(1.2, Math.min(topo, w) * 0.75);
      // no mesmo sentido do contorno da mancha (horario na tela): no sentido contrario, a regra
      // nonzero abria um buraco onde o rastro passa por cima da mancha
      ctx.moveTo(px + topo, py - topo * 0.4);
      ctx.quadraticCurveTo(px + meio, (py + hy) / 2, hx + w, hy);
      ctx.arc(hx, hy, Math.max(1.5, rh), 0, Math.PI, false);
      ctx.quadraticCurveTo(px - meio, (py + hy) / 2, px - topo, py - topo * 0.4);
      ctx.closePath();
    }
    if (p.quedaY >= 0) {
      // gota solta, esticada pela queda
      const gx = px + p.deriva * p.quedaY;
      const gy = py + p.quedaY;
      const gr = Math.max(1.5, Math.sqrt(p.quedaM));
      ctx.moveTo(gx + gr, gy);
      ctx.ellipse(gx, gy, gr * 0.9, gr * 1.25, 0, 0, Math.PI * 2);
    }
  }
}

function mancha(ctx, x, y, r, sx, sy, cede, lobos, pingos, cor) {
  ctx.lineJoin = 'round';
  // contorno de tinta por baixo e a cor por cima (as emendas dos pingos somem)
  caminhoMancha(ctx, x, y, r, sx, sy, cede, lobos, pingos);
  ctx.strokeStyle = TINTA;
  ctx.lineWidth = Math.max(3, r * 0.12);
  ctx.stroke();
  ctx.fillStyle = cor;
  ctx.fill();
  // brilho de gosma molhada (na mancha e na ponta de cada pingo)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, r * 0.13);
  ctx.beginPath();
  ctx.arc(x - r * 0.18 * sx, y - r * 0.15 * sy, r * 0.45, Math.PI * 1.05, Math.PI * 1.45);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath();
  ctx.arc(x + r * 0.28 * sx, y - r * 0.36 * sy, Math.max(1.5, r * 0.07), 0, Math.PI * 2);
  for (const p of pingos) {
    if (p.y < 4) continue;
    const rh = Math.sqrt(Math.max(0, p.m));
    const hx = x + p.x * r * 0.72 * sx + p.deriva * p.y;
    const hy = y + r * 0.62 * sy + cede * 0.8 + p.y;
    ctx.moveTo(hx - rh * 0.3 + Math.max(0.8, rh * 0.22), hy - rh * 0.25);
    ctx.arc(hx - rh * 0.3, hy - rh * 0.25, Math.max(0.8, rh * 0.22), 0, Math.PI * 2);
  }
  ctx.fill();
}

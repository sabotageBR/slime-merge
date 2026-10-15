// Gosma na tela (explosao do missil da mira): manchas da cor do slime voam do ponto da
// explosao "para a camera", grudam no vidro da tela e escorrem em pingos que descem e somem.
// Coordenadas em px CSS do canvas por cima do HUD; o tempo vem de fora; sorteio por LCG proprio
// (semente do evento: prints reproduziveis).

import { TINTA } from './fundo.js';

/**
 * @typedef {{ x: number, y: number, dx: number, dy: number, r: number, lobos: number[], pingos: { a: number, larg: number, comp: number, vel: number }[] }} Mancha
 * @typedef {{ cor: string, t: number, vida: number, manchas: Mancha[] }} Respingo
 */

/** Tempo do voo ate grudar (s). */
const VOO = 0.11;

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
      const base = Math.max(34, lado * 0.1, rpx * 0.9);
      const qtd = 6 + Math.floor(rnd() * 3);
      /** @type {Mancha[]} */
      const manchas = [];
      for (let k = 0; k < qtd; k++) {
        // a primeira e grande e fica perto da explosao; as outras se espalham pela tela
        const grande = k === 0;
        // em volta da explosao, mas espalhadas pela tela toda (voaram "para a camera")
        const a = ((k + rnd() * 0.7) / qtd) * Math.PI * 2;
        const dist = grande ? rnd() * base * 0.4 : lado * (0.16 + rnd() * 0.3);
        const x = Math.max(base * 0.4, Math.min(W - base * 0.4, sx + Math.cos(a) * dist * 1.25));
        const y = Math.max(base * 0.4, Math.min(H - base * 0.8, sy + Math.sin(a) * dist - base * 0.2));
        const r = base * (grande ? 1.25 + rnd() * 0.3 : 0.45 + rnd() * 0.5);
        const nl = 7 + Math.floor(rnd() * 4);
        const lobos = [];
        for (let i = 0; i < nl; i++) lobos.push(0.78 + rnd() * 0.34);
        const pingos = [];
        const np = grande ? 3 : rnd() < 0.7 ? 1 : 2;
        for (let i = 0; i < np; i++) {
          pingos.push({ a: -0.75 + rnd() * 1.5, larg: 0.16 + rnd() * 0.14, comp: 0, vel: r * (1.6 + rnd() * 1.8) });
        }
        manchas.push({ x, y, dx: x - sx, dy: y - sy, r, lobos, pingos });
      }
      lista.push({ cor, t: 0, vida: 1.05 + rnd() * 0.45, manchas });
    },
    /** @param {number} dt */
    passo(dt) {
      for (const R of lista) {
        R.t += dt;
        if (R.t < VOO) continue;
        // o pingo desce rapido e desacelera (a gosma gruda)
        for (const m of R.manchas) for (const p of m.pingos) { p.comp += p.vel * dt; p.vel *= 1 - 1.6 * dt; }
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
        const some = Math.min(1, (R.vida - R.t) / 0.35);
        ctx.globalAlpha = some;
        for (const m of R.manchas) {
          // voando: sai do ponto da explosao pequena e cresce ate grudar
          const x = m.x - m.dx * (1 - voo);
          const y = m.y - m.dy * (1 - voo);
          const r = m.r * (0.25 + 0.75 * voo) * (voo < 1 ? 1 : 1 + 0.05 * Math.min(1, (R.t - VOO) * 6));
          mancha(ctx, x, y, r, m.lobos, voo < 1 ? [] : m.pingos, R.cor);
        }
      }
      ctx.globalAlpha = 1;
    },
    get vazio() { return !lista.length; },
    limpar() { lista = []; },
  };
}

/** Contorno lobulado de uma mancha (com os pingos) como um caminho so. */
function caminhoMancha(ctx, x, y, r, lobos, pingos) {
  const n = lobos.length;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 0.5) / n) * Math.PI * 2;
    const r0 = r * lobos[i % n];
    const r1 = r * lobos[(i + 1) % n];
    const px = x + Math.cos(a0) * r0;
    const py = y + Math.sin(a0) * r0;
    if (i === 0) ctx.moveTo(px, py);
    else {
      const rc = (r0 + r1) * 0.62;
      ctx.quadraticCurveTo(x + Math.cos(a1 - Math.PI / n) * rc, y + Math.sin(a1 - Math.PI / n) * rc, px, py);
    }
  }
  ctx.closePath();
  // pingos: tiras que descem da metade de baixo com a gota redonda na ponta
  for (const p of pingos) {
    if (p.comp < 1) continue;
    const px = x + p.a * r * 0.7;
    const py = y + r * 0.55;
    const w = r * p.larg;
    ctx.moveTo(px - w, py);
    ctx.lineTo(px - w * 0.7, py + p.comp);
    ctx.arc(px, py + p.comp, w * 1.25, Math.PI, 0, true);
    ctx.lineTo(px + w, py);
    ctx.closePath();
  }
}

function mancha(ctx, x, y, r, lobos, pingos, cor) {
  ctx.lineJoin = 'round';
  // contorno de tinta por baixo e a cor por cima (as emendas dos pingos somem)
  caminhoMancha(ctx, x, y, r, lobos, pingos);
  ctx.strokeStyle = TINTA;
  ctx.lineWidth = Math.max(3, r * 0.12);
  ctx.stroke();
  ctx.fillStyle = cor;
  ctx.fill();
  // brilho de gosma molhada
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, r * 0.13);
  ctx.beginPath();
  ctx.arc(x - r * 0.18, y - r * 0.15, r * 0.45, Math.PI * 1.05, Math.PI * 1.45);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath();
  ctx.arc(x + r * 0.28, y - r * 0.36, Math.max(1.5, r * 0.07), 0, Math.PI * 2);
  ctx.fill();
}

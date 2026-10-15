// Papel quadriculado e o pote rabiscado (paredes listradas com contorno grosso, como no
// conceito). Desenhado num canvas 2D por baixo do slime. O traco treme de leve (desenho a
// mao) com ruido fixo por parede, para nao "ferver".

import { aplicar, paraMundo } from './camera.js';

export const PAPEL = '#f3f2ee';
export const GRADE = 'rgba(40, 60, 90, 0.085)';
export const TINTA = '#17161c';

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./camera.js').Camera} cam
 * @param {number} dpr
 * @param {number} W largura CSS
 * @param {number} H altura CSS
 * @param {number} [passo] lado do quadrado da grade em u
 */
export function desenharPapel(ctx, cam, dpr, W, H, passo = 0.8) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = PAPEL;
  ctx.fillRect(0, 0, W, H);
  const [x0, y1] = paraMundo(cam, 0, 0);
  const [x1, y0] = paraMundo(cam, W, H);
  aplicar(ctx, cam, dpr);
  ctx.strokeStyle = GRADE;
  ctx.lineWidth = 1.2 / cam.s;
  ctx.beginPath();
  for (let x = Math.floor(x0 / passo) * passo; x <= x1; x += passo) { ctx.moveTo(x, y0); ctx.lineTo(x, y1); }
  for (let y = Math.floor(y0 / passo) * passo; y <= y1; y += passo) { ctx.moveTo(x0, y); ctx.lineTo(x1, y); }
  ctx.stroke();
}

/** Ruido fixo pequeno (tremor do traco). @param {number} k */
const tremor = (k) => Math.sin(k * 12.9898 + 78.233) * 0.5 + Math.sin(k * 4.1414) * 0.5;

/**
 * Paredes do pote: faixa branca com listras diagonais e contorno de tinta.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./camera.js').Camera} cam
 * @param {number} dpr
 * @param {{ ax: number, ay: number, bx: number, by: number, r: number }[]} paredes
 * @param {{ cor?: string, listra?: string }} [o]
 */
export function desenharPote(ctx, cam, dpr, paredes, o = {}) {
  aplicar(ctx, cam, dpr);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const tinta = 0.075;
  // contorno
  ctx.strokeStyle = TINTA;
  for (const p of paredes) {
    ctx.lineWidth = 2 * (p.r + 0.08) + 2 * tinta;
    ctx.beginPath();
    ctx.moveTo(p.ax, p.ay);
    ctx.lineTo(p.bx, p.by);
    ctx.stroke();
  }
  // miolo
  ctx.strokeStyle = o.cor || '#ffffff';
  for (const p of paredes) {
    ctx.lineWidth = 2 * (p.r + 0.08);
    ctx.beginPath();
    ctx.moveTo(p.ax, p.ay);
    ctx.lineTo(p.bx, p.by);
    ctx.stroke();
  }
  // listras diagonais
  ctx.strokeStyle = o.listra || TINTA;
  ctx.lineWidth = 0.07;
  ctx.lineCap = 'butt';
  paredes.forEach((p, k) => {
    const dx = p.bx - p.ax;
    const dy = p.by - p.ay;
    const L = Math.hypot(dx, dy);
    if (L < 1e-6) return;
    const tx = dx / L;
    const ty = dy / L;
    const nx = -ty;
    const ny = tx;
    const w = p.r + 0.04;
    ctx.beginPath();
    for (let d = 0.12; d < L - 0.05; d += 0.2) {
      const j = tremor(k * 100 + d) * 0.015;
      const cx = p.ax + tx * d;
      const cy = p.ay + ty * d;
      ctx.moveTo(cx + nx * w - tx * 0.07 + j, cy + ny * w - ty * 0.07);
      ctx.lineTo(cx - nx * w + tx * 0.07, cy - ny * w + ty * 0.07 + j);
    }
    ctx.stroke();
  });
}

/**
 * Linha tracejada de perigo.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./camera.js').Camera} cam
 * @param {number} dpr
 * @param {number} y
 * @param {number} x0
 * @param {number} x1
 * @param {number} alerta 0..1 (pisca vermelho)
 */
export function desenharLinha(ctx, cam, dpr, y, x0, x1, alerta = 0) {
  aplicar(ctx, cam, dpr);
  ctx.save();
  ctx.setLineDash([0.28, 0.2]);
  ctx.lineWidth = 0.07;
  ctx.strokeStyle = alerta > 0 ? `rgba(230, 40, 60, ${0.35 + 0.65 * alerta})` : 'rgba(23, 22, 28, 0.28)';
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1, y);
  ctx.stroke();
  ctx.restore();
}

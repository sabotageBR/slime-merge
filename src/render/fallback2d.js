// Renderizador de reserva em Canvas 2D (sem WebGL2, e enquanto os shaders compilam):
// cada slime e um bolo de circulos com contorno preto e a cor media do pigmento.

import { aplicar } from './camera.js';
import { TINTA } from './fundo.js';
import { hexDaMistura } from '../cor/km.js';
import { pigmentoMedio } from '../cor/difusao.js';

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {ReturnType<typeof import('../fisica/mundo.js').criarMundo>} m
 * @param {import('./camera.js').Camera} cam
 * @param {number} dpr
 */
export function desenharSlimes2D(ctx, m, cam, dpr) {
  aplicar(ctx, cam, dpr);
  const { x, y, rad, sl } = m;
  ctx.fillStyle = TINTA;
  ctx.beginPath();
  for (let i = 0; i < m.n; i++) {
    ctx.moveTo(x[i] + rad[i] * 1.75, y[i]);
    ctx.arc(x[i], y[i], rad[i] * 1.75, 0, Math.PI * 2);
  }
  ctx.fill();
  for (const s of m.slimes) {
    if (!s.ativo) continue;
    ctx.fillStyle = hexDaMistura(pigmentoMedio(m, s));
    ctx.beginPath();
    for (let a = m.iniSl[s.idx]; a < m.iniSl[s.idx + 1]; a++) {
      const i = m.membros[a];
      ctx.moveTo(x[i] + rad[i] * 1.3, y[i]);
      ctx.arc(x[i], y[i], rad[i] * 1.3, 0, Math.PI * 2);
    }
    ctx.fill();
  }
  void sl;
}

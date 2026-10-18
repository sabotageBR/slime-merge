// Camera 2D: enquadra um retangulo do mundo (y para cima) num retangulo da tela (px CSS,
// y para baixo). A fisica nunca escala com a tela; so a camera muda.

/**
 * @typedef {Object} Camera
 * @property {number} s      px CSS por u
 * @property {number} cx     centro do mundo enquadrado
 * @property {number} cy
 * @property {number} sx     centro na tela (px CSS)
 * @property {number} sy
 */

/**
 * Enquadra o retangulo do mundo [x0, y0, x1, y1] dentro de [left, top, w, h] (px CSS).
 * @param {number[]} mundo
 * @param {{ x: number, y: number, w: number, h: number }} tela
 * @returns {Camera}
 */
export function enquadrar(mundo, tela) {
  const [x0, y0, x1, y1] = mundo;
  const s = Math.min(tela.w / (x1 - x0), tela.h / (y1 - y0));
  return { s, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, sx: tela.x + tela.w / 2, sy: tela.y + tela.h / 2 };
}

/** @param {Camera} c @param {number} x @param {number} y @returns {number[]} px CSS */
export function paraTela(c, x, y) {
  return [c.sx + (x - c.cx) * c.s, c.sy - (y - c.cy) * c.s];
}

/** @param {Camera} c @param {number} px @param {number} py @returns {number[]} mundo */
export function paraMundo(c, px, py) {
  return [c.cx + (px - c.sx) / c.s, c.cy - (py - c.sy) / c.s];
}

/**
 * Aplica a camera a um contexto 2D (com o DPR do canvas): depois disso desenha-se em u.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Camera} c
 * @param {number} dpr
 */
export function aplicar(ctx, c, dpr) {
  ctx.setTransform(c.s * dpr, 0, 0, -c.s * dpr, (c.sx - c.cx * c.s) * dpr, (c.sy + c.cy * c.s) * dpr);
}

/**
 * A mesma camera deslocada (px CSS) na tela: o tremor do terremoto (o toque e o HUD seguem a
 * camera parada).
 * @param {Camera} c @param {number} dx @param {number} dy
 * @returns {Camera}
 */
export function deslocada(c, dx, dy) {
  return dx || dy ? { ...c, sx: c.sx + dx, sy: c.sy + dy } : c;
}

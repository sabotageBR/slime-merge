// Icones dos reforcos (viewBox 24): formas CHEIAS brancas com UM contorno de tinta em volta da
// uniao delas (primeiro todas as formas em tinta engordadas, depois todas em branco), e os
// detalhes em tinta por cima. Mesma grade, mesma espessura de contorno e nada de traco fino
// solto: ficam nitidos de 48 a 96 px (pedido do usuario em 2026-10-15: "icones mais nitidos e
// coerentes"). O mesmo desenho vai para o HUD (SVG) e para o canvas (Path2D).

/** Icones das missoes do dia e das metas da partida (o menu e a pilula da meta no HUD). */
export const ICONE_MISSAO = { fusao: '🫧', nivel: '⬆️', combo: '✖️', pontos: '⭐', poder: '🪄', duelo: '⚔️' };

/**
 * f: formas cheias (prefixo '!' = regra par-impar, para aneis); l: tracos grossos brancos;
 * d: detalhes cheios em tinta; dl: tracos finos em tinta.
 * @typedef {{ f?: string[], l?: string[], d?: string[], dl?: string[] }} Icone
 * @type {Record<string, Icone>}
 */
export const ICONES = {
  trocar: {
    f: [
      'M3.6 11.4C3.6 6.6 7.2 4.4 11.4 4.4H13.6V1.8L20.4 6.6L13.6 11.4V8.8H11.4C9.4 8.8 8 9.8 8 11.4Z',
      'M20.4 12.6C20.4 17.4 16.8 19.6 12.6 19.6H10.4V22.2L3.6 17.4L10.4 12.6V15.2H12.6C14.6 15.2 16 14.2 16 12.6Z',
    ],
  },
  chacoalhar: {
    f: ['M5.6 13.4a6.4 6.4 0 1 0 12.8 0a6.4 6.4 0 1 0-12.8 0Z'],
    l: ['M3.4 8.6Q4.2 5.4 7.4 4.2', 'M20.6 18.2Q19.8 21.4 16.6 22.6'],
    d: [
      // olhos tontos (aneis) e a boca de "oh"
      '!M8.2 11.8a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0-3.2 0ZM9.2 11.8a0.6 0.6 0 1 0 1.2 0a0.6 0.6 0 1 0-1.2 0Z',
      '!M12.6 11.8a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0-3.2 0ZM13.6 11.8a0.6 0.6 0 1 0 1.2 0a0.6 0.6 0 1 0-1.2 0Z',
      'M10.8 16.2a1.2 1.4 0 1 0 2.4 0a1.2 1.4 0 1 0-2.4 0Z',
    ],
  },
  alargar: {
    f: [
      'M9.4 21.6L3.6 7.2L6.8 6L12 18.4L17.2 6L20.4 7.2L14.6 21.6Z',
      'M1.4 2.2L8.2 3.4L3.4 8.6Z',
      'M22.6 2.2L15.8 3.4L20.6 8.6Z',
    ],
  },
  mira: {
    f: [
      '!M4 12a8 8 0 1 0 16 0a8 8 0 1 0-16 0ZM7.4 12a4.6 4.6 0 1 0 9.2 0a4.6 4.6 0 1 0-9.2 0Z',
      'M10.6 1.4H13.4V8H10.6Z', 'M10.6 16H13.4V22.6H10.6Z', 'M1.4 10.6H8V13.4H1.4Z', 'M16 10.6H22.6V13.4H16Z',
    ],
    d: ['M10.2 12a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0-3.6 0Z'],
  },
  calor: {
    f: ['M12 2.2C15.6 6.4 18.4 9.2 18.4 13.8A6.4 6.4 0 0 1 5.6 13.8C5.6 11.1 6.9 9 8.3 7.8C8.3 10 9.3 11.5 10.6 11.7C10.4 8.1 10.8 5.1 12 2.2Z'],
    d: ['M12 13.2C13.6 15 14.4 16 14.4 17.3A2.4 2.4 0 0 1 9.6 17.3C9.6 16 10.4 15 12 13.2Z'],
  },
  gelo: {
    l: ['M12 2.6V21.4', 'M3.9 7.3L20.1 16.7', 'M3.9 16.7L20.1 7.3', 'M9.4 3.9L12 6.2L14.6 3.9', 'M9.4 20.1L12 17.8L14.6 20.1'],
  },
  tesoura: {
    f: [
      'M7 16.8L18.4 2.4L20 3.6L9.2 18Z',
      'M17 16.8L5.6 2.4L4 3.6L14.8 18Z',
      '!M2.6 18.6a3.4 3.4 0 1 0 6.8 0a3.4 3.4 0 1 0-6.8 0ZM4.6 18.6a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0-2.8 0Z',
      '!M14.6 18.6a3.4 3.4 0 1 0 6.8 0a3.4 3.4 0 1 0-6.8 0ZM16.6 18.6a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0-2.8 0Z',
    ],
    d: ['M11 10.4a1 1 0 1 0 2 0a1 1 0 1 0-2 0Z'],
  },
  tinta: {
    f: ['M12 2.2S18.8 9.8 18.8 14.6A6.8 6.8 0 0 1 5.2 14.6C5.2 9.8 12 2.2 12 2.2Z'],
    dl: ['M12 11.6V18M8.8 14.8H15.2'],
  },
  video: {
    f: ['M4 10H20V19.4A1.6 1.6 0 0 1 18.4 21H5.6A1.6 1.6 0 0 1 4 19.4Z', 'M3.4 6.6L18.8 3.8L19.5 7.6L4.1 10.4Z'],
    d: ['M7 6.1L9.2 9.4L10.7 9.1L8.5 5.8Z', 'M11.5 5.3L13.7 8.6L15.2 8.3L13 5Z', 'M10 12.6V18.4L15 15.5Z'],
  },
  vago: {
    f: ['M12 4.2A5.4 5.4 0 0 1 17.4 9.6C17.4 12.6 14.4 13.2 14.2 15.4H9.8C9.8 11.6 13.2 11.4 13.2 9.6A1.2 1.2 0 0 0 10.8 9.6H6.6A5.4 5.4 0 0 1 12 4.2Z', 'M9.8 17.2H14.2V21H9.8Z'],
  },
};

/** Espessura do contorno (unidades do viewBox) e dos tracos brancos. */
const CONTORNO = 3.2;
const TRACO = 2.6;

const caminho = (p) => (p[0] === '!' ? `<path fill-rule="evenodd" d="${p.slice(1)}"/>` : `<path d="${p}"/>`);

/**
 * SVG do icone para o HUD (o CSS da a cor: veja .ic-c, .ic-f e .ic-d em estilo.css).
 * @param {string} id
 * @returns {string} '' se nao existe
 */
export function svgIcone(id) {
  const I = ICONES[id];
  if (!I) return '';
  const f = (I.f || []).map(caminho).join('');
  const l = (I.l || []).map((p) => `<path class="l" d="${p}"/>`).join('');
  const d = (I.d || []).map(caminho).join('') + (I.dl || []).map((p) => `<path class="l" d="${p}"/>`).join('');
  return `<svg class="icone" viewBox="0 0 24 24" aria-hidden="true"><g class="ic-c">${f}${l}</g><g class="ic-f">${f}${l}</g><g class="ic-d">${d}</g></svg>`;
}

/**
 * Desenha o icone num canvas 2D (reticula, prints), centrado em (x, y), com `tam` px de lado.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} id
 * @param {number} x @param {number} y @param {number} tam
 * @param {{ tinta?: string, cor?: string }} [o]
 */
export function desenharIcone(ctx, id, x, y, tam, o = {}) {
  const I = ICONES[id];
  if (!I || typeof Path2D === 'undefined') return;
  const tinta = o.tinta || '#17161c';
  const cor = o.cor || '#ffffff';
  const P = (p) => [new Path2D(p[0] === '!' ? p.slice(1) : p), p[0] === '!' ? 'evenodd' : 'nonzero'];
  const f = (I.f || []).map(P);
  const l = (I.l || []).map((p) => new Path2D(p));
  ctx.save();
  ctx.translate(x - tam / 2, y - tam / 2);
  ctx.scale(tam / 24, tam / 24);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // contorno da uniao
  ctx.fillStyle = tinta;
  ctx.strokeStyle = tinta;
  ctx.lineWidth = CONTORNO;
  for (const [p, r] of f) { ctx.fill(p, /** @type {CanvasFillRule} */ (r)); ctx.stroke(p); }
  ctx.lineWidth = TRACO + CONTORNO;
  for (const p of l) ctx.stroke(p);
  // branco
  ctx.fillStyle = cor;
  ctx.strokeStyle = cor;
  for (const [p, r] of f) ctx.fill(p, /** @type {CanvasFillRule} */ (r));
  ctx.lineWidth = TRACO;
  for (const p of l) ctx.stroke(p);
  // detalhes
  ctx.fillStyle = tinta;
  ctx.strokeStyle = tinta;
  ctx.lineWidth = 1.8;
  for (const [p, r] of (I.d || []).map(P)) ctx.fill(p, /** @type {CanvasFillRule} */ (r));
  for (const p of I.dl || []) ctx.stroke(new Path2D(p));
  ctx.restore();
}

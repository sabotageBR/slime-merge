// Renderizador de reserva em Canvas 2D (sem WebGL2, e enquanto os shaders compilam):
// cada slime e um bolo de circulos com contorno preto e a cor media do pigmento. Skin de
// ladrilho (src/jogo/skins.js): a imagem 16x16 repete por cima, sem suavizacao, recortada no
// slime; a estampa e as procedurais ficam na cor media (a do pigmento da skin).

import { aplicar } from './camera.js';
import { TINTA } from './fundo.js';
import { hexDaMistura } from '../cor/km.js';
import { pigmentoMedio } from '../cor/difusao.js';
import { PALETA } from '../jogo/skins.js';

/** @type {Array<any>} aparencias da partida (indice = dados.ap) */
let aparencias = [];
/** @type {Map<string, HTMLCanvasElement>} imagem 16x16 de cada ladrilho (pela chave) */
const imagens = new Map();

/**
 * Aparencias (skins) para o desenho 2D (as mesmas da composicao).
 * @param {Array<import('../jogo/skins.js').Aparencia|null|undefined>} lista
 */
export function definirAparencias2D(lista) {
  aparencias = lista || [];
}

/** O ladrilho de uma aparencia como canvas 16x16 (so os pixels opacos). */
function imagemLadrilho(ap) {
  let cv = imagens.get(ap.chave);
  if (cv || typeof document === 'undefined') return cv || null;
  cv = document.createElement('canvas');
  cv.width = 16;
  cv.height = 16;
  const g = /** @type {CanvasRenderingContext2D} */ (cv.getContext('2d'));
  for (let p = 0; p < 256; p++) {
    const i = ap.px[p] & 15;
    if (!i) continue;
    g.fillStyle = PALETA[i];
    g.fillRect(p % 16, p >> 4, 1, 1);
  }
  if (imagens.size > 40) imagens.clear();
  imagens.set(ap.chave, cv);
  return cv;
}

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
    const ap = s.dados.ap ? aparencias[s.dados.ap] : null;
    if (ap && ap.px && ap.modo !== 1) {
      const img = imagemLadrilho(ap);
      const padrao = img ? ctx.createPattern(img, 'repeat') : null;
      if (padrao) {
        // 1 px = 0,1 u na escala 1, girando com o corpo; y da imagem para baixo
        const k = 0.1 / (ap.escala || 1);
        padrao.setTransform(new DOMMatrix([s.cos * k, s.sin * k, s.sin * k, -s.cos * k, s.cx, s.cy]));
        ctx.save();
        ctx.clip();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = Math.min(1, s.dados.texturaT === undefined ? 1 : s.dados.texturaT);
        ctx.fillStyle = padrao;
        ctx.fillRect(s.esq - 1, s.base - 1, s.dir - s.esq + 2, s.topo - s.base + 2);
        ctx.restore();
      }
    }
  }
  void sl;
}

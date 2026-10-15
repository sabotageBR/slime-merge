// Mistura de pigmentos Kubelka-Munk (constante unica, 12 bandas) e medidas de cor.
// O mesmo calculo roda no shader (src/render/composicao.js recebe as tabelas de
// uniformesKM); test/cor.test.js confere as duas pontas.
//
// Concentracoes: [ciano, magenta, amarelo, preto] em [0, 1]; o branco e o que falta para 1.
// Cada pigmento pesa a propria FORCA (poder de tingimento) na mistura.

import { KS, M, FORCA } from './pigmentos.js';

export const N_BANDAS = 12;

/**
 * sRGB linear da mistura.
 * @param {ArrayLike<number>} c [ciano, magenta, amarelo, preto]
 * @param {number[]} [saida]
 * @returns {number[]}
 */
export function misturar(c, saida = [0, 0, 0]) {
  const c0 = c[0] > 0 ? c[0] : 0;
  const c1 = c[1] > 0 ? c[1] : 0;
  const c2 = c[2] > 0 ? c[2] : 0;
  const c3 = c[3] > 0 ? c[3] : 0;
  const cw = Math.max(0, 1 - c0 - c1 - c2 - c3);
  const w0 = c0 * FORCA[0];
  const w1 = c1 * FORCA[1];
  const w2 = c2 * FORCA[2];
  const w3 = c3 * FORCA[3];
  const w4 = cw * FORCA[4];
  const sw = w0 + w1 + w2 + w3 + w4 || 1;
  let r = 0;
  let g = 0;
  let b = 0;
  for (let k = 0; k < N_BANDAS; k++) {
    const ks = (w0 * KS[0][k] + w1 * KS[1][k] + w2 * KS[2][k] + w3 * KS[3][k] + w4 * KS[4][k]) / sw;
    const R = 1 + ks - Math.sqrt(ks * ks + 2 * ks);
    r += R * M[0][k];
    g += R * M[1][k];
    b += R * M[2][k];
  }
  saida[0] = r;
  saida[1] = g;
  saida[2] = b;
  return saida;
}

/** @param {number} v linear -> sRGB [0, 1] */
export function gama(v) {
  const x = v < 0 ? 0 : v > 1 ? 1 : v;
  return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
}

/** @param {number} v sRGB [0, 1] -> linear */
export function linear(v) {
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/** @param {ArrayLike<number>} c concentracoes @returns {string} #rrggbb */
export function hexDaMistura(c) {
  return hexDeLinear(misturar(c));
}

/** @param {ArrayLike<number>} rgb linear */
export function hexDeLinear(rgb) {
  let s = '#';
  for (let k = 0; k < 3; k++) s += Math.round(gama(rgb[k]) * 255).toString(16).padStart(2, '0');
  return s;
}

/** @param {string} hex @returns {number[]} sRGB linear */
export function linearDeHex(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((k) => linear(parseInt(h.slice(k, k + 2), 16) / 255));
}

/** OKLab de sRGB linear. @param {ArrayLike<number>} rgb @returns {number[]} [L, a, b] */
export function oklab(rgb) {
  const r = rgb[0];
  const g = rgb[1];
  const b = rgb[2];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** OKLCH: [L, C, h em graus]. @param {ArrayLike<number>} rgb linear */
export function oklch(rgb) {
  const [L, a, b] = oklab(rgb);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return [L, Math.hypot(a, b), h];
}

/** Diferenca de cor em OKLab (x100, ~ escala do DeltaE: 2 e o limiar do olho). */
export function deltaE(rgb1, rgb2) {
  const p = oklab(rgb1);
  const q = oklab(rgb2);
  return 100 * Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

/**
 * Tabelas para o shader: KS (5 pigmentos x 12 bandas), M (3 x 12) e FORCA (5), em vec4.
 * @returns {{ ks: Float32Array, m: Float32Array, forca: Float32Array }}
 */
export function uniformesKM() {
  const ks = new Float32Array(5 * N_BANDAS);
  for (let p = 0; p < 5; p++) for (let k = 0; k < N_BANDAS; k++) ks[p * N_BANDAS + k] = KS[p][k];
  const m = new Float32Array(3 * N_BANDAS);
  for (let r = 0; r < 3; r++) for (let k = 0; k < N_BANDAS; k++) m[r * N_BANDAS + k] = M[r][k];
  const forca = new Float32Array(8);
  for (let p = 0; p < 5; p++) forca[p] = FORCA[p];
  return { ks, m, forca };
}

/** Concentracoes prontas por nome (paleta base dos modelos). */
export const TINTAS = Object.freeze({
  ciano: [1, 0, 0, 0],
  magenta: [0, 1, 0, 0],
  amarelo: [0, 0, 1, 0],
  preto: [0, 0, 0, 1],
  branco: [0, 0, 0, 0],
});

// Escada de evolucao do Merge Lab (e do Duelo): 12 niveis, diametro x1,155 por nivel (area
// x1,33), do 1,55 u ao 7,6 u: slimes grandes como no conceito (o pote cabe ~10-14), sem
// virar mosaico de rostinhos. Cores feitas de pigmento de verdade
// (concentracoes ciano, magenta, amarelo, preto; o resto e branco). Do nivel 7 em diante cada
// um tem uma TEXTURA desenhada no shader, presa ao corpo (pedido do usuario em 2026-10-14: o
// roxo alto parecia o lilas, e o marmore do arco-iris virava lama cinza com a difusao).

import { particulasGirassol } from '../fisica/forma.js';
import { ESPACO } from '../fisica/mundo.js';

/**
 * Texturas do shader (src/render/composicao.js): 1 bolinhas, 2 listras, 3 arco-iris, 4 ondas,
 * 5 galaxia, 6 glitter.
 * @typedef {{ nome: string, pig: number[], textura?: number }} Nivel
 */
export const TEXTURAS = Object.freeze({ bolinhas: 1, listras: 2, arcoiris: 3, ondas: 4, galaxia: 5, glitter: 6 });

/** @type {Nivel[]} */
export const NIVEIS = [
  { nome: 'gotinha', pig: [0.42, 0, 0, 0] }, // azul claro
  { nome: 'broto', pig: [0.32, 0, 0.68, 0] }, // verde
  { nome: 'lilas', pig: [0.18, 0.32, 0, 0] }, // lilas
  { nome: 'pimenta', pig: [0, 0.62, 0.38, 0] }, // vermelho
  { nome: 'tangerina', pig: [0, 0.24, 0.76, 0] }, // laranja
  { nome: 'limao', pig: [0, 0, 0.82, 0] }, // amarelo
  { nome: 'nuvem', pig: [0.04, 0, 0, 0], textura: 1 }, // branco com bolinhas azul-ceu
  { nome: 'arcoiris', pig: [0.05, 0.05, 0.05, 0], textura: 3 }, // aneis de arco-iris
  { nome: 'mar', pig: [0.66, 0, 0.3, 0], textura: 4 }, // turquesa com ondas
  { nome: 'uva', pig: [0.34, 0.56, 0, 0], textura: 1 }, // roxo-uva com bolinhas
  { nome: 'chiclete', pig: [0, 0.8, 0, 0], textura: 2 }, // rosa com listras de bala
  { nome: 'noite', pig: [0.66, 0.2, 0, 0.42], textura: 5 }, // galaxia
];
export const MAX_NIVEL = NIVEIS.length;

/** @param {number} k 1..12 */
export function diametroNivel(k) {
  let d = 1.55;
  for (let i = 1; i < k; i++) d *= 1.155;
  return d;
}

/** @param {number} k */
export function particulasNivel(k) {
  return particulasGirassol(diametroNivel(k), ESPACO);
}

/** Pontos da fusao que cria o nivel k (numeros triangulares, como no genero). @param {number} k */
export function pontosNivel(k) {
  return ((k * (k + 1)) / 2) * 10;
}

/** @param {number} k */
export function nivel(k) {
  return NIVEIS[Math.max(1, Math.min(MAX_NIVEL, k)) - 1];
}

// Fases do Molde: cada uma e um molde (polilinhas abertas em cima, coordenadas locais com o
// fundo em y = 0), o pivo do giro, os bicos, as zonas que precisam encher e os obstaculos.
// A forma do recipiente E o puzzle: o goo se desenha nela.

import { TINTAS } from '../cor/km.js';

/**
 * @typedef {Object} Fase
 * @property {string} nome
 * @property {number[][][]} molde        polilinhas [[x, y], ...]
 * @property {number} pivoY
 * @property {{ x: number, pig: number[] }[]} bicos
 * @property {number[][][]} zonas        poligonos a encher
 * @property {number} tanque             gotas disponiveis
 * @property {string} [cor]              id da cor alvo (cores.js)
 * @property {{ x: number, y: number, r: number }[]} [espinhos]
 * @property {number[][]} [calor]        retangulos [x0, y0, x1, y1] que derretem o goo
 * @property {number} [giroMax]          graus
 */

/** @type {Fase[]} */
export const FASES = [
  {
    nome: 'copo',
    molde: [[[-3, 6], [-3, 0], [3, 0], [3, 6]]],
    pivoY: 3,
    bicos: [{ x: 0, pig: TINTAS.ciano }],
    zonas: [[[-2.8, 0.2], [2.8, 0.2], [2.8, 2.6], [-2.8, 2.6]]],
    tanque: 70,
  },
  {
    nome: 'coracao',
    molde: [
      [[-0.85, 5.3], [-1.6, 6], [-3, 5.8], [-3.8, 4.6], [-3.6, 3.2], [-2.6, 1.8], [-1.2, 0.7], [0, 0], [1.2, 0.7], [2.6, 1.8], [3.6, 3.2], [3.8, 4.6], [3, 5.8], [1.6, 6], [0.85, 5.3]],
    ],
    pivoY: 3,
    bicos: [{ x: 0, pig: TINTAS.magenta }],
    zonas: [[[-3.3, 3.2], [-2.4, 1.95], [-1.15, 0.95], [0, 0.35], [1.15, 0.95], [2.4, 1.95], [3.3, 3.2]]],
    tanque: 95,
  },
  {
    nome: 'gemeos',
    molde: [[[-5, 5], [-5, 0], [-0.3, 0], [-0.3, 2.9], [0.3, 2.9], [0.3, 0], [5, 0], [5, 5]]],
    pivoY: 2.5,
    bicos: [{ x: -2.6, pig: TINTAS.amarelo }],
    zonas: [
      [[-4.8, 0.2], [-0.5, 0.2], [-0.5, 2.1], [-4.8, 2.1]],
      [[0.5, 0.2], [4.8, 0.2], [4.8, 2.1], [0.5, 2.1]],
    ],
    tanque: 150,
    giroMax: 28,
  },
  {
    nome: 'zigue',
    molde: [[[-4, 6.5], [-3, 5], [-4, 3.4], [-3, 1.8], [-2, 0], [2, 0], [3, 1.8], [4, 3.4], [3, 5], [4, 6.5]]],
    pivoY: 3,
    bicos: [{ x: 0, pig: TINTAS.magenta }, { x: 1.2, pig: TINTAS.amarelo }],
    zonas: [[[-3.55, 3.4], [-2.8, 1.8], [-1.85, 0.2], [1.85, 0.2], [2.8, 1.8], [3.55, 3.4]]],
    tanque: 130,
    cor: 'laranja',
  },
  {
    nome: 'verde',
    molde: [[[-3.8, 6], [-3.8, 0], [3.8, 0], [3.8, 6]]],
    pivoY: 3,
    bicos: [{ x: -1.6, pig: TINTAS.ciano }, { x: 1.6, pig: TINTAS.amarelo }],
    zonas: [[[-3.6, 0.2], [3.6, 0.2], [3.6, 2.2], [-3.6, 2.2]]],
    tanque: 110,
    cor: 'verde',
  },
  {
    nome: 'espinho',
    molde: [[[-3.6, 6.5], [-3.6, 0], [3.6, 0], [3.6, 6.5]]],
    pivoY: 4.2,
    bicos: [{ x: 0, pig: TINTAS.ciano }],
    zonas: [
      [[-3.4, 0.2], [-1.1, 0.2], [-1.1, 2.2], [-3.4, 2.2]],
      [[1.1, 0.2], [3.4, 0.2], [3.4, 2.2], [1.1, 2.2]],
    ],
    espinhos: [{ x: 0, y: 0.9, r: 0.75 }],
    tanque: 130,
    giroMax: 30,
  },
  {
    nome: 'funil',
    molde: [
      [[-4.2, 9], [-0.65, 5.2], [-0.65, 4.2], [-3.4, 2.8], [-3.4, 0], [3.4, 0], [3.4, 2.8], [0.65, 4.2], [0.65, 5.2], [4.2, 9]],
    ],
    pivoY: 4,
    bicos: [{ x: -1.5, pig: TINTAS.amarelo }],
    zonas: [[[-3.2, 0.2], [3.2, 0.2], [3.2, 2.2], [-3.2, 2.2]]],
    calor: [[-1.2, 3.8, 1.2, 6]],
    tanque: 120,
  },
  {
    nome: 'lilas',
    molde: [[[-3.6, 6], [-3.2, 0], [3.2, 0], [3.6, 6]]],
    pivoY: 3,
    bicos: [{ x: -1.8, pig: TINTAS.magenta }, { x: 0, pig: TINTAS.ciano }, { x: 1.8, pig: TINTAS.branco }],
    zonas: [[[-3.1, 0.2], [3.1, 0.2], [3.2, 2.4], [-3.2, 2.4]]],
    tanque: 150,
    cor: 'lilas',
  },
];

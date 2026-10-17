// Gosma cinza (Duelo e a chuva de gosma do sem fim): nao funde com nada, mas ABSORVE pigmento das
// vizinhas coloridas (difusao entre slimes) e, quando pega cor suficiente, vira um slime normal.
// Logica pura: sem DOM, sem relogio, sem Math.random.

import { pintar, pigmentoMedio } from '../cor/difusao.js';
import { hexDaMistura } from '../cor/km.js';

/** Pigmento da gosma (quase sem cor: a mistura com as vizinhas aparece logo). */
export const CINZA = [0, 0, 0, 0.1];
/** Croma absorvido (ciano + magenta + amarelo) que basta para virar slime. */
const BASTA = 0.22;
/** Taxa da troca de pigmento entre a gosma e uma vizinha colorida. */
const TAXA = 2.5;

/** Pinta o slime recem-criado como gosma cinza. @param {any} m @param {any} s */
export function pintarCinza(m, s) {
  s.dados.cinza = true;
  s.dados.hex = '#8a8a90';
  s.dados.expr = 'bravo';
  pintar(m, s, CINZA);
}

/**
 * Taxa extra de difusao entre slimes diferentes: so quando um dos dois e cinza (o `entreSlimes`
 * do difundir). @param {() => any} mundo
 */
export function taxaCinza(mundo) {
  return (/** @type {number} */ a, /** @type {number} */ b) => {
    const sl = mundo().slimes;
    return (sl[a].dados.cinza ? 1 : 0) + (sl[b].dados.cinza ? 1 : 0) === 1 ? TAXA : 0;
  };
}

/**
 * Um quadro da gosma: a cor dela segue a mistura e, com cor bastante, vira um slime normal.
 * @param {any} m o mundo
 * @param {(s: any) => void} virar transforma a gosma no slime do modo (nivel, cor, textura)
 * @returns {number} quantas viraram slime neste quadro
 */
export function passoCinza(m, virar) {
  let n = 0;
  for (const s of m.slimes) {
    if (!s.ativo || !s.dados.cinza || s.preso) continue;
    const pig = pigmentoMedio(m, s);
    s.dados.hex = hexDaMistura(pig);
    // conta o pigmento colorido absorvido (a mistura pode sair sem croma, e ainda conta)
    if (pig[0] + pig[1] + pig[2] > BASTA) {
      s.dados.cinza = false;
      s.dados.expr = 'feliz';
      s.dados.exprT = 0.6;
      virar(s);
      n++;
    }
  }
  return n;
}

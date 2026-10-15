// Cores com nome (Croma-dex do Croma, pedidos da Loja e alvos do Molde): cada uma e uma
// receita de pigmento (ciano, magenta, amarelo, preto; o resto e branco). A cor medida de um
// slime vira a cor com nome mais perto em OKLab.

import { misturar, oklab, oklch } from '../cor/km.js';

/** @typedef {{ id: string, pt: string, en: string, es: string, pig: number[] }} CorNome */

/** @type {CorNome[]} */
export const CORES = [
  { id: 'ciano', pt: 'Azul-tinta', en: 'Ink Blue', es: 'Azul tinta', pig: [1, 0, 0, 0] },
  { id: 'magenta', pt: 'Magenta', en: 'Magenta', es: 'Magenta', pig: [0, 1, 0, 0] },
  { id: 'amarelo', pt: 'Amarelo', en: 'Yellow', es: 'Amarillo', pig: [0, 0, 1, 0] },
  { id: 'branco', pt: 'Branco', en: 'White', es: 'Blanco', pig: [0, 0, 0, 0] },
  { id: 'preto', pt: 'Preto', en: 'Black', es: 'Negro', pig: [0, 0, 0, 1] },
  { id: 'verde', pt: 'Verde', en: 'Green', es: 'Verde', pig: [0.5, 0, 0.5, 0] },
  { id: 'vermelho', pt: 'Vermelho', en: 'Red', es: 'Rojo', pig: [0, 0.5, 0.5, 0] },
  { id: 'violeta', pt: 'Violeta', en: 'Violet', es: 'Violeta', pig: [0.5, 0.5, 0, 0] },
  { id: 'limao', pt: 'Verde-limão', en: 'Lime', es: 'Lima', pig: [0.22, 0, 0.78, 0] },
  { id: 'turquesa', pt: 'Turquesa', en: 'Teal', es: 'Turquesa', pig: [0.72, 0, 0.28, 0] },
  { id: 'laranja', pt: 'Laranja', en: 'Orange', es: 'Naranja', pig: [0, 0.24, 0.76, 0] },
  { id: 'framboesa', pt: 'Framboesa', en: 'Raspberry', es: 'Frambuesa', pig: [0, 0.76, 0.24, 0] },
  { id: 'indigo', pt: 'Índigo', en: 'Indigo', es: 'Índigo', pig: [0.76, 0.24, 0, 0] },
  { id: 'purpura', pt: 'Púrpura', en: 'Purple', es: 'Púrpura', pig: [0.28, 0.72, 0, 0] },
  { id: 'ceu', pt: 'Azul-céu', en: 'Sky', es: 'Celeste', pig: [0.32, 0, 0, 0] },
  { id: 'rosa', pt: 'Rosa', en: 'Pink', es: 'Rosa', pig: [0, 0.32, 0, 0] },
  { id: 'creme', pt: 'Creme', en: 'Cream', es: 'Crema', pig: [0, 0, 0.28, 0] },
  { id: 'lavanda', pt: 'Lavanda', en: 'Lavender', es: 'Lavanda', pig: [0.14, 0.16, 0, 0] },
  { id: 'menta', pt: 'Menta', en: 'Mint', es: 'Menta', pig: [0.18, 0, 0.14, 0] },
  { id: 'pessego', pt: 'Pêssego', en: 'Peach', es: 'Melocotón', pig: [0, 0.1, 0.24, 0] },
  { id: 'lilas', pt: 'Lilás', en: 'Lilac', es: 'Lila', pig: [0.12, 0.3, 0, 0] },
  { id: 'salmao', pt: 'Salmão', en: 'Salmon', es: 'Salmón', pig: [0, 0.24, 0.22, 0] },
  { id: 'marinho', pt: 'Azul-marinho', en: 'Navy', es: 'Azul marino', pig: [0.7, 0.12, 0, 0.18] },
  { id: 'oliva', pt: 'Oliva', en: 'Olive', es: 'Oliva', pig: [0.14, 0.04, 0.62, 0.2] },
  { id: 'ferrugem', pt: 'Ferrugem', en: 'Rust', es: 'Óxido', pig: [0, 0.36, 0.52, 0.12] },
  { id: 'vinho', pt: 'Vinho', en: 'Wine', es: 'Vino', pig: [0.1, 0.62, 0.16, 0.12] },
  { id: 'chocolate', pt: 'Chocolate', en: 'Chocolate', es: 'Chocolate', pig: [0.14, 0.34, 0.38, 0.14] },
  { id: 'musgo', pt: 'Musgo', en: 'Moss', es: 'Musgo', pig: [0.38, 0.04, 0.44, 0.14] },
  { id: 'ameixa', pt: 'Ameixa', en: 'Plum', es: 'Ciruela', pig: [0.34, 0.46, 0.04, 0.16] },
  { id: 'cinza', pt: 'Cinza', en: 'Gray', es: 'Gris', pig: [0, 0, 0, 0.3] },
  { id: 'grafite', pt: 'Grafite', en: 'Graphite', es: 'Grafito', pig: [0, 0, 0, 0.62] },
  { id: 'mostarda', pt: 'Mostarda', en: 'Mustard', es: 'Mostaza', pig: [0.04, 0.1, 0.8, 0.06] },
  { id: 'coral', pt: 'Coral', en: 'Coral', es: 'Coral', pig: [0, 0.4, 0.34, 0] },
  { id: 'ambar', pt: 'Âmbar', en: 'Amber', es: 'Ámbar', pig: [0, 0.14, 0.86, 0] },
  { id: 'esmeralda', pt: 'Esmeralda', en: 'Emerald', es: 'Esmeralda', pig: [0.62, 0, 0.38, 0.04] },
  { id: 'petroleo', pt: 'Petróleo', en: 'Petrol', es: 'Petróleo', pig: [0.6, 0.08, 0.16, 0.16] },
  { id: 'areia', pt: 'Areia', en: 'Sand', es: 'Arena', pig: [0.03, 0.06, 0.22, 0.04] },
  { id: 'chiclete', pt: 'Chiclete', en: 'Bubblegum', es: 'Chicle', pig: [0, 0.55, 0.04, 0] },
  { id: 'pistache', pt: 'Pistache', en: 'Pistachio', es: 'Pistacho', pig: [0.12, 0, 0.42, 0] },
  { id: 'lama', pt: 'Lama', en: 'Mud', es: 'Barro', pig: [0.3, 0.3, 0.32, 0.04] },
];

const LAB = CORES.map((c) => oklab(misturar(c.pig)));

/**
 * A cor com nome mais perto (OKLab x100).
 * @param {number[]} pig
 * @returns {{ cor: CorNome, d: number, indice: number }}
 */
export function nomear(pig) {
  const p = oklab(misturar(pig));
  let melhor = 0;
  let dm = Infinity;
  for (let k = 0; k < LAB.length; k++) {
    const q = LAB[k];
    const d = 100 * Math.sqrt((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2);
    if (d < dm) { dm = d; melhor = k; }
  }
  return { cor: CORES[melhor], d: dm, indice: melhor };
}

/**
 * Lama: pouca saturacao numa luminosidade media (misturou demais). Cinza e branco puros nao
 * contam (vieram de branco/preto, nao de mistura).
 * @param {number[]} pig
 */
export function ehLama(pig) {
  const [L, C] = oklch(misturar(pig));
  const cromatico = pig[0] + pig[1] + pig[2];
  return C < 0.05 && L > 0.3 && L < 0.75 && cromatico > 0.45;
}

/** @param {CorNome} c @param {string} lang */
export function nomeDe(c, lang) {
  return /** @type {any} */ (c)[lang] || c.en;
}

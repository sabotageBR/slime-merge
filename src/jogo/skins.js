// Skins por nivel (pedido do usuario em 2026-10-15): cada nivel tem a skin padrao (a de hoje,
// gratis), as skins prontas do catalogo (compradas com gotas numa aba da Loja) e a "Minha",
// que o jogador desenha no editor de pixel (src/ui/editor.js), comprada uma vez e editavel a
// vontade. Logica pura: so dados, o codec da imagem e a "aparencia" que o render usa.
//
// A skin troca o PIGMENTO fisico do slime (a frente de cor da fusao, os respingos e as orelhas
// acompanham); a fisica nao muda. No render (src/render/campo.js e composicao.js):
//   ap = 0  caminho de sempre (a textura legada do nivel, igual a hoje);
//   ap = k  entrada k do uniforme uAp: uma textura procedural com COR (bolinhas, xadrez...)
//           ou a imagem 16x16 do nivel no atlas, em dois modos:
//           ladrilho (0): a imagem repete pelo corpo (1 px = 0,1 u na escala 1);
//           estampa  (1): uma imagem cobre o corpo inteiro e anda junto com o rosto.
//
// Imagem: 256 indices da PALETA (linha 0 em cima), o indice 0 e transparente (mostra a cor
// do slime). Guardada como texto: 128 bytes em base64url proprio (171 caracteres).

import { NIVEIS, MAX_NIVEL, diametroNivel } from './niveis.js';
import { hexDaMistura, misturar, hexDeLinear, linearDeHex } from '../cor/km.js';

/** Lado da imagem da skin (px). */
export const LADO = 16;
/** Tamanho do codigo de uma imagem (base64url de 128 bytes, sem preenchimento). */
export const TAM_CODIGO = 171;
/** Preco da skin "Minha" de um nivel (comprada uma vez, editavel a vontade). */
export const PRECO_MINHA = 150;

/**
 * Paleta do editor (sRGB), no tom cartum do jogo. O indice 0 e transparente: o pixel mostra a
 * cor do slime (o pigmento). Os nomes sao chaves de texto (o editor recebe os rotulos).
 */
export const PALETA = Object.freeze([
  '', // 0 transparente = cor do slime
  '#17161c', // 1 tinta
  '#ffffff', // 2 branco
  '#a3a8b8', // 3 cinza
  '#ee3b45', // 4 vermelho
  '#ff8a2a', // 5 laranja
  '#ffd23a', // 6 amarelo
  '#a2e35a', // 7 verde-claro
  '#28a55a', // 8 verde
  '#3fd6c8', // 9 turquesa
  '#3b8cf2', // 10 azul
  '#2b3a9c', // 11 azul-escuro
  '#8e4fd8', // 12 roxo
  '#ff8ac0', // 13 rosa
  '#8b5634', // 14 marrom
  '#f6dcae', // 15 bege
]);
export const NOMES_PALETA = Object.freeze(['slime', 'tinta', 'branco', 'cinza', 'vermelho', 'laranja', 'amarelo', 'verdeClaro',
  'verde', 'turquesa', 'azul', 'azulEscuro', 'roxo', 'rosa', 'marrom', 'bege']);
const PALETA_LIN = PALETA.map((h) => (h ? linearDeHex(h) : null));

/**
 * Cores do corpo da "Minha" (pigmentos KM [ciano, magenta, amarelo, preto]). O indice 0 e a
 * cor do proprio nivel. Todas com C+M+Y >= 0,25: a gosma cinza do Duelo pega a cor delas (por
 * isso nao ha corpo branco nem pastel: o pigmento KM e forte, 0,25 ja tinge bem).
 */
export const BASES = Object.freeze([
  null, // 0 a cor do nivel
  Object.freeze([0, 0.5, 0.45, 0]), // 1 vermelho #df4353
  Object.freeze([0, 0.06, 0.9, 0]), // 2 laranja #f3923e
  Object.freeze([0, 0, 0.88, 0]), // 3 amarelo #ffd424
  Object.freeze([0.06, 0, 0.62, 0]), // 4 limao #9ebf4e
  Object.freeze([0.17, 0, 0.52, 0]), // 5 verde #6fab5f
  Object.freeze([0.35, 0, 0.12, 0]), // 6 turquesa #3d9c9c
  Object.freeze([0.51, 0, 0, 0]), // 7 azul #298fdd
  Object.freeze([0.75, 0.25, 0, 0]), // 8 anil #5158a6
  Object.freeze([0.2, 0.35, 0, 0]), // 9 roxo #784d96
  Object.freeze([0, 0.25, 0, 0]), // 10 rosa #e9519b
  Object.freeze([0.03, 0.05, 0.2, 0]), // 11 areia #b4967a
  Object.freeze([0, 0.31, 0.67, 0.02]), // 12 chocolate #7d4f47
]);
export const NOMES_BASES = Object.freeze(['nivel', 'vermelho', 'laranja', 'amarelo', 'limao', 'verde', 'turquesa', 'azul', 'anil',
  'roxo', 'rosa', 'areia', 'chocolate']);

/** Tamanho do ladrilho da "Minha": P, M, G (escala: 1 px = 0,1 u / escala), vezes o fator do nivel. */
export const ESCALAS = Object.freeze([1.4, 1, 0.7]);

/**
 * Fator do ladrilho da "Minha" pelo tamanho do nivel: nos niveis pequenos o ladrilho encolhe
 * (o corpo de 1,55 u mostra mais de uma repeticao); do 6 em diante fica 0,8.
 * @param {number} k
 */
export function fatorLadrilho(k) {
  return Math.max(0.8, Math.min(1.6, 2.4 / diametroNivel(k)));
}

/**
 * Texturas procedurais das skins (shader, src/render/composicao.js `procAp`): todas recebem a
 * COR da skin (a confete e o granulado usam varias cores de bala). `cobertura` e a fracao do
 * corpo que fica com a cor (para a cor media: orelhas e respingos).
 */
export const PROC = Object.freeze({
  bolinhas: 1, listras: 2, ondas: 3, xadrez: 4, estrelinhas: 5, degrade: 6, confete: 7, manchas: 8,
  bolhas: 9, escamas: 10, granulado: 11, gomos: 12, faixas: 13, nebulosa: 14,
});
const COBERTURA = [0, 0.16, 0.38, 0.26, 0.5, 0.05, 0.5, 0.22, 0.35, 0.14, 0.3, 0.24, 0.2, 1, 0.3];
/** Cor media das texturas de varias cores (faixas de arco-iris; confete e granulado). */
const MEDIA_FAIXAS = '#b9a6a0';

/**
 * Uma skin do catalogo.
 * @typedef {{ id: string, nivel: number, preco: number, tipo: 'proc'|'pixel', nome?: string,
 *   pig?: number[], textura?: number, proc?: number, cor?: string, escala?: number, modo?: number, px?: string[] }} Skin
 *   pig: pigmento do corpo (sem ele, o do nivel); textura: textura legada por baixo (opcional);
 *   proc + cor + escala: procedural; px: 16 linhas de 16 digitos hex (indices da PALETA);
 *   modo: 0 ladrilho, 1 estampa
 */

/** Precos (os propostos no estudio; o usuario nao pediu outros): procedural 80+10k, pixel 120+15k. */
export function precoSugerido(tipo, k) {
  return tipo === 'pixel' ? 120 + 15 * k : 80 + 10 * k;
}

/**
 * As prontas: as 2 por nivel que o usuario escolheu no Estudio de skins em 2026-10-15 (entre as
 * 4 candidatas de modelos/skins-candidatas.js). Os nomes estao em src/i18n/textos.js (skin.<id>).
 */
const PRONTAS = [
  // ---- nivel 1
  { id: 'bolhas', nivel: 1, tipo: 'proc', preco: precoSugerido('proc', 1), pig: [0.46, 0.02, 0, 0], proc: PROC.bolhas, cor: '#ffffff', escala: 1.6 },
  {
    id: 'gotas', nivel: 1, tipo: 'pixel', preco: precoSugerido('pixel', 1), pig: [0.42, 0, 0, 0], modo: 0, escala: 1.8,
    px: [
      '0000000000000000', '0002000000000000', '0002000000000000', '0022200000002000',
      '0222220000000000', '02a2220000000000', '0222220000000000', '0022200000000000',
      '0000000000020000', '0000000000020000', '0000000000222000', '0000020002222200',
      '0000000002a22200', '0000000002222200', '0000000000222000', '0000000000000000',
    ],
  },
  // ---- nivel 2
  {
    id: 'melancia', nivel: 2, tipo: 'pixel', preco: precoSugerido('pixel', 2), pig: [0, 0.5, 0.36, 0], modo: 1,
    px: [
      '8888888888888888', '8888887777888888', '8888700000078888', '8887001000107888',
      '8870000000000788', '8800000000000088', '8700000000000078', '8710000000000178',
      '8700000000000078', '8700000000000078', '8800000000000088', '8870100000010788',
      '8887100000017888', '8888710010078888', '8888887717818888', '8888888888888888',
    ],
  },
  {
    id: 'folhinhas', nivel: 2, tipo: 'pixel', preco: precoSugerido('pixel', 2), pig: [0.32, 0, 0.68, 0], modo: 0, escala: 1.6,
    px: [
      '0000000000000000', '0000000000000000', '0000777000000700', '0007787000007000',
      '0077877000000000', '0078770000000000', '0077700000000000', '0000000000000000',
      '0800000000000008', '0000000000700000', '0000000007877000', '0000000000787700',
      '0007000000778700', '0000700000077870', '0000000000000700', '0000000008000000',
    ],
  },
  // ---- nivel 3
  { id: 'xadrez', nivel: 3, tipo: 'proc', preco: precoSugerido('proc', 3), pig: [0.2, 0.35, 0, 0], proc: PROC.xadrez, cor: '#d9c6ff', escala: 1 },
  {
    id: 'florzinhas', nivel: 3, tipo: 'pixel', preco: precoSugerido('pixel', 3), pig: [0.2, 0.35, 0, 0], modo: 0, escala: 1.4,
    px: [
      '0000000000000000', '0002200000000000', '0002200000000000', '0226622000000000',
      '0226622000002000', '0002200000000000', '0002200800000000', '0000000080000000',
      '0000000000000000', '00000000000dd000', '00000000000dd000', '000000000dd66dd0',
      '000020000dd66dd0', '00000000000dd000', '00000000000dd008', '8000000000000000',
    ],
  },
  // ---- nivel 4
  {
    id: 'morango', nivel: 4, tipo: 'pixel', preco: precoSugerido('pixel', 4), pig: [0, 0.92, 0.08, 0.005], modo: 1,
    px: [
      '8888888778888888', '8888888888888888', '0880888008880880', '0080080000800800',
      '0006000000006000', '0000000000000000', '0000000000000000', '0000000000000000',
      '0000000000000000', '0060000000000600', '0000000000000000', '0000000000000000',
      '0000060000600000', '0006000000006000', '0000000060000000', '0000000000000000',
    ],
  },
  { id: 'bengala', nivel: 4, tipo: 'proc', preco: precoSugerido('proc', 4), pig: [0, 0.62, 0.38, 0], proc: PROC.listras, cor: '#ffffff', escala: 1.15 },
  // ---- nivel 5
  { id: 'gomos', nivel: 5, tipo: 'proc', preco: precoSugerido('proc', 5), pig: [0, 0.2, 0.8, 0], proc: PROC.gomos, cor: '#fff1cf', escala: 1 },
  {
    id: 'onca', nivel: 5, tipo: 'pixel', preco: precoSugerido('pixel', 5), pig: [0, 0.04, 0.94, 0], modo: 0, escala: 1.2,
    px: [
      '0000000000000100', '0011010001100000', '01eee00000100000', '01eee10000000000',
      '00eee10000000000', '0101100000000000', '0000000000101100', '00000000000eee10',
      '10000000001eee10', '00000000001eee00', '0000000000011010', '0001011000000000',
      '0000eee100000000', '0001eee110000010', '0001eee000000011', '0000110100000000',
    ],
  },
  // ---- nivel 6
  {
    id: 'abelha', nivel: 6, tipo: 'pixel', preco: precoSugerido('pixel', 6), pig: [0, 0, 0.88, 0], modo: 1,
    px: [
      '0000000000000000', '0022220000222200', '0022222002222200', '0032220000222300',
      '0000000000000000', '0000000000000000', '0000000000000000', '0000000000000000',
      '0000000000000000', '0000000000000000', '1111111111111111', '1111111111111111',
      '0000000000000000', '1111111111111111', '1111111111111111', '0000000000000000',
    ],
  },
  { id: 'estrelinhas', nivel: 6, tipo: 'proc', preco: precoSugerido('proc', 6), pig: [0, 0, 0.86, 0], proc: PROC.estrelinhas, cor: '#ff7a1a', escala: 1 },
  // ---- nivel 7
  {
    id: 'chuva', nivel: 7, tipo: 'pixel', preco: precoSugerido('pixel', 7), pig: [0.9, 0.1, 0, 0], modo: 0, escala: 1,
    px: [
      '000000000000b000', '00022200000b0000', '0023332000b00000', '02333333000000b0',
      '0033333000000b00', '0000000000000000', '00b0000000000000', '0b000b0000000000',
      '0000b00000000000', '000b000000022200', '00b0000000233320', '0000000002333333',
      '000000b000333330', '00000b0000000000', '0000000000b00000', '000000000b000b00',
    ],
  },
  {
    id: 'trovao', nivel: 7, tipo: 'pixel', preco: precoSugerido('pixel', 7), pig: [0.3, 0.12, 0.05, 0.1], modo: 0, escala: 1,
    px: [
      '0000000000000000', '0000660000000000', '0006600000000000', '0066600000002000',
      '0666660000000000', '0006600000000000', '0066000000000000', '0060000000000000',
      '0000000000006600', '0000000000066000', '0000000000666000', '0000000006666600',
      '0000200000066000', '0000000000660020', '0000000000600000', '0000000000000000',
    ],
  },
  // ---- nivel 8
  {
    id: 'mosaico', nivel: 8, tipo: 'pixel', preco: precoSugerido('pixel', 8), pig: [0.06, 0.12, 0.08, 0], modo: 0, escala: 1,
    px: [
      '44406660aaa08880', '44406660aaa08880', '44406660aaa08880', '0000000000000000',
      'aaa0888044406660', 'aaa0888044406660', 'aaa0888044406660', '0000000000000000',
      '666044408880aaa0', '666044408880aaa0', '666044408880aaa0', '0000000000000000',
      '8880aaa066604440', '8880aaa066604440', '8880aaa066604440', '0000000000000000',
    ],
  },
  {
    id: 'baloes', nivel: 8, tipo: 'pixel', preco: precoSugerido('pixel', 8), pig: [0.25, 0, 0, 0], modo: 0, escala: 1,
    px: [
      '0044000000000010', '0424400000006600', '0444400000062660', '0444400000066660',
      '0044000000066660', '0001000000006600', '0010000aa0000100', '000100a2aa001000',
      '000000aaaa000100', '000000aaaa000880', '0000000aa0008288', '0000000010008888',
      '0000000100008888', '0000000010000880', '0000000000000010', '0000000000000100',
    ],
  },
  // ---- nivel 9
  { id: 'bolhasMar', nivel: 9, tipo: 'proc', preco: precoSugerido('proc', 9), pig: [0.95, 0, 0.05, 0], proc: PROC.bolhas, cor: '#7ff0ff', escala: 0.85 },
  {
    id: 'ancoras', nivel: 9, tipo: 'pixel', preco: precoSugerido('pixel', 9), pig: [0.5, 0, 0.2, 0], modo: 0, escala: 1,
    px: [
      '0000000000000000', '0000b00000000000', '000b0b0000000000', '0000b00000000000',
      '00bbbbb000000000', '0000b00000000000', '0b00b00b00000000', '00bbbbb000000000',
      '0000000000000000', '000000000000b000', '00000000000b0b00', '000000000000b000',
      '0000000000bbbbb0', '000000000000b000', '000000000b00b00b', '0000000000bbbbb0',
    ],
  },
  // ---- nivel 10
  { id: 'xadrezUva', nivel: 10, tipo: 'proc', preco: precoSugerido('proc', 10), pig: [0.25, 0.4, 0, 0], proc: PROC.xadrez, cor: '#3c2266', escala: 0.75 },
  {
    id: 'morcegos', nivel: 10, tipo: 'pixel', preco: precoSugerido('pixel', 10), pig: [0.3, 0.45, 0, 0], modo: 0, escala: 0.95,
    px: [
      '0000000000000000', '0000000000000000', '1000000010000600', '1101010110006660',
      '1111111110000600', '0101110100000000', '0000000000000000', '0000000000000000',
      '0000002000000000', '0000000000000000', '1000000010000000', '1000000011010101',
      '1000000011111111', '0002000001011101', '0000000000000000', '0000000000000000',
    ],
  },
  // ---- nivel 11
  { id: 'granulado', nivel: 11, tipo: 'proc', preco: precoSugerido('proc', 11), pig: [0, 0.25, 0, 0], proc: PROC.granulado, cor: '#ffffff', escala: 1 },
  {
    id: 'cupcake', nivel: 11, tipo: 'pixel', preco: precoSugerido('pixel', 11), pig: [0, 0.25, 0, 0], modo: 1,
    px: [
      '0000000440000000', '0000000420000000', '0000020000700000', '00060000a0009000',
      '0000000000000000', '0000000000000000', '00a0000000000600', '0000000000000000',
      '0000000000000000', '0000900000020000', '2022022022022022', 'efefefefefefefef',
      'efefefefefefefef', 'efefefefefefefef', 'efefefefefefefef', 'efefefefefefefef',
    ],
  },
  // ---- nivel 12
  { id: 'nebulosa', nivel: 12, tipo: 'proc', preco: precoSugerido('proc', 12), pig: [0.72, 0.26, 0, 0.02], proc: PROC.nebulosa, cor: '#3fd6c8', escala: 1 },
  {
    id: 'constelacao', nivel: 12, tipo: 'pixel', preco: precoSugerido('pixel', 12), pig: [0.8, 0.2, 0, 0], modo: 0, escala: 0.85,
    px: [
      '0000000000000000', '0000000600000002', '0000006260000000', '0020a00600000000',
      '000000000a000000', '0000000000000000', '0000000000020000', '000000000a000000',
      '0200000a0000a000', '0000002000000000', '000000000000a000', '00000a0000000600',
      '0000000000006260', '0002000000000600', '0000000002000000', '0000000000000000',
    ],
  },
  // ---- nivel 13
  {
    id: 'tesouro', nivel: 13, tipo: 'pixel', preco: precoSugerido('pixel', 13), pig: [0, 0.55, 0.42, 0.12], modo: 0, escala: 0.85,
    px: [
      '0000000000000000', '0000500000055000', '0055655000526500', '0052665000566500',
      '0566666500055000', '0056665000000000', '0055655000000000', '0000500000000000',
      '0000000000005000', '0000000000556550', '0000000000526650', '0005500005666665',
      '0052650000566650', '0056650000556550', '0005500000005000', '0000000000000000',
    ],
  },
  {
    id: 'diamantes', nivel: 13, tipo: 'pixel', preco: precoSugerido('pixel', 13), pig: [0.75, 0.25, 0, 0], modo: 0, escala: 0.85,
    px: [
      '0000000000000000', '002299a000000000', '0229999a00002000', '02999aab00022200',
      '0099aab000002000', '0009ab0000000000', '0000b00000000000', '0000000000000000',
      '0000000000000000', '00000000002299a0', '000020000229999a', '0002220002999aab',
      '000020000099aab0', '000000000009ab00', '000000000000b000', '0000000000000000',
    ],
  },  // ---- nivel 14 (escolha do usuario em 2026-10-18)
  {
    id: 'trofeu', nivel: 14, tipo: 'pixel', preco: precoSugerido('pixel', 14), pig: [0.45, 0.62, 0, 0.04], modo: 0, escala: 0.85,
    px: [
      '0000000000000000', '0006666666600000', '0656666666656000', '0606666626606000',
      '0656666626656000', '0006666666600000', '0000666666000000', '0000066660000000',
      '0000006600000000', '0000006600000000', '0000066660000000', '0000555555000000',
      '0000555555000000', '0000000000000000', '0000000000002000', '0000000000000000',
    ],
  },
  {
    id: 'coroas', nivel: 14, tipo: 'pixel', preco: precoSugerido('pixel', 14), pig: [0.82, 0.42, 0, 0.02], modo: 0, escala: 0.85,
    px: [
      '0000000000000000', '0000000000000000', '0060006000600000', '0066066606600000',
      '0066666666600000', '0064666466400000', '0066666666600000', '0055555555500000',
      '0000000000000000', '0000000000000200', '0000000000000000', '0000000000000000',
      '0002000000000000', '0000000000000000', '0000000000000000', '0000000000000000',
    ],
  },
];

/**
 * Catalogo: a padrao de cada nivel (gratis) e as prontas.
 * @type {ReadonlyArray<Skin>}
 */
export const SKINS = Object.freeze([
  ...NIVEIS.map((_, i) => Object.freeze({ id: 'padrao', nivel: i + 1, preco: 0, tipo: /** @type {'proc'} */ ('proc') })),
  ...PRONTAS.map((sk) => Object.freeze(/** @type {Skin} */ (sk))),
]);

// ------------------------------------------------------------------ imagem e codec

/** Imagem vazia (tudo transparente). @returns {Uint8Array} */
export function imagemVazia() {
  return new Uint8Array(LADO * LADO);
}

/**
 * 16 linhas de 16 digitos hex -> imagem (ou null se invalida).
 * @param {ReadonlyArray<string>} linhas
 * @returns {Uint8Array|null}
 */
export function pxDeLinhas(linhas) {
  if (!Array.isArray(linhas) || linhas.length !== LADO) return null;
  const px = imagemVazia();
  for (let y = 0; y < LADO; y++) {
    const l = linhas[y];
    if (typeof l !== 'string' || !/^[0-9a-fA-F]{16}$/.test(l)) return null;
    for (let x = 0; x < LADO; x++) px[y * LADO + x] = parseInt(l[x], 16);
  }
  return px;
}

/** Imagem -> 16 linhas de 16 digitos hex. @param {ArrayLike<number>} px @returns {string[]} */
export function linhasDePx(px) {
  const out = [];
  for (let y = 0; y < LADO; y++) {
    let l = '';
    for (let x = 0; x < LADO; x++) l += (px[y * LADO + x] & 15).toString(16);
    out.push(l);
  }
  return out;
}

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const VALOR = (() => {
  const v = new Int8Array(128).fill(-1);
  for (let i = 0; i < 64; i++) v[ALFABETO.charCodeAt(i)] = i;
  return v;
})();

/**
 * Imagem (256 indices 0..15) -> texto base64url de 171 caracteres (dois pixels por byte, o
 * primeiro no nibble alto). Sem btoa: o mesmo codigo roda em qualquer lugar.
 * @param {ArrayLike<number>} px
 * @returns {string}
 */
export function codificar(px) {
  const b = new Uint8Array(128);
  for (let i = 0; i < 128; i++) b[i] = ((px[2 * i] & 15) << 4) | (px[2 * i + 1] & 15);
  let s = '';
  for (let i = 0; i < 128; i += 3) {
    const n = (b[i] << 16) | ((i + 1 < 128 ? b[i + 1] : 0) << 8) | (i + 2 < 128 ? b[i + 2] : 0);
    s += ALFABETO[(n >> 18) & 63] + ALFABETO[(n >> 12) & 63];
    if (i + 1 < 128) s += ALFABETO[(n >> 6) & 63];
    if (i + 2 < 128) s += ALFABETO[n & 63];
  }
  return s;
}

/**
 * Texto -> imagem; null se o texto nao for um codigo valido (tamanho, caractere ou bits sobrando).
 * @param {unknown} s
 * @returns {Uint8Array|null}
 */
export function decodificar(s) {
  if (typeof s !== 'string' || s.length !== TAM_CODIGO) return null;
  const b = new Uint8Array(128);
  let j = 0;
  for (let i = 0; i < TAM_CODIGO; i += 4) {
    const q = Math.min(4, TAM_CODIGO - i);
    let n = 0;
    for (let k = 0; k < 4; k++) {
      let v = 0;
      if (k < q) {
        const c = s.charCodeAt(i + k);
        v = c < 128 ? VALOR[c] : -1;
        if (v < 0) return null;
      }
      n = (n << 6) | v;
    }
    b[j++] = (n >> 16) & 255;
    if (q >= 3) b[j++] = (n >> 8) & 255;
    if (q === 4) b[j++] = n & 255;
    // o ultimo grupo (3 caracteres para 2 bytes) nao pode ter bits sobrando
    if (q === 3 && (n & 255) !== 0) return null;
  }
  if (j !== 128) return null;
  const px = imagemVazia();
  for (let i = 0; i < 128; i++) {
    px[2 * i] = b[i] >> 4;
    px[2 * i + 1] = b[i] & 15;
  }
  return px;
}

// ------------------------------------------------------------------ modelos gratis do editor

/** Modelos do "Comecar de" do editor (gratis). */
export const MODELOS = Object.freeze(['vazio', 'listras', 'bolinhas', 'xadrez', 'borda']);

/**
 * Um modelo gratis desenhado na cor `cor` (indice da paleta).
 * @param {string} id vazio | listras | bolinhas | xadrez | borda
 * @param {number} modo 0 ladrilho, 1 estampa
 * @param {number} [cor]
 * @returns {Uint8Array}
 */
export function modelo(id, modo, cor = 2) {
  const px = imagemVazia();
  for (let y = 0; y < LADO; y++) {
    for (let x = 0; x < LADO; x++) {
      let on = false;
      if (id === 'listras') on = (x + y) % 8 < 3;
      else if (id === 'bolinhas') {
        // duas bolinhas por ladrilho, em fileiras desencontradas (fecha na emenda)
        const d = (cx, cy) => {
          const dx = Math.min(Math.abs(x + 0.5 - cx), LADO - Math.abs(x + 0.5 - cx));
          const dy = Math.min(Math.abs(y + 0.5 - cy), LADO - Math.abs(y + 0.5 - cy));
          return dx * dx + dy * dy;
        };
        on = d(4, 4) < 4.2 || d(12, 12) < 4.2;
      } else if (id === 'xadrez') on = ((x >> 2) + (y >> 2)) % 2 === 1;
      else if (id === 'borda') {
        if (modo === 1) {
          const dx = x + 0.5 - 8;
          const dy = y + 0.5 - 8;
          const r = Math.sqrt(dx * dx + dy * dy);
          on = r > 6.1 && r < 7.6;
        } else on = x === 0 || y === 0;
      }
      if (on) px[y * LADO + x] = cor;
    }
  }
  return px;
}

// ------------------------------------------------------------------ aparencia (o que o render usa)

/**
 * @typedef {{ chave: string, id: string, nivel: number, pig: number[], hex: string, textura: number, ap: number,
 *   modo: number, proc: number, cor: string, corLin: number[], escala: number, px: Uint8Array|null }} Aparencia
 *   ap: 0 = padrao (caminho de hoje), senao a entrada do uniforme uAp (o proprio nivel k);
 *   hex: cor media (orelhas, respingos, barra de evolucao)
 */

/** A "Minha" de um nivel como o perfil guarda: modo, base, escala e o codigo da imagem. */
/** @typedef {{ m?: number, b?: number, e?: number, px?: string }} Minha */

const limitarNivel = (k) => Math.max(1, Math.min(MAX_NIVEL, Math.round(Number(k) || 1)));
const ok3 = (v) => v.map((x) => Math.max(0, Math.min(1, x)));

/** Cor media em RGB linear: a base e os pixels opacos (na estampa, so o que cai no corpo). */
function mediaPx(px, modo, baseLin) {
  const R = LADO / 2.1; // raio do corpo na estampa: a imagem cobre 2,1 raios (7,62 px)
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let y = 0; y < LADO; y++) {
    for (let x = 0; x < LADO; x++) {
      if (modo === 1) {
        const dx = x + 0.5 - LADO / 2;
        const dy = y + 0.5 - LADO / 2;
        if (dx * dx + dy * dy > R * R) continue;
      }
      const i = px[y * LADO + x];
      const c = i ? PALETA_LIN[i] : baseLin;
      r += c[0];
      g += c[1];
      b += c[2];
      n++;
    }
  }
  return n ? [r / n, g / n, b / n] : baseLin;
}

/** Aparencia da skin padrao do nivel k (exatamente o visual de hoje). */
function padrao(k) {
  const def = NIVEIS[k - 1];
  const pig = def.pig.slice();
  return {
    chave: k + ':padrao', id: 'padrao', nivel: k, pig, hex: hexDaMistura(pig), textura: def.textura || 0, ap: 0,
    modo: 0, proc: 0, cor: '', corLin: [1, 1, 1], escala: 1, px: null,
  };
}

/**
 * A aparencia de uma skin no nivel k.
 * @param {number} k 1..13
 * @param {string|Skin} [id] 'padrao', 'minha', o id de uma skin do catalogo ou a propria skin
 * @param {Minha|null} [minha] a "Minha" do nivel (quando id = 'minha')
 * @param {ReadonlyArray<Skin>} [catalogo]
 * @returns {Aparencia}
 */
export function aparencia(k, id = 'padrao', minha = null, catalogo = SKINS) {
  const kk = limitarNivel(k);
  const def = NIVEIS[kk - 1];
  /** @type {Skin|null} */
  let sk = null;
  if (id && typeof id === 'object') sk = id;
  else if (id === 'minha') {
    const mm = minha || {};
    const b = Math.max(0, Math.min(BASES.length - 1, mm.b | 0));
    const linhas = decodificar(mm.px);
    sk = {
      id: 'minha', nivel: kk, preco: PRECO_MINHA, tipo: 'pixel', pig: b ? BASES[b].slice() : def.pig.slice(),
      // na cor do nivel, a textura do nivel continua por baixo dos pixels transparentes
      textura: b ? 0 : def.textura || 0,
      modo: mm.m === 1 ? 1 : 0, escala: ESCALAS[Math.max(0, Math.min(2, mm.e === undefined ? 1 : mm.e | 0))] * fatorLadrilho(kk),
      px: linhasDePx(linhas || imagemVazia()),
    };
  } else if (id && id !== 'padrao') sk = catalogo.find((s) => s.nivel === kk && s.id === id) || null;
  if (!sk || sk.id === 'padrao') return padrao(kk);

  const pig = (sk.pig || def.pig).slice(0, 4);
  while (pig.length < 4) pig.push(0);
  const baseLin = misturar(pig);
  const px = sk.px ? pxDeLinhas(sk.px) : null;
  const modo = sk.modo === 1 ? 1 : 0;
  const proc = px ? 0 : sk.proc || 0;
  const cor = sk.cor || '#ffffff';
  const corLin = linearDeHex(cor);
  let media = baseLin;
  if (px) media = mediaPx(px, modo, baseLin);
  else if (proc) {
    const c = proc === PROC.faixas || proc === PROC.confete || proc === PROC.granulado ? linearDeHex(MEDIA_FAIXAS) : corLin;
    const f = COBERTURA[proc] || 0;
    media = ok3([0, 1, 2].map((i) => baseLin[i] + (c[i] - baseLin[i]) * f));
  }
  const chave = sk.id === 'minha'
    ? `${kk}:minha:${modo}:${pig.join(',')}:${sk.escala}:${codificar(px || imagemVazia())}`
    : `${kk}:${sk.id}`;
  return {
    chave, id: sk.id, nivel: kk, pig, hex: hexDeLinear(media), textura: sk.textura || 0, ap: kk,
    modo, proc, cor: px ? '' : cor, corLin, escala: sk.escala || 1, px,
  };
}

/**
 * Tabela de aparencias da partida (indice = nivel; [0] fica vazio).
 * @param {Record<number|string, string>} [equipado] skin equipada por nivel (falta = padrao)
 * @param {Record<number|string, Minha>} [minhas]
 * @param {ReadonlyArray<Skin>} [catalogo]
 * @returns {Array<Aparencia|null>}
 */
export function aparencias(equipado = {}, minhas = {}, catalogo = SKINS) {
  /** @type {Array<Aparencia|null>} */
  const t = [null];
  for (let k = 1; k <= MAX_NIVEL; k++) t.push(aparencia(k, (equipado && equipado[k]) || 'padrao', (minhas && minhas[k]) || null, catalogo));
  return t;
}

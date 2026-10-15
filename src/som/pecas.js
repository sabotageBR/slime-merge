// As 3 pecas de musica de fundo, procedurais e deterministicas por compasso: o mesmo
// (peca, n) da sempre as mesmas notas (RNG proprio semeado pela peca, pela volta e pelo
// compasso). Modulo puro: sem WebAudio; quem toca e o src/som/musica.js.
//
// - caixinha: valsa de caixinha de musica e marimba, 3/4 a 76 bpm, pentatonica maior de Fa,
//   AABA em 16 compassos; a segunda volta ganha apojaturas, ecos na oitava e acompanhamento
//   em diades.
// - lofi: piano eletrico (seno + triangulo, passa-baixa e tremolo), baixo, bumbo de seno,
//   chimbal baixinho com swing e bolhas na pentatonica; 4/4 a 72 bpm, 8 compassos em Do maior.
// - chiptune: quadrada estreita (25%) na melodia, baixo em triangulo, bateria de ruido;
//   4/4 a 112 bpm, I-vi-IV-V em Do maior; na volta impar entra um arpejo; ganho 0,5x.

import { criarRng, hashTexto } from '../core/rng.js';

/**
 * @typedef {object} Nota
 * @property {number} t s desde o comeco do compasso
 * @property {number} midi altura (0 nas batidas)
 * @property {number} dur s
 * @property {number} vol pico relativo (0..1)
 * @property {string} inst instrumento (musica.js)
 * @property {boolean} [perc] batida (sem altura)
 */

/**
 * @typedef {object} Peca
 * @property {string} id
 * @property {number} bpm
 * @property {number} tempos tempos por compasso
 * @property {number} compassos compassos por volta
 * @property {number} tonica MIDI
 * @property {number[]} escala classes de altura relativas a tonica
 * @property {[number, number]} faixa MIDI minimo e maximo
 * @property {number} ganho
 */

const PENTA = [0, 2, 4, 7, 9];
/** @param {number} base @param {number} i */
const penta = (base, i) => base + 12 * Math.floor(i / 5) + PENTA[((i % 5) + 5) % 5];

/** @type {Readonly<Record<string, Peca>>} */
export const PECAS = Object.freeze({
  caixinha: Object.freeze({ id: 'caixinha', bpm: 76, tempos: 3, compassos: 16, tonica: 65, escala: [0, 2, 4, 7, 9], faixa: /** @type {[number, number]} */ ([45, 96]), ganho: 1.35 }),
  lofi: Object.freeze({ id: 'lofi', bpm: 72, tempos: 4, compassos: 8, tonica: 60, escala: [0, 2, 4, 5, 7, 9, 11], faixa: /** @type {[number, number]} */ ([36, 96]), ganho: 0.7 }),
  chiptune: Object.freeze({ id: 'chiptune', bpm: 112, tempos: 4, compassos: 8, tonica: 60, escala: [0, 2, 4, 5, 7, 9, 11], faixa: /** @type {[number, number]} */ ([36, 96]), ganho: 0.5 }),
});

/**
 * Duracao de um compasso, s.
 * @param {Peca} p
 */
export function duracaoCompasso(p) {
  return (p.tempos * 60) / p.bpm;
}

/**
 * RNG do compasso (volta e posicao), proprio da peca.
 * @param {string} id
 * @param {number} volta
 * @param {number} k
 */
const rngDe = (id, volta, k) => criarRng(hashTexto(`${id}:${volta}:${k}`));

// ------------------------------------------------------------------ caixinha
/** Melodia: por compasso, [colcheia, grau da pentatonica de Fa5, colcheias]. AABA. */
const MEL_CX = [
  [[0, 2, 2], [2, 3, 2], [4, 4, 2]], [[0, 3, 4], [4, 2, 2]], [[0, 1, 2], [2, 2, 2], [4, 3, 2]], [[0, 2, 6]],
  [[0, 2, 2], [2, 3, 2], [4, 4, 2]], [[0, 5, 4], [4, 4, 2]], [[0, 3, 2], [2, 1, 1], [3, 2, 1], [4, 1, 2]], [[0, 0, 6]],
  [[0, 4, 2], [2, 5, 2], [4, 6, 2]], [[0, 7, 4], [4, 6, 2]], [[0, 5, 2], [2, 4, 2], [4, 5, 2]], [[0, 3, 6]],
  [[0, 2, 2], [2, 3, 2], [4, 4, 2]], [[0, 3, 2], [2, 4, 1], [3, 3, 1], [4, 2, 2]], [[0, 1, 2], [2, 2, 2], [4, 1, 2]], [[0, 0, 6]],
];
const HARM_CX = ['T', 'T', 'S', 'T', 'T', 'R', 'D', 'T', 'R', 'T', 'R', 'D', 'T', 'R', 'S', 'T'];
/** Acordes so com notas da pentatonica: [baixo, [as duas de cima]] em semitons da tonica. */
const ACORDES_CX = { T: [0, [4, 7]], R: [-3, [0, 4]], S: [2, [7, 9]], D: [-5, [2, 9]] };

/** @param {number} n @returns {Nota[]} */
function caixinha(n) {
  const P = PECAS.caixinha;
  const barra = duracaoCompasso(P);
  const col = barra / 6;
  const volta = Math.floor(n / P.compassos);
  const k = n % P.compassos;
  const r = rngDe(P.id, volta, k);
  const folga = () => (r() - 0.5) * 0.008;
  const peso = () => 0.9 + 0.2 * r();
  const segunda = volta % 2 === 1;
  /** @type {Nota[]} */
  const out = [];
  const mel = MEL_CX[k];
  for (const [pos, grau, d] of mel) {
    const t = pos ? pos * col + folga() : 0;
    out.push({ t, midi: penta(77, grau), dur: d * col, vol: (pos === 0 ? 0.3 : 0.26) * peso(), inst: 'caixinha' });
    // apojatura: a nota de cima da escala, 60 ms antes
    if (segunda && pos > 0 && r() < 0.22) out.push({ t: Math.max(0, t - 0.06), midi: penta(77, grau + 1), dur: 0.06, vol: 0.1, inst: 'caixinha' });
  }
  // eco da nota longa na oitava de cima (segunda volta)
  if (segunda && mel.length === 1 && k !== P.compassos - 1 && r() < 0.6) {
    const eco = penta(77, mel[0][1] + 5);
    if (eco <= P.faixa[1]) out.push({ t: 3 * col + folga(), midi: eco, dur: 3 * col, vol: 0.1, inst: 'caixinha' });
  }
  const [baixo, cima] = /** @type {[number, number[]]} */ (ACORDES_CX[HARM_CX[k]]);
  out.push({ t: 0, midi: P.tonica - 12 + baixo, dur: 4 * col, vol: 0.32 * peso(), inst: 'marimba' });
  const diades = segunda && r() < 0.35;
  for (const [pos, i] of [[2, 0], [4, 1]]) {
    const t = pos * col + folga();
    const lista = diades ? [0, 1] : [i];
    for (const j of lista) out.push({ t, midi: P.tonica + cima[j], dur: 2 * col, vol: (diades ? 0.13 : 0.16) * peso(), inst: 'marimba' });
  }
  return out.sort((a, b) => a.t - b.t || b.midi - a.midi);
}

// ------------------------------------------------------------------ lofi
const ACORDES_LOFI = [
  [53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59],
  [53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [55, 60, 62, 65],
];
const BAIXO_LOFI = [41, 40, 38, 36, 41, 40, 38, 43];

/** @param {number} n @returns {Nota[]} */
function lofi(n) {
  const P = PECAS.lofi;
  const barra = duracaoCompasso(P);
  const sc = barra / 16;
  const swing = sc / 3;
  const volta = Math.floor(n / P.compassos);
  const k = n % P.compassos;
  const r = rngDe(P.id, volta, k);
  /** @type {Nota[]} */
  const out = [];
  const ac = ACORDES_LOFI[k];
  // piano eletrico: o acorde no 1 (dedilhado de leve) e um toque mais fraco no "e" do 3 (ou do 2)
  ac.forEach((m, i) => out.push({ t: i * 0.012, midi: m, dur: 7 * sc, vol: 0.2 - i * 0.015, inst: 'rhodes' }));
  const segundo = r() < 0.3 ? 6 : 10;
  ac.forEach((m, i) => { if (i > 0) out.push({ t: segundo * sc + swing + i * 0.01, midi: m, dur: 4 * sc, vol: 0.11, inst: 'rhodes' }); });
  // baixo: raiz no 1, quinta no 3
  out.push({ t: 0, midi: BAIXO_LOFI[k], dur: 6 * sc, vol: 0.34, inst: 'baixo' });
  out.push({ t: 8 * sc, midi: BAIXO_LOFI[k] + 7, dur: 3 * sc, vol: 0.24, inst: 'baixo' });
  // bateria macia
  out.push({ t: 0, midi: 0, dur: 0.2, vol: 0.5, inst: 'bumbo', perc: true });
  out.push({ t: 8 * sc, midi: 0, dur: 0.2, vol: 0.42, inst: 'bumbo', perc: true });
  if (r() < 0.45) out.push({ t: 10 * sc + swing, midi: 0, dur: 0.2, vol: 0.26, inst: 'bumbo', perc: true });
  out.push({ t: 4 * sc, midi: 0, dur: 0.1, vol: 0.3, inst: 'caixa', perc: true });
  out.push({ t: 12 * sc, midi: 0, dur: 0.1, vol: 0.3, inst: 'caixa', perc: true });
  for (let s = 0; s < 16; s += 2) {
    if (r() < 0.1) continue;
    const fora = s % 4 === 2;
    out.push({ t: s * sc + (fora ? swing : 0), midi: 0, dur: 0.04, vol: fora ? 0.22 : 0.32, inst: 'chimbal', perc: true });
  }
  // bolhas na pentatonica de Do, oitava 6
  const nb = 1 + Math.floor(r() * 3);
  for (let i = 0; i < nb; i++) {
    const s = Math.floor(r() * 16);
    out.push({ t: s * sc + (s % 4 === 2 ? swing : 0), midi: penta(84, Math.floor(r() * 6)), dur: 0.12, vol: 0.13, inst: 'bolha' });
  }
  return out.sort((a, b) => a.t - b.t || b.midi - a.midi);
}

// ------------------------------------------------------------------ chiptune
const MEL_CHIP = [
  [[0, 2, 1], [1, 3, 1], [2, 4, 2], [4, 3, 1], [5, 2, 1], [6, 3, 2]],
  [[0, 4, 2], [2, 5, 2], [4, 4, 1], [5, 3, 1], [6, 2, 2]],
  [[0, 3, 1], [1, 2, 1], [2, 0, 2], [4, 2, 1], [5, 3, 1], [6, 4, 2]],
  [[0, 3, 3], [3, 1, 1], [4, 3, 2], [6, 4, 2]],
  [[0, 2, 1], [1, 3, 1], [2, 4, 2], [4, 3, 1], [5, 2, 1], [6, 3, 2]],
  [[0, 4, 2], [2, 5, 1], [3, 6, 1], [4, 7, 2], [6, 5, 2]],
  [[0, 4, 1], [1, 3, 1], [2, 2, 1], [3, 3, 1], [4, 4, 2], [6, 3, 2]],
  [[0, 1, 2], [2, 2, 2], [4, 0, 4]],
];
const RAIZ_CHIP = [48, 45, 41, 43, 48, 45, 41, 43];
const ACORDES_CHIP = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];

/** @param {number} n @returns {Nota[]} */
function chiptune(n) {
  const P = PECAS.chiptune;
  const barra = duracaoCompasso(P);
  const col = barra / 8;
  const volta = Math.floor(n / P.compassos);
  const k = n % P.compassos;
  const r = rngDe(P.id, volta, k);
  /** @type {Nota[]} */
  const out = [];
  // melodia: na volta impar os compassos 5 e 7 podem subir uma oitava
  const oitava = volta % 2 === 1 && (k === 4 || k === 6) && r() < 0.5 ? 12 : 0;
  for (const [pos, grau, d] of MEL_CHIP[k]) out.push({ t: pos * col, midi: penta(72, grau) + oitava, dur: d * col * 0.85, vol: 0.3, inst: 'pulso' });
  // baixo: raiz e oitava alternando em colcheias
  for (let i = 0; i < 8; i++) out.push({ t: i * col, midi: RAIZ_CHIP[k] + (i % 2 ? 12 : 0), dur: col * 0.75, vol: 0.4, inst: 'triangulo' });
  // bateria
  for (const i of [0, 4]) out.push({ t: i * col, midi: 0, dur: 0.1, vol: 0.55, inst: 'bumboChip', perc: true });
  for (const i of [2, 6]) out.push({ t: i * col, midi: 0, dur: 0.1, vol: 0.4, inst: 'caixaChip', perc: true });
  for (let i = 0; i < 8; i++) if (i % 4 !== 2) out.push({ t: i * col, midi: 0, dur: 0.03, vol: 0.22, inst: 'chimbalChip', perc: true });
  // virada no ultimo compasso
  if (k === P.compassos - 1) for (const i of [5, 7]) out.push({ t: i * col + col / 2, midi: 0, dur: 0.08, vol: 0.3, inst: 'caixaChip', perc: true });
  // arpejo na volta impar (compassos 5 a 8), em semicolcheias
  if (volta % 2 === 1 && k >= 4) {
    const ac = ACORDES_CHIP[k % 4];
    for (let i = 0; i < 16; i++) out.push({ t: (i * col) / 2, midi: ac[i % 3] + 12, dur: col * 0.4, vol: 0.12, inst: 'arpejo' });
  }
  return out.sort((a, b) => a.t - b.t || b.midi - a.midi);
}

const GERADORES = { caixinha, lofi, chiptune };

/**
 * As notas do compasso n (n conta desde o comeco: 0, 1, 2...) da peca, em ordem de tempo.
 * @param {string} id caixinha | lofi | chiptune
 * @param {number} n
 * @returns {Nota[]}
 */
export function notasDoCompasso(id, n) {
  const gerar = GERADORES[/** @type {keyof typeof GERADORES} */ (id)];
  if (!gerar) return [];
  return gerar(Math.max(0, Math.floor(n)));
}

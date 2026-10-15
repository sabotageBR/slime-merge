// Gera src/cor/pigmentos.js: curvas de refletancia espectral dos pigmentos do slime, para a
// mistura Kubelka-Munk (constante unica) em 12 bandas de 30 nm (400..730 nm).
//
// Para cada pigmento puro (cor-alvo em sRGB), procura a curva de refletancia mais suave
// (em logito, o que da curvas "em bloco", como pigmentos reais) cuja cor sob D65 bate a
// alvo. Depois K/S = (1 - R)^2 / 2R por banda. Misturar e media de K/S pelas concentracoes;
// R = 1 + KS - sqrt(KS^2 + 2KS); cor = M * R, com M (3x12) calibrada para R = 1 dar branco.
//
// Funcoes de cor: aproximacao analitica de Wyman, Sloan e Shirley (2013) das CIE 1931 2 graus.
// Iluminante D65 tabelado (CIE, 10 nm). Nada aqui copia o Mixbox (CC BY-NC).
//
// Uso: node tools/pigmentos.mjs           (grava e imprime o relatorio de misturas)
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SAIDA = fileURLToPath(new URL('../src/cor/pigmentos.js', import.meta.url));
const BANDAS = Array.from({ length: 12 }, (_, b) => 400 + 30 * b);

// pigmentos: [nome, alvo sRGB, forca, molde]; o branco e a base (concentracao implicita).
// O molde e a forma tipica da refletancia do pigmento real (ftalo, quinacridona, hansa,
// carbono, titanio): a curva final e o molde mexido o minimo para bater a cor-alvo.
// A forca e o poder de tingimento (pesa a concentracao na mistura): o ftalo domina.
const PIGMENTOS = [
  ['ciano', '#0a7fd6', 1.45, [0.26, 0.42, 0.58, 0.64, 0.6, 0.42, 0.15, 0.05, 0.035, 0.035, 0.045, 0.06]],
  ['magenta', '#d6176f', 1.0, [0.42, 0.36, 0.22, 0.1, 0.05, 0.045, 0.1, 0.42, 0.68, 0.76, 0.8, 0.82]],
  ['amarelo', '#ffd21a', 1.0, [0.05, 0.05, 0.06, 0.16, 0.56, 0.8, 0.85, 0.87, 0.88, 0.88, 0.88, 0.88]],
  ['preto', '#202020', 2.5, [0.014, 0.014, 0.014, 0.014, 0.014, 0.014, 0.014, 0.014, 0.014, 0.014, 0.014, 0.014]],
  ['branco', '#f4f4f2', 0.8, [0.9, 0.91, 0.92, 0.92, 0.92, 0.92, 0.92, 0.92, 0.92, 0.92, 0.92, 0.92]],
];

const D65 = [
  [380, 49.98], [390, 54.65], [400, 82.75], [410, 91.49], [420, 93.43], [430, 86.68], [440, 104.86],
  [450, 117.01], [460, 117.81], [470, 114.86], [480, 115.92], [490, 108.81], [500, 109.35], [510, 107.8],
  [520, 104.79], [530, 107.69], [540, 104.41], [550, 104.05], [560, 100], [570, 96.33], [580, 95.79],
  [590, 88.69], [600, 90.01], [610, 89.6], [620, 87.7], [630, 83.29], [640, 83.7], [650, 80.03],
  [660, 80.21], [670, 82.28], [680, 78.28], [690, 69.72], [700, 71.61], [710, 74.35], [720, 61.6],
  [730, 69.89], [740, 75.09], [750, 63.59],
];

const g = (l, mu, s1, s2) => {
  const t = (l - mu) / (l < mu ? s1 : s2);
  return Math.exp(-0.5 * t * t);
};
const cmf = (l) => [
  1.056 * g(l, 599.8, 37.9, 31.0) + 0.362 * g(l, 442.0, 16.0, 26.7) - 0.065 * g(l, 501.1, 20.4, 26.2),
  0.821 * g(l, 568.8, 46.9, 40.5) + 0.286 * g(l, 530.9, 16.3, 31.1),
  1.217 * g(l, 437.0, 11.8, 36.0) + 0.681 * g(l, 459.0, 26.0, 13.8),
];
const d65 = (l) => {
  for (let k = 0; k < D65.length - 1; k++) {
    if (l >= D65[k][0] && l <= D65[k + 1][0]) {
      const t = (l - D65[k][0]) / (D65[k + 1][0] - D65[k][0]);
      return D65[k][1] + t * (D65[k + 1][1] - D65[k][1]);
    }
  }
  return D65[D65.length - 1][1];
};
const XYZ_RGB = [[3.2406, -1.5372, -0.4986], [-0.9689, 1.8758, 0.0415], [0.0557, -0.204, 1.057]];

// M: refletancia por banda -> sRGB linear
const M = [[], [], []];
for (const c of BANDAS) {
  const xyz = [0, 0, 0];
  for (let l = c - 15; l < c + 15; l += 1) {
    const f = cmf(l + 0.5);
    const e = d65(l + 0.5);
    for (let k = 0; k < 3; k++) xyz[k] += f[k] * e;
  }
  for (let r = 0; r < 3; r++) M[r].push(XYZ_RGB[r][0] * xyz[0] + XYZ_RGB[r][1] * xyz[1] + XYZ_RGB[r][2] * xyz[2]);
}
for (let r = 0; r < 3; r++) {
  const s = M[r].reduce((a, b) => a + b, 0);
  for (let b = 0; b < 12; b++) M[r][b] /= s;
}

const lin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const gam = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.max(0, v) ** (1 / 2.4) - 0.055);
const hexLin = (h) => [1, 3, 5].map((k) => lin(parseInt(h.slice(k, k + 2), 16) / 255));
const rgbDe = (R) => [0, 1, 2].map((r) => R.reduce((a, v, b) => a + v * M[r][b], 0));

const LO = 0.004;
const HI = 0.996;
const sig = (z) => 1 / (1 + Math.exp(-z));

const logito = (r) => Math.log((r - LO) / (HI - r));

/** O molde mexido o minimo (em logito) ate a cor-alvo. */
function ajustar(alvo, molde) {
  const z0 = molde.map((r) => logito(Math.min(HI - 1e-4, Math.max(LO + 1e-4, r))));
  const z = z0.slice();
  const m = new Array(12).fill(0);
  const v = new Array(12).fill(0);
  const lr = 0.05;
  for (let it = 1; it <= 30000; it++) {
    const s = z.map(sig);
    const R = s.map((x) => LO + (HI - LO) * x);
    const rgb = rgbDe(R);
    const err = rgb.map((c, k) => c - alvo[k]);
    const grad = new Array(12).fill(0);
    for (let b = 0; b < 12; b++) {
      let gr = 0;
      for (let r = 0; r < 3; r++) gr += 2 * 400 * err[r] * M[r][b];
      gr *= (HI - LO) * s[b] * (1 - s[b]);
      const suave = (b > 0 ? z[b] - z[b - 1] : 0) - (b < 11 ? z[b + 1] - z[b] : 0);
      grad[b] = gr + 2 * 0.004 * suave + 2 * 0.02 * (z[b] - z0[b]);
    }
    for (let b = 0; b < 12; b++) {
      m[b] = 0.9 * m[b] + 0.1 * grad[b];
      v[b] = 0.999 * v[b] + 0.001 * grad[b] * grad[b];
      z[b] -= (lr * (m[b] / (1 - 0.9 ** it))) / (Math.sqrt(v[b] / (1 - 0.999 ** it)) + 1e-9);
    }
  }
  return z.map((x) => LO + (HI - LO) * sig(x));
}

const curvas = PIGMENTOS.map(([nome, hex, , molde]) => ({ nome, hex, R: ajustar(hexLin(hex), molde) }));
const FORCA = PIGMENTOS.map((p) => p[2]);
const KS = curvas.map((c) => c.R.map((r) => ((1 - r) * (1 - r)) / (2 * r)));

// ---- relatorio (OKLCH)
function oklab([r, g2, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g2 + 0.0514459929 * b);
  const m2 = Math.cbrt(0.2119034982 * r + 0.6806995451 * g2 + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g2 + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m2 - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m2 + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m2 - 0.808675766 * s,
  ];
}
function mistura(c) {
  const cw = Math.max(0, 1 - c.reduce((a, b) => a + b, 0));
  const w = [...c, cw].map((v, p) => v * FORCA[p]);
  const sw = w.reduce((a, b) => a + b, 0);
  const R = [];
  for (let b = 0; b < 12; b++) {
    let ks = 0;
    for (let p = 0; p < 5; p++) ks += w[p] * KS[p][b];
    ks /= sw;
    R.push(1 + ks - Math.sqrt(ks * ks + 2 * ks));
  }
  return rgbDe(R);
}
const hexDe = (rgb) => '#' + rgb.map((v) => Math.round(Math.min(1, Math.max(0, gam(v))) * 255).toString(16).padStart(2, '0')).join('');
const lch = (rgb) => {
  const [L, a, b] = oklab(rgb);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return [L, Math.hypot(a, b), h];
};
const relatorio = [];
for (const [nome, c] of [
  ['ciano', [1, 0, 0, 0]], ['magenta', [0, 1, 0, 0]], ['amarelo', [0, 0, 1, 0]], ['preto', [0, 0, 0, 1]], ['branco', [0, 0, 0, 0]],
  ['C+Y', [0.5, 0, 0.5, 0]], ['M+Y', [0, 0.5, 0.5, 0]], ['C+M', [0.5, 0.5, 0, 0]], ['C+M+Y', [1 / 3, 1 / 3, 1 / 3, 0]],
  ['C+branco', [0.5, 0, 0, 0]], ['M+branco', [0, 0.5, 0, 0]], ['C+Y (1:3)', [0.25, 0, 0.75, 0]], ['M+Y (1:3)', [0, 0.25, 0.75, 0]],
]) {
  const rgb = mistura(c);
  const [L, C, h] = lch(rgb);
  relatorio.push(`${nome.padEnd(11)} ${hexDe(rgb)}  L=${L.toFixed(2)} C=${C.toFixed(3)} h=${h.toFixed(0)}`);
}
const f = (a) => '[' + a.map((v) => +v.toPrecision(6)).join(', ') + ']';
const js = `// GERADO por tools/pigmentos.mjs. Nao edite: rode \`node tools/pigmentos.mjs\`.
// Kubelka-Munk de constante unica em 12 bandas de 30 nm (400..730 nm), D65.
// Pigmentos: ${PIGMENTOS.map((p) => p[0] + ' ' + p[1]).join(', ')} (o branco e a base).
//
${relatorio.map((l) => '//   ' + l).join('\n')}

export const BANDAS = ${f(BANDAS)};
export const NOMES = ${JSON.stringify(PIGMENTOS.map((p) => p[0]))};
/** Poder de tingimento: a concentracao de cada pigmento pesa isso na mistura. */
export const FORCA = ${f(FORCA)};
/** K/S por pigmento (ciano, magenta, amarelo, preto, branco) e por banda. */
export const KS = [
${KS.map((k) => '  ' + f(k)).join(',\n')},
];
/** Refletancia por banda -> sRGB linear (linhas R, G, B; cada linha soma 1). */
export const M = [
${M.map((k) => '  ' + f(k)).join(',\n')},
];
`;
writeFileSync(SAIDA, js);
process.stdout.write(relatorio.join('\n') + '\n' + SAIDA + '\n');

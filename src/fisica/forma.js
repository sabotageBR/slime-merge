// Formas de repouso: disco hexagonal de N particulas e a atribuicao de particulas a ele.
// Puro e deterministico: so + - * / e sqrt (vigiado por test/estilo.test.js).

/** Area de uma celula do reticulado hexagonal com espacamento s: s^2 * sqrt(3)/2. */
const AREA_HEX = 0.8660254037844386;

/**
 * Quantas particulas de espacamento 2r enchem um disco de diametro D.
 * @param {number} diametro
 * @param {number} r raio medio da particula
 */
export function particulasPorDiametro(diametro, r) {
  const s = 2 * r;
  const area = (Math.PI * diametro * diametro) / 4;
  return Math.max(3, Math.round(area / (AREA_HEX * s * s)));
}

/**
 * Diametro de um disco com n particulas (inverso de particulasPorDiametro).
 * @param {number} n
 * @param {number} r
 */
export function diametroPorParticulas(n, r) {
  const s = 2 * r;
  return Math.sqrt((n * AREA_HEX * s * s * 4) / Math.PI);
}

/**
 * "Angulo de losango": funcao monotona do angulo em [0, 4), sem trigonometria.
 * @param {number} x
 * @param {number} y
 */
export function anguloLosango(x, y) {
  if (x === 0 && y === 0) return 0;
  if (y >= 0) return x >= 0 ? y / (x + y) : 1 - x / (-x + y);
  return x < 0 ? 2 - y / (-x - y) : 3 + x / (x - y);
}

/**
 * Os n pontos do reticulado hexagonal (espacamento s) mais perto do centro, centrados.
 * Ordem: do centro para fora (anel a anel), e no anel pelo angulo.
 * @param {number} n
 * @param {number} s
 * @returns {Float64Array} [x0, y0, x1, y1, ...]
 */
export function discoHex(n, s) {
  const h = s * 0.8660254037844386;
  const lado = Math.ceil(Math.sqrt(n) * 0.75) + 2;
  /** @type {number[][]} */
  const pts = [];
  for (let j = -lado; j <= lado; j++) {
    for (let i = -lado; i <= lado; i++) {
      const x = (i + (j & 1) * 0.5) * s;
      const y = j * h;
      pts.push([x * x + y * y, anguloLosango(x, y), x, y]);
    }
  }
  pts.sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
  const out = new Float64Array(n * 2);
  let mx = 0;
  let my = 0;
  for (let k = 0; k < n; k++) {
    out[2 * k] = pts[k][2];
    out[2 * k + 1] = pts[k][3];
    mx += pts[k][2];
    my += pts[k][3];
  }
  mx /= n;
  my /= n;
  for (let k = 0; k < n; k++) {
    out[2 * k] -= mx;
    out[2 * k + 1] -= my;
  }
  return out;
}

/**
 * Atribui particulas (posicoes relativas ao centroide) a pontos de um disco, sem torcer:
 * as duas listas vao para aneis pelo raio e, dentro de cada anel, sao casadas pelo angulo.
 * @param {Float64Array|number[]} rel   [x, y, ...] das particulas, relativo ao centroide
 * @param {Float64Array} disco          [x, y, ...] do disco (mesmo tamanho)
 * @returns {Int32Array} para cada particula k, o indice do ponto do disco
 */
export function atribuirAoDisco(rel, disco) {
  const n = disco.length / 2;
  const ordP = ordemRadial(rel, n);
  const ordD = ordemRadial(disco, n);
  const out = new Int32Array(n);
  let ini = 0;
  let anel = 0;
  while (ini < n) {
    const tam = Math.min(n - ini, anel === 0 ? 1 : 6 * anel);
    const fatiaP = ordP.slice(ini, ini + tam).sort((a, b) => (a[1] - b[1]) || (a[2] - b[2]));
    const fatiaD = ordD.slice(ini, ini + tam).sort((a, b) => (a[1] - b[1]) || (a[2] - b[2]));
    for (let k = 0; k < tam; k++) out[fatiaP[k][2]] = fatiaD[k][2];
    ini += tam;
    anel++;
  }
  return out;
}

/** @param {Float64Array|number[]} v @param {number} n @returns {number[][]} [d2, angulo, indice] */
function ordemRadial(v, n) {
  const o = [];
  for (let k = 0; k < n; k++) {
    const x = v[2 * k];
    const y = v[2 * k + 1];
    o.push([x * x + y * y, anguloLosango(x, y), k]);
  }
  return o.sort((a, b) => (a[0] - b[0]) || (a[2] - b[2]));
}

/** Passo do angulo de ouro (girassol de Vogel): cos e sin pre-calculados. */
const OURO_C = -0.7373688780783197;
const OURO_S = 0.6754902942615238;
/** Raio do girassol por sqrt(k): com c = 0,6 s a distancia minima e 0,93 s (a soma media dos raios e 0,91 s). */
export const GIRASSOL_C = 0.6;

/**
 * Disco redondo de n pontos em girassol (Vogel: raio c*sqrt(k+1/2), angulo de ouro),
 * centrado. Redondo em qualquer n (o hexagono dava slime de "florzinha", aneis
 * incompletos davam pontas e um anel de borda abria vaos no miolo), densidade uniforme e
 * distancia minima de 0,93 s. Sem trigonometria: o giro e a multiplicacao pelo (cos, sin)
 * do angulo de ouro.
 * @param {number} n
 * @param {number} s
 * @returns {Float64Array}
 */
export function discoAneis(n, s) {
  const out = new Float64Array(n * 2);
  const c = GIRASSOL_C * s;
  let ux = 1;
  let uy = 0;
  let mx = 0;
  let my = 0;
  for (let k = 0; k < n; k++) {
    const r = c * Math.sqrt(k + 0.5);
    out[2 * k] = r * ux;
    out[2 * k + 1] = r * uy;
    mx += out[2 * k];
    my += out[2 * k + 1];
    const nx = OURO_C * ux - OURO_S * uy;
    uy = OURO_S * ux + OURO_C * uy;
    ux = nx;
    // renormaliza (o erro de arredondamento nao acumula)
    const l = Math.sqrt(ux * ux + uy * uy);
    ux /= l;
    uy /= l;
  }
  mx /= n;
  my /= n;
  for (let k = 0; k < n; k++) { out[2 * k] -= mx; out[2 * k + 1] -= my; }
  return out;
}

/**
 * Quantas particulas o girassol precisa para um disco de diametro D (raio externo + r).
 * @param {number} diametro
 * @param {number} s espacamento
 */
export function particulasGirassol(diametro, s) {
  const R = diametro / 2 - s * 0.35;
  const c = GIRASSOL_C * s;
  return Math.max(3, Math.round((R / c) * (R / c)));
}

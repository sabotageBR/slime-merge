// Cestos (recipientes) dos jogos de soltar: a geometria da colisao (eixo das capsulas, com o
// fundo em y ~ 0 e centrados em x = 0), a linha de perigo e o estilo do desenho
// (src/render/cestos.js). Todos com area parecida com a do pote listrado (~100 u2), para nao
// mudar o equilibrio do jogo. Logica pura.

/**
 * @typedef {Object} Cesto
 * @property {string} id
 * @property {string} nome
 * @property {string} estilo       listrado | vime | vidro | madeira | ferro | porcelana
 * @property {number[][][]} linhas eixo das capsulas (polilinhas); a primeira vai do topo esquerdo ao
 *   topo direito: as pontas sao o limite da mira e o pe das guias da borda (src/jogo/pote.js)
 * @property {number} linha        altura da linha de perigo (a borda)
 * @property {string} [detalhe]    marcas, alca, pires...
 */

const R = 0.22;

/** Arco: centro (cx, cy), raio r, de a0 a a1 graus (0 = direita, 90 = cima), em n pedacos. */
function arco(cx, cy, r, a0, a1, n) {
  const out = [];
  for (let k = 0; k <= n; k++) {
    const a = ((a0 + ((a1 - a0) * k) / n) * Math.PI) / 180;
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return out;
}

/** Espelha um lado esquerdo (de cima para o fundo) e monta a polilinha inteira. */
function espelhar(esq) {
  const dir = esq.slice().reverse().map(([x, y]) => [-x, y]);
  return [...esq, ...dir];
}

/** @type {Cesto[]} */
export const CESTOS = [
  {
    id: 'pote', nome: 'Pote listrado', estilo: 'listrado',
    linhas: [[[-5.22, 11], [-4.22, -R], [4.22, -R], [5.22, 11]]],
    linha: 11,
  },
  {
    id: 'vime', nome: 'Cesta de vime', estilo: 'vime',
    linhas: [espelhar([[-5.75, 10.4], [-4.7, 1], ...arco(-3.9, 0.75, 0.97, 180, 265, 4).slice(1), [-3.8, -R]])],
    linha: 10.4,
  },
  {
    id: 'aquario', nome: 'Aquário redondo', estilo: 'vidro', detalhe: 'aquario',
    linhas: [[[-4.5, 10.15], [-3.95, 9.75], ...arco(0, 5.2, 5.9, 130, 410, 28).slice(1, -1), [3.95, 9.75], [4.5, 10.15]]],
    linha: 9.7,
  },
  {
    id: 'becher', nome: 'Béquer de laboratório', estilo: 'vidro', detalhe: 'becher',
    linhas: [[[-5.25, 11.5], [-4.85, 10.9], [-4.85, 0.75], ...arco(-4.0, 0.62, 0.85, 180, 270, 4).slice(1), [4.0, -0.23], ...arco(4.0, 0.62, 0.85, 270, 360, 4).slice(1), [4.85, 11.2]]],
    linha: 11,
  },
  {
    id: 'balde', nome: 'Balde de madeira', estilo: 'madeira', detalhe: 'alca',
    linhas: [[[-5.5, 10.4], [-4.5, -R], [4.5, -R], [5.5, 10.4]]],
    linha: 10.4,
  },
  {
    id: 'caldeirao', nome: 'Caldeirão', estilo: 'ferro', detalhe: 'pes',
    linhas: [[[-4.7, 10.3], [-5.45, 9.4], [-5.7, 6.4], ...arco(0, 5.6, 5.7, 180, 360, 18).slice(1), [5.7, 6.4], [5.45, 9.4], [4.7, 10.3]]],
    linha: 10.2,
  },
  {
    id: 'xicara', nome: 'Xícara', estilo: 'porcelana', detalhe: 'xicara',
    linhas: [(() => {
      const esq = [];
      for (let k = 10; k >= 0; k--) {
        const t = k / 10;
        esq.push([-(3.25 + 2.65 * Math.pow(t, 1.6)), 10.3 * t - R]);
      }
      return espelhar(esq);
    })()],
    linha: 10,
  },
  {
    id: 'vidro', nome: 'Pote de vidro', estilo: 'vidro', detalhe: 'rosca',
    linhas: [espelhar([[-4.45, 11.3], [-4.45, 10.7], [-4.9, 10.15], [-4.9, 0.9], ...arco(-4.0, 0.72, 0.95, 180, 268, 4).slice(1), [-3.9, -0.23]])],
    linha: 10.6,
  },
];

/** @param {string} [id] @returns {Cesto} */
export function cesto(id) {
  return CESTOS.find((c) => c.id === id) || CESTOS[0];
}

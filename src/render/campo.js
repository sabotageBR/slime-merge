// Campo do slime na CPU (P2G): as particulas de cada slime espalham densidade e pigmento
// numa grade regular; cada celula guarda a densidade total, a cor do slime DOMINANTE ali e
// a margem dele sobre o segundo. A GPU recebe duas texturas RGBA16F e faz um passe so
// (src/render/composicao.js): sem render target float, sem MRT, igual no iOS.
//
//   t0 = (rho total, ciano, magenta, amarelo)   (pigmento do slime dominante, ja normalizado)
//   t1 = (preto, dominancia, u, v)              dominancia = (1o - 2o) / (1o + 2o)
//   t2 = (textura, intensidade, -, -)           textura do slime dominante (lida sem filtro)
//
// (u, v) e a coordenada do pixel no disco de repouso do slime dominante (A^-1 (x - c)): a
// textura gira e amassa junto com o corpo, como o rosto.
//
// A cor nunca vaza para o slime vizinho, e a costura (dominancia ~ 0) e uma linha continua
// onde dois slimes se encostam. Dentro de um slime o pigmento varia por particula
// (marmorizado), com nucleo w^2 (mais pontudo que o da densidade, para o desenho ficar fino).

import { N_PIG } from '../fisica/mundo.js';

/**
 * @param {{ janela: number[], celula: number, raio: number }} o
 *   janela [x0, y0, x1, y1] do mundo coberta pelo campo; celula em u; raio do nucleo em u
 */
export function criarCampo({ janela, celula, raio }) {
  const [x0, y0, x1, y1] = janela;
  const nx = Math.ceil((x1 - x0) / celula) + 1;
  const ny = Math.ceil((y1 - y0) / celula) + 1;
  const N = nx * ny;
  const t0 = new Float32Array(N * 4);
  const t1 = new Float32Array(N * 4);
  const t2 = new Float32Array(N * 4);
  // por celula: melhor e segundo (densidade de um slime so)
  const melhor = new Float32Array(N);
  const segundo = new Float32Array(N);
  // temporarios do slime da vez
  const tD = new Float32Array(N);
  const tW = new Float32Array(N);
  const tC = new Float32Array(N * N_PIG);
  const h2 = raio * raio;
  const alcance = Math.ceil(raio / celula);
  let sujo = [0, 0, nx - 1, ny - 1];
  const inv = 1 / celula;

  /**
   * @param {ReturnType<typeof import('../fisica/mundo.js').criarMundo>} m
   * @param {(slime: import('../fisica/mundo.js').Slime) => boolean} [filtro]
   */
  function acumular(m, filtro) {
    for (let j = sujo[1]; j <= sujo[3]; j++) {
      const ini = j * nx + sujo[0];
      const fim = j * nx + sujo[2] + 1;
      t0.fill(0, ini * 4, fim * 4);
      t1.fill(0, ini * 4, fim * 4);
      t2.fill(0, ini * 4, fim * 4);
      melhor.fill(0, ini, fim);
      segundo.fill(0, ini, fim);
    }
    let gx0 = nx;
    let gy0 = ny;
    let gx1 = -1;
    let gy1 = -1;
    const { x, y, pig, membros, iniSl } = m;
    for (const s of m.slimes) {
      if (!s.ativo || (filtro && !filtro(s))) continue;
      const a0 = iniSl[s.idx];
      const a1 = iniSl[s.idx + 1];
      if (a1 <= a0) continue;
      // caixa do slime em celulas
      let bx0 = Math.floor((s.esq - x0) * inv) - alcance;
      let bx1 = Math.ceil((s.dir - x0) * inv) + alcance;
      let by0 = Math.floor((s.base - y0) * inv) - alcance;
      let by1 = Math.ceil((s.topo - y0) * inv) + alcance;
      if (bx0 < 0) bx0 = 0;
      if (by0 < 0) by0 = 0;
      if (bx1 >= nx) bx1 = nx - 1;
      if (by1 >= ny) by1 = ny - 1;
      if (bx0 > bx1 || by0 > by1) continue;
      // inversa da deformacao (limitada, como no rosto) para a coordenada da textura
      const lim = (v, a, b) => (v < a ? a : v > b ? b : v);
      const a11 = lim(s.a11, 0.6, 1.6);
      const a22 = lim(s.a22, 0.6, 1.6);
      const a12 = lim(s.a12, -0.6, 0.6);
      const a21 = lim(s.a21, -0.6, 0.6);
      const det = a11 * a22 - a12 * a21;
      const okA = det > 0.2;
      const i11 = okA ? a22 / det : 1;
      const i12 = okA ? -a12 / det : 0;
      const i21 = okA ? -a21 / det : 0;
      const i22 = okA ? a11 / det : 1;
      const tex = s.dados.textura || 0;
      const texT = s.dados.texturaT === undefined ? 1 : s.dados.texturaT;
      for (let j = by0; j <= by1; j++) {
        const ini = j * nx + bx0;
        const fim = j * nx + bx1 + 1;
        tD.fill(0, ini, fim);
        tW.fill(0, ini, fim);
        tC.fill(0, ini * N_PIG, fim * N_PIG);
      }
      for (let a = a0; a < a1; a++) {
        const i = membros[a];
        const px = (x[i] - x0) * inv;
        const py = (y[i] - y0) * inv;
        const ci = Math.round(px);
        const cj = Math.round(py);
        const ia = ci - alcance < bx0 ? bx0 : ci - alcance;
        const ib = ci + alcance > bx1 ? bx1 : ci + alcance;
        const ja = cj - alcance < by0 ? by0 : cj - alcance;
        const jb = cj + alcance > by1 ? by1 : cj + alcance;
        const b = i * N_PIG;
        const c0 = pig[b];
        const c1 = pig[b + 1];
        const c2 = pig[b + 2];
        const c3 = pig[b + 3];
        for (let j = ja; j <= jb; j++) {
          const dy = (j - py) * celula;
          const dy2 = dy * dy;
          if (dy2 >= h2) continue;
          let k = j * nx + ia;
          for (let ii = ia; ii <= ib; ii++, k++) {
            const dx = (ii - px) * celula;
            const q = 1 - (dx * dx + dy2) / h2;
            if (q <= 0) continue;
            const w = q * q * q;
            const w2 = w * w;
            tD[k] += w;
            tW[k] += w2;
            const kc = k * N_PIG;
            tC[kc] += w2 * c0;
            tC[kc + 1] += w2 * c1;
            tC[kc + 2] += w2 * c2;
            tC[kc + 3] += w2 * c3;
          }
        }
      }
      // junta no campo: soma a densidade e fica com a cor de quem domina a celula
      for (let j = by0; j <= by1; j++) {
        let k = j * nx + bx0;
        for (let ii = bx0; ii <= bx1; ii++, k++) {
          const d = tD[k];
          if (d <= 0) continue;
          const k4 = k * 4;
          t0[k4] += d;
          if (d > melhor[k]) {
            segundo[k] = melhor[k];
            melhor[k] = d;
            const w = tW[k] > 1e-12 ? 1 / tW[k] : 0;
            const kc = k * N_PIG;
            t0[k4 + 1] = tC[kc] * w;
            t0[k4 + 2] = tC[kc + 1] * w;
            t0[k4 + 3] = tC[kc + 2] * w;
            t1[k4] = tC[kc + 3] * w;
            const rx = x0 + ii * celula - s.cx;
            const ry = y0 + j * celula - s.cy;
            t1[k4 + 2] = i11 * rx + i12 * ry;
            t1[k4 + 3] = i21 * rx + i22 * ry;
            t2[k4] = tex;
            t2[k4 + 1] = texT;
          } else if (d > segundo[k]) {
            segundo[k] = d;
          }
        }
      }
      if (bx0 < gx0) gx0 = bx0;
      if (bx1 > gx1) gx1 = bx1;
      if (by0 < gy0) gy0 = by0;
      if (by1 > gy1) gy1 = by1;
    }
    // dominancia por celula
    if (gx1 >= 0) {
      for (let j = gy0; j <= gy1; j++) {
        let k = j * nx + gx0;
        for (let ii = gx0; ii <= gx1; ii++, k++) {
          const b1 = melhor[k];
          if (b1 <= 0) continue;
          t1[k * 4 + 1] = (b1 - segundo[k]) / (b1 + segundo[k]);
        }
      }
    }
    sujo = gx1 >= 0 ? [gx0, gy0, gx1, gy1] : [0, 0, 0, 0];
  }

  return { nx, ny, t0, t1, t2, janela, celula, raio, acumular, get caixa() { return sujo; } };
}

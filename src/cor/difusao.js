// Pigmento que se espalha dentro do slime e a frente de transmutacao da fusao.
//
// Difusao: troca simetrica entre particulas vizinhas do mesmo slime (pela lista de pares da
// fisica), pesada pelas massas, entao o pigmento total se conserva. O movimento das
// particulas advecta (dobra as faixas); a difusao alisa na escala pequena. Mexer, sovar e
// chacoalhar aumentam a troca onde ha cisalhamento (diferenca de velocidade entre vizinhas).
//
// Frente de transmutacao (Fisher-KPP: df/dt = D lap f + rho f (1 - f)): na fusao de
// niveis a cor nova nasce na costura e avanca como uma onda (~3 u/s), puxando o pigmento
// das particulas para a cor do nivel novo so na faixa da frente.

import { N_PIG, ESPACO } from '../fisica/mundo.js';

/** Parametros (por segundo). */
export const DIFUSAO = Object.freeze({
  d: 0.08, // u^2/s em repouso
  cisalhamento: 0.06, // u^2/s extra por (u/s) de diferenca de velocidade
  max: 0.45, // teto de kappa * vizinhos (estabilidade)
  frenteD: 0.3, // u^2/s
  frenteRho: 7.5, // 1/s  -> velocidade da frente 2 sqrt(D rho) = 3 u/s
});

/**
 * Um passo de difusao e de frente (chamar uma vez por quadro, depois da fisica).
 * @param {ReturnType<typeof import('../fisica/mundo.js').criarMundo>} m
 * @param {number} dt
 * @param {{ entreSlimes?: (a: number, b: number) => number, taxa?: number }} [o]
 *   entreSlimes: taxa extra entre slimes diferentes (gosma cinza do Duelo);
 *   taxa: multiplica a difusao (o Croma quer a cor nova em ~2 s)
 */
export function difundir(m, dt, o = {}) {
  const { x, y, vx, vy, sl, mas, pig, fr, slimes, pares, nPares } = m;
  const d02 = ESPACO * ESPACO;
  const taxa = o.taxa || 1;
  const k0 = (DIFUSAO.d * taxa * dt) / d02;
  const kc = (DIFUSAO.cisalhamento * taxa * dt) / d02;
  const kf = (DIFUSAO.frenteD * dt) / d02;
  const kmax = DIFUSAO.max / 6;
  const entre = o.entreSlimes;
  // frente: guarda o valor antigo para o termo de reacao e a atualizacao do pigmento
  const n = m.n;
  for (let i = 0; i < n; i++) {
    const s = slimes[sl[i]];
    s.misturando = false;
  }
  for (let p = 0; p < nPares; p++) {
    const i = pares[2 * p];
    const j = pares[2 * p + 1];
    const si = sl[i];
    const sj = sl[j];
    let k;
    if (si === sj) {
      const dvx = vx[i] - vx[j];
      const dvy = vy[i] - vy[j];
      k = k0 + kc * Math.sqrt(dvx * dvx + dvy * dvy);
    } else {
      if (!entre) continue;
      k = (entre(si, sj) * dt) / d02;
      if (k <= 0) continue;
    }
    if (k > kmax) k = kmax;
    const dx = x[i] - x[j];
    const dy = y[i] - y[j];
    if (dx * dx + dy * dy > 2.2 * d02) continue;
    const mi = mas[i];
    const mj = mas[j];
    const f = (k * mi * mj) / (mi + mj);
    const bi = i * N_PIG;
    const bj = j * N_PIG;
    let dif = 0;
    for (let c = 0; c < N_PIG; c++) {
      const d = pig[bj + c] - pig[bi + c];
      const t = f * d;
      pig[bi + c] += t / mi;
      pig[bj + c] -= t / mj;
      dif += d < 0 ? -d : d;
    }
    if (dif > 0.02) {
      slimes[si].misturando = true;
      slimes[sj].misturando = true;
    }
    // difusao da frente (so dentro do slime)
    if (si === sj && (fr[i] > 0 || fr[j] > 0)) {
      let kk = kf;
      if (kk > kmax) kk = kmax;
      const t = kk * (fr[j] - fr[i]);
      fr[i] += t;
      fr[j] -= t;
    }
  }
  // reacao da frente e pigmento puxado para a cor alvo do slime
  for (let i = 0; i < n; i++) {
    const s = slimes[sl[i]];
    const alvo = s.pigAlvo;
    if (!alvo) continue;
    const f0 = fr[i];
    if (f0 <= 0) continue;
    let f1 = f0 + DIFUSAO.frenteRho * dt * f0 * (1 - f0);
    if (f1 > 1) f1 = 1;
    const ganho = f1 >= 1 ? 1 : (f1 - f0) / (1 - f0 + 1e-9);
    const b = i * N_PIG;
    for (let c = 0; c < N_PIG; c++) pig[b + c] += ganho * (alvo[c] - pig[b + c]);
    fr[i] = f1;
    s.misturando = true;
  }
  // frente concluida: tira o alvo (o slime ficou todo da cor nova)
  for (const s of slimes) {
    if (!s.ativo || !s.pigAlvo) continue;
    let fim = true;
    for (let a = m.iniSl[s.idx]; a < m.iniSl[s.idx + 1]; a++) {
      if (fr[m.membros[a]] < 0.999) { fim = false; break; }
    }
    if (fim) {
      s.pigAlvo = null;
      for (let a = m.iniSl[s.idx]; a < m.iniSl[s.idx + 1]; a++) fr[m.membros[a]] = 0;
    }
  }
}

/**
 * Comeca a frente de transmutacao num slime: as particulas perto de (px, py) ja nascem
 * com a cor nova.
 * @param {ReturnType<typeof import('../fisica/mundo.js').criarMundo>} m
 * @param {import('../fisica/mundo.js').Slime} s
 * @param {number[]} alvo concentracoes da cor nova
 * @param {number} px
 * @param {number} py
 * @param {number} [raio]
 */
export function iniciarFrente(m, s, alvo, px, py, raio = 0.45) {
  s.pigAlvo = alvo.slice();
  const r2 = raio * raio;
  let algum = false;
  let melhor = -1;
  let dmin = Infinity;
  for (let i = 0; i < m.n; i++) {
    if (m.sl[i] !== s.idx) continue;
    m.fr[i] = 0;
    const dx = m.x[i] - px;
    const dy = m.y[i] - py;
    const d2 = dx * dx + dy * dy;
    if (d2 < r2) { m.fr[i] = 1; algum = true; }
    if (d2 < dmin) { dmin = d2; melhor = i; }
  }
  if (!algum && melhor >= 0) m.fr[melhor] = 1;
}

/**
 * Pinta todas as particulas de um slime com uma mistura.
 * @param {ReturnType<typeof import('../fisica/mundo.js').criarMundo>} m
 * @param {import('../fisica/mundo.js').Slime} s
 * @param {number[]} c
 */
export function pintar(m, s, c) {
  for (let i = 0; i < m.n; i++) {
    if (m.sl[i] !== s.idx) continue;
    for (let k = 0; k < N_PIG; k++) m.pig[i * N_PIG + k] = c[k] || 0;
  }
}

/**
 * Concentracao media (pesada pela massa) de um slime: a "cor medida".
 * @param {ReturnType<typeof import('../fisica/mundo.js').criarMundo>} m
 * @param {import('../fisica/mundo.js').Slime} s
 * @returns {number[]}
 */
export function pigmentoMedio(m, s) {
  const out = [0, 0, 0, 0];
  let M = 0;
  for (let a = m.iniSl[s.idx]; a < m.iniSl[s.idx + 1]; a++) {
    const i = m.membros[a];
    const w = m.mas[i];
    M += w;
    for (let k = 0; k < N_PIG; k++) out[k] += w * m.pig[i * N_PIG + k];
  }
  if (M > 0) for (let k = 0; k < N_PIG; k++) out[k] /= M;
  return out;
}

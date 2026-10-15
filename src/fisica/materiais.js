// Materiais do slime: parametros do solver por cluster.
// Unidades: comprimento em u (1 u = 1/10 da boca do pote), tempo em s.
// Valores por SUBPASSO (dt = 1/240 s) onde indicado; o resto por segundo.
//
//   k        rigidez do shape matching por subpasso (0 = sem forma, so coesao)
//   epsY     limite de escoamento, em raios de particula: abaixo dele o slime e elastico;
//            acima, a forma de repouso rasteja para a atual (plasticidade)
//   lam      velocidade do rastejo (1/s)
//   mem      memoria (1/s): sem carga, a forma de repouso volta ao disco original
//   coesao   tensao superficial dentro do slime (mola em velocidade: fracao da folga fechada
//            por subpasso; acima de ~0.05 vira tremor de 18 Hz)
//   xsph     viscosidade dentro do slime (fracao da diferenca de velocidade por subpasso)
//   amortRig puxa a velocidade das particulas para a de corpo rigido do slime (por subpasso)
//   atritoS / atritoK  atrito estatico/cinetico contra outros slimes e paredes

//   separar  fronteira limpa com outros slimes (eixo de potencia): personagens nao se engolem

/** @typedef {{ nome: string, k: number, epsY: number, lam: number, mem: number, coesao: number, xsph: number, amortRig: number, atritoS: number, atritoK: number, separar?: boolean }} Material */

/** @type {Record<string, Material>} */
export const MATERIAIS = {
  // personagem: cai como gelatina (previsivel) e so escorre carregado e parado
  gelatina: { nome: 'gelatina', k: 0.02, epsY: 0.5, lam: 0.9, mem: 0.25, coesao: 0.02, xsph: 0.03, amortRig: 0.05, atritoS: 0.5, atritoK: 0.35, separar: true },
  // escoa devagar e se acomoda no formato do pote
  goo: { nome: 'goo', k: 0.002, epsY: 0.04, lam: 6, mem: 0, coesao: 0.03, xsph: 0.15, amortRig: 0.12, atritoS: 0.35, atritoK: 0.25 },
  // sem forma: so coesao e viscosidade
  liquido: { nome: 'liquido', k: 0, epsY: 0, lam: 0, mem: 0, coesao: 0.03, xsph: 0.25, amortRig: 0, atritoS: 0.2, atritoK: 0.15 },
};

/** Multiplicadores dos estados temporarios (reforcos Calor e Gelo). */
export const ESTADOS = {
  normal: { k: 1, lam: 1, epsY: 1, mem: 1 },
  calor: { k: 0.2, lam: 15, epsY: 0, mem: 0 },
  gelo: { k: 3, lam: 0, epsY: 1, mem: 0 },
};

/**
 * Copia de um material com ajustes (lab e sliders do ?debug).
 * @param {string|Material} base
 * @param {Partial<Material>} [ajustes]
 * @returns {Material}
 */
export function material(base, ajustes) {
  const m = typeof base === 'string' ? MATERIAIS[base] || MATERIAIS.gelatina : base;
  return { ...m, ...(ajustes || {}) };
}

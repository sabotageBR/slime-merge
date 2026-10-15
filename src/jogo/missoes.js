// Missoes de sessao: 3 ativas, sorteadas com semente, premio na hora (o modo decide qual).
// Logica pura. Tipos: fusao (soma), nivel (maior criado), combo (maior combo), poder (soma).

import { criarRng } from '../core/rng.js';

const MOLDES = [
  { tipo: 'fusao', metas: [8, 15, 25, 40] },
  { tipo: 'nivel', metas: [5, 6, 7, 8, 9] },
  { tipo: 'combo', metas: [2, 3, 4] },
  { tipo: 'poder', metas: [1, 2, 3] },
];

/**
 * @param {number} semente
 * @param {any} [salvo]
 */
export function criarMissoes(semente, salvo) {
  const rng = criarRng((semente ^ 0x5bd1e995) >>> 0);
  /** @type {{ tipo: string, meta: number, prog: number, feita: boolean, nivelMeta: number }[]} */
  let ativas = Array.isArray(salvo) ? salvo.map((m) => ({ ...m })) : [];
  const degrau = { fusao: 0, nivel: 0, combo: 0, poder: 0 };

  function nova(tipo) {
    const molde = MOLDES.find((m) => m.tipo === tipo) || MOLDES[0];
    const k = Math.min(molde.metas.length - 1, degrau[molde.tipo]++);
    return { tipo: molde.tipo, meta: molde.metas[k], prog: 0, feita: false, nivelMeta: 0 };
  }
  if (ativas.length !== 3) {
    const tipos = MOLDES.map((m) => m.tipo);
    for (let i = tipos.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [tipos[i], tipos[j]] = [tipos[j], tipos[i]];
    }
    ativas = tipos.slice(0, 3).map(nova);
  }

  return {
    /**
     * @param {string} tipo
     * @param {number} valor
     * @returns {any[]} as que acabaram de ser cumpridas
     */
    registrar(tipo, valor) {
      const feitas = [];
      ativas.forEach((m, k) => {
        if (m.tipo !== tipo || m.feita) return;
        if (tipo === 'fusao' || tipo === 'poder') m.prog += valor;
        else m.prog = Math.max(m.prog, valor);
        if (m.prog >= m.meta) {
          m.feita = true;
          feitas.push(m);
          // a cumprida da lugar a uma do mesmo tipo, um degrau acima
          ativas[k] = nova(m.tipo);
        }
      });
      return feitas;
    },
    passo() {},
    lista() { return ativas.map((m) => ({ tipo: m.tipo, meta: m.meta, prog: Math.min(m.prog, m.meta) })); },
    salvar() { return ativas.map((m) => ({ ...m })); },
  };
}

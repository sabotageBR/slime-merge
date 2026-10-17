// Metas da partida: 3 ativas (uma de cada tipo), sorteadas com semente; a cumprida da lugar a uma
// do mesmo tipo, um degrau acima, com premio em gotas. O sem fim usa no meio da partida (do nivel 9
// em diante, quando cada slime novo demora minutos e as missoes do dia ja acabaram): a pilula da
// meta alterna com a mais perto de acabar. Vale so durante a partida (nao e gravada). Logica pura.
// Tipos: fusao (soma), combo (maior combo), poder (soma).

import { criarRng } from '../core/rng.js';

const MOLDES = [
  { tipo: 'fusao', metas: [10, 20, 35, 50], premio: [10, 15, 20, 25] },
  { tipo: 'combo', metas: [2, 3, 4], premio: [10, 15, 20] },
  { tipo: 'poder', metas: [1, 2, 3], premio: [10, 15, 20] },
];

/** @param {number} semente */
export function criarMissoes(semente) {
  const rng = criarRng((semente ^ 0x5bd1e995) >>> 0);
  const degrau = { fusao: 0, combo: 0, poder: 0 };

  function nova(tipo) {
    const molde = MOLDES.find((m) => m.tipo === tipo) || MOLDES[0];
    const k = Math.min(molde.metas.length - 1, degrau[molde.tipo]++);
    return { tipo: molde.tipo, meta: molde.metas[k], premio: molde.premio[k], prog: 0, feita: false };
  }
  const tipos = MOLDES.map((m) => m.tipo);
  for (let i = tipos.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [tipos[i], tipos[j]] = [tipos[j], tipos[i]];
  }
  /** @type {{ tipo: string, meta: number, premio: number, prog: number, feita: boolean }[]} */
  const ativas = tipos.map(nova);

  return {
    /**
     * @param {string} tipo
     * @param {number} valor
     * @returns {any[]} as que acabaram de ser cumpridas (com o premio)
     */
    registrar(tipo, valor) {
      const feitas = [];
      ativas.forEach((m, k) => {
        if (m.tipo !== tipo || m.feita) return;
        if (tipo === 'fusao' || tipo === 'poder') m.prog += valor;
        else m.prog = Math.max(m.prog, valor);
        if (m.prog >= m.meta) {
          m.feita = true;
          feitas.push({ ...m, prog: m.meta });
          // a cumprida da lugar a uma do mesmo tipo, um degrau acima
          ativas[k] = nova(m.tipo);
        }
      });
      return feitas;
    },
    lista() { return ativas.map((m) => ({ tipo: m.tipo, meta: m.meta, premio: m.premio, prog: Math.min(m.prog, m.meta) })); },
  };
}

// Miniaturas das skins para a Loja, feitas em tempo de execucao com o palco (o slime do nivel
// no pipeline real; nenhum webp novo na build). Um palco so, fora da tela, e um cache por
// aparencia + personagem + lado. Libera o contexto WebGL quando a Loja fecha.

import { criarPalco } from '../render/palco.js';

/**
 * @param {{ lado?: number, fundo?: string }} [o] lado em px de canvas da miniatura
 */
export function criarMiniaturas(o = {}) {
  const lado = Math.max(32, o.lado || 128);
  /** @type {ReturnType<typeof criarPalco>|null} */
  let palco = null;
  /** @type {Map<string, string>} */
  const cache = new Map();

  /**
   * A miniatura (data URL png) do slime do nivel k com a aparencia `ap`.
   * @param {number} k
   * @param {import('../jogo/skins.js').Aparencia} ap
   * @param {string} [objeto] estilo do personagem
   * @returns {string}
   */
  function url(k, ap, objeto = 'classico') {
    const chave = `${ap.chave}|${objeto}|${lado}`;
    const pronta = cache.get(chave);
    if (pronta) return pronta;
    if (!palco) palco = criarPalco(document.createElement('canvas'), { tamanho: lado, cutucar: false, dpr: 1 });
    palco.montar(k, ap, objeto);
    for (let i = 0; i < 45; i++) palco.passo(1 / 60);
    const u = palco.foto(lado, { fundo: o.fundo || '' }).toDataURL('image/png');
    if (cache.size > 120) cache.clear();
    cache.set(chave, u);
    return u;
  }

  return {
    url,
    /** Esquece a miniatura de uma aparencia (a "Minha" editada). @param {string} chave */
    esquecer(chave) { for (const c of [...cache.keys()]) if (c.startsWith(chave + '|')) cache.delete(c); },
    /** Libera o contexto WebGL (a Loja fechou); o cache fica. */
    liberar() { if (palco) palco.liberar(); palco = null; },
  };
}

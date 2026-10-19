// Armazenamento com reserva em memoria (copia de 2048_cards/src/core/armazenamento.js).
//
// A Poki exige que o jogo continue jogavel em janela anonima, com cookies
// bloqueados e com o disco cheio. Nesses casos o localStorage lanca em
// qualquer acesso, inclusive no getter (window.localStorage), por isso ate a
// obtencao do objeto fica dentro de try. Nada aqui lanca.
//
// Unico modulo do jogo que toca o localStorage.

export const PREFIXO_PADRAO = 'slime.';

/**
 * @typedef {Object} StorageMinimo
 * @property {(k: string) => string|null} getItem
 * @property {(k: string, v: string) => void} setItem
 * @property {(k: string) => void} removeItem
 */

/**
 * @param {{ prefixo?: string, obterLs?: () => StorageMinimo|null|undefined }} [opcoes]
 */
export function criarArmazem({ prefixo = PREFIXO_PADRAO, obterLs = () => globalThis.localStorage } = {}) {
  /** @type {Map<string, string|null>} valor bruto gravado nesta sessao; null = removido */
  const memoria = new Map();
  /** @type {StorageMinimo|null} */
  let ls = null;
  try {
    const candidato = obterLs();
    if (candidato && typeof candidato.getItem === 'function' && typeof candidato.setItem === 'function') ls = candidato;
  } catch {
    ls = null;
  }

  /** @param {string} chave @param {any} [padrao] */
  function ler(chave, padrao) {
    const k = prefixo + chave;
    /** @type {string|null|undefined} */
    let bruto = null;
    if (memoria.has(k)) bruto = memoria.get(k);
    else if (ls) {
      try {
        bruto = ls.getItem(k);
      } catch {
        bruto = null;
      }
    }
    if (bruto === null || bruto === undefined) return padrao;
    try {
      return JSON.parse(bruto);
    } catch {
      return padrao;
    }
  }

  /** @param {string} chave @param {any} valor */
  function gravar(chave, valor) {
    let bruto;
    try {
      bruto = JSON.stringify(valor);
    } catch {
      return false;
    }
    if (typeof bruto !== 'string') return false;
    const k = prefixo + chave;
    memoria.set(k, bruto);
    if (!ls) return false;
    try {
      ls.setItem(k, bruto);
      return true;
    } catch {
      return false;
    }
  }

  return { ler, gravar };
}

/**
 * Leva o progresso do localStorage para outra fonte (o modulo data da CrazyGames), uma vez: so as
 * chaves do prefixo que a fonte ainda nao tem (quem jogou a build sem o modulo, no Basic Launch,
 * nao perde o save). A CrazyGames pede isso ao trocar o save de um jogo ja publicado.
 * @param {StorageMinimo} destino
 * @param {{ prefixo?: string, obterLs?: () => any }} [opcoes]
 * @returns {number} chaves copiadas
 */
export function migrarDoLocal(destino, { prefixo = PREFIXO_PADRAO, obterLs = () => globalThis.localStorage } = {}) {
  const marca = prefixo + '_migrado';
  let n = 0;
  try {
    if (destino.getItem(marca) !== null) return 0;
    const ls = obterLs();
    if (ls && ls !== destino && typeof ls.key === 'function') {
      const chaves = [];
      for (let i = 0; i < ls.length; i++) {
        const k = ls.key(i);
        if (typeof k === 'string' && k.startsWith(prefixo) && k !== marca) chaves.push(k);
      }
      for (const k of chaves) {
        const v = ls.getItem(k);
        if (v !== null && destino.getItem(k) === null) {
          destino.setItem(k, v);
          n++;
        }
      }
    }
    destino.setItem(marca, '1');
  } catch {
    /* sem localStorage ou fonte cheia: segue com o que tiver */
  }
  return n;
}

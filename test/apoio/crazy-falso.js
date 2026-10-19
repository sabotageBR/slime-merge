// SDK v3 falso da CrazyGames para os testes do core/crazygames.js: registra as chamadas e deixa o
// teste conduzir o anuncio (comecar, terminar, falhar) e o muteAudio.
// Arquivo de apoio: so exporta (o node --test roda todo .js de test/, inclusive este).

/**
 * dados: 'ok' (modulo data que grava), 'nada' (sem o modulo) ou 'mudo' (aceita e nao guarda, como
 * com o toggle "Progress Save" desligado); bloqueador: o que o hasAdblock() responde.
 * @param {{ ambiente?: 'local'|'crazygames'|'disabled', mudo?: boolean, dados?: 'ok'|'nada'|'mudo', bloqueador?: boolean, locale?: string }} [opcoes]
 */
export function criarCrazyFalso({ ambiente = 'crazygames', mudo = false, dados = 'ok', bloqueador = false, locale = 'pt-BR' } = {}) {
  /** @type {any[][]} */
  const log = [];
  /** @type {((s: any) => void)[]} */
  const ouvintes = [];
  /** @type {any} */
  let pendente = null;
  /**
   * No ambiente 'disabled' toda chamada lanca erro, como no SDK de verdade.
   * @param {string} nome
   * @param {(...a: any[]) => any} [fn]
   */
  const api = (nome, fn) => (/** @type {any[]} */ ...args) => {
    if (ambiente === 'disabled') throw new Error('CrazySDK is disabled on this domain');
    log.push([nome, ...args.filter((a) => typeof a !== 'object' && typeof a !== 'function')]);
    return fn ? fn(...args) : undefined;
  };
  /** @type {Map<string, string>} */
  const guardado = new Map();
  const data = {
    getItem: (/** @type {string} */ k) => (guardado.has(k) ? guardado.get(k) : null),
    setItem: (/** @type {string} */ k, /** @type {string} */ v) => { if (dados === 'ok') guardado.set(k, String(v)); },
    removeItem: (/** @type {string} */ k) => { guardado.delete(k); },
  };
  const sdk = {
    environment: ambiente,
    data: dados === 'nada' ? undefined : data,
    user: { systemInfo: { locale, countryCode: 'BR', device: { type: 'mobile' } } },
    init: api('init', () => Promise.resolve()),
    game: {
      settings: { muteAudio: mudo, disableChat: false },
      loadingStart: api('loadingStart'),
      loadingStop: api('loadingStop'),
      gameplayStart: api('gameplayStart'),
      gameplayStop: api('gameplayStop'),
      addSettingsChangeListener: api('addSettingsChangeListener', (fn) => { ouvintes.push(fn); }),
      happytime: api('happytime'),
    },
    ad: {
      requestAd: api('requestAd', (_tipo, cb) => { pendente = cb; }),
      hasAdblock: api('hasAdblock', () => Promise.resolve(bloqueador)),
    },
  };
  return {
    sdk,
    log,
    guardado,
    /** @returns {boolean} ha anuncio pedido esperando resposta */
    get pendente() { return pendente !== null; },
    comecar() { pendente.adStarted(); },
    terminar() {
      const cb = pendente;
      pendente = null;
      cb.adFinished();
    },
    /** @param {string} code */
    falhar(code) {
      const cb = pendente;
      pendente = null;
      cb.adError({ code, message: code });
    },
    /** @param {boolean} m */
    mudar(m) {
      sdk.game.settings.muteAudio = m;
      for (const fn of ouvintes) fn(sdk.game.settings);
    },
  };
}

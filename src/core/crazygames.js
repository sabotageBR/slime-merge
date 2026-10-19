// Camada de contato com o SDK v3 da CrazyGames, com a mesma interface do core/poki.js: um
// adaptador da ao SDK a cara do PokiSDK e o criarPoki faz o resto (prazos, fila ate o init,
// gameplay idempotente, rewarded so com true). So entra na build da CrazyGames: o
// tools/empacotar.mjs --alvo=crazygames troca o import do main.js para este arquivo (na build da
// Poki ele sai).
//
// Diferencas para a Poki (docs.crazygames.com, consultado em 2026-10-19):
// - ambiente 'disabled' (qualquer dominio fora da CrazyGames e do localhost): toda chamada lanca
//   erro, entao o SDK nem aparece e o jogo segue como sem SDK;
// - init + game.loadingStart; gameLoadingFinished e game.loadingStop; gameplay igual;
// - anuncio: ad.requestAd('midgame'|'rewarded', { adStarted, adFinished, adError }). O rewarded so
//   premia no adFinished; adError resolve na hora, sem premio (unfilled, adblock, adCooldown...).
//   O audio cala so quando o anuncio comeca de verdade (adStarted), como a CrazyGames pede;
// - Basic Launch: sem anuncios, e botao de video sem efeito reprova. A build -basic sai com
//   ANUNCIOS falso (o empacotar so liga com --anuncios); se a Full receber o erro
//   adsDisabledBasicLaunch, os anuncios desligam na sessao (onSemAnuncios: o main.js esconde os
//   botoes de video);
// - bloqueador: ad.hasAdblock() no init e o erro 'adblock' desligam os videos com aviso
//   (bloqueador = true; o jogador nunca perde o jogo por isso);
// - progresso no modulo data do SDK (nuvem para quem tem conta CrazyGames), com a mesma API do
//   armazenamento do navegador; sem ele (toggle "Progress Save" desligado no portal), o do navegador;
// - idioma de user.systemInfo.locale; happytime nos marcos (festa); sem intervalo comercial
//   ao trocar de modo pelo menu (botao de navegacao); measure nao existe;
// - game.settings.muteAudio cala o jogo por cima do mudo do jogador (onMudoPlataforma), no init e
//   em cada mudanca (addSettingsChangeListener).

import { criarPoki } from './poki.js';

/** Anuncios ligados nesta build (o empacotar --alvo=crazygames sem --anuncios grava false). */
export const ANUNCIOS = true;

/** Chave de teste do modulo data (grava, le e apaga). */
const SONDA = 'slime.__sonda';

/**
 * @typedef {Object} OpcoesCrazy
 * @property {() => any} [obterSdk]     o window.CrazyGames.SDK, ou nada
 * @property {boolean} [anuncios]       falso no Basic Launch
 * @property {import('./poki.js').Prazos} [prazos]
 * @property {(fn: () => void, ms: number) => any} [agendar]
 * @property {(id: any) => void} [cancelar]
 */

/**
 * @param {OpcoesCrazy} [opcoes]
 * @returns {import('./poki.js').Poki}
 */
export function criarCrazy({
  obterSdk = () => /** @type {any} */ (globalThis).CrazyGames?.SDK,
  anuncios = ANUNCIOS,
  prazos,
  agendar,
  cancelar,
} = {}) {
  let desligados = !anuncios;
  let bloqueado = false;
  /** @type {any} */
  let origem = null;
  /** @type {any} */
  let adaptador = null;

  /** O SDK da CrazyGames fora do ambiente 'disabled', ou null. */
  function cg() {
    try {
      const s = obterSdk();
      return s && typeof s === 'object' && s.environment !== 'disabled' ? s : null;
    } catch {
      return null;
    }
  }

  /** @param {(() => void)|null} fn */
  function avisar(fn) {
    try {
      if (typeof fn === 'function') fn();
    } catch {
      /* ignora */
    }
  }

  /** Desliga os anuncios na sessao (Basic Launch ou bloqueador) e avisa o main.js uma vez. */
  function desligar(porBloqueador) {
    const antes = desligados || bloqueado;
    if (porBloqueador) bloqueado = true;
    else desligados = true;
    if (!antes) avisar(instancia.onSemAnuncios);
  }

  /** @param {any} s */
  function avisarMudo(s) {
    try {
      const fn = instancia.onMudoPlataforma;
      if (typeof fn === 'function') fn(!!(s.game && s.game.settings && s.game.settings.muteAudio));
    } catch {
      /* ignora */
    }
  }

  /**
   * Pede o anuncio e resolve com true so no adFinished.
   * @param {any} s
   * @param {'midgame'|'rewarded'} tipo
   * @param {any} aoIniciar
   * @returns {Promise<boolean>}
   */
  function pedir(s, tipo, aoIniciar) {
    return new Promise((resolve) => {
      s.ad.requestAd(tipo, {
        adStarted: () => { if (typeof aoIniciar === 'function') aoIniciar(); },
        adFinished: () => resolve(true),
        /** @param {any} erro */
        adError: (erro) => {
          const code = erro && erro.code;
          if (code === 'adsDisabledBasicLaunch') desligar(false);
          else if (code === 'adblock') desligar(true);
          resolve(false);
        },
      });
    });
  }

  /** @param {any} s */
  function olharBloqueador(s) {
    if (desligados) return;
    try {
      Promise.resolve(s.ad.hasAdblock()).then((v) => { if (v === true) desligar(true); }, () => {});
    } catch {
      /* ignora */
    }
  }

  /**
   * O SDK com a cara do PokiSDK. Sem anuncios, commercialBreak e rewardedBreak somem (o criarPoki
   * devolve false sem calar o audio).
   * @param {any} s
   */
  function adaptar(s) {
    const sem = () => desligados || bloqueado;
    return {
      init: () => Promise.resolve(s.init()).then(() => {
        avisarMudo(s);
        try { s.game.addSettingsChangeListener(() => avisarMudo(s)); } catch { /* ignora */ }
        olharBloqueador(s);
        s.game.loadingStart();
      }),
      gameLoadingFinished: () => s.game.loadingStop(),
      gameplayStart: () => s.game.gameplayStart(),
      gameplayStop: () => s.game.gameplayStop(),
      get commercialBreak() {
        return sem() ? undefined : (/** @type {any} */ aoIniciar) => pedir(s, 'midgame', aoIniciar);
      },
      get rewardedBreak() {
        // o criarPoki passa o onStart direto (sem tamanho) ou em { size, onStart }
        return sem() ? undefined : (/** @type {any} */ o) => pedir(s, 'rewarded', typeof o === 'function' ? o : o && o.onStart);
      },
    };
  }

  const instancia = criarPoki({
    obterSdk: () => {
      const s = cg();
      if (!s) return null;
      if (s !== origem) {
        origem = s;
        adaptador = adaptar(s);
      }
      return adaptador;
    },
    prazos,
    agendar,
    cancelar,
    calarNoInicio: false,
  });
  Object.defineProperties(instancia, {
    temAnuncios: { get: () => instancia.sdkPronto && !desligados && !bloqueado && cg() !== null },
    bloqueador: { get: () => bloqueado },
    idioma: {
      get: () => {
        try {
          const l = cg()?.user?.systemInfo?.locale;
          return typeof l === 'string' ? l : '';
        } catch {
          return '';
        }
      },
    },
  });
  instancia.intervaloNaNavegacao = false;
  /** O modulo data depois do init, se ele grava e le de volta; senao null (fica o do navegador). */
  instancia.fonteDados = async () => {
    await instancia.init();
    const s = cg();
    if (!s || !instancia.sdkPronto) return null;
    try {
      const d = s.data;
      if (!d || typeof d.getItem !== 'function' || typeof d.setItem !== 'function') return null;
      d.setItem(SONDA, '1');
      const ok = d.getItem(SONDA) === '1';
      if (typeof d.removeItem === 'function') d.removeItem(SONDA);
      return ok ? d : null;
    } catch {
      return null;
    }
  };
  instancia.festa = () => {
    const s = cg();
    if (!s || !instancia.sdkPronto) return;
    try { s.game.happytime(); } catch { /* ignora */ }
  };
  return instancia;
}

/** Instancia do jogo na build da CrazyGames (o main.js importa como `poki`). */
export const poki = criarCrazy();

/** Plataforma desta build: sem o canto do botao da Poki no HUD. */
export const plataforma = 'crazygames';

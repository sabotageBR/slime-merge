// GameMonetize (github.com/MonetizeGame/GameMonetize.com-SDK). Como na GameDistribution, o SDK le
// window.SDK_OPTIONS (o gameId do painel, gravado em IDS pelo empacotar) quando carrega, e entra por
// aqui. Sem gameId ele nem carrega e a build e so de teste.
// - nao ha video premiado: so o intersticial (sdk.showBanner(), que apesar do nome e um video). Os
//   botoes de video somem (temVideo falso: body.sem-anuncio), e o reforco acabado fica so por gotas;
// - nada de anuncio no carregamento (regra deles): so no "jogar de novo", na troca de modo e nas
//   pausas naturais dos modos; o do fim de evento do sem fim, que vem do tempo, fica de fora;
// - SDK_GAME_PAUSE e o comeco do video e SDK_GAME_START o fim. Pedido cedo demais (o SDK espera ~130 s
//   entre um e outro) volta com SDK_GAME_START sem SDK_GAME_PAUSE: o jogo segue na hora.
import { criarPortal, carregarScript } from '../portal.js';

/** Os ids do painel da GameMonetize (o tools/empacotar.mjs grava os de marketing/portais/ids.json). */
export const IDS = {};

const SDK = 'https://api.gamemonetize.com/sdk.js';
/** O SDK quase sempre responde na hora; sem resposta, o jogo nao espera mais que isso. */
const PRAZO_ANUNCIO = 6000;

/**
 * @param {{ obterSdk?: () => any, ids?: Record<string, string>, agendar?: any, cancelar?: any }} [opcoes]
 */
export function criarGameMonetize({ obterSdk = () => /** @type {any} */ (globalThis).sdk, ids = IDS, agendar, cancelar } = {}) {
  /** @type {null|((ok: boolean) => void)} */
  let pronto = null;
  /** @type {null|(() => void)} */
  let comecouAtual = null;
  /** @type {null|((ok: boolean) => void)} */
  let acabou = null;
  /** @type {null|((pausado: boolean) => void)} */
  let avisoPausa = null;
  /** @type {any} o prazo ate o video entrar */
  let prazo = null;

  /** @param {string} nome */
  function aoEvento(nome) {
    if (nome === 'SDK_READY') {
      if (pronto) pronto(true);
    } else if (nome === 'SDK_GAME_PAUSE') {
      if (acabou) {
        globalThis.clearTimeout(prazo);
        if (comecouAtual) comecouAtual();
      } else if (avisoPausa) avisoPausa(true);
    } else if (nome === 'SDK_GAME_START') {
      if (acabou) acabou(true);
      else if (avisoPausa) avisoPausa(false);
    } else if (nome === 'SDK_ERROR') {
      if (acabou) acabou(false);
    }
  }

  return criarPortal({
    avisaComeco: true,
    intervalos: { evento: false, outros: true },
    prazos: { intervalo: PRAZO_ANUNCIO },
    agendar,
    cancelar,
    abrir: () => {
      if (!ids.gameId || typeof window === 'undefined') return null;
      const espera = new Promise((resolve) => { pronto = resolve; });
      /** @type {any} */ (window).SDK_OPTIONS = { gameId: ids.gameId, onEvent: (/** @type {any} */ e) => aoEvento(e && e.name) };
      carregarScript('gamemonetize-sdk', SDK, () => pronto && pronto(false));
      return {
        iniciar: () => espera.then((ok) => {
          const s = obterSdk();
          if (!ok || !s || typeof s.showBanner !== 'function') throw new Error('sem SDK');
        }),
        video: false,
        aoPausar: (aviso) => { avisoPausa = aviso; },
        anuncio: (tipo, comecou) => {
          if (tipo !== 'midgame') return Promise.resolve(false);
          return new Promise((resolve) => {
            comecouAtual = comecou;
            acabou = (ok) => {
              globalThis.clearTimeout(prazo);
              comecouAtual = null;
              acabou = null;
              resolve(ok);
            };
            // sem resposta nenhuma ate o video entrar (bloqueador no meio do caminho), o jogo nao fica
            // parado; o video que entrou desarma o prazo (SDK_GAME_PAUSE)
            prazo = globalThis.setTimeout(() => acabou && acabou(false), PRAZO_ANUNCIO);
            obterSdk().showBanner();
          });
        },
      };
    },
  });
}

/** Instancia do jogo na build da GameMonetize (o main.js importa como `poki`). */
export const poki = criarGameMonetize();

/** Plataforma desta build: sem o canto do botao da Poki no HUD. */
export const plataforma = 'gamemonetize';

// Yandex Games (yandex.com/dev/games/doc, requisitos de 2026-10-09). O SDK vem de "/sdk.js",
// relativo: o portal serve o arquivo na raiz do dominio do jogo (o item 1.7 proibe o endereco
// absoluto no zip). Fora da Yandex ele nao existe, YaGames fica indefinido e o jogo segue sem SDK.
// - 1.19.2 Game Ready: LoadingAPI.ready() no gameLoadingFinished;
// - 2.14 idioma: environment.i18n.lang, lido antes do jogo (o main.js le poki.idioma depois do init);
// - 4.7 e 1.3 som: game_api_pause/game_api_resume calam e pausam (inclusive no anuncio que o portal
//   mostra sozinho na abertura);
// - 4.4 intervalo: o do tempo de jogo (fim de evento do sem fim) so com o aviso de 2 s e o jogo
//   parado; os das pausas naturais dos modos, livres. Chamada cedo demais fecha com wasShown falso;
// - o premio do video so no onRewarded.
// A marcacao GameplayAPI e opcional e, se usada, tem que bater com a lista inteira deles (troca de
// aba inclusive): fica de fora. O progresso fica no armazenamento do navegador, que o 1.9 aceita para
// jogo sem compra e que o SDK torna confiavel no zip hospedado pela Yandex.
import { criarPortal } from '../portal.js';

/**
 * @param {{ obterSdk?: () => any, agendar?: any, cancelar?: any }} [opcoes]
 */
export function criarYandex({ obterSdk = () => /** @type {any} */ (globalThis).YaGames, agendar, cancelar } = {}) {
  /** @type {any} */
  let ysdk = null;
  return criarPortal({
    avisaComeco: true,
    intervalos: { evento: 'aviso', outros: true },
    agendar,
    cancelar,
    abrir: () => {
      const ya = obterSdk();
      if (!ya || typeof ya.init !== 'function') return null;
      return {
        iniciar: () => Promise.resolve(ya.init()).then((s) => {
          if (!s) throw new Error('sem SDK');
          ysdk = s;
        }),
        carregou: () => {
          const l = ysdk.features && ysdk.features.LoadingAPI;
          if (l && typeof l.ready === 'function') l.ready();
        },
        idioma: () => (ysdk && ysdk.environment && ysdk.environment.i18n ? ysdk.environment.i18n.lang : ''),
        aoPausar: (aviso) => {
          ysdk.on('game_api_pause', () => aviso(true));
          ysdk.on('game_api_resume', () => aviso(false));
        },
        anuncio: (tipo, comecou) => new Promise((resolve) => {
          if (tipo === 'midgame') {
            ysdk.adv.showFullscreenAdv({ callbacks: {
              onOpen: comecou,
              onClose: (/** @type {boolean} */ mostrou) => resolve(!!mostrou),
              onError: () => resolve(false),
              onOffline: () => resolve(false),
            } });
            return;
          }
          let premio = false;
          ysdk.adv.showRewardedVideo({ callbacks: {
            onOpen: comecou,
            onRewarded: () => { premio = true; },
            onClose: () => resolve(premio),
            onError: () => resolve(false),
          } });
        }),
      };
    },
  });
}

/** Instancia do jogo na build da Yandex (o main.js importa como `poki`). */
export const poki = criarYandex();

/** Plataforma desta build: sem o canto do botao da Poki no HUD. */
export const plataforma = 'yandex';

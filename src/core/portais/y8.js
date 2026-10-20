// Y8 (docs.y8.com, SDK 2-0). O script vem do CDN da Y8 com async; o SDK avisa que esta pronto pelo
// evento y8sdk.ready, e emitReadyEvent cobre o caso de ele ja ter chegado antes do ouvinte. appId e
// gameId sao da aba "SDK Initialization" do painel (o empacotar grava em IDS, de
// marketing/portais/ids.json); sem appId o jogo segue sem SDK.
// - pre-roll: a propria Y8 mostra, antes da interface do jogo;
// - intervalo so de clique (Play, Next, Retry, Continue): as diretrizes proibem o intersticial
//   automatico, mesmo no fim da partida. Ficam o "jogar de novo" e a troca de modo pelo menu; as pausas
//   naturais dos modos e o fim de evento do sem fim nao pedem anuncio. A frequencia (~180 s) e da Y8;
// - pausar e calar dentro do beforeAd, nunca antes: break pulado (limite de frequencia, sem anuncio)
//   nao chama beforeAd nem afterAd, e termina so no adBreakDone;
// - o premio so no adViewed; o idioma do subdominio (getPlatformLocale).
import { criarPortal, comPrazo } from '../portal.js';

/** Os ids do painel da Y8 (o tools/empacotar.mjs grava os de marketing/portais/ids.json). */
export const IDS = {};

/**
 * @param {{ obterSdk?: () => any, ids?: Record<string, string>, agendar?: any, cancelar?: any }} [opcoes]
 */
export function criarY8({ obterSdk = () => /** @type {any} */ (globalThis).y8, ids = IDS, agendar, cancelar } = {}) {
  /** @type {any} */
  let sdk = null;
  let idioma = '';
  return criarPortal({
    avisaComeco: true,
    intervalos: { evento: false, outros: false },
    agendar,
    cancelar,
    abrir: () => {
      if (!ids.appId || typeof window === 'undefined') return null;
      return {
        iniciar: async () => {
          const y8 = await new Promise((resolve) => {
            window.addEventListener('y8sdk.ready', () => resolve(obterSdk()), { once: true });
            const ja = obterSdk();
            if (ja && typeof ja.emitReadyEvent === 'function') ja.emitReadyEvent();
          });
          if (!y8 || typeof y8.sdk !== 'function') throw new Error('sem SDK');
          sdk = y8.sdk();
          sdk.init({ appId: ids.appId, autoLogin: true }, ids.gameId ? { gameId: ids.gameId, preloadAdBreaks: 'on', sound: 'on' } : undefined);
          idioma = String((await comPrazo(sdk.getPlatformLocale(), 1500, '')) || '');
        },
        idioma: () => idioma,
        video: !!ids.gameId,
        anuncio: ids.gameId ? (tipo, comecou) => new Promise((resolve) => {
          const midgame = tipo === 'midgame';
          let viu = false;
          let fim = false;
          const sai = (/** @type {boolean} */ ok) => {
            if (fim) return;
            fim = true;
            resolve(ok);
          };
          /** @type {any} */
          const pedido = {
            type: midgame ? 'next' : 'reward',
            name: midgame ? 'play-again' : 'reward',
            beforeAd: comecou,
            afterAd: () => sai(midgame || viu),
            adBreakDone: (/** @type {any} */ info) => sai(midgame ? !!info && info.breakStatus === 'viewed' : viu),
          };
          if (!midgame) {
            pedido.beforeReward = (/** @type {() => void} */ mostra) => mostra();
            pedido.adViewed = () => { viu = true; };
            pedido.adDismissed = () => {};
          }
          Promise.resolve(sdk.showAd(pedido)).catch(() => sai(false));
        }) : undefined,
      };
    },
  });
}

/** Instancia do jogo na build da Y8 (o main.js importa como `poki`). */
export const poki = criarY8();

/** Plataforma desta build: sem o canto do botao da Poki no HUD. */
export const plataforma = 'y8';

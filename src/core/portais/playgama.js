// Playgama, pelo Playgama Bridge v2 (wiki.playgama.com/playgama/bridge-sdk). O Bridge vem do CDN
// deles (o unico recurso de fora que o checklist aceita) e le playgama-bridge-config.json ao lado do
// index.html (o empacotar grava). Fora da Playgama ele cai na plataforma mock: anuncio falha sem
// lancar, e o jogo segue igual. O que o Bridge marca como obrigatorio:
// - platform.language antes do jogo e platform.sendMessage('game_ready') no gameLoadingFinished;
// - isAudioEnabled e os eventos de som e de pausa do portal;
// - o save pelo bridge.storage, nunca so pelo armazenamento do navegador: tudo o que o jogo guarda vai
//   numa chave do Bridge (nuvemSincrona, carregada no init);
// - o premio do video so no estado 'rewarded', nunca no 'closed'.
// Intervalo do tempo de jogo so com o aviso de 2 s, como na Yandex (as regras deles vem de la).
import { criarPortal, nuvemSincrona } from '../portal.js';

/** A chave do Bridge que guarda o save inteiro. */
const CHAVE = 'slime';

/**
 * @param {{ obterSdk?: () => any, agendar?: any, cancelar?: any }} [opcoes]
 */
export function criarPlaygama({ obterSdk = () => /** @type {any} */ (globalThis).bridge, agendar, cancelar } = {}) {
  return criarPortal({
    avisaComeco: true,
    intervalos: { evento: 'aviso', outros: true },
    agendar,
    cancelar,
    abrir: () => {
      const b = obterSdk();
      if (!b || typeof b.initialize !== 'function') return null;
      return {
        iniciar: () => b.initialize(),
        carregou: () => b.platform.sendMessage('game_ready'),
        idioma: () => b.platform.language || '',
        aoPausar: (aviso) => b.platform.on(b.EVENT_NAME.PAUSE_STATE_CHANGED, (/** @type {boolean} */ p) => aviso(!!p)),
        aoSom: (aviso) => {
          if (b.platform.isAudioEnabled === false) aviso(false);
          b.platform.on(b.EVENT_NAME.AUDIO_STATE_CHANGED, (/** @type {boolean} */ ligado) => aviso(!!ligado));
        },
        dados: async () => {
          const [bruto] = await b.storage.get([CHAVE]);
          const d = typeof bruto === 'string' ? JSON.parse(bruto) : bruto;
          return nuvemSincrona(d && typeof d === 'object' ? d : {}, (tudo) => b.storage.set([CHAVE], [JSON.stringify(tudo)]));
        },
        anuncio: (tipo, comecou) => {
          const ad = b.advertisement;
          const midgame = tipo === 'midgame';
          if (midgame ? ad.isInterstitialSupported === false : ad.isRewardedSupported === false) return Promise.resolve(false);
          const evento = midgame ? b.EVENT_NAME.INTERSTITIAL_STATE_CHANGED : b.EVENT_NAME.REWARDED_STATE_CHANGED;
          return new Promise((resolve) => {
            let premio = false;
            /** @param {string} estado */
            const ouvir = (estado) => {
              if (estado === 'opened') comecou();
              else if (estado === 'rewarded') premio = true;
              else if (estado === 'closed' || estado === 'failed') {
                try { ad.off(evento, ouvir); } catch { /* ignora */ }
                resolve(estado === 'closed' && (midgame || premio));
              }
            };
            ad.on(evento, ouvir);
            if (midgame) ad.showInterstitial();
            else ad.showRewarded();
          });
        },
      };
    },
  });
}

/** Instancia do jogo na build da Playgama (o main.js importa como `poki`). */
export const poki = criarPlaygama();

/** Plataforma desta build: sem o canto do botao da Poki no HUD. */
export const plataforma = 'playgama';

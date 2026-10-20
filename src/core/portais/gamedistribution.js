// GameDistribution (github.com/GameDistribution/GD-HTML5/wiki e as diretrizes de
// static.gamedistribution.com/developer/developers-guidelines.html). O SDK le window.GD_OPTIONS (o
// gameId do painel, gravado em IDS pelo empacotar, e o onEvent) quando carrega, entao ele entra por
// aqui, como no trecho oficial, e nao pelo HTML. Sem gameId o SDK nem carrega: a GD nao atribui a
// receita, e a build e so de teste.
// - pre-roll obrigatorio: um showAd() depois do SDK_READY, antes de o jogo abrir (preparar: o main.js
//   espera o fonteDados com a tela de carregamento na frente);
// - mid-roll nas pausas naturais (jogar de novo, troca de modo, pausas dos modos); o do fim de evento
//   do sem fim, que vem do tempo, fica de fora (as diretrizes pedem o anuncio nos botoes de fim de
//   fase). O SDK decide a frequencia (120 s) e rejeita o pedido cedo demais sem pausar nada;
// - SDK_GAME_PAUSE e SDK_GAME_START contam o comeco e o fim do video; fora de um anuncio nosso, pausam
//   e devolvem o jogo;
// - o premio do video so com SDK_REWARDED_WATCH_COMPLETE.
import { criarPortal, comPrazo, carregarScript } from '../portal.js';

/** Os ids do painel da GameDistribution (o tools/empacotar.mjs grava os de marketing/portais/ids.json). */
export const IDS = {};

const SDK = 'https://html5.api.gamedistribution.com/main.min.js';

/**
 * @param {{ obterSdk?: () => any, ids?: Record<string, string>, agendar?: any, cancelar?: any }} [opcoes]
 */
export function criarGameDistribution({ obterSdk = () => /** @type {any} */ (globalThis).gdsdk, ids = IDS, agendar, cancelar } = {}) {
  /** @type {null|((ok: boolean) => void)} */
  let pronto = null;
  /** @type {null|(() => void)} o video do anuncio em curso entrou */
  let comecouAtual = null;
  let emAnuncio = false;
  let premio = false;
  /** @type {null|((pausado: boolean) => void)} */
  let avisoPausa = null;

  /** @param {string} nome */
  function aoEvento(nome) {
    if (nome === 'SDK_READY') {
      if (pronto) pronto(true);
    } else if (nome === 'SDK_GAME_PAUSE') {
      if (emAnuncio) { if (comecouAtual) comecouAtual(); } else if (avisoPausa) avisoPausa(true);
    } else if (nome === 'SDK_GAME_START') {
      if (!emAnuncio && avisoPausa) avisoPausa(false);
    } else if (nome === 'SDK_REWARDED_WATCH_COMPLETE') {
      premio = true;
    }
  }

  /**
   * @param {'midgame'|'rewarded'} tipo
   * @param {() => void} comecou
   */
  async function anuncio(tipo, comecou) {
    const gd = obterSdk();
    if (!gd) return false;
    emAnuncio = true;
    comecouAtual = comecou;
    premio = false;
    try {
      if (tipo === 'midgame') {
        await gd.showAd('interstitial');
        return true;
      }
      await gd.preloadAd('rewarded');
      await gd.showAd('rewarded');
      // o evento do premio pode chegar logo depois da promessa
      if (!premio) await comPrazo(new Promise((r) => globalThis.setTimeout(r, 400)), 500, undefined);
      return premio;
    } catch {
      return false;
    } finally {
      emAnuncio = false;
      comecouAtual = null;
    }
  }

  return criarPortal({
    avisaComeco: true,
    intervalos: { evento: false, outros: true },
    agendar,
    cancelar,
    abrir: () => {
      if (!ids.gameId || typeof window === 'undefined') return null;
      const espera = new Promise((resolve) => { pronto = resolve; });
      /** @type {any} */ (window).GD_OPTIONS = { gameId: ids.gameId, onEvent: (/** @type {any} */ e) => aoEvento(e && e.name) };
      carregarScript('gamedistribution-jssdk', SDK, () => pronto && pronto(false));
      return {
        iniciar: () => espera.then((ok) => { if (!ok || !obterSdk()) throw new Error('sem SDK'); }),
        preparar: () => anuncio('midgame', () => {}),
        aoPausar: (aviso) => { avisoPausa = aviso; },
        anuncio,
      };
    },
  });
}

/** Instancia do jogo na build da GameDistribution (o main.js importa como `poki`). */
export const poki = criarGameDistribution();

/** Plataforma desta build: sem o canto do botao da Poki no HUD. */
export const plataforma = 'gamedistribution';

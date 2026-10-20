// GamePix (partners.gamepix.com/sdk/doc/javascript, SDK v3). O script e o primeiro do <head>, sem
// async. Nao ha init: o objeto GamePix ja esta la, e loaded() tem que vir antes de qualquer outro
// metodo - por isso ele sai no iniciar, antes do idioma e do save (o jogo abre logo depois).
// - pausa e som: o SDK chama GamePix.on.pause/resume/soundOn/soundOff (ou, sem eles, GamePix.pause...)
//   quando o site pausa, devolve, cala ou liga o som; o jogo congela e volta sozinho. Os ganchos ficam
//   declarados ANTES do loaded(), nas duas formas, e o que chegar antes do jogo ouvir fica guardado;
// - anuncio: interstitialAd() e rewardAd() resolvem com {success}; o SDK nao avisa quando o video
//   entra, entao o audio cala no pedido. Intervalo so entre fases e nunca por tempo (diretrizes de
//   envio): o do fim de evento do sem fim fica de fora;
// - save no armazenamento do SDK (sobrevive ao iframe no celular), com a mesma interface do navegador;
// - updateLevel no nivel novo e happyMoment nos marcos.
import { criarPortal } from '../portal.js';

/**
 * @param {{ obterSdk?: () => any, agendar?: any, cancelar?: any }} [opcoes]
 */
export function criarGamePix({ obterSdk = () => /** @type {any} */ (globalThis).GamePix, agendar, cancelar } = {}) {
  /** @type {string} */
  let idioma = '';
  /** @type {null|((pausado: boolean) => void)} */
  let avisoPausa = null;
  /** @type {null|((ligado: boolean) => void)} */
  let avisoSom = null;
  /** @type {null|boolean} a pausa que o SDK mandou antes do jogo ouvir (null: nada) */
  let pausaGuardada = null;
  /** @type {null|boolean} */
  let somGuardado = null;
  /** @param {boolean} p */
  const pausa = (p) => { if (avisoPausa) avisoPausa(p); else pausaGuardada = p; };
  /** @param {boolean} l */
  const som = (l) => { if (avisoSom) avisoSom(l); else somGuardado = l; };

  /** @param {any} gp */
  function declararGanchos(gp) {
    const g = { pause: () => pausa(true), resume: () => pausa(false), soundOn: () => som(true), soundOff: () => som(false) };
    Object.assign(gp, g);
    if (gp.on && typeof gp.on === 'object') Object.assign(gp.on, g);
  }
  return criarPortal({
    intervalos: { evento: false, outros: true },
    agendar,
    cancelar,
    abrir: () => {
      const gp = obterSdk();
      if (!gp || typeof gp.interstitialAd !== 'function') return null;
      return {
        iniciar: async () => {
          declararGanchos(gp);
          try { gp.loading(60); } catch { /* ignora */ }
          await gp.loaded();
          try { idioma = String(gp.lang() || ''); } catch { idioma = ''; }
        },
        idioma: () => idioma,
        aoPausar: (aviso) => {
          avisoPausa = aviso;
          if (pausaGuardada !== null) aviso(pausaGuardada);
        },
        aoSom: (aviso) => {
          avisoSom = aviso;
          if (somGuardado !== null) aviso(somGuardado);
        },
        dados: () => {
          const ls = gp.localStorage;
          return ls && typeof ls.getItem === 'function' ? ls : null;
        },
        medir: (categoria, oque, acao) => {
          const n = Number(oque);
          if (categoria === 'level' && acao === 'complete' && n > 0) gp.updateLevel(n);
        },
        festa: () => gp.happyMoment(),
        anuncio: (tipo) => Promise.resolve(tipo === 'midgame' ? gp.interstitialAd() : gp.rewardAd())
          .then((r) => !!(r && r.success === true)),
      };
    },
  });
}

/** Instancia do jogo na build da GamePix (o main.js importa como `poki`). */
export const poki = criarGamePix();

/** Plataforma desta build: sem o canto do botao da Poki no HUD. */
export const plataforma = 'gamepix';

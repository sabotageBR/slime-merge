// O que os portais de distribuicao (Y8, Playgama, Yandex, GameMonetize, GameDistribution e GamePix)
// tem em comum, com a interface do core/poki.js. Como o core/crazygames.js, reaproveita o criarPoki
// (prazos, fila ate o init, gameplay idempotente, rewarded so com true) com um adaptador que da ao SDK
// do portal a cara do PokiSDK; cada portal so diz como falar com o SDK dele (src/core/portais/*.js).
// So entra nas builds dos portais: o tools/empacotar.mjs --alvo=<portal> troca o import do main.js
// para src/core/portais/<portal>.js e tira os outros portais da build.
//
// O que vale para todos:
// - sem SDK (bloqueador, outro dominio, SDK que nao responde) o jogo segue igual, sem anuncios;
// - o anuncio pedido que comeca chama o onStart (o audio cala ai, se o portal avisa o comeco; senao,
//   no pedido); o rewarded so premia com true, que o portal so devolve com o video ate o fim;
// - onde o intervalo pode sair (intervaloNoJogo): as regras mudam de portal para portal (a Y8 so
//   aceita o que vem de um clique; a GamePix proibe o que vem do tempo; a Yandex aceita o do tempo
//   com o aviso de 2 s); o intervalo da navegacao pelo menu (trocar de modo) vale em todos;
// - a pausa do portal fora do anuncio (menu do site por cima, aba escondida pelo portal) cala o jogo
//   pelo mudo da plataforma e congela o jogo, e a volta do portal devolve os dois (onPausaPlataforma no
//   main.js); o som desligado no site cala do mesmo jeito;
// - a aba escondida abre o menu de pausa (pausaNaAba), e a volta da aba retoma sozinha: o som ja
//   parava, faltava a pausa se ver e o jogo voltar (o Testing Toolkit da GamePix pergunta se o jogo
//   pausou e voltou quando outra aba abriu);
// - o portal que tem armazenamento proprio devolve em fonteDados() um armazenamento sincrono
//   (getItem/setItem/removeItem); o que guarda na nuvem (Playgama) usa o nuvemSincrona daqui.

import { criarPoki } from './poki.js';

/** O init de um portal pode demorar mais que o da Poki (a Playgama le a config e o SDK do site). */
const PRAZO_INIT = 8000;
/** O que o portal faz antes do jogo abrir (o pre-roll da GameDistribution). */
const PRAZO_PREPARO = 200000;

/**
 * O SDK de um portal, pelo que o jogo precisa. So `iniciar` e obrigatorio.
 * @typedef {Object} Porta
 * @property {() => any} iniciar                             init do SDK; rejeitar = sem SDK
 * @property {() => any} [preparar]                          antes do jogo abrir (pre-roll), depois do init
 * @property {() => void} [carregou]                         o jogador ja pode interagir
 * @property {(jogando: boolean) => void} [jogando]          gameplay comecou ou parou
 * @property {(tipo: 'midgame'|'rewarded', comecou: () => void) => Promise<boolean>} [anuncio]
 *           true so no fim do video (rewarded: com premio); comecou() quando o video entra na tela
 * @property {boolean} [video]                               false: o portal nao tem video premiado
 * @property {() => string} [idioma]                         idioma do site ('' = o do navegador)
 * @property {() => any} [dados]                             armazenamento sincrono do portal, ou null
 * @property {() => void} [festa]                            marco do jogador
 * @property {(categoria: string, oque: string, acao: string) => void} [medir]   os measure do jogo
 * @property {(aviso: (pausado: boolean) => void) => void} [aoPausar]   o portal pausou/devolveu o jogo
 * @property {(aviso: (ligado: boolean) => void) => void} [aoSom]       o som do site ligou/desligou
 */

/**
 * Onde o intervalo comercial pode sair durante o jogo (o `origem` do evento `intervalo` dos modos):
 * true, false, ou 'aviso' (so depois de 2 s de aviso, com o jogo parado).
 * @typedef {Object} Intervalos
 * @property {boolean|'aviso'} evento   no sem fim, o fim de um evento (vem do tempo de jogo)
 * @property {boolean} outros           as pausas naturais dos outros modos (troca de pedido/fase)
 */

/**
 * @typedef {Object} OpcoesPortal
 * @property {() => Porta|null} abrir   a porta do SDK (null sem o script do portal)
 * @property {boolean} [avisaComeco]    o SDK avisa quando o video entra (o audio cala so ai)
 * @property {Intervalos} [intervalos]
 * @property {import('./poki.js').Prazos} [prazos]
 * @property {(fn: () => void, ms: number) => any} [agendar]
 * @property {(id: any) => void} [cancelar]
 */

/**
 * @param {OpcoesPortal} opcoes
 * @returns {import('./poki.js').Poki}
 */
export function criarPortal({ abrir, avisaComeco = false, intervalos = { evento: true, outros: true }, prazos, agendar, cancelar }) {
  /** @type {Porta|null} */
  let porta = null;
  let pausado = false;
  let mudo = false;

  /** A porta do SDK, aberta uma vez (null sem SDK, e tenta de novo na proxima). */
  function obter() {
    if (porta) return porta;
    try {
      porta = abrir() || null;
    } catch {
      porta = null;
    }
    return porta;
  }

  /** @param {any} fn @param {...any} args */
  function avisar(fn, ...args) {
    try {
      if (typeof fn === 'function') fn(...args);
    } catch {
      /* ignora */
    }
  }

  /** O mudo da plataforma: calado enquanto o portal pausa ou manda calar. */
  function aplicarMudo() {
    avisar(instancia.onMudoPlataforma, pausado || mudo);
  }

  /** @param {boolean} p */
  function pausaDoPortal(p) {
    // o anuncio que o proprio jogo pediu ja pausa e cala (onAdStart/onAdEnd)
    if (p && instancia.emAnuncio) return;
    if (p === pausado) return;
    pausado = p;
    aplicarMudo();
    avisar(instancia.onPausaPlataforma, p);
  }

  /**
   * @param {Porta} p
   * @param {'midgame'|'rewarded'} tipo
   * @param {any} aoIniciar
   */
  function pedir(p, tipo, aoIniciar) {
    if (typeof p.anuncio !== 'function') return Promise.resolve(false);
    const comecou = () => avisar(aoIniciar);
    return Promise.resolve(p.anuncio(tipo, comecou)).then((ok) => ok === true, () => false);
  }

  /** @param {Porta} p */
  function adaptar(p) {
    return {
      init: () => Promise.resolve(p.iniciar()).then(() => {
        try { if (typeof p.aoPausar === 'function') p.aoPausar(pausaDoPortal); } catch { /* ignora */ }
        try {
          if (typeof p.aoSom === 'function') {
            p.aoSom((ligado) => {
              if (mudo === !ligado) return;
              mudo = !ligado;
              aplicarMudo();
            });
          }
        } catch {
          /* ignora */
        }
      }),
      gameLoadingFinished: () => { if (typeof p.carregou === 'function') p.carregou(); },
      gameplayStart: () => { if (typeof p.jogando === 'function') p.jogando(true); },
      gameplayStop: () => { if (typeof p.jogando === 'function') p.jogando(false); },
      measure: (/** @type {string} */ c, /** @type {string} */ o, /** @type {string} */ a) => { if (typeof p.medir === 'function') p.medir(c, o, a); },
      commercialBreak: (/** @type {any} */ aoIniciar) => pedir(p, 'midgame', aoIniciar),
      // o criarPoki passa o onStart direto (sem tamanho) ou em { size, onStart }
      get rewardedBreak() {
        return p.video === false ? undefined : (/** @type {any} */ o) => pedir(p, 'rewarded', typeof o === 'function' ? o : o && o.onStart);
      },
    };
  }

  /** @type {any} */
  let adaptador = null;
  const instancia = criarPoki({
    obterSdk: () => {
      const p = obter();
      if (!p) return null;
      if (!adaptador) adaptador = adaptar(p);
      return adaptador;
    },
    prazos: { init: PRAZO_INIT, ...(prazos || {}) },
    agendar,
    cancelar,
    calarNoInicio: !avisaComeco,
  });
  Object.defineProperties(instancia, {
    temAnuncios: { get: () => instancia.sdkPronto && porta !== null && typeof porta.anuncio === 'function' },
    temVideo: { get: () => instancia.temAnuncios && !!porta && porta.video !== false },
    idioma: {
      get: () => {
        try {
          const l = porta && typeof porta.idioma === 'function' ? porta.idioma() : '';
          return typeof l === 'string' ? l : '';
        } catch {
          return '';
        }
      },
    },
  });
  instancia.intervaloNaNavegacao = true;
  instancia.pausaNaAba = true;
  /** @param {string} origem */
  instancia.intervaloNoJogo = (origem) => (origem === 'evento' ? intervalos.evento : intervalos.outros);
  instancia.fonteDados = async () => {
    await instancia.init();
    if (!porta || !instancia.sdkPronto) return null;
    // o pre-roll (GameDistribution) sai aqui: o main.js espera, com a tela de carregamento na frente
    if (typeof porta.preparar === 'function') {
      try { await comPrazo(porta.preparar(), PRAZO_PREPARO, undefined); } catch { /* segue */ }
    }
    if (typeof porta.dados !== 'function') return null;
    try {
      const d = await porta.dados();
      return d && typeof d.getItem === 'function' && typeof d.setItem === 'function' ? d : null;
    } catch {
      return null;
    }
  };
  instancia.festa = () => {
    if (!porta || !instancia.sdkPronto || typeof porta.festa !== 'function') return;
    try { porta.festa(); } catch { /* ignora */ }
  };
  return instancia;
}

/**
 * Espera uma promessa ate `ms`; estourado o prazo ou rejeitada, `reserva`. Nunca rejeita.
 * @param {any} promessa
 * @param {number} ms
 * @param {any} reserva
 * @returns {Promise<any>}
 */
export function comPrazo(promessa, ms, reserva) {
  return new Promise((resolve) => {
    let feito = false;
    const fim = (/** @type {any} */ v) => {
      if (feito) return;
      feito = true;
      globalThis.clearTimeout(id);
      resolve(v);
    };
    const id = globalThis.setTimeout(() => fim(reserva), ms);
    Promise.resolve(promessa).then(fim, () => fim(reserva));
  });
}

/**
 * Armazenamento sincrono por cima de uma nuvem assincrona (o bridge.storage da Playgama): o que veio
 * no init fica em memoria, cada gravacao vale na hora e vai para a nuvem num lote, `espera` ms
 * depois da ultima.
 * @param {Record<string, string>} inicial   o que a nuvem tinha (chave -> valor bruto)
 * @param {(tudo: Record<string, string>) => any} enviar   grava o conjunto inteiro na nuvem
 * @param {number} [espera]
 */
export function nuvemSincrona(inicial, enviar, espera = 1500) {
  /** @type {Record<string, string>} */
  const mem = { ...inicial };
  /** @type {any} */
  let id = null;
  const agendar = () => {
    if (id !== null) globalThis.clearTimeout(id);
    id = globalThis.setTimeout(() => {
      id = null;
      try { Promise.resolve(enviar({ ...mem })).catch(() => {}); } catch { /* ignora */ }
    }, espera);
  };
  return {
    /** @param {string} k */
    getItem: (k) => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null),
    /** @param {string} k @param {string} v */
    setItem: (k, v) => { mem[k] = String(v); agendar(); },
    /** @param {string} k */
    removeItem: (k) => { delete mem[k]; agendar(); },
  };
}

/**
 * Carrega o script de um SDK que le as opcoes da janela quando chega (GameDistribution e
 * GameMonetize: GD_OPTIONS e SDK_OPTIONS), uma vez so.
 * @param {string} id
 * @param {string} src
 * @param {() => void} aoFalhar
 */
export function carregarScript(id, src, aoFalhar) {
  if (typeof document === 'undefined' || document.getElementById(id)) return;
  const s = document.createElement('script');
  s.id = id;
  s.src = src;
  s.onerror = aoFalhar;
  document.head.appendChild(s);
}

// Infra de audio (WebAudio) do Slime Merge: barramentos, mudo, anuncio, aba oculta e os sons
// nomeados de sempre (pouso, fusao, explodir, yes...), que agora delegam as receitas de
// src/som/receitas.js. Os sons escolhidos no Estudio (src/som/sons.js) e a musica
// (src/som/musica.js) tocam por cima desta infra.
//
// Grafo: fontes -> barramento (sfx 0,85 | voz 0,75 | musica 0,3) -> compressor leve ->
// mestre (0,7: o volume percebido de antes, 0,6) -> saida.
// - O contexto so nasce no primeiro gesto (politica de autoplay): `iniciar()` dentro do
//   gesto, e os ouvintes de pointerup/keydown/touchend da janela tentam de novo se o
//   resume() falhar (iOS depois de video com som).
// - `pronto()`: promessa que resolve (true) quando o primeiro resume() resolveu com o contexto
//   rodando. Nada e agendado antes disso (nem com a aba oculta ou no anuncio).
// - Anuncio: `mudoParaAnuncio()` crava o mestre em 0 NA HORA (o sdkcheck le `calado` antes do
//   pedido), avisa quem ouve `aoAnuncio` (a musica derruba as notas agendadas) e suspende o
//   contexto 80 ms depois (padrao do hexadrop: o onStart do SDK pode nao chegar).
//   `voltarDoAnuncio()` devolve o mestre e retoma; cada retomada avisa `aoRetomar`.
// - `definirMudo` cala efeitos e falas (sfx e voz); a musica tem o proprio `definirMusica`.
// - `definirMudoPlataforma` cala tudo pelo mestre, por cima do mudo do jogador (o muteAudio da
//   CrazyGames); o mudo do jogador continua guardado por baixo.
// - Polifonia: no maximo MAX_VOZES sons ao mesmo tempo e `max` por chave (categoria).
// Contexto, janela e agendador injetaveis (testes no Node com contexto falso).

import { RECEITAS, tomSimples, ruidoSimples, bufferRuido } from '../som/receitas.js';

export { notaSemFim } from '../som/receitas.js';

/** Ganhos padrao dos barramentos e do mestre. */
export const GANHOS = Object.freeze({ sfx: 0.85, voz: 0.75, musica: 0.3, mestre: 0.7 });
/** Espera entre zerar o mestre e suspender o contexto no anuncio, ms. */
const ESPERA_SUSPENDER = 80;
/** Sons (receitas, tons, ruidos, buffers) tocando juntos, no maximo. */
const MAX_VOZES = 32;

/** @typedef {'sfx'|'voz'|'musica'} NomeBarramento */

/**
 * @typedef {object} OpTocar
 * @property {NomeBarramento} [destino] padrao 'sfx'
 * @property {number} [atraso] s a partir de agora
 * @property {string} [chave] chave da polifonia (a categoria)
 * @property {number} [max] quantos da mesma chave ao mesmo tempo (padrao 4)
 */

/**
 * @param {object} [opcoes]
 * @param {any} [opcoes.Contexto] construtor do AudioContext (padrao AudioContext/webkitAudioContext)
 * @param {any} [opcoes.janela] padrao globalThis.window; null desliga o destrave automatico
 * @param {(fn: () => void, ms: number) => any} [opcoes.agendar] padrao setTimeout
 * @param {Partial<typeof GANHOS>} [opcoes.ganhos]
 */
export function criarAudio(opcoes = {}) {
  const g = /** @type {any} */ (globalThis);
  const janela = opcoes.janela !== undefined ? opcoes.janela : g.window || null;
  const agendar = opcoes.agendar || ((/** @type {() => void} */ fn, /** @type {number} */ ms) => setTimeout(fn, ms));
  const ganhos = { ...GANHOS, ...(opcoes.ganhos || {}) };

  /** @type {any} */
  let ctx = null;
  /** @type {any} */
  let mestre = null;
  /** @type {any} */
  let compressor = null;
  /** @type {Record<NomeBarramento, any>} */
  const bus = { sfx: null, voz: null, musica: null };
  /** @type {any} */
  let ruidoBuf = null;
  let falhou = false;
  let destravado = false;
  let mudo = false;
  let musicaLigada = true;
  let mudoAnuncio = false;
  let abaOculta = false;
  let mudoPlataforma = false;
  let agendados = 0;
  /** @type {{chave: string, fim: number}[]} */
  let tocando = [];

  /** @type {(v: boolean) => void} */
  let resolverPronto = () => {};
  /** @type {Promise<boolean>} */
  const promessaPronto = new Promise((r) => { resolverPronto = r; });
  /** @type {Set<() => void>} */
  const aoRetomarFns = new Set();
  /** @type {Set<(emAnuncio: boolean) => void>} */
  const aoAnuncioFns = new Set();

  const alvoMestre = () => (mudoAnuncio || abaOculta || mudoPlataforma ? 0 : ganhos.mestre);
  /** @param {NomeBarramento} n */
  const alvoBus = (n) => (n === 'musica' ? (musicaLigada ? ganhos.musica : 0) : mudo ? 0 : ganhos[n]);

  function construtor() {
    if (opcoes.Contexto) return opcoes.Contexto;
    try { return g.AudioContext || g.webkitAudioContext || null; } catch { return null; }
  }

  /** Leva um AudioParam ao valor com uma constante de tempo curta. */
  function levar(param, valor, tau) {
    try { param.setTargetAtTime(valor, ctx.currentTime, tau); } catch { try { param.value = valor; } catch { /* ignora */ } }
  }

  /** Poe um AudioParam no valor na hora (o getter ja devolve o valor novo). */
  function cravar(param, valor) {
    const t = ctx.currentTime;
    try { param.cancelScheduledValues(t); } catch { /* ignora */ }
    try { param.value = valor; } catch { /* ignora */ }
    try { param.setValueAtTime(valor, t); } catch { /* ignora */ }
  }

  function garantirContexto() {
    if (ctx || falhou) return;
    const C = construtor();
    if (!C) { falhou = true; resolverPronto(false); return; }
    try {
      try { ctx = new C({ latencyHint: 'interactive' }); } catch { ctx = new C(); }
      mestre = ctx.createGain();
      mestre.gain.value = alvoMestre();
      mestre.connect(ctx.destination);
      // compressor leve: segura os picos quando muita coisa toca junto
      let entrada = mestre;
      try {
        compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -14;
        compressor.knee.value = 12;
        compressor.ratio.value = 3;
        compressor.attack.value = 0.004;
        compressor.release.value = 0.2;
        compressor.connect(mestre);
        entrada = compressor;
      } catch { compressor = null; }
      for (const n of /** @type {NomeBarramento[]} */ (['sfx', 'voz', 'musica'])) {
        bus[n] = ctx.createGain();
        bus[n].gain.value = alvoBus(n);
        bus[n].connect(entrada);
      }
      ruidoBuf = bufferRuido(ctx);
    } catch {
      ctx = null;
      mestre = null;
      compressor = null;
      bus.sfx = bus.voz = bus.musica = null;
      falhou = true;
      resolverPronto(false);
    }
  }

  function avisarRetomada() {
    for (const fn of Array.from(aoRetomarFns)) { try { fn(); } catch { /* ignora */ } }
  }

  /** @param {boolean} v */
  function avisarAnuncio(v) {
    for (const fn of Array.from(aoAnuncioFns)) { try { fn(v); } catch { /* ignora */ } }
  }

  /**
   * Pede resume(); quando resolver com o contexto rodando, marca destravado e reaplica o
   * mestre (fora de anuncio e de aba oculta). Reaplicar a cada retomada conserta um desmute
   * cujo resume() falhou: quem retomar depois (gesto, volta da aba) devolve o som.
   */
  function retomar() {
    if (!ctx) return;
    let p = null;
    try { p = ctx.resume(); } catch { p = null; }
    const concluir = () => {
      if (!ctx || ctx.state !== 'running') return;
      const primeira = !destravado;
      destravado = true;
      if (primeira) resolverPronto(true);
      if (mestre && !mudoAnuncio && !abaOculta) levar(mestre.gain, alvoMestre(), 0.03);
      avisarRetomada();
    };
    if (p && typeof p.then === 'function') p.then(concluir, () => {});
    else concluir();
  }

  function suspender() {
    if (!ctx || ctx.state !== 'running') return;
    try {
      const p = ctx.suspend();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch { /* ignora */ }
  }

  function iniciar() {
    garantirContexto();
    if (!ctx || mudoAnuncio || abaOculta) return;
    if (ctx.state !== 'running' || !destravado) retomar();
  }

  function podeTocar() {
    return !!ctx && destravado && !mudoAnuncio && !abaOculta && !mudoPlataforma && ctx.state === 'running';
  }

  /**
   * Reserva lugar na polifonia ate `fim` (tempo do contexto).
   * @param {string} chave
   * @param {number} fim
   * @param {number} max
   */
  function reservar(chave, fim, max) {
    const agora = ctx.currentTime;
    tocando = tocando.filter((x) => x.fim > agora);
    if (tocando.length >= MAX_VOZES) return false;
    let n = 0;
    for (const x of tocando) if (x.chave === chave) n++;
    if (n >= max) return false;
    tocando.push({ chave, fim });
    return true;
  }

  /**
   * Barramento pronto para tocar agora, ou null (sem contexto, mudo, anuncio...).
   * @param {NomeBarramento|undefined} nome
   */
  function saida(nome) {
    const n = nome === 'voz' || nome === 'musica' ? nome : 'sfx';
    if (!podeTocar()) return null;
    if (n !== 'musica' && mudo) return null;
    return bus[n];
  }

  // destrave automatico: outro gesto tenta de novo se o contexto nao esta rodando
  const aoGesto = () => {
    if (ctx && destravado && ctx.state === 'running') return;
    iniciar();
  };
  if (janela && typeof janela.addEventListener === 'function') {
    janela.addEventListener('pointerup', aoGesto, true);
    janela.addEventListener('keydown', aoGesto, true);
    janela.addEventListener('touchend', aoGesto, true);
  }

  /**
   * Toca uma receita (funcao ou nome em RECEITAS) agora (+ atraso) no barramento pedido.
   * @param {string|((v: any, t0: number, p?: any) => number)} receita
   * @param {any} [p]
   * @param {OpTocar} [op]
   * @returns {number} duracao agendada, s (0 se nao tocou)
   */
  function tocarReceita(receita, p = {}, op = {}) {
    const fn = typeof receita === 'function' ? receita : RECEITAS[receita];
    const destino = saida(op.destino);
    if (!fn || !destino) return 0;
    const t0 = ctx.currentTime + (op.atraso || 0) + 0.005;
    if (!reservar(op.chave || (typeof receita === 'string' ? receita : 'receita'), t0 + 0.08, op.max || 4)) return 0;
    try {
      const dur = fn({ ctx, destino, ruido: ruidoBuf }, t0, p) || 0;
      // a reserva fica com a duracao de verdade
      tocando[tocando.length - 1].fim = t0 + Math.max(0.05, dur);
      agendados++;
      return dur;
    } catch {
      return 0;
    }
  }

  const audio = {
    iniciar,
    /** Promessa: true quando o contexto rodou pela primeira vez; false sem WebAudio. */
    pronto: () => promessaPronto,
    podeTocar,
    /** Tempo do contexto, s (0 sem contexto). */
    agora: () => (ctx ? ctx.currentTime : 0),

    /**
     * Tom simples (a assinatura de sempre) e o barramento opcional no fim.
     * @param {number} f
     * @param {number} dur
     * @param {string} [tipo]
     * @param {number} [vol]
     * @param {number} [f2]
     * @param {number} [atraso]
     * @param {NomeBarramento} [destino]
     */
    tom(f, dur, tipo = 'sine', vol = 0.2, f2 = 0, atraso = 0, destino = 'sfx') {
      const d = saida(destino);
      if (!d) return;
      const t = ctx.currentTime + atraso;
      if (!reservar('tom', t + dur, 12)) return;
      try { tomSimples({ ctx, destino: d, ruido: ruidoBuf }, t, f, dur, tipo, vol, f2); agendados++; } catch { /* ignora */ }
    },

    /**
     * Ruido filtrado (a assinatura de sempre) e o barramento opcional no fim.
     * @param {number} dur
     * @param {number} freq
     * @param {number} q
     * @param {number} vol
     * @param {number} [atraso]
     * @param {string} [tipo]
     * @param {number} [f2]
     * @param {NomeBarramento} [destino]
     */
    ruido(dur, freq, q, vol, atraso = 0, tipo = 'bandpass', f2 = 0, destino = 'sfx') {
      const d = saida(destino);
      if (!d) return;
      const t = ctx.currentTime + atraso;
      if (!reservar('ruido', t + dur, 12)) return;
      try { ruidoSimples({ ctx, destino: d, ruido: ruidoBuf }, t, dur, freq, q, vol, tipo, f2); agendados++; } catch { /* ignora */ }
    },

    tocarReceita,

    /**
     * Toca um AudioBuffer (arquivo decodificado).
     * @param {AudioBuffer} buf
     * @param {{vol?: number, taxa?: number, inicio?: number, destino?: NomeBarramento, atraso?: number, chave?: string, max?: number}} [op]
     * @returns {number} duracao, s (0 se nao tocou)
     */
    vozBuffer(buf, op = {}) {
      const d = saida(op.destino || 'voz');
      if (!d || !buf) return 0;
      const taxa = op.taxa || 1;
      const inicio = Math.max(0, op.inicio || 0);
      const dur = Math.max(0.01, ((buf.duration || 0) - inicio) / taxa);
      const t = ctx.currentTime + (op.atraso || 0) + 0.005;
      if (!reservar(op.chave || 'buffer', t + dur, op.max || 4)) return 0;
      try {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        if (taxa !== 1 && src.playbackRate) src.playbackRate.setValueAtTime(taxa, t);
        const gg = ctx.createGain();
        const vol = op.vol === undefined ? 1 : op.vol;
        // 3 ms de rampa nas pontas: o MP3 cortado no meio nao estala
        gg.gain.setValueAtTime(0, t);
        gg.gain.linearRampToValueAtTime(vol, t + 0.003);
        gg.gain.setValueAtTime(vol, t + Math.max(0.004, dur - 0.004));
        gg.gain.linearRampToValueAtTime(0, t + dur);
        src.connect(gg);
        gg.connect(d);
        src.start(t, inicio);
        src.stop(t + dur + 0.02);
        agendados++;
        return dur;
      } catch {
        return 0;
      }
    },

    get ctx() { return ctx; },
    get mestre() { return mestre; },
    get sfx() { return bus.sfx; },
    get voz() { return bus.voz; },
    get musica() { return bus.musica; },
    get bufferRuido() { return ruidoBuf; },
    /** mudo do jogador: efeitos e falas (a musica tem o proprio botao) */
    get mudo() { return mudo; },
    get musicaLigada() { return musicaLigada; },
    get destravado() { return destravado; },
    /** mudo pedido pela plataforma (muteAudio da CrazyGames) */
    get mudoPlataforma() { return mudoPlataforma; },
    /** true se nada deve sair agora (anuncio, aba oculta, plataforma, ou mudo com a musica desligada) */
    get calado() { return mudoAnuncio || abaOculta || mudoPlataforma || (mudo && !musicaLigada); },

    /** @param {boolean} v cala efeitos e falas */
    definirMudo(v) {
      mudo = !!v;
      if (!ctx) return;
      levar(bus.sfx.gain, alvoBus('sfx'), 0.02);
      levar(bus.voz.gain, alvoBus('voz'), 0.02);
    },
    /** @param {boolean} v cala tudo (efeitos, falas e musica) pelo mestre; nao mexe no mudo do jogador */
    definirMudoPlataforma(v) {
      mudoPlataforma = !!v;
      if (ctx && mestre) levar(mestre.gain, alvoMestre(), 0.03);
    },
    /** @param {boolean} v liga ou desliga a musica */
    definirMusica(v) {
      musicaLigada = !!v;
      if (ctx) levar(bus.musica.gain, alvoBus('musica'), 0.05);
    },
    mudoParaAnuncio() {
      const antes = mudoAnuncio;
      mudoAnuncio = true;
      if (ctx && mestre) cravar(mestre.gain, 0);
      if (!antes) avisarAnuncio(true);
      if (!ctx) return;
      agendar(() => { if (mudoAnuncio) suspender(); }, ESPERA_SUSPENDER);
    },
    voltarDoAnuncio() {
      const antes = mudoAnuncio;
      mudoAnuncio = false;
      if (antes) avisarAnuncio(false);
      if (!ctx || !mestre) return;
      // o ganho volta ja: com o contexto parado a rampa so anda quando ele rodar
      levar(mestre.gain, alvoMestre(), 0.03);
      if (!abaOculta) retomar();
    },
    /** @param {boolean} oculta */
    pausarAba(oculta) {
      abaOculta = !!oculta;
      if (!ctx || !mestre) return;
      levar(mestre.gain, alvoMestre(), 0.02);
      if (abaOculta) suspender();
      else if (!mudoAnuncio) retomar();
    },
    /**
     * fn() a cada vez que o contexto volta a rodar (gesto, fim do anuncio, volta da aba).
     * @param {() => void} fn
     * @returns {() => void} desliga
     */
    aoRetomar(fn) {
      aoRetomarFns.add(fn);
      return () => { aoRetomarFns.delete(fn); };
    },
    /**
     * fn(true) logo depois de zerar o mestre no anuncio, fn(false) no fim dele.
     * @param {(emAnuncio: boolean) => void} fn
     * @returns {() => void} desliga
     */
    aoAnuncio(fn) {
      aoAnuncioFns.add(fn);
      return () => { aoAnuncioFns.delete(fn); };
    },
    /** Retrato para testes e depuracao. */
    estado() {
      let ganho = alvoMestre();
      try { if (mestre) ganho = mestre.gain.value; } catch { /* ignora */ }
      return {
        contexto: ctx ? String(ctx.state) : 'ausente',
        destravado,
        emAnuncio: mudoAnuncio,
        oculto: abaOculta,
        mudo,
        musica: musicaLigada,
        ganhoMestre: ganho,
        agendados,
        tocando: tocando.length,
      };
    },
    destruir() {
      if (janela && typeof janela.removeEventListener === 'function') {
        janela.removeEventListener('pointerup', aoGesto, true);
        janela.removeEventListener('keydown', aoGesto, true);
        janela.removeEventListener('touchend', aoGesto, true);
      }
      aoRetomarFns.clear();
      aoAnuncioFns.clear();
      if (ctx) {
        try {
          const p = ctx.close();
          if (p && typeof p.catch === 'function') p.catch(() => {});
        } catch { /* ignora */ }
      }
    },

    // ---------------------------------------------------- os sons nomeados de sempre
    /** pouso (curto, com um tom grave) */
    pouso() { tocarReceita('pousoLegado', {}, { chave: 'pouso' }); },
    /** fusao: a nota sobe sem fim com o combo (k) e um brilho a partir do 3o */
    fusao(k = 1) { tocarReceita('fusaoLegado', { k }, { chave: 'fusao' }); },
    completar() { tocarReceita('completar', {}, { chave: 'completar', max: 1 }); },
    /** jogada recusada */
    recusa() { tocarReceita('recusa', {}, { chave: 'recusa', max: 2 }); },
    /** chacoalhar */
    descartar() { tocarReceita('descartar', {}, { chave: 'descartar', max: 2 }); },
    explodir() { tocarReceita('explodir', {}, { chave: 'explodir', max: 3 }); },
    /** brilho curto que sobe (alargar, cinza que pegou cor no Duelo) */
    graduar() { tocarReceita('graduar', {}, { chave: 'graduar', max: 3 }); },
    febre() { tocarReceita('febre', {}, { chave: 'febre', max: 1 }); },
    /** fim de partida, curto e sem drama */
    fim() { tocarReceita('fimAtual', {}, { chave: 'fim', max: 1 }); },
    /** Fanfarra do "YES!" (mais longa com mundo = true) com pipocos de confete. */
    yes(mundo = false) { tocarReceita('yes', { mundo }, { chave: 'yes', max: 1 }); },
    tique() { tocarReceita('tique', {}, { chave: 'tique', max: 3 }); },
    critico() { tocarReceita('critico', {}, { chave: 'critico', max: 1 }); },
    // o missil da mira com as variantes do PADRAO (ate o main.js tocar pelo src/som/sons.js)
    /** o alvo chora (nivel: tom do slime) */
    choro(nivel = 4) { tocarReceita('choroBuaa', { nivel }, { chave: 'choro', max: 1, destino: 'voz' }); },
    missil() { tocarReceita('missilAssobio', {}, { chave: 'missil', max: 2 }); },
    /** gosma na tela */
    splat() { tocarReceita('splat', {}, { chave: 'splat', max: 2 }); },
  };
  return audio;
}

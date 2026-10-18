// Receitas de som sintetizado (WebAudio), para o Estudio de sons e para o jogo.
//
// Toda receita tem a assinatura (v, t0, p) => duracao em s, com v = { ctx, destino, ruido }:
// - ctx: AudioContext ao vivo, OfflineAudioContext (medir) ou o contexto falso dos testes;
// - destino: o no onde a receita liga (barramento sfx/voz, ou a saida do offline);
// - ruido: buffer de ruido branco pronto (opcional; sem ele, um buffer em cache por contexto).
// t0 e o instante do contexto em que o som comeca; p traz os parametros do evento (k do combo,
// forca do pouso, nivel do slime, i da contagem de gotas).
//
// Regras: nada de sorteio do sistema (o ruido e as palmas usam LCG com semente fixa: o mesmo som
// sempre); todo envelope nasce em 0,0001 e morre em 0,0001 (sem clique); toda fonte para
// sozinha logo depois do envelope.

import { falar } from './falas.js';

const MIN = 0.0001;
const PENTA = [0, 2, 4, 7, 9];

/** @param {number} m nota MIDI @returns {number} Hz */
export const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

/**
 * Nota MIDI do grau i da pentatonica maior sobre a base (i pode passar de 4: sobe a oitava).
 * @param {number} base MIDI da tonica
 * @param {number} i
 */
export function penta(base, i) {
  const o = Math.floor(i / 5);
  return base + 12 * o + PENTA[((i % 5) + 5) % 5];
}

/**
 * Gerador congruente linear com semente: [0, 1).
 * @param {number} semente
 */
export function lcg(semente) {
  let s = semente >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ------------------------------------------------------------------ ruido
const buffers = new WeakMap();

/**
 * Buffer de ruido branco deterministico (1 s, LCG), um por contexto.
 * @param {BaseAudioContext} ctx
 * @returns {AudioBuffer}
 */
export function bufferRuido(ctx) {
  let b = buffers.get(ctx);
  if (!b) {
    const n = Math.max(1, Math.floor(ctx.sampleRate));
    b = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = b.getChannelData(0);
    let s = 12345;
    for (let i = 0; i < n; i++) {
      s = (Math.imul(s, 1103515245) + 12345) >>> 0;
      d[i] = s / 2147483648 - 1;
    }
    buffers.set(ctx, b);
  }
  return b;
}

/** Desloca o comeco do ruido a cada uso (o mesmo ruido repetido soaria igual). */
let giro = 0;
function proximoDeslocamento() {
  giro = (giro + 1) % 997;
  return (giro * 0.2137) % 0.85;
}

/** @typedef {{ ctx: BaseAudioContext, destino: AudioNode, ruido?: AudioBuffer|null }} Via */

// ------------------------------------------------------------------ primitivas
/**
 * Envelope de ganho exponencial sem clique: MIN -> pico (ataque) -> segura -> MIN (queda).
 * @param {AudioParam} param
 * @returns {number} instante do fim
 */
function envelope(param, t0, pico, ataque, queda, segurar = 0) {
  const p = Math.max(MIN * 2, pico);
  param.setValueAtTime(MIN, t0);
  param.exponentialRampToValueAtTime(p, t0 + Math.max(0.001, ataque));
  if (segurar > 0) param.setValueAtTime(p, t0 + ataque + segurar);
  param.exponentialRampToValueAtTime(MIN, t0 + ataque + segurar + Math.max(0.005, queda));
  return t0 + ataque + segurar + queda;
}

/**
 * Curva de frequencia: valor no t0, glide exponencial ate f2, ou pontos [t relativo, Hz].
 * @param {AudioParam} param
 * @param {number} t0
 * @param {{f: number, f2?: number, glide?: number, curva?: [number, number][]}} o
 * @param {number} dur
 */
function curvaFreq(param, t0, o, dur) {
  if (o.curva && o.curva.length) {
    param.setValueAtTime(Math.max(20, o.curva[0][1]), t0 + o.curva[0][0]);
    for (let i = 1; i < o.curva.length; i++) param.exponentialRampToValueAtTime(Math.max(20, o.curva[i][1]), t0 + o.curva[i][0]);
    return;
  }
  param.setValueAtTime(Math.max(20, o.f), t0);
  if (o.f2 && o.f2 !== o.f) param.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + (o.glide || dur));
}

/**
 * @typedef {object} OpTom
 * @property {number} f Hz
 * @property {number} [f2] glide exponencial ate f2 em `glide` s (padrao: a duracao toda)
 * @property {number} [glide]
 * @property {[number, number][]} [curva] pontos [t relativo, Hz] (rampas exponenciais)
 * @property {number} [vol] pico (padrao 0,2)
 * @property {number} [ataque] s (padrao 0,005)
 * @property {number} [segurar] s
 * @property {number} [queda] s (padrao 0,2)
 * @property {OscillatorType} [tipo] padrao 'sine'
 * @property {any} [onda] PeriodicWave (vence o tipo)
 * @property {{f: number, prof: number, fim?: number, atraso?: number}} [vib] vibrato (prof em Hz)
 * @property {{f: number, prof: number}} [trem] tremolo (prof 0..0,5)
 * @property {{tipo?: BiquadFilterType, f: number, f2?: number, glide?: number, curva?: [number, number][], q?: number}} [filtro]
 * @property {AudioNode} [destino]
 */

/**
 * Oscilador com envelope (e glide, vibrato, tremolo e filtro opcionais).
 * @param {Via} v
 * @param {number} t0
 * @param {OpTom} o
 * @returns {number} instante do fim
 */
export function tom(v, t0, o) {
  const { ctx } = v;
  const ataque = o.ataque === undefined ? 0.005 : o.ataque;
  const queda = o.queda === undefined ? 0.2 : o.queda;
  const segurar = o.segurar || 0;
  const dur = ataque + segurar + queda;
  const osc = ctx.createOscillator();
  if (o.onda && typeof osc.setPeriodicWave === 'function') osc.setPeriodicWave(o.onda);
  else osc.type = o.tipo || 'sine';
  curvaFreq(osc.frequency, t0, o, dur);
  const g = ctx.createGain();
  const fim = envelope(g.gain, t0, o.vol === undefined ? 0.2 : o.vol, ataque, queda, segurar);
  /** @type {AudioNode} */
  let ultimo = osc;
  if (o.filtro) {
    const fl = ctx.createBiquadFilter();
    fl.type = o.filtro.tipo || 'lowpass';
    curvaFreq(fl.frequency, t0, o.filtro, dur);
    fl.Q.value = o.filtro.q === undefined ? 0.8 : o.filtro.q;
    ultimo.connect(fl);
    ultimo = fl;
  }
  ultimo.connect(g);
  let saida = /** @type {AudioNode} */ (g);
  const extras = [];
  if (o.vib) {
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(o.vib.f, t0);
    const lg = ctx.createGain();
    const atraso = o.vib.atraso || 0;
    lg.gain.setValueAtTime(atraso ? 0 : o.vib.prof, t0);
    if (atraso) lg.gain.linearRampToValueAtTime(o.vib.prof, t0 + atraso + 0.08);
    if (o.vib.fim !== undefined) lg.gain.linearRampToValueAtTime(o.vib.fim, t0 + dur);
    lfo.connect(lg);
    lg.connect(osc.frequency);
    extras.push(lfo);
  }
  if (o.trem) {
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(1 - o.trem.prof, t0);
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(o.trem.f, t0);
    const lg = ctx.createGain();
    lg.gain.setValueAtTime(o.trem.prof, t0);
    lfo.connect(lg);
    lg.connect(tg.gain);
    g.connect(tg);
    saida = tg;
    extras.push(lfo);
  }
  saida.connect(o.destino || v.destino);
  osc.start(t0);
  osc.stop(fim + 0.05);
  for (const x of extras) {
    x.start(t0);
    x.stop(fim + 0.05);
  }
  return fim;
}

/**
 * @typedef {object} OpSopro
 * @property {number} [f] centro do filtro, Hz (padrao 1200)
 * @property {number} [f2]
 * @property {number} [glide]
 * @property {[number, number][]} [curva]
 * @property {number} [q] padrao 1
 * @property {BiquadFilterType} [filtro] padrao 'bandpass'
 * @property {number} [vol] padrao 0,2
 * @property {number} [ataque] padrao 0,002
 * @property {number} [segurar]
 * @property {number} [queda] padrao 0,1
 * @property {number} [desloca] comeco no buffer de ruido, s (padrao: gira a cada uso)
 * @property {AudioNode} [destino]
 */

/**
 * Ruido filtrado com envelope.
 * @param {Via} v
 * @param {number} t0
 * @param {OpSopro} o
 * @returns {number} instante do fim
 */
export function sopro(v, t0, o) {
  const { ctx } = v;
  const ataque = o.ataque === undefined ? 0.002 : o.ataque;
  const queda = o.queda === undefined ? 0.1 : o.queda;
  const segurar = o.segurar || 0;
  const dur = ataque + segurar + queda;
  const src = ctx.createBufferSource();
  src.buffer = v.ruido || bufferRuido(ctx);
  src.loop = true;
  const fl = ctx.createBiquadFilter();
  fl.type = o.filtro || 'bandpass';
  curvaFreq(fl.frequency, t0, { f: o.f === undefined ? 1200 : o.f, f2: o.f2, glide: o.glide, curva: o.curva }, dur);
  fl.Q.value = o.q === undefined ? 1 : o.q;
  const g = ctx.createGain();
  const fim = envelope(g.gain, t0, o.vol === undefined ? 0.2 : o.vol, ataque, queda, segurar);
  src.connect(fl);
  fl.connect(g);
  g.connect(o.destino || v.destino);
  src.start(t0, o.desloca === undefined ? proximoDeslocamento() : o.desloca);
  src.stop(fim + 0.05);
  return fim;
}

// ------------------------------------------------------------------ o som de antes (legado)
/**
 * O `tom` de antes do Estudio (src/core/audio.js antigo), igual: ataque 12 ms, queda
 * exponencial ate dur, glide ate f2 na duracao toda.
 * @param {Via} v
 */
export function tomSimples(v, t, f, dur, tipo = 'sine', vol = 0.2, f2 = 0) {
  const { ctx } = v;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = /** @type {OscillatorType} */ (tipo);
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(MIN, t);
  g.gain.exponentialRampToValueAtTime(Math.max(MIN * 2, vol), t + 0.012);
  g.gain.exponentialRampToValueAtTime(MIN, t + dur);
  o.connect(g);
  g.connect(v.destino);
  o.start(t);
  o.stop(t + dur + 0.03);
  return t + dur;
}

/**
 * O `ruido` de antes, igual (com 2 ms de ataque no lugar do degrau, para nao estalar).
 * @param {Via} v
 */
export function ruidoSimples(v, t, dur, freq, q, vol, tipo = 'bandpass', f2 = 0) {
  const { ctx } = v;
  const s = ctx.createBufferSource();
  s.buffer = v.ruido || bufferRuido(ctx);
  s.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = /** @type {BiquadFilterType} */ (tipo);
  f.frequency.setValueAtTime(freq, t);
  if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + dur);
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(MIN, t);
  g.gain.exponentialRampToValueAtTime(Math.max(MIN * 2, vol), t + 0.002);
  g.gain.exponentialRampToValueAtTime(MIN, t + dur);
  s.connect(f);
  f.connect(g);
  g.connect(v.destino);
  s.start(t, proximoDeslocamento());
  s.stop(t + dur + 0.03);
  return t + dur;
}

const ESCALA_MAIOR = [0, 2, 4, 5, 7, 9, 11];
/** Oitava mais grave da nota sem fim: 660 / 8, entao a nota 1 tem o centro em 660 Hz. */
const BASE_SEM_FIM = 82.5;

/**
 * Nota k (1, 2, 3...) da escala sem fim: sete senos em oitavas com volume em sino em torno de
 * 660 Hz. Cada passo sobe um grau; k e k + 7 soam iguais (tom de Shepard, do memecats).
 * @returns {[number, number][]} [hz, peso]
 */
export function notaSemFim(k) {
  const g = Math.max(0, Math.floor(k) - 1);
  const pos = ESCALA_MAIOR[g % 7] / 12;
  const out = [];
  for (let i = 0; i < 7; i++) {
    const oit = i + pos;
    out.push([BASE_SEM_FIM * Math.pow(2, oit), Math.exp(-((oit - 3) ** 2) / 2)]);
  }
  return out;
}

// ------------------------------------------------------------------ instrumentos pequenos
/** Sino: parciais inarmonicos com quedas diferentes. */
function sino(v, t0, f, vol, dur = 1) {
  const parciais = [[1, 1, 1], [2, 0.45, 0.6], [2.76, 0.32, 0.45], [5.4, 0.14, 0.25], [8.93, 0.05, 0.12]];
  let fim = t0;
  for (const [r, g, d] of parciais) {
    if (f * r > 15000) continue;
    fim = Math.max(fim, tom(v, t0, { f: f * r, vol: vol * g, ataque: 0.002, queda: dur * d }));
  }
  return fim;
}

/** Lamina de caixinha de musica: fundamental, a oitava curta e um tique metalico. */
export function lamina(v, t0, f, vol, dur = 0.8) {
  const fim = tom(v, t0, { f, vol, ataque: 0.002, queda: dur });
  tom(v, t0, { f: f * 2, vol: vol * 0.22, ataque: 0.002, queda: dur * 0.35 });
  if (f * 5.95 < 15000) tom(v, t0, { f: f * 5.95, vol: vol * 0.05, ataque: 0.001, queda: 0.04 });
  return fim;
}

/** Marimba: fundamental redonda, o parcial de 3,93x curto e a batida da baqueta. */
export function marimba(v, t0, f, vol, dur = 0.5) {
  const fim = tom(v, t0, { f, vol, ataque: 0.003, queda: dur });
  tom(v, t0, { f: f * 3.93, vol: vol * 0.2, ataque: 0.002, queda: dur * 0.16 });
  sopro(v, t0, { f: Math.min(9000, f * 4), q: 2, vol: vol * 0.12, ataque: 0.001, queda: 0.012 });
  return fim;
}

/** Kalimba: fundamental e o parcial alto bem curto. */
function kalimba(v, t0, f, vol, dur = 0.45) {
  const fim = tom(v, t0, { f, vol, ataque: 0.002, queda: dur });
  tom(v, t0, { f: f * 5.4, vol: vol * 0.12, ataque: 0.001, queda: 0.06 });
  return fim;
}

/** Bolha: seno com chirp exponencial para cima (a bolha subindo e abrindo na superficie). */
function bolha(v, t0, f, vol, dur = 0.09, subida = 2) {
  return tom(v, t0, { f, f2: f * subida, glide: dur * 0.7, vol, ataque: 0.003, queda: dur });
}

/** Pingo d'agua: subida muito rapida e queda curta, com um eco fraco uma quinta acima. */
function pingo(v, t0, f, vol) {
  const fim = tom(v, t0, { f: f * 0.55, f2: f, glide: 0.022, vol, ataque: 0.002, queda: 0.085 });
  tom(v, t0 + 0.012, { f: f * 1.5, f2: f * 1.62, glide: 0.04, vol: vol * 0.18, ataque: 0.002, queda: 0.05 });
  return fim;
}

/** Plop: bolha que estoura para baixo (gosma caindo). */
function plop(v, t0, f, vol) {
  const fim = tom(v, t0, { f, f2: f * 0.55, glide: 0.06, vol, ataque: 0.002, queda: 0.07 });
  sopro(v, t0, { f: 900, filtro: 'lowpass', q: 0.7, vol: vol * 0.35, ataque: 0.001, queda: 0.03 });
  return fim;
}

/** Meleca: ruido em passa-banda (Q alto) varrendo para baixo e um seno grave com wobble. */
function meleca(v, t0, vol, dur = 0.24, f1 = 1200, f2 = 300, grave = 120) {
  const fim = sopro(v, t0, { f: f1, f2, q: 4.5, vol, ataque: 0.006, queda: dur });
  tom(v, t0, { f: grave * 1.25, f2: grave * 0.8, vol: vol * 0.7, ataque: 0.006, queda: dur * 0.85, vib: { f: 18, prof: grave * 0.18, fim: grave * 0.05 } });
  return fim;
}

/** Moedinha: duas notas brilhantes, a segunda mais alta e com cauda (si -> mi). */
function moedinha(v, t0, f1, f2, vol) {
  tom(v, t0, { f: f1, tipo: 'square', vol: vol * 0.3, ataque: 0.002, segurar: 0.06, queda: 0.012, filtro: { f: 5200, q: 0.5 } });
  tom(v, t0, { f: f1, vol: vol * 0.7, ataque: 0.002, segurar: 0.06, queda: 0.012 });
  tom(v, t0 + 0.07, { f: f2, tipo: 'square', vol: vol * 0.3, ataque: 0.002, queda: 0.38, filtro: { f: 6000, f2: 2500, q: 0.5 } });
  return tom(v, t0 + 0.07, { f: f2, vol: vol * 0.7, ataque: 0.002, queda: 0.42 });
}

/** Metal (fanfarra): duas serras desafinadas num passa-baixa que abre e fecha. */
function metal(v, t0, f, dur, vol) {
  let fim = t0;
  for (const d of [-0.0045, 0.0045]) {
    fim = tom(v, t0, {
      f: f * (1 + d), tipo: 'sawtooth', vol: vol * 0.5, ataque: 0.025, segurar: dur * 0.55, queda: dur * 0.45 + 0.08,
      filtro: { curva: [[0, 500], [0.045, 2800], [dur, 1300]], q: 1.4 },
      vib: dur > 0.3 ? { f: 5.5, prof: f * 0.006, atraso: 0.15 } : undefined,
    });
  }
  return fim;
}

/** Uma palma: ruido em passa-banda, ataque de 1 ms e queda de ~30 ms. */
function palma(v, t0, f, q, vol, desloca) {
  return sopro(v, t0, { f, q, vol, ataque: 0.0012, queda: 0.03, desloca });
}

/**
 * Plateia batendo palmas: cada pessoa no proprio ritmo (3,4 a 5,8 por segundo), timbre e hora
 * de parar; o LCG com semente fixa faz a mesma plateia sempre.
 * @param {Via} v
 */
function plateia(v, t0, { dur = 1.9, pessoas = 14, vol = 0.2, semente = 7 } = {}) {
  const r = lcg(semente);
  let fim = t0;
  for (let k = 0; k < pessoas; k++) {
    const ritmo = 3.4 + r() * 2.4;
    const fc = 800 + r() * 1700;
    const q = 0.8 + r() * 1.3;
    const peso = 0.55 + 0.45 * r();
    const para = dur * (0.55 + 0.45 * r());
    let t = r() * 0.16;
    while (t < para) {
      const entrada = Math.min(1, t / 0.12 + 0.25);
      const saida = t > para - 0.4 ? Math.max(0.15, (para - t) / 0.4) : 1;
      fim = Math.max(fim, palma(v, t0 + t, fc * (0.92 + 0.16 * r()), q, vol * peso * entrada * saida * (0.7 + 0.3 * r()), r() * 0.9));
      t += (1 / ritmo) * (0.85 + 0.3 * r());
    }
  }
  // o "corpo" da plateia: um sopro largo por baixo das palmas
  sopro(v, t0, { f: 1700, q: 0.45, vol: vol * 0.16, ataque: 0.15, segurar: dur * 0.45, queda: dur * 0.45, desloca: 0.3 });
  return fim;
}

/** Assobio de torcida (fiu-fiu). */
function fiufiu(v, t0, vol) {
  tom(v, t0, { curva: [[0, 1500], [0.12, 2700]], f: 1500, vol, ataque: 0.02, queda: 0.12, vib: { f: 9, prof: 20 } });
  return tom(v, t0 + 0.2, { curva: [[0, 1500], [0.16, 2800], [0.32, 1900]], f: 1500, vol, ataque: 0.02, segurar: 0.1, queda: 0.22, vib: { f: 9, prof: 25 } });
}

/** Fator de altura pelo nivel: 3 fica igual; os pequenos agudos e os grandes graves. */
const altura = (/** @type {any} */ p) => Math.pow(2, (3 - Math.max(1, Math.min(14, (p && p.nivel) || 3))) / 24);
/** Combo k >= 1. */
const comboK = (/** @type {any} */ p) => Math.max(1, Math.floor((p && p.k) || 1));

// ------------------------------------------------------------------ as receitas
/** @typedef {(v: Via, t0: number, p?: any) => number} Receita */

/** @type {Record<string, Receita>} */
const R = {
  // ---------------------------------------------------- legado (o som do jogo hoje)
  /** soltar: sopro curto (o de hoje) */
  gotaAtual(v, t) {
    return ruidoSimples(v, t, 0.08, 700, 1.2, 0.18) - t;
  },
  /** pouso: baque surdo que cresce com a forca (o de hoje) */
  pousoAtual(v, t, p = {}) {
    const f = p.forca || 1;
    return ruidoSimples(v, t, 0.06, 260 + 60 * f, 1, Math.min(0.35, 0.08 + 0.05 * f)) - t;
  },
  /** fusao: estalo, acorde da nota sem fim do combo e o splat grave (o de hoje) */
  fusaoAtual(v, t, p = {}) {
    ruidoSimples(v, t, 0.03, 3200, 4, 0.2);
    for (const [f, w] of notaSemFim(comboK(p))) if (w > 0.02) tomSimples(v, t + 0.005, f, 0.28, 'sine', 0.085 * w);
    ruidoSimples(v, t, 0.12, 500, 1.5, 0.25, 'lowpass', 200);
    return 0.3;
  },
  /** combo: o brilho em triangulo a partir do 3o (o de hoje) */
  comboBrilho(v, t, p = {}) {
    const k = comboK(p);
    if (k < 3) return 0;
    tomSimples(v, t + 0.03, notaSemFim(k)[4][0], 0.14, 'triangle', 0.035 * Math.min(1, (k - 2) / 6));
    return 0.17;
  },
  pousoLegado(v, t) {
    ruidoSimples(v, t, 0.07, 900, 1, 0.3);
    tomSimples(v, t, 220, 0.08, 'sine', 0.12, 120);
    return 0.08;
  },
  fusaoLegado(v, t, p = {}) {
    ruidoSimples(v, t, 0.03, 3200, 4, 0.2);
    const k = comboK(p);
    const nota = notaSemFim(k);
    for (const [f, w] of nota) if (w > 0.02) tomSimples(v, t + 0.005, f, 0.28, 'sine', 0.085 * w);
    if (k >= 3) tomSimples(v, t + 0.03, nota[4][0], 0.14, 'triangle', 0.035 * Math.min(1, (k - 2) / 6));
    return 0.29;
  },
  completar(v, t) {
    [523, 659, 784, 1046, 1318].forEach((f, i) => {
      tomSimples(v, t + i * 0.06, f, 0.3, 'triangle', 0.11);
      tomSimples(v, t + i * 0.06, f / 2, 0.22, 'square', 0.025);
    });
    ruidoSimples(v, t + 0.2, 0.4, 5000, 0.8, 0.12, 'highpass');
    return 0.6;
  },
  recusa(v, t) {
    tomSimples(v, t, 140, 0.14, 'square', 0.05, 90);
    ruidoSimples(v, t, 0.08, 300, 1, 0.2);
    return 0.14;
  },
  /** chacoalhar: varrida de ruido para baixo (o de hoje) */
  descartar(v, t) {
    return ruidoSimples(v, t, 0.22, 1400, 0.8, 0.25, 'bandpass', 300) - t;
  },
  /** estouro: explosao grave (o de hoje) */
  explodir(v, t) {
    ruidoSimples(v, t, 0.3, 500, 0.5, 0.6, 'lowpass', 80);
    tomSimples(v, t, 90, 0.25, 'sine', 0.25, 40);
    return 0.3;
  },
  /** alargar: brilho curto que sobe (o de hoje) */
  graduar(v, t) {
    return tomSimples(v, t, 1318, 0.12, 'sine', 0.05, 1760) - t;
  },
  febre(v, t) {
    tomSimples(v, t, 300, 0.6, 'sawtooth', 0.04, 1200);
    ruidoSimples(v, t, 0.6, 800, 0.5, 0.1, 'bandpass', 4000);
    [784, 988, 1175, 1568].forEach((f, i) => tomSimples(v, t + 0.3 + i * 0.07, f, 0.2, 'triangle', 0.08));
    return 0.71;
  },
  /** fim de partida: tres notas descendo (o de hoje) */
  fimAtual(v, t) {
    [392, 330, 262].forEach((f, i) => tomSimples(v, t + i * 0.12, f, 0.22, 'triangle', 0.07));
    return 0.46;
  },
  /** fanfarra do YES! com pipocos de confete (o de hoje: compra, missao, nivel novo) */
  yes(v, t, p = {}) {
    const notas = p.mundo ? [523, 659, 784, 1046, 1318] : [523, 659, 784, 1046];
    notas.forEach((f, i) => {
      tomSimples(v, t + i * 0.075, f, 0.26, 'triangle', 0.13);
      tomSimples(v, t + i * 0.075, f / 2, 0.2, 'square', 0.03);
    });
    for (let k = 0; k < 6; k++) ruidoSimples(v, t + 0.12 + k * 0.05, 0.05, 2500 + k * 300, 1.2, 0.25);
    ruidoSimples(v, t + 1.3, 0.3, 600, 0.6, 0.15, 'bandpass', 3000);
    return 1.6;
  },
  tique(v, t) {
    return tomSimples(v, t, 900, 0.05, 'triangle', 0.08, 1200) - t;
  },
  critico(v, t) {
    ruidoSimples(v, t, 0.35, 600, 0.6, 0.55, 'lowpass', 90);
    tomSimples(v, t, 110, 0.3, 'sawtooth', 0.08, 45);
    [1046, 1318, 1568].forEach((f, i) => tomSimples(v, t + 0.05 + i * 0.05, f, 0.18, 'triangle', 0.06));
    return 0.35;
  },

  // ---------------------------------------------------- soltar (a gota sai do bico)
  pingo(v, t, p) {
    const a = altura(p);
    sopro(v, t, { f: 4200, filtro: 'highpass', q: 0.7, vol: 0.035, ataque: 0.001, queda: 0.012 });
    return pingo(v, t, 1500 * a, 0.3) - t;
  },
  bolhaSobe(v, t, p) {
    const a = altura(p);
    bolha(v, t, 330 * a, 0.32, 0.11, 2.2);
    return tom(v, t, { f: 660 * a, f2: 1450 * a, glide: 0.08, vol: 0.035, tipo: 'triangle', ataque: 0.003, queda: 0.1 }) - t;
  },
  gloop(v, t, p) {
    const a = altura(p);
    return meleca(v, t, 0.34, 0.17, 950 * a, 330 * a, 190 * a) - t;
  },

  // ---------------------------------------------------- pouso
  splash(v, t, p = {}) {
    const f = Math.min(5, p.forca || 1);
    sopro(v, t, { f: 1300, f2: 3200, filtro: 'highpass', q: 0.6, vol: 0.1 + 0.035 * f, ataque: 0.003, queda: 0.15 });
    sopro(v, t, { f: 700, f2: 2400, q: 1, vol: 0.09 + 0.02 * f, ataque: 0.004, queda: 0.11 });
    pingo(v, t + 0.05, 2300, 0.07);
    return pingo(v, t + 0.095, 1800, 0.055) - t;
  },
  squish(v, t, p = {}) {
    const f = Math.min(5, p.forca || 1);
    return meleca(v, t, 0.22 + 0.035 * f, 0.2, 1200, 300, 110) - t;
  },
  gelatina(v, t, p = {}) {
    const f = Math.min(5, p.forca || 1);
    tom(v, t, { f: 120, f2: 60, vol: 0.12 + 0.03 * f, ataque: 0.003, queda: 0.08 });
    return tom(v, t, { f: 280, f2: 190, vol: 0.18, ataque: 0.006, queda: 0.26, vib: { f: 13, prof: 30, fim: 2 } }) - t;
  },

  // ---------------------------------------------------- fusao (k = combo)
  fusaoBolha(v, t, p) {
    const f = hz(penta(67, Math.min(comboK(p) - 1, 9)));
    bolha(v, t, f * 0.6, 0.28, 0.2, 1.7);
    tom(v, t + 0.06, { f: f * 2, f2: f * 2.7, glide: 0.03, vol: 0.06, ataque: 0.002, queda: 0.05 });
    sopro(v, t, { f: 600, f2: 180, filtro: 'lowpass', q: 1.2, vol: 0.14, ataque: 0.004, queda: 0.1 });
    return 0.22;
  },
  fusaoMeleca(v, t, p) {
    const f = hz(penta(60, Math.min(comboK(p) - 1, 9)));
    meleca(v, t, 0.3, 0.25, 1100, 280, 105);
    tom(v, t + 0.03, { f, tipo: 'triangle', vol: 0.09, ataque: 0.012, queda: 0.3, vib: { f: 18, prof: f * 0.012 } });
    return 0.33;
  },
  fusaoMarimba(v, t, p) {
    const f = hz(penta(72, Math.min(comboK(p) - 1, 9)));
    sopro(v, t, { f: 600, f2: 150, filtro: 'lowpass', q: 1.3, vol: 0.14, ataque: 0.004, queda: 0.1 });
    marimba(v, t, f, 0.26, 0.5);
    return 0.5;
  },

  // ---------------------------------------------------- combo (camada a partir do 2o)
  comboSininhos(v, t, p) {
    const k = comboK(p);
    if (k < 2) return 0;
    const n = Math.min(k, 6);
    let fim = t;
    for (let i = 0; i < n; i++) fim = sino(v, t + 0.04 + i * 0.055, hz(penta(84, i)), 0.05, 0.4);
    return fim - t;
  },
  comboSwoosh(v, t, p) {
    const k = comboK(p);
    if (k < 2) return 0;
    const alto = 1400 + 350 * Math.min(k, 8);
    sopro(v, t, { f: 500, f2: alto, q: 2.5, vol: 0.13, ataque: 0.12, queda: 0.16 });
    return tom(v, t, { f: 420, f2: 600 + 90 * Math.min(k, 8), vol: 0.035, tipo: 'triangle', ataque: 0.1, queda: 0.16 }) - t;
  },

  // ---------------------------------------------------- estouro
  estouroSplash(v, t) {
    sopro(v, t, { f: 900, f2: 2600, filtro: 'highpass', q: 0.5, vol: 0.28, ataque: 0.004, queda: 0.38 });
    sopro(v, t, { f: 400, f2: 2000, q: 0.9, vol: 0.2, ataque: 0.01, queda: 0.25 });
    tom(v, t, { f: 110, f2: 50, vol: 0.3, ataque: 0.003, queda: 0.2 });
    const r = lcg(11);
    let fim = t + 0.4;
    for (let i = 0; i < 6; i++) fim = Math.max(fim, pingo(v, t + 0.08 + r() * 0.42, 1000 + r() * 1600, 0.06 + 0.04 * r()));
    return fim - t;
  },
  estouroMeleca(v, t) {
    sopro(v, t, { f: 3200, f2: 280, filtro: 'lowpass', q: 0.8, vol: 0.42, ataque: 0.003, queda: 0.24 });
    meleca(v, t, 0.3, 0.34, 1000, 200, 95);
    tom(v, t, { f: 150, f2: 55, vol: 0.32, ataque: 0.003, queda: 0.24 });
    plop(v, t + 0.38, 820, 0.12);
    plop(v, t + 0.6, 700, 0.09);
    return plop(v, t + 0.86, 600, 0.07) - t;
  },
  estouroPop(v, t) {
    bolha(v, t, 230, 0.36, 0.14, 4);
    sopro(v, t + 0.05, { f: 3000, filtro: 'highpass', q: 0.7, vol: 0.14, ataque: 0.001, queda: 0.03 });
    let fim = t;
    [96, 100, 103, 108].forEach((m, i) => { fim = tom(v, t + 0.07 + i * 0.06, { f: hz(m), vol: 0.045, ataque: 0.002, queda: 0.22 }); });
    return fim - t;
  },

  // ---------------------------------------------------- missil (o reforco Mira)
  // O voo dura 0,45 s (MISSIL em src/jogo/soltar.js: do choro ao impacto); o impacto e o
  // estouro e a gosma na tela (splat), que tocam a parte.
  missilZuum(v, t) {
    const g = v.ctx.createGain();
    g.gain.setValueAtTime(MIN, t);
    g.gain.exponentialRampToValueAtTime(1, t + 0.36);
    g.gain.exponentialRampToValueAtTime(MIN, t + 0.5);
    g.connect(v.destino);
    const w = { ...v, destino: g };
    sopro(w, t, { curva: [[0, 320], [0.36, 2600], [0.5, 700]], q: 3, vol: 0.35, ataque: 0.02, segurar: 0.38, queda: 0.1 });
    tom(w, t, { curva: [[0, 180], [0.36, 580], [0.5, 300]], f: 180, tipo: 'sawtooth', vol: 0.06, ataque: 0.02, segurar: 0.38, queda: 0.1, filtro: { f: 1300, q: 0.7 } });
    return 0.52;
  },
  missilAssobio(v, t) {
    plop(v, t, 520, 0.22);
    return tom(v, t + 0.04, { f: 2400, f2: 760, glide: 0.41, vol: 0.13, ataque: 0.03, segurar: 0.34, queda: 0.07, vib: { f: 7, prof: 10 } }) - t;
  },
  missilLaser(v, t) {
    let fim = t;
    for (let i = 0; i < 3; i++) fim = tom(v, t + i * 0.13, { f: 1700 - i * 120, f2: 240, glide: 0.11, tipo: 'square', vol: 0.07, ataque: 0.002, queda: 0.12, filtro: { f: 4200, q: 0.6 } });
    return fim - t;
  },

  // ---------------------------------------------------- choro (o slime alvo chora)
  choroBuaa(v, t, p = {}) {
    return falar(v, t, 'buaa', { nivel: p.nivel || 4, vol: 0.34 });
  },
  choroSolucos(v, t, p = {}) {
    return falar(v, t, 'solucos', { nivel: p.nivel || 4, vol: 0.34 });
  },
  choroGemido(v, t, p) {
    const a = altura(p);
    tom(v, t, { curva: [[0, 820 * a], [0.12, 1180 * a], [0.36, 760 * a], [0.46, 1020 * a], [0.75, 600 * a]], f: 820 * a, tipo: 'triangle', vol: 0.03, ataque: 0.03, segurar: 0.5, queda: 0.22 });
    return tom(v, t, { curva: [[0, 820 * a], [0.12, 1180 * a], [0.36, 760 * a], [0.46, 1020 * a], [0.75, 600 * a]], f: 820 * a, vol: 0.13, ataque: 0.03, segurar: 0.5, queda: 0.22, vib: { f: 7, prof: 22 * a } }) - t;
  },

  // ---------------------------------------------------- splat (gosma na tela)
  splat(v, t) {
    sopro(v, t, { f: 4200, f2: 480, filtro: 'lowpass', q: 0.9, vol: 0.42, ataque: 0.002, queda: 0.09 });
    meleca(v, t + 0.01, 0.24, 0.22, 950, 240, 90);
    tom(v, t, { f: 140, f2: 60, vol: 0.3, ataque: 0.002, queda: 0.1 });
    return 0.25;
  },
  splatEscorre(v, t) {
    sopro(v, t, { f: 3000, f2: 420, filtro: 'lowpass', q: 0.8, vol: 0.28, ataque: 0.002, queda: 0.08 });
    sopro(v, t + 0.05, { f: 700, f2: 380, q: 6, vol: 0.06, ataque: 0.1, segurar: 0.4, queda: 0.35 });
    pingo(v, t + 0.3, 1250, 0.1);
    pingo(v, t + 0.56, 1050, 0.085);
    return pingo(v, t + 0.86, 900, 0.07) - t;
  },
  splatVentosa(v, t) {
    tom(v, t, { f: 330, f2: 90, glide: 0.1, vol: 0.32, ataque: 0.002, queda: 0.12 });
    sopro(v, t + 0.015, { f: 500, f2: 1800, q: 6, vol: 0.13, ataque: 0.01, queda: 0.1 });
    return tom(v, t + 0.16, { f: 600, f2: 1150, glide: 0.04, vol: 0.12, ataque: 0.002, queda: 0.06 }) + 0.01 - t;
  },

  // ---------------------------------------------------- trocar
  trocarSwoosh(v, t) {
    return sopro(v, t, { f: 600, f2: 2800, q: 1.8, vol: 0.22, ataque: 0.08, queda: 0.14 }) - t;
  },
  trocarBolhas(v, t) {
    bolha(v, t, 360, 0.24, 0.08, 2);
    return bolha(v, t + 0.085, 620, 0.2, 0.08, 2) - t;
  },
  trocarPluc(v, t) {
    kalimba(v, t, hz(79), 0.2, 0.3);
    return kalimba(v, t + 0.07, hz(84), 0.2, 0.35) - t;
  },

  // ---------------------------------------------------- chacoalhar
  chocalho(v, t) {
    let fim = t;
    for (let i = 0; i < 7; i++) fim = sopro(v, t + i * 0.052, { f: 4600, q: 1.4, vol: i % 2 ? 0.11 : 0.18, ataque: 0.003, queda: 0.042 });
    return fim - t;
  },
  gelatinaTreme(v, t) {
    return tom(v, t, { f: 175, f2: 150, vol: 0.26, ataque: 0.01, queda: 0.6, vib: { f: 9, prof: 28, fim: 4 }, trem: { f: 9, prof: 0.45 } }) - t;
  },
  agitarAgua(v, t) {
    sopro(v, t, { curva: [[0, 480], [0.14, 1100], [0.28, 560]], q: 3, vol: 0.18, ataque: 0.06, queda: 0.22 });
    sopro(v, t + 0.27, { curva: [[0, 560], [0.14, 1250], [0.3, 600]], q: 3, vol: 0.16, ataque: 0.06, queda: 0.24 });
    bolha(v, t + 0.2, 520, 0.08, 0.07, 1.8);
    return bolha(v, t + 0.42, 700, 0.07, 0.07, 1.8) + 0.1 - t;
  },

  // ---------------------------------------------------- alargar
  esticar(v, t) {
    return tom(v, t, { f: 140, f2: 280, glide: 0.42, tipo: 'sawtooth', vol: 0.09, ataque: 0.03, segurar: 0.3, queda: 0.14, filtro: { f: 500, f2: 1700, glide: 0.42, q: 5 }, vib: { f: 22, prof: 5 } }) - t;
  },
  vidro(v, t) {
    sopro(v, t, { f: 1500, f2: 5000, filtro: 'highpass', q: 0.6, vol: 0.05, ataque: 0.06, queda: 0.12 });
    let fim = t;
    for (const [f, g, d] of [[2637, 0.07, 0.7], [4390, 0.035, 0.4], [6110, 0.018, 0.25]]) fim = Math.max(fim, tom(v, t + 0.08, { f, vol: g, ataque: 0.002, queda: d }));
    return fim - t;
  },

  // ---------------------------------------------------- alvo (armar um reforco de alvo)
  alvoMira(v, t) {
    tom(v, t, { f: 1320, vol: 0.1, ataque: 0.003, segurar: 0.04, queda: 0.03 });
    tom(v, t, { f: 1320, tipo: 'triangle', vol: 0.04, ataque: 0.003, segurar: 0.04, queda: 0.03 });
    tom(v, t + 0.1, { f: 1760, vol: 0.1, ataque: 0.003, segurar: 0.06, queda: 0.05 });
    return tom(v, t + 0.1, { f: 1760, tipo: 'triangle', vol: 0.04, ataque: 0.003, segurar: 0.06, queda: 0.05 }) - t;
  },
  alvoRadar(v, t) {
    tom(v, t, { f: 1180, f2: 1120, vol: 0.15, ataque: 0.004, queda: 0.6 });
    return tom(v, t + 0.24, { f: 1180, f2: 1120, vol: 0.045, ataque: 0.004, queda: 0.5 }) - t;
  },
  alvoClique(v, t) {
    sopro(v, t, { f: 2600, q: 2, vol: 0.28, ataque: 0.001, queda: 0.016 });
    tom(v, t + 0.07, { f: 320, f2: 150, vol: 0.12, ataque: 0.001, queda: 0.035 });
    return sopro(v, t + 0.07, { f: 1800, q: 3, vol: 0.32, ataque: 0.001, queda: 0.022 }) - t;
  },

  // ---------------------------------------------------- ataque (Duelo: gosma para o rival)
  ataqueChuva(v, t) {
    let fim = t;
    [0, 0.09, 0.16, 0.26, 0.33, 0.43].forEach((d, i) => { fim = plop(v, t + d, 720 - i * 50, 0.15); });
    return fim - t;
  },
  ataqueNuvem(v, t) {
    sopro(v, t, { f: 220, filtro: 'lowpass', q: 0.9, vol: 0.3, ataque: 0.12, segurar: 0.2, queda: 0.4 });
    plop(v, t + 0.35, 640, 0.13);
    plop(v, t + 0.47, 560, 0.12);
    return plop(v, t + 0.6, 500, 0.11) - t + 0.12;
  },
  ataqueSwoosh(v, t) {
    sopro(v, t, { f: 500, f2: 2400, q: 2, vol: 0.18, ataque: 0.1, queda: 0.12 });
    sopro(v, t + 0.24, { f: 3000, f2: 420, filtro: 'lowpass', q: 0.9, vol: 0.32, ataque: 0.002, queda: 0.08 });
    return meleca(v, t + 0.25, 0.16, 0.18, 950, 260, 95) - t;
  },

  // ---------------------------------------------------- interface (botoes)
  botaoPop(v, t) {
    sopro(v, t, { f: 3500, q: 1, vol: 0.05, ataque: 0.001, queda: 0.006 });
    return tom(v, t, { f: 1050, f2: 620, glide: 0.04, vol: 0.17, ataque: 0.002, queda: 0.05 }) - t;
  },
  botaoBolha(v, t) {
    return bolha(v, t, 520, 0.16, 0.06, 2.1) - t;
  },

  // ---------------------------------------------------- gotas (moeda: contagem no fim)
  moedinha(v, t, p = {}) {
    const s = Math.pow(2, Math.min(p.i || 0, 12) / 24);
    return moedinha(v, t, 988 * s, 1319 * s, 0.17) - t;
  },
  pingoGota(v, t, p = {}) {
    return pingo(v, t, hz(penta(84, Math.min(p.i || 0, 9))), 0.22) - t;
  },
  tilim(v, t, p = {}) {
    return sino(v, t, hz(penta(88, Math.min(p.i || 0, 7))), 0.065, 0.3) - t;
  },

  // ---------------------------------------------------- compra
  registradora(v, t) {
    sopro(v, t, { f: 3400, q: 1.2, vol: 0.24, ataque: 0.002, queda: 0.06 });
    sopro(v, t, { f: 6500, filtro: 'highpass', q: 0.7, vol: 0.07, ataque: 0.002, queda: 0.05 });
    tom(v, t, { f: 190, f2: 90, vol: 0.2, ataque: 0.002, queda: 0.06 });
    sino(v, t + 0.085, 2093, 0.08, 0.9);
    const fim = sino(v, t + 0.1, 2637, 0.06, 0.8);
    const r = lcg(5);
    for (let i = 0; i < 4; i++) sopro(v, t + 0.12 + r() * 0.2, { f: 7500, filtro: 'highpass', q: 0.8, vol: 0.05, ataque: 0.001, queda: 0.02 });
    return fim - t;
  },
  moedas(v, t) {
    let fim = t;
    for (let i = 0; i < 5; i++) {
      const s = Math.pow(2, (i % 3) / 24);
      fim = moedinha(v, t + i * 0.065, 988 * s, 1319 * s, 0.1 - i * 0.008);
    }
    return sino(v, fim - 0.25, 2637, 0.05, 0.6) - t;
  },

  // ---------------------------------------------------- nivel novo (conquista)
  harpa(v, t) {
    let fim = t;
    for (let i = 0; i < 12; i++) {
      const f = hz(penta(72, i));
      tom(v, t + i * 0.03, { f: f * 2, vol: 0.02, ataque: 0.003, queda: 0.25 });
      fim = tom(v, t + i * 0.03, { f, tipo: 'triangle', vol: 0.085, ataque: 0.003, queda: 0.55 });
    }
    const r = lcg(3);
    for (let i = 0; i < 6; i++) tom(v, t + 0.3 + i * 0.05, { f: hz(penta(96, Math.floor(r() * 5))), vol: 0.03, ataque: 0.002, queda: 0.22 });
    return fim - t;
  },
  fanfarra(v, t) {
    metal(v, t, hz(67), 0.11, 0.16);
    metal(v, t + 0.13, hz(72), 0.11, 0.16);
    metal(v, t + 0.26, hz(76), 0.11, 0.16);
    metal(v, t + 0.39, hz(76), 0.6, 0.13);
    const fim = metal(v, t + 0.39, hz(79), 0.6, 0.16);
    tom(v, t + 0.39, { f: hz(48), f2: hz(48) * 0.98, vol: 0.18, ataque: 0.005, queda: 0.35 });
    return fim - t;
  },
  bolhasMagicas(v, t) {
    let fim = t;
    for (let i = 0; i < 8; i++) fim = bolha(v, t + i * 0.055, hz(penta(67, i)), 0.16, 0.12, 1.6);
    for (let i = 0; i < 4; i++) tom(v, t + 0.42 + i * 0.045, { f: hz(penta(96, i)), vol: 0.03, ataque: 0.002, queda: 0.3 });
    return fim + 0.25 - t;
  },

  // ---------------------------------------------------- missao
  sinos(v, t) {
    sino(v, t, hz(88), 0.08, 1.1);
    sino(v, t + 0.09, hz(91), 0.07, 1.1);
    return sino(v, t + 0.18, hz(96), 0.075, 1.3) - t;
  },
  carimbo(v, t) {
    tom(v, t, { f: 170, f2: 70, vol: 0.38, ataque: 0.002, queda: 0.12 });
    sopro(v, t, { f: 900, filtro: 'lowpass', q: 0.8, vol: 0.25, ataque: 0.001, queda: 0.05 });
    const fim = sino(v, t + 0.13, hz(96), 0.07, 0.8);
    tom(v, t + 0.2, { f: hz(103), vol: 0.025, ataque: 0.002, queda: 0.25 });
    return fim - t;
  },
  tada(v, t) {
    metal(v, t, hz(72), 0.1, 0.16);
    metal(v, t + 0.12, hz(76), 0.55, 0.12);
    const fim = metal(v, t + 0.12, hz(79), 0.55, 0.16);
    return fim - t;
  },

  // ---------------------------------------------------- palmas (recorde e vitoria)
  plateia(v, t) {
    return plateia(v, t, { dur: 1.9, pessoas: 14, vol: 0.2, semente: 7 }) - t;
  },
  palmasPoucas(v, t) {
    const fim = plateia(v, t, { dur: 1.2, pessoas: 5, vol: 0.24, semente: 21 });
    return Math.max(fim, fiufiu(v, t + 0.25, 0.07)) - t;
  },
  palmasFanfarra(v, t) {
    const fim = plateia(v, t + 0.15, { dur: 1.6, pessoas: 11, vol: 0.17, semente: 13 });
    R.tada(v, t);
    return fim - t;
  },

  // ---------------------------------------------------- fim de partida
  trombone(v, t) {
    const notas = [[62, 0.36], [61, 0.36], [60, 0.36], [59, 1.0]];
    let d = 0;
    let fim = t;
    for (const [m, dur] of notas) {
      const longa = dur > 0.5;
      fim = tom(v, t + d, {
        f: hz(m), tipo: 'sawtooth', vol: 0.12, ataque: 0.04, segurar: dur * 0.6, queda: dur * 0.4,
        filtro: { curva: longa ? [[0, 380], [0.1, 1300], [0.35, 700], [0.55, 1150], [0.75, 650], [dur, 450]] : [[0, 380], [0.1, 1300], [dur, 600]], q: 3.5 },
        vib: longa ? { f: 5.5, prof: 4, atraso: 0.18 } : undefined,
      });
      d += dur + 0.03;
    }
    return fim - t;
  },
  murcho(v, t) {
    sopro(v, t, { f: 1700, f2: 420, q: 2, vol: 0.06, ataque: 0.03, segurar: 0.6, queda: 0.3 });
    return tom(v, t, { f: 560, f2: 130, glide: 0.95, vol: 0.18, ataque: 0.02, segurar: 0.65, queda: 0.3, vib: { f: 11, prof: 22, fim: 8 }, trem: { f: 11, prof: 0.3 } }) - t;
  },
  caixinhaTriste(v, t) {
    let fim = t;
    [[76, 0], [74, 0.17], [72, 0.34], [69, 0.51], [67, 0.72]].forEach(([m, d], i) => { fim = lamina(v, t + d, hz(m), 0.13, i === 4 ? 1.1 : 0.6); });
    return fim - t;
  },
};

/**
 * Calibragem de volume (medida no Chrome com o __estudio.medirTudo() de modelos/sons.html):
 * as variantes de uma categoria ficam no mesmo RMS, e os sons frequentes (soltar, pouso,
 * botoes) mais baixos que as conquistas. As receitas "de hoje" ficam como estao (1).
 * @type {Record<string, number>}
 */
export const CALIBRAGEM = {
  pingo: 0.53, bolhaSobe: 0.5, gloop: 0.63,
  squish: 0.58, gelatina: 0.56,
  fusaoBolha: 0.68, fusaoMarimba: 0.72,
  comboSininhos: 0.82, comboSwoosh: 1.7,
  missilZuum: 2, missilAssobio: 0.48, missilLaser: 2.1,
  choroBuaa: 0.63, choroSolucos: 1.68, choroGemido: 0.72,
  splatEscorre: 2.2,
  trocarSwoosh: 2.5, trocarBolhas: 0.75, trocarPluc: 0.67,
  chocalho: 1.74, gelatinaTreme: 0.84, agitarAgua: 2,
  esticar: 0.48, vidro: 1.15,
  alvoMira: 0.55, alvoClique: 1.5,
  botaoPop: 0.78, botaoBolha: 0.82,
  moedinha: 0.58, pingoGota: 0.8, tilim: 1.9,
  moedas: 0.74,
  harpa: 0.9, fanfarra: 0.69,
  tada: 0.68,
  plateia: 2, palmasPoucas: 1.4,
  trombone: 0.7, murcho: 0.5,
};

/**
 * A receita com o ganho da calibragem (um no de ganho na frente do destino).
 * @param {string} nome
 * @param {Receita} fn
 * @returns {Receita}
 */
function calibrada(nome, fn) {
  const g = CALIBRAGEM[nome];
  if (!g || g === 1) return fn;
  return (v, t0, p) => {
    const n = v.ctx.createGain();
    n.gain.value = g;
    n.connect(v.destino);
    return fn({ ...v, destino: n }, t0, p);
  };
}

/** Todas as receitas por nome (ja calibradas). */
export const RECEITAS = Object.freeze(Object.fromEntries(Object.entries(R).map(([k, fn]) => [k, calibrada(k, fn)])));

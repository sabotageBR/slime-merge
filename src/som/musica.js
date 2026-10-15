// Musica de fundo: o agendador (porte do relojoeiro) tocando as pecas de src/som/pecas.js no
// barramento `musica` do core/audio.
//
// - agenda as notas com antecedencia (0,3 s) num laco de setTimeout de 100 ms, no tempo do
//   contexto de audio (nada preso ao quadro);
// - so comeca depois do primeiro gesto (espera o contexto rodar) e entra em fade-in de 4 s;
// - para na hora no comeco do anuncio (audio.aoAnuncio, junto com o mestre a zero) e derruba
//   as notas ja agendadas; volta no aoRetomar, do comeco da frase de 4 compassos, com fade;
// - com a musica desligada (audio.definirMusica(false)) cai em fade-out e para de agendar;
//   com a aba oculta (contexto suspenso) so para de agendar e continua de onde estava;
// - abaixar(fator) faz o ducking (pausa e menu 0,5; fim 0,6); abaixar(fator, s) e um mergulho
//   passageiro (a fala do slime: 0,7 por 0,6 s) que volta ao nivel de antes.
//
// Grafo: notas -> grupo (derrubavel) -> ducking -> saida (fade) -> audio.musica -> mestre.

import { PECAS, duracaoCompasso, notasDoCompasso } from './pecas.js';
import { tom, sopro, lamina, marimba, hz } from './receitas.js';

/** Valores padrao. */
export const PADRAO_MUSICA = Object.freeze({
  /** Ganho da saida depois do fade (com o barramento musica 0,3 e o mestre 0,7). */
  ganho: 0.8,
  fadeIn: 4,
  fadeOut: 0.6,
  lookahead: 0.3,
  intervaloMs: 100,
  paradoMs: 250,
  /** Espera entre o iniciar() e a primeira nota, ms. */
  esperaMs: 600,
  /** Nota que ja passou mais que isto e pulada, s. */
  atrasoMax: 0.03,
  tauAbaixar: 0.08,
  tauSubir: 0.6,
});

// ------------------------------------------------------------------ instrumentos
const ondas = new WeakMap();
/**
 * Onda de pulso (duty 0..1) por contexto, ou null se o contexto nao tiver createPeriodicWave.
 * @param {any} ctx
 * @param {number} duty
 */
function pulso(ctx, duty) {
  let m = ondas.get(ctx);
  if (!m) { m = new Map(); ondas.set(ctx, m); }
  if (m.has(duty)) return m.get(duty);
  let onda = null;
  try {
    const n = 32;
    const re = new Float32Array(n);
    const im = new Float32Array(n);
    for (let k = 1; k < n; k++) {
      re[k] = Math.sin(2 * Math.PI * k * duty) / (Math.PI * k);
      im[k] = (1 - Math.cos(2 * Math.PI * k * duty)) / (Math.PI * k);
    }
    onda = ctx.createPeriodicWave(re, im);
  } catch { onda = null; }
  m.set(duty, onda);
  return onda;
}

/**
 * Toca uma nota da peca.
 * @param {{ctx: any, destino: any, ruido?: any}} v
 * @param {number} t
 * @param {import('./pecas.js').Nota} n
 */
export function tocarNota(v, t, n) {
  const f = n.midi ? hz(n.midi) : 0;
  const vol = n.vol;
  switch (n.inst) {
    case 'caixinha':
      lamina(v, t, f, vol * 0.55, Math.max(0.5, n.dur + 0.6));
      break;
    case 'marimba':
      marimba(v, t, f, vol * 0.6, Math.min(0.9, n.dur + 0.25));
      break;
    case 'rhodes':
      tom(v, t, { f, vol: vol * 0.5, ataque: 0.008, segurar: n.dur * 0.4, queda: n.dur * 0.6 + 0.7, trem: { f: 4.5, prof: 0.18 } });
      tom(v, t, { f, tipo: 'triangle', vol: vol * 0.16, ataque: 0.006, segurar: n.dur * 0.3, queda: n.dur * 0.6 + 0.5, filtro: { f: 1500, q: 0.6 }, trem: { f: 4.5, prof: 0.18 } });
      tom(v, t, { f: f * 7, vol: vol * 0.02, ataque: 0.002, queda: 0.08 });
      break;
    case 'baixo':
      tom(v, t, { f, vol: vol * 0.4, ataque: 0.012, segurar: n.dur * 0.6, queda: 0.3 });
      tom(v, t, { f: f * 2, tipo: 'triangle', vol: vol * 0.08, ataque: 0.012, segurar: n.dur * 0.5, queda: 0.2, filtro: { f: 500, q: 0.5 } });
      break;
    case 'bumbo':
      tom(v, t, { f: 115, f2: 44, glide: 0.12, vol: vol * 0.45, ataque: 0.003, queda: 0.24 });
      break;
    case 'caixa':
      sopro(v, t, { f: 1700, q: 0.8, vol: vol * 0.28, ataque: 0.002, queda: 0.09 });
      tom(v, t, { f: 190, f2: 160, vol: vol * 0.15, ataque: 0.002, queda: 0.05 });
      break;
    case 'chimbal':
      sopro(v, t, { f: 7500, filtro: 'highpass', q: 0.7, vol: vol * 0.12, ataque: 0.001, queda: 0.035 });
      break;
    case 'bolha':
      tom(v, t, { f: f * 0.7, f2: f * 1.25, glide: 0.06, vol: vol * 0.55, ataque: 0.003, queda: 0.13 });
      break;
    case 'pulso':
    case 'arpejo': {
      const onda = pulso(v.ctx, n.inst === 'pulso' ? 0.25 : 0.125);
      tom(v, t, { f, onda, tipo: 'square', vol: vol * 0.25, ataque: 0.004, segurar: Math.max(0.01, n.dur * 0.8), queda: 0.05, filtro: { f: 6000, q: 0.5 } });
      break;
    }
    case 'triangulo':
      tom(v, t, { f, tipo: 'triangle', vol: vol * 0.55, ataque: 0.004, segurar: Math.max(0.01, n.dur * 0.8), queda: 0.04 });
      break;
    case 'bumboChip':
      tom(v, t, { f: 160, f2: 50, glide: 0.08, vol: vol * 0.6, ataque: 0.002, queda: 0.1 });
      break;
    case 'caixaChip':
      sopro(v, t, { f: 2200, q: 0.9, vol: vol * 0.3, ataque: 0.001, queda: 0.08 });
      tom(v, t, { f: 220, f2: 150, tipo: 'triangle', vol: vol * 0.2, ataque: 0.001, queda: 0.05 });
      break;
    case 'chimbalChip':
      sopro(v, t, { f: 9000, filtro: 'highpass', q: 0.7, vol: vol * 0.1, ataque: 0.001, queda: 0.02 });
      break;
    default:
      break;
  }
}

// ------------------------------------------------------------------ agendador
/**
 * @param {object} o
 * @param {any} o.audio criarAudio()
 * @param {(fn: () => void, ms: number) => any} [o.agendar] padrao setTimeout
 * @param {(id: any) => void} [o.cancelar] padrao clearTimeout
 * @param {Partial<typeof PADRAO_MUSICA>} [o.cfg]
 */
export function criarMusica(o) {
  const audio = o.audio;
  const agendar = o.agendar || ((/** @type {() => void} */ fn, /** @type {number} */ ms) => setTimeout(fn, ms));
  const cancelar = o.cancelar || ((/** @type {any} */ id) => clearTimeout(id));
  const cfg = { ...PADRAO_MUSICA, ...(o.cfg || {}) };

  /** @type {import('./pecas.js').Peca|null} */
  let peca = null;
  let ligada = false;
  let tocando = false;
  let destruido = false;
  /** @type {any} */
  let timer = null;
  let compasso = 0;
  let tCompasso = 0;
  /** @type {import('./pecas.js').Nota[]} */
  let fila = [];
  let iFila = 0;
  /** @type {any} */
  let ctxNos = null;
  /** @type {any} */
  let saida = null;
  /** @type {any} */
  let duck = null;
  /** @type {any} */
  let grupo = null;
  let fator = 1;
  let tMergulho = 0;
  const conta = { notas: 0, perdidas: 0, comecos: 0, paradas: 0, falhas: 0 };

  /** @param {any} ctx */
  function nos(ctx) {
    if (ctxNos === ctx && saida) return;
    ctxNos = ctx;
    saida = ctx.createGain();
    saida.gain.value = 0;
    saida.connect(audio.musica);
    duck = ctx.createGain();
    duck.gain.value = fator;
    duck.connect(saida);
    grupo = null;
  }

  /** @param {any} ctx */
  function comecar(ctx) {
    nos(ctx);
    const agora = ctx.currentTime;
    const alvo = cfg.ganho * (peca ? peca.ganho : 1);
    try {
      const v = saida.gain.value;
      saida.gain.cancelScheduledValues(agora);
      saida.gain.setValueAtTime(v > 0 ? v : 0, agora);
      saida.gain.linearRampToValueAtTime(alvo, agora + cfg.fadeIn);
    } catch { /* ignora */ }
    grupo = ctx.createGain();
    grupo.gain.value = 1;
    grupo.connect(duck);
    // volta do comeco da frase de 4 compassos
    compasso -= compasso % 4;
    tCompasso = agora + 0.08;
    fila = notasDoCompasso(peca ? peca.id : '', compasso);
    iFila = 0;
    tocando = true;
    conta.comecos++;
  }

  /** @param {boolean} rapido no anuncio: cai em 12 ms (o mestre ja esta em 0) */
  function pararSom(rapido) {
    if (!tocando) return;
    tocando = false;
    conta.paradas++;
    fila = [];
    iFila = 0;
    const ctx = ctxNos;
    if (!ctx) return;
    const t = ctx.currentTime;
    const tau = rapido ? 0.012 : cfg.fadeOut / 3;
    try {
      if (grupo) {
        grupo.gain.cancelScheduledValues(t);
        grupo.gain.setValueAtTime(1, t);
        grupo.gain.setTargetAtTime(0, t, tau);
      }
    } catch { /* ignora */ }
    grupo = null;
    try {
      saida.gain.cancelScheduledValues(t);
      if (rapido) {
        saida.gain.value = 0;
        saida.gain.setValueAtTime(0, t);
      } else {
        saida.gain.setValueAtTime(saida.gain.value, t);
        saida.gain.setTargetAtTime(0, t, tau);
      }
    } catch { /* ignora */ }
  }

  function avancar() {
    compasso++;
    tCompasso += duracaoCompasso(/** @type {any} */ (peca));
    fila = notasDoCompasso(peca ? peca.id : '', compasso);
    iFila = 0;
  }

  /** @param {any} ctx */
  function agendarAte(ctx) {
    const agora = ctx.currentTime;
    const barra = duracaoCompasso(/** @type {any} */ (peca));
    // a thread ficou presa mais de um compasso: recomeca a frase, com fade
    if (tCompasso + 2 * barra < agora) {
      pararSom(false);
      comecar(ctx);
    }
    const limite = agora + cfg.lookahead;
    const v = { ctx, destino: grupo, ruido: audio.bufferRuido };
    for (let guarda = 0; guarda < 512; guarda++) {
      if (iFila < fila.length) {
        const nota = fila[iFila];
        const tn = tCompasso + nota.t;
        if (tn >= limite) return;
        iFila++;
        if (tn < agora - cfg.atrasoMax) { conta.perdidas++; continue; }
        try {
          tocarNota(v, Math.max(tn, agora), nota);
          conta.notas++;
        } catch { conta.falhas++; }
        continue;
      }
      if (tCompasso + barra >= limite) return;
      avancar();
    }
  }

  /** @returns {number} ms ate o proximo passo */
  function passo() {
    const ctx = audio.ctx;
    if (!ctx || !audio.musica || !peca) return cfg.paradoMs;
    const e = audio.estado();
    if (e.emAnuncio) { pararSom(true); return cfg.paradoMs; }
    if (!e.musica) { pararSom(false); return cfg.paradoMs; }
    // aba oculta ou contexto suspenso: o tempo do contexto parou junto; continua de onde estava
    if (!audio.podeTocar()) return cfg.paradoMs;
    if (!tocando) comecar(ctx);
    agendarAte(ctx);
    return cfg.intervaloMs;
  }

  /** @param {number} ms */
  function reagendar(ms) {
    if (timer !== null) { try { cancelar(timer); } catch { /* ignora */ } }
    timer = agendar(laco, ms);
  }

  function laco() {
    timer = null;
    if (destruido || !ligada) return;
    let espera = cfg.paradoMs;
    try { espera = passo(); } catch { conta.falhas++; }
    reagendar(espera);
  }

  function cutucar() {
    if (destruido || !ligada) return;
    reagendar(0);
  }

  const offs = [
    audio.aoRetomar(cutucar),
    audio.aoAnuncio((/** @type {boolean} */ em) => {
      if (em) pararSom(true);
      else cutucar();
    }),
  ];

  /** Aplica o ducking (fator) no no. */
  function aplicarFator(tau) {
    if (!duck || !ctxNos) return;
    const t = ctxNos.currentTime;
    try {
      // derruba a volta de um mergulho ja agendada (ela voltaria ao fator antigo)
      duck.gain.cancelScheduledValues(t);
      duck.gain.setValueAtTime(duck.gain.value, t);
      duck.gain.setTargetAtTime(fator, t, tau);
    } catch { /* ignora */ }
  }

  return {
    /**
     * Toca a peca (caixinha | lofi | chiptune); outra peca recomeca do zero, com fade.
     * @param {string} id
     */
    iniciar(id) {
      if (destruido) return;
      const nova = PECAS[id] || null;
      if (!nova) { this.parar(); return; }
      if (peca && peca.id !== nova.id) {
        pararSom(false);
        compasso = 0;
      }
      peca = nova;
      if (!ligada) {
        ligada = true;
        reagendar(cfg.esperaMs);
      } else cutucar();
    },
    /** @param {boolean} [rapido] */
    parar(rapido = false) {
      ligada = false;
      if (timer !== null) { try { cancelar(timer); } catch { /* ignora */ } }
      timer = null;
      pararSom(rapido);
    },
    /**
     * Ducking: fator 0..1 (1 volta ao normal). Com `segundos`, so um mergulho passageiro
     * (min(fator atual, f) por esse tempo) que volta ao nivel de antes.
     * @param {number} f
     * @param {number} [segundos]
     */
    abaixar(f, segundos) {
      const novo = Math.max(0, Math.min(1, Number(f)));
      if (!Number.isFinite(novo)) return;
      if (segundos && segundos > 0) {
        if (!duck || !ctxNos) return;
        const t = ctxNos.currentTime;
        const alvo = Math.min(fator, novo);
        tMergulho = t + segundos;
        try {
          duck.gain.cancelScheduledValues(t);
          duck.gain.setValueAtTime(duck.gain.value, t);
          duck.gain.setTargetAtTime(alvo, t, cfg.tauAbaixar);
          duck.gain.setTargetAtTime(fator, t + segundos, cfg.tauSubir / 2);
        } catch { /* ignora */ }
        return;
      }
      const tau = novo < fator ? cfg.tauAbaixar : cfg.tauSubir;
      fator = novo;
      aplicarFator(tau);
    },
    estado: () => ({ ligada, tocando, peca: peca ? peca.id : null, compasso, fator, mergulho: tMergulho, ...conta }),
    destruir() {
      if (destruido) return;
      pararSom(true);
      destruido = true;
      ligada = false;
      if (timer !== null) { try { cancelar(timer); } catch { /* ignora */ } }
      timer = null;
      for (const off of offs) { try { off(); } catch { /* ignora */ } }
    },
  };
}

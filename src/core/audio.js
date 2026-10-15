// Sons sintetizados com WebAudio: nenhum arquivo, nenhuma requisicao.
// O contexto so nasce no primeiro toque (politica de autoplay). O mudo do
// anuncio zera o ganho mestre ANTES de pedir o anuncio e suspende o contexto
// 80 ms depois (padrao do hexadrop: o onStart do SDK pode nao chegar).
// Infra copiada do stringcut; a nota sem fim (tom de Shepard) vem do memecats.

const ESCALA_MAIOR = [0, 2, 4, 5, 7, 9, 11];
/** Oitava mais grave da nota sem fim: 660 / 8, entao a nota 1 tem o centro em 660 Hz. */
const BASE_SEM_FIM = 82.5;

/**
 * Nota k (1, 2, 3...) da escala sem fim: sete senos em oitavas com volume em
 * sino em torno de 660 Hz. Cada passo sobe um grau; k e k + 7 soam iguais.
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

export function criarAudio() {
  /** @type {AudioContext|null} */
  let ctx = null;
  /** @type {GainNode|null} */
  let mestre = null;
  /** @type {AudioBuffer|null} */
  let ruidoBuf = null;
  let mudo = false;
  let mudoAnuncio = false;
  let abaOculta = false;
  const VOLUME = 0.6;

  const ganhoAlvo = () => (mudo || mudoAnuncio || abaOculta ? 0 : VOLUME);

  function iniciar() {
    if (ctx) {
      if (ctx.state === 'suspended' && !mudoAnuncio && !abaOculta) ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
      ctx = new AC();
      mestre = ctx.createGain();
      mestre.gain.value = ganhoAlvo();
      mestre.connect(ctx.destination);
    } catch {
      ctx = null;
    }
  }

  function aplicarGanho() {
    if (!ctx || !mestre) return;
    try {
      mestre.gain.setTargetAtTime(ganhoAlvo(), ctx.currentTime, 0.02);
    } catch { /* ignora */ }
  }

  function tom(f, dur, tipo = 'sine', vol = 0.2, f2 = 0, atraso = 0) {
    if (!ctx || !mestre || mudo || mudoAnuncio) return;
    const t = ctx.currentTime + atraso;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = /** @type {OscillatorType} */ (tipo);
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(mestre);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  function ruido(dur, freq, q, vol, atraso = 0, tipo = 'bandpass', f2 = 0) {
    if (!ctx || !mestre || mudo || mudoAnuncio) return;
    if (!ruidoBuf) {
      ruidoBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.8), ctx.sampleRate);
      const d = ruidoBuf.getChannelData(0);
      let s = 12345;
      for (let i = 0; i < d.length; i++) { s = (s * 1103515245 + 12345) >>> 0; d[i] = s / 2147483648 - 1; }
    }
    const t = ctx.currentTime + atraso;
    const s = ctx.createBufferSource();
    s.buffer = ruidoBuf;
    const f = ctx.createBiquadFilter();
    f.type = /** @type {BiquadFilterType} */ (tipo);
    f.frequency.setValueAtTime(freq, t);
    if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f);
    f.connect(g);
    g.connect(mestre);
    s.start(t);
    s.stop(t + dur + 0.03);
  }

  return {
    iniciar,
    tom,
    ruido,
    get ctx() { return ctx; },
    get mudo() { return mudo; },
    /** true se o som esta zerado agora (mudo, anuncio ou aba oculta) */
    get calado() { return ganhoAlvo() === 0; },
    /** @param {boolean} v */
    definirMudo(v) { mudo = v; aplicarGanho(); },
    mudoParaAnuncio() {
      mudoAnuncio = true;
      aplicarGanho();
      setTimeout(() => {
        if (mudoAnuncio && ctx && ctx.state === 'running') ctx.suspend().catch(() => {});
      }, 80);
    },
    /** @param {boolean} oculta */
    pausarAba(oculta) {
      abaOculta = oculta;
      aplicarGanho();
      if (!ctx) return;
      if (oculta) ctx.suspend().catch(() => {});
      else if (!mudoAnuncio) ctx.resume().catch(() => {});
    },
    voltarDoAnuncio() {
      mudoAnuncio = false;
      if (ctx && ctx.state === 'suspended' && !abaOculta) ctx.resume().catch(() => {});
      aplicarGanho();
    },
    /** carta pousa na coluna */
    pouso() { ruido(0.07, 900, 1, 0.3); tom(220, 0.08, 'sine', 0.12, 120); },
    /** fusao: a nota sobe sem fim com o combo (k) e um brilho a partir do 3o */
    fusao(k = 1) {
      ruido(0.03, 3200, 4, 0.2);
      const nota = notaSemFim(k);
      for (const [f, p] of nota) if (p > 0.02) tom(f, 0.28, 'sine', 0.085 * p, 0, 0.005);
      if (k >= 3) tom(nota[4][0], 0.14, 'triangle', 0.035 * Math.min(1, (k - 2) / 6), 0, 0.03);
    },
    /** monte completo (2048) */
    completar() {
      [523, 659, 784, 1046, 1318].forEach((f, i) => { tom(f, 0.3, 'triangle', 0.11, 0, i * 0.06); tom(f / 2, 0.22, 'square', 0.025, 0, i * 0.06); });
      ruido(0.4, 5000, 0.8, 0.12, 0.2, 'highpass');
    },
    /** jogada recusada */
    recusa() { tom(140, 0.14, 'square', 0.05, 90); ruido(0.08, 300, 1, 0.2); },
    descartar() { ruido(0.22, 1400, 0.8, 0.25, 0, 'bandpass', 300); },
    explodir() { ruido(0.3, 500, 0.5, 0.6, 0, 'lowpass', 80); tom(90, 0.25, 'sine', 0.25, 40); },
    /** carta pequena saindo da mesa na subida de nivel: brilho curto que sobe */
    graduar() { tom(1318, 0.12, 'sine', 0.05, 1760); },
    febre() { tom(300, 0.6, 'sawtooth', 0.04, 1200); ruido(0.6, 800, 0.5, 0.1, 0, 'bandpass', 4000); [784, 988, 1175, 1568].forEach((f, i) => tom(f, 0.2, 'triangle', 0.08, 0, 0.3 + i * 0.07)); },
    /** fim de partida (mesa cheia), curto e sem drama */
    fim() { [392, 330, 262].forEach((f, i) => tom(f, 0.22, 'triangle', 0.07, 0, i * 0.12)); },
    /** Fanfarra do "YES!" (mais longa no fim de mundo) com pipocos de confete. */
    yes(mundo = false) {
      const notas = mundo ? [523, 659, 784, 1046, 1318] : [523, 659, 784, 1046];
      notas.forEach((f, i) => { tom(f, 0.26, 'triangle', 0.13, 0, i * 0.075); tom(f / 2, 0.2, 'square', 0.03, 0, i * 0.075); });
      for (let k = 0; k < 6; k++) ruido(0.05, 2500 + k * 300, 1.2, 0.25, 0.12 + k * 0.05);
      ruido(0.3, 600, 0.6, 0.15, 1.3, 'bandpass', 3000);
    },
    tique() { tom(900, 0.05, 'triangle', 0.08, 1200); },
    /** o 2048 saindo da mesa: baque grave e brilho */
    critico() { ruido(0.35, 600, 0.6, 0.55, 0, 'lowpass', 90); tom(110, 0.3, 'sawtooth', 0.08, 45); [1046, 1318, 1568].forEach((f, i) => tom(f, 0.18, 'triangle', 0.06, 0, 0.05 + i * 0.05)); },
  };
}

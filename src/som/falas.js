// Balbucio de slime sem idioma (estilo "animalese"): cada frase e uma lista de silabas
// sintetizadas com uma fonte dente-de-serra (mais um triangulo para a altura ficar clara)
// passando por dois formantes por vogal (passa-banda em paralelo), com sopro de ruido nas
// consoantes. O tom vem do nivel do slime: os pequenos falam agudo, os grandes grave.
//
// Mesma assinatura das receitas: falar(v, t0, frase, p) com v = { ctx, destino, ruido }.
// Modulo sem dependencias (as receitas importam daqui, nao o contrario).

const MIN = 0.0001;

/** Formantes F1 e F2 de cada vogal, Hz. */
export const VOGAIS = Object.freeze({
  a: Object.freeze([800, 1200]),
  e: Object.freeze([500, 1800]),
  i: Object.freeze([300, 2300]),
  o: Object.freeze([500, 900]),
  u: Object.freeze([350, 800]),
});

/**
 * Consoantes: oclusivas (fecham a voz `fecha` s e soltam um estalo de ruido), sopros (ruido
 * antes da vogal), semivogais (a vogal nasce no formante de `de` e desliza) e a nasal.
 * estalo/sopro: [Hz do filtro, Q, duracao s, volume relativo].
 */
const CONSOANTES = {
  b: { fecha: 0.03, estalo: [500, 0.9, 0.014, 0.35] },
  p: { fecha: 0.035, estalo: [900, 0.9, 0.02, 0.5] },
  d: { fecha: 0.025, estalo: [2600, 1, 0.014, 0.3] },
  t: { fecha: 0.03, estalo: [4200, 1.2, 0.022, 0.45] },
  k: { fecha: 0.035, estalo: [2300, 1.4, 0.026, 0.5] },
  h: { sopro: [1600, 0.6, 0.06, 0.35] },
  s: { sopro: [6000, 1.4, 0.08, 0.3] },
  w: { de: 'u', desliza: 0.06 },
  y: { de: 'i', desliza: 0.05 },
  m: { nasal: 0.06 },
};

/**
 * @typedef {object} Silaba
 * @property {keyof typeof VOGAIS} v vogal
 * @property {string} [c] consoante do comeco (b p d t k h s w y m)
 * @property {number} d duracao da vogal, s
 * @property {[number, number]} f f0 relativo ao tom do slime, no comeco e no fim
 * @property {number} [vib] vibrato, Hz
 * @property {string} [coda] consoante do fim (k t p)
 * @property {number} [pausa] silencio depois, s
 */

/** @type {Readonly<Record<string, readonly Silaba[]>>} */
export const FRASES = Object.freeze({
  /** fusao grande */
  uau: [{ c: 'w', v: 'a', d: 0.17, f: [1.0, 1.32] }, { v: 'u', d: 0.22, f: [1.32, 0.95] }],
  /** combo >= 3 */
  iupi: [{ v: 'i', d: 0.08, f: [1.1, 1.16] }, { c: 'y', v: 'u', d: 0.09, f: [1.2, 1.26] }, { c: 'p', v: 'i', d: 0.2, f: [1.5, 1.78] }],
  /** nivel novo */
  oba: [{ v: 'o', d: 0.11, f: [1.0, 1.06] }, { c: 'b', v: 'a', d: 0.25, f: [1.36, 1.16] }],
  /** mira apontada / susto */
  eek: [{ v: 'i', d: 0.22, f: [1.7, 2.1], coda: 'k' }],
  /** fim de partida */
  aww: [{ v: 'a', d: 0.2, f: [1.06, 0.96] }, { c: 'w', v: 'u', d: 0.4, f: [0.95, 0.7], vib: 6 }],
  /** recorde */
  uhuu: [{ v: 'u', d: 0.1, f: [1.0, 1.08] }, { c: 'h', v: 'u', d: 0.32, f: [1.36, 1.76] }],
  /** missao cumprida ("ta-da!") */
  missao: [{ c: 't', v: 'a', d: 0.1, f: [1.0, 1.0] }, { c: 'd', v: 'a', d: 0.28, f: [1.33, 1.5] }],
  /** vitoria no Duelo ("ie-ei!") */
  venceu: [{ c: 'y', v: 'e', d: 0.12, f: [1.25, 1.35] }, { c: 'y', v: 'e', d: 0.26, f: [1.6, 1.86] }],
  /** choro antes do missil ("buaa") */
  buaa: [{ c: 'b', v: 'u', d: 0.12, f: [1.25, 1.3] }, { v: 'a', d: 0.55, f: [1.3, 0.85], vib: 7 }],
  /** solucos ("hic hic hic") */
  solucos: [
    { c: 'h', v: 'i', d: 0.08, f: [1.6, 1.4], coda: 'k', pausa: 0.09 },
    { c: 'h', v: 'i', d: 0.08, f: [1.55, 1.36], coda: 'k', pausa: 0.09 },
    { c: 'h', v: 'i', d: 0.12, f: [1.5, 1.2], coda: 'k' },
  ],
});

/**
 * Ganho por frase: as vogais e a altura mudam a energia que passa pelos formantes; com isto
 * as frases ficam no mesmo RMS (medido no Chrome, nivel 4).
 */
const GANHO_FRASE = { uau: 0.6, iupi: 1.35, oba: 1, eek: 1.8, aww: 0.55, uhuu: 0.85, missao: 1, venceu: 0.65 };

/** Frases que o jogo fala (as outras sao do choro). */
export const FALAS_DO_JOGO = Object.freeze(['uau', 'iupi', 'oba', 'eek', 'aww', 'uhuu', 'missao', 'venceu']);

/**
 * Tom (f0, Hz) do slime pelo nivel: 1 fala a ~470 Hz, 13 a ~170 Hz, 14 a ~156 Hz.
 * @param {number} nivel
 */
export function tomDoNivel(nivel) {
  const n = Math.max(1, Math.min(14, Math.floor(nivel) || 4));
  return 470 * Math.pow(2, -(n - 1) / 8.2);
}

/** Ruido proprio (1 s, LCG), por contexto. */
const ruidos = new WeakMap();
/** @param {BaseAudioContext} ctx */
function ruidoDe(ctx) {
  let b = ruidos.get(ctx);
  if (!b) {
    const n = Math.max(1, Math.floor(ctx.sampleRate));
    b = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = b.getChannelData(0);
    let s = 777;
    for (let i = 0; i < n; i++) {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      d[i] = s / 2147483648 - 1;
    }
    ruidos.set(ctx, b);
  }
  return b;
}

/**
 * Estalo ou sopro de consoante: ruido filtrado curto.
 * @param {{ctx: BaseAudioContext, ruido?: AudioBuffer|null}} v
 * @param {AudioNode} destino
 * @param {number} t
 * @param {number[]} cfg [Hz, Q, dur, vol relativo]
 * @param {number} vol
 * @param {number} desloca
 */
function ruidoConsoante(v, destino, t, cfg, vol, desloca) {
  const { ctx } = v;
  const [f, q, dur, rel] = cfg;
  const src = ctx.createBufferSource();
  src.buffer = v.ruido || ruidoDe(ctx);
  src.loop = true;
  const fl = ctx.createBiquadFilter();
  fl.type = 'bandpass';
  fl.frequency.setValueAtTime(f, t);
  fl.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(MIN, t);
  g.gain.exponentialRampToValueAtTime(Math.max(MIN * 2, vol * rel), t + Math.min(0.006, dur * 0.3));
  g.gain.exponentialRampToValueAtTime(MIN, t + dur);
  src.connect(fl);
  fl.connect(g);
  g.connect(destino);
  src.start(t, desloca);
  src.stop(t + dur + 0.03);
}

/**
 * Fala uma frase. Devolve a duracao (s), ou 0 se a frase nao existe.
 * @param {{ctx: BaseAudioContext, destino: AudioNode, ruido?: AudioBuffer|null}} v
 * @param {number} t0
 * @param {string} nome chave de FRASES
 * @param {{nivel?: number, f0?: number, vol?: number}} [p]
 */
export function falar(v, t0, nome, p = {}) {
  const silabas = FRASES[nome];
  if (!silabas) return 0;
  const { ctx } = v;
  const f0 = p.f0 || tomDoNivel(p.nivel || 4);
  const vol = (p.vol === undefined ? 0.3 : p.vol) * (GANHO_FRASE[/** @type {keyof typeof GANHO_FRASE} */ (nome)] || 1);

  // fonte: serra (os harmonicos que os formantes moldam) + triangulo (a altura)
  const serra = ctx.createOscillator();
  serra.type = 'sawtooth';
  const tri = ctx.createOscillator();
  tri.type = 'triangle';
  const f1 = ctx.createBiquadFilter();
  f1.type = 'bandpass';
  f1.Q.value = 5;
  const f2 = ctx.createBiquadFilter();
  f2.type = 'bandpass';
  f2.Q.value = 8;
  const g1 = ctx.createGain();
  g1.gain.value = 1.7;
  const g2 = ctx.createGain();
  g2.gain.value = 0.9;
  const gt = ctx.createGain();
  gt.gain.value = 0.16;
  const voz = ctx.createGain();
  voz.gain.setValueAtTime(0, t0);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 3400;
  lp.Q.value = 0.5;
  serra.connect(f1);
  serra.connect(f2);
  f1.connect(g1);
  f2.connect(g2);
  tri.connect(gt);
  g1.connect(voz);
  g2.connect(voz);
  gt.connect(voz);
  voz.connect(lp);
  lp.connect(v.destino);
  // vibrato: um LFO so, ligado nas silabas que pedem
  const lfo = ctx.createOscillator();
  lfo.frequency.setValueAtTime(6, t0);
  const lfoG = ctx.createGain();
  lfoG.gain.setValueAtTime(0, t0);
  lfo.connect(lfoG);
  lfoG.connect(serra.frequency);
  lfoG.connect(tri.frequency);

  const primeira = VOGAIS[silabas[0].c && CONSOANTES[silabas[0].c] && CONSOANTES[silabas[0].c].de ? CONSOANTES[silabas[0].c].de : silabas[0].v];
  f1.frequency.setValueAtTime(primeira[0], t0);
  f2.frequency.setValueAtTime(primeira[1], t0);
  serra.frequency.setValueAtTime(f0 * silabas[0].f[0], t0);
  tri.frequency.setValueAtTime(f0 * silabas[0].f[0], t0);

  let t = t0;
  let desloca = 0.11;
  for (const s of silabas) {
    const c = s.c ? CONSOANTES[s.c] : null;
    const [a1, a2] = VOGAIS[s.v];
    let tv = t;
    if (c && c.fecha) {
      // oclusiva: a voz fica fechada e solta um estalo bem na abertura
      tv = t + c.fecha;
      ruidoConsoante(v, lp, tv - 0.004, c.estalo, vol, desloca);
    } else if (c && c.sopro) {
      ruidoConsoante(v, lp, t, c.sopro, vol, desloca);
      tv = t + c.sopro[2] * 0.6;
    } else if (c && c.nasal) {
      tv = t + c.nasal;
    }
    desloca = (desloca + 0.173) % 0.8;
    const fim = tv + s.d;
    // altura: rampa linear de f[0] a f[1] ao longo da vogal
    for (const o of [serra, tri]) {
      o.frequency.setValueAtTime(f0 * s.f[0], tv);
      o.frequency.linearRampToValueAtTime(f0 * s.f[1], fim);
    }
    // formantes: a semivogal nasce no formante dela e desliza para a vogal
    if (c && c.de) {
      const [b1, b2] = VOGAIS[/** @type {keyof typeof VOGAIS} */ (c.de)];
      f1.frequency.setValueAtTime(b1, tv);
      f2.frequency.setValueAtTime(b2, tv);
      f1.frequency.linearRampToValueAtTime(a1, tv + (c.desliza || 0.05));
      f2.frequency.linearRampToValueAtTime(a2, tv + (c.desliza || 0.05));
    } else {
      f1.frequency.setTargetAtTime(a1, tv, 0.012);
      f2.frequency.setTargetAtTime(a2, tv, 0.012);
    }
    // nasal: um murmurio baixo antes da vogal
    if (c && c.nasal) {
      voz.gain.setValueAtTime(0, t);
      voz.gain.linearRampToValueAtTime(vol * 0.3, t + 0.015);
      voz.gain.linearRampToValueAtTime(vol * 0.25, tv);
    } else {
      voz.gain.setValueAtTime(0, tv);
    }
    // envelope da vogal: ataque 15 ms, cai um pouco, solta nos ultimos 40 ms
    voz.gain.linearRampToValueAtTime(vol, tv + 0.015);
    voz.gain.linearRampToValueAtTime(vol * 0.82, Math.max(tv + 0.02, fim - 0.04));
    voz.gain.linearRampToValueAtTime(0, fim);
    if (s.vib) {
      lfo.frequency.setValueAtTime(s.vib, tv);
      lfoG.gain.setValueAtTime(0, tv);
      lfoG.gain.linearRampToValueAtTime(f0 * 0.035, tv + s.d * 0.5);
      lfoG.gain.linearRampToValueAtTime(0, fim);
    }
    t = fim;
    if (s.coda && CONSOANTES[s.coda] && CONSOANTES[s.coda].estalo) {
      ruidoConsoante(v, lp, t + 0.012, CONSOANTES[s.coda].estalo, vol, desloca);
      t += 0.04;
    }
    t += s.pausa || 0;
  }
  const fimTudo = t + 0.04;
  for (const o of [serra, tri, lfo]) {
    o.start(t0);
    o.stop(fimTudo);
  }
  return fimTudo - t0;
}

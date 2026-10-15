// Laco do jogo: passo fixo de 1/60 s com acumulador (a fisica roda 4 subpassos de 1/240 s
// por passo), desenho uma vez por quadro. Licoes dos testes da Poki (2048_cards 0.4.4):
// - o proximo requestAnimationFrame sai ANTES de desenhar: um erro perde um quadro e nao
//   congela a tela; o erro e relancado uma vez por mensagem (a Poki ve a pilha);
// - um relogio so (performance.now), nunca o carimbo do rAF;
// - passo de reserva por timer quando o rAF para com a pagina visivel.

export const PASSO = 1 / 60;
const MAX_PASSOS = 3;

/**
 * @param {{ passo: (dt: number) => void, desenhar: (dtReal: number) => void }} o
 */
export function criarLaco({ passo, desenhar }) {
  let ultimo = performance.now();
  let acum = 0;
  let rodando = false;
  let pausado = false;
  const relatados = new Set();
  /** medidas para o ?debug */
  const medidas = { passoMs: 0, desenhoMs: 0, fps: 0, quadros: 0, tFps: performance.now() };

  function relatar(err) {
    const msg = String((err && err.message) || err);
    if (relatados.has(msg)) return;
    relatados.add(msg);
    setTimeout(() => { throw err; });
  }

  function avancar(agora) {
    const dt = Math.min(0.1, Math.max(0, (agora - ultimo) / 1000));
    ultimo = agora;
    if (pausado) return dt;
    acum += dt;
    let n = 0;
    const t0 = performance.now();
    while (acum >= PASSO && n < MAX_PASSOS) {
      passo(PASSO);
      acum -= PASSO;
      n++;
    }
    if (n === MAX_PASSOS) acum = 0; // aparelho lento: a simulacao desacelera em vez de espiralar
    if (n) medidas.passoMs = medidas.passoMs * 0.9 + ((performance.now() - t0) / n) * 0.1;
    return dt;
  }

  function quadro() {
    if (!rodando) return;
    requestAnimationFrame(quadro);
    const agora = performance.now();
    try {
      const dt = avancar(agora);
      const t1 = performance.now();
      desenhar(dt);
      medidas.desenhoMs = medidas.desenhoMs * 0.9 + (performance.now() - t1) * 0.1;
      medidas.quadros++;
      if (agora - medidas.tFps > 500) {
        medidas.fps = (medidas.quadros * 1000) / (agora - medidas.tFps);
        medidas.quadros = 0;
        medidas.tFps = agora;
      }
    } catch (err) {
      relatar(err);
    }
  }

  function reserva() {
    if (!rodando) return;
    const agora = performance.now();
    if (typeof document !== 'undefined' && !document.hidden && agora - ultimo > 150) {
      try { avancar(agora); } catch (err) { relatar(err); }
    }
  }

  return {
    iniciar() {
      if (rodando) return;
      rodando = true;
      ultimo = performance.now();
      requestAnimationFrame(quadro);
      setInterval(reserva, 200);
    },
    /** @param {boolean} v */
    pausar(v) { pausado = v; ultimo = performance.now(); acum = 0; },
    get pausado() { return pausado; },
    medidas,
  };
}

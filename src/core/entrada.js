// Entrada unificada: Pointer Events (mouse e toque com o mesmo codigo, com captura; um
// ponteiro ativo por vez, ou varios quando `multi()` diz que sim: 2 jogadores no toque) e teclado. Impede a pagina hospedeira de rolar (setas, espaco,
// roda do mouse, arrasto de toque), como a Poki pede.

const TECLAS_ROLAGEM = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Spacebar', 'PageUp', 'PageDown', 'Home', 'End']);

/**
 * @param {HTMLElement|Window} alvo
 * @param {{
 *   ponteiro: (fase: 'baixo'|'mover'|'cima', x: number, y: number, e: PointerEvent) => void,
 *   tecla: (codigo: string, baixo: boolean, e: KeyboardEvent) => void,
 *   primeiroGesto?: () => void,
 *   multi?: () => boolean,
 * }} o
 */
export function criarEntrada(alvo, o) {
  /** @type {Set<number>} */
  const ativos = new Set();
  let gesto = false;
  const primeiro = () => {
    if (gesto) return;
    gesto = true;
    if (o.primeiroGesto) o.primeiroGesto();
  };
  /** @param {any} e */
  const ehUi = (e) => !!(e.target && e.target.closest && e.target.closest('button, .clicavel, input, label, .tela'));

  alvo.addEventListener('pointerdown', (/** @type {PointerEvent} */ e) => {
    primeiro();
    if (ehUi(e)) return;
    if (ativos.size && !ativos.has(e.pointerId) && !(o.multi && o.multi())) return;
    ativos.add(e.pointerId);
    try { /** @type {any} */ (e.target).setPointerCapture?.(e.pointerId); } catch { /* ignora */ }
    o.ponteiro('baixo', e.clientX, e.clientY, e);
  });
  alvo.addEventListener('pointermove', (/** @type {PointerEvent} */ e) => {
    if (ativos.size && !ativos.has(e.pointerId)) return;
    if (ehUi(e) && !ativos.size) return;
    o.ponteiro('mover', e.clientX, e.clientY, e);
  });
  const soltar = (/** @type {PointerEvent} */ e) => {
    if (!ativos.delete(e.pointerId)) return;
    o.ponteiro('cima', e.clientX, e.clientY, e);
  };
  alvo.addEventListener('pointerup', soltar);
  alvo.addEventListener('pointercancel', (/** @type {PointerEvent} */ e) => {
    ativos.delete(e.pointerId);
  });
  window.addEventListener('keydown', (e) => {
    if (TECLAS_ROLAGEM.has(e.key)) e.preventDefault();
    primeiro();
    if (e.repeat) return;
    o.tecla(e.code || e.key, true, e);
  });
  window.addEventListener('keyup', (e) => o.tecla(e.code || e.key, false, e));
  // a pagina nunca rola; so as listas do menu (.rolavel) rolam por dentro
  /** @param {Event} e */
  const rolavel = (e) => !!(/** @type {any} */ (e.target)?.closest?.('.rolavel'));
  window.addEventListener('wheel', (e) => { if (!rolavel(e)) e.preventDefault(); }, { passive: false });
  window.addEventListener('touchmove', (e) => { if (e.cancelable && !rolavel(e)) e.preventDefault(); }, { passive: false });
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  return { get gesto() { return gesto; } };
}

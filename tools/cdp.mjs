// Chrome headless em TEMPO REAL pilotado pelo DevTools Protocol (sem dependencias: usa o
// WebSocket global do Node 22). Com --virtual-time-budget o rAF nao anda; aqui anda, entao
// da para testar entrada de verdade (mouse, toque, teclas), o laco e o tamanho da tela.
// Uso:
//   const c = await abrirChrome({ largura: 390, altura: 844 });
//   await c.ir('http://127.0.0.1:5371/index.html?modelo=1');
//   await c.avaliar('1 + 1');  await c.clicar(195, 600);  await c.tecla('Escape');
//   const png = await c.print();  await c.fechar();
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const CODIGOS = {
  Escape: [27, 'Escape'], Space: [32, ' '], Enter: [13, 'Enter'], ArrowLeft: [37, 'ArrowLeft'], ArrowRight: [39, 'ArrowRight'],
  ArrowDown: [40, 'ArrowDown'], ArrowUp: [38, 'ArrowUp'], KeyA: [65, 'a'], KeyD: [68, 'd'], KeyS: [83, 's'], KeyP: [80, 'p'],
  Digit1: [49, '1'], Digit2: [50, '2'], Digit3: [51, '3'], Digit4: [52, '4'], Digit5: [53, '5'],
};

/** @param {{ largura?: number, altura?: number, porta?: number, toque?: boolean }} [o] */
export async function abrirChrome({ largura = 390, altura = 844, porta = 9372, toque = false } = {}) {
  const perfil = mkdtempSync(join(tmpdir(), 'slime-cdp-'));
  const proc = spawn('google-chrome', [
    '--headless=new', '--no-first-run', '--no-default-browser-check', '--mute-audio', '--autoplay-policy=no-user-gesture-required',
    '--host-resolver-rules=MAP game-cdn.poki.com 127.0.0.1:9', `--remote-debugging-port=${porta}`,
    `--user-data-dir=${perfil}`, `--window-size=${largura},${altura}`, 'about:blank',
  ], { stdio: 'ignore' });
  let alvo = null;
  for (let k = 0; k < 80 && !alvo; k++) {
    await espera(150);
    try {
      const lista = await (await fetch(`http://127.0.0.1:${porta}/json`)).json();
      alvo = lista.find((t) => t.type === 'page') || null;
    } catch { /* ainda subindo */ }
  }
  if (!alvo) { proc.kill('SIGKILL'); throw new Error('o Chrome nao abriu a porta de depuracao'); }
  const ws = new WebSocket(alvo.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0;
  const pendentes = new Map();
  /** @type {string[]} */
  const erros = [];
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(String(ev.data));
    if (m.id && pendentes.has(m.id)) { pendentes.get(m.id)(m); pendentes.delete(m.id); return; }
    if (m.method === 'Runtime.exceptionThrown') erros.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') erros.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
  });
  const cmd = (method, params = {}) => new Promise((r) => { const i = ++id; pendentes.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await cmd('Page.enable');
  await cmd('Runtime.enable');
  await cmd('Emulation.setDeviceMetricsOverride', { width: largura, height: altura, deviceScaleFactor: 1, mobile: toque });
  if (toque) await cmd('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });

  const mouse = (type, x, y, extra = {}) => cmd('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, pointerType: 'mouse', ...extra });
  return {
    erros,
    cmd,
    async ir(url, ms = 1500) { await cmd('Page.navigate', { url }); await espera(ms); },
    async avaliar(expr) {
      const r = await cmd('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.result && r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'erro no avaliar');
      return r.result && r.result.result ? r.result.result.value : undefined;
    },
    async mover(x, y) { await cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0, pointerType: 'mouse' }); },
    async clicar(x, y) { await mouse('mousePressed', x, y); await espera(40); await mouse('mouseReleased', x, y); },
    async arrastar(x0, y0, x1, y1, passos = 10, ms = 300) {
      await mouse('mousePressed', x0, y0);
      for (let k = 1; k <= passos; k++) {
        await cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x0 + ((x1 - x0) * k) / passos, y: y0 + ((y1 - y0) * k) / passos, button: 'left', buttons: 1, pointerType: 'mouse' });
        await espera(ms / passos);
      }
      await mouse('mouseReleased', x1, y1);
    },
    async segurar(x, y, ms) { await mouse('mousePressed', x, y); await espera(ms); await mouse('mouseReleased', x, y); },
    async tecla(codigo, ms = 60) {
      const [kc, key] = CODIGOS[codigo] || [0, codigo];
      await cmd('Input.dispatchKeyEvent', { type: 'keyDown', code: codigo, key, windowsVirtualKeyCode: kc });
      await espera(ms);
      await cmd('Input.dispatchKeyEvent', { type: 'keyUp', code: codigo, key, windowsVirtualKeyCode: kc });
    },
    async tamanho(w, h) { await cmd('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: toque }); },
    async print() {
      const r = await cmd('Page.captureScreenshot', { format: 'png' });
      return Buffer.from(r.result.data, 'base64');
    },
    async fechar() {
      try { ws.close(); } catch { /* ignora */ }
      proc.kill('SIGKILL');
      await espera(200);
      rmSync(perfil, { recursive: true, force: true });
    },
  };
}

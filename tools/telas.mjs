// (porte do stringcut para o Slime Merge: o canvas do papel, cFundo, e redesenhado todo quadro)
// Confere que o jogo sobrevive a trocas de tamanho da tela: iframe com altura
// ou largura 0, escondido (display: none) e girado. No WFT da 0.2.0, ~14% dos
// gameplays no iPhone/iPad congelavam: o drawImage de um fundo 0x0 lancava
// InvalidStateError dentro do frame() e o loop do requestAnimationFrame morria.
// Roda o Chrome headless em tempo real (com --virtual-time-budget o rAF nao
// anda e o defeito nao aparece), pilotado pelo DevTools Protocol. Sobe o
// proprio servidor (porta 4352). Uso: node tools/telas.mjs [raiz]
//   raiz: '' testa o fonte; 'dist/' testa a build que vai para a Poki.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { servir } from './servir.mjs';

const raiz = (process.argv[2] || '').replace(/[^a-z0-9/_-]/gi, '');
const porta = 4362;
const portaDepuracao = 9362;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const fechar = await servir(porta);
const perfil = mkdtempSync(join(tmpdir(), 'slime-telas-'));
const chrome = spawn('google-chrome', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--host-resolver-rules=MAP game-cdn.poki.com 127.0.0.1:9',
  `--remote-debugging-port=${portaDepuracao}`, `--user-data-dir=${perfil}`, '--window-size=900,900', 'about:blank',
], { stdio: 'ignore' });

/** Encerra tudo e sai com o codigo dado. */
async function sair(codigo) {
  chrome.kill('SIGKILL');
  await fechar();
  await espera(200);
  rmSync(perfil, { recursive: true, force: true });
  process.exit(codigo);
}
const prazo = setTimeout(() => { process.stdout.write('telas: estourou o prazo de 60 s\n'); sair(1); }, 60000);

let alvo = null;
for (let k = 0; k < 60 && !alvo; k++) {
  await espera(250);
  try {
    const lista = await (await fetch(`http://127.0.0.1:${portaDepuracao}/json`)).json();
    alvo = lista.find((t) => t.type === 'page') || null;
  } catch { /* ignora */ }
}
if (!alvo) { process.stdout.write('telas: o Chrome nao abriu a porta de depuracao\n'); await sair(1); }

const ws = new WebSocket(alvo.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pendentes = new Map();
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(String(ev.data));
  if (m.id && pendentes.has(m.id)) { pendentes.get(m.id)(m); pendentes.delete(m.id); }
});
const cmd = (method, params = {}) => new Promise((r) => { const i = ++id; pendentes.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

// a pagina hospedeira so precisa ser da mesma origem do jogo (para ler o
// canvas do iframe): qualquer arquivo servido serve, e o LICENCAS.txt vai na build
await cmd('Page.enable');
await cmd('Page.navigate', { url: `http://127.0.0.1:${porta}/${raiz}LICENCAS.txt` });
await espera(800);

const banco = `(async () => {
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  document.documentElement.innerHTML = '<body style="margin:0;background:#111"></body>';
  const f = document.createElement('iframe');
  f.style.cssText = 'border:0;width:390px;height:700px;display:block';
  f.src = '/${raiz}index.html?modelo=1&semanuncio&semente=3';
  document.body.appendChild(f);
  const w = () => f.contentWindow;
  for (let k = 0; k < 50 && !(w() && w().__slime && w().__slime.J.modo); k++) await espera(100);
  if (!(w() && w().__slime)) return { falhas: ['o jogo nao subiu no iframe'] };
  const erros = [];
  w().addEventListener('error', (e) => erros.push(String(e.message)));
  const cv = () => w().document.getElementById('cFundo');
  // o loop esta vivo se redesenha um canvas apagado
  const vivo = async () => {
    const c = cv();
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
    await espera(400);
    if (!c.width || !c.height) return false;
    const d = c.getContext('2d').getImageData(c.width >> 1, (c.height / 3) | 0, 1, 1).data;
    return d[3] > 0;
  };
  const falhas = [];
  const casos = [
    ['altura 0', { height: '0px' }, { height: '700px' }],
    ['largura 0', { width: '0px' }, { width: '390px' }],
    ['escondido', { display: 'none' }, { display: 'block' }],
    ['paisagem', { width: '844px', height: '390px' }, { width: '390px', height: '844px' }],
  ];
  if (!(await vivo())) falhas.push('o canvas nao desenhava nem antes dos testes');
  for (const [nome, durante, depois] of casos) {
    const n = erros.length;
    Object.assign(f.style, durante);
    await espera(600);
    Object.assign(f.style, depois);
    await espera(400);
    if (!(await vivo())) falhas.push(nome + ': o canvas nao voltou a desenhar');
    if (erros.length > n) falhas.push(nome + ': ' + erros.slice(n).join(' / '));
  }
  const c = cv();
  if (c.width !== 390 || c.height !== 844) falhas.push('canvas ficou ' + c.width + 'x' + c.height + ' (esperado 390x844)');
  return { falhas };
})()`;
const r = await cmd('Runtime.evaluate', { expression: banco, awaitPromise: true, returnByValue: true });
clearTimeout(prazo);
const res = r.result && r.result.result ? r.result.result.value : null;
ws.close();
if (!res) {
  process.stdout.write(`telas: o banco nao terminou (${JSON.stringify(r.result || r.error)})\n`);
  await sair(1);
}
if (res.falhas.length) {
  process.stdout.write(`telas FALHOU${raiz ? ` (${raiz})` : ''}:\n  ${res.falhas.join('\n  ')}\n`);
  await sair(1);
}
process.stdout.write(`telas: passou${raiz ? ` (${raiz})` : ''} (altura 0, largura 0, escondido, paisagem)\n`);
await sair(0);

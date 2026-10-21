// Capas e videos de previa da CrazyGames (2026-10-19; docs.crazygames.com/requirements/game-covers):
// - capas 1920x1080, 800x1200 e 800x800 em marketing/crazygames/capa-<LxA>.png: desde 2026-10-21 a arte
//   do Grok que o usuario escolheu (tools/capa-pilha.html?modo=grok, com o titulo); a cena do jogo no
//   caderno (tools/capas-crazy.html) era a capa ate entao. A abertura dos videos usa a mesma arte;
// - videos 1920x1080 (16:9) e 1080x1620 (2:3), sem som, 18,2 s: a capa parada 1 s, 0,3 s de fusao da
//   capa para o jogo e 17,5 s de partida de verdade (o sem fim com o bot, 1 s por gota, semente 34,
//   depois de 2 min de partida: o pote cheio e colorido como na capa, ~17 fusoes, um "Triple!" e o
//   "Slime novo!" do nivel 10 perto do fim). Cada quadro e um print
//   do jogo com o laco pausado (__slime.avancar(2) = 1/30 s de jogo por quadro a 30 fps: sem acelerar),
//   com o HUD (e gameplay real) e em 2x (a janela tem metade do tamanho), e o ffmpeg monta em H.264.
//   O print leva ~0,9 s de relogio: o tempo virtual do DevTools anda 1/30 s por quadro (os setTimeout
//   do HUD, como os 2,6 s do cartao de slime novo) e as animacoes de CSS sao pausadas e postas no
//   tempo virtual a cada quadro (elas seguem o relogio de verdade mesmo com o tempo virtual);
// - folha de contato em marketing/crazygames/folha.jpg (as 3 capas e 6 quadros de cada video);
// - so com --video=1080x1920: o vertical 9:16 da Yandex Games (2026-10-20), a mesma partida, em
//   marketing/portais/video-1080x1920.mp4, que o tools/portais.mjs converte.
// Uso: node tools/capas-crazy.mjs [--so=capas|videos|folha] [--video=1080x1620] [--semente=34]
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { RAIZ, servir } from './servir.mjs';
import { chrome } from './shot.mjs';
import { espera } from './cdp.mjs';

const opt = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), ''] : [a.slice(2, i), a.slice(i + 1)]; }));
const SAIDA = join(RAIZ, 'marketing/crazygames');
const TMP = join(RAIZ, '.tmp/crazygames');
const CAPAS = ['1920x1080', '800x1200', '800x800'];
/**
 * Cada video: o tamanho final, a janela (metade: o print sai em 2x) e a capa da abertura. `saida` e
 * a pasta de quem nao e da CrazyGames, que so sai quando --video o pede.
 */
const VIDEOS = [
  { nome: 'video-1920x1080', janela: [960, 540], capa: '1920x1080' },
  { nome: 'video-1080x1620', janela: [540, 810], capa: '1080x1620' },
  { nome: 'video-1080x1920', janela: [540, 960], capa: '1080x1920', saida: 'marketing/portais' },
];
const DA_CRAZY = VIDEOS.filter((v) => !v.saida);
const FPS = 30;
const SEG_JOGO = 17.5;
const CAPA_PARADA = 1.0;
const FUSAO = 0.3;
const SEMENTE = Number(opt.semente) || 34;
const JOGO = `semente=${SEMENTE}&passos=7200&auto=1000&lang=en&semanuncio&cenario=caderno&cesto=becher&objeto=classico&qualidade=0`;
/**
 * Perfil com o check-in de hoje ja feito: sem ele o perfil novo do Chrome mostraria o aviso da
 * sequencia diaria ("Day 1 streak!") por cima do video.
 */
const PERFIL = `(() => { const d = new Date(); const hoje = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  localStorage.setItem('slime.perfil', JSON.stringify({ sequencia: { ultimo: hoje, dias: 1 } })); return hoje; })()`;

const porta = 5396;
const fechar = await servir(porta);
mkdirSync(SAIDA, { recursive: true });
mkdirSync(TMP, { recursive: true });
const ff = (args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args]);

/** Uma capa (a janela do Chrome com o tamanho exato, o print e o PNG). */
async function capa(tam, arq) {
  const [w, h] = tam.split('x');
  const perfil = mkdtempSync(join(tmpdir(), 'slime-capa-'));
  await chrome(['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
    `--user-data-dir=${perfil}`, `--window-size=${w},${h}`, '--virtual-time-budget=6000', `--screenshot=${arq}`,
    `http://127.0.0.1:${porta}/tools/capa-pilha.html?modo=grok&w=${w}&h=${h}`], 180000);
  rmSync(perfil, { recursive: true, force: true });
  process.stdout.write(`capa -> ${relative(RAIZ, arq)}\n`);
}

/**
 * Chrome headless pelo DevTools Protocol com eventos (o tools/cdp.mjs so responde comandos): o
 * tempo virtual avisa no Emulation.virtualTimeBudgetExpired.
 */
async function abrirCdp(largura, altura, portaCdp) {
  const perfil = mkdtempSync(join(tmpdir(), 'slime-capas-'));
  const proc = spawn('google-chrome', ['--headless=new', '--no-first-run', '--no-default-browser-check', '--mute-audio', '--hide-scrollbars',
    '--host-resolver-rules=MAP game-cdn.poki.com 127.0.0.1:9', `--remote-debugging-port=${portaCdp}`, `--user-data-dir=${perfil}`,
    `--window-size=${largura},${altura}`, 'about:blank'], { stdio: 'ignore' });
  let alvo = null;
  for (let k = 0; k < 80 && !alvo; k++) {
    await espera(150);
    try { alvo = (await (await fetch(`http://127.0.0.1:${portaCdp}/json`)).json()).find((t) => t.type === 'page') || null; } catch { /* subindo */ }
  }
  if (!alvo) { proc.kill('SIGKILL'); throw new Error('o Chrome nao abriu a porta de depuracao'); }
  const ws = new WebSocket(alvo.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0;
  const pendentes = new Map();
  const ouvintes = new Map();
  /** @type {string[]} */
  const erros = [];
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(String(ev.data));
    if (m.id && pendentes.has(m.id)) { pendentes.get(m.id)(m); pendentes.delete(m.id); return; }
    if (m.method === 'Runtime.exceptionThrown') erros.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method && ouvintes.has(m.method)) { const f = ouvintes.get(m.method); ouvintes.delete(m.method); f(m.params); }
  });
  const cmd = (method, params = {}) => new Promise((r) => { const i = ++id; pendentes.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await cmd('Page.enable');
  await cmd('Runtime.enable');
  await cmd('Emulation.setDeviceMetricsOverride', { width: largura, height: altura, deviceScaleFactor: 2, mobile: false });
  return {
    erros,
    cmd,
    /** @param {string} nome */
    evento: (nome) => new Promise((r) => ouvintes.set(nome, r)),
    async avaliar(expr) {
      const r = await cmd('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.result && r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'erro no avaliar');
      return r.result && r.result.result ? r.result.result.value : undefined;
    },
    async fechar() {
      try { ws.close(); } catch { /* ignora */ }
      proc.kill('SIGKILL');
      await espera(200);
      rmSync(perfil, { recursive: true, force: true });
    },
  };
}

/** Poe cada animacao de CSS da pagina no tempo virtual (pausada, contada de quando apareceu). */
const ANIMACOES = `(() => { const agora = performance.now(); for (const a of document.getAnimations()) {
  if (a.__ini === undefined) { a.__ini = agora; a.pause(); } a.currentTime = agora - a.__ini; } return true; })()`;

/** Os quadros da partida de um video, em TMP/<nome>/q0000.jpg... */
async function quadros(v) {
  const pasta = join(TMP, v.nome);
  rmSync(pasta, { recursive: true, force: true });
  mkdirSync(pasta, { recursive: true });
  const [w, h] = v.janela;
  const c = await abrirCdp(w, h, 9396);
  try {
    // o localStorage e da origem: uma pagina leve dela primeiro, para gravar o perfil
    await c.cmd('Page.navigate', { url: `http://127.0.0.1:${porta}/LICENCAS.txt` });
    await espera(800);
    await c.avaliar(PERFIL);
    await c.cmd('Page.navigate', { url: `http://127.0.0.1:${porta}/index.html?${JOGO}` });
    await espera(2500);
    for (let k = 0; k < 40 && !(await c.avaliar('!!(window.__slime && __slime.J.modo && __slime.J.estado === "jogando")')); k++) await espera(500);
    // laco pausado (um quadro do video = 2 passos de 1/60 s); como quem ja tocou (sem a mao nem as
    // teclas da dica); o HUD da CrazyGames (sem o canto do botao da Poki)
    await c.avaliar('__slime.laco.pausar(true); __slime.J.tocou = true; document.body.dataset.plataforma = "crazygames"; true');
    await c.cmd('Emulation.setVirtualTimePolicy', { policy: 'pause' });
    const n = Math.round(SEG_JOGO * FPS);
    for (let q = 0; q < n; q++) {
      await c.avaliar('__slime.avancar(2); true');
      const fim = c.evento('Emulation.virtualTimeBudgetExpired');
      await c.cmd('Emulation.setVirtualTimePolicy', { policy: 'advance', budget: 1000 / FPS });
      await fim;
      await c.avaliar(ANIMACOES);
      const r = await c.cmd('Page.captureScreenshot', { format: 'jpeg', quality: 93 });
      writeFileSync(join(pasta, `q${String(q).padStart(4, '0')}.jpg`), Buffer.from(r.result.data, 'base64'));
      if (q % 100 === 0) process.stdout.write(`${v.nome}: quadro ${q}/${n}\n`);
    }
    if (c.erros.length) process.stdout.write(`avisos do jogo: ${c.erros.join(' | ')}\n`);
  } finally {
    await c.fechar();
  }
  return pasta;
}

/** A capa parada, a fusao para o jogo e a partida, em H.264 sem audio. */
function montar(v, pasta) {
  const capaArq = join(TMP, `capa-${v.capa}.png`);
  const mp4 = join(v.saida ? join(RAIZ, v.saida) : SAIDA, `${v.nome}.mp4`);
  const [W, H] = v.nome.replace('video-', '').split('x');
  ff(['-loop', '1', '-framerate', String(FPS), '-t', String(CAPA_PARADA + FUSAO), '-i', capaArq,
    '-framerate', String(FPS), '-i', join(pasta, 'q%04d.jpg'),
    '-filter_complex', `[0:v]scale=${W}:${H}:out_range=tv:out_color_matrix=bt709,format=yuv420p,setsar=1[a];[1:v]scale=${W}:${H}:in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p,setsar=1[b];[a][b]xfade=transition=fade:duration=${FUSAO}:offset=${CAPA_PARADA},format=yuv420p[v]`,
    '-map', '[v]', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p', '-color_range', 'tv',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-r', String(FPS), '-movflags', '+faststart', mp4]);
  process.stdout.write(`video -> ${relative(RAIZ, mp4)}\n`);
  return mp4;
}

/** Folha de contato: as 3 capas numa linha e 6 quadros de cada video embaixo. */
function folha() {
  const L = 1920;
  const linha1 = join(TMP, 'folha-capas.png');
  ff(['-i', join(SAIDA, 'capa-1920x1080.png'), '-i', join(SAIDA, 'capa-800x1200.png'), '-i', join(SAIDA, 'capa-800x800.png'),
    '-filter_complex', '[0]scale=-1:540[a];[1]scale=-1:540[b];[2]scale=-1:540[c];[a][b][c]hstack=inputs=3,pad=' + L + ':580:(ow-iw)/2:20:white', linha1]);
  const tempos = [0.2, 2.5, 6, 10, 14, 17.8];
  const linhas = [linha1];
  for (const [k, v] of DA_CRAZY.entries()) {
    const mp4 = join(SAIDA, `${v.nome}.mp4`);
    const altura = k === 0 ? 170 : 300;
    const ents = [];
    for (const [i, t] of tempos.entries()) {
      const q = join(TMP, `folha-${k}-${i}.png`);
      ff(['-ss', String(t), '-i', mp4, '-frames:v', '1', '-vf', `scale=-1:${altura}`, q]);
      ents.push('-i', q);
    }
    const lin = join(TMP, `folha-video-${k}.png`);
    ff([...ents, '-filter_complex', `hstack=inputs=${tempos.length},pad=${L}:${altura + 20}:(ow-iw)/2:10:white`, lin]);
    linhas.push(lin);
  }
  const jpg = join(SAIDA, 'folha.jpg');
  ff([...linhas.flatMap((l) => ['-i', l]), '-filter_complex', `vstack=inputs=${linhas.length}`, '-q:v', '3', jpg]);
  process.stdout.write(`folha -> ${relative(RAIZ, jpg)}\n`);
}

try {
  if (opt.so === 'folha') {
    folha();
  } else {
  if (opt.so !== 'videos') {
    for (const t of CAPAS) await capa(t, join(SAIDA, `capa-${t}.png`));
  }
  // as capas da abertura dos videos no tamanho de cada um (a de 1080x1620 e a 2:3 em mais pixels)
  const videos = opt.video ? VIDEOS.filter((v) => v.nome.endsWith(opt.video)) : DA_CRAZY;
  for (const v of videos) await capa(v.capa, join(TMP, `capa-${v.capa}.png`));
  if (opt.so !== 'capas') {
    for (const v of videos) montar(v, await quadros(v));
  }
  if (!opt.so && !opt.video) folha();
  }
} finally {
  await fechar();
}

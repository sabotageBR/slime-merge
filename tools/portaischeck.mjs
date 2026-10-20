// Banco dos portais de distribuicao (src/core/portais/): cada build roda com um SDK falso que imita
// o do portal - servido no lugar do de verdade, pela mesma URL - e a automacao confere o que as
// regras de cada um cobram:
// - o SDK inicia e o jogo avisa o fim do carregamento do jeito do portal;
// - o idioma vem do portal (o falso responde `es`) onde ele tem API para isso;
// - o intervalo da troca de modo pelo menu chega ao SDK e o som esta calado quando o video entra;
// - o intervalo do fim de evento do sem fim (que vem do tempo): so com o aviso de 2 s na Yandex e na
//   Playgama, e nenhum na Y8, na GamePix, na GameDistribution e na GameMonetize;
// - o video premiado paga so quando o SDK diz que foi visto ate o fim (a GameMonetize nao tem video:
//   os botoes somem);
// - a pausa do portal fora do anuncio cala o jogo e abre a pausa, e a volta devolve o som;
// - na Playgama e na GamePix o save vai para o armazenamento do portal;
// - na GameDistribution o pre-roll sai antes do jogo abrir.
// Cada portal e montado em dist/ pelo tools/empacotar.mjs --ensaio com ids de teste (os de
// marketing/portais/ids.json ficam para o zip publicado). Porta HTTP 5399 e de depuracao 9398.
// Uso: node tools/portaischeck.mjs [yandex y8 ...]
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RAIZ, servir } from './servir.mjs';
import { espera } from './cdp.mjs';

const PORTA = 5399;
const PORTA_CDP = 9398;
const TODOS = ['yandex', 'playgama', 'gamepix', 'y8', 'gamedistribution', 'gamemonetize'];
const pedidos = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const ALVOS = pedidos.length ? pedidos : TODOS;
const IDS_TESTE = { appId: 'teste-app', gameId: 'teste-jogo' };
const { textos } = await import('../src/i18n/textos.js');
const ES = textos('es');

/** O que o SDK falso guarda e o que a automacao manda nele. Vale para todos. */
const COMUM = `
window.__log = window.__log || [];
window.__sdkFalso = window.__sdkFalso || { premio: true, store: {}, pausar() {}, retomar() {} };
window.__calado = () => !!(window.__slime && window.__slime.audio && window.__slime.audio.calado);
`;

/** Os SDKs falsos, pela URL que a build pede. */
const FALSOS = {
  yandex: {
    url: '*/sdk.js',
    js: `${COMUM}
window.YaGames = { init() {
  const ev = {};
  const s = {
    environment: { i18n: { lang: 'es' } },
    features: { LoadingAPI: { ready() { __log.push('pronto'); } } },
    on(n, f) { (ev[n] = ev[n] || []).push(f); },
    adv: {
      showFullscreenAdv({ callbacks: c }) {
        __log.push('midgame');
        setTimeout(() => { c.onOpen(); __log.push('abriu:' + __calado()); setTimeout(() => c.onClose(true), 250); }, 80);
      },
      showRewardedVideo({ callbacks: c }) {
        __log.push('rewarded');
        setTimeout(() => { c.onOpen(); __log.push('abriu:' + __calado());
          setTimeout(() => { if (__sdkFalso.premio) c.onRewarded(); c.onClose(); }, 250); }, 80);
      },
    },
  };
  __sdkFalso.pausar = () => (ev.game_api_pause || []).forEach((f) => f());
  __sdkFalso.retomar = () => (ev.game_api_resume || []).forEach((f) => f());
  return Promise.resolve(s);
} };`,
  },
  playgama: {
    url: '*playgama-bridge.js*',
    js: `${COMUM}
(() => {
  const ouv = { a: {}, p: {} };
  const on = (t) => (n, f) => { (ouv[t][n] = ouv[t][n] || []).push(f); };
  const off = (t) => (n, f) => { ouv[t][n] = (ouv[t][n] || []).filter((g) => g !== f); };
  const emite = (t, n, v) => (ouv[t][n] || []).slice().forEach((f) => f(v));
  const E = { INTERSTITIAL_STATE_CHANGED: 'i', REWARDED_STATE_CHANGED: 'r', AUDIO_STATE_CHANGED: 'au', PAUSE_STATE_CHANGED: 'pa' };
  const anuncio = (n, premio) => {
    setTimeout(() => { emite('a', n, 'opened'); __log.push('abriu:' + __calado());
      setTimeout(() => { if (premio) emite('a', n, 'rewarded'); emite('a', n, 'closed'); }, 250); }, 80);
  };
  window.bridge = {
    EVENT_NAME: E,
    initialize() { __log.push('init'); return Promise.resolve(); },
    platform: {
      language: 'es', isAudioEnabled: true,
      on: on('p'),
      sendMessage(m) { __log.push('msg:' + m); },
    },
    storage: {
      get(ks) { return Promise.resolve(ks.map((k) => (k in __sdkFalso.store ? __sdkFalso.store[k] : null))); },
      set(ks, vs) { ks.forEach((k, i) => { __sdkFalso.store[k] = vs[i]; }); __log.push('gravou'); return Promise.resolve(); },
    },
    advertisement: {
      isInterstitialSupported: true, isRewardedSupported: true,
      on: on('a'), off: off('a'),
      showInterstitial() { __log.push('midgame'); anuncio('i', false); },
      showRewarded() { __log.push('rewarded'); anuncio('r', __sdkFalso.premio); },
    },
  };
  __sdkFalso.pausar = () => emite('p', 'pa', true);
  __sdkFalso.retomar = () => emite('p', 'pa', false);
})();`,
  },
  gamepix: {
    url: '*gamepix.sdk.js*',
    js: `${COMUM}
window.GamePix = {
  loading(n) { __log.push('loading:' + n); },
  loaded() { __log.push('pronto'); return Promise.resolve(); },
  lang() { return 'es'; },
  localStorage: {
    getItem(k) { return k in __sdkFalso.store ? __sdkFalso.store[k] : null; },
    setItem(k, v) { __sdkFalso.store[k] = String(v); __log.push('gravou'); },
    removeItem(k) { delete __sdkFalso.store[k]; },
  },
  updateLevel(n) { __log.push('fase:' + n); },
  happyMoment() { __log.push('festa'); },
  interstitialAd() { __log.push('midgame'); return new Promise((r) => setTimeout(() => { __log.push('abriu:' + __calado()); r({ success: true }); }, 250)); },
  rewardAd() { __log.push('rewarded'); return new Promise((r) => setTimeout(() => { __log.push('abriu:' + __calado()); r({ success: __sdkFalso.premio }); }, 250)); },
};
// como o SDK v3 de verdade: GamePix.on.<evento> se for funcao, senao GamePix.<evento>
GamePix.on = { pause: false, resume: false, soundOn: false, soundOff: false };
const despacha = (n) => (typeof GamePix.on[n] === 'function' ? GamePix.on[n] : GamePix[n])();
__sdkFalso.pausar = () => despacha('pause');
__sdkFalso.retomar = () => despacha('resume');`,
  },
  y8: {
    url: '*y8.min.js*',
    js: `${COMUM}
window.y8 = {
  emitReadyEvent() { window.dispatchEvent(new Event('y8sdk.ready')); },
  sdk() { return {
    init(app, ad) { __log.push('init:' + app.appId + ':' + (ad && ad.gameId)); },
    getPlatformLocale() { return Promise.resolve('es'); },
    showAd(o) {
      __log.push(o.type === 'reward' ? 'rewarded' : 'midgame:' + o.type);
      return new Promise((res) => setTimeout(() => {
        o.beforeAd(); __log.push('abriu:' + __calado());
        if (o.type === 'reward') { o.beforeReward(() => {}); if (__sdkFalso.premio) o.adViewed(); else o.adDismissed(); }
        setTimeout(() => { o.afterAd(); o.adBreakDone({ breakStatus: __sdkFalso.premio ? 'viewed' : 'dismissed' }); res(); }, 250);
      }, 80));
    },
  }; },
};
window.dispatchEvent(new Event('y8sdk.ready'));`,
  },
  gamedistribution: {
    url: '*html5.api.gamedistribution.com*',
    js: `${COMUM}
(() => {
  const o = window.GD_OPTIONS;
  __log.push('opcoes:' + o.gameId);
  const emite = (name) => o.onEvent({ name });
  window.gdsdk = {
    preloadAd() { return Promise.resolve(); },
    showAd(t) {
      __log.push(t === 'rewarded' ? 'rewarded' : 'midgame:' + (window.__slime ? 'jogo' : 'preroll'));
      return new Promise((res) => setTimeout(() => {
        emite('SDK_GAME_PAUSE'); __log.push('abriu:' + __calado());
        setTimeout(() => { if (t === 'rewarded' && __sdkFalso.premio) emite('SDK_REWARDED_WATCH_COMPLETE'); emite('SDK_GAME_START'); res(); }, 250);
      }, 80));
    },
  };
  __sdkFalso.pausar = () => emite('SDK_GAME_PAUSE');
  __sdkFalso.retomar = () => emite('SDK_GAME_START');
  setTimeout(() => emite('SDK_READY'), 40);
})();`,
  },
  gamemonetize: {
    url: '*api.gamemonetize.com*',
    js: `${COMUM}
(() => {
  const o = window.SDK_OPTIONS;
  __log.push('opcoes:' + o.gameId);
  const emite = (name) => o.onEvent({ name });
  window.sdk = {
    showBanner() {
      __log.push('midgame');
      setTimeout(() => { emite('SDK_GAME_PAUSE'); __log.push('abriu:' + __calado()); setTimeout(() => emite('SDK_GAME_START'), 250); }, 80);
    },
  };
  __sdkFalso.pausar = () => emite('SDK_GAME_PAUSE');
  __sdkFalso.retomar = () => emite('SDK_GAME_START');
  setTimeout(() => emite('SDK_READY'), 40);
})();`,
  },
};

/** O que cada portal tem e o banco confere. evento: o intervalo do fim de evento do sem fim. */
const TEM = {
  yandex: { idioma: true, pausa: true, video: true, sinal: 'pronto', evento: 'aviso' },
  playgama: { idioma: true, pausa: true, video: true, sinal: 'msg:game_ready', evento: 'aviso', save: true },
  gamepix: { idioma: true, pausa: true, video: true, sinal: 'pronto', evento: false, save: true },
  y8: { idioma: true, pausa: false, video: true, sinal: 'init:teste-app:teste-jogo', evento: false },
  gamedistribution: { idioma: false, pausa: true, video: true, sinal: 'opcoes:teste-jogo', evento: false, preroll: true },
  gamemonetize: { idioma: false, pausa: true, video: false, sinal: 'opcoes:teste-jogo', evento: false },
};

let falhas = 0;
/** @param {string} nome @param {boolean} ok @param {string} [det] */
function confere(nome, ok, det = '') {
  process.stdout.write(`${ok ? '  ok  ' : ' FALHA'}  ${nome}${det ? '  -  ' + det : ''}\n`);
  if (!ok) falhas++;
}

const fechar = await servir(PORTA);
const perfil = mkdtempSync(join(tmpdir(), 'slime-portais-'));
const chrome = spawn('google-chrome', ['--headless=new', '--no-first-run', '--no-default-browser-check', '--mute-audio',
  `--remote-debugging-port=${PORTA_CDP}`, `--user-data-dir=${perfil}`, '--window-size=960,600', 'about:blank'], { stdio: 'ignore' });
let ws = '';
for (let k = 0; k < 80 && !ws; k++) {
  await espera(150);
  try { ws = (await (await fetch(`http://127.0.0.1:${PORTA_CDP}/json/version`)).json()).webSocketDebuggerUrl; } catch { /* subindo */ }
}
const sock = new WebSocket(ws);
await new Promise((r) => sock.addEventListener('open', r));
let id = 0;
const pendentes = new Map();
const ouvintes = new Map();
/** @type {string[]} */
let erros = [];
sock.addEventListener('message', (ev) => {
  const m = JSON.parse(String(ev.data));
  if (m.id && pendentes.has(m.id)) { pendentes.get(m.id)(m); pendentes.delete(m.id); return; }
  if (m.method === 'Runtime.exceptionThrown') erros.push(m.params.exceptionDetails.exception?.description?.split('\n')[0] || m.params.exceptionDetails.text);
  if (m.method && ouvintes.has(m.method)) ouvintes.get(m.method)(m.params);
});
const send = (method, params = {}, sessionId) => new Promise((r) => {
  const i = ++id;
  pendentes.set(i, r);
  sock.send(JSON.stringify({ id: i, method, params, ...(sessionId ? { sessionId } : {}) }));
});

try {
  for (const portal of ALVOS) {
    process.stdout.write(`\n=== ${portal} ===\n`);
    const b = spawnSync('node', ['tools/empacotar.mjs', `--alvo=${portal}`, '--ensaio'], {
      cwd: RAIZ, encoding: 'utf8', env: { ...process.env, IDS_PORTAL: JSON.stringify(IDS_TESTE) },
    });
    if (b.status !== 0) { confere('build', false, (b.stdout + b.stderr).slice(-300)); continue; }
    erros = [];
    const falso = FALSOS[portal];
    const tem = TEM[portal];
    const { targetId } = (await send('Target.createTarget', { url: 'about:blank' })).result;
    const { sessionId } = (await send('Target.attachToTarget', { targetId, flatten: true })).result;
    await send('Page.enable', {}, sessionId);
    await send('Runtime.enable', {}, sessionId);
    await send('Emulation.setDeviceMetricsOverride', { width: 960, height: 600, deviceScaleFactor: 1, mobile: false }, sessionId);
    await send('Fetch.enable', { patterns: [{ urlPattern: falso.url }] }, sessionId);
    ouvintes.set('Fetch.requestPaused', (p) => {
      send('Fetch.fulfillRequest', {
        requestId: p.requestId, responseCode: 200,
        responseHeaders: [{ name: 'content-type', value: 'text/javascript' }],
        body: Buffer.from(falso.js).toString('base64'),
      }, sessionId);
    });
    await send('Page.navigate', { url: `http://127.0.0.1:${PORTA}/dist/index.html` }, sessionId);
    const js = async (/** @type {string} */ e) => {
      const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }, sessionId);
      return r.result?.result?.value;
    };
    let pronto = false;
    for (let k = 0; k < 60 && !pronto; k++) {
      await espera(250);
      pronto = (await js('!!(window.__slime && window.__slime.J.carregou && window.__slime.J.estado === "jogando")')) === true;
    }
    confere('o jogo abre', pronto);
    if (!pronto) {
      if (erros.length) process.stdout.write(`   erros: ${erros.slice(0, 3).join(' | ')}\n`);
      await send('Target.closeTarget', { targetId });
      continue;
    }
    const log = async () => /** @type {string[]} */ (JSON.parse((await js('JSON.stringify(window.__log)')) || '[]'));
    const l0 = await log();
    confere('SDK pronto', (await js('__slime.poki.sdkPronto')) === true);
    confere('fim do carregamento avisado ao portal', l0.includes(tem.sinal), l0.join(' '));
    if (tem.preroll) confere('pre-roll antes de o jogo abrir', l0.includes('midgame:preroll'), l0.join(' '));
    if (tem.idioma) {
      const txt = await js("(document.querySelector('[data-t=\"deNovo\"]') || {}).textContent");
      confere('idioma do portal', txt === ES.deNovo, String(txt));
    }

    // intervalo da navegacao: trocar de modo pelo menu (depois do primeiro gameplay)
    await js('__slime.poki.gameplayStart(); __slime.J.tocou = true; window.__log.length = 0; true');
    await js("__slime.entrarModo('duelo')");
    const l1 = await log();
    confere('intervalo da troca de modo chega ao SDK', l1.some((x) => x.startsWith('midgame')), l1.join(' '));
    confere('som calado quando o video entra', l1.includes('abriu:true'), l1.join(' '));
    confere('som de volta depois', (await js('__slime.audio.calado')) === false);

    // intervalo do fim de evento do sem fim (vem do tempo de jogo)
    await js("__slime.entrarModo('semfim')");
    await js('window.__log.length = 0; const J = __slime.J; J.tempoJogo = 5000; J.ultimoAnuncio = 0; J.tocou = true; J.modo.eventos.push({ tipo: "intervalo", origem: "evento" }); __slime.avancar(1); true');
    await espera(600);
    const avisando = await js("[...document.querySelectorAll('*')].some((e) => e.children.length === 0 && /" + ES.anuncioEm.split('{n}')[0].trim() + "/.test(e.textContent || ''))");
    await espera(2600);
    const l2 = await log();
    if (tem.evento === 'aviso') {
      confere('fim de evento: aviso de 2 s antes do anuncio', avisando === true);
      confere('fim de evento: anuncio depois do aviso', l2.some((x) => x.startsWith('midgame')), l2.join(' '));
    } else {
      confere('fim de evento: nenhum anuncio (regra do portal)', !l2.some((x) => x.startsWith('midgame')), l2.join(' '));
    }
    await espera(400);

    // video premiado
    await js('window.__log.length = 0; window.__sdkFalso.premio = true; true');
    const pago = await js('__slime.poki.rewardedBreak()');
    if (tem.video) {
      confere('video visto ate o fim paga', pago === true, (await log()).join(' '));
      await js('window.__sdkFalso.premio = false; true');
      confere('video pulado nao paga', (await js('__slime.poki.rewardedBreak()')) === false);
    } else {
      confere('sem video premiado no portal', pago === false && !(await log()).includes('rewarded'));
      confere('botoes de video escondidos', (await js("document.body.classList.contains('sem-anuncio')")) === true);
    }

    if (tem.pausa) {
      await js('__slime.J.estado = "jogando"; window.__sdkFalso.pausar(); true');
      confere('pausa do portal cala o jogo', (await js('__slime.audio.mudoPlataforma')) === true);
      confere('pausa do portal abre a pausa, com o menu', (await js("__slime.J.estado === 'pausa' && !document.getElementById('menu').hidden")) === true);
      await js('window.__sdkFalso.retomar(); true');
      confere('volta do portal devolve o som', (await js('__slime.audio.mudoPlataforma')) === false);
      confere('volta do portal fecha o menu e segue sozinha', (await js("__slime.J.estado === 'jogando' && document.getElementById('menu').hidden")) === true);
    }
    // a aba escondida no meio da partida (o "Open Tab" da GamePix): o menu de pausa, que fica na volta
    await js(`Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (true ? 'hidden' : 'visible') }); document.dispatchEvent(new Event('visibilitychange')); true`);
    const naAba = await js('__slime.J.estado');
    await js(`Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (false ? 'hidden' : 'visible') }); document.dispatchEvent(new Event('visibilitychange')); true`);
    confere('aba escondida abre a pausa, com o menu', naAba === 'pausa' && (await js("!document.getElementById('menu').hidden")) === true, String(naAba));
    await espera(1300);
    confere('volta da aba retoma sozinha', (await js("__slime.J.estado === 'jogando' && document.getElementById('menu').hidden")) === true, String(await js('__slime.J.estado')));
    if (tem.save) {
      await espera(1800);
      const store = String(await js('JSON.stringify(window.__sdkFalso.store)'));
      confere('save no armazenamento do portal', /slime\./.test(store), store.slice(0, 90));
    }
    confere('sem erro no console', erros.length === 0, erros.slice(0, 2).join(' | '));
    ouvintes.delete('Fetch.requestPaused');
    await send('Target.closeTarget', { targetId });
  }
} finally {
  try { sock.close(); } catch { /* ignora */ }
  chrome.kill('SIGKILL');
  await espera(200);
  rmSync(perfil, { recursive: true, force: true });
  await fechar();
}
process.stdout.write(`\n=== Resultado: ${falhas} falhas ===\n`);
process.exit(falhas ? 1 : 0);

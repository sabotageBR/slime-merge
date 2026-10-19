// core/crazygames.js: o SDK v3 da CrazyGames com a interface do core/poki.js (build --alvo=crazygames).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { criarCrazy, plataforma, ANUNCIOS } from '../src/core/crazygames.js';
import { plataforma as plataformaPoki } from '../src/core/poki.js';
import { criarCrazyFalso } from './apoio/crazy-falso.js';
import { criarRelogioFalso, esvaziar } from './apoio/relogio-falso.js';

/**
 * CrazyGames com SDK falso e relogio falso; onAdStart/onAdEnd entram no mesmo log do SDK.
 * @param {Parameters<typeof criarCrazyFalso>[0] & { anuncios?: boolean }} [opcoes]
 */
function montar({ anuncios = true, ...opcoesSdk } = {}) {
  const relogio = criarRelogioFalso();
  const falso = criarCrazyFalso(opcoesSdk);
  const p = criarCrazy({ obterSdk: () => falso.sdk, anuncios, agendar: relogio.agendar, cancelar: relogio.cancelar });
  p.onAdStart = () => falso.log.push(['onAdStart']);
  p.onAdEnd = () => falso.log.push(['onAdEnd']);
  return { p, falso, relogio };
}

/** Pronto, com o loading enviado e jogando. */
async function montarJogando(opcoes) {
  const m = montar(opcoes);
  await m.p.init();
  m.p.gameLoadingFinished();
  m.p.gameplayStart();
  m.falso.log.length = 0;
  return m;
}

/**
 * Estado de uma promessa sem esperar por ela.
 * @param {Promise<any>} promessa
 */
function espiar(promessa) {
  const e = { feito: false, valor: /** @type {any} */ (undefined) };
  promessa.then((v) => { e.feito = true; e.valor = v; });
  return e;
}

test('CrazyGames: sem SDK ou no ambiente disabled, tudo vira no-op e nada chega ao SDK', async () => {
  const relogio = criarRelogioFalso();
  const desligado = criarCrazyFalso({ ambiente: 'disabled' });
  for (const obterSdk of [() => undefined, () => { throw new Error('bloqueado'); }, () => desligado.sdk]) {
    const p = criarCrazy({ obterSdk, agendar: relogio.agendar, cancelar: relogio.cancelar });
    await p.init();
    assert.equal(p.sdkPronto, false);
    assert.equal(p.temAnuncios, false);
    assert.doesNotThrow(() => {
      p.gameLoadingFinished();
      p.gameplayStart();
      p.measure('nivel', '3', 'start');
      p.gameplayStop();
    });
    assert.equal(await p.rewardedBreak(), false);
    assert.equal(await p.commercialBreak(), false);
  }
  assert.deepEqual(desligado.log, []);
  assert.equal(relogio.timersPendentes(), 0);
});

test('CrazyGames: init chama init e loadingStart; loading e gameplay chegam na ordem e sem repetir', async () => {
  const { p, falso } = montar();
  p.gameplayStart(); // antes do init: fica guardado
  await p.init();
  assert.equal(p.sdkPronto, true);
  assert.equal(p.temAnuncios, true);
  p.gameplayStart();
  p.measure('nivel', '3', 'start'); // nao existe na CrazyGames
  p.gameplayStop();
  p.gameplayStop();
  p.gameLoadingFinished();
  assert.deepEqual(falso.log.map((l) => l[0]), ['init', 'addSettingsChangeListener', 'hasAdblock', 'loadingStart', 'loadingStop', 'gameplayStart', 'gameplayStop']);
});

test('CrazyGames: rewarded so premia no adFinished; o audio cala so quando o anuncio comeca', async () => {
  const { p, falso } = await montarJogando();
  const ok = espiar(p.rewardedBreak());
  await esvaziar();
  assert.deepEqual(falso.log, [['gameplayStop'], ['requestAd', 'rewarded']], 'pediu sem calar');
  falso.comecar();
  assert.deepEqual(falso.log.at(-1), ['onAdStart']);
  falso.terminar();
  await esvaziar();
  assert.equal(ok.valor, true);
  assert.deepEqual(falso.log.at(-1), ['onAdEnd']);
  assert.equal(p.emAnuncio, false);

  for (const code of ['unfilled', 'adCooldown', 'other']) {
    falso.log.length = 0;
    const falhou = espiar(p.rewardedBreak());
    await esvaziar();
    falso.falhar(code);
    await esvaziar();
    assert.equal(falhou.valor, false, code);
    assert.equal(p.temAnuncios, true, code);
    assert.ok(!falso.log.some((l) => l[0] === 'onAdStart' || l[0] === 'onAdEnd'), `${code}: o audio nem calou`);
  }
});

test('CrazyGames: commercialBreak pede midgame e o cooldown volta na hora, sem travar o jogo', async () => {
  const { p, falso, relogio } = await montarJogando();
  const r = espiar(p.commercialBreak());
  await esvaziar();
  assert.deepEqual(falso.log.at(-1), ['requestAd', 'midgame']);
  falso.falhar('adCooldown');
  await esvaziar();
  assert.equal(r.valor, true, 'o intervalo foi pedido');
  assert.equal(p.emAnuncio, false);
  assert.equal(relogio.timersPendentes(), 0);
  assert.equal(p.intervaloNaNavegacao, false, 'sem intervalo no botao de navegacao');
});

test('CrazyGames: Basic Launch (sem anuncios) nao pede anuncio nem cala o audio', async () => {
  const { p, falso } = await montarJogando({ anuncios: false });
  assert.equal(p.sdkPronto, true);
  assert.equal(p.temAnuncios, false);
  assert.equal(await p.rewardedBreak(), false);
  assert.equal(await p.commercialBreak(), false);
  assert.deepEqual(falso.log, []);
});

test('CrazyGames: o erro adsDisabledBasicLaunch desliga os anuncios na sessao', async () => {
  const { p, falso } = await montarJogando();
  let avisos = 0;
  p.onSemAnuncios = () => { avisos++; };
  const r = espiar(p.rewardedBreak());
  await esvaziar();
  falso.falhar('adsDisabledBasicLaunch');
  await esvaziar();
  assert.equal(r.valor, false);
  assert.equal(p.temAnuncios, false);
  falso.log.length = 0;
  assert.equal(await p.rewardedBreak(), false);
  assert.equal(await p.commercialBreak(), false);
  assert.equal(falso.pendente, false);
  assert.deepEqual(falso.log, [], 'nada chega ao SDK nem cala o audio');
  assert.equal(avisos, 1);
  assert.equal(p.bloqueador, false);
});

test('CrazyGames: bloqueador (hasAdblock ou erro adblock) desliga os videos com aviso, e o jogo segue', async () => {
  const a = montar({ bloqueador: true });
  let avisos = 0;
  a.p.onSemAnuncios = () => { avisos++; };
  await a.p.init();
  await esvaziar();
  assert.equal(a.p.bloqueador, true);
  assert.equal(a.p.temAnuncios, false);
  assert.equal(avisos, 1);
  a.p.gameplayStart();
  assert.equal(await a.p.rewardedBreak(), false);
  assert.ok(!a.falso.log.some((l) => l[0] === 'requestAd'));

  const b = await montarJogando();
  const r = espiar(b.p.rewardedBreak());
  await esvaziar();
  b.falso.falhar('adblock');
  await esvaziar();
  assert.equal(r.valor, false);
  assert.equal(b.p.bloqueador, true);
  assert.equal(b.p.temAnuncios, false);
});

test('CrazyGames: progresso no modulo data so quando ele grava e le de volta', async () => {
  const ok = montar();
  const fonte = await ok.p.fonteDados();
  assert.equal(fonte, ok.falso.sdk.data);
  assert.equal(ok.falso.guardado.size, 0, 'a sonda nao fica');
  for (const dados of /** @type {const} */ (['nada', 'mudo'])) {
    const m = montar({ dados });
    assert.equal(await m.p.fonteDados(), null, dados);
  }
  const fora = montar({ ambiente: 'disabled' });
  assert.equal(await fora.p.fonteDados(), null);
});

test('CrazyGames: idioma do systemInfo e happytime so com o SDK pronto', async () => {
  const { p, falso } = montar({ locale: 'es-ES' });
  p.festa();
  assert.ok(!falso.log.some((l) => l[0] === 'happytime'), 'antes do init nao chama');
  await p.init();
  assert.equal(p.idioma, 'es-ES');
  p.festa();
  assert.deepEqual(falso.log.at(-1), ['happytime']);
  const sem = criarCrazy({ obterSdk: () => undefined });
  assert.equal(sem.idioma, '');
  assert.doesNotThrow(() => sem.festa());
});

test('CrazyGames: o muteAudio do init e das mudancas chega ao onMudoPlataforma', async () => {
  const { p, falso } = montar({ mudo: true });
  /** @type {boolean[]} */
  const mudos = [];
  p.onMudoPlataforma = (m) => mudos.push(m);
  await p.init();
  falso.mudar(false);
  falso.mudar(true);
  assert.deepEqual(mudos, [true, false, true]);
});

test('CrazyGames: plataforma de cada wrapper e a linha que o empacotar troca no Basic Launch', () => {
  assert.equal(plataforma, 'crazygames');
  assert.equal(plataformaPoki, 'poki');
  assert.equal(ANUNCIOS, true);
  const fonte = readFileSync(new URL('../src/core/crazygames.js', import.meta.url), 'utf8');
  assert.equal(fonte.split('export const ANUNCIOS = true;').length, 2, 'tools/empacotar.mjs procura esta linha');
});

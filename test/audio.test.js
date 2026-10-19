// core/audio.js: barramentos, anuncio, mudo, aba oculta, destrave e os sons nomeados de sempre.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarAudio, GANHOS } from '../src/core/audio.js';
import { criarContextoFalso, criarRelogio, esvaziar } from './apoio/audio-falso.js';

/**
 * Audio sobre o contexto falso, sem janela; `destravar()` faz o primeiro gesto completo.
 * @param {Parameters<typeof criarContextoFalso>[0]} [op]
 */
function montar(op = {}) {
  const Ctx = criarContextoFalso({ resumeManual: true, ...op });
  const relogio = criarRelogio();
  const audio = criarAudio({ Contexto: Ctx, janela: null, agendar: relogio.agendar });
  const ctx = () => /** @type {any} */ (audio.ctx);
  async function destravar() {
    audio.iniciar();
    ctx().concluirResume();
    await esvaziar();
  }
  return { Ctx, relogio, audio, ctx, destravar };
}

/** Os sons nomeados que o main.js e os modos chamam hoje. */
const NOMEADOS = ['pouso', 'fusao', 'completar', 'recusa', 'descartar', 'explodir', 'graduar', 'febre', 'fim', 'yes', 'tique', 'critico', 'choro', 'missil', 'splat'];

test('audio: barramentos sfx 0,85, voz 0,75 e musica 0,3 -> compressor -> mestre 0,7 -> saida', async () => {
  const m = montar();
  await m.destravar();
  const a = m.audio;
  const ctx = m.ctx();
  assert.equal(a.mestre.gain.value, GANHOS.mestre);
  assert.ok(a.mestre.conectados.includes(ctx.destination));
  assert.equal(ctx.criados.compressor, 1);
  for (const [nome, g] of [['sfx', 0.85], ['voz', 0.75], ['musica', 0.3]]) {
    const bus = /** @type {any} */ (a)[nome];
    assert.equal(bus.gain.value, g, nome);
    assert.equal(bus.conectados[0].tipo, 'compressor', `${nome} passa pelo compressor`);
    assert.ok(bus.conectados[0].conectados.includes(a.mestre));
  }
  // o volume percebido de antes (0,6) fica: 0,85 x 0,7
  assert.ok(Math.abs(GANHOS.sfx * GANHOS.mestre - 0.6) < 0.01);
});

test('audio: sem compressor no navegador, os barramentos vao direto ao mestre', async () => {
  const m = montar({ semCompressor: true });
  await m.destravar();
  assert.ok(m.audio.sfx.conectados.includes(m.audio.mestre));
  m.audio.pouso();
  assert.ok(m.ctx().inicios.length > 0);
});

test('audio: nada e agendado antes do destrave (nem antes do resume() resolver)', async () => {
  const m = montar();
  const a = m.audio;
  a.tom(440, 0.1);
  a.ruido(0.1, 800, 1, 0.2);
  assert.equal(a.tocarReceita('pingo'), 0);
  for (const n of NOMEADOS) /** @type {any} */ (a)[n]();
  assert.equal(a.ctx, null, 'sem gesto, sem contexto');
  a.iniciar();
  assert.ok(a.ctx, 'o gesto cria o contexto');
  a.fusao(2);
  a.tom(440, 0.1);
  assert.equal(m.ctx().inicios.length, 0, 'resume() pendente: nada agendado');
  assert.equal(a.podeTocar(), false);
  let pronto = null;
  a.pronto().then((v) => { pronto = v; });
  m.ctx().concluirResume();
  await esvaziar();
  assert.equal(pronto, true);
  assert.equal(a.destravado, true);
  a.fusao(2);
  assert.ok(m.ctx().inicios.length > 0, 'depois do pronto, toca');
  for (const i of m.ctx().inicios) assert.equal(i.estado, 'running');
});

test('audio: sem WebAudio, pronto() resolve false e tudo vira no-op', async () => {
  // no Node nao ha AudioContext global
  const a = criarAudio({ Contexto: null, janela: null });
  a.iniciar();
  assert.equal(await a.pronto(), false);
  for (const n of NOMEADOS) /** @type {any} */ (a)[n]();
  assert.equal(a.tocarReceita('pingo'), 0);
  a.mudoParaAnuncio();
  assert.equal(a.calado, true);
  a.voltarDoAnuncio();
  assert.equal(a.calado, false);
});

test('audio: o anuncio zera o mestre NA HORA, cala tudo e suspende 80 ms depois; volta com aoRetomar', async () => {
  const m = montar();
  const a = m.audio;
  // antes do primeiro gesto o anuncio ja cala (o sdkcheck le calado)
  a.mudoParaAnuncio();
  assert.equal(a.calado, true);
  a.voltarDoAnuncio();
  assert.equal(a.calado, false);
  await m.destravar();
  /** @type {boolean[]} */
  const avisos = [];
  let retomadas = 0;
  a.aoAnuncio((v) => avisos.push(v));
  a.aoRetomar(() => { retomadas++; });
  a.mudoParaAnuncio();
  assert.equal(a.mestre.gain.value, 0, 'mestre em 0 na hora');
  assert.equal(a.calado, true);
  assert.deepEqual(avisos, [true]);
  const antes = m.ctx().inicios.length;
  a.yes();
  a.tom(440, 0.1);
  a.vozBuffer(m.ctx().createBuffer(1, 100, 8000));
  assert.equal(m.ctx().inicios.length, antes, 'nada toca no anuncio');
  assert.equal(m.ctx().state, 'running');
  await m.relogio.avancar(80);
  assert.equal(m.ctx().state, 'suspended', 'suspende 80 ms depois');
  a.voltarDoAnuncio();
  assert.deepEqual(avisos, [true, false]);
  assert.equal(a.mestre.gain.final(), GANHOS.mestre, 'o mestre volta ao alvo');
  m.ctx().concluirResume();
  await esvaziar();
  assert.equal(retomadas, 1);
  assert.equal(a.calado, false);
  a.yes();
  assert.ok(m.ctx().inicios.length > antes);
});

test('audio: o mudo cala efeitos e falas, nao a musica; calado so com os dois desligados', async () => {
  const m = montar();
  await m.destravar();
  const a = m.audio;
  a.definirMudo(true);
  assert.equal(a.mudo, true);
  assert.equal(a.sfx.gain.final(), 0);
  assert.equal(a.voz.gain.final(), 0);
  assert.equal(a.musica.gain.final(), 0.3, 'a musica segue');
  assert.equal(a.calado, false, 'a musica ainda toca');
  const antes = m.ctx().inicios.length;
  a.pouso();
  a.tom(440, 0.1);
  a.ruido(0.1, 800, 1, 0.2, 0, 'bandpass', 0, 'voz');
  assert.equal(a.tocarReceita('pingo', {}, { destino: 'voz' }), 0);
  assert.equal(m.ctx().inicios.length, antes, 'efeitos e falas calados');
  assert.ok(a.tocarReceita('pingo', {}, { destino: 'musica' }) > 0, 'a musica ainda agenda');
  a.definirMusica(false);
  assert.equal(a.musica.gain.final(), 0);
  assert.equal(a.calado, true);
  a.definirMudo(false);
  assert.equal(a.sfx.gain.final(), 0.85);
  assert.equal(a.voz.gain.final(), 0.75);
  assert.equal(a.calado, false);
});

test('audio: o mudo da plataforma cala tudo pelo mestre, por cima do mudo do jogador e do anuncio', async () => {
  const m = montar();
  await m.destravar();
  const a = m.audio;
  a.definirMudoPlataforma(true);
  assert.equal(a.mudoPlataforma, true);
  assert.equal(a.mestre.gain.final(), 0);
  assert.equal(a.calado, true);
  assert.equal(a.mudo, false, 'o mudo do jogador fica como estava');
  const antes = m.ctx().inicios.length;
  a.pouso();
  assert.equal(a.tocarReceita('pingo', {}, { destino: 'musica' }), 0);
  assert.equal(m.ctx().inicios.length, antes, 'nada agenda');
  // o anuncio que termina nao devolve o som com a plataforma muda
  a.mudoParaAnuncio();
  a.voltarDoAnuncio();
  assert.equal(a.mestre.gain.final(), 0);
  a.definirMudoPlataforma(false);
  assert.equal(a.mestre.gain.final(), GANHOS.mestre);
  assert.equal(a.calado, false);
});

test('audio: aba oculta cala, suspende e nao agenda; ao voltar retoma', async () => {
  const m = montar();
  await m.destravar();
  const a = m.audio;
  a.pausarAba(true);
  assert.equal(a.calado, true);
  assert.equal(m.ctx().state, 'suspended');
  assert.equal(a.mestre.gain.final(), 0);
  const antes = m.ctx().inicios.length;
  a.explodir();
  assert.equal(m.ctx().inicios.length, antes);
  a.pausarAba(false);
  m.ctx().concluirResume();
  await esvaziar();
  assert.equal(a.calado, false);
  assert.equal(a.mestre.gain.final(), GANHOS.mestre);
  a.explodir();
  assert.ok(m.ctx().inicios.length > antes);
  // aba oculta durante o anuncio: a volta do anuncio nao retoma (a aba ainda esta oculta)
  a.mudoParaAnuncio();
  a.pausarAba(true);
  const resumes = m.ctx().log.filter((x) => x[0] === 'resume').length;
  a.voltarDoAnuncio();
  assert.equal(m.ctx().log.filter((x) => x[0] === 'resume').length, resumes);
  assert.equal(a.calado, true);
});

test('audio: os sons nomeados de sempre e tom()/ruido() com a assinatura do main.js tocam no sfx', async () => {
  const m = montar();
  await m.destravar();
  const a = m.audio;
  for (const n of NOMEADOS) {
    const antes = m.ctx().inicios.length;
    /** @type {any} */ (a)[n](n === 'fusao' ? 3 : n === 'yes');
    assert.ok(m.ctx().inicios.length > antes, n);
  }
  let antes = m.ctx().inicios.length;
  a.ruido(0.08, 700, 1.2, 0.18);
  a.ruido(0.12, 500, 1.5, 0.25, 0, 'lowpass', 200);
  a.tom(440, 0.1, 'triangle', 0.1, 880, 0.05);
  assert.equal(m.ctx().inicios.length, antes + 3);
  assert.equal(m.ctx().passado.length, 0, 'nada no passado');
  assert.equal(m.ctx().invalidos.length, 0, 'nenhum valor invalido');
  // a fusao da nota sem fim ainda tem o brilho (triangulo) a partir do 3o combo
  const triangulos = (/** @type {() => void} */ fn) => {
    const i0 = m.ctx().inicios.length;
    fn();
    return m.ctx().inicios.slice(i0).filter((x) => x.no.type === 'triangle').length;
  };
  m.ctx().currentTime = 5;
  assert.equal(triangulos(() => a.fusao(1)), 0);
  assert.equal(triangulos(() => a.fusao(3)), 1);
});

test('audio: polifonia limitada por chave e no total', async () => {
  const m = montar();
  await m.destravar();
  const a = m.audio;
  assert.ok(a.tocarReceita('pingo', {}, { chave: 'x', max: 2 }) > 0);
  assert.ok(a.tocarReceita('pingo', {}, { chave: 'x', max: 2 }) > 0);
  assert.equal(a.tocarReceita('pingo', {}, { chave: 'x', max: 2 }), 0, 'o 3o da mesma chave nao toca');
  assert.ok(a.tocarReceita('pingo', {}, { chave: 'y', max: 2 }) > 0, 'outra chave toca');
  m.ctx().currentTime = 1;
  assert.ok(a.tocarReceita('pingo', {}, { chave: 'x', max: 2 }) > 0, 'depois que acabaram, toca de novo');
  let n = 0;
  for (let i = 0; i < 60; i++) if (a.tocarReceita('pingo', {}, { chave: 'k' + i, max: 4 }) > 0) n++;
  assert.ok(n < 40, `no maximo 32 juntos (${n})`);
});

test('audio: vozBuffer toca no barramento de voz, pula o atraso do MP3 e respeita o mudo', async () => {
  const m = montar();
  await m.destravar();
  const a = m.audio;
  const buf = m.ctx().createBuffer(1, 4000, 8000);
  const d = a.vozBuffer(buf, { inicio: 0.025, vol: 0.5 });
  assert.ok(Math.abs(d - 0.475) < 1e-9);
  const ini = m.ctx().inicios.at(-1);
  assert.equal(ini.offset, 0.025);
  const g = ini.no.conectados[0];
  assert.ok(g.conectados.includes(a.voz));
  assert.equal(g.gain.eventos[0][1], 0, 'nasce em 0 (sem estalo)');
  a.vozBuffer(buf, { destino: 'sfx', taxa: 2 });
  assert.ok(m.ctx().inicios.at(-1).no.conectados[0].conectados.includes(a.sfx));
  assert.equal(m.ctx().inicios.at(-1).no.playbackRate.eventos[0][1], 2);
  a.definirMudo(true);
  assert.equal(a.vozBuffer(buf), 0);
});

test('audio: o destrave automatico (pointerup/keydown/touchend) cria e retoma o contexto', async () => {
  /** @type {Map<string, Function>} */
  const ouvintes = new Map();
  const janela = { addEventListener: (/** @type {string} */ t, /** @type {Function} */ fn) => ouvintes.set(t, fn), removeEventListener: (/** @type {string} */ t) => ouvintes.delete(t) };
  const Ctx = criarContextoFalso();
  const a = criarAudio({ Contexto: Ctx, janela, agendar: () => 0 });
  assert.deepEqual([...ouvintes.keys()].sort(), ['keydown', 'pointerup', 'touchend']);
  /** @type {any} */ (ouvintes.get('pointerup'))();
  assert.ok(a.ctx);
  await esvaziar();
  assert.equal(a.destravado, true);
  a.destruir();
  assert.equal(ouvintes.size, 0);
});

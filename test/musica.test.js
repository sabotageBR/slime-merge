// src/som/pecas.js (as 3 pecas, puras) e src/som/musica.js (o agendador).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PECAS, duracaoCompasso, notasDoCompasso } from '../src/som/pecas.js';
import { criarMusica, tocarNota, PADRAO_MUSICA } from '../src/som/musica.js';
import { criarAudio } from '../src/core/audio.js';
import { contextoAvulso, criarContextoFalso, criarRelogio, esvaziar } from './apoio/audio-falso.js';

test('pecas: andamento, compasso e tamanho de cada peca', () => {
  assert.deepEqual(Object.keys(PECAS).sort(), ['caixinha', 'chiptune', 'lofi']);
  assert.equal(PECAS.caixinha.tempos, 3);
  assert.equal(PECAS.caixinha.bpm, 76);
  assert.equal(PECAS.caixinha.compassos, 16);
  assert.equal(PECAS.lofi.tempos, 4);
  assert.equal(PECAS.lofi.bpm, 72);
  assert.equal(PECAS.chiptune.bpm, 112);
  assert.equal(PECAS.chiptune.ganho, 0.5);
  assert.ok(Math.abs(duracaoCompasso(PECAS.caixinha) - 180 / 76) < 1e-9);
  assert.deepEqual(notasDoCompasso('nao-existe', 0), []);
});

test('pecas: deterministicas por compasso, e a segunda volta varia de leve', () => {
  for (const id of Object.keys(PECAS)) {
    const P = PECAS[id];
    for (let n = 0; n < 3 * P.compassos; n++) assert.deepEqual(notasDoCompasso(id, n), notasDoCompasso(id, n), `${id} ${n}`);
    let diferentes = 0;
    for (let k = 0; k < P.compassos; k++) if (JSON.stringify(notasDoCompasso(id, k)) !== JSON.stringify(notasDoCompasso(id, k + P.compassos))) diferentes++;
    assert.ok(diferentes > 0, `${id}: a volta seguinte tem variacao`);
  }
  // a melodia da caixinha e a mesma nas duas voltas (so os enfeites e a folga mudam)
  const mel = (/** @type {number} */ n) => notasDoCompasso('caixinha', n).filter((x) => x.inst === 'caixinha' && x.dur > 0.07).map((x) => x.midi);
  for (let k = 0; k < 16; k++) {
    const a = mel(k);
    const b = mel(k + 16);
    for (const m of a) assert.ok(b.includes(m), `compasso ${k + 1}`);
  }
});

test('pecas: notas na escala e na faixa, dentro do compasso, sem NaN', () => {
  for (const id of Object.keys(PECAS)) {
    const P = PECAS[id];
    const barra = duracaoCompasso(P);
    let notas = 0;
    for (let n = 0; n < 4 * P.compassos; n++) {
      const l = notasDoCompasso(id, n);
      assert.ok(l.length > 0, `${id} ${n}: compasso vazio`);
      for (let i = 1; i < l.length; i++) assert.ok(l[i].t >= l[i - 1].t, 'em ordem de tempo');
      for (const x of l) {
        assert.ok(Number.isFinite(x.t) && x.t >= 0 && x.t < barra, `${id} ${n}: t ${x.t}`);
        assert.ok(Number.isFinite(x.dur) && x.dur > 0, `${id}: dur ${x.dur}`);
        assert.ok(Number.isFinite(x.vol) && x.vol > 0 && x.vol <= 1, `${id}: vol ${x.vol}`);
        if (x.perc) continue;
        notas++;
        assert.ok(x.midi >= P.faixa[0] && x.midi <= P.faixa[1], `${id} ${n}: midi ${x.midi}`);
        const classe = (((x.midi - P.tonica) % 12) + 12) % 12;
        assert.ok(P.escala.includes(classe), `${id} ${n}: ${x.midi} fora da escala (${x.inst})`);
      }
    }
    assert.ok(notas > 4 * P.compassos, id);
  }
  // a caixinha fica na pentatonica e fecha as frases na tonica (compassos 8 e 16)
  for (const k of [7, 15]) {
    const m = notasDoCompasso('caixinha', k).filter((x) => x.inst === 'caixinha')[0].midi;
    assert.equal(m % 12, PECAS.caixinha.tonica % 12);
  }
});

test('musica: todo instrumento toca no contexto falso sem NaN nem instante no passado', () => {
  const insts = new Set();
  for (const id of Object.keys(PECAS)) for (let n = 0; n < 2 * PECAS[id].compassos; n++) for (const x of notasDoCompasso(id, n)) insts.add(x.inst);
  assert.ok(insts.size >= 12, [...insts].join(','));
  for (const inst of insts) {
    const ctx = contextoAvulso();
    tocarNota({ ctx, destino: ctx.destination }, 0.01, { t: 0, midi: 60, dur: 0.3, vol: 0.5, inst });
    assert.ok(ctx.inicios.length > 0, inst);
    assert.deepEqual(ctx.invalidos, [], inst);
    assert.deepEqual(ctx.passado, [], inst);
  }
  // a onda de pulso da chiptune usa createPeriodicWave
  const ctx = contextoAvulso();
  tocarNota({ ctx, destino: ctx.destination }, 0, { t: 0, midi: 72, dur: 0.2, vol: 0.3, inst: 'pulso' });
  assert.equal(ctx.criados.onda, 1);
  assert.ok(ctx.inicios[0].no.onda);
});

/**
 * Musica sobre audio + contexto falso, com relogio falso; `andar(s)` anda o contexto e o laco.
 * @param {{resumeManual?: boolean}} [op]
 */
function montar(op = {}) {
  const Ctx = criarContextoFalso({ resumeManual: op.resumeManual });
  const relogio = criarRelogio();
  const audio = criarAudio({ Contexto: Ctx, janela: null, agendar: relogio.agendar });
  const musica = criarMusica({ audio, agendar: relogio.agendar, cancelar: relogio.cancelar });
  const ctx = () => /** @type {any} */ (audio.ctx);
  async function andar(/** @type {number} */ s) {
    for (let i = 0; i < Math.round(s * 10); i++) {
      if (ctx() && ctx().state === 'running') ctx().currentTime = Math.round((ctx().currentTime + 0.1) * 1e6) / 1e6;
      await relogio.avancar(100);
    }
  }
  return { audio, musica, ctx, andar, relogio };
}

test('musica: espera o primeiro gesto; depois entra com fade-in de 4 s no barramento musica', async () => {
  const m = montar({ resumeManual: true });
  m.musica.iniciar('caixinha');
  await m.andar(3);
  assert.equal(m.ctx(), null, 'sem gesto, sem contexto');
  assert.equal(m.musica.estado().tocando, false);
  m.audio.iniciar();
  await m.andar(1);
  assert.equal(m.musica.estado().tocando, false, 'o resume() ainda nao resolveu');
  m.ctx().concluirResume();
  await esvaziar();
  await m.andar(1.5);
  const e = m.musica.estado();
  assert.equal(e.tocando, true);
  assert.equal(e.peca, 'caixinha');
  assert.ok(e.notas > 0);
  assert.ok(m.ctx().inicios.length > 0);
  // a saida da musica liga no barramento musica e sobe em rampa linear de 4 s
  const saida = acharSaida(m);
  assert.ok(saida);
  const rampa = saida.gain.eventos.find((/** @type {any[]} */ x) => x[0] === 'linear');
  assert.ok(rampa, 'fade-in');
  assert.ok(Math.abs(rampa[1] - PADRAO_MUSICA.ganho * PECAS.caixinha.ganho) < 1e-9);
  assert.ok(rampa[2] - saida.gain.eventos.find((/** @type {any[]} */ x) => x[0] === 'set')[2] >= PADRAO_MUSICA.fadeIn - 1e-9);
  assert.deepEqual(m.ctx().passado, [], 'nenhuma nota no passado');
  assert.deepEqual(m.ctx().invalidos, []);
});

/**
 * Acha o no de saida (o ganho que liga direto no barramento musica).
 * @param {any} m
 */
function acharSaida(m) {
  const alvo = m.audio.musica;
  /** @type {any} */
  let achado = null;
  const visto = new Set();
  const visitar = (/** @type {any} */ no) => {
    if (!no || visto.has(no) || achado) return;
    visto.add(no);
    if (no.tipo === 'gain' && no.conectados.includes(alvo)) { achado = no; return; }
    for (const x of no.conectados || []) visitar(x);
  };
  for (const i of m.ctx().inicios) visitar(i.no);
  return achado;
}

/**
 * O no do ducking: o ganho entre os grupos de notas e a saida.
 * @param {any} m
 */
function acharDuck(m) {
  const saida = acharSaida(m);
  for (const i of m.ctx().inicios) {
    let no = i.no;
    for (let k = 0; k < 8 && no; k++) {
      const prox = no.conectados && no.conectados[0];
      if (prox && prox.conectados && prox.conectados[0] === saida) return prox;
      no = prox;
    }
  }
  return null;
}

test('musica: para na hora no anuncio (derruba o agendado) e volta com fade no aoRetomar', async () => {
  const m = montar({ resumeManual: true });
  m.audio.iniciar();
  m.ctx().concluirResume();
  await esvaziar();
  m.musica.iniciar('lofi');
  await m.andar(6);
  const antes = m.musica.estado();
  assert.equal(antes.tocando, true);
  m.audio.mudoParaAnuncio();
  const e = m.musica.estado();
  assert.equal(e.tocando, false, 'parou na hora');
  assert.equal(e.paradas, 1);
  const saida = acharSaida(m);
  assert.equal(saida.gain.value, 0, 'saida em 0 na hora');
  const notas = m.musica.estado().notas;
  await m.andar(3);
  assert.equal(m.ctx().state, 'suspended');
  assert.equal(m.musica.estado().notas, notas, 'nada agendado no anuncio');
  m.audio.voltarDoAnuncio();
  m.ctx().concluirResume();
  await esvaziar();
  await m.andar(1);
  const d = m.musica.estado();
  assert.equal(d.tocando, true);
  assert.equal(d.comecos, 2);
  assert.equal(d.compasso % 4, 0, 'volta do comeco da frase');
  assert.ok(d.notas > notas);
  const fades = saida.gain.eventos.filter((/** @type {any[]} */ x) => x[0] === 'linear');
  assert.equal(fades.length, 2, 'fade-in de novo');
});

test('musica: desligar a musica para de agendar; a aba oculta so pausa', async () => {
  const m = montar();
  m.audio.iniciar();
  await esvaziar();
  m.musica.iniciar('chiptune');
  await m.andar(2);
  assert.equal(m.musica.estado().tocando, true);
  m.audio.definirMusica(false);
  await m.andar(1);
  assert.equal(m.musica.estado().tocando, false);
  const n = m.musica.estado().notas;
  await m.andar(2);
  assert.equal(m.musica.estado().notas, n);
  m.audio.definirMusica(true);
  await m.andar(1);
  assert.equal(m.musica.estado().tocando, true);
  // aba oculta: o contexto para e a musica so espera (sem recomecar)
  m.audio.pausarAba(true);
  const c = m.musica.estado().comecos;
  await m.andar(2);
  m.audio.pausarAba(false);
  await esvaziar();
  await m.andar(1);
  assert.equal(m.musica.estado().comecos, c, 'continua de onde estava');
  assert.equal(m.musica.estado().tocando, true);
});

test('musica: abaixar (pausa 0,5) e o mergulho da fala (0,7 por 0,6 s), trocar de peca e parar', async () => {
  const m = montar();
  m.audio.iniciar();
  await esvaziar();
  m.musica.iniciar('caixinha');
  await m.andar(1.5);
  m.musica.abaixar(0.5);
  assert.equal(m.musica.estado().fator, 0.5);
  const duck = acharDuck(m);
  assert.ok(duck);
  assert.equal(duck.gain.final(), 0.5);
  m.musica.abaixar(1);
  assert.equal(duck.gain.final(), 1);
  m.musica.abaixar(0.7, 0.6);
  const alvos = duck.gain.eventos.filter((/** @type {any[]} */ x) => x[0] === 'alvo').slice(-2);
  assert.equal(alvos[0][1], 0.7);
  assert.equal(alvos[1][1], 1, 'volta ao nivel de antes');
  assert.ok(Math.abs(alvos[1][2] - alvos[0][2] - 0.6) < 1e-9);
  assert.equal(m.musica.estado().fator, 1, 'o mergulho nao muda o nivel base');
  m.musica.abaixar(Number.NaN);
  assert.equal(m.musica.estado().fator, 1);
  // trocar de peca recomeca do compasso 0
  m.musica.iniciar('lofi');
  await m.andar(1);
  assert.equal(m.musica.estado().peca, 'lofi');
  assert.equal(m.musica.estado().tocando, true);
  m.musica.iniciar('nenhuma');
  assert.equal(m.musica.estado().ligada, false);
  assert.equal(m.musica.estado().tocando, false);
  m.musica.iniciar('caixinha');
  m.musica.parar(true);
  const n = m.musica.estado().notas;
  await m.andar(2);
  assert.equal(m.musica.estado().notas, n);
  m.musica.destruir();
  m.musica.iniciar('caixinha');
  await m.andar(2);
  assert.equal(m.musica.estado().notas, n, 'destruida nao toca mais');
});

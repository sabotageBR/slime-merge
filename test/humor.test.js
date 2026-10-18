// Humor de cada slime (src/jogo/humor.js): o rosto de base vem do aperto (alongamento e
// vizinhos), do tempo parado e da pancada (5 caretas em rodizio); o passageiro passa por cima.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HUMOR, PANCADA, sentir, pancada, careta, alongamento, aperto } from '../src/jogo/humor.js';
import { criarModo } from '../src/jogo/modos/merge.js';

/** Slime de mentira: alongado em `k` (a11 = k, a22 = 1/k), parado. */
function slime(k = 1, o = {}) {
  return { idx: 1, ativo: true, preso: false, n: 40, cx: 0, cy: 0, vx: 0, vy: 0, a11: k, a12: 0, a21: 0, a22: 1 / k, dados: {}, ...o };
}

/** n quadros de 1/60 s do humor. */
function viver(s, vizinhos, seg) {
  for (let f = 0; f < seg * 60; f++) sentir(s, vizinhos, 1 / 60);
}

test('alongamento: 1 no redondo, k^2 no esticado em k', () => {
  assert.ok(Math.abs(alongamento(slime(1)) - 1) < 1e-9);
  assert.ok(Math.abs(alongamento(slime(1.2)) - 1.44) < 1e-9);
  assert.ok(aperto(slime(1), 5) > aperto(slime(1), 2));
});

test('faixas: redondo e sozinho fica contente; espremido, amassado; muito espremido, chorinho', () => {
  const a = slime(1);
  viver(a, 1, 2);
  assert.equal(a.dados.expr, 'contente');
  const b = slime(Math.sqrt(1 + (HUMOR.amassado + HUMOR.choro) / 2));
  viver(b, 2, 3);
  assert.equal(b.dados.expr, 'amassado');
  const c = slime(Math.sqrt(1 + HUMOR.choro + 0.3));
  viver(c, 2, 3);
  assert.equal(c.dados.expr, 'chorinho');
  // no meio, o rosto de sempre
  const d = slime(Math.sqrt(1 + (HUMOR.contente + HUMOR.amassado) / 2));
  viver(d, 2, 3);
  assert.equal(d.dados.expr, '');
});

test('histerese e tempo minimo: o rosto nao pisca na fronteira', () => {
  const s = slime(Math.sqrt(1 + HUMOR.amassado + 0.05));
  viver(s, 2, 3);
  assert.equal(s.dados.expr, 'amassado');
  // um pouco abaixo do limite (dentro da histerese): continua amassado
  s.a11 = Math.sqrt(1 + HUMOR.amassado * 0.95);
  s.a22 = 1 / s.a11;
  viver(s, 2, 3);
  assert.equal(s.dados.expr, 'amassado');
  // trocas no maximo uma por HUMOR.minimo, mesmo oscilando
  let trocas = 0;
  let antes = s.dados.expr;
  for (let f = 0; f < 600; f++) {
    const k = f % 20 < 10 ? 1 : 2;
    s.a11 = k;
    s.a22 = 1 / k;
    sentir(s, 2, 1 / 60);
    if (s.dados.expr !== antes) { trocas++; antes = s.dados.expr; }
  }
  assert.ok(trocas <= 10 / HUMOR.minimo + 1, `${trocas} trocas em 10 s`);
});

test('apatico: parado e sem fundir por HUMOR.apatico s; mexeu, volta', () => {
  const s = slime(Math.sqrt(1 + (HUMOR.contente + HUMOR.amassado) / 2));
  viver(s, 2, HUMOR.apatico - 1);
  assert.equal(s.dados.expr, '');
  viver(s, 2, 2);
  assert.equal(s.dados.expr, 'apatico');
  s.vx = 2;
  viver(s, 2, 1.5);
  assert.notEqual(s.dados.expr, 'apatico');
});

test('passageiro por cima: o medo e o feliz ficam; o humor volta quando eles acabam', () => {
  const s = slime(1);
  viver(s, 1, 2);
  s.dados.expr = 'medo';
  viver(s, 1, 1);
  assert.equal(s.dados.expr, 'medo');
  s.dados.expr = '';
  viver(s, 1, 0.1);
  assert.equal(s.dados.expr, 'contente');
});

test('pancada: quem esta embaixo, de outro nivel e nao menor que metade, faz uma careta olhando para quem caiu', () => {
  const cai = slime(1, { idx: 7, cy: 3, n: 40 });
  const baixo = slime(1, { idx: 2, cy: 1, n: 60 });
  const lado = slime(1, { idx: 3, cy: 3.5, n: 40 });
  const grande = slime(1, { idx: 4, cy: 1, n: 200 });
  const igual = slime(1, { idx: 5, cy: 1, n: 40 });
  const esperada = careta(baixo);
  const ok = pancada(cai, HUMOR.queda + 1, [baixo, lado, grande, igual], (a, b) => b === igual);
  assert.deepEqual(ok, [baixo]);
  assert.ok(PANCADA.includes(baixo.dados.expr));
  assert.equal(baixo.dados.expr, esperada);
  assert.equal(baixo.dados.exprT, HUMOR.careta);
  assert.equal(baixo.dados.bravoDe, 7);
  // devagar nao irrita ninguem
  assert.deepEqual(pancada(cai, HUMOR.queda - 1, [slime(1, { cy: 1 })], () => false), []);
});

test('pancada: o mesmo slime passa pelas 5 caretas antes de repetir; outra pancada no meio nao troca o rosto', () => {
  assert.equal(PANCADA.length, 5);
  for (const idx of [0, 1, 2, 3, 4, 9]) {
    const baixo = slime(1, { idx, cy: 1, n: 40 });
    const vistas = [];
    for (let k = 0; k < 5; k++) {
      const cai = slime(1, { idx: 20 + k, cy: 3, n: 40 });
      pancada(cai, HUMOR.queda + 1, [baixo], () => false);
      vistas.push(baixo.dados.expr);
      // de novo antes de passar: renova o tempo e o alvo do olhar, o rosto fica
      baixo.dados.exprT = 0.5;
      pancada(slime(1, { idx: 30, cy: 3, n: 40 }), HUMOR.queda + 1, [baixo], () => false);
      assert.equal(baixo.dados.expr, vistas[k], 'trocou de careta no meio');
      assert.equal(baixo.dados.exprT, HUMOR.careta);
      assert.equal(baixo.dados.bravoDe, 30);
      // a careta passa (o soltar.js zera a expressao quando o exprT acaba)
      baixo.dados.expr = '';
    }
    assert.deepEqual([...vistas].sort(), [...PANCADA].sort(), `idx ${idx}: ${vistas.join(', ')}`);
  }
  // dois vizinhos levando a pancada juntos fazem caretas diferentes
  const a = slime(1, { idx: 2, cy: 1, n: 40 });
  const b = slime(1, { idx: 3, cy: 1, n: 40 });
  pancada(slime(1, { idx: 8, cy: 3, n: 40 }), HUMOR.queda + 1, [a, b], () => false);
  assert.notEqual(a.dados.expr, b.dados.expr);
});

test('no pote: um slime solto de cima irrita o de baixo, e a careta passa', () => {
  const modo = criarModo({ semente: 4, salvo: {}, toque: true, pressao: false });
  const S = modo.S;
  S.jogadores[0].pote.crescer(0);
  const baixo = S.R.criar(S, S.jogadores[0], { nivel: 6 }, 0, 1.2, false);
  baixo.dados.pote = 0;
  baixo.dados.solto = -10;
  for (let f = 0; f < 60; f++) modo.passo(1 / 60);
  const cai = S.R.criar(S, S.jogadores[0], { nivel: 5 }, 0.2, 9, false);
  cai.dados.pote = 0;
  cai.dados.solto = S.mundo.tempo;
  let feita = '';
  for (let f = 0; f < 120; f++) { modo.passo(1 / 60); if (PANCADA.includes(baixo.dados.expr)) feita = baixo.dados.expr; }
  assert.ok(feita, 'o de baixo nao fez careta');
  for (let f = 0; f < 60 * (HUMOR.careta + 1.5); f++) modo.passo(1 / 60);
  assert.ok(!PANCADA.includes(baixo.dados.expr), `a careta ${feita} nao passou`);
});

// Metas da partida (src/jogo/missoes.js): o meio do sem fim, do nivel 9 em diante.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarMissoes } from '../src/jogo/missoes.js';

test('tres metas, uma de cada tipo, no primeiro degrau e com premio', () => {
  const m = criarMissoes(5);
  const lista = m.lista();
  assert.deepEqual(lista.map((x) => x.tipo).sort(), ['combo', 'fusao', 'poder']);
  for (const x of lista) {
    assert.equal(x.prog, 0);
    assert.ok(x.premio > 0);
  }
  // a semente so muda a ordem
  assert.deepEqual(criarMissoes(5).lista(), lista);
});

test('cumprir paga o premio e sobe um degrau do mesmo tipo; o ultimo degrau se repete', () => {
  const m = criarMissoes(1);
  const fusao = () => m.lista().find((x) => x.tipo === 'fusao');
  assert.equal(fusao().meta, 10);
  for (let k = 0; k < 9; k++) assert.deepEqual(m.registrar('fusao', 1), []);
  assert.equal(fusao().prog, 9);
  const feitas = m.registrar('fusao', 1);
  assert.deepEqual(feitas.map((x) => [x.tipo, x.meta, x.premio]), [['fusao', 10, 10]]);
  assert.deepEqual([fusao().meta, fusao().prog, fusao().premio], [20, 0, 15]);
  // combo guarda o maior; os outros tipos nao andam
  assert.deepEqual(m.registrar('combo', 2).map((x) => x.meta), [2]);
  assert.equal(m.lista().find((x) => x.tipo === 'combo').meta, 3);
  assert.deepEqual(m.registrar('nivel', 10), []);
  for (let k = 0; k < 6; k++) m.registrar('poder', 1);
  const poder = m.lista().find((x) => x.tipo === 'poder');
  assert.deepEqual([poder.meta, poder.premio], [3, 20]);
  m.registrar('poder', 3);
  assert.equal(m.lista().find((x) => x.tipo === 'poder').meta, 3, 'o ultimo degrau se repete');
});

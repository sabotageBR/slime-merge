// core/armazenamento.js: reserva em memoria e a migracao do save para o modulo data da CrazyGames.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarArmazem, migrarDoLocal } from '../src/core/armazenamento.js';

/** Storage em memoria com key()/length, como o do navegador. @param {Record<string, string>} [inicial] */
function storage(inicial = {}) {
  const m = new Map(Object.entries(inicial));
  return {
    m,
    get length() { return m.size; },
    key: (/** @type {number} */ i) => [...m.keys()][i] ?? null,
    getItem: (/** @type {string} */ k) => (m.has(k) ? m.get(k) : null),
    setItem: (/** @type {string} */ k, /** @type {string} */ v) => { m.set(k, String(v)); },
    removeItem: (/** @type {string} */ k) => { m.delete(k); },
  };
}

test('armazem: le e grava pela fonte injetada; sem fonte fica so na memoria', () => {
  const fonte = storage();
  const a = criarArmazem({ obterLs: () => fonte });
  assert.equal(a.gravar('perfil', { gotas: 3 }), true);
  assert.equal(fonte.getItem('slime.perfil'), '{"gotas":3}');
  assert.deepEqual(criarArmazem({ obterLs: () => fonte }).ler('perfil'), { gotas: 3 });
  const sem = criarArmazem({ obterLs: () => { throw new Error('bloqueado'); } });
  assert.equal(sem.gravar('mudo', true), false);
  assert.equal(sem.ler('mudo', false), true, 'a memoria guarda na sessao');
});

test('migrarDoLocal: copia so as chaves do jogo que o destino nao tem, uma vez', () => {
  const local = storage({ 'slime.perfil': '{"gotas":90}', 'slime.mudo': 'true', 'outro.jogo': 'x' });
  const destino = storage({ 'slime.mudo': 'false' });
  assert.equal(migrarDoLocal(destino, { obterLs: () => local }), 1);
  assert.equal(destino.getItem('slime.perfil'), '{"gotas":90}');
  assert.equal(destino.getItem('slime.mudo'), 'false', 'o que ja estava no destino fica');
  assert.equal(destino.getItem('outro.jogo'), null);
  local.setItem('slime.perfil', '{"gotas":1}');
  assert.equal(migrarDoLocal(destino, { obterLs: () => local }), 0, 'so uma vez');
  assert.equal(destino.getItem('slime.perfil'), '{"gotas":90}');
  assert.equal(migrarDoLocal(storage(), { obterLs: () => { throw new Error('bloqueado'); } }), 0);
});

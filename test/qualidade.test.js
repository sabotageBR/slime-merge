// Qualidade adaptativa do render (src/render/qualidade.js): desce quando o fps fica baixo por
// algumas janelas seguidas, nunca sobe, e ignora pausas e o aquecimento.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarQualidade, faixaFps, faixaMs } from '../src/render/qualidade.js';

/** Alimenta `seg` s de quadros a `fps`. @returns {number} quantas vezes desceu */
function rodar(q, fps, seg) {
  let desceu = 0;
  for (let k = 0; k < Math.round(seg * fps); k++) if (q.quadro(1 / fps)) desceu++;
  return desceu;
}

test('aparelho rapido fica na alta', () => {
  const q = criarQualidade();
  assert.equal(rodar(q, 60, 30), 0);
  assert.equal(q.nivel, 0);
  assert.ok(Math.abs(q.fps - 60) < 1.5);
});

test('fps baixo seguido desce um degrau por vez, com aquecimento entre eles, ate a baixa', () => {
  const q = criarQualidade({ limite: 48, janelas: 3, aquecer: 2 });
  // 2 s de aquecimento + 3 janelas ruins: desce no 5o segundo, nao antes
  assert.equal(rodar(q, 30, 4.5), 0);
  assert.equal(rodar(q, 30, 1), 1);
  assert.equal(q.nivel, 1);
  assert.equal(rodar(q, 30, 20), 1);
  assert.equal(q.nivel, 2);
  // no ultimo degrau nao desce mais
  assert.equal(rodar(q, 20, 20), 0);
  assert.equal(q.nivel, 2);
});

test('soluco isolado nao derruba, e voltar a ficar bom zera a contagem', () => {
  const q = criarQualidade({ janelas: 3, aquecer: 0 });
  for (let k = 0; k < 10; k++) { rodar(q, 30, 2); rodar(q, 60, 1); }
  assert.equal(q.nivel, 0);
});

test('pausa, aba escondida e dt invalido nao contam; reiniciar refaz o aquecimento', () => {
  const q = criarQualidade({ janelas: 2, aquecer: 1 });
  for (let k = 0; k < 100; k++) assert.equal(q.quadro(0.5), false);
  assert.equal(q.quadro(0), false);
  assert.equal(q.quadro(Number.NaN), false);
  rodar(q, 30, 2.5);
  q.reiniciar();
  assert.equal(rodar(q, 30, 2.5), 0, 'desceu sem respeitar o aquecimento depois de reiniciar');
  assert.equal(q.nivel, 0);
});

test('nivel inicial (?qualidade=) e faixas de fps da telemetria', () => {
  assert.equal(criarQualidade({ inicial: 2 }).nivel, 2);
  assert.equal(criarQualidade({ inicial: 9 }).nivel, 2);
  assert.deepEqual([60, 55, 54.9, 45, 44, 30, 29, 0].map(faixaFps), ['55', '55', '45', '45', '30', '30', '0', '0']);
});

test('com 4 degraus (a minima) desce ate o 3; o celular comeca na media', () => {
  const q = criarQualidade({ niveis: 4, inicial: 1, aquecer: 0 });
  assert.equal(q.nivel, 1);
  rodar(q, 20, 30);
  assert.equal(q.nivel, 3);
  assert.equal(criarQualidade({ niveis: 4, inicial: 9 }).nivel, 3);
});

test('faixas de custo (ms) da telemetria: fisica e desenho', () => {
  assert.deepEqual([0, 3.9, 4, 7.9, 8, 15.9, 16, 80].map(faixaMs), ['4', '4', '8', '8', '16', '16', '16+', '16+']);
});

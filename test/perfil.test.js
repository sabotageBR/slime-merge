// Metajogo: uma moeda so, loja, sequencia diaria, missoes do dia, desafio e liga.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarPerfil, diasEntre, gotasDaPartida, LOJA, SEQUENCIA } from '../src/jogo/perfil.js';

test('calendario: dias entre datas, inclusive virada de mes e de ano', () => {
  assert.equal(diasEntre('2026-10-14', '2026-10-15'), 1);
  assert.equal(diasEntre('2026-10-31', '2026-11-01'), 1);
  assert.equal(diasEntre('2026-12-31', '2027-01-01'), 1);
  assert.equal(diasEntre('2028-02-28', '2028-03-01'), 2);
  assert.equal(diasEntre('2026-10-14', '2026-10-14'), 0);
});

test('padrao: bequer, jardim e classico de graca e equipados', () => {
  const p = criarPerfil({}, '2026-10-14');
  assert.deepEqual(p.equipado, { cesto: 'becher', cenario: 'jardim', objeto: 'classico' });
  for (const g of Object.keys(LOJA)) assert.equal(LOJA[g][0].preco, 0);
});

test('loja: so compra com gotas suficientes, desconta e equipa', () => {
  const p = criarPerfil({}, '2026-10-14');
  assert.equal(p.comprar('cesto', 'vime'), false);
  p.ganhar(250);
  assert.equal(p.comprar('cesto', 'vime'), true);
  assert.equal(p.gotas, 50);
  assert.equal(p.equipado.cesto, 'vime');
  assert.equal(p.comprar('cesto', 'vime'), false, 'nao compra duas vezes');
  assert.equal(p.equipar('cesto', 'becher'), true);
  assert.equal(p.equipar('cesto', 'aquario'), false, 'nao equipa o que nao tem');
});

test('sequencia diaria: soma dia a dia, uma vez por dia, e zera ao pular', () => {
  let salvo = {};
  const dias = ['2026-10-14', '2026-10-15', '2026-10-16'];
  dias.forEach((dia, k) => {
    const p = criarPerfil(salvo, dia);
    const r = p.checkin();
    assert.equal(r.dia, k + 1);
    assert.equal(r.premio, SEQUENCIA[k]);
    assert.equal(p.checkin().premio, 0, 'segunda vez no mesmo dia');
    salvo = p.dados();
  });
  const p = criarPerfil(salvo, '2026-10-18');
  assert.equal(p.checkin().dia, 1, 'pulou o dia 17');
});

test('missoes do dia: 3 por dia, as mesmas no mesmo dia, premio em gotas uma vez', () => {
  const a = criarPerfil({}, '2026-10-14').missoes();
  const b = criarPerfil({}, '2026-10-14').missoes();
  assert.equal(a.length, 3);
  assert.deepEqual(a, b);
  const p = criarPerfil({}, '2026-10-14');
  const m = p.missoes()[0];
  const antes = p.gotas;
  const valor = m.tipo === 'fusao' || m.tipo === 'poder' || m.tipo === 'duelo' ? m.meta : m.meta;
  const feitas = p.registrar(m.tipo, valor);
  assert.equal(feitas.length >= 1, true);
  assert.equal(p.gotas - antes >= m.premio, true);
  assert.equal(p.registrar(m.tipo, valor).filter((x) => x.tipo === m.tipo && x.meta === m.meta).length, 0, 'nao paga de novo');
});

test('desafio do dia: mesma regra no mesmo dia, premio uma vez ao bater a meta', () => {
  const p = criarPerfil({}, '2026-10-14');
  const r = p.desafio();
  assert.equal(r.dia, '2026-10-14');
  assert.equal(p.fimDesafio(r.meta - 1), 0);
  assert.equal(p.fimDesafio(r.meta), 100);
  assert.equal(p.fimDesafio(r.meta * 2), 0);
  assert.equal(p.desafio().melhor, r.meta * 2);
});

test('liga do duelo: 3 vitorias sobem a liga, premio cresce', () => {
  const p = criarPerfil({}, '2026-10-14');
  const g = [];
  for (let k = 0; k < 7; k++) g.push(p.venceuDuelo());
  assert.deepEqual(g, [40, 40, 40, 60, 60, 60, 90]);
  assert.equal(p.liga.nivel, 2);
});

test('gotas da partida crescem com os pontos sem explodir', () => {
  assert.equal(gotasDaPartida(0), 0);
  assert.ok(gotasDaPartida(10000) > 60 && gotasDaPartida(10000) < 120);
  assert.ok(gotasDaPartida(40000) < 250);
});

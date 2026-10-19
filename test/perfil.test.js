// Metajogo: uma moeda so, loja, sequencia diaria, missoes do dia, desafio e liga.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarPerfil, diasEntre, gotasDaPartida, LOJA, SEQUENCIA, PRECO_REFORCO } from '../src/jogo/perfil.js';

test('calendario: dias entre datas, inclusive virada de mes e de ano', () => {
  assert.equal(diasEntre('2026-10-14', '2026-10-15'), 1);
  assert.equal(diasEntre('2026-10-31', '2026-11-01'), 1);
  assert.equal(diasEntre('2026-12-31', '2027-01-01'), 1);
  assert.equal(diasEntre('2028-02-28', '2028-03-01'), 2);
  assert.equal(diasEntre('2026-10-14', '2026-10-14'), 0);
});

test('padrao: bequer, caderno e classico de graca e equipados; o jardim custa 150', () => {
  const p = criarPerfil({}, '2026-10-19');
  assert.deepEqual(p.equipado, { cesto: 'becher', cenario: 'caderno', objeto: 'classico' });
  for (const g of Object.keys(LOJA)) assert.equal(LOJA[g][0].preco, 0);
  assert.equal(LOJA.cenario.find((i) => i.id === 'jardim').preco, 150);
  assert.equal(p.comprar('cenario', 'jardim'), false);
  p.ganhar(150);
  assert.equal(p.comprar('cenario', 'jardim'), true);
  assert.equal(p.gotas, 0);
  assert.equal(p.equipado.cenario, 'jardim');
});

test('gastar: o +1 do reforco sai das gotas so com saldo', () => {
  const p = criarPerfil({}, '2026-10-19');
  assert.equal(p.gastar(PRECO_REFORCO), false);
  p.ganhar(PRECO_REFORCO + 5);
  assert.equal(p.gastar(PRECO_REFORCO), true);
  assert.equal(p.gotas, 5);
  assert.equal(p.gastar(0), false);
  assert.equal(p.gastar(-3), false);
  assert.equal(p.gotas, 5);
});

test('save de antes do caderno padrao: o jardim continua equipado e o caderno entra de graca', () => {
  const p = criarPerfil({ possui: { cesto: ['becher'], cenario: ['jardim'], objeto: ['classico'] }, equipado: { cesto: 'becher', cenario: 'jardim', objeto: 'classico' } }, '2026-10-19');
  assert.equal(p.equipado.cenario, 'jardim');
  assert.equal(p.equipar('cenario', 'caderno'), true);
  assert.equal(p.equipar('cenario', 'jardim'), true, 'nao perde o jardim');
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

test('migracao: o "nivel 13" do estouro de dois 12 (antes de existir) volta a 12 uma vez', () => {
  const p = criarPerfil({ visto: 13, gotas: 40 }, '2026-10-15');
  assert.equal(p.migrou, true);
  assert.equal(p.visto, 12);
  assert.equal(p.gotas, 40, 'as gotas ja pagas ficam');
  assert.equal(p.descobrir(13), 25, 'o 13 de verdade ainda paga');
  // depois de migrado, um 13 legitimo se mantem
  const q = criarPerfil(p.dados(), '2026-10-16');
  assert.equal(q.migrou, false);
  assert.equal(q.visto, 13);
  // perfil novo nao migra nada
  assert.equal(criarPerfil({}, '2026-10-15').migrou, false);
});

test('skins: compra so nos niveis descobertos, equipa, a Minha nasce vazia e o save mexido e limpo', async () => {
  const { SKINS, PRECO_MINHA, codificar, modelo } = await import('../src/jogo/skins.js');
  const p = criarPerfil({ gotas: 1000, visto: 4 }, '2026-10-15');
  const b = SKINS.find((s) => s.nivel === 1 && s.id !== 'padrao');
  assert.equal(p.possuiSkin(1, 'padrao'), true);
  assert.equal(p.possuiSkin(1, b.id), false);
  assert.equal(p.comprarSkin(1, b.id), true);
  assert.equal(p.gotas, 1000 - b.preco);
  assert.equal(p.skins.equipado[1], b.id);
  assert.equal(p.comprarSkin(1, b.id), false, 'nao compra duas vezes');
  // nivel ainda nao descoberto fica bloqueado; skin que nao existe tambem
  const alto = SKINS.find((s) => s.nivel === 9 && s.id !== 'padrao');
  assert.equal(p.comprarSkin(9, alto.id), false);
  assert.equal(p.comprarSkin(2, 'naoExiste'), false);
  assert.equal(p.comprarSkin(2, 'padrao'), false);
  // sem gotas, nao compra
  const pobre = criarPerfil({ gotas: 10, visto: 13 }, '2026-10-15');
  assert.equal(pobre.comprarSkin(13, 'tesouro'), false);
  // a Minha: compra, nasce vazia, salva o desenho (codigo invalido nao entra)
  assert.equal(p.precoSkin(2, 'minha'), PRECO_MINHA);
  assert.equal(p.salvarMinha(2, { px: codificar(modelo('xadrez', 0, 4)) }), false, 'antes de comprar');
  assert.equal(p.comprarSkin(2, 'minha'), true);
  assert.equal(p.skins.minhas[2].px, 'A'.repeat(171));
  assert.equal(p.salvarMinha(2, { m: 1, b: 3, e: 2, px: codificar(modelo('xadrez', 1, 4)) }), true);
  assert.equal(p.salvarMinha(2, { px: 'lixo' }), false);
  assert.deepEqual({ ...p.skins.minhas[2], px: '' }, { m: 1, b: 3, e: 2, px: '' });
  // voltar para a padrao tira do equipado
  assert.equal(p.equiparSkin(1, 'padrao'), true);
  assert.equal(p.skins.equipado[1], undefined);
  assert.equal(p.equiparSkin(1, b.id), true);
  // o save volta igual; o save mexido e limpo
  const q = criarPerfil(p.dados(), '2026-10-15');
  assert.deepEqual(q.skins, p.skins);
  const r = criarPerfil({ skins: { possui: ['1:' + b.id, 'lixo', '99:minha', '3:naoExiste', 7], equipado: { 1: b.id, 2: 'gotas', 4: 'minha' }, minhas: { 4: { px: 'lixo' } } } }, '2026-10-15');
  assert.deepEqual(r.dados().skins, { possui: ['1:' + b.id], equipado: { 1: b.id }, minhas: {} });
  // o perfil de antes das skins abre sem nada equipado
  assert.deepEqual(criarPerfil({ gotas: 5 }, '2026-10-15').skins, { equipado: {}, minhas: {} });
});

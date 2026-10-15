// Os 5 modelos (e o lab) rodam headless com o bot: sem excecao, sem NaN, e com progresso.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const MODOS = {
  merge: '../src/jogo/modos/merge.js',
  croma: '../src/jogo/modos/croma.js',
  loja: '../src/jogo/modos/loja.js',
  molde: '../src/jogo/modos/molde.js',
  duelo: '../src/jogo/modos/duelo.js',
  lab: '../src/jogo/modos/lab.js',
};

/**
 * Roda o modo por `seg` segundos com o bot a cada `cada` s.
 * @returns {Promise<{ modo: any, eventos: any[] }>}
 */
async function rodar(nome, seg, cada = 0.6, semente = 7) {
  const { criarModo } = await import(MODOS[nome]);
  const modo = criarModo({ semente, salvo: {}, toque: true, lang: 'pt' });
  const eventos = [];
  let t = 0;
  for (let f = 0; f < seg * 60; f++) {
    t += 1 / 60;
    if (t >= cada && modo.bot) { t = 0; modo.bot(); }
    modo.passo(1 / 60);
    eventos.push(...modo.eventos.splice(0));
    if (eventos.some((e) => e.tipo === 'fim')) break;
  }
  const m = modo.mundo;
  for (let i = 0; i < m.n; i++) assert.ok(Number.isFinite(m.x[i]) && Number.isFinite(m.y[i]), `${nome}: NaN`);
  // o HUD e o visual montam sem erro
  assert.ok(modo.hud());
  assert.ok(modo.visual());
  return { modo, eventos };
}

test('Merge Lab: o bot funde e pontua, e nao perde nos 3 primeiros minutos', async () => {
  const { modo, eventos } = await rodar('merge', 180, 0.9);
  assert.ok(eventos.filter((e) => e.tipo === 'fusao').length > 20, 'poucas fusoes');
  assert.ok(modo.hud().pontos > 500);
  assert.ok(!eventos.some((e) => e.tipo === 'fim'), 'perdeu nos 3 primeiros minutos');
});

test('Croma: misturas descobrem cores novas', async () => {
  const { eventos } = await rodar('croma', 60, 0.8);
  assert.ok(eventos.filter((e) => e.tipo === 'fusao').length > 8);
  assert.ok(eventos.some((e) => e.tipo === 'som' && e.nome === 'yes'), 'nenhuma cor nova');
});

test('Loja: o bot entrega pedidos com estrela', async () => {
  const { modo, eventos } = await rodar('loja', 90, 0.5);
  assert.ok(eventos.filter((e) => e.tipo === 'nivel' && e.acao === 'complete').length >= 2, 'menos de 2 pedidos entregues');
  assert.ok(/★ [1-9]/.test(modo.hud().pontos));
});

test('Molde: o bot vence as primeiras fases', async () => {
  const { eventos } = await rodar('molde', 90, 0.3);
  assert.ok(eventos.filter((e) => e.tipo === 'nivel' && e.acao === 'complete').length >= 2, 'menos de 2 fases');
});

test('Duelo: os dois potes jogam e a gosma cinza viaja', async () => {
  const { eventos } = await rodar('duelo', 60, 0.8);
  assert.ok(eventos.filter((e) => e.tipo === 'fusao').length > 8);
  assert.ok(eventos.some((e) => e.tipo === 'texto' && /☁/.test(e.texto)), 'nenhum ataque de gosma');
});

test('Lab: tres materiais lado a lado', async () => {
  const { modo } = await rodar('lab', 12, 99);
  const mats = new Set(modo.mundo.vivos().map((s) => s.mat.nome));
  assert.deepEqual([...mats].sort(), ['gelatina', 'goo', 'liquido']);
});

test('a mira nao deixa o slime raspar na parede: ele cabe inteiro no fundo do pote', async () => {
  const { criarModo } = await import(MODOS.merge);
  const modo = criarModo({ semente: 3, salvo: {}, toque: true });
  for (const x of [99, -99, 4.6, -4.6]) {
    modo.apontar(x, 13, 'mover');
    const p = modo.S.jogadores[0].pote;
    const r = p.preso.raio0;
    assert.ok(Math.abs(p.mira) + r <= p.meiaFundo + 1e-9, `mira ${p.mira.toFixed(2)} + raio ${r.toFixed(2)} passa do fundo ${p.meiaFundo}`);
  }
});

test('niveis altos tem textura e nao viram lama (o arco-iris nao desbota)', async () => {
  const { NIVEIS } = await import('../src/jogo/niveis.js');
  for (let k = 7; k <= 12; k++) assert.ok(NIVEIS[k - 1].textura > 0, `nivel ${k} sem textura`);
  const texturas = NIVEIS.slice(6).map((n) => n.textura);
  // vizinhos na escada nunca repetem a mesma textura
  for (let k = 1; k < texturas.length; k++) assert.notEqual(texturas[k], texturas[k - 1]);
});

test('Duelo 2 jogadores: sem CPU, e cada dedo mira o seu pote', async () => {
  const { criarModo } = await import(MODOS.duelo);
  const modo = criarModo({ semente: 5, salvo: {}, toque: true, doisJogadores: true });
  for (let k = 0; k < 120; k++) modo.passo(1 / 60);
  const [P1, P2] = modo.S.jogadores;
  assert.equal(P2.cpu, null, 'a CPU nao pode jogar no 2P');
  const mira1 = P1.pote.mira;
  modo.apontar(P2.pote.cx + 1.5, 12, 'baixo', 1);
  modo.apontar(P2.pote.cx + 1.5, 12, 'cima', 1);
  assert.ok(Math.abs(P2.pote.mira - (P2.pote.cx + 1.5)) < 1e-9, 'o pote do jogador 2 nao seguiu o dedo');
  assert.equal(P2.jogadas, 1);
  assert.equal(P1.pote.mira, mira1, 'o dedo do jogador 2 mexeu no pote do 1');
});

test('Duelo vs CPU: a liga escolhe a forca da CPU e o fim diz quem venceu', async () => {
  const { criarModo } = await import(MODOS.duelo);
  const modo = criarModo({ semente: 5, salvo: {}, toque: true, liga: 2 });
  modo.passo(1 / 60);
  const S = modo.S;
  assert.equal(S.jogadores[1].cpu.espera, 0.7, 'liga 2 = CPU mais rapida');
  // a CPU transborda duas vezes: o jogador vence a melhor de 3
  for (let k = 0; k < 2; k++) { S.extra.fimRodada = 0; S.R.transbordou(S, S.jogadores[1]); }
  const fim = modo.eventos.find((e) => e.tipo === 'fim');
  assert.ok(fim, 'sem fim depois de 2 rodadas');
  assert.equal(fim.venceu, true);
  assert.equal(fim.vsCpu, true);
  // no modo da build as setas sao do jogador 1 (nao ligam o 2o jogador)
  const outro = criarModo({ semente: 5, salvo: {}, toque: false, liga: 0 });
  outro.passo(1 / 60);
  outro.tecla('ArrowLeft', true);
  outro.passo(1 / 60);
  assert.ok(outro.S.jogadores[1].cpu, 'a seta desligou a CPU');
});

test('Desafio do dia: as regras mudam o jogo', async () => {
  const { criarModo } = await import(MODOS.merge);
  const sem = criarModo({ semente: 9, salvo: {}, toque: true, regra: { id: 'semPoderes', meta: 6000 } });
  const J = sem.S.jogadores[0];
  assert.deepEqual(Object.values(J.poderes), [0, 0, 0, 0]);
  sem.poder('trocar');
  assert.ok(!sem.eventos.some((e) => e.tipo === 'pedirVideo'), 'sem reforcos nao oferece video');
  const peq = criarModo({ semente: 9, salvo: {}, toque: true, regra: { id: 'pequenos', meta: 6000 } });
  for (let k = 0; k < 200; k++) assert.ok(peq.S.R.sortear(peq.S, peq.S.jogadores[0]).nivel <= 3);
  // fora do desafio, o reforco acabado pede o video
  const normal = criarModo({ semente: 9, salvo: {}, toque: true });
  normal.S.jogadores[0].poderes.trocar = 0;
  normal.poder('trocar');
  assert.ok(normal.eventos.some((e) => e.tipo === 'pedirVideo' && e.id === 'trocar'));
});

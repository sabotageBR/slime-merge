// Volei de Gosma (src/jogo/modos/volei.js): o bot joga pelo jogador 1 contra a CPU; pontos dos dois
// lados, partida que acaba, nada de NaN nem de particula fora da quadra, HUD/visual validos,
// torneio salvo, 2 jogadores e controles.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarModo, LARG, RIVAIS, ALVO, meiaLua } from '../src/jogo/modos/volei.js';

/**
 * Roda o modo por `seg` s com o bot a cada `cada` s (como o test/modos.test.js).
 * @returns {{ modo: any, eventos: any[], fim: any }}
 */
function rodar(o, seg, cada = 0.6) {
  const modo = criarModo({ semente: 7, salvo: {}, toque: true, lang: 'pt', ...o });
  const eventos = [];
  let t = 0;
  let fim = null;
  for (let f = 0; f < seg * 60; f++) {
    t += 1 / 60;
    if (t >= cada) { t = 0; modo.bot(); }
    modo.passo(1 / 60);
    const es = modo.eventos.splice(0);
    eventos.push(...es);
    const m = modo.mundo;
    if (f % 30 === 0) {
      for (let i = 0; i < m.n; i++) {
        assert.ok(Number.isFinite(m.x[i]) && Number.isFinite(m.y[i]), 'NaN');
        assert.ok(Math.abs(m.x[i]) < LARG + 0.3 && m.y[i] > -0.4 && m.y[i] < 12, `particula fora da quadra: ${m.x[i]}, ${m.y[i]}`);
      }
      const b = modo.bola;
      assert.ok(Number.isFinite(b.x) && Number.isFinite(b.y), 'bola NaN');
    }
    fim = es.find((e) => e.tipo === 'fim') || null;
    if (fim) break;
  }
  assert.ok(modo.hud());
  assert.ok(modo.visual());
  return { modo, eventos, fim };
}

test('Volei: meia-lua de 80 a 100 particulas, sem par mais perto que o espacamento', () => {
  const p = meiaLua(0);
  const n = p.length / 2;
  assert.ok(n >= 80 && n <= 100, `${n} particulas`);
  let min = Infinity;
  for (let i = 0; i < p.length; i += 2) for (let j = i + 2; j < p.length; j += 2) min = Math.min(min, Math.hypot(p[i] - p[j], p[i + 1] - p[j + 1]));
  assert.ok(min >= 0.308, `par a ${min}`);
});

test('Volei: com o bot, pontos dos dois lados e a partida acaba (contra a Geleia)', () => {
  const { modo, eventos, fim } = rodar({ salvo: { fase: 1 } }, 200);
  const [a, b] = modo.placar;
  const pontos = eventos.filter((e) => e.tipo === 'texto' && e.texto === '+1').length;
  assert.ok(pontos >= 8, `so ${pontos} pontos`);
  // os dois lados marcaram (pelo evento +1 de cada lado)
  const lados = new Set(eventos.filter((e) => e.tipo === 'texto' && e.texto === '+1').map((e) => Math.sign(e.x)));
  assert.equal(lados.size, 2, 'so um lado marcou');
  assert.ok(fim || a + b >= 10, `placar ${a}-${b} sem fim`);
  if (fim) {
    assert.ok(Math.max(a, b) === ALVO, `fim com ${a}-${b}`);
    assert.ok(['Você venceu!', 'Você perdeu'].includes(fim.titulo), fim.titulo);
    assert.equal(fim.pontos, `${a} – ${b}`);
  }
  // toques com respingo e rostos que reagem
  assert.ok(eventos.filter((e) => e.tipo === 'pouso').length > 20, 'poucos toques');
});

test('Volei: em 120 s contra a Gota ja ha varios pontos e o custo por passo e baixo', () => {
  const modo = criarModo({ semente: 7, salvo: {}, toque: true, lang: 'pt' });
  let pontos = 0;
  let ns = 0n;
  let quadros = 0;
  for (let f = 0; f < 120 * 60; f++) {
    if (f % 36 === 0) modo.bot();
    const t0 = process.hrtime.bigint();
    modo.passo(1 / 60);
    ns += process.hrtime.bigint() - t0;
    quadros++;
    const es = modo.eventos.splice(0);
    pontos += es.filter((e) => e.tipo === 'texto' && e.texto === '+1').length;
    if (es.some((e) => e.tipo === 'fim')) break;
  }
  assert.ok(pontos >= 5, `so ${pontos} pontos em 120 s`);
  // 2 slimes de ~90 particulas e a bola: bem abaixo dos 4 ms por passo do desktop
  const ms = Number(ns) / 1e6 / quadros;
  assert.ok(ms < 4, `${ms.toFixed(2)} ms por passo`);
  assert.equal(modo.mundo.n, modo.jogadores[0].s.n + modo.jogadores[1].s.n);
});

test('Volei: vencer avanca o torneio, perder repete, e o progresso volta pelo salvar', () => {
  // o bot (jogador 1) vence a Gota: a fase sobe para a Geleia
  const { modo, fim } = rodar({}, 240);
  assert.ok(fim, 'a partida nao acabou');
  const s = modo.salvar();
  if (fim.venceu) assert.equal(s.fase, 1);
  else assert.equal(s.fase, 0);
  assert.equal(s.vistos, 1);
  // de volta com o salvo
  const novo = criarModo({ semente: 3, salvo: s, toque: false, lang: 'pt' });
  assert.match(novo.hud().metaHtml, new RegExp(RIVAIS[s.fase].nome));
  // reiniciar zera o placar
  modo.reiniciar();
  assert.deepEqual(modo.placar, [0, 0]);
  assert.equal(modo.estado, 'saque');
});

test('Volei: 2 jogadores pelo botao, teclas de cada um e o toque de cada metade', () => {
  const modo = criarModo({ semente: 5, salvo: {}, toque: true, lang: 'pt' });
  assert.equal(modo.multi, false);
  const h = modo.hud();
  assert.deepEqual(h.poderes.map((p) => p.id), ['dois']);
  assert.ok(modo.botoes.dois.svg.startsWith('<svg viewBox="0 0 24 24">'));
  modo.poder('dois');
  assert.equal(modo.multi, true);
  assert.equal(modo.hud().poderes[0].ativo, true);
  assert.match(modo.hud().metaHtml, /P1.*P2/);
  const [J0, J1] = modo.jogadores;
  // toque rapido em qualquer lugar da metade pula sem andar (o saque ainda espera no alto);
  // segurar e soltar nao pula
  const xAntes = J0.s.cx;
  modo.apontar(J0.casa - 5, 1, 'baixo', 0);
  for (let f = 0; f < 5; f++) modo.passo(1 / 60);
  modo.apontar(J0.casa - 5, 1, 'cima', 0);
  let subiu = 0;
  for (let f = 0; f < 20; f++) { modo.passo(1 / 60); subiu = Math.max(subiu, J0.s.base); }
  assert.ok(subiu > 1, 'o toque rapido nao pulou');
  assert.ok(Math.abs(J0.s.cx - xAntes) < 0.8, 'o toque rapido levou o slime');
  for (let f = 0; f < 40; f++) modo.passo(1 / 60);
  modo.apontar(-5, 1, 'baixo', 0);
  for (let f = 0; f < 30; f++) modo.passo(1 / 60);
  modo.apontar(-5, 1, 'cima', 0);
  modo.passo(1 / 60);
  assert.ok(J0.s.vy < 2, 'pulou sem o toque rapido');
  // setas: jogador 2 anda para a direita; A: jogador 1 para a esquerda
  modo.tecla('ArrowRight', true);
  modo.tecla('KeyA', true);
  const x0 = [J0.s.cx, J1.s.cx];
  for (let f = 0; f < 30; f++) modo.passo(1 / 60);
  assert.ok(J0.s.cx < x0[0] - 1, 'P1 nao andou');
  assert.ok(J1.s.cx > x0[1] + 1, 'P2 nao andou');
  modo.tecla('ArrowRight', false);
  modo.tecla('KeyA', false);
  // toque: cada metade da tela e de um jogador; o dedo leva o slime
  modo.apontar(-3, 1, 'baixo', 0);
  modo.apontar(4, 1, 'baixo', 1);
  for (let f = 0; f < 60; f++) modo.passo(1 / 60);
  assert.ok(Math.abs(J0.s.cx - -3) < 0.6, `P1 em ${J0.s.cx}`);
  assert.ok(Math.abs(J1.s.cx - 4) < 0.6, `P2 em ${J1.s.cx}`);
  modo.apontar(-3, 1, 'cima', 0);
  modo.apontar(4, 1, 'cima', 1);
  // a rede segura cada um no seu lado
  modo.tecla('KeyD', true);
  for (let f = 0; f < 120; f++) modo.passo(1 / 60);
  assert.ok(J0.s.dir < 0, 'P1 passou da rede');
  // de volta contra a CPU
  modo.poder('dois');
  assert.equal(modo.multi, false);
});

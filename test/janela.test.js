// Corrida na Janela (prototipo ?modelo=janela): o bot corre, os 4 chegam, gotas sao engolidas, nada
// sai do vidro, o campeonato fecha com o fim e a camera que desce nao recria o campo do render.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarModo, PISTA, DESCIDA, PONTOS, gerarPista } from '../src/jogo/modos/janela.js';
import { criarRng } from '../src/core/rng.js';

/** Particulas finitas e dentro do vidro (entre a moldura, a travessa e o peitoril). */
function dentro(m) {
  const xi = PISTA.moldura - PISTA.rMoldura + 0.05;
  const yT = PISTA.topo - PISTA.rMoldura + 0.05;
  const yP = PISTA.peitoril + PISTA.rMoldura - 0.05;
  for (let i = 0; i < m.n; i++) {
    const x = m.x[i];
    const y = m.y[i];
    if (!Number.isFinite(x) || !Number.isFinite(y)) return `NaN na particula ${i}`;
    if (x < -xi || x > xi || y > yT || y < yP) return `particula ${i} fora do vidro (${x.toFixed(2)}, ${y.toFixed(2)})`;
  }
  return '';
}

/**
 * Roda o modo com o bot a cada `cada` s ate `parar(modo, eventos)` ou `seg` s.
 * @returns {{ modo: any, eventos: any[], t: number, ms: number }}
 */
function rodar(semente, seg, parar, cada = 0.2, checar = null) {
  const modo = criarModo({ semente, salvo: {}, toque: true, lang: 'pt' });
  const eventos = [];
  let t = 0;
  let tb = 0;
  let ms = 0;
  let q = 0;
  for (let f = 0; f < seg * 60; f++) {
    t += 1 / 60;
    tb += 1 / 60;
    if (tb >= cada) { tb = 0; modo.bot(); }
    const a = performance.now();
    modo.passo(1 / 60);
    ms += performance.now() - a;
    q++;
    eventos.push(...modo.eventos.splice(0));
    if (checar) checar(modo, f);
    if (parar(modo, eventos)) break;
  }
  return { modo, eventos, t, ms: ms / q };
}

test('Corrida na Janela: com o bot, os 4 cruzam a chegada em menos de 60 s e engolem gotas', (t) => {
  let erro = '';
  let campo0 = null;
  const { modo, ms } = rodar(7, 75, (m) => m.estado.fase === 'resumo', 0.2, (modo, f) => {
    if (!erro && f % 3 === 0) erro = dentro(modo.mundo);
    // a janela local do campo e a mesma o tempo todo (mudar recriaria o campo a cada quadro)
    if (!campo0) campo0 = modo.campoJanela;
    assert.equal(modo.campoJanela, campo0);
  });
  assert.equal(erro, '');
  const S = modo.estado;
  assert.equal(S.fase, 'resumo', 'a corrida nao acabou');
  for (const c of S.corredores) {
    assert.ok(c.chegou, `${c.nome} nao chegou`);
    assert.ok(c.tempo > 10 && c.tempo < 60, `${c.nome} chegou em ${c.tempo.toFixed(1)} s`);
  }
  // os lugares sao 1..4 e quem engoliu gota cresceu
  assert.deepEqual(S.corredores.map((c) => c.lugar).sort(), [1, 2, 3, 4]);
  const comeram = S.corredores.reduce((a, c) => a + c.comeu, 0);
  assert.ok(comeram >= 6, `so ${comeram} gotas engolidas`);
  assert.ok(S.corredores.some((c) => c.s.n >= DESCIDA.n0 + 30), 'ninguem cresceu');
  for (const c of S.corredores) assert.ok(c.s.n >= DESCIDA.n0 + c.comeu * 5, `${c.nome}: engoliu e nao cresceu`);
  t.diagnostic(`ms por passo: ${ms.toFixed(2)}; tempos ${S.corredores.map((c) => `${c.nome} ${c.tempo.toFixed(1)}s/${c.comeu}g`).join(', ')}`);
});

test('Corrida na Janela: HUD, visual e a camera que desce com o campo movel', () => {
  const { modo } = rodar(3, 14, () => false);
  const h = modo.hud();
  assert.match(h.pontos, /^[1-4]º$/);
  assert.equal(h.recorde, 'Corrida 1/3');
  assert.ok(typeof h.metaHtml === 'string' && h.metaHtml.includes('tamanho'));
  assert.deepEqual(h.poderes, []);
  const v = modo.visual();
  assert.ok(v.janela && v.janela.corredores.length === 4 && v.janela.pista.adesivos.length > 4);
  assert.ok(Array.isArray(v.olhar));
  // a camera ja desceu e acompanha o jogador
  const [x0, y0, x1, y1] = modo.janela;
  const eu = modo.estado.corredores[0].s;
  assert.ok(y1 < 0 && eu.cy > y0 && eu.cy < y1, 'o jogador fora da janela');
  assert.ok(x1 - x0 > 2 * PISTA.xv);
  // campo movel: o campo parado na janela local, deslocado ate a janela de agora
  const local = modo.campoJanela;
  const falso = { nx: 1, ny: 1, t0: null, t1: null, t2: null, celula: 0.1, raio: 0.48, janela: local, caixa: null, comAparencia: false, acumular() {} };
  const cm = modo.campoMovel(falso);
  assert.ok(Math.abs((cm.janela[1] + cm.janela[3]) / 2 - (y0 + y1) / 2) < 1e-9, 'campo e camera desencontrados');
  assert.ok(cm.janela[1] <= y0 && cm.janela[3] >= y1 && cm.janela[0] <= x0 && cm.janela[2] >= x1, 'o campo nao cobre a janela');
  assert.equal(modo.campoJanela, local);
});

test('Corrida na Janela: arrastar e as setas levam o slime para o lado', () => {
  const modo = criarModo({ semente: 5, salvo: {}, toque: true, lang: 'pt' });
  for (let f = 0; f < 200; f++) modo.passo(1 / 60);
  assert.equal(modo.estado.fase, 'corre');
  const eu = modo.estado.corredores[0].s;
  const x0 = eu.cx;
  const alvo = x0 > 0 ? x0 - 4 : x0 + 4;
  modo.apontar(alvo, eu.cy, 'baixo');
  modo.apontar(alvo, eu.cy - 2, 'mover');
  for (let f = 0; f < 70; f++) modo.passo(1 / 60);
  modo.apontar(alvo, eu.cy, 'cima');
  assert.ok(Math.abs(eu.cx - alvo) < 1.5, `foi para ${eu.cx.toFixed(2)}, alvo ${alvo.toFixed(2)}`);
  const x1 = eu.cx;
  const tecla = x1 > 0 ? 'ArrowLeft' : 'ArrowRight';
  modo.tecla(tecla, true);
  for (let f = 0; f < 30; f++) modo.passo(1 / 60);
  modo.tecla(tecla, false);
  assert.ok(Math.abs(eu.cx - x1) > 1, 'a seta nao mexeu');
});

test('Corrida na Janela: campeonato de 3 corridas, pontos 10/6/3/1 e o fim sem gotas', (t) => {
  const { modo, eventos } = rodar(11, 220, (_m, ev) => ev.some((e) => e.tipo === 'fim'), 0.25);
  const fim = eventos.find((e) => e.tipo === 'fim');
  assert.ok(fim, 'o campeonato nao acabou');
  assert.equal(modo.semGotas, true);
  assert.equal(fim.semGotas, true);
  assert.ok(/^(Campeão!|[2-4]º lugar)$/.test(fim.titulo), fim.titulo);
  assert.deepEqual(eventos.filter((e) => e.tipo === 'nivel' && e.acao === 'start').map((e) => e.n), [1, 2, 3]);
  const R = modo.estado.resumo;
  assert.equal(R.geral.reduce((a, g) => a + g.total, 0), 3 * PONTOS.reduce((a, b) => a + b, 0));
  assert.equal(fim.pontos, R.geral.find((g) => g.eu).total);
  const salvo = modo.salvar();
  assert.ok(salvo.melhor >= 1 && salvo.melhor <= 4);
  t.diagnostic(`${fim.titulo}: ${fim.sub}`);
  // jogar de novo: o campeonato recomeca e o melhor resultado fica
  modo.reiniciar();
  assert.equal(modo.estado.fase, 'conta');
  assert.equal(modo.hud().recorde, 'Corrida 1/3');
  const outro = criarModo({ semente: 11, salvo, toque: true, lang: 'pt' });
  assert.deepEqual(outro.salvar(), salvo);
});

test('Corrida na Janela: pistas diferentes por corrida e deterministicas pela semente', () => {
  const a = gerarPista(criarRng(42));
  const b = gerarPista(criarRng(42));
  const c = gerarPista(criarRng(43));
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.adesivos.map((x) => x.x), c.adesivos.map((x) => x.x));
  // nenhum adesivo sai do vidro nem passa da chegada; sempre ha gotas
  for (const p of [a, c]) {
    assert.ok(p.gotas.length >= 30);
    for (const ad of p.adesivos) assert.ok(ad.caixa[1] > PISTA.chegada + 2 && ad.caixa[3] < PISTA.largada - 4);
  }
  // a mesma partida com a mesma semente da o mesmo mundo
  const h = () => rodar(9, 8, () => false).modo.mundo.hash();
  assert.equal(h(), h());
});

// Aperta-Gosma (prototipo, ?modelo=aperta): o bot passa por todas as ferramentas, cumpre metas,
// nada sai da caixa de vidro e o progresso volta do save.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarModo, CAIXA, FERRAMENTAS, ALBUM, METAS, AJUSTE } from '../src/jogo/modos/aperta.js';

/**
 * Roda o modo `seg` s com o bot a cada `cada` s; confere a caixa e o NaN a cada quadro.
 * @returns {{ modo: any, eventos: any[], ms: number, foraMax: number }}
 */
function rodar(seg, cada = 0.5, semente = 7, salvo = {}) {
  const modo = criarModo({ semente, salvo, toque: true, lang: 'pt' });
  const eventos = [];
  let t = 0;
  let ms = 0;
  let foraMax = 0;
  for (let f = 0; f < seg * 60; f++) {
    t += 1 / 60;
    if (t >= cada) { t = 0; modo.bot(); }
    const a = performance.now();
    modo.passo(1 / 60);
    ms += performance.now() - a;
    eventos.push(...modo.eventos.splice(0));
    const m = modo.mundo;
    for (let i = 0; i < m.n; i++) {
      const x = m.x[i];
      const y = m.y[i];
      assert.ok(Number.isFinite(x) && Number.isFinite(y), `NaN no quadro ${f}`);
      foraMax = Math.max(foraMax, CAIXA.x0 - x, x - CAIXA.x1, CAIXA.y0 - y, y - CAIXA.y1);
    }
  }
  return { modo, eventos, ms: ms / (seg * 60), foraMax };
}

test('Aperta-Gosma: em 90 s o bot usa as 8 ferramentas, cumpre metas e nada sai da caixa', () => {
  for (const semente of [7, 3]) {
    const { modo, eventos, ms, foraMax } = rodar(90, 0.5, semente);
    assert.deepEqual([...modo.usadas].sort(), [...FERRAMENTAS].sort(), `ferramentas (semente ${semente})`);
    const metas = eventos.filter((e) => e.tipo === 'nivel' && e.acao === 'complete').length;
    assert.ok(metas >= 3, `so ${metas} metas (semente ${semente})`);
    assert.equal(modo.salvar().estrelas, metas);
    // nenhuma particula fora da caixa (a rede de seguranca quase nunca precisa agir)
    assert.ok(foraMax <= 0, `particula fora da caixa: ${foraMax}`);
    assert.ok(modo.estado.resgates < 40, `rede puxou ${modo.estado.resgates} particulas`);
    // o que o main.js trata: missil com gosma na tela, sons, caretas no album
    assert.ok(eventos.some((e) => e.tipo === 'missil'), 'missil nao explodiu');
    assert.ok(eventos.some((e) => e.tipo === 'som' && e.nome === 'missao'), 'sem som de meta');
    assert.ok(modo.salvar().album.length >= 5, 'poucas caretas no album');
    assert.ok(ms < 4, `passo caro: ${ms.toFixed(2)} ms`);
  }
});

test('Aperta-Gosma: HUD e visual validos', () => {
  const { modo } = rodar(20, 0.5, 5);
  const h = modo.hud();
  assert.match(h.pontos, /^★ \d+$/);
  assert.match(h.recorde, new RegExp(`^Caretas \\d+/${ALBUM.length}$`));
  assert.equal(typeof h.metaHtml, 'string');
  assert.ok(h.metaHtml.includes('pedido proto'));
  assert.deepEqual(h.poderes.map((p) => p.id), [...FERRAMENTAS]);
  assert.equal(h.poderes.filter((p) => p.ativo).length, 1);
  const v = modo.visual();
  assert.ok(v && Array.isArray(v.potes) && v.potes[0].cesto.estilo === 'vidro');
  assert.ok(typeof modo.desenho.cenario === 'function' && typeof modo.desenho.topo === 'function');
  // os botoes sem icone pronto trazem SVG (sem xmlns: o teste de estilo proibe URL) e nome
  for (const id of ['mao', 'martelo', 'cola']) {
    assert.ok(modo.botoes[id].svg.startsWith('<svg viewBox="0 0 24 24">'));
    assert.ok(!/http/.test(modo.botoes[id].svg));
  }
});

test('Aperta-Gosma: a mao estica o slime de verdade (meta de esticar)', () => {
  const modo = criarModo({ semente: 7, salvo: {}, toque: true, lang: 'pt' });
  for (let f = 0; f < 60; f++) modo.passo(1 / 60);
  const s = modo.mundo.slimes.find((q) => q.ativo);
  const alt0 = s.topo - s.base;
  modo.apontar(s.cx, s.topo - 0.5, 'baixo');
  for (let f = 0; f < 60; f++) {
    modo.apontar(s.cx, s.topo - 0.5 + Math.min(1, f / 40) * 7, 'mover');
    modo.passo(1 / 60);
  }
  assert.ok(s.topo - s.base > alt0 * AJUSTE.estica, `esticou pouco: ${(s.topo - s.base).toFixed(2)} de ${alt0.toFixed(2)}`);
  modo.apontar(s.cx, s.topo, 'cima');
  for (let f = 0; f < 10; f++) modo.passo(1 / 60);
  assert.equal(modo.salvar().meta, 1, 'a meta de esticar nao contou');
  assert.ok(modo.eventos.some((e) => e.tipo === 'som' && e.nome === 'missao'));
});

test('Aperta-Gosma: tesoura corta, pedaco minusculo some, cola junta e devolve o volume', () => {
  const modo = criarModo({ semente: 4, salvo: {}, toque: true, lang: 'pt' });
  modo.estado.tocou = true;
  for (let f = 0; f < 60; f++) modo.passo(1 / 60);
  const m = modo.mundo;
  const n0 = m.n;
  modo.poder('tesoura');
  for (const [ax, ay, bx, by] of [[0, 9, 0, -1], [-6, 1.5, 6, 1.5], [-6, 4.5, 6, 0.5]]) {
    modo.apontar(ax, ay, 'baixo');
    modo.apontar(bx, by, 'mover');
    modo.apontar(bx, by, 'cima');
    for (let f = 0; f < 20; f++) modo.passo(1 / 60);
  }
  const pedacos = m.slimes.filter((s) => s.ativo).length;
  assert.ok(pedacos >= 4, `so ${pedacos} pedacos`);
  for (const s of m.slimes) if (s.ativo) assert.ok(s.n >= 6, 'pedaco minusculo ficou');
  modo.poder('cola');
  modo.apontar(0, 2, 'baixo');
  modo.apontar(0, 2, 'cima');
  for (let f = 0; f < 300 && m.slimes.filter((s) => s.ativo).length > 1; f++) modo.passo(1 / 60);
  assert.equal(m.slimes.filter((s) => s.ativo).length, 1, 'a cola nao juntou tudo');
  modo.passo(1 / 60);
  assert.equal(m.n, n0, 'o volume nao voltou');
});

test('Aperta-Gosma: o progresso volta do save e o Recomecar mantem estrelas e album', () => {
  const salvo = { estrelas: 4, meta: 4, album: ['zonzo', 'feliz', 'bogus'] };
  const modo = criarModo({ semente: 2, salvo, toque: true, lang: 'pt' });
  assert.equal(modo.hud().pontos, '★ 4');
  assert.equal(modo.hud().recorde, `Caretas 2/${ALBUM.length}`);
  assert.ok(modo.hud().metaHtml.includes(METAS[4].texto.slice(0, 10)));
  for (let f = 0; f < 30; f++) modo.passo(1 / 60);
  modo.reiniciar();
  assert.equal(modo.mundo.slimes.filter((s) => s.ativo).length, 1);
  assert.deepEqual(modo.salvar(), { estrelas: 4, meta: 4, album: ['zonzo', 'feliz'] });
});

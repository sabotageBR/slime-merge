// Slime atravessado na parede (print do iPhone, 2026-10-18: um nivel 11 meio para fora do bequer,
// pendurado abaixo do fundo). A parede e uma capsula de dois lados: quem passa do eixo fica do lado
// de fora. Estes testes cobrem as portas de entrada (restaurar a partida, soltar em cima da borda,
// fundir pela parede, crescer encostado nela) e a rede de seguranca do pote.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarModo } from '../src/jogo/modos/merge.js';
import { CESTOS } from '../src/jogo/cestos.js';
import { diametroNivel } from '../src/jogo/niveis.js';
import { REDE_T } from '../src/jogo/pote.js';

/** Eixo das paredes do pote (polilinha do topo esquerdo ao direito). */
function contorno(modo) {
  const P = modo.S.jogadores[0].pote;
  const ps = modo.S.mundo.paredes;
  const pts = [];
  const n = P.cesto.linhas[0].length - 1;
  for (let k = 0; k < n; k++) {
    const p = ps[P.idxParedes[k]];
    if (!k) pts.push([p.ax + (p.tx || 0), p.ay + (p.ty || 0)]);
    pts.push([p.bx + (p.tx || 0), p.by + (p.ty || 0)]);
  }
  return pts;
}

/** Ponto dentro do poligono fechado (raio para a direita). */
function dentro(pts, x, y) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/** Particulas fora do pote abaixo da borda (teste proprio, independente do pote.js). */
function fora(modo) {
  const pts = contorno(modo);
  const borda = Math.min(pts[0][1], pts[pts.length - 1][1]);
  const m = modo.S.mundo;
  let q = 0;
  for (let i = 0; i < m.n; i++) {
    const s = m.slimes[m.sl[i]];
    if (!s.ativo || s.preso || m.y[i] >= borda) continue;
    if (!dentro(pts, m.x[i], m.y[i])) q++;
  }
  return q;
}

/** Roda `n` quadros; devolve os eventos e o maior tempo seguido com particulas fora. */
function quadros(modo, n, bot = 0) {
  const ev = [];
  let seguido = 0;
  let pior = 0;
  for (let f = 0; f < n; f++) {
    if (bot && f % bot === 0) modo.bot();
    modo.passo(1 / 60);
    ev.push(...modo.eventos.splice(0));
    seguido = fora(modo) ? seguido + 1 / 60 : 0;
    pior = Math.max(pior, seguido);
  }
  return { ev, pior };
}

function por(modo, spec, x, y) {
  const S = modo.S;
  const s = S.R.criar(S, S.jogadores[0], spec, x, y, false);
  s.dados.pote = 0;
  s.dados.solto = -10;
  return s;
}

/** Uma partida de verdade com o pote cheio e achatado (o bot soltando a cada 0,6 s). */
function poteCheio(semente, alargar) {
  const modo = criarModo({ semente, salvo: {}, toque: true });
  if (alargar) modo.poder('alargar');
  quadros(modo, 150 * 60, 36);
  return modo;
}

test('restaurar a partida: cada slime volta com a forma salva, dentro do pote (com e sem Alargar)', () => {
  for (const [semente, alargar] of [[12, false], [11, true]]) {
    const modo = poteCheio(semente, alargar);
    const salvo = JSON.parse(JSON.stringify(modo.salvar()));
    // so os membros de uma fusao em andamento voltam sem a forma
    const semForma = salvo.partida.slimes.filter((q) => !Array.isArray(q[4])).length;
    assert.ok(semForma <= 4 * modo.S.fusoes.length, `${semForma} slimes sem a forma no save`);
    const volta = criarModo({ semente, salvo, toque: true });
    assert.equal(fora(volta), 0, `semente ${semente}: nasceu com particulas fora`);
    // cada um volta onde estava (o centro das particulas e o salvo)
    const m = volta.S.mundo;
    for (const [k, x, y, , forma] of salvo.partida.slimes) {
      if (!Array.isArray(forma)) continue;
      const s = m.vivos().find((o) => !o.preso && o.nivel === k && Math.abs(o.cx - x) < 0.15 && Math.abs(o.cy - y) < 0.15);
      assert.ok(s, `semente ${semente}: o nivel ${k} nao voltou em (${x}, ${y})`);
    }
    const { ev } = quadros(volta, 5 * 60);
    const P = volta.S.jogadores[0].pote;
    assert.ok(P.puxadas <= 3, `semente ${semente}: a rede puxou ${P.puxadas} particulas`);
    assert.ok(!ev.some((e) => e.tipo === 'volta'), `semente ${semente}: a rede precisou devolver um slime`);
  }
});

test('restaurar um save sem a forma (2.0.1): discos inteiros dentro do pote, nada pendurado do lado de fora', () => {
  const modo = poteCheio(12, false);
  const salvo = JSON.parse(JSON.stringify(modo.salvar()));
  salvo.partida.slimes = salvo.partida.slimes.map((q) => q.slice(0, 4));
  const volta = criarModo({ semente: 12, salvo, toque: true });
  assert.equal(fora(volta), 0, 'disco nasceu atravessando a parede ou o fundo');
  // o que transborda por cima da borda pode cair por fora: a rede o devolve
  const { pior } = quadros(volta, 6 * 60);
  assert.ok(pior <= REDE_T + 0.1, `particulas fora por ${pior.toFixed(2)} s`);
  assert.equal(fora(volta), 0);
});

test('soltar os niveis 5 a 9 em cima das bordas: ninguem nasce espetado nem fica do lado de fora', () => {
  for (const id of ['becher', 'xicara', 'aquario']) {
    for (const lado of [-1, 1]) {
      for (let nv = 5; nv <= 9; nv++) {
        const modo = criarModo({ semente: 3, salvo: {}, toque: true, cesto: id, inicio: { largura: 1 } });
        const S = modo.S;
        const J = S.jogadores[0];
        S.mundo.remover(J.pote.preso);
        J.pote.preso = null;
        const preso = S.R.criar(S, J, { nivel: nv }, J.pote.mira, J.pote.ySoltar, true);
        preso.dados.pote = 0;
        J.pote.prender(preso);
        modo.apontar(lado * 99, 13, 'baixo');
        modo.apontar(lado * 99, 13, 'cima');
        const { ev, pior } = quadros(modo, 240);
        const rot = `${id} lado ${lado} nivel ${nv}`;
        assert.equal(pior, 0, `${rot}: particulas fora por ${pior.toFixed(2)} s`);
        // uma ou outra particula que escorrega por cima da borda volta sozinha; o slime fica
        assert.ok(J.pote.puxadas <= 6, `${rot}: a rede puxou ${J.pote.puxadas} particulas`);
        assert.ok(!ev.some((e) => e.tipo === 'volta'), `${rot}: precisou devolver o slime`);
        assert.ok(J.pote.contem(preso.cx, preso.cy), `${rot}: ficou fora (${preso.cx.toFixed(2)}, ${preso.cy.toFixed(2)})`);
      }
    }
  }
});

test('o slime pequeno continua indo ate o topo do vidro; o grande recua so o que precisa', () => {
  const modo = criarModo({ semente: 3, salvo: {}, toque: true, inicio: { largura: 1 } });
  const S = modo.S;
  const J = S.jogadores[0];
  const ps = S.mundo.paredes;
  const d = ps[J.pote.idxParedes[J.pote.idxParedes.length - 1]].bx;
  const miraCom = (nv) => {
    S.mundo.remover(J.pote.preso);
    J.pote.preso = null;
    J.pote.prender(S.R.criar(S, J, { nivel: nv }, 0, J.pote.ySoltar, true));
    modo.apontar(99, 13, 'mover');
    return J.pote.mira;
  };
  assert.ok(Math.abs(miraCom(1) - d) < 1e-9, 'o nivel 1 nao chega ao topo do vidro');
  const m9 = miraCom(9);
  assert.ok(m9 < d && m9 > d - diametroNivel(9), `o nivel 9 recuou demais ou de menos (${m9.toFixed(2)})`);
});

test('do lado de fora do pote ninguem funde pela parede', () => {
  const modo = criarModo({ semente: 5, salvo: {}, toque: true, pressao: false, inicio: { largura: 1 } });
  const ps = modo.S.mundo.paredes;
  const P = modo.S.jogadores[0].pote;
  const xd = ps[P.idxParedes[P.idxParedes.length - 1]].bx;
  const r = diametroNivel(3) / 2;
  // um 3 encostado por dentro da parede direita e outro igual encostado por fora, na mesma altura
  por(modo, { nivel: 3 }, xd - 0.36 - r, 5);
  por(modo, { nivel: 3 }, xd + 0.36 + r, 5);
  const { ev } = quadros(modo, Math.floor(REDE_T * 60) - 2);
  assert.ok(!ev.some((e) => e.tipo === 'junta' || e.tipo === 'fusao'), 'fundiu atraves da parede');
});

test('rede de seguranca: o slime atravessado na parede volta inteiro para dentro', () => {
  const modo = criarModo({ semente: 5, salvo: {}, toque: true, pressao: false, inicio: { largura: 1 } });
  const ps = modo.S.mundo.paredes;
  const P = modo.S.jogadores[0].pote;
  const xd = ps[P.idxParedes[P.idxParedes.length - 1]].bx;
  // nasce espetado: metade de cada lado da parede direita, perto do fundo (o print)
  const s = por(modo, { nivel: 8 }, xd, 2.5);
  assert.ok(fora(modo) > 0);
  const { ev, pior } = quadros(modo, 90);
  assert.ok(s.ativo, 'o slime sumiu');
  assert.ok(ev.some((e) => e.tipo === 'volta' && e.nivel === 8), 'a rede nao agiu');
  assert.ok(pior <= REDE_T + 0.05, `ficou fora por ${pior.toFixed(2)} s`);
  assert.equal(fora(modo), 0);
  assert.ok(P.contem(s.cx, s.cy));
});

test('evoluir ou ganhar tinta encostado na parede: as particulas novas nascem dentro', () => {
  const modo = criarModo({ semente: 5, salvo: {}, toque: true, inicio: { largura: 1 } });
  const S = modo.S;
  const J = S.jogadores[0];
  const ps = S.mundo.paredes;
  const xd = ps[J.pote.idxParedes[J.pote.idxParedes.length - 1]].bx;
  const xe = ps[J.pote.idxParedes[0]].ax;
  // um 2 no canto direito e um 3 no esquerdo, com um 10 por cima: a escada leva os dois ao piso 4
  por(modo, { nivel: 2 }, xd - 0.36 - diametroNivel(2) / 2, diametroNivel(2) / 2 + 0.2);
  por(modo, { nivel: 3 }, xe + 0.36 + diametroNivel(3) / 2, diametroNivel(3) / 2 + 0.2);
  por(modo, { nivel: 10 }, 0, 6);
  quadros(modo, 60);
  J.maxNivel = 11;
  modo.S.extra.evoluir = 4;
  const { ev } = quadros(modo, 180);
  assert.ok(ev.some((e) => e.tipo === 'escada'), 'nao evoluiu');
  assert.equal(J.pote.puxadas, 0, `a rede puxou ${J.pote.puxadas} particulas`);
  assert.ok(!ev.some((e) => e.tipo === 'volta'), 'precisou da rede');
  // o 10 por cima nao foi lancado (a separacao das particulas novas e so na posicao)
  const dez = S.mundo.vivos().find((s) => s.nivel === 10);
  assert.ok(dez && dez.topo < 15, `o 10 subiu para ${dez && dez.topo.toFixed(2)}`);
});

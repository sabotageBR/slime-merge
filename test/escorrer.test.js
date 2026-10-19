// Slime que escorre pelo vidro (2026-10-18, video do usuario: o slime solto em cima da borda ficava
// nela e depois pulava para dentro, longe da parede; ele tem que escorrer por ela). A aderencia
// (ADER no mundo.js) liga na soltura e sai no primeiro toque em outro slime. Estes testes cobrem o
// escorrer, as armadilhas que ela abria (o slime pendurado na borda por uma particula, a peca presa
// que enganchava quem ainda estava na borda) e o desenganchar da fisica.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarModo } from '../src/jogo/modos/merge.js';
import { CESTOS } from '../src/jogo/cestos.js';
import { criarMundo, ADER } from '../src/fisica/mundo.js';
import { ADER_T } from '../src/jogo/pote.js';

/** Pote largo; com `pilha`, tres slimes no fundo. */
function pote(cesto = 'becher', pilha = true, semente = 3) {
  const modo = criarModo({ semente, salvo: {}, toque: true, cesto, inicio: { largura: 1 } });
  const S = modo.S;
  const J = S.jogadores[0];
  if (pilha) [[3, -2.4], [5, 0], [3, 2.4]].forEach(([k, x]) => por(modo, k, x, 2));
  for (let f = 0; f < 90; f++) modo.passo(1 / 60);
  return { modo, S, J, P: J.pote, m: S.mundo };
}

function por(modo, k, x, y) {
  const S = modo.S;
  const s = S.R.criar(S, S.jogadores[0], { nivel: k }, x, y, false);
  s.dados.pote = 0;
  s.dados.solto = -10;
  return s;
}

/** Folga entre o slime e o vidro: a menor distancia de uma particula as paredes do contorno, menos os raios. */
function folgaVidro(m, P, s) {
  let folga = Infinity;
  for (const k of P.idxParedes) {
    const p = m.paredes[k];
    const ex = p.bx - p.ax;
    const ey = p.by - p.ay;
    const l2 = ex * ex + ey * ey;
    for (let a = m.iniSl[s.idx]; a < m.iniSl[s.idx + 1]; a++) {
      const i = m.membros[a];
      const t = Math.max(0, Math.min(1, ((m.x[i] - p.ax) * ex + (m.y[i] - p.ay) * ey) / l2));
      folga = Math.min(folga, Math.hypot(m.x[i] - p.ax - t * ex, m.y[i] - p.ay - t * ey) - p.r - m.rad[i]);
    }
  }
  return folga;
}

/** Troca a peca presa pelo nivel k e solta: d < 0 em cima da borda do `lado`; d >= 0, a d u do vidro. */
function soltar({ modo, S, J, P, m }, k, lado, d) {
  m.remover(P.preso);
  P.preso = null;
  const s = S.R.criar(S, J, { nivel: k }, P.mira, P.ySoltar, true);
  s.dados.pote = 0;
  P.prender(s);
  const ps = m.paredes;
  const borda = lado > 0 ? ps[P.idxParedes[P.idxParedes.length - 1]].bx : ps[P.idxParedes[0]].ax;
  const x = d < 0 ? lado * 99 : borda - lado * (d + s.raio0);
  modo.apontar(x, 13, 'baixo');
  modo.apontar(x, 13, 'cima');
  return s;
}

test('solto em cima da borda do bequer, escorre colado no vidro de dentro (niveis 1 a 9, dois lados)', () => {
  for (const lado of [-1, 1]) {
    for (const k of [1, 3, 5, 7, 9]) {
      const c = pote();
      const s = soltar(c, k, lado, -1);
      const { m, P, modo } = c;
      let dentro = -1;
      const vs = [];
      for (let f = 1; f <= 300 && s.ativo; f++) {
        modo.passo(1 / 60);
        if (dentro < 0 && s.topo < P.linha) dentro = f / 60;
        if (s.ader <= 0 || s.topo >= P.linha) continue;
        if (folgaVidro(m, P, s) < 0.05) vs.push(-s.vy);
      }
      const rot = `lado ${lado} nivel ${k}`;
      assert.ok(dentro > 0 && dentro < 1.6, `${rot}: levou ${dentro.toFixed(2)} s para passar da linha`);
      assert.ok(vs.length >= 20, `${rot}: so ${vs.length} quadros colado no vidro (pulou para longe dele)`);
      // escorre: mais devagar que a queda (a chegada ao vidro ainda vem freando), sem parar
      vs.sort((a, b) => a - b);
      const med = vs[vs.length >> 1];
      assert.ok(med > 1 && med < ADER.vel + 0.3, `${rot}: desceu o vidro a ${med.toFixed(2)} u/s (mediana)`);
      assert.ok(!modo.eventos.some((e) => e.tipo === 'resgate' || e.tipo === 'volta'), `${rot}: precisou do Ufa ou da rede`);
    }
  }
});

test('8 cestos, dois lados, na borda e encostado: ninguem fica pendurado na borda nem dispara o "Ufa!"', () => {
  for (const C of CESTOS) {
    for (const lado of [-1, 1]) {
      for (const d of [-1, 0.05]) {
        for (const k of [1, 4, 8]) {
          const c = pote(C.id);
          const s = soltar(c, k, lado, d);
          let dentro = -1;
          for (let f = 1; f <= 300 && s.ativo; f++) {
            c.modo.passo(1 / 60);
            if (dentro < 0 && s.topo < c.P.linha) dentro = f / 60;
          }
          const rot = `${C.id} lado ${lado} d ${d} nivel ${k}`;
          assert.ok(!c.modo.eventos.some((e) => e.tipo === 'resgate'), `${rot}: Ufa`);
          assert.ok(!c.modo.eventos.some((e) => e.tipo === 'volta'), `${rot}: a rede devolveu o slime`);
          assert.ok(dentro > 0 && dentro < 2.5, `${rot}: acima da linha por ${dentro.toFixed(2)} s`);
          assert.ok(c.P.puxadas <= 6, `${rot}: a rede puxou ${c.P.puxadas} particulas`);
          assert.ok(!s.ativo || c.P.contem(s.cx, s.cy), `${rot}: ficou fora`);
        }
      }
    }
  }
});

test('a aderencia sai no primeiro toque em outro slime (e em ADER_T s, no maximo)', () => {
  const c = pote();
  const s = soltar(c, 2, 1, 0.05);
  assert.equal(s.ader, 1);
  let tocou = false;
  for (let f = 0; f < 300 && !tocou; f++) {
    c.modo.passo(1 / 60);
    tocou = c.m.contatos().some(([i, j]) => i === s.idx || j === s.idx);
  }
  assert.ok(tocou, 'nao encostou na pilha');
  assert.equal(s.ader, 0);
  // no pote vazio, encostado no vidro ate o fundo: sai por tempo
  const v = pote('becher', false);
  const t = soltar(v, 1, 1, 0.05);
  for (let f = 0; f < Math.ceil((ADER_T + 0.1) * 60); f++) v.modo.passo(1 / 60);
  assert.equal(t.ader, 0);
});

test('a peca presa nao engancha o slime grande que ainda esta na borda', () => {
  for (const k of [9, 11]) {
    const c = pote();
    const s = soltar(c, k, 1, -1);
    // a peca nova nasce aos 0,5 s, com o slime ainda em cima da borda
    for (let f = 0; f < 240; f++) c.modo.passo(1 / 60);
    assert.ok(s.ativo, `nivel ${k}: sumiu`);
    assert.ok(s.topo < c.P.linha, `nivel ${k}: o topo ficou em ${s.topo.toFixed(2)} (pendurado na peca presa?)`);
    assert.ok(!c.modo.eventos.some((e) => e.tipo === 'resgate'), `nivel ${k}: Ufa`);
  }
});

test('a peca presa nao empurra quem esta embaixo dela; solta por cima, a sobreposicao sai sem lancar', () => {
  const m = criarMundo({ semente: 2 });
  m.definirParedes([{ ax: -6, ay: 0, bx: 6, by: 0, r: 0.22 }]);
  const chao = m.criarSlime({ x: 0, y: 1.1, diametro: 2 });
  for (let f = 0; f < 120; f++) { m.avancar(4); m.medir(1 / 60); }
  const antes = chao.cy;
  const peca = m.criarSlime({ x: 0, y: chao.topo + 0.3, diametro: 1.6, preso: true });
  m.moverPreso(peca, 0, chao.topo + 0.3);
  for (let f = 0; f < 30; f++) { m.avancar(4); m.medir(1 / 60); }
  assert.ok(Math.abs(chao.cy - antes) < 0.05, `a peca presa empurrou o slime de baixo (${antes.toFixed(2)} -> ${chao.cy.toFixed(2)})`);
  m.soltar(peca, 0);
  let vmax = 0;
  for (let f = 0; f < 60; f++) {
    m.avancar(4);
    m.medir(1 / 60);
    vmax = Math.max(vmax, Math.hypot(chao.vx, chao.vy), Math.hypot(peca.vx, peca.vy));
  }
  assert.ok(vmax < 6, `a sobreposicao lancou alguem a ${vmax.toFixed(2)} u/s`);
  assert.ok(peca.base > chao.base, 'a peca nao ficou por cima');
});

test('desenganchar: a particula do outro lado de uma parede volta para o lado do proprio slime', () => {
  const m = criarMundo({ semente: 4 });
  // chao e uma parede fina no meio
  m.definirParedes([{ ax: -8, ay: 0, bx: 8, by: 0, r: 0.22 }, { ax: 0, ay: 0, bx: 0, by: 6, r: 0.22 }]);
  const s = m.criarSlime({ x: -2, y: 1.4, diametro: 2.4 });
  for (let f = 0; f < 60; f++) { m.avancar(4); m.medir(1 / 60); }
  // uma particula do slime passa para o outro lado da parede, longe do corpo
  const i = m.membros[m.iniSl[s.idx]];
  m.x[i] = 0.8;
  m.y[i] = 2;
  m.px[i] = m.x[i];
  m.py[i] = m.y[i];
  m.avancar(4);
  m.medir(1 / 60);
  assert.ok(m.x[i] < 0, `a particula ficou do outro lado da parede (x ${m.x[i].toFixed(2)})`);
  for (let a = m.iniSl[s.idx]; a < m.iniSl[s.idx + 1]; a++) assert.ok(m.x[m.membros[a]] < 0);
});

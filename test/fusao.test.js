// Fusao animada (2026-10-17): os iguais se abracam, escoam num corpo so e estalam; 3 juntos pulam
// um nivel; o 14 (2026-10-18) comemora e estoura: e o super slime. E o tremor do terremoto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarModo } from '../src/jogo/modos/merge.js';
import { criarModo as criarDuelo } from '../src/jogo/modos/duelo.js';
import { criarModo as criarCroma } from '../src/jogo/modos/croma.js';
import { FUSAO } from '../src/jogo/soltar.js';
import { MAX_NIVEL, particulasNivel, pontosNivel } from '../src/jogo/niveis.js';
import { criarMundo } from '../src/fisica/mundo.js';

/** n quadros de 1/60 s; devolve os eventos. */
function quadros(modo, n) {
  const ev = [];
  for (let k = 0; k < n; k++) { modo.passo(1 / 60); ev.push(...modo.eventos.splice(0)); }
  return ev;
}

/** Slime parado no pote (fora da fila). */
function por(modo, spec, x, y, pote = 0) {
  const S = modo.S;
  const s = S.R.criar(S, S.jogadores[pote], spec, x, y, false);
  s.dados.pote = pote;
  s.dados.solto = -10;
  return s;
}

/** Merge sem a pressao (sem escada nem agenda), pote ja crescido e sem nada alem do preso. */
function merge(o = {}) {
  const modo = criarModo({ semente: 4, salvo: {}, toque: true, pressao: false, ...o });
  modo.S.jogadores[0].pote.crescer(0);
  modo.eventos.splice(0);
  return modo;
}

const soltos = (modo) => modo.S.mundo.vivos().filter((s) => !s.preso);

/** grande | vao | grande, e o igual cai no meio (o caso que o usuario relatou). */
function trio(k, vao, dx, o) {
  const modo = merge(o);
  const S = modo.S;
  const a = por(modo, { nivel: k }, 0, 3);
  const r = a.raio0;
  S.mundo.remover(a);
  por(modo, { nivel: k }, -(r + vao * r), r + 0.3);
  por(modo, { nivel: k }, r + vao * r, r + 0.3);
  const ev = quadros(modo, 60);
  por(modo, { nivel: k }, dx, 4 * r + 1.5);
  ev.push(...quadros(modo, 240));
  return { modo, ev };
}

test('grande | vao | grande: a gota do meio junta os tres num k+2 (pontos, funil e missoes certos)', () => {
  for (const k of [3, 5, 7]) {
    for (const vao of [0.5, 0.8]) {
      for (const dx of [0, 0.3, -0.5]) {
        const { modo, ev } = trio(k, vao, dx);
        const nome = `k=${k} vao=${vao} dx=${dx}`;
        const fus = ev.filter((e) => e.tipo === 'fusao');
        assert.equal(fus.length, 1, `${nome}: ${fus.length} fusoes`);
        assert.equal(fus[0].nivel, k + 2, nome);
        assert.equal(fus[0].grupo, 3, nome);
        assert.equal(fus[0].texto, 'triplo', nome);
        const resto = soltos(modo);
        assert.deepEqual(resto.map((s) => s.nivel), [k + 2], nome);
        assert.equal(resto[0].n, particulasNivel(k + 2), nome);
        // o grupo de 3 vale as duas fusoes que ele pulou
        assert.ok(ev.some((e) => e.tipo === 'registro' && e.chave === 'fusao' && e.valor === 2), nome);
        assert.equal(modo.S.jogadores[0].pontos, pontosNivel(k + 1) + pontosNivel(k + 2), nome);
        // o funil da Poki sem buraco: k+1 e k+2 completos, em ordem
        const comp = ev.filter((e) => e.tipo === 'nivel' && e.acao === 'complete').map((e) => e.n);
        assert.deepEqual(comp, Array.from({ length: k + 1 }, (_, i) => i + 2), nome);
        assert.ok(!modo.S.mundo.vivos().some((s) => s.dados.fundindo), `${nome}: marca orfa`);
      }
    }
  }
});

test('grupo de 4 em fila vira um k+2; o par continua k+1', () => {
  const modo = merge();
  const s0 = por(modo, { nivel: 3 }, 0, 3);
  const d = 2 * s0.raio0;
  modo.S.mundo.remover(s0);
  for (let i = 0; i < 4; i++) por(modo, { nivel: 3 }, -1.5 * d + i * d, d / 2 + 0.1);
  const ev = quadros(modo, 240);
  const fus = ev.filter((e) => e.tipo === 'fusao');
  assert.equal(fus.length, 1, JSON.stringify(fus.map((e) => [e.nivel, e.grupo])));
  assert.equal(fus[0].grupo, 4);
  assert.deepEqual(soltos(modo).map((s) => s.nivel), [5]);
});

test('par animado: abraco, corpo que encolhe sem voltar e estalo depois da animacao', () => {
  const modo = merge();
  const a = por(modo, { nivel: 4 }, -0.85, 1);
  por(modo, { nivel: 4 }, 0.85, 1);
  const ns = [];
  let estalo = -1;
  let junta = -1;
  for (let f = 0; f < 180; f++) {
    modo.passo(1 / 60);
    const ev = modo.eventos.splice(0);
    if (junta < 0 && ev.some((e) => e.tipo === 'junta')) junta = f;
    if (estalo < 0 && ev.some((e) => e.tipo === 'fusao')) estalo = f;
    if (junta >= 0 && estalo < 0 && a.ativo) ns.push(a.ativo ? modo.S.mundo.iniSl[a.idx + 1] - modo.S.mundo.iniSl[a.idx] : 0);
  }
  assert.ok(junta >= 0 && estalo > junta, `junta ${junta}, estalo ${estalo}`);
  // o abraco dura FUSAO.atrai e o escoar FUSAO.funde (nada de fusao instantanea)
  assert.ok((estalo - junta) / 60 >= FUSAO.funde - 0.05, `funde em ${(estalo - junta) / 60} s`);
  assert.ok(junta / 60 >= FUSAO.atrai - 0.05, `juntou em ${junta / 60} s`);
  for (let i = 1; i < ns.length; i++) assert.ok(ns[i] <= ns[i - 1], 'o corpo cresceu no meio da fusao');
  const so = soltos(modo);
  assert.deepEqual(so.map((s) => s.nivel), [5]);
  assert.equal(so[0].n, particulasNivel(5));
  assert.equal(so[0].rampaVel, 4);
  assert.ok(!so[0].dados.fundindo);
});

test('coringa e irmaos da tesoura nao entram no grupo (ficam no par)', () => {
  // dois do 4 encostados e um coringa ao lado: o coringa funde depois, num par
  const modo = merge();
  por(modo, { nivel: 4 }, -0.85, 1);
  por(modo, { nivel: 4 }, 0.85, 1);
  por(modo, { nivel: 2, prisma: true }, 2.5, 1);
  const ev = [];
  for (let f = 0; f < 330; f++) {
    ev.push(...quadros(modo, 1));
    for (const F of modo.S.fusoes) {
      if (F.fase === 'atrai') assert.ok(F.membros.length === 2, 'o coringa entrou num grupo de 3');
    }
  }
  assert.ok(ev.filter((e) => e.tipo === 'fusao').every((e) => e.grupo === 2));
  // irmaos da tesoura (mesmo irmao) com um igual: so o par igual-irmao funde
  const t = merge();
  const i1 = por(t, { nivel: 3 }, -0.75, 1);
  const i2 = por(t, { nivel: 3 }, 0.75, 1);
  i1.dados.irmao = i2.dados.irmao = 9;
  por(t, { nivel: 3 }, 0, 3);
  const evt = quadros(t, 240);
  assert.ok(evt.filter((e) => e.tipo === 'fusao').every((e) => e.grupo === 2), 'os irmaos se juntaram no grupo');
});

test('a mira, o bot e o "Ufa!" nao pegam quem esta fundindo', () => {
  const modo = merge();
  const S = modo.S;
  const J = S.jogadores[0];
  const a = por(modo, { nivel: 4 }, -0.85, 1);
  por(modo, { nivel: 4 }, 0.85, 1);
  quadros(modo, 6);
  assert.ok(a.dados.fundindo, 'nao comecou');
  J.poderes.mira = 1;
  modo.poder('mira');
  assert.equal(J.alvoPoder, 'mira');
  modo.apontar(a.cx, a.cy, 'baixo');
  assert.ok(!J.missil, 'a mira escolheu um slime fundindo');
  // o "Ufa!" no meio da fusao: sem erro e sem marca orfa
  J.pote.perigoT = 10;
  quadros(modo, 2);
  quadros(modo, 120);
  assert.ok(!S.mundo.vivos().some((s) => s.dados.fundindo));
  assert.equal(S.fusoes.length, 0);
});

test('super slime: dois do 13 (ou tres do 12) fazem o 14, que comemora ~2 s e estoura', () => {
  for (const [k, qtd] of [[13, 2], [12, 3]]) {
    const modo = merge();
    const S = modo.S;
    const s0 = por(modo, { nivel: k }, 0, 3);
    const r = s0.raio0;
    S.mundo.remover(s0);
    // empilhados no meio do pote (lado a lado eles nao cabem entre as paredes)
    for (let q = 0; q < qtd; q++) por(modo, { nivel: k }, 0, r + 0.1 + q * (2 * r + 0.2));
    let comemorou = 0;
    let estouro = -1;
    const ev = [];
    for (let f = 0; f < 900 && estouro < 0; f++) {
      modo.passo(1 / 60);
      const e = modo.eventos.splice(0);
      ev.push(...e);
      const so = soltos(modo);
      if (so.length === 1 && so[0].nivel === MAX_NIVEL && S.fusoes.some((F) => F.fase === 'comemora')) {
        comemorou++;
        const m = S.mundo;
        assert.equal(m.iniSl[so[0].idx + 1] - m.iniSl[so[0].idx], particulasNivel(MAX_NIVEL), 'o 14 perdeu particulas');
      }
      if (e.some((x) => x.tipo === 'estouro')) estouro = f;
    }
    assert.ok(estouro > 0, `${k}: nao estourou`);
    assert.ok(comemorou / 60 >= FUSAO.comemora - 0.1, `${k}: comemorou so ${comemorou / 60} s`);
    assert.ok(ev.some((e) => e.tipo === 'texto' && e.texto === 'super'));
    assert.ok(ev.some((e) => e.tipo === 'registro' && e.chave === 'nivel' && e.valor === MAX_NIVEL), `${k}: o 14 nao foi registrado`);
    assert.ok(!ev.some((e) => e.tipo === 'registro' && e.chave === 'nivel' && e.valor > MAX_NIVEL));
    assert.equal(soltos(modo).length, 0);
    const estalo = qtd >= 3 ? pontosNivel(MAX_NIVEL - 1) + pontosNivel(MAX_NIVEL) : pontosNivel(MAX_NIVEL);
    assert.equal(S.jogadores[0].pontos, estalo + pontosNivel(MAX_NIVEL) * 2 * qtd);
  }
});

test('save no meio da fusao: os membros de antes voltam e os pontos entram uma vez so', () => {
  for (const fase of ['atrai', 'funde']) {
    const modo = merge();
    por(modo, { nivel: 5 }, -1.05, 1.1);
    por(modo, { nivel: 5 }, 1.05, 1.1);
    for (let f = 0; f < 120 && !(modo.S.fusoes[0] && modo.S.fusoes[0].fase === fase); f++) quadros(modo, 1);
    assert.equal(modo.S.fusoes[0].fase, fase);
    const salvo = JSON.parse(JSON.stringify(modo.salvar()));
    assert.equal(salvo.partida.slimes.length, 2, `${fase}: ${JSON.stringify(salvo.partida.slimes)}`);
    const volta = criarModo({ semente: 4, salvo, toque: true, pressao: false });
    const ev = quadros(volta, 240);
    assert.equal(ev.filter((e) => e.tipo === 'fusao').length, 1, fase);
    assert.equal(volta.S.jogadores[0].pontos, pontosNivel(6), fase);
    assert.deepEqual(soltos(volta).map((s) => [s.nivel, s.n]), [[6, particulasNivel(6)]]);
  }
});

test('fim da partida no meio de uma fusao: o estalo entra nos pontos e nada vem depois do fim', () => {
  const modo = merge({ inicio: { tempoCresce: 9999 } });
  const S = modo.S;
  S.tempo = 400;
  por(modo, { nivel: 5 }, -1.05, 1.1);
  por(modo, { nivel: 5 }, 1.05, 1.1);
  quadros(modo, 8);
  assert.ok(S.fusoes.length === 1);
  modo.S.jogadores[0].pote.perigoT = 10;
  const ev = quadros(modo, 2);
  const iFim = ev.findIndex((e) => e.tipo === 'fim');
  assert.ok(iFim > 0, 'nao acabou');
  const iFus = ev.findIndex((e) => e.tipo === 'fusao');
  assert.ok(iFus >= 0 && iFus < iFim, 'a fusao nao fechou antes do fim');
  assert.ok(ev[iFim].pontos >= pontosNivel(6));
  assert.equal(S.fusoes.length, 0);
});

test('combo: a janela para enquanto uma fusao anima (a cadeia conta) e o selo aparece no x2', () => {
  const modo = merge();
  const J = modo.S.jogadores[0];
  // dois do 3 em cima de um 4: 3+3 = 4, que encosta no 4 e vira 5
  const s4 = por(modo, { nivel: 4 }, 0, 1);
  por(modo, { nivel: 3 }, -0.7, s4.raio0 * 2 + 1);
  por(modo, { nivel: 3 }, 0.7, s4.raio0 * 2 + 1);
  const ev = quadros(modo, 300);
  const fus = ev.filter((e) => e.tipo === 'fusao');
  assert.deepEqual(fus.map((e) => [e.nivel, e.combo]), [[4, 1], [5, 2]]);
  assert.equal(J.pote.combo, 0);
  // o selo: com combo 2 e a janela correndo
  J.pote.combo = 2;
  J.pote.comboT = 0.8;
  const c = modo.visual().combo;
  assert.ok(c && c.n === 2 && c.resto > 0 && c.resto <= 1);
});

test('Duelo: 3 iguais juntos dao k+2 e o ataque sai do nivel novo; Croma funde na hora', () => {
  const duelo = criarDuelo({ semente: 5, salvo: {}, toque: true, doisJogadores: true });
  const S = duelo.S;
  const cx = S.jogadores[0].pote.cx;
  const s0 = por(duelo, { nivel: 4 }, cx, 3);
  const r = s0.raio0;
  S.mundo.remover(s0);
  por(duelo, { nivel: 4 }, cx - 1.6 * r, r + 0.1);
  por(duelo, { nivel: 4 }, cx + 1.6 * r, r + 0.1);
  quadros(duelo, 40);
  por(duelo, { nivel: 4 }, cx, 3 * r + 1);
  const ev = quadros(duelo, 240);
  const fus = ev.filter((e) => e.tipo === 'fusao');
  assert.deepEqual(fus.map((e) => e.grupo), [3]);
  assert.ok(S.jogadores[1].lixo > 0 || ev.some((e) => e.tipo === 'texto' && /☁/.test(e.texto)), 'sem ataque');
  // Croma: sem animar, funde no quadro em que encosta (como sempre)
  const croma = criarCroma({ semente: 2, salvo: {}, toque: true, lang: 'pt' });
  const pig = [0.6, 0, 0, 0];
  por(croma, { nivel: 3, pig }, -0.7, 1);
  por(croma, { nivel: 3, pig }, 0.7, 1);
  let f = 0;
  for (; f < 120; f++) { croma.passo(1 / 60); if (croma.eventos.splice(0).some((e) => e.tipo === 'fusao')) break; }
  assert.ok(f < 10, `o Croma fundiu no quadro ${f}`);
});

test('determinismo: a mesma fusao de grupo da o mesmo mundo', () => {
  const h = () => trio(5, 0.8, 0.3).modo.S.mundo.hash();
  assert.equal(h(), h());
});

test('fisica: pertoDe, aparar, rampaVel e atrair', () => {
  const m = criarMundo({ semente: 3 });
  m.definirParedes([{ ax: -6, ay: 0, bx: 6, by: 0, r: 0.2 }]);
  const a = m.criarSlime({ x: -1, y: 1, n: 40 });
  const b = m.criarSlime({ x: 1.2, y: 1, n: 40 });
  m.avancar(4);
  m.medir(1 / 60);
  // pertoDe igual a forca bruta
  for (const folga of [0, 0.2, 0.5, 1]) {
    let bruto = false;
    for (let i = 0; i < m.n; i++) for (let j = 0; j < m.n; j++) {
      if (m.sl[i] !== a.idx || m.sl[j] !== b.idx) continue;
      const lim = m.rad[i] + m.rad[j] + folga;
      if ((m.x[i] - m.x[j]) ** 2 + (m.y[i] - m.y[j]) ** 2 < lim * lim) bruto = true;
    }
    assert.equal(m.pertoDe(a, b, folga), bruto, `folga ${folga}`);
  }
  // aparar tira as mais longe do centroide
  const out = m.aparar(a, 5);
  assert.equal(out.length, 15);
  m.reconstruir();
  m.medir(1 / 60);
  assert.equal(a.n, 35);
  // rampaVel: a rigidez chega a 1 em 1/vel s
  m.amolecer(a, 0, 2);
  for (let f = 0; f < 29; f++) { m.avancar(4); m.medir(1 / 60); }
  assert.ok(a.rampa < 1);
  for (let f = 0; f < 3; f++) { m.avancar(4); m.medir(1 / 60); }
  assert.equal(a.rampa, 1);
  // atrair: nao passa de vmax e nao gera NaN
  for (let f = 0; f < 60; f++) { m.atrair(b, -5, 1, 400, 2, 1 / 60); m.avancar(4); m.medir(1 / 60); }
  for (let i = 0; i < m.n; i++) assert.ok(Number.isFinite(m.x[i]));
  assert.ok(b.vx > -2.6, `vx ${b.vx}`);
});

test('tremor: o pote treme e volta exato; a pilha nao perde particulas; o Alargar no meio termina certo', () => {
  const modo = criarModo({ semente: 7, salvo: {}, toque: true, pressao: false });
  const S = modo.S;
  const J = S.jogadores[0];
  J.pote.crescer(0);
  // enche o pote com o bot
  for (let f = 0; f < 60 * 50; f++) { if (f % 54 === 0) modo.bot(); modo.passo(1 / 60); }
  modo.eventos.splice(0);
  const n0 = S.mundo.n;
  const idx = [...J.pote.idxParedes, ...J.pote.idxGuias];
  J.pote.tremer(2);
  let fora = 0;
  let maxTx = 0;
  for (let f = 0; f < 150; f++) {
    modo.passo(1 / 60);
    fora += modo.eventos.splice(0).filter((e) => e.tipo === 'volta' || e.tipo === 'resgate').length;
    maxTx = Math.max(maxTx, Math.abs(S.mundo.paredes[idx[0]].tx));
    if (f === 60) assert.ok(soltos(modo).every((s) => !s.dormindo), 'alguem dormiu com o pote tremendo');
  }
  assert.ok(maxTx > 0.15, `tremor fraco: ${maxTx}`);
  assert.equal(fora, 0);
  assert.ok(S.mundo.n >= n0 - 400, 'particulas sumiram');
  for (const k of idx) { assert.equal(S.mundo.paredes[k].tx, 0); assert.equal(S.mundo.paredes[k].ty, 0); }
  // Alargar no meio do tremor: termina exatamente na largura alargada
  const outro = merge();
  const P = outro.S.jogadores[0].pote;
  const ref = merge();
  ref.S.jogadores[0].pote.alargar();
  quadros(ref, 60);
  P.tremer(1.5);
  quadros(outro, 20);
  P.alargar();
  quadros(outro, 120);
  for (const k of P.idxParedes) {
    const a = outro.S.mundo.paredes[k];
    const b = ref.S.mundo.paredes[k];
    assert.ok(Math.abs(a.ax - b.ax) < 1e-9 && Math.abs(a.bx - b.bx) < 1e-9 && a.tx === 0, `parede ${k}`);
  }
  // a peca presa fica longe da guia no deslocamento maximo
  const preso = P.preso;
  for (const k of P.idxGuias) {
    const g = outro.S.mundo.paredes[k];
    const y = Math.max(g.ay, g.by) + 0.08;
    assert.ok(preso.cy - preso.raio0 > y + 0.1, 'o preso encosta na guia');
  }
});

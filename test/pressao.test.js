// Pressao do sem fim (2.0.0): a escada das gotas, a agenda dos eventos, cada evento no pote, o
// "Ufa!" permanente e o save no meio de um evento. O desafio do dia e o ?pressao=0 ficam como antes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PESOS, pisoPara, ESCADA, AGENDA, CICLO, EVENTOS, criarAgenda, avancarAgenda, encerrarEvento,
  nivelGigante, alvoPedido, GIGANTE_MAX,
} from '../src/jogo/pressao.js';
import { criarModo } from '../src/jogo/modos/merge.js';
import { MAX_NIVEL } from '../src/jogo/niveis.js';

/** n quadros de 1/60 s; devolve os eventos. */
function quadros(modo, n) {
  const ev = [];
  for (let k = 0; k < n; k++) { modo.passo(1 / 60); ev.push(...modo.eventos.splice(0)); }
  return ev;
}

/** Slime parado no pote (fora da fila), como os testes do modos.test.js. */
function por(modo, spec, x, y) {
  const S = modo.S;
  const s = S.R.criar(S, S.jogadores[0], spec, x, y, false);
  s.dados.pote = 0;
  s.dados.solto = -10;
  return s;
}

test('escada: piso 1 ate o nivel 8, sobe 1 por nivel e para no teto (o 13 continua pedindo fusao)', () => {
  for (let k = 1; k <= 8; k++) assert.equal(pisoPara(k), 1, `nivel ${k}`);
  assert.equal(pisoPara(ESCADA.inicio), 2);
  assert.equal(pisoPara(10), 3);
  assert.equal(pisoPara(11), ESCADA.teto);
  assert.equal(pisoPara(12), ESCADA.teto);
  assert.equal(pisoPara(MAX_NIVEL), ESCADA.teto);
  for (let k = 1; k < MAX_NIVEL; k++) assert.ok(pisoPara(k + 1) >= pisoPara(k), 'a escada desceu');
  // o topo da janela nunca chega ao 13 (o 13 so nasce de fusao)
  assert.ok(ESCADA.teto + PESOS.length - 1 < MAX_NIVEL);
});

test('agenda: o 1o evento aos 90 s (aviso 2 s antes), um a cada ~60 s, na ordem do ciclo', () => {
  const A = criarAgenda();
  const dt = 1 / 60;
  const marcas = [];
  let t = 0;
  for (let f = 0; f < 60 * 600; f++) {
    t += dt;
    const m = avancarAgenda(A, t, dt);
    if (m) marcas.push([m, A.ev ? A.ev.id : '', +t.toFixed(2)]);
    if (m === 'fim') encerrarEvento(A, t);
  }
  const avisos = marcas.filter((x) => x[0] === 'aviso');
  const starts = marcas.filter((x) => x[0] === 'start');
  assert.ok(Math.abs(avisos[0][2] - (AGENDA.primeiro - AGENDA.aviso)) < 0.05, `1o aviso em ${avisos[0][2]}`);
  assert.ok(Math.abs(starts[0][2] - AGENDA.primeiro) < 0.05, `1o evento em ${starts[0][2]}`);
  assert.deepEqual(starts.map((x) => x[1]).slice(0, CICLO.length + 1), [...CICLO, CICLO[0]]);
  // de inicio a inicio: o intervalo (o evento mais longo, o pedido, acaba antes da folga)
  assert.ok(Math.max(...Object.values(EVENTOS).map((e) => e.dur)) + AGENDA.folga <= AGENDA.intervalo);
  for (let k = 1; k < starts.length; k++) {
    const d = starts[k][2] - starts[k - 1][2];
    assert.ok(Math.abs(d - AGENDA.intervalo) < 0.05, `intervalo ${d}`);
  }
  // em 10 minutos, ~9 eventos
  assert.ok(starts.length >= 8 && starts.length <= 10, `${starts.length} eventos em 10 min`);
  // a agenda salva continua de onde estava
  const B = criarAgenda(JSON.parse(JSON.stringify(A)));
  assert.deepEqual(B, A);
});

test('gigante e pedido: niveis dentro da janela; a chuva de gosma saiu da agenda', () => {
  assert.ok(!CICLO.includes('gosma') && !EVENTOS.gosma);
  for (let max = 6; max <= MAX_NIVEL; max++) {
    const p = pisoPara(max);
    const g = nivelGigante(p, max);
    assert.ok(g > p && g < max && g <= p + 5 && g <= GIGANTE_MAX, `gigante ${g} com piso ${p} e maior ${max}`);
  }
  // pedido: um acima do mais alto que ainda cai (falta uma gota igual em cima dele)
  assert.equal(alvoPedido([1, 3, 4, 7], 1, MAX_NIVEL), 5);
  assert.equal(alvoPedido([5, 9, 11], 5, MAX_NIVEL), 10);
  assert.equal(alvoPedido([4, 8, 12], 4, MAX_NIVEL), 9);
  assert.equal(alvoPedido([], 2, MAX_NIVEL), 4);
  assert.equal(alvoPedido([12], 5, MAX_NIVEL), 7);
});

test('sorteio: com a pressao a janela anda com o maior nivel; sem ela (?pressao=0) e no desafio, 1 a 5', () => {
  for (const [pressao, regra, k0] of [[true, null, ESCADA.teto], [false, null, 1], [true, { id: 'aquario', meta: 1 }, 1]]) {
    const modo = criarModo({ semente: 4, salvo: {}, toque: true, pressao, regra });
    const S = modo.S;
    S.jogadores[0].maxNivel = 12;
    const vistos = new Set();
    for (let k = 0; k < 400; k++) {
      const f = S.R.sortear(S, S.jogadores[0]);
      if (!f.prisma) vistos.add(f.nivel);
    }
    assert.deepEqual([...vistos].sort((a, b) => a - b), [k0, k0 + 1, k0 + 2, k0 + 3, k0 + 4], `pressao ${pressao}, regra ${regra && regra.id}`);
  }
});

test('coringa com a pressao: funde abaixo do maior nivel, mas nao faz o proximo recorde', () => {
  for (const pressao of [true, false]) {
    const modo = criarModo({ semente: 3, salvo: {}, toque: true, pressao });
    const S = modo.S;
    S.jogadores[0].maxNivel = 9;
    const p = por(modo, { nivel: 2, prisma: true }, 0, 9);
    const nove = por(modo, { nivel: 9 }, -2, 2);
    const oito = por(modo, { nivel: 8 }, 3, 2);
    assert.equal(S.R.fusao(S, p, oito), 9);
    assert.equal(S.R.fusao(S, p, nove), pressao ? 0 : 10, `pressao ${pressao}`);
  }
});

test('evolucao: a escada sobe e os slimes abaixo do piso viram o piso (sem orfaos), fila e preso tambem', () => {
  const modo = criarModo({ semente: 3, salvo: {}, toque: true });
  const S = modo.S;
  const J = S.jogadores[0];
  J.pote.crescer(0);
  J.maxNivel = 8;
  const pequenos = [por(modo, { nivel: 1 }, -3, 1), por(modo, { nivel: 1 }, 3, 1), por(modo, { nivel: 2 }, 0, 6)];
  // dois do nivel 8 fundem no 9: o piso vira 2
  por(modo, { nivel: 8 }, -1.9, 2.5);
  por(modo, { nivel: 8 }, 1.9, 2.5);
  J.fila = [J.fila[0], { nivel: 1 }];
  const ev = quadros(modo, 240);
  assert.ok(J.maxNivel >= 9, 'os dois do 8 nao fundiram');
  const esc = ev.find((e) => e.tipo === 'escada');
  assert.ok(esc && esc.piso === 2, 'a escada nao subiu');
  assert.ok(ev.some((e) => e.tipo === 'texto' && e.texto === 'evolucao'));
  for (const s of pequenos) assert.ok(!s.ativo || s.nivel >= 2, 'ficou um nivel 1 no pote');
  assert.ok(S.mundo.vivos().every((s) => s.dados.prisma || s.nivel >= 2), 'sobrou slime abaixo do piso');
  assert.ok(J.fila.every((f) => f.prisma || f.nivel >= 2), 'a fila ficou abaixo do piso');
  assert.ok(!J.pote.preso || J.pote.preso.dados.prisma || J.pote.preso.nivel >= 2, 'o preso ficou abaixo do piso');
});

test('sem derrota no sem fim: o "Ufa!" vale depois dos 3 min e zera o combo; o desafio e o ?pressao=0 ainda acabam', () => {
  for (const [o, acaba] of [[{}, false], [{ pressao: false }, true], [{ regra: { id: 'xicara', meta: 1 } }, true]]) {
    const modo = criarModo({ semente: 3, salvo: {}, toque: true, ...o });
    const J = modo.S.jogadores[0];
    quadros(modo, 10);
    modo.S.tempo = 600;
    J.pote.combo = 3;
    J.pote.comboT = 1;
    J.pote.perigoT = 10;
    const ev = quadros(modo, 2);
    assert.equal(ev.some((e) => e.tipo === 'fim'), acaba, JSON.stringify(o));
    assert.equal(ev.some((e) => e.tipo === 'resgate'), !acaba, JSON.stringify(o));
    if (!acaba) assert.equal(J.pote.combo, 0, 'o combo nao zerou no resgate');
  }
});

test('eventos no pote: coringas, gigante, terremoto, calor e gelo fazem o que dizem', () => {
  const comeca = (id, prep) => {
    const modo = criarModo({ semente: 6, salvo: {}, toque: true });
    if (prep) prep(modo);
    modo.forcarEvento(id);
    const ev = quadros(modo, Math.round((AGENDA.aviso + 0.1) * 60));
    assert.ok(ev.some((e) => e.tipo === 'texto' && e.texto === 'ev.' + id), `${id}: sem o aviso`);
    assert.ok(ev.some((e) => e.tipo === 'evento' && e.id === id && e.acao === 'start'), `${id}: nao comecou`);
    return { modo, S: modo.S, J: modo.S.jogadores[0], ev };
  };
  // coringas: o proximo ja e prisma e mais 2 saem no sorteio
  {
    const { S, J } = comeca('coringas');
    assert.ok(J.fila[1].prisma);
    const f = [S.R.sortear(S, J), S.R.sortear(S, J), S.R.sortear(S, J)];
    assert.deepEqual(f.map((x) => !!x.prisma).slice(0, 2), [true, true]);
  }
  // gigante: o proximo e grande (acima da janela) e o evento acaba quando ele cai
  {
    const { S, J } = comeca('gigante', (m) => { m.S.jogadores[0].maxNivel = 9; });
    assert.ok(J.fila[1].gigante && J.fila[1].nivel === nivelGigante(pisoPara(9), 9));
    void S;
  }
  // terremoto: o pote inteiro treme (as paredes andam e voltam ao lugar); calor e gelo: o pote todo muda de estado
  {
    const { modo, S, J } = comeca('terremoto');
    assert.ok(J.pote.tremorDur > 0, 'o pote nao tremeu');
    const base = J.pote.idxParedes.map((k) => ({ ...S.mundo.paredes[k] }));
    quadros(modo, 10);
    assert.ok(J.pote.idxParedes.some((k) => S.mundo.paredes[k].tx !== 0), 'as paredes nao andaram');
    assert.ok(modo.visual().tremor, 'sem o tremor no visual');
    quadros(modo, Math.round(EVENTOS.terremoto.dur * 60) + 10);
    J.pote.idxParedes.forEach((k, i) => {
      const p = S.mundo.paredes[k];
      assert.equal(p.tx, 0);
      assert.equal(p.ty, 0);
      assert.deepEqual([p.ax, p.ay, p.bx, p.by], [base[i].ax, base[i].ay, base[i].bx, base[i].by]);
    });
    assert.equal(modo.visual().tremor, null);
  }
  for (const id of ['calor', 'gelo']) {
    const { S } = comeca(id, (m) => { por(m, { nivel: 3 }, 0, 2); por(m, { nivel: 4 }, 2, 5); });
    const no = S.mundo.vivos().filter((s) => !s.preso);
    assert.ok(no.length >= 2 && no.every((s) => s.estado === id), `${id}: o pote nao mudou`);
  }
});

test('pedido: o alvo aparece na pilula; cumprido da premio e gotas (ok), senao falhou; o intervalo so do 3o evento', () => {
  const modo = criarModo({ semente: 6, salvo: {}, toque: true });
  const S = modo.S;
  const J = S.jogadores[0];
  J.pote.crescer(0);
  J.maxNivel = 7;
  por(modo, { nivel: 4 }, -3, 1);
  modo.forcarEvento('pedido');
  quadros(modo, Math.round((AGENDA.aviso + 0.1) * 60));
  const ev = S.extra.agenda.ev;
  assert.equal(ev.id, 'pedido');
  assert.equal(ev.alvo, 5);
  assert.deepEqual(modo.hud().objetivo.evento.alvo, 5);
  assert.equal(modo.hud().objetivo.nivel, 5, 'o nivel pedido nao pulsa na barra');
  // dois do 4 fundem no 5: pedido cumprido
  J.premio = '';
  por(modo, { nivel: 4 }, -1.3, 4);
  por(modo, { nivel: 4 }, 1.3, 4);
  const evs = quadros(modo, 240);
  assert.ok(evs.some((e) => e.tipo === 'evento' && e.id === 'pedido' && e.acao === 'ok'), 'o pedido nao fechou');
  assert.ok(J.premio, 'sem o premio fisico');
  assert.ok(!evs.some((e) => e.tipo === 'intervalo'), 'intervalo antes do 3o evento');
  // um pedido que ninguem cumpre falha no fim do tempo; do 3o evento em diante vem a pausa natural
  const outro = criarModo({ semente: 6, salvo: {}, toque: true });
  outro.forcarEvento('pedido');
  outro.S.extra.agenda.n = AGENDA.anuncioDesde - 1;
  outro.S.jogadores[0].maxNivel = 13;
  const ev2 = quadros(outro, Math.round((AGENDA.aviso + EVENTOS.pedido.dur + 0.2) * 60));
  if (!ev2.some((e) => e.acao === 'ok')) assert.ok(ev2.some((e) => e.tipo === 'evento' && e.acao === 'falhou'), 'o pedido nao falhou');
  assert.ok(ev2.some((e) => e.tipo === 'intervalo' && e.origem === 'evento'), 'sem a pausa natural do 3o evento');
});

test('save no meio de um evento: a agenda e o pedido voltam; a chuva de gosma de um save antigo some; a partida da 1.2.0 ganha agenda e evolui', () => {
  const modo = criarModo({ semente: 6, salvo: {}, toque: true });
  modo.S.jogadores[0].maxNivel = 7;
  por(modo, { nivel: 4 }, -3, 1);
  modo.forcarEvento('pedido');
  quadros(modo, 240);
  const salvo = JSON.parse(JSON.stringify(modo.salvar()));
  const volta = criarModo({ semente: 6, salvo, toque: true });
  const a = modo.S.extra.agenda;
  const b = volta.S.extra.agenda;
  assert.equal(b.ev.id, 'pedido');
  assert.equal(b.ev.alvo, a.ev.alvo);
  assert.equal(b.ev.fase, 'ativo');
  assert.equal(b.n, a.n);
  // save de antes (chuva de gosma em curso, uma gosma cinza no pote): o evento acaba e a gosma volta slime
  const sg = JSON.parse(JSON.stringify(modo.salvar()));
  sg.partida.agenda.ev = { id: 'gosma', fase: 'ativo', t: 1, dur: 4, n: 2, inicio: 150 };
  sg.partida.slimes.push([3, 2, 6, 0, 1]);
  const gv = criarModo({ semente: 6, salvo: sg, toque: true });
  assert.equal(gv.S.extra.agenda.ev, null);
  assert.ok(gv.S.extra.agenda.prox > gv.S.tempo);
  assert.ok(gv.S.mundo.vivos().every((s) => !s.dados.cinza && s.dados.hex !== '#8a8a90'));
  quadros(gv, 30);
  // save da 1.2.0 (sem agenda) no nivel 10 com um nivel 1 no pote: agenda nova 30 s adiante e evolucao
  const velho = { pontos: 9000, tempo: 400, fila: [{ nivel: 1 }, { nivel: 2 }], poderes: { trocar: 1, chacoalhar: 1, alargar: 1, mira: 1 }, premio: '', maxNivel: 10, alargado: false, estreito: false, slimes: [[1, -2, 1, 0], [6, 1, 2, 0]] };
  const v = criarModo({ semente: 6, salvo: { partida: velho }, toque: true });
  const ev = quadros(v, 2);
  assert.ok(ev.some((e) => e.tipo === 'escada' && e.piso === pisoPara(10)), 'o save antigo nao evoluiu');
  assert.ok(v.S.mundo.vivos().every((s) => s.nivel >= pisoPara(10)));
  assert.ok(Math.abs(v.S.extra.agenda.prox - 430) < 0.1, `agenda do save antigo em ${v.S.extra.agenda.prox}`);
});

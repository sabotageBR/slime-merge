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

/** Distancia de um ponto a uma capsula (so o eixo). */
function distPonto(px, py, p) {
  const ex = p.bx - p.ax;
  const ey = p.by - p.ay;
  const l2 = ex * ex + ey * ey;
  let t = l2 ? ((px - p.ax) * ex + (py - p.ay) * ey) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - p.ax - t * ex, py - p.ay - t * ey);
}

/** Distancia (amostrada) entre os eixos de duas capsulas. */
function distCapsulas(a, b) {
  let m = Infinity;
  for (let k = 0; k <= 20; k++) {
    const t = k / 20;
    m = Math.min(m, distPonto(a.ax + t * (a.bx - a.ax), a.ay + t * (a.by - a.ay), b), distPonto(b.ax + t * (b.bx - b.ax), b.ay + t * (b.by - b.ay), a));
  }
  return m;
}

/** Leva a mira ate x por alguns quadros (a peca presa anda no passo) e solta. */
function soltarEm(modo, x, quem = 0) {
  modo.apontar(x, 13, 'baixo', quem);
  for (let k = 0; k < 10; k++) { modo.passo(1 / 60); modo.apontar(x, 13, 'mover', quem); }
  const s = modo.S.jogadores[quem].pote.preso;
  modo.apontar(x, 13, 'cima', quem);
  return s;
}

test('a mira vai ate o topo das paredes, tambem com o pote alargado', async () => {
  const { criarModo } = await import(MODOS.merge);
  const { CESTOS } = await import('../src/jogo/cestos.js');
  for (const C of CESTOS) {
    const pts = C.linhas[0];
    const [e, d] = [pts[0], pts[pts.length - 1]];
    assert.ok(e[0] < 0 && d[0] > 0, `${C.id}: a polilinha nao vai do topo esquerdo ao direito`);
    // a largura de sempre (o pote estreito do comeco tem teste proprio)
    const modo = criarModo({ semente: 3, salvo: {}, toque: true, cesto: C.id, inicio: { largura: 1 } });
    const p = modo.S.jogadores[0].pote;
    modo.apontar(-99, 13, 'mover');
    assert.ok(Math.abs(p.mira - e[0]) < 1e-9, `${C.id}: mira ${p.mira} longe da borda ${e[0]}`);
    modo.apontar(99, 13, 'mover');
    assert.ok(Math.abs(p.mira - d[0]) < 1e-9, `${C.id}: mira ${p.mira} longe da borda ${d[0]}`);
    modo.poder('alargar');
    for (let k = 0; k < 40; k++) modo.passo(1 / 60);
    modo.apontar(99, 13, 'mover');
    assert.ok(Math.abs(p.mira - d[0] * 1.14) < 1e-6, `${C.id}: com o pote alargado a mira nao acompanhou`);
  }
});

test('o pote do sem fim nasce estreito, cresce no nivel 6 (ou aos 150 s) e o save guarda isso', async () => {
  const { criarModo, INICIO } = await import(MODOS.merge);
  const { CESTOS } = await import('../src/jogo/cestos.js');
  const borda = (modo) => {
    const ps = modo.mundo.paredes;
    const P = modo.S.jogadores[0].pote;
    return [ps[P.idxParedes[0]].ax, ps[P.idxParedes[P.idxParedes.length - 1]].bx];
  };
  for (const C of CESTOS) {
    const pts = C.linhas[0];
    const [e, d] = [pts[0][0], pts[pts.length - 1][0]];
    const modo = criarModo({ semente: 3, salvo: {}, toque: true, cesto: C.id });
    const S = modo.S;
    const J = S.jogadores[0];
    assert.ok(J.pote.estreito, `${C.id}: nao nasceu estreito`);
    const [e0, d0] = borda(modo);
    assert.ok(Math.abs(e0 - e * INICIO.largura) < 1e-9 && Math.abs(d0 - d * INICIO.largura) < 1e-9, `${C.id}: largura do comeco errada`);
    modo.apontar(99, 13, 'mover');
    assert.ok(Math.abs(J.pote.mira - d * INICIO.largura) < 1e-9, `${C.id}: a mira passa da borda estreita`);
    // a linha de perigo encolhe junto (a regra de sempre: a parte mais larga do cesto menos 0,3)
    const maisLarga = Math.max(...C.linhas.flat().map((q) => Math.abs(q[0])));
    assert.ok(Math.abs(J.pote.meiaLinha - (maisLarga * INICIO.largura - 0.3)) < 1e-9, `${C.id}: a linha de perigo nao encolheu`);
    // a meta da vez e o nivel do crescimento
    assert.deepEqual(modo.hud().objetivo, { nivel: INICIO.nivelCresce, cresce: true, novo: true });
    // chegar ao nivel 6: o pote cresce (com animacao) e avisa
    const a = S.R.criar(S, J, { nivel: 5 }, -1.3, 2, false);
    const b = S.R.criar(S, J, { nivel: 5 }, 1.3, 2, false);
    for (const s of [a, b]) { s.dados.pote = 0; s.dados.solto = -10; }
    const ev = [];
    for (let k = 0; k < 240; k++) { modo.passo(1 / 60); ev.push(...modo.eventos.splice(0)); }
    assert.ok(J.maxNivel >= 6, `${C.id}: os dois do nivel 5 nao fundiram`);
    assert.ok(!J.pote.estreito && ev.some((x) => x.tipo === 'cresceu' && x.motivo === 'nivel'), `${C.id}: nao cresceu no nivel 6`);
    const [e1, d1] = borda(modo);
    assert.ok(Math.abs(e1 - e) < 1e-6 && Math.abs(d1 - d) < 1e-6, `${C.id}: nao voltou a largura de sempre`);
    assert.ok(!modo.hud().objetivo.cresce, `${C.id}: a meta continua sendo crescer`);
    assert.ok(Math.abs(J.pote.meiaLinha - (maisLarga - 0.3)) < 1e-9, `${C.id}: a linha de perigo nao voltou`);
    // o save guarda o pote crescido
    const salvo = modo.salvar();
    assert.equal(salvo.partida.estreito, false);
  }
  // quem nao chega ao nivel 6 ganha o pote inteiro antes do fim do resgate
  const lento = criarModo({ semente: 5, salvo: {}, toque: true });
  const ev = [];
  for (let k = 0; k < (INICIO.tempoCresce + 1) * 60; k++) { lento.passo(1 / 60); ev.push(...lento.eventos.splice(0)); }
  assert.ok(!lento.S.jogadores[0].pote.estreito && ev.some((x) => x.tipo === 'cresceu' && x.motivo === 'tempo'), 'nao cresceu pelo tempo');
  // Alargar antes de crescer: depois do crescimento o pote fica alargado sobre a largura toda
  const al = criarModo({ semente: 3, salvo: {}, toque: true, inicio: { tempoCresce: 1 } });
  al.poder('alargar');
  for (let k = 0; k < 120; k++) al.passo(1 / 60);
  const dB = CESTOS.find((c) => c.id === 'becher').linhas[0].at(-1)[0];
  assert.ok(Math.abs(borda(al)[1] - dB * 1.14) < 1e-6, 'alargar + crescer nao deu a largura alargada');
  // partida salva estreita volta estreita; a de antes do pote estreito (sem a marca) volta inteira
  const est = criarModo({ semente: 3, salvo: {}, toque: true });
  const volta = criarModo({ semente: 3, salvo: { partida: est.salvar().partida }, toque: true });
  assert.ok(volta.S.jogadores[0].pote.estreito, 'a partida estreita voltou crescida');
  const antiga = { ...est.salvar().partida };
  delete antiga.estreito;
  assert.ok(!criarModo({ semente: 3, salvo: { partida: antiga }, toque: true }).S.jogadores[0].pote.estreito, 'save antigo voltou estreito');
  // desafio e Duelo: largura de sempre
  assert.ok(!criarModo({ semente: 3, salvo: {}, toque: true, regra: { id: 'pequenos', meta: 1 } }).S.jogadores[0].pote.estreito);
  const { criarModo: duelo } = await import(MODOS.duelo);
  assert.ok(duelo({ semente: 3, salvo: {}, toque: true }).S.jogadores.every((K) => !K.pote.estreito));
});

test('telemetria de nivel: start na partida nova (nao na restaurada) e complete em cada nivel novo', async () => {
  const { criarModo } = await import(MODOS.merge);
  const modo = criarModo({ semente: 3, salvo: {}, toque: true });
  assert.deepEqual(modo.eventos.filter((e) => e.tipo === 'nivel'), [{ tipo: 'nivel', n: 1, acao: 'start' }]);
  const volta = criarModo({ semente: 3, salvo: { partida: modo.salvar().partida }, toque: true });
  assert.ok(!volta.eventos.some((e) => e.tipo === 'nivel'), 'a partida restaurada abriu o nivel 1 de novo');
  const ev = [];
  let t = 0;
  for (let f = 0; f < 120 * 60; f++) {
    if ((t += 1 / 60) >= 0.6) { t = 0; modo.bot(); }
    modo.passo(1 / 60);
    ev.push(...modo.eventos.splice(0));
  }
  const completos = ev.filter((e) => e.tipo === 'nivel' && e.acao === 'complete').map((e) => e.n);
  assert.ok(completos.length >= 4, `poucos niveis completos: ${completos}`);
  assert.deepEqual(completos, [...completos].sort((a, b) => a - b), 'complete fora de ordem');
  assert.equal(new Set(completos).size, completos.length, 'complete repetido');
  assert.equal(completos.at(-1), modo.S.jogadores[0].maxNivel);
  // o registro do reforco diz qual foi
  modo.poder('chacoalhar');
  assert.ok(modo.eventos.some((e) => e.tipo === 'registro' && e.chave === 'poder' && e.id === 'chacoalhar'));
});

test('telemetria do resgate: o "Ufa!" dos 3 primeiros minutos emite resgate; depois (sem a pressao da 2.0.0) o transbordo acaba a partida', async () => {
  const { criarModo } = await import(MODOS.merge);
  // no sem fim de hoje o "Ufa!" vale sempre (test/pressao.test.js); a regra dos 3 minutos e a do ?pressao=0
  const modo = criarModo({ semente: 3, salvo: {}, toque: true, pressao: false });
  const J = modo.S.jogadores[0];
  const quadros = (n) => { const ev = []; for (let k = 0; k < n; k++) { modo.passo(1 / 60); ev.push(...modo.eventos.splice(0)); } return ev; };
  quadros(10);
  // pote no limite da graca: transbordaria neste quadro
  J.pote.perigoT = 10;
  let ev = quadros(2);
  assert.equal(ev.filter((e) => e.tipo === 'resgate').length, 1);
  assert.ok(ev.some((e) => e.tipo === 'texto' && e.texto === 'ufa'));
  assert.ok(!ev.some((e) => e.tipo === 'fim'));
  modo.S.tempo = 200;
  J.pote.perigoT = 10;
  ev = quadros(2);
  assert.ok(ev.some((e) => e.tipo === 'fim'));
  assert.ok(!ev.some((e) => e.tipo === 'resgate'), 'resgate depois dos 3 minutos');
});

test('a mao do onboarding fica ate a primeira gota (mesmo parado) e some depois', async () => {
  const { criarModo } = await import(MODOS.merge);
  const modo = criarModo({ semente: 3, salvo: {}, toque: false });
  for (let k = 0; k < 40 * 60; k++) modo.passo(1 / 60);
  const m = modo.visual().mao;
  assert.ok(m && m.tecla, 'a mao sumiu sem ninguem tocar (ou sem as teclas no desktop)');
  soltarEm(modo, 0);
  soltarEm(modo, 1);
  assert.equal(modo.visual().mao, null, 'a mao ficou depois de duas gotas');
  // quem ja fundiu antes (visto > 1) nao ve a mao
  assert.equal(criarModo({ semente: 3, salvo: { visto: 4 }, toque: true }).visual().mao, null);
});

test('o slime solto em cima da borda escorrega de volta para dentro (8 cestos)', async () => {
  const { criarModo } = await import(MODOS.merge);
  const { CESTOS } = await import('../src/jogo/cestos.js');
  const casos = [];
  for (const C of CESTOS) for (const lado of [-1, 1]) casos.push([C, lado, 5, false], [C, lado, 1, true]);
  casos.push([CESTOS[3], 1, 3, false, true]);
  for (const [C, lado, nv, alargar, chacoalhar] of casos) {
    const modo = criarModo({ semente: 3, salvo: {}, toque: true, cesto: C.id });
    const S = modo.S;
    const J = S.jogadores[0];
    S.mundo.remover(J.pote.preso);
    J.pote.preso = null;
    const preso = S.R.criar(S, J, { nivel: nv }, J.pote.mira, J.pote.ySoltar, true);
    preso.dados.pote = 0;
    J.pote.prender(preso);
    if (alargar) { modo.poder('alargar'); for (let k = 0; k < 40; k++) modo.passo(1 / 60); }
    const s = soltarEm(modo, lado * 99);
    if (chacoalhar) modo.poder('chacoalhar');
    for (let k = 0; k < 300; k++) modo.passo(1 / 60);
    const ps = S.mundo.paredes;
    const e = ps[J.pote.idxParedes[0]].ax;
    const d = ps[J.pote.idxParedes[J.pote.idxParedes.length - 1]].bx;
    const rot = `${C.id} lado ${lado} nivel ${nv}${alargar ? ' alargado' : ''}${chacoalhar ? ' chacoalhado' : ''}`;
    assert.ok(s.ativo, `${rot}: o slime sumiu`);
    assert.ok(s.cx > e && s.cx < d && s.topo < C.linha + 0.5, `${rot}: ficou fora (${s.cx.toFixed(2)}, ${s.cy.toFixed(2)})`);
    assert.ok(!modo.eventos.some((ev) => ev.tipo === 'fora'), `${rot}: escapou do pote`);
  }
});

test('a peca presa nunca encosta na guia invisivel da borda', async () => {
  const { criarModo } = await import(MODOS.merge);
  const { CESTOS } = await import('../src/jogo/cestos.js');
  for (const C of CESTOS) {
    const modo = criarModo({ semente: 3, salvo: {}, toque: true, cesto: C.id });
    const S = modo.S;
    const J = S.jogadores[0];
    S.mundo.remover(J.pote.preso);
    J.pote.preso = null;
    const preso = S.R.criar(S, J, { nivel: 5 }, J.pote.mira, J.pote.ySoltar, true);
    J.pote.prender(preso);
    for (const x of [-99, 99]) {
      J.pote.apontar(x);
      for (const i of J.pote.idxGuias) {
        const g = S.mundo.paredes[i];
        assert.ok(g.oculta, `${C.id}: guia desenhavel`);
        const dist = distPonto(J.pote.mira, J.pote.ySoltar, g) - g.r;
        assert.ok(dist > preso.raio0 + 0.05, `${C.id}: a peca presa encosta na guia (${dist.toFixed(2)} <= ${preso.raio0.toFixed(2)})`);
      }
    }
  }
});

test('Duelo: os potes nao se encostam (nem alargados) e cada um fica com o seu slime', async () => {
  const { criarModo } = await import(MODOS.duelo);
  const { CESTOS } = await import('../src/jogo/cestos.js');
  for (const C of CESTOS) {
    const modo = criarModo({ semente: 5, salvo: {}, toque: true, doisJogadores: true, cesto: C.id });
    const [J0, J1] = modo.S.jogadores;
    // direto no pote: no 2 jogadores o reforco nao existe, mas contra a CPU o pote 1 alarga
    J0.pote.alargar();
    for (let k = 0; k < 40; k++) modo.passo(1 / 60);
    const ps = modo.S.mundo.paredes;
    const a = [...J0.pote.idxParedes, ...J0.pote.idxGuias].map((i) => ps[i]);
    const b = [...J1.pote.idxParedes, ...J1.pote.idxGuias].map((i) => ps[i]);
    for (const p of a) for (const q of b) assert.ok(distCapsulas(p, q) > p.r + q.r + 0.04, `${C.id}: os potes se encostam`);
    // cada jogador solta na borda de dentro (perto do outro pote)
    const s0 = soltarEm(modo, 99, 0);
    const s1 = soltarEm(modo, -99, 1);
    for (let k = 0; k < 300; k++) modo.passo(1 / 60);
    assert.ok(s0.cx < 0 && s1.cx > 0, `${C.id}: um slime foi parar no pote do outro`);
    assert.ok(!modo.eventos.some((ev) => ev.tipo === 'fora'), `${C.id}: escapou do pote`);
  }
});

test('Duelo: contra a CPU ha reforcos; no 2 jogadores nao (botoes escondidos, clique e teclas 1-5 nao fazem nada)', async () => {
  const { criarModo } = await import(MODOS.duelo);
  const cpu = criarModo({ semente: 5, salvo: {}, toque: true, liga: 0, doisJogadores: false });
  assert.ok(cpu.hud().poderes.every((p) => !p.oculto), 'contra a CPU os botoes aparecem');
  cpu.poder('chacoalhar');
  assert.equal(cpu.S.jogadores[0].poderes.chacoalhar, 0, 'contra a CPU o reforco funciona');
  const dois = criarModo({ semente: 5, salvo: {}, toque: false, doisJogadores: true });
  assert.ok(dois.hud().poderes.every((p) => p.oculto), 'no 2 jogadores os botoes ficam escondidos');
  dois.poder('chacoalhar');
  for (const k of ['Digit1', 'Digit2', 'Digit3', 'Digit4']) dois.tecla(k, true);
  const J0 = dois.S.jogadores[0];
  assert.deepEqual(J0.poderes, { trocar: 1, chacoalhar: 1, alargar: 1, mira: 1 }, 'no 2 jogadores nenhum reforco e gasto');
  assert.equal(J0.alvoPoder, '');
  assert.ok(!dois.eventos.some((ev) => ev.tipo === 'pedirVideo'), 'nem pede video');
});

test('13 niveis: o 13 tem o tamanho que o 12 tinha, o 1 nao muda e os do meio encolhem pouco', async () => {
  const { NIVEIS, diametroNivel } = await import('../src/jogo/niveis.js');
  assert.equal(NIVEIS.length, 13);
  assert.equal(diametroNivel(1), 1.55);
  assert.ok(Math.abs(diametroNivel(13) - 1.55 * 1.155 ** 11) < 0.01, `nivel 13 com ${diametroNivel(13)}`);
  for (let k = 2; k <= 12; k++) {
    const antes = 1.55 * 1.155 ** (k - 1);
    const encolheu = 1 - diametroNivel(k) / antes;
    assert.ok(encolheu > 0.005 && encolheu < 0.13, `nivel ${k} encolheu ${(encolheu * 100).toFixed(1)}%`);
  }
});

test('dois do ultimo nivel estouram sem registrar um nivel que nao existe', async () => {
  const { criarModo } = await import(MODOS.merge);
  const { MAX_NIVEL } = await import('../src/jogo/niveis.js');
  const modo = criarModo({ semente: 3, salvo: {}, toque: true });
  const S = modo.S;
  const J = S.jogadores[0];
  for (const x of [-1.6, 1.6]) {
    const s = S.R.criar(S, J, { nivel: MAX_NIVEL }, x, 4.2, false);
    s.dados.pote = 0;
    s.dados.solto = -10;
  }
  const eventos = [];
  for (let k = 0; k < 600 && !eventos.some((e) => e.tipo === 'estouro'); k++) {
    modo.passo(1 / 60);
    eventos.push(...modo.eventos.splice(0));
  }
  assert.ok(eventos.some((e) => e.tipo === 'texto' && e.texto === 'perfeito'), 'os dois do topo nao estouraram');
  assert.ok(!eventos.some((e) => e.tipo === 'registro' && e.chave === 'nivel' && e.valor > MAX_NIVEL), 'registrou um nivel que nao existe');
});

test('a tesoura divide em dois do nivel de baixo, com a cor certa, que nao se juntam de novo', async () => {
  const { criarModo } = await import(MODOS.merge);
  const { nivel } = await import('../src/jogo/niveis.js');
  const { pigmentoMedio } = await import('../src/cor/difusao.js');
  const modo = criarModo({ semente: 3, salvo: {}, toque: true });
  const S = modo.S;
  const J = S.jogadores[0];
  const s = S.R.criar(S, J, { nivel: 6 }, 0, 3, false);
  s.dados.pote = 0;
  J.premio = 'tesoura';
  modo.poder('tesoura');
  modo.apontar(s.cx, s.cy, 'baixo');
  // a difusao do passo so mexe entre particulas do mesmo slime (cor pura continua pura)
  modo.passo(1 / 60);
  const pedacos = S.mundo.vivos().filter((p) => !p.preso && p.nivel === 5);
  assert.equal(pedacos.length, 2, 'a tesoura nao dividiu');
  for (const p of pedacos) {
    const pig = pigmentoMedio(S.mundo, p);
    nivel(5).pig.forEach((v, i) => assert.ok(Math.abs(pig[i] - v) < 1e-6, `pedaco com o pigmento errado: ${pig}`));
  }
  // as metades encostadas nao voltam a ser uma so (antes fundiam no quadro seguinte e davam pontos)
  for (let k = 0; k < 120; k++) modo.passo(1 / 60);
  assert.equal(S.mundo.vivos().filter((p) => !p.preso && p.nivel === 5).length, 2, 'as metades se juntaram de novo');
  assert.equal(J.pontos, 0);
});

test('niveis altos tem textura e nao viram lama (o arco-iris nao desbota)', async () => {
  const { NIVEIS } = await import('../src/jogo/niveis.js');
  for (let k = 7; k <= 13; k++) assert.ok(NIVEIS[k - 1].textura > 0, `nivel ${k} sem textura`);
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

/** Merge com dois slimes iguais encostados no fundo; devolve o modo e os dois. */
async function doisIguais(nivel = 3) {
  const { criarModo } = await import(MODOS.merge);
  const modo = criarModo({ semente: 3, salvo: {}, toque: true });
  const S = modo.S;
  const J = S.jogadores[0];
  const par = [-1.1, 1.1].map((x) => {
    const s = S.R.criar(S, J, { nivel }, x, 1.2, false);
    s.dados.pote = 0;
    s.dados.solto = -10;
    return s;
  });
  return { modo, S, J, par };
}

test('mira: o alvo chora, o missil voa e explode em 0,75 s (e o alvo nao funde no meio)', async () => {
  const { MISSIL } = await import('../src/jogo/soltar.js');
  const { modo, S, J, par } = await doisIguais();
  const [a] = par;
  modo.poder('mira');
  modo.apontar(a.cx, a.cy, 'baixo');
  assert.equal(J.poderes.mira, 0, 'a mira nao foi gasta na escolha');
  assert.equal(a.dados.expr, 'choro');
  assert.ok(modo.visual().missil, 'o render nao recebe o missil');
  const eventos = [];
  let tImpacto = -1;
  for (let k = 1; k <= 70; k++) {
    modo.passo(1 / 60);
    for (const e of modo.eventos.splice(0)) { eventos.push(e); if (e.tipo === 'missil') tImpacto = k / 60; }
    if (tImpacto < 0) {
      assert.ok(a.ativo, 'o alvo sumiu antes do impacto');
      assert.equal(a.dados.expr, 'choro', 'o choro foi trocado por outra expressao');
    }
  }
  assert.ok(Math.abs(tImpacto - MISSIL.impacto) < 0.02, `impacto em ${tImpacto}`);
  assert.ok(!a.ativo, 'o alvo nao explodiu');
  assert.ok(!eventos.some((e) => e.tipo === 'fusao'), 'o alvo fundiu com o igual encostado');
  const ev = eventos.find((e) => e.tipo === 'missil');
  assert.equal(ev.cor, par[1].dados.hex);
  assert.ok(eventos.some((e) => e.tipo === 'som' && e.nome === 'missil'));
  assert.equal(modo.visual().missil, null);
  // o outro, sem o par, continua la
  assert.ok(par[1].ativo);
  assert.ok(S.mundo.vivos().length >= 2);
});

test('mira: um missil por vez, o alvo nao e escolhido duas vezes e o slot reaproveitado nao explode', async () => {
  const { modo, S, J, par } = await doisIguais(2);
  J.poderes.mira = 3;
  modo.poder('mira');
  modo.apontar(par[0].cx, par[0].cy, 'baixo');
  modo.poder('mira');
  assert.equal(J.alvoPoder, '', 'armou outra mira com o missil no ar');
  // o alvo some (Ufa/reviver) e o slot vira outro slime: o missil explode no vazio
  const idx = par[0].idx;
  S.mundo.remover(par[0]);
  const novo = S.R.criar(S, J, { nivel: 1 }, -3, 2, false);
  novo.dados.pote = 0;
  assert.equal(novo.idx, idx, 'o teste queria reaproveitar o slot');
  for (let k = 0; k < 60; k++) modo.passo(1 / 60);
  assert.ok(novo.ativo, 'o missil explodiu o slime novo do slot reaproveitado');
  assert.equal(J.missil, null);
});

test('mira: o fim da partida espera o missil explodir', async () => {
  const { modo, J, par } = await doisIguais();
  modo.poder('mira');
  modo.apontar(par[0].cx, par[0].cy, 'baixo');
  // pote no limite da graca: transbordaria neste quadro
  J.pote.perigoT = 10;
  const eventos = [];
  for (let k = 0; k < 30; k++) { modo.passo(1 / 60); eventos.push(...modo.eventos.splice(0)); }
  assert.ok(!eventos.some((e) => e.tipo === 'fim' || e.tipo === 'texto' && e.texto === 'ufa'), 'acabou com o missil no ar');
});

test('mira: o mesmo jogo da o mesmo resultado (deterministico)', async () => {
  const rodada = async () => {
    const { modo, S, par } = await doisIguais();
    modo.poder('mira');
    modo.apontar(par[0].cx, par[0].cy, 'baixo');
    for (let k = 0; k < 120; k++) modo.passo(1 / 60);
    return S.mundo.hash();
  };
  assert.equal(await rodada(), await rodada());
});


test('skins: a mesma partida com e sem skin (a skin so muda a cor) e a troca ao vivo repinta so o nivel', async () => {
  const { criarModo } = await import(MODOS.merge);
  const { aparencias, SKINS } = await import('../src/jogo/skins.js');
  // uma pronta equipada em cada nivel, e a Minha no 3
  const equipado = {};
  for (const s of SKINS) if (s.id !== 'padrao' && !equipado[s.nivel]) equipado[s.nivel] = s.id;
  equipado[3] = 'minha';
  const comSkin = aparencias(equipado, { 3: { m: 1, b: 4, e: 1, px: 'A'.repeat(171) } });
  const rodada = (ap, trocarEm = -1) => {
    const modo = criarModo({ semente: 11, salvo: {}, toque: true, lang: 'pt', aparencias: ap });
    let t = 0;
    let fusoes = 0;
    for (let f = 0; f < 50 * 60; f++) {
      t += 1 / 60;
      if (t >= 0.6) { t = 0; modo.bot(); }
      if (f === trocarEm) modo.definirAparencias(comSkin);
      modo.passo(1 / 60);
      fusoes += modo.eventos.splice(0).filter((e) => e.tipo === 'fusao').length;
    }
    return { modo, fusoes, hash: modo.mundo.hash() };
  };
  const sem = rodada(undefined);
  const com = rodada(comSkin);
  assert.ok(sem.fusoes > 5);
  assert.equal(com.fusoes, sem.fusoes);
  assert.equal(com.hash, sem.hash, 'a skin nao mexe na fisica nem no rng');
  for (const s of com.modo.mundo.vivos()) {
    if (s.dados.prisma) continue;
    assert.equal(s.dados.ap, s.nivel, `nivel ${s.nivel} com a skin`);
    assert.equal(s.dados.hex, comSkin[s.nivel].hex);
  }
  // troca ao vivo no meio da partida: os slimes passam a skin, e a partida segue igual
  const viva = rodada(undefined, 20 * 60);
  assert.equal(viva.hash, sem.hash);
  for (const s of viva.modo.mundo.vivos()) if (!s.dados.prisma) assert.equal(s.dados.ap, s.nivel);
  // a troca so repinta os niveis que mudaram
  const parcial = criarModo({ semente: 11, salvo: {}, toque: true, lang: 'pt' });
  for (let f = 0; f < 20 * 60; f++) { if (f % 36 === 0) parcial.bot(); parcial.passo(1 / 60); }
  parcial.definirAparencias(aparencias({ 1: equipado[1] }));
  for (const s of parcial.mundo.vivos()) if (!s.dados.prisma) assert.equal(s.dados.ap, s.nivel === 1 ? 1 : 0);
});

test('skins no Duelo: os dois potes com a mesma tabela e a gosma cinza continua cinza', async () => {
  const { criarModo } = await import(MODOS.duelo);
  const { aparencias } = await import('../src/jogo/skins.js');
  const modo = criarModo({ semente: 5, salvo: {}, toque: true, lang: 'pt', liga: 1, aparencias: aparencias({ 1: 'bolhas', 2: 'melancia' }) });
  for (let f = 0; f < 60 * 60; f++) { if (f % 30 === 0) modo.bot(); modo.passo(1 / 60); modo.eventos.splice(0); }
  for (const s of modo.mundo.vivos()) {
    if (s.dados.cinza) { assert.equal(s.dados.ap || 0, 0, 'a gosma cinza nao usa skin'); continue; }
    assert.equal(s.dados.ap, s.nivel <= 2 ? s.nivel : 0, `nivel ${s.nivel}`);
  }
  // o loop acima vale para os dois potes: a CPU joga com a mesma tabela
  assert.ok(modo.mundo.vivos().some((s) => (s.dados.pote || 0) === 1 && !s.dados.cinza && s.nivel <= 2), 'slime da CPU com skin');
});

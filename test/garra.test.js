// Garra de Squishy (prototipo #44): o bot pega premios so com a fisica, o ciclo da garra fecha,
// nada atravessa o vidro, o squishy solto gruda no vidro e escorre, e o album e as fichas
// (que so saem de jogar) funcionam.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarModo, CAIXA, SQUISHIES, GARRA, BOTAO } from '../src/jogo/modos/garra.js';

const C = CAIXA;

/**
 * Roda o modo por `seg` s com o bot a cada `cada` s, vigiando cada quadro: NaN, particula fora
 * da caixa de vidro (a rampa so abaixo da divisoria) e particula de quem esta na pilha do outro
 * lado da divisoria.
 */
function rodar(seg, { semente = 7, cada = 0.5, salvo = {} } = {}) {
  const modo = criarModo({ semente, salvo, toque: true, lang: 'pt' });
  const eventos = [];
  const fases = new Set();
  let fora = 0;
  let atravessou = 0;
  let t = 0;
  for (let f = 0; f < seg * 60; f++) {
    t += 1 / 60;
    if (t >= cada) { t = 0; modo.bot(); }
    modo.passo(1 / 60);
    eventos.push(...modo.eventos.splice(0));
    fases.add(modo.estado.fase);
    const m = modo.mundo;
    for (let i = 0; i < m.n; i++) {
      const x = m.x[i];
      const y = m.y[i];
      assert.ok(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(m.vx[i]) && Number.isFinite(m.vy[i]), `NaN no quadro ${f}`);
      const dentro = x > C.esq && x < C.dir && y < C.teto && (y > C.chao || (x > C.div && y > C.bandeja));
      if (!dentro) fora++;
    }
    for (const s of m.slimes) {
      if (!s.ativo || s.dados.premio || s.cx > C.div) continue;
      for (let a = m.iniSl[s.idx]; a < m.iniSl[s.idx + 1]; a++) {
        const i = m.membros[a];
        if (m.x[i] > C.div + C.r && m.y[i] < C.topoDiv - 0.3) atravessou++;
      }
    }
  }
  return { modo, eventos, fases, fora, atravessou };
}

test('o bot pega premio so com a fisica em 120 s; o ciclo da garra fecha; nada sai do vidro', () => {
  const t0 = performance.now();
  const { modo, eventos, fases, fora, atravessou } = rodar(120);
  const ms = (performance.now() - t0) / (120 * 60);
  const premios = eventos.filter((e) => e.tipo === 'premio');
  const p = modo.placar;
  assert.ok(premios.length >= 1, `nenhum premio em 120 s (${p.tentativas} tentativas)`);
  // a pegada e fisica: o bot nao acerta sempre (~1 em 3 das boas)
  assert.ok(p.premios < p.tentativas, `pegou ${p.premios} em ${p.tentativas}: facil demais`);
  for (const f of ['mira', 'desce', 'fecha', 'sobe', 'leva', 'abre']) assert.ok(fases.has(f), `a garra nunca passou por ${f}`);
  assert.ok(modo.estado.ciclos >= 4, `so ${modo.estado.ciclos} ciclos completos`);
  assert.equal(fora, 0, 'particula fora da caixa de vidro');
  assert.equal(modo.estado.puxadas, 0, 'a rede de seguranca teve de devolver particulas (algo atravessou o vidro)');
  assert.ok(atravessou <= 10, `${atravessou} particulas da pilha passaram para o lado da rampa`);
  // HUD e visual
  const h = modo.hud();
  assert.match(h.pontos, /^Álbum \d+\/12$/);
  assert.match(h.recorde, /^Fichas \d+$/);
  assert.equal((h.metaHtml.match(/<i /g) || []).length, 12);
  assert.deepEqual(h.poderes.map((x) => x.id), ['pegar', 'fichas']);
  const v = modo.visual();
  assert.equal(v.potes.length, 2);
  assert.equal(v.garra.caps.length, 5);
  assert.ok(typeof modo.desenho.cenario === 'function' && typeof modo.desenho.topo === 'function');
  // custo (meta: <= 4 ms por passo no desktop; folga para maquina carregada)
  assert.ok(ms < 8, `${ms.toFixed(2)} ms por passo`);
});

test('o squishy escorrega da garra as vezes (a pegada nao e garantida) e tem rosto de susto', () => {
  const { eventos } = rodar(90, { semente: 3 });
  assert.ok(eventos.some((e) => e.tipo === 'texto' && /Escorregou/.test(e.texto)), 'nenhum escorregou');
});

test('o album guarda o premio no salvar; repetido vira ficha', () => {
  const { modo, eventos } = rodar(120);
  const s = modo.salvar();
  const ids = Object.keys(s.album);
  assert.ok(ids.length >= 1 && ids.every((id) => SQUISHIES.some((q) => q.id === id)));
  const total = Object.values(s.album).reduce((a, b) => a + b, 0);
  assert.equal(total, eventos.filter((e) => e.tipo === 'premio').length);
  // volta pelo salvo: o HUD conta o album
  const outra = criarModo({ semente: 1, salvo: s, toque: true });
  assert.equal(outra.hud().pontos, `Álbum ${ids.length}/12`);
  // album completo: todo premio e repetido e vira +1 ficha
  const cheio = {};
  for (const q of SQUISHIES) cheio[q.id] = 1;
  const r = rodar(120, { salvo: { album: cheio, fichas: 10 } });
  const recargas = r.eventos.filter((e) => e.tipo === 'texto' && /fichas/.test(e.texto) && e.texto.startsWith('+')).length;
  const p = r.modo.placar;
  assert.ok(p.premios >= 1);
  assert.ok(r.eventos.filter((e) => e.tipo === 'premio').every((e) => !e.novo));
  assert.equal(p.fichas, 10 - p.tentativas + p.premios + 5 * recargas);
});

test('fichas: cada tentativa gasta 1; sem ficha a garra nao desce e a recarga gratis da +5', () => {
  const modo = criarModo({ semente: 2, salvo: { fichas: 1 }, toque: true });
  assert.equal(modo.estado.fase, 'mira');
  modo.poder('pegar');
  assert.equal(modo.estado.fase, 'desce');
  assert.equal(modo.placar.fichas, 0);
  // espera a garra voltar
  for (let f = 0; f < 60 * 25 && modo.estado.fase !== 'mira'; f++) modo.passo(1 / 60);
  assert.equal(modo.estado.fase, 'mira');
  const antes = modo.placar.fichas;
  modo.poder('pegar');
  assert.equal(modo.estado.fase, 'mira', 'desceu sem ficha');
  assert.ok(modo.hud().poderes.find((x) => x.id === 'fichas' && !x.oculto), 'o botao de recarga nao apareceu');
  modo.poder('fichas');
  assert.equal(modo.placar.fichas, antes + 5);
  // com ficha, a recarga nao faz nada
  modo.poder('fichas');
  assert.equal(modo.placar.fichas, antes + 5);
});

test('controles: setas/A-D e arrasto miram, Espaco e o botao do painel pegam, e a garra desce sozinha em 10 s', () => {
  const modo = criarModo({ semente: 4, toque: false });
  const x0 = modo.estado.hx;
  modo.tecla('ArrowLeft', true);
  for (let f = 0; f < 40; f++) modo.passo(1 / 60);
  modo.tecla('ArrowLeft', false);
  assert.ok(modo.estado.hx < x0 - 1, 'a seta nao moveu a garra');
  modo.apontar(-2, 8, 'baixo');
  modo.apontar(-3, 8, 'mover');
  modo.apontar(-3, 8, 'cima');
  for (let f = 0; f < 90; f++) modo.passo(1 / 60);
  assert.ok(Math.abs(modo.estado.hx + 3) < 0.05, `o arrasto nao levou a garra (hx ${modo.estado.hx.toFixed(2)})`);
  // limite: as pincas abertas nao batem no vidro
  modo.apontar(-99, 8, 'baixo');
  modo.apontar(-99, 8, 'cima');
  for (let f = 0; f < 120; f++) modo.passo(1 / 60);
  assert.ok(Math.abs(modo.estado.hx - GARRA.xMin) < 1e-6);
  // a contagem comecou no primeiro gesto: desce sozinha em 10 s
  let desceu = -1;
  for (let f = 0; f < 60 * 11 && desceu < 0; f++) { modo.passo(1 / 60); if (modo.estado.fase === 'desce') desceu = f; }
  assert.ok(desceu > 0, 'a garra nao desceu sozinha');
  // Espaco e o botao do painel
  const b = criarModo({ semente: 4 });
  b.tecla('Space', true);
  assert.equal(b.estado.fase, 'desce');
  const c = criarModo({ semente: 4 });
  c.apontar(BOTAO.x, BOTAO.y, 'baixo');
  assert.equal(c.estado.fase, 'desce');
});

test('solto contra o vidro, o squishy gruda e escorre devagar (nao cai em queda livre)', () => {
  const modo = criarModo({ semente: 5 });
  const m = modo.mundo;
  for (let f = 0; f < 10; f++) modo.passo(1 / 60);
  // um squishy novo no alto, arremessado contra o vidro da direita (acima da rampa)
  const s = m.criarSlime({ x: 3.4, y: 10, n: 44, material: m.slimes.find((q) => q.ativo).mat, pigmento: [0, 0.5, 0, 0] });
  s.dados.tipo = SQUISHIES[0];
  s.dados.hex = '#ff88aa';
  s.dados.aderT = 0;
  m.reconstruir();
  for (let a = m.iniSl[s.idx]; a < m.iniSl[s.idx + 1]; a++) { const i = m.membros[a]; m.vx[i] = 12; m.vy[i] = 4; }
  let colado = 0;
  let vMin = 0;
  for (let f = 0; f < 90; f++) {
    modo.passo(1 / 60);
    if (!s.ativo) break;
    if (s.dados.vidro) { colado++; vMin = Math.min(vMin, s.vy); }
  }
  assert.ok(colado >= 15, `so ${colado} quadros colado no vidro`);
  assert.ok(vMin > -4, `desceu o vidro a ${(-vMin).toFixed(1)} u/s`);
  assert.ok(modo.estado.manchas.length > 0, 'nao deixou rastro no vidro');
});

test('a maquina reabastece pela escotilha quando sobram menos de 6', () => {
  const modo = criarModo({ semente: 6 });
  const m = modo.mundo;
  const vivos = () => m.slimes.filter((s) => s.ativo).length;
  while (vivos() > 4) m.remover(m.slimes.find((s) => s.ativo));
  for (let f = 0; f < 60 * 15; f++) modo.passo(1 / 60);
  assert.ok(vivos() >= 10, `so ${vivos()} squishies depois de reabastecer`);
  assert.equal(modo.estado.puxadas, 0);
});

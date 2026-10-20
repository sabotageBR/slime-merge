// Vitral de Gelatina (?modelo=vitral): o bot mistura, despeja e acende pecas; geometria dos
// vitrais, cores alcancaveis, salvar/voltar, controles e o custo do passo com o vitral quase cheio.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarModo, VITRAIS, dentro } from '../src/jogo/modos/vitral.js';
import { CORES } from '../src/jogo/cores.js';
import { misturar, deltaE, TINTAS } from '../src/cor/km.js';

/**
 * Roda o modo por `seg` s com o bot a cada `cada` s.
 * @returns {{ modo: any, eventos: any[] }}
 */
function rodar(seg, cada = 0.4, o = {}, conferir = false) {
  const modo = criarModo({ semente: 7, salvo: {}, toque: true, lang: 'pt', ...o });
  const eventos = [];
  let t = 0;
  for (let f = 0; f < seg * 60; f++) {
    t += 1 / 60;
    if (t >= cada) { t = 0; modo.bot(); }
    modo.passo(1 / 60);
    eventos.push(...modo.eventos.splice(0));
    // a cada meio segundo: nada de NaN, nada fora do mundo nem da propria peca
    if (conferir && f % 30 === 29) conferirParticulas(modo);
  }
  return { modo, eventos };
}

/** Particulas sem NaN, dentro do mundo, as de cada peca dentro dela e as do copo no copo. */
function conferirParticulas(modo) {
  const m = modo.mundo;
  const S = modo.estado;
  const [x0, y0, x1, y1] = modo.janela;
  for (let i = 0; i < m.n; i++) {
    const x = m.x[i];
    const y = m.y[i];
    assert.ok(Number.isFinite(x) && Number.isFinite(y), 'NaN');
    assert.ok(x > x0 && x < x1 && y > y0 && y < y1, `particula fora do mundo: ${x.toFixed(2)}, ${y.toFixed(2)}`);
    const k = m.slimes[m.sl[i]].dados.peca ?? -1;
    if (k >= 0) assert.ok(dentro([x, y], S.pecas[k].pts), `particula da peca ${k} fora dela: ${x.toFixed(2)}, ${y.toFixed(2)}`);
    else assert.ok(y < 5 && Math.abs(x) < 3.4, `goo do copo fora do copo: ${x.toFixed(2)}, ${y.toFixed(2)}`);
  }
}

test('Vitral: o bot enche e acende pelo menos 2 pecas (dE <= 9) em 90 s', () => {
  const { modo, eventos } = rodar(90, 0.4, {}, true);
  const acesas = eventos.filter((e) => e.tipo === 'faiscas').length;
  const prontos = eventos.filter((e) => e.tipo === 'nivel' && e.acao === 'complete').length;
  // as acesas do vitral da vez mais as dos vitrais prontos (cada um tem 5, 7 ou 8 pecas)
  const S = modo.estado;
  const agora = S.pecas.filter((P) => P.estado === 'cheia' && P.acesa && P.dE <= 9).length;
  assert.ok(agora + prontos * 5 >= 2, `poucas pecas acesas: ${agora} agora, ${prontos} vitrais prontos`);
  assert.ok(acesas >= 2, 'menos de 2 pecas acenderam');
  assert.ok(/★ [1-9]/.test(modo.hud().pontos), 'sem estrelas');
  conferirParticulas(modo);
  const h = modo.hud();
  assert.ok(h && typeof h.metaHtml === 'string' && h.poderes.length === 3);
  const v = modo.visual();
  assert.ok(v && v.vitral && v.vitral.pecas.length && v.bicos.length === 4 && v.potes.length === 1);
});

test('Vitral: cada vitral cobre o circulo com pecas que nao se sobrepoem', () => {
  for (const V of VITRAIS) {
    let soma = 0;
    for (const P of V.pecas) {
      let a = 0;
      for (let i = 0, j = P.pts.length - 1; i < P.pts.length; j = i++) a += P.pts[j][0] * P.pts[i][1] - P.pts[i][0] * P.pts[j][1];
      soma += Math.abs(a) / 2;
    }
    const circulo = Math.PI * 5.5 * 5.5;
    assert.ok(Math.abs(soma - circulo) / circulo < 0.015, `${V.id}: area ${soma.toFixed(1)} != ${circulo.toFixed(1)}`);
    // cada ponto de uma grade cai em uma peca so
    for (let x = -5.3; x <= 5.3; x += 0.37) {
      for (let y = -5.3; y <= 5.3; y += 0.41) {
        if (x * x + y * y > 5.2 * 5.2) continue;
        const n = V.pecas.filter((P) => dentro([x, y], P.pts)).length;
        assert.ok(n <= 1, `${V.id}: (${x.toFixed(2)}, ${y.toFixed(2)}) em ${n} pecas`);
      }
    }
  }
  assert.deepEqual(VITRAIS.map((V) => V.pecas.length), [5, 7, 8]);
});

test('Vitral: toda cor-alvo sai so de ciano, magenta, amarelo e branco (3 estrelas com ate 18 gotas)', () => {
  const tintas = [TINTAS.ciano, TINTAS.magenta, TINTAS.amarelo, TINTAS.branco];
  for (const V of VITRAIS) {
    for (const P of V.pecas) {
      const cor = CORES.find((c) => c.id === P.cor);
      assert.ok(cor, P.cor);
      assert.equal(cor.pig[3], 0, `${cor.id} pede preto`);
      const alvo = misturar(cor.pig);
      let melhor = 99;
      for (let c = 0; c <= 18; c++) for (let mg = 0; c + mg <= 18; mg++) for (let am = 0; c + mg + am <= 18; am++) for (let b = 0; c + mg + am + b <= 18; b++) {
        const n = c + mg + am + b;
        if (!n) continue;
        const pig = [0, 1, 2, 3].map((k) => (c * tintas[0][k] + mg * tintas[1][k] + am * tintas[2][k] + b * tintas[3][k]) / n);
        const d = deltaE(misturar(pig), alvo);
        if (d < melhor) melhor = d;
      }
      assert.ok(melhor <= 4, `${V.id}/${cor.id}: melhor dE ${melhor.toFixed(1)}`);
    }
  }
});

test('Vitral: salvar e voltar mantem o vitral, as pecas prontas e as estrelas', () => {
  const { modo } = rodar(20);
  const salvo = JSON.parse(JSON.stringify(modo.salvar()));
  const feitas = modo.estado.pecas.filter((P) => P.estado === 'cheia').length;
  assert.ok(feitas >= 1);
  const outro = criarModo({ semente: 9, salvo, toque: true, lang: 'pt' });
  assert.equal(outro.estado.v, modo.estado.v);
  assert.equal(outro.estado.pecas.filter((P) => P.estado === 'cheia').length, salvo.feitas.length);
  for (let f = 0; f < 120; f++) outro.passo(1 / 60);
  conferirParticulas(outro);
  assert.equal(outro.hud().pontos, modo.hud().pontos);
});

test('Vitral: pingar pelo toque e pela tecla, despejar, derreter e o ralo', () => {
  const modo = criarModo({ semente: 3, salvo: {}, toque: false, lang: 'en' });
  const S = modo.estado;
  const passar = (seg) => { for (let f = 0; f < seg * 60; f++) { modo.passo(1 / 60); modo.eventos.length = 0; } };
  // segurar o bico do amarelo (x = 0,75) pinga varias gotas; a tecla 3 tambem
  modo.apontar(0.75, 5, 'baixo');
  passar(0.5);
  modo.apontar(0.75, 5, 'cima');
  modo.tecla('Digit3', true);
  passar(0.1);
  modo.tecla('Digit3', false);
  passar(1);
  assert.ok(S.nCopo >= 3 * 7, `copo com ${S.nCopo} particulas`);
  // o ralo esvazia
  modo.poder('ralo');
  passar(0.2);
  assert.equal(S.nCopo, 0);
  // uma gota de amarelo e despejar no sol (peca 0, escolhida no comeco) pelo Enter
  assert.equal(S.sel, 0);
  modo.tecla('Digit3', true);
  passar(0.05);
  modo.tecla('Digit3', false);
  passar(1);
  modo.tecla('Enter', true);
  assert.ok(S.despejo, 'nao despejou');
  passar(8);
  const P = S.pecas[0];
  assert.equal(P.estado, 'cheia');
  assert.ok(P.acesa && P.est === 3, `dE ${P.dE}`);
  // tocar na peca cheia escolhe; o botao derrete; ela volta a ficar vazia e escolhida
  const [px, py] = P.polo;
  modo.apontar(px, py, 'baixo');
  modo.apontar(px, py, 'cima');
  assert.equal(S.sel, 0);
  assert.ok(!modo.hud().poderes.find((p) => p.id === 'derreter').oculto);
  modo.poder('derreter');
  passar(0.2);
  assert.equal(P.estado, 'vazia');
  assert.ok(!modo.mundo.slimes.some((s) => s.ativo && s.dados.peca === 0));
  conferirParticulas(modo);
});

test('Vitral: custo do passo com o vitral quase cheio (falta uma peca)', () => {
  const linhas = [];
  for (const vitrine of [14, 15, 16]) {
    const modo = criarModo({ semente: 5, salvo: {}, toque: true, lang: 'pt', vitrine });
    const S = modo.estado;
    // aquece: as pecas prontas assentam e dormem
    for (let f = 0; f < 120; f++) { modo.passo(1 / 60); modo.eventos.length = 0; }
    const tempos = [];
    let t = 0;
    for (let f = 0; f < 60 * 14; f++) {
      t += 1 / 60;
      if (t >= 0.4) { t = 0; modo.bot(); }
      const t0 = performance.now();
      modo.passo(1 / 60);
      tempos.push(performance.now() - t0);
      modo.eventos.length = 0;
      if (S.pronto) break;
    }
    tempos.sort((a, b) => a - b);
    const media = tempos.reduce((a, b) => a + b, 0) / tempos.length;
    const p95 = tempos[Math.floor(tempos.length * 0.95)];
    // todas acordadas (o pior caso: nenhuma dormindo)
    const m = modo.mundo;
    for (const P of S.pecas) P.dorme = 0;
    m.acordarTodos();
    const t1 = performance.now();
    for (let f = 0; f < 30; f++) { m.acordarTodos(); modo.passo(1 / 60); modo.eventos.length = 0; }
    const acordado = (performance.now() - t1) / 30;
    linhas.push(`${VITRAIS[vitrine - 14].id}: ${m.n} particulas, ${media.toFixed(2)} ms/passo (p95 ${p95.toFixed(2)}), todas acordadas ${acordado.toFixed(2)} ms`);
    assert.ok(S.pronto || S.pecas.every((P) => P.estado === 'cheia'), 'a ultima peca nao encheu');
    assert.ok(media < 8, `passo caro: ${media.toFixed(2)} ms`);
  }
  console.info(linhas.join('\n'));
});

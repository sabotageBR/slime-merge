// Cor: pigmentos puros, misturas (matiz em OKLCH), difusao que conserva o pigmento e a
// frente de transmutacao.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { misturar, oklch, deltaE, linearDeHex, TINTAS } from '../src/cor/km.js';
import { difundir, iniciarFrente, pintar, pigmentoMedio } from '../src/cor/difusao.js';
import { criarMundo, N_PIG } from '../src/fisica/mundo.js';
import { poteTrapezio } from '../src/fisica/paredes.js';

const ALVOS = { ciano: '#0a7fd6', magenta: '#d6176f', amarelo: '#ffd21a', preto: '#202020', branco: '#f4f4f2' };

test('pigmento puro bate a cor-alvo (dE < 2)', () => {
  for (const [nome, hex] of Object.entries(ALVOS)) {
    const d = deltaE(misturar(TINTAS[nome]), linearDeHex(hex));
    assert.ok(d < 2, `${nome}: dE ${d.toFixed(2)}`);
  }
});

const h = (c) => oklch(misturar(c))[2];
const cr = (c) => oklch(misturar(c))[1];
const L = (c) => oklch(misturar(c))[0];

test('misturas subtrativas de verdade (matiz OKLCH)', () => {
  const cy = h([0.5, 0, 0.5, 0]);
  const my = h([0, 0.5, 0.5, 0]);
  const cm = h([0.5, 0.5, 0, 0]);
  assert.ok(cy > 125 && cy < 165, `azul + amarelo = verde (h ${cy.toFixed(0)})`);
  assert.ok(my > 15 && my < 50, `magenta + amarelo = vermelho (h ${my.toFixed(0)})`);
  assert.ok(cm > 260 && cm < 300, `azul + magenta = violeta (h ${cm.toFixed(0)})`);
  assert.ok(cr([1 / 3, 1 / 3, 1 / 3, 0]) < 0.04, 'as tres juntas viram lama quase neutra');
});

test('branco clareia sem trocar o matiz', () => {
  for (const c of [TINTAS.ciano, TINTAS.magenta]) {
    const meio = c.map((v) => v / 2);
    assert.ok(L(meio) > L(c), 'mais claro');
    let dh = Math.abs(h(meio) - h(c));
    if (dh > 180) dh = 360 - dh;
    assert.ok(dh < 8, `matiz andou ${dh.toFixed(1)} graus`);
  }
});

function doisSlimes() {
  const m = criarMundo({ semente: 4 });
  m.definirParedes(poteTrapezio());
  const s = m.criarSlime({ x: 0, y: 2, n: 120, material: 'goo' });
  // metade azul, metade amarela
  for (let i = 0; i < m.n; i++) {
    const c = m.x[i] < 0 ? TINTAS.ciano : TINTAS.amarelo;
    for (let k = 0; k < N_PIG; k++) m.pig[i * N_PIG + k] = c[k];
  }
  return { m, s };
}

test('difusao conserva o pigmento e nao inventa concentracao', () => {
  const { m, s } = doisSlimes();
  const total = () => { const t = [0, 0, 0, 0]; for (let i = 0; i < m.n; i++) for (let k = 0; k < 4; k++) t[k] += m.mas[i] * m.pig[i * 4 + k]; return t; };
  const antes = total();
  for (let f = 0; f < 300; f++) { m.avancar(4); m.medir(1 / 60); difundir(m, 1 / 60); }
  const depois = total();
  for (let k = 0; k < 4; k++) assert.ok(Math.abs(antes[k] - depois[k]) < 1e-9 * (1 + antes[k]), `pigmento ${k} mudou`);
  for (let i = 0; i < m.n * 4; i++) assert.ok(m.pig[i] >= -1e-12 && m.pig[i] <= 1 + 1e-12);
  // e mistura: a media do slime tende ao verde
  const med = pigmentoMedio(m, s);
  const hh = oklch(misturar(med))[2];
  assert.ok(hh > 120 && hh < 175, `media verde (h ${hh.toFixed(0)})`);
});

test('frente de transmutacao pinta o slime todo com a cor nova', () => {
  const m = criarMundo({ semente: 5 });
  m.definirParedes(poteTrapezio());
  const s = m.criarSlime({ x: 0, y: 2, n: 150, material: 'gelatina' });
  pintar(m, s, TINTAS.ciano);
  m.avancar(4);
  m.medir(1 / 60);
  iniciarFrente(m, s, TINTAS.magenta, s.cx, s.cy + 1);
  let t = 0;
  while (s.pigAlvo && t < 5) { m.avancar(4); m.medir(1 / 60); difundir(m, 1 / 60); t += 1 / 60; }
  assert.equal(s.pigAlvo, null, 'a frente devia terminar');
  assert.ok(t < 3, `demorou ${t.toFixed(1)} s`);
  const d = deltaE(misturar(pigmentoMedio(m, s)), misturar(TINTAS.magenta));
  assert.ok(d < 1, `ficou magenta (dE ${d.toFixed(2)})`);
});

// Motor do slime: estabilidade, conservacao, "desenha o recipiente", fusao, divisao e
// determinismo. Tudo headless (a fisica e pura).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarMundo, R_PART, VMAX, ESPACO } from '../src/fisica/mundo.js';
import { poteTrapezio, polilinha } from '../src/fisica/paredes.js';
import { material } from '../src/fisica/materiais.js';
import { particulasGirassol } from '../src/fisica/forma.js';
import { criarRng } from '../src/core/rng.js';

const DIAM = [1.3, 1.52, 1.79, 2.1, 2.46, 2.89, 3.39];

/** @param {ReturnType<typeof criarMundo>} m @param {number} s segundos */
function rodar(m, s) {
  for (let f = 0; f < Math.round(s * 60); f++) { m.avancar(4); m.medir(1 / 60); }
}

/** Sobreposicao maxima e media (fracao de 2r) por forca bruta. @param {ReturnType<typeof criarMundo>} m */
function sobreposicao(m) {
  let max = 0;
  let soma = 0;
  let pares = 0;
  for (let i = 0; i < m.n; i++) {
    for (let j = i + 1; j < m.n; j++) {
      const r = m.rad[i] + m.rad[j];
      const dx = m.x[i] - m.x[j];
      const dy = m.y[i] - m.y[j];
      const d2 = dx * dx + dy * dy;
      if (d2 >= r * r) continue;
      const f = (r - Math.sqrt(d2)) / (2 * R_PART);
      if (f > max) max = f;
      soma += f;
      pares++;
    }
  }
  return { max, media: pares ? soma / pares : 0 };
}

function potePadrao(semente = 1, config) {
  const m = criarMundo({ semente, config });
  m.definirParedes(poteTrapezio());
  return m;
}

/** Pilha de slimes caindo um a um, como numa partida. */
function pilha(m, qtd, mat = 'gelatina') {
  const rng = criarRng(99);
  for (let k = 0; k < qtd; k++) {
    m.criarSlime({ x: -3 + 6 * rng(), y: 13, diametro: DIAM[k % DIAM.length], material: mat });
    rodar(m, 0.33);
  }
}

test('nada atravessa uma capsula fina a velocidade maxima', () => {
  const m = criarMundo({ semente: 5 });
  m.gy = 0;
  m.definirParedes([{ ax: -40, ay: 0, bx: 40, by: 0, r: 0.22 }]);
  const rng = criarRng(5);
  for (let k = 0; k < 120; k++) {
    // angulo sorteado (sem trigonometria: direcao normalizada)
    let dx = rng() * 2 - 1;
    let dy = -(0.15 + rng());
    const l = Math.sqrt(dx * dx + dy * dy);
    dx /= l;
    dy /= l;
    m.criarSlime({ x: -6 + 12 * rng(), y: 0.9 + rng() * 0.5, n: 3, material: 'liquido', vx: dx * VMAX, vy: dy * VMAX });
  }
  rodar(m, 0.3);
  let cruzou = 0;
  for (let i = 0; i < m.n; i++) if (m.y[i] < 0 && Math.abs(m.x[i]) < 39) cruzou++;
  assert.equal(cruzou, 0);
});

// A regua e a do olho, nao a de um solver rigido: 2% de 2r sao 0,006 u (um quarto de pixel
// num celular) e o render em metaball esconde o resto. O que nao pode e a pilha afundar.
test('pilha de 30 slimes assenta sem se comprimir nem sair do pote', () => {
  const m = potePadrao(2);
  pilha(m, 30);
  rodar(m, 6);
  const s = sobreposicao(m);
  assert.ok(s.max < 0.15, `sobreposicao maxima ${(s.max * 100).toFixed(1)}%`);
  assert.ok(s.media < 0.02, `sobreposicao media ${(s.media * 100).toFixed(2)}%`);
  for (let i = 0; i < m.n; i++) assert.ok(m.y[i] > -0.01, `particula ${i} abaixo do fundo`);
});

/** Caixa fechada sem gravidade com 10 slimes atirados. */
function caixa(mat) {
  const m = criarMundo({ semente: 3 });
  m.gy = 0;
  m.definirParedes(polilinha([[-5, 0], [5, 0], [5, 10], [-5, 10]], 0.22, true));
  const rng = criarRng(3);
  for (let k = 0; k < 10; k++) {
    m.criarSlime({ x: -3 + 6 * rng(), y: 2 + 6 * rng(), diametro: 1.5, material: mat, vx: rng() * 8 - 4, vy: rng() * 8 - 4 });
  }
  const ec = () => { let e = 0; for (let i = 0; i < m.n; i++) e += m.mas[i] * (m.vx[i] * m.vx[i] + m.vy[i] * m.vy[i]); return e; };
  return { m, ec };
}

test('sem gravidade, numa caixa fechada, o liquido nunca ganha energia', () => {
  const { m, ec } = caixa('liquido');
  rodar(m, 0.2);
  let ant = ec();
  for (let k = 0; k < 20; k++) {
    rodar(m, 0.25);
    const e = ec();
    assert.ok(e <= ant * 1.05 + 1e-6, `energia subiu: ${ant.toFixed(3)} -> ${e.toFixed(3)}`);
    ant = e;
  }
});

test('sem gravidade, a gelatina devolve a mola mas a energia morre', () => {
  // corpo elastico troca energia de deformacao por cinetica (sobe um pouco), mas some
  const { m, ec } = caixa('gelatina');
  rodar(m, 0.1);
  const e0 = ec();
  rodar(m, 6);
  // sem chao nem gravidade, so o amortecimento global (0,3/s) tira energia: sozinho ele deixa
  // ~2,7% em 6 s; as colisoes inelasticas tiram o resto
  assert.ok(ec() < e0 * 0.05, `sobrou ${(ec() / e0 * 100).toFixed(1)}% da energia`);
});

test('gelatina que cai de 8 u volta a ficar quase redonda', () => {
  const m = potePadrao(4);
  const s = m.criarSlime({ x: 0, y: 8, n: 100, material: 'gelatina' });
  rodar(m, 1.5);
  const larg = s.dir - s.esq;
  const alt = s.topo - s.base;
  const circ = Math.min(larg, alt) / Math.max(larg, alt);
  assert.ok(circ > 0.8, `circularidade ${circ.toFixed(2)}`);
});

/** Fracao de faixas de 0,3 u do fundo do pote (y < 0,45) que tem particula. */
function cobreFundo(m) {
  const faixas = new Set();
  for (let i = 0; i < m.n; i++) if (m.y[i] < 0.45) faixas.add(Math.floor((m.x[i] + 4) / 0.3));
  return faixas.size / Math.ceil(8 / 0.3);
}

test('goo desenha o fundo do pote; a gelatina continua slime', () => {
  const goo = potePadrao(6);
  goo.criarSlime({ x: 0, y: 3, diametro: 5, material: 'goo' });
  rodar(goo, 4);
  const cg = cobreFundo(goo);
  assert.ok(cg > 0.9, `goo cobre ${(cg * 100).toFixed(0)}% do fundo`);
  const gel = potePadrao(6);
  gel.criarSlime({ x: 0, y: 3, diametro: 5, material: 'gelatina' });
  rodar(gel, 4);
  const cj = cobreFundo(gel);
  assert.ok(cj < 0.75, `gelatina cobre ${(cj * 100).toFixed(0)}% do fundo`);
});

test('pilha parada dorme', () => {
  const m = potePadrao(8);
  const rng = criarRng(8);
  for (let k = 0; k < 8; k++) {
    m.criarSlime({ x: -2.5 + 5 * rng(), y: 3 + k * 1.6, diametro: 1.5, material: 'gelatina' });
  }
  rodar(m, 8);
  const vivos = m.vivos();
  const dormindo = vivos.filter((s) => s.dormindo).length;
  assert.ok(dormindo >= vivos.length * 0.75, `${dormindo}/${vivos.length} dormindo`);
});

test('mesma semente, mesmo resultado; outra semente, outro', () => {
  const cena = (sem) => {
    const m = potePadrao(sem);
    pilha(m, 6);
    rodar(m, 1);
    return m.hash();
  };
  assert.equal(cena(11), cena(11));
  assert.notEqual(cena(11), cena(12));
});

test('fuzz: 400 acoes sorteadas sem NaN e sem passar da capacidade', () => {
  const m = potePadrao(13);
  const rng = criarRng(13);
  for (let k = 0; k < 400; k++) {
    const r = rng();
    const vivos = m.vivos();
    if (r < 0.35 || vivos.length < 2) {
      m.criarSlime({ x: -4 + 8 * rng(), y: 12, diametro: DIAM[(rng() * 5) | 0], material: ['gelatina', 'goo', 'liquido'][(rng() * 3) | 0] });
    } else if (r < 0.5) {
      const a = vivos[(rng() * vivos.length) | 0];
      const b = vivos[(rng() * vivos.length) | 0];
      if (a !== b) m.fundir(a, b, { px: (a.cx + b.cx) / 2, py: (a.cy + b.cy) / 2, nAlvo: Math.max(5, ((a.n + b.n) * 0.7) | 0) });
    } else if (r < 0.6) {
      const a = vivos[(rng() * vivos.length) | 0];
      m.dividir(a, a.cx, a.cy, rng() - 0.5, 1);
    } else if (r < 0.7) {
      m.remover(vivos[(rng() * vivos.length) | 0]);
    } else if (r < 0.8) {
      m.empurrar(rng() * 6 - 3, rng() * 6);
    } else if (r < 0.85) {
      const a = vivos[(rng() * vivos.length) | 0];
      a.estado = rng() < 0.5 ? 'calor' : 'gelo';
      a.tEstado = 2;
    }
    m.avancar(4);
    m.medir(1 / 60);
    assert.ok(m.n <= 4096);
  }
  for (let i = 0; i < m.n; i++) assert.ok(Number.isFinite(m.x[i]) && Number.isFinite(m.y[i]), `NaN na particula ${i}`);
});

test('dois slimes encostados viram contato persistente, e a fusao deixa nAlvo particulas', () => {
  const m = potePadrao(21);
  // b cai em cima de a: o peso mantem o contato (como no pote)
  const a = m.criarSlime({ x: 0, y: 1.2, diametro: 2.1, material: 'gelatina' });
  const b = m.criarSlime({ x: 0.2, y: 3.6, diametro: 2.1, material: 'gelatina' });
  let achou = null;
  for (let f = 0; f < 120 && !achou; f++) {
    m.avancar(4);
    m.medir(1 / 60);
    achou = m.contatos().find(([i, j, p]) => ((i === a.idx && j === b.idx) || (i === b.idx && j === a.idx)) && p >= 3);
  }
  assert.ok(achou, 'os dois iguais deviam se tocar');
  const alvo = particulasGirassol(2.46, ESPACO);
  const antes = m.n;
  const saidas = m.fundir(a, b, { px: 0, py: 2.2, nAlvo: alvo });
  m.medir(1 / 60);
  assert.equal(a.n, alvo);
  assert.equal(b.ativo, false);
  assert.equal(m.n, antes - saidas.length / 3);
  rodar(m, 1);
  assert.ok(a.rampa === 1 && a.ativo);
});

test('iguais encostados em repouso continuam em contato, mesmo os dois dormindo', () => {
  // o solver deixa os dois exatamente na distancia de toque (sem penetracao): a fusao precisa
  // ver o encosto assim mesmo, e tambem quando os dois ja adormeceram (print do usuario,
  // 2026-10-15: dois laranjas encostados no fundo que nao fundiam)
  const m = potePadrao(23);
  const a = m.criarSlime({ x: -1.0, y: 1.2, diametro: 2.1, material: 'gelatina' });
  const b = m.criarSlime({ x: 1.0, y: 1.2, diametro: 2.1, material: 'gelatina' });
  rodar(m, 4);
  assert.ok(a.dormindo && b.dormindo, 'os dois deviam dormir encostados');
  m.avancar(4);
  m.medir(1 / 60);
  const par = m.contatos().find(([i, j]) => (i === a.idx && j === b.idx) || (i === b.idx && j === a.idx));
  assert.ok(par && par[2] >= 3, `encostados e dormindo sem contato persistente (${par ? par[2] : 'nenhum'})`);
});

test('dividir conserva as particulas e gera duas formas validas', () => {
  const m = potePadrao(22);
  const s = m.criarSlime({ x: 0, y: 2, n: 120, material: 'gelatina' });
  rodar(m, 0.5);
  const antes = m.n;
  const [p, q] = m.dividir(s, s.cx, s.cy, 1, 0);
  assert.ok(q, 'devia dividir');
  m.medir(1 / 60);
  assert.equal(m.n, antes);
  assert.equal(p.n + q.n, 120);
  rodar(m, 2);
  assert.ok(p.ativo && q.ativo);
  for (let i = 0; i < m.n; i++) assert.ok(Number.isFinite(m.x[i]));
});

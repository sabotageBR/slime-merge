// Skins por nivel (src/jogo/skins.js) e as candidatas do estudio (modelos/skins-candidatas.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PALETA, BASES, SKINS, PROC, MODELOS, TAM_CODIGO, ESCALAS, codificar, decodificar, pxDeLinhas, linhasDePx, modelo,
  aparencia, aparencias, precoSugerido, imagemVazia, fatorLadrilho,
} from '../src/jogo/skins.js';
import { NIVEIS, MAX_NIVEL } from '../src/jogo/niveis.js';
import { hexDaMistura, linearDeHex, deltaE } from '../src/cor/km.js';
import { CANDIDATAS } from '../modelos/skins-candidatas.js';

const HEX = /^#[0-9a-f]{6}$/;
/** LCG fixo (nada de Math.random nos testes). */
function lcg(semente) {
  let s = semente >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

test('codec: ida e volta, 171 caracteres, base64url', () => {
  const r = lcg(12345);
  for (let n = 0; n < 200; n++) {
    const px = new Uint8Array(256);
    for (let i = 0; i < 256; i++) px[i] = Math.floor(r() * 16);
    const s = codificar(px);
    assert.equal(s.length, TAM_CODIGO);
    assert.match(s, /^[A-Za-z0-9_-]+$/);
    assert.deepEqual(decodificar(s), px);
    assert.equal(codificar(decodificar(s)), s);
  }
  assert.equal(codificar(imagemVazia()), 'A'.repeat(171));
});

test('codec: codigo invalido vira null', () => {
  const ok = codificar(imagemVazia());
  assert.equal(decodificar(ok.slice(0, 170)), null);
  assert.equal(decodificar(ok + 'A'), null);
  assert.equal(decodificar(ok.slice(0, 100) + '*' + ok.slice(101)), null);
  assert.equal(decodificar(ok.slice(0, 100) + '=' + ok.slice(101)), null);
  // o ultimo grupo (3 caracteres para 2 bytes) nao pode ter bits sobrando
  assert.equal(decodificar(ok.slice(0, 170) + 'B'), null);
  assert.equal(decodificar(null), null);
  assert.equal(decodificar(123), null);
  assert.equal(decodificar(''), null);
});

test('linhas hex: ida e volta e validacao', () => {
  const r = lcg(7);
  const px = new Uint8Array(256).map(() => Math.floor(r() * 16));
  const l = linhasDePx(px);
  assert.equal(l.length, 16);
  for (const x of l) assert.match(x, /^[0-9a-f]{16}$/);
  assert.deepEqual(pxDeLinhas(l), px);
  assert.equal(pxDeLinhas(l.slice(0, 15)), null);
  assert.equal(pxDeLinhas([...l.slice(0, 15), 'g'.repeat(16)]), null);
});

test('paleta: 16 cores, a 0 transparente', () => {
  assert.equal(PALETA.length, 16);
  assert.equal(PALETA[0], '');
  for (const h of PALETA.slice(1)) assert.match(h, HEX);
  assert.equal(new Set(PALETA).size, 16);
});

test('cores do corpo: a 0 e a do nivel; as outras com C+M+Y >= 0,25', () => {
  assert.equal(BASES[0], null);
  assert.ok(BASES.length >= 10);
  for (const b of BASES.slice(1)) {
    assert.equal(b.length, 4);
    assert.ok(b[0] + b[1] + b[2] >= 0.25, String(b));
    assert.ok(b[0] + b[1] + b[2] + b[3] <= 1.0001, String(b));
  }
});

test('catalogo: as 2 prontas por nivel escolhidas pelo usuario, iguais as candidatas, com o preco sugerido', () => {
  const escolhidas = ['bolhas', 'gotas', 'melancia', 'folhinhas', 'xadrez', 'florzinhas', 'morango', 'bengala', 'gomos', 'onca',
    'abelha', 'estrelinhas', 'chuva', 'trovao', 'mosaico', 'baloes', 'bolhasMar', 'ancoras', 'xadrezUva', 'morcegos', 'granulado',
    'cupcake', 'nebulosa', 'constelacao', 'tesouro', 'diamantes'];
  const prontas = SKINS.filter((s) => s.id !== 'padrao');
  assert.deepEqual(prontas.map((s) => s.id).sort(), escolhidas.slice().sort());
  for (let k = 1; k <= MAX_NIVEL; k++) assert.equal(prontas.filter((s) => s.nivel === k).length, 2, `nivel ${k}`);
  for (const s of prontas) {
    const c = CANDIDATAS.find((x) => x.id === s.id);
    const { nome, nota, ...dados } = c;
    assert.deepEqual({ ...s }, dados, s.id);
    assert.equal(s.preco, precoSugerido(s.tipo, s.nivel));
  }
});

test('catalogo: a padrao gratis em cada nivel, pares (nivel, id) unicos', () => {
  for (let k = 1; k <= MAX_NIVEL; k++) {
    const p = SKINS.filter((s) => s.nivel === k && s.id === 'padrao');
    assert.equal(p.length, 1, `nivel ${k}`);
    assert.equal(p[0].preco, 0);
  }
  const pares = SKINS.map((s) => s.nivel + ':' + s.id);
  assert.equal(new Set(pares).size, pares.length);
  for (const s of SKINS) assert.ok(s.nivel >= 1 && s.nivel <= MAX_NIVEL);
  const ids = SKINS.filter((s) => s.id !== 'padrao').map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('aparencia padrao = o visual de hoje (NIVEIS), no caminho legado (ap = 0)', () => {
  for (let k = 1; k <= MAX_NIVEL; k++) {
    const a = aparencia(k, 'padrao');
    const n = NIVEIS[k - 1];
    assert.equal(a.ap, 0);
    assert.deepEqual(a.pig, n.pig);
    assert.equal(a.textura, n.textura || 0);
    assert.equal(a.hex, hexDaMistura(n.pig));
    assert.equal(a.px, null);
    assert.match(a.hex, HEX);
  }
  // id desconhecido cai na padrao
  assert.equal(aparencia(3, 'naoExiste').ap, 0);
  const t = aparencias();
  assert.equal(t.length, MAX_NIVEL + 1);
  assert.equal(t[0], null);
  for (let k = 1; k <= MAX_NIVEL; k++) assert.equal(t[k].ap, 0);
});

test('aparencia da Minha: imagem do codigo, cor do corpo, modo e escala', () => {
  const px = modelo('xadrez', 0, 4);
  const m = { m: 0, b: 3, e: 0, px: codificar(px) };
  const a = aparencia(5, 'minha', m);
  assert.equal(a.ap, 5);
  assert.equal(a.modo, 0);
  assert.deepEqual(a.pig, [...BASES[3]]);
  assert.equal(a.textura, 0);
  assert.deepEqual(a.px, px);
  assert.ok(Math.abs(a.escala - ESCALAS[0] * fatorLadrilho(5)) < 1e-9);
  assert.match(a.hex, HEX);
  // na cor do nivel, a textura do nivel continua por baixo
  const b = aparencia(8, 'minha', { m: 1, b: 0, px: codificar(px) });
  assert.equal(b.textura, NIVEIS[7].textura);
  assert.equal(b.modo, 1);
  // codigo invalido = imagem vazia (nao quebra)
  const c = aparencia(2, 'minha', { px: 'lixo' });
  assert.deepEqual(c.px, imagemVazia());
  // a chave muda com a imagem (a composicao reenvia o atlas)
  assert.notEqual(aparencia(5, 'minha', { ...m, px: codificar(modelo('listras', 0, 4)) }).chave, a.chave);
  const t = aparencias({ 5: 'minha' }, { 5: m });
  assert.equal(t[5].ap, 5);
  assert.equal(t[4].ap, 0);
});

test('modelos gratis do editor: indices validos nos dois modos', () => {
  for (const id of MODELOS) {
    for (const modo of [0, 1]) {
      const px = modelo(id, modo, 2);
      assert.equal(px.length, 256);
      for (const v of px) assert.ok(v === 0 || v === 2);
      if (id === 'vazio') assert.ok(px.every((v) => v === 0));
      else assert.ok(px.some((v) => v === 2), id);
    }
  }
});

test('candidatas: 4 por nivel, ids unicos, dados validos e preco sugerido', () => {
  const ids = CANDIDATAS.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  for (let k = 1; k <= MAX_NIVEL; k++) assert.equal(CANDIDATAS.filter((c) => c.nivel === k).length, 4, `nivel ${k}`);
  const procs = new Set(Object.values(PROC));
  for (const c of CANDIDATAS) {
    assert.ok(c.nivel >= 1 && c.nivel <= MAX_NIVEL, c.id);
    assert.ok(c.nome && c.nota, c.id);
    assert.ok(c.tipo === 'proc' || c.tipo === 'pixel', c.id);
    assert.equal(c.preco, precoSugerido(c.tipo, c.nivel), c.id);
    assert.ok(c.id !== 'padrao' && c.id !== 'minha', c.id);
    if (c.tipo === 'pixel') {
      const px = pxDeLinhas(c.px);
      assert.ok(px, c.id);
      for (const v of px) assert.ok(v >= 0 && v < PALETA.length, c.id);
      assert.ok(px.some((v) => v), c.id);
      assert.ok(c.modo === 0 || c.modo === 1, c.id);
    } else {
      assert.ok(procs.has(c.proc), c.id);
      assert.match(c.cor, HEX);
    }
  }
});

test('candidatas: C+M+Y >= 0,25 (gosma do Duelo) e DeltaE >= 12 contra a padrao dos vizinhos', () => {
  const pad = aparencias();
  for (const c of CANDIDATAS) {
    const a = aparencia(c.nivel, c);
    assert.equal(a.ap, c.nivel, c.id);
    assert.match(a.hex, HEX, c.id);
    assert.ok(a.pig[0] + a.pig[1] + a.pig[2] >= 0.25, `${c.id}: C+M+Y`);
    for (const k of [c.nivel - 1, c.nivel + 1]) {
      if (k < 1 || k > MAX_NIVEL) continue;
      const e = deltaE(linearDeHex(a.hex), linearDeHex(pad[k].hex));
      assert.ok(e >= 12, `${c.id} contra o nivel ${k}: DeltaE ${e.toFixed(1)}`);
    }
  }
});

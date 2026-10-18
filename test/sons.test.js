// src/som: catalogo do Estudio, receitas, falas, arquivos CC0 e o tocador (sons.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIAS, POR_ID, PADRAO, LEGADO, normalizarEscolha, variante, arquivosDa } from '../src/som/catalogo.js';
import { RECEITAS } from '../src/som/receitas.js';
import { FRASES, FALAS_DO_JOGO, VOGAIS, COMBOS, tomDoNivel, falar } from '../src/som/falas.js';
import { ARQUIVOS } from '../src/som/arquivos.js';
import { criarSons, pesoDaEscolha, decodificar, FOLGA_FALA, PRIORIDADE, VALIDADE, taxaDoNivel } from '../src/som/sons.js';
import { criarAudio } from '../src/core/audio.js';
import { contextoAvulso, criarContextoFalso, esvaziar } from './apoio/audio-falso.js';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const DIR_ARQ = join(raiz, 'src/som/arquivos');

/** Audio destravado sobre o contexto falso. */
async function audioPronto() {
  const audio = criarAudio({ Contexto: criarContextoFalso(), janela: null, agendar: () => 0 });
  audio.iniciar();
  await esvaziar();
  return { audio, ctx: /** @type {any} */ (audio.ctx) };
}

test('catalogo: 3 a 4 variantes por categoria, ids unicos, cada variante toca algo (ou e silencio)', () => {
  assert.ok(CATEGORIAS.length >= 19);
  const ids = new Set();
  for (const c of CATEGORIAS) {
    assert.ok(!ids.has(c.id), c.id);
    ids.add(c.id);
    assert.ok(c.variantes.length >= 3 && c.variantes.length <= 4, `${c.id}: ${c.variantes.length} variantes`);
    assert.equal(new Set(c.variantes.map((v) => v.id)).size, c.variantes.length, `${c.id}: ids repetidos`);
    for (const v of c.variantes) {
      assert.ok(v.nome && v.desc, `${c.id}.${v.id} sem nome/desc`);
      const silencio = v.id === 'nenhum' || v.id === 'nenhuma';
      const especial = (c.id === 'falas' && v.id === 'balbucio') || c.id === 'musica';
      assert.ok(silencio || especial || v.receita || v.arquivo || v.arquivos, `${c.id}.${v.id} nao toca nada`);
      if (v.receita) assert.equal(typeof RECEITAS[v.receita], 'function', `${c.id}.${v.id}: receita ${v.receita}`);
    }
  }
  for (const id of ['soltar', 'pouso', 'fusao', 'combo', 'estouro', 'missil', 'choro', 'splat', 'trocar', 'alvo', 'interface', 'gotas', 'compra', 'nivelNovo', 'missao', 'palmas', 'fim', 'falas', 'musica']) {
    assert.ok(POR_ID[id], `falta a categoria ${id}`);
  }
  // "nenhum" onde faz sentido
  for (const id of ['combo', 'interface', 'falas']) assert.ok(POR_ID[id].variantes.some((v) => v.id === 'nenhum'), id);
  assert.ok(POR_ID.musica.variantes.some((v) => v.id === 'nenhuma'));
});

test('catalogo: o PADRAO (escolha do usuario) e valido, cabe no limite da build, e a 1a variante e o som de antes', () => {
  assert.deepEqual(Object.keys(PADRAO).sort(), CATEGORIAS.map((c) => c.id).sort());
  for (const c of CATEGORIAS) {
    const v = c.variantes.find((x) => x.id === PADRAO[c.id]);
    assert.ok(v, `${c.id}: ${PADRAO[c.id]}`);
    for (const a of arquivosDa(v)) assert.ok(ARQUIVOS[a], `${c.id}: arquivo ${a} existe`);
  }
  // o tools/empacotar.mjs falha acima de 150 KB de audio (era 120 ate as falas de 2026-10-18)
  const kb = pesoDaEscolha(PADRAO);
  assert.ok(kb > 0 && kb <= 150, `${kb} KB`);
  // a 1a variante de cada categoria continua sendo o som de antes de 2026-10-15
  const antes = { soltar: 'gotaAtual', pouso: 'pousoAtual', fusao: 'fusaoAtual', combo: 'comboBrilho', estouro: 'explodir', chacoalhar: 'descartar', alargar: 'graduar', compra: 'yes', nivelNovo: 'yes', missao: 'yes', fim: 'fimAtual' };
  for (const [cat, receita] of Object.entries(antes)) assert.equal(POR_ID[cat].variantes[0].receita, receita, cat);
});

test('catalogo: normalizarEscolha ignora lixo e variante = padrao quando o id nao existe', () => {
  assert.deepEqual(normalizarEscolha(null), { ...PADRAO });
  assert.deepEqual(normalizarEscolha('x'), { ...PADRAO });
  const e = normalizarEscolha({ soltar: 'pingo', fusao: 'nao-existe', inventada: 'x', musica: 3 });
  assert.equal(e.soltar, 'pingo');
  assert.equal(e.fusao, PADRAO.fusao);
  assert.equal(e.musica, PADRAO.musica);
  assert.ok(!('inventada' in e));
  assert.equal(variante('fusao', 'nao-existe').id, PADRAO.fusao);
  assert.equal(variante('nao-existe', 'x'), null);
});

test('arquivos: todo arquivo tem reserva, existe no indice e no disco, sem sobra, e esta no LICENCAS', () => {
  const licencas = readFileSync(join(raiz, 'LICENCAS.txt'), 'utf8');
  assert.ok(licencas.startsWith('Slime Merge'), 'titulo do LICENCAS');
  assert.ok(/CC0/.test(licencas) && /Kenney/.test(licencas));
  const usados = new Set();
  for (const c of CATEGORIAS) {
    for (const v of c.variantes) {
      const ids = arquivosDa(v);
      if (!ids.length) continue;
      assert.ok(v.reserva, `${c.id}.${v.id}: arquivo sem reserva`);
      if (c.id === 'falas') assert.ok(POR_ID.falas.variantes.some((x) => x.id === v.reserva && !x.arquivos), `${c.id}.${v.id}: reserva ${v.reserva}`);
      else assert.equal(typeof RECEITAS[v.reserva], 'function', `${c.id}.${v.id}: reserva ${v.reserva}`);
      if (v.arquivos) for (const f of Object.keys(v.arquivos)) assert.ok(FRASES[f], `${c.id}.${v.id}: frase ${f}`);
      for (const id of ids) {
        usados.add(id);
        const info = ARQUIVOS[id];
        assert.ok(info, `${id} fora de src/som/arquivos.js`);
        const p = join(DIR_ARQ, info.arquivo);
        assert.ok(existsSync(p), `${info.arquivo} nao existe`);
        assert.ok(Math.abs(statSync(p).size / 1024 - info.kb) < 0.11, `${id}: kb do indice`);
        assert.ok(info.inicio >= 0 && info.inicio < 0.08, `${id}: atraso ${info.inicio}`);
        assert.ok(info.dur > 0.05 && info.dur < 3, `${id}: dur ${info.dur}`);
        assert.ok(/^CC0 Kenney/.test(info.licenca), id);
        assert.ok(licencas.includes(info.arquivo), `${info.arquivo} fora do LICENCAS.txt`);
      }
    }
  }
  const noDisco = readdirSync(DIR_ARQ).filter((n) => n.endsWith('.mp3'));
  assert.deepEqual(noDisco.sort(), Object.values(ARQUIVOS).map((x) => x.arquivo).sort(), 'disco = indice');
  assert.deepEqual([...usados].sort(), Object.keys(ARQUIVOS).sort(), 'todo arquivo e usado por uma variante');
  const total = Object.values(ARQUIVOS).reduce((s, x) => s + x.kb, 0);
  // o repositorio guarda as duas vozes do locutor (a normal so no Estudio): 28 falas cada
  assert.ok(total < 350, `arquivos somam ${total} KB`);
});

test('receitas: todas rodam no contexto falso, agendam fontes, sem NaN, sem instante no passado', () => {
  const casos = [{}, { k: 1, forca: 1, nivel: 1, i: 0 }, { k: 4, forca: 3, nivel: 7, i: 5 }, { k: 30, forca: 9, nivel: 14, i: 40, mundo: true }];
  for (const [nome, fn] of Object.entries(RECEITAS)) {
    for (const p of casos) {
      const ctx = contextoAvulso();
      const dur = fn({ ctx, destino: ctx.destination }, 0.01, p);
      const combo = nome.startsWith('combo') && (p.k || 1) < 3;
      assert.ok(Number.isFinite(dur) && dur >= 0 && dur < 3, `${nome}: dur ${dur}`);
      if (!combo) {
        assert.ok(dur > 0, `${nome} ${JSON.stringify(p)}: duracao 0`);
        assert.ok(ctx.inicios.length >= 1, `${nome}: nenhuma fonte`);
      }
      assert.deepEqual(ctx.invalidos, [], `${nome}: valor invalido`);
      assert.deepEqual(ctx.passado, [], `${nome}: instante no passado`);
      for (const i of ctx.inicios) assert.ok(i.no.parada > i.t && i.no.parada <= 0.01 + dur + 0.2, `${nome}: a fonte para depois do som (${i.no.parada})`);
    }
  }
});

test('receitas: as palmas e o ruido sao deterministicos (sem Math.random)', () => {
  const texto = readFileSync(join(raiz, 'src/som/receitas.js'), 'utf8') + readFileSync(join(raiz, 'src/som/falas.js'), 'utf8');
  assert.ok(!/Math\.random/.test(texto));
  const tempos = () => {
    const ctx = contextoAvulso();
    RECEITAS.plateia({ ctx, destino: ctx.destination }, 0.01);
    return ctx.inicios.map((i) => Math.round(i.t * 1e6));
  };
  const a = tempos();
  assert.ok(a.length > 40, `${a.length} palmas`);
  assert.deepEqual(a, tempos());
});

test('falas: frases do jogo e do choro, formantes e tom pelo nivel', () => {
  for (const f of ['uau', 'iupi', 'oba', 'eek', 'aww', 'uhuu', 'missao', 'venceu', 'buaa', 'solucos']) assert.ok(FRASES[f], f);
  // as de 2026-10-18: largada, combo contado, eventos, resgate, reforcos, Duelo e sequencia
  for (const f of ['pronto', 'vai', 'abaixa', 'objetivo', 'depressa', 'tempo', 'socorro', 'alvo', 'acertou', 'recarga', 'parabens', 'perdeu', 'fogo']) assert.ok(FALAS_DO_JOGO.includes(f), f);
  for (const k of COMBOS) assert.ok(FALAS_DO_JOGO.includes('combo' + k), 'combo' + k);
  // o locutor de slime (o PADRAO) tem arquivo para todas as falas do jogo menos o "iupi"
  const loc = /** @type {any} */ (variante('falas', 'locutorSlime')).arquivos;
  for (const f of FALAS_DO_JOGO) if (f !== 'iupi') assert.ok(loc[f] && ARQUIVOS[loc[f]], `locutor: ${f}`);
  for (const f of FALAS_DO_JOGO) assert.ok(FRASES[f], f);
  assert.deepEqual([...VOGAIS.a], [800, 1200]);
  assert.deepEqual([...VOGAIS.i], [300, 2300]);
  for (let n = 1; n < 14; n++) assert.ok(tomDoNivel(n) > tomDoNivel(n + 1), 'pequenos agudos, grandes graves');
  assert.ok(tomDoNivel(1) > 400 && tomDoNivel(14) < 200);
  for (const f of Object.keys(FRASES)) {
    for (const nivel of [1, 6, 14]) {
      const ctx = contextoAvulso();
      const d = falar({ ctx, destino: ctx.destination }, 0.01, f, { nivel });
      assert.ok(d > 0.2 && d < 1.2, `${f}: ${d}`);
      assert.deepEqual(ctx.invalidos, [], f);
      assert.deepEqual(ctx.passado, [], f);
    }
  }
  const ctx = contextoAvulso();
  assert.equal(falar({ ctx, destino: ctx.destination }, 0, 'nao-existe'), 0);
});

test('varredura: todo {tipo: "som", nome} emitido em src/jogo existe no LEGADO ou nas categorias', () => {
  const lista = (/** @type {string} */ d) => readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? lista(p) : p.endsWith('.js') ? [p] : [];
  });
  const nomes = new Set(['choro', 'missil']);
  for (const p of lista(join(raiz, 'src/jogo'))) {
    const t = readFileSync(p, 'utf8');
    for (const m of t.matchAll(/tipo:\s*'som'\s*,\s*nome:\s*([^}]+)\}/g)) {
      for (const q of m[1].matchAll(/'([^']+)'/g)) nomes.add(q[1]);
    }
  }
  assert.ok(nomes.size >= 8, [...nomes].join(','));
  for (const n of nomes) assert.ok(LEGADO[n] || POR_ID[n], `som "${n}" sem categoria nem LEGADO`);
  for (const [n, x] of Object.entries(LEGADO)) {
    assert.ok(x.categoria ? POR_ID[x.categoria] : RECEITAS[/** @type {string} */ (x.receita)], `LEGADO.${n}`);
  }
});

test('sons: tocar categoria, nome de hoje e variante; nenhum fica quieto', async () => {
  const { audio, ctx } = await audioPronto();
  const sons = criarSons({ audio, escolha: { soltar: 'pingo', combo: 'nenhum', chacoalhar: 'chocalho' }, carregarSozinho: false });
  const n0 = ctx.inicios.length;
  assert.ok(sons.tocar('soltar', { nivel: 2 }) > 0);
  assert.ok(ctx.inicios.length > n0);
  const n1 = ctx.inicios.length;
  assert.equal(sons.tocar('combo', { k: 5 }), 0, 'nenhum');
  assert.equal(ctx.inicios.length, n1);
  assert.ok(sons.tocar('descartar') > 0, 'nome de hoje -> categoria chacoalhar');
  assert.ok(sons.tocar('febre') > 0, 'nome de hoje -> receita fixa');
  assert.ok(sons.tocar('choro', { nivel: 3 }) > 0);
  assert.ok(sons.tocar('missil') > 0);
  assert.equal(sons.tocar('nao-existe'), 0);
  assert.equal(sons.tocar('musica'), 0, 'a musica nao toca pelo tocar()');
  assert.ok(sons.tocarVariante('fusao', 'marimba', { k: 3 }) > 0);
  // efeitos no sfx, falas na voz
  const ultimo = ctx.inicios.at(-1).no;
  /** @param {any} no @returns {boolean} */
  const chega = (no, alvo, n = 0) => no === alvo || (n < 12 && (no.conectados || []).some((/** @type {any} */ x) => chega(x, alvo, n + 1)));
  assert.ok(chega(ultimo, audio.sfx));
  const n2 = ctx.inicios.length;
  assert.ok(sons.falar('oba', 5) > 0);
  assert.ok(ctx.inicios.slice(n2).some((/** @type {any} */ i) => chega(i.no, audio.voz)));
  sons.escolher('soltar', 'gloop');
  assert.equal(sons.escolha.soltar, 'gloop');
  sons.escolher('soltar', 'nao-existe');
  assert.equal(sons.escolha.soltar, PADRAO.soltar);
});

test('sons: uma fala por vez; a mais importante espera a vez, a menos importante e a velha somem', async () => {
  const { audio, ctx } = await audioPronto();
  /** @type {any[]} */
  const abaixou = [];
  const musica = { abaixar: (/** @type {number} */ f, /** @type {number} */ s) => abaixou.push([f, s]), iniciar() {}, parar() {} };
  // o balbucio fala todas as frases (o locutor do PADRAO so fala nos marcos)
  const sons = criarSons({ audio, musica, escolha: { falas: 'balbucio' }, carregarSozinho: false });
  ctx.currentTime = 10;
  const d = sons.falar('combo4', 4, 1.04);
  assert.ok(d > 0);
  assert.equal(abaixou.length, 1);
  assert.equal(abaixou[0][0], 0.7);
  assert.ok(abaixou[0][1] >= 0.6);
  // no meio da fala: o combo entra na fila, o nivel novo passa na frente dele e o combo seguinte some
  ctx.currentTime = 10 + d / 2;
  assert.equal(sons.falar('combo5', 4), 0, 'fila');
  assert.equal(sons.falar('oba', 5), 0, 'fila: mais importante');
  assert.equal(sons.falar('combo6', 4), 0, 'menos importante que a da fila');
  assert.equal(sons.passo(), 0, 'ainda falando');
  ctx.currentTime = 10 + d + FOLGA_FALA + 0.01;
  const n = ctx.inicios.length;
  const d2 = sons.passo();
  assert.ok(d2 > 0, 'a da fila fala quando a outra acaba');
  assert.ok(ctx.inicios.length > n);
  assert.equal(sons.passo(), 0, 'a fila esvaziou');
  // a fala que espera demais (mais que a VALIDADE dela) nao sai
  const t2 = ctx.currentTime;
  assert.equal(sons.falar('combo3', 3), 0);
  ctx.currentTime = t2 + d2 + FOLGA_FALA + VALIDADE[PRIORIDADE.combo3] + 0.1;
  assert.equal(sons.passo(), 0, 'o combo velho nao fala');
  // livre: fala na hora; o semLimite (o ▶ do Estudio) nao entra na fila
  assert.ok(sons.falar('uau', 8) > 0);
  ctx.currentTime += 0.1;
  assert.equal(sons.falar('pronto', 4), 0, 'fila');
  ctx.currentTime += 3.5;
  assert.equal(sons.passo(), 0, 'o "pronto" venceu esperando (mais de 3 s)');
  assert.ok(sons.falarCom('balbucio', 'vai', 4, true) > 0);
  assert.equal(sons.falar('nao-existe'), 0);
  sons.escolher('falas', 'nenhum');
  ctx.currentTime = 40;
  assert.equal(sons.falar('oba'), 0);
});

test('sons: o locutor fala mais agudo nos slimes pequenos e grave nos grandes; o combo sobe pela taxa', async () => {
  assert.equal(taxaDoNivel(8), 1);
  assert.ok(taxaDoNivel(1) > 1.2 && taxaDoNivel(1) < 1.25);
  assert.ok(taxaDoNivel(14) > 0.82 && taxaDoNivel(14) < 0.86);
  for (let k = 1; k < 14; k++) assert.ok(taxaDoNivel(k) > taxaDoNivel(k + 1));
  const { audio, ctx } = await audioPronto();
  const buscar = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(16) });
  const sons = criarSons({ audio, escolha: { falas: 'locutorSlime' }, base: 'http://x/', buscar, carregarSozinho: false });
  await sons.carregar();
  /** a velocidade do ultimo buffer que comecou */
  const taxa = () => {
    const no = ctx.inicios.at(-1).no;
    assert.equal(no.tipo, 'buffer');
    return no.playbackRate.final();
  };
  ctx.currentTime = 1;
  assert.ok(sons.falar('oba', 2) > 0);
  assert.equal(taxa(), taxaDoNivel(2));
  ctx.currentTime = 5;
  assert.ok(sons.falar('combo5', 4, 1.08) > 0);
  assert.equal(taxa(), 1.08);
  ctx.currentTime = 9;
  assert.ok(sons.falar('pronto') > 0);
  assert.equal(taxa(), 1, 'sem nivel: a voz de sempre');
  // o arquivo mais rapido dura menos
  ctx.currentTime = 13;
  const dLento = sons.falar('oba', 14);
  ctx.currentTime = 17;
  const dRapido = sons.falar('oba', 1);
  assert.ok(dRapido < dLento);
});

test('sons: carregar() espera os arquivos que ja estao a caminho', async () => {
  const { audio } = await audioPronto();
  /** @type {Function[]} */
  const soltar = [];
  const buscar = () => new Promise((ok) => soltar.push(() => ok({ ok: true, arrayBuffer: async () => new ArrayBuffer(16) })));
  const sons = criarSons({ audio, escolha: { falas: 'locutorSlime' }, base: 'http://x/', buscar, carregarSozinho: false });
  const a = sons.carregar();
  await esvaziar();
  let pronto = false;
  const b = sons.carregar().then((n) => { pronto = true; return n; });
  await esvaziar();
  assert.equal(pronto, false, 'a 2a espera as mesmas cargas');
  for (const f of soltar) f();
  const [na, nb] = await Promise.all([a, b]);
  assert.equal(na, nb);
  assert.ok(nb > 20);
  assert.equal(sons.estadoArquivo('vozParabensSlime'), 'pronto');
});

test('sons: arquivos so depois do pronto, so os da escolha, com a reserva enquanto nao chegam', async () => {
  const Ctx = criarContextoFalso({ resumeManual: true });
  const audio = criarAudio({ Contexto: Ctx, janela: null, agendar: () => 0 });
  /** @type {string[]} */
  const pedidos = [];
  const buscar = async (/** @type {string} */ url) => {
    pedidos.push(url);
    return { ok: true, arrayBuffer: async () => new ArrayBuffer(16) };
  };
  const sons = criarSons({ audio, escolha: { gotas: 'fichas', compra: 'atual', falas: 'locutorSlime' }, base: 'http://x/arq/', buscar });
  await esvaziar();
  assert.equal(pedidos.length, 0, 'nada antes do primeiro gesto');
  audio.iniciar();
  /** @type {any} */ (audio.ctx).concluirResume();
  await esvaziar();
  await esvaziar();
  const esperados = ['ficha', ...Object.values(/** @type {any} */ (variante('falas', 'locutorSlime')).arquivos)].map((id) => 'http://x/arq/' + ARQUIVOS[id].arquivo);
  assert.deepEqual(pedidos.sort(), esperados.sort(), 'so os arquivos da escolha');
  assert.equal(sons.estadoArquivo('ficha'), 'pronto');
  const ctx = /** @type {any} */ (audio.ctx);
  sons.tocar('gotas', { i: 0 });
  const ini = ctx.inicios.at(-1);
  assert.equal(ini.no.tipo, 'buffer');
  assert.equal(ini.offset, ARQUIVOS.ficha.inicio, 'pula o atraso do MP3');
  // o locutor so fala nos marcos; frase sem arquivo fica quieta
  ctx.currentTime = 5;
  assert.ok(sons.falar('oba') > 0);
  assert.equal(ctx.inicios.at(-1).offset, ARQUIVOS.vozNivelSlime.inicio);
  ctx.currentTime = 10;
  assert.equal(sons.falar('iupi'), 0);
  // carregar tudo (o Estudio) busca o resto
  await sons.carregar({ todos: true });
  assert.equal(pedidos.length, Object.keys(ARQUIVOS).length);
});

test('sons: sem o arquivo (carregando ou com falha) toca a reserva sintetizada', async () => {
  const { audio, ctx } = await audioPronto();
  const buscar = async () => { throw new Error('offline'); };
  const sons = criarSons({ audio, escolha: { compra: 'fichas', interface: 'clique', falas: 'locutor' }, buscar, carregarSozinho: false });
  const n0 = ctx.inicios.length;
  assert.ok(sons.tocar('compra') > 0, 'reserva: registradora');
  assert.ok(ctx.inicios.slice(n0).every((/** @type {any} */ i) => i.no.tipo !== 'buffer' || i.no.loop), 'nenhum buffer de arquivo');
  await sons.carregar();
  assert.equal(sons.estadoArquivo('fichas'), 'falhou');
  ctx.currentTime = 2;
  assert.ok(sons.tocar('compra') > 0);
  assert.ok(sons.tocar('interface') > 0);
  ctx.currentTime = 3;
  assert.ok(sons.falar('aww', 4) > 0, 'reserva das falas: o balbucio');
});

test('sons: o peso da escolha soma os KB dos arquivos usados', () => {
  // o que falta na escolha vem do PADRAO (falas e compra com arquivo): aqui, tudo sintetizado
  const sint = { falas: 'balbucio', compra: 'atual' };
  assert.equal(pesoDaEscolha(sint), 0);
  const kb = Object.values(/** @type {any} */ (variante('falas', 'locutor')).arquivos).reduce((s, id) => s + ARQUIVOS[/** @type {string} */ (id)].kb, 0);
  assert.ok(Math.abs(pesoDaEscolha({ ...sint, falas: 'locutor' }) - kb) < 0.06);
  assert.ok(Math.abs(pesoDaEscolha({ ...sint, falas: 'locutor', gotas: 'fichas' }) - kb - ARQUIVOS.ficha.kb) < 0.06);
});

test('decodificar: aceita decodeAudioData so com callback (Safari antigo), so com promessa, e falha', async () => {
  const buf = { duration: 1 };
  const soCallback = { decodeAudioData: (/** @type {any} */ d, /** @type {Function} */ ok) => { setTimeout(() => ok(buf), 0); return undefined; } };
  assert.equal(await decodificar(soCallback, new ArrayBuffer(4)), buf);
  const soPromessa = { decodeAudioData: () => Promise.resolve(buf) };
  assert.equal(await decodificar(soPromessa, new ArrayBuffer(4)), buf);
  const ambos = { decodeAudioData: (/** @type {any} */ d, /** @type {Function} */ ok) => { ok(buf); return Promise.resolve(buf); } };
  assert.equal(await decodificar(ambos, new ArrayBuffer(4)), buf);
  const quebra = { decodeAudioData: () => { throw new Error('nao'); } };
  await assert.rejects(decodificar(quebra, new ArrayBuffer(4)));
  const rejeita = { decodeAudioData: (/** @type {any} */ d, /** @type {any} */ ok, /** @type {Function} */ falha) => { falha(); return Promise.reject(new Error('x')); } };
  await assert.rejects(decodificar(rejeita, new ArrayBuffer(4)));
});

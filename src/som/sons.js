// Os sons escolhidos no Estudio (modelos/sons.html) tocando de verdade: categoria -> variante
// escolhida -> receita sintetizada ou arquivo (MP3 CC0 da Kenney).
//
// - tocar(nome, p): nome de categoria (soltar, fusao, gotas...) ou um nome de hoje (LEGADO:
//   descartar, yes, explodir...). p leva k (combo), forca, nivel, i (contagem de gotas).
// - falar(frase, nivel): no maximo uma fala a cada 1,2 s; abaixa a musica (0,7 por 0,6 s).
// - Arquivos: carregados devagar depois do `audio.pronto()` (so os da escolha, ou todos com
//   carregar({todos: true})); enquanto nao chegam, ou se falharem, toca a `reserva`.
//   O start() pula o atraso do codificador medido no MP3 (ARQUIVOS[id].inicio).

import { CATEGORIAS, POR_ID, LEGADO, normalizarEscolha, variante, arquivosDa } from './catalogo.js';
import { RECEITAS } from './receitas.js';
import { falar as falarSintese, FRASES } from './falas.js';
import { ARQUIVOS } from './arquivos.js';

/** Intervalo minimo entre duas falas, s. */
export const INTERVALO_FALA = 1.2;
/** Volume dos arquivos (os MP3 estao em -18 LUFS; as receitas sao mais baixas). */
const VOL_ARQUIVO = { sfx: 0.55, voz: 0.5 };

/**
 * decodeAudioData com promessa e com callback (Safari antigo so tem o callback).
 * @param {any} ctx
 * @param {ArrayBuffer} dados
 * @returns {Promise<AudioBuffer>}
 */
export function decodificar(ctx, dados) {
  return new Promise((ok, falha) => {
    let feito = false;
    const sim = (/** @type {AudioBuffer} */ b) => { if (!feito) { feito = true; ok(b); } };
    const nao = (/** @type {any} */ e) => { if (!feito) { feito = true; falha(e || new Error('decodeAudioData')); } };
    try {
      const r = ctx.decodeAudioData(dados, sim, nao);
      if (r && typeof r.then === 'function') r.then(sim, nao);
    } catch (e) {
      nao(e);
    }
  });
}

/**
 * @param {object} o
 * @param {ReturnType<typeof import('../core/audio.js').criarAudio>} o.audio
 * @param {Record<string, string>} [o.escolha] categoria -> variante (o resto vem do PADRAO)
 * @param {string|URL} [o.base] pasta dos arquivos (padrao: src/som/arquivos/)
 * @param {{abaixar: (f: number, s?: number) => void, iniciar: (peca: string) => void, parar: (rapido?: boolean) => void}} [o.musica]
 * @param {(url: string) => Promise<any>} [o.buscar] padrao fetch
 * @param {boolean} [o.carregarSozinho] carrega os arquivos da escolha depois do pronto (padrao true)
 */
export function criarSons(o) {
  const audio = o.audio;
  const escolha = normalizarEscolha(o.escolha);
  const base = String(o.base || new URL('./arquivos/', import.meta.url));
  const buscar = o.buscar || ((/** @type {string} */ url) => fetch(url));
  const musica = o.musica || null;
  /** @type {Map<string, any>} id -> AudioBuffer | 'carregando' | 'falhou' */
  const buffers = new Map();
  let ultimaFala = -Infinity;
  let pronto = false;

  audio.pronto().then((ok) => {
    pronto = !!ok;
    if (pronto && o.carregarSozinho !== false) carregar();
  });

  /**
   * Busca e decodifica um arquivo (uma vez).
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async function carregarUm(id) {
    const info = ARQUIVOS[id];
    const ctx = audio.ctx;
    if (!info || !ctx) return false;
    const b = buffers.get(id);
    if (b === 'carregando') return false;
    if (b && b !== 'falhou') return true;
    buffers.set(id, 'carregando');
    try {
      const r = await buscar(base.replace(/\/?$/, '/') + info.arquivo);
      if (!r || r.ok === false) throw new Error('arquivo ' + id);
      const buf = await decodificar(ctx, await r.arrayBuffer());
      buffers.set(id, buf);
      return true;
    } catch {
      buffers.set(id, 'falhou');
      return false;
    }
  }

  /**
   * Carrega os arquivos da escolha (ou todos). So depois do primeiro gesto (pronto).
   * @param {{todos?: boolean}} [op]
   * @returns {Promise<number>} quantos estao prontos
   */
  async function carregar(op = {}) {
    if (!(await audio.pronto())) return 0;
    const ids = new Set();
    for (const c of CATEGORIAS) {
      const lista = op.todos ? c.variantes : [variante(c.id, escolha[c.id])];
      for (const v of lista) for (const id of arquivosDa(v)) ids.add(id);
    }
    const r = await Promise.all([...ids].map((id) => carregarUm(id)));
    return r.filter(Boolean).length;
  }

  /** @param {string} id */
  const bufferPronto = (id) => {
    const b = buffers.get(id);
    return b && b !== 'carregando' && b !== 'falhou' ? b : null;
  };

  /**
   * Toca um arquivo; sem ele (ainda), dispara a carga e devolve 0.
   * @param {string} id
   * @param {'sfx'|'voz'} destino
   * @param {string} chave
   * @param {number} max
   * @param {number} [vol] calibragem da variante
   */
  function tocarArquivo(id, destino, chave, max, vol = 1) {
    const buf = bufferPronto(id);
    if (!buf) {
      if (pronto && !buffers.has(id)) carregarUm(id);
      return 0;
    }
    return audio.vozBuffer(buf, { inicio: (ARQUIVOS[id] && ARQUIVOS[id].inicio) || 0, destino, vol: VOL_ARQUIVO[destino] * vol, chave, max });
  }

  /**
   * Toca a variante `varId` da categoria `catId` (o ▶ do Estudio usa direto).
   * @param {string} catId
   * @param {string} varId
   * @param {any} [p]
   * @returns {number} duracao, s
   */
  function tocarVariante(catId, varId, p = {}) {
    const cat = POR_ID[catId];
    const v = variante(catId, varId);
    if (!cat || !v) return 0;
    if (catId === 'falas') return falarCom(v.id, p.frase || 'oba', p.nivel, true);
    if (catId === 'musica') return 0;
    const destino = cat.voz ? 'voz' : 'sfx';
    const op = { destino, chave: catId, max: cat.max || 3 };
    let dur = 0;
    if (v.receita) dur = audio.tocarReceita(v.receita, p, op);
    if (v.arquivo) {
      const d = tocarArquivo(v.arquivo, destino, catId + ':arquivo', op.max, v.vol || 1);
      if (d) dur = Math.max(dur, d);
      else if (v.reserva) dur = Math.max(dur, audio.tocarReceita(v.reserva, p, op));
    }
    return dur;
  }

  /**
   * Toca pelo nome: categoria (a variante escolhida) ou um nome de hoje (LEGADO).
   * @param {string} nome
   * @param {any} [p]
   * @returns {number} duracao, s
   */
  function tocar(nome, p = {}) {
    if (POR_ID[nome]) return nome === 'falas' ? falar(p.frase || 'oba', p.nivel) : tocarVariante(nome, escolha[nome], p);
    const leg = LEGADO[nome];
    if (!leg) return 0;
    if (leg.categoria) return tocarVariante(leg.categoria, escolha[leg.categoria], p);
    return leg.receita ? audio.tocarReceita(leg.receita, p, { chave: nome, max: 2 }) : 0;
  }

  /**
   * Fala com uma variante de falas especifica.
   * @param {string} varId balbucio | locutor | locutorSlime | nenhum
   * @param {string} frase
   * @param {number} [nivel]
   * @param {boolean} [semLimite] ignora o intervalo de 1,2 s (o ▶ do Estudio)
   */
  function falarCom(varId, frase, nivel, semLimite = false) {
    const v = variante('falas', varId);
    if (!v || v.id === 'nenhum' || !FRASES[frase]) return 0;
    const agora = audio.agora();
    if (!semLimite && agora - ultimaFala < INTERVALO_FALA) return 0;
    let dur = 0;
    if (v.arquivos) {
      const id = v.arquivos[frase];
      // o locutor so fala nos marcos: frase sem arquivo fica quieta
      if (!id) return 0;
      dur = tocarArquivo(id, 'voz', 'falas', 1);
      if (!dur && v.reserva) dur = audio.tocarReceita((vv, t) => falarSintese(vv, t, frase, { nivel }), {}, { destino: 'voz', chave: 'falas', max: 1 });
    } else {
      dur = audio.tocarReceita((vv, t) => falarSintese(vv, t, frase, { nivel }), {}, { destino: 'voz', chave: 'falas', max: 1 });
    }
    if (dur > 0) {
      ultimaFala = agora;
      if (musica) musica.abaixar(0.7, Math.max(0.6, dur));
    }
    return dur;
  }

  /**
   * O slime fala (uau, iupi, oba, eek, aww, uhuu, missao, venceu) com a voz escolhida.
   * @param {string} frase
   * @param {number} [nivel] tom do slime (1 agudo ... 13 grave)
   */
  function falar(frase, nivel) {
    return falarCom(escolha.falas, frase, nivel);
  }

  return {
    tocar,
    tocarVariante,
    falar,
    falarCom,
    carregar,
    /** escolha atual (categoria -> variante), ja normalizada */
    get escolha() { return { ...escolha }; },
    /**
     * Troca a variante de uma categoria (o Estudio); a musica troca de peca na hora.
     * @param {string} catId
     * @param {string} varId
     */
    escolher(catId, varId) {
      const n = normalizarEscolha({ ...escolha, [catId]: varId });
      escolha[catId] = n[catId];
      if (pronto) for (const id of arquivosDa(variante(catId, escolha[catId]))) carregarUm(id);
      if (catId === 'musica' && musica) {
        if (escolha.musica === 'nenhuma') musica.parar();
      }
    },
    /** Comeca a musica escolhida (ou para, se for "nenhuma"). */
    iniciarMusica() {
      if (!musica) return;
      if (escolha.musica === 'nenhuma') musica.parar();
      else musica.iniciar(escolha.musica);
    },
    /** KB dos arquivos que a escolha usa. */
    pesoKb() {
      return pesoDaEscolha(escolha);
    },
    /** Estado de um arquivo: 'pronto' | 'carregando' | 'falhou' | 'nao'. */
    estadoArquivo(id) {
      const b = buffers.get(id);
      return !b ? 'nao' : typeof b === 'string' ? b : 'pronto';
    },
    /** Receitas, para quem quer medir offline. */
    receitas: RECEITAS,
  };
}

/**
 * KB dos arquivos que uma escolha usa (o que iria para a build).
 * @param {Record<string, string>} escolha
 */
export function pesoDaEscolha(escolha) {
  const e = normalizarEscolha(escolha);
  const ids = new Set();
  for (const c of CATEGORIAS) for (const id of arquivosDa(variante(c.id, e[c.id]))) ids.add(id);
  let kb = 0;
  for (const id of ids) kb += (ARQUIVOS[id] && ARQUIVOS[id].kb) || 0;
  return Math.round(kb * 10) / 10;
}

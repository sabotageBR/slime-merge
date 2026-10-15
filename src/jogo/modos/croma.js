// Modelo 2: Croma (Suika de pigmento, sem fim).
// Fundem slimes do mesmo TAMANHO, de qualquer cor; a cor do resultado e a mistura fisica
// (Kubelka-Munk): azul + amarelo vira verde de verdade, com o redemoinho das duas tintas
// se misturando no corpo. Caem primarias + branco (e um preto raro, que e perigo).
// Croma-dex: ~40 cores com nome para descobrir. Misturar demais da LAMA: slime marrom e
// ranzinza que so funde com outra lama.

import { criarSoltar } from '../soltar.js';
import { MAX_NIVEL, particulasNivel, pontosNivel } from '../niveis.js';
import { pintar, pigmentoMedio } from '../../cor/difusao.js';
import { hexDaMistura, TINTAS } from '../../cor/km.js';
import { CORES, nomear, ehLama, nomeDe } from '../cores.js';

const PESOS_TAM = [34, 30, 22, 14];
const BASE = [
  { pig: TINTAS.ciano, p: 30 },
  { pig: TINTAS.magenta, p: 30 },
  { pig: TINTAS.amarelo, p: 30 },
  { pig: TINTAS.branco, p: 8 },
];

/** @param {{ semente?: number, salvo?: any, toque?: boolean, lang?: string }} [o] */
export function criarModo(o = {}) {
  const salvo = o.salvo || {};
  const lang = o.lang || 'en';
  /** @type {Set<string>} */
  const dex = new Set(salvo.dex || ['ciano', 'magenta', 'amarelo', 'branco']);
  let ultima = '';

  function criar(S, J, spec, x, y, preso) {
    const s = S.mundo.criarSlime({ x, y, n: particulasNivel(spec.nivel), material: 'gelatina', nivel: spec.nivel, preso });
    if (!s) return null;
    pintar(S.mundo, s, spec.pig);
    s.dados.hex = hexDaMistura(spec.pig);
    s.dados.lama = !!spec.lama;
    if (spec.lama) s.dados.expr = 'bravo';
    return s;
  }

  const jogo = criarSoltar({
    id: 'croma',
    janela: [-7.2, -1.6, 7.2, 15.0],
    campoJanela: [-7.6, -1.4, 7.6, 15.2],
    sortear(S) {
      let x = S.rng() * 100;
      let nivel = 1;
      for (let k = 0; k < PESOS_TAM.length; k++) {
        if (x < PESOS_TAM[k]) { nivel = k + 1; break; }
        x -= PESOS_TAM[k];
      }
      if (S.tempo > 60 && S.rng() < 0.03) return { nivel, pig: TINTAS.preto.slice() };
      let y = S.rng() * 98;
      for (const b of BASE) {
        if (y < b.p) return { nivel, pig: b.pig.slice() };
        y -= b.p;
      }
      return { nivel, pig: TINTAS.branco.slice() };
    },
    criar,
    fusao(S, a, b) {
      if (a.nivel !== b.nivel || a.nivel >= MAX_NIVEL) return 0;
      if (!!a.dados.lama !== !!b.dados.lama) return 0;
      return a.nivel + 1;
    },
    fundir(S, J, base, outro, k, px, py, combo) {
      const m = S.mundo;
      const lama = !!base.dados.lama;
      const saidas = m.fundir(base, outro, { px, py, nAlvo: particulasNivel(k) });
      base.nivel = k;
      // o pigmento das duas fica nas particulas: a mistura acontece no corpo, de verdade
      base.dados.classificar = lama ? 0 : 2.2;
      base.dados.hex = hexDaMistura(pigmentoMedio(m, base));
      base.dados.expr = lama ? 'bravo' : 'feliz';
      base.dados.exprT = lama ? 0 : 0.7;
      const ganho = pontosNivel(k) * combo;
      J.pontos += ganho;
      if (k > J.maxNivel) J.maxNivel = k;
      S.eventos.push({ tipo: 'fusao', x: px, y: py, cor: base.dados.hex, combo, brilhos: Math.min(10, saidas.length / 3), nivel: k });
      S.eventos.push({ tipo: 'texto', x: px, y: py - 0.2, texto: '+' + ganho, cor: '#ffffff', escala: 0.55 });
    },
    // a mistura e mais rapida que a do Merge: o jogador quer ver a cor nova em ~2 s
    difusao: { taxa: 5 },
    passo(S, dt) {
      const m = S.mundo;
      for (const s of m.slimes) {
        if (!s.ativo || !(s.dados.classificar > 0)) continue;
        s.dados.classificar -= dt;
        s.dados.hex = hexDaMistura(pigmentoMedio(m, s));
        if (s.dados.classificar > 0 && s.misturando) continue;
        s.dados.classificar = 0;
        const pig = pigmentoMedio(m, s);
        const J = S.jogadores[0];
        if (ehLama(pig)) {
          // misturou demais: vira lama (ranzinza, so funde com lama)
          s.dados.lama = true;
          s.dados.expr = 'bravo';
          S.eventos.push({ tipo: 'texto', x: s.cx, y: s.cy + 1.2, texto: nomeDe(CORES[CORES.length - 1], lang), cor: '#b08060', escala: 0.9 });
          S.eventos.push({ tipo: 'som', nome: 'recusa' });
          if (!dex.has('lama')) dex.add('lama');
          continue;
        }
        const { cor, d } = nomear(pig);
        if (d > 9) continue;
        if (!dex.has(cor.id)) {
          dex.add(cor.id);
          ultima = cor.id;
          const bonus = 50 * s.nivel;
          J.pontos += bonus;
          S.eventos.push({ tipo: 'texto', x: s.cx, y: s.cy + 1.4, texto: nomeDe(cor, lang) + '!', cor: hexDaMistura(cor.pig), escala: 1.2 });
          S.eventos.push({ tipo: 'texto', x: s.cx, y: s.cy + 0.4, texto: '+' + bonus, cor: '#ffd23a', escala: 0.7 });
          S.eventos.push({ tipo: 'som', nome: 'yes' });
        }
      }
    },
    pigDe: (S, spec) => spec.pig,
    escalaDe: (spec) => 0.62 + spec.nivel * 0.08,
    hud() {
      const vistos = CORES.filter((c) => dex.has(c.id));
      const recentes = (ultima ? [CORES.find((c) => c.id === ultima)] : []).concat(vistos.filter((c) => c.id !== ultima)).slice(0, 7);
      return {
        metaHtml: '<div class="evolucao dex">' + recentes.map((c) => `<i style="width:1.25em;height:1.25em;background:${hexDaMistura(c.pig)}"></i>`).join('')
          + `<b class="dexConta">${dex.size}/${CORES.length}</b></div>`,
        colecao: CORES.map((c) => ({ cor: hexDaMistura(c.pig), visto: dex.has(c.id), nome: nomeDe(c, lang) })),
      };
    },
    salvar(S) {
      const J = S.jogadores[0];
      return {
        pontos: J.pontos, tempo: S.tempo, fila: J.fila, poderes: J.poderes, maxNivel: J.maxNivel, alargado: J.pote.alargado,
        slimes: S.mundo.vivos().filter((s) => !s.preso).map((s) => [s.nivel, +s.cx.toFixed(2), +s.cy.toFixed(2), pigmentoMedio(S.mundo, s).map((v) => +v.toFixed(3)), s.dados.lama ? 1 : 0]),
      };
    },
    salvarMeta: () => ({ dex: [...dex] }),
    restaurar(S, p) {
      const J = S.jogadores[0];
      J.pontos = p.pontos || 0;
      S.tempo = p.tempo || 0;
      if (p.fila) J.fila = p.fila;
      if (p.poderes) J.poderes = p.poderes;
      J.maxNivel = p.maxNivel || 1;
      if (p.alargado) J.pote.alargar();
      for (const [k, x, y, pig, lama] of (p.slimes || []).slice().sort((a, b) => a[2] - b[2])) {
        const s = criar(S, J, { nivel: k, pig, lama: !!lama }, x, y, false);
        if (s) { s.dados.pote = 0; s.dados.solto = -10; }
      }
    },
  }, o);
  return jogo;
}

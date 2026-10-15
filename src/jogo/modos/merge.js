// Modelo 1: Merge Lab (sem fim, o mais perto do conceito).
// Mirar e soltar; dois iguais fundem no proximo nivel (12 niveis). O slime e gelatina de
// verdade: a pilha assenta e "derrete" para o formato do pote; a cor do nivel novo nasce na
// costura e avanca pelo corpo (frente de transmutacao). Reforcos da referencia: Trocar,
// Chacoalhar, Alargar (talas de madeira) e Mira; premios de marco: Calor (escoa), Gelo
// (trava), Tesoura (divide) e Tinta (sobe um nivel). Coringa prisma funde com qualquer nivel.

import { criarSoltar, PREMIOS, TEXTO_COMBO, COR_COMBO } from '../soltar.js';
import { NIVEIS, MAX_NIVEL, particulasNivel, pontosNivel, nivel } from '../niveis.js';
import { iniciarFrente, pintar } from '../../cor/difusao.js';
import { hexDaMistura } from '../../cor/km.js';

const PESOS = [30, 26, 20, 14, 10];
const PRISMA = { pig: [0.06, 0.04, 0.08, 0], textura: 6 };
const HEX = NIVEIS.map((n) => hexDaMistura(n.pig));

/** Pinta o slime pelo nivel e liga a textura do nivel (se tiver). */
export function colorir(m, s, def) {
  pintar(m, s, def.pig);
  s.dados.textura = def.textura || 0;
  s.dados.texturaT = 1;
}

/**
 * @param {{ semente?: number, salvo?: any, toque?: boolean, visto?: number, regra?: { id: string, meta: number }|null,
 *   vitrine?: number, cesto?: string }} [o]
 *   regra: desafio do dia (src/jogo/perfil.js REGRAS); visto: maior nivel ja descoberto (perfil)
 */
export function criarModo(o = {}) {
  const salvo = o.salvo || {};
  let visto = Math.max(o.visto || 1, salvo.visto || 1);
  const regra = o.regra ? o.regra.id : '';

  function criar(S, J, spec, x, y, preso) {
    const s = S.mundo.criarSlime({ x, y, n: particulasNivel(spec.nivel), material: 'gelatina', nivel: spec.nivel, preso });
    if (!s) return null;
    s.dados.prisma = !!spec.prisma;
    s.dados.hex = spec.prisma ? '#ffffff' : HEX[spec.nivel - 1];
    colorir(S.mundo, s, spec.prisma ? PRISMA : nivel(spec.nivel));
    return s;
  }

  const jogo = criarSoltar({
    id: 'merge',
    janela: [-7.2, -1.6, 7.2, 15.0],
    campoJanela: [-7.6, -1.4, 7.6, 15.2],
    premios: true,
    sortear(S) {
      const chancePrisma = regra === 'prisma' ? 0.15 : S.tempo > 90 ? 0.03 : 0;
      if (S.rng() < chancePrisma) return { nivel: 2, prisma: true };
      const pesos = regra === 'pequenos' ? PESOS.slice(0, 3) : PESOS;
      let x = S.rng() * pesos.reduce((a, b) => a + b, 0);
      for (let k = 0; k < pesos.length; k++) {
        if (x < pesos[k]) return { nivel: k + 1 };
        x -= pesos[k];
      }
      return { nivel: 1 };
    },
    passo(S, dt) {
      // desafio "chacoalho": o pote sacode sozinho a cada 25 s
      if (regra !== 'chacoalho') return;
      S.extra.tChac = (S.extra.tChac || 0) + dt;
      if (S.extra.tChac >= 25) { S.extra.tChac = 0; S.jogadores[0].pote.sacudir(); S.eventos.push({ tipo: 'som', nome: 'descartar' }); }
    },
    criar,
    fusao(S, a, b) {
      if (a.dados.prisma && b.dados.prisma) return Math.max(a.nivel, b.nivel) + 1;
      if (a.dados.prisma) return b.nivel + 1;
      if (b.dados.prisma) return a.nivel + 1;
      return a.nivel === b.nivel ? a.nivel + 1 : 0;
    },
    fundir(S, J, base, outro, k, px, py, combo) {
      const m = S.mundo;
      if (k > MAX_NIVEL) {
        // dois do ultimo nivel somem numa explosao de pontos
        m.remover(outro);
        m.remover(base);
        J.pontos += pontosNivel(MAX_NIVEL) * 4 * combo;
        S.eventos.push({ tipo: 'estouro', x: px, y: py, cor: HEX[MAX_NIVEL - 1] });
        S.eventos.push({ tipo: 'texto', x: px, y: py + 1.5, texto: 'perfeito', cor: '#ffd23a', escala: 1.8 });
        return;
      }
      const saidas = m.fundir(base, outro, { px, py, nAlvo: particulasNivel(k) });
      base.nivel = k;
      base.dados.prisma = false;
      base.dados.hex = HEX[k - 1];
      base.dados.expr = 'feliz';
      base.dados.exprT = 0.7;
      const def = nivel(k);
      // a cor nova avanca pelo corpo; a textura do nivel aparece aos poucos
      iniciarFrente(m, base, def.pig, px, py);
      base.dados.textura = def.textura || 0;
      base.dados.texturaT = 0;
      const ganho = pontosNivel(k) * combo;
      J.pontos += ganho;
      if (k > visto) visto = k;
      if (k > J.maxNivel) {
        J.maxNivel = k;
        // marco: um premio fisico a cada nivel novo a partir do 5
        if (k >= 5 && !J.premio) J.premio = PREMIOS[Math.floor(S.rng() * PREMIOS.length)];
      }
      S.eventos.push({
        tipo: 'fusao', x: px, y: py, cor: HEX[k - 1], combo, brilhos: Math.min(12, saidas.length / 3), nivel: k,
        texto: combo >= 2 || k >= 5 ? TEXTO_COMBO[Math.min(3, combo - 1)] : '',
        corTexto: COR_COMBO[Math.min(3, combo - 1)], escala: 1 + Math.min(0.6, (combo - 1) * 0.2),
      });
      if (combo >= 2) S.eventos.push({ tipo: 'texto', x: px + 1.6, y: py + 0.4, texto: 'x' + combo, cor: '#ffffff', escala: 0.9, grupo: 'mult' });
      S.eventos.push({ tipo: 'texto', x: px, y: py - 0.2, texto: '+' + ganho, cor: '#ffffff', escala: 0.55, grupo: 'pts' });
    },
    aplicar(S, J, s, id) {
      const m = S.mundo;
      if (id === 'tesoura') {
        if (s.nivel <= 1) {
          S.eventos.push({ tipo: 'estouro', x: s.cx, y: s.cy, cor: s.dados.hex });
          m.remover(s);
        } else {
          const k = s.nivel - 1;
          const pedacos = m.dividir(s, s.cx, s.cy, 1, 0);
          for (const p of pedacos) {
            m.redimensionar(p, particulasNivel(k), p.cx, p.cy);
            p.nivel = k;
            p.dados.pote = J.idx;
            p.dados.hex = HEX[k - 1];
            p.dados.solto = -10;
            p.dados.textura = nivel(k).textura || 0;
            p.dados.texturaT = 1;
          }
          S.eventos.push({ tipo: 'som', nome: 'recusa' });
        }
        return true;
      }
      if (id === 'tinta') {
        if (s.nivel < MAX_NIVEL) {
          const k = s.nivel + 1;
          // a gota de tinta entra pelo alto do slime e a cor nova avanca pelo corpo
          m.redimensionar(s, particulasNivel(k), s.cx, s.topo);
          s.nivel = k;
          s.dados.hex = HEX[k - 1];
          iniciarFrente(m, s, nivel(k).pig, s.cx, s.topo - 0.3);
          s.dados.textura = nivel(k).textura || 0;
          s.dados.texturaT = 0;
          S.eventos.push({ tipo: 'fusao', x: s.cx, y: s.topo, cor: HEX[k - 1], combo: 1, brilhos: 6 });
        }
        return true;
      }
      return false;
    },
    // vitrine (depuracao): nada transborda, a cena fica parada para o print
    transbordou: o.vitrine ? () => true : undefined,
    pigDe: (S, spec) => (spec.prisma ? PRISMA : nivel(spec.nivel)).pig,
    escalaDe: (spec) => 0.62 + spec.nivel * 0.08,
    hud() {
      return { evolucao: NIVEIS.map((n, k) => ({ k, visto: k + 1 <= visto, cor: HEX[k], textura: n.textura || 0 })) };
    },
    salvar(S) {
      const J = S.jogadores[0];
      return {
        pontos: J.pontos, tempo: S.tempo, fila: J.fila, poderes: J.poderes, premio: J.premio, maxNivel: J.maxNivel,
        alargado: J.pote.alargado,
        slimes: S.mundo.vivos().filter((s) => !s.preso).map((s) => [s.nivel, +s.cx.toFixed(2), +s.cy.toFixed(2), s.dados.prisma ? 1 : 0]),
      };
    },
    salvarMeta: () => ({ visto }),
    restaurar(S, p) {
      const J = S.jogadores[0];
      J.pontos = p.pontos || 0;
      S.tempo = p.tempo || 0;
      if (p.fila) J.fila = p.fila;
      if (p.poderes) J.poderes = p.poderes;
      J.premio = p.premio || '';
      J.maxNivel = p.maxNivel || 1;
      if (p.alargado) J.pote.alargar();
      for (const [k, x, y, prisma] of (p.slimes || []).slice().sort((a, b) => a[2] - b[2])) {
        const s = criar(S, J, { nivel: k, prisma }, x, y, false);
        if (s) { s.dados.pote = 0; s.dados.solto = -10; }
      }
    },
  }, o);
  if (regra === 'semPoderes') {
    for (const J of jogo.S.jogadores) { J.poderes = { trocar: 0, chacoalhar: 0, alargar: 0, mira: 0 }; J.semVideo = true; }
  }
  if (o.vitrine) {
    // depuracao: os niveis altos (texturas) e o coringa ja no pote
    const S = jogo.S;
    const J = S.jogadores[0];
    const lista = o.vitrine === 4
      ? [[6, -2.2, 1.7], [5, 1.9, 1.5], [4, -2.6, 5.2], [3, 0.2, 4.8], [2, 2.8, 4.6], [1, -1.2, 7.6], [7, 1.6, 8.2]]
      : o.vitrine === 3 ? [[11, 0, 3.4]] : o.vitrine === 2 ? [[12, 0, 3.8]] : [[10, -1.6, 2.8], [9, 2.2, 2.6], [8, -1.6, 8], [7, 2.2, 7.6]];
    for (const [k, x, y] of lista) {
      const s = criar(S, J, { nivel: k }, x, y, false);
      if (s) { s.dados.pote = 0; s.dados.solto = -10; }
    }
    const p = o.vitrine > 1 ? null : criar(S, J, { nivel: 3, prisma: true }, 0.3, 11.5, false);
    if (p) { p.dados.pote = 0; p.dados.solto = -10; }
  }
  return jogo;
}

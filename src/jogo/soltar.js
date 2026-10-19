// Motor dos jogos de soltar (Merge Lab, Croma, Duelo): um mundo, um ou dois jogadores, cada
// um com pote, fila, reforcos, combo e pontos. O modo entra com as regras (o que cai, quem
// funde com quem, o que acontece na fusao, o que mais roda por quadro).
// Logica pura: sem DOM, sem relogio, sem Math.random.

import { criarMundo, RAMPA_VEL } from '../fisica/mundo.js';
import { criarPote, COMBO_JANELA, ADER_T } from './pote.js';
import { criarRng } from '../core/rng.js';
import { difundir } from '../cor/difusao.js';
import { sentir, pancada, PANCADA } from './humor.js';

export const BASE = ['trocar', 'chacoalhar', 'alargar', 'mira'];
export const PREMIOS = ['calor', 'gelo', 'tesoura', 'tinta'];
export const TEXTO_COMBO = ['good', 'great', 'slimey', 'incrivel'];
export const COR_COMBO = ['#7fe36b', '#5fd9ff', '#ffd23a', '#ff6fd8'];
/** Mira: o alvo chora ate `choro` s, o missil voa e explode em `impacto` s (animacao rapida). */
export const MISSIL = Object.freeze({ choro: 0.3, impacto: 0.75 });
/**
 * Fusao animada (Merge e Duelo; pedido do usuario em 2026-10-17: "eu queria ver a combinacao
 * sendo feita"). Fases:
 *  - `atrai` (`atrai` s, +`atraiExtra` por quem entra, ate `atraiMax`): os iguais se abracam,
 *    moles e puxados para o centro do grupo; entra quem encosta ou chega a `folga` u de um membro
 *    (grande | vao | grande com a gota no meio: os tres juntos);
 *  - `funde` (`funde` s): um corpo so, que escoa e encolhe aos poucos ate o nivel novo;
 *  - `comemora` (`comemora` s, so no ultimo nivel; 2026-10-18): o 14 nasce de verdade (cartao,
 *    funil, gotas), incha, treme o rosto e estoura (o super slime; o pote fica livre de novo).
 * Tudo deterministico (o mesmo da fisica: nada de rng aqui).
 */
export const FUSAO = Object.freeze({
  atrai: 0.22, atraiExtra: 0.12, atraiMax: 0.45, funde: 0.4, comemora: 2.0,
  folga: 0.5, acel: 25, vmax: 2.5, mole: 0.6, rampa: 2.5, incha: 0.05,
});

/**
 * @typedef {Object} Regras
 * @property {string} id
 * @property {number[]} [potes]                      centros x dos potes (1 ou 2 jogadores)
 * @property {number[]} janela
 * @property {number[]} campoJanela
 * @property {(S: any, J: any) => any} sortear       proximo da fila
 * @property {(S: any, J: any, spec: any, x: number, y: number, preso: boolean) => any} criar
 * @property {(S: any, a: any, b: any) => number} fusao   nivel novo (0 = nao funde)
 * @property {(S: any, J: any, base: any, outro: any, k: number, px: number, py: number, combo: number) => boolean|void} [fundir]
 *   fusao na hora (sem `animar`: Croma)
 * @property {boolean} [animar]   fusao animada (FUSAO): `particulas`, `juntar` e `concluir` no lugar do `fundir`
 * @property {(k: number) => number} [particulas]   particulas do nivel que nasce
 * @property {number} [maxNivel]   ultimo nivel (o grupo e o coringa que passariam dele fazem o ultimo)
 * @property {(S: any, k: number) => boolean} [comemora]   o nivel k comemora e estoura depois do estalo (o ultimo)
 * @property {(S: any, J: any, base: any, info: { n: number, combo: number }) => void} [estourar]   o fim da comemoracao
 * @property {(S: any, F: Fusao, c: any) => boolean} [agrupa]   c entra no grupo em formacao (sem ele, so pares)
 * @property {(S: any, k: number, n: number) => number} [nivelGrupo]   nivel de n membros cujo par daria k
 * @property {(S: any, J: any, base: any, k: number, px: number, py: number) => void} [juntar]   a costura some: nivel, cor, rosto
 * @property {(S: any, J: any, base: any, k: number, px: number, py: number, combo: number, info: { n: number, nivel: number, saidas: number }) => boolean|void} [concluir]
 *   o estalo: pontos e eventos (false = nada nasceu)
 * @property {(S: any, dt: number) => void} [passo]
 * @property {{ taxa?: number }} [difusao]  opcoes da difusao do pigmento
 * @property {(S: any, J: any) => boolean} [transbordou]   true = o modo cuidou (Duelo)
 * @property {(S: any) => any} [hud]
 * @property {(S: any, spec: any) => number[]} pigDe   pigmento do "proximo" no HUD
 * @property {(spec: any) => number} escalaDe
 * @property {boolean} [premios]
 * @property {number} [largura]  largura do pote no comeco da partida (o Merge Lab nasce estreito)
 * @property {(S: any, J: any, s: any, id: string) => boolean} [aplicar]  reforco de alvo do modo
 * @property {(S: any) => boolean} [semReforcos]  true = sem reforcos (Duelo de 2 jogadores: so o 1 teria)
 * @property {(S: any) => boolean} [resgatarSempre]  true = o "Ufa!" vale a partida inteira (sem fim, sem derrota)
 * @property {(S: any) => any} [salvar]
 * @property {(S: any) => void} [abrir]   partida nova (sem save): o pote pode nascer com algo dentro
 * @property {(S: any, p: any) => void} [restaurar]
 */

/**
 * @typedef {{ id: number, pote: number, fase: 'atrai'|'funde'|'comemora', t: number, fim: number, q: number, k: number, kNovo: number,
 *   membros: any[], base: any, n: number, px: number, py: number, nIni: number, nAtual: number, nAlvo: number, saidas: number,
 *   origem: number[][], combo?: number }} Fusao
 */

/**
 * @param {Regras} R
 * @param {{ semente?: number, salvo?: any, toque?: boolean, cesto?: string, vitrine?: number }} o
 */
export function criarSoltar(R, o = {}) {
  const salvo = o.salvo || {};
  let recorde = salvo.recorde || 0;
  let semente = (o.semente || 1) >>> 0;
  /** @type {any[]} */
  const eventos = [];
  /** @type {any} */
  let S = null;
  const potes = R.potes || [0];
  let seqMissil = 0;
  let seqFusao = 0;

  function nova(sem, partida) {
    const rng = criarRng(sem);
    const mundo = criarMundo({ semente: sem });
    S = { rng, mundo, tempo: 0, acabou: false, jogadores: [], eventos, recorde, salvo, R, extra: {}, /** @type {Fusao[]} */ fusoes: [] };
    potes.forEach((cx, idx) => {
      // faixa do pote: ate o meio entre ele e os vizinhos (Duelo)
      const faixa = [idx > 0 ? (potes[idx - 1] + cx) / 2 : -Infinity, idx < potes.length - 1 ? (potes[idx + 1] + cx) / 2 : Infinity];
      const pote = criarPote({ mundo, cx, eventos, indice: idx, cesto: o.cesto, faixa, largura: R.largura || 1 });
      S.jogadores.push({
        semVideo: false,
        idx, pote, fila: [], pontos: 0, jogadas: 0, reviveu: false, resgatou: false, alvoPoder: '', arrastando: false, missil: null,
        poderes: { trocar: 1, chacoalhar: 1, alargar: 1, mira: 1 }, premio: '', maxNivel: 1, cpu: null, perdeu: false,
      });
    });
    for (const J of S.jogadores) J.fila = [R.sortear(S, J), R.sortear(S, J)];
    if (partida && R.restaurar) R.restaurar(S, partida);
    else if (!partida && R.abrir) R.abrir(S);
    for (const J of S.jogadores) prepararPreso(J);
  }

  function prepararPreso(J) {
    if (J.pote.preso || S.acabou || J.perdeu) return;
    const s = R.criar(S, J, J.fila[0], J.pote.mira, J.pote.ySoltar, true);
    if (s) s.dados.pote = J.idx;
    J.pote.prender(s);
  }

  // ---------------------------------------------------------------- fusoes
  const jogadorDe = (/** @type {any} */ s) => S.jogadores[(s && s.dados.pote) || 0] || S.jogadores[0];
  /**
   * Pode fundir agora: vivo, solto, fora da mira e de outra fusao, e dentro do pote (quem rolou
   * por cima da borda e esta do lado de fora nao puxa ninguem pela parede).
   * @param {any} s
   */
  const livre = (s) => s.ativo && !s.preso && !s.dados.marcado && !s.dados.fundindo && jogadorDe(s).pote.contem(s.cx, s.cy);

  /** Registro das missoes e da colecao (o perfil fica no main.js): so o jogador 1. */
  function registrar(J, fusoes, k, criou, combo) {
    if (J.idx !== 0) return;
    eventos.push({ tipo: 'registro', chave: 'fusao', valor: fusoes });
    if (criou !== false) eventos.push({ tipo: 'registro', chave: 'nivel', valor: k });
    if (combo >= 2) eventos.push({ tipo: 'registro', chave: 'combo', valor: combo });
  }

  /** Sem `animar` (Croma): o par funde no quadro em que encosta, como sempre foi. */
  function fundirNaHora() {
    const m = S.mundo;
    const usados = new Set();
    for (const [i, j, p] of m.contatos()) {
      if (p < 3 || usados.has(i) || usados.has(j)) continue;
      const a = m.slimes[i];
      const b = m.slimes[j];
      if (!livre(a) || !livre(b)) continue;
      const k = R.fusao(S, a, b);
      if (!k) continue;
      usados.add(i);
      usados.add(j);
      const [base, outro] = a.cy <= b.cy ? [a, b] : [b, a];
      const rb = base.raio0;
      const ro = outro.raio0;
      const px = base.cx + ((outro.cx - base.cx) * rb) / (rb + ro);
      const py = base.cy + ((outro.cy - base.cy) * rb) / (rb + ro);
      const J = jogadorDe(base);
      const combo = J.pote.fundiu();
      // false: os dois do ultimo nivel estouraram (nenhum nivel novo nasceu)
      const criou = /** @type {any} */ (R.fundir)(S, J, base, outro, k, px, py, combo);
      registrar(J, 1, k, criou, combo);
    }
  }

  /** Marca o slime como membro da fusao F: mole e feliz. @param {Fusao} F @param {any} s */
  function marcar(F, s) {
    s.dados.fundindo = F.id;
    S.mundo.amolecer(s, FUSAO.mole, 0);
    s.dados.expr = 'feliz';
    s.dados.exprT = 1;
  }

  /** @param {Fusao} F */
  function tirar(F) {
    const i = S.fusoes.indexOf(F);
    if (i >= 0) S.fusoes.splice(i, 1);
  }

  /** O grupo se desfez antes de juntar (um membro saiu): quem sobrou volta ao normal. @param {Fusao} F */
  function cancelar(F) {
    for (const s of F.membros) {
      if (!s.ativo || s.dados.fundindo !== F.id) continue;
      s.dados.fundindo = 0;
      S.mundo.amolecer(s, s.rampa, RAMPA_VEL);
    }
    tirar(F);
  }

  /**
   * Quem encosta (ou chega a FUSAO.folga de) um membro e o modo aceita entra no grupo; repete ate
   * ninguem mais entrar (o grupo e transitivo: 4 em fila).
   * @param {Fusao} F @param {Map<number, number>} pers
   */
  function recrutar(F, pers) {
    if (!R.agrupa) return;
    const m = S.mundo;
    for (let entrou = true; entrou;) {
      entrou = false;
      for (const c of m.slimes) {
        if (!livre(c) || ((c.dados.pote || 0) !== F.pote) || !R.agrupa(S, F, c)) continue;
        const junto = F.membros.some((s) => (pers.get(s.idx < c.idx ? s.idx * 128 + c.idx : c.idx * 128 + s.idx) || 0) >= 1 || m.pertoDe(s, c, FUSAO.folga));
        if (!junto) continue;
        F.membros.push(c);
        marcar(F, c);
        F.fim = Math.min(FUSAO.atraiMax, Math.max(F.fim, F.t + FUSAO.atraiExtra));
        entrou = true;
      }
    }
  }

  /** Centro do grupo (media pelas particulas). @param {any[]} lista */
  function centro(lista) {
    let N = 0;
    let x = 0;
    let y = 0;
    for (const s of lista) { N += s.n; x += s.n * s.cx; y += s.n * s.cy; }
    return N ? [x / N, y / N, N] : [0, 0, 0];
  }

  /** Fim do abraco: os membros viram um corpo so que escoa ate o nivel novo. @param {Fusao} F */
  function juntar(F) {
    const m = S.mundo;
    const n = F.membros.length;
    F.n = n;
    // acima do ultimo nivel (tres 13, o coringa num 14) nasce o ultimo
    F.kNovo = Math.min(R.maxNivel || Infinity, n >= 3 && R.nivelGrupo ? R.nivelGrupo(S, F.k, n) : F.k);
    // a base e o de baixo (como sempre); o ponto da costura, entre os dois, ou o centro do grupo
    const ord = F.membros.slice().sort((a, b) => (a.cy - b.cy) || (a.idx - b.idx));
    const base = ord[0];
    if (n === 2) {
      const o = ord[1];
      const rb = base.raio0;
      const ro = o.raio0;
      F.px = base.cx + ((o.cx - base.cx) * rb) / (rb + ro);
      F.py = base.cy + ((o.cy - base.cy) * rb) / (rb + ro);
    } else {
      [F.px, F.py] = centro(ord);
    }
    // o save no meio da fusao guarda os membros de antes (ao voltar, a fusao se refaz)
    F.origem = ord.map((s) => [s.nivel, +s.cx.toFixed(2), +s.cy.toFixed(2), s.dados.prisma ? 1 : 0]);
    m.fundir(base, ord.slice(1), { px: F.px, py: F.py, rampa: 0, rampaVel: FUSAO.rampa });
    F.fase = 'funde';
    m.reconstruir();
    F.base = base;
    F.membros = [base];
    base.dados.fundindo = F.id;
    F.nIni = F.nAtual = m.iniSl[base.idx + 1] - m.iniSl[base.idx];
    F.nAlvo = R.particulas ? R.particulas(F.kNovo) : F.nIni;
    F.t = 0;
    F.q = 0;
    if (R.juntar) R.juntar(S, jogadorDe(base), base, F.kNovo, F.px, F.py);
    eventos.push({ tipo: 'junta', x: F.px, y: F.py, cor: base.dados.hex, n, nivel: F.kNovo, pote: F.pote });
  }

  /** Tira particulas da base ate `alvo` (as das pontas) e solta faiscas delas. @param {Fusao} F @param {number} alvo */
  function encolher(F, alvo) {
    if (alvo >= F.nAtual) return;
    const out = S.mundo.aparar(F.base, F.nAtual - alvo);
    const q = out.length / 3;
    F.nAtual -= q;
    F.saidas += q;
    if (!q) return;
    // no maximo 6 faiscas por quadro (VFX), espalhadas pelas que sairam
    const pts = [];
    const passo = Math.max(1, Math.floor(q / 6));
    for (let k = 0; k < q && pts.length < 12; k += passo) pts.push(out[3 * k], out[3 * k + 1]);
    eventos.push({ tipo: 'faiscas', pts, cor: F.base.dados.hex, pote: F.pote });
  }

  /** O estalo: a forma assenta, o combo conta e o modo da os pontos. @param {Fusao} F */
  function concluir(F) {
    const m = S.mundo;
    const base = F.base;
    if (F.fase === 'funde') {
      encolher(F, F.nAlvo);
      m.refazerForma(base);
      // um "gloop" no estalo
      m.amolecer(base, 0.5, RAMPA_VEL);
      m.reconstruir();
    }
    base.dados.fundindo = 0;
    tirar(F);
    const J = jogadorDe(base);
    const combo = J.pote.fundiu();
    const criou = /** @type {any} */ (R.concluir)(S, J, base, F.kNovo, base.cx, base.cy, combo, { n: F.n, nivel: F.k, saidas: F.saidas });
    // o grupo de 3 vale as 2 fusoes que ele substitui (as missoes nao ficam mais lentas)
    registrar(J, F.n - 1, F.kNovo, criou, combo);
    // o ultimo nivel nasce, comemora e estoura (2026-10-18)
    if (criou !== false && base.ativo && R.comemora && R.comemora(S, F.kNovo)) comemorar(base, F.n, combo);
  }

  /**
   * O ultimo nivel comemora (FUSAO.comemora s: incha e o rosto treme) e estoura. Enquanto isso
   * ele fica de fora da mira, do bot, do "Ufa!", da evolucao e do perigo, como quem funde.
   * @param {any} base @param {number} [n] membros da fusao que o fez @param {number} [combo]
   */
  function comemorar(base, n = 2, combo = 1) {
    /** @type {Fusao} */
    const F = {
      id: ++seqFusao, pote: base.dados.pote || 0, fase: 'comemora', t: 0, fim: FUSAO.comemora, q: 0, k: base.nivel, kNovo: base.nivel,
      membros: [base], base, n, px: base.cx, py: base.cy, nIni: 0, nAtual: 0, nAlvo: 0, saidas: 0, origem: [], combo,
    };
    base.dados.fundindo = F.id;
    base.dados.treme = 1;
    base.dados.expr = 'feliz';
    base.dados.exprT = FUSAO.comemora + 0.2;
    S.fusoes.push(F);
    eventos.push({ tipo: 'comemora', x: base.cx, y: base.cy, cor: base.dados.hex, pote: F.pote, nivel: base.nivel });
  }

  /** Fim da comemoracao: o modo estoura o slime (pontos, gosma, contador). @param {Fusao} F */
  function estourar(F) {
    const base = F.base;
    tirar(F);
    if (!base.ativo) return;
    base.dados.fundindo = 0;
    base.dados.treme = 0;
    if (R.estourar) R.estourar(S, jogadorDe(base), base, { n: F.n, combo: F.combo || 1 });
  }

  /** Um quadro de uma fusao em andamento. @param {Fusao} F @param {number} dt */
  function avancarFusao(F, dt) {
    const m = S.mundo;
    if (F.fase === 'atrai') {
      // quem saiu do pote (Ufa, missil, tesoura...) sai do grupo
      F.membros = F.membros.filter((s) => s.ativo && s.dados.fundindo === F.id);
      if (F.membros.length < 2) { cancelar(F); return; }
      F.t += dt;
      const [cx, cy, N] = centro(F.membros);
      // o pequeno anda mais que o grande; a aceleracao e menor que a gravidade (ninguem sobe)
      for (const s of F.membros) m.atrair(s, cx, cy, FUSAO.acel * 2 * (1 - s.n / N), FUSAO.vmax, dt);
      if (F.t >= F.fim) juntar(F);
      return;
    }
    const base = F.base;
    if (!base.ativo || base.dados.fundindo !== F.id) { tirar(F); return; }
    F.t += dt;
    F.q++;
    if (F.fase === 'funde') {
      const p = Math.min(1, F.t / FUSAO.funde);
      encolher(F, F.nIni - Math.round((F.nIni - F.nAlvo) * p));
      if (F.t >= FUSAO.funde) concluir(F);
      return;
    }
    // comemora: incha devagar (o rosto treme no desenho, sem empurrar o corpo) e estoura
    const antes = 1 + FUSAO.incha * Math.min(1, (F.t - dt) / FUSAO.comemora);
    const agora = 1 + FUSAO.incha * Math.min(1, F.t / FUSAO.comemora);
    m.escalarForma(base, agora / antes);
    if (F.t >= FUSAO.comemora) estourar(F);
  }

  /** Um quadro das fusoes: recrutamento, pares novos e as fases. @param {number} dt */
  function fundirTodos(dt) {
    if (!R.animar) { fundirNaHora(); return; }
    const m = S.mundo;
    const lista = m.contatos();
    /** @type {Map<number, number>} */
    const pers = new Map();
    for (const [i, j, p] of lista) pers.set(i < j ? i * 128 + j : j * 128 + i, p);
    // o grupo aberto tem prioridade sobre um par novo
    for (const F of S.fusoes) if (F.fase === 'atrai') recrutar(F, pers);
    for (const [i, j, p] of lista) {
      if (p < 3) continue;
      const a = m.slimes[i];
      const b = m.slimes[j];
      if (!livre(a) || !livre(b)) continue;
      const k = R.fusao(S, a, b);
      if (!k) continue;
      /** @type {Fusao} */
      const F = {
        id: ++seqFusao, pote: a.dados.pote || 0, fase: 'atrai', t: 0, fim: FUSAO.atrai, q: 0, k, kNovo: k,
        membros: [a, b], base: null, n: 2, px: 0, py: 0, nIni: 0, nAtual: 0, nAlvo: 0, saidas: 0, origem: [],
      };
      marcar(F, a);
      marcar(F, b);
      S.fusoes.push(F);
      recrutar(F, pers);
    }
    for (const F of S.fusoes.slice()) avancarFusao(F, dt);
    // o ultimo nivel que nasceu fora de uma fusao (tinta, partida salva) comemora e estoura tambem
    if (R.comemora) {
      for (const s of m.slimes) if (s.ativo && !s.preso && !s.dados.fundindo && !s.dados.marcado && R.comemora(S, s.nivel)) comemorar(s);
    }
  }

  /** Fecha na hora todas as fusoes em andamento (fim da partida: o estalo entra nos pontos). */
  function concluirTodas() {
    for (const F of S.fusoes.slice()) {
      if (F.fase === 'comemora') continue;
      if (F.fase === 'atrai') {
        F.membros = F.membros.filter((s) => s.ativo && s.dados.fundindo === F.id);
        if (F.membros.length < 2) { cancelar(F); continue; }
        juntar(F);
      }
      if (!F.base.ativo) { tirar(F); continue; }
      concluir(F);
    }
    // quem comemora (tambem o que acabou de nascer aqui) estoura na hora
    for (const F of S.fusoes.slice()) estourar(F);
  }

  // ---------------------------------------------------------------- reforcos
  const semReforcos = () => !!(R.semReforcos && R.semReforcos(S));

  function usarPoder(J, id) {
    if (S.acabou || J.perdeu || semReforcos()) return;
    // o Alargar so abre uma vez por partida: depois disso o botao nao oferece video (o +1 nao serviria)
    if (id === 'alargar' && J.pote.alargado) return;
    if (BASE.includes(id) && !(J.poderes[id] > 0)) {
      // reforco acabado: o botao mostra o selo do video; o main.js pede o rewarded
      if (!J.semVideo) eventos.push({ tipo: 'pedirVideo', id });
      return;
    }
    if (PREMIOS.includes(id) && J.premio !== id) return;
    // um missil por vez
    if (id === 'mira' && J.missil) return;
    if (J.alvoPoder === id) { J.alvoPoder = ''; return; }
    if (id === 'trocar') {
      const s = J.pote.preso;
      if (!s) return;
      J.fila = [J.fila[1], J.fila[0]];
      S.mundo.remover(s);
      J.pote.preso = null;
      prepararPreso(J);
      eventos.push({ tipo: 'som', nome: 'trocar', pote: J.idx });
      gastar(J, id);
    } else if (id === 'chacoalhar') {
      J.pote.sacudir();
      eventos.push({ tipo: 'som', nome: 'descartar' });
      gastar(J, id);
    } else if (id === 'alargar') {
      if (J.pote.alargar()) { eventos.push({ tipo: 'som', nome: 'alargar' }); gastar(J, id); }
    } else {
      J.alvoPoder = id;
      eventos.push({ tipo: 'som', nome: 'alvo', id, pote: J.idx });
    }
  }

  function gastar(J, id) {
    if (BASE.includes(id)) J.poderes[id]--;
    else J.premio = '';
    J.alvoPoder = '';
    if (J.idx === 0) eventos.push({ tipo: 'registro', chave: 'poder', valor: 1, id });
  }

  /** Slime do pote do jogador sob o toque (o alvo de um missil ja nao conta). */
  function slimeEm(J, x, y) {
    let melhor = null;
    let dm = Infinity;
    for (const s of S.mundo.slimes) {
      if (!s.ativo || s.preso || s.dados.marcado || s.dados.fundindo || (s.dados.pote || 0) !== J.idx) continue;
      const d = Math.sqrt((s.cx - x) * (s.cx - x) + (s.cy - y) * (s.cy - y));
      if (d < s.raio0 * 1.15 && d < dm) { dm = d; melhor = s; }
    }
    return melhor;
  }

  function aplicarEm(J, s) {
    const m = S.mundo;
    const id = J.alvoPoder;
    if (R.aplicar && R.aplicar(S, J, s, id)) { gastar(J, id); return; }
    if (id === 'mira') {
      // o alvo chora, o missil teleguiado vem do botao e explode (avancarMissil)
      const idm = ++seqMissil;
      s.dados.marcado = idm;
      s.dados.expr = 'choro';
      J.missil = { id: idm, alvo: s, t: 0, x: s.cx, y: s.cy, r: s.raio0, cor: s.dados.hex || '#888888' };
      eventos.push({ tipo: 'som', nome: 'choro', pote: J.idx, nivel: s.nivel });
    } else if (id === 'calor') {
      s.estado = 'calor';
      s.tEstado = 5;
      m.acordarTodos();
      eventos.push({ tipo: 'som', nome: 'febre' });
    } else if (id === 'gelo') {
      s.estado = 'gelo';
      s.tEstado = 8;
      eventos.push({ tipo: 'som', nome: 'tique' });
    }
    gastar(J, id);
  }

  /** Um quadro do missil: segue o alvo, zune no lancamento e explode no impacto. */
  function avancarMissil(J, dt) {
    const M = J.missil;
    const a = M.alvo;
    // o slot do slime pode ter sido reaproveitado: o id da marca confirma que e o mesmo
    const vivo = a.ativo && a.dados.marcado === M.id;
    if (vivo) {
      M.x = a.cx;
      M.y = a.cy;
      M.r = a.raio0;
      // o choro vence o medo da linha e o tonto do chacoalhar
      a.dados.expr = 'choro';
    }
    const antes = M.t;
    M.t += dt;
    if (antes < MISSIL.choro && M.t >= MISSIL.choro) eventos.push({ tipo: 'som', nome: 'missil', pote: J.idx });
    if (M.t >= MISSIL.impacto) {
      // sem o alvo (Ufa, reviver), explode onde ele estava
      eventos.push({ tipo: 'missil', x: M.x, y: M.y, cor: M.cor, raio: M.r, pote: J.idx });
      if (vivo) S.mundo.remover(a);
      J.missil = null;
    }
  }

  /** Desarma o missil sem explodir (fim da partida): o alvo volta ao normal. */
  function desarmar(J) {
    const M = J.missil;
    if (!M) return;
    if (M.alvo.ativo && M.alvo.dados.marcado === M.id) { M.alvo.dados.marcado = 0; M.alvo.dados.expr = ''; }
    J.missil = null;
  }

  // ---------------------------------------------------------------- fim
  function transbordou(J) {
    if (R.transbordou && R.transbordou(S, J)) return;
    // os 3 primeiros minutos nao punem (regra da Poki para a sessao 0): todo transbordo
    // nesse tempo estoura o topo da pilha com um "Ufa!". No sem fim (2.0.0) vale sempre, e o
    // custo e a aposta: o topo estoura e o combo zera
    if (S.tempo < 180 || (R.resgatarSempre && R.resgatarSempre(S))) {
      J.resgatou = true;
      tirarTopo(J, 3);
      J.pote.combo = 0;
      J.pote.comboT = 0;
      eventos.push({ tipo: 'texto', x: J.pote.cx, y: 9, texto: 'ufa', cor: '#ffd23a', escala: 1.4 });
      // telemetria: quantos resgates e em que minuto (o main.js mede)
      if (J.idx === 0) eventos.push({ tipo: 'resgate' });
      return;
    }
    terminar(J);
  }

  function terminar(J, extra = {}) {
    concluirTodas();
    S.acabou = true;
    for (const K of S.jogadores) {
      K.alvoPoder = '';
      desarmar(K);
      if (K.pote.preso) { S.mundo.remover(K.pote.preso); K.pote.preso = null; }
    }
    const novo = J.pontos > recorde;
    if (novo) recorde = J.pontos;
    eventos.push({ tipo: 'nivel', n: J.maxNivel, acao: 'fail' });
    eventos.push({ tipo: 'registro', chave: 'pontos', valor: S.jogadores[0].pontos });
    eventos.push({ tipo: 'fim', pontos: J.pontos, novo, reviver: !J.reviveu, ...extra });
  }

  function tirarTopo(J, qtd) {
    // quem esta fundindo fica por ultimo (o "Ufa!" prefere os outros)
    const vivos = S.mundo.vivos().filter((s) => !s.preso && (s.dados.pote || 0) === J.idx)
      .sort((a, b) => (+!!a.dados.fundindo - +!!b.dados.fundindo) || (b.topo - a.topo));
    for (const s of vivos.slice(0, qtd)) {
      eventos.push({ tipo: 'estouro', x: s.cx, y: s.cy, cor: s.dados.hex || '#888888' });
      S.mundo.remover(s);
    }
    J.pote.reiniciarPerigo();
  }

  // ---------------------------------------------------------------- bot
  function bot(J = S.jogadores[0], erro = 0) {
    if (!J.pote.preso || S.acabou || J.perdeu) return false;
    const preso = J.pote.preso;
    let alvo = null;
    for (const s of S.mundo.slimes) {
      if (!s.ativo || s.preso || s.dados.fundindo || (s.dados.pote || 0) !== J.idx) continue;
      if (!R.fusao(S, preso, s)) continue;
      if (!alvo || s.topo > alvo.topo) alvo = s;
    }
    let x = alvo ? alvo.cx : J.pote.cx + (S.rng() - 0.5) * 7;
    if (erro) x += (S.rng() - 0.5) * 2 * erro;
    J.pote.apontar(x);
    if (J.pote.soltar()) { J.jogadas++; return true; }
    return false;
  }

  nova(semente, salvo.partida);
  // a primeira partida tambem abre o nivel 1 na telemetria (antes so o "jogar de novo" abria)
  if (!salvo.partida) eventos.push({ tipo: 'nivel', n: 1, acao: 'start' });

  const jogador = (k = 0) => S.jogadores[k];

  return {
    id: R.id,
    get mundo() { return S.mundo; },
    get S() { return S; },
    janela: R.janela,
    campoJanela: R.campoJanela,
    eventos,
    passo(dt) {
      if (S.acabou) return;
      S.tempo += dt;
      const m = S.mundo;
      m.avancar(4);
      m.medir(dt);
      // a difusao usa os pares do ultimo subpasso: antes das fusoes, que tiram particulas
      difundir(m, dt, R.difusao || {});
      fundirTodos(dt);
      if (R.passo) R.passo(S, dt);
      // pouso, expressoes com prazo e o humor de cada slime (src/jogo/humor.js)
      /** @type {Map<number, any[]>} slimes encostados em cada um */
      const encostados = new Map();
      for (const [i, j] of m.contatos()) {
        if (!encostados.has(i)) encostados.set(i, []);
        if (!encostados.has(j)) encostados.set(j, []);
        encostados.get(i).push(m.slimes[j]);
        encostados.get(j).push(m.slimes[i]);
      }
      for (const s of m.slimes) {
        if (!s.ativo) continue;
        if (s.dados.exprT > 0) { s.dados.exprT -= dt; if (s.dados.exprT <= 0 && (s.dados.expr === 'feliz' || PANCADA.includes(s.dados.expr))) s.dados.expr = ''; }
        if (s.dados.texturaT < 1) s.dados.texturaT = Math.min(1, s.dados.texturaT + dt * 1.4);
        if (s.dados.solto !== undefined && !s.dados.pousou) {
          if (-s.vy > (s.dados.queda || 0)) s.dados.queda = -s.vy;
          if (s.vy < -4) s.dados.caindo = true;
          else if (s.dados.caindo && s.vy > -1) {
            s.dados.pousou = true;
            eventos.push({ tipo: 'pouso', x: s.cx, y: s.base, forca: 1 + s.raio0 * 0.4, cor: s.dados.hex, nivel: s.nivel });
            // quem levou a pancada (de outro nivel, embaixo) faz uma careta
            pancada(s, s.dados.queda || 0, encostados.get(s.idx) || [], (a, b) => !!R.fusao(S, a, b));
          }
        }
        if (s.ader > 0) {
          // aderencia ao vidro (pote.soltar liga): sai no primeiro toque em outro slime
          const idade = m.tempo - s.dados.solto;
          if (encostados.has(s.idx) || idade >= ADER_T) s.ader = 0;
          else if (idade > ADER_T - 1) s.ader = ADER_T - idade;
        }
        if (!s.preso) sentir(s, (encostados.get(s.idx) || []).length, dt);
      }
      for (const J of S.jogadores) {
        if (J.perdeu) continue;
        J.pote.segurarCombo = S.fusoes.some((F) => F.pote === J.idx);
        const r = J.pote.passo(dt);
        J.pote.limparTonto();
        if (J.missil) avancarMissil(J, dt);
        // o fim espera o missil explodir (a explosao pode tirar o pote do perigo)
        if (r.perdeu && !J.missil) { transbordou(J); if (S.acabou) return; continue; }
        if (!J.pote.preso && J.pote.recarga <= 0) {
          J.fila.shift();
          J.fila.push(R.sortear(S, J));
          prepararPreso(J);
        }
        if (J.cpu) {
          J.cpu.t -= dt;
          if (J.cpu.t <= 0 && bot(J, J.cpu.erro)) J.cpu.t = J.cpu.espera;
        }
      }
    },
    /** @param {number} [quem] jogador (2 jogadores no toque: cada metade da tela) */
    apontar(x, y, fase, quem = 0) {
      const J = jogador(quem);
      if (!J || J.cpu || S.acabou || J.perdeu) return;
      if (J.alvoPoder) {
        if (fase === 'baixo') {
          const s = slimeEm(J, x, y);
          if (s) aplicarEm(J, s); else J.alvoPoder = '';
        }
        return;
      }
      if (fase === 'baixo') J.arrastando = true;
      J.pote.apontar(x);
      if (fase === 'cima' && J.arrastando) {
        J.arrastando = false;
        if (J.pote.soltar()) J.jogadas++;
      }
    },
    tecla(codigo, baixo) {
      if (S.acabou) return;
      const dois = S.jogadores.length > 1 && !S.jogadores[1].cpu;
      const p1 = { esq: ['KeyA'], dir: ['KeyD'], solta: ['KeyS', 'KeyW', 'Space'] };
      const p2 = { esq: ['ArrowLeft'], dir: ['ArrowRight'], solta: ['ArrowDown', 'ArrowUp', 'Enter', 'NumpadEnter'] };
      const mapas = dois ? [[0, p1], [1, p2]] : [[0, { esq: [...p1.esq, ...p2.esq], dir: [...p1.dir, ...p2.dir], solta: [...p1.solta, ...p2.solta] }]];
      for (const [k, mp] of mapas) {
        const J = S.jogadores[k];
        if (J.perdeu) continue;
        if (mp.esq.includes(codigo)) J.pote.teclaEsq = baixo;
        else if (mp.dir.includes(codigo)) J.pote.teclaDir = baixo;
        else if (baixo && mp.solta.includes(codigo)) { if (J.pote.soltar()) J.jogadas++; }
      }
      if (baixo && /^Digit[1-5]$/.test(codigo)) {
        const J = jogador(0);
        const k = Number(codigo.slice(5)) - 1;
        usarPoder(J, k < 4 ? BASE[k] : J.premio);
      }
    },
    poder(id) { usarPoder(jogador(0), id); },
    /** Premio do video: +1 no reforco. */
    darPoder(id) {
      const J = jogador(0);
      if (!BASE.includes(id)) return;
      J.poderes[id]++;
      eventos.push({ tipo: 'texto', x: J.pote.cx, y: 12.6, texto: '+1', cor: '#ffd23a', escala: 1.1 });
      eventos.push({ tipo: 'som', nome: 'yes' });
      // o missil volta do video com a mira ja armada (pedido do usuario em 2026-10-18)
      if (id === 'mira' && J.alvoPoder !== 'mira') usarPoder(J, id);
    },
    bot: () => bot(jogador(0)),
    hud() {
      const J = jogador(0);
      const prox = J.fila[1];
      const base = {
        pontos: J.pontos,
        recorde: Math.max(recorde, J.pontos),
        proximo: R.pigDe(S, prox),
        proximoEscala: R.escalaDe(prox),
        // nivel do proximo (0 no coringa): o HUD desenha a skin equipada dele
        proximoNivel: prox && !prox.prisma ? prox.nivel || 0 : 0,
        // sem reforcos os botoes ficam escondidos (o prototipo do Duelo vira 2 jogadores no meio)
        poderes: [
          ...BASE.map((id) => {
            // Alargar ja usado: cinza e sem o selo do video (nao abre de novo nesta partida)
            const gasto = id === 'alargar' && J.pote.alargado;
            return { id, qtd: gasto ? 0 : J.poderes[id], ativo: J.alvoPoder === id || (id === 'mira' && !!J.missil), video: !gasto && J.poderes[id] === 0 && !J.semVideo && !(id === 'mira' && J.missil), oculto: semReforcos() };
          }),
          ...(R.premios ? PREMIOS.map((id) => ({ id, qtd: 1, oculto: J.premio !== id || semReforcos(), ativo: J.alvoPoder === id })) : []),
        ],
      };
      return R.hud ? { ...base, ...R.hud(S) } : base;
    },
    visual() {
      const J = jogador(0);
      const vis = {
        olhar: J.pote.preso ? [J.pote.mira, J.pote.ySoltar] : null,
        linha: { y: J.pote.linha, x0: J.pote.cx - J.pote.meiaLinha, x1: J.pote.cx + J.pote.meiaLinha, alerta: J.pote.alerta },
        guia: J.pote.preso && !S.acabou ? { x: J.pote.mira, y0: J.pote.ySoltar - J.pote.preso.raio0, y1: J.pote.pousoEm(J.pote.mira) } : null,
        potes: S.jogadores.map((K) => ({ idx: K.pote.idxParedes, cesto: K.pote.cesto })),
        // a mao ensina quem nunca fundiu: fica ate a primeira gota (25% do desktop nunca tocava
        // no Player Fit Test de 2026-10-15) e some 20 s depois dela ou na segunda
        mao: !S.acabou && !o.vitrine && (salvo.visto || 1) <= 1 && (J.jogadas === 0 || (J.jogadas < 2 && S.tempo < 20)) ? { x: J.pote.cx, y: J.pote.ySoltar, amplitude: Math.min(3.2, J.pote.meiaLinha - 0.9), tecla: !o.toque } : null,
        alvo: J.alvoPoder ? { id: J.alvoPoder, pote: J.idx } : null,
        // missil da mira: alvo (mundo), cor, e o tempo desde a escolha (o render desenha o voo)
        missil: J.missil ? { x: J.missil.x, y: J.missil.y, r: J.missil.r, cor: J.missil.cor, t: J.missil.t, ...MISSIL } : null,
        linhas: S.jogadores.slice(1).map((K) => ({ y: K.pote.linha, x0: K.pote.cx - K.pote.meiaLinha, x1: K.pote.cx + K.pote.meiaLinha, alerta: K.pote.alerta })),
        // selo do combo (a partir do x2): o anel e o que resta da janela; parado enquanto ha fusao
        combo: J.pote.combo >= 2 && J.pote.comboT > 0 && !S.acabou ? {
          n: J.pote.combo, resto: Math.min(1, J.pote.comboT / COMBO_JANELA), pausa: J.pote.segurarCombo,
          borda: J.pote.cx - (J.pote.meiaLinha + 0.3) * (J.pote.alargado ? 1.14 : 1), linha: J.pote.linha,
        } : null,
        // fusoes em andamento (aura e brilho): centro, raio, fase e o progresso dela
        fusoes: S.fusoes.map((F) => {
          const ms = F.fase === 'atrai' ? F.membros : [F.base];
          const [x, y] = centro(ms);
          let r = 0;
          for (const s of ms) r = Math.max(r, Math.sqrt((s.cx - x) * (s.cx - x) + (s.cy - y) * (s.cy - y)) + s.raio0);
          const dur = F.fase === 'atrai' ? F.fim : F.fase === 'funde' ? FUSAO.funde : FUSAO.comemora;
          return { x, y, r, fase: F.fase, p: Math.min(1, F.t / dur), cor: (F.base || F.membros[0]).dados.hex, n: F.fase === 'atrai' ? F.membros.length : F.n };
        }),
        // terremoto: deslocamento do pote agora (u)
        tremor: J.pote.tremor(),
      };
      return vis;
    },
    reiniciar() {
      // a partida abandonada no meio (o sem fim nao acaba) ja foi salva como recorde: vale aqui tambem
      recorde = Math.max(recorde, jogador(0).pontos);
      semente = (semente * 1103515245 + 12345) >>> 0;
      nova(semente, null);
      eventos.push({ tipo: 'nivel', n: 1, acao: 'start' });
    },
    reviver() {
      const J = jogador(0);
      S.acabou = false;
      J.reviveu = true;
      tirarTopo(J, 4);
      for (const K of S.jogadores) prepararPreso(K);
    },
    salvar() {
      const J = jogador(0);
      const partida = S.acabou || !R.salvar ? null : R.salvar(S);
      const extra = R.salvarMeta ? R.salvarMeta(S) : {};
      return { ...extra, recorde: Math.max(recorde, J.pontos), partida };
    },
    // ganchos para os modos
    terminar: (J, extra) => terminar(J, extra),
    prepararPreso,
  };
}

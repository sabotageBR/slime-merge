// Motor dos jogos de soltar (Merge Lab, Croma, Duelo): um mundo, um ou dois jogadores, cada
// um com pote, fila, reforcos, combo e pontos. O modo entra com as regras (o que cai, quem
// funde com quem, o que acontece na fusao, o que mais roda por quadro).
// Logica pura: sem DOM, sem relogio, sem Math.random.

import { criarMundo } from '../fisica/mundo.js';
import { criarPote } from './pote.js';
import { criarRng } from '../core/rng.js';
import { difundir } from '../cor/difusao.js';

export const BASE = ['trocar', 'chacoalhar', 'alargar', 'mira'];
export const PREMIOS = ['calor', 'gelo', 'tesoura', 'tinta'];
export const TEXTO_COMBO = ['good', 'great', 'slimey', 'incrivel'];
export const COR_COMBO = ['#7fe36b', '#5fd9ff', '#ffd23a', '#ff6fd8'];

/**
 * @typedef {Object} Regras
 * @property {string} id
 * @property {number[]} [potes]                      centros x dos potes (1 ou 2 jogadores)
 * @property {number[]} janela
 * @property {number[]} campoJanela
 * @property {(S: any, J: any) => any} sortear       proximo da fila
 * @property {(S: any, J: any, spec: any, x: number, y: number, preso: boolean) => any} criar
 * @property {(S: any, a: any, b: any) => number} fusao   nivel novo (0 = nao funde)
 * @property {(S: any, J: any, base: any, outro: any, k: number, px: number, py: number, combo: number) => void} fundir
 * @property {(S: any, dt: number) => void} [passo]
 * @property {{ taxa?: number }} [difusao]  opcoes da difusao do pigmento
 * @property {(S: any, J: any) => boolean} [transbordou]   true = o modo cuidou (Duelo)
 * @property {(S: any) => any} [hud]
 * @property {(S: any, spec: any) => number[]} pigDe   pigmento do "proximo" no HUD
 * @property {(spec: any) => number} escalaDe
 * @property {boolean} [premios]
 * @property {(S: any, J: any, s: any, id: string) => boolean} [aplicar]  reforco de alvo do modo
 * @property {(S: any) => any} [salvar]
 * @property {(S: any, p: any) => void} [restaurar]
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

  function nova(sem, partida) {
    const rng = criarRng(sem);
    const mundo = criarMundo({ semente: sem });
    S = { rng, mundo, tempo: 0, acabou: false, jogadores: [], eventos, recorde, salvo, R, extra: {} };
    potes.forEach((cx, idx) => {
      const pote = criarPote({ mundo, cx, eventos, indice: idx, cesto: o.cesto });
      S.jogadores.push({
        semVideo: false,
        idx, pote, fila: [], pontos: 0, jogadas: 0, reviveu: false, resgatou: false, alvoPoder: '', arrastando: false,
        poderes: { trocar: 1, chacoalhar: 1, alargar: 1, mira: 1 }, premio: '', maxNivel: 1, cpu: null, perdeu: false,
      });
    });
    for (const J of S.jogadores) J.fila = [R.sortear(S, J), R.sortear(S, J)];
    if (partida && R.restaurar) R.restaurar(S, partida);
    for (const J of S.jogadores) prepararPreso(J);
  }

  function prepararPreso(J) {
    if (J.pote.preso || S.acabou || J.perdeu) return;
    const s = R.criar(S, J, J.fila[0], J.pote.mira, J.pote.ySoltar, true);
    if (s) s.dados.pote = J.idx;
    J.pote.prender(s);
  }

  // ---------------------------------------------------------------- fusoes
  function fundirTodos() {
    const m = S.mundo;
    const usados = new Set();
    for (const [i, j, p] of m.contatos()) {
      if (p < 3 || usados.has(i) || usados.has(j)) continue;
      const a = m.slimes[i];
      const b = m.slimes[j];
      if (!a.ativo || !b.ativo || a.preso || b.preso) continue;
      const k = R.fusao(S, a, b);
      if (!k) continue;
      usados.add(i);
      usados.add(j);
      const [base, outro] = a.cy <= b.cy ? [a, b] : [b, a];
      const rb = base.raio0;
      const ro = outro.raio0;
      const px = base.cx + ((outro.cx - base.cx) * rb) / (rb + ro);
      const py = base.cy + ((outro.cy - base.cy) * rb) / (rb + ro);
      const J = S.jogadores[base.dados.pote || 0] || S.jogadores[0];
      const combo = J.pote.fundiu();
      R.fundir(S, J, base, outro, k, px, py, combo);
      // progresso das missoes do dia e da colecao (o perfil fica no main.js): so o jogador 1
      if (J.idx === 0) {
        eventos.push({ tipo: 'registro', chave: 'fusao', valor: 1 });
        eventos.push({ tipo: 'registro', chave: 'nivel', valor: k });
        if (combo >= 2) eventos.push({ tipo: 'registro', chave: 'combo', valor: combo });
      }
    }
  }

  // ---------------------------------------------------------------- reforcos
  function usarPoder(J, id) {
    if (S.acabou || J.perdeu) return;
    if (BASE.includes(id) && !(J.poderes[id] > 0)) {
      // reforco acabado: o botao mostra o selo do video; o main.js pede o rewarded
      if (!J.semVideo) eventos.push({ tipo: 'pedirVideo', id });
      return;
    }
    if (PREMIOS.includes(id) && J.premio !== id) return;
    if (J.alvoPoder === id) { J.alvoPoder = ''; return; }
    if (id === 'trocar') {
      const s = J.pote.preso;
      if (!s) return;
      J.fila = [J.fila[1], J.fila[0]];
      S.mundo.remover(s);
      J.pote.preso = null;
      prepararPreso(J);
      gastar(J, id);
    } else if (id === 'chacoalhar') {
      J.pote.sacudir();
      eventos.push({ tipo: 'som', nome: 'descartar' });
      gastar(J, id);
    } else if (id === 'alargar') {
      if (J.pote.alargar()) { eventos.push({ tipo: 'som', nome: 'graduar' }); gastar(J, id); }
    } else {
      J.alvoPoder = id;
    }
  }

  function gastar(J, id) {
    if (BASE.includes(id)) J.poderes[id]--;
    else J.premio = '';
    J.alvoPoder = '';
    if (J.idx === 0) eventos.push({ tipo: 'registro', chave: 'poder', valor: 1 });
  }

  function slimeEm(x, y) {
    let melhor = null;
    let dm = Infinity;
    for (const s of S.mundo.slimes) {
      if (!s.ativo || s.preso) continue;
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
      eventos.push({ tipo: 'estouro', x: s.cx, y: s.cy, cor: s.dados.hex || '#888888' });
      m.remover(s);
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

  // ---------------------------------------------------------------- fim
  function transbordou(J) {
    if (R.transbordou && R.transbordou(S, J)) return;
    // os 3 primeiros minutos nao punem (regra da Poki para a sessao 0): todo transbordo
    // nesse tempo estoura o topo da pilha com um "Ufa!"
    if (S.tempo < 180) {
      J.resgatou = true;
      tirarTopo(J, 3);
      eventos.push({ tipo: 'texto', x: J.pote.cx, y: 9, texto: 'ufa', cor: '#ffd23a', escala: 1.4 });
      return;
    }
    terminar(J);
  }

  function terminar(J, extra = {}) {
    S.acabou = true;
    for (const K of S.jogadores) {
      K.alvoPoder = '';
      if (K.pote.preso) { S.mundo.remover(K.pote.preso); K.pote.preso = null; }
    }
    const novo = J.pontos > recorde;
    if (novo) recorde = J.pontos;
    eventos.push({ tipo: 'nivel', n: J.maxNivel, acao: 'fail' });
    eventos.push({ tipo: 'registro', chave: 'pontos', valor: S.jogadores[0].pontos });
    eventos.push({ tipo: 'fim', pontos: J.pontos, novo, reviver: !J.reviveu, ...extra });
  }

  function tirarTopo(J, qtd) {
    const vivos = S.mundo.vivos().filter((s) => !s.preso && (s.dados.pote || 0) === J.idx).sort((a, b) => b.topo - a.topo);
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
      if (!s.ativo || s.preso || (s.dados.pote || 0) !== J.idx) continue;
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
      fundirTodos();
      difundir(m, dt, R.difusao || {});
      if (R.passo) R.passo(S, dt);
      // pouso e expressoes com prazo
      for (const s of m.slimes) {
        if (!s.ativo) continue;
        if (s.dados.exprT > 0) { s.dados.exprT -= dt; if (s.dados.exprT <= 0 && s.dados.expr === 'feliz') s.dados.expr = ''; }
        if (s.dados.texturaT < 1) s.dados.texturaT = Math.min(1, s.dados.texturaT + dt * 1.4);
        if (s.dados.solto !== undefined && !s.dados.pousou) {
          if (s.vy < -4) s.dados.caindo = true;
          else if (s.dados.caindo && s.vy > -1) {
            s.dados.pousou = true;
            eventos.push({ tipo: 'pouso', x: s.cx, y: s.base, forca: 1 + s.raio0 * 0.4, cor: s.dados.hex });
          }
        }
        if (!s.dados.expr && s.pressao > 0.035) s.dados.expr = 'amassado';
        else if (s.dados.expr === 'amassado' && s.pressao < 0.02) s.dados.expr = '';
      }
      for (const J of S.jogadores) {
        if (J.perdeu) continue;
        const r = J.pote.passo(dt);
        J.pote.limparTonto();
        if (r.perdeu) { transbordou(J); if (S.acabou) return; continue; }
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
          const s = slimeEm(x, y);
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
        poderes: [
          ...BASE.map((id) => ({ id, qtd: J.poderes[id], ativo: J.alvoPoder === id, video: J.poderes[id] === 0 && !J.semVideo })),
          ...(R.premios ? PREMIOS.map((id) => ({ id, qtd: 1, oculto: J.premio !== id, ativo: J.alvoPoder === id })) : []),
        ],
      };
      return R.hud ? { ...base, ...R.hud(S) } : base;
    },
    visual() {
      const J = jogador(0);
      const vis = {
        olhar: J.pote.preso ? [J.pote.mira, J.pote.ySoltar] : null,
        linha: { y: J.pote.linha, x0: J.pote.cx - J.pote.meiaLinha, x1: J.pote.cx + J.pote.meiaLinha, alerta: J.pote.alerta },
        guia: J.pote.preso && !S.acabou ? { x: J.pote.mira, y0: J.pote.ySoltar - J.pote.preso.raio0, y1: 0.2 } : null,
        potes: S.jogadores.map((K) => ({ idx: K.pote.idxParedes, cesto: K.pote.cesto, madeira: K.pote.madeira })),
        mao: !S.acabou && !o.vitrine && (salvo.visto || 1) <= 1 && J.jogadas < 2 && S.tempo < 20 ? { x: J.pote.cx, y: J.pote.ySoltar, amplitude: 3.2, tecla: !o.toque } : null,
        alvo: J.alvoPoder ? { id: J.alvoPoder } : null,
        linhas: S.jogadores.slice(1).map((K) => ({ y: K.pote.linha, x0: K.pote.cx - K.pote.meiaLinha, x1: K.pote.cx + K.pote.meiaLinha, alerta: K.pote.alerta })),
      };
      return vis;
    },
    reiniciar() {
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

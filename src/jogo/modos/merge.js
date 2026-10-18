// Modelo 1: Merge Lab (sem fim, o mais perto do conceito).
// Mirar e soltar; dois iguais fundem no proximo nivel (13 niveis). O slime e gelatina de
// verdade: a pilha assenta e "derrete" para o formato do pote; a cor do nivel novo nasce na
// costura e avanca pelo corpo (frente de transmutacao). Reforcos da referencia: Trocar,
// Chacoalhar, Alargar e Mira; premios de marco: Calor (escoa), Gelo
// (trava), Tesoura (divide) e Tinta (sobe um nivel). Coringa prisma funde com qualquer nivel.
// No sem fim (2.0.0) ha pressao sem derrota (src/jogo/pressao.js): a escada sobe o piso das gotas
// do nivel 9 em diante, um evento a cada ~60 s e o "Ufa!" vale a partida inteira.

import { criarSoltar, PREMIOS, TEXTO_COMBO, COR_COMBO } from '../soltar.js';
import { MAX_NIVEL, particulasNivel, pontosNivel } from '../niveis.js';
import { aparencias as tabelaAparencias } from '../skins.js';
import { iniciarFrente, pintar } from '../../cor/difusao.js';
import { PESOS, PESOS_ESCADA, ESCADA, pisoPara, AGENDA, CICLO, EVENTOS, criarAgenda, avancarAgenda, encerrarEvento, nivelGigante, alvoPedido } from '../pressao.js';

const PRISMA = { pig: [0.06, 0.04, 0.08, 0], textura: 6 };
/** Eventos com contagem na pilula (os outros acabam quando o que cai, cai). */
const COM_RELOGIO = ['pedido', 'terremoto', 'calor', 'gelo'];
/** Duracao de cada um dos 3 tremores do terremoto (s; um a cada 2,5 s). */
const TREMOR_EVENTO = 1.8;
/** Cor do texto do aviso de cada tipo de evento. */
const COR_EVENTO = { alivio: '#7fe36b', aperto: '#ff8a5c', meta: '#ffd23a', caos: '#5fd9ff' };

/**
 * Comeco do sem fim (Player Fit Test de 2026-10-15: o 2o minuto perdia 24% de quem jogava). O
 * pote nasce com `largura` da largura e cresce no nivel `nivelCresce`, a primeira meta (o
 * jogador casual chega nela entre 30 e 75 s), ou aos `tempoCresce` s, antes do fim do resgate
 * dos 3 primeiros minutos. Mexer no sorteio das primeiras gotas (so 1 a 3, ou repetir o nivel
 * exposto) nao mudou as fusoes do primeiro minuto na simulacao e ficou de fora.
 */
export const INICIO = Object.freeze({ largura: 0.86, nivelCresce: 6, tempoCresce: 150 });

/**
 * Pinta o slime com a aparencia do nivel (a skin equipada; a padrao e o visual de sempre) e
 * liga a textura dela.
 * @param {any} m @param {any} s
 * @param {{ pig: number[], textura?: number, ap?: number, modo?: number }} def
 */
export function colorir(m, s, def) {
  pintar(m, s, def.pig);
  s.dados.textura = def.textura || 0;
  s.dados.texturaT = 1;
  s.dados.ap = def.ap || 0;
  s.dados.apModo = def.modo === 1 ? 1 : 0;
}

/**
 * A cor nova avanca pelo corpo a partir de (x, y) (fusao, tinta, cinza que pegou cor, skin
 * trocada no meio da partida); a textura aparece aos poucos.
 * @param {any} m @param {any} s
 * @param {import('../skins.js').Aparencia} def
 * @param {number} x @param {number} y
 */
export function transmutar(m, s, def, x, y) {
  iniciarFrente(m, s, def.pig, x, y);
  s.dados.hex = def.hex;
  s.dados.textura = def.textura || 0;
  s.dados.texturaT = 0;
  s.dados.ap = def.ap || 0;
  s.dados.apModo = def.modo === 1 ? 1 : 0;
}

/**
 * Tabela de aparencias da partida (indice = nivel; sem `inicial`, as padrao) e a aparencia do
 * nivel k.
 * @param {Array<import('../skins.js').Aparencia|null>} [inicial]
 */
export function tabelaDaPartida(inicial) {
  const AP = (inicial || tabelaAparencias()).slice();
  return { AP, ap: (/** @type {number} */ k) => /** @type {import('../skins.js').Aparencia} */ (AP[Math.max(1, Math.min(MAX_NIVEL, k))]) };
}

/**
 * Troca de skin ao vivo: so os slimes dos niveis que mudaram repintam (a cor nova avanca do
 * alto do corpo). Nao toca no rng.
 * @param {any} jogo o motor (criarSoltar)
 * @param {Array<any>} AP a tabela da partida (tabelaDaPartida)
 * @param {(s: any) => boolean} [pular] slimes que nao seguem o nivel (prisma, cinza)
 */
export function ligarAparencias(jogo, AP, pular = () => false) {
  jogo.aparencias = AP;
  jogo.definirAparencias = (/** @type {Array<any>} */ nova) => {
    const mudou = new Set();
    for (let k = 1; k <= MAX_NIVEL; k++) {
      if (!nova[k] || (AP[k] && AP[k].chave === nova[k].chave)) continue;
      AP[k] = nova[k];
      mudou.add(k);
    }
    if (!mudou.size) return;
    const m = jogo.S.mundo;
    for (const s of m.vivos()) if (mudou.has(s.nivel) && !pular(s)) transmutar(m, s, AP[s.nivel], s.cx, s.topo - 0.2);
  };
}

/**
 * @param {{ semente?: number, salvo?: any, toque?: boolean, visto?: number, regra?: { id: string, meta: number }|null,
 *   vitrine?: number, cesto?: string, aparencias?: Array<any>, inicio?: Partial<typeof INICIO>, pressao?: boolean,
 *   escada?: Partial<typeof ESCADA> & { pesos?: number[] } }} [o]
 *   regra: desafio do dia (src/jogo/perfil.js REGRAS); visto: maior nivel ja descoberto (perfil);
 *   aparencias: skin de cada nivel (src/jogo/skins.js `aparencias`; sem ela, as padrao);
 *   inicio: troca o comeco do sem fim (testes e a simulacao de ritmo);
 *   pressao: false desliga a escada, os eventos e o resgate permanente (a 1.2.0, para comparar);
 *   escada: troca a escada (testes e a simulacao de ritmo); `pesos` vale quando o piso passa de 1
 */
export function criarModo(o = {}) {
  const salvo = o.salvo || {};
  let visto = Math.max(o.visto || 1, salvo.visto || 1);
  const regra = o.regra ? o.regra.id : '';
  // o comeco facil e o pote que cresce sao do sem fim (o desafio tem regra e meta proprias)
  const ini = { ...INICIO, ...(o.inicio || {}) };
  const comInicio = !regra && !o.vitrine;
  const comPressao = comInicio && o.pressao !== false;
  const esc = { ...ESCADA, pesos: PESOS_ESCADA, ...(o.escada || {}) };
  // aparencia de cada nivel (as skins equipadas no perfil)
  const { AP, ap } = tabelaDaPartida(o.aparencias);
  /** @type {any} */
  let jogo = null;

  function criar(S, J, spec, x, y, preso) {
    const s = S.mundo.criarSlime({ x, y, n: particulasNivel(spec.nivel), material: 'gelatina', nivel: spec.nivel, preso });
    if (!s) return null;
    s.dados.prisma = !!spec.prisma;
    s.dados.hex = spec.prisma ? '#ffffff' : ap(spec.nivel).hex;
    colorir(S.mundo, s, spec.prisma ? PRISMA : ap(spec.nivel));
    return s;
  }

  /** Piso da janela das gotas agora (sem a pressao, sempre 1). */
  const piso = (S) => (comPressao ? pisoPara(S.jogadores[0].maxNivel, esc) : 1);

  /**
   * A escada subiu: os slimes do pote abaixo do piso evoluem ate ele (sem orfaos sem par), e a fila
   * tambem; o preso abaixo do piso troca, como no Trocar.
   */
  function evoluir(S, J, k) {
    const m = S.mundo;
    let n = 0;
    for (const s of m.vivos()) {
      if (s.preso || s.dados.prisma || s.dados.marcado || s.dados.fundindo || (s.dados.pote || 0) !== J.idx || s.nivel >= k) continue;
      m.redimensionar(s, particulasNivel(k), s.cx, s.topo);
      s.nivel = k;
      s.dados.irmao = 0;
      s.dados.expr = 'feliz';
      s.dados.exprT = 0.8;
      transmutar(m, s, ap(k), s.cx, s.topo - 0.3);
      S.eventos.push({ tipo: 'brilhos', x: s.cx, y: s.cy, cor: ap(k).hex });
      n++;
    }
    J.fila = J.fila.map((f) => (f && !f.prisma && f.nivel < k ? { ...f, nivel: k } : f));
    const P = J.pote.preso;
    if (P && !P.dados.prisma && P.nivel < k) {
      m.remover(P);
      J.pote.preso = null;
      jogo.prepararPreso(J);
    }
    S.eventos.push({ tipo: 'texto', x: J.pote.cx, y: J.pote.linha * 0.62, texto: 'evolucao', cor: '#ff9be0', escala: 1.5 });
    S.eventos.push({ tipo: 'som', nome: 'graduar' });
    S.eventos.push({ tipo: 'escada', piso: k, evoluidos: n });
  }

  // ---------------------------------------------------------------- eventos (pressao)
  /** A faixa do evento entra (2 s antes): texto no pote, som e, no pedido, o alvo. */
  function anunciar(S, J, ev) {
    const tipo = EVENTOS[ev.id].tipo;
    if (ev.id === 'pedido') ev.alvo = alvoPedido(S.mundo.vivos().filter((s) => !s.preso && !s.dados.prisma).map((s) => s.nivel), piso(S), MAX_NIVEL);
    S.eventos.push({ tipo: 'texto', x: J.pote.cx, y: J.pote.linha * 0.62, texto: 'ev.' + ev.id, cor: COR_EVENTO[tipo], escala: 1.35 });
    const ruim = tipo === 'aperto' || tipo === 'caos';
    S.eventos.push({ tipo: 'som', nome: ruim ? 'ataque' : 'yes' });
  }

  /** O evento comeca. */
  function comecar(S, J, ev) {
    const m = S.mundo;
    if (ev.id === 'coringas') {
      // o "proximo" ja vira prisma; mais 2 vem no sorteio
      J.fila[1] = { nivel: 2, prisma: true };
      S.extra.coringas = 2;
    } else if (ev.id === 'terremoto') {
      // o pote inteiro treme (as paredes andam; o cesto, desenhado delas, treme junto)
      J.pote.tremer(TREMOR_EVENTO);
      S.eventos.push({ tipo: 'som', nome: 'descartar' });
      S.extra.tremores = 1;
    } else if (ev.id === 'gigante') {
      J.fila[1] = { nivel: nivelGigante(piso(S), J.maxNivel), gigante: true };
    } else if (ev.id === 'calor' || ev.id === 'gelo') {
      for (const s of m.vivos()) {
        if (s.preso || (s.dados.pote || 0) !== J.idx) continue;
        s.estado = ev.id;
        s.tEstado = ev.dur;
      }
      if (ev.id === 'calor') m.acordarTodos();
      const quente = ev.id === 'calor';
      S.eventos.push({ tipo: 'som', nome: quente ? 'febre' : 'tique' });
    }
    S.eventos.push({ tipo: 'evento', id: ev.id, acao: 'start', n: ev.n });
  }

  /** Um passo do evento ativo: o que ele espera para acabar antes do tempo. */
  function durante(S, J, ev) {
    if (ev.id === 'coringas') ev.feito = !(S.extra.coringas > 0) && !J.fila.some((f) => f && f.prisma);
    else if (ev.id === 'gigante') ev.feito = !J.fila.some((f) => f && f.gigante);
    else if (ev.id === 'terremoto' && S.extra.tremores < 3 && ev.t >= 2.5 * S.extra.tremores) {
      J.pote.tremer(TREMOR_EVENTO);
      S.eventos.push({ tipo: 'som', nome: 'descartar' });
      S.extra.tremores++;
    }
  }

  /** O evento acabou: resultado do pedido, telemetria e a pausa natural do intervalo comercial. */
  function fecharEvento(S, J, A) {
    const ev = A.ev;
    if (ev.id === 'coringas') S.extra.coringas = 0;
    if (ev.id === 'pedido') S.eventos.push({ tipo: 'evento', id: 'pedido', acao: ev.ok ? 'ok' : 'falhou', n: ev.n });
    S.eventos.push({ tipo: 'evento', id: ev.id, acao: 'fim', n: ev.n });
    // o main.js decide se cabe um intervalo (espaco desde o ultimo); nunca com a mira armada
    if (ev.n >= AGENDA.anuncioDesde && !J.missil && !J.alvoPoder) S.eventos.push({ tipo: 'intervalo', origem: 'evento' });
    encerrarEvento(A, S.tempo);
  }

  /** Um quadro da pressao: escada pendente e agenda. */
  function pressionar(S, J, dt) {
    if (S.extra.evoluir) { const k = S.extra.evoluir; S.extra.evoluir = 0; evoluir(S, J, k); }
    // partida de antes da agenda (save da 1.2.0): o primeiro evento vem 30 s depois de voltar
    const A = S.extra.agenda || (S.extra.agenda = criarAgenda({ prox: Math.max(AGENDA.primeiro, S.tempo + 30) }));
    const mud = avancarAgenda(A, S.tempo, dt);
    if (mud === 'aviso') anunciar(S, J, A.ev);
    else if (mud === 'start') comecar(S, J, A.ev);
    else if (mud === 'fim') fecharEvento(S, J, A);
    if (A.ev && A.ev.fase === 'ativo') durante(S, J, A.ev);
  }

  /**
   * Quem funde com quem: o nivel novo, ou 0.
   * @param {any} S @param {any} a @param {any} b
   */
  function fusao(S, a, b) {
    // as duas metades da tesoura nao se juntam de novo (cada uma funde com outro igual)
    if (a.dados.irmao && a.dados.irmao === b.dados.irmao) return 0;
    // com a pressao, o coringa ajuda ate o maior nivel da partida mas nao faz o proximo recorde:
    // na chuva de coringas o bot subia do 9 ao 13 em 12 s soltando os prismas no maior
    if (comPressao && (a.dados.prisma || b.dados.prisma) && !(a.dados.prisma && b.dados.prisma)) {
      const outro = a.dados.prisma ? b : a;
      if (outro.nivel >= S.jogadores[0].maxNivel) return 0;
    }
    if (a.dados.prisma && b.dados.prisma) return Math.max(a.nivel, b.nivel) + 1;
    if (a.dados.prisma) return b.nivel + 1;
    if (b.dados.prisma) return a.nivel + 1;
    return a.nivel === b.nivel ? a.nivel + 1 : 0;
  }

  /** O pote estreito do comeco cresce: som, texto e a marca para a telemetria (main.js). */
  function crescer(S, J, motivo) {
    if (!J.pote.crescer()) return;
    S.eventos.push({ tipo: 'som', nome: 'alargar' });
    S.eventos.push({ tipo: 'texto', x: J.pote.cx, y: J.pote.linha * 0.62, texto: 'poteCresceu', cor: '#5fd9cf', escala: 1.5 });
    S.eventos.push({ tipo: 'cresceu', motivo });
  }

  jogo = criarSoltar({
    id: 'merge',
    janela: [-7.2, -1.6, 7.2, 15.0],
    campoJanela: [-7.6, -1.4, 7.6, 15.2],
    premios: true,
    largura: comInicio ? ini.largura : 1,
    sortear(S) {
      // evento dos coringas: os prismas que faltam saem antes de tudo
      if (S.extra.coringas > 0) { S.extra.coringas--; return { nivel: 2, prisma: true }; }
      const chancePrisma = regra === 'prisma' ? 0.15 : S.tempo > 90 ? 0.03 : 0;
      if (S.rng() < chancePrisma) return { nivel: 2, prisma: true };
      // a janela de 5 niveis comeca no piso da escada (1 ate o nivel 8)
      const k0 = piso(S);
      const pesos = regra === 'pequenos' ? PESOS.slice(0, 3) : k0 > 1 ? esc.pesos : PESOS;
      let x = S.rng() * pesos.reduce((a, b) => a + b, 0);
      for (let k = 0; k < pesos.length; k++) {
        if (x < pesos[k]) return { nivel: k0 + k };
        x -= pesos[k];
      }
      return { nivel: k0 };
    },
    passo(S, dt) {
      // o pote estreito cresce sozinho antes do fim do resgate (quem nao chegou ao nivel 6)
      const J0 = S.jogadores[0];
      if (J0.pote.estreito && S.tempo >= ini.tempoCresce) crescer(S, J0, 'tempo');
      if (comPressao) pressionar(S, J0, dt);
      // desafio "chacoalho": o pote sacode sozinho a cada 25 s
      if (regra !== 'chacoalho') return;
      S.extra.tChac = (S.extra.tChac || 0) + dt;
      if (S.extra.tChac >= 25) { S.extra.tChac = 0; S.jogadores[0].pote.sacudir(); S.eventos.push({ tipo: 'som', nome: 'descartar' }); }
    },
    criar,
    // sem derrota no sem fim (escolha do usuario em 2026-10-17): o "Ufa!" vale a partida inteira
    resgatarSempre: () => comPressao,
    fusao,
    // fusao animada (soltar.js FUSAO): 3 ou mais iguais juntos pulam um nivel (escolha do usuario
    // em 2026-10-17); acima do 13 nasce o super slime, que segura um instante e estoura
    animar: true,
    particulas: (k) => (k > MAX_NIVEL ? 0 : particulasNivel(k)),
    nivelGrupo: (S, k, n) => (n >= 3 ? k + 1 : k),
    // o grupo e so de iguais comuns: o coringa, os irmaos da tesoura e niveis diferentes ficam no par
    agrupa(S, F, c) {
      if (c.dados.prisma) return false;
      return F.membros.every((s) => !s.dados.prisma && fusao(S, s, c) === F.k);
    },
    juntar(S, J, base, k, px, py) {
      const m = S.mundo;
      base.dados.prisma = false;
      base.dados.irmao = 0;
      if (k > MAX_NIVEL) {
        // o super slime: lava, espantado, ate estourar
        base.nivel = MAX_NIVEL;
        base.dados.super = true;
        base.dados.expr = 'medo';
        base.dados.exprT = 0;
        transmutar(m, base, ap(MAX_NIVEL), px, py);
        S.eventos.push({ tipo: 'som', nome: 'alvo' });
        return;
      }
      base.nivel = k;
      base.dados.expr = 'feliz';
      base.dados.exprT = 1.1;
      // a cor nova nasce na costura e avanca pelo corpo enquanto ele escoa
      transmutar(m, base, ap(k), px, py);
    },
    concluir(S, J, base, k, px, py, combo, info) {
      const m = S.mundo;
      if (k > MAX_NIVEL) {
        // o super slime estoura numa explosao de pontos (dois do 13 valem os x4 de sempre)
        m.remover(base);
        J.pontos += pontosNivel(MAX_NIVEL) * 2 * info.n * combo;
        // a gosma que voa na tela e a brasa de dentro (a crosta da lava e escura)
        S.eventos.push({ tipo: 'estouro', x: px, y: py, cor: ap(MAX_NIVEL).hex, corTela: '#ff8a2a', grande: true });
        S.eventos.push({ tipo: 'texto', x: px, y: py + 1.5, texto: 'perfeito', cor: '#ffd23a', escala: 1.8 });
        // nenhum nivel novo nasceu (o soltar.js nao registra "nivel 14")
        return false;
      }
      base.dados.expr = 'feliz';
      base.dados.exprT = 0.7;
      // o grupo de 3 vale as duas fusoes que ele pulou
      const ganho = (info.n >= 3 ? pontosNivel(k - 1) + pontosNivel(k) : pontosNivel(k)) * combo;
      J.pontos += ganho;
      if (k > visto) visto = k;
      if (k > J.maxNivel) {
        const pisoAntes = piso(S);
        // telemetria: ate que nivel a partida chegou (o funil da Poki por nivel, sem buraco no pulo)
        for (let q = J.maxNivel + 1; q <= k; q++) S.eventos.push({ tipo: 'nivel', n: q, acao: 'complete' });
        J.maxNivel = k;
        // marco: um premio fisico a cada nivel novo a partir do 5
        if (k >= 5 && !J.premio) J.premio = PREMIOS[Math.floor(S.rng() * PREMIOS.length)];
        if (J.pote.estreito && k >= ini.nivelCresce) crescer(S, J, 'nivel');
        // a escada subiu: a evolucao vem no proximo passo (fora do laco das fusoes)
        if (piso(S) > pisoAntes) S.extra.evoluir = piso(S);
      }
      // nasceu abaixo de um piso que subiu enquanto ele fundia: evolui tambem
      if (comPressao && k < piso(S) && !S.extra.evoluir) S.extra.evoluir = piso(S);
      // pedido cumprido: premio fisico (se o espaco estiver livre) e as gotas (main.js)
      const ev = S.extra.agenda && S.extra.agenda.ev;
      if (ev && ev.id === 'pedido' && ev.fase === 'ativo' && !ev.feito && k >= (ev.alvo || 99)) {
        ev.feito = true;
        ev.ok = true;
        if (!J.premio) J.premio = PREMIOS[Math.floor(S.rng() * PREMIOS.length)];
        S.eventos.push({ tipo: 'texto', x: px, y: py + 1.8, texto: 'pedidoOk', cor: '#ffd23a', escala: 1.5 });
        S.eventos.push({ tipo: 'som', nome: 'missao' });
      }
      const triplo = info.n >= 3;
      S.eventos.push({
        tipo: 'fusao', x: px, y: py, cor: ap(k).hex, combo, brilhos: Math.min(12, info.saidas / 3 + (triplo ? 6 : 0)), nivel: k, grupo: info.n,
        texto: triplo ? 'triplo' : combo >= 2 || k >= 5 ? TEXTO_COMBO[Math.min(3, combo - 1)] : '',
        corTexto: triplo ? '#ff6fd8' : COR_COMBO[Math.min(3, combo - 1)], escala: triplo ? 1.5 : 1 + Math.min(0.6, (combo - 1) * 0.2),
      });
      // o "x2" virou o selo do combo ao lado do pote (render/guias.js)
      S.eventos.push({ tipo: 'texto', x: px, y: py - 0.2, texto: '+' + ganho, cor: '#ffffff', escala: 0.55, grupo: 'pts' });
      return true;
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
          const irmao = (S.extra.cortes = (S.extra.cortes || 0) + 1);
          for (const p of pedacos) {
            p.dados.irmao = irmao;
            m.redimensionar(p, particulasNivel(k), p.cx, p.cy);
            p.nivel = k;
            p.dados.pote = J.idx;
            p.dados.hex = ap(k).hex;
            p.dados.solto = -10;
            p.dados.prisma = false;
            // os pedacos sao do nivel de baixo: a cor tambem (o redimensionar copia o pigmento)
            colorir(m, p, ap(k));
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
          transmutar(m, s, ap(k), s.cx, s.topo - 0.3);
          S.eventos.push({ tipo: 'fusao', x: s.cx, y: s.topo, cor: ap(k).hex, combo: 1, brilhos: 6 });
        }
        return true;
      }
      return false;
    },
    // vitrine (depuracao): nada transborda, a cena fica parada para o print
    transbordou: o.vitrine ? () => true : undefined,
    pigDe: (S, spec) => (spec.prisma ? PRISMA : ap(spec.nivel)).pig,
    escalaDe: (spec) => 0.62 + spec.nivel * 0.08,
    hud(S) {
      const J = S.jogadores[0];
      // a meta da vez: o nivel do crescimento enquanto o pote e estreito; depois, o proximo nivel
      // da partida (o "?" e o premio de descoberta quando ninguem o viu ainda)
      const alvo = J.pote.estreito ? Math.max(ini.nivelCresce, J.maxNivel + 1) : J.maxNivel + 1;
      // o evento da vez toma a pilula (com a contagem; no pedido, o nivel pedido pulsa na barra)
      const ev = comPressao && S.extra.agenda ? S.extra.agenda.ev : null;
      const evento = ev ? {
        id: ev.id, tipo: EVENTOS[ev.id].tipo, aviso: ev.fase === 'aviso',
        // a contagem so nos que acabam pelo relogio (coringas e gigante acabam quando caem)
        resta: ev.fase === 'ativo' && COM_RELOGIO.includes(ev.id) ? Math.max(0, Math.ceil(ev.dur - ev.t)) : 0, alvo: ev.alvo || 0, ok: !!ev.ok,
      } : null;
      return {
        // a bolinha da barra mostra a skin equipada (o HUD desenha a imagem pelas aparencias)
        evolucao: Array.from({ length: MAX_NIVEL }, (_, k) => ({ k, visto: k + 1 <= visto, cor: ap(k + 1).hex, textura: ap(k + 1).ap ? 0 : ap(k + 1).textura || 0 })),
        objetivo: evento ? { evento, nivel: evento.alvo } : alvo <= MAX_NIVEL ? { nivel: alvo, cresce: J.pote.estreito, novo: alvo > visto } : null,
        piso: piso(S),
      };
    },
    salvar(S) {
      const J = S.jogadores[0];
      const juntos = new Set(S.fusoes.filter((F) => F.fase !== 'atrai').map((F) => F.base));
      return {
        pontos: J.pontos, tempo: S.tempo, fila: J.fila, poderes: J.poderes, premio: J.premio, maxNivel: J.maxNivel,
        alargado: J.pote.alargado, estreito: J.pote.estreito,
        // pressao: a agenda (com o evento em curso) e os coringas que ainda vao cair
        agenda: S.extra.agenda || null, coringas: S.extra.coringas || 0,
        // o alvo de um missil em voo ja esta perdido; uma fusao que ja juntou volta como os membros
        // de antes (ao voltar, eles se encostam e a fusao se refaz: os pontos entram uma vez so)
        slimes: S.mundo.vivos().filter((s) => !s.preso && !s.dados.marcado && !juntos.has(s))
          .map((s) => [s.nivel, +s.cx.toFixed(2), +s.cy.toFixed(2), s.dados.prisma ? 1 : 0])
          .concat(...S.fusoes.filter((F) => F.fase !== 'atrai').map((F) => F.origem)),
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
      // partida de antes do pote estreito (sem a marca) ou que ja cresceu: largura de sempre
      if (!p.estreito) J.pote.crescer(0);
      if (p.alargado) J.pote.alargar();
      // (a gosma cinza da chuva saiu do sem fim: a de um save antigo volta como slime do nivel)
      for (const [k, x, y, prisma] of (p.slimes || []).slice().sort((a, b) => a[2] - b[2])) {
        const s = criar(S, J, { nivel: k, prisma }, x, y, false);
        if (s) { s.dados.pote = 0; s.dados.solto = -10; }
      }
      if (!comPressao) return;
      if (p.agenda) S.extra.agenda = criarAgenda(p.agenda);
      // evento que nao existe mais (a chuva de gosma): a agenda segue para o proximo
      if (S.extra.agenda && S.extra.agenda.ev && !EVENTOS[S.extra.agenda.ev.id]) encerrarEvento(S.extra.agenda, S.tempo);
      S.extra.coringas = p.coringas || 0;
      // um evento de calor ou gelo em curso volta no pote todo
      const ev = S.extra.agenda && S.extra.agenda.ev;
      if (ev && ev.fase === 'ativo' && (ev.id === 'calor' || ev.id === 'gelo')) {
        for (const s of S.mundo.vivos()) { s.estado = ev.id; s.tEstado = Math.max(0, ev.dur - ev.t); }
      }
      if (ev && ev.id === 'terremoto') S.extra.tremores = 3;
      // partida de antes da escada (1.2.0) com slimes abaixo do piso: evoluem ao voltar
      if (piso(S) > 1 && (p.slimes || []).some((q) => !q[3] && q[0] < piso(S))) S.extra.evoluir = piso(S);
    },
  }, o);
  ligarAparencias(jogo, AP, (s) => !!s.dados.prisma);
  /** Depuracao (?evento=) e testes: o proximo evento da agenda e esse, comecando ja (com o aviso). */
  jogo.forcarEvento = (/** @type {string} */ id) => {
    if (!comPressao || !EVENTOS[id]) return;
    const S = jogo.S;
    const A = S.extra.agenda || (S.extra.agenda = criarAgenda());
    A.ev = null;
    A.i = CICLO.indexOf(id);
    A.prox = S.tempo + AGENDA.aviso;
  };
  if (regra === 'semPoderes') {
    for (const J of jogo.S.jogadores) { J.poderes = { trocar: 0, chacoalhar: 0, alargar: 0, mira: 0 }; J.semVideo = true; }
  }
  if (o.vitrine) {
    // depuracao: os niveis altos (texturas) e o coringa ja no pote
    const S = jogo.S;
    const J = S.jogadores[0];
    const lista = o.vitrine === 5 ? [[13, 0, 4.0]]
      : o.vitrine === 4
        ? [[6, -2.2, 1.7], [5, 1.9, 1.5], [4, -2.6, 5.2], [3, 0.2, 4.8], [2, 2.8, 4.6], [1, -1.2, 7.6], [7, 1.6, 8.2]]
        : o.vitrine === 3 ? [[11, 0, 3.4]] : o.vitrine === 2 ? [[12, 0, 3.8]] : [[10, -1.6, 2.8], [9, 2.2, 2.6], [8, -1.6, 8], [7, 2.2, 7.6]];
    for (const [k, x, y] of lista) {
      const s = criar(S, J, { nivel: k }, x, y, false);
      if (s) { s.dados.pote = 0; s.dados.solto = -10; }
    }
    const p = o.vitrine > 1 ? null : criar(S, J, { nivel: 3, prisma: true }, 0.3, 11.5, false);
    if (p) { p.dados.pote = 0; p.dados.solto = -10; }
    // a barra mostra a escada inteira no print, e a meta da vez segue o maior nivel do pote
    visto = MAX_NIVEL;
    J.maxNivel = Math.max(...lista.map((l) => l[0]));
  }
  return jogo;
}

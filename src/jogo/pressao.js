// Pressao do sem fim (2.0.0). No Player Fit Test da 1.2.0, 92% das partidas acabavam com o pote
// vivo (o jogador saia, nao perdia) e a novidade acabava no minuto 3: o 10, o 11 e o 12 levavam
// ~2, 4 e 7 min cada, porque so caiam os niveis 1 a 5. Escolha do usuario em 2026-10-17: o sem
// fim continua uma partida so, sem derrota, com duas coisas que mantem o ritmo:
//  - a ESCADA: do nivel 9 em diante, cada nivel novo sobe o piso das gotas (a janela de 5 niveis
//    anda junto); os slimes que ficaram abaixo do piso evoluem (merge.js);
//  - a AGENDA: um evento a cada ~60 s a partir dos 90 s, alternando alivio e aperto.
// Logica pura: sem DOM, sem relogio, sem Math.random (o sorteio vem do rng da partida).

/** Pesos da janela de 5 niveis que caem (o primeiro e o piso). */
export const PESOS = Object.freeze([30, 26, 20, 14, 10]);

/**
 * Escada: com o maior nivel da partida em `inicio`, o piso vira 2; cada nivel novo sobe mais 1,
 * ate `teto` (no teto caem 4 a 8). Com o teto 5 caiam gotas do nivel 9, de quase meio pote, e o
 * bot precisava do "Ufa!" 63 vezes em 15 min.
 */
export const ESCADA = Object.freeze({ inicio: 9, teto: 4 });

/**
 * Pesos da janela com o piso acima de 1: mais gotas do piso e poucas do topo. Na simulacao (bot a
 * cada 2 s, 3 sementes, 10 min), com os PESOS o pote passava de 1.000 particulas no minuto 8 (o
 * custo da fisica no celular) e o "Ufa!" vinha ate 10 vezes; com estes, 700-835 particulas e 0-4
 * resgates, e o 12 ainda chega entre 6 e 9 min (na 1.2.0 o jogador real levava ~16).
 */
export const PESOS_ESCADA = Object.freeze([40, 30, 18, 9, 3]);

/**
 * Piso da janela das gotas pelo maior nivel da partida.
 * @param {number} maxNivel
 * @param {{ inicio: number, teto: number }} [e]
 */
export function pisoPara(maxNivel, e = ESCADA) {
  return Math.max(1, Math.min(e.teto, maxNivel - e.inicio + 2));
}

/**
 * Agenda dos eventos (s de partida): o primeiro aos `primeiro`, um a cada `intervalo` (de
 * inicio a inicio, com pelo menos `folga` depois do fim do anterior), com `aviso` s de faixa antes.
 * O intervalo comercial pode vir no fim de um evento a partir do `anuncioDesde`-esimo.
 */
export const AGENDA = Object.freeze({ primeiro: 90, intervalo: 60, folga: 12, aviso: 2, anuncioDesde: 3 });

/**
 * Ordem dos eventos (repete): alivio, meta, caos, aperto, alivio, aperto. A chuva de gosma cinza
 * saiu em 2026-10-17 (pedido do usuario).
 */
export const CICLO = Object.freeze(['coringas', 'pedido', 'terremoto', 'gigante', 'calor', 'gelo']);

/**
 * Cada evento: duracao maxima ativo (s) e o tipo (cor da pilula e som do aviso).
 * @type {Readonly<Record<string, { dur: number, tipo: 'alivio'|'aperto'|'meta'|'caos' }>>}
 */
export const EVENTOS = Object.freeze({
  coringas: { dur: 20, tipo: 'alivio' }, // as 3 proximas gotas sao prismas
  pedido: { dur: 45, tipo: 'meta' }, // faca um nivel X: premio fisico e gotas
  terremoto: { dur: 7, tipo: 'caos' }, // tres tremores do pote inteiro
  gigante: { dur: 15, tipo: 'aperto' }, // a proxima gota e grande
  calor: { dur: 5, tipo: 'alivio' }, // o pote todo amolece e assenta
  gelo: { dur: 8, tipo: 'aperto' }, // o pote todo endurece
});

/** Premio do pedido cumprido (alem do premio fisico, se o espaco estiver livre). */
export const GOTAS_PEDIDO = 15;

/**
 * @typedef {{ id: string, fase: 'aviso'|'ativo', t: number, dur: number, n: number, inicio: number,
 *   alvo?: number, feito?: boolean }} Evento
 * @typedef {{ n: number, i: number, prox: number, ev: Evento|null }} Agenda
 *   n: eventos ja comecados (o intervalo comercial conta por ele); i: posicao no CICLO
 */

/** @param {Partial<Agenda>|null} [salva] @returns {Agenda} */
export function criarAgenda(salva) {
  const s = salva || {};
  return { n: s.n || 0, i: s.i || 0, prox: typeof s.prox === 'number' ? s.prox : AGENDA.primeiro, ev: s.ev ? { ...s.ev } : null };
}

/**
 * Avanca a agenda um passo. Devolve a mudanca deste passo: 'aviso' (a faixa entra), 'start' (o
 * evento comeca), 'fim' (acabou o tempo ou o modo marcou `feito`; quem chama encerra) ou ''.
 * @param {Agenda} A @param {number} tempo s de partida @param {number} dt
 * @returns {''|'aviso'|'start'|'fim'}
 */
export function avancarAgenda(A, tempo, dt) {
  const ev = A.ev;
  if (ev) {
    ev.t += dt;
    if (ev.fase === 'aviso') {
      if (ev.t < AGENDA.aviso) return '';
      ev.fase = 'ativo';
      ev.t = 0;
      return 'start';
    }
    return ev.feito || ev.t >= ev.dur ? 'fim' : '';
  }
  if (tempo < A.prox - AGENDA.aviso) return '';
  const id = CICLO[A.i % CICLO.length];
  A.i++;
  A.n++;
  A.ev = { id, fase: 'aviso', t: 0, dur: EVENTOS[id].dur, n: A.n, inicio: A.prox };
  return 'aviso';
}

/** Encerra o evento atual e marca o proximo. @param {Agenda} A @param {number} tempo */
export function encerrarEvento(A, tempo) {
  const ev = A.ev;
  A.prox = Math.max((ev ? ev.inicio : tempo) + AGENDA.intervalo, tempo + AGENDA.folga);
  A.ev = null;
}

/** Maior gota gigante (o 9 ja tem quase meio pote de largura). */
export const GIGANTE_MAX = 9;

/**
 * Nivel da gota gigante: um acima do topo da janela, sem passar do maior nivel menos 1 nem do
 * GIGANTE_MAX.
 * @param {number} piso @param {number} maxNivel
 */
export function nivelGigante(piso, maxNivel) {
  return Math.max(piso + 1, Math.min(piso + 5, maxNivel - 1, GIGANTE_MAX));
}

/**
 * Alvo do pedido: um nivel acima do mais alto do pote que ainda cai na janela (falta uma gota
 * igual em cima dele); sem nenhum, o piso + 2. Nunca passa do 13.
 * @param {number[]} niveis niveis dos slimes do pote
 * @param {number} piso
 * @param {number} teto o ultimo nivel (13)
 */
export function alvoPedido(niveis, piso, teto) {
  let melhor = 0;
  for (const k of niveis) if (k > piso && k <= piso + 4 && k > melhor) melhor = k;
  return Math.min(teto, melhor ? melhor + 1 : piso + 2);
}

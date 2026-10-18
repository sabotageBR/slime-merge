// Humor de cada slime (2026-10-17, pedido do usuario: "os olhinhos tem que ser individuais de
// cada slime: bem apertado chora, confortavel fica feliz, tem o apatico, tem o furioso"). O
// rosto de base vem do que o corpo sente; o que e passageiro (feliz da fusao, medo da linha,
// tonto, berreiro do missil, a gosma ranzinza) passa por cima e, quando acaba, o humor volta.
// Logica pura: sem DOM, sem relogio, sem Math.random (o tempo entra por dt).

/**
 * Limites. O aperto e o alongamento do corpo (a deformacao do shape matching, que inclui a
 * plastica: o slime espremido fica espremido) mais um pouco por vizinho alem de 2. Medido numa
 * partida do bot (3 sementes, 5 min): mediana 0,31, p80 0,57, p92 0,81; a pressao de contato
 * (s.pressao) ficava abaixo de 0,01 em 99,9% do tempo e nao servia.
 */
export const HUMOR = Object.freeze({
  /** 1/s: quanto a media do aperto segue o de agora */
  media: 2,
  /** aperto abaixo: confortavel (contente) */
  contente: 0.18,
  /** aperto acima: espremido (> <) */
  amassado: 0.55,
  /** aperto acima por `tChoro` s: chora */
  choro: 0.8,
  tChoro: 0.4,
  /** peso de cada vizinho alem de 2 */
  porVizinho: 0.06,
  /** histerese: sai do humor com o aperto abaixo de limite * sai (no contente, acima de limite / sai) */
  sai: 0.85,
  /** s minimo em cada humor (o rosto nao pisca de um para o outro) */
  minimo: 1,
  /** s parado (sem se mexer nem fundir) ate ficar apatico */
  apatico: 20,
  /** u/s: abaixo disso conta como parado */
  vParado: 0.3,
  /** s com a careta depois da pancada */
  careta: 2,
  /** u/s de queda que irrita quem esta embaixo */
  queda: 8,
  /** quem cai precisa ter ao menos esta fracao das particulas de quem leva (o miudo nao irrita o grande) */
  porte: 0.5,
});

/** Humores de base (o rosto de sempre); os outros sao passageiros e passam por cima. */
export const BASE = Object.freeze(['', 'contente', 'amassado', 'chorinho', 'apatico']);

/**
 * Caretas de quem leva uma pancada na cabeca (2026-10-18, pedido do usuario: "somente com raiva
 * esta repetitivo, quero umas 5 variacoes"). Todas de olho aberto.
 */
export const PANCADA = Object.freeze(['furioso', 'zonzo', 'susto', 'emburrado', 'xingando']);

/**
 * Alongamento do corpo: raiz da razao entre os autovalores de A*At (1 = redondo).
 * @param {{ a11: number, a12: number, a21: number, a22: number }} s
 */
export function alongamento(s) {
  const m11 = s.a11 * s.a11 + s.a12 * s.a12;
  const m22 = s.a21 * s.a21 + s.a22 * s.a22;
  const m12 = s.a11 * s.a21 + s.a12 * s.a22;
  const tr = (m11 + m22) / 2;
  const det = m11 * m22 - m12 * m12;
  const d = Math.sqrt(Math.max(0, tr * tr - det));
  const menor = tr - d;
  return menor > 1e-9 ? Math.sqrt((tr + d) / menor) : 3;
}

/**
 * Aperto de agora: alongamento e vizinhos.
 * @param {any} s @param {number} vizinhos slimes encostados
 */
export function aperto(s, vizinhos) {
  return alongamento(s) - 1 + HUMOR.porVizinho * Math.max(0, vizinhos - 2);
}

/**
 * Um quadro do humor de base do slime; poe o rosto quando nada passageiro esta por cima.
 * @param {any} s slime (solto)
 * @param {number} vizinhos
 * @param {number} dt
 */
export function sentir(s, vizinhos, dt) {
  const d = s.dados;
  const H = HUMOR;
  const a = aperto(s, vizinhos);
  d.aperto = d.aperto === undefined ? a : d.aperto + (a - d.aperto) * Math.min(1, H.media * dt);
  // parado: devagar, sem fundir e sem nada passageiro acontecendo
  const v2 = s.vx * s.vx + s.vy * s.vy;
  d.paradoT = v2 > H.vParado * H.vParado || d.fundindo || d.exprT > 0 ? 0 : (d.paradoT || 0) + dt;
  d.tAperto = d.aperto > H.choro ? (d.tAperto || 0) + dt : 0;
  const atual = d.humor || '';
  const x = d.aperto;
  let novo = '';
  if ((x > H.choro && d.tAperto >= H.tChoro) || (atual === 'chorinho' && x > H.choro * H.sai)) novo = 'chorinho';
  else if (x > H.amassado || ((atual === 'amassado' || atual === 'chorinho') && x > H.amassado * H.sai)) novo = 'amassado';
  else if (d.paradoT >= H.apatico) novo = 'apatico';
  else if (x < H.contente || (atual === 'contente' && x < H.contente / H.sai)) novo = 'contente';
  d.humorT = (d.humorT || 0) + dt;
  if (novo !== atual && d.humorT >= H.minimo) {
    d.humor = novo;
    d.humorT = 0;
  }
  if (BASE.includes(d.expr || '')) d.expr = d.humor || '';
}

/**
 * Careta da proxima pancada no slime: cada um tem o seu rodizio (slimes diferentes fazem caretas
 * diferentes, e o mesmo passa pelas 5 antes de repetir).
 * @param {any} o
 */
export function careta(o) {
  const n = PANCADA.length;
  return PANCADA[((o.idx || 0) + 2 * (o.dados.pancadas || 0)) % n];
}

/**
 * Pancada: quem pousou caindo rapido irrita os de outro nivel que estao embaixo dele (a careta da
 * vez; a maioria olha para quem caiu). Devolve quem levou a pancada.
 * @param {any} s o que pousou
 * @param {number} queda maior velocidade da queda (u/s)
 * @param {any[]} encostados slimes encostados nele agora
 * @param {(a: any, b: any) => boolean} fundem os dois vao fundir (ai nao e pancada)
 * @returns {any[]}
 */
export function pancada(s, queda, encostados, fundem) {
  if (queda < HUMOR.queda) return [];
  const out = [];
  for (const o of encostados) {
    if (!o.ativo || o.preso || o.dados.fundindo || o.dados.marcado) continue;
    // o medo da linha, o tonto e o feliz da fusao ficam (so o humor de base vira careta)
    const ja = PANCADA.includes(o.dados.expr);
    if (!BASE.includes(o.dados.expr || '') && !ja) continue;
    if (o.cy >= s.cy || s.n < o.n * HUMOR.porte || fundem(s, o)) continue;
    // outra pancada no meio da careta renova o tempo sem trocar o rosto
    if (!ja) {
      o.dados.expr = careta(o);
      o.dados.pancadas = (o.dados.pancadas || 0) + 1;
    }
    o.dados.exprT = HUMOR.careta;
    o.dados.bravoDe = s.idx;
    o.dados.paradoT = 0;
    out.push(o);
  }
  return out;
}

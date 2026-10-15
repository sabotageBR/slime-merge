// Ajudantes dos modelos de goo (Loja e Molde): bicos que despejam gotas de goo, a massa
// que se junta numa so ao encostar (sem perder volume) e medidas da massa.
// Logica pura.

import { pintar, pigmentoMedio } from '../cor/difusao.js';
import { hexDaMistura } from '../cor/km.js';

/**
 * Gota de goo saindo de um bico.
 * @param {any} m mundo
 * @param {number} x
 * @param {number} y
 * @param {number[]} pig
 * @param {string|any} material
 * @param {number} [n]
 */
export function gota(m, x, y, pig, material = 'goo', n = 7) {
  const s = m.criarSlime({ x, y, n, material, vy: -9 });
  if (!s) return null;
  pintar(m, s, pig);
  s.dados.gota = true;
  s.dados.semRosto = true;
  s.dados.hex = hexDaMistura(pig);
  return s;
}

/**
 * Junta goos que se encostam numa massa so (a maior engole a menor, sem perder volume).
 * @param {any} m
 * @param {(a: any, b: any) => boolean} [pode]
 * @returns {any[]} as massas que cresceram nesta chamada
 */
export function juntarGoo(m, pode) {
  const cresceram = [];
  const usados = new Set();
  for (const [i, j, p] of m.contatos()) {
    if (p < 2 || usados.has(i) || usados.has(j)) continue;
    const a = m.slimes[i];
    const b = m.slimes[j];
    if (!a.ativo || !b.ativo || a.preso || b.preso) continue;
    if (a.mat.nome === 'gelatina' || b.mat.nome === 'gelatina') continue;
    // gota ainda caindo nao gruda (senao o jato vira uma coluna presa ao bico)
    if (a.vy < -2.5 || b.vy < -2.5) continue;
    if (pode && !pode(a, b)) continue;
    usados.add(i);
    usados.add(j);
    const [gr, pe] = a.n >= b.n ? [a, b] : [b, a];
    const dados = gr.dados;
    m.fundir(gr, pe, { px: pe.cx, py: pe.cy, nAlvo: a.n + b.n, rampa: 1, manterForma: true });
    gr.dados = dados;
    if (gr.n > 20) { gr.dados.gota = false; gr.dados.semRosto = false; }
    cresceram.push(gr);
  }
  return cresceram;
}

/**
 * Variacao do pigmento dentro do slime (0 = uniforme): desvio medio das particulas.
 * @param {any} m
 * @param {any} s
 */
export function desuniformidade(m, s) {
  const med = pigmentoMedio(m, s);
  let soma = 0;
  let M = 0;
  for (let a = m.iniSl[s.idx]; a < m.iniSl[s.idx + 1]; a++) {
    const i = m.membros[a];
    let d = 0;
    for (let k = 0; k < 4; k++) d += Math.abs(m.pig[i * 4 + k] - med[k]);
    soma += m.mas[i] * d;
    M += m.mas[i];
  }
  return M ? soma / M : 0;
}

// Recipientes feitos de capsulas (segmento + raio). O desenho e rabiscado; a colisao e limpa.
// Coordenadas do mundo com y para cima; o fundo do pote fica em y = 0, centrado em x = 0.

/** @typedef {{ ax: number, ay: number, bx: number, by: number, r: number }} Capsula */

/** Espessura padrao das paredes (>= raio da particula, contra tunelamento). */
export const ESPESSURA = 0.22;

/**
 * Pote trapezio (o do conceito): boca de `topo` u, fundo de `fundo` u, `altura` u.
 * Indices: 0 = parede esquerda, 1 = fundo, 2 = parede direita.
 * @param {{ topo?: number, fundo?: number, altura?: number, r?: number }} [o]
 * @returns {Capsula[]}
 */
export function poteTrapezio({ topo = 10, fundo = 8, altura = 11, r = ESPESSURA } = {}) {
  const t = topo / 2 + r;
  const f = fundo / 2 + r;
  const y0 = -r;
  return [
    { ax: -f, ay: y0, bx: -t, by: altura, r },
    { ax: -f, ay: y0, bx: f, by: y0, r },
    { ax: f, ay: y0, bx: t, by: altura, r },
  ];
}

/**
 * Parede inclinada de um pote trapezio aberta por um angulo (reforco Alargar):
 * gira a parede em torno do pe, para fora. Sem trigonometria: o giro vem de (c, s) ja prontos.
 * @param {Capsula} p
 * @param {number} c cosseno do giro
 * @param {number} s seno do giro (positivo abre para fora)
 * @param {number} lado -1 esquerda, +1 direita
 * @returns {Capsula}
 */
export function girarParede(p, c, s, lado) {
  const dx = p.bx - p.ax;
  const dy = p.by - p.ay;
  // giro para fora: na esquerda e anti-horario visto com y para cima, na direita horario
  const ss = lado < 0 ? s : -s;
  return { ax: p.ax, ay: p.ay, bx: p.ax + c * dx - ss * dy, by: p.ay + ss * dx + c * dy, r: p.r };
}

/**
 * Polilinha aberta como capsulas (moldes do modelo Molde).
 * @param {number[][]} pontos [[x, y], ...]
 * @param {number} [r]
 * @param {boolean} [fechada]
 * @returns {Capsula[]}
 */
export function polilinha(pontos, r = ESPESSURA, fechada = false) {
  const out = [];
  const n = pontos.length;
  for (let i = 0; i < (fechada ? n : n - 1); i++) {
    const a = pontos[i];
    const b = pontos[(i + 1) % n];
    out.push({ ax: a[0], ay: a[1], bx: b[0], by: b[1], r });
  }
  return out;
}

// Campo que anda com a camera (so dos prototipos; o empacotar apaga esta pasta da build).
// O campo de verdade (src/render/campo.js) fica parado numa janela local, e este involucro
// desloca o mundo antes de acumular: a camera que desce a janela da Corrida na Janela nao
// realoca o campo a cada passo. O que a composicao le (texturas, medida, janela) passa direto;
// a janela devolvida ja vem deslocada, entao o quadro do slime cai no lugar certo da tela.

/**
 * @returns {(c: ReturnType<typeof import('../campo.js').criarCampo>, dx: number, dy: number) => any}
 *   c: o campo parado (janela local); dx, dy: quanto a janela do mundo anda em relacao a ela
 */
export function criarCampoMovel() {
  let xs = new Float64Array(0);
  let ys = new Float64Array(0);
  /** @type {Array<any>} sombras dos slimes (reaproveitadas), com a caixa e o centro deslocados */
  const sombras = [];
  const prox = { x: xs, y: ys, pig: null, membros: null, iniSl: null, slimes: sombras };
  return function (c, dx, dy) {
    const j = c.janela;
    return {
      nx: c.nx, ny: c.ny, t0: c.t0, t1: c.t1, t2: c.t2, celula: c.celula, raio: c.raio,
      janela: [j[0] + dx, j[1] + dy, j[2] + dx, j[3] + dy],
      get caixa() { return c.caixa; },
      get comAparencia() { return c.comAparencia; },
      /** @param {any} m mundo @param {(s: any) => boolean} [filtro] */
      acumular(m, filtro) {
        const n = m.n;
        if (xs.length < n) { xs = new Float64Array(n * 2); ys = new Float64Array(n * 2); }
        for (let i = 0; i < n; i++) { xs[i] = m.x[i] - dx; ys[i] = m.y[i] - dy; }
        prox.x = xs;
        prox.y = ys;
        prox.pig = m.pig;
        prox.membros = m.membros;
        prox.iniSl = m.iniSl;
        sombras.length = m.slimes.length;
        for (let k = 0; k < m.slimes.length; k++) {
          const s = m.slimes[k];
          const o = sombras[k] || (sombras[k] = { real: null });
          o.real = s;
          o.ativo = s.ativo;
          o.idx = s.idx;
          o.dados = s.dados;
          o.esq = s.esq - dx;
          o.dir = s.dir - dx;
          o.base = s.base - dy;
          o.topo = s.topo - dy;
          o.cx = s.cx - dx;
          o.cy = s.cy - dy;
          o.a11 = s.a11;
          o.a12 = s.a12;
          o.a21 = s.a21;
          o.a22 = s.a22;
          o.raio0 = s.raio0;
        }
        c.acumular(prox, filtro ? (o) => filtro(o.real) : undefined);
      },
    };
  };
}

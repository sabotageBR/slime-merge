// Desenho dos cestos (src/jogo/cestos.js): cada estilo pinta a faixa da parede ao longo do
// contorno real das capsulas (que andam no Alargar) e os detalhes do cesto. O vidro tambem
// desenha, por cima dos slimes, o reflexo da frente (o slime fica "dentro" do vidro).

import { aplicar } from './camera.js';
import { TINTA } from './fundo.js';

/** Pontos do contorno de um pote (capsulas encadeadas), com o tremor do terremoto (tx, ty). */
function contorno(paredes, idx) {
  const pts = [];
  idx.forEach((k, n) => {
    const p = paredes[k];
    if (!p) return;
    const tx = p.tx || 0;
    const ty = p.ty || 0;
    if (n === 0) pts.push([p.ax + tx, p.ay + ty]);
    pts.push([p.bx + tx, p.by + ty]);
  });
  return pts;
}

function caminho(ctx, pts) {
  ctx.beginPath();
  pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
}

/** Pontos a cada `passo` u ao longo do contorno, com a normal (para padroes na faixa). */
function amostrar(pts, passo) {
  const out = [];
  let resto = 0;
  for (let k = 0; k < pts.length - 1; k++) {
    const [ax, ay] = pts[k];
    const [bx, by] = pts[k + 1];
    const L = Math.hypot(bx - ax, by - ay);
    if (L < 1e-6) continue;
    const tx = (bx - ax) / L;
    const ty = (by - ay) / L;
    for (let d = resto; d < L; d += passo) out.push([ax + tx * d, ay + ty * d, -ty, tx, tx, ty]);
    resto = (resto - L) % passo;
    if (resto < 0) resto += passo;
  }
  return out;
}

/** Faixa da parede: contorno de tinta e miolo colorido. */
function faixa(ctx, pts, largura, cor, tinta = 0.07) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  caminho(ctx, pts);
  ctx.strokeStyle = TINTA;
  ctx.lineWidth = largura + 2 * tinta;
  ctx.stroke();
  caminho(ctx, pts);
  ctx.strokeStyle = cor;
  ctx.lineWidth = largura;
  ctx.stroke();
}

const ESTILOS = {
  listrado(ctx, pts) {
    faixa(ctx, pts, 0.6, '#ffffff');
    ctx.strokeStyle = TINTA;
    ctx.lineWidth = 0.06;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    for (const [x, y, nx, ny, tx, ty] of amostrar(pts, 0.2)) {
      ctx.moveTo(x + nx * 0.26 - tx * 0.07, y + ny * 0.26 - ty * 0.07);
      ctx.lineTo(x - nx * 0.26 + tx * 0.07, y - ny * 0.26 + ty * 0.07);
    }
    ctx.stroke();
  },
  vime(ctx, pts) {
    faixa(ctx, pts, 0.74, '#d9a25d');
    ctx.lineCap = 'round';
    ctx.lineWidth = 0.09;
    let k = 0;
    for (const [x, y, nx, ny, tx, ty] of amostrar(pts, 0.3)) {
      // trama: gomos alternados, um claro e um escuro
      ctx.strokeStyle = k++ % 2 ? '#a8692e' : '#f0c27e';
      ctx.beginPath();
      ctx.moveTo(x + nx * 0.28 - tx * 0.1, y + ny * 0.28 - ty * 0.1);
      ctx.quadraticCurveTo(x + tx * 0.08, y + ty * 0.08, x - nx * 0.28 - tx * 0.1, y - ny * 0.28 - ty * 0.1);
      ctx.stroke();
    }
    // borda trancada nas pontas
    for (const [x, y] of [pts[0], pts[pts.length - 1]]) {
      ctx.fillStyle = '#c48a46';
      ctx.strokeStyle = TINTA;
      ctx.lineWidth = 0.06;
      ctx.beginPath();
      ctx.ellipse(x, y + 0.1, 0.5, 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  },
  vidro(ctx, pts) {
    // miolo do vidro: tom azulado bem leve atras dos slimes
    ctx.fillStyle = 'rgba(190, 230, 255, 0.28)';
    caminho(ctx, pts);
    ctx.closePath();
    ctx.fill();
    faixa(ctx, pts, 0.42, 'rgba(220, 244, 255, 0.95)', 0.06);
    caminho(ctx, pts);
    ctx.strokeStyle = 'rgba(120, 190, 230, 0.55)';
    ctx.lineWidth = 0.08;
    ctx.stroke();
  },
  madeira(ctx, pts) {
    faixa(ctx, pts, 0.72, '#c08a52');
    ctx.strokeStyle = '#8a5a2e';
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    for (const [x, y, nx, ny] of amostrar(pts, 0.55)) {
      ctx.moveTo(x + nx * 0.34, y + ny * 0.34);
      ctx.lineTo(x - nx * 0.34, y - ny * 0.34);
    }
    ctx.stroke();
    // veio da madeira
    ctx.strokeStyle = 'rgba(110, 66, 30, 0.45)';
    ctx.lineWidth = 0.035;
    caminho(ctx, pts);
    ctx.stroke();
  },
  ferro(ctx, pts) {
    faixa(ctx, pts, 0.7, '#3d4250');
    caminho(ctx, pts);
    ctx.strokeStyle = 'rgba(160, 170, 190, 0.5)';
    ctx.lineWidth = 0.12;
    ctx.stroke();
    ctx.fillStyle = '#8d95a8';
    for (const [x, y, nx, ny] of amostrar(pts, 0.9)) {
      ctx.beginPath();
      ctx.arc(x + nx * 0.18, y + ny * 0.18, 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  porcelana(ctx, pts) {
    faixa(ctx, pts, 0.5, '#fbfbff');
    ctx.fillStyle = '#4f7fd8';
    let k = 0;
    for (const [x, y, nx, ny] of amostrar(pts, 0.7)) {
      if (k++ % 2) continue;
      ctx.beginPath();
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        ctx.ellipse(x + Math.cos(a) * 0.08 + nx * 0.02, y + Math.sin(a) * 0.08 + ny * 0.02, 0.06, 0.04, a, 0, Math.PI * 2);
      }
      ctx.fill();
    }
  },
};

/** Detalhes que nao sao a faixa: alca, pes, marcas, pires, rosca, cascalho. */
/** @param {boolean} [numeros] os numeros da graduacao do bequer (a thumb da Poki vai sem texto) */
function detalhes(ctx, C, pts, t, numeros = true) {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const cx = (x0 + x1) / 2;
  const topoE = pts[0];
  const topoD = pts[pts.length - 1];
  ctx.lineCap = 'round';
  switch (C.detalhe) {
    case 'alca': {
      // alca de arame do balde (atras, por cima da boca)
      ctx.strokeStyle = TINTA;
      ctx.lineWidth = 0.14;
      ctx.beginPath();
      ctx.moveTo(topoE[0], topoE[1] - 0.4);
      ctx.bezierCurveTo(topoE[0] + 0.6, topoE[1] + 3.6, topoD[0] - 0.6, topoD[1] + 3.6, topoD[0], topoD[1] - 0.4);
      ctx.stroke();
      ctx.strokeStyle = '#9aa1ae';
      ctx.lineWidth = 0.06;
      ctx.stroke();
      // aros de metal nas laterais
      for (const yh of [1.6, 8.2]) {
        for (const lado of [-1, 1]) {
          const p = pts.reduce((m, q) => (Math.abs(q[1] - yh) < Math.abs(m[1] - yh) && Math.sign(q[0] - cx) === lado ? q : m), pts[lado < 0 ? 0 : pts.length - 1]);
          ctx.fillStyle = '#6f7684';
          ctx.strokeStyle = TINTA;
          ctx.lineWidth = 0.05;
          ctx.beginPath();
          ctx.rect(p[0] - 0.42, yh - 0.16, 0.84, 0.32);
          ctx.fill();
          ctx.stroke();
        }
      }
      break;
    }
    case 'pes': {
      // tres pes do caldeirao e o brilho verde na boca
      ctx.fillStyle = '#2a2e38';
      ctx.strokeStyle = TINTA;
      ctx.lineWidth = 0.06;
      for (const dx of [-2.6, 0, 2.6]) {
        ctx.beginPath();
        ctx.moveTo(cx + dx - 0.45, y0 + 0.4);
        ctx.lineTo(cx + dx + 0.45, y0 + 0.4);
        ctx.lineTo(cx + dx + 0.3, y0 - 0.75);
        ctx.lineTo(cx + dx - 0.3, y0 - 0.75);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      const brilho = 0.35 + 0.15 * Math.sin(t * 2.4);
      const g = ctx.createRadialGradient(cx, topoE[1], 0.2, cx, topoE[1], 4.5);
      g.addColorStop(0, `rgba(120, 255, 140, ${brilho})`);
      g.addColorStop(1, 'rgba(120, 255, 140, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - 5, topoE[1] - 1, 10, 3);
      break;
    }
    case 'xicara': {
      // pires e alca
      ctx.fillStyle = '#fbfbff';
      ctx.strokeStyle = TINTA;
      ctx.lineWidth = 0.08;
      ctx.beginPath();
      ctx.ellipse(cx, y0 - 0.2, 5.4, 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#4f7fd8';
      ctx.lineWidth = 0.08;
      ctx.beginPath();
      ctx.ellipse(cx, y0 - 0.2, 4.6, 0.32, 0, 0, Math.PI * 2);
      ctx.stroke();
      // alca encostada na parede direita, na altura de 6,2 u
      let xw = x1;
      let dmin = Infinity;
      for (const [px, py] of pts) if (px > cx && Math.abs(py - 6.2) < dmin) { dmin = Math.abs(py - 6.2); xw = px; }
      ctx.strokeStyle = TINTA;
      ctx.lineWidth = 0.62;
      ctx.beginPath();
      ctx.ellipse(xw + 0.15, 6.0, 1.3, 1.8, 0, -Math.PI * 0.55, Math.PI * 0.55);
      ctx.stroke();
      ctx.strokeStyle = '#fbfbff';
      ctx.lineWidth = 0.46;
      ctx.stroke();
      break;
    }
    case 'becher': {
      // marcas de medida (ml) na lateral direita
      ctx.strokeStyle = 'rgba(40, 110, 170, 0.75)';
      ctx.fillStyle = 'rgba(40, 110, 170, 0.75)';
      ctx.lineWidth = 0.05;
      ctx.font = '0.42px Fredoka, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.save();
      ctx.scale(1, -1);
      for (let k = 1; k <= 9; k++) {
        const y = k * 1.1;
        const larga = k % 2 === 0;
        ctx.beginPath();
        ctx.moveTo(x1 - 0.32, -y);
        ctx.lineTo(x1 - (larga ? 1.1 : 0.7), -y);
        ctx.stroke();
        if (larga && numeros) ctx.fillText(String(k * 50), x1 - 1.2, -y + 0.15);
      }
      ctx.restore();
      break;
    }
    case 'rosca': {
      // rosca do pote de vidro
      ctx.strokeStyle = 'rgba(120, 190, 230, 0.9)';
      ctx.lineWidth = 0.07;
      for (let k = 0; k < 3; k++) {
        const y = topoE[1] - 0.15 - k * 0.22;
        ctx.beginPath();
        ctx.moveTo(topoE[0] - 0.12, y);
        ctx.lineTo(topoD[0] + 0.12, y - 0.08);
        ctx.stroke();
      }
      break;
    }
    case 'aquario': {
      // cascalho no fundo
      const cores = ['#f2c14e', '#e86a6a', '#7cc6ff', '#9be08b', '#c79bff'];
      for (let k = 0; k < 22; k++) {
        const x = cx - 3.4 + (k * 0.33) + Math.sin(k * 7.1) * 0.1;
        const y = y0 + 0.35 + Math.abs(Math.sin(k * 3.3)) * 0.25 + (Math.abs(x - cx) > 2.6 ? 0.35 : 0);
        ctx.fillStyle = cores[k % cores.length];
        ctx.strokeStyle = TINTA;
        ctx.lineWidth = 0.04;
        ctx.beginPath();
        ctx.ellipse(x, y, 0.2, 0.14, k, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
    default:
      break;
  }
}

/**
 * Cestos e paredes soltas, no canvas de fundo (atras dos slimes).
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./camera.js').Camera} cam
 * @param {number} dpr
 * @param {any[]} paredes  mundo.paredes
 * @param {{ potes?: any[], t?: number, estiloSoltas?: string, numeros?: boolean }} o  potes: [{ idx, cesto }];
 *   estiloSoltas: estilo das paredes que nao sao de um cesto (loja, molde, lab), o do cesto escolhido;
 *   numeros: false tira os numeros da graduacao (thumb)
 */
export function desenharCestos(ctx, cam, dpr, paredes, o = {}) {
  aplicar(ctx, cam, dpr);
  const usadas = new Set();
  for (const P of o.potes || []) {
    const pts = contorno(paredes, P.idx);
    if (pts.length < 2) continue;
    P.idx.forEach((k) => usadas.add(k));
    const C = P.cesto;
    if (C.detalhe === 'alca' || C.detalhe === 'pes' || C.detalhe === 'aquario') detalhes(ctx, C, pts, o.t || 0);
    (ESTILOS[C.estilo] || ESTILOS.listrado)(ctx, pts);
    if (C.detalhe && !['alca', 'pes', 'aquario'].includes(C.detalhe)) detalhes(ctx, C, pts, o.t || 0, o.numeros !== false);
  }
  // paredes que nao sao de nenhum cesto (lab, loja, molde): no estilo do cesto escolhido,
  // juntando as capsulas encadeadas numa polilinha so (emendas limpas e miolo do vidro)
  const estilo = ESTILOS[o.estiloSoltas || 'listrado'] || ESTILOS.listrado;
  /** @type {number[][][]} */
  const grupos = [];
  let atual = null;
  paredes.forEach((p, k) => {
    if (usadas.has(k) || p.oculta) { atual = null; return; }
    const tx = p.tx || 0;
    const ty = p.ty || 0;
    const emenda = atual && Math.abs(atual[atual.length - 1][0] - p.ax - tx) < 1e-6 && Math.abs(atual[atual.length - 1][1] - p.ay - ty) < 1e-6;
    if (emenda) atual.push([p.bx + tx, p.by + ty]);
    else { atual = [[p.ax + tx, p.ay + ty], [p.bx + tx, p.by + ty]]; grupos.push(atual); }
  });
  for (const g of grupos) estilo(ctx, g);
}

/**
 * Reflexo do vidro por cima dos slimes (canvas de cima): faixas brancas finas na lateral.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./camera.js').Camera} cam
 * @param {number} dpr
 * @param {any[]} paredes
 * @param {any[]} potes
 */
export function desenharReflexos(ctx, cam, dpr, paredes, potes) {
  aplicar(ctx, cam, dpr);
  for (const P of potes || []) {
    if (P.cesto.estilo !== 'vidro') continue;
    const pts = contorno(paredes, P.idx);
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    ctx.save();
    caminho(ctx, pts);
    ctx.closePath();
    ctx.clip();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineCap = 'round';
    ctx.lineWidth = 0.32;
    ctx.beginPath();
    ctx.moveTo(x0 + 0.85, y0 + 1.4);
    ctx.lineTo(x0 + 0.85, y1 - 1.6);
    ctx.stroke();
    ctx.lineWidth = 0.12;
    ctx.beginPath();
    ctx.moveTo(x0 + 1.4, y0 + 2.2);
    ctx.lineTo(x0 + 1.4, y0 + 4.6);
    ctx.stroke();
    ctx.restore();
  }
}

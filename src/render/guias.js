// Onboarding sem texto: a mao que arrasta e toca (e as teclas desenhadas no desktop), e o
// anel da mira quando um reforco espera o alvo.

import { paraTela } from './camera.js';
import { TINTA } from './fundo.js';

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./camera.js').Camera} cam
 * @param {number} dpr
 * @param {any} vis  modo.visual()
 * @param {number} t
 * @param {any} mundo
 */
export function desenharGuias(ctx, cam, dpr, vis, t, mundo) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (vis.mao) {
    const ciclo = t % 2.4;
    // vai e volta (0..1,6 s) e toca (1,6..2,4 s)
    const k = ciclo < 1.6 ? ciclo / 1.6 : 1;
    const ida = k < 0.5 ? k * 2 : 2 - k * 2;
    const wx = vis.mao.x + (ida - 0.5) * 2 * vis.mao.amplitude;
    const [sx, sy] = paraTela(cam, wx, vis.mao.y - 0.4);
    const apertando = ciclo > 1.75 && ciclo < 2.05;
    mao(ctx, sx, sy + (apertando ? 6 : 0), Math.max(26, cam.s * 1.1));
    if (vis.mao.tecla) teclas(ctx, sx, sy + Math.max(26, cam.s * 1.1) * 1.9, Math.max(18, cam.s * 0.62), ida, apertando);
  }
  if (vis.zonas) zonas(ctx, cam, vis.zonas, t);
  if (vis.calor) calor(ctx, cam, vis.calor, t);
  if (vis.espinhos) espinhos(ctx, cam, vis.espinhos);
  if (vis.bicos) bicos(ctx, cam, vis.bicos, t);
  if (vis.alvo && mundo) {
    // anel pulsando em volta de cada slime que pode ser escolhido
    const pulso = 1 + 0.08 * Math.sin(t * 8);
    ctx.strokeStyle = '#ff8a2a';
    ctx.lineWidth = 3;
    ctx.setLineDash([7, 5]);
    for (const s of mundo.slimes) {
      if (!s.ativo || s.preso) continue;
      const [sx, sy] = paraTela(cam, s.cx, s.cy);
      ctx.beginPath();
      ctx.arc(sx, sy, s.raio0 * cam.s * 1.05 * pulso, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }
}

/** Mao de desenho (indicador apontando para cima). */
function mao(ctx, x, y, tam) {
  ctx.save();
  ctx.translate(x, y);
  const u = tam / 10;
  ctx.lineWidth = Math.max(2.5, u * 0.9);
  ctx.strokeStyle = TINTA;
  ctx.fillStyle = '#ffffff';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  // dedo
  ctx.moveTo(-1.2 * u, 0);
  ctx.lineTo(-1.2 * u, -6 * u);
  ctx.arc(0, -6 * u, 1.2 * u, Math.PI, 0);
  ctx.lineTo(1.2 * u, -1 * u);
  // dedos dobrados e palma
  ctx.lineTo(3.4 * u, -0.6 * u);
  ctx.quadraticCurveTo(4.6 * u, -0.4 * u, 4.4 * u, 1 * u);
  ctx.lineTo(4.2 * u, 5 * u);
  ctx.quadraticCurveTo(4 * u, 8 * u, 0.5 * u, 8 * u);
  ctx.lineTo(-1.5 * u, 8 * u);
  ctx.quadraticCurveTo(-4 * u, 8 * u, -4.4 * u, 5 * u);
  ctx.lineTo(-4.8 * u, 2.2 * u);
  ctx.quadraticCurveTo(-4.8 * u, 0.6 * u, -3.2 * u, 0.8 * u);
  ctx.lineTo(-1.2 * u, 2.5 * u);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** Teclas desenhadas: setas e espaco (a Poki pede a imagem do teclado no desktop). */
function teclas(ctx, x, y, tam, ida, apertando) {
  const tecla = (cx, cy, w, h, rotulo, aceso) => {
    ctx.fillStyle = aceso ? '#ffd23a' : '#ffffff';
    ctx.strokeStyle = TINTA;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    retArredondado(ctx, cx - w / 2, cy - h / 2, w, h, h * 0.22);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = TINTA;
    ctx.font = `700 ${h * 0.5}px Fredoka, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(rotulo, cx, cy + h * 0.03);
  };
  const h = tam;
  tecla(x - h * 1.3, y, h, h, '←', ida < 0.5 && !apertando);
  tecla(x - h * 0.2, y, h, h, '→', ida >= 0.5 && !apertando);
  tecla(x + h * 1.9, y, h * 2.4, h, 'space', apertando);
}

/** roundRect sem depender do metodo (Safari antigo nao tem; na 0.4.x do 2048 isso parava o laco). */
function retArredondado(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Bicos de tinta (Loja e Molde): tubo com a ponta da cor, gota pulando na dica. */
function bicos(ctx, cam, lista, t) {
  for (const b of lista) {
    const [sx, sy] = paraTela(cam, b.x, b.y);
    const w = cam.s * 1.1;
    const h = cam.s * 1.5;
    ctx.lineWidth = Math.max(2.5, cam.s * 0.09);
    ctx.strokeStyle = TINTA;
    ctx.fillStyle = '#e9e9ef';
    ctx.beginPath();
    retArredondado(ctx, sx - w / 2, sy - h * 0.9, w, h * 0.8, w * 0.22);
    ctx.fill();
    ctx.stroke();
    // bocal
    ctx.fillStyle = b.cor;
    ctx.beginPath();
    ctx.moveTo(sx - w * 0.32, sy - h * 0.12);
    ctx.lineTo(sx + w * 0.32, sy - h * 0.12);
    ctx.lineTo(sx + w * 0.16, sy + h * 0.18);
    ctx.lineTo(sx - w * 0.16, sy + h * 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // tampa colorida
    ctx.beginPath();
    ctx.arc(sx, sy - h * 0.92, w * 0.42, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (b.ativo) {
      ctx.strokeStyle = '#ff8a2a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      retArredondado(ctx, sx - w / 2 - 4, sy - h * 0.9 - 4, w + 8, h * 0.8 + 8, w * 0.25);
      ctx.stroke();
    }
    if (b.dica) {
      const pulo = Math.abs(Math.sin(t * 5)) * cam.s * 0.35;
      const gy = sy - h * 1.55 - pulo;
      ctx.fillStyle = b.cor;
      ctx.strokeStyle = TINTA;
      ctx.lineWidth = Math.max(2, cam.s * 0.07);
      ctx.beginPath();
      ctx.moveTo(sx, gy - cam.s * 0.42);
      ctx.quadraticCurveTo(sx + cam.s * 0.32, gy, sx, gy + cam.s * 0.26);
      ctx.quadraticCurveTo(sx - cam.s * 0.32, gy, sx, gy - cam.s * 0.42);
      ctx.fill();
      ctx.stroke();
    }
  }
}

/** Zonas a encher: contorno tracejado (verde quando cheia). */
function zonas(ctx, cam, lista, t) {
  for (const z of lista) {
    ctx.save();
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -t * 20;
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = z.cheia ? 'rgba(60, 190, 90, 0.95)' : 'rgba(23, 22, 28, 0.45)';
    ctx.beginPath();
    z.pts.forEach(([x, y], k) => {
      const [sx, sy] = paraTela(cam, x, y);
      if (k) ctx.lineTo(sx, sy); else ctx.moveTo(sx, sy);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

/** Aquecedor: retangulo laranja com ondinhas de calor. */
function calor(ctx, cam, lista, t) {
  for (const r of lista) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 120, 40, 0.13)';
    ctx.strokeStyle = 'rgba(255, 110, 30, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    r.forEach(([x, y], k) => {
      const [sx, sy] = paraTela(cam, x, y);
      if (k) ctx.lineTo(sx, sy); else ctx.moveTo(sx, sy);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    const [cx, cy] = paraTela(cam, (r[0][0] + r[2][0]) / 2, (r[0][1] + r[2][1]) / 2);
    ctx.beginPath();
    for (let k = -1; k <= 1; k++) {
      for (let a = 0; a <= 12; a++) {
        const yy = cy + cam.s * 0.5 - a * cam.s * 0.08;
        const xx = cx + k * cam.s * 0.35 + Math.sin(a * 0.9 + t * 6 + k) * cam.s * 0.08;
        if (a) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy);
      }
    }
    ctx.stroke();
    ctx.restore();
  }
}

/** Espinho: estrela de pontas cinzas com contorno. */
function espinhos(ctx, cam, lista) {
  for (const e of lista) {
    const [sx, sy] = paraTela(cam, e.x, e.y);
    const R = e.r * cam.s;
    ctx.fillStyle = '#b8bcc8';
    ctx.strokeStyle = TINTA;
    ctx.lineWidth = Math.max(2, cam.s * 0.07);
    ctx.beginPath();
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2 - (e.ang || 0);
      const r = k % 2 ? R * 0.45 : R;
      const x = sx + Math.cos(a) * r;
      const y = sy + Math.sin(a) * r;
      if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

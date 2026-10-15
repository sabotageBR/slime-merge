// Missil teleguiado da mira (canvas por cima do HUD, px CSS): sai do botao da mira, faz uma
// curva e persegue o alvo (a curva e refeita a cada quadro com a posicao atual do slime).
// Foguete cartum com chama e rastro de fumaca. O tempo vem do jogo (visual().missil).

import { TINTA } from './fundo.js';

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} dpr
 * @param {number[]} origem [x, y] px (centro do botao da mira)
 * @param {number[]} alvo   [x, y] px (centro do slime)
 * @param {{ t: number, choro: number, impacto: number }} m
 * @param {number} tam      comprimento do foguete (px)
 */
export function desenharMissil(ctx, dpr, origem, alvo, m, tam) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const [ox, oy] = origem;
  const [ax, ay] = alvo;
  // ponto de controle: acima do meio do caminho, para o missil "subir e mergulhar"
  const mx = (ox + ax) / 2;
  const my = (oy + ay) / 2;
  const d = Math.hypot(ax - ox, ay - oy) || 1;
  const cx = mx + ((oy - ay) / d) * d * 0.18;
  const cy = Math.min(my, oy, ay) - d * 0.35;
  const bez = (p) => {
    const q = 1 - p;
    return [q * q * ox + 2 * q * p * cx + p * p * ax, q * q * oy + 2 * q * p * cy + p * p * ay];
  };
  const tan = (p) => [2 * (1 - p) * (cx - ox) + 2 * p * (ax - cx), 2 * (1 - p) * (cy - oy) + 2 * p * (ay - cy)];
  if (m.t < m.choro) {
    // armando no botao: cresce e treme apontando para a curva
    const k = m.t / m.choro;
    const [tx, ty] = tan(0);
    foguete(ctx, ox + Math.sin(m.t * 70) * 1.5, oy, Math.atan2(ty, tx), tam * (0.4 + 0.6 * k), m.t);
    return;
  }
  // voo acelerando
  const v = Math.min(1, (m.t - m.choro) / (m.impacto - m.choro));
  const p = v * v * (1.6 - 0.6 * v);
  // rastro de fumaca (amostrado na propria curva, sem historico)
  for (let k = 9; k >= 1; k--) {
    const pk = p - k * 0.045;
    if (pk <= 0) continue;
    const [fx, fy] = bez(pk);
    const r = tam * (0.1 + k * 0.035);
    ctx.globalAlpha = Math.max(0, 0.75 - k * 0.07);
    ctx.fillStyle = TINTA;
    ctx.beginPath();
    ctx.arc(fx, fy, r + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#eceaf2';
    ctx.beginPath();
    ctx.arc(fx, fy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const [x, y] = bez(p);
  const [tx, ty] = tan(Math.min(0.999, p));
  foguete(ctx, x, y, Math.atan2(ty, tx), tam, m.t);
}

/** Foguete cartum apontando para `ang` (nariz para a frente), centrado em (x, y). */
function foguete(ctx, x, y, ang, L, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  const w = L * 0.3;
  const traco = Math.max(2, L * 0.07);
  ctx.lineJoin = 'round';
  ctx.lineWidth = traco;
  ctx.strokeStyle = TINTA;
  // chama atras (pisca)
  const f = 0.75 + 0.25 * Math.sin(t * 60);
  ctx.fillStyle = '#ff8a2a';
  ctx.beginPath();
  ctx.moveTo(-L * 0.42, -w * 0.38);
  ctx.quadraticCurveTo(-L * (0.75 + 0.2 * f), 0, -L * 0.42, w * 0.38);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffd23a';
  ctx.beginPath();
  ctx.moveTo(-L * 0.42, -w * 0.2);
  ctx.quadraticCurveTo(-L * (0.6 + 0.1 * f), 0, -L * 0.42, w * 0.2);
  ctx.closePath();
  ctx.fill();
  // aletas
  ctx.fillStyle = '#ef3e4f';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(-L * 0.18, s * w * 0.4);
    ctx.lineTo(-L * 0.46, s * w * 0.95);
    ctx.lineTo(-L * 0.44, s * w * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // corpo
  ctx.fillStyle = '#f4f3f8';
  ctx.beginPath();
  ctx.moveTo(-L * 0.44, -w * 0.5);
  ctx.lineTo(L * 0.18, -w * 0.5);
  ctx.quadraticCurveTo(L * 0.5, -w * 0.45, L * 0.56, 0);
  ctx.quadraticCurveTo(L * 0.5, w * 0.45, L * 0.18, w * 0.5);
  ctx.lineTo(-L * 0.44, w * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // nariz vermelho
  ctx.fillStyle = '#ef3e4f';
  ctx.beginPath();
  ctx.moveTo(L * 0.3, -w * 0.47);
  ctx.quadraticCurveTo(L * 0.5, -w * 0.42, L * 0.56, 0);
  ctx.quadraticCurveTo(L * 0.5, w * 0.42, L * 0.3, w * 0.47);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // janelinha
  ctx.fillStyle = '#5fd9ff';
  ctx.beginPath();
  ctx.arc(L * 0.02, 0, w * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

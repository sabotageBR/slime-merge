// Desenhos do Volei de Gosma (src/jogo/modos/volei.js): praia (ceu, sol, nuvens, mar, ilha e
// areia; tela inteira), poste da rede, sombras, bola de volei (girando, com rastro), impactos,
// acessorios dos rivais (chapeu, faixa, coroa) e as dicas do comeco. Estilo do jogo: contorno
// grosso de tinta, cores chapadas, brilho branco. Funcoes puras de ctx/cam/vis.

import { aplicar, paraTela } from '../camera.js';
import { TINTA } from '../fundo.js';

const CEU = ['#5cc8ff', '#9fe0ff', '#d7f5ff'];
const MAR = ['#2a9fd8', '#3fbde6', '#5fd6ee'];
const AREIA = '#f4cf7e';
const AREIA_ESCURA = '#e2b35f';
const AREIA_CLARA = '#fbe3a6';
const HORIZONTE = 5.4;
const BEIRA = 1.15;

/** Pseudo-aleatorio fixo por indice (posicoes estaveis entre quadros). */
const h = (k) => {
  const s = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Nuvem chapada com contorno (px CSS). */
function nuvem(ctx, x, y, r, tr) {
  ctx.beginPath();
  ctx.moveTo(x - r * 2.2, y);
  ctx.arc(x - r * 1.2, y, r * 0.9, Math.PI, Math.PI * 1.75);
  ctx.arc(x, y - r * 0.35, r * 1.15, Math.PI * 1.15, Math.PI * 1.9);
  ctx.arc(x + r * 1.25, y, r * 0.85, Math.PI * 1.3, 0);
  ctx.lineTo(x + r * 2.1, y);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = tr;
  ctx.strokeStyle = TINTA;
  ctx.stroke();
}

/**
 * Cenario da praia: tela inteira (px CSS).
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../camera.js').Camera} cam
 * @param {number} dpr @param {number} W @param {number} H @param {number} t
 */
export function desenharCenario(ctx, cam, dpr, W, H, t) {
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const u = cam.s;
  const tr = Math.max(2, Math.min(3.5, u * 0.09));
  const yH = paraTela(cam, 0, HORIZONTE)[1];
  const yB = paraTela(cam, 0, BEIRA)[1];
  const y0 = paraTela(cam, 0, 0)[1];
  // ceu
  const g = ctx.createLinearGradient(0, 0, 0, yH);
  g.addColorStop(0, CEU[0]);
  g.addColorStop(0.7, CEU[1]);
  g.addColorStop(1, CEU[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, yH + 1);
  // sol com halo
  const [sx, sy] = paraTela(cam, 11.5, 14.4);
  const rs = Math.max(16, u * 1.45);
  ctx.fillStyle = 'rgba(255, 244, 170, 0.55)';
  ctx.beginPath();
  ctx.arc(sx, sy, rs * (1.55 + 0.05 * Math.sin(t * 2)), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd23a';
  ctx.beginPath();
  ctx.arc(sx, sy, rs, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = tr;
  ctx.strokeStyle = TINTA;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = Math.max(2, rs * 0.16);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(sx, sy, rs * 0.62, Math.PI * 1.1, Math.PI * 1.45);
  ctx.stroke();
  // nuvens que passam devagar (atravessam a tela inteira, mesmo no retrato)
  const [xe] = paraTela(cam, -24, 0);
  const [xd] = paraTela(cam, 24, 0);
  const vao = Math.max(W + u * 8, xd - xe);
  for (let k = 0; k < 4; k++) {
    const r = Math.max(10, u * (0.75 + h(k) * 0.4));
    const x = ((h(k + 3) * vao + t * u * (0.25 + h(k + 7) * 0.2)) % vao) - u * 4;
    const y = paraTela(cam, 0, 9.5 + h(k + 11) * 5.5)[1];
    nuvem(ctx, x, y, r, tr * 0.8);
  }
  // mar em faixas, com marolas
  ctx.fillStyle = MAR[0];
  ctx.fillRect(0, yH, W, yB - yH + 1);
  const faixa = (yB - yH) / 3;
  ctx.fillStyle = MAR[1];
  ctx.fillRect(0, yH + faixa, W, yB - yH - faixa + 1);
  ctx.fillStyle = MAR[2];
  ctx.fillRect(0, yH + faixa * 2, W, yB - yH - faixa * 2 + 1);
  // ilha com coqueiro no horizonte
  const [ix, iy] = paraTela(cam, -10.5, HORIZONTE);
  ctx.fillStyle = '#f7d98e';
  ctx.beginPath();
  ctx.ellipse(ix, iy, u * 2.4, u * 0.55, 0, Math.PI, 0);
  ctx.fill();
  ctx.lineWidth = tr * 0.8;
  ctx.strokeStyle = TINTA;
  ctx.stroke();
  ctx.strokeStyle = '#8a5a2b';
  ctx.lineWidth = Math.max(2, u * 0.16);
  ctx.beginPath();
  ctx.moveTo(ix + u * 0.2, iy - u * 0.4);
  ctx.quadraticCurveTo(ix + u * 0.5, iy - u * 1.4, ix + u * 0.1, iy - u * 2.3);
  ctx.stroke();
  ctx.fillStyle = '#43c46a';
  ctx.strokeStyle = TINTA;
  ctx.lineWidth = tr * 0.7;
  for (let k = 0; k < 4; k++) {
    const a = -Math.PI * 0.95 + k * Math.PI * 0.42 + Math.sin(t * 1.3 + k) * 0.05;
    const fx = ix + u * 0.1;
    const fy = iy - u * 2.3;
    ctx.beginPath();
    ctx.ellipse(fx + Math.cos(a) * u * 0.7, fy + Math.sin(a) * u * 0.45, u * 0.8, u * 0.22, a, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // linha do horizonte
  ctx.fillStyle = TINTA;
  ctx.fillRect(0, yH - tr * 0.4, W, tr * 0.8);
  // marolas (tracinhos brancos que vao e voltam)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = Math.max(1.5, u * 0.07);
  ctx.beginPath();
  for (let k = 0; k < 18; k++) {
    const wy = yH + (0.25 + h(k + 40) * 0.6) * (yB - yH);
    const wx = (h(k + 20) * (W + u * 4) + Math.sin(t * 0.8 + k) * u * 0.4) % (W + u * 4) - u * 2;
    const l = u * (0.4 + h(k + 60) * 0.5);
    ctx.moveTo(wx - l, wy);
    ctx.quadraticCurveTo(wx, wy - u * 0.16, wx + l, wy);
  }
  ctx.stroke();
  // areia do fundo (molhada na beira) com a espuma
  ctx.fillStyle = AREIA_CLARA;
  ctx.fillRect(0, yB, W, y0 - yB + 1);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = TINTA;
  ctx.lineWidth = tr * 0.7;
  ctx.beginPath();
  const onda = Math.max(10, u * 0.7);
  const fase = Math.sin(t * 0.9) * u * 0.12;
  ctx.moveTo(0, yB - u * 0.12 + fase);
  for (let x = 0; x <= W + onda; x += onda) ctx.quadraticCurveTo(x + onda / 2, yB + u * 0.22 + fase, x + onda, yB - u * 0.05 + fase);
  ctx.lineTo(W + onda, yB - u * 0.3);
  ctx.lineTo(0, yB - u * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, yB - u * 0.12 + fase);
  for (let x = 0; x <= W + onda; x += onda) ctx.quadraticCurveTo(x + onda / 2, yB + u * 0.22 + fase, x + onda, yB - u * 0.05 + fase);
  ctx.stroke();
  // areia da frente (a quadra) ate o fim da tela
  ctx.fillStyle = AREIA;
  ctx.fillRect(0, y0, W, H - y0);
  ctx.fillStyle = AREIA_ESCURA;
  ctx.fillRect(0, y0, W, Math.max(4, u * 0.18));
  ctx.fillStyle = TINTA;
  ctx.fillRect(0, y0 - tr / 2, W, tr);
  // graozinhos (um caminho so: no retrato a areia ocupa meia tela)
  ctx.fillStyle = 'rgba(160, 110, 40, 0.28)';
  const passo = Math.max(16, u * 0.9);
  ctx.beginPath();
  for (let j = 0, y = y0 + passo * 0.8; y < H; j++, y += passo * 0.7) {
    for (let i = 0, x = (j % 2) * passo * 0.5; x < W; i++, x += passo) {
      const k = i * 31 + j * 17;
      const gx = x + h(k) * passo * 0.6;
      const gy = y + h(k + 5) * passo * 0.4;
      const r = Math.max(1.2, u * 0.05) * (0.6 + h(k + 9));
      ctx.moveTo(gx + r, gy);
      ctx.arc(gx, gy, r, 0, Math.PI * 2);
    }
  }
  ctx.fill();
  ctx.restore();
}

/**
 * Atras dos slimes: sombras na areia e o poste da rede (em u).
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../camera.js').Camera} cam
 * @param {number} dpr @param {number} t @param {any} vis @param {any} m
 */
export function desenharFundo(ctx, cam, dpr, t, vis, m) {
  const V = vis.volei;
  if (!V) return;
  ctx.save();
  aplicar(ctx, cam, dpr);
  const tr = Math.max(0.05, 2.6 / cam.s);
  // sombras dos slimes (o pulo afasta e encolhe)
  ctx.fillStyle = 'rgba(120, 70, 20, 0.22)';
  for (const s of m.slimes) {
    if (!s.ativo) continue;
    const alt = Math.max(0, s.base);
    const w = (s.dir - s.esq) * 0.5 * Math.max(0.4, 1 - alt * 0.12);
    ctx.beginPath();
    ctx.ellipse(s.cx, 0.08, w, 0.22 * Math.max(0.4, 1 - alt * 0.12), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // sombra da bola: menor e mais clara quanto mais alto
  const b = V.bola;
  const k = Math.max(0.25, 1 - b.y / 16);
  ctx.fillStyle = `rgba(120, 70, 20, ${(0.32 * k).toFixed(3)})`;
  ctx.beginPath();
  ctx.ellipse(b.x, 0.1, b.r * (0.6 + 0.7 * k), 0.16 + 0.1 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  // poste da rede: branco com faixas vermelhas e a bandeirinha no alto
  const R = V.rede.r;
  const H = V.rede.h;
  ctx.lineWidth = tr;
  ctx.strokeStyle = TINTA;
  ctx.lineJoin = 'round';
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.rect(-R, -0.25, 2 * R, H - R + 0.25);
  ctx.fill();
  ctx.fillStyle = '#ff5a5a';
  for (let y = 0.35; y < H - R - 0.2; y += 0.7) ctx.fillRect(-R, y, 2 * R, 0.32);
  ctx.beginPath();
  ctx.rect(-R, -0.25, 2 * R, H - R + 0.25);
  ctx.stroke();
  ctx.fillStyle = '#ffd23a';
  ctx.beginPath();
  ctx.arc(0, H - R, R * 1.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // bandeirinha balancando
  const bal = Math.sin(t * 3.2) * 0.12;
  ctx.beginPath();
  ctx.moveTo(0, H + R * 0.2);
  ctx.lineTo(0, H + 1.25);
  ctx.stroke();
  ctx.fillStyle = '#ff5a5a';
  ctx.beginPath();
  ctx.moveTo(0, H + 1.25);
  ctx.quadraticCurveTo(0.45, H + 1.1 + bal, 0.85, H + 0.98 + bal * 1.6);
  ctx.quadraticCurveTo(0.42, H + 0.85 + bal, 0, H + 0.72);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** Bola de volei (em u): branca, com 3 gomos curvos (amarelo, azul, branco) e as costuras. */
function bolaDeVolei(ctx, x, y, r, ang, tr) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.save();
  ctx.clip();
  const cores = ['#ffd23a', '#3d9be9', '#ffffff'];
  for (let k = 0; k < 3; k++) {
    const a = (k * Math.PI * 2) / 3;
    const cx = Math.cos(a) * r * 1.35;
    const cy = Math.sin(a) * r * 1.35;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.02, 0, Math.PI * 2);
    ctx.fillStyle = cores[k];
    ctx.fill();
    ctx.lineWidth = tr * 0.6;
    ctx.strokeStyle = TINTA;
    ctx.stroke();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.lineWidth = tr;
  ctx.strokeStyle = TINTA;
  ctx.stroke();
  ctx.restore();
  // brilho fixo (nao gira com a bola)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineCap = 'round';
  ctx.lineWidth = r * 0.2;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.62, Math.PI * 0.58, Math.PI * 0.9);
  ctx.stroke();
}

/** Acessorio do rival em cima da meia-lua (em u). */
function acessorio(ctx, a, t, tr) {
  const x = a.x;
  const y = a.y;
  ctx.lineWidth = tr;
  ctx.strokeStyle = TINTA;
  ctx.lineJoin = 'round';
  if (a.tipo === 'coroa') {
    const w = 0.75;
    const base = y - 0.25;
    ctx.fillStyle = '#ffd23a';
    ctx.beginPath();
    ctx.moveTo(x - w, base);
    ctx.lineTo(x - w * 1.1, base + 0.95);
    ctx.lineTo(x - w * 0.5, base + 0.5);
    ctx.lineTo(x, base + 1.1);
    ctx.lineTo(x + w * 0.5, base + 0.5);
    ctx.lineTo(x + w * 1.1, base + 0.95);
    ctx.lineTo(x + w, base);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff4d6d';
    for (const [jx, jy, jr] of [[x, base + 0.27, 0.15], [x - w * 1.1, base + 0.95, 0.1], [x, base + 1.1, 0.11], [x + w * 1.1, base + 0.95, 0.1]]) {
      ctx.beginPath();
      ctx.arc(jx, jy, jr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else if (a.tipo === 'chapeu') {
    // chapeu de palha com fita
    const base = y - 0.2;
    ctx.fillStyle = '#f3d27a';
    ctx.beginPath();
    ctx.ellipse(x, base, 1.45, 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 0.75, base + 0.1);
    ctx.bezierCurveTo(x - 0.75, base + 1.0, x + 0.75, base + 1.0, x + 0.75, base + 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff7ab7';
    ctx.beginPath();
    ctx.rect(x - 0.74, base + 0.12, 1.48, 0.2);
    ctx.fill();
    ctx.stroke();
  } else if (a.tipo === 'faixa') {
    // faixa de suor vermelha na testa, com as pontas soltas
    const cy = y - 1.75;
    const rr = 1.45;
    ctx.lineCap = 'butt';
    ctx.strokeStyle = TINTA;
    ctx.lineWidth = 0.42 + tr * 2;
    ctx.beginPath();
    ctx.arc(x, cy, rr, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();
    ctx.strokeStyle = '#ff4d4d';
    ctx.lineWidth = 0.42;
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.1;
    ctx.stroke();
    const px = x + Math.cos(Math.PI * 0.2) * rr;
    const py = cy + Math.sin(Math.PI * 0.2) * rr;
    const bal = Math.sin(t * 6) * 0.08;
    ctx.fillStyle = '#ff4d4d';
    ctx.strokeStyle = TINTA;
    ctx.lineWidth = tr;
    for (const [dx, dy] of [[0.75, 0.15 + bal], [0.65, -0.25 - bal]]) {
      ctx.beginPath();
      ctx.moveTo(px, py + 0.12);
      ctx.lineTo(px + dx, py + dy + 0.1);
      ctx.lineTo(px + dx - 0.05, py + dy - 0.12);
      ctx.lineTo(px, py - 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
}

/** Pilula de texto (px CSS) com contorno de tinta. */
function pilula(ctx, x0, y, texto, tam, cor, W) {
  ctx.font = `700 ${tam}px Fredoka, system-ui, sans-serif`;
  const w = ctx.measureText(texto).width + tam * 1.1;
  // inteira na tela (no retrato a quadra e estreita)
  const x = Math.max(w / 2 + 6, Math.min(W - w / 2 - 6, x0));
  const hh = tam * 1.7;
  const r = hh / 2;
  ctx.beginPath();
  ctx.moveTo(x - w / 2 + r, y - hh / 2);
  ctx.arcTo(x + w / 2, y - hh / 2, x + w / 2, y + hh / 2, r);
  ctx.arcTo(x + w / 2, y + hh / 2, x - w / 2, y + hh / 2, r);
  ctx.arcTo(x - w / 2, y + hh / 2, x - w / 2, y - hh / 2, r);
  ctx.arcTo(x - w / 2, y - hh / 2, x + w / 2, y - hh / 2, r);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = Math.max(2, tam * 0.16);
  ctx.strokeStyle = cor || TINTA;
  ctx.stroke();
  ctx.fillStyle = TINTA;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(texto, x, y + tam * 0.05);
}

/**
 * Na frente dos slimes: impactos, rastro, bola, acessorios e dicas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../camera.js').Camera} cam
 * @param {number} dpr @param {number} t @param {any} vis @param {any} m
 */
export function desenharTopo(ctx, cam, dpr, t, vis, m) {
  const V = vis.volei;
  if (!V) return;
  ctx.save();
  aplicar(ctx, cam, dpr);
  const tr = Math.max(0.05, 2.6 / cam.s);
  // impactos: anel que abre (na areia, graos que pulam)
  for (const f of V.impactos) {
    const p = f.t / 0.5;
    if (p >= 1) continue;
    ctx.globalAlpha = 1 - p;
    if (f.areia) {
      // nuvem de areia: graos que voam em leque e caem
      ctx.fillStyle = '#d9a650';
      for (let k = 0; k < 12; k++) {
        const a = Math.PI * (0.1 + (k / 11) * 0.8);
        const d = 0.3 + p * 2.4 * (0.6 + h(k) * 0.8);
        const gx = f.x + Math.cos(a) * d;
        const gy = f.y + Math.sin(a) * d * (0.7 + h(k + 3) * 0.6) - p * p * 1.6;
        ctx.beginPath();
        ctx.arc(gx, Math.max(0.05, gy), (0.09 + h(k + 7) * 0.1) * (1 - p * 0.4), 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.16 * (1 - p) + tr;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 0.25 + p * 1.4 * f.f, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = TINTA;
      ctx.lineWidth = tr * 0.6;
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  const b = V.bola;
  // rastro da bola rapida
  const vel = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
  if (vel > 12) {
    const a0 = Math.min(0.35, (vel - 12) / 25);
    for (let k = 2; k < b.trilha.length; k += 2) {
      ctx.globalAlpha = a0 * (1 - k / b.trilha.length);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(b.trilha[k], b.trilha[k + 1], b.r * (1 - k * 0.05), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // saque: anel que pisca em volta da bola parada
  if (b.espera > 0) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = tr * 1.4;
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 14);
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r + 0.3 + b.espera * 0.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  bolaDeVolei(ctx, b.x, b.y, b.r, b.ang, tr * 1.15);
  for (const a of V.acessorios) acessorio(ctx, a, t, tr);
  ctx.restore();
  // dicas do comeco (px CSS)
  const dicas = [];
  if (V.dica) dicas.push(V.dica);
  if (V.dica2) dicas.push(...V.dica2);
  if (dicas.length) {
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const tam = Math.max(12, Math.min(18, cam.s * 0.55));
    const W = ctx.canvas.width / dpr;
    for (const d of dicas) {
      const [x, y] = paraTela(cam, d.x, d.y);
      pilula(ctx, x, y, d.texto, tam, d.cor, W);
    }
    ctx.restore();
  }
}

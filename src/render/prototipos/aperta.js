// Desenhos do Aperta-Gosma (src/jogo/modos/aperta.js): o quarto de brinquedos atras da caixa de
// vidro, o rastro da gosma no vidro, a geada do gelo, o vapor do calor, os fios da cola, a linha
// da tesoura, o martelo, a ferramenta no cursor, a mao fantasma do comeco e os cartoes (meta
// cumprida e careta nova). Funcoes puras de ctx/cam/vis; o tempo vem de fora.

import { aplicar, paraTela } from '../camera.js';
import { TINTA } from '../fundo.js';
import { desenharIcone } from '../../ui/icones.js';

/** Pseudo-aleatorio fixo por indice (posicoes estaveis entre quadros). */
const h = (k) => {
  const s = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Retangulo de cantos redondos (sem roundRect: Safari antigo). */
function redondo(ctx, x, y, w, hh, r) {
  const q = Math.min(r, w / 2, hh / 2);
  ctx.beginPath();
  ctx.moveTo(x + q, y);
  ctx.lineTo(x + w - q, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + q);
  ctx.lineTo(x + w, y + hh - q);
  ctx.quadraticCurveTo(x + w, y + hh, x + w - q, y + hh);
  ctx.lineTo(x + q, y + hh);
  ctx.quadraticCurveTo(x, y + hh, x, y + hh - q);
  ctx.lineTo(x, y + q);
  ctx.quadraticCurveTo(x, y, x + q, y);
  ctx.closePath();
}

function pintar(ctx, cor, traco) {
  ctx.fillStyle = cor;
  ctx.fill();
  ctx.lineWidth = traco;
  ctx.strokeStyle = TINTA;
  ctx.stroke();
}

// ---------------------------------------------------------------- cenario
/**
 * Brinquedo de prateleira (px CSS; base em (x, y), `u` px por u do mundo).
 * @param {CanvasRenderingContext2D} ctx @param {number} tipo @param {number} x @param {number} y @param {number} u @param {number} k
 */
function brinquedo(ctx, tipo, x, y, u, k) {
  const tr = Math.max(1.6, u * 0.07);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  switch (tipo) {
    case 0: { // blocos de letra
      const l = u * 0.9;
      const cores = ['#ff7b7b', '#62c8ff', '#ffd23a', '#7fe36b'];
      const letras = ['A', 'B', 'C', 'D'];
      for (let j = 0; j < 2; j++) {
        redondo(ctx, x + j * l * 1.02 - l, y - l, l, l, l * 0.12);
        pintar(ctx, cores[(k + j) % 4], tr);
        ctx.fillStyle = '#fff';
        ctx.font = `700 ${Math.round(l * 0.62)}px Fredoka, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(letras[(k + j) % 4], x + j * l * 1.02 - l / 2, y - l / 2 + l * 0.04);
      }
      redondo(ctx, x - l / 2, y - 2 * l, l, l, l * 0.12);
      pintar(ctx, cores[(k + 2) % 4], tr);
      ctx.fillStyle = '#fff';
      ctx.fillText(letras[(k + 2) % 4], x, y - 1.5 * l + l * 0.04);
      break;
    }
    case 1: { // bola de praia
      const r = u * 0.75;
      const cores = ['#ff6b6b', '#ffd23a', '#4fb6ff', '#ffffff'];
      for (let j = 0; j < 4; j++) {
        ctx.beginPath();
        ctx.moveTo(x, y - r);
        ctx.arc(x, y - r, r, (j / 4) * Math.PI * 2 - 0.4, ((j + 1) / 4) * Math.PI * 2 - 0.4);
        ctx.closePath();
        ctx.fillStyle = cores[j];
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(x, y - r, r, 0, Math.PI * 2);
      ctx.lineWidth = tr;
      ctx.strokeStyle = TINTA;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x - r * 0.35, y - r * 1.35, r * 0.16, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fill();
      break;
    }
    case 2: { // patinho de borracha
      const r = u * 0.55;
      ctx.beginPath();
      ctx.ellipse(x, y - r * 0.8, r * 1.25, r * 0.8, 0, 0, Math.PI * 2);
      pintar(ctx, '#ffd84a', tr);
      ctx.beginPath();
      ctx.arc(x + r * 0.55, y - r * 1.85, r * 0.62, 0, Math.PI * 2);
      pintar(ctx, '#ffd84a', tr);
      ctx.beginPath();
      ctx.moveTo(x + r * 1.1, y - r * 1.95);
      ctx.quadraticCurveTo(x + r * 1.75, y - r * 1.95, x + r * 1.65, y - r * 1.65);
      ctx.quadraticCurveTo(x + r * 1.3, y - r * 1.55, x + r * 1.05, y - r * 1.7);
      pintar(ctx, '#ff8a2a', tr * 0.8);
      ctx.beginPath();
      ctx.arc(x + r * 0.7, y - r * 2.0, r * 0.1, 0, Math.PI * 2);
      ctx.fillStyle = TINTA;
      ctx.fill();
      break;
    }
    case 3: { // argolas de empilhar
      const r = u * 0.55;
      const cores = ['#ff6b6b', '#ff9f43', '#ffd23a', '#7fe36b', '#4fb6ff'];
      ctx.beginPath();
      ctx.moveTo(x - r * 0.1, y);
      ctx.lineTo(x - r * 0.1, y - r * 3.4);
      ctx.lineTo(x + r * 0.1, y - r * 3.4);
      ctx.lineTo(x + r * 0.1, y);
      pintar(ctx, '#d9a25d', tr * 0.8);
      for (let j = 0; j < 5; j++) {
        const w = r * (1.3 - j * 0.18);
        ctx.beginPath();
        ctx.ellipse(x, y - r * (0.3 + j * 0.6), w, r * 0.32, 0, 0, Math.PI * 2);
        pintar(ctx, cores[j], tr);
      }
      ctx.beginPath();
      ctx.arc(x, y - r * 3.4, r * 0.3, 0, Math.PI * 2);
      pintar(ctx, '#ff6b6b', tr);
      break;
    }
    case 4: { // foguete de lata
      const r = u * 0.5;
      ctx.beginPath();
      ctx.moveTo(x, y - r * 3.6);
      ctx.quadraticCurveTo(x + r * 0.9, y - r * 2.6, x + r * 0.7, y - r * 0.6);
      ctx.lineTo(x - r * 0.7, y - r * 0.6);
      ctx.quadraticCurveTo(x - r * 0.9, y - r * 2.6, x, y - r * 3.6);
      pintar(ctx, '#f2f2f6', tr);
      for (const l of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + l * r * 0.6, y - r * 1.5);
        ctx.lineTo(x + l * r * 1.2, y - r * 0.2);
        ctx.lineTo(x + l * r * 0.6, y - r * 0.6);
        pintar(ctx, '#ff6b6b', tr);
      }
      ctx.beginPath();
      ctx.arc(x, y - r * 2.3, r * 0.32, 0, Math.PI * 2);
      pintar(ctx, '#62c8ff', tr * 0.8);
      ctx.beginPath();
      ctx.moveTo(x - r * 0.35, y - r * 0.6);
      ctx.lineTo(x, y);
      ctx.lineTo(x + r * 0.35, y - r * 0.6);
      pintar(ctx, '#ffb43a', tr * 0.8);
      break;
    }
    case 5: { // ursinho
      const r = u * 0.6;
      for (const l of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(x + l * r * 0.62, y - r * 2.55, r * 0.32, 0, Math.PI * 2);
        pintar(ctx, '#c98a52', tr);
      }
      ctx.beginPath();
      ctx.ellipse(x, y - r * 0.8, r * 0.95, r * 0.85, 0, 0, Math.PI * 2);
      pintar(ctx, '#c98a52', tr);
      ctx.beginPath();
      ctx.arc(x, y - r * 2.1, r * 0.72, 0, Math.PI * 2);
      pintar(ctx, '#c98a52', tr);
      ctx.beginPath();
      ctx.ellipse(x, y - r * 1.9, r * 0.32, r * 0.24, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#f2d2a8';
      ctx.fill();
      ctx.fillStyle = TINTA;
      for (const l of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(x + l * r * 0.27, y - r * 2.25, r * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(x, y - r * 1.98, r * 0.09, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 6: { // pote de slime da loja
      const r = u * 0.55;
      redondo(ctx, x - r, y - r * 1.8, r * 2, r * 1.8, r * 0.3);
      pintar(ctx, 'rgba(210, 240, 255, 0.9)', tr);
      ctx.beginPath();
      ctx.moveTo(x - r * 0.85, y - r * 0.2);
      ctx.lineTo(x - r * 0.85, y - r * 1.0);
      ctx.quadraticCurveTo(x, y - r * 1.4, x + r * 0.85, y - r * 1.0);
      ctx.lineTo(x + r * 0.85, y - r * 0.2);
      ctx.closePath();
      ctx.fillStyle = ['#c86bff', '#7fe36b', '#ff6fd8'][k % 3];
      ctx.fill();
      redondo(ctx, x - r * 1.1, y - r * 2.2, r * 2.2, r * 0.5, r * 0.15);
      pintar(ctx, '#ff6b6b', tr);
      break;
    }
    default: { // piao
      const r = u * 0.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - r, y - r * 1.1);
      ctx.quadraticCurveTo(x, y - r * 1.9, x + r, y - r * 1.1);
      ctx.closePath();
      pintar(ctx, '#7b9dff', tr);
      ctx.beginPath();
      ctx.moveTo(x - r * 0.7, y - r * 1.25);
      ctx.quadraticCurveTo(x, y - r * 1.6, x + r * 0.7, y - r * 1.25);
      ctx.lineWidth = tr * 1.6;
      ctx.strokeStyle = '#ffd23a';
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - r * 0.1, y - r * 1.5);
      ctx.lineTo(x - r * 0.1, y - r * 2.1);
      ctx.lineTo(x + r * 0.1, y - r * 2.1);
      ctx.lineTo(x + r * 0.1, y - r * 1.5);
      pintar(ctx, '#d9a25d', tr * 0.8);
    }
  }
}

/** Prateleira de madeira de x0 a x1 (px) na altura y (px), com os brinquedos em cima. */
function prateleira(ctx, x0, x1, y, u, semente) {
  const tr = Math.max(1.6, u * 0.07);
  const esp = Math.max(6, u * 0.32);
  ctx.fillStyle = 'rgba(80, 40, 20, 0.12)';
  ctx.fillRect(x0, y + esp, x1 - x0, esp * 0.8);
  ctx.fillStyle = '#d39b6a';
  ctx.fillRect(x0, y, x1 - x0, esp);
  ctx.fillStyle = '#b97e4e';
  ctx.fillRect(x0, y + esp * 0.62, x1 - x0, esp * 0.38);
  ctx.strokeStyle = TINTA;
  ctx.lineWidth = tr;
  ctx.strokeRect(x0, y, x1 - x0, esp);
  // os brinquedos
  let x = x0 + u * (0.8 + h(semente) * 0.6);
  let k = 0;
  while (x < x1 - u * 0.8) {
    const tipo = Math.floor(h(semente * 7 + k) * 8);
    brinquedo(ctx, tipo, x, y, u, k + semente);
    x += u * (2.1 + h(semente * 3 + k) * 1.2);
    k++;
  }
}

/**
 * Cenario: quarto de brinquedos (papel de parede, prateleiras, mesa de madeira).
 * @param {CanvasRenderingContext2D} ctx @param {any} cam @param {number} dpr @param {number} W @param {number} H
 * @param {number} t @param {any} vis @param {number} chao
 */
export function cenario(ctx, cam, dpr, W, H, t, vis, chao) {
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const u = cam.s;
  const C = vis.caixa || { x0: -7, y0: 0, x1: 7, y1: 12 };
  const yc = paraTela(cam, 0, chao)[1];
  // papel de parede: listras largas em dois tons de pessego, presas ao mundo
  ctx.fillStyle = '#ffe9dc';
  ctx.fillRect(0, 0, W, yc);
  const lado = u * 1.1;
  const [ox] = paraTela(cam, 0, 0);
  ctx.fillStyle = '#fff3ea';
  for (let x = (ox % (2 * lado)) - 2 * lado; x < W; x += 2 * lado) ctx.fillRect(x, 0, lado, yc);
  // estrelinhas no papel
  ctx.fillStyle = 'rgba(255, 160, 120, 0.35)';
  for (let x = (ox % (2 * lado)) - 2 * lado + lado * 1.5, i = 0; x < W; x += 2 * lado, i++) {
    for (let y = (u * 0.9 * (i % 2)) % (u * 1.8); y < yc; y += u * 1.8) {
      estrela(ctx, x, y, u * 0.14);
      ctx.fill();
    }
  }
  // prateleira de cima (aparece no retrato) e as dos lados (paisagem)
  const [, yTopo] = paraTela(cam, 0, C.y1 + 1.75);
  prateleira(ctx, -u, W + u, yTopo, u, 3);
  const [xe] = paraTela(cam, C.x0 - 1.6, 0);
  const [xd] = paraTela(cam, C.x1 + 1.6, 0);
  for (const [yy, s] of [[3.2, 5], [7.4, 9], [11.4, 13]]) {
    const [, py] = paraTela(cam, 0, yy);
    if (xe > u * 2.4) prateleira(ctx, -u, xe, py, u, s);
    if (W - xd > u * 2.4) prateleira(ctx, xd, W + u, py, u, s + 1);
  }
  // mesa
  const esp = Math.max(10, u * 0.55);
  ctx.fillStyle = '#c98a52';
  ctx.fillRect(0, yc, W, H - yc);
  ctx.fillStyle = '#dda06a';
  ctx.fillRect(0, yc, W, esp);
  ctx.fillStyle = 'rgba(120, 70, 30, 0.25)';
  for (let x = (ox % (u * 3.2)) - u * 3.2; x < W; x += u * 3.2) ctx.fillRect(x, yc + esp, Math.max(1.5, u * 0.05), H - yc - esp);
  ctx.fillStyle = TINTA;
  ctx.fillRect(0, yc - 1.5, W, 3);
  ctx.fillRect(0, yc + esp - 1, W, 2);
  // tapete listrado embaixo (o retrato tem espaco)
  const yt = yc + esp + u * 1.4;
  if (H - yt > u) {
    for (let j = 0; j < 6; j++) {
      ctx.fillStyle = j % 2 ? '#8fd3ff' : '#b8e4ff';
      ctx.fillRect(0, yt + j * u * 0.35, W, u * 0.35);
    }
  }
  ctx.restore();
}

/** Estrela de 5 pontas (caminho). */
function estrela(ctx, x, y, r) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const q = k % 2 ? r * 0.45 : r;
    if (k) ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
    else ctx.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
  }
  ctx.closePath();
}

// ---------------------------------------------------------------- atras do slime
/**
 * Rastro de gosma no vidro e a sombra no chao.
 * @param {CanvasRenderingContext2D} ctx @param {any} cam @param {number} dpr @param {number} t @param {any} vis @param {any} m
 */
export function fundo(ctx, cam, dpr, t, vis, m) {
  ctx.save();
  aplicar(ctx, cam, dpr);
  const C = vis.caixa;
  // sombra de cada slime no chao (mais fraca quanto mais alto)
  for (const s of m.slimes) {
    if (!s.ativo) continue;
    const alt = Math.max(0, s.base - C.y0);
    const a = 0.22 * Math.max(0, 1 - alt / 6);
    if (a <= 0.01) continue;
    ctx.fillStyle = `rgba(60, 40, 90, ${a.toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(s.cx, C.y0 + 0.04, Math.max(0.3, (s.dir - s.esq) * 0.5) * (1 + alt * 0.05), 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // gosma que ficou no vidro
  for (const r of vis.rastros || []) {
    const a = Math.min(1, r.vida / 2) * 0.5;
    ctx.globalAlpha = a;
    ctx.fillStyle = r.cor || '#7fe36b';
    ctx.beginPath();
    ctx.ellipse(r.x, r.y, r.r * 0.55, r.r, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ---------------------------------------------------------------- na frente do slime
/** Luva cartum (px CSS): aberta ou fechada (pegando). */
function luva(ctx, x, y, tam, fechada, alfa = 1) {
  ctx.save();
  ctx.globalAlpha = alfa;
  ctx.translate(x, y);
  const u = tam / 10;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2.2, u * 0.8);
  ctx.strokeStyle = TINTA;
  ctx.fillStyle = '#ffffff';
  if (fechada) {
    // punho fechado: palma e os dedos dobrados
    redondo(ctx, -3.6 * u, -1.2 * u, 7.6 * u, 6.8 * u, 2.6 * u);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      ctx.moveTo((-1.6 + k * 1.9) * u, -1.2 * u);
      ctx.lineTo((-1.6 + k * 1.9) * u, 1.4 * u);
    }
    ctx.stroke();
    // polegar
    ctx.beginPath();
    ctx.ellipse(-3.8 * u, 2.4 * u, 1.3 * u, 2.1 * u, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    // mao aberta: quatro dedos e o polegar
    for (let k = 0; k < 4; k++) {
      const fx = (-2.7 + k * 1.8) * u;
      const alto = k === 1 || k === 2 ? 5.4 : 4.6;
      redondo(ctx, fx - 0.85 * u, -alto * u, 1.7 * u, (alto + 2) * u, 0.85 * u);
      ctx.fill();
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(-4.4 * u, 2.4 * u, 1.2 * u, 2.4 * u, -0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    redondo(ctx, -3.6 * u, 0.2 * u, 7.2 * u, 5.6 * u, 2.4 * u);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-3.4 * u, 0.6 * u);
    ctx.lineTo(3.4 * u, 0.6 * u);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, u * 1.2);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Martelo de borracha (px CSS) girando no fim do cabo: com `ang` 0 o cabo fica deitado e a face de
 * baixo da cabeca encosta em (x, y); `ang` > 0 levanta a cabeca.
 */
function desenharMartelo(ctx, x, y, tam, ang) {
  const u = tam / 10;
  const cabo = 9 * u;
  const hw = 3 * u;
  const hh = 6.4 * u;
  ctx.save();
  ctx.translate(x + cabo, y - hh / 2);
  ctx.rotate(ang);
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2.2, u * 0.6);
  ctx.strokeStyle = TINTA;
  redondo(ctx, -cabo, -0.7 * u, cabo + 0.8 * u, 1.4 * u, 0.6 * u);
  ctx.fillStyle = '#d9a25d';
  ctx.fill();
  ctx.stroke();
  redondo(ctx, -cabo - hw / 2, -hh / 2, hw, hh, 1.1 * u);
  ctx.fillStyle = '#ff5f6d';
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillRect(-cabo - hw * 0.25, -hh * 0.38, hw * 0.22, hh * 0.6);
  ctx.restore();
}

/** Frasco de cola (px CSS). */
function frascoCola(ctx, x, y, tam) {
  const u = tam / 10;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, u * 0.7);
  ctx.strokeStyle = TINTA;
  redondo(ctx, -2.6 * u, -2 * u, 5.2 * u, 7 * u, 1.2 * u);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.stroke();
  redondo(ctx, -2.2 * u, 0.2 * u, 4.4 * u, 2.4 * u, 0.6 * u);
  ctx.fillStyle = '#ffb43a';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-1.2 * u, -2 * u);
  ctx.lineTo(-0.5 * u, -5 * u);
  ctx.lineTo(0.5 * u, -5 * u);
  ctx.lineTo(1.2 * u, -2 * u);
  ctx.fillStyle = '#ff6b6b';
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** Carinha do album (px CSS) para o cartao de careta nova. */
export function carinha(ctx, x, y, r, expr, cor) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const tr = Math.max(1.8, r * 0.09);
  ctx.beginPath();
  ctx.ellipse(0, r * 0.06, r, r * 0.92, 0, 0, Math.PI * 2);
  pintar(ctx, cor || '#9be36b', tr * 1.2);
  ctx.beginPath();
  ctx.ellipse(-r * 0.4, -r * 0.42, r * 0.22, r * 0.12, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fill();
  ctx.strokeStyle = TINTA;
  ctx.fillStyle = TINTA;
  ctx.lineWidth = tr;
  const ex = r * 0.34;
  const ey = -r * 0.08;
  const olho = (lx, ry = r * 0.17, rx = r * 0.15) => {
    ctx.beginPath();
    ctx.ellipse(lx, ey, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.stroke();
  };
  const pupila = (lx, rr = r * 0.09, dy = 0) => {
    ctx.beginPath();
    ctx.arc(lx, ey + dy, rr, 0, Math.PI * 2);
    ctx.fillStyle = TINTA;
    ctx.fill();
  };
  const boca = (f) => { ctx.beginPath(); f(); ctx.stroke(); };
  switch (expr) {
    case 'furioso':
      for (const l of [-1, 1]) { olho(l * ex); pupila(l * ex, r * 0.07); }
      boca(() => { ctx.moveTo(-ex * 1.4, -r * 0.4); ctx.lineTo(-ex * 0.3, -r * 0.24); ctx.moveTo(ex * 1.4, -r * 0.4); ctx.lineTo(ex * 0.3, -r * 0.24); });
      redondo(ctx, -r * 0.3, r * 0.3, r * 0.6, r * 0.22, r * 0.06);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.stroke();
      boca(() => { ctx.moveTo(-r * 0.3, r * 0.41); ctx.lineTo(r * 0.3, r * 0.41); });
      break;
    case 'zonzo':
    case 'tonto':
      for (const l of [-1, 1]) {
        olho(l * ex);
        boca(() => { for (let a = 0; a < 9; a++) { const q = (a / 9) * r * 0.13; const an = a * 1.2; ctx.lineTo(l * ex + Math.cos(an) * q, ey + Math.sin(an) * q); } });
      }
      boca(() => { ctx.moveTo(-r * 0.25, r * 0.4); ctx.quadraticCurveTo(-r * 0.1, r * 0.3, 0, r * 0.4); ctx.quadraticCurveTo(r * 0.1, r * 0.5, r * 0.25, r * 0.4); });
      if (expr === 'tonto') { ctx.fillStyle = '#ffd23a'; for (const l of [-1, 1]) { estrela(ctx, l * r * 0.75, -r * 0.85, r * 0.16); ctx.fill(); ctx.stroke(); } }
      break;
    case 'susto':
      for (const l of [-1, 1]) { olho(l * ex, r * 0.21, r * 0.17); pupila(l * ex, r * 0.05); }
      boca(() => { ctx.moveTo(-ex * 1.3, -r * 0.42); ctx.quadraticCurveTo(-ex, -r * 0.55, -ex * 0.5, -r * 0.44); ctx.moveTo(ex * 1.3, -r * 0.42); ctx.quadraticCurveTo(ex, -r * 0.55, ex * 0.5, -r * 0.44); });
      ctx.beginPath();
      ctx.ellipse(0, r * 0.42, r * 0.12, r * 0.16, 0, 0, Math.PI * 2);
      ctx.fillStyle = TINTA;
      ctx.fill();
      break;
    case 'emburrado':
      for (const l of [-1, 1]) { olho(l * ex); pupila(l * ex + r * 0.07, r * 0.08, r * 0.04); boca(() => { ctx.moveTo(l * ex - r * 0.16, ey - r * 0.04); ctx.lineTo(l * ex + r * 0.16, ey - r * 0.04); }); }
      boca(() => { ctx.moveTo(-r * 0.2, r * 0.45); ctx.quadraticCurveTo(0, r * 0.3, r * 0.2, r * 0.45); });
      break;
    case 'xingando':
      for (const l of [-1, 1]) { olho(l * ex); pupila(l * ex, r * 0.08); }
      boca(() => { ctx.moveTo(-ex * 1.4, -r * 0.42); ctx.lineTo(-ex * 0.3, -r * 0.26); });
      ctx.font = `700 ${Math.round(r * 0.42)}px Fredoka, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = TINTA;
      ctx.fillText('#@!', 0, r * 0.42);
      break;
    case 'choro':
      for (const l of [-1, 1]) {
        boca(() => { ctx.moveTo(l * ex - r * 0.15, ey); ctx.quadraticCurveTo(l * ex, ey - r * 0.12, l * ex + r * 0.15, ey); });
        ctx.beginPath();
        ctx.moveTo(l * ex, ey + r * 0.05);
        ctx.quadraticCurveTo(l * ex + l * r * 0.1, ey + r * 0.4, l * ex, ey + r * 0.6);
        ctx.strokeStyle = '#4fb6ff';
        ctx.lineWidth = tr * 1.6;
        ctx.stroke();
        ctx.strokeStyle = TINTA;
        ctx.lineWidth = tr;
      }
      ctx.beginPath();
      ctx.ellipse(0, r * 0.42, r * 0.22, r * 0.16, 0, 0, Math.PI * 2);
      ctx.fillStyle = TINTA;
      ctx.fill();
      break;
    case 'medo':
      for (const l of [-1, 1]) { olho(l * ex, r * 0.21, r * 0.17); pupila(l * ex, r * 0.07, r * 0.03); }
      boca(() => { ctx.moveTo(-r * 0.28, r * 0.42); for (let k = 1; k <= 4; k++) ctx.lineTo(-r * 0.28 + k * r * 0.14, r * (k % 2 ? 0.34 : 0.42)); });
      ctx.beginPath();
      ctx.moveTo(r * 0.8, -r * 0.5);
      ctx.quadraticCurveTo(r * 0.92, -r * 0.3, r * 0.8, -r * 0.22);
      ctx.quadraticCurveTo(r * 0.68, -r * 0.3, r * 0.8, -r * 0.5);
      ctx.fillStyle = '#9fdcff';
      ctx.fill();
      ctx.stroke();
      break;
    case 'feliz':
      for (const l of [-1, 1]) boca(() => { ctx.moveTo(l * ex - r * 0.14, ey + r * 0.05); ctx.quadraticCurveTo(l * ex, ey - r * 0.16, l * ex + r * 0.14, ey + r * 0.05); });
      ctx.beginPath();
      ctx.moveTo(-r * 0.3, r * 0.26);
      ctx.quadraticCurveTo(0, r * 0.7, r * 0.3, r * 0.26);
      ctx.closePath();
      ctx.fillStyle = '#ff7b8a';
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 120, 150, 0.45)';
      for (const l of [-1, 1]) { ctx.beginPath(); ctx.ellipse(l * r * 0.62, r * 0.2, r * 0.15, r * 0.09, 0, 0, Math.PI * 2); ctx.fill(); }
      break;
    default: // amassado
      for (const l of [-1, 1]) boca(() => { ctx.moveTo(l * ex - l * r * 0.14, ey - r * 0.12); ctx.lineTo(l * ex + l * r * 0.1, ey); ctx.lineTo(l * ex - l * r * 0.14, ey + r * 0.12); });
      boca(() => { ctx.moveTo(-r * 0.25, r * 0.4); for (let k = 1; k <= 5; k++) ctx.lineTo(-r * 0.25 + k * r * 0.1, r * (k % 2 ? 0.32 : 0.4)); });
  }
  ctx.restore();
}

/** Cartao de meta cumprida ou de careta nova, no alto da caixa (px CSS). */
function cartao(ctx, cam, C, c, dura) {
  const t = c.t;
  const ent = Math.min(1, t / 0.2);
  const sai = t > dura - 0.35 ? Math.max(0, (dura - t) / 0.35) : 1;
  // entra com um pulinho (passa de 1 e volta)
  const esc = ent < 1 ? 0.55 + 0.45 * ent + 0.12 * Math.sin(ent * Math.PI) : 1;
  const [cx, cy] = paraTela(cam, (C.x0 + C.x1) / 2, C.y1 - 1.25);
  const larg = Math.max(220, Math.min(cam.s * 11, 330));
  const alt = Math.max(50, Math.min(70, cam.s * 2.3));
  ctx.save();
  ctx.globalAlpha = sai;
  ctx.translate(cx, cy);
  ctx.scale(esc, esc);
  redondo(ctx, -larg / 2 + 3, -alt / 2 + 4, larg, alt, alt * 0.3);
  ctx.fillStyle = TINTA;
  ctx.fill();
  redondo(ctx, -larg / 2, -alt / 2, larg, alt, alt * 0.3);
  ctx.fillStyle = c.tipo === 'meta' ? '#fff6d6' : '#f1eaff';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = TINTA;
  ctx.stroke();
  const ix = -larg / 2 + alt * 0.55;
  if (c.tipo === 'meta') {
    estrela(ctx, ix, 0, alt * 0.36);
    ctx.fillStyle = '#ffc928';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.stroke();
  } else carinha(ctx, ix, 0, alt * 0.33, c.expr, c.cor);
  const tx = ix + alt * 0.52;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(alt * 0.31)}px Fredoka, system-ui, sans-serif`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4;
  ctx.strokeStyle = TINTA;
  ctx.fillStyle = c.tipo === 'meta' ? '#ffb400' : '#a46bff';
  const titulo = c.tipo === 'meta' ? c.titulo + ' +1 ★' : c.titulo + ` ${c.n}/10`;
  ctx.strokeText(titulo, tx, -alt * 0.17);
  ctx.fillText(titulo, tx, -alt * 0.17);
  ctx.font = `600 ${Math.round(alt * 0.23)}px Fredoka, system-ui, sans-serif`;
  ctx.fillStyle = TINTA;
  let sub = c.sub || '';
  const max = larg / 2 - tx - 12;
  while (sub.length > 4 && ctx.measureText(sub).width > max) sub = sub.slice(0, -2) + '…';
  ctx.fillText(sub, tx, alt * 0.22);
  ctx.restore();
}

/**
 * Por cima do slime: geada, vapor, cola, tesoura, martelo, cursor, mao fantasma e cartoes.
 * @param {CanvasRenderingContext2D} ctx @param {any} cam @param {number} dpr @param {number} t @param {any} vis @param {any} m
 */
export function topo(ctx, cam, dpr, t, vis, m) {
  const C = vis.caixa;
  ctx.save();
  aplicar(ctx, cam, dpr);
  const px = 1 / cam.s;
  // geada: brilhos brancos que piscam nas particulas frias
  if (vis.gelados && vis.gelados.length && vis.frio) {
    const fr = vis.frio;
    const quais = new Set(vis.gelados.map((g) => g.idx));
    ctx.strokeStyle = '#ffffff';
    ctx.lineCap = 'round';
    for (let i = 0; i < m.n; i += 7) {
      if (!quais.has(m.sl[i]) || fr[i] < 0.35) continue;
      const pis = 0.5 + 0.5 * Math.sin(t * 5 + i * 1.7);
      const r = (0.07 + 0.09 * pis) * fr[i];
      ctx.globalAlpha = 0.5 + 0.5 * pis;
      ctx.lineWidth = Math.max(1.2 * px, 0.035);
      ctx.beginPath();
      ctx.moveTo(m.x[i] - r, m.y[i]);
      ctx.lineTo(m.x[i] + r, m.y[i]);
      ctx.moveTo(m.x[i], m.y[i] - r);
      ctx.lineTo(m.x[i], m.y[i] + r);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // contorno de gelo: um anel azul-claro tracejado em volta de cada um
    for (const g of vis.gelados) {
      const s = m.slimes[g.idx];
      if (!s || !s.ativo || g.f < 0.3) continue;
      ctx.globalAlpha = Math.min(1, g.f) * 0.7;
      ctx.strokeStyle = '#e8f7ff';
      ctx.lineWidth = 0.08;
      ctx.setLineDash([0.18, 0.22]);
      ctx.beginPath();
      ctx.ellipse(s.cx, s.cy, (s.dir - s.esq) / 2 + 0.12, (s.topo - s.base) / 2 + 0.12, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
  }
  // vapor do calor: fios que sobem do alto do slime
  for (const q of vis.quentes || []) {
    const n = Math.max(2, Math.round((q.dir - q.esq) / 1.4));
    for (let k = 0; k < n; k++) {
      const x0 = q.esq + ((k + 0.5) / n) * (q.dir - q.esq);
      const fase = (t * 0.9 + k * 0.37) % 1;
      const y0 = q.topo + 0.2 + fase * 2.2;
      ctx.globalAlpha = Math.min(1, q.q * 1.4) * (1 - fase) * 0.85;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.13;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let j = 0; j <= 8; j++) {
        const yy = y0 + j * 0.12;
        const xx = x0 + Math.sin(yy * 3 + t * 4 + k) * 0.18;
        if (j) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy);
      }
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  // cola: fios elasticos de cada pedaco ate o maior
  if (vis.cola) {
    const c = vis.cola;
    ctx.lineCap = 'round';
    for (const [x, y] of c.pedacos) {
      const mx = (x + c.x) / 2;
      const my = (y + c.y) / 2 - 0.4 + Math.sin(t * 9) * 0.1;
      ctx.strokeStyle = TINTA;
      ctx.lineWidth = 0.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(mx, my, c.x, c.y);
      ctx.stroke();
      ctx.strokeStyle = '#fff3b0';
      ctx.lineWidth = 0.12;
      ctx.stroke();
    }
  }
  // sopro do gelo e do calor no toque
  if (vis.sopro) {
    const s = vis.sopro;
    const k = s.t / 0.8;
    for (let j = 0; j < 8; j++) {
      const a = (j / 8) * Math.PI * 2 + 0.3;
      const r = 0.4 + k * 1.6;
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = s.f === 'gelo' ? '#ffffff' : '#ffb43a';
      ctx.beginPath();
      ctx.arc(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r, 0.12 * (1 - k * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // ---- em px CSS
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const tam = Math.max(30, Math.min(64, cam.s * 1.5));
  // tesoura: linha tracejada e a tesoura na ponta
  if (vis.corte) {
    const c = vis.corte;
    const [ax, ay] = paraTela(cam, c.x0, c.y0);
    const [bx, by] = paraTela(cam, c.x1, c.y1);
    ctx.lineCap = 'round';
    ctx.setLineDash([10, 8]);
    ctx.lineDashOffset = -t * 60;
    ctx.strokeStyle = TINTA;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // martelo: desce girando, bate e volta
  if (vis.martelo) {
    const M = vis.martelo;
    const desce = Math.min(1, M.t / 0.11);
    const volta = M.t > 0.11 ? Math.min(1, (M.t - 0.11) / 0.35) : 0;
    const ang = 1.3 * (1 - desce * desce) + 0.9 * volta * volta;
    const [hx, hy] = paraTela(cam, M.x, M.bateu ? M.yAlvo : Math.max(M.yAlvo, C.y0));
    ctx.globalAlpha = volta > 0.7 ? Math.max(0, (1 - volta) / 0.3) : 1;
    desenharMartelo(ctx, hx, hy, tam * 2.1, ang);
    ctx.globalAlpha = 1;
    if (M.bateu && M.t < 0.32) {
      const k = (M.t - 0.11) / 0.21;
      ctx.strokeStyle = TINTA;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      for (let j = 0; j < 5; j++) {
        const a = Math.PI * (1.1 + (j / 4) * 0.8);
        const r0 = tam * (0.55 + k * 0.5);
        ctx.beginPath();
        ctx.moveTo(hx + Math.cos(a) * r0, hy + Math.sin(a) * r0 * 0.6);
        ctx.lineTo(hx + Math.cos(a) * (r0 + tam * 0.35), hy + Math.sin(a) * (r0 + tam * 0.35) * 0.6);
        ctx.stroke();
      }
    }
  }
  // cursor: a ferramenta perto do dedo
  const cu = vis.cursor;
  if (cu && cu.visivel) {
    const [sx, sy] = paraTela(cam, cu.x, cu.y);
    const f = vis.ferramenta;
    if (f === 'mao') luva(ctx, sx, sy + tam * 0.1, tam * 0.95, cu.baixo && cu.pegou, cu.baixo ? 0.92 : 0.8);
    else if (f !== 'martelo' || !vis.martelo) {
      const ox = sx + tam * 0.55;
      const oy = sy - tam * 0.55;
      if (f === 'martelo') desenharMartelo(ctx, sx - tam * 0.1, sy - tam * 0.15, tam * 0.7, 0.9);
      else if (f === 'cola') frascoCola(ctx, ox, oy, tam * 0.8);
      else desenharIcone(ctx, f, ox, oy, tam * 0.8, { cor: f === 'gelo' ? '#bfe9ff' : f === 'calor' ? '#ffb46b' : f === 'mira' ? '#ffb3a6' : '#ffffff' });
      // o ponto exato do toque
      ctx.fillStyle = TINTA;
      ctx.beginPath();
      ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // mao fantasma do comeco (puxa o slime de verdade)
  if (vis.fantasma) {
    const [sx, sy] = paraTela(cam, vis.fantasma.x, vis.fantasma.y);
    luva(ctx, sx, sy + tam * 0.1, tam * 1.05, vis.fantasma.baixo, 0.95);
  }
  if (vis.cartao) cartao(ctx, cam, C, vis.cartao, vis.duraCartao || 1.9);
  ctx.restore();
}

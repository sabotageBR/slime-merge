// Cenarios (fundo atras do cesto), desenhados no canvas de fundo a cada quadro. O chao (a
// superficie onde o cesto apoia) fica na altura `chao` do mundo; o resto e da tela.
// Tudo procedural (nada de imagem): build pequena e nitido em qualquer tela.

import { paraTela, aplicar } from './camera.js';
import { desenharPapel, TINTA } from './fundo.js';

export const CENARIOS = [
  { id: 'caderno', nome: 'Caderno quadriculado' },
  { id: 'laboratorio', nome: 'Laboratório' },
  { id: 'cozinha', nome: 'Cozinha' },
  { id: 'mar', nome: 'Fundo do mar' },
  { id: 'espaco', nome: 'Espaço' },
  { id: 'doceria', nome: 'Doceria' },
  { id: 'jardim', nome: 'Jardim' },
  { id: 'quarto', nome: 'Quarto' },
];

/** Pseudo-aleatorio fixo por indice (posicoes estaveis entre quadros). */
const h = (k) => {
  const s = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

function degrade(ctx, W, H, cores, y0 = 0, y1 = H) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  cores.forEach((c, k) => g.addColorStop(k / (cores.length - 1), c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/** Bancada/chao do chao para baixo, com borda de tinta. */
function bancada(ctx, W, H, yc, cor, borda, faixa = 10) {
  ctx.fillStyle = cor;
  ctx.fillRect(0, yc, W, H - yc);
  ctx.fillStyle = borda;
  ctx.fillRect(0, yc, W, faixa);
  ctx.fillStyle = TINTA;
  ctx.fillRect(0, yc - 1.5, W, 3);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./camera.js').Camera} cam
 * @param {number} dpr
 * @param {number} W
 * @param {number} H
 * @param {string} id
 * @param {number} t
 * @param {number} chao  altura do mundo onde o cesto apoia
 */
export function desenharCenario(ctx, cam, dpr, W, H, id, t, chao) {
  if (id === 'caderno' || !id) { desenharPapel(ctx, cam, dpr, W, H); return; }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const yc = paraTela(cam, 0, chao)[1];
  const u = cam.s; // px por u
  switch (id) {
    case 'laboratorio': {
      ctx.fillStyle = '#e4edf2';
      ctx.fillRect(0, 0, W, H);
      // azulejos quadrados
      const lado = u * 1.3;
      const [ox, oy] = paraTela(cam, 0, chao);
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = ox % lado; x < W; x += lado) { ctx.moveTo(x, 0); ctx.lineTo(x, yc); }
      for (let y = oy % lado; y < yc; y += lado) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(120,150,170,0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // prateleira com vidrarias
      const [, ys] = paraTela(cam, 0, chao + 13.2);
      ctx.fillStyle = '#b8c6d1';
      ctx.fillRect(0, ys, W, u * 0.3);
      ctx.fillStyle = TINTA;
      ctx.fillRect(0, ys - 1, W, 2.5);
      const cores = ['#ffb3c7', '#a8e6cf', '#ffe08a', '#a9c8ff', '#d7b4ff'];
      for (let k = 0, x = u * 0.6; x < W; k++, x += u * (1.3 + h(k) * 0.9)) {
        const alt = u * (0.9 + h(k + 9) * 0.8);
        ctx.fillStyle = cores[k % cores.length];
        ctx.strokeStyle = TINTA;
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (k % 3 === 0) {
          ctx.moveTo(x - u * 0.12, ys - alt);
          ctx.lineTo(x + u * 0.12, ys - alt);
          ctx.lineTo(x + u * 0.12, ys - alt * 0.45);
          ctx.lineTo(x + u * 0.42, ys);
          ctx.lineTo(x - u * 0.42, ys);
          ctx.lineTo(x - u * 0.12, ys - alt * 0.45);
        } else {
          ctx.rect(x - u * 0.15, ys - alt, u * 0.3, alt);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      bancada(ctx, W, H, yc, '#3e4a5a', '#56657a', Math.max(6, u * 0.25));
      break;
    }
    case 'cozinha': {
      ctx.fillStyle = '#fff4dc';
      ctx.fillRect(0, 0, W, H);
      // azulejo xadrez ate meia altura
      const lado = u * 0.9;
      const ytopo = paraTela(cam, 0, chao + 7.5)[1];
      for (let y = yc - lado, j = 0; y > ytopo - lado; y -= lado, j++) {
        for (let x = 0, i = 0; x < W; x += lado, i++) {
          ctx.fillStyle = (i + j) % 2 ? '#ffd56b' : '#fffaf0';
          ctx.fillRect(x, y, lado + 1, lado + 1);
        }
      }
      ctx.fillStyle = TINTA;
      ctx.fillRect(0, ytopo - lado * 0.1, W, 2.5);
      // janela no alto a esquerda
      const jw = Math.min(W * 0.28, u * 4.5);
      const jx = W * 0.06;
      const jy = H * 0.08;
      ctx.fillStyle = '#9fe0ff';
      ctx.strokeStyle = TINTA;
      ctx.lineWidth = 3;
      ctx.fillRect(jx, jy, jw, jw * 0.8);
      ctx.strokeRect(jx, jy, jw, jw * 0.8);
      ctx.beginPath();
      ctx.moveTo(jx + jw / 2, jy);
      ctx.lineTo(jx + jw / 2, jy + jw * 0.8);
      ctx.moveTo(jx, jy + jw * 0.4);
      ctx.lineTo(jx + jw, jy + jw * 0.4);
      ctx.stroke();
      // utensilios pendurados a direita
      for (let k = 0; k < 3; k++) {
        const x = W * 0.78 + k * u * 0.9;
        ctx.strokeStyle = TINTA;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, H * 0.06);
        ctx.lineTo(x, H * 0.06 + u * 1.6);
        ctx.stroke();
        ctx.fillStyle = ['#ff8a5c', '#7ac7a5', '#8ab4ff'][k];
        ctx.beginPath();
        ctx.ellipse(x, H * 0.06 + u * 2.0, u * 0.32, u * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      bancada(ctx, W, H, yc, '#c98f5a', '#e2ae78', Math.max(6, u * 0.28));
      break;
    }
    case 'mar': {
      degrade(ctx, W, H, ['#0b4f8a', '#1478b0', '#22a6c8']);
      // raios de luz
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#ffffff';
      for (let k = 0; k < 5; k++) {
        const x = W * (0.1 + k * 0.22) + Math.sin(t * 0.3 + k) * 10;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + W * 0.06, 0);
        ctx.lineTo(x + W * 0.2, H);
        ctx.lineTo(x + W * 0.1, H);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      // algas balancando
      for (let k = 0; k < 9; k++) {
        const x = (k + 0.5) * (W / 9) + (h(k) - 0.5) * 30;
        const alt = u * (2.2 + h(k + 3) * 2.5);
        ctx.strokeStyle = k % 2 ? '#2fa36b' : '#1f8a5a';
        ctx.lineWidth = Math.max(4, u * 0.28);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, yc);
        for (let s = 1; s <= 8; s++) {
          const yy = yc - (alt * s) / 8;
          ctx.lineTo(x + Math.sin(t * 1.2 + s * 0.7 + k) * u * 0.18 * (s / 8), yy);
        }
        ctx.stroke();
      }
      // bolhas subindo
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      for (let k = 0; k < 18; k++) {
        const vel = 20 + h(k) * 40;
        const y = H - ((t * vel + h(k + 1) * H) % (H + 40));
        const x = h(k + 7) * W + Math.sin(t * 2 + k) * 6;
        ctx.beginPath();
        ctx.arc(x, y, 3 + h(k + 2) * 6, 0, Math.PI * 2);
        ctx.stroke();
      }
      // areia
      ctx.fillStyle = '#f0d999';
      ctx.beginPath();
      ctx.moveTo(0, yc);
      for (let x = 0; x <= W; x += 20) ctx.lineTo(x, yc + Math.sin(x * 0.02) * 4);
      ctx.lineTo(W, H);
      ctx.lineTo(0, H);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = TINTA;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      break;
    }
    case 'espaco': {
      degrade(ctx, W, H, ['#0b0a2a', '#1d1650', '#3a2470']);
      for (let k = 0; k < 90; k++) {
        const x = h(k) * W;
        const y = h(k + 100) * yc;
        const pisca = 0.5 + 0.5 * Math.sin(t * (1 + h(k + 3) * 3) + k);
        ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.65 * pisca})`;
        const r = 0.8 + h(k + 50) * 1.8;
        ctx.fillRect(x - r / 2, y - r / 2, r, r);
      }
      // planeta com anel e lua
      const px = W * 0.82;
      const py = H * 0.16;
      const pr = Math.min(W, H) * 0.08;
      ctx.strokeStyle = TINTA;
      ctx.lineWidth = 3;
      ctx.fillStyle = '#ff9f5a';
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#ffd38a';
      ctx.lineWidth = pr * 0.18;
      ctx.beginPath();
      ctx.ellipse(px, py, pr * 1.7, pr * 0.45, -0.35, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#d9dcf2';
      ctx.strokeStyle = TINTA;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(W * 0.12, H * 0.1, pr * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // chao rochoso com crateras
      ctx.fillStyle = '#5b4a8a';
      ctx.fillRect(0, yc, W, H - yc);
      ctx.fillStyle = '#4a3b75';
      for (let k = 0; k < 8; k++) {
        ctx.beginPath();
        ctx.ellipse(h(k + 20) * W, yc + 14 + h(k + 30) * Math.max(10, H - yc - 20), 18 + h(k) * 22, 6 + h(k) * 6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = TINTA;
      ctx.fillRect(0, yc - 1.5, W, 3);
      break;
    }
    case 'doceria': {
      ctx.fillStyle = '#ffe1ec';
      ctx.fillRect(0, 0, W, H);
      // granulado
      const cores = ['#ff6fa8', '#ffd23a', '#6fd3ff', '#7fe36b', '#b38bff', '#ffffff'];
      ctx.lineCap = 'round';
      ctx.lineWidth = 4;
      for (let k = 0; k < 140; k++) {
        const x = h(k) * W;
        const y = h(k + 300) * yc;
        const a = h(k + 600) * Math.PI;
        ctx.strokeStyle = cores[k % cores.length];
        ctx.beginPath();
        ctx.moveTo(x - Math.cos(a) * 5, y - Math.sin(a) * 5);
        ctx.lineTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5);
        ctx.stroke();
      }
      // cobertura escorrendo no alto
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = TINTA;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, H * 0.06);
      for (let x = 0; x <= W; x += 40) {
        const g = 10 + h(x) * 26;
        ctx.quadraticCurveTo(x + 10, H * 0.06 + g, x + 20, H * 0.06);
        ctx.quadraticCurveTo(x + 30, H * 0.06 - 6, x + 40, H * 0.06);
      }
      ctx.lineTo(W, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // piso xadrez rosa
      const lado = Math.max(18, u * 0.9);
      for (let y = yc, j = 0; y < H; y += lado, j++) {
        for (let x = 0, i = 0; x < W; x += lado, i++) {
          ctx.fillStyle = (i + j) % 2 ? '#ff9cc2' : '#fff3f8';
          ctx.fillRect(x, y, lado + 1, lado + 1);
        }
      }
      ctx.fillStyle = TINTA;
      ctx.fillRect(0, yc - 1.5, W, 3);
      break;
    }
    case 'jardim': {
      degrade(ctx, W, H, ['#7fcdff', '#c9efff', '#e8f9ff'], 0, yc);
      // nuvens
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = TINTA;
      ctx.lineWidth = 2.5;
      for (let k = 0; k < 4; k++) {
        const x = ((h(k) * W + t * (6 + k * 3)) % (W + 200)) - 100;
        const y = H * (0.08 + h(k + 5) * 0.2);
        const r = Math.min(W, H) * (0.04 + h(k + 9) * 0.03);
        ctx.beginPath();
        ctx.arc(x, y, r, Math.PI * 0.5, Math.PI * 1.5);
        ctx.arc(x + r * 1.1, y - r * 0.6, r * 1.1, Math.PI, Math.PI * 2);
        ctx.arc(x + r * 2.2, y, r, Math.PI * 1.5, Math.PI * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      // morros ao longe
      ctx.fillStyle = '#a6e08e';
      ctx.beginPath();
      ctx.moveTo(0, yc);
      for (let x = 0; x <= W; x += 30) ctx.lineTo(x, yc - u * 1.2 - Math.sin(x * 0.01) * u * 0.8);
      ctx.lineTo(W, yc);
      ctx.closePath();
      ctx.fill();
      // grama e flores
      ctx.fillStyle = '#6cc04a';
      ctx.fillRect(0, yc, W, H - yc);
      ctx.fillStyle = TINTA;
      ctx.fillRect(0, yc - 1.5, W, 3);
      for (let k = 0; k < 26; k++) {
        const x = h(k + 40) * W;
        const y = yc + 10 + h(k + 80) * Math.max(8, H - yc - 20);
        ctx.fillStyle = ['#ffffff', '#ffd23a', '#ff8ac0'][k % 3];
        for (let p = 0; p < 5; p++) {
          const a = (p / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#ffb000';
        ctx.beginPath();
        ctx.arc(x, y, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'quarto': {
      // papel de parede listrado
      const lado = u * 0.8;
      for (let x = 0, i = 0; x < W; x += lado, i++) {
        ctx.fillStyle = i % 2 ? '#cfe8ff' : '#e6f3ff';
        ctx.fillRect(x, 0, lado + 1, yc);
      }
      // quadro na parede
      const qw = Math.min(W * 0.22, u * 3.4);
      const qx = W * 0.72;
      const qy = H * 0.1;
      ctx.fillStyle = '#ffd56b';
      ctx.strokeStyle = TINTA;
      ctx.lineWidth = 3;
      ctx.fillRect(qx, qy, qw, qw * 0.75);
      ctx.strokeRect(qx, qy, qw, qw * 0.75);
      ctx.fillStyle = '#7fe36b';
      ctx.beginPath();
      ctx.arc(qx + qw * 0.5, qy + qw * 0.45, qw * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      bancada(ctx, W, H, yc, '#b97e4e', '#d39b6a', Math.max(6, u * 0.28));
      break;
    }
    default:
      desenharPapel(ctx, cam, dpr, W, H);
  }
  aplicar(ctx, cam, dpr);
}

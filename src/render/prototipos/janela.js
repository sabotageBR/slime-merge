// Corrida na Janela (prototipo; o empacotar apaga esta pasta da build): os desenhos da janela de
// chuva. Cenario: a cidade borrada atras do vidro (bokeh, com parallax conforme a camera desce),
// a chuva, as gotinhas paradas e escorrendo no vidro e a moldura (os montantes, a travessa e o
// peitoril). Fundo (atras do slime): pontos secos foscos, rastros molhados, adesivos de vinil com
// borda branca, largada e chegada quadriculada. Topo: nomes, linhas do vacuo, o mini-mapa com a
// posicao dos 4, a contagem, a dica e o resumo entre as corridas.
// Funcoes de ctx/cam/vis (vis.janela vem do visual() do modo). A cidade e desenhada uma vez num
// canvas proprio (em resolucao baixa e ampliada: o borrado sai de graca).

import { aplicar, paraTela } from '../camera.js';
import { TINTA } from '../fundo.js';

/** Fator do parallax da cidade (px de cidade por px de descida do vidro). */
const PARALLAX = 0.1;
/** Largura do montante da moldura (u), a partir do lado de dentro do vidro. */
const MONTANTE = 1.25;
const FONTE = 'Fredoka, system-ui, sans-serif';

/** Pseudo-aleatorio estavel por inteiros (desenho; nada da logica). */
function hash(a, b) {
  let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Retangulo de cantos redondos (sem roundRect: Safari antigo). */
function retRedondo(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Visivel do mundo na tela inteira (u). */
function visivel(cam, W, H) {
  return { x0: cam.cx - cam.sx / cam.s, x1: cam.cx + (W - cam.sx) / cam.s, y1: cam.cy + cam.sy / cam.s, y0: cam.cy - (H - cam.sy) / cam.s };
}

// ------------------------------------------------------------------ cidade (cache)

/** @type {{ chave: string, img: HTMLCanvasElement, extra: number } | null} */
let cidade = null;

/**
 * Janelas tematicas (uma por corrida do campeonato): o ceu, os predios (do fundo para a frente),
 * quantas janelas acesas, a rua e as cores do bokeh.
 */
const TEMAS = [
  {
    nome: 'fim de tarde',
    ceu: ['#36425f', '#56638a', '#8d8fae', '#a99fb2', '#4a5070', '#262a3b'],
    predios: ['#6a7192', '#4c5474', '#343b55'], jan: [0.25, 0.4, 0.5], rua: ['#23273a', '#1b1e2c'],
    bokeh: ['255,206,122', '255,178,107', '255,138,122', '160,212,255', '255,236,190', '255,120,110'], nB: 9000,
  },
  {
    nome: 'noite de neon',
    ceu: ['#0d1230', '#19214d', '#2b2f62', '#3d3466', '#1b1d42', '#0d0f22'],
    predios: ['#2a2f5a', '#1e2348', '#141833'], jan: [0.35, 0.5, 0.6], rua: ['#141629', '#0c0d1a'],
    bokeh: ['255,92,190', '90,220,255', '255,210,90', '170,120,255', '255,236,190', '255,80,120'], nB: 7000,
  },
  {
    nome: 'manha cinza',
    ceu: ['#7d8ca4', '#9eabbe', '#bcc6d3', '#cdd3db', '#8f99aa', '#5e6878'],
    predios: ['#9ba5b6', '#808b9e', '#646f83'], jan: [0.08, 0.12, 0.16], rua: ['#4e5666', '#3c4250'],
    bokeh: ['255,240,210', '230,238,250', '255,214,160', '200,220,255', '255,250,235', '255,180,150'], nB: 14000,
  },
];

/**
 * A cidade atras do vidro, alta o bastante para o parallax da descida: ceu no alto, predios no
 * meio, rua com farois embaixo. Desenhada em 1/3 da resolucao e ampliada (borrada).
 * @param {number} W @param {number} H px CSS @param {number} extra px de parallax @param {any} T tema
 */
function pintarCidade(W, H, extra, T) {
  const Hc = H + extra;
  const red = 3;
  const w = Math.max(8, Math.ceil(W / red));
  const h = Math.max(8, Math.ceil(Hc / red));
  const peq = document.createElement('canvas');
  peq.width = w;
  peq.height = h;
  const c = /** @type {CanvasRenderingContext2D} */ (peq.getContext('2d'));
  const ceu = c.createLinearGradient(0, 0, 0, h);
  [0, 0.18, 0.36, 0.5, 0.75, 1].forEach((f, k) => ceu.addColorStop(f, T.ceu[k]));
  c.fillStyle = ceu;
  c.fillRect(0, 0, w, h);
  // tres camadas de predios, do fundo para a frente
  const camadas = [
    { topo: [0.3, 0.46], larg: [5, 12], cor: T.predios[0], jan: T.jan[0], tamJ: 1 },
    { topo: [0.4, 0.6], larg: [7, 16], cor: T.predios[1], jan: T.jan[1], tamJ: 1 },
    { topo: [0.52, 0.72], larg: [10, 22], cor: T.predios[2], jan: T.jan[2], tamJ: 1.4 },
  ];
  camadas.forEach((L, k) => {
    let x = -hash(k, 99) * 10;
    let n = 0;
    while (x < w) {
      const bw = L.larg[0] + hash(k * 31 + n, 1) * (L.larg[1] - L.larg[0]);
      const ty = h * (L.topo[0] + hash(k * 31 + n, 2) * (L.topo[1] - L.topo[0]));
      c.fillStyle = L.cor;
      c.fillRect(x, ty, bw - 0.6, h - ty);
      // antena ou caixa d'agua
      if (hash(k, n + 5) < 0.3) c.fillRect(x + bw * 0.4, ty - 3, 1, 3);
      // janelas acesas (quentes) e apagadas
      for (let yy = ty + 2; yy < h * 0.92; yy += 2.6 * L.tamJ) {
        for (let xx = x + 1.2; xx < x + bw - 1.6; xx += 2.2 * L.tamJ) {
          const r = hash(Math.floor(xx * 7) + k * 1000, Math.floor(yy * 5) + n);
          if (r < L.jan) {
            c.fillStyle = r < L.jan * 0.25 ? 'rgba(170,215,255,0.55)' : 'rgba(255,214,140,0.7)';
            c.fillRect(xx, yy, 1 * L.tamJ, 1.1 * L.tamJ);
          }
        }
      }
      x += bw;
      n++;
    }
  });
  // rua: asfalto molhado com reflexo
  const rua = c.createLinearGradient(0, h * 0.86, 0, h);
  rua.addColorStop(0, 'rgba(30,33,48,0)');
  rua.addColorStop(0.3, T.rua[0]);
  rua.addColorStop(1, T.rua[1]);
  c.fillStyle = rua;
  c.fillRect(0, h * 0.86, w, h * 0.14);
  // a grande: ampliada com suavizacao (borrado de lente)
  const img = document.createElement('canvas');
  img.width = Math.ceil(W);
  img.height = Math.ceil(Hc);
  const g = /** @type {CanvasRenderingContext2D} */ (img.getContext('2d'));
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(peq, 0, 0, img.width, img.height);
  // bokeh: luzes da cidade fora de foco (mais na altura da rua)
  const cores = T.bokeh;
  const nB = Math.round((W * Hc) / T.nB);
  for (let k = 0; k < nB; k++) {
    const fy = Math.pow(hash(k, 11), 0.55);
    const y = Hc * (0.28 + fy * 0.72);
    const x = hash(k, 12) * W;
    const r = 4 + hash(k, 13) * 13 * (0.6 + fy * 0.6);
    const cor = cores[fy > 0.85 && hash(k, 15) < 0.6 ? (hash(k, 16) < 0.5 ? 2 : 5) : Math.floor(hash(k, 14) * 5)];
    const a = 0.1 + hash(k, 17) * 0.22;
    g.fillStyle = `rgba(${cor},${a})`;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = `rgba(${cor},${a * 0.9})`;
    g.lineWidth = Math.max(1, r * 0.12);
    g.stroke();
  }
  return img;
}

// ------------------------------------------------------------------ cenario

/**
 * Cenario inteiro (tela toda): cidade com parallax, chuva, o vidro e a moldura.
 * @param {CanvasRenderingContext2D} ctx @param {any} cam @param {number} dpr
 * @param {number} W @param {number} H @param {number} t @param {any} vis
 */
export function cenario(ctx, cam, dpr, W, H, t, vis) {
  const J = vis.janela;
  if (!J) return;
  const P = J.P;
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // cidade: desce devagar (parallax) conforme a camera desce o vidro
  const extra = Math.ceil(135 * cam.s * PARALLAX) + 24;
  const tema = TEMAS[(J.tema || 0) % TEMAS.length];
  const chave = `${Math.round(W)}x${Math.round(H)}x${extra}x${tema.nome}`;
  if (!cidade || cidade.chave !== chave) cidade = { chave, img: pintarCidade(W, H, extra, tema), extra };
  const cam0 = P.topo + 1 - 13;
  const off = Math.max(0, Math.min(extra, (cam0 - J.camY) * cam.s * PARALLAX));
  ctx.drawImage(cidade.img, 0, -off, W, H + extra);
  // chuva la fora (atras do vidro): riscos finos e inclinados
  ctx.strokeStyle = 'rgba(214,226,250,0.24)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const nC = Math.round((W * H) / 5200);
  const desce = -J.camY * cam.s * 0.35;
  for (let k = 0; k < nC; k++) {
    const vel = 520 + 380 * hash(k, 3);
    const len = 9 + 16 * hash(k, 4);
    const x = ((hash(k, 1) * W * 1.3 + t * vel * 0.16) % (W * 1.3)) - W * 0.15;
    const y = ((((hash(k, 2) * (H + 80) + t * vel + desce) % (H + 80)) + H + 80) % (H + 80)) - 40;
    ctx.moveTo(x, y);
    ctx.lineTo(x - len * 0.16, y - len);
  }
  ctx.stroke();
  // o vidro: veu frio e lencois de agua escorrendo
  ctx.fillStyle = 'rgba(178,200,232,0.07)';
  ctx.fillRect(0, 0, W, H);
  aplicar(ctx, cam, dpr);
  const v = visivel(cam, W, H);
  lencois(ctx, v);
  gotinhas(ctx, v, t, cam.s);
  moldura(ctx, v, P, cam.s);
  ctx.restore();
}

/** Lencois de agua: faixas verticais claras que descem devagar no vidro. */
function lencois(ctx, v) {
  for (let k = -6; k <= 6; k++) {
    const x = k * 2.3 + (hash(k, 40) - 0.5) * 1.4;
    if (x < v.x0 - 1 || x > v.x1 + 1) continue;
    const w = 0.25 + hash(k, 41) * 0.6;
    const g = ctx.createLinearGradient(x - w, 0, x + w, 0);
    g.addColorStop(0, 'rgba(220,235,255,0)');
    g.addColorStop(0.5, `rgba(220,235,255,${0.035 + 0.04 * hash(k, 42)})`);
    g.addColorStop(1, 'rgba(220,235,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - w, v.y0, 2 * w, v.y1 - v.y0);
  }
}

/** Gotinhas paradas no vidro (presas ao mundo: descem com a camera) e algumas escorrendo. */
function gotinhas(ctx, v, t, s) {
  const cel = 1.25;
  const i0 = Math.floor(v.x0 / cel);
  const i1 = Math.ceil(v.x1 / cel);
  const j0 = Math.floor(v.y0 / cel);
  const j1 = Math.ceil(v.y1 / cel);
  const minR = 1.2 / s;
  // sombra (refracao), corpo e brilho em tres passadas: poucas trocas de estilo
  const lista = [];
  for (let i = i0; i <= i1; i++) {
    for (let j = j0; j <= j1; j++) {
      const h = hash(i, j);
      if (h > 0.62) continue;
      const q = hash(i + 3, j - 5);
      const r = Math.max(minR, 0.035 + 0.11 * q * q * q);
      lista.push(i * cel + hash(i, j + 7) * cel, j * cel + hash(i + 3, j) * cel, r);
    }
  }
  ctx.fillStyle = 'rgba(18,26,46,0.22)';
  ctx.beginPath();
  for (let k = 0; k < lista.length; k += 3) {
    const r = lista[k + 2];
    ctx.moveTo(lista[k] + r * 1.15, lista[k + 1] - r * 0.25);
    ctx.arc(lista[k] + r * 0.15, lista[k + 1] - r * 0.25, r, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.fillStyle = 'rgba(214,230,252,0.3)';
  ctx.beginPath();
  for (let k = 0; k < lista.length; k += 3) {
    const r = lista[k + 2];
    ctx.moveTo(lista[k] + r, lista[k + 1]);
    ctx.arc(lista[k], lista[k + 1], r, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  for (let k = 0; k < lista.length; k += 3) {
    const r = lista[k + 2];
    if (r < 0.06) continue;
    const x = lista[k] - r * 0.35;
    const y = lista[k + 1] + r * 0.35;
    ctx.moveTo(x + r * 0.28, y);
    ctx.arc(x, y, r * 0.28, 0, Math.PI * 2);
  }
  ctx.fill();
  // escorrendo: uma por faixa de 7 u, com o rastro fino acima
  const f0 = Math.floor(v.y0 / 7) - 1;
  const f1 = Math.ceil(v.y1 / 7) + 1;
  for (let f = f0; f <= f1; f++) {
    for (let q = 0; q < 2; q++) {
      const x = -9 + hash(f, 60 + q) * 18;
      const vel = 0.5 + hash(f, 61 + q) * 1.2;
      const yTopo = f * 7 + 7;
      const y = yTopo - ((t * vel + hash(f, 62 + q) * 7) % 7.5);
      if (y < v.y0 - 1 || y > v.y1 + 2) continue;
      const g = ctx.createLinearGradient(0, y, 0, y + 1.6);
      g.addColorStop(0, 'rgba(220,236,255,0.38)');
      g.addColorStop(1, 'rgba(220,236,255,0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 0.07;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 0.08, y + 0.8, x - 0.03, y + 1.6);
      ctx.stroke();
      ctx.fillStyle = 'rgba(18,26,46,0.25)';
      ctx.beginPath();
      ctx.arc(x + 0.03, y - 0.04, 0.13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(225,238,255,0.45)';
      ctx.beginPath();
      ctx.arc(x, y, 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(x - 0.04, y + 0.04, 0.035, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Pintura branca da madeira: corpo, chanfro claro e escuro, contorno. */
function madeira(ctx, x, y, w, h, s, vertical) {
  ctx.fillStyle = '#f2eee6';
  ctx.fillRect(x, y, w, h);
  const g = vertical ? ctx.createLinearGradient(x, 0, x + w, 0) : ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.18, 'rgba(255,255,255,0)');
  g.addColorStop(0.75, 'rgba(160,150,135,0)');
  g.addColorStop(1, 'rgba(150,140,125,0.45)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = TINTA;
  ctx.lineWidth = 1.6 / s;
  ctx.strokeRect(x, y, w, h);
}

/** Montantes, travessa de cima e o peitoril, com a sombra no vidro; na paisagem, mais vidro dos lados. */
function moldura(ctx, v, P, s) {
  const xi = P.moldura - P.rMoldura;
  const yT = P.topo - P.rMoldura;
  const yP = P.peitoril + P.rMoldura;
  // sombra da moldura no vidro (dos dois lados de cada montante)
  for (const lado of [-1, 1]) {
    for (const [a, b] of [[xi, xi - 0.45], [xi + MONTANTE, xi + MONTANTE + 0.45]]) {
      const g = ctx.createLinearGradient(lado * a, 0, lado * b, 0);
      g.addColorStop(0, 'rgba(12,16,30,0.3)');
      g.addColorStop(1, 'rgba(12,16,30,0)');
      ctx.fillStyle = g;
      ctx.fillRect(Math.min(lado * a, lado * b), Math.max(v.y0, yP), Math.abs(b - a), Math.min(v.y1, yT) - Math.max(v.y0, yP));
    }
  }
  // embacado perto da moldura e do peitoril
  for (const lado of [-1, 1]) {
    const g = ctx.createLinearGradient(lado * xi, 0, lado * (xi - 1.4), 0);
    g.addColorStop(0, 'rgba(232,240,250,0.2)');
    g.addColorStop(1, 'rgba(232,240,250,0)');
    ctx.fillStyle = g;
    ctx.fillRect(Math.min(lado * xi, lado * (xi - 1.4)), v.y0, 1.4, v.y1 - v.y0);
  }
  if (v.y0 < yP + 4) {
    const g = ctx.createLinearGradient(0, yP, 0, yP + 4);
    g.addColorStop(0, 'rgba(232,240,250,0.32)');
    g.addColorStop(1, 'rgba(232,240,250,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-xi, yP, 2 * xi, 4);
  }
  // montantes (ate a borda da tela na paisagem: mais vidro do outro lado)
  const alto = Math.min(v.y1 + 1, yT + 1.4);
  const baixo = Math.max(v.y0 - 1, yP - 2);
  for (const lado of [-1, 1]) {
    const x = lado < 0 ? -xi - MONTANTE : xi;
    madeira(ctx, x, baixo, MONTANTE, alto - baixo, s, true);
    // a moldura de fora, la longe, na paisagem larga
    const xf = lado < 0 ? -xi - MONTANTE - 14 - MONTANTE : xi + MONTANTE + 14;
    if ((lado < 0 && v.x0 < xf + MONTANTE) || (lado > 0 && v.x1 > xf)) madeira(ctx, xf, baixo, MONTANTE, alto - baixo, s, true);
  }
  // travessa de cima e a parede da sala acima dela
  if (v.y1 > yT) {
    parede(ctx, v, yT + 1.4, v.y1 + 1);
    madeira(ctx, v.x0 - 1, yT, v.x1 - v.x0 + 2, 1.4, s, false);
  }
  // peitoril: tabua clara saindo da parede, o avental embaixo e a parede; vasinhos nos vidros de lado
  if (v.y0 < yP) {
    parede(ctx, v, v.y0 - 1, yP - 2.6);
    ctx.fillStyle = '#e9e2d4';
    ctx.fillRect(v.x0 - 1, yP - 2.6, v.x1 - v.x0 + 2, 2.1);
    ctx.strokeStyle = TINTA;
    ctx.lineWidth = 1.6 / s;
    ctx.strokeRect(v.x0 - 1, yP - 2.6, v.x1 - v.x0 + 2, 2.1);
    ctx.fillStyle = 'rgba(40,30,20,0.22)';
    ctx.fillRect(v.x0 - 1, yP - 3.0, v.x1 - v.x0 + 2, 0.4);
    madeira(ctx, v.x0 - 1, yP - 0.75, v.x1 - v.x0 + 2, 0.75, s, false);
    for (const x of [-11.5, 12.2]) if (x > v.x0 - 2 && x < v.x1 + 2) vaso(ctx, x, yP, s, x > 0);
  }
}

/** Parede da sala (papel listrado quente), entre y0 e y1. */
function parede(ctx, v, y0, y1) {
  if (y1 <= y0) return;
  ctx.fillStyle = '#e2d0b6';
  ctx.fillRect(v.x0 - 1, y0, v.x1 - v.x0 + 2, y1 - y0);
  ctx.fillStyle = '#d8c4a6';
  for (let x = Math.floor(v.x0 / 1.2) * 1.2; x < v.x1 + 1; x += 1.2) ctx.fillRect(x, y0, 0.42, y1 - y0);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let x = Math.floor(v.x0 / 1.2) * 1.2 + 0.78; x < v.x1 + 1; x += 1.2) ctx.fillRect(x, y0, 0.06, y1 - y0);
}

/** Vasinho no peitoril (so aparece nos vidros de lado, na paisagem). */
function vaso(ctx, x, y, s, cacto) {
  ctx.lineWidth = 1.8 / s;
  ctx.strokeStyle = TINTA;
  ctx.lineJoin = 'round';
  // planta
  ctx.fillStyle = cacto ? '#5fae5a' : '#6cc46a';
  ctx.beginPath();
  if (cacto) {
    ctx.ellipse(x, y + 2.3, 0.55, 1.2, 0, 0, Math.PI * 2);
    ctx.moveTo(x + 1.15, y + 2.6);
    ctx.ellipse(x + 0.85, y + 2.6, 0.3, 0.55, 0.3, 0, Math.PI * 2);
  } else {
    for (const [dx, dy, r] of [[-0.55, 2.1, 0.55], [0.5, 2.3, 0.6], [0, 2.9, 0.62], [-0.2, 1.8, 0.5]]) {
      ctx.moveTo(x + dx + r, y + dy);
      ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
    }
  }
  ctx.fill();
  ctx.stroke();
  // vaso de barro
  ctx.fillStyle = '#d9784a';
  ctx.beginPath();
  ctx.moveTo(x - 0.85, y + 1.5);
  ctx.lineTo(x + 0.85, y + 1.5);
  ctx.lineTo(x + 0.62, y);
  ctx.lineTo(x - 0.62, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#c4643a';
  ctx.fillRect(x - 0.95, y + 1.2, 1.9, 0.38);
  ctx.strokeRect(x - 0.95, y + 1.2, 1.9, 0.38);
}

// ------------------------------------------------------------------ fundo (atras do slime)

/**
 * @param {CanvasRenderingContext2D} ctx @param {any} cam @param {number} dpr @param {number} t
 * @param {any} vis @param {any} _m
 */
export function fundo(ctx, cam, dpr, t, vis, _m) {
  const J = vis.janela;
  if (!J) return;
  const P = J.P;
  ctx.save();
  aplicar(ctx, cam, dpr);
  const yA = J.camY + 16;
  const yB = J.camY - 16;
  for (const z of J.pista.secos) if (z.y - z.ry < yA && z.y + z.ry > yB) seco(ctx, z);
  rastros(ctx, J);
  largadaEChegada(ctx, P, cam.s, yA, yB);
  for (const a of J.pista.adesivos) if (a.caixa[1] < yA && a.caixa[3] > yB) adesivo(ctx, a, cam.s);
  ctx.restore();
}

/** Ponto seco: vidro fosco (embacado esbranquicado, granulado), que freia. */
function seco(ctx, z) {
  ctx.save();
  ctx.translate(z.x, z.y);
  ctx.scale(z.rx, z.ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, 'rgba(236,240,246,0.55)');
  g.addColorStop(0.7, 'rgba(230,236,244,0.42)');
  g.addColorStop(1, 'rgba(230,236,244,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // granulado e rachadinhas de poeira seca
  const k0 = Math.round(z.x * 13 + z.y * 7);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  for (let k = 0; k < 40; k++) {
    const a = hash(k0, k) * Math.PI * 2;
    const r = Math.sqrt(hash(k0 + 1, k)) * 0.85;
    const x = z.x + Math.cos(a) * r * z.rx;
    const y = z.y + Math.sin(a) * r * z.ry;
    const rr = 0.025 + hash(k0 + 2, k) * 0.04;
    ctx.moveTo(x + rr, y);
    ctx.arc(x, y, rr, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 0.035;
  ctx.beginPath();
  for (let k = 0; k < 5; k++) {
    const a = hash(k0 + 3, k) * Math.PI * 2;
    const x = z.x + Math.cos(a) * 0.4 * z.rx;
    const y = z.y + Math.sin(a) * 0.4 * z.ry;
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.35 * Math.cos(a + 0.6), y + 0.35 * Math.sin(a + 0.6));
    ctx.lineTo(x + 0.55 * Math.cos(a - 0.2), y + 0.55 * Math.sin(a - 0.2));
  }
  ctx.stroke();
}

/**
 * A cauda de gosma logo acima do corredor (o que ele acabou de escorrer): afina para cima e some
 * em ~0,7 s; o corpo cobre a base dela.
 */
function cauda(ctx, c, J) {
  const r = c.rastro;
  const pts = [[c.cx, c.cy]];
  for (let k = r.length - 1; k >= 0; k--) {
    const idade = J.t - r[k].t;
    if (idade > 1.1) break;
    if (r[k].y > c.cy) pts.push([r[k].x, r[k].y]);
  }
  if (pts.length < 3) return;
  const R = c.raio;
  const esq = [];
  const dir = [];
  for (let k = 0; k < pts.length; k++) {
    const f = k / (pts.length - 1);
    const w = R * (0.7 * Math.pow(1 - f, 0.8) + 0.07);
    const a = pts[Math.max(0, k - 1)];
    const b = pts[Math.min(pts.length - 1, k + 1)];
    let nx = -(b[1] - a[1]);
    let ny = b[0] - a[0];
    const l = Math.hypot(nx, ny) || 1;
    nx /= l;
    ny /= l;
    esq.push([pts[k][0] + nx * w, pts[k][1] + ny * w]);
    dir.push([pts[k][0] - nx * w, pts[k][1] - ny * w]);
  }
  const topo = pts[pts.length - 1];
  const g = ctx.createLinearGradient(0, c.topo - R * 0.3, 0, topo[1]);
  g.addColorStop(0, c.cor || '#9ad');
  g.addColorStop(0.55, c.cor || '#9ad');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalAlpha = 0.62;
  ctx.fillStyle = g;
  ctx.beginPath();
  esq.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.quadraticCurveTo(topo[0], topo[1] + R * 0.12, dir[dir.length - 1][0], dir[dir.length - 1][1]);
  for (let k = dir.length - 2; k >= 0; k--) ctx.lineTo(dir[k][0], dir[k][1]);
  ctx.closePath();
  ctx.fill();
  // brilho molhado na beira
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(0.04, R * 0.05);
  ctx.beginPath();
  esq.slice(1).forEach(([x, y], k) => (k ? ctx.lineTo(x + R * 0.12, y) : ctx.moveTo(x + R * 0.12, y)));
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** Rastros molhados: a gosma que fica no vidro atras de cada corredor (some em ~6 s). */
function rastros(ctx, J) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const c of J.corredores) {
    const r = c.rastro;
    if (r.length < 2) continue;
    if (!c.chegou) cauda(ctx, c, J);
    // tres idades: novo, meio e velho (cada uma uma linha so, mais fina e apagada com a idade)
    for (const [ida, idb, alfa, larg] of [[3, 6.5, 0.06, 0.55], [1.2, 3, 0.12, 0.75], [0, 1.2, 0.22, 0.95]]) {
      ctx.globalAlpha = alfa;
      ctx.strokeStyle = c.cor || '#9ad';
      ctx.beginPath();
      let aberto = false;
      let w = 0.5;
      for (let k = 0; k < r.length; k++) {
        const idade = J.t - r[k].t;
        if (idade < ida || idade > idb + 0.15) { aberto = false; continue; }
        if (!aberto) { ctx.moveTo(r[k].x, r[k].y); aberto = true; } else ctx.lineTo(r[k].x, r[k].y);
        w = r[k].w;
      }
      ctx.lineWidth = w * larg * 1.25;
      ctx.stroke();
    }
    // o brilho molhado: um fio claro na beira do rastro
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    let aberto = false;
    for (let k = 0; k < r.length; k++) {
      if (J.t - r[k].t > 2.5) { aberto = false; continue; }
      const x = r[k].x - r[k].w * 0.4;
      if (!aberto) { ctx.moveTo(x, r[k].y); aberto = true; } else ctx.lineTo(x, r[k].y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** Largada (tracejada) e chegada (fita quadriculada colada no vidro) com os letreiros. */
function largadaEChegada(ctx, P, s, yA, yB) {
  const xi = P.moldura - P.rMoldura;
  if (P.largada + 2 < yA && P.largada + 2 > yB) {
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 0.08;
    ctx.setLineDash([0.4, 0.3]);
    ctx.beginPath();
    ctx.moveTo(-xi, P.largada + 1.6);
    ctx.lineTo(xi, P.largada + 1.6);
    ctx.stroke();
    ctx.setLineDash([]);
    letreiro(ctx, 'LARGADA', 0, P.largada + 2.35, 0.55, 'rgba(255,255,255,0.85)');
  }
  const y = P.chegada;
  if (y + 1 < yB || y - 1 > yA) return;
  const q = 0.5;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(-xi + 0.06, y - q - 0.1, 2 * xi, 2 * q);
  for (let i = 0; i < Math.ceil((2 * xi) / q); i++) {
    for (let j = 0; j < 2; j++) {
      ctx.fillStyle = (i + j) % 2 ? '#1d1c22' : '#f7f6f2';
      ctx.fillRect(-xi + i * q, y - q + j * q, Math.min(q, xi - (-xi + i * q)), q);
    }
  }
  ctx.strokeStyle = TINTA;
  ctx.lineWidth = 1.5 / s;
  ctx.strokeRect(-xi, y - q, 2 * xi, 2 * q);
  letreiro(ctx, 'CHEGADA', 0, y - 1.35, 0.7, '#ffffff');
}

/** Texto no mundo (y para cima): desvira o eixo. */
function letreiro(ctx, txt, x, y, tam, cor) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, -1);
  ctx.font = `700 ${tam}px ${FONTE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = tam * 0.22;
  ctx.strokeStyle = 'rgba(23,22,28,0.75)';
  ctx.strokeText(txt, 0, 0);
  ctx.fillStyle = cor;
  ctx.fillText(txt, 0, 0);
  ctx.restore();
}

/** Adesivo de vinil: sombra, borda branca grossa, a cor e os detalhes de cada desenho. */
function adesivo(ctx, a, s) {
  const caminho = (dx = 0, dy = 0) => {
    ctx.beginPath();
    a.pts.forEach(([x, y], k) => (k ? ctx.lineTo(x + dx, y + dy) : ctx.moveTo(x + dx, y + dy)));
    ctx.closePath();
  };
  ctx.lineJoin = 'round';
  // sombra no vidro
  caminho(0.08, -0.12);
  ctx.fillStyle = 'rgba(8,12,26,0.3)';
  ctx.lineWidth = 0.36;
  ctx.strokeStyle = 'rgba(8,12,26,0.3)';
  ctx.fill();
  ctx.stroke();
  // borda branca (o recorte do vinil) com o contorno de tinta
  caminho();
  ctx.lineWidth = 0.36 + 3 / s;
  ctx.strokeStyle = TINTA;
  ctx.stroke();
  ctx.lineWidth = 0.36;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.fillStyle = a.cor;
  ctx.fill();
  ctx.lineWidth = 1.2 / s;
  ctx.strokeStyle = 'rgba(23,22,28,0.55)';
  ctx.stroke();
  // detalhes no sistema local do adesivo
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate(a.rot);
  ctx.scale(a.r * a.espelho, a.r);
  const lw = 1.4 / (s * a.r);
  if (a.tipo === 'patinho') {
    // bico laranja, olho e asa
    ctx.fillStyle = '#ff9a3c';
    ctx.beginPath();
    ctx.moveTo(0.64, 0.34); ctx.lineTo(0.97, 0.3); ctx.lineTo(0.99, 0.42); ctx.lineTo(0.7, 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = TINTA;
    ctx.beginPath();
    ctx.arc(0.44, 0.56, 0.075, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0.42, 0.59, 0.025, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(180,120,0,0.75)';
    ctx.lineWidth = lw * 1.5;
    ctx.beginPath();
    ctx.moveTo(-0.5, -0.05);
    ctx.quadraticCurveTo(-0.1, -0.5, 0.35, -0.2);
    ctx.quadraticCurveTo(0, -0.05, -0.5, -0.05);
    ctx.stroke();
  } else if (a.tipo === 'flor') {
    ctx.strokeStyle = 'rgba(70,40,160,0.45)';
    ctx.lineWidth = lw * 1.3;
    ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      const ang = Math.PI / 2 + Math.PI / 5 + (k * 2 * Math.PI) / 5;
      ctx.moveTo(Math.cos(ang) * 0.3, Math.sin(ang) * 0.3);
      ctx.lineTo(Math.cos(ang) * 0.62, Math.sin(ang) * 0.62);
    }
    ctx.stroke();
    ctx.fillStyle = '#ffd84a';
    ctx.beginPath();
    ctx.arc(0, 0, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = TINTA;
    ctx.lineWidth = lw;
    ctx.stroke();
  } else if (a.tipo === 'estrela') {
    // carinha de adesivo
    ctx.fillStyle = TINTA;
    for (const lx of [-0.17, 0.17]) {
      ctx.beginPath();
      ctx.ellipse(lx, 0.02, 0.055, 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = TINTA;
    ctx.lineWidth = lw * 1.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, -0.08, 0.13, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else if (a.tipo === 'coracao') {
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = lw * 1.6;
    ctx.beginPath();
    ctx.arc(0, 0.05, 0.5, Math.PI * 0.62, Math.PI * 0.9);
    ctx.stroke();
  }
  // brilho do vinil
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.ellipse(-0.35, 0.42, 0.2, 0.09, 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------------ topo (na frente do slime)

/**
 * @param {CanvasRenderingContext2D} ctx @param {any} cam @param {number} dpr @param {number} t
 * @param {any} vis @param {any} _m
 */
export function topo(ctx, cam, dpr, t, vis, _m) {
  const J = vis.janela;
  if (!J) return;
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = ctx.canvas.width / dpr;
  const H = ctx.canvas.height / dpr;
  brilhoDasGotas(ctx, cam, J);
  if (!J.resumo) {
    vacuo(ctx, cam, J, t);
    nomes(ctx, cam, J);
  }
  miniMapa(ctx, cam, J, W, H);
  if (J.dica) dica(ctx, cam, J, t);
  if (J.conta > 0) contagem(ctx, J, W, H);
  if (J.resumo) resumo(ctx, J, W, H, t);
  ctx.restore();
}

/** O brilho de agua nas gotas paradas no vidro (reflexo em cima, luz que atravessa embaixo). */
function brilhoDasGotas(ctx, cam, J) {
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  for (const g of J.gotas) {
    const [sx, sy] = paraTela(cam, g.x - g.r * 0.32, g.y + g.r * 0.3);
    const r = Math.max(1.5, g.r * cam.s * 0.2);
    ctx.moveTo(sx + r, sy);
    ctx.ellipse(sx, sy, r, r * 0.75, -0.6, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = Math.max(1, cam.s * 0.05);
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const g of J.gotas) {
    const [sx, sy] = paraTela(cam, g.x, g.y);
    const r = g.r * cam.s * 0.55;
    ctx.moveTo(sx + Math.cos(0.5) * r, sy + Math.sin(0.5) * r);
    ctx.arc(sx, sy, r, 0.5, 1.6);
  }
  ctx.stroke();
}

/** Linhas de velocidade em quem pega o vacuo do rastro molhado. */
function vacuo(ctx, cam, J, t) {
  ctx.lineCap = 'round';
  for (const c of J.corredores) {
    if (!c.vacuo || c.chegou) continue;
    const [sx, sy] = paraTela(cam, c.cx, c.topo);
    const R = c.raio * cam.s;
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = -1; k <= 1; k++) {
      const f = (t * 3 + k * 0.37) % 1;
      const y = sy - 4 - f * R * 0.9;
      ctx.moveTo(sx + k * R * 0.45, y);
      ctx.lineTo(sx + k * R * 0.45, y - R * 0.45 * (1 - f));
    }
    ctx.stroke();
  }
}

/** Plaquinha com o nome em cima de cada corredor. */
function nomes(ctx, cam, J) {
  const fs = Math.max(10, Math.min(14, cam.s * 0.46));
  ctx.font = `700 ${fs}px ${FONTE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const c of J.corredores) {
    const [sx, sy0] = paraTela(cam, c.cx, c.topo);
    const sy = sy0 - fs * 0.95;
    if (sy < -20 || sy > ctx.canvas.height) continue;
    const txt = c.eu ? 'Você' : c.nome;
    const w = ctx.measureText(txt).width + fs * 0.9;
    const h = fs * 1.45;
    ctx.globalAlpha = c.eu ? 1 : 0.92;
    retRedondo(ctx, sx - w / 2, sy - h / 2, w, h, h / 2);
    ctx.fillStyle = c.eu ? '#ffffff' : c.cor || '#888';
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = TINTA;
    ctx.stroke();
    if (c.eu) {
      ctx.fillStyle = TINTA;
      ctx.beginPath();
      ctx.moveTo(sx - fs * 0.32, sy + h / 2 - 0.5);
      ctx.lineTo(sx + fs * 0.32, sy + h / 2 - 0.5);
      ctx.lineTo(sx, sy + h / 2 + fs * 0.38);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = TINTA;
      ctx.fillText(txt, sx, sy + 0.5);
    } else {
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(23,22,28,0.85)';
      ctx.strokeText(txt, sx, sy + 0.5);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(txt, sx, sy + 0.5);
    }
  }
  ctx.globalAlpha = 1;
}

/** Mini-mapa no montante da direita: a pista inteira, a vista da camera e os 4 corredores. */
function miniMapa(ctx, cam, J, W, H) {
  const P = J.P;
  const xm = Math.min(W - 13, paraTela(cam, P.moldura - P.rMoldura + MONTANTE / 2, 0)[0]);
  const y0 = H * 0.2;
  const y1 = H * 0.8;
  const f = (y) => y0 + Math.max(0, Math.min(1, (P.largada - y) / (P.largada - P.chegada))) * (y1 - y0);
  // trilho
  retRedondo(ctx, xm - 4, y0 - 6, 8, y1 - y0 + 12, 4);
  ctx.fillStyle = 'rgba(38,46,72,0.55)';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = TINTA;
  ctx.stroke();
  // vista da camera
  const va = f(J.camY + 13);
  const vb = f(J.camY - 13);
  retRedondo(ctx, xm - 6, va, 12, Math.max(6, vb - va), 3);
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fill();
  // adesivos como tracinhos
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  for (const a of J.pista.adesivos) ctx.fillRect(xm - 3 + (a.x / 7) * 2.5, f(a.y) - 0.75, 3, 1.5);
  // chegada quadriculada
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 2; j++) {
      ctx.fillStyle = (i + j) % 2 ? '#1d1c22' : '#ffffff';
      ctx.fillRect(xm - 8 + i * 4, y1 + 4 + j * 4, 4, 4);
    }
  }
  ctx.strokeStyle = TINTA;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(xm - 8, y1 + 4, 16, 8);
  // corredores (o jogador por ultimo, por cima)
  const lista = J.corredores.slice().sort((a, b) => (a.eu ? 1 : 0) - (b.eu ? 1 : 0));
  for (const c of lista) {
    const y = f(c.cy);
    const r = c.eu ? 7 : 5;
    ctx.beginPath();
    ctx.arc(xm, y, r, 0, Math.PI * 2);
    ctx.fillStyle = c.cor || '#888';
    ctx.fill();
    ctx.lineWidth = c.eu ? 2.5 : 1.5;
    ctx.strokeStyle = c.eu ? '#ffffff' : TINTA;
    ctx.stroke();
    if (c.eu) {
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = TINTA;
      ctx.beginPath();
      ctx.arc(xm, y, r + 1.8, 0, Math.PI * 2);
      ctx.stroke();
      // a posicao ao lado
      const txt = (c.chegou ? c.lugar : c.pos) + 'º';
      ctx.font = `700 15px ${FONTE}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const w = ctx.measureText(txt).width + 12;
      retRedondo(ctx, xm - r - 6 - w, y - 11, w, 22, 11);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = TINTA;
      ctx.stroke();
      ctx.fillStyle = TINTA;
      ctx.fillText(txt, xm - r - 12, y + 1);
    }
  }
}

/** Onboarding: o texto embaixo da mao que arrasta. */
function dica(ctx, cam, J, t) {
  const eu = J.corredores.find((c) => c.eu);
  if (!eu) return;
  const [sx, sy] = paraTela(cam, eu.cx, eu.cy - 4.6);
  const txt = J.dica;
  const fs = Math.max(13, Math.min(18, cam.s * 0.62));
  ctx.font = `700 ${fs}px ${FONTE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(txt).width + fs * 1.2;
  const h = fs * 1.8;
  const W = ctx.canvas.width / (ctx.getTransform().a || 1);
  const x = Math.max(w / 2 + 8, Math.min(W - w / 2 - 8, sx));
  ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 4);
  retRedondo(ctx, x - w / 2, sy - h / 2, w, h, h / 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = TINTA;
  ctx.stroke();
  ctx.fillStyle = TINTA;
  ctx.fillText(txt, x, sy + 1);
  ctx.globalAlpha = 1;
}

/** 3, 2, 1 grandes no meio da tela (o "Ja!" vem como texto do modo). */
function contagem(ctx, J, W, H) {
  const n = Math.ceil(J.conta);
  const k = J.conta - Math.floor(J.conta);
  const esc = 1 + 0.5 * k * k * k;
  const fs = Math.min(W, H) * 0.24 * esc;
  ctx.font = `700 ${fs}px ${FONTE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = Math.min(1, 0.55 + k * 1.2);
  const y = H * 0.56;
  ctx.lineWidth = fs * 0.1;
  ctx.strokeStyle = TINTA;
  ctx.strokeText(String(n), W / 2, y);
  ctx.fillStyle = ['#7fe36b', '#ffd23a', '#ff8a5c'][n - 1] || '#ffffff';
  ctx.fillText(String(n), W / 2, y);
  ctx.globalAlpha = 1;
  // a corrida da vez
  const fs2 = Math.max(16, Math.min(W, H) * 0.055);
  ctx.font = `700 ${fs2}px ${FONTE}`;
  ctx.lineWidth = fs2 * 0.22;
  const txt = `Corrida ${J.corrida} de ${J.corridas}`;
  ctx.strokeText(txt, W / 2, y + fs * 0.62);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(txt, W / 2, y + fs * 0.62);
}

/** Resumo entre as corridas (e a classificacao final antes da tela de fim). */
function resumo(ctx, J, W, H, t) {
  const R = J.resumo;
  ctx.fillStyle = 'rgba(16,20,36,0.5)';
  ctx.fillRect(0, 0, W, H);
  const w = Math.min(W - 32, 380);
  const lh = Math.max(34, Math.min(46, H * 0.06));
  const h = lh * 4 + lh * 2.95;
  const x = (W - w) / 2;
  const y = Math.max(12, (H - h) / 2 - H * 0.03);
  retRedondo(ctx, x, y, w, h, 18);
  ctx.fillStyle = '#fffaf0';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = TINTA;
  ctx.stroke();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillStyle = TINTA;
  ctx.font = `700 ${lh * 0.6}px ${FONTE}`;
  ctx.fillText(R.final ? 'Fim do campeonato' : `Corrida ${R.corrida} de ${J.corridas}`, W / 2, y + lh * 0.75);
  ctx.font = `600 ${lh * 0.36}px ${FONTE}`;
  ctx.globalAlpha = 0.65;
  ctx.fillText(R.final ? 'classificação geral' : 'chegada  ·  pontos  ·  total', W / 2, y + lh * 1.35);
  ctx.globalAlpha = 1;
  const linhas = R.final ? R.geral.map((g) => ({ ...g, lugar: g.pos, pts: 0 })) : R.linhas;
  const medalha = ['#ffcf3a', '#cfd6e0', '#e0995c', '#9aa0ad'];
  linhas.forEach((L, k) => {
    const yy = y + lh * 2 + k * lh;
    if (L.eu) {
      retRedondo(ctx, x + 10, yy - lh * 0.45, w - 20, lh * 0.9, lh * 0.45);
      ctx.fillStyle = 'rgba(255,210,58,0.35)';
      ctx.fill();
    }
    // medalha com o lugar
    ctx.beginPath();
    ctx.arc(x + 20 + lh * 0.38, yy, lh * 0.36, 0, Math.PI * 2);
    ctx.fillStyle = medalha[L.lugar - 1];
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = TINTA;
    ctx.stroke();
    ctx.fillStyle = TINTA;
    ctx.textAlign = 'center';
    ctx.font = `700 ${lh * 0.4}px ${FONTE}`;
    ctx.fillText(L.lugar + 'º', x + 20 + lh * 0.38, yy + 1);
    // a gosminha da cor do corredor
    const gx = x + 30 + lh * 1.05;
    ctx.beginPath();
    ctx.ellipse(gx, yy + lh * 0.04, lh * 0.3, lh * 0.25, 0, 0, Math.PI * 2);
    ctx.fillStyle = L.cor || '#888';
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = TINTA;
    for (const ox of [-0.1, 0.1]) {
      ctx.beginPath();
      ctx.arc(gx + ox * lh, yy - lh * 0.02, lh * 0.045, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.textAlign = 'left';
    ctx.font = `700 ${lh * 0.44}px ${FONTE}`;
    ctx.fillText(L.eu ? 'Você' : L.nome, gx + lh * 0.45, yy + 1);
    ctx.textAlign = 'right';
    if (!R.final) {
      ctx.fillStyle = '#2f9e44';
      ctx.fillText('+' + L.pts, x + w - 20 - lh * 1.9, yy + 1);
    }
    ctx.fillStyle = TINTA;
    ctx.fillText(L.total + ' pts', x + w - 20, yy + 1);
  });
  if (R.tResumo > 1.2) {
    ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t * 5);
    ctx.textAlign = 'center';
    ctx.font = `700 ${lh * 0.42}px ${FONTE}`;
    ctx.fillStyle = TINTA;
    ctx.fillText(R.final ? 'toque para ver o resultado' : 'toque para a próxima corrida', W / 2, y + h - lh * 0.6);
    ctx.globalAlpha = 1;
  }
}

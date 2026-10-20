// Desenhos da Garra de Squishy (prototipo #44): o fliperama em volta (cenario), o gabinete da
// maquina com o fundo estampado, o painel (manche, botao Pegar e o visor das fichas), a rampa do
// premio, o trilho, o cabo e a garra de metal, as luzes que correm e o cartao do premio.
// Funcoes puras de ctx/cam/vis (a cena chama; nada aqui guarda estado do jogo).

import { aplicar, paraTela } from '../camera.js';
import { TINTA } from '../fundo.js';

const COR = {
  sala: '#1d1438',
  salaFundo: '#120b26',
  corpo: '#ff5c9a',
  corpoEsc: '#d23b78',
  corpoClaro: '#ff9cc4',
  friso: '#ffd23a',
  frisoEsc: '#e8a400',
  painel: '#6a4bd6',
  painelEsc: '#4a2fa8',
  fundoA: '#fff1fb',
  fundoB: '#ffd9ef',
  estampa: ['#ffb3d6', '#b5e8ff', '#c9f5d2', '#ffe48a', '#d9c4ff'],
  metal: '#d6dbe6',
  metalEsc: '#8a93a8',
  metalClaro: '#f7f9ff',
  led: '#1a1230',
  ledLuz: '#7dffb2',
  botao: '#ff3b55',
  botaoEsc: '#c21f3a',
  rampa: '#3b2a63',
  luzes: ['#fff27a', '#ff7ad1', '#7ae8ff', '#a6ff7a'],
};

/** Gabinete (mundo) em volta da caixa de vidro: corpo, letreiro (my0..my1) e o pe. */
function gab(C) {
  const y1 = C.teto + 0.85;
  return { x0: C.esq - 1.35, x1: C.dir + 1.35, y0: -4.55, y1, my0: y1, my1: y1 + 2.4 };
}

/** Caminho de retangulo arredondado (sem roundRect: Safari antigo). x, y = canto de baixo. */
function rr(ctx, x, y, w, h, r) {
  const q = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + q, y);
  ctx.lineTo(x + w - q, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + q);
  ctx.lineTo(x + w, y + h - q);
  ctx.quadraticCurveTo(x + w, y + h, x + w - q, y + h);
  ctx.lineTo(x + q, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - q);
  ctx.lineTo(x, y + q);
  ctx.quadraticCurveTo(x, y, x + q, y);
  ctx.closePath();
}

/** Preenche e contorna o caminho atual com tinta (espessura em u). */
function pintar(ctx, fundo, traco = 0.08) {
  ctx.fillStyle = fundo;
  ctx.fill();
  if (traco > 0) {
    ctx.strokeStyle = TINTA;
    ctx.lineWidth = traco;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

/** Texto em unidades do mundo (y para cima), tamanho em u. */
function texto(ctx, s, x, y, tam, cor, o = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, -1);
  ctx.font = `${o.peso || 700} ${tam}px Fredoka, system-ui, sans-serif`;
  ctx.textAlign = o.alinha || 'center';
  ctx.textBaseline = 'middle';
  if (o.contorno) {
    ctx.lineJoin = 'round';
    ctx.strokeStyle = o.contorno;
    ctx.lineWidth = tam * (o.grossura || 0.22);
    ctx.strokeText(s, 0, 0);
  }
  ctx.fillStyle = cor;
  ctx.fillText(s, 0, 0);
  ctx.restore();
}

/** Ruido barato e fixo por indice (posicoes das estampas). */
function h(k) {
  const v = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}

/** Estrelinha de 5 pontas. */
function estrela(ctx, x, y, r, rot = 0) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = rot + (k * Math.PI) / 5 + Math.PI / 2;
    const q = k % 2 ? r * 0.45 : r;
    const px = x + Math.cos(a) * q;
    const py = y + Math.sin(a) * q;
    if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  }
  ctx.closePath();
}

/** Coracao (ponta para baixo, y para cima). */
function coracao(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.7, y + r * 1.1, x, y + r * 0.4);
  ctx.bezierCurveTo(x + r * 0.7, y + r * 1.1, x + r * 1.4, y - r * 0.1, x, y - r);
  ctx.closePath();
}

/** Lampada (acesa ou nao). */
function lampada(ctx, x, y, r, cor, acesa) {
  if (acesa) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.2);
    g.addColorStop(0, cor);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  pintar(ctx, acesa ? '#ffffff' : '#7a5f8f', 0.05);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.62, 0, Math.PI * 2);
  ctx.fillStyle = acesa ? cor : '#5b4570';
  ctx.fill();
}

// ------------------------------------------------------------------ cenario

/** x do mundo de um x da tela. */
function paraMundoX(cam, px) {
  return cam.cx + (px - cam.sx) / cam.s;
}

/**
 * O fliperama (tela inteira) e o gabinete da maquina, atras do vidro.
 * @param {CanvasRenderingContext2D} ctx
 */
function cenario(ctx, cam, dpr, W, H, t, vis) {
  ctx.save();
  // sala escura com neon e carpete de fliperama
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, COR.salaFundo);
  g.addColorStop(1, COR.sala);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const GAB = gab(vis.caixa);
  const [, yChao] = paraTela(cam, 0, GAB.y0 + 0.4);
  const u = cam.s;
  // listras de neon na parede
  ctx.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    const y = paraTela(cam, 0, 6 + k * 4.6)[1];
    ctx.strokeStyle = ['#ff4fa3', '#45e0ff', '#b56bff'][k];
    ctx.globalAlpha = 0.16;
    ctx.lineWidth = u * 0.9;
    ctx.beginPath();
    ctx.moveTo(-10, y);
    ctx.lineTo(W + 10, y);
    ctx.stroke();
    ctx.globalAlpha = 0.65;
    ctx.lineWidth = Math.max(2, u * 0.12);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // estrelinhas da parede
  for (let k = 0; k < 40; k++) {
    const pisca = 0.3 + 0.7 * Math.max(0, Math.sin(t * 2 + k * 1.7));
    ctx.fillStyle = `rgba(255, 240, 255, ${0.25 * pisca})`;
    ctx.beginPath();
    ctx.arc(h(k) * W, h(k + 50) * yChao, 1 + h(k + 9) * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // carpete com confete
  ctx.fillStyle = '#2a1a52';
  ctx.fillRect(0, yChao, W, H - yChao);
  const cores = ['#ff4fa3', '#45e0ff', '#ffd23a', '#7dff9b'];
  ctx.globalAlpha = 0.5;
  for (let k = 0; k < 70; k++) {
    ctx.fillStyle = cores[k % 4];
    ctx.save();
    ctx.translate(h(k + 200) * W, yChao + 6 + h(k + 300) * Math.max(0, H - yChao));
    ctx.rotate(h(k) * 6);
    ctx.fillRect(-u * 0.25, -u * 0.06, u * 0.5, u * 0.12);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  // maquinas vizinhas (so aparecem na paisagem): outros temas, ainda apagados
  aplicar(ctx, cam, dpr);
  const xEsq = paraMundoX(cam, 0);
  const xDir = paraMundoX(cam, W);
  for (const lado of [-1, 1]) {
    for (let k = 1; k <= 3; k++) {
      const cx = lado * k * (GAB.x1 - GAB.x0) * 1.02;
      if ((lado < 0 && cx + 9 < xEsq) || (lado > 0 && cx - 9 > xDir)) continue;
      vizinha(ctx, cx, k + (lado > 0 ? 3 : 0), t, GAB);
    }
  }
  // sombra no chao
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, GAB.y0, (GAB.x1 - GAB.x0) * 0.6, 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  gabinete(ctx, t, vis);
  ctx.restore();
}

/** Maquina vizinha (decoracao da paisagem): outro tema, menor e na penumbra. */
function vizinha(ctx, cx, k, t, GAB) {
  const temas = [['#45c8ff', '#2a6fa8'], ['#7ee08a', '#2f8a4a'], ['#ffb347', '#b8641a'], ['#b98cff', '#5d3fb0'], ['#ff7b7b', '#a83a3a'], ['#5fe0d0', '#23877b']];
  const [c1, c2] = temas[k % temas.length];
  const w = (GAB.x1 - GAB.x0) * 0.78;
  const alt = (GAB.my1 - GAB.y0) * 0.78;
  const y0 = GAB.y0;
  ctx.save();
  rr(ctx, cx - w / 2, y0, w, alt, 0.7);
  pintar(ctx, c2, 0.1);
  rr(ctx, cx - w / 2 + 1, y0 + 3.2, w - 2, alt - 6.4, 0.4);
  pintar(ctx, '#241d3f', 0.08);
  rr(ctx, cx - w / 2 + 0.35, y0 + alt - 2.2, w - 0.7, 1.9, 0.8);
  pintar(ctx, c1, 0.1);
  texto(ctx, 'EM BREVE', cx, y0 + alt - 1.25, 0.9, '#ffffff', { contorno: TINTA, grossura: 0.3 });
  for (let j = 0; j < 5; j++) lampada(ctx, cx - 3.6 + j * 1.8, y0 + alt - 2.55, 0.18, COR.luzes[j % 4], ((j + Math.floor(t * 3)) % 4) === 0);
  // penumbra: a maquina da vez e a unica acesa
  ctx.fillStyle = 'rgba(18, 11, 38, 0.5)';
  rr(ctx, cx - w / 2 - 0.1, y0 - 0.1, w + 0.2, alt + 0.2, 0.7);
  ctx.fill();
  ctx.restore();
}

/** O corpo da maquina, o letreiro, o fundo estampado, a rampa e o painel. */
function gabinete(ctx, t, vis) {
  const C = vis.caixa;
  const GAB = gab(C);
  const pisca = vis.cartao ? Math.floor(t * 10) % 2 : -1;
  // corpo
  rr(ctx, GAB.x0, GAB.y0, GAB.x1 - GAB.x0, GAB.y1 - GAB.y0, 0.9);
  pintar(ctx, COR.corpo, 0.14);
  // laterais mais escuras e bolinhas
  ctx.save();
  rr(ctx, GAB.x0, GAB.y0, GAB.x1 - GAB.x0, GAB.y1 - GAB.y0, 0.9);
  ctx.clip();
  ctx.fillStyle = COR.corpoEsc;
  ctx.fillRect(GAB.x0, GAB.y0, 0.55, GAB.y1 - GAB.y0);
  ctx.fillRect(GAB.x1 - 0.55, GAB.y0, 0.55, GAB.y1 - GAB.y0);
  ctx.restore();
  // moldura amarela do vidro
  rr(ctx, C.esq - 0.62, C.bandeja - 0.62, C.dir - C.esq + 1.24, C.teto - C.bandeja + 1.12, 0.6);
  pintar(ctx, COR.friso, 0.1);
  // interior: fundo estampado
  ctx.save();
  ctx.beginPath();
  ctx.rect(C.esq, C.chao, C.dir - C.esq, C.teto - C.chao);
  ctx.rect(C.div, C.bandeja - 0.4, C.dir - C.div, C.chao - C.bandeja + 0.41);
  ctx.clip();
  const gi = ctx.createLinearGradient(0, C.chao, 0, C.teto);
  gi.addColorStop(0, COR.fundoB);
  gi.addColorStop(1, COR.fundoA);
  ctx.fillStyle = gi;
  ctx.fillRect(C.esq, C.bandeja - 0.4, C.dir - C.esq, C.teto - C.bandeja + 0.4);
  // estampa: estrelas, coracoes e bolinhas em grade desencontrada
  let k = 0;
  for (let y = 0.9; y < C.teto; y += 1.7) {
    for (let x = C.esq + 0.6 + ((Math.round(y / 1.7) % 2) ? 0.85 : 0); x < C.dir; x += 1.7, k++) {
      ctx.fillStyle = COR.estampa[k % COR.estampa.length];
      const tipo = k % 3;
      if (tipo === 0) estrela(ctx, x, y, 0.32, k);
      else if (tipo === 1) coracao(ctx, x, y, 0.26);
      else { ctx.beginPath(); ctx.arc(x, y, 0.16, 0, Math.PI * 2); }
      ctx.fill();
    }
  }
  // luz de cima (faixa de LED) iluminando o fundo
  const gl = ctx.createLinearGradient(0, C.teto, 0, C.teto - 5);
  gl.addColorStop(0, 'rgba(255,255,255,0.75)');
  gl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gl;
  ctx.fillRect(C.esq, C.teto - 5, C.dir - C.esq, 5);
  // rampa do premio: poco escuro com a seta que desce
  ctx.fillStyle = COR.rampa;
  ctx.fillRect(C.div, C.bandeja - 0.5, C.dir - C.div, C.topoDiv + 0.2 - C.bandeja + 0.5);
  const gr = ctx.createLinearGradient(0, C.topoDiv, 0, C.bandeja);
  gr.addColorStop(0, 'rgba(255,210,58,0.0)');
  gr.addColorStop(1, 'rgba(255,210,58,0.28)');
  ctx.fillStyle = gr;
  ctx.fillRect(C.div, C.bandeja - 0.5, C.dir - C.div, C.topoDiv + 0.7 - C.bandeja);
  const xm = (C.div + C.dir) / 2;
  const off = (t * 1.4) % 1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 0.28;
  for (let j = 0; j < 2; j++) {
    const y = C.topoDiv - 1 - (j + off) * 1.6;
    ctx.beginPath();
    ctx.moveTo(xm - 0.7, y + 0.5);
    ctx.lineTo(xm, y - 0.2);
    ctx.lineTo(xm + 0.7, y + 0.5);
    ctx.strokeStyle = `rgba(255,210,58,${0.75 - 0.3 * (j + off)})`;
    ctx.stroke();
  }
  texto(ctx, 'PRÊMIO', xm, C.topoDiv + 0.8, 0.82, COR.friso, { contorno: TINTA, grossura: 0.3 });
  ctx.restore();
  // escotilha do reabastecer: tubo que desce do teto, boca listrada
  const E = vis.escotilha;
  rr(ctx, E.x - 1.55, C.teto - 1.25, 3.1, 1.3, 0.2);
  pintar(ctx, '#3a2c5c', 0.07);
  ctx.save();
  rr(ctx, E.x - 1.85, C.teto - 1.55, 3.7, 0.42, 0.2);
  ctx.clip();
  for (let j = -2; j < 8; j++) {
    ctx.fillStyle = j % 2 ? COR.friso : TINTA;
    ctx.beginPath();
    ctx.moveTo(E.x - 1.85 + j * 0.5, C.teto - 1.55);
    ctx.lineTo(E.x - 1.85 + j * 0.5 + 0.5, C.teto - 1.55);
    ctx.lineTo(E.x - 1.85 + j * 0.5 + 0.92, C.teto - 1.13);
    ctx.lineTo(E.x - 1.85 + j * 0.5 + 0.42, C.teto - 1.13);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  rr(ctx, E.x - 1.85, C.teto - 1.55, 3.7, 0.42, 0.2);
  ctx.strokeStyle = TINTA;
  ctx.lineWidth = 0.07;
  ctx.stroke();
  // trilho do carrinho
  rr(ctx, C.esq + 0.1, C.teto - 0.75, C.dir - C.esq - 0.2, 0.3, 0.15);
  pintar(ctx, COR.metalEsc, 0.06);
  ctx.fillStyle = COR.metalClaro;
  ctx.fillRect(C.esq + 0.3, C.teto - 0.55, C.dir - C.esq - 0.6, 0.06);
  // letreiro
  rr(ctx, GAB.x0 + 0.25, GAB.my0 - 0.2, GAB.x1 - GAB.x0 - 0.5, GAB.my1 - GAB.my0 + 0.2, 1.1);
  pintar(ctx, COR.painel, 0.14);
  rr(ctx, GAB.x0 + 0.75, GAB.my0 + 0.25, GAB.x1 - GAB.x0 - 1.5, GAB.my1 - GAB.my0 - 0.75, 0.8);
  pintar(ctx, COR.painelEsc, 0.06);
  ctx.save();
  ctx.translate(0, (GAB.my0 + GAB.my1) / 2 + 0.05);
  ctx.rotate(Math.sin(t * 2.2) * 0.04);
  texto(ctx, 'GARRA', -1.15, 0.1, 1.45, COR.friso, { contorno: TINTA, grossura: 0.28 });
  texto(ctx, 'de squishy', 3.3, -0.14, 0.66, '#ffffff', { contorno: TINTA, grossura: 0.3 });
  ctx.restore();
  // lampadas do letreiro (correm; no premio piscam todas)
  const nL = 13;
  for (let j = 0; j < nL; j++) {
    const x = GAB.x0 + 0.85 + (j * (GAB.x1 - GAB.x0 - 1.7)) / (nL - 1);
    const acesa = pisca >= 0 ? pisca === j % 2 : ((j + Math.floor(t * 6)) % 3) === 0;
    lampada(ctx, x, GAB.my1 - 0.08, 0.2, COR.luzes[j % 4], acesa);
  }
  // lampadas das colunas
  for (let j = 0; j < 8; j++) {
    const y = C.chao + 1 + j * 1.85;
    for (const x of [GAB.x0 + 0.62, GAB.x1 - 0.62]) {
      const acesa = pisca >= 0 ? pisca === (j + (x > 0 ? 1 : 0)) % 2 : ((j + Math.floor(t * 5) + (x > 0 ? 4 : 0)) % 4) === 0;
      lampada(ctx, x, y, 0.17, COR.luzes[(j + 1) % 4], acesa);
    }
  }
  painel(ctx, t, vis, GAB);
}

/** Painel embaixo do vidro: manche, botao Pegar, visor de fichas e a portinha do premio. */
function painel(ctx, t, vis, GAB) {
  const C = vis.caixa;
  const B = vis.botao;
  const G = vis.garra;
  // tampo do painel (violeta) na frente do chao da maquina
  rr(ctx, C.esq - 0.45, C.chao - 3.05, C.div - C.esq + 0.4, 2.82, 0.4);
  pintar(ctx, COR.painel, 0.1);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(C.esq - 0.2, C.chao - 0.62, C.div - C.esq - 0.1, 0.16);
  // manche: inclina para onde o carrinho anda
  const jx = C.esq + 1.3;
  const jy = -1.6;
  const incl = Math.max(-1, Math.min(1, (G.vx || 0) / 6)) * 0.45;
  ctx.beginPath();
  ctx.ellipse(jx, jy - 0.15, 0.85, 0.32, 0, 0, Math.PI * 2);
  pintar(ctx, '#2a1d4f', 0.07);
  ctx.strokeStyle = TINTA;
  ctx.lineWidth = 0.32;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(jx, jy - 0.1);
  ctx.lineTo(jx + incl * 1.3, jy + 1.05);
  ctx.stroke();
  ctx.strokeStyle = COR.metal;
  ctx.lineWidth = 0.18;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(jx + incl * 1.3, jy + 1.15, 0.42, 0, Math.PI * 2);
  pintar(ctx, COR.botao, 0.07);
  ctx.beginPath();
  ctx.arc(jx + incl * 1.3 - 0.13, jy + 1.28, 0.12, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fill();
  // botao Pegar (o grande): pulsa quando pode, afunda quando a garra anda; sem ficha vira recarga
  const pode = G.fase === 'mira';
  const recarga = vis.fichas <= 0 && pode;
  const fundo = pode ? 0 : 0.12;
  const pulso = pode ? 1 + 0.05 * Math.sin(t * 6) : 1;
  ctx.beginPath();
  ctx.ellipse(B.x, B.y - 0.32, B.r * 1.12, B.r * 0.5, 0, 0, Math.PI * 2);
  pintar(ctx, '#2a1d4f', 0.07);
  const cor = recarga ? '#3fd47a' : COR.botao;
  const corEsc = recarga ? '#1f9a52' : COR.botaoEsc;
  ctx.beginPath();
  ctx.ellipse(B.x, B.y - 0.18 - fundo, B.r * pulso, B.r * 0.48 * pulso, 0, 0, Math.PI * 2);
  pintar(ctx, corEsc, 0.07);
  ctx.beginPath();
  ctx.ellipse(B.x, B.y + 0.05 - fundo, B.r * pulso, B.r * 0.62 * pulso, 0, 0, Math.PI * 2);
  pintar(ctx, cor, 0.08);
  ctx.beginPath();
  ctx.ellipse(B.x - 0.3, B.y + 0.25 - fundo, 0.32, 0.14, -0.2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fill();
  texto(ctx, recarga ? '+5' : 'PEGAR', B.x, B.y + 0.02 - fundo, recarga ? 0.62 : 0.44, '#ffffff', { contorno: TINTA, grossura: 0.3 });
  if (pode && !recarga) {
    ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 6);
    ctx.strokeStyle = '#fff27a';
    ctx.lineWidth = 0.1;
    ctx.beginPath();
    ctx.ellipse(B.x, B.y + 0.05, B.r * 1.25, B.r * 0.8, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // visor (fichas e a contagem da mira)
  const vx0 = C.div - 2.75;
  rr(ctx, vx0, -2.55, 2.55, 1.85, 0.25);
  pintar(ctx, COR.led, 0.08);
  const contando = vis.tMira !== null && vis.tMira !== undefined && pode;
  if (contando) {
    const n = Math.max(0, Math.ceil(vis.tMira));
    const urgente = n <= 3 && Math.floor(t * 4) % 2 === 0;
    texto(ctx, String(n), vx0 + 1.27, -1.5, 0.95, urgente ? '#ff6b6b' : COR.ledLuz);
    texto(ctx, 'TEMPO', vx0 + 1.27, -2.22, 0.36, 'rgba(125,255,178,0.7)');
  } else {
    ctx.beginPath();
    ctx.arc(vx0 + 0.62, -1.5, 0.36, 0, Math.PI * 2);
    pintar(ctx, COR.friso, 0.05);
    texto(ctx, '¢', vx0 + 0.62, -1.5, 0.42, COR.frisoEsc);
    texto(ctx, String(vis.fichas), vx0 + 1.75, -1.5, 0.82, COR.ledLuz);
    texto(ctx, 'FICHAS', vx0 + 1.27, -2.22, 0.36, 'rgba(125,255,178,0.7)');
  }
  // frente da rampa: portinha do premio
  const px0 = C.div + 0.15;
  const pw = C.dir - C.div - 0.3;
  rr(ctx, px0, GAB.y0 + 0.45, pw, C.bandeja - GAB.y0 - 0.75, 0.3);
  pintar(ctx, '#2a1d4f', 0.08);
  const brilho = vis.cartao ? 0.5 + 0.5 * Math.sin(t * 14) : 0;
  rr(ctx, px0 + 0.35, GAB.y0 + 0.75, pw - 0.7, C.bandeja - GAB.y0 - 1.4, 0.2);
  pintar(ctx, brilho > 0 ? `rgba(255,242,122,${0.35 + 0.5 * brilho})` : '#4a3a7a', 0.06);
  texto(ctx, 'PEGUE AQUI', px0 + pw / 2, (GAB.y0 + C.bandeja) / 2 + 0.05, 0.42, '#ffffff', { contorno: TINTA, grossura: 0.25 });
  // fenda da ficha embaixo do painel
  const fx = (C.esq + C.div) / 2;
  rr(ctx, fx - 2.6, GAB.y0 + 0.55, 5.2, 1.1, 0.3);
  pintar(ctx, COR.corpoEsc, 0.07);
  rr(ctx, fx - 2.3, GAB.y0 + 0.78, 0.9, 0.65, 0.15);
  pintar(ctx, COR.friso, 0.06);
  rr(ctx, fx - 1.9, GAB.y0 + 0.86, 0.1, 0.49, 0.04);
  pintar(ctx, TINTA, 0);
  texto(ctx, 'fichas só jogando', fx + 0.5, GAB.y0 + 1.1, 0.4, '#ffffff', { contorno: TINTA, grossura: 0.25 });
}

// ------------------------------------------------------------------ fundo (atras do slime)

/**
 * A pinca de tras (a terceira, na sombra) e o rastro de gosma no vidro.
 * @param {CanvasRenderingContext2D} ctx
 */
function fundo(ctx, cam, dpr, t, vis) {
  aplicar(ctx, cam, dpr);
  ctx.save();
  // rastro de gosma dos squishies que grudaram no vidro e escorreram (some em 7 s)
  for (const k of vis.manchas || []) {
    const a = Math.max(0, 1 - k.t / 7);
    if (a <= 0) continue;
    const x = k.x - k.lado * 0.2;
    ctx.globalAlpha = 0.42 * a;
    ctx.fillStyle = k.cor;
    ctx.beginPath();
    ctx.ellipse(x, k.y, 0.3, k.r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.5 * a;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x - k.lado * 0.08, k.y + k.r * 0.2, 0.06, k.r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // pinca de tras: sai do meio da cabeca e encolhe ao abrir (vista de frente)
  const G = vis.garra;
  const comp = 2.35 - 0.55 * G.ab;
  const x = G.hx;
  const y0 = G.hy - 0.1;
  ctx.lineCap = 'round';
  ctx.strokeStyle = TINTA;
  ctx.lineWidth = 0.42;
  ctx.beginPath();
  ctx.moveTo(x, y0);
  ctx.lineTo(x, y0 - comp);
  ctx.stroke();
  ctx.strokeStyle = COR.metalEsc;
  ctx.lineWidth = 0.28;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x, y0 - comp, 0.3, 0.2, 0, 0, Math.PI * 2);
  pintar(ctx, COR.metalEsc, 0.06);
  ctx.restore();
}

// ------------------------------------------------------------------ topo (na frente do slime)

/**
 * Cabo, carrinho, cabeca e as duas pincas de metal; contagem e o cartao do premio.
 * @param {CanvasRenderingContext2D} ctx
 */
function topo(ctx, cam, dpr, t, vis) {
  aplicar(ctx, cam, dpr);
  ctx.save();
  const C = vis.caixa;
  const G = vis.garra;
  const yTrilho = C.teto - 0.6;
  // cabo
  ctx.lineCap = 'round';
  ctx.strokeStyle = TINTA;
  ctx.lineWidth = 0.2;
  ctx.beginPath();
  ctx.moveTo(G.hx, yTrilho - 0.3);
  ctx.lineTo(G.hx, G.hy + 0.3);
  ctx.stroke();
  ctx.strokeStyle = '#9aa1b5';
  ctx.lineWidth = 0.1;
  ctx.stroke();
  // carrinho no trilho
  rr(ctx, G.hx - 0.95, yTrilho - 0.5, 1.9, 0.75, 0.25);
  pintar(ctx, COR.friso, 0.07);
  for (const dx of [-0.55, 0.55]) {
    ctx.beginPath();
    ctx.arc(G.hx + dx, yTrilho + 0.22, 0.2, 0, Math.PI * 2);
    pintar(ctx, COR.metalEsc, 0.05);
  }
  lampada(ctx, G.hx, yTrilho - 0.12, 0.14, G.segura ? '#7dff9b' : '#ff7ad1', Math.floor(t * 4) % 2 === 0 || G.fase === 'mira');
  // pincas (haste e ponta) em metal
  const caps = G.caps;
  for (const [a, b] of [[1, 2], [3, 4]]) {
    const p = caps[a];
    const q = caps[b];
    const linha = () => {
      ctx.beginPath();
      ctx.moveTo(p.ax, p.ay);
      ctx.lineTo(p.bx, p.by);
      ctx.lineTo(q.bx, q.by);
    };
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    linha();
    ctx.strokeStyle = TINTA;
    ctx.lineWidth = p.r * 2 + 0.12;
    ctx.stroke();
    linha();
    ctx.strokeStyle = COR.metal;
    ctx.lineWidth = p.r * 2 - 0.02;
    ctx.stroke();
    linha();
    ctx.strokeStyle = COR.metalClaro;
    ctx.lineWidth = 0.07;
    ctx.stroke();
    // junta (parafuso) e pontinha de borracha
    ctx.beginPath();
    ctx.arc(p.bx, p.by, 0.17, 0, Math.PI * 2);
    pintar(ctx, COR.metalEsc, 0.05);
    ctx.beginPath();
    ctx.arc(q.bx, q.by, 0.19, 0, Math.PI * 2);
    pintar(ctx, '#ff7ad1', 0.05);
  }
  // cabeca (cupula cromada)
  const hx = G.hx;
  const hy = G.hy;
  rr(ctx, hx - 0.85, hy - 0.38, 1.7, 0.95, 0.4);
  const gm = ctx.createLinearGradient(hx - 0.85, 0, hx + 0.85, 0);
  gm.addColorStop(0, COR.metalEsc);
  gm.addColorStop(0.35, COR.metalClaro);
  gm.addColorStop(1, COR.metalEsc);
  pintar(ctx, gm, 0.08);
  rr(ctx, hx - 0.6, hy + 0.5, 1.2, 0.35, 0.15);
  pintar(ctx, COR.friso, 0.06);
  for (const dx of [-0.42, 0.42]) {
    ctx.beginPath();
    ctx.arc(hx + dx, hy - 0.12, 0.12, 0, Math.PI * 2);
    pintar(ctx, COR.metalEsc, 0.04);
  }
  // contagem perto do carrinho (os ultimos segundos)
  if (G.fase === 'mira' && vis.tMira !== null && vis.tMira !== undefined && vis.tMira <= 5) {
    const n = Math.max(0, Math.ceil(vis.tMira));
    const f = vis.tMira - Math.floor(vis.tMira);
    texto(ctx, String(n), hx + 1.7, hy + 0.6, 0.9 + 0.3 * f, n <= 3 ? '#ff4f6d' : '#ffffff', { contorno: TINTA, grossura: 0.3 });
  }
  ctx.restore();
  if (vis.cartao) cartao(ctx, cam, dpr, vis.cartao, t);
}

/** Cores do squishy no cartao (o shader nao desenha aqui: gradientes aproximam a estampa). */
function corSquishy(ctx, c, r) {
  const tipo = c.tipo;
  const radial = (stops) => {
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
    stops.forEach((s, k) => g.addColorStop(k / (stops.length - 1), s));
    return g;
  };
  if (tipo.raridade === 2) return radial(['#fff6c8', '#f5b82e', '#a8700f']);
  if (tipo.textura === 3) {
    const g = ctx.createLinearGradient(-r, 0, r, 0);
    ['#ff6b6b', '#ffd23a', '#7fe36b', '#5ec8ff', '#b07bff'].forEach((s, k) => g.addColorStop(k / 4, s));
    return g;
  }
  if (tipo.textura === 5) return radial(['#f3a6ff', '#6a3fb5', '#2a1650']);
  if (tipo.textura === 6) return radial(['#ffffff', '#f7b8f0', '#b78cff']);
  return c.hex || '#ff9cc4';
}

/** Cartao "Novo squishy!" (px CSS, no meio do vidro) por ~2,4 s. */
function cartao(ctx, cam, dpr, c, t) {
  const tipo = c.tipo;
  const [sx, sy] = paraTela(cam, 0, 9.2);
  const larg = Math.min(cam.s * 11.5, 330);
  const alt = larg * 0.72;
  // entra com um pulo e sai sumindo
  const e = c.t < 0.25 ? c.t / 0.25 : 1;
  const esc = c.t < 0.25 ? 0.6 + 0.48 * e - 0.08 * e * e : 1;
  const alfa = c.t > 2.1 ? Math.max(0, 1 - (c.t - 2.1) / 0.3) : 1;
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalAlpha = alfa;
  ctx.translate(sx, sy);
  ctx.scale(esc, esc);
  ctx.rotate(-0.04);
  // raios atras (raro e lendario)
  if (tipo.raridade > 0) {
    ctx.save();
    ctx.rotate(t * 0.8);
    ctx.fillStyle = tipo.raridade === 2 ? 'rgba(255,214,80,0.4)' : 'rgba(190,160,255,0.4)';
    for (let k = 0; k < 12; k++) {
      ctx.rotate(Math.PI / 6);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(larg * 0.85, -larg * 0.08);
      ctx.lineTo(larg * 0.85, larg * 0.08);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  const u = larg / 100;
  const x0 = -larg / 2;
  const y0 = -alt / 2;
  // corpo do cartao (y para baixo aqui)
  rrTela(ctx, x0, y0, larg, alt, 8 * u);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = Math.max(3, 3.2 * u);
  ctx.strokeStyle = TINTA;
  ctx.stroke();
  // faixa da raridade
  const faixa = ['#7fe3c0', '#b9a5ff', '#ffd23a'][tipo.raridade];
  ctx.save();
  rrTela(ctx, x0, y0, larg, alt, 8 * u);
  ctx.clip();
  ctx.fillStyle = faixa;
  ctx.fillRect(x0, y0, larg, 17 * u);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(x0, y0 + 17 * u);
  ctx.lineTo(x0 + larg, y0 + 17 * u);
  ctx.lineWidth = Math.max(2, 2.2 * u);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = TINTA;
  ctx.font = `700 ${10 * u}px Fredoka, system-ui, sans-serif`;
  ctx.fillText(c.novo ? 'Novo squishy!' : 'Repetido!', 0, y0 + 9 * u);
  // o squishy (amassadinho, com rosto)
  const r = 15 * u;
  const bx = x0 + 24 * u;
  const by = y0 + 43 * u;
  const amassa = 1 + 0.08 * Math.sin(t * 9);
  ctx.save();
  ctx.translate(bx, by);
  ctx.scale(amassa, 2 - amassa);
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.92, 0, 0, Math.PI * 2);
  ctx.fillStyle = corSquishy(ctx, c, r);
  ctx.fill();
  ctx.lineWidth = Math.max(2.5, 2.6 * u);
  ctx.stroke();
  if (tipo.textura === 1 || tipo.textura === 6) {
    ctx.fillStyle = tipo.textura === 6 ? '#ffffff' : 'rgba(255,255,255,0.7)';
    for (let k = 0; k < 7; k++) {
      ctx.beginPath();
      ctx.arc(Math.cos(k * 2.4) * r * 0.62, Math.sin(k * 2.4) * r * 0.55, r * (tipo.textura === 6 ? 0.07 : 0.11), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (tipo.textura === 2) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.92, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = r * 0.22;
    for (let k = -3; k <= 3; k++) {
      ctx.beginPath();
      ctx.moveTo(k * r * 0.55 - r, -r);
      ctx.lineTo(k * r * 0.55 + r, r);
      ctx.stroke();
    }
    ctx.restore();
  }
  // rosto
  ctx.fillStyle = TINTA;
  for (const dx of [-0.36, 0.36]) {
    ctx.beginPath();
    ctx.ellipse(dx * r, -0.08 * r, 0.12 * r, 0.17 * r, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  for (const dx of [-0.36, 0.36]) {
    ctx.beginPath();
    ctx.arc(dx * r - 0.04 * r, -0.14 * r, 0.05 * r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(0, 0.12 * r, 0.2 * r, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.lineWidth = Math.max(2, 0.07 * r);
  ctx.strokeStyle = TINTA;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,120,150,0.45)';
  for (const dx of [-0.58, 0.58]) {
    ctx.beginPath();
    ctx.ellipse(dx * r, 0.18 * r, 0.12 * r, 0.07 * r, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // brilhinhos no raro
  if (tipo.raridade > 0) {
    ctx.fillStyle = tipo.raridade === 2 ? '#ffd23a' : '#b9a5ff';
    for (let k = 0; k < 3; k++) {
      const a = t * 3 + k * 2.1;
      ctx.save();
      ctx.translate(bx + Math.cos(a) * r * 1.25, by + Math.sin(a) * r * 1.1);
      brilhoTela(ctx, 3.2 * u * (0.7 + 0.3 * Math.sin(t * 8 + k)));
      ctx.restore();
    }
  }
  // nome, raridade e o album
  ctx.textAlign = 'left';
  ctx.fillStyle = TINTA;
  let tamNome = 11 * u;
  ctx.font = `700 ${tamNome}px Fredoka, system-ui, sans-serif`;
  const maxNome = larg - 47 * u;
  const wNome = ctx.measureText(tipo.nome).width;
  if (wNome > maxNome) { tamNome *= maxNome / wNome; ctx.font = `700 ${tamNome}px Fredoka, system-ui, sans-serif`; }
  ctx.fillText(tipo.nome, x0 + 44 * u, y0 + 34 * u);
  const rot = c.rotulo + ['', ' ✦', ' ★'][tipo.raridade];
  ctx.font = `700 ${7.5 * u}px Fredoka, system-ui, sans-serif`;
  const wr = ctx.measureText(rot).width + 8 * u;
  rrTela(ctx, x0 + 44 * u, y0 + 42 * u, wr, 11 * u, 5 * u);
  ctx.fillStyle = faixa;
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, 1.6 * u);
  ctx.stroke();
  ctx.fillStyle = TINTA;
  ctx.fillText(rot, x0 + 48 * u, y0 + 47.8 * u);
  ctx.font = `600 ${7.5 * u}px Fredoka, system-ui, sans-serif`;
  ctx.fillStyle = '#5a4f6e';
  ctx.fillText(c.novo ? `Álbum ${c.n}/${c.total}` : `Você tem ${c.qtd} · +1 ficha`, x0 + 44 * u, y0 + 61 * u);
  ctx.restore();
}

/** Retangulo arredondado em px (y para baixo). */
function rrTela(ctx, x, y, w, h0, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h0 - r);
  ctx.quadraticCurveTo(x + w, y + h0, x + w - r, y + h0);
  ctx.lineTo(x + r, y + h0);
  ctx.quadraticCurveTo(x, y + h0, x, y + h0 - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** Brilho de 4 pontas (px). */
function brilhoTela(ctx, r) {
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.quadraticCurveTo(0, 0, 0, r);
  ctx.quadraticCurveTo(0, 0, -r, 0);
  ctx.quadraticCurveTo(0, 0, 0, -r);
  ctx.fill();
}

/** Ganchos da cena (src/render/cena.js) para o modo da Garra. */
export const DESENHO_GARRA = Object.freeze({ cenario, fundo, topo });

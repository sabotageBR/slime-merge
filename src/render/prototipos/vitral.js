// Desenhos do Vitral de Gelatina (?modelo=vitral; so dos prototipos). Funcoes puras de
// ctx/cam/vis chamadas pela cena: o cenario (parede de pedra clara com luz entrando, mesa, a
// prateleira dos bicos e a galeria dos vitrais prontos), o fundo do vitral (vidro em branco e a
// cor-alvo clarinha tracejada nas pecas vazias, a luz atras das acesas) e, por cima do slime,
// o brilho das pecas acesas, o chumbo, a moldura de pedra, o jorro do copo e a dica.

import { aplicar, paraTela } from '../camera.js';
import { TINTA } from '../fundo.js';

const CHUMBO = '#2b2930';
const PEDRA = '#ddd2bf';
const PEDRA_ESC = '#c4b59c';

/** Pseudo-aleatorio fixo por indice. */
const h = (k) => {
  const s = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Cor hex -> [r, g, b] (0..255). */
function rgb(hex) {
  const n = parseInt((hex || '#ffffff').slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mistura a cor com branco (k = 0..1) e devolve rgba(). */
function clarear(hex, k, a = 1) {
  const [r, g, b] = rgb(hex);
  return `rgba(${Math.round(r + (255 - r) * k)}, ${Math.round(g + (255 - g) * k)}, ${Math.round(b + (255 - b) * k)}, ${a})`;
}

/** Escurece a cor (k = 0..1). */
function escurecer(hex, k, a = 1) {
  const [r, g, b] = rgb(hex);
  return `rgba(${Math.round(r * (1 - k))}, ${Math.round(g * (1 - k))}, ${Math.round(b * (1 - k))}, ${a})`;
}

function caminho(ctx, pts, fechar = true) {
  ctx.beginPath();
  pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  if (fechar) ctx.closePath();
}

/** Arestas internas do vitral (sem repetir; sem a borda do circulo, que a moldura cobre) e os nos. */
const cacheArestas = new WeakMap();
function arestas(V) {
  let c = cacheArestas.get(V.pecas);
  if (c) return c;
  const vistas = new Map();
  const graus = new Map();
  const chave = (p) => Math.round(p[0] * 1000) + ',' + Math.round(p[1] * 1000);
  const naBorda = (p) => Math.abs(Math.hypot(p[0] - V.cx, p[1] - V.cy) - V.R) < 0.05;
  for (const P of V.pecas) {
    const n = P.pts.length;
    for (let i = 0; i < n; i++) {
      const a = P.pts[i];
      const b = P.pts[(i + 1) % n];
      if (naBorda(a) && naBorda(b)) continue;
      const ka = chave(a);
      const kb = chave(b);
      const k = ka < kb ? ka + '|' + kb : kb + '|' + ka;
      if (vistas.has(k) || ka === kb) continue;
      vistas.set(k, [a[0], a[1], b[0], b[1]]);
      graus.set(ka, (graus.get(ka) || 0) + 1);
      graus.set(kb, (graus.get(kb) || 0) + 1);
    }
  }
  // nos de solda: onde 3 ou mais arestas se encontram (ou a aresta chega na moldura)
  const nos = [];
  const pos = new Map();
  for (const [x0, y0, x1, y1] of vistas.values()) { pos.set(chave([x0, y0]), [x0, y0]); pos.set(chave([x1, y1]), [x1, y1]); }
  for (const [k, g] of graus) {
    const p = pos.get(k);
    if (g >= 3 || (g === 1 && naBorda(p))) nos.push(p);
  }
  c = { lista: [...vistas.values()], nos };
  cacheArestas.set(V.pecas, c);
  return c;
}

// ------------------------------------------------------------------ cenario

/**
 * Parede de pedra clara (igreja/atelie) com feixes de luz, a mesa do copo, a prateleira dos
 * bicos e a galeria. No vitral pronto, raios coloridos saem do vitral.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../camera.js').Camera} cam
 * @param {number} dpr @param {number} W @param {number} H @param {number} t
 * @param {any} vis @param {number} chao
 */
export function desenharCenario(ctx, cam, dpr, W, H, t, vis, chao) {
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const u = cam.s;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#f4ecdf');
  g.addColorStop(1, '#e9dcc6');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // blocos de pedra (em unidades do mundo: escalam com a camera)
  const [ox, oy] = paraTela(cam, 0, chao);
  const bh = u * 1.7;
  const bw = u * 3.1;
  ctx.lineWidth = Math.max(1, u * 0.05);
  let fila = 0;
  for (let y = oy; y > -bh; y -= bh, fila++) {
    const desl = (fila % 2) * bw * 0.5;
    for (let x = ((ox + desl) % bw) - bw; x < W; x += bw) {
      const id = fila * 31 + Math.round((x - ox) / bw);
      const tom = h(id);
      ctx.fillStyle = tom > 0.7 ? 'rgba(170, 140, 100, 0.07)' : tom < 0.2 ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0)';
      ctx.fillRect(x + 2, y - bh + 2, bw - 4, bh - 4);
      ctx.strokeStyle = 'rgba(140, 110, 80, 0.2)';
      ctx.strokeRect(x + 1, y - bh + 1, bw - 2, bh - 2);
    }
  }
  const V = vis.vitral;
  const [vx, vy] = paraTela(cam, V.cx, V.cy);
  const vr = (V.R + 0.75) * u;
  // nicho do vitral: sombra suave em volta
  const sombra = ctx.createRadialGradient(vx, vy, vr * 0.95, vx, vy, vr * 1.35);
  sombra.addColorStop(0, 'rgba(110, 85, 60, 0.28)');
  sombra.addColorStop(1, 'rgba(110, 85, 60, 0)');
  ctx.fillStyle = sombra;
  ctx.beginPath();
  ctx.arc(vx, vy, vr * 1.35, 0, Math.PI * 2);
  ctx.fill();
  // feixes de luz que entram pelo vitral e descem pela sala (mais fortes com as pecas acesas)
  const acesas = V.pecas.filter((P) => P.acesa).length / V.pecas.length;
  const pronto = V.pronto >= 0 ? Math.min(1, V.pronto / 0.8) : 0;
  const forca = 0.1 + 0.18 * acesas + 0.3 * pronto;
  const dirX = 0.38;
  for (let k = 0; k < 3; k++) {
    const respira = 0.85 + 0.15 * Math.sin(t * 0.7 + k * 2.1);
    const x0 = vx + (k - 1) * vr * 0.55;
    const larg = vr * (0.5 - Math.abs(k - 1) * 0.12);
    const comp = H * 1.2;
    const lg = ctx.createLinearGradient(x0, vy, x0 + comp * dirX, vy + comp);
    lg.addColorStop(0, `rgba(255, 250, 225, ${(forca * respira).toFixed(3)})`);
    lg.addColorStop(1, 'rgba(255, 250, 225, 0)');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(x0 - larg * 0.5, vy);
    ctx.lineTo(x0 + larg * 0.5, vy);
    ctx.lineTo(x0 + larg * 1.3 + comp * dirX, vy + comp);
    ctx.lineTo(x0 - larg * 1.3 + comp * dirX, vy + comp);
    ctx.closePath();
    ctx.fill();
  }
  // poeira dancando na luz
  ctx.fillStyle = 'rgba(255, 255, 240, 0.8)';
  for (let k = 0; k < 18; k++) {
    const fx = h(k + 3);
    const fy = (h(k + 50) + t * (0.015 + 0.02 * h(k + 9))) % 1;
    const px = vx + (fx - 0.5) * vr * 1.6 + fy * H * 0.45 * dirX;
    const py = vy + fy * H * 0.45;
    ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(t * 0.9 + k));
    ctx.beginPath();
    ctx.arc(px, py, Math.max(1, u * 0.05), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // vitral pronto: raios coloridos girando devagar atras dele
  if (pronto > 0) raiosPronto(ctx, vx, vy, vr, V, t, pronto, Math.max(W, H));
  // galeria: medalhoes dos vitrais prontos nos dois lados do copo
  aplicar(ctx, cam, dpr);
  const lugares = [[-4.95, 1.75], [4.95, 1.75], [-4.95, 4.85], [4.95, 4.85]];
  lugares.forEach(([x, y], k) => {
    const G = vis.galeria[vis.galeria.length - 1 - k];
    medalhao(ctx, x, y, 0.95, G, t, V.R);
  });
  // prateleira dos bicos
  const yp = 4.4 + 1.62;
  ctx.fillStyle = '#b07b4a';
  ctx.strokeStyle = TINTA;
  ctx.lineWidth = 0.07;
  ctx.beginPath();
  ctx.rect(-3.3, yp, 6.6, 0.26);
  ctx.fill();
  ctx.stroke();
  for (const sx of [-3.05, 3.05]) {
    ctx.fillStyle = '#8f5f35';
    ctx.beginPath();
    ctx.moveTo(sx - 0.18, yp);
    ctx.lineTo(sx + 0.18, yp);
    ctx.lineTo(sx, yp - 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
  // mesa (do chao para baixo)
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const yc = paraTela(cam, 0, chao)[1];
  ctx.fillStyle = '#c9965f';
  ctx.fillRect(0, yc, W, H - yc);
  ctx.fillStyle = '#a8763f';
  ctx.fillRect(0, yc + Math.max(6, u * 0.32), W, H - yc);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.fillRect(0, yc + 2, W, Math.max(2, u * 0.07));
  ctx.fillStyle = TINTA;
  ctx.fillRect(0, yc - 1.5, W, 3);
  ctx.fillRect(0, yc + Math.max(6, u * 0.32) - 1, W, 2);
  ctx.restore();
}

/** Raios de luz do vitral pronto (px): dourados e nas cores das pecas, girando devagar. */
function raiosPronto(ctx, vx, vy, vr, V, t, k, L) {
  const n = 18;
  ctx.save();
  const halo = ctx.createRadialGradient(vx, vy, vr * 0.9, vx, vy, vr * 2.2);
  halo.addColorStop(0, `rgba(255, 236, 160, ${(0.75 * k).toFixed(3)})`);
  halo.addColorStop(1, 'rgba(255, 236, 160, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(vx - vr * 2.2, vy - vr * 2.2, vr * 4.4, vr * 4.4);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + t * 0.15;
    const P = V.pecas[i % V.pecas.length];
    const larg = 0.075 + 0.025 * Math.sin(t * 2 + i);
    const cor = i % 2 ? 'rgba(255, 214, 90, ' + (0.42 * k).toFixed(3) + ')' : clarear(P.hex || '#ffffff', 0.15, 0.36 * k);
    const g = ctx.createRadialGradient(vx, vy, vr, vx, vy, L);
    g.addColorStop(0, cor);
    g.addColorStop(1, 'rgba(255, 240, 200, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(vx + Math.cos(a - larg * 0.3) * vr * 0.95, vy + Math.sin(a - larg * 0.3) * vr * 0.95);
    ctx.lineTo(vx + Math.cos(a - larg) * L, vy + Math.sin(a - larg) * L);
    ctx.lineTo(vx + Math.cos(a + larg) * L, vy + Math.sin(a + larg) * L);
    ctx.lineTo(vx + Math.cos(a + larg * 0.3) * vr * 0.95, vy + Math.sin(a + larg * 0.3) * vr * 0.95);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Medalhao da galeria (u): um vitral pronto em miniatura pendurado num prego. */
function medalhao(ctx, x, y, r, G, t, R) {
  if (!G) return;
  ctx.save();
  // prego e cordao
  ctx.strokeStyle = 'rgba(80, 60, 40, 0.6)';
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.55, y + r * 0.8);
  ctx.lineTo(x, y + r * 1.35);
  ctx.lineTo(x + r * 0.55, y + r * 0.8);
  ctx.stroke();
  ctx.fillStyle = '#6b5a48';
  ctx.beginPath();
  ctx.arc(x, y + r * 1.35, 0.08, 0, Math.PI * 2);
  ctx.fill();
  const f = r / R;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = '#fbf8f0';
  ctx.fill();
  ctx.save();
  ctx.clip();
  G.geo.forEach((P, k) => {
    caminho(ctx, P.pts.map(([px, py]) => [x + px * f, y + py * f]));
    ctx.fillStyle = G.cores[k] || '#ffffff';
    ctx.fill();
    ctx.strokeStyle = CHUMBO;
    ctx.lineWidth = 0.07;
    ctx.stroke();
  });
  // brilho que passa
  const s = ((t * 0.25 + x * 0.1) % 1.6) - 0.3;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.beginPath();
  ctx.moveTo(x - r + s * 2 * r, y - r);
  ctx.lineTo(x - r + s * 2 * r + 0.3, y - r);
  ctx.lineTo(x - r + s * 2 * r - 0.5, y + r);
  ctx.lineTo(x - r + s * 2 * r - 0.8, y + r);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = 0.2;
  ctx.strokeStyle = TINTA;
  ctx.beginPath();
  ctx.arc(x, y, r + 0.06, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 0.12;
  ctx.strokeStyle = '#d9b45a';
  ctx.stroke();
  ctx.restore();
}

// ------------------------------------------------------------------ fundo (atras do slime)

/**
 * Vidro em branco, a cor-alvo clarinha e tracejada nas pecas vazias (livro de colorir) e a luz
 * atras das pecas acesas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../camera.js').Camera} cam
 * @param {number} dpr @param {number} t @param {any} vis @param {any} m
 */
export function desenharFundo(ctx, cam, dpr, t, vis, m) {
  void m;
  const V = vis.vitral;
  ctx.save();
  aplicar(ctx, cam, dpr);
  // vidro: branco leitoso com a luz vindo do alto a esquerda
  const g = ctx.createRadialGradient(V.cx - V.R * 0.35, V.cy + V.R * 0.4, V.R * 0.1, V.cx, V.cy, V.R * 1.05);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#ece8de');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(V.cx, V.cy, V.R + 0.1, 0, Math.PI * 2);
  ctx.fill();
  const px = 1 / cam.s;
  for (const P of V.pecas) {
    const sel = P.k === V.sel;
    if (P.estado === 'vazia') {
      const pulso = sel ? 0.5 + 0.5 * Math.sin(t * 3.2) : 0;
      caminho(ctx, P.pts);
      ctx.fillStyle = clarear(P.hexAlvo, sel ? 0.35 - 0.1 * pulso : 0.55, 1);
      ctx.fill();
      // tracejado de livro de colorir logo por dentro do chumbo (que cobre 0,28 u da borda): a
      // faixa cortada pela propria peca so aparece do lado de dentro
      ctx.save();
      caminho(ctx, P.pts);
      ctx.clip();
      const traco = Math.max(0.07, 2.2 * px);
      ctx.setLineDash([0.3, 0.22]);
      ctx.lineDashOffset = sel ? -t * 0.6 : 0;
      ctx.lineWidth = 0.68 + 2 * traco;
      ctx.strokeStyle = escurecer(P.hexAlvo, 0.2, 0.8);
      caminho(ctx, P.pts);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = 0.68;
      ctx.strokeStyle = clarear(P.hexAlvo, sel ? 0.35 - 0.1 * pulso : 0.55, 1);
      ctx.stroke();
      ctx.restore();
      // pingo da cor no polo (a "legenda" do livro de colorir)
      gotinha(ctx, P.polo[0], P.polo[1], Math.min(0.42, P.rosto * 0.42), P.hexAlvo, sel ? 1 + 0.08 * Math.sin(t * 5) : 1);
    } else {
      // atras do slime: a luz da peca acesa vaza pelas frestas do chumbo
      const luz = P.acesa ? 1 : 0;
      caminho(ctx, P.pts);
      ctx.fillStyle = P.estado === 'enchendo' ? clarear(P.hex, 0.6, 1) : P.acesa ? clarear(P.hex, 0.55, 1) : escurecer(P.hex || '#888888', 0.35, 1);
      ctx.fill();
      if (luz) {
        const rg = ctx.createRadialGradient(P.polo[0], P.polo[1], 0, P.polo[0], P.polo[1], Math.max(1, P.raioIn * 2.2));
        rg.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
        rg.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = rg;
        caminho(ctx, P.pts);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

/** Gotinha de tinta (u), com contorno. */
function gotinha(ctx, x, y, r, cor, esc = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(esc, esc);
  ctx.beginPath();
  ctx.moveTo(0, r * 1.25);
  ctx.quadraticCurveTo(r * 1.05, -r * 0.1, 0, -r * 0.85);
  ctx.quadraticCurveTo(-r * 1.05, -r * 0.1, 0, r * 1.25);
  ctx.closePath();
  ctx.fillStyle = cor;
  ctx.fill();
  ctx.lineWidth = r * 0.16;
  ctx.strokeStyle = 'rgba(23, 22, 28, 0.55)';
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.28, -r * 0.05, r * 0.14, r * 0.24, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------------ por cima do slime

/**
 * Brilho das acesas, veu das apagadas, chumbo, moldura de pedra, peca escolhida, jorro e dica.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../camera.js').Camera} cam
 * @param {number} dpr @param {number} t @param {any} vis @param {any} m
 */
export function desenharTopo(ctx, cam, dpr, t, vis, m) {
  void m;
  const V = vis.vitral;
  ctx.save();
  aplicar(ctx, cam, dpr);
  const pronto = V.pronto >= 0 ? Math.min(1, V.pronto / 0.6) : 0;
  for (const P of V.pecas) {
    if (P.estado !== 'cheia') continue;
    ctx.save();
    caminho(ctx, P.pts);
    ctx.clip();
    if (P.acesa) {
      // luz atravessando o vidro: o miolo claro, o clarao ao acender e um brilho que passa devagar
      const rg = ctx.createRadialGradient(P.polo[0] - 0.3, P.polo[1] + 0.4, 0, P.polo[0], P.polo[1], Math.max(1.2, P.raioIn * 2));
      rg.addColorStop(0, 'rgba(255, 255, 245, 0.24)');
      rg.addColorStop(1, 'rgba(255, 255, 245, 0)');
      ctx.fillStyle = rg;
      ctx.fill();
      const k = V.tempo - P.tLuz;
      if (k >= 0 && k < 1.2) {
        ctx.fillStyle = `rgba(255, 255, 255, ${(0.6 * (1 - k / 1.2)).toFixed(3)})`;
        ctx.fill();
      }
      const fase = ((t * 0.18 + P.k * 0.37) % 1.4) - 0.2;
      const x0 = V.cx - V.R + fase * V.R * 2.6;
      const lg = ctx.createLinearGradient(x0 - 1.2, V.cy + 1, x0 + 1.2, V.cy - 1);
      lg.addColorStop(0, 'rgba(255, 255, 255, 0)');
      lg.addColorStop(0.5, `rgba(255, 255, 255, ${(0.22 + 0.1 * pronto).toFixed(3)})`);
      lg.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = lg;
      ctx.fillRect(V.cx - V.R - 1, V.cy - V.R - 1, V.R * 2 + 2, V.R * 2 + 2);
      if (pronto > 0) {
        ctx.fillStyle = `rgba(255, 244, 200, ${(0.14 * pronto * (0.5 + 0.5 * Math.sin(t * 4 + P.k * 1.7))).toFixed(3)})`;
        ctx.fillRect(V.cx - V.R - 1, V.cy - V.R - 1, V.R * 2 + 2, V.R * 2 + 2);
      }
    } else {
      // apagada: um veu cinza (sem luz)
      ctx.fillStyle = 'rgba(70, 68, 86, 0.34)';
      ctx.fill();
    }
    ctx.restore();
    // estrelinhas piscando nas acesas
    if (P.acesa && P.amostras.length) {
      const nA = P.amostras.length / 2;
      for (let j = 0; j < 3; j++) {
        const q = Math.floor(h(P.k * 7 + j * 13 + V.v * 3) * nA);
        const brilho = Math.max(0, Math.sin(t * (1.6 + j * 0.4) + P.k * 2 + j * 2.1));
        if (brilho < 0.15) continue;
        estrelinha(ctx, P.amostras[2 * q], P.amostras[2 * q + 1], 0.09 + 0.16 * brilho, brilho);
      }
    }
  }
  // chumbo: linhas escuras grossas com um brilho no meio e as soldas nos nos
  const A = arestas(V);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (const [x0, y0, x1, y1] of A.lista) { ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); }
  ctx.strokeStyle = TINTA;
  ctx.lineWidth = 0.56;
  ctx.stroke();
  ctx.strokeStyle = CHUMBO;
  ctx.lineWidth = 0.44;
  ctx.stroke();
  ctx.save();
  ctx.translate(-0.05, 0.05);
  ctx.strokeStyle = 'rgba(190, 186, 205, 0.55)';
  ctx.lineWidth = 0.09;
  ctx.stroke();
  ctx.restore();
  for (const [x, y] of A.nos) {
    ctx.fillStyle = CHUMBO;
    ctx.strokeStyle = TINTA;
    ctx.lineWidth = 0.06;
    ctx.beginPath();
    ctx.arc(x, y, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(200, 196, 215, 0.6)';
    ctx.beginPath();
    ctx.arc(x - 0.08, y + 0.08, 0.09, 0, Math.PI * 2);
    ctx.fill();
  }
  // a peca escolhida: contorno dourado andando
  const S = V.pecas[V.sel];
  if (S && V.pronto < 0) {
    ctx.save();
    caminho(ctx, S.pts);
    ctx.setLineDash([0.34, 0.22]);
    ctx.lineDashOffset = -t * 0.9;
    ctx.lineWidth = 0.2;
    ctx.strokeStyle = '#fff6c2';
    ctx.stroke();
    ctx.lineDashOffset = -t * 0.9 + 0.28;
    ctx.setLineDash([0.06, 0.5]);
    ctx.strokeStyle = '#ffb400';
    ctx.lineWidth = 0.2;
    ctx.stroke();
    ctx.restore();
  }
  moldura(ctx, V, pronto);
  if (pronto > 0) {
    // a moldura brilha
    ctx.save();
    ctx.strokeStyle = `rgba(255, 220, 110, ${(0.55 * pronto * (0.75 + 0.25 * Math.sin(t * 5))).toFixed(3)})`;
    ctx.lineWidth = 0.35;
    ctx.beginPath();
    ctx.arc(V.cx, V.cy, V.R + 0.95, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (vis.jorro) jorro(ctx, vis.jorro);
  ctx.restore();
  if (vis.festa) faixa(ctx, cam, dpr, V, vis.festa);
  if (vis.teclas) teclasNosBicos(ctx, cam, dpr, vis.bicos);
  if (vis.dica) balao(ctx, cam, dpr, vis.dica, t);
}

/** Estrelinha de quatro pontas (u), branca. */
function estrelinha(ctx, x, y, r, a) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.fill();
  ctx.restore();
}

/** Moldura de pedra em volta do vidro: aduelas, pedra-chave e a luz de cima. */
function moldura(ctx, V, pronto) {
  const r0 = V.R - 0.24;
  const r1 = V.R + 0.75;
  ctx.save();
  ctx.beginPath();
  ctx.arc(V.cx, V.cy, r1, 0, Math.PI * 2);
  ctx.arc(V.cx, V.cy, r0, 0, Math.PI * 2, true);
  const g = ctx.createLinearGradient(V.cx - r1, V.cy + r1, V.cx + r1, V.cy - r1);
  g.addColorStop(0, PEDRA_ESC);
  g.addColorStop(0.55, PEDRA);
  g.addColorStop(1, '#efe7d8');
  ctx.fillStyle = g;
  ctx.fill('evenodd');
  // aduelas
  ctx.strokeStyle = 'rgba(90, 70, 50, 0.45)';
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2 + Math.PI / 24;
    ctx.moveTo(V.cx + Math.cos(a) * r0, V.cy + Math.sin(a) * r0);
    ctx.lineTo(V.cx + Math.cos(a) * r1, V.cy + Math.sin(a) * r1);
  }
  ctx.stroke();
  // pedra-chave no alto
  const a0 = Math.PI / 2 - 0.12;
  const a1 = Math.PI / 2 + 0.12;
  ctx.beginPath();
  ctx.moveTo(V.cx + Math.cos(a0) * r0, V.cy + Math.sin(a0) * r0);
  ctx.lineTo(V.cx + Math.cos(a0 - 0.03) * (r1 + 0.3), V.cy + Math.sin(a0 - 0.03) * (r1 + 0.3));
  ctx.lineTo(V.cx + Math.cos(a1 + 0.03) * (r1 + 0.3), V.cy + Math.sin(a1 + 0.03) * (r1 + 0.3));
  ctx.lineTo(V.cx + Math.cos(a1) * r0, V.cy + Math.sin(a1) * r0);
  ctx.closePath();
  ctx.fillStyle = pronto > 0 ? `rgb(${Math.round(232 + 20 * pronto)}, ${Math.round(220 + 5 * pronto)}, ${Math.round(196 - 60 * pronto)})` : '#e8dcc4';
  ctx.fill();
  ctx.strokeStyle = TINTA;
  ctx.lineWidth = 0.08;
  ctx.stroke();
  // contornos de tinta
  ctx.beginPath();
  ctx.arc(V.cx, V.cy, r1, 0, Math.PI * 2);
  ctx.lineWidth = 0.1;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(V.cx, V.cy, r0, 0, Math.PI * 2);
  ctx.lineWidth = 0.09;
  ctx.stroke();
  // reflexo da luz no alto a esquerda da pedra
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 0.1;
  ctx.beginPath();
  ctx.arc(V.cx, V.cy, r1 - 0.2, Math.PI * 0.6, Math.PI * 0.95);
  ctx.stroke();
  ctx.restore();
}

/** Jorro do copo ate a peca: fita de goo que sobe pelo lado e mergulha na peca, com gotinhas. */
function jorro(ctx, J) {
  const lado = J.x1 > 0.6 ? 1 : -1;
  const c1 = [J.x0 + lado * 6.2, J.y0 + 3.2];
  const c2 = [J.x1 + lado * 2.6, J.y1 + 5.2];
  const bez = (s) => {
    const u = 1 - s;
    return [
      u * u * u * J.x0 + 3 * u * u * s * c1[0] + 3 * u * s * s * c2[0] + s * s * s * J.x1,
      u * u * u * J.y0 + 3 * u * u * s * c1[1] + 3 * u * s * s * c2[1] + s * s * s * J.y1,
    ];
  };
  const cabeca = Math.min(1, J.t / 0.35);
  const cauda = J.fim >= 0 ? Math.min(1, (J.t - J.fim) / 0.4) : J.t > 0.6 ? Math.min(0.5, (J.t - 0.6) * 0.7) : 0;
  if (cauda >= cabeca) return;
  const n = 36;
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push(bez(cauda + ((cabeca - cauda) * i) / n));
  // a fita afina da boca do copo para a peca (e toda enquanto o copo ainda escoa)
  const grossa = J.t < 0.6 ? 0.62 : 0.44;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [cor, extra] of [[TINTA, 0.14], [J.cor, 0]]) {
    ctx.strokeStyle = cor;
    for (let i = 0; i < n; i++) {
      const s0 = i / n;
      ctx.lineWidth = grossa * (1 - 0.45 * s0) + extra;
      ctx.beginPath();
      ctx.moveTo(pts[i][0], pts[i][1]);
      ctx.lineTo(pts[i + 1][0], pts[i + 1][1]);
      ctx.stroke();
    }
  }
  caminho(ctx, pts, false);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 0.07;
  ctx.stroke();
  // gotinhas que se soltam da fita
  for (let k = 0; k < 5; k++) {
    const s = cauda + (cabeca - cauda) * (((J.t * 1.3) + k / 5) % 1);
    const [x, y] = bez(s);
    const off = Math.sin(J.t * 7 + k * 2.3) * 0.32;
    ctx.fillStyle = TINTA;
    ctx.beginPath();
    ctx.arc(x + off, y - 0.25, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = J.cor;
    ctx.beginPath();
    ctx.arc(x + off, y - 0.25, 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Faixa de papel com o nome do vitral e as estrelas (px), entrando com um pulo. */
function faixa(ctx, cam, dpr, V, F) {
  const k = Math.min(1, F.t / 0.45);
  const saida = Math.max(0, Math.min(1, (F.dur - F.t) / 0.4));
  const esc = (k < 1 ? 0.6 + 0.55 * k - 0.15 * k * k : 1) * saida;
  if (esc <= 0.01) return;
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const [x, y] = paraTela(cam, V.cx, V.cy - V.R - 0.35);
  ctx.translate(x, y);
  ctx.scale(esc, esc);
  ctx.rotate(-0.03);
  const fs = Math.max(16, Math.min(30, cam.s * 0.78));
  ctx.font = `700 ${Math.round(fs)}px Fredoka, system-ui, sans-serif`;
  const linha1 = F.texto;
  const linha2 = `${F.nome}  ★ ${F.est}`;
  const w = Math.max(ctx.measureText(linha1).width, ctx.measureText(linha2).width) + fs * 2.2;
  const hh = fs * 2.7;
  ctx.fillStyle = '#fffdf6';
  ctx.strokeStyle = TINTA;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-w / 2, -hh / 2);
  ctx.lineTo(w / 2, -hh / 2);
  ctx.lineTo(w / 2 + fs * 0.6, 0);
  ctx.lineTo(w / 2, hh / 2);
  ctx.lineTo(-w / 2, hh / 2);
  ctx.lineTo(-w / 2 - fs * 0.6, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.fillStyle = TINTA;
  ctx.fillText(linha1, 0, -fs * 0.55);
  ctx.font = `700 ${Math.round(fs * 0.85)}px Fredoka, system-ui, sans-serif`;
  ctx.lineWidth = fs * 0.14;
  ctx.strokeStyle = TINTA;
  ctx.strokeText(linha2, 0, fs * 0.62);
  ctx.fillStyle = '#ffd23a';
  ctx.fillText(linha2, 0, fs * 0.62);
  ctx.restore();
}

/** Numero da tecla ao lado de cada bico (desktop). */
function teclasNosBicos(ctx, cam, dpr, bicos) {
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const r = Math.max(8, cam.s * 0.26);
  ctx.font = `700 ${Math.round(r * 1.25)}px Fredoka, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  bicos.forEach((b, k) => {
    const [x, y] = paraTela(cam, b.x + 0.62, b.y + 1.55);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = TINTA;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = TINTA;
    ctx.fillText(String(k + 1), x, y + 1);
  });
  ctx.restore();
}

/** Dica curta num balao de papel (px). */
function balao(ctx, cam, dpr, d, t) {
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const [x, y0] = paraTela(cam, d.x, d.y);
  const y = y0 + Math.sin(t * 2.4) * 2;
  const fs = Math.max(13, Math.min(20, cam.s * 0.52));
  ctx.font = `700 ${Math.round(fs)}px Fredoka, system-ui, sans-serif`;
  const w = ctx.measureText(d.texto).width + fs * 1.4;
  const hh = fs * 1.8;
  ctx.fillStyle = '#fffdf6';
  ctx.strokeStyle = TINTA;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  const r = hh / 2;
  ctx.moveTo(x - w / 2 + r, y - hh / 2);
  ctx.arcTo(x + w / 2, y - hh / 2, x + w / 2, y + hh / 2, r);
  ctx.arcTo(x + w / 2, y + hh / 2, x - w / 2, y + hh / 2, r);
  ctx.arcTo(x - w / 2, y + hh / 2, x - w / 2, y - hh / 2, r);
  ctx.arcTo(x - w / 2, y - hh / 2, x + w / 2, y - hh / 2, r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = TINTA;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(d.texto, x, y + 1);
  ctx.restore();
}

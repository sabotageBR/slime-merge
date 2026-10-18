// Rostos dos slimes (canvas 2D por cima do slime): olhos grandes ancorados na forma do
// slime e deformados pela matriz do shape matching (amassam com o corpo), piscar, olhar
// que segue um alvo e expressoes guiadas pela fisica. Mais o brilho cartum (arco branco).

import { aplicar } from './camera.js';
import { TINTA } from './fundo.js';

/** Limita a deformacao do rosto (alongamento entre 0,75 e 1,3 por eixo). */
function limitar(v, a, b) { return v < a ? a : v > b ? b : v; }

export const OBJETOS = [
  { id: 'classico', nome: 'Clássico' },
  { id: 'kawaii', nome: 'Kawaii' },
  { id: 'bichinhos', nome: 'Bichinhos' },
  { id: 'monstrinhos', nome: 'Monstrinhos' },
  { id: 'chapeus', nome: 'Chapéus por nível' },
  { id: 'boneco', nome: 'Olhos de boneco' },
  { id: 'frutinhas', nome: 'Frutinhas' },
  { id: 'docinho', nome: 'Docinho' },
];

/** Transformacao local -> mundo do slime (deformacao limitada, como no rosto). */
function quadro(s) {
  const R = s.raio0 * 0.9;
  const a11 = limitar(s.a11, 0.75, 1.3);
  const a22 = limitar(s.a22, 0.75, 1.3);
  const a12 = limitar(s.a12, -0.25, 0.25);
  const a21 = limitar(s.a21, -0.25, 0.25);
  return { R, a11, a22, tr: (lx, ly) => [s.cx + a11 * lx + a12 * ly, s.cy + a21 * lx + a22 * ly] };
}

/** Cor do corpo (hex do modo) escurecida ou clareada. */
function tom(hex, f) {
  const n = parseInt((hex || '#888888').slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/**
 * Partes que nascem ATRAS do corpo (orelhas, chifres, folha): no canvas de fundo, antes do
 * slime, para o corpo cobrir a base delas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {any} m
 * @param {import('./camera.js').Camera} cam
 * @param {number} dpr
 * @param {string} estilo
 */
export function desenharAtras(ctx, m, cam, dpr, estilo) {
  if (!['bichinhos', 'monstrinhos', 'frutinhas'].includes(estilo)) return;
  aplicar(ctx, cam, dpr);
  const traco = Math.max(0.04, 1.8 / cam.s);
  for (const s of m.slimes) {
    if (!s.ativo || s.n < 6 || s.dados.semRosto) continue;
    const { R, tr } = quadro(s);
    const cor = s.dados.hex || '#9a9a9a';
    ctx.lineWidth = traco;
    ctx.strokeStyle = TINTA;
    ctx.lineJoin = 'round';
    if (estilo === 'bichinhos') {
      const tipo = (s.nivel || 1) % 3;
      for (const lado of [-1, 1]) {
        ctx.fillStyle = cor;
        ctx.beginPath();
        if (tipo === 1) {
          // gato: triangulos
          const [ax, ay] = tr(lado * 0.72 * R, 0.55 * R);
          const [bx, by] = tr(lado * 0.62 * R, 1.22 * R);
          const [cx, cy] = tr(lado * 0.18 * R, 0.82 * R);
          ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx, cy); ctx.closePath();
        } else if (tipo === 2) {
          // urso: redondas
          const [ex, ey] = tr(lado * 0.6 * R, 0.86 * R);
          ctx.arc(ex, ey, 0.28 * R, 0, Math.PI * 2);
        } else {
          // coelho: compridas
          const [ex, ey] = tr(lado * 0.36 * R, 1.25 * R);
          ctx.ellipse(ex, ey, 0.17 * R, 0.55 * R, lado * -0.25, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.stroke();
        // miolo da orelha
        ctx.fillStyle = tom('#ff9cc2', 0.2);
        ctx.beginPath();
        if (tipo === 1) {
          const [ax, ay] = tr(lado * 0.62 * R, 0.68 * R);
          const [bx, by] = tr(lado * 0.57 * R, 1.08 * R);
          const [cx, cy] = tr(lado * 0.3 * R, 0.86 * R);
          ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx, cy); ctx.closePath();
        } else if (tipo === 2) {
          const [ex, ey] = tr(lado * 0.6 * R, 0.86 * R);
          ctx.arc(ex, ey, 0.14 * R, 0, Math.PI * 2);
        } else {
          const [ex, ey] = tr(lado * 0.36 * R, 1.25 * R);
          ctx.ellipse(ex, ey, 0.08 * R, 0.38 * R, lado * -0.25, 0, Math.PI * 2);
        }
        ctx.fill();
      }
    } else if (estilo === 'monstrinhos') {
      for (const lado of [-1, 1]) {
        const [ax, ay] = tr(lado * 0.5 * R, 0.62 * R);
        const [bx, by] = tr(lado * 0.78 * R, 1.25 * R);
        const [cx, cy] = tr(lado * 0.22 * R, 0.78 * R);
        ctx.fillStyle = '#fff4d6';
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.quadraticCurveTo(...tr(lado * 0.82 * R, 0.82 * R), bx, by);
        ctx.quadraticCurveTo(...tr(lado * 0.42 * R, 1.0 * R), cx, cy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else if (estilo === 'frutinhas') {
      const [bx, by] = tr(0.05 * R, 0.82 * R);
      const [tx2, ty2] = tr(0.12 * R, 1.22 * R);
      ctx.strokeStyle = '#6b4a2a';
      ctx.lineWidth = Math.max(traco * 1.6, 0.08 * R);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(tx2, ty2);
      ctx.stroke();
      const [fx, fy] = tr(0.42 * R, 1.12 * R);
      ctx.fillStyle = '#5cc25a';
      ctx.strokeStyle = TINTA;
      ctx.lineWidth = traco;
      ctx.beginPath();
      ctx.ellipse(fx, fy, 0.34 * R, 0.15 * R, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
}

/** Estado das pupilas soltas (olhos de boneco), por slime. */
const pupilas = new WeakMap();

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {ReturnType<typeof import('../fisica/mundo.js').criarMundo>} m
 * @param {import('./camera.js').Camera} cam
 * @param {number} dpr
 * @param {number} t tempo em s
 * @param {{ olhar?: number[]|null, minN?: number, estilo?: string, expr?: string }} [o]
 *   expr: forca a expressao de todos (prints)
 */
export function desenharRostos(ctx, m, cam, dpr, t, o = {}) {
  aplicar(ctx, cam, dpr);
  const minN = o.minN ?? 6;
  const estilo = o.estilo || 'classico';
  for (const s of m.slimes) {
    if (!s.ativo || s.n < minN || s.dados.semRosto) continue;
    const salva = s.dados.expr;
    if (o.expr) s.dados.expr = o.expr;
    const expr = s.dados.expr || '';
    const choro = expr === 'choro';
    const treme = choro || !!s.dados.treme || expr === 'furioso';
    if (treme) {
      // o rosto treme no berreiro, na raiva e no super slime prestes a estourar (so o desenho)
      ctx.save();
      const amp = choro ? 0.03 : expr === 'furioso' ? 0.012 : 0.02;
      ctx.translate(Math.sin(t * 55 + s.idx) * amp * s.raio0, s.dados.treme ? Math.sin(t * 47) * 0.012 * s.raio0 : 0);
    }
    // cada um olha para o seu: o furioso para quem caiu nele, o apatico para baixo, de lado
    let olhar = o.olhar || null;
    if (expr === 'furioso' && s.dados.bravoDe !== undefined) {
      const b = m.slimes[s.dados.bravoDe];
      if (b && b.ativo) olhar = [b.cx, b.cy];
    } else if (expr === 'apatico') olhar = [s.cx + (s.idx % 2 ? 1 : -1) * 2 * s.raio0, s.cy - 3 * s.raio0];
    // o rosto vermelho da raiva fica atras dos olhos
    if (expr === 'furioso' && estilo !== 'docinho' && s.n >= 10) rubor(ctx, s);
    rosto(ctx, s, t, olhar, cam.s, estilo);
    if (choro) lagrimas(ctx, s, t, cam.s, estilo);
    if (estilo !== 'docinho') extrasHumor(ctx, s, t, cam.s, estilo);
    if (treme) ctx.restore();
    s.dados.expr = salva;
  }
}

/** O rosto de um slime no estilo escolhido. */
function rosto(ctx, s, t, olhar, escala, estilo) {
  if (estilo === 'docinho') { docinho(ctx, s, t); return; }
  if (estilo === 'boneco') { boneco(ctx, s, t, escala); return; }
  if (estilo === 'kawaii') { kawaii(ctx, s, t, escala); return; }
  if (estilo === 'monstrinhos') { monstrinho(ctx, s, t, olhar, escala); return; }
  desenharRosto(ctx, s, t, olhar, escala, estilo === 'frutinhas' ? 0.82 : 1);
  if (estilo === 'chapeus') chapeu(ctx, s, escala);
  if (estilo === 'bichinhos') focinho(ctx, s, escala);
  if (estilo === 'frutinhas') sementes(ctx, s);
}

/**
 * Choro (alvo do missil da mira), comum a todos os estilos: dois rios de lagrimas saindo do
 * canto de baixo dos olhos e gotas que pingam do queixo.
 */
function lagrimas(ctx, s, t, escala, estilo) {
  const { R, tr } = quadro(s);
  const f = estilo === 'frutinhas' ? 0.82 : 1;
  const traco = Math.max(0.035, 1.5 / escala);
  const ciclope = estilo === 'monstrinhos' && (s.nivel || 1) % 2;
  const olhos = ciclope ? [[-0.2, 0.2 - 0.36], [0.2, 0.2 - 0.36]] : [[-0.36 * f, 0.16 - 0.27 * f], [0.36 * f, 0.16 - 0.27 * f]];
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const [lx, ly] of olhos) {
    const lado = lx < 0 ? -1 : 1;
    // rio: desce do canto de fora do olho ate a altura do queixo, alargando
    const pts = [];
    for (let k = 0; k <= 6; k++) {
      const v = k / 6;
      const onda = Math.sin(t * 9 + v * 5 + lado) * 0.025;
      pts.push([(lx + lado * (0.08 + v * 0.12) + onda) * R, (ly - v * 0.62) * R, (0.045 + v * 0.06) * R]);
    }
    ctx.beginPath();
    pts.forEach(([x, y, w], k) => { const [px, py] = tr(x - w, y); if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
    for (let k = pts.length - 1; k >= 0; k--) { const [x, y, w] = pts[k]; const [px, py] = tr(x + w, y); ctx.lineTo(px, py); }
    ctx.closePath();
    ctx.fillStyle = '#7fd3ff';
    ctx.strokeStyle = TINTA;
    ctx.lineWidth = traco;
    ctx.fill();
    ctx.stroke();
    // gotas pingando do fim do rio
    const [x1, y1] = pts[pts.length - 1];
    for (let g = 0; g < 2; g++) {
      const fase = (t * 2.2 + g * 0.5 + (lado > 0 ? 0.25 : 0)) % 1;
      const [gx, gy] = tr(x1 + lado * fase * 0.12 * R, y1 - fase * 0.75 * R);
      const r = 0.075 * R * (1 - fase * 0.4);
      ctx.globalAlpha = 1 - fase;
      ctx.beginPath();
      ctx.arc(gx, gy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

/** Sobrancelhas tristes (a ponta de dentro sobe): choro dos estilos que tem olho aberto. */
function sobrancelhasTristes(ctx, tr, olhos, re, traco) {
  ctx.strokeStyle = TINTA;
  ctx.lineWidth = traco * 1.3;
  ctx.lineCap = 'round';
  for (const [lx, ly] of olhos) {
    const lado = lx < 0 ? -1 : 1;
    const [ax, ay] = tr(lx + lado * re * 0.9, ly + re * 1.05);
    const [bx, by] = tr(lx - lado * re * 0.55, ly + re * 1.5);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }
}

/** Kawaii: olhos pretos com dois brilhos, bochechas rosadas e boquinha w. */
function kawaii(ctx, s, t, escala) {
  const { R, a11, a22, tr } = quadro(s);
  const traco = Math.max(0.04, 1.8 / escala);
  brilhoCartum(ctx, s);
  const ek = s.dados.expr || '';
  // olhos sempre abertos (2026-10-18): sem piscar, sem ^ ^ nem > <
  const choroso = ek === 'choro' || ek === 'chorinho';
  for (const lado of [-1, 1]) {
    const [ex, ey] = tr(lado * 0.34 * R, 0.12 * R);
    const rx = 0.2 * R * a11;
    const ry = 0.26 * R * a22;
    ctx.fillStyle = TINTA;
    ctx.strokeStyle = TINTA;
    ctx.lineWidth = traco * 1.3;
    ctx.beginPath();
    if (ek === 'amassado' || ek === 'medo') {
      // arregalado: o branco aparece e a pupila encolhe
      ctx.fillStyle = '#ffffff';
      ctx.lineWidth = traco;
      ctx.ellipse(ex, ey, rx * 1.05, ry * 1.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = TINTA;
      ctx.beginPath();
      ctx.ellipse(ex, ey - ry * 0.1, rx * 0.45, ry * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex - rx * 0.15, ey + ry * 0.05, rx * 0.14, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // o apatico tem o olho um pouco menor e o brilho caido (olha para baixo, de lado)
      const apat = ek === 'apatico';
      const ryo = ry * (apat ? 0.8 : 1);
      ctx.ellipse(ex, ey, rx, ryo, 0, 0, Math.PI * 2);
      ctx.fill();
      if (choroso) aguaNoOlho(ctx, ex, ey, rx, ryo);
      const grande = choroso || ek === 'feliz' ? 1.25 : 1;
      const dx = apat ? (s.idx % 2 ? 0.25 : -0.25) * rx : 0;
      const dy = apat ? -0.45 * ryo : 0;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex - rx * 0.32 + dx, ey + ryo * 0.35 + dy, rx * 0.36 * grande, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ex + rx * 0.35 + dx, ey - ryo * 0.35 + dy, rx * 0.17 * grande, 0, Math.PI * 2);
      ctx.fill();
      if (apat) olhoDoHumor(ctx, s, ex, ey, rx, ryo, traco);
    }
    // bochecha
    const [bx, by] = tr(lado * 0.56 * R, -0.12 * R);
    ctx.fillStyle = 'rgba(255, 110, 150, 0.45)';
    ctx.beginPath();
    ctx.ellipse(bx, by, 0.15 * R, 0.09 * R, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (s.dados.expr === 'furioso') sobrancelhasBravas(ctx, tr, [[-0.34 * R, 0.12 * R], [0.34 * R, 0.12 * R]], 0.2 * R, traco);
  if (choroso) sobrancelhasTristes(ctx, tr, [[-0.34 * R, 0.12 * R], [0.34 * R, 0.12 * R]], 0.2 * R, traco);
  if (s.n >= 10 && s.dados.expr === 'choro') {
    bocaBerreiro(ctx, tr, R, t, traco, 0.7);
  } else if (s.n >= 10 && bocaDoHumor(ctx, s, tr, R, t, traco, 0.75)) {
    // boca do humor (contente, amassado, apatico, chorinho, furioso)
  } else if (s.n >= 10) {
    const [mx, my] = tr(0, -0.12 * R);
    ctx.strokeStyle = TINTA;
    ctx.lineWidth = traco;
    ctx.beginPath();
    ctx.arc(mx - 0.06 * R, my, 0.06 * R, Math.PI, Math.PI * 2, true);
    ctx.arc(mx + 0.06 * R, my, 0.06 * R, Math.PI, Math.PI * 2, true);
    ctx.stroke();
  }
}

/** Boca aberta do berreiro (tremendo), com a lingua. */
function bocaBerreiro(ctx, tr, R, t, traco, tam = 1) {
  const [bx, by] = tr(0, -0.24 * R);
  const rx = 0.15 * R * tam;
  const ry = 0.11 * R * tam * (1 + 0.18 * Math.sin(t * 24));
  ctx.fillStyle = TINTA;
  ctx.beginPath();
  ctx.ellipse(bx, by, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff7a9a';
  ctx.beginPath();
  ctx.ellipse(bx, by - ry * 0.45, rx * 0.62, ry * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = TINTA;
  ctx.lineWidth = traco;
  ctx.beginPath();
  ctx.ellipse(bx, by, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
}

/** Monstrinho: ciclope nos niveis impares, dois olhos nos pares; sorriso com presas. */
function monstrinho(ctx, s, t, alvo, escala) {
  const { R, a11, a22, tr } = quadro(s);
  const traco = Math.max(0.04, 1.8 / escala);
  brilhoCartum(ctx, s);
  const olhos = (s.nivel || 1) % 2 ? [[0, 0.2, 0.36]] : [[-0.33, 0.18, 0.24], [0.33, 0.18, 0.24]];
  for (const [lx, ly, r0] of olhos) {
    const [ex, ey] = tr(lx * R, ly * R);
    const rx = r0 * R * a11;
    const ry = r0 * R * a22;
    ctx.fillStyle = '#fffbe6';
    ctx.strokeStyle = TINTA;
    ctx.lineWidth = traco;
    ctx.beginPath();
    ctx.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    let dx = 0;
    let dy = -0.5;
    if (alvo) {
      dx = alvo[0] - ex;
      dy = alvo[1] - ey;
      const l = Math.hypot(dx, dy) || 1;
      dx /= l;
      dy /= l;
    }
    const pr = rx * 0.42;
    ctx.fillStyle = '#7a2bd6';
    ctx.beginPath();
    ctx.arc(ex + dx * rx * 0.4, ey + dy * ry * 0.4, pr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = TINTA;
    ctx.beginPath();
    ctx.ellipse(ex + dx * rx * 0.4, ey + dy * ry * 0.4, pr * 0.35, pr * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    olhoDoHumor(ctx, s, ex, ey, rx, ry, traco);
  }
  const ex0 = s.dados.expr || '';
  if (ex0 === 'choro' || ex0 === 'chorinho') {
    sobrancelhasTristes(ctx, (x, y) => tr(x * R, y * R), olhos.map(([lx, ly]) => [lx, ly]), olhos[0][2] * 0.9, traco);
    if (s.n >= 10 && ex0 === 'choro') bocaBerreiro(ctx, tr, R, t, traco, 1.1);
    else if (s.n >= 10) bocaDoHumor(ctx, s, tr, R, t, traco, 1.1);
    return;
  }
  if (ex0 === 'furioso') sobrancelhasBravas(ctx, (x, y) => tr(x * R, y * R), olhos.map(([lx, ly]) => [lx, ly]), olhos[0][2] * 0.9, traco);
  if (s.n >= 10 && (ex0 === 'apatico' || ex0 === 'furioso') && bocaDoHumor(ctx, s, tr, R, t, traco, 1.1)) return;
  if (s.n >= 10) {
    const [m0x, m0y] = tr(-0.32 * R, -0.2 * R);
    const [m1x, m1y] = tr(0.32 * R, -0.2 * R);
    const [mcx, mcy] = tr(0, -0.42 * R);
    ctx.fillStyle = TINTA;
    ctx.beginPath();
    ctx.moveTo(m0x, m0y);
    ctx.quadraticCurveTo(mcx, mcy, m1x, m1y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    for (const f of [0.28, 0.72]) {
      const x = m0x + (m1x - m0x) * f;
      const y = m0y + (m1y - m0y) * f;
      ctx.beginPath();
      ctx.moveTo(x - 0.05 * R, y);
      ctx.lineTo(x + 0.05 * R, y);
      ctx.lineTo(x, y - 0.11 * R);
      ctx.closePath();
      ctx.fill();
    }
  }
}

/** Olhos de boneco: brancos grandes com pupila solta que cai e balanca com o movimento. */
function boneco(ctx, s, t, escala) {
  const { R, a11, a22, tr } = quadro(s);
  const traco = Math.max(0.04, 1.8 / escala);
  brilhoCartum(ctx, s);
  let st = pupilas.get(s);
  if (!st) { st = { t, p: [[0, -0.6], [0, -0.6]], v: [[0, 0], [0, 0]] }; pupilas.set(s, st); }
  const dt = Math.min(0.05, Math.max(0, t - st.t));
  st.t = t;
  [-1, 1].forEach((lado, k) => {
    const [ex, ey] = tr(lado * 0.34 * R, 0.16 * R);
    const rx = 0.29 * R * a11;
    const ry = 0.3 * R * a22;
    // mola: a pupila "cai" para baixo e e jogada contra o movimento do slime
    const p = st.p[k];
    const v = st.v[k];
    const ax = (-s.vx * 0.06 - p[0]) * 60 - v[0] * 6;
    const ay = (-0.7 - s.vy * 0.06 - p[1]) * 60 - v[1] * 6;
    v[0] += ax * dt;
    v[1] += ay * dt;
    p[0] += v[0] * dt;
    p[1] += v[1] * dt;
    const l = Math.hypot(p[0], p[1]);
    if (l > 0.6) { p[0] *= 0.6 / l; p[1] *= 0.6 / l; }
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = TINTA;
    ctx.lineWidth = traco * 1.2;
    ctx.beginPath();
    ctx.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = TINTA;
    ctx.beginPath();
    ctx.arc(ex + p[0] * rx * 0.75, ey + p[1] * ry * 0.75, rx * 0.4, 0, Math.PI * 2);
    ctx.fill();
    olhoDoHumor(ctx, s, ex, ey, rx, ry, traco);
  });
  const eb = s.dados.expr || '';
  if (eb === 'choro' || eb === 'chorinho') {
    sobrancelhasTristes(ctx, (x, y) => tr(x * R, y * R), [[-0.34, 0.16], [0.34, 0.16]], 0.27, traco);
    if (s.n >= 10 && eb === 'choro') bocaBerreiro(ctx, tr, R, t, traco, 0.8);
    else if (s.n >= 10) bocaDoHumor(ctx, s, tr, R, t, traco, 0.9);
    return;
  }
  if (eb === 'furioso') sobrancelhasBravas(ctx, (x, y) => tr(x * R, y * R), [[-0.34, 0.16], [0.34, 0.16]], 0.27, traco);
  if (s.n >= 10 && bocaDoHumor(ctx, s, tr, R, t, traco, 0.9)) return;
  if (s.n >= 10) {
    const [bx, by] = tr(0, -0.22 * R);
    ctx.strokeStyle = TINTA;
    ctx.lineWidth = traco;
    ctx.beginPath();
    ctx.ellipse(bx, by, 0.06 * R, 0.07 * R, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/** Docinho: sem rosto; brilho grande de bala e cristais de acucar. */
function docinho(ctx, s, t) {
  const { R, tr } = quadro(s);
  const [hx, hy] = tr(-0.32 * R, 0.36 * R);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineCap = 'round';
  ctx.lineWidth = 0.16 * R;
  ctx.beginPath();
  ctx.arc(hx, hy, 0.38 * R, Math.PI * 0.55, Math.PI * 1.05);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  for (let k = 0; k < 7; k++) {
    const a = k * 2.4 + s.idx;
    const r = 0.2 + ((k * 0.37) % 0.6);
    const [x, y] = tr(Math.cos(a) * r * R, Math.sin(a) * r * R);
    const pisca = 0.5 + 0.5 * Math.sin(t * 3 + k + s.idx);
    ctx.globalAlpha = 0.4 + 0.6 * pisca;
    ctx.fillRect(x - 0.03 * R, y - 0.03 * R, 0.06 * R, 0.06 * R);
  }
  ctx.globalAlpha = 1;
}

/** Nariz e bigode dos bichinhos (por cima). */
function focinho(ctx, s, escala) {
  const { R, tr } = quadro(s);
  const traco = Math.max(0.04, 1.5 / escala);
  const [nx, ny] = tr(0, -0.06 * R);
  ctx.fillStyle = '#ff7aa8';
  ctx.strokeStyle = TINTA;
  ctx.lineWidth = traco;
  ctx.beginPath();
  ctx.ellipse(nx, ny, 0.07 * R, 0.05 * R, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if ((s.nivel || 1) % 3 === 1) {
    for (const lado of [-1, 1]) {
      for (const dy of [0.02, -0.06]) {
        const [ax, ay] = tr(lado * 0.2 * R, (dy - 0.06) * R);
        const [bx, by] = tr(lado * 0.52 * R, (dy * 1.8 - 0.06) * R);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }
    }
  }
}

/** Sementinhas das frutinhas. */
function sementes(ctx, s) {
  const { R, tr } = quadro(s);
  ctx.fillStyle = 'rgba(40, 30, 20, 0.45)';
  for (let k = 0; k < 9; k++) {
    const a = k * 2.39 + 0.7;
    const r = 0.45 + ((k * 0.29) % 0.35);
    const [x, y] = tr(Math.cos(a) * r * R, Math.sin(a) * r * R - 0.1 * R);
    ctx.beginPath();
    ctx.ellipse(x, y, 0.035 * R, 0.06 * R, a, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Chapeu por nivel (a evolucao aparece no proprio slime). */
function chapeu(ctx, s, escala) {
  const { R, a11, tr } = quadro(s);
  const traco = Math.max(0.04, 1.8 / escala);
  const k = s.dados.prisma ? 'prisma' : s.nivel || 1;
  const [tx, ty] = tr(0, 0.86 * R);
  const w = 0.5 * R * a11;
  ctx.lineWidth = traco;
  ctx.strokeStyle = TINTA;
  ctx.lineJoin = 'round';
  const poli = (pts, cor) => {
    ctx.fillStyle = cor;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(tx + x * w, ty + y * w) : ctx.moveTo(tx + x * w, ty + y * w)));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };
  const bola = (x, y, r, cor) => {
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.arc(tx + x * w, ty + y * w, r * w, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  };
  switch (k) {
    case 2: poli([[0, 0.1], [-0.55, 0.4], [-0.55, -0.15]], '#ff6fa8'); poli([[0, 0.1], [0.55, 0.4], [0.55, -0.15]], '#ff6fa8'); bola(0, 0.12, 0.13, '#ff3d8b'); break;
    case 3: poli([[-0.7, -0.05], [0.7, -0.05], [0.65, 0.45], [0, 0.62], [-0.65, 0.45]], '#3b8cf0'); poli([[0.4, -0.05], [1.35, -0.12], [1.3, 0.05], [0.4, 0.08]], '#2a62d6'); break;
    case 4: for (let p = 0; p < 5; p++) { const a = (p / 5) * Math.PI * 2; bola(0.55 + Math.cos(a) * 0.22, 0.15 + Math.sin(a) * 0.22, 0.17, '#ffffff'); } bola(0.55, 0.15, 0.13, '#ffd23a'); break;
    case 5: poli([[-0.72, -0.05], [0.72, -0.05], [0.6, 0.55], [0, 0.78], [-0.6, 0.55]], '#ef3e4f'); poli([[-0.75, -0.1], [0.75, -0.1], [0.75, 0.1], [-0.75, 0.1]], '#ffffff'); bola(0, 0.85, 0.16, '#ffffff'); break;
    case 6: {
      // oculos escuros sobre os olhos
      for (const lado of [-1, 1]) {
        const [ex, ey] = tr(lado * 0.36 * R, 0.16 * R);
        ctx.fillStyle = TINTA;
        ctx.beginPath();
        ctx.ellipse(ex, ey, 0.27 * R * a11, 0.2 * R, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillRect(ex - 0.15 * R, ey + 0.04 * R, 0.1 * R, 0.04 * R);
      }
      const [a0x, a0y] = tr(-0.1 * R, 0.18 * R);
      const [a1x, a1y] = tr(0.1 * R, 0.18 * R);
      ctx.lineWidth = traco * 1.6;
      ctx.beginPath();
      ctx.moveTo(a0x, a0y);
      ctx.lineTo(a1x, a1y);
      ctx.stroke();
      break;
    }
    case 7: poli([[-0.9, -0.05], [0.9, -0.05], [0.9, 0.12], [-0.9, 0.12]], '#222233'); poli([[-0.5, 0.1], [0.5, 0.1], [0.5, 1.0], [-0.5, 1.0]], '#222233'); poli([[-0.5, 0.18], [0.5, 0.18], [0.5, 0.32], [-0.5, 0.32]], '#ef3e4f'); break;
    case 8: for (let p = 0; p < 7; p++) bola(-0.75 + p * 0.25, 0.08 + Math.sin(p) * 0.05, 0.16, ['#ff8ac0', '#ffd23a', '#ffffff', '#b38bff'][p % 4]); break;
    case 9: poli([[-1.0, 0.0], [1.0, 0.0], [0.7, 0.55], [0, 0.4], [-0.7, 0.55]], '#2a2a33'); bola(0, 0.28, 0.1, '#ffffff'); break;
    case 10: poli([[-0.85, -0.05], [0.85, -0.05], [0.1, 1.5], [0.35, 1.15], [-0.05, 1.3]], '#4b3fd6'); bola(0.15, 0.55, 0.07, '#ffd23a'); bola(-0.2, 0.3, 0.05, '#ffd23a'); break;
    case 11: poli([[-0.6, 0], [-0.45, 0.35], [-0.2, 0.15], [0, 0.5], [0.2, 0.15], [0.45, 0.35], [0.6, 0]], '#d9e6ff'); bola(0, 0.36, 0.08, '#6fd3ff'); break;
    case 12: poli([[-0.7, -0.05], [0.7, -0.05], [0.75, 0.6], [0.38, 0.3], [0, 0.72], [-0.38, 0.3], [-0.75, 0.6]], '#ffcf2e'); bola(0, 0.18, 0.09, '#ef3e4f'); bola(-0.42, 0.12, 0.06, '#3b8cf0'); bola(0.42, 0.12, 0.06, '#3b8cf0'); break;
    case 13: {
      // aureola dourada flutuando acima da cabeca
      const [hx, hy] = [tx, ty + 0.62 * w];
      for (const [larg, cor] of [[0.26 * w + traco * 2, TINTA], [0.26 * w, '#ffd23a']]) {
        ctx.lineWidth = larg;
        ctx.strokeStyle = cor;
        ctx.beginPath();
        ctx.ellipse(hx, hy, 0.62 * w, 0.2 * w, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case 14:
      // coroa (o 14, 2026-10-18)
      poli([[-0.6, 0], [0.6, 0], [0.72, 0.8], [0.34, 0.42], [0, 0.9], [-0.34, 0.42], [-0.72, 0.8]], '#ffd23a');
      bola(0, 0.92, 0.11, '#ff4d6d');
      bola(-0.72, 0.82, 0.08, '#5fd9ff');
      bola(0.72, 0.82, 0.08, '#5fd9ff');
      break;
    case 'prisma': poli([[-0.5, -0.05], [0.5, -0.05], [0, 1.1]], '#7fe36b'); bola(0, 1.12, 0.12, '#ff6fa8'); break;
    default: break;
  }
}

/** O arco branco do brilho cartum (o mesmo do rosto classico). */
function brilhoCartum(ctx, s) {
  const { R, a11, a22, tr } = quadro(s);
  const [hx, hy] = tr(-0.42 * R, 0.42 * R);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(0.05, 0.11 * R);
  ctx.beginPath();
  ctx.ellipse(hx, hy, 0.2 * R * a11, 0.2 * R * a22, 0, Math.PI * 0.5, Math.PI * 1.0);
  ctx.stroke();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../fisica/mundo.js').Slime} s
 * @param {number} t
 * @param {number[]|null} alvo
 * @param {number} escala px por u (traco minimo legivel)
 */
function desenharRosto(ctx, s, t, alvo, escala, fator = 1) {
  const R = s.raio0 * 0.9 * fator;
  const a11 = limitar(s.a11, 0.75, 1.3);
  const a22 = limitar(s.a22, 0.75, 1.3);
  const a12 = limitar(s.a12, -0.25, 0.25);
  const a21 = limitar(s.a21, -0.25, 0.25);
  const tr = (lx, ly) => [s.cx + a11 * lx + a12 * ly, s.cy + a21 * lx + a22 * ly];
  const traco = Math.max(0.04, 1.8 / escala);

  // brilho cartum (arco branco no alto a esquerda)
  const [hx, hy] = tr(-0.42 * R, 0.42 * R);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(0.05, 0.11 * R);
  ctx.beginPath();
  ctx.ellipse(hx, hy, 0.2 * R * a11, 0.2 * R * a22, 0, Math.PI * 0.5, Math.PI * 1.0);
  ctx.stroke();

  const expr = s.dados.expr || '';
  const re = Math.max(0.13, 0.27 * R);
  // olhos sempre abertos (pedido do usuario em 2026-10-18: nenhuma animacao de olho fechado, nem
  // piscar): a expressao vem da pupila, do brilho, da agua no olho, da sobrancelha e da boca
  const choroso = expr === 'choro' || expr === 'chorinho';
  const arregala = expr === 'medo' || expr === 'amassado';
  for (const lado of [-1, 1]) {
    const [ex, ey] = tr(lado * 0.36 * R, 0.16 * R);
    const rx = re * a11 * (arregala ? 1.15 : 1);
    const ry = re * a22 * (arregala ? 1.2 : 1.08);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = TINTA;
    ctx.lineWidth = traco;
    ctx.beginPath();
    ctx.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    if (choroso) aguaNoOlho(ctx, ex, ey, rx, ry);
    ctx.beginPath();
    ctx.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    const furioso = expr === 'furioso';
    // pupila olhando para o alvo (ou para baixo; o feliz olha para cima)
    let lx = 0;
    let ly = expr === 'feliz' ? 0.45 : -0.6;
    if (alvo) {
      lx = alvo[0] - ex;
      ly = alvo[1] - ey;
      const l = Math.hypot(lx, ly) || 1;
      lx /= l;
      ly /= l;
    }
    const pr = rx * (arregala || furioso ? 0.38 : choroso || expr === 'feliz' ? 0.62 : 0.56);
    const off = Math.min(rx, ry) - pr - traco * 0.3;
    const pxp = ex + lx * off * 0.9;
    const pyp = ey + ly * off * 0.9;
    ctx.fillStyle = TINTA;
    ctx.beginPath();
    if (expr === 'tonto') {
      ctx.lineWidth = traco * 0.9;
      ctx.strokeStyle = TINTA;
      for (let a = 0; a < 9; a++) {
        const ang = a * 0.9 + t * 9 * lado;
        const rr = pr * (0.25 + a * 0.09);
        if (a === 0) ctx.moveTo(ex + Math.cos(ang) * rr, ey + Math.sin(ang) * rr);
        else ctx.lineTo(ex + Math.cos(ang) * rr, ey + Math.sin(ang) * rr);
      }
      ctx.stroke();
    } else {
      ctx.ellipse(pxp, pyp, pr, pr * (ry / rx), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(pxp - pr * 0.3, pyp + pr * 0.32, pr * 0.28, 0, Math.PI * 2);
      ctx.fill();
      // o segundo brilho: olho brilhando (feliz) ou marejado (choro)
      if (choroso || expr === 'feliz') {
        ctx.beginPath();
        ctx.arc(pxp + pr * 0.35, pyp - pr * 0.3, pr * 0.16, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    olhoDoHumor(ctx, s, ex, ey, rx, ry, traco);
  }
  // sobrancelha triste do choro
  if (choroso) sobrancelhasTristes(ctx, tr, [[-0.36 * R, 0.16 * R], [0.36 * R, 0.16 * R]], re, traco);
  // sobrancelhas de quem levou a pancada (mais grossas e mais em V que as da lama)
  if (expr === 'furioso') sobrancelhasBravas(ctx, tr, [[-0.36 * R, 0.16 * R], [0.36 * R, 0.16 * R]], re, traco);
  // sobrancelhas da lama ranzinza
  if (expr === 'bravo') {
    ctx.strokeStyle = TINTA;
    ctx.lineWidth = traco * 1.3;
    for (const lado of [-1, 1]) {
      const [ex, ey] = tr(lado * 0.36 * R, 0.16 * R);
      ctx.beginPath();
      ctx.moveTo(ex - lado * re * 1.0, ey + re * 1.35);
      ctx.lineTo(ex + lado * re * 0.6, ey + re * 0.95);
      ctx.stroke();
    }
  }
  // boca
  if (s.n >= 10 && expr === 'choro') {
    bocaBerreiro(ctx, tr, R, t, traco);
  } else if (s.n >= 10 && bocaDoHumor(ctx, s, tr, R, t, traco, 1)) {
    // boca do humor (contente, amassado, apatico, chorinho, furioso)
  } else if (s.n >= 10) {
    const [bx, by] = tr(0, -0.17 * R);
    ctx.strokeStyle = TINTA;
    ctx.lineWidth = traco;
    ctx.beginPath();
    if (expr === 'medo') ctx.ellipse(bx, by - 0.04 * R, 0.07 * R, 0.09 * R, 0, 0, Math.PI * 2);
    else if (expr === 'bravo') ctx.arc(bx, by - 0.08 * R, 0.1 * R, Math.PI * 0.15, Math.PI * 0.85);
    else if (expr === 'feliz') ctx.arc(bx, by + 0.05 * R, 0.13 * R, Math.PI * 1.1, Math.PI * 1.9);
    else ctx.arc(bx, by + 0.07 * R, 0.08 * R, Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------- humor (src/jogo/humor.js)

/**
 * Apatico de olho aberto (2026-10-18: nenhuma palpebra fechando): a olheira embaixo do olho; o
 * olhar cai para baixo, de lado (o `olhar` de desenharRostos).
 * @param {CanvasRenderingContext2D} ctx @param {any} s
 * @param {number} ex @param {number} ey @param {number} rx @param {number} ry @param {number} traco
 */
function olhoDoHumor(ctx, s, ex, ey, rx, ry, traco) {
  if (s.dados.expr !== 'apatico') return;
  ctx.strokeStyle = tom(s.dados.hex || '#888888', -0.3);
  ctx.globalAlpha = 0.75;
  ctx.lineCap = 'round';
  ctx.lineWidth = traco * 1.1;
  ctx.beginPath();
  ctx.ellipse(ex, ey - ry * 0.2, rx * 0.95, ry * 1.05, 0, Math.PI * 1.2, Math.PI * 1.8);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/**
 * Olho marejado (o choro de olho aberto): a agua enche a metade de baixo do olho.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} ex @param {number} ey @param {number} rx @param {number} ry
 */
function aguaNoOlho(ctx, ex, ey, rx, ry) {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = 'rgba(127, 211, 255, 0.85)';
  ctx.beginPath();
  ctx.ellipse(ex, ey - ry * 0.95, rx * 1.1, ry * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Sobrancelhas da raiva: grossas, em V (a ponta de dentro desce). */
function sobrancelhasBravas(ctx, tr, olhos, re, traco) {
  ctx.strokeStyle = TINTA;
  ctx.lineWidth = traco * 2;
  ctx.lineCap = 'round';
  for (const [lx, ly] of olhos) {
    const lado = lx < 0 ? -1 : 1;
    const [ax, ay] = tr(lx + lado * re * 1.05, ly + re * 1.5);
    const [bx, by] = tr(lx - lado * re * 0.6, ly + re * 0.88);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }
}

/**
 * Boca dos humores novos; false quando o humor nao tem boca propria (fica a do estilo).
 * @param {CanvasRenderingContext2D} ctx @param {any} s @param {(x: number, y: number) => number[]} tr
 * @param {number} R @param {number} t @param {number} traco @param {number} tam
 */
function bocaDoHumor(ctx, s, tr, R, t, traco, tam) {
  const expr = s.dados.expr || '';
  ctx.strokeStyle = TINTA;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (expr === 'contente') {
    // sorriso aberto (D deitado) com a lingua
    const [ax, ay] = tr(-0.17 * R * tam, -0.12 * R);
    const [bx, by] = tr(0.17 * R * tam, -0.12 * R);
    const [cx, cy] = tr(0, -0.44 * R);
    ctx.fillStyle = TINTA;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo(cx, cy, bx, by);
    ctx.closePath();
    ctx.fill();
    const [lx, ly] = tr(0, -0.24 * R);
    ctx.fillStyle = '#ff7a9a';
    ctx.beginPath();
    ctx.ellipse(lx, ly, 0.075 * R * tam, 0.04 * R, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = traco;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo(cx, cy, bx, by);
    ctx.closePath();
    ctx.stroke();
    return true;
  }
  if (expr === 'amassado') {
    // boca torta do aperto (zigue-zague)
    ctx.lineWidth = traco * 1.1;
    ctx.beginPath();
    for (let k = 0; k <= 4; k++) {
      const [qx, qy] = tr((-0.14 + k * 0.07) * R * tam, (-0.2 + (k % 2 ? 0.035 : -0.035)) * R);
      if (k) ctx.lineTo(qx, qy); else ctx.moveTo(qx, qy);
    }
    ctx.stroke();
    return true;
  }
  if (expr === 'apatico') {
    // boca reta, um pouco torta
    const [ax, ay] = tr(-0.1 * R * tam, -0.2 * R);
    const [bx, by] = tr(0.1 * R * tam, -0.225 * R);
    ctx.lineWidth = traco * 1.1;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
    return true;
  }
  if (expr === 'chorinho') {
    // boquinha triste, tremendo
    const [bx, by] = tr(0, -0.27 * R);
    ctx.lineWidth = traco * 1.1;
    ctx.beginPath();
    ctx.arc(bx + Math.sin(t * 30 + s.idx) * 0.008 * R, by, 0.09 * R * tam, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();
    return true;
  }
  if (expr === 'furioso') {
    // dentes cerrados
    const w = 0.2 * R * tam;
    const h = 0.075 * R;
    const cs = [tr(-w, -0.15 * R), tr(w, -0.15 * R), tr(w, -0.15 * R - 2 * h), tr(-w, -0.15 * R - 2 * h)];
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = traco;
    ctx.beginPath();
    cs.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = traco * 0.7;
    ctx.beginPath();
    const [m0x, m0y] = tr(-w, -0.15 * R - h);
    const [m1x, m1y] = tr(w, -0.15 * R - h);
    ctx.moveTo(m0x, m0y);
    ctx.lineTo(m1x, m1y);
    for (const f of [-0.5, 0, 0.5]) {
      const [ux, uy] = tr(f * w, -0.15 * R);
      const [vx, vy] = tr(f * w, -0.15 * R - 2 * h);
      ctx.moveTo(ux, uy);
      ctx.lineTo(vx, vy);
    }
    ctx.stroke();
    return true;
  }
  return false;
}

/** Rosto vermelho da raiva (atras dos olhos). @param {CanvasRenderingContext2D} ctx @param {any} s */
function rubor(ctx, s) {
  const { R, tr } = quadro(s);
  const [fx, fy] = tr(0, 0.1 * R);
  const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, 0.8 * R);
  g.addColorStop(0, 'rgba(255, 60, 40, 0.34)');
  g.addColorStop(1, 'rgba(255, 60, 40, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(fx, fy, 0.8 * R, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * O que todo estilo com rosto ganha no humor: bochechas no contente, lagrimas pequenas no
 * chorinho, e no furioso a veia e a fumacinha.
 * @param {CanvasRenderingContext2D} ctx @param {any} s @param {number} t @param {number} escala @param {string} estilo
 */
function extrasHumor(ctx, s, t, escala, estilo) {
  const expr = s.dados.expr || '';
  if (expr !== 'contente' && expr !== 'chorinho' && expr !== 'furioso') return;
  if (s.n < 10) return;
  const { R, tr } = quadro(s);
  const traco = Math.max(0.035, 1.5 / escala);
  if (expr === 'contente' && estilo !== 'kawaii') {
    ctx.fillStyle = 'rgba(255, 110, 150, 0.4)';
    for (const lado of [-1, 1]) {
      const [bx, by] = tr(lado * 0.58 * R, -0.08 * R);
      ctx.beginPath();
      ctx.ellipse(bx, by, 0.14 * R, 0.08 * R, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  if (expr === 'chorinho') {
    // uma lagrima por olho, que desce devagar e some
    ctx.fillStyle = '#7fd3ff';
    ctx.strokeStyle = TINTA;
    ctx.lineWidth = traco;
    for (const lado of [-1, 1]) {
      const fase = (t * 0.9 + (lado > 0 ? 0.5 : 0) + s.idx * 0.13) % 1;
      const [gx, gy] = tr(lado * 0.5 * R, (0.05 - fase * 0.45) * R);
      const r = 0.06 * R;
      ctx.globalAlpha = Math.min(1, (1 - fase) * 2);
      ctx.beginPath();
      ctx.moveTo(gx, gy + r * 1.9);
      ctx.quadraticCurveTo(gx + r * 1.1, gy + r * 0.2, gx, gy - r);
      ctx.quadraticCurveTo(gx - r * 1.1, gy + r * 0.2, gx, gy + r * 1.9);
      ctx.fill();
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    return;
  }
  // furioso: veia na testa e fumacinha subindo (o rosto vermelho vem antes, em `rubor`)
  const [vx, vy] = tr(0.5 * R, 0.62 * R);
  const v = 0.1 * R * (1 + 0.12 * Math.sin(t * 16));
  ctx.strokeStyle = '#e8261c';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(traco * 1.4, 0.035 * R);
  // quatro arcos de costas um para o outro (a veia do desenho animado)
  for (const [qx, qy] of [[-1, 1], [1, 1], [1, -1], [-1, -1]]) {
    ctx.beginPath();
    ctx.arc(vx + qx * v, vy + qy * v, v * 0.75, Math.atan2(-qy, -qx) - 0.9, Math.atan2(-qy, -qx) + 0.9);
    ctx.stroke();
  }
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = TINTA;
  ctx.lineWidth = traco * 0.8;
  for (const lado of [-1, 1]) {
    const fase = (t * 1.6 + (lado > 0 ? 0.5 : 0)) % 1;
    const [px, py] = tr(lado * (0.55 + fase * 0.2) * R, (0.75 + fase * 0.55) * R);
    const r = 0.07 * R * (0.6 + fase);
    ctx.globalAlpha = 1 - fase;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

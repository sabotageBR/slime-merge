// Onboarding sem texto: a mao que arrasta e toca (e as teclas desenhadas no desktop), e a
// reticula de mira sobre cada slime quando um reforco espera o alvo (travada no alvo do missil).
// Tambem o selo do combo ao lado do pote e a aura das fusoes em andamento.

import { paraTela } from './camera.js';
import { TINTA } from './fundo.js';
import { desenharIcone } from '../ui/icones.js';
import { COR_COMBO } from '../jogo/soltar.js';

/** Selo do combo: o ultimo N (o pulo quando sobe) e quando sumiu (o fade de 0,4 s). */
const selo = { n: 0, tPulo: -9, tFim: -9, /** @type {any} */ ultimo: null };

/** Momento do ciclo da mao em que ela aperta (a demonstracao do main.js solta a peca nele). */
export const TOQUE_MAO = 1.75;

/**
 * Onde a mao esta no tempo t: vai e volta (0..1,6 s) e toca (1,6..2,4 s).
 * @param {{ x: number, amplitude: number }} m  vis.mao
 * @param {number} t
 */
export function maoEm(m, t) {
  const ciclo = t % 2.4;
  const k = ciclo < 1.6 ? ciclo / 1.6 : 1;
  const ida = k < 0.5 ? k * 2 : 2 - k * 2;
  return { x: m.x + (ida - 0.5) * 2 * m.amplitude, ida, ciclo, apertando: ciclo > TOQUE_MAO && ciclo < 2.05 };
}

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
  if (vis.fusoes && vis.fusoes.length) auras(ctx, cam, vis.fusoes, t);
  combo(ctx, cam, vis.combo || null, t, ctx.canvas.width / dpr, ctx.canvas.height / dpr);
  if (vis.mao) {
    const { x: wx, ida, apertando } = maoEm(vis.mao, t);
    const [sx, sy] = paraTela(cam, wx, vis.mao.y - 0.4);
    mao(ctx, sx, sy + (apertando ? 6 : 0), Math.max(26, cam.s * 1.1));
    if (vis.mao.tecla) teclas(ctx, sx, sy + Math.max(26, cam.s * 1.1) * 1.9, Math.max(18, cam.s * 0.62), ida, apertando);
  }
  if (vis.zonas) zonas(ctx, cam, vis.zonas, t);
  if (vis.calor) calor(ctx, cam, vis.calor, t);
  if (vis.espinhos) espinhos(ctx, cam, vis.espinhos);
  if (vis.bicos) bicos(ctx, cam, vis.bicos, t);
  if (vis.alvo && mundo) {
    // reticula pulsando e girando devagar sobre cada slime do pote que pode ser escolhido
    const cor = COR_ALVO[vis.alvo.id] || COR_ALVO.mira;
    const pulso = 1 + 0.06 * Math.sin(t * 8);
    for (const s of mundo.slimes) {
      if (!s.ativo || s.preso || s.dados.marcado || s.dados.fundindo || (s.dados.pote || 0) !== (vis.alvo.pote || 0)) continue;
      const [sx, sy] = paraTela(cam, s.cx, s.cy);
      const r = Math.max(16, s.raio0 * cam.s * 0.92 * pulso);
      reticula(ctx, sx, sy, r, t * 0.8 + s.idx, cor, 1);
      // nos outros reforcos de alvo, o icone do reforco no canto diz o que vai acontecer
      if (vis.alvo.id !== 'mira') desenharIcone(ctx, vis.alvo.id, sx + r * 0.8, sy - r * 0.8, Math.max(18, r * 0.62), { cor });
    }
  }
  if (vis.missil) {
    // travada no alvo: vermelha, fecha de 1,7r para 1,2r, para de girar e deixa o rosto (o
    // choro) a vista: tracos para fora e sem o ponto do meio
    const M = vis.missil;
    const [sx, sy] = paraTela(cam, M.x, M.y);
    const k = Math.min(1, M.t / M.choro);
    const fecha = 1.7 - 0.5 * (1 - (1 - k) * (1 - k));
    reticula(ctx, sx, sy, Math.max(20, M.r * cam.s * 0.92 * fecha), 0, COR_ALVO.mira, 1.3, true);
  }
}

/**
 * Selo do combo (a partir do x2): disco de papel com "COMBO", o "xN" na cor do degrau e o anel
 * do tempo que esvazia; pula quando o N sobe, pulsa enquanto uma fusao anima (a janela parada) e
 * some em 0,4 s. Ao lado do pote, do lado oposto aos reforcos; sem espaco (retrato), acima da
 * borda esquerda.
 * @param {CanvasRenderingContext2D} ctx @param {import('./camera.js').Camera} cam
 * @param {{ n: number, resto: number, pausa: boolean, borda: number, linha: number }|null} c
 * @param {number} t @param {number} W @param {number} H px CSS
 */
function combo(ctx, cam, c, t, W, H) {
  if (c) {
    if (c.n > selo.n) selo.tPulo = t;
    selo.n = c.n;
    selo.ultimo = c;
    selo.tFim = -9;
  } else if (selo.ultimo) {
    if (selo.tFim < 0) selo.tFim = t;
    if (t - selo.tFim > 0.4 || t < selo.tFim) { selo.ultimo = null; selo.n = 0; return; }
  } else return;
  const C = c || selo.ultimo;
  const R = Math.max(28, Math.min(44, cam.s * 1.45));
  let [sx, sy] = paraTela(cam, C.borda - 0.35, C.linha * 0.55);
  sx -= R;
  if (sx - R < 6) {
    [sx, sy] = paraTela(cam, C.borda, C.linha + 4.6);
    sx += R + 4;
  }
  sx = Math.max(R + 6, Math.min(W - R - 6, sx));
  sy = Math.max(R + 6, Math.min(H - R - 6, sy));
  const kp = (t - selo.tPulo) / 0.3;
  const pulo = kp >= 0 && kp < 1 ? 1 + 0.32 * (1 - kp) * (1 - kp) : 1;
  const cor = COR_COMBO[Math.max(0, Math.min(3, C.n - 2))];
  ctx.save();
  ctx.globalAlpha = c ? 1 : Math.max(0, 1 - (t - selo.tFim) / 0.4);
  ctx.translate(sx, sy);
  ctx.scale(pulo, pulo);
  ctx.rotate(-0.08);
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fillStyle = '#fffdf6';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = TINTA;
  ctx.stroke();
  // anel do tempo: o trilho e o que resta da janela (cheio e pulsando enquanto uma fusao anima)
  const ra = R * 0.8;
  ctx.lineCap = 'round';
  ctx.lineWidth = R * 0.15;
  ctx.strokeStyle = 'rgba(23, 22, 28, 0.12)';
  ctx.beginPath();
  ctx.arc(0, 0, ra, 0, Math.PI * 2);
  ctx.stroke();
  const resto = c ? C.resto : 0;
  if (resto > 0.01) {
    ctx.lineWidth = R * 0.15 * (C.pausa ? 1 + 0.18 * Math.sin(t * 14) : 1);
    ctx.strokeStyle = cor;
    ctx.beginPath();
    ctx.arc(0, 0, ra, -Math.PI / 2, -Math.PI / 2 + resto * Math.PI * 2);
    ctx.stroke();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.font = `700 ${R * 0.25}px Fredoka, system-ui, sans-serif`;
  ctx.fillStyle = TINTA;
  ctx.fillText('COMBO', 0, -R * 0.34);
  ctx.font = `700 ${R * 0.7}px Fredoka, system-ui, sans-serif`;
  ctx.lineWidth = R * 0.14;
  ctx.strokeStyle = TINTA;
  ctx.strokeText('×' + C.n, 0, R * 0.16);
  ctx.fillStyle = cor;
  ctx.fillText('×' + C.n, 0, R * 0.16);
  ctx.restore();
}

/**
 * Aura das fusoes em andamento: um halo em volta do grupo que cresce no abraco (com brilhinhos
 * girando), um anel que abre quando os iguais viram um corpo so, e o vermelho-brasa pulsando do
 * super slime que vai estourar.
 * @param {CanvasRenderingContext2D} ctx @param {import('./camera.js').Camera} cam
 * @param {{ x: number, y: number, r: number, fase: string, p: number }[]} lista
 * @param {number} t
 */
function auras(ctx, cam, lista, t) {
  for (const f of lista) {
    const [sx, sy] = paraTela(cam, f.x, f.y);
    const r = Math.max(10, f.r * cam.s);
    const segura = f.fase === 'segura';
    const rgb = segura ? '255, 120, 40' : '255, 248, 214';
    const forca = f.fase === 'atrai' ? 0.35 + 0.5 * f.p : f.fase === 'funde' ? 0.85 * (1 - f.p) + 0.15 : 0.55 + 0.35 * f.p + 0.15 * Math.sin(t * 22);
    const g = ctx.createRadialGradient(sx, sy, r * 0.72, sx, sy, r * 1.4);
    g.addColorStop(0, `rgba(${rgb}, 0)`);
    g.addColorStop(0.32, `rgba(${rgb}, ${(0.6 * forca).toFixed(3)})`);
    g.addColorStop(1, `rgba(${rgb}, 0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sx, sy, r * 1.4, 0, Math.PI * 2);
    ctx.fill();
    if (f.fase === 'atrai') {
      // brilhinhos girando em volta do grupo
      for (let k = 0; k < 4; k++) {
        const a = t * 3 + (k * Math.PI) / 2;
        estrela(ctx, sx + Math.cos(a) * r * 1.08, sy + Math.sin(a) * r * 1.08, Math.max(4, r * 0.09) * (0.7 + 0.5 * f.p));
      }
    } else if (f.fase === 'funde') {
      // anel que abre a partir da costura
      ctx.strokeStyle = `rgba(255, 255, 255, ${(0.9 * (1 - f.p)).toFixed(3)})`;
      ctx.lineWidth = Math.max(2, r * 0.06);
      ctx.beginPath();
      ctx.arc(sx, sy, r * (0.85 + 0.55 * f.p), 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

/** Estrelinha de 4 pontas (px). */
function estrela(ctx, x, y, r) {
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = TINTA;
  ctx.lineWidth = Math.max(1.2, r * 0.22);
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
}

/** Cor da reticula de cada reforco de alvo. */
const COR_ALVO = { mira: '#ff3b30', calor: '#ff8a2a', gelo: '#45b8ff', tesoura: '#a77bff', tinta: '#ff5fc8' };

/**
 * Reticula de mira (px): anel com contorno de tinta, quatro tracos para dentro e o ponto.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x @param {number} y @param {number} r @param {number} giro @param {string} cor
 * @param {number} grossura 1 normal; maior quando travada
 * @param {boolean} [vazada] tracos para fora e sem o ponto (o alvo fica a vista)
 */
function reticula(ctx, x, y, r, giro, cor, grossura, vazada = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(giro);
  ctx.lineCap = 'round';
  const tracos = () => {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2;
      const [r0, r1] = vazada ? [1.32, 0.86] : [1.22, 0.58];
      ctx.moveTo(Math.cos(a) * r * r0, Math.sin(a) * r * r0);
      ctx.lineTo(Math.cos(a) * r * r1, Math.sin(a) * r * r1);
    }
    ctx.stroke();
  };
  ctx.strokeStyle = TINTA;
  ctx.lineWidth = 6 * grossura;
  tracos();
  ctx.strokeStyle = cor;
  ctx.lineWidth = 3 * grossura;
  tracos();
  if (vazada) { ctx.restore(); return; }
  ctx.fillStyle = TINTA;
  ctx.beginPath();
  ctx.arc(0, 0, 3.4 * grossura, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.arc(0, 0, 2 * grossura, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
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

// Efeitos por cima do slime: respingos, brilhos da fusao e textos de combo ("Good! x2").
// Coordenadas do mundo; o tempo vem de fora (nada de relogio proprio).

import { aplicar } from './camera.js';
import { TINTA } from './fundo.js';

/** @typedef {{ x: number, y: number, vx: number, vy: number, vida: number, total: number, r: number, cor: string, tipo: 'gota'|'brilho'|'estrela' }} Part */
/** @typedef {{ x: number, y: number, texto: string, cor: string, vida: number, total: number, escala: number, grupo: string }} Texto */

export function criarVfx() {
  /** @type {Part[]} */
  let parts = [];
  /** @type {Texto[]} */
  let textos = [];
  let semente = 1;
  const rnd = () => {
    semente = (semente * 16807) % 2147483647;
    return semente / 2147483647;
  };

  return {
    /** Respingo de gotas da cor do slime. */
    respingo(x, y, cor, qtd = 10, forca = 6) {
      for (let k = 0; k < qtd; k++) {
        const a = rnd() * Math.PI * 2;
        const v = forca * (0.4 + rnd() * 0.8);
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v + forca * 0.5, vida: 0.6 + rnd() * 0.4, total: 1, r: 0.08 + rnd() * 0.12, cor, tipo: 'gota' });
      }
    },
    /** Brilhos (particulas que sairam na fusao). */
    brilho(x, y, cor = '#ffffff') {
      parts.push({ x, y, vx: (rnd() - 0.5) * 2, vy: 1 + rnd() * 2, vida: 0.5 + rnd() * 0.5, total: 1, r: 0.12 + rnd() * 0.1, cor, tipo: rnd() < 0.5 ? 'brilho' : 'estrela' });
    },
    /** Texto que sobe e some. Com grupo, o novo substitui o anterior do mesmo grupo (combo). */
    texto(x, y, texto, cor = '#ffffff', escala = 1, grupo = '') {
      if (grupo) textos = textos.filter((t) => t.grupo !== grupo);
      textos.push({ x, y, texto, cor, vida: 1.1, total: 1.1, escala, grupo });
    },
    /** @param {number} dt */
    passo(dt) {
      for (const p of parts) {
        p.vida -= dt;
        p.vy -= (p.tipo === 'gota' ? 30 : 2) * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      parts = parts.filter((p) => p.vida > 0);
      for (const t of textos) { t.vida -= dt; t.y += dt * 0.8; }
      textos = textos.filter((t) => t.vida > 0);
    },
    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {import('./camera.js').Camera} cam
     * @param {number} dpr
     */
    desenhar(ctx, cam, dpr) {
      aplicar(ctx, cam, dpr);
      for (const p of parts) {
        const a = Math.min(1, p.vida / 0.3);
        ctx.globalAlpha = a;
        if (p.tipo === 'gota') {
          ctx.fillStyle = TINTA;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r + 0.04, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = p.cor;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.strokeStyle = p.cor;
          ctx.lineWidth = 0.05;
          ctx.beginPath();
          const r = p.r * (p.tipo === 'estrela' ? 1.4 : 1);
          ctx.moveTo(p.x - r, p.y); ctx.lineTo(p.x + r, p.y);
          ctx.moveTo(p.x, p.y - r); ctx.lineTo(p.x, p.y + r);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      // textos em pixels (fora da transformacao do mundo, para nao espelhar)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const t of textos) {
        const sx = cam.sx + (t.x - cam.cx) * cam.s;
        const sy = cam.sy - (t.y - cam.cy) * cam.s;
        const k = 1 - t.vida / t.total;
        const pop = k < 0.15 ? 0.6 + (k / 0.15) * 0.55 : k < 0.25 ? 1.15 - ((k - 0.15) / 0.1) * 0.15 : 1;
        const tam = Math.max(18, cam.s * 1.15) * t.escala * pop;
        ctx.globalAlpha = Math.min(1, t.vida / 0.25);
        ctx.font = `700 ${tam}px Fredoka, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.lineWidth = tam * 0.22;
        ctx.strokeStyle = TINTA;
        ctx.strokeText(t.texto, sx, sy);
        ctx.fillStyle = t.cor;
        ctx.fillText(t.texto, sx, sy);
      }
      ctx.globalAlpha = 1;
    },
    get vazio() { return !parts.length && !textos.length; },
  };
}

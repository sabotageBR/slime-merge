// Efeitos por cima do slime: respingos, brilhos da fusao, textos de combo ("Good! x2") e a
// explosao do missil da mira (clarao, anel de choque e fumaca).
// Coordenadas do mundo; o tempo vem de fora (nada de relogio proprio).

import { aplicar } from './camera.js';
import { TINTA } from './fundo.js';

/** @typedef {{ x: number, y: number, vx: number, vy: number, vida: number, total: number, r: number, cor: string, tipo: 'gota'|'brilho'|'estrela'|'clarao'|'anel'|'fumaca' }} Part */
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
    /**
     * Explosao do missil: clarao, anel de choque, fumaca, gosma e brilhos.
     * @param {number} x @param {number} y @param {string} cor @param {number} r raio do slime (u)
     */
    explosao(x, y, cor, r) {
      parts.push({ x, y, vx: 0, vy: 0, vida: 0.16, total: 0.16, r: r * 1.9, cor: '#fff6c8', tipo: 'clarao' });
      parts.push({ x, y, vx: 0, vy: 0, vida: 0.32, total: 0.32, r: r * 2.6, cor: '#ffffff', tipo: 'anel' });
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2 + rnd() * 0.6;
        const v = 1.2 + rnd() * 1.6;
        parts.push({ x: x + Math.cos(a) * r * 0.4, y: y + Math.sin(a) * r * 0.4, vx: Math.cos(a) * v, vy: Math.sin(a) * v + 0.8, vida: 0.45 + rnd() * 0.25, total: 0.7, r: r * (0.35 + rnd() * 0.25), cor: '#e9e6ee', tipo: 'fumaca' });
      }
      this.respingo(x, y, cor, 24, 11);
      for (let k = 0; k < 6; k++) this.brilho(x + (rnd() - 0.5) * r, y + (rnd() - 0.5) * r, '#fff6c8');
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
        p.vy -= (p.tipo === 'gota' ? 30 : p.tipo === 'fumaca' ? -1.5 : 2) * dt;
        if (p.tipo === 'fumaca') { p.vx *= 1 - 3 * dt; p.vy *= 1 - 3 * dt; }
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
        const k = 1 - p.vida / p.total;
        if (p.tipo === 'clarao') {
          ctx.globalAlpha = 1 - k;
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          g.addColorStop(0, '#ffffff');
          g.addColorStop(0.45, p.cor);
          g.addColorStop(1, 'rgba(255, 200, 80, 0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.tipo === 'anel') {
          // anel de choque: cresce rapido e afina
          const rr = p.r * (0.25 + 0.75 * Math.sqrt(k));
          ctx.globalAlpha = 1 - k;
          ctx.lineWidth = 0.32 * (1 - k) + 0.04;
          ctx.strokeStyle = TINTA;
          ctx.beginPath();
          ctx.arc(p.x, p.y, rr, 0, Math.PI * 2);
          ctx.stroke();
          ctx.lineWidth *= 0.55;
          ctx.strokeStyle = p.cor;
          ctx.stroke();
        } else if (p.tipo === 'fumaca') {
          const rr = p.r * (0.6 + k * 0.8);
          ctx.globalAlpha = Math.min(1, p.vida / 0.25) * 0.95;
          ctx.fillStyle = TINTA;
          ctx.beginPath();
          ctx.arc(p.x, p.y, rr + 0.06, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = p.cor;
          ctx.beginPath();
          ctx.arc(p.x, p.y, rr, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.tipo === 'gota') {
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

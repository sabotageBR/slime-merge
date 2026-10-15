// Laboratorio do material (checkpoint "sensacao do slime"): tres potes lado a lado com
// gelatina, goo e liquido recebendo as mesmas gotas coloridas. Tocar despeja no pote
// mais perto. Os sliders do ?debug mexem no material de cada pote ao vivo.

import { criarMundo } from '../../fisica/mundo.js';
import { poteTrapezio } from '../../fisica/paredes.js';
import { material } from '../../fisica/materiais.js';
import { difundir, pintar } from '../../cor/difusao.js';
import { TINTAS, hexDaMistura } from '../../cor/km.js';
import { criarRng } from '../../core/rng.js';

const CORES = [TINTAS.ciano, TINTAS.amarelo, TINTAS.magenta, TINTAS.branco, TINTAS.ciano, TINTAS.magenta];
const POTES = [-7, 0, 7];

/** @param {{ semente?: number }} [o] */
export function criarModo(o = {}) {
  const rng = criarRng(o.semente || 7);
  const mundo = criarMundo({ semente: o.semente || 7 });
  const mats = [material('gelatina'), material('goo'), material('liquido')];
  const paredes = [];
  for (const cx of POTES) {
    for (const p of poteTrapezio({ topo: 5.6, fundo: 4.4, altura: 7 })) {
      paredes.push({ ax: p.ax + cx, ay: p.ay, bx: p.bx + cx, by: p.by, r: p.r });
    }
  }
  mundo.definirParedes(paredes);
  let t = 0;
  let proxima = 0.2;
  let k = 0;
  /** @type {any[]} */
  const eventos = [];

  function gota(pote, dx, cor, diam) {
    const s = mundo.criarSlime({ x: POTES[pote] + dx, y: 9, diametro: diam, material: mats[pote] });
    if (s) pintar(mundo, s, cor);
    return s;
  }

  return {
    id: 'lab',
    mundo,
    janela: [-10.6, -0.8, 10.6, 10.5],
    campoJanela: [-10.6, -0.8, 10.6, 10.5],
    materiais: mats,
    eventos,
    passo(dt) {
      t += dt;
      if (t >= proxima && k < 14) {
        const dx = (rng() - 0.5) * 2.4;
        const cor = CORES[k % CORES.length];
        const diam = 1.1 + rng() * 0.9;
        for (let p = 0; p < 3; p++) gota(p, dx, cor, diam);
        k++;
        proxima = t + 0.9;
      }
      mundo.avancar(4);
      mundo.medir(dt);
      // goo e liquido se juntam numa massa so ao encostar (sem perder volume); a gelatina
      // continua em personagens separados
      for (const [i, j, p] of mundo.contatos()) {
        const a = mundo.slimes[i];
        const b = mundo.slimes[j];
        if (p < 3 || !a.ativo || !b.ativo || a.mat !== b.mat || a.mat === mats[0]) continue;
        const [gr, pe] = a.n >= b.n ? [a, b] : [b, a];
        mundo.fundir(gr, pe, { px: pe.cx, py: pe.cy, nAlvo: a.n + b.n, rampa: 1, manterForma: true });
      }
      difundir(mundo, dt);
    },
    apontar(x, _y, fase) {
      if (fase !== 'baixo') return;
      let p = 0;
      for (let i = 1; i < 3; i++) if (Math.abs(x - POTES[i]) < Math.abs(x - POTES[p])) p = i;
      const cor = CORES[(k++) % CORES.length];
      gota(p, Math.max(-2.2, Math.min(2.2, x - POTES[p])), cor, 1.3);
      eventos.push({ tipo: 'gota', x, y: 9, cor: hexDaMistura(cor) });
    },
    tecla() {},
    hud() { return { pontos: null }; },
    visual() { return {}; },
    /** sliders do ?debug: [pote, chave, valor] */
    ajustar(pote, chave, valor) {
      mats[pote][chave] = valor;
    },
  };
}

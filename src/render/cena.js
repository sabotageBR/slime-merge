// A cena: tres canvases empilhados (papel + pote | slime em WebGL2 | rostos + efeitos),
// camera que enquadra a janela do modo dentro da #area do HUD, qualidade adaptativa.
// Nada desenha com canvas 0x0 (iframe zerado/escondido congelava o stringcut no iPad).

import { enquadrar, paraMundo, aplicar } from './camera.js';
import { criarCampo } from './campo.js';
import { criarComposicao } from './composicao.js';
import { desenharSlimes2D } from './fallback2d.js';
import { desenharLinha } from './fundo.js';
import { desenharRostos, desenharAtras } from './rostos.js';
import { desenharCenario } from './cenarios.js';
import { desenharCestos, desenharReflexos } from './cestos.js';
import { cesto as acharCesto } from '../jogo/cestos.js';
import { criarVfx } from './vfx.js';
import { desenharGuias } from './guias.js';

/** Raio do nucleo do campo (u) e limiar da superficie: o slime isolado fica com ~r de borda. */
export const RAIO_CAMPO = 0.48;
export const LIMIAR = 0.85;

/** Niveis de qualidade (so o render muda; a fisica e igual em todo aparelho). */
export const QUALIDADES = [
  { nome: 'alta', dpr: 2, celula: 0.085, brilho: 1 },
  { nome: 'media', dpr: 1.5, celula: 0.11, brilho: 1 },
  { nome: 'baixa', dpr: 1, celula: 0.14, brilho: 0 },
];

/**
 * @param {{ fundo: HTMLCanvasElement, slime: HTMLCanvasElement, topo: HTMLCanvasElement, area: HTMLElement }} el
 * @param {{ forcar2d?: boolean, raio?: number, limiar?: number, zoom?: number[]|null, cenario?: string, objeto?: string, cesto?: string }} [o]
 */
export function criarCena(el, o = {}) {
  const raioCampo = o.raio || RAIO_CAMPO;
  const visual = { cenario: o.cenario || 'jardim', objeto: o.objeto || 'classico', cesto: o.cesto || 'becher' };
  const limiar = o.limiar || LIMIAR;
  const ctxFundo = /** @type {CanvasRenderingContext2D} */ (el.fundo.getContext('2d'));
  const ctxTopo = /** @type {CanvasRenderingContext2D} */ (el.topo.getContext('2d'));
  let comp = o.forcar2d ? null : criarComposicao(el.slime);
  const ctxSlime2d = comp ? null : el.slime.getContext('2d');
  let qual = 0;
  let W = 0;
  let H = 0;
  let dpr = 1;
  /** @type {import('./camera.js').Camera|null} */
  let cam = null;
  /** @type {ReturnType<typeof criarCampo>|null} */
  let campo = null;
  let campoChave = '';
  const vfx = criarVfx();

  function medir(janela) {
    W = Math.max(0, window.innerWidth | 0);
    H = Math.max(0, window.innerHeight | 0);
    const q = QUALIDADES[qual];
    dpr = Math.min(q.dpr, window.devicePixelRatio || 1);
    for (const c of [el.fundo, el.slime, el.topo]) {
      const w = Math.max(1, Math.round(W * dpr));
      const h = Math.max(1, Math.round(H * dpr));
      if (c.width !== w) c.width = w;
      if (c.height !== h) c.height = h;
    }
    const r = el.area.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) cam = enquadrar(janela, { x: r.left, y: r.top, w: r.width, h: r.height });
  }

  function garantirCampo(janela) {
    const q = QUALIDADES[qual];
    const chave = janela.join(',') + '|' + q.celula;
    if (chave === campoChave && campo) return campo;
    campoChave = chave;
    campo = criarCampo({ janela, celula: q.celula, raio: raioCampo });
    return campo;
  }

  /**
   * @param {any} modo  o modo de jogo (mundo, janela, campoJanela, visual())
   * @param {number} t  tempo em s
   */
  function desenhar(modo, t) {
    medir(o.zoom && o.zoom.length === 4 ? o.zoom : modo.janela);
    if (!cam || W < 2 || H < 2) return;
    const m = modo.mundo;
    const vis = modo.visual ? modo.visual() : {};
    // fundo: cenario (o chao fica logo abaixo do cesto), cesto e o que nasce atras do slime
    let chao = Infinity;
    for (const p of m.paredes) chao = Math.min(chao, p.ay - p.r, p.by - p.r);
    if (chao === Infinity) chao = 0;
    const pes = (vis.potes || []).some((P) => P.cesto.detalhe === 'pes' || P.cesto.detalhe === 'xicara');
    chao -= pes ? 0.85 : 0.08;
    desenharCenario(ctxFundo, cam, dpr, W, H, visual.cenario, t, chao);
    desenharCestos(ctxFundo, cam, dpr, m.paredes, { potes: vis.potes, t, estiloSoltas: acharCesto(visual.cesto).estilo });
    desenharAtras(ctxFundo, m, cam, dpr, visual.objeto);
    for (const l of [vis.linha, ...(vis.linhas || [])]) {
      if (l) desenharLinha(ctxFundo, cam, dpr, l.y, l.x0, l.x1, l.alerta || 0);
    }
    if (vis.guia) {
      aplicar(ctxFundo, cam, dpr);
      ctxFundo.save();
      ctxFundo.setLineDash([0.22, 0.18]);
      ctxFundo.strokeStyle = 'rgba(23, 22, 28, 0.35)';
      ctxFundo.lineWidth = 0.06;
      ctxFundo.beginPath();
      ctxFundo.moveTo(vis.guia.x, vis.guia.y0);
      ctxFundo.lineTo(vis.guia.x, vis.guia.y1);
      ctxFundo.stroke();
      ctxFundo.restore();
    }
    // slime
    const q = QUALIDADES[qual];
    if (comp && !comp.perdeu()) {
      const c = garantirCampo(modo.campoJanela || modo.janela);
      c.acumular(m);
      comp.desenhar(c, cam, dpr, { tempo: t, brilho: q.brilho, limiar, traco: Math.max(1.6, Math.min(2.8, cam.s * 0.055)) });
    } else if (ctxSlime2d) {
      ctxSlime2d.setTransform(1, 0, 0, 1, 0, 0);
      ctxSlime2d.clearRect(0, 0, el.slime.width, el.slime.height);
      desenharSlimes2D(ctxSlime2d, m, cam, dpr);
    }
    // por cima
    ctxTopo.setTransform(1, 0, 0, 1, 0, 0);
    ctxTopo.clearRect(0, 0, el.topo.width, el.topo.height);
    desenharRostos(ctxTopo, m, cam, dpr, t, { olhar: vis.olhar || null, estilo: visual.objeto });
    if (vis.potes) desenharReflexos(ctxTopo, cam, dpr, m.paredes, vis.potes);
    vfx.desenhar(ctxTopo, cam, dpr);
    desenharGuias(ctxTopo, cam, dpr, vis, t, m);
  }

  return {
    desenhar,
    vfx,
    /** px CSS -> mundo (ou null antes da primeira camera) */
    paraMundo(px, py) { return cam ? paraMundo(cam, px, py) : null; },
    get camera() { return cam; },
    get qualidade() { return QUALIDADES[qual].nome; },
    get usaGl() { return !!comp; },
    /** @param {{ cenario?: string, objeto?: string }} v */
    definirVisual(v) { Object.assign(visual, v); },
    get visual() { return { ...visual }; },
    /** @param {number} k 0 alta, 1 media, 2 baixa */
    definirQualidade(k) { qual = Math.max(0, Math.min(QUALIDADES.length - 1, k)); campoChave = ''; },
    get nivelQualidade() { return qual; },
  };
}

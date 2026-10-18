// A cena: tres canvases empilhados (papel + pote | slime em WebGL2 | rostos + efeitos), mais
// um por cima do HUD (missil da mira e gosma na tela), camera que enquadra a janela do modo
// dentro da #area do HUD, qualidade adaptativa.
// Nada desenha com canvas 0x0 (iframe zerado/escondido congelava o stringcut no iPad).

import { enquadrar, paraMundo, paraTela, aplicar, deslocada } from './camera.js';
import { criarCampo } from './campo.js';
import { criarComposicao } from './composicao.js';
import { desenharSlimes2D, definirAparencias2D } from './fallback2d.js';
import { desenharLinha } from './fundo.js';
import { desenharRostos, desenharAtras } from './rostos.js';
import { desenharCenario } from './cenarios.js';
import { desenharCestos, desenharReflexos } from './cestos.js';
import { cesto as acharCesto } from '../jogo/cestos.js';
import { criarVfx } from './vfx.js';
import { desenharGuias } from './guias.js';
import { criarGosma } from './gosma.js';
import { desenharMissil } from './missil.js';

/** Raio do nucleo do campo (u) e limiar da superficie: o slime isolado fica com ~r de borda. */
export const RAIO_CAMPO = 0.48;
export const LIMIAR = 0.85;

/** Niveis de qualidade (so o render muda; a fisica e igual em todo aparelho). */
export const QUALIDADES = [
  { nome: 'alta', dpr: 2, celula: 0.085, brilho: 1 },
  { nome: 'media', dpr: 1.5, celula: 0.11, brilho: 1 },
  { nome: 'baixa', dpr: 1, celula: 0.14, brilho: 0 },
  // ultimo degrau (1.2.0): no Player Fit Test da 1.1.1, 22% dos celulares ainda passavam do minuto 5
  // abaixo de 30 fps na baixa. So o canvas do slime perde resolucao (slime: dpr dele; rostos e pote
  // ficam nitidos), e a celula maior tambem barateia o P2G na CPU (campo.js)
  { nome: 'minima', dpr: 1, slime: 0.75, celula: 0.17, brilho: 0 },
];

/**
 * @param {{ fundo: HTMLCanvasElement, slime: HTMLCanvasElement, topo: HTMLCanvasElement, area: HTMLElement, tela?: HTMLCanvasElement|null }} el
 *   tela: canvas por cima do HUD (missil e gosma); sem ele, os dois vao para o canvas de cima
 * @param {{ forcar2d?: boolean, raio?: number, limiar?: number, zoom?: number[]|null, cenario?: string, objeto?: string, cesto?: string, expr?: string }} [o]
 *   expr: forca a expressao de todos os rostos (prints)
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
  /** dpr do canvas do slime (menor que o dos outros so na qualidade minima) */
  let dprSlime = 1;
  /** @type {import('./camera.js').Camera|null} */
  let cam = null;
  /** @type {ReturnType<typeof criarCampo>|null} */
  let campo = null;
  let campoChave = '';
  const vfx = criarVfx();
  const gosma = criarGosma();
  const ctxTela = el.tela ? /** @type {CanvasRenderingContext2D} */ (el.tela.getContext('2d')) : null;
  /** o canvas da tela tem algo desenhado (limpar uma vez quando acabar) */
  let telaSuja = false;
  let dprTela = 1;
  /** @type {() => number[]|null} centro do botao da mira (px CSS), de onde sai o missil */
  let origemMissil = () => null;
  let respingos = 0;

  function medir(janela) {
    W = Math.max(0, window.innerWidth | 0);
    H = Math.max(0, window.innerHeight | 0);
    const q = QUALIDADES[qual];
    dpr = Math.min(q.dpr, window.devicePixelRatio || 1);
    dprSlime = Math.min(q.slime || q.dpr, dpr);
    for (const c of [el.fundo, el.slime, el.topo]) {
      const d = c === el.slime ? dprSlime : dpr;
      const w = Math.max(1, Math.round(W * d));
      const h = Math.max(1, Math.round(H * d));
      if (c.width !== w) c.width = w;
      if (c.height !== h) c.height = h;
    }
    if (el.tela) {
      // so efeitos rapidos: resolucao menor basta
      dprTela = Math.min(1.5, dpr);
      const w = Math.max(1, Math.round(W * dprTela));
      const h = Math.max(1, Math.round(H * dprTela));
      if (el.tela.width !== w) { el.tela.width = w; telaSuja = true; }
      if (el.tela.height !== h) { el.tela.height = h; telaSuja = true; }
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
    // terremoto: a tela treme junto com o pote (a camera estavel fica para o toque e o HUD)
    const tr = vis.tremor;
    const cq = tr ? deslocada(cam, Math.max(-8, Math.min(8, tr.x * cam.s * 0.6)), Math.max(-5, Math.min(5, -tr.y * cam.s * 0.6))) : cam;
    // fundo: cenario (o chao fica logo abaixo do cesto), cesto e o que nasce atras do slime
    let chao = Infinity;
    for (const p of m.paredes) if (!p.oculta) chao = Math.min(chao, p.ay + (p.ty || 0) - p.r, p.by + (p.ty || 0) - p.r);
    if (chao === Infinity) chao = 0;
    const pes = (vis.potes || []).some((P) => P.cesto.detalhe === 'pes' || P.cesto.detalhe === 'xicara');
    chao -= pes ? 0.85 : 0.08;
    desenharCenario(ctxFundo, cq, dpr, W, H, visual.cenario, t, chao);
    desenharCestos(ctxFundo, cq, dpr, m.paredes, { potes: vis.potes, t, estiloSoltas: acharCesto(visual.cesto).estilo });
    desenharAtras(ctxFundo, m, cq, dpr, visual.objeto);
    for (const l of [vis.linha, ...(vis.linhas || [])]) {
      if (l) desenharLinha(ctxFundo, cq, dpr, l.y, l.x0, l.x1, l.alerta || 0);
    }
    if (vis.guia) {
      aplicar(ctxFundo, cq, dpr);
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
      comp.desenhar(c, cq, dprSlime, { tempo: t, brilho: q.brilho, limiar, traco: Math.max(1.6, Math.min(2.8, cq.s * 0.055)) });
    } else if (ctxSlime2d) {
      ctxSlime2d.setTransform(1, 0, 0, 1, 0, 0);
      ctxSlime2d.clearRect(0, 0, el.slime.width, el.slime.height);
      desenharSlimes2D(ctxSlime2d, m, cq, dprSlime);
    }
    // por cima
    ctxTopo.setTransform(1, 0, 0, 1, 0, 0);
    ctxTopo.clearRect(0, 0, el.topo.width, el.topo.height);
    desenharRostos(ctxTopo, m, cq, dpr, t, { olhar: vis.olhar || null, estilo: visual.objeto, expr: o.expr || '' });
    if (vis.potes) desenharReflexos(ctxTopo, cq, dpr, m.paredes, vis.potes);
    vfx.desenhar(ctxTopo, cq, dpr);
    desenharGuias(ctxTopo, cq, dpr, vis, t, m);
    desenharTela(vis, cq);
  }

  /**
   * Missil e gosma: por cima do HUD (canvas proprio, so desenha quando ha o que mostrar).
   * @param {any} vis @param {import('./camera.js').Camera} camD camera do quadro (com o tremor)
   */
  function desenharTela(vis, camD) {
    const ctx = ctxTela || ctxTopo;
    const d = ctxTela ? dprTela : dpr;
    const ativo = !!vis.missil || !gosma.vazio;
    if (ctxTela && (ativo || telaSuja)) {
      ctxTela.setTransform(1, 0, 0, 1, 0, 0);
      ctxTela.clearRect(0, 0, el.tela.width, el.tela.height);
      telaSuja = ativo;
    }
    if (!ativo || !cam) return;
    if (vis.missil) {
      const alvo = paraTela(camD, vis.missil.x, vis.missil.y);
      const origem = origemMissil() || [W / 2, H - 40];
      desenharMissil(ctx, d, origem, alvo, vis.missil, Math.max(34, Math.min(70, cam.s * 1.7)));
    }
    gosma.desenhar(ctx, d);
  }

  return {
    desenhar,
    vfx,
    /**
     * Skins da partida (src/jogo/skins.js `aparencias`, indice = nivel): WebGL e a reserva 2D.
     * So reenvia quando muda.
     * @param {Array<any>} lista
     */
    definirAparencias(lista) {
      if (comp) comp.definirAparencias(lista);
      definirAparencias2D(lista);
    },
    /** Efeitos com tempo (respingos, textos, gosma na tela). @param {number} dt */
    passo(dt) {
      vfx.passo(dt);
      gosma.passo(dt);
    },
    /** Gosma do slime explodido voando na tela (x, y e r do mundo). */
    respingarTela(x, y, cor, r) {
      if (!cam) return;
      const [sx, sy] = paraTela(cam, x, y);
      gosma.respingar(sx, sy, cor, r * cam.s, ++respingos * 7919, W, H);
    },
    /** @param {() => number[]|null} f */
    set origemMissil(f) { origemMissil = f; },
    /** px CSS -> mundo (ou null antes da primeira camera) */
    paraMundo(px, py) { return cam ? paraMundo(cam, px, py) : null; },
    /** mundo -> px CSS (ou null antes da primeira camera) */
    paraTela(x, y) { return cam ? paraTela(cam, x, y) : null; },
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

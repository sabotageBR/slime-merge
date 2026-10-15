// Palco: um slime isolado no pipeline real do jogo (fisica + campo + composicao em WebGL2 +
// rostos), para a previa do editor de skins, as fotos do estudio e as miniaturas da Loja.
// O canvas WebGL fica fora do DOM; cada quadro vai para o canvas 2D de saida com drawImage e
// os rostos por cima (como no tools/thumb.html). A cada ~1,6 s um cutucao (pulo, amasso ou
// balanco) mostra a skin acompanhando a deformacao. Sem WebGL2, desenho 2D: o corpo como
// elipse com o ladrilho ou a estampa por cima.

import { criarMundo } from '../fisica/mundo.js';
import { particulasNivel, diametroNivel } from '../jogo/niveis.js';
import { PALETA } from '../jogo/skins.js';
import { pintar } from '../cor/difusao.js';
import { hexDaMistura } from '../cor/km.js';
import { enquadrar, aplicar } from './camera.js';
import { criarCampo } from './campo.js';
import { criarComposicao } from './composicao.js';
import { desenharRostos, desenharAtras } from './rostos.js';
import { TINTA } from './fundo.js';
import { RAIO_CAMPO, LIMIAR } from './cena.js';

const DT = 1 / 60;

/**
 * @param {HTMLCanvasElement} saida canvas 2D onde o palco desenha
 * @param {{ tamanho?: number, fundo?: string, cutucar?: boolean, rosto?: boolean, dpr?: number, forcar2d?: boolean }} [o]
 *   tamanho: lado em px CSS; fundo: cor de fundo (padrao transparente); cutucar: anima sozinho;
 *   forcar2d: o desenho de reserva (testes)
 */
export function criarPalco(saida, o = {}) {
  let tamanho = Math.max(16, o.tamanho || 160);
  const fundo = o.fundo || '';
  const cutucar = o.cutucar !== false;
  const comRosto = o.rosto !== false;
  const dpr = Math.max(1, Math.min(2, o.dpr || (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
  let ctx = /** @type {CanvasRenderingContext2D} */ (saida.getContext('2d'));
  const glcv = document.createElement('canvas');
  glcv.width = 2;
  glcv.height = 2;
  let comp = o.forcar2d ? null : criarComposicao(glcv);

  /** @type {ReturnType<typeof criarMundo>|null} */
  let m = null;
  /** @type {any} */
  let s = null;
  let nivel = 0;
  let diam = 1.55;
  /** @type {any} */
  let ap = null;
  let objeto = 'classico';
  let tempo = 0;
  let acc = 0;
  let relogio = 0;
  let fase = 0;
  let lado = 1;
  /** @type {ReturnType<typeof criarCampo>|null} */
  let campo = null;
  let campoChave = '';
  /** @type {Map<string, HTMLCanvasElement>} */
  const imagens = new Map();
  let vivo = true;

  /** Janela do mundo enquadrada (quadrada, o slime um pouco abaixo do meio). */
  function janela() {
    const L = diam * 1.45;
    const y0 = diam * 0.58 - L / 2;
    return [-L / 2, y0, L / 2, y0 + L];
  }

  function novoMundo(k) {
    nivel = k;
    diam = diametroNivel(k);
    m = criarMundo({ semente: 7 + k, capacidade: 1200 });
    const parede = diam * 0.75 + 0.25;
    m.definirParedes([
      { ax: -parede - 2, ay: -0.22, bx: parede + 2, by: -0.22, r: 0.22 },
      { ax: -parede, ay: 0, bx: -parede, by: diam * 3, r: 0.22 },
      { ax: parede, ay: 0, bx: parede, by: diam * 3, r: 0.22 },
    ]);
    s = m.criarSlime({ x: 0, y: diam / 2 + 0.05, n: particulasNivel(k), material: 'gelatina', nivel: k });
    s.dados.pote = 0;
    campoChave = '';
    relogio = 0;
    fase = 0;
    // assenta no chao antes do primeiro quadro
    for (let f = 0; f < 40; f++) { m.avancar(4); m.medir(DT); }
  }

  function aplicarAparencia() {
    if (!s || !ap) return;
    pintar(m, s, ap.pig);
    s.dados.textura = ap.textura || 0;
    s.dados.texturaT = 1;
    s.dados.ap = ap.ap || 0;
    s.dados.apModo = ap.modo === 1 ? 1 : 0;
    s.dados.hex = ap.hex || hexDaMistura(ap.pig);
    if (comp) {
      const lista = [];
      if (ap.ap) lista[ap.ap] = ap;
      comp.definirAparencias(lista);
    }
  }

  /**
   * Mostra o slime do nivel k com a aparencia `a` (src/jogo/skins.js `aparencia`). No mesmo
   * nivel so repinta (a fisica segue: a previa do editor nao pula a cada pixel).
   * @param {number} k
   * @param {import('../jogo/skins.js').Aparencia} a
   * @param {string} [obj] estilo do personagem (src/render/rostos.js OBJETOS)
   */
  function montar(k, a, obj) {
    if (obj) objeto = obj;
    if (!m || k !== nivel) novoMundo(k);
    ap = a;
    aplicarAparencia();
  }

  /** Cutucao: pulo, amasso ou balanco (escala com o tamanho do slime). */
  function cutucao() {
    const v = Math.sqrt(diam);
    const { x, y, vx, vy, sl } = m;
    for (let i = 0; i < m.n; i++) {
      if (sl[i] !== s.idx) continue;
      const h = (y[i] - s.base) / diam;
      if (fase === 0) vy[i] += 4.6 * v;
      else if (fase === 1) { vy[i] -= 2.6 * v * Math.max(0, h); vx[i] += 1.9 * v * ((x[i] - s.cx) / diam); }
      else vx[i] += 2.6 * v * (h - 0.45) * lado;
    }
    if (fase === 0) { s.dados.expr = 'feliz'; s.dados.exprT = 0.9; }
    if (fase === 2) lado = -lado;
    m.acordarTodos();
    fase = (fase + 1) % 3;
  }

  /** @param {number} dt segundos */
  function passo(dt) {
    if (!m) return;
    acc += Math.min(0.1, Math.max(0, dt));
    while (acc >= DT) {
      acc -= DT;
      m.avancar(4);
      m.medir(DT);
      tempo += DT;
      if (s.dados.exprT > 0) { s.dados.exprT -= DT; if (s.dados.exprT <= 0) s.dados.expr = ''; }
      if (cutucar) {
        relogio += DT;
        if (relogio >= 1.6) { relogio = 0; cutucao(); }
      }
    }
  }

  /** Imagem 16x16 da aparencia (pixels opacos), para o desenho 2D. */
  function imagem(a) {
    let cv = imagens.get(a.chave);
    if (cv) return cv;
    cv = document.createElement('canvas');
    cv.width = 16;
    cv.height = 16;
    const g = /** @type {CanvasRenderingContext2D} */ (cv.getContext('2d'));
    for (let p = 0; p < 256; p++) {
      const i = a.px[p] & 15;
      if (!i) continue;
      g.fillStyle = PALETA[i];
      g.fillRect(p % 16, p >> 4, 1, 1);
    }
    imagens.set(a.chave, cv);
    return cv;
  }

  /** Sem WebGL2: o corpo como elipse na caixa do slime, com o ladrilho ou a estampa. */
  function desenhar2D(g, cam, d, traco) {
    aplicar(g, cam, d);
    const rx = (s.dir - s.esq) / 2;
    const ry = (s.topo - s.base) / 2;
    const cx = (s.dir + s.esq) / 2;
    const cy = (s.topo + s.base) / 2;
    g.beginPath();
    g.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
    g.fillStyle = hexDaMistura(ap ? ap.pig : [0.4, 0, 0, 0]);
    g.fill();
    if (ap && ap.px) {
      g.save();
      g.clip();
      g.imageSmoothingEnabled = false;
      const img = imagem(ap);
      if (ap.modo === 1) {
        const r = s.raio0 * 1.05;
        g.translate(s.cx, s.cy);
        g.scale(rx / s.raio0, -ry / s.raio0);
        g.drawImage(img, -r, -r, 2 * r, 2 * r);
      } else {
        const pad = g.createPattern(img, 'repeat');
        if (pad) {
          const k = 0.1 / (ap.escala || 1);
          pad.setTransform(new DOMMatrix([k, 0, 0, -k, s.cx, s.cy]));
          g.fillStyle = pad;
          g.fillRect(cx - rx - 1, cy - ry - 1, 2 * rx + 2, 2 * ry + 2);
        }
      }
      g.restore();
    }
    g.lineWidth = traco / cam.s;
    g.strokeStyle = TINTA;
    g.stroke();
  }

  /** Desenha o estado atual num contexto 2D de lado W px (d = px de canvas por px CSS). */
  function render(g, W, d, t, rosto, cor) {
    if (!m || W < 2) return;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, W, W);
    if (cor) {
      g.fillStyle = cor;
      g.fillRect(0, 0, W, W);
    }
    const ladoCss = W / d;
    const jan = janela();
    const cam = enquadrar(jan, { x: 0, y: 0, w: ladoCss, h: ladoCss });
    const traco = Math.max(1.4, Math.min(3.2, ladoCss * 0.017));
    // sombra no chao
    aplicar(g, cam, d);
    g.fillStyle = 'rgba(23, 22, 28, 0.13)';
    g.beginPath();
    g.ellipse(s.cx, 0.02, Math.max(0.2, (s.dir - s.esq) * 0.5), diam * 0.08, 0, 0, Math.PI * 2);
    g.fill();
    if (rosto) desenharAtras(g, m, cam, d, objeto);
    if (comp && !comp.perdeu()) {
      if (glcv.width !== W) glcv.width = W;
      if (glcv.height !== W) glcv.height = W;
      const celula = Math.max(0.03, Math.min(0.085, 4.5 / (cam.s * d)));
      const chave = nivel + '|' + celula.toFixed(4);
      if (chave !== campoChave || !campo) {
        const mg = 1.2;
        campo = criarCampo({ janela: [jan[0] - mg, jan[1] - mg, jan[2] + mg, jan[3] + mg], celula, raio: RAIO_CAMPO });
        campoChave = chave;
      }
      campo.acumular(m);
      comp.desenhar(campo, cam, d, { tempo: t, brilho: 1, limiar: LIMIAR, traco });
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.drawImage(glcv, 0, 0);
    } else {
      desenhar2D(g, cam, d, traco);
    }
    if (rosto) desenharRostos(g, m, cam, d, t, { estilo: objeto, olhar: null });
    g.setTransform(1, 0, 0, 1, 0, 0);
  }

  /** Desenha no canvas de saida (tempo t em s; padrao: o relogio do palco). */
  function desenhar(t = tempo) {
    if (!vivo) return;
    const W = Math.max(2, Math.round(tamanho * dpr));
    if (saida.width !== W) saida.width = W;
    if (saida.height !== W) saida.height = W;
    render(ctx, W, dpr, t, comRosto, fundo);
  }

  /**
   * Foto do estado atual num canvas novo (miniaturas): tam em px de canvas.
   * @param {number} tam
   * @param {{ rosto?: boolean, fundo?: string }} [op]
   * @returns {HTMLCanvasElement}
   */
  function foto(tam, op = {}) {
    const cv = document.createElement('canvas');
    const W = Math.max(2, Math.round(tam));
    cv.width = W;
    cv.height = W;
    const g = /** @type {CanvasRenderingContext2D} */ (cv.getContext('2d'));
    render(g, W, 1, tempo, op.rosto !== false, op.fundo || '');
    campoChave = '';
    return cv;
  }

  function liberar() {
    if (!vivo) return;
    vivo = false;
    if (comp) comp.liberar();
    comp = null;
    glcv.width = 1;
    glcv.height = 1;
    if (typeof window !== 'undefined') window.removeEventListener('pagehide', liberar);
  }
  if (typeof window !== 'undefined') window.addEventListener('pagehide', liberar);

  return {
    montar,
    passo,
    desenhar,
    foto,
    liberar,
    /** Troca o canvas de saida (um palco animado para varias fichas). @param {HTMLCanvasElement} c */
    trocarSaida(c) {
      saida = c;
      ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
    },
    /** @param {number} t lado em px CSS */
    set tamanho(t) { tamanho = Math.max(16, t); },
    get tamanho() { return tamanho; },
    get usaGl() { return !!comp; },
    get slime() { return s; },
    get tempo() { return tempo; },
  };
}

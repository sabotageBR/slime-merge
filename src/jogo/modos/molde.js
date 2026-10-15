// Modelo 4: Molde (puzzle de fisica por fases).
// Encher moldes de formatos malucos ate as zonas marcadas: segurar o bico despeja goo,
// arrastar inclina o molde (o goo escorre e se desenha na forma). Espinho corta o goo, o
// aquecedor derrete (escoa pelo funil), algumas fases pedem uma cor que so sai misturando
// dentro do molde. Estrelas pelo desperdicio.

import { criarMundo } from '../../fisica/mundo.js';
import { polilinha } from '../../fisica/paredes.js';
import { material } from '../../fisica/materiais.js';
import { pigmentoMedio, difundir } from '../../cor/difusao.js';
import { misturar, deltaE, hexDaMistura } from '../../cor/km.js';
import { CORES, nomeDe } from '../cores.js';
import { FASES } from '../fases-molde.js';
import { gota, juntarGoo } from '../goo.js';

const Y_BICO = 10.6;
const GRAU = Math.PI / 180;

/** @param {number[]} p @param {number[][]} poli */
function dentro(p, poli) {
  let d = false;
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const [xi, yi] = poli[i];
    const [xj, yj] = poli[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) d = !d;
  }
  return d;
}

/** @param {{ semente?: number, salvo?: any, toque?: boolean, lang?: string }} [o] */
export function criarModo(o = {}) {
  const salvo = o.salvo || {};
  const lang = o.lang || 'en';
  const goo = material('goo', { k: 0.0012, coesao: 0.035, xsph: 0.18, atritoS: 0.15, atritoK: 0.1 });
  /** @type {any[]} */
  const eventos = [];
  let fase = Math.min(FASES.length - 1, salvo.fase || 0);
  /** @type {number[]} */
  const estrelas = salvo.estrelas || [];
  /** @type {any} */
  let S = null;

  function montar() {
    const F = FASES[fase];
    const mundo = criarMundo({ semente: (o.semente || 1) + fase * 31 });
    /** capsulas no espaco do molde */
    const locais = F.molde.flatMap((p) => polilinha(p, 0.22));
    mundo.definirParedes(locais);
    // amostras de cada zona (grade de 0,25 u) para medir o enchimento
    const amostras = F.zonas.map((z) => {
      const xs = z.map((p) => p[0]);
      const ys = z.map((p) => p[1]);
      const pts = [];
      for (let x = Math.min(...xs); x <= Math.max(...xs); x += 0.25) {
        for (let y = Math.min(...ys); y <= Math.max(...ys); y += 0.25) if (dentro([x, y], z)) pts.push([x, y]);
      }
      return pts;
    });
    S = {
      F, mundo, locais, amostras, ang: 0, alvoAng: 0, tanque: F.tanque, despejando: -1, tDespejo: 0, arrasto: null,
      enchido: F.zonas.map(() => 0), perdidas: 0, despejadas: 0, tVitoria: 0, venceu: 0, tFim: 0, tMed: 0, corOk: !F.cor, dE: 99,
      tempo: 0, media: null, teclas: { esq: false, dir: false },
    };
    eventos.push({ tipo: 'nivel', n: fase + 1, acao: 'start' });
  }

  const cosSin = (a) => [Math.cos(a), Math.sin(a)];
  /** local -> mundo */
  function paraMundo(px, py, c, s) {
    const dy = py - S.F.pivoY;
    return [c * px - s * dy, S.F.pivoY + s * px + c * dy];
  }
  /** mundo -> local */
  function paraLocal(px, py, c, s) {
    const dy = py - S.F.pivoY;
    return [c * px + s * dy, S.F.pivoY - s * px + c * dy];
  }

  function girar() {
    const [c, s] = cosSin(S.ang * GRAU);
    S.locais.forEach((p, k) => {
      const [ax, ay] = paraMundo(p.ax, p.ay, c, s);
      const [bx, by] = paraMundo(p.bx, p.by, c, s);
      S.mundo.moverParede(k, { ax, ay, bx, by }, 1 / 60);
    });
  }

  function medir() {
    const m = S.mundo;
    const [c, s] = cosSin(S.ang * GRAU);
    // grade de cobertura: celula de 0,25 u marcada se tem particula a ate 0,34 u
    const marcadas = new Set();
    for (let i = 0; i < m.n; i++) {
      const [lx, ly] = paraLocal(m.x[i], m.y[i], c, s);
      const ci = Math.round(lx / 0.25);
      const cj = Math.round(ly / 0.25);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        const gx = (ci + a) * 0.25;
        const gy = (cj + b) * 0.25;
        if ((gx - lx) * (gx - lx) + (gy - ly) * (gy - ly) < 0.34 * 0.34) marcadas.add((ci + a) * 10007 + (cj + b));
      }
    }
    S.enchido = S.amostras.map((pts) => {
      if (!pts.length) return 1;
      let ok = 0;
      for (const [x, y] of pts) if (marcadas.has(Math.round(x / 0.25) * 10007 + Math.round(y / 0.25))) ok++;
      return ok / pts.length;
    });
    if (S.F.cor) {
      const media = [0, 0, 0, 0];
      let M = 0;
      for (const sl of m.slimes) {
        if (!sl.ativo) continue;
        const p = pigmentoMedio(m, sl);
        for (let k = 0; k < 4; k++) media[k] += p[k] * sl.n;
        M += sl.n;
      }
      if (M) {
        for (let k = 0; k < 4; k++) media[k] /= M;
        S.media = media;
        const alvo = CORES.find((x) => x.id === S.F.cor);
        S.dE = deltaE(misturar(media), misturar(alvo.pig));
        S.corOk = S.dE <= 12;
      }
    }
  }

  function vencer() {
    const taxa = S.despejadas ? S.perdidas / S.despejadas : 0;
    const est = taxa <= 0.1 ? 3 : taxa <= 0.25 ? 2 : 1;
    S.venceu = est;
    S.tFim = 2.4;
    estrelas[fase] = Math.max(estrelas[fase] || 0, est);
    eventos.push({ tipo: 'texto', x: 0, y: 8, texto: '★'.repeat(est), cor: '#ffd23a', escala: 2 });
    eventos.push({ tipo: 'som', nome: 'yes' });
    eventos.push({ tipo: 'nivel', n: fase + 1, acao: 'complete' });
    for (const s of S.mundo.slimes) if (s.ativo && !s.dados.gota) { s.dados.expr = 'feliz'; s.dados.exprT = 3; }
  }

  montar();

  return {
    id: 'molde',
    get mundo() { return S.mundo; },
    janela: [-7.2, -1.6, 7.2, 12.6],
    campoJanela: [-8, -2.4, 8, 12.4],
    eventos,
    passo(dt) {
      const m = S.mundo;
      S.tempo += dt;
      if (S.tFim > 0) {
        S.tFim -= dt;
        if (S.tFim <= 0) {
          if (S.venceu) { fase = (fase + 1) % FASES.length; eventos.push({ tipo: 'intervalo' }); }
          montar();
          return;
        }
      }
      // giro do molde (teclas ou arrasto), suave
      const lim = S.F.giroMax || 25;
      if (S.teclas.esq) S.alvoAng = Math.min(lim, S.alvoAng + 60 * dt);
      if (S.teclas.dir) S.alvoAng = Math.max(-lim, S.alvoAng - 60 * dt);
      const novo = S.ang + Math.max(-90 * dt, Math.min(90 * dt, S.alvoAng - S.ang));
      if (Math.abs(novo - S.ang) > 1e-6) { S.ang = novo; girar(); }
      // despejo
      if (S.botSolta > 0) { S.botSolta -= dt; if (S.botSolta <= 0) S.despejando = -1; }
      if (S.despejando >= 0 && S.tanque > 0 && !S.venceu) {
        S.tDespejo -= dt;
        if (S.tDespejo <= 0) {
          const b = S.F.bicos[S.despejando];
          if (gota(m, b.x + ((S.tempo * 7.3) % 1 - 0.5) * 0.25, Y_BICO - 0.9, b.pig, goo, 9)) { S.tanque--; S.despejadas += 9; }
          S.tDespejo = 0.075;
          eventos.push({ tipo: 'som', nome: 'tique' });
        }
      }
      m.acordarTodos();
      m.avancar(4);
      m.medir(dt);
      juntarGoo(m);
      difundir(m, dt, { taxa: 2 });
      const [c, s] = cosSin(S.ang * GRAU);
      // obstaculos e o que caiu para fora
      const fora = [];
      for (let i = 0; i < m.n; i++) {
        const [lx, ly] = paraLocal(m.x[i], m.y[i], c, s);
        if (m.y[i] < -2.2 || Math.abs(m.x[i]) > 8.5) { fora.push(i); continue; }
        for (const e of S.F.espinhos || []) {
          if ((lx - e.x) * (lx - e.x) + (ly - e.y) * (ly - e.y) < e.r * e.r) { fora.push(i); break; }
        }
        for (const r of S.F.calor || []) {
          if (lx > r[0] && lx < r[2] && ly > r[1] && ly < r[3]) {
            const sl = m.slimes[m.sl[i]];
            sl.estado = 'calor';
            sl.tEstado = 0.5;
          }
        }
      }
      if (fora.length) {
        const saidas = m.removerParticulas(fora);
        S.perdidas += fora.length;
        if (saidas.length) eventos.push({ tipo: 'pouso', x: saidas[0], y: saidas[1], forca: 0.5 });
      }
      for (const sl of m.slimes) if (sl.ativo && sl.dados.exprT > 0) { sl.dados.exprT -= dt; if (sl.dados.exprT <= 0) sl.dados.expr = ''; }
      S.tMed -= dt;
      if (S.tMed <= 0) { medir(); S.tMed = 0.2; }
      if (!S.venceu && !S.tFim) {
        const cheio = S.enchido.every((f) => f >= 0.9) && S.corOk;
        S.tVitoria = cheio ? S.tVitoria + dt : 0;
        if (S.tVitoria > 0.8) vencer();
        else if (S.tanque <= 0 && S.despejando >= 0) S.despejando = -1;
        if (S.tanque <= 0 && !cheio) {
          S.tSemTinta = (S.tSemTinta || 0) + dt;
          if (S.tSemTinta > 5) {
            eventos.push({ tipo: 'texto', x: 0, y: 8, texto: '↻', cor: '#ffffff', escala: 2 });
            eventos.push({ tipo: 'nivel', n: fase + 1, acao: 'fail' });
            S.tFim = 1.2;
          }
        }
      }
    },
    apontar(x, y, fase0) {
      if (S.venceu) return;
      if (fase0 === 'baixo') {
        const k = S.F.bicos.findIndex((b) => Math.abs(x - b.x) < 0.8 && y > Y_BICO - 1.6);
        if (k >= 0) { S.despejando = k; S.tDespejo = 0; return; }
        S.arrasto = { x0: x, a0: S.alvoAng };
        return;
      }
      if (fase0 === 'mover' && S.arrasto) {
        const lim = S.F.giroMax || 25;
        S.alvoAng = Math.max(-lim, Math.min(lim, S.arrasto.a0 - (x - S.arrasto.x0) * 7));
        return;
      }
      if (fase0 === 'cima') { S.despejando = -1; S.arrasto = null; }
    },
    tecla(codigo, baixo) {
      if (codigo === 'ArrowLeft' || codigo === 'KeyA') S.teclas.esq = baixo;
      else if (codigo === 'ArrowRight' || codigo === 'KeyD') S.teclas.dir = baixo;
      else if (codigo === 'Space' || codigo === 'ArrowDown' || codigo === 'KeyS') { S.despejando = baixo ? 0 : -1; S.tDespejo = 0; }
      else if (/^Digit[1-3]$/.test(codigo)) {
        const k = Number(codigo.slice(5)) - 1;
        if (k < S.F.bicos.length) { S.despejando = baixo ? k : -1; S.tDespejo = 0; }
      } else if (baixo && codigo === 'KeyR') { montar(); }
    },
    poder(id) { if (id === 'mexer') montar(); },
    bot() {
      if (S.venceu || S.tanque <= 0) return;
      const F = S.F;
      // inclina para a zona mais vazia (gemeos/espinho); pinga as tintas alternando
      if (F.espinhos) S.alvoAng = 26;
      else if (F.zonas.length > 1) S.alvoAng = S.enchido[0] > 0.85 && S.enchido[1] < 0.85 ? -24 : S.enchido[0] > 0.6 ? -10 : 0;
      else S.alvoAng = 0;
      S.despejando = F.cor ? Math.floor(S.tempo * 1.7) % F.bicos.length : 0;
      if (F.cor === 'lilas') S.despejando = [0, 2, 2, 0, 2, 1][Math.floor(S.tempo * 1.7) % 6];
      S.tDespejo = 0;
      S.botSolta = 0.4;
    },
    hud() {
      const F = S.F;
      const total = estrelas.reduce((a, b) => a + (b || 0), 0);
      const media = S.enchido.length ? Math.min(...S.enchido) : 0;
      const alvo = F.cor ? CORES.find((x) => x.id === F.cor) : null;
      return {
        pontos: `#${fase + 1}`,
        recorde: '★ ' + total,
        metaHtml: `<div class="pedido molde"><div class="medidor"><b style="width:${Math.round(Math.min(1, media / 0.9) * 100)}%"></b></div>`
          + (alvo ? `<i class="alvo" title="${nomeDe(alvo, lang)}" style="background:${hexDaMistura(alvo.pig)}"></i><span class="seta">${S.corOk ? '✓' : '←'}</span><i class="atual" style="background:${S.media ? hexDaMistura(S.media) : '#fff'}"></i>` : '')
          + `<span class="tanque">💧${S.tanque}</span></div>`,
        poderes: [{ id: 'mexer' }],
      };
    },
    visual() {
      const [c, s] = cosSin(S.ang * GRAU);
      const tw = (pts) => pts.map(([x, y]) => paraMundo(x, y, c, s));
      return {
        bicos: S.F.bicos.map((b, k) => ({ x: b.x, y: Y_BICO, cor: hexDaMistura(b.pig), ativo: S.despejando === k, dica: S.tempo < 3 && k === 0 })),
        zonas: S.F.zonas.map((z, k) => ({ pts: tw(z), cheia: S.enchido[k] >= 0.9 })),
        espinhos: (S.F.espinhos || []).map((e) => ({ ...(([x, y]) => ({ x, y }))(paraMundo(e.x, e.y, c, s)), r: e.r, ang: S.ang * GRAU })),
        calor: (S.F.calor || []).map((r) => tw([[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]])),
        mao: fase === 0 && S.tempo < 6 && S.despejadas === 0 ? { x: S.F.bicos[0].x, y: Y_BICO - 0.4, amplitude: 0, tecla: !o.toque, toque: true } : null,
      };
    },
    reiniciar() { montar(); },
    salvar() { return { fase, estrelas }; },
  };
}

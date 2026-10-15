// Editor de pixel da skin "Minha" (pedido do usuario em 2026-10-15): tela propria em DOM com
// a grade 16x16, ferramentas (pincel, borracha, balde, conta-gotas, espelho, desfazer/refazer,
// limpar), a paleta, a cor do corpo, os dois modos (ladrilho repetido pelo corpo ou estampa no
// corpo inteiro) e a previa ao vivo no palco (o slime do nivel no pipeline real do jogo).
// Toque e mouse (so o primeiro ponteiro pinta), teclado minimo, retrato e paisagem. Sem
// confirm()/alert(): o aviso de descartar fica dentro da tela. Os textos vem por parametro.

import { PALETA, BASES, NOMES_PALETA, NOMES_BASES, MODELOS, LADO, modelo, codificar, decodificar, pxDeLinhas, linhasDePx, imagemVazia, aparencia } from '../jogo/skins.js';
import { NIVEIS } from '../jogo/niveis.js';
import { hexDaMistura } from '../cor/km.js';
import { criarPalco } from '../render/palco.js';

/** Textos padrao (pt). */
export const TEXTOS_EDITOR = {
  titulo: 'Minha skin', nivel: 'Nível {n}', salvar: 'Salvar', fechar: 'Fechar', salvo: 'Salvo!',
  pincel: 'Pincel', borracha: 'Borracha', balde: 'Balde', contaGotas: 'Conta-gotas', espelho: 'Espelho', guias: 'Guias',
  desfazer: 'Desfazer', refazer: 'Refazer', limpar: 'Limpar',
  modo: 'Desenho', ladrilho: 'Ladrilho', estampa: 'Estampa', tamanho: 'Tamanho', P: 'P', M: 'M', G: 'G',
  corDoCorpo: 'Cor do corpo', paleta: 'Cores', comecarDe: 'Começar de', previa: 'Prévia', grade: 'Grade de 16 por 16 pixels',
  'modelo.vazio': 'Vazio', 'modelo.listras': 'Listras', 'modelo.bolinhas': 'Bolinhas', 'modelo.xadrez': 'Xadrez', 'modelo.borda': 'Borda',
  dicaLadrilho: 'O desenho se repete pelo corpo: o que sai de um lado entra pelo outro.',
  dicaEstampa: 'Um desenho cobre o corpo inteiro. O rosto fica por cima.',
  descartar: 'Descartar as mudanças?', sim: 'Descartar', nao: 'Continuar editando',
  cores: {
    slime: 'Cor do slime', tinta: 'Tinta', branco: 'Branco', cinza: 'Cinza', vermelho: 'Vermelho', laranja: 'Laranja', amarelo: 'Amarelo',
    verdeClaro: 'Verde-claro', verde: 'Verde', turquesa: 'Turquesa', azul: 'Azul', azulEscuro: 'Azul-escuro', roxo: 'Roxo', rosa: 'Rosa',
    marrom: 'Marrom', bege: 'Bege',
  },
  bases: {
    nivel: 'Cor do nível', vermelho: 'Vermelho', laranja: 'Laranja', amarelo: 'Amarelo', limao: 'Limão', verde: 'Verde', turquesa: 'Turquesa',
    azul: 'Azul', anil: 'Anil', roxo: 'Roxo', rosa: 'Rosa', areia: 'Areia', chocolate: 'Chocolate',
  },
};

// celulas em volta da grade: no ladrilho, as vizinhas esmaecidas; na estampa so uma folga
const margemDe = (modo) => (modo === 1 ? 1 : 3);
const PILHA = 30;
const TINTA = '#17161c';
const PAPEL = '#f3f2ee';
const R_CORPO = LADO / 2.1; // raio do corpo na estampa (px da imagem)
// olhos do rosto classico na estampa (src/render/rostos.js: R = 0,9 r0, olho em (+-0,36R, 0,16R), raio 0,27R)
const OLHOS = [[8 - 0.324 * R_CORPO, 8 - 0.144 * R_CORPO], [8 + 0.324 * R_CORPO, 8 - 0.144 * R_CORPO]];
const R_OLHO = 0.243 * R_CORPO;

const ICONES = {
  pincel: '<path d="M14.5 4.5l5 5-8.5 8.5-5-5z"/><path d="M6 13l5 5-4.5 1.5a2 2 0 0 1-2-2z"/>',
  borracha: '<path d="M4 15l9-9 6 6-7 7H8z"/><path d="M9 10l6 6"/><path d="M12 20h8"/>',
  balde: '<path d="M5 10l7-6 7 7-7 7z"/><path d="M19 12c1.5 2 2 3.2 2 4a2 2 0 0 1-4 0c0-.8.5-2 2-4z"/>',
  contaGotas: '<path d="M14 4l6 6-2 2-6-6z"/><path d="M13 9l-8 8v3h3l8-8"/>',
  espelho: '<path d="M12 3v18"/><path d="M9 7L4 17h5z"/><path d="M15 7l5 10h-5z"/>',
  guias: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 12h16M12 4v16"/>',
  desfazer: '<path d="M9 7L4 12l5 5"/><path d="M4 12h10a6 6 0 0 1 0 12"/>',
  refazer: '<path d="M15 7l5 5-5 5"/><path d="M20 12H10a6 6 0 0 0 0 12"/>',
  limpar: '<path d="M5 7h14"/><path d="M9 7V4h6v3"/><path d="M7 7l1 13h8l1-13"/>',
  fechar: '<path d="M6 6l12 12M18 6L6 18"/>',
};
const svg = (id) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONES[id]}</svg>`;

/**
 * @typedef {{ m?: number, b?: number, e?: number, px?: string }} Minha
 * @typedef {{ id: string, nome: string, px: string[]|Uint8Array, modo?: number }} Pronta
 */

/**
 * @param {HTMLElement} raiz elemento que recebe o editor (ocupa todo o espaco dele)
 * @param {{ paleta?: ReadonlyArray<string>, bases?: ReadonlyArray<any>, nivel?: number, inicial?: Minha|null,
 *   aoSalvar?: (m: Minha) => void, aoCancelar?: () => void, palco?: any, T?: Record<string, any>, prontas?: Pronta[],
 *   objeto?: string, modal?: boolean, nomeNivel?: string }} o
 *   palco: um palco (src/render/palco.js) para a previa, 'auto' (padrao) para criar um, ou null;
 *   modal: o teclado vale sempre (tela cheia); sem ele, so com o foco dentro do editor
 */
export function criarEditor(raiz, o = {}) {
  const doc = raiz.ownerDocument;
  const T = {
    ...TEXTOS_EDITOR, ...(o.T || {}),
    cores: { ...TEXTOS_EDITOR.cores, ...((o.T && o.T.cores) || {}) },
    bases: { ...TEXTOS_EDITOR.bases, ...((o.T && o.T.bases) || {}) },
  };
  const paleta = o.paleta || PALETA;
  const bases = o.bases || BASES;
  const nivel = Math.max(1, Math.min(NIVEIS.length, o.nivel || 1));
  const prontas = o.prontas || [];
  const objeto = o.objeto || 'classico';
  const ini = o.inicial || {};

  // ---- estado
  let px = decodificar(ini.px) || imagemVazia();
  let modo = ini.m === 1 ? 1 : 0;
  let base = Math.max(0, Math.min(bases.length - 1, ini.b | 0));
  let escala = ini.e === undefined ? 1 : Math.max(0, Math.min(2, ini.e | 0));
  let cor = 1;
  let ferramenta = 'pincel';
  let espelho = false;
  let guias = true;
  /** @type {Array<{ px: Uint8Array, m: number, b: number, e: number }>} */
  let desfeitos = [];
  /** @type {Array<{ px: Uint8Array, m: number, b: number, e: number }>} */
  let refeitos = [];
  let salvoChave = chave();
  let vivo = true;

  function chave() { return `${modo}|${base}|${escala}|${codificar(px)}`; }
  const estado = () => ({ px: px.slice(), m: modo, b: base, e: escala });
  function lembrar() {
    desfeitos.push(estado());
    if (desfeitos.length > PILHA) desfeitos.shift();
    refeitos = [];
  }
  function voltarPara(e) {
    px = e.px.slice();
    modo = e.m;
    base = e.b;
    escala = e.e;
  }

  // ---- DOM
  const el = doc.createElement('div');
  el.className = 'edSkin';
  el.dataset.orient = 'retrato';
  const titulo = o.nomeNivel ? `${T.nivel.replace('{n}', String(nivel))} · ${o.nomeNivel}` : T.nivel.replace('{n}', String(nivel));
  const corBase = (i) => hexDaMistura(i === 0 || !bases[i] ? NIVEIS[nivel - 1].pig : bases[i]);
  el.innerHTML = `
    <header class="edTopo">
      <button type="button" class="edBtn edRedondo" data-acao="fechar" aria-label="${T.fechar}" title="${T.fechar} (Esc)">${svg('fechar')}</button>
      <h2>${T.titulo}<small>${titulo}</small></h2>
      <span class="edSalvo" aria-live="polite"></span>
      <button type="button" class="edBtn edForte" data-acao="salvar" title="${T.salvar} (Enter)">${T.salvar}</button>
    </header>
    <div class="edCorpo">
      <div class="edBloco edGradeArea"><canvas class="edGrade" tabindex="0" role="img" aria-label="${T.grade}"></canvas></div>
      <div class="edBloco edPreviaArea">
        <canvas class="edPalco" aria-label="${T.previa}"></canvas>
        <div class="edOpcoes">
          <div class="edGrupo" role="group" aria-label="${T.modo}">
            <button type="button" class="edBtn edChip" data-modo="0">${T.ladrilho}</button>
            <button type="button" class="edBtn edChip" data-modo="1">${T.estampa}</button>
          </div>
          <div class="edGrupo edTamanho" role="group" aria-label="${T.tamanho}">
            <span class="edRotulo">${T.tamanho}</span>
            ${['P', 'M', 'G'].map((t, i) => `<button type="button" class="edBtn edChip edMini" data-escala="${i}">${T[t]}</button>`).join('')}
          </div>
          <p class="edDica"></p>
        </div>
      </div>
      <div class="edBloco edFerramentas" role="toolbar" aria-label="${T.pincel}">
        ${['pincel', 'borracha', 'balde', 'contaGotas'].map((f) => `<button type="button" class="edBtn edFerr" data-ferr="${f}" aria-label="${T[f]}" title="${T[f]} (${{ pincel: 'B', borracha: 'E', balde: 'G', contaGotas: 'I' }[f]})">${svg(f)}</button>`).join('')}
        <button type="button" class="edBtn edFerr" data-alt="espelho" aria-label="${T.espelho}" title="${T.espelho} (M)">${svg('espelho')}</button>
        <button type="button" class="edBtn edFerr" data-alt="guias" aria-label="${T.guias}" title="${T.guias}">${svg('guias')}</button>
        <i class="edSep" aria-hidden="true"></i>
        <button type="button" class="edBtn edFerr" data-acao="desfazer" aria-label="${T.desfazer}" title="${T.desfazer} (Z)">${svg('desfazer')}</button>
        <button type="button" class="edBtn edFerr" data-acao="refazer" aria-label="${T.refazer}" title="${T.refazer} (Shift+Z)">${svg('refazer')}</button>
        <button type="button" class="edBtn edFerr" data-acao="limpar" aria-label="${T.limpar}" title="${T.limpar}">${svg('limpar')}</button>
      </div>
      <div class="edBloco edPaleta" role="radiogroup" aria-label="${T.paleta}">
        ${paleta.map((h, i) => `<button type="button" class="edCor${i ? '' : ' edTransp'}" role="radio" data-cor="${i}" style="--c:${h || corBase(base)}" aria-label="${T.cores[NOMES_PALETA[i]] || i}" title="${T.cores[NOMES_PALETA[i]] || i}${i < 10 ? ` (${i})` : ''}"></button>`).join('')}
      </div>
      <div class="edBloco edBases">
        <span class="edRotulo">${T.corDoCorpo}</span>
        <div class="edLinhaCores" role="radiogroup" aria-label="${T.corDoCorpo}">
          ${bases.map((_, i) => `<button type="button" class="edCor edBase${i ? '' : ' edNivel'}" role="radio" data-base="${i}" style="--c:${corBase(i)}" aria-label="${T.bases[NOMES_BASES[i]] || i}" title="${T.bases[NOMES_BASES[i]] || i}"></button>`).join('')}
        </div>
      </div>
      <div class="edBloco edComecar">
        <span class="edRotulo">${T.comecarDe}</span>
        <div class="edModelos">
          ${MODELOS.map((id) => `<button type="button" class="edBtn edModelo" data-modelo="${id}"><canvas width="16" height="16"></canvas><span>${T['modelo.' + id] || id}</span></button>`).join('')}
          ${prontas.map((p, i) => `<button type="button" class="edBtn edModelo" data-pronta="${i}"><canvas width="16" height="16"></canvas><span>${p.nome}</span></button>`).join('')}
        </div>
      </div>
    </div>
    <div class="edAviso" hidden role="alertdialog" aria-modal="true">
      <div class="edCaixa"><p>${T.descartar}</p>
        <div class="edGrupo"><button type="button" class="edBtn" data-acao="descartar">${T.sim}</button><button type="button" class="edBtn edForte" data-acao="continuar">${T.nao}</button></div>
      </div>
    </div>`;
  raiz.appendChild(el);
  const $ = (s) => /** @type {HTMLElement} */ (el.querySelector(s));
  const $$ = (s) => /** @type {HTMLElement[]} */ ([...el.querySelectorAll(s)]);
  const grade = /** @type {HTMLCanvasElement} */ ($('.edGrade'));
  const g = /** @type {CanvasRenderingContext2D} */ (grade.getContext('2d'));
  const cvPalco = /** @type {HTMLCanvasElement} */ ($('.edPalco'));
  const aviso = $('.edAviso');

  // ---- previa (palco)
  let palco = o.palco === undefined || o.palco === 'auto' ? criarPalco(cvPalco, { tamanho: 120 }) : o.palco;
  const palcoProprio = palco && (o.palco === undefined || o.palco === 'auto');
  if (palco && !palcoProprio && palco.trocarSaida) palco.trocarSaida(cvPalco);
  if (!palco) cvPalco.hidden = true;
  let previaSuja = true;

  // ---- desenho da grade
  function corDe(i) { return i ? paleta[i] : corBase(base); }
  function desenharGrade() {
    const W = grade.width;
    if (W < 2) return;
    const MARGEM = margemDe(modo);
    const TOT = LADO + 2 * MARGEM;
    const cs = W / TOT;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = PAPEL;
    g.fillRect(0, 0, W, W);
    const fundo = corBase(base);
    for (let yy = 0; yy < TOT; yy++) {
      for (let xx = 0; xx < TOT; xx++) {
        const x = xx - MARGEM;
        const y = yy - MARGEM;
        const dentro = x >= 0 && y >= 0 && x < LADO && y < LADO;
        if (!dentro && modo === 1) continue;
        const i = px[(((y % LADO) + LADO) % LADO) * LADO + (((x % LADO) + LADO) % LADO)];
        g.globalAlpha = dentro ? 1 : 0.32;
        g.fillStyle = i ? paleta[i] : fundo;
        g.fillRect(Math.floor(xx * cs), Math.floor(yy * cs), Math.ceil(cs) + 1, Math.ceil(cs) + 1);
        if (!i && dentro && (x + y) % 2) {
          // transparente: xadrez fraquinho por cima da cor do slime
          g.fillStyle = 'rgba(255, 255, 255, 0.09)';
          g.fillRect(Math.floor(xx * cs), Math.floor(yy * cs), Math.ceil(cs) + 1, Math.ceil(cs) + 1);
        }
      }
    }
    g.globalAlpha = 1;
    // linhas da grade (a cada 4 mais forte) e a borda do desenho
    const x0 = MARGEM * cs;
    const lado = LADO * cs;
    for (let k = 1; k < LADO; k++) {
      g.fillStyle = k % 4 ? 'rgba(23, 22, 28, 0.13)' : 'rgba(23, 22, 28, 0.3)';
      g.fillRect(x0 + k * cs - 0.5, x0, 1, lado);
      g.fillRect(x0, x0 + k * cs - 0.5, lado, 1);
    }
    g.lineWidth = Math.max(2, cs * 0.12);
    g.strokeStyle = TINTA;
    g.strokeRect(x0, x0, lado, lado);
    if (guias && modo === 1) {
      // estampa: o corpo, a area segura (85%) e a silhueta dos olhos
      g.save();
      g.translate(x0, x0);
      g.scale(cs, cs);
      g.lineWidth = 2 / cs;
      g.setLineDash([0.45, 0.3]);
      g.strokeStyle = 'rgba(23, 22, 28, 0.7)';
      g.beginPath();
      g.arc(8, 8, R_CORPO, 0, Math.PI * 2);
      g.stroke();
      g.strokeStyle = 'rgba(63, 191, 181, 0.95)';
      g.setLineDash([0.2, 0.25]);
      g.beginPath();
      g.arc(8, 8, R_CORPO * 0.85, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
      for (const [ex, ey] of OLHOS) {
        g.fillStyle = 'rgba(255, 255, 255, 0.55)';
        g.strokeStyle = 'rgba(23, 22, 28, 0.55)';
        g.beginPath();
        g.ellipse(ex, ey, R_OLHO, R_OLHO * 1.08, 0, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        g.fillStyle = 'rgba(23, 22, 28, 0.45)';
        g.beginPath();
        g.arc(ex, ey + R_OLHO * 0.25, R_OLHO * 0.45, 0, Math.PI * 2);
        g.fill();
      }
      g.strokeStyle = 'rgba(23, 22, 28, 0.5)';
      g.beginPath();
      g.arc(8, 8 + 0.06 * R_CORPO, 0.12 * R_CORPO, Math.PI * 0.15, Math.PI * 0.85);
      g.stroke();
      g.restore();
    }
    if (mira && ativo === null) {
      g.lineWidth = Math.max(2, cs * 0.14);
      g.strokeStyle = ferramenta === 'borracha' ? '#ffffff' : TINTA;
      g.strokeRect((mira[0] + MARGEM) * cs + 1, (mira[1] + MARGEM) * cs + 1, cs - 2, cs - 2);
    }
  }

  // ---- pintar
  /** @param {number} x @param {number} y coordenadas da grade estendida (podem sair de 0..15) */
  function celula(x, y) {
    if (modo === 1) return x >= 0 && y >= 0 && x < LADO && y < LADO ? [x, y] : null;
    return [((x % LADO) + LADO) % LADO, ((y % LADO) + LADO) % LADO];
  }
  function pintar(x, y) {
    const c = celula(x, y);
    if (!c) return false;
    const v = ferramenta === 'borracha' ? 0 : cor;
    let mudou = false;
    for (const xx of espelho ? [c[0], LADO - 1 - c[0]] : [c[0]]) {
      const k = c[1] * LADO + xx;
      if (px[k] !== v) { px[k] = v; mudou = true; }
    }
    return mudou;
  }
  function linha(x0, y0, x1, y1, f) {
    const dx = Math.abs(x1 - x0);
    const sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0);
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let n = 0; n < 200; n++) {
      f(x0, y0);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  /** Balde: vizinhanca 4; no ladrilho da a volta pelas bordas. */
  function balde(x, y) {
    const c = celula(x, y);
    if (!c) return false;
    const alvo = px[c[1] * LADO + c[0]];
    const v = cor;
    if (alvo === v) return false;
    const fila = [c];
    const visto = new Uint8Array(LADO * LADO);
    const preencher = (xx, yy) => {
      const k = yy * LADO + xx;
      if (visto[k] || px[k] !== alvo) return;
      visto[k] = 1;
      px[k] = v;
      fila.push([xx, yy]);
    };
    visto[c[1] * LADO + c[0]] = 1;
    px[c[1] * LADO + c[0]] = v;
    while (fila.length) {
      const [xx, yy] = /** @type {number[]} */ (fila.pop());
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        let nx = xx + dx;
        let ny = yy + dy;
        if (modo === 0) { nx = (nx + LADO) % LADO; ny = (ny + LADO) % LADO; } else if (nx < 0 || ny < 0 || nx >= LADO || ny >= LADO) continue;
        preencher(nx, ny);
      }
    }
    return true;
  }

  // ---- ponteiro (so o primeiro pinta)
  /** @type {number|null} */
  let ativo = null;
  /** @type {number[]|null} */
  let ultimo = null;
  /** @type {number[]|null} */
  let mira = null;
  let antesDoTraco = null;
  let tracoMudou = false;
  function celulaDoEvento(e) {
    const r = grade.getBoundingClientRect();
    if (r.width < 1) return null;
    const MARGEM = margemDe(modo);
    const TOT = LADO + 2 * MARGEM;
    return [Math.floor(((e.clientX - r.left) / r.width) * TOT) - MARGEM, Math.floor(((e.clientY - r.top) / r.height) * TOT) - MARGEM];
  }
  grade.addEventListener('pointerdown', (e) => {
    if (ativo !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const c = celulaDoEvento(e);
    if (!c) return;
    e.preventDefault();
    grade.focus({ preventScroll: true });
    if (ferramenta === 'contaGotas') {
      const cc = celula(c[0], c[1]);
      if (cc) { escolherCor(px[cc[1] * LADO + cc[0]]); usar('pincel'); }
      return;
    }
    if (ferramenta === 'balde') {
      const antes = estado();
      if (balde(c[0], c[1])) { desfeitos.push(antes); if (desfeitos.length > PILHA) desfeitos.shift(); refeitos = []; mudou(); }
      return;
    }
    ativo = e.pointerId;
    try { grade.setPointerCapture(e.pointerId); } catch { /* sem captura */ }
    antesDoTraco = estado();
    tracoMudou = pintar(c[0], c[1]);
    ultimo = c;
    if (tracoMudou) mudou();
  });
  grade.addEventListener('pointermove', (e) => {
    const c = celulaDoEvento(e);
    if (ativo === null) {
      if (e.pointerType === 'mouse') { mira = c; desenharGrade(); }
      return;
    }
    if (e.pointerId !== ativo || !c || !ultimo) return;
    if (c[0] === ultimo[0] && c[1] === ultimo[1]) return;
    let m = false;
    linha(ultimo[0], ultimo[1], c[0], c[1], (x, y) => { if (pintar(x, y)) m = true; });
    ultimo = c;
    if (m) { tracoMudou = true; mudou(); }
  });
  const fimTraco = (e) => {
    if (e.pointerId !== ativo) return;
    ativo = null;
    ultimo = null;
    if (tracoMudou && antesDoTraco) {
      desfeitos.push(antesDoTraco);
      if (desfeitos.length > PILHA) desfeitos.shift();
      refeitos = [];
    }
    antesDoTraco = null;
    tracoMudou = false;
    atualizarBotoes();
  };
  grade.addEventListener('pointerup', fimTraco);
  grade.addEventListener('pointercancel', fimTraco);
  grade.addEventListener('pointerleave', () => { if (mira) { mira = null; desenharGrade(); } });

  // ---- botoes
  function escolherCor(i) {
    cor = Math.max(0, Math.min(paleta.length - 1, i | 0));
    if (ferramenta === 'borracha' || ferramenta === 'contaGotas') ferramenta = 'pincel';
    atualizarBotoes();
  }
  function usar(f) { ferramenta = f; atualizarBotoes(); }
  function desfazer() {
    const e = desfeitos.pop();
    if (!e) return;
    refeitos.push(estado());
    voltarPara(e);
    mudou();
  }
  function refazer() {
    const e = refeitos.pop();
    if (!e) return;
    desfeitos.push(estado());
    voltarPara(e);
    mudou();
  }
  function limpar() {
    if (!px.some((v) => v)) return;
    lembrar();
    px.fill(0);
    mudou();
  }
  function comecarDe(nova, m) {
    lembrar();
    px = nova;
    if (m === 0 || m === 1) modo = m;
    mudou();
  }
  el.addEventListener('click', (ev) => {
    const b = /** @type {HTMLElement} */ (ev.target).closest('button');
    if (!b || !el.contains(b)) return;
    const d = b.dataset;
    if (d.ferr) usar(d.ferr);
    else if (d.alt === 'espelho') { espelho = !espelho; atualizarBotoes(); }
    else if (d.alt === 'guias') { guias = !guias; atualizarBotoes(); desenharGrade(); }
    else if (d.cor !== undefined) escolherCor(Number(d.cor));
    else if (d.base !== undefined) { if (Number(d.base) !== base) { lembrar(); base = Number(d.base); mudou(); } }
    else if (d.modo !== undefined) { if (Number(d.modo) !== modo) { lembrar(); modo = Number(d.modo); mudou(); } }
    else if (d.escala !== undefined) { if (Number(d.escala) !== escala) { lembrar(); escala = Number(d.escala); mudou(); } }
    else if (d.modelo) comecarDe(modelo(d.modelo, modo, cor || 2));
    else if (d.pronta !== undefined) {
      const p = prontas[Number(d.pronta)];
      const img = p && (p.px instanceof Uint8Array ? p.px.slice() : pxDeLinhas(/** @type {string[]} */ (p.px)));
      if (img) comecarDe(img, p.modo);
    } else if (d.acao === 'desfazer') desfazer();
    else if (d.acao === 'refazer') refazer();
    else if (d.acao === 'limpar') limpar();
    else if (d.acao === 'salvar') salvar();
    else if (d.acao === 'fechar') pedirFechar();
    else if (d.acao === 'descartar') { aviso.hidden = true; if (o.aoCancelar) o.aoCancelar(); }
    else if (d.acao === 'continuar') { aviso.hidden = true; grade.focus({ preventScroll: true }); }
  });

  function atualizarBotoes() {
    for (const b of $$('[data-ferr]')) b.setAttribute('aria-pressed', String(b.dataset.ferr === ferramenta));
    $('[data-alt="espelho"]').setAttribute('aria-pressed', String(espelho));
    $('[data-alt="guias"]').setAttribute('aria-pressed', String(guias));
    for (const b of $$('[data-cor]')) b.setAttribute('aria-checked', String(Number(b.dataset.cor) === cor && ferramenta !== 'borracha'));
    for (const b of $$('[data-base]')) b.setAttribute('aria-checked', String(Number(b.dataset.base) === base));
    for (const b of $$('[data-modo]')) b.setAttribute('aria-pressed', String(Number(b.dataset.modo) === modo));
    for (const b of $$('[data-escala]')) {
      b.setAttribute('aria-pressed', String(Number(b.dataset.escala) === escala));
      /** @type {HTMLButtonElement} */ (b).disabled = modo === 1;
    }
    /** @type {HTMLButtonElement} */ ($('[data-acao="desfazer"]')).disabled = !desfeitos.length;
    /** @type {HTMLButtonElement} */ ($('[data-acao="refazer"]')).disabled = !refeitos.length;
    $('.edTransp').style.setProperty('--c', corBase(base));
    $('.edDica').textContent = modo === 1 ? T.dicaEstampa : T.dicaLadrilho;
    el.dataset.modo = String(modo);
    el.classList.toggle('edSujo', sujo());
  }

  function miniaturas() {
    const desenharMini = (cv, img) => {
      const c = /** @type {CanvasRenderingContext2D} */ (cv.getContext('2d'));
      const fundo = corBase(base);
      for (let k = 0; k < 256; k++) {
        c.fillStyle = img[k] ? paleta[img[k]] : fundo;
        c.fillRect(k % 16, k >> 4, 1, 1);
      }
    };
    for (const b of $$('[data-modelo]')) desenharMini(b.querySelector('canvas'), modelo(b.dataset.modelo || 'vazio', modo, cor || 2));
    for (const b of $$('[data-pronta]')) {
      const p = prontas[Number(b.dataset.pronta)];
      const img = p.px instanceof Uint8Array ? p.px : pxDeLinhas(/** @type {string[]} */ (p.px));
      if (img) desenharMini(b.querySelector('canvas'), img);
    }
  }

  function mudou() {
    previaSuja = true;
    desenharGrade();
    atualizarBotoes();
    miniaturas();
    $('.edSalvo').textContent = '';
  }

  function sujo() { return chave() !== salvoChave; }

  function valor() { return { m: modo, b: base, e: escala, px: codificar(px) }; }

  function salvar() {
    const v = valor();
    salvoChave = chave();
    $('.edSalvo').textContent = T.salvo;
    atualizarBotoes();
    if (o.aoSalvar) o.aoSalvar(v);
  }

  function pedirFechar() {
    if (sujo()) {
      aviso.hidden = false;
      /** @type {HTMLElement} */ (aviso.querySelector('[data-acao="continuar"]')).focus();
    } else if (o.aoCancelar) o.aoCancelar();
  }

  // ---- teclado minimo
  function tecla(e) {
    if (!vivo || el.hidden) return;
    if (!o.modal && !el.contains(doc.activeElement)) return;
    const alvo = /** @type {HTMLElement} */ (e.target);
    if (alvo && /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName)) return;
    if (!aviso.hidden) {
      if (e.key === 'Escape') { aviso.hidden = true; e.preventDefault(); }
      return;
    }
    const k = e.key.toLowerCase();
    const ctrl = e.ctrlKey || e.metaKey;
    let usou = true;
    if (k === 'escape') pedirFechar();
    else if (k === 'enter' && !(alvo && alvo.tagName === 'BUTTON')) salvar();
    else if (k === 'z' && (e.shiftKey)) refazer();
    else if (k === 'z') desfazer();
    else if (k === 'y' && ctrl) refazer();
    else if (ctrl) usou = false;
    else if (k === 'b') usar('pincel');
    else if (k === 'e') usar('borracha');
    else if (k === 'g') usar('balde');
    else if (k === 'i') usar('contaGotas');
    else if (k === 'm') { espelho = !espelho; atualizarBotoes(); }
    else if (/^[0-9]$/.test(k)) escolherCor(Number(k));
    else usou = false;
    if (usou) { e.preventDefault(); e.stopPropagation(); }
  }
  doc.addEventListener('keydown', tecla, true);

  // ---- tamanho (retrato e paisagem pelo espaco da raiz)
  function medir() {
    const r = raiz.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    const paisagem = r.width > r.height * 1.05 && r.width >= 560;
    el.dataset.orient = paisagem ? 'paisagem' : 'retrato';
    const topo = $('.edTopo').getBoundingClientRect().height || 56;
    // largura util do corpo (sem a barra de rolagem)
    const larg = Math.min(r.width, $('.edCorpo').clientWidth || r.width);
    const ladoCss = Math.floor(paisagem ? Math.min(r.height - topo - 24, larg * 0.55) : Math.min(larg - 24, (r.height - topo) * 0.52, 560));
    el.style.setProperty('--edLado', Math.max(160, ladoCss) + 'px');
    const dpr = Math.min(2, (doc.defaultView && doc.defaultView.devicePixelRatio) || 1);
    const W = Math.max(2, Math.round(Math.max(160, ladoCss) * dpr));
    if (grade.width !== W) { grade.width = W; grade.height = W; }
    if (palco) {
      const t = Math.max(64, Math.round(cvPalco.getBoundingClientRect().width || 120));
      palco.tamanho = t;
      previaSuja = true;
    }
    desenharGrade();
  }
  const obs = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => medir()) : null;
  if (obs) obs.observe(raiz);

  // ---- laco da previa
  let antes = 0;
  let raf = 0;
  function quadro(t) {
    raf = 0;
    if (!vivo) return;
    if (palco) {
      if (previaSuja) { palco.montar(nivel, aparencia(nivel, 'minha', valor()), objeto); previaSuja = false; }
      const dt = antes ? Math.min(0.05, (t - antes) / 1000) : 0;
      antes = t;
      palco.passo(dt);
      palco.desenhar();
    }
    raf = requestAnimationFrame(quadro);
  }

  medir();
  mudou();
  salvoChave = chave();
  atualizarBotoes();
  raf = requestAnimationFrame(quadro);

  return {
    elemento: el,
    /** A "Minha" atual ({ m, b, e, px }), como o perfil guarda. */
    valor,
    /** As 16 linhas hex da imagem atual ("Copiar codigo"). */
    linhas: () => linhasDePx(px),
    /** Troca o desenho (sem desfazer): ao abrir com outra "Minha". @param {Minha} mm */
    definir(mm) {
      px = decodificar(mm && mm.px) || imagemVazia();
      modo = mm && mm.m === 1 ? 1 : 0;
      base = Math.max(0, Math.min(bases.length - 1, (mm && mm.b) | 0));
      escala = !mm || mm.e === undefined ? 1 : Math.max(0, Math.min(2, mm.e | 0));
      desfeitos = [];
      refeitos = [];
      mudou();
      salvoChave = chave();
      atualizarBotoes();
    },
    get sujo() { return sujo(); },
    /** Esc do jogo: pede para descartar se mudou. */
    pedirFechar,
    medir,
    destruir() {
      if (!vivo) return;
      vivo = false;
      if (raf) cancelAnimationFrame(raf);
      doc.removeEventListener('keydown', tecla, true);
      if (obs) obs.disconnect();
      if (palcoProprio && palco) palco.liberar();
      palco = null;
      el.remove();
    },
  };
}

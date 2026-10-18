// Cacada do slime atravessado na parede (print do iPhone de 2026-10-18): o sem fim com o bot,
// quadro a quadro, conta as particulas do lado de fora do pote (abaixo da borda) com um teste
// proprio (poligono das paredes), independente do src/jogo/pote.js. Imprime cada episodio que dura
// mais de 0,3 s, com o contexto (evento da agenda, fusoes, reforco), e quantas vezes a rede de
// seguranca devolveu alguem (evento 'volta'). Opcionalmente salva e restaura no meio.
// Uso: node tools/vazamento.mjs [--sementes=3] [--min=5] [--cada=0.9] [--restaurar=240] [--src=caminho/src]
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v === undefined ? '1' : v];
}));
const SEMENTES = Number(args.sementes || 3);
const MIN = Number(args.min || 5);
const CADA = Number(args.cada || 0.9);
const RESTAURAR = Number(args.restaurar || 0);
const SRC = path.resolve(args.src || path.join(import.meta.dirname, '..', 'src'));
const { criarModo } = await import(pathToFileURL(path.join(SRC, 'jogo', 'modos', 'merge.js')).href);

/** Eixo das paredes do pote (polilinha do topo esquerdo ao direito, com o tremor). */
function contorno(modo) {
  const J = modo.S.jogadores[0];
  const ps = modo.S.mundo.paredes;
  const pts = [];
  const n = J.pote.cesto.linhas[0].length - 1;
  for (let k = 0; k < n; k++) {
    const p = ps[J.pote.idxParedes[k]];
    if (!k) pts.push([p.ax + (p.tx || 0), p.ay + (p.ty || 0)]);
    pts.push([p.bx + (p.tx || 0), p.by + (p.ty || 0)]);
  }
  return pts;
}

/** Ponto dentro do poligono fechado (raio para a direita). */
function dentro(pts, x, y) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/** Particulas fora do pote por slime (so as abaixo da borda mais baixa). @returns {Map<any, number>} */
export function foraPorSlime(modo) {
  const pts = contorno(modo);
  const borda = Math.min(pts[0][1], pts[pts.length - 1][1]);
  const m = modo.S.mundo;
  const out = new Map();
  for (let i = 0; i < m.n; i++) {
    if (m.y[i] >= borda) continue;
    const s = m.slimes[m.sl[i]];
    if (!s.ativo || s.preso) continue;
    if (!dentro(pts, m.x[i], m.y[i])) out.set(s, (out.get(s) || 0) + 1);
  }
  return out;
}

function contexto(modo) {
  const S = modo.S;
  const ev = S.extra.agenda && S.extra.agenda.ev;
  const P = S.jogadores[0].pote;
  return [
    ev ? `evento ${ev.id}/${ev.fase}` : 'sem evento',
    S.fusoes ? `fusoes ${S.fusoes.map((F) => `${F.fase}:${F.k}`).join(',') || '-'}` : '',
    P.tremorDur > 0 ? 'tremor' : '', P.chacoalhar > 0 ? 'chacoalhar' : '', P.alargado ? 'alargado' : '',
  ].filter(Boolean).join(' ');
}

let episodios = 0;
let voltas = 0;
for (let sem = 1; sem <= SEMENTES; sem++) {
  let modo = criarModo({ semente: 10 + sem, salvo: {}, toque: true });
  const tempoFora = new Map();
  let t = 0;
  let restaurou = false;
  for (let f = 0; f < MIN * 3600; f++) {
    const seg = f / 60;
    if (RESTAURAR && !restaurou && seg >= RESTAURAR) {
      restaurou = true;
      const salvo = JSON.parse(JSON.stringify(modo.salvar()));
      modo = criarModo({ semente: 10 + sem, salvo, toque: true });
      tempoFora.clear();
      console.log(`semente ${10 + sem}: restaurou aos ${seg.toFixed(0)} s`);
    }
    t += 1 / 60;
    if (t >= CADA) { t = 0; modo.bot(); }
    modo.passo(1 / 60);
    for (const e of modo.eventos.splice(0)) if (e.tipo === 'volta' || e.tipo === 'fora') voltas++;
    const fora = foraPorSlime(modo);
    for (const s of [...tempoFora.keys()]) if (!fora.has(s)) tempoFora.delete(s);
    for (const [s, q] of fora) {
      const tf = (tempoFora.get(s) || 0) + 1 / 60;
      tempoFora.set(s, tf);
      if (Math.abs(tf - 0.3) < 1 / 120) {
        episodios++;
        console.log(`semente ${10 + sem} ${seg.toFixed(1)} s: nivel ${s.nivel} com ${q} particulas fora em (${s.cx.toFixed(2)}, ${s.cy.toFixed(2)}) | ${contexto(modo)}`);
      }
    }
  }
}
console.log(`\n${SEMENTES} sementes x ${MIN} min: ${episodios} episodios de mais de 0,3 s com particulas fora; rede de seguranca: ${voltas}`);

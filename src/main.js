// Liga tudo: SDK da Poki, cena, laco, entrada, HUD, menu, perfil (metajogo) e o modo de jogo.
// Unico modulo que importa core/poki.js (vigiado por test/estilo.test.js).
// A build abre direto no Merge Lab sem fim; o menu (pausa) troca para o Desafio do dia, o
// Duelo contra a CPU e 2 jogadores. Os prototipos da avaliacao (Croma, Loja, Molde, lab) so
// abrem por ?modelo= em localhost ou pelas paginas do hub (window.__slimeModelo) e nao entram
// na build da Poki (tools/empacotar.mjs tira as linhas marcadas com "prototipo").

import { poki } from './core/poki.js';
import { lerDepuracao } from './core/depuracao.js';
import { criarArmazem } from './core/armazenamento.js';
import { criarAudio } from './core/audio.js';
import { criarLaco, PASSO } from './core/laco.js';
import { criarEntrada } from './core/entrada.js';
import { criarCena } from './render/cena.js';
import { criarHud } from './ui/hud.js';
import { criarMenu } from './ui/menu.js';
import { criarPerfil, gotasDaPartida } from './jogo/perfil.js';
import { escolherIdioma, textos, formatar, numero } from './i18n/textos.js';

const MODULOS = {
  semfim: () => import('./jogo/modos/merge.js'),
  desafio: () => import('./jogo/modos/merge.js'),
  duelo: () => import('./jogo/modos/duelo.js'),
  duelo2: () => import('./jogo/modos/duelo.js'),
  lab: () => import('./jogo/modos/lab.js'), // prototipo
  2: () => import('./jogo/modos/croma.js'), // prototipo
  3: () => import('./jogo/modos/loja.js'), // prototipo
  4: () => import('./jogo/modos/molde.js'), // prototipo
};
/** ?modelo=N dos prototipos que viraram modos da build */
const DO_MODELO = { 1: 'semfim', 5: 'duelo' };

const dep = lerDepuracao();
const armazem = criarArmazem();
const audio = criarAudio();
const idioma = escolherIdioma(dep.lang);
const T = textos(idioma);
const $ = (id) => /** @type {HTMLElement} */ (document.getElementById(id));
const fmtNumero = (n) => numero(n, idioma);
const toque = window.matchMedia ? window.matchMedia('(pointer: coarse)').matches : false;

const J = {
  modo: /** @type {any} */ (null),
  chave: '', // semfim | desafio | duelo | duelo2 | prototipo (lab, 2, 3, 4)
  cesto: '', // cesto com que o modo foi criado (trocar na loja vale na proxima partida)
  estado: 'carregando', // carregando | jogando | pausa | fim | menuFim | anuncio | trocando
  t: 0,
  tocou: false,
  carregou: false,
  tempoJogo: 0,
  minutos: 0,
  pagos: 0, // pontos da partida ja pagos em gotas (reviver nao paga duas vezes)
  ganho: 0, // gotas mostradas no fim
  dobravel: 0, // parte do ganho que o video dobra (sem os premios de desafio e missoes)
  meta: 0, // desafio do dia: pontos da meta
  premiado: false, // desafio do dia: premio de hoje ja pago
};

// ------------------------------------------------------------------ perfil (uma moeda: gotas)
/** Data local AAAA-MM-DD: a sequencia e as missoes viram a meia-noite do jogador. */
function dataLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const perfil = criarPerfil(armazem.ler('perfil', {}) || {}, dataLocal(new Date()));
perfil.marcarVisto((armazem.ler('modo1', {}) || {}).visto || 1);
let perfilSujo = false;
function gravarPerfil() {
  armazem.gravar('perfil', perfil.dados());
  perfilSujo = false;
}

// o modelo vem do ?modelo= (localhost) ou da pagina de avaliacao (jogo-N.html define
// window.__slimeModelo antes deste script); na Poki nao ha nenhum e abre o sem fim
const pedido = String(dep.modelo || /** @type {any} */ (globalThis).__slimeModelo || '');
const inicial = DO_MODELO[pedido] || (pedido in MODULOS ? pedido : 'semfim');
const prototipo = !['semfim', 'desafio', 'duelo', 'duelo2'].includes(inicial);
if (prototipo) document.body.classList.add('prototipo');

// visual: parametro local > pagina do hub > Estudio de visuais (so no hub) > o que o jogador
// equipou na loja (padrao: bequer, jardim, classico, escolhidos pelo usuario em 2026-10-14)
const visualGlobal = /** @type {any} */ (globalThis).__slimeVisual || {};
const visualEstudio = pedido ? armazem.ler('visual', {}) || {} : {};
function visualAtual() {
  const eq = perfil.equipado;
  return {
    cesto: dep.cesto || visualGlobal.cesto || visualEstudio.cesto || eq.cesto,
    cenario: dep.cenario || visualGlobal.cenario || visualEstudio.cenario || eq.cenario,
    objeto: dep.objeto || visualGlobal.objeto || visualEstudio.objeto || eq.objeto,
  };
}
const visual = visualAtual();
const cena = criarCena({ fundo: /** @type {any} */ ($('cFundo')), slime: /** @type {any} */ ($('cSlime')), topo: /** @type {any} */ ($('cTopo')), area: $('area') }, { forcar2d: dep.render === '2d', raio: dep.raio, limiar: dep.limiar, zoom: dep.zoom, cenario: visual.cenario, objeto: visual.objeto, cesto: visual.cesto });
const hud = criarHud(document, T);
const menu = criarMenu(document, T, idioma, {
  modo: (chave) => escolherModo(chave),
  comprar(grupo, id) {
    if (!perfil.comprar(grupo, id)) return;
    gravarPerfil();
    audio.yes?.();
    aplicarVisual(grupo);
    atualizarMenu();
  },
  equipar(grupo, id) {
    if (!perfil.equipar(grupo, id)) return;
    gravarPerfil();
    aplicarVisual(grupo);
    atualizarMenu();
  },
});

function orientar() {
  const paisagem = window.innerWidth > window.innerHeight * 1.15;
  document.body.dataset.orient = paisagem ? 'paisagem' : 'retrato';
}
orientar();
if (dep.semHud) document.body.classList.add('sem-hud');
window.addEventListener('resize', orientar);
window.addEventListener('orientationchange', orientar);

/** Toque de jogo: abre o gameplay da Poki e marca o primeiro da sessao. */
function tocar() {
  if (J.estado !== 'jogando') return;
  poki.gameplayStart();
  if (!J.tocou) { J.tocou = true; poki.measure('game', 'toque', 'first'); }
}

// ------------------------------------------------------------------ entrada
/** 2 jogadores no toque: cada dedo fica com o pote do lado em que encostou */
const donoDoDedo = new Map();
criarEntrada(window, {
  primeiroGesto: () => audio.iniciar(),
  multi: () => J.chave === 'duelo2',
  ponteiro(fase, px, py, e) {
    if (J.estado !== 'jogando' || !J.modo) return;
    // o toque abre o gameplay mesmo antes da primeira camera (rAF parado, aba nascendo)
    if (fase === 'baixo') tocar();
    const p = cena.paraMundo(px, py);
    if (!p) return;
    let quem = 0;
    if (J.chave === 'duelo2') {
      if (fase === 'baixo') donoDoDedo.set(e.pointerId, p[0] < 0 ? 0 : 1);
      quem = donoDoDedo.has(e.pointerId) ? donoDoDedo.get(e.pointerId) : p[0] < 0 ? 0 : 1;
      if (fase === 'cima') donoDoDedo.delete(e.pointerId);
    }
    J.modo.apontar(p[0], p[1], fase, quem);
  },
  tecla(codigo, baixo) {
    if (baixo && (codigo === 'Escape' || codigo === 'KeyP')) { alternarPausa(); return; }
    if (J.estado !== 'jogando' || !J.modo) return;
    if (baixo) tocar();
    J.modo.tecla(codigo, baixo);
  },
});

// ------------------------------------------------------------------ menu
function recordeSemfim() {
  const r = (armazem.ler('modo1', {}) || {}).recorde || 0;
  return J.chave === 'semfim' && J.modo ? Math.max(r, J.modo.hud().recorde || 0) : r;
}

function atualizarMenu() {
  menu.atualizar({
    gotas: perfil.gotas,
    possui: (g, id) => perfil.possui(g, id),
    equipado: perfil.equipado,
    desafio: perfil.desafio(),
    liga: perfil.liga,
    recorde: recordeSemfim(),
    missoes: perfil.missoes(),
    sequencia: perfil.sequencia,
    hoje: perfil.hoje,
    modoAtual: J.chave,
  });
}

/** @param {string} [aba] */
function abrirMenu(aba) {
  atualizarMenu();
  menu.aba(aba || 'jogar');
  hud.menu(true, { fim: J.estado === 'menuFim' });
}

function alternarPausa() {
  if (J.estado === 'jogando') {
    J.estado = 'pausa';
    poki.gameplayStop();
    laco.pausar(true);
    salvar();
    abrirMenu();
  } else if (J.estado === 'pausa') {
    continuar();
  } else if (J.estado === 'menuFim') {
    // do menu aberto pelo fim, ESC volta a tela de fim
    hud.menu(false);
    J.estado = 'fim';
    hud.fim(true);
  }
}

function continuar() {
  hud.menu(false);
  J.estado = 'jogando';
  laco.pausar(false);
  if (J.tocou) poki.gameplayStart();
}

/** Um modo do menu: o atual com o jogo pausado so continua; outro troca (com intervalo). */
function escolherModo(chave) {
  if (chave === J.chave && J.estado === 'pausa') { continuar(); return; }
  entrarModo(chave);
}

/** Troca de modo em tempo de execucao: salva o atual, pausa natural (intervalo) e cria o novo. */
async function entrarModo(chave) {
  if (J.estado === 'trocando' || J.estado === 'anuncio') return;
  salvar();
  hud.menu(false);
  hud.fim(false);
  J.estado = 'trocando';
  laco.pausar(true);
  if (!dep.semAnuncio) await anuncio('commercial');
  await carregarModo(chave);
  J.estado = 'jogando';
  laco.pausar(false);
  if (J.tocou) poki.gameplayStart();
  // o que vale neste modo, sem tela no meio
  if (chave === 'desafio') { const d = perfil.desafio(); hud.aviso(`📅 ${T['regra.' + d.id]} · ${formatar(T.meta, { n: fmtNumero(d.meta) })}`); }
  else if (chave === 'duelo') hud.aviso(`⚔️ ${formatar(T.liga, { n: perfil.liga.nivel + 1 })}`);
  else if (chave === 'duelo2' && !toque) hud.aviso(T.teclas2p.split(' · ')[0]);
}

/** Cesto, cenario ou personagem novo: cenario e personagem na hora; cesto na proxima partida. */
function aplicarVisual(grupo) {
  const v = visualAtual();
  if (grupo !== 'cesto') { cena.definirVisual({ [grupo]: v[grupo] }); return; }
  if (v.cesto === J.cesto) return;
  const h = J.modo ? J.modo.hud() : null;
  // sem nada em jogo (pontos 0), o pote troca ja; com partida em andamento, so na proxima
  if (J.estado === 'pausa' && h && !h.pontos && !forcaCesto(J.chave)) carregarModo(J.chave, true);
  else hud.aviso(T.proximaPartida);
}

/** Regras do desafio que trazem o proprio pote. */
function forcaCesto(chave) {
  if (chave !== 'desafio') return '';
  const id = perfil.desafio().id;
  return id === 'aquario' || id === 'xicara' ? id : '';
}

const chaveSalvo = (c) => (c === 'semfim' ? 'modo1' : c === 'duelo' || c === 'duelo2' ? 'modo5' : c === 'desafio' ? 'desafio' : 'modo' + c);

/**
 * Opcoes de criacao do modo (o que o perfil decide: regra, liga, cesto, niveis vistos).
 * @param {string} chave
 * @param {boolean} [nova] descarta a partida salva (pote trocado antes de pontuar)
 */
function configModo(chave, nova = false) {
  const vis = visualAtual();
  // niveis ja vistos: a mao que ensina so aparece para quem nunca fundiu
  const comVisto = (s) => ({ ...s, visto: Math.max(s.visto || 1, perfil.visto), ...(nova ? { partida: null } : {}) });
  const base = { semente: dep.semente || ((Date.now() / 1000) | 0), toque, lang: idioma, vitrine: dep.vitrine, cesto: vis.cesto, visto: perfil.visto };
  if (chave === 'desafio') {
    const d = perfil.desafio();
    const s = armazem.ler('desafio', {}) || {};
    // a partida salva so vale no mesmo dia (a regra muda a meia-noite)
    const salvo = s.dia === perfil.hoje && !dep.semente ? s : {};
    return { ...base, semente: dep.semente || d.semente, salvo: comVisto({ ...salvo, recorde: d.melhor }), regra: d, cesto: forcaCesto(chave) || vis.cesto };
  }
  const salvo = comVisto(dep.semente ? {} : armazem.ler(chaveSalvo(chave), {}) || {});
  if (chave === 'duelo' || chave === 'duelo2') return { ...base, salvo, liga: perfil.liga.nivel, doisJogadores: chave === 'duelo2' };
  // partida salva continua no pote em que comecou
  return { ...base, salvo, cesto: salvo.partida && salvo.cesto ? salvo.cesto : vis.cesto };
}

/** @param {string} chave @param {boolean} [nova] */
async function carregarModo(chave, nova = false) {
  const mod = await MODULOS[chave]();
  const cfg = configModo(chave, nova);
  J.modo = mod.criarModo(cfg);
  J.chave = chave;
  J.cesto = cfg.cesto;
  J.pagos = 0;
  J.meta = cfg.regra ? cfg.regra.meta : 0;
  J.premiado = cfg.regra ? cfg.regra.premiado : false;
  donoDoDedo.clear();
  cena.definirVisual({ cesto: cfg.cesto });
  hud.preparar(J.modo);
  poki.measure('modo', chave, 'start');
}

// ------------------------------------------------------------------ eventos do modo
function tratarEventos() {
  const evs = J.modo.eventos;
  while (evs.length) {
    const e = evs.shift();
    switch (e.tipo) {
      case 'gota':
        audio.ruido(0.08, 700, 1.2, 0.18);
        break;
      case 'pouso':
        audio.ruido(0.06, 260 + 60 * (e.forca || 1), 1, Math.min(0.35, 0.08 + 0.05 * (e.forca || 1)));
        if (e.cor) cena.vfx.respingo(e.x, e.y, e.cor, 4, 3);
        break;
      case 'fusao':
        audio.fusao(e.combo || 1);
        audio.ruido(0.12, 500, 1.5, 0.25, 0, 'lowpass', 200);
        if (e.cor) cena.vfx.respingo(e.x, e.y, e.cor, 8, 5);
        for (let k = 0; k < (e.brilhos || 0); k++) cena.vfx.brilho(e.x + (k % 5 - 2) * 0.3, e.y + ((k * 7) % 5 - 2) * 0.3);
        if (e.texto) cena.vfx.texto(e.x, e.y + 1, T[e.texto] || e.texto, e.corTexto || '#ffffff', e.escala || 1, 'combo');
        break;
      case 'estouro':
        audio.explodir();
        if (e.cor) cena.vfx.respingo(e.x, e.y, e.cor, 18, 8);
        break;
      case 'texto':
        cena.vfx.texto(e.x, e.y, T[e.texto] || e.texto, e.cor || '#ffffff', e.escala || 1, e.grupo || '');
        break;
      case 'nivel':
        poki.measure('level', String(e.n), e.acao);
        break;
      case 'registro':
        registrar(e.chave, e.valor);
        break;
      case 'pedirVideo':
        pedirVideo(e.id);
        break;
      case 'fim':
        terminar(e);
        break;
      case 'intervalo':
        // pausa natural do modo (troca de pedido/fase): o intervalo comercial pode vir aqui
        if (!dep.semAnuncio && poki.sdkPronto) {
          poki.gameplayStop();
          anuncio('commercial').then(() => { if (J.tocou && J.estado === 'jogando') poki.gameplayStart(); });
        }
        break;
      case 'som':
        if (typeof audio[e.nome] === 'function') audio[e.nome]();
        break;
      default:
        break;
    }
  }
}

/** Progresso das missoes do dia e dos niveis descobertos (premios em gotas, com aviso). */
function registrar(chave, valor) {
  const feitas = perfil.registrar(chave, valor);
  perfilSujo = true;
  let ganhou = false;
  for (const m of feitas) { hud.aviso(`${T.missaoFeita} +${m.premio} 💧`); ganhou = true; }
  if (chave === 'nivel') {
    const g = perfil.descobrir(valor);
    if (g) { hud.aviso(`${T.novoNivel} +${g} 💧`); ganhou = true; }
  }
  if (ganhou) { audio.yes?.(); gravarPerfil(); }
}

/** Reforco acabado: o video (rewarded) devolve um. */
async function pedirVideo(id) {
  if (J.estado !== 'jogando' || document.body.classList.contains('sem-anuncio')) return;
  if (!poki.sdkPronto && !dep.local) return;
  const ok = await anuncio('rewarded');
  if (ok && J.modo && J.modo.darPoder) J.modo.darPoder(id);
  if (J.tocou && J.estado === 'jogando') poki.gameplayStart();
}

/** Gotas do fim: pontos da partida (raiz), premio do desafio, liga do duelo. */
function pagarFim(e) {
  const pts = typeof e.pontos === 'number' ? e.pontos : 0;
  let partida = 0;
  let extra = 0;
  if (J.chave === 'duelo2') return { total: 0, dobravel: 0 };
  if (J.chave === 'duelo') {
    if (e.venceu) { partida = perfil.venceuDuelo(); registrar('duelo', 1); }
    else partida = perfil.ganhar(Math.floor(gotasDaPartida(pts) / 2));
  } else {
    // depois de reviver, so a diferenca (os pontos ja pagos nao contam de novo)
    partida = perfil.ganhar(gotasDaPartida(pts) - gotasDaPartida(J.pagos));
    J.pagos = pts;
    if (J.chave === 'desafio') { extra = perfil.fimDesafio(pts); J.premiado = perfil.desafio().premiado; }
  }
  return { total: partida + extra, dobravel: partida };
}

function terminar(e) {
  J.estado = 'fim';
  poki.gameplayStop();
  audio.fim();
  const g = pagarFim(e);
  J.ganho = g.total;
  J.dobravel = g.dobravel;
  salvar();
  gravarPerfil();
  hud.fim(true, { pontos: e.pontos, novo: e.novo, sub: e.sub || '', titulo: e.titulo, reviver: !!e.reviver, gotas: J.ganho, dobrar: J.dobravel > 0 });
}

function salvar() {
  if (perfilSujo) gravarPerfil();
  if (!J.modo || !J.modo.salvar) return;
  const dados = J.modo.salvar();
  if (J.chave === 'desafio') armazem.gravar('desafio', { ...dados, dia: perfil.hoje });
  else armazem.gravar(chaveSalvo(J.chave), J.chave === 'semfim' ? { ...dados, cesto: J.cesto } : dados);
}

async function jogarDeNovo() {
  hud.fim(false);
  hud.menu(false);
  J.estado = 'trocando';
  // pausa natural: o intervalo comercial vem antes de voltar ao gameplay
  if (!dep.semAnuncio) await anuncio('commercial');
  // cesto trocado na loja: a partida nova ja vem com ele
  if (visualAtual().cesto !== J.cesto && !forcaCesto(J.chave)) await carregarModo(J.chave);
  else { J.modo.reiniciar(); J.pagos = 0; }
  J.estado = 'jogando';
  laco.pausar(false);
  if (J.tocou) poki.gameplayStart();
}

async function reviver() {
  const ok = await anuncio('rewarded');
  hud.fim(false);
  J.estado = 'jogando';
  if (ok && J.modo.reviver) J.modo.reviver();
  else { J.modo.reiniciar(); J.pagos = 0; }
  if (J.tocou) poki.gameplayStart();
}

/** Video do fim: dobra as gotas da partida (uma vez). */
async function dobrar() {
  if (!J.dobravel || J.estado !== 'fim') return;
  const ok = await anuncio('rewarded');
  if (!ok || !J.dobravel) return;
  const g = perfil.ganhar(J.dobravel);
  J.dobravel = 0;
  J.ganho += g;
  gravarPerfil();
  audio.yes?.();
  hud.ganhoFim(J.ganho, false);
}

/** Anuncio pela Poki; em localhost, um anuncio simulado de 3 s (premio so com true). */
async function anuncio(tipo) {
  const antes = J.estado;
  J.estado = 'anuncio';
  laco.pausar(true);
  let ok = false;
  if (poki.sdkPronto) {
    ok = tipo === 'rewarded' ? await poki.rewardedBreak() : (await poki.commercialBreak(), false);
  } else if (dep.local && tipo === 'rewarded') {
    audio.mudoParaAnuncio();
    ok = await hud.anuncioLocal(3);
    audio.voltarDoAnuncio();
  }
  laco.pausar(false);
  J.estado = antes === 'anuncio' ? 'jogando' : antes;
  return ok;
}

poki.onAdStart = () => audio.mudoParaAnuncio();
poki.onAdEnd = () => audio.voltarDoAnuncio();
document.addEventListener('visibilitychange', () => {
  audio.pausarAba(document.hidden);
  if (document.hidden) salvar();
});
window.addEventListener('pagehide', salvar);

// ------------------------------------------------------------------ laco
let tAuto = 0;
let tGravar = 0;
const laco = criarLaco({
  passo(dt) {
    if (J.estado !== 'jogando' || !J.modo) return;
    J.t += dt;
    if (dep.auto && J.modo.bot) {
      tAuto += dt * 1000;
      if (tAuto >= dep.auto) { tAuto = 0; J.modo.bot(); }
    }
    J.modo.passo(dt);
    cena.vfx.passo(dt);
    tratarEventos();
    if (J.tocou) {
      J.tempoJogo += dt;
      const min = Math.floor(J.tempoJogo / 60);
      if (min > J.minutos) { J.minutos = min; poki.measure('tempo', String(min), 'min'); }
    }
    // o progresso das missoes vai para o armazenamento de tempos em tempos (nao a cada fusao)
    tGravar += dt;
    if (tGravar > 5 && perfilSujo) { tGravar = 0; gravarPerfil(); }
  },
  desenhar() {
    if (!J.modo) return;
    cena.desenhar(J.modo, J.t);
    const h = J.modo.hud();
    // no desafio, o lugar do recorde mostra a meta do dia (com o ✓ quando o premio ja saiu)
    if (J.chave === 'desafio') h.recorde = formatar(T.meta, { n: fmtNumero(J.meta) }) + (J.premiado || (h.pontos || 0) >= J.meta ? ' ✓' : '');
    hud.atualizar(h);
    hud.gotas(perfil.gotas, fmtNumero);
    if (!J.carregou) {
      J.carregou = true;
      poki.gameLoadingFinished();
    }
    if (dep.debug) hud.depurar(laco.medidas, J.modo.mundo, cena, J.modo);
  },
});

hud.aoPausar(() => alternarPausa());
hud.aoContinuar(() => { if (J.estado === 'pausa') continuar(); });
hud.aoRecomecar(() => {
  if (J.estado === 'pausa') {
    // recomecar abandona a partida (sem gotas): a nova comeca do zero
    J.estado = 'fim';
    salvar();
  }
  if (J.estado === 'fim' || J.estado === 'menuFim') jogarDeNovo();
});
hud.aoDeNovo(() => jogarDeNovo());
hud.aoReviver(() => reviver());
hud.aoDobrar(() => dobrar());
hud.aoMenuFim(() => {
  if (J.estado !== 'fim') return;
  hud.fim(false);
  J.estado = 'menuFim';
  abrirMenu();
});
hud.aoGotas(() => {
  if (J.estado === 'jogando') alternarPausa();
  else if (J.estado === 'fim') { hud.fim(false); J.estado = 'menuFim'; abrirMenu(); }
  if (J.estado === 'pausa' || J.estado === 'menuFim') menu.aba('loja');
});
hud.aoSom(() => { audio.definirMudo(!audio.mudo); armazem.gravar('mudo', audio.mudo); document.body.classList.toggle('mudo', audio.mudo); });
hud.aoPoder((id) => { if (J.estado === 'jogando' && J.modo.poder) { tocar(); J.modo.poder(id); } });
audio.definirMudo(!!armazem.ler('mudo', false));
document.body.classList.toggle('mudo', audio.mudo);

async function iniciar() {
  // o jogo nao espera o SDK (com bloqueador o init so desiste em 4 s): o wrapper guarda os
  // eventos e entrega na ordem quando o SDK responder
  const pronto = poki.init();
  await carregarModo(inicial);
  pronto.then(() => { if (!poki.sdkPronto && !dep.local) document.body.classList.add('sem-anuncio'); });
  // sequencia diaria: o premio do dia entra ao abrir, com um aviso que nao interrompe o jogo
  const dia = perfil.checkin();
  if (dia.premio) {
    gravarPerfil();
    setTimeout(() => hud.aviso(`${formatar(T.sequenciaDia, { n: dia.dia })} +${dia.premio} 💧`), 1200);
  }
  // prints deterministicos: N quadros de fisica antes do primeiro desenho
  for (let k = 0; k < dep.passos; k++) {
    if (dep.auto && J.modo.bot && k % Math.max(1, Math.round(dep.auto / 16.67)) === 0) J.modo.bot();
    J.modo.passo(PASSO);
    J.modo.eventos.length = 0;
  }
  J.estado = 'jogando';
  if (dep.filme) { filmar(dep.filme, dep.cada); return; }
  laco.iniciar();
  // reserva: se o rAF nao andar (aba em segundo plano, iframe escondido), o loading sai assim mesmo
  setTimeout(() => { if (!J.carregou) { J.carregou = true; poki.gameLoadingFinished(); } }, 1500);
  if (dep.ganchos) {
    /** @type {any} */ (window).__slime = { J, cena, laco, poki, audio, hud, perfil, entrarModo, abrirMenu };
  }
}

iniciar();

/**
 * Filme deterministico (so localhost): N quadros, `cada` passos de fisica entre eles, cada
 * quadro e a soma dos 3 canvases (sem o HUD em DOM) em JPEG dentro de <pre id="filme">.
 * O tools/gif-modelos.mjs le pelo --dump-dom do Chrome headless e monta o GIF com o ffmpeg.
 */
function filmar(n, cada) {
  // recorta na area do jogo (o HUD em DOM nao entra no filme e so deixaria papel vazio)
  const r = $('area').getBoundingClientRect();
  const mx = 8;
  const rx = Math.max(0, r.left - mx);
  const ry = Math.max(0, r.top - mx);
  const rw = Math.min(window.innerWidth - rx, r.width + 2 * mx);
  const rh = Math.min(window.innerHeight - ry, r.height + 2 * mx);
  const tela = document.createElement('canvas');
  const esc = Math.min(1, 640 / Math.max(rw, rh));
  tela.width = Math.round(rw * esc);
  tela.height = Math.round(rh * esc);
  const ctx = /** @type {CanvasRenderingContext2D} */ (tela.getContext('2d'));
  const pre = document.createElement('pre');
  pre.id = 'filme';
  const linhas = [];
  let tAuto = 0;
  for (let q = 0; q < n; q++) {
    for (let k = 0; k < cada; k++) {
      if (dep.auto && J.modo.bot) {
        tAuto += PASSO * 1000;
        if (tAuto >= dep.auto) { tAuto = 0; J.modo.bot(); }
      }
      J.t += PASSO;
      J.modo.passo(PASSO);
      cena.vfx.passo(PASSO);
      tratarEventos();
    }
    cena.desenhar(J.modo, J.t);
    for (const id of ['cFundo', 'cSlime', 'cTopo']) {
      const c = /** @type {HTMLCanvasElement} */ ($(id));
      const k = c.width / window.innerWidth;
      ctx.drawImage(c, rx * k, ry * k, rw * k, rh * k, 0, 0, tela.width, tela.height);
    }
    linhas.push(tela.toDataURL('image/jpeg', 0.82));
  }
  pre.textContent = linhas.join('\n');
  document.body.appendChild(pre);
  document.title = 'FILME ' + n;
}

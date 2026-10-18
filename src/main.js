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
import { criarSons } from './som/sons.js';
import { criarMusica } from './som/musica.js';
import { criarLaco, PASSO } from './core/laco.js';
import { criarEntrada } from './core/entrada.js';
import { vibrar } from './core/haptico.js';
import { criarCena, QUALIDADES } from './render/cena.js';
import { criarHud } from './ui/hud.js';
import { criarMenu } from './ui/menu.js';
import { criarPerfil, gotasDaPartida, PREMIO_DESCOBERTA } from './jogo/perfil.js';
import { GOTAS_PEDIDO } from './jogo/pressao.js';
import { MAX_NIVEL } from './jogo/niveis.js';
import { criarMissoes } from './jogo/missoes.js';
import { criarQualidade, faixaFps, faixaMs } from './render/qualidade.js';
import { maoEm, TOQUE_MAO } from './render/guias.js';
import { aparencias, SKINS } from './jogo/skins.js';
import { criarEditor } from './ui/editor.js';
import { escolherIdioma, textos, textosEditor, formatar, numero } from './i18n/textos.js';

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
  editor: false, // editor de pixel da Minha aberto (por cima do menu, jogo pausado)
  ocioso: 0, // s sem nenhum gesto (mouse, toque, tecla): a demonstracao espera por ele
  demos: 0, // gotas soltas pela demonstracao (quem nao toca no comeco), com a da abertura
  demoMedida: false, // a dica/demo/show ja foi (a abertura tem a dela)
  seguindo: /** @type {{ cat: string, oque: string, t: number }[]} */ ([]), // completes que esperam o tempo de jogo
  usouPoder: false, // algum reforco usado nesta sessao (a dica do reforco so vem sem isso)
  dica: /** @type {{ id: string, t: number }|null} */ (null),
  fpsQ: 0, // quadros e tempo real do minuto de jogo (telemetria do fps)
  fpsT: 0,
  custoF: 0, // soma dos ms de fisica e de desenho amostrados no minuto (telemetria do custo)
  custoD: 0,
  custoN: 0,
  faixa1: '', // faixa de fps do minuto 1, repetida depois: a permanencia por faixa de fps
  saiu: false, // a primeira vez que a aba sumiu ja foi medida
  ultimoAnuncio: 0, // tempo de jogo (s) do ultimo intervalo comercial (o espaco entre eles)
  videoEspera: 0, // tempo de jogo (s) ate quando o video premiado nao e pedido de novo (o ultimo falhou)
  metas: /** @type {ReturnType<typeof criarMissoes>|null} */ (null), // metas da partida (meio do sem fim)
};
/** Minutos de jogo em que o fps medio vai para a telemetria (poucos, para nao inflar). */
const MINUTOS_FPS = [1, 3, 5, 10];
/** Minutos em que o custo medio de fisica e desenho vai para a telemetria. */
const MINUTOS_CUSTO = [1, 5];
/**
 * Meio da partida no sem fim: do nivel 9 em diante (o 9 chega aos ~3 min e o 10, 11 e 12 levam 2,
 * 4 e 7 min cada no Player Fit Test da 1.1.1), a pilula da meta alterna a cada TROCA_META s com uma
 * meta curta dos TIPOS_META.
 */
const NIVEL_METAS = 9;
const TROCA_META = 8;
const TIPOS_META = ['fusao', 'combo', 'poder'];
/** s de jogo ativo entre dois intervalos nas pausas naturais do sem fim (o fim de um evento). */
const ESPACO_ANUNCIO = 150;
/** s de jogo sem pedir outro video premiado depois de um que falhou (61 falhas em 8 partidas na 2.0.2) */
const ESPERA_VIDEO = 30;
/** demonstracao para quem nao toca: s parado antes de cada gota e quantas (com a da abertura) */
const DEMO_OCIOSO = 2;
const DEMOS = 3;
/** s de jogo depois do intervalo comercial ou do "Ufa!" que contam como "ficou" (o complete) */
const SEGUIU = 20;
/** Dicas que o aparelho ja viu (uma vez cada). */
const dicasVistas = armazem.ler('dicas', {}) || {};
// qualidade do render: desce sozinha quando o aparelho nao segura o fps (?qualidade= fixa).
// O celular comeca na media: no Player Fit Test da 1.1.1, 47% dos celulares desciam para ela (e 34%
// ate a baixa) ja no 1o minuto, com o pote vazio, trocando a resolucao duas vezes no comeco
const qualidade = criarQualidade({ niveis: QUALIDADES.length, inicial: dep.qualidade >= 0 ? dep.qualidade : toque ? 1 : 0 });

// ------------------------------------------------------------------ perfil (uma moeda: gotas)
/** Data local AAAA-MM-DD: a sequencia e as missoes viram a meia-noite do jogador. */
function dataLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const perfil = criarPerfil(armazem.ler('perfil', {}) || {}, dataLocal(new Date()));
if (perfil.migrou) {
  // o "nivel 13" do estouro de dois 12 tambem foi copiado para os saves dos modos
  for (const chave of ['modo1', 'desafio', 'modo5']) {
    const s = armazem.ler(chave, null);
    if (s && s.visto > 12) armazem.gravar(chave, { ...s, visto: 12 });
  }
  armazem.gravar('perfil', perfil.dados());
}
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
// previa da pagina de escolhas do hub (slime.escolha): a vitrine dos niveis altos no pote. Na
// Poki nao ha pedido: nada muda.
const escolhaHub = pedido ? armazem.ler('escolha', {}) || {} : {};
if (prototipo) document.body.classList.add('prototipo');

// visual: parametro local > pagina do hub > Estudio de visuais (so no hub) > o que o jogador
// equipou na loja (padrao: bequer, jardim, classico, escolhidos pelo usuario em 2026-10-14)
const visualGlobal = /** @type {any} */ (globalThis).__slimeVisual || {};
const visualEstudio = pedido ? armazem.ler('visual', {}) || {} : {};
// sons: a escolha do Estudio de sons (modelos/sons.html grava slime.sons) so vale quando a
// pagina abre por ?modelo= ou pelo hub, como o slime.visual; na Poki vale o PADRAO do catalogo
const musica = criarMusica({ audio });
const sons = criarSons({ audio, musica, escolha: { ...(pedido ? armazem.ler('sons', {}) || {} : {}), ...dep.sons } });
sons.iniciarMusica(); // espera o primeiro gesto e entra com fade

/** Contagem das gotas (fim e dobrar): um som por gota, ate 12, acelerando. */
function contarGotas(n, atrasoMs = 600) {
  let t = atrasoMs;
  for (let i = 0; i < Math.min(12, Math.max(0, n | 0)); i++) {
    const k = i;
    setTimeout(() => sons.tocar('gotas', { i: k }), t);
    t += Math.max(60, 150 - i * 10);
  }
}
// botoes (menu, loja, fim): o som de interface; os reforcos tem som proprio
document.addEventListener('pointerdown', (ev) => {
  const b = /** @type {any} */ (ev.target).closest && /** @type {any} */ (ev.target).closest('button');
  if (b && !b.classList.contains('poder')) sons.tocar('interface');
}, true);
function visualAtual() {
  const eq = perfil.equipado;
  return {
    cesto: dep.cesto || visualGlobal.cesto || visualEstudio.cesto || eq.cesto,
    cenario: dep.cenario || visualGlobal.cenario || visualEstudio.cenario || eq.cenario,
    objeto: dep.objeto || visualGlobal.objeto || visualEstudio.objeto || eq.objeto,
  };
}
const visual = visualAtual();
const cena = criarCena({ fundo: /** @type {any} */ ($('cFundo')), slime: /** @type {any} */ ($('cSlime')), topo: /** @type {any} */ ($('cTopo')), tela: /** @type {any} */ ($('cTela')), area: $('area') }, { forcar2d: dep.render === '2d', raio: dep.raio, limiar: dep.limiar, zoom: dep.zoom, cenario: visual.cenario, objeto: visual.objeto, cesto: visual.cesto, expr: dep.expr });
const hud = criarHud(document, T);
// o missil da mira sai do proprio botao
cena.origemMissil = () => hud.centroPoder('mira');
const menu = criarMenu(document, T, idioma, {
  modo: (chave) => escolherModo(chave),
  comprar(grupo, id) {
    if (!perfil.comprar(grupo, id)) return;
    poki.measure('loja', grupo + '-' + id, 'buy');
    gravarPerfil();
    sons.tocar('compra');
    aplicarVisual(grupo);
    atualizarMenu();
  },
  equipar(grupo, id) {
    if (!perfil.equipar(grupo, id)) return;
    gravarPerfil();
    aplicarVisual(grupo);
    atualizarMenu();
  },
  comprarSkin(k, id) {
    if (!perfil.comprarSkin(k, id)) return;
    poki.measure('skin', k + '-' + id, 'buy');
    gravarPerfil();
    sons.tocar('compra');
    aplicarSkins();
    atualizarMenu();
    // a Minha comprada abre direto no editor (ela nasce vazia)
    if (id === 'minha') abrirEditor(k);
  },
  equiparSkin(k, id) {
    if (!perfil.equiparSkin(k, id)) return;
    gravarPerfil();
    aplicarSkins();
    atualizarMenu();
  },
  editarMinha: (k) => abrirEditor(k),
});

// ------------------------------------------------------------------ skins por nivel
/** A skin equipada de cada nivel (indice = nivel), como os modos e o render usam. */
function tabelaSkins() {
  if (dep.skins === 'todas') {
    // depuracao (?skins=todas): a 1a pronta de cada nivel, para medir o shader no celular
    const eq = {};
    for (const x of SKINS) if (x.id !== 'padrao' && !eq[x.nivel]) eq[x.nivel] = x.id;
    return aparencias(eq, {});
  }
  return aparencias(perfil.skins.equipado, perfil.skins.minhas);
}

/** Skin comprada, equipada ou editada: o modo repinta os slimes daquele nivel; render e HUD seguem. */
function aplicarSkins() {
  if (!J.modo || !J.modo.definirAparencias) return;
  J.modo.definirAparencias(tabelaSkins());
  cena.definirAparencias(J.modo.aparencias);
  hud.definirAparencias(J.modo.aparencias);
}

/** @type {ReturnType<typeof criarEditor>|null} */
let editor = null;
/** Editor de pixel da Minha do nivel k, em tela cheia por cima do menu (o jogo segue pausado). */
function abrirEditor(k) {
  if (editor || !perfil.possuiSkin(k, 'minha')) return;
  const raiz = $('telaEditor');
  raiz.hidden = false;
  J.editor = true;
  editor = criarEditor(raiz, {
    nivel: k,
    inicial: perfil.skins.minhas[k] || null,
    objeto: visualAtual().objeto,
    modal: true,
    T: textosEditor(idioma),
    // as prontas de pixel do mesmo nivel que o jogador ja tem viram ponto de partida
    prontas: SKINS.filter((x) => x.tipo === 'pixel' && x.nivel === k && perfil.possuiSkin(k, x.id))
      .map((x) => ({ id: x.id, nome: T['skin.' + x.id] || x.id, px: x.px || [], modo: x.modo })),
    aoSalvar(m) {
      if (!perfil.salvarMinha(k, m)) return;
      gravarPerfil();
      aplicarSkins();
      atualizarMenu();
    },
    aoCancelar: fecharEditor,
  });
}
function fecharEditor() {
  if (editor) editor.destruir();
  editor = null;
  $('telaEditor').hidden = true;
  J.editor = false;
  atualizarMenu();
}

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
    J.ocioso = 0;
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
    // o editor de skin cuida das proprias teclas (Esc fecha ele, nao o menu)
    if (J.editor) return;
    J.ocioso = 0;
    if (baixo && (codigo === 'Escape' || codigo === 'KeyP')) { alternarPausa('tecla'); return; }
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
    visto: perfil.visto,
    skins: perfil.skins,
    possuiSkin: (k, id) => perfil.possuiSkin(k, id),
    precoSkin: (k, id) => perfil.precoSkin(k, id),
  });
}

/** @param {string} [aba] @param {string} [origem] de onde veio (telemetria): pausa, tecla, gotas, fim, fimLoja */
function abrirMenu(aba, origem = 'pausa') {
  poki.measure('menu', origem, 'open');
  atualizarMenu();
  musica.abaixar(0.5);
  menu.aba(aba || 'jogar');
  hud.menu(true, { fim: J.estado === 'menuFim' });
}

/** @param {string} [origem] botao da pausa, tecla ou gotas (telemetria do menu) */
function alternarPausa(origem = 'pausa') {
  if (J.estado === 'jogando') {
    J.estado = 'pausa';
    poki.gameplayStop();
    laco.pausar(true);
    salvar();
    abrirMenu(undefined, origem);
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
  if (J.editor) return;
  hud.menu(false);
  menu.liberar();
  musica.abaixar(1);
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
  menu.liberar();
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
  const base = { semente: dep.semente || ((Date.now() / 1000) | 0), toque, lang: idioma, vitrine: dep.vitrine || (window.parent !== window ? escolhaHub.vitrine || 0 : 0), cesto: vis.cesto, visto: perfil.visto, aparencias: tabelaSkins(), pressao: dep.pressao };
  if (chave === 'desafio') {
    const d = perfil.desafio();
    const s = armazem.ler('desafio', {}) || {};
    // a partida salva so vale no mesmo dia (a regra muda a meia-noite)
    const salvo = s.dia === perfil.hoje && !dep.semente ? s : {};
    return { ...base, semente: dep.semente || d.semente, salvo: comVisto({ ...salvo, recorde: d.melhor }), regra: d, cesto: forcaCesto(chave) || vis.cesto };
  }
  const salvo = comVisto(dep.semente ? {} : armazem.ler(chaveSalvo(chave), {}) || {});
  if (chave === 'duelo' || chave === 'duelo2') return { ...base, salvo, liga: perfil.liga.nivel, doisJogadores: chave === 'duelo2' };
  // partida salva continua no pote em que comecou; a nova do sem fim nasce com a fusao de abertura
  // (fora das ferramentas: ?semente sem ?abertura=1, ?auto e ?filme)
  return { ...base, salvo, cesto: salvo.partida && salvo.cesto ? salvo.cesto : vis.cesto, abertura: chave === 'semfim' && dep.abertura && !dep.auto && !dep.filme };
}

/** @param {string} chave @param {boolean} [nova] */
async function carregarModo(chave, nova = false) {
  const mod = await MODULOS[chave]();
  const cfg = configModo(chave, nova);
  J.modo = mod.criarModo(cfg);
  J.chave = chave;
  J.cesto = cfg.cesto;
  // o sem fim paga as gotas ao longo da partida: a partida que volta lembra o que ja pagou
  J.pagos = chave === 'semfim' && cfg.salvo && cfg.salvo.partida ? cfg.salvo.pagos || 0 : 0;
  J.meta = cfg.regra ? cfg.regra.meta : 0;
  J.premiado = cfg.regra ? cfg.regra.premiado : false;
  donoDoDedo.clear();
  cena.definirVisual({ cesto: cfg.cesto });
  // skins da partida (os prototipos nao tem: o visual de sempre)
  cena.definirAparencias(J.modo.aparencias || []);
  hud.definirAparencias(J.modo.aparencias || null);
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
        sons.tocar('soltar', { nivel: e.nivel });
        break;
      case 'pouso':
        sons.tocar('pouso', { forca: e.forca || 1 });
        if (e.cor) cena.vfx.respingo(e.x, e.y, e.cor, 4, 3);
        break;
      case 'fusao': {
        const k = e.combo || 1;
        sons.tocar('fusao', { k, nivel: e.nivel });
        if (k >= 2) sons.tocar('combo', { k });
        if (k >= 3) sons.falar('iupi', e.nivel);
        else if ((e.nivel || 0) >= 8) sons.falar('uau', e.nivel);
        if (e.cor) cena.vfx.respingo(e.x, e.y, e.cor, 8, 5);
        for (let k = 0; k < (e.brilhos || 0); k++) cena.vfx.brilho(e.x + (k % 5 - 2) * 0.3, e.y + ((k * 7) % 5 - 2) * 0.3);
        if (e.texto) cena.vfx.texto(e.x, e.y + 1, T[e.texto] || e.texto, e.corTexto || '#ffffff', e.escala || 1, 'combo');
        break;
      }
      case 'estouro':
        sons.tocar('estouro');
        if (e.cor) cena.vfx.respingo(e.x, e.y, e.cor, 18, 8);
        if (e.grande) {
          // o super slime do 13 estoura: explosao, lava na tela e o celular treme
          sons.tocar('splat');
          cena.vfx.explosao(e.x, e.y, e.cor, 3);
          cena.respingarTela(e.x, e.y, e.corTela || e.cor, 2.6);
          vibrar(90);
        }
        break;
      case 'junta':
        // fusao animada: a costura some e os iguais viram um corpo so
        sons.tocar('pouso', { forca: 0.8 });
        if (e.cor) cena.vfx.respingo(e.x, e.y, e.cor, 5 + 2 * (e.n || 2), 3);
        break;
      case 'faiscas':
        // as particulas que sobram da fusao saem como faiscas pelas pontas
        for (let k = 0; k + 1 < e.pts.length; k += 2) cena.vfx.brilho(e.pts[k], e.pts[k + 1]);
        break;
      case 'tremor':
        // terremoto: o pote inteiro treme (e o celular, onde da)
        if (e.pote === 0) vibrar([40, 30, 40, 30, 60]);
        break;
      case 'volta':
        // rede de seguranca do pote: um slime espetado na parede (ou caido por fora) voltou para dentro
        sons.tocar('pouso', { forca: 1 });
        if (e.cor) cena.vfx.respingo(e.x, e.y, e.cor, 6, 4);
        for (let k = 0; k < 4; k++) cena.vfx.brilho(e.x + (k - 1.5) * 0.4, e.y + ((k * 3) % 4 - 1.5) * 0.3);
        // quantas vezes isso acontece de verdade (o esperado e quase nunca)
        if (e.pote === 0) poki.measure('rede', 'volta', 'm' + J.minutos);
        break;
      case 'super': {
        // o 14 comemorou e estourou: o novo alvo depois do ultimo nivel (gotas e recorde)
        const r = perfil.superSlime(e.n);
        perfilSujo = true;
        if (r.gotas) contarGotas(r.gotas, 900);
        if (r.recorde && e.n > 1) sons.tocar('missao');
        if (J.chave === 'semfim') poki.measure('super', e.n > 10 ? '10+' : String(e.n), 'm' + J.minutos);
        break;
      }
      case 'comemora':
        // o ultimo nivel nasceu: incha e estoura em ~2 s
        sons.falar('uau', e.nivel);
        vibrar(40);
        break;
      case 'brilhos':
        // um slime que evoluiu na escada
        if (e.cor) cena.vfx.respingo(e.x, e.y, e.cor, 6, 4);
        for (let k = 0; k < 4; k++) cena.vfx.brilho(e.x + (k - 1.5) * 0.4, e.y + ((k * 3) % 4 - 1.5) * 0.3);
        break;
      case 'missil':
        // impacto do missil da mira: explosao no pote e gosma voando na tela
        sons.tocar('estouro');
        sons.tocar('splat');
        cena.vfx.explosao(e.x, e.y, e.cor, e.raio || 1);
        cena.respingarTela(e.x, e.y, e.cor, e.raio || 1);
        break;
      case 'texto':
        cena.vfx.texto(e.x, e.y, T[e.texto] || e.texto, e.cor || '#ffffff', e.escala || 1, e.grupo || '');
        break;
      case 'nivel':
        poki.measure('level', String(e.n), e.acao);
        // o ritmo real: em que minuto de jogo cada nivel novo chega (o painel nao mostra o tempo)
        if (e.acao === 'complete' && J.chave === 'semfim') { poki.measure('ritmo', 'n' + e.n, 'm' + J.minutos); pagarParcial(); }
        // partida nova: as metas da partida recomecam
        if (e.acao === 'start' && e.n === 1) J.metas = null;
        break;
      case 'registro':
        if (e.chave === 'poder') usouPoder(e.id);
        registrar(e.chave, e.valor);
        break;
      case 'cresceu':
        // o pote estreito do comeco cresceu (no nivel 6 ou pelo tempo)
        poki.measure('pote', 'cresceu', e.motivo);
        break;
      case 'pedirVideo':
        pedirVideo(e.id);
        break;
      case 'resgate':
        // "Ufa!": o pote transbordou e o topo estourou (no sem fim, a partida inteira)
        if (J.chave === 'semfim') {
          poki.measure('partida', 'ufa', 'm' + J.minutos);
          acompanhar('ufa', 'resgate');
        }
        break;
      case 'escada':
        // o piso das gotas subiu (do nivel 9 em diante) e os pequenos evoluiram
        poki.measure('escada', 'p' + e.piso, 'm' + J.minutos);
        break;
      case 'evento':
        // pressao do sem fim: um evento a cada ~60 s (src/jogo/pressao.js)
        if (e.acao === 'start') poki.measure('evento', e.id, 'start');
        else if (e.acao === 'ok' || e.acao === 'falhou') poki.measure('evento', e.id, e.acao);
        if (e.acao === 'ok') {
          const g = perfil.ganhar(GOTAS_PEDIDO);
          hud.aviso(`${T.pedidoFeito} +${g} 💧`);
          gravarPerfil();
        }
        if (e.acao === 'fim') pagarParcial();
        break;
      case 'fim':
        // o level/N/fail ja foi, mas o painel da Poki mostra 0% (o Failed e sobre o Started)
        if (J.chave === 'semfim') {
          poki.measure('partida', 'fim', 'm' + J.minutos);
          poki.measure('partida', 'fim', 'n' + J.modo.S.jogadores[0].maxNivel);
        }
        terminar(e);
        break;
      case 'intervalo':
        // pausa natural do modo (troca de pedido/fase; no sem fim, o fim de um evento a partir do 3o):
        // o intervalo comercial pode vir aqui, com ESPACO_ANUNCIO s de jogo desde o anterior
        if (e.origem === 'evento' && (!J.tocou || J.estado !== 'jogando' || J.tempoJogo - J.ultimoAnuncio < ESPACO_ANUNCIO)) break;
        if (!dep.semAnuncio && poki.sdkPronto) {
          // progresso (era intervalo/<origem>/show): o complete so com SEGUIU s de jogo depois
          if (e.origem) acompanhar('intervalo', e.origem);
          poki.gameplayStop();
          anuncio('commercial').then(() => { if (J.tocou && J.estado === 'jogando') poki.gameplayStart(); });
        }
        break;
      case 'som':
        // nomes de hoje (LEGADO) e as categorias (choro, missil, trocar, alvo, alargar, ataque...)
        sons.tocar(e.nome, e);
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
  let missao = false;
  let nivelNovo = 0;
  for (const m of feitas) {
    hud.aviso(`${T.missaoFeita} +${m.premio} 💧`);
    poki.measure('missao', m.tipo, 'complete');
    missao = true;
  }
  // metas da partida (meio do sem fim): o premio entra na hora e a proxima sobe um degrau
  if (J.metas && J.chave === 'semfim') {
    for (const m of J.metas.registrar(chave, valor)) {
      perfil.ganhar(m.premio);
      hud.aviso(`${T.missaoFeita} +${m.premio} 💧`);
      poki.measure('meta', m.tipo + '-' + m.meta, 'complete');
      missao = true;
    }
  }
  if (chave === 'nivel') {
    const g = perfil.descobrir(valor);
    // slime que ninguem tinha visto: o cartao com a bolinha (antes era so um aviso de texto)
    if (g) { hud.revelar(valor, `${formatar(T.nivelN, { n: valor })} · +${g} 💧`); nivelNovo = valor; }
  }
  if (nivelNovo) { sons.tocar('nivelNovo'); sons.falar('oba', nivelNovo); }
  else if (missao) { sons.tocar('missao'); sons.falar('missao'); }
  if (nivelNovo || missao) gravarPerfil();
}

/**
 * Saidas (2.0.3): o intervalo comercial e o "Ufa!" viram eventos de progresso. O start vai na hora
 * e o complete com SEGUIU s de jogo depois (o tempo de jogo para durante o anuncio): o Completed e o
 * Left do painel da Poki dizem quantos saem no anuncio ou logo depois do resgate.
 * @param {string} cat @param {string} oque
 */
function acompanhar(cat, oque) {
  poki.measure(cat, oque, 'start');
  J.seguindo.push({ cat, oque, t: J.tempoJogo + SEGUIU });
}

/** Reforco usado: telemetria, fim da dica (se era ela) e a dica nao volta nesta sessao. */
function usouPoder(id) {
  poki.measure('poder', id || '-', 'use');
  J.usouPoder = true;
  if (J.dica) { poki.measure('dica', 'poder', J.dica.id === id ? 'use' : 'outro'); fecharDica(); }
}

/**
 * Dica do reforco (Player Fit Test de 2026-10-15): com 60 s de jogo sem usar nenhum, um botao
 * que ainda tem carga (o missil, se tiver) pulsa com a mao por 8 s. Uma vez por aparelho.
 */
function abrirDica() {
  dicasVistas.poder = true;
  armazem.gravar('dicas', dicasVistas);
  const lista = (J.modo.hud().poderes || []).filter((p) => !p.oculto && p.qtd > 0 && !p.video);
  const alvo = lista.find((p) => p.id === 'mira') || lista[0];
  if (!alvo) return;
  J.dica = { id: alvo.id, t: 0 };
  hud.dica(alvo.id);
  poki.measure('dica', 'poder', 'show');
}
function fecharDica() {
  if (!J.dica) return;
  J.dica = null;
  hud.dica('');
}

/**
 * Fusao de abertura (2.0.3; 21,6% do desktop nao fazia a primeira fusao no Player Fit Test da
 * 2.0.2): sem toque, aos 0,6 s de partida a gota da mao vai para cima da gotinha do fundo e no 1 s
 * cai sozinha; as duas se fundem. E a 1a gota da demonstracao, mesmo com o mouse andando.
 */
function abrirSozinho() {
  const S = J.modo.S;
  if (!S || S.tempo < 0.6) return;
  const P = S.jogadores[0].pote;
  P.apontar(S.extra.abertura.x);
  if (S.tempo < 1 || !P.soltar()) return;
  S.extra.abertura = null;
  poki.measure('dica', 'abertura', 'show');
  J.demos++;
  J.ocioso = 0;
}

/**
 * Demonstracao para quem nao toca (25% do desktop no Player Fit Test da 1.0.0): parado ha
 * DEMO_OCIOSO s, a peca segue a mao do onboarding e cai sozinha no toque dela, ate DEMOS gotas
 * (a abertura conta). Nao conta como jogada (a mao continua ate a primeira gota de verdade) e nao
 * abre o gameplay da Poki.
 */
function demonstrar() {
  if (J.ocioso < DEMO_OCIOSO || !J.modo.S) return;
  const vis = J.modo.visual();
  if (!vis.mao) return;
  const P = J.modo.S.jogadores[0].pote;
  const m = maoEm(vis.mao, J.t);
  P.apontar(m.x);
  // o toque da mao acabou de acontecer neste passo
  if (m.ciclo >= TOQUE_MAO && m.ciclo - PASSO < TOQUE_MAO && P.soltar()) {
    if (!J.demoMedida) { J.demoMedida = true; poki.measure('dica', 'demo', 'show'); }
    J.demos++;
    J.ocioso = 0;
  }
}

/** Quase la, para a tela de fim: o nivel seguinte, o recorde por pouco e o proximo item da loja. */
function quaseLa(e) {
  const q = { nivel: 0, recorde: '', loja: /** @type {{ nome: string, falta: number }|null} */ (null) };
  const J0 = J.modo && J.modo.S ? J.modo.S.jogadores[0] : null;
  if (J0 && (J.chave === 'semfim' || J.chave === 'desafio')) {
    if (J0.maxNivel >= 4 && J0.maxNivel < MAX_NIVEL) q.nivel = J0.maxNivel + 1;
    // o recorde de antes (sem recorde novo, o hud ainda mostra o antigo)
    const rec = J.modo.hud().recorde || 0;
    if (J.chave === 'semfim' && !e.novo && rec > e.pontos && e.pontos >= rec * 0.7) q.recorde = fmtNumero(rec - e.pontos);
  }
  if (J.chave !== 'duelo2') {
    const it = perfil.proximo();
    if (it) q.loja = { nome: T[it.grupo + '.' + it.id] || it.id, falta: Math.max(0, it.preco - perfil.gotas) };
  }
  return q;
}

/** Reforco acabado: o video (rewarded) devolve um. */
async function pedirVideo(id) {
  if (J.estado !== 'jogando' || document.body.classList.contains('sem-anuncio')) return;
  if (!poki.sdkPronto && !dep.local) return;
  // o ultimo falhou (sem anuncio ou fechado antes do fim): o botao fica apagado por um tempo
  if (J.tempoJogo < J.videoEspera) { hud.aviso(T.semVideo); return; }
  const ok = await anuncio('rewarded');
  poki.measure('video', 'poder-' + id, ok ? 'ok' : 'fail');
  if (!ok) J.videoEspera = J.tempoJogo + ESPERA_VIDEO;
  if (ok && J.modo && J.modo.darPoder) J.modo.darPoder(id);
  if (J.tocou && J.estado === 'jogando') poki.gameplayStart();
}

/**
 * Sem fim sem derrota (2.0.0): as gotas dos pontos entram ao longo da partida (em cada nivel novo e
 * no fim de cada evento), pela mesma conta do fim, e a missao de pontos anda junto.
 */
function pagarParcial() {
  if (J.chave !== 'semfim' || !J.modo) return;
  const pts = J.modo.hud().pontos || 0;
  if (pts <= J.pagos) return;
  perfil.ganhar(gotasDaPartida(pts) - gotasDaPartida(J.pagos));
  J.pagos = pts;
  perfilSujo = true;
  registrar('pontos', pts);
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
  sons.tocar('fim');
  musica.abaixar(0.6);
  const g = pagarFim(e);
  J.ganho = g.total;
  // recorde ou vitoria: palmas; derrota: um "aww"; depois as gotas contadas
  const festa = e.novo || e.venceu;
  setTimeout(() => { if (festa) { sons.tocar('palmas'); sons.falar(e.venceu ? 'venceu' : 'uhuu'); } else sons.falar('aww'); }, 400);
  contarGotas(J.ganho, 1300);
  J.dobravel = g.dobravel;
  fecharDica();
  salvar();
  gravarPerfil();
  hud.fim(true, { pontos: e.pontos, novo: e.novo, sub: e.sub || '', titulo: e.titulo, reviver: !!e.reviver, gotas: J.ganho, dobrar: J.dobravel > 0, quase: quaseLa(e) });
}

function salvar() {
  if (perfilSujo) gravarPerfil();
  if (!J.modo || !J.modo.salvar) return;
  const dados = J.modo.salvar();
  if (J.chave === 'desafio') armazem.gravar('desafio', { ...dados, dia: perfil.hoje });
  else armazem.gravar(chaveSalvo(J.chave), J.chave === 'semfim' ? { ...dados, cesto: J.cesto, pagos: J.pagos } : dados);
}

async function jogarDeNovo() {
  hud.fim(false);
  hud.menu(false);
  musica.abaixar(1);
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
  poki.measure('video', 'reviver', ok ? 'ok' : 'fail');
  hud.fim(false);
  musica.abaixar(1);
  J.estado = 'jogando';
  if (ok && J.modo.reviver) J.modo.reviver();
  else { J.modo.reiniciar(); J.pagos = 0; }
  if (J.tocou) poki.gameplayStart();
}

/** Video do fim: dobra as gotas da partida (uma vez). */
async function dobrar() {
  if (!J.dobravel || J.estado !== 'fim') return;
  const ok = await anuncio('rewarded');
  poki.measure('video', 'dobrar', ok ? 'ok' : 'fail');
  if (!ok || !J.dobravel) return;
  const g = perfil.ganhar(J.dobravel);
  J.dobravel = 0;
  J.ganho += g;
  gravarPerfil();
  contarGotas(g, 0);
  hud.ganhoFim(J.ganho, false);
}

/** Anuncio pela Poki; em localhost, um anuncio simulado de 3 s (premio so com true). */
async function anuncio(tipo) {
  const antes = J.estado;
  J.estado = 'anuncio';
  laco.pausar(true);
  let ok = false;
  if (tipo === 'commercial') J.ultimoAnuncio = J.tempoJogo;
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
/**
 * Em que tela o jogador estava quando a pagina sumiu (a 1a vez; quase sempre e a saida). Melhor
 * esforco: a pagina pode morrer antes do envio. So o visibilitychange pegava ~100 das ~450 saidas
 * da 1.2.0 (trocar de jogo na Poki tira o iframe sem esconder a aba): o pagehide tambem conta.
 */
function medirSaida() {
  if (J.saiu || !J.carregou) return;
  J.saiu = true;
  poki.measure('sair', J.tocou ? J.estado : 'toque', 'm' + J.minutos);
}
document.addEventListener('visibilitychange', () => {
  audio.pausarAba(document.hidden);
  if (!document.hidden) return;
  salvar();
  medirSaida();
});
window.addEventListener('pagehide', () => { salvar(); medirSaida(); });

// ------------------------------------------------------------------ laco
let ladoBorda = 1;
/** Jogada do ?auto: o bot do modo, ou (com ?bot=borda) sempre em cima da borda. */
function autoJogar() {
  const P = dep.bot === 'borda' && J.modo.S ? J.modo.S.jogadores[0].pote : null;
  if (!P) { J.modo.bot(); return; }
  P.apontar(ladoBorda * 99);
  if (P.soltar()) ladoBorda = -ladoBorda;
}

let tAuto = 0;
let tGravar = 0;
const laco = criarLaco({ passo: passoJogo, desenhar: desenharJogo });

/** Um passo fixo do jogo (o laco chama; os prints quadro a quadro tambem, por __slime.avancar). */
function passoJogo(dt) {
  if (J.estado !== 'jogando' || !J.modo) return;
  J.t += dt;
  if (dep.auto && J.modo.bot) {
    tAuto += dt * 1000;
    if (tAuto >= dep.auto) { tAuto = 0; autoJogar(); }
  }
  J.ocioso += dt;
  // (o ?auto dos prints joga sem tocar: a demonstracao nao se mete)
  if (!J.tocou && J.demos < DEMOS && J.chave === 'semfim' && !dep.auto) {
    if (J.demos === 0 && J.modo.S && J.modo.S.extra.abertura) abrirSozinho();
    else demonstrar();
  }
  J.modo.passo(dt);
  cena.passo(dt);
  tratarEventos();
  if (J.tocou) {
    J.tempoJogo += dt;
    const min = Math.floor(J.tempoJogo / 60);
    if (min > J.minutos) {
      J.minutos = min;
      poki.measure('tempo', String(min), 'min');
      // fps medio do minuto que acabou (o abandono do celular depois de 5 min)
      if (MINUTOS_FPS.includes(min) && J.fpsT > 0) {
        const faixa = faixaFps(J.fpsQ / J.fpsT);
        poki.measure('fps', faixa, 'm' + min);
        if (min === 1) J.faixa1 = faixa;
        // quem rodou o minuto 1 nessa faixa ainda esta aqui: a permanencia por faixa de fps. A
        // categoria era "fps1" e nao chegou nenhuma vez no painel da 1.2.0 (a unica com digito)
        else if (J.faixa1) poki.measure('fpsini', J.faixa1, 'm' + min);
      }
      // ms medios por passo de fisica e por desenho: no aparelho lento, qual dos dois pesa
      if (MINUTOS_CUSTO.includes(min) && J.custoN > 0) {
        poki.measure('custo', 'fisica-' + faixaMs(J.custoF / J.custoN), 'm' + min);
        poki.measure('custo', 'desenho-' + faixaMs(J.custoD / J.custoN), 'm' + min);
      }
      J.fpsQ = 0;
      J.fpsT = 0;
      J.custoF = 0;
      J.custoD = 0;
      J.custoN = 0;
    }
    if (!J.usouPoder && !J.dica && !dicasVistas.poder && J.chave === 'semfim' && J.tempoJogo >= 60) abrirDica();
    if (J.dica && (J.dica.t += dt) > 8) fecharDica();
    // quem ficou SEGUIU s depois do anuncio ou do resgate
    if (J.seguindo.length && J.seguindo[0].t <= J.tempoJogo) {
      for (const q of J.seguindo.filter((q) => q.t <= J.tempoJogo)) poki.measure(q.cat, q.oque, 'complete');
      J.seguindo = J.seguindo.filter((q) => q.t > J.tempoJogo);
    }
  }
  hud.videoEspera(J.tempoJogo < J.videoEspera);
  // o progresso das missoes vai para o armazenamento de tempos em tempos (nao a cada fusao)
  tGravar += dt;
  if (tGravar > 5 && perfilSujo) { tGravar = 0; gravarPerfil(); }
}

/**
 * Reforcos colados ao pote (layout B, escolha do usuario em 2026-10-15): na paisagem a coluna
 * encosta na parede direita do pote mais a direita (o do sem fim; no Duelo, o da CPU, pedido do
 * usuario em 2026-10-15); no retrato e nos prototipos, o lugar de sempre.
 */
function encostarReforcos() {
  if (document.body.dataset.orient !== 'paisagem' || !J.modo.S) { hud.encostar(null); return; }
  const ps = J.modo.mundo.paredes;
  let xMax = -Infinity;
  for (const K of J.modo.S.jogadores) for (const k of K.pote.idxParedes) xMax = Math.max(xMax, ps[k].ax, ps[k].bx);
  const a = cena.paraTela(xMax + 1.1, J.modo.S.jogadores[0].pote.linha * 0.5);
  if (a) hud.encostar(a);
}

/** @param {number} [dt] s reais desde o quadro anterior (o laco passa; os prints nao) */
function desenharJogo(dt = 0) {
  if (!J.modo) return;
  medirQuadro(dt);
  cena.desenhar(J.modo, J.t);
  const h = J.modo.hud();
  // a meta da vez mostra as gotas da descoberta quando o nivel ainda e novo para o jogador
  if (h.objetivo && h.objetivo.novo) h.objetivo = { ...h.objetivo, premio: PREMIO_DESCOBERTA };
  // depois do 14: os super slimes da partida e o recorde do jogador
  if (h.objetivo && h.objetivo.supers) h.objetivo = { supers: { ...h.objetivo.supers, recorde: Math.max(perfil.recordeSupers, h.objetivo.supers.n) } };
  metaDaVez(h);
  // no desafio, o lugar do recorde mostra a meta do dia (com o ✓ quando o premio ja saiu)
  if (J.chave === 'desafio') h.recorde = formatar(T.meta, { n: fmtNumero(J.meta) }) + (J.premiado || (h.pontos || 0) >= J.meta ? ' ✓' : '');
  hud.atualizar(h);
  hud.gotas(perfil.gotas, fmtNumero);
  encostarReforcos();
  if (!J.carregou) {
    J.carregou = true;
    poki.gameLoadingFinished();
    esconderCarregando();
  }
  if (dep.debug) hud.depurar(laco.medidas, J.modo.mundo, cena, J.modo);
}

/**
 * Tira a tela de carregamento (index.html): fade de 0,3 s; nos prints (sem HUD, ou com a fisica
 * adiantada pelo ?passos, que atrasa o 1o quadro), na hora.
 */
function esconderCarregando() {
  const el = $('carregando');
  if (!el) return;
  if (dep.semHud || dep.passos) { el.remove(); return; }
  el.classList.add('pronto');
  setTimeout(() => el.remove(), 350);
}

/**
 * Meio da partida no sem fim: a pilula alterna entre o proximo nivel e uma meta curta com o
 * progresso (no nivel 13 fica so a meta). Primeiro a missao do dia aberta mais perto de acabar; sem
 * nenhuma, as metas da partida (src/jogo/missoes.js), que nascem aqui e valem ate o fim da partida.
 * @param {any} h o hud do modo (troca o objetivo)
 */
function metaDaVez(h) {
  // o evento da vez (pressao do sem fim) fica com a pilula ate acabar
  if (h.objetivo && h.objetivo.evento) return;
  if (J.chave !== 'semfim' || !J.modo.S || J.modo.S.jogadores[0].maxNivel < NIVEL_METAS) return;
  let lista = perfil.missoes().filter((m) => !m.feita && TIPOS_META.includes(m.tipo));
  if (!lista.length) {
    if (!J.metas) J.metas = criarMissoes(Date.now() >>> 0);
    lista = J.metas.lista();
  }
  if (h.objetivo && Math.floor(J.t / TROCA_META) % 2 === 0) return;
  const m = lista.reduce((a, b) => (b.prog / b.meta > a.prog / a.meta ? b : a));
  h.objetivo = { missao: { tipo: m.tipo, prog: m.prog, meta: m.meta, premio: m.premio } };
}

/** Fps do jogo rodando: a qualidade adaptativa e a media do minuto para a telemetria. */
function medirQuadro(dt) {
  if (J.estado !== 'jogando') { qualidade.reiniciar(); return; }
  if (dep.qualidade < 0 && qualidade.quadro(dt)) {
    cena.definirQualidade(qualidade.nivel);
    poki.measure('qualidade', cena.qualidade, 'm' + J.minutos);
  }
  if (J.tocou && dt > 0 && dt < 0.25) {
    J.fpsQ++;
    J.fpsT += dt;
    J.custoF += laco.medidas.passoMs;
    J.custoD += laco.medidas.desenhoMs;
    J.custoN++;
  }
}

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
hud.aoDeNovo(() => { poki.measure('fim', 'denovo', 'click'); jogarDeNovo(); });
hud.aoReviver(() => { poki.measure('fim', 'reviver', 'click'); reviver(); });
hud.aoDobrar(() => { poki.measure('fim', 'dobrar', 'click'); dobrar(); });
hud.aoMenuFim(() => {
  if (J.estado !== 'fim') return;
  hud.fim(false);
  J.estado = 'menuFim';
  abrirMenu(undefined, 'fim');
});
// o proximo item da loja na tela de fim abre a loja
hud.aoLojaFim(() => {
  if (J.estado !== 'fim') return;
  hud.fim(false);
  J.estado = 'menuFim';
  abrirMenu('loja', 'fimLoja');
});
hud.aoGotas(() => {
  if (J.estado === 'jogando') alternarPausa('gotas');
  else if (J.estado === 'fim') { hud.fim(false); J.estado = 'menuFim'; abrirMenu(undefined, 'gotas'); }
  if (J.estado === 'pausa' || J.estado === 'menuFim') menu.aba('loja');
});
// dois botoes: efeitos e falas (#bSom, o mudo de antes) e a musica (#bMusica)
hud.aoSom(() => { audio.definirMudo(!audio.mudo); armazem.gravar('mudo', audio.mudo); document.body.classList.toggle('mudo', audio.mudo); });
hud.aoMusica(() => { audio.definirMusica(!audio.musicaLigada); armazem.gravar('musica', audio.musicaLigada); document.body.classList.toggle('semMusica', !audio.musicaLigada); });
hud.aoPoder((id) => { if (J.estado === 'jogando' && J.modo.poder) { tocar(); J.modo.poder(id); } });
audio.definirMudo(!!armazem.ler('mudo', false));
document.body.classList.toggle('mudo', audio.mudo);
// quem tinha mutado antes de existir o botao da musica comeca sem musica
const musicaSalva = armazem.ler('musica', null);
audio.definirMusica(musicaSalva === null ? !armazem.ler('mudo', false) : !!musicaSalva);
document.body.classList.toggle('semMusica', !audio.musicaLigada);
// sem musica (o padrao escolhido em 2026-10-15) o botao da musica nao tem o que fazer
$('bMusica').hidden = sons.escolha.musica === 'nenhuma';

async function iniciar() {
  // o jogo nao espera o SDK (com bloqueador o init so desiste em 4 s): o wrapper guarda os
  // eventos e entrega na ordem quando o SDK responder
  const pronto = poki.init();
  // as teclas da dica (setas e espaco) precisam do foco no iframe da Poki sem clique antes
  try { window.focus(); } catch { /* sem permissao de foco: o primeiro clique foca */ }
  if (qualidade.nivel > 0) cena.definirQualidade(qualidade.nivel);
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
    if (dep.auto && J.modo.bot && k % Math.max(1, Math.round(dep.auto / 16.67)) === 0) autoJogar();
    J.modo.passo(PASSO);
    J.modo.eventos.length = 0;
  }
  // prints dos eventos (?evento=gigante): depois dos ?passos (o pote ja montado), o aviso entra ja
  if (dep.evento && J.modo.forcarEvento) J.modo.forcarEvento(dep.evento);
  if (dep.poder && J.modo.poder) J.modo.poder(dep.poder);
  if (dep.demoReforcos && J.modo.S) {
    // prints dos botoes: um de cada estado (normal, acabado com video, 2, ativo, premio)
    const J0 = J.modo.S.jogadores[0];
    J0.poderes = { trocar: 1, chacoalhar: 0, alargar: 2, mira: 1 };
    J0.premio = 'gelo';
  }
  J.estado = 'jogando';
  if (dep.filme) { filmar(dep.filme, dep.cada); return; }
  laco.iniciar();
  // prints do cartao de slime novo: depois do 1o desenho (a barra de evolucao ja tem as cores)
  if (dep.revelar) setTimeout(() => hud.revelar(dep.revelar, `${formatar(T.nivelN, { n: dep.revelar })} · +${PREMIO_DESCOBERTA} 💧`, true), 300);
  // reserva: se o rAF nao andar (aba em segundo plano, iframe escondido), o loading sai assim mesmo
  setTimeout(() => { if (!J.carregou) { J.carregou = true; poki.gameLoadingFinished(); esconderCarregando(); } }, 1500);
  if (dep.ganchos) {
    /** @type {any} */ (window).__slime = {
      J, cena, laco, poki, audio, sons, musica, hud, perfil, entrarModo, abrirMenu,
      /** n passos fixos pelo mesmo caminho do laco e um desenho (prints quadro a quadro com o laco pausado) */
      avancar(n = 1) { for (let k = 0; k < n; k++) passoJogo(PASSO); desenharJogo(); },
      /** desliga o ?auto depois do preparo (prints de um gesto so) */
      pararAuto() { dep.auto = 0; },
    };
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
        if (tAuto >= dep.auto) { tAuto = 0; autoJogar(); }
      }
      J.t += PASSO;
      J.modo.passo(PASSO);
      cena.passo(PASSO);
      tratarEventos();
    }
    cena.desenhar(J.modo, J.t);
    for (const id of ['cFundo', 'cSlime', 'cTopo', 'cTela']) {
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

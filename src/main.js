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
import { criarCena } from './render/cena.js';
import { criarHud } from './ui/hud.js';
import { criarMenu } from './ui/menu.js';
import { criarPerfil, gotasDaPartida, PREMIO_DESCOBERTA } from './jogo/perfil.js';
import { MAX_NIVEL } from './jogo/niveis.js';
import { criarQualidade, faixaFps } from './render/qualidade.js';
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
  demos: 0, // gotas soltas pela demonstracao (quem nao toca no comeco)
  usouPoder: false, // algum reforco usado nesta sessao (a dica do reforco so vem sem isso)
  dica: /** @type {{ id: string, t: number }|null} */ (null),
  fpsQ: 0, // quadros e tempo real do minuto de jogo (telemetria do fps)
  fpsT: 0,
};
/** Minutos de jogo em que o fps medio vai para a telemetria (poucos, para nao inflar). */
const MINUTOS_FPS = [1, 3, 5, 10];
/** Dicas que o aparelho ja viu (uma vez cada). */
const dicasVistas = armazem.ler('dicas', {}) || {};
// qualidade do render: desce sozinha quando o aparelho nao segura o fps (?qualidade= fixa)
const qualidade = criarQualidade({ inicial: Math.max(0, dep.qualidade) });

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
  const base = { semente: dep.semente || ((Date.now() / 1000) | 0), toque, lang: idioma, vitrine: dep.vitrine || (window.parent !== window ? escolhaHub.vitrine || 0 : 0), cesto: vis.cesto, visto: perfil.visto, aparencias: tabelaSkins() };
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
  if (chave === 'nivel') {
    const g = perfil.descobrir(valor);
    // slime que ninguem tinha visto: o cartao com a bolinha (antes era so um aviso de texto)
    if (g) { hud.revelar(valor, `${formatar(T.nivelN, { n: valor })} · +${g} 💧`); nivelNovo = valor; }
  }
  if (nivelNovo) { sons.tocar('nivelNovo'); sons.falar('oba', nivelNovo); }
  else if (missao) { sons.tocar('missao'); sons.falar('missao'); }
  if (nivelNovo || missao) gravarPerfil();
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
 * Demonstracao para quem nao toca (25% do desktop no Player Fit Test): parado ha 4 s, a peca
 * segue a mao do onboarding e cai sozinha no toque dela, duas vezes. Nao conta como jogada (a
 * mao continua ate a primeira gota de verdade) e nao abre o gameplay da Poki.
 */
function demonstrar() {
  if (J.ocioso < 4 || !J.modo.S) return;
  const vis = J.modo.visual();
  if (!vis.mao) return;
  const P = J.modo.S.jogadores[0].pote;
  const m = maoEm(vis.mao, J.t);
  P.apontar(m.x);
  // o toque da mao acabou de acontecer neste passo
  if (m.ciclo >= TOQUE_MAO && m.ciclo - PASSO < TOQUE_MAO && P.soltar()) {
    if (!J.demos) poki.measure('dica', 'demo', 'show');
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
  const ok = await anuncio('rewarded');
  poki.measure('video', 'poder-' + id, ok ? 'ok' : 'fail');
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
  else armazem.gravar(chaveSalvo(J.chave), J.chave === 'semfim' ? { ...dados, cesto: J.cesto } : dados);
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
  if (!J.tocou && J.demos < 2 && J.chave === 'semfim' && !dep.auto) demonstrar();
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
      if (MINUTOS_FPS.includes(min) && J.fpsT > 0) poki.measure('fps', faixaFps(J.fpsQ / J.fpsT), 'm' + min);
      J.fpsQ = 0;
      J.fpsT = 0;
    }
    if (!J.usouPoder && !J.dica && !dicasVistas.poder && J.chave === 'semfim' && J.tempoJogo >= 60) abrirDica();
    if (J.dica && (J.dica.t += dt) > 8) fecharDica();
  }
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
  // no desafio, o lugar do recorde mostra a meta do dia (com o ✓ quando o premio ja saiu)
  if (J.chave === 'desafio') h.recorde = formatar(T.meta, { n: fmtNumero(J.meta) }) + (J.premiado || (h.pontos || 0) >= J.meta ? ' ✓' : '');
  hud.atualizar(h);
  hud.gotas(perfil.gotas, fmtNumero);
  encostarReforcos();
  if (!J.carregou) {
    J.carregou = true;
    poki.gameLoadingFinished();
  }
  if (dep.debug) hud.depurar(laco.medidas, J.modo.mundo, cena, J.modo);
}

/** Fps do jogo rodando: a qualidade adaptativa e a media do minuto para a telemetria. */
function medirQuadro(dt) {
  if (J.estado !== 'jogando') { qualidade.reiniciar(); return; }
  if (dep.qualidade < 0 && qualidade.quadro(dt)) {
    cena.definirQualidade(qualidade.nivel);
    poki.measure('qualidade', cena.qualidade, 'm' + J.minutos);
  }
  if (J.tocou && dt > 0 && dt < 0.25) { J.fpsQ++; J.fpsT += dt; }
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
  if (dep.qualidade >= 0) cena.definirQualidade(dep.qualidade);
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
  // reserva: se o rAF nao andar (aba em segundo plano, iframe escondido), o loading sai assim mesmo
  setTimeout(() => { if (!J.carregou) { J.carregou = true; poki.gameLoadingFinished(); } }, 1500);
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

// Catalogo do Estudio de sons (modelos/sons.html): cada categoria de evento do jogo com 3 a 4
// variantes para o usuario escolher ouvindo. A 1a variante e o som de hoje quando ele existe.
//
// Variante: { id, nome, desc, receita?, arquivo?, arquivos?, reserva? }
// - receita: nome em RECEITAS (src/som/receitas.js), sintetizada na hora (0 KB);
// - arquivo: id em ARQUIVOS (src/som/arquivos.js, MP3 CC0 da Kenney), carregado depois do
//   primeiro gesto; enquanto nao chega (ou se falhar) toca a `reserva` (uma receita);
// - receita + arquivo juntos: a receita toca sempre e o arquivo por cima;
// - arquivos (so nas falas): frase -> id do arquivo; a reserva e a variante de balbucio;
// - sem receita nem arquivo: "nenhum" (silencio).
// `voz`: a categoria toca no barramento de voz (as falas); as outras no de efeitos.
// `max`: quantos sons da categoria podem tocar juntos (limite de polifonia).
// `exemplo`: parametros do ▶ da pagina (k do combo, forca, nivel, i da contagem).

import { COMBOS } from './falas.js';

/**
 * @typedef {object} Variante
 * @property {string} id
 * @property {string} nome
 * @property {string} desc
 * @property {string} [receita]
 * @property {string} [arquivo]
 * @property {Record<string, string>} [arquivos]
 * @property {string} [reserva]
 * @property {number} [vol] volume do arquivo (calibragem; padrao 1)
 */

/**
 * @typedef {object} Categoria
 * @property {string} id
 * @property {string} nome
 * @property {string} desc
 * @property {Variante[]} variantes
 * @property {boolean} [voz]
 * @property {number} [max]
 * @property {any} [exemplo]
 */

/** Silencio (combo, interface, falas, choro, palmas). */
const NENHUM = { id: 'nenhum', nome: 'Nenhum', desc: 'Sem som neste evento.' };

/** Frase -> arquivo do locutor (Voiceover Pack da Kenney). uau usa "power up"; combo3..10, os numeros. */
const LOCUTOR = {
  uau: 'vozPowerUp', oba: 'vozNivel', eek: 'vozCuidado', aww: 'vozFim', uhuu: 'vozRecorde', missao: 'vozMissao', venceu: 'vozVenceu',
  pronto: 'vozPronto', vai: 'vozVai', abaixa: 'vozAbaixa', objetivo: 'vozObjetivo', depressa: 'vozDepressa', tempo: 'vozTempo',
  socorro: 'vozSocorro', alvo: 'vozAlvo', acertou: 'vozAcertou', recarga: 'vozRecarga', parabens: 'vozParabens', perdeu: 'vozPerdeu',
  fogo: 'vozFogo', ...Object.fromEntries(COMBOS.map((k) => ['combo' + k, 'vozCombo' + k])),
};
const LOCUTOR_SLIME = Object.fromEntries(Object.entries(LOCUTOR).map(([k, v]) => [k, v + 'Slime']));

/** @type {readonly Categoria[]} */
export const CATEGORIAS = Object.freeze([
  {
    id: 'soltar', nome: 'Soltar a gota', desc: 'O slime sai do bico e cai no pote.', max: 3, exemplo: { nivel: 2 },
    variantes: [
      { id: 'atual', nome: 'Sopro (o de hoje)', desc: 'Sopro curto e neutro.', receita: 'gotaAtual' },
      { id: 'pingo', nome: "Pingo d'água", desc: 'Plim de gota caindo na água, mais agudo nos slimes pequenos.', receita: 'pingo' },
      { id: 'bolha', nome: 'Bolha', desc: 'Blup de bolha subindo.', receita: 'bolhaSobe' },
      { id: 'gloop', nome: 'Meleca', desc: 'Gloop molhado de gosma escorrendo.', receita: 'gloop' },
    ],
  },
  {
    id: 'pouso', nome: 'Pouso', desc: 'O slime bate no fundo ou em outro slime (mais forte, mais alto).', max: 4, exemplo: { forca: 2 },
    variantes: [
      { id: 'atual', nome: 'Baque (o de hoje)', desc: 'Baque surdo de ruído.', receita: 'pousoAtual' },
      { id: 'splash', nome: 'Splash', desc: 'Respingo de água com duas gotinhas.', receita: 'splash' },
      { id: 'meleca', nome: 'Meleca', desc: 'Squish de gosma, com o tremido grave.', receita: 'squish' },
      { id: 'gelatina', nome: 'Gelatina', desc: 'Boing curto de gelatina balançando.', receita: 'gelatina' },
    ],
  },
  {
    id: 'fusao', nome: 'Fusão', desc: 'Dois iguais viram um maior. A nota sobe com o combo.', max: 4, exemplo: { k: 1, nivel: 3 },
    variantes: [
      { id: 'atual', nome: 'Nota sem fim (o de hoje)', desc: 'Acorde que sobe para sempre com o combo, com estalo e splat.', receita: 'fusaoAtual' },
      { id: 'bolha', nome: 'Bolha', desc: 'Bloop de bolha afinado na escala, subindo com o combo.', receita: 'fusaoBolha' },
      { id: 'meleca', nome: 'Meleca musical', desc: 'Gloop de gosma com uma nota tremida por cima.', receita: 'fusaoMeleca' },
      { id: 'marimba', nome: 'Marimba', desc: 'Nota de marimba de madeira e um splat macio.', receita: 'fusaoMarimba' },
    ],
  },
  {
    id: 'combo', nome: 'Combo', desc: 'Camada extra a partir da 2ª fusão seguida.', max: 2, exemplo: { k: 4 },
    variantes: [
      { id: 'brilho', nome: 'Brilho (o de hoje)', desc: 'Um brilho em triângulo a partir do 3º combo.', receita: 'comboBrilho' },
      { id: 'sininhos', nome: 'Sininhos', desc: 'Um sininho a mais a cada combo, subindo.', receita: 'comboSininhos' },
      { id: 'swoosh', nome: 'Swoosh', desc: 'Sopro que sobe mais alto quanto maior o combo.', receita: 'comboSwoosh' },
      NENHUM,
    ],
  },
  {
    id: 'estouro', nome: 'Estouro', desc: 'Um slime explode (míssil, tesoura).', max: 2,
    variantes: [
      { id: 'atual', nome: 'Explosão (o de hoje)', desc: 'Explosão grave de ruído.', receita: 'explodir' },
      { id: 'splash', nome: 'Splash grande', desc: 'Água espirrando com gotas caindo em volta.', receita: 'estouroSplash' },
      { id: 'meleca', nome: 'SPLAT de meleca', desc: 'Gosma estourando e pingando depois.', receita: 'estouroMeleca' },
      { id: 'pop', nome: 'Pop de bolha', desc: 'Bolha grande estourando com confete de sininhos.', receita: 'estouroPop' },
    ],
  },
  {
    id: 'missil', nome: 'Míssil', desc: 'O reforço Mira vira um míssil teleguiado: voa 0,45 s até o slime (o estouro e a gosma vêm depois).', max: 1,
    variantes: [
      { id: 'zuum', nome: 'Zuum', desc: 'Vem voando e chega perto (efeito Doppler).', receita: 'missilZuum' },
      { id: 'assobio', nome: 'Plop + assobio', desc: 'Sai do botão com um plop e cai assobiando, como bomba de desenho.', receita: 'missilAssobio' },
      { id: 'laser', nome: 'Laser chiptune', desc: 'Três "piu" de videogame antigo.', receita: 'missilLaser' },
    ],
  },
  {
    id: 'choro', nome: 'Choro do alvo', desc: 'O slime mirado chora antes do míssil (no tom do nível dele).', max: 1, exemplo: { nivel: 4 },
    variantes: [
      { id: 'buaa', nome: 'Buáá', desc: 'Chorinho com voz de slime, caindo e tremendo.', receita: 'choroBuaa' },
      { id: 'solucos', nome: 'Soluços', desc: 'Três soluços curtinhos: hic, hic, hic.', receita: 'choroSolucos' },
      { id: 'gemido', nome: 'Gemido', desc: 'Choramingo de cachorrinho, sem voz.', receita: 'choroGemido' },
      NENHUM,
    ],
  },
  {
    id: 'splat', nome: 'Gosma na tela', desc: 'A gosma do estouro espirra na tela.', max: 2,
    variantes: [
      { id: 'splat', nome: 'Splat', desc: 'Tapa molhado com squish.', receita: 'splat' },
      { id: 'escorre', nome: 'Escorre', desc: 'Splat macio e a gosma pingando devagar.', receita: 'splatEscorre' },
      { id: 'ventosa', nome: 'Ventosa', desc: 'Gruda como ventosa e solta um plop.', receita: 'splatVentosa' },
    ],
  },
  {
    id: 'trocar', nome: 'Trocar', desc: 'Reforço que troca o slime da vez com o próximo.', max: 1,
    variantes: [
      { id: 'swoosh', nome: 'Swoosh', desc: 'Sopro rápido de troca.', receita: 'trocarSwoosh' },
      { id: 'bolhas', nome: 'Duas bolhas', desc: 'Blup-blip: uma bolha grave e uma aguda.', receita: 'trocarBolhas' },
      { id: 'pluc', nome: 'Pluc-pluc', desc: 'Duas notas de kalimba.', receita: 'trocarPluc' },
    ],
  },
  {
    id: 'chacoalhar', nome: 'Chacoalhar', desc: 'Reforço que sacode o pote (e o tremor sozinho do Merge Lab).', max: 1,
    variantes: [
      { id: 'atual', nome: 'Varrida (o de hoje)', desc: 'Ruído que varre para baixo.', receita: 'descartar' },
      { id: 'chocalho', nome: 'Chocalho', desc: 'Chocalho de maracá.', receita: 'chocalho' },
      { id: 'gelatina', nome: 'Gelatina tremendo', desc: 'Uóbi-uóbi grave de gelatina.', receita: 'gelatinaTreme' },
      { id: 'agua', nome: 'Água balançando', desc: 'Duas ondas de água com bolhinhas.', receita: 'agitarAgua' },
    ],
  },
  {
    id: 'alargar', nome: 'Alargar', desc: 'Reforço que alarga o pote.', max: 1,
    variantes: [
      { id: 'atual', nome: 'Brilho (o de hoje)', desc: 'Brilho curtinho que sobe.', receita: 'graduar' },
      { id: 'esticar', nome: 'Esticar', desc: 'Borracha esticando, com rangido.', receita: 'esticar' },
      { id: 'vidro', nome: 'Vidro', desc: 'Tim de vidro com um sopro.', receita: 'vidro' },
    ],
  },
  {
    id: 'alvo', nome: 'Armar o alvo', desc: 'Escolher um reforço que pede um slime (mira, calor, gelo...).', max: 1,
    variantes: [
      { id: 'mira', nome: 'Bip-bip', desc: 'Dois bipes de mira travando.', receita: 'alvoMira' },
      { id: 'radar', nome: 'Radar', desc: 'Ping de sonar com eco.', receita: 'alvoRadar' },
      { id: 'clique', nome: 'Engatilhar', desc: 'Clique-claque mecânico.', receita: 'alvoClique' },
    ],
  },
  {
    id: 'ataque', nome: 'Ataque no Duelo', desc: 'A gosma cinza cai no pote do rival.', max: 1,
    variantes: [
      { id: 'chuva', nome: 'Chuva de plops', desc: 'Seis plops descendo.', receita: 'ataqueChuva' },
      { id: 'nuvem', nome: 'Nuvem', desc: 'Ronco de nuvem e três plops.', receita: 'ataqueNuvem' },
      { id: 'swoosh', nome: 'Arremesso', desc: 'Swoosh e splat do outro lado.', receita: 'ataqueSwoosh' },
    ],
  },
  {
    id: 'interface', nome: 'Botões', desc: 'Toque nos botões do menu, da loja e do fim.', max: 2,
    variantes: [
      { id: 'pop', nome: 'Pop', desc: 'Toc macio e curtinho.', receita: 'botaoPop' },
      { id: 'bolha', nome: 'Bolhinha', desc: 'Bolinha que sobe.', receita: 'botaoBolha' },
      { id: 'clique', nome: 'Clique', desc: 'Clique de interface gravado.', arquivo: 'clique', reserva: 'botaoPop', vol: 0.8 },
      NENHUM,
    ],
  },
  {
    id: 'gotas', nome: 'Gotas (moeda)', desc: 'Contagem das gotas ganhas no fim e no dobrar. Sobe a cada gota.', max: 3, exemplo: { i: 0 },
    variantes: [
      { id: 'moedinha', nome: 'Moedinha', desc: 'Duas notas brilhantes (si -> mi), como moeda de videogame.', receita: 'moedinha' },
      { id: 'pingos', nome: 'Pingos', desc: "Pingos d'água afinados, subindo a escala.", receita: 'pingoGota' },
      { id: 'tilim', nome: 'Tilim', desc: 'Sininho que sobe a cada gota.', receita: 'tilim' },
      { id: 'fichas', nome: 'Fichas', desc: 'Ficha de cassino pousando na mesa.', arquivo: 'ficha', reserva: 'moedinha' },
    ],
  },
  {
    id: 'compra', nome: 'Compra e equipar', desc: 'Comprar um cesto, cenário ou personagem na loja.', max: 1,
    variantes: [
      { id: 'atual', nome: 'Fanfarra YES! (o de hoje)', desc: 'Arpejo com pipocos de confete.', receita: 'yes' },
      { id: 'registradora', nome: 'Caixa registradora', desc: 'Cha-ching!', receita: 'registradora' },
      { id: 'moedas', nome: 'Chuva de moedas', desc: 'Cinco moedinhas e um sino.', receita: 'moedas' },
      { id: 'fichas', nome: 'Pilha de fichas', desc: 'Fichas de cassino empilhando.', arquivo: 'fichas', reserva: 'registradora', vol: 1.6 },
    ],
  },
  {
    id: 'nivelNovo', nome: 'Nível novo (conquista)', desc: 'O primeiro slime de um nível nunca visto.', max: 1,
    variantes: [
      { id: 'atual', nome: 'Fanfarra YES! (o de hoje)', desc: 'Arpejo com pipocos de confete.', receita: 'yes' },
      { id: 'harpa', nome: 'Harpa mágica', desc: 'Glissando de harpa com brilhinhos.', receita: 'harpa' },
      { id: 'fanfarra', nome: 'Fanfarra de metais', desc: 'Ta-ta-ta-tááá de trompete.', receita: 'fanfarra' },
      { id: 'bolhas', nome: 'Bolhas mágicas', desc: 'Oito bolhas subindo a escala.', receita: 'bolhasMagicas' },
    ],
  },
  {
    id: 'missao', nome: 'Missão cumprida', desc: 'Uma das 3 missões do dia ficou pronta.', max: 1,
    variantes: [
      { id: 'atual', nome: 'Fanfarra YES! (o de hoje)', desc: 'Arpejo com pipocos de confete.', receita: 'yes' },
      { id: 'sinos', nome: 'Sinos', desc: 'Três sinos em acorde.', receita: 'sinos' },
      { id: 'carimbo', nome: 'Carimbo', desc: 'Tum de carimbo e um tim.', receita: 'carimbo' },
      { id: 'tada', nome: 'Ta-dá!', desc: 'Duas notas de metais.', receita: 'tada' },
    ],
  },
  {
    id: 'palmas', nome: 'Palmas (recorde e vitória)', desc: 'Recorde novo no fim e vitória no Duelo.', max: 1,
    variantes: [
      { id: 'plateia', nome: 'Plateia', desc: 'Uma plateia inteira aplaudindo.', receita: 'plateia' },
      { id: 'poucas', nome: 'Turminha', desc: 'Poucas palmas e um fiu-fiu.', receita: 'palmasPoucas' },
      { id: 'fanfarra', nome: 'Palmas com ta-dá', desc: 'Ta-dá de metais e a plateia.', receita: 'palmasFanfarra' },
      NENHUM,
    ],
  },
  {
    id: 'fim', nome: 'Fim de partida', desc: 'O pote transbordou.', max: 1,
    variantes: [
      { id: 'atual', nome: 'Três notas (o de hoje)', desc: 'Três notas descendo, curto e sem drama.', receita: 'fimAtual' },
      { id: 'trombone', nome: 'Trombone triste', desc: 'Uá, uá, uá, uááá.', receita: 'trombone' },
      { id: 'murcho', nome: 'Murchando', desc: 'Slime murchando como balão.', receita: 'murcho' },
      { id: 'caixinha', nome: 'Caixinha triste', desc: 'Cinco notas de caixinha de música descendo.', receita: 'caixinhaTriste' },
    ],
  },
  {
    id: 'falas', nome: 'Falas', desc: 'O slime comemora e reclama: largada, fusão grande, combo contado, nível novo, eventos, reforços, fim, recorde.', voz: true, max: 1, exemplo: { nivel: 4 },
    variantes: [
      { id: 'balbucio', nome: 'Balbucio de slime', desc: 'Voz sem idioma ("Uau!", "Iupi!", "Oba!", "Aww..."), aguda nos pequenos e grave nos grandes.' },
      { id: 'locutor', nome: 'Locutor (inglês)', desc: 'Locutor de arcade: "Ready... Go!", "Level up!", "Three! Four!", "New high score!", "Game over"... Só fala nos marcos.', arquivos: LOCUTOR, reserva: 'balbucio' },
      { id: 'locutorSlime', nome: 'Locutor de slime', desc: 'O mesmo locutor com voz de slime (mais aguda e rápida).', arquivos: LOCUTOR_SLIME, reserva: 'balbucio' },
      NENHUM,
    ],
  },
  {
    id: 'musica', nome: 'Música', desc: 'Fundo baixinho, em laço. Abaixa na pausa, no menu, no fim e quando o slime fala; para no anúncio.',
    variantes: [
      { id: 'caixinha', nome: 'Caixinha de música', desc: 'Valsa de caixinha e marimba, 3/4, 76 bpm.' },
      { id: 'lofi', nome: 'Lo-fi borbulhante', desc: 'Piano elétrico, batida macia e bolhas, 72 bpm.' },
      { id: 'chiptune', nome: 'Chiptune', desc: 'Videogame de 8 bits alegre, 112 bpm (mais baixo).' },
      { id: 'nenhuma', nome: 'Nenhuma', desc: 'Sem música.' },
    ],
  },
].map((c) => Object.freeze({ ...c, variantes: Object.freeze(c.variantes.map((v) => Object.freeze({ ...v }))) })));

/** Categorias por id. */
export const POR_ID = Object.freeze(Object.fromEntries(CATEGORIAS.map((c) => [c.id, c])));

/**
 * Escolha padrao: a do usuario no Estudio de sons (2026-10-15). Sem musica; as falas sao o
 * locutor com voz de slime e a compra e a pilha de fichas (gravacoes CC0 da Kenney, ~39 KB);
 * o resto e sintetizado.
 * @type {Readonly<Record<string, string>>}
 */
export const PADRAO = Object.freeze({
  soltar: 'atual',
  pouso: 'gelatina',
  fusao: 'marimba',
  combo: 'sininhos',
  estouro: 'atual',
  missil: 'assobio',
  choro: 'buaa',
  splat: 'ventosa',
  trocar: 'pluc',
  chacoalhar: 'chocalho',
  alargar: 'esticar',
  alvo: 'radar',
  ataque: 'chuva',
  interface: 'pop',
  gotas: 'moedinha',
  compra: 'fichas',
  nivelNovo: 'fanfarra',
  missao: 'tada',
  palmas: 'poucas',
  fim: 'trombone',
  falas: 'locutorSlime',
  musica: 'nenhuma',
});

/**
 * Os nomes de som de hoje ({tipo: 'som', nome} dos modos e os metodos de core/audio.js) ->
 * categoria (toca a variante escolhida) ou receita fixa.
 * @type {Readonly<Record<string, {categoria?: string, receita?: string}>>}
 */
export const LEGADO = Object.freeze({
  descartar: { categoria: 'chacoalhar' },
  explodir: { categoria: 'estouro' },
  fim: { categoria: 'fim' },
  yes: { categoria: 'missao' },
  pouso: { categoria: 'pouso' },
  fusao: { categoria: 'fusao' },
  graduar: { receita: 'graduar' },
  febre: { receita: 'febre' },
  tique: { receita: 'tique' },
  recusa: { receita: 'recusa' },
  completar: { receita: 'completar' },
  critico: { receita: 'critico' },
});

/**
 * A variante `id` da categoria (ou a do PADRAO, se o id nao existir).
 * @param {string} cat
 * @param {string} [id]
 * @returns {Variante|null}
 */
export function variante(cat, id) {
  const c = POR_ID[cat];
  if (!c) return null;
  return c.variantes.find((v) => v.id === id) || c.variantes.find((v) => v.id === PADRAO[cat]) || c.variantes[0];
}

/**
 * Escolha limpa: so categorias e variantes que existem, o resto do PADRAO.
 * @param {any} bruta
 * @returns {Record<string, string>}
 */
export function normalizarEscolha(bruta) {
  /** @type {Record<string, string>} */
  const out = { ...PADRAO };
  if (!bruta || typeof bruta !== 'object') return out;
  for (const c of CATEGORIAS) {
    const id = bruta[c.id];
    if (typeof id === 'string' && c.variantes.some((v) => v.id === id)) out[c.id] = id;
  }
  return out;
}

/**
 * Ids dos arquivos que uma variante usa.
 * @param {Variante|null} v
 * @returns {string[]}
 */
export function arquivosDa(v) {
  if (!v) return [];
  const out = [];
  if (v.arquivo) out.push(v.arquivo);
  if (v.arquivos) out.push(...Object.values(v.arquivos));
  return out;
}

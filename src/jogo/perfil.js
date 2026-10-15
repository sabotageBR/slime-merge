// Perfil do jogador (metajogo): a UNICA moeda (gotas), a loja de visuais, a sequencia diaria,
// as missoes do dia, o desafio do dia, a liga do Duelo e a colecao de niveis.
// Logica pura: a data entra de fora (`hoje` = 'AAAA-MM-DD'), nada de relogio nem Math.random.
// O main.js grava `perfil.dados()` no armazenamento.

import { criarRng, hashTexto } from '../core/rng.js';

/** Precos da loja (o padrao de cada grupo e de graca). */
export const LOJA = {
  cesto: [
    { id: 'becher', preco: 0 }, { id: 'vime', preco: 200 }, { id: 'balde', preco: 250 }, { id: 'pote', preco: 300 },
    { id: 'vidro', preco: 300 }, { id: 'xicara', preco: 450 }, { id: 'caldeirao', preco: 600 }, { id: 'aquario', preco: 800 },
  ],
  cenario: [
    { id: 'jardim', preco: 0 }, { id: 'caderno', preco: 150 }, { id: 'laboratorio', preco: 250 }, { id: 'cozinha', preco: 250 },
    { id: 'quarto', preco: 300 }, { id: 'doceria', preco: 400 }, { id: 'mar', preco: 500 }, { id: 'espaco', preco: 700 },
  ],
  objeto: [
    { id: 'classico', preco: 0 }, { id: 'kawaii', preco: 250 }, { id: 'frutinhas', preco: 300 }, { id: 'docinho', preco: 350 },
    { id: 'bichinhos', preco: 400 }, { id: 'boneco', preco: 450 }, { id: 'chapeus', preco: 500 }, { id: 'monstrinhos', preco: 600 },
  ],
};

/** Premio da sequencia diaria (dia 1 a 7; depois repete o 7). */
export const SEQUENCIA = [20, 30, 40, 50, 60, 80, 120];

/** Missoes do dia: tipo, metas por degrau e premio em gotas. */
const MOLDES = [
  { tipo: 'fusao', metas: [15, 30, 60], premio: [30, 50, 80] },
  { tipo: 'nivel', metas: [6, 7, 8], premio: [40, 60, 90] },
  { tipo: 'combo', metas: [3, 4, 5], premio: [30, 50, 70] },
  { tipo: 'pontos', metas: [3000, 8000, 15000], premio: [30, 50, 80] },
  { tipo: 'poder', metas: [2, 4, 6], premio: [25, 40, 60] },
  { tipo: 'duelo', metas: [1, 2, 3], premio: [40, 60, 90] },
];

/** Regras do desafio do dia (o merge le `regra.id`). */
export const REGRAS = [
  { id: 'pequenos', meta: 6000 }, // so caem os niveis 1 a 3
  { id: 'aquario', meta: 7000 }, // pote aquario, boca estreita
  { id: 'xicara', meta: 7000 }, // xicara, fundo estreito
  { id: 'chacoalho', meta: 8000 }, // o pote chacoalha sozinho a cada 25 s
  { id: 'semPoderes', meta: 6000 }, // sem reforcos
  { id: 'prisma', meta: 10000 }, // coringas frequentes
];

/** Gotas de uma partida pelos pontos (raiz: partidas longas rendem, sem explodir). */
export function gotasDaPartida(pontos) {
  return Math.floor(Math.sqrt(Math.max(0, pontos)) * 0.9);
}

/** Dias entre duas datas 'AAAA-MM-DD' (b - a), sem relogio: calendario puro. */
export function diasEntre(a, b) {
  const n = (s) => {
    const [y, m, d] = s.split('-').map(Number);
    // dias desde uma data fixa (algoritmo civil, valido no calendario gregoriano)
    const yy = m <= 2 ? y - 1 : y;
    const era = Math.floor(yy / 400);
    const yoe = yy - era * 400;
    const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
    const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
    return era * 146097 + doe;
  };
  return n(b) - n(a);
}

/**
 * @param {any} salvo   o que o main.js leu do armazenamento (ou {})
 * @param {string} hoje 'AAAA-MM-DD' (local)
 */
export function criarPerfil(salvo, hoje) {
  const d = {
    gotas: 0,
    possui: { cesto: ['becher'], cenario: ['jardim'], objeto: ['classico'] },
    equipado: { cesto: 'becher', cenario: 'jardim', objeto: 'classico' },
    visto: 1, // maior nivel ja descoberto
    sequencia: { ultimo: '', dias: 0 },
    missoes: { dia: '', lista: [] },
    desafio: { dia: '', melhor: 0, premiado: false },
    liga: { nivel: 0, vitorias: 0 },
    totalGotas: 0,
    ...(salvo || {}),
  };
  // garante os padroes (save antigo ou parcial)
  for (const g of Object.keys(LOJA)) {
    if (!d.possui[g]) d.possui[g] = [];
    if (!d.possui[g].includes(LOJA[g][0].id)) d.possui[g].unshift(LOJA[g][0].id);
    if (!d.equipado[g] || !d.possui[g].includes(d.equipado[g])) d.equipado[g] = LOJA[g][0].id;
  }

  function ganhar(n) {
    const v = Math.max(0, Math.floor(n));
    d.gotas += v;
    d.totalGotas += v;
    return v;
  }

  /** Missoes do dia: 3, sorteadas pela data; renovadas quando o dia muda. */
  function prepararMissoes() {
    if (d.missoes.dia === hoje && d.missoes.lista.length === 3) return;
    const rng = criarRng(hashTexto('missoes-' + hoje));
    const tipos = MOLDES.map((m) => m.tipo);
    for (let i = tipos.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [tipos[i], tipos[j]] = [tipos[j], tipos[i]];
    }
    d.missoes = {
      dia: hoje,
      lista: tipos.slice(0, 3).map((tipo) => {
        const m = MOLDES.find((x) => x.tipo === tipo);
        const k = Math.floor(rng() * 3);
        return { tipo, meta: m.metas[k], premio: m.premio[k], prog: 0, feita: false };
      }),
    };
  }
  prepararMissoes();

  if (d.desafio.dia !== hoje) d.desafio = { dia: hoje, melhor: 0, premiado: false };

  return {
    hoje,
    get gotas() { return d.gotas; },
    get visto() { return d.visto; },
    get equipado() { return { ...d.equipado }; },
    get liga() { return { ...d.liga }; },
    ganhar,
    /**
     * Sequencia diaria: chamar ao abrir o jogo. Devolve o premio do dia (0 se ja pegou hoje).
     * Pular um dia zera a sequencia.
     */
    checkin() {
      const s = d.sequencia;
      if (s.ultimo === hoje) return { premio: 0, dia: s.dias };
      const gap = s.ultimo ? diasEntre(s.ultimo, hoje) : 99;
      s.dias = gap === 1 ? s.dias + 1 : 1;
      s.ultimo = hoje;
      const premio = SEQUENCIA[Math.min(SEQUENCIA.length, s.dias) - 1];
      ganhar(premio);
      return { premio, dia: s.dias };
    },
    get sequencia() { return { ...d.sequencia }; },
    /** Niveis ja vistos antes do perfil existir (save antigo do Merge Lab): marca sem premio. */
    marcarVisto(nivel) { if (nivel > d.visto) d.visto = nivel; },
    /** Nivel novo descoberto: +25 gotas na primeira vez. */
    descobrir(nivel) {
      if (nivel <= d.visto) return 0;
      d.visto = nivel;
      return ganhar(25);
    },
    // ---- loja
    possui(grupo, id) { return d.possui[grupo].includes(id); },
    preco(grupo, id) { const it = (LOJA[grupo] || []).find((x) => x.id === id); return it ? it.preco : Infinity; },
    /** @returns {boolean} comprou */
    comprar(grupo, id) {
      if (this.possui(grupo, id)) return false;
      const p = this.preco(grupo, id);
      if (!(p <= d.gotas)) return false;
      d.gotas -= p;
      d.possui[grupo].push(id);
      d.equipado[grupo] = id;
      return true;
    },
    equipar(grupo, id) {
      if (!this.possui(grupo, id)) return false;
      d.equipado[grupo] = id;
      return true;
    },
    /** O item mais barato que ainda falta (para a barra "proximo desbloqueio"). */
    proximo() {
      let melhor = null;
      for (const g of Object.keys(LOJA)) {
        for (const it of LOJA[g]) {
          if (d.possui[g].includes(it.id)) continue;
          if (!melhor || it.preco < melhor.preco) melhor = { grupo: g, ...it };
        }
      }
      return melhor;
    },
    // ---- missoes do dia
    missoes() { prepararMissoes(); return d.missoes.lista.map((m) => ({ ...m })); },
    /**
     * Registra progresso. Devolve as missoes que acabaram de ser cumpridas (o premio ja entrou).
     * @param {string} tipo fusao | nivel | combo | pontos | poder | duelo
     * @param {number} valor
     */
    registrar(tipo, valor) {
      prepararMissoes();
      const feitas = [];
      for (const m of d.missoes.lista) {
        if (m.tipo !== tipo || m.feita) continue;
        if (tipo === 'fusao' || tipo === 'poder' || tipo === 'duelo') m.prog += valor;
        else m.prog = Math.max(m.prog, valor);
        if (m.prog >= m.meta) {
          m.prog = m.meta;
          m.feita = true;
          ganhar(m.premio);
          feitas.push({ ...m });
        }
      }
      return feitas;
    },
    // ---- desafio do dia
    desafio() {
      const r = REGRAS[hashTexto('desafio-' + hoje) % REGRAS.length];
      return { ...r, semente: hashTexto('semente-' + hoje), melhor: d.desafio.melhor, premiado: d.desafio.premiado, dia: hoje };
    },
    /** Fim de uma partida do desafio: guarda o melhor e paga o premio na primeira meta batida. */
    fimDesafio(pontos) {
      const r = this.desafio();
      if (pontos > d.desafio.melhor) d.desafio.melhor = pontos;
      if (!d.desafio.premiado && pontos >= r.meta) {
        d.desafio.premiado = true;
        return ganhar(100);
      }
      return 0;
    },
    // ---- duelo
    /** Vitoria contra a CPU: gotas pela liga, e 3 vitorias sobem a liga (0, 1, 2). */
    venceuDuelo() {
      const premio = [40, 60, 90][d.liga.nivel];
      d.liga.vitorias++;
      if (d.liga.vitorias >= 3 && d.liga.nivel < 2) { d.liga.nivel++; d.liga.vitorias = 0; }
      return ganhar(premio);
    },
    dados() { return JSON.parse(JSON.stringify(d)); },
  };
}

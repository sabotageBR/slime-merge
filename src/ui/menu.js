// Menu (aberto pela pausa): abas Jogar (modos), Loja (visuais por gotas) e Missoes (do dia e
// sequencia diaria). So DOM: o estado vem do main.js (perfil) e as escolhas voltam por callback.

import { formatar, numero } from '../i18n/textos.js';
import { LOJA, SEQUENCIA } from '../jogo/perfil.js';

const ICONE_MODO = { semfim: '🧪', desafio: '📅', duelo: '⚔️', duelo2: '👥' };
const ICONE_MISSAO = { fusao: '🫧', nivel: '⬆️', combo: '✖️', pontos: '⭐', poder: '🪄', duelo: '⚔️' };

/**
 * @param {Document} doc
 * @param {Record<string, string>} T
 * @param {string} idioma
 * @param {{ modo: (chave: string) => void, comprar: (grupo: string, id: string) => void, equipar: (grupo: string, id: string) => void }} cb
 */
export function criarMenu(doc, T, idioma, cb) {
  const $ = (id) => /** @type {HTMLElement} */ (doc.getElementById(id));
  const abas = [...doc.querySelectorAll('.aba')];
  const paineis = [...doc.querySelectorAll('.painel')];
  const abasLoja = [...doc.querySelectorAll('.abaLoja')];
  let grupoLoja = 'cesto';
  /** @type {any} */
  let ultimo = null;

  function aba(nome) {
    for (const a of abas) a.setAttribute('aria-selected', String(a.dataset.aba === nome));
    for (const p of paineis) p.hidden = p.dataset.painel !== nome;
  }
  for (const a of abas) a.addEventListener('click', () => aba(a.dataset.aba || 'jogar'));
  for (const a of abasLoja) {
    a.addEventListener('click', () => {
      grupoLoja = a.dataset.grupo || 'cesto';
      for (const b of abasLoja) b.setAttribute('aria-selected', String(b === a));
      if (ultimo) desenharLoja(ultimo);
    });
  }
  // setas trocam de aba quando o foco esta numa aba (teclado nos menus, como a Poki pede)
  for (const a of abas) {
    a.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const k = abas.indexOf(a) + (e.key === 'ArrowRight' ? 1 : -1);
      const b = abas[(k + abas.length) % abas.length];
      b.focus();
      aba(b.dataset.aba || 'jogar');
    });
  }

  $('listaModos').addEventListener('click', (e) => {
    const b = /** @type {HTMLElement} */ (e.target).closest('[data-modo]');
    if (b) cb.modo(/** @type {HTMLElement} */ (b).dataset.modo || 'semfim');
  });
  $('gradeLoja').addEventListener('click', (e) => {
    const b = /** @type {HTMLElement} */ (e.target).closest('[data-item]');
    if (!b || /** @type {HTMLButtonElement} */ (b).disabled) return;
    const id = /** @type {HTMLElement} */ (b).dataset.item || '';
    if (b.dataset.acao === 'comprar') cb.comprar(grupoLoja, id);
    else if (b.dataset.acao === 'equipar') cb.equipar(grupoLoja, id);
  });

  function desenharModos(e) {
    const d = e.desafio;
    const linhas = [
      { chave: 'semfim', titulo: T.semfim, sub: formatar(T.melhorN, { n: numero(e.recorde, idioma) }) },
      {
        chave: 'desafio', titulo: T.desafio,
        sub: `${T['regra.' + d.id] || ''} · ${formatar(T.meta, { n: numero(d.meta, idioma) })} · ${formatar(T.melhorN, { n: numero(d.melhor, idioma) })}`,
        selo: d.premiado ? '✓' : '+100 💧',
      },
      { chave: 'duelo', titulo: T.duelo, sub: `${formatar(T.liga, { n: e.liga.nivel + 1 })} · ${formatar(T.vitorias, { n: e.liga.vitorias })}`, selo: `+${[40, 60, 90][e.liga.nivel]} 💧` },
      { chave: 'duelo2', titulo: T.duelo2, sub: T.teclas2p },
    ];
    $('listaModos').innerHTML = linhas.map((l) => `<button class="modo${l.chave === e.modoAtual ? ' atual' : ''}" data-modo="${l.chave}">`
      + `<i class="icone" aria-hidden="true">${ICONE_MODO[l.chave]}</i><span><b>${l.titulo}</b><small>${l.sub}</small></span>`
      + `${l.selo ? `<em class="selo">${l.selo}</em>` : ''}</button>`).join('');
  }

  function desenharLoja(e) {
    $('lojaGotas').textContent = numero(e.gotas, idioma);
    $('gradeLoja').innerHTML = LOJA[grupoLoja].map((it) => {
      const tem = e.possui(grupoLoja, it.id);
      const uso = e.equipado[grupoLoja] === it.id;
      const pode = e.gotas >= it.preco;
      let botao;
      if (uso) botao = `<span class="estado usado">${T.equipado}</span>`;
      else if (tem) botao = `<button class="estado" data-item="${it.id}" data-acao="equipar">${T.equipar}</button>`;
      else botao = `<button class="estado preco" data-item="${it.id}" data-acao="comprar"${pode ? '' : ' disabled'}>💧 ${numero(it.preco, idioma)}</button>`;
      return `<div class="item${uso ? ' usado' : ''}${tem ? '' : ' bloqueado'}"><img src="src/ui/loja/${grupoLoja}-${it.id}.webp" alt="" width="128" height="128" loading="lazy">`
        + `<b>${T[grupoLoja + '.' + it.id] || it.id}</b>${botao}</div>`;
    }).join('');
  }

  function desenharMissoes(e) {
    // o checkin ja rodou ao abrir: `dias` inclui hoje, e amanha e o dia dias+1 (indice dias)
    const dias = Math.min(SEQUENCIA.length, e.sequencia.dias || 0);
    const amanha = SEQUENCIA[Math.min(SEQUENCIA.length - 1, dias)];
    $('sequencia').innerHTML = `<div class="dias">${SEQUENCIA.map((g, k) => `<i class="${k < dias ? 'feito' : ''}${k === dias - 1 ? ' hoje' : ''}"><small>${k + 1}</small>${g}</i>`).join('')}</div>`
      + `<small>${formatar(T.dia, { n: Math.max(1, e.sequencia.dias || 0) })} · ${formatar(T.amanha, { n: amanha })} 💧</small>`;
    $('listaMissoes').innerHTML = e.missoes.map((m) => {
      const f = Math.min(1, m.prog / m.meta);
      const meta = m.tipo === 'pontos' ? numero(m.meta, idioma) : m.meta;
      return `<div class="missao${m.feita ? ' feita' : ''}"><i aria-hidden="true">${ICONE_MISSAO[m.tipo] || '•'}</i>`
        + `<span><b>${formatar(T['missao.' + m.tipo], { n: meta })}</b><em style="--f:${f}"></em></span>`
        + `<strong>${m.feita ? '✓' : `+${m.premio} 💧`}</strong></div>`;
    }).join('');
  }

  return {
    aba,
    /** @param {any} e estado do perfil e do jogo */
    atualizar(e) {
      ultimo = e;
      desenharModos(e);
      desenharLoja(e);
      desenharMissoes(e);
    },
  };
}

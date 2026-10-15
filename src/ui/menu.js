// Menu (aberto pela pausa): abas Jogar (modos), Loja (visuais e skins por gotas) e Missoes (do
// dia e sequencia diaria). So DOM: o estado vem do main.js (perfil) e as escolhas voltam por
// callback. As miniaturas das skins sao feitas aqui, uma por vez (src/ui/miniaturas.js).

import { formatar, numero } from '../i18n/textos.js';
import { LOJA, SEQUENCIA } from '../jogo/perfil.js';
import { SKINS, aparencia } from '../jogo/skins.js';
import { MAX_NIVEL } from '../jogo/niveis.js';
import { criarMiniaturas } from './miniaturas.js';

const ICONE_MODO = { semfim: '🧪', desafio: '📅', duelo: '⚔️', duelo2: '👥' };
const ICONE_MISSAO = { fusao: '🫧', nivel: '⬆️', combo: '✖️', pontos: '⭐', poder: '🪄', duelo: '⚔️' };

/**
 * @param {Document} doc
 * @param {Record<string, string>} T
 * @param {string} idioma
 * @param {{ modo: (chave: string) => void, comprar: (grupo: string, id: string) => void, equipar: (grupo: string, id: string) => void,
 *   comprarSkin: (k: number, id: string) => void, equiparSkin: (k: number, id: string) => void, editarMinha: (k: number) => void }} cb
 */
export function criarMenu(doc, T, idioma, cb) {
  const $ = (id) => /** @type {HTMLElement} */ (doc.getElementById(id));
  const abas = [...doc.querySelectorAll('.aba')];
  const paineis = [...doc.querySelectorAll('.painel')];
  const abasLoja = [...doc.querySelectorAll('.abaLoja')];
  let grupoLoja = 'cesto';
  /** @type {any} */
  let ultimo = null;
  // aba Skins: o nivel aberto e as miniaturas (feitas uma por vez, sem travar o menu)
  let nivelSkins = 0;
  const mini = criarMiniaturas({ lado: 128 });
  /** @type {any} */
  let filaMini = 0;

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
    const alvo = /** @type {HTMLElement} */ (e.target);
    const n = /** @type {HTMLButtonElement|null} */ (alvo.closest('[data-nivel]'));
    if (n && !n.disabled) {
      nivelSkins = Number(n.dataset.nivel) || 1;
      if (ultimo) desenharLoja(ultimo);
      return;
    }
    const sk = /** @type {HTMLButtonElement|null} */ (alvo.closest('[data-skin]'));
    if (sk && !sk.disabled) {
      const id = sk.dataset.skin || '';
      if (sk.dataset.acao === 'comprar') cb.comprarSkin(nivelSkins, id);
      else if (sk.dataset.acao === 'equipar') cb.equiparSkin(nivelSkins, id);
      else if (sk.dataset.acao === 'editar') cb.editarMinha(nivelSkins);
      return;
    }
    const b = /** @type {HTMLButtonElement|null} */ (alvo.closest('[data-item]'));
    if (!b || b.disabled) return;
    const id = b.dataset.item || '';
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

  /**
   * Aba Skins: os niveis em cima (os nao descobertos ficam fechados) e, no nivel aberto, a
   * padrao, as prontas e a Minha (comprada uma vez e editavel).
   */
  function desenharSkins(e) {
    if (!nivelSkins) nivelSkins = Math.max(1, Math.min(e.visto, MAX_NIVEL));
    if (nivelSkins > e.visto) nivelSkins = 1;
    const k = nivelSkins;
    const objeto = e.equipado.objeto || 'classico';
    const niveis = Array.from({ length: MAX_NIVEL }, (_, i) => {
      const n = i + 1;
      const aberto = n <= e.visto;
      const cor = aberto ? aparencia(n, e.skins.equipado[n] || 'padrao', e.skins.minhas[n]).hex : '';
      return `<button class="nivelSkin${n === k ? ' atual' : ''}" data-nivel="${n}" aria-pressed="${n === k}"`
        + ` aria-label="${formatar(T.nivelN, { n })}"${aberto ? ` style="--c:${cor}"` : ' disabled'}>${aberto ? n : '?'}</button>`;
    }).join('');
    const ids = ['padrao', ...SKINS.filter((x) => x.nivel === k && x.id !== 'padrao').map((x) => x.id), 'minha'];
    const usada = e.skins.equipado[k] || 'padrao';
    const cartoes = ids.map((id) => {
      const ap = aparencia(k, id, e.skins.minhas[k]);
      const tem = e.possuiSkin(k, id);
      const uso = usada === id;
      const preco = e.precoSkin(k, id);
      let botao;
      if (uso) botao = `<span class="estado usado">${T.equipado}</span>`;
      else if (tem) botao = `<button class="estado" data-skin="${id}" data-acao="equipar">${T.equipar}</button>`;
      else botao = `<button class="estado preco" data-skin="${id}" data-acao="comprar"${e.gotas >= preco ? '' : ' disabled'}>💧 ${numero(preco, idioma)}</button>`;
      if (id === 'minha' && tem) botao += `<button class="estado editar" data-skin="minha" data-acao="editar">✏️ ${T.editar}</button>`;
      return `<div class="item skin${uso ? ' usado' : ''}${tem ? '' : ' bloqueado'}">`
        + `<img data-mini="${id}" alt="" width="128" height="128" style="--c:${ap.hex}"><b>${T['skin.' + id] || id}</b>${botao}</div>`;
    }).join('');
    $('gradeLoja').innerHTML = `<div class="niveisSkin" role="group" aria-label="${formatar(T.nivelN, { n: '' }).trim()}">${niveis}</div>${cartoes}`;
    // miniaturas no pipeline do jogo, uma por vez (~50 ms cada); as do cache entram na hora
    clearTimeout(filaMini);
    const imgs = [...$('gradeLoja').querySelectorAll('img[data-mini]')];
    const fazer = () => {
      const img = /** @type {HTMLImageElement|undefined} */ (imgs.shift());
      if (!img) return;
      try { img.src = mini.url(k, aparencia(k, img.dataset.mini, e.skins.minhas[k]), objeto); } catch { /* sem WebGL: fica o circulo */ }
      filaMini = setTimeout(fazer, 0);
    };
    fazer();
  }

  function desenharLoja(e) {
    $('lojaGotas').textContent = numero(e.gotas, idioma);
    $('gradeLoja').classList.toggle('skins', grupoLoja === 'skins');
    if (grupoLoja === 'skins') { desenharSkins(e); return; }
    clearTimeout(filaMini);
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
    /** A Loja fechou: libera o contexto WebGL das miniaturas (o cache fica). */
    liberar() { clearTimeout(filaMini); mini.liberar(); },
    /** A Minha do nivel mudou no editor: a miniatura antiga sai do cache. @param {string} chave */
    esquecerMiniatura(chave) { mini.esquecer(chave); },
    /** @param {any} e estado do perfil e do jogo */
    atualizar(e) {
      ultimo = e;
      desenharModos(e);
      desenharLoja(e);
      desenharMissoes(e);
    },
  };
}

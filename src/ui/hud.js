// HUD em DOM: placar, gotas, proximo slime, meta da vez e barra de evolucao, power-ups (com o
// selo do video e a dica), avisos, slime novo, fim (gotas da partida, quase la e a loja), anuncio
// simulado (localhost) e o painel do ?debug.
// O conteudo do menu (modos, loja, missoes) e do src/ui/menu.js. So escreve no DOM quando muda.

import { hexDaMistura } from '../cor/km.js';
import { PALETA } from '../jogo/skins.js';
import { svgIcone, ICONE_MISSAO } from './icones.js';
import { formatar } from '../i18n/textos.js';

/** Premios de marco (o 5o espaco): placa dourada. */
const PREMIOS = ['calor', 'gelo', 'tesoura', 'tinta'];
/** Icone de cada evento da pressao do sem fim (src/jogo/pressao.js) na pilula da meta. */
const ICONE_EVENTO = { coringas: '🌈', pedido: '🎯', terremoto: '〰️', gigante: '⬇️', calor: '🔥', gelo: '❄️' };

/** Icones dos prototipos (Croma, Loja e Molde); os dos reforcos estao em src/ui/icones.js. */
const ICONES_PROTOTIPOS = {
  mexer: '<svg viewBox="0 0 24 24"><g class="t"><path d="M12 4a8 8 0 1 0 8 8"/><path d="m20 4-.5 6-6-.5"/></g><path d="M12 4a8 8 0 1 0 8 8"/><path d="m20 4-.5 6-6-.5"/></svg>',
  servir: '<svg viewBox="0 0 24 24"><g class="t"><path d="m5 12 5 5 9-10"/></g><path d="m5 12 5 5 9-10"/></svg>',
  ralo: '<svg viewBox="0 0 24 24"><g class="t"><path d="M4 8h16l-3 12H7z"/></g><path d="M4 8h16l-3 12H7zM9 4h6"/></svg>',
};

/**
 * Fundo CSS da bolinha da barra de evolucao, com a textura do nivel (a mesma do shader).
 * @param {string} cor
 * @param {number} [t] 1 bolinhas, 2 listras, 3 arco-iris, 4 ondas, 5 galaxia, 6 glitter, 7 lava
 */
function fundoTextura(cor, t) {
  switch (t) {
    case 1: return `radial-gradient(circle, rgba(255,255,255,.8) 0 26%, transparent 30%) 0 0/.42em .42em, ${cor}`;
    case 2: return `repeating-linear-gradient(45deg, rgba(255,255,255,.9) 0 .1em, transparent .1em .22em), ${cor}`;
    case 3: return 'radial-gradient(circle, #ff4d4d 0 18%, #ffb000 18% 34%, #ffe600 34% 50%, #3ddc5a 50% 66%, #2f8cff 66% 82%, #9b4dff 82%)';
    case 4: return `repeating-linear-gradient(0deg, rgba(255,255,255,.6) 0 .08em, transparent .08em .22em), ${cor}`;
    case 5: return 'radial-gradient(circle at 30% 35%, #fff 0 5%, transparent 7%), radial-gradient(circle at 68% 62%, #fff 0 4%, transparent 6%), radial-gradient(circle at 55% 25%, #ff8ad8 0 3%, transparent 5%), radial-gradient(circle at 50% 70%, #6b3fa8, #1c1f45)';
    case 6: return 'conic-gradient(#ffd6f5, #d6f0ff, #fff7c2, #d9ffe0, #ffd6f5)';
    case 7: return 'radial-gradient(circle at 30% 60%, #ffcf4a 0 6%, transparent 12%), linear-gradient(120deg, transparent 40%, #ff6a1a 42% 47%, transparent 49%), linear-gradient(40deg, transparent 55%, #ff8a1a 57% 61%, transparent 63%), #3b1612';
    // ouro (o nivel 14)
    case 8: return 'radial-gradient(circle at 70% 30%, #fff 0 6%, transparent 9%), linear-gradient(135deg, #9a6210 0%, #ffd75a 45%, #fff1b0 52%, #e0a020 60%, #8a5410 100%)';
    default: return cor;
  }
}

/**
 * @param {Document} doc
 * @param {Record<string, string>} T
 */
export function criarHud(doc, T) {
  const icone = (id) => svgIcone(id) || ICONES_PROTOTIPOS[id] || '';
  /** etiqueta com o nome do reforco embaixo do botao (pedido do usuario em 2026-10-18); os prototipos nao tem nome */
  const nomeCurto = (id) => {
    const n = T['poder.' + id + '.curto'] || T['poder.' + id];
    return n ? `<i class="nome" aria-hidden="true">${n}</i>` : '';
  };
  const $ = (id) => /** @type {HTMLElement} */ (doc.getElementById(id));
  let encosto = '';
  /** @type {Array<any>|null} skins da partida (indice = nivel), para a barra e o proximo */
  let skins = null;
  /** @type {Map<string, HTMLCanvasElement>} imagem 16x16 de cada skin de pixel (pela chave) */
  const imagensSkin = new Map();

  /** A imagem 16x16 da skin: os pixels opacos sobre a cor do corpo. */
  function imagemSkin(ap) {
    let c = imagensSkin.get(ap.chave);
    if (c) return c;
    c = doc.createElement('canvas');
    c.width = 16;
    c.height = 16;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.fillStyle = hexDaMistura(ap.pig);
      ctx.fillRect(0, 0, 16, 16);
      for (let p = 0; p < 256; p++) {
        const i = ap.px[p] & 15;
        if (!i) continue;
        ctx.fillStyle = PALETA[i];
        ctx.fillRect(p % 16, p >> 4, 1, 1);
      }
    }
    if (imagensSkin.size > 40) imagensSkin.clear();
    imagensSkin.set(ap.chave, c);
    return c;
  }

  /** Fundo CSS da bolinha da barra para um nivel com skin (null: o de sempre). @param {number} k */
  function fundoSkin(k) {
    const ap = skins && skins[k];
    if (!ap || !ap.ap) return null;
    if (ap.px) {
      const tam = ap.modo === 1 ? 'cover' : '0.6em 0.6em';
      return `url(${imagemSkin(ap).toDataURL()}) center/${tam} repeat, ${ap.hex};image-rendering:pixelated`;
    }
    return `radial-gradient(circle at 35% 30%, rgba(255,255,255,.6) 0 12%, transparent 32%), ${ap.hex}`;
  }
  const el = {
    pontos: $('pontos'), recorde: $('recorde'), proximo: /** @type {HTMLCanvasElement} */ ($('cProximo')), proximoCaixa: $('proximoCaixa'),
    base: $('base'), meta: $('meta'), menu: $('menu'), fim: $('fim'), fimPontos: $('fimPontos'), fimSub: $('fimSub'),
    fimTitulo: $('fimTitulo'), reviver: $('bReviver'), anuncio: $('anuncio'), anNum: $('anNum'), dep: $('depuracao'),
    gotas: $('gotas'), aviso: $('aviso'), fimGanho: $('fimGanho'), fimGotas: $('fimGotas'), dobrar: $('bDobrar'), continuar: $('bContinuar'),
    revelacao: $('revelacao'), dica: $('dica'), fimQuase: $('fimQuase'), lojaFim: $('bLojaFim'),
    oferta: $('oferta'), ofTitulo: $('ofTitulo'), ofVideo: /** @type {HTMLButtonElement} */ ($('ofVideo')), ofNota: $('ofNota'),
    ofGotas: /** @type {HTMLButtonElement} */ ($('ofGotas')), ofPreco: $('ofPreco'), ofFalta: $('ofFalta'), ofNao: $('ofNao'),
  };
  /** @type {((escolha: 'video'|'gotas'|'nao') => void)|null} */
  let fecharOferta = null;
  /** @param {'video'|'gotas'|'nao'} escolha */
  const escolherOferta = (escolha) => {
    if (!fecharOferta) return;
    const f = fecharOferta;
    fecharOferta = null;
    el.oferta.hidden = true;
    f(escolha);
  };
  if (el.oferta) {
    el.ofVideo.addEventListener('click', () => escolherOferta('video'));
    el.ofGotas.addEventListener('click', () => escolherOferta('gotas'));
    el.ofNao.addEventListener('click', () => escolherOferta('nao'));
  }
  for (const n of doc.querySelectorAll('[data-t]')) {
    const k = /** @type {HTMLElement} */ (n).dataset.t || '';
    if (T[k]) n.textContent = T[k];
  }
  for (const n of doc.querySelectorAll('[data-t-aria]')) {
    const k = /** @type {HTMLElement} */ (n).dataset.tAria || '';
    if (T[k]) n.setAttribute('aria-label', T[k]);
  }
  const cb = {
    pausar: () => {}, continuar: () => {}, recomecar: () => {}, deNovo: () => {}, reviver: () => {}, som: () => {}, musica: () => {},
    poder: (/** @type {string} */ _id) => {}, menuFim: () => {}, dobrar: () => {}, gotas: () => {}, lojaFim: () => {},
  };
  $('bPausa').addEventListener('click', () => cb.pausar());
  $('bContinuar').addEventListener('click', () => cb.continuar());
  $('bRecomecar').addEventListener('click', () => cb.recomecar());
  $('bDeNovo').addEventListener('click', () => cb.deNovo());
  $('bReviver').addEventListener('click', () => cb.reviver());
  $('bSom').addEventListener('click', () => cb.som());
  $('bMusica').addEventListener('click', () => cb.musica());
  $('bMenuFim').addEventListener('click', () => cb.menuFim());
  $('bDobrar').addEventListener('click', () => cb.dobrar());
  $('gotasHud').addEventListener('click', () => cb.gotas());
  el.lojaFim.addEventListener('click', () => cb.lojaFim());

  /** @type {Map<string, HTMLButtonElement>} */
  const poderes = new Map();
  /** cache do que esta no DOM */
  const ultimo = { pontos: '', recorde: '', proximo: '', evol: '', poderes: '', colecao: '', gotas: -1 };
  const listaMissoes = $('listaMissoes');
  /** @type {Array<any>} a ultima barra de evolucao (cor e textura de cada nivel) */
  let evol = [];
  /** reforco com a dica (o botao pulsa e a mao toca nele) */
  let dicaId = '';
  let revelaId = 0;

  /** Bolinha de um nivel (1..13) como na barra; "?" se ninguem o viu ainda. @param {number} k */
  function bola(k) {
    const e = evol[k - 1];
    if (!e || !e.visto) return '<i class="desconhecido">?</i>';
    return `<i style="background:${fundoSkin(k) || fundoTextura(e.cor, e.textura)}"></i>`;
  }
  /** Texto com {n} e {item} preenchidos. @param {string} chave @param {Record<string, string|number>} v */
  const texto = (chave, v) => String(T[chave] || '').replace(/\{(\w+)\}/g, (_, k) => (k in v ? String(v[k]) : ''));

  /** A mao da dica com a ponta do dedo no centro do botao (os botoes andam com o pote). */
  function posicionarDica() {
    const b = dicaId ? poderes.get(dicaId) : null;
    const r = b && !b.hidden ? b.getBoundingClientRect() : null;
    if (!r || r.width <= 0) { el.dica.hidden = true; return; }
    el.dica.hidden = false;
    el.dica.style.left = Math.round(r.left + r.width / 2) + 'px';
    el.dica.style.top = Math.round(r.top + r.height / 2) + 'px';
  }
  /** fila de avisos (um por vez, 2,2 s cada) */
  const avisos = [];
  let avisoId = 0;
  function proximoAviso() {
    const t = avisos.shift();
    if (t === undefined) { el.aviso.hidden = true; avisoId = 0; return; }
    el.aviso.textContent = t;
    el.aviso.hidden = false;
    // reinicia a animacao de entrada
    el.aviso.classList.remove('entra');
    void el.aviso.offsetWidth;
    el.aviso.classList.add('entra');
    avisoId = /** @type {any} */ (setTimeout(proximoAviso, 2200));
  }

  /** Desenha o slime do "proximo" no canvasinho (com a skin equipada do nivel, se tiver). */
  function desenharProximo(pig, escala = 1, k = 0) {
    const c = el.proximo;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    if (!pig) return;
    const r = 34 * escala;
    const cx = c.width / 2;
    const cy = c.height / 2 + 2;
    ctx.fillStyle = '#17161c';
    ctx.beginPath();
    ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
    ctx.fill();
    const ap = k && skins ? skins[k] : null;
    ctx.fillStyle = ap && ap.ap ? ap.hex : hexDaMistura(pig);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    if (ap && ap.ap && ap.px) {
      // a imagem da skin dentro do circulo: a estampa cobre o corpo; o ladrilho repete
      ctx.save();
      ctx.clip();
      ctx.imageSmoothingEnabled = false;
      const img = imagemSkin(ap);
      if (ap.modo === 1) ctx.drawImage(img, cx - r * 1.05, cy - r * 1.05, r * 2.1, r * 2.1);
      else {
        const t = Math.max(8, r * 0.7);
        for (let y = cy - r - t; y < cy + r; y += t) for (let x = cx - r - t; x < cx + r; x += t) ctx.drawImage(img, x, y, t, t);
      }
      ctx.restore();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = r * 0.14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx - r * 0.38, cy - r * 0.38, r * 0.25, Math.PI * 1.0, Math.PI * 1.5);
    ctx.stroke();
  }

  return {
    /** Monta os botoes do modo (power-ups, barra). @param {any} modo */
    preparar(modo) {
      const h = modo.hud();
      el.base.innerHTML = '';
      poderes.clear();
      // modo novo: o que esta no DOM nao vale mais (botoes recriados, outra barra, outro placar)
      for (const k of ['pontos', 'recorde', 'proximo', 'evol', 'poderes', 'colecao']) ultimo[k] = '';
      for (const p of h.poderes || []) {
        const b = doc.createElement('button');
        b.className = 'btn poder' + (PREMIOS.includes(p.id) ? ' premio' : '');
        const selo = svgIcone('video');
        b.dataset.poder = p.id;
        b.innerHTML = icone(p.id) + `<i class="conta"></i><i class="selo" aria-hidden="true" hidden>${selo}</i>` + nomeCurto(p.id);
        b.setAttribute('aria-label', T['poder.' + p.id] || p.id);
        b.title = T['poder.' + p.id] || '';
        b.addEventListener('click', () => cb.poder(p.id));
        b.hidden = !!p.oculto;
        el.base.appendChild(b);
        poderes.set(p.id, b);
      }
      // o 5o espaco existe desde o inicio (tracejado com "?"): os botoes nao pulam quando o premio chega
      if ((h.poderes || []).some((p) => PREMIOS.includes(p.id))) {
        const v = doc.createElement('button');
        v.className = 'btn poder vago';
        v.tabIndex = -1;
        v.setAttribute('aria-label', T['poder.vago'] || '');
        v.dataset.poder = 'vago';
        v.innerHTML = icone('vago') + nomeCurto('vago');
        el.base.appendChild(v);
        poderes.set('_vago', v);
      }
      el.proximoCaixa.hidden = h.proximo === undefined;
      doc.querySelector('.placar')?.toggleAttribute('hidden', h.pontos === null);
    },
    /**
     * Skins da partida (indice = nivel; null nos prototipos): a barra de evolucao e o proximo
     * passam a mostrar a skin equipada. @param {Array<any>|null} t
     */
    definirAparencias(t) {
      skins = t;
      ultimo.proximo = '';
      ultimo.evol = '';
    },
    /**
     * Reforcos colados ao pote (paisagem): a coluna encosta no pote da direita (px CSS da borda direita e
     * do meio); null volta a coluna da direita (prototipos, retrato).
     * @param {number[]|null} a
     */
    encostar(a) {
      const v = a ? Math.round(a[0]) + ',' + Math.round(a[1]) : '';
      if (v === encosto) return;
      encosto = v;
      const hud = /** @type {HTMLElement} */ (el.base.parentElement);
      doc.body.classList.toggle('colado', !!a);
      if (a) {
        hud.style.setProperty('--encosto-x', Math.round(a[0]) + 'px');
        hud.style.setProperty('--encosto-y', Math.round(a[1]) + 'px');
      }
    },
    /** Centro do botao de um reforco (px CSS), ou null se nao esta na tela. @param {string} id */
    centroPoder(id) {
      const b = poderes.get(id);
      if (!b || b.hidden) return null;
      const r = b.getBoundingClientRect();
      return r.width > 0 ? [r.left + r.width / 2, r.top + r.height / 2] : null;
    },
    /** @param {any} h */
    atualizar(h) {
      if (!h) return;
      if (h.pontos !== null && h.pontos !== undefined) {
        const p = String(h.pontos);
        if (p !== ultimo.pontos) {
          ultimo.pontos = p;
          // o rotulo num span: no retrato do celular ele some e fica so o numero (o botao da Poki
          // ocupa o canto de cima a esquerda; print do iPhone, 2026-10-18)
          if (typeof h.pontos === 'string') el.pontos.textContent = p;
          else {
            el.pontos.textContent = '';
            const rot = doc.createElement('i');
            rot.textContent = (T.pontos || 'Score') + ': ';
            el.pontos.append(rot, p);
          }
        }
        const r = String(h.recorde || 0);
        if (r !== ultimo.recorde) { ultimo.recorde = r; el.recorde.textContent = typeof h.recorde === 'string' ? r : (T.recorde || 'Best') + ': ' + r; }
      }
      if (h.proximo !== undefined) {
        const nk = h.proximoNivel || 0;
        const k = JSON.stringify(h.proximo) + (h.proximoEscala || 1) + ':' + nk;
        if (k !== ultimo.proximo) { ultimo.proximo = k; desenharProximo(h.proximo, h.proximoEscala || 1, nk); }
      }
      if (h.evolucao) {
        const ob = h.objetivo || null;
        const k = JSON.stringify(h.evolucao) + JSON.stringify(ob);
        if (k !== ultimo.evol) {
          ultimo.evol = k;
          evol = h.evolucao;
          // a meta da vez: a pilula com a bolinha do nivel e o alvo pulsando na barra. No meio da
          // partida ela alterna com uma meta curta (missao do dia ou meta da partida) e o progresso
          const mi = ob && ob.missao;
          const ev = ob && ob.evento;
          // o evento: icone, nome (no pedido, o nivel pedido) e a contagem do tempo que resta
          const resta = ev && ev.resta > 0 ? ` · ${ev.resta}s` : '';
          const pilula = !ob ? ''
            : ev
              ? `<div class="objetivo evento ${ev.tipo}${ev.aviso ? ' aviso' : ''}${ev.ok ? ' ok' : ''}"><b aria-hidden="true">${ICONE_EVENTO[ev.id] || '•'}</b>`
                + (ev.id === 'pedido' && ev.alvo ? `<span>${texto('pilula.pedido', {})}</span>${bola(ev.alvo)}<span>${ev.ok ? ' ✓' : resta}</span>` : `<span>${texto('ev.' + ev.id, {})}${resta}</span>`)
                + '</div>'
            : mi
              ? `<div class="objetivo missao"><b aria-hidden="true">${ICONE_MISSAO[mi.tipo] || '•'}</b><span>${texto('missao.' + mi.tipo, { n: mi.meta })} · ${mi.prog}/${mi.meta} · +${mi.premio} 💧</span></div>`
            : ob.supers
              // depois do 14 (2026-10-18): os super slimes da partida e o recorde
              ? `<div class="objetivo super"><b aria-hidden="true">🌟</b><span>${texto('pilula.super', { n: ob.supers.n, r: ob.supers.recorde || 0 })}</span></div>`
              : `<div class="objetivo${ob.cresce ? ' cresce' : ''}">${bola(ob.nivel)}<span>${texto(ob.cresce ? 'objetivoCresce' : 'objetivoProximo', { n: ob.nivel })}${ob.premio ? ` · +${ob.premio} 💧` : ''}</span></div>`;
          el.meta.innerHTML = pilula + '<div class="evolucao">' + h.evolucao.map((e) => {
            const tam = (1.05 + e.k * 0.07).toFixed(2);
            const alvo = ob && ob.nivel === e.k + 1 ? ' alvo' : '';
            return e.visto
              ? `<i class="${alvo.trim()}" style="width:${tam}em;height:${tam}em;background:${fundoSkin(e.k + 1) || fundoTextura(e.cor, e.textura)}">${e.icone || ''}</i>`
              : `<i class="desconhecido${alvo}" style="width:${tam}em;height:${tam}em">?</i>`;
          }).join('') + '</div>';
          // a #meta com a barra tem altura fixa na paisagem (estilo.css)
          el.meta.classList.add('barra');
        }
      } else if (h.metaHtml !== undefined && h.metaHtml !== ultimo.evol) {
        ultimo.evol = h.metaHtml;
        el.meta.innerHTML = h.metaHtml;
        el.meta.classList.remove('barra');
      }
      if (h.colecao) this.colecao(h.colecao);
      if (dicaId) posicionarDica();
      if (h.poderes) {
        const k = JSON.stringify(h.poderes);
        if (k !== ultimo.poderes) {
          ultimo.poderes = k;
          for (const p of h.poderes) {
            const b = poderes.get(p.id);
            if (!b) continue;
            const conta = /** @type {HTMLElement} */ (b.querySelector('.conta'));
            conta.textContent = p.qtd === undefined ? '' : String(p.qtd);
            conta.hidden = !!p.video;
            /** @type {HTMLElement} */ (b.querySelector('.selo')).hidden = !p.video;
            b.classList.toggle('vazio', p.qtd === 0 && !p.video);
            b.classList.toggle('video', !!p.video);
            b.classList.toggle('ativo', !!p.ativo);
            b.setAttribute('aria-pressed', p.ativo ? 'true' : 'false');
            const nome = T['poder.' + p.id] || p.id;
            b.setAttribute('aria-label', p.video && T['poder.video'] ? `${nome}: ${T['poder.video']}` : nome);
            b.hidden = !!p.oculto;
          }
          const vago = poderes.get('_vago');
          if (vago) vago.hidden = h.poderes.some((p) => PREMIOS.includes(p.id) && !p.oculto);
        }
      }
    },
    /** @param {boolean} v @param {{ fim?: boolean }} [o] fim: aberto pela tela de fim (nao ha o que continuar) */
    menu(v, o = {}) {
      el.menu.hidden = !v;
      if (v) el.continuar.hidden = !!o.fim;
    },
    /** Contador de gotas no topo. @param {number} n @param {(n: number) => string} formatar */
    gotas(n, formatar) {
      if (n === ultimo.gotas) return;
      const subiu = ultimo.gotas >= 0 && n > ultimo.gotas;
      ultimo.gotas = n;
      el.gotas.textContent = formatar(n);
      if (subiu) {
        const caixa = /** @type {HTMLElement} */ (el.gotas.parentElement);
        caixa.classList.remove('pulo');
        void caixa.offsetWidth;
        caixa.classList.add('pulo');
      }
    },
    /** O video premiado falhou ha pouco: os botoes com o selo do video ficam apagados. @param {boolean} v */
    videoEspera(v) {
      el.base.classList.toggle('espera-video', v);
    },
    /** Aviso curto no alto da tela (missao cumprida, nivel novo, sequencia). @param {string} texto */
    aviso(texto) {
      avisos.push(texto);
      if (!avisoId) proximoAviso();
    },
    /**
     * Slime novo descoberto: cartao com a bolinha do nivel por 2,6 s (nao bloqueia o toque).
     * @param {number} k nivel @param {string} sub linha de baixo (nivel e gotas)
     * @param {boolean} [fixo] fica parado na tela, sem animacao (prints do ?revelar)
     */
    revelar(k, sub, fixo = false) {
      const e = evol[k - 1];
      // atributo inteiro: o fundo da skin de pixel traz o image-rendering junto
      el.revelacao.querySelector('.bola')?.setAttribute('style', e ? 'background:' + (fundoSkin(k) || fundoTextura(e.cor, e.textura)) : '');
      /** @type {HTMLElement} */ (el.revelacao.querySelector('b')).textContent = T.novoSlime || '';
      /** @type {HTMLElement} */ (el.revelacao.querySelector('small')).textContent = sub;
      el.revelacao.hidden = false;
      el.revelacao.classList.remove('entra');
      clearTimeout(revelaId);
      if (fixo) return;
      void el.revelacao.offsetWidth;
      el.revelacao.classList.add('entra');
      revelaId = /** @type {any} */ (setTimeout(() => { el.revelacao.hidden = true; }, 2600));
    },
    /** Dica do reforco: o botao pulsa e a mao toca nele ('' tira). @param {string} id */
    dica(id) {
      dicaId = id || '';
      for (const [k, b] of poderes) b.classList.toggle('dica', k === dicaId);
      if (dicaId) posicionarDica(); else el.dica.hidden = true;
    },
    /** Grade da colecao (Croma-dex) no menu. @param {any[]} lista */
    colecao(lista) {
      const k = JSON.stringify(lista.map((c) => c.visto));
      if (k === ultimo.colecao) return;
      ultimo.colecao = k;
      let g = doc.getElementById('colecao');
      if (!g) {
        g = doc.createElement('div');
        g.id = 'colecao';
        listaMissoes.after(g);
      }
      g.innerHTML = lista.map((c) => (c.visto ? `<i title="${c.nome}" style="background:${c.cor}"></i>` : '<i class="desconhecido">?</i>')).join('');
    },
    /** @param {boolean} v @param {any} [d] */
    fim(v, d) {
      el.fim.hidden = !v;
      if (!v || !d) return;
      el.fimPontos.textContent = String(d.pontos ?? '');
      el.fimSub.textContent = d.novo ? T.novoRecorde : d.sub || '';
      el.fimTitulo.textContent = d.titulo ? T[d.titulo] || d.titulo : T.fim;
      el.reviver.hidden = !d.reviver;
      this.ganhoFim(d.gotas || 0, !!d.dobrar);
      // quase la: o recorde por pouco vale mais que o nivel seguinte (uma linha so)
      const q = d.quase || {};
      let quase = '';
      if (q.recorde) quase = `<span>${texto('faltaRecorde', { n: q.recorde })}</span>`;
      else if (q.nivel) quase = `${bola(q.nivel - 1)}<span aria-hidden="true">→</span>${bola(q.nivel)}<span>${texto('quaseNivel', { n: q.nivel })}</span>`;
      el.fimQuase.innerHTML = quase;
      el.fimQuase.hidden = !quase;
      // o proximo item da loja: quanto falta, ou que ja da para comprar (abre a loja)
      const L = q.loja;
      el.lojaFim.hidden = !L;
      if (L) {
        el.lojaFim.textContent = '🛒 ' + (L.falta > 0 ? texto('faltaLoja', { n: L.falta, item: L.nome }) : texto('podeComprar', { item: L.nome }));
        el.lojaFim.classList.toggle('pode', !(L.falta > 0));
      }
    },
    /** Gotas ganhas na partida e o botao de dobrar (video). @param {string|number} texto @param {boolean} dobrar */
    ganhoFim(texto, dobrar) {
      el.fimGanho.hidden = !texto;
      el.fimGotas.textContent = '+' + texto;
      el.dobrar.hidden = !dobrar;
    },
    /** Anuncio simulado (so em localhost): contagem de 3 s, premio sempre. */
    /**
     * Reforco acabado: +1 pelo video ou por gotas, com "agora nao" (o jogo fica pausado por baixo).
     * Resolve com a escolha; sem video (Basic Launch, bloqueador, espera) o botao some ou apaga.
     * @param {{ id: string, video: boolean, espera: boolean, bloqueado: boolean, preco: number, gotas: number }} o
     * @returns {Promise<'video'|'gotas'|'nao'>}
     */
    oferta(o) {
      escolherOferta('nao');
      el.ofTitulo.innerHTML = '';
      const t = doc.createElement('span');
      t.textContent = formatar(T['oferta.titulo'], { nome: T['poder.' + o.id + '.curto'] || T['poder.' + o.id] || o.id });
      el.ofTitulo.insertAdjacentHTML('beforeend', icone(o.id));
      el.ofTitulo.appendChild(t);
      el.ofVideo.hidden = !o.video && !o.espera;
      el.ofVideo.disabled = !o.video;
      el.ofNota.hidden = !(o.espera || o.bloqueado);
      el.ofNota.textContent = o.bloqueado ? T.videoBloqueado : T.semVideo;
      el.ofPreco.textContent = String(o.preco);
      el.ofGotas.disabled = o.gotas < o.preco;
      el.ofFalta.hidden = o.gotas >= o.preco;
      el.ofFalta.textContent = formatar(T['oferta.falta'], { n: Math.max(0, o.preco - o.gotas) });
      el.oferta.hidden = false;
      return new Promise((ok) => { fecharOferta = ok; });
    },
    /** Fecha a oferta aberta como "agora nao" (Esc, pausa). */
    fecharOferta() { escolherOferta('nao'); },
    anuncioLocal(seg) {
      return new Promise((ok) => {
        el.anuncio.hidden = false;
        let n = seg;
        el.anNum.textContent = String(n);
        const id = setInterval(() => {
          n--;
          el.anNum.textContent = String(n);
          if (n <= 0) { clearInterval(id); el.anuncio.hidden = true; ok(true); }
        }, 1000);
      });
    },
    depurar(med, mundo, cena, modo) {
      el.dep.hidden = false;
      if (!el.depTexto) {
        el.depTexto = doc.createElement('div');
        el.dep.appendChild(el.depTexto);
        // laboratorio: sliders do material de cada pote, ao vivo
        if (modo && modo.materiais && modo.ajustar) {
          const CHAVES = [['k', 0, 0.06, 0.001], ['epsY', 0, 1.5, 0.01], ['lam', 0, 12, 0.1], ['coesao', 0, 0.08, 0.002], ['xsph', 0, 0.4, 0.01], ['amortRig', 0, 0.3, 0.01]];
          modo.materiais.forEach((mat, pote) => {
            const t = doc.createElement('b');
            t.textContent = mat.nome;
            el.dep.appendChild(t);
            for (const [ch, a, b, passo] of CHAVES) {
              const lab = doc.createElement('label');
              const id = `dep-${pote}-${ch}`;
              lab.innerHTML = `<span>${ch}</span><input id="${id}" type="range" min="${a}" max="${b}" step="${passo}" value="${mat[ch]}"><output>${mat[ch]}</output>`;
              const inp = /** @type {HTMLInputElement} */ (lab.querySelector('input'));
              const out = /** @type {HTMLElement} */ (lab.querySelector('output'));
              inp.addEventListener('input', () => { modo.ajustar(pote, ch, Number(inp.value)); out.textContent = inp.value; });
              el.dep.appendChild(lab);
            }
          });
        }
      }
      el.depTexto.textContent = `fps ${med.fps.toFixed(0)}  passo ${med.passoMs.toFixed(2)} ms  desenho ${med.desenhoMs.toFixed(2)} ms\n`
        + `particulas ${mundo.n}  slimes ${mundo.vivos().length}  dormindo ${mundo.vivos().filter((s) => s.dormindo).length}\n`
        + `render ${cena.usaGl ? 'webgl2' : '2d'} ${cena.qualidade}`;
    },
    aoPausar(f) { cb.pausar = f; },
    aoContinuar(f) { cb.continuar = f; },
    aoRecomecar(f) { cb.recomecar = f; },
    aoDeNovo(f) { cb.deNovo = f; },
    aoReviver(f) { cb.reviver = f; },
    aoSom(f) { cb.som = f; },
    aoMusica(f) { cb.musica = f; },
    aoPoder(f) { cb.poder = f; },
    aoMenuFim(f) { cb.menuFim = f; },
    aoDobrar(f) { cb.dobrar = f; },
    aoGotas(f) { cb.gotas = f; },
    aoLojaFim(f) { cb.lojaFim = f; },
  };
}

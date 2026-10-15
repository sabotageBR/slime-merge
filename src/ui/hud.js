// HUD em DOM: placar, gotas, proximo slime, barra de evolucao, power-ups (com o selo do video),
// avisos, fim (com as gotas da partida), anuncio simulado (localhost) e o painel do ?debug.
// O conteudo do menu (modos, loja, missoes) e do src/ui/menu.js. So escreve no DOM quando muda.

import { hexDaMistura } from '../cor/km.js';

const ICONES = {
  trocar: '<svg viewBox="0 0 24 24"><g class="t"><path d="M5 9h11l-3-3M19 15H8l3 3"/></g><path d="M5 9h11l-3-3M19 15H8l3 3"/></svg>',
  chacoalhar: '<svg viewBox="0 0 24 24"><g class="t"><circle cx="12" cy="13" r="6"/></g><circle cx="12" cy="13" r="6"/><path d="M9.5 12h.01M14.5 12h.01M11 16h2M3 6c1-1 2-1 3 0M18 6c1-1 2-1 3 0M3 20c1-1 2-1 3 0M18 20c1-1 2-1 3 0"/></svg>',
  alargar: '<svg viewBox="0 0 24 24"><g class="t"><path d="M9 21 5 5M15 21l4-16M5 5 3 9M5 5l4 2M19 5l2 4M19 5l-4 2"/></g><path d="M9 21 5 5M15 21l4-16M5 5 3 9M5 5l4 2M19 5l2 4M19 5l-4 2"/></svg>',
  mira: '<svg viewBox="0 0 24 24"><g class="t"><circle cx="12" cy="12" r="7"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/></g><circle cx="12" cy="12" r="7"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/><circle cx="12" cy="12" r="1.5"/></svg>',
  calor: '<svg viewBox="0 0 24 24"><g class="t"><path d="M12 3c3 4 5 6 5 10a5 5 0 0 1-10 0c0-2 1-4 2-5 0 2 1 3 2 3 0-3 0-5 1-8z"/></g><path d="M12 3c3 4 5 6 5 10a5 5 0 0 1-10 0c0-2 1-4 2-5 0 2 1 3 2 3 0-3 0-5 1-8z"/></svg>',
  gelo: '<svg viewBox="0 0 24 24"><g class="t"><path d="M12 3v18M4 7.5l16 9M4 16.5l16-9"/></g><path d="M12 3v18M4 7.5l16 9M4 16.5l16-9M9 4l3 2 3-2M9 20l3-2 3 2"/></svg>',
  tesoura: '<svg viewBox="0 0 24 24"><g class="t"><circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8 16 19 4M16 16 5 4"/></g><circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8 16 19 4M16 16 5 4"/></svg>',
  tinta: '<svg viewBox="0 0 24 24"><g class="t"><path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/></g><path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/></svg>',
  mexer: '<svg viewBox="0 0 24 24"><g class="t"><path d="M12 4a8 8 0 1 0 8 8"/><path d="m20 4-.5 6-6-.5"/></g><path d="M12 4a8 8 0 1 0 8 8"/><path d="m20 4-.5 6-6-.5"/></svg>',
  servir: '<svg viewBox="0 0 24 24"><g class="t"><path d="m5 12 5 5 9-10"/></g><path d="m5 12 5 5 9-10"/></svg>',
  ralo: '<svg viewBox="0 0 24 24"><g class="t"><path d="M4 8h16l-3 12H7z"/></g><path d="M4 8h16l-3 12H7zM9 4h6"/></svg>',
};

/**
 * Fundo CSS da bolinha da barra de evolucao, com a textura do nivel (a mesma do shader).
 * @param {string} cor
 * @param {number} [t] 1 bolinhas, 2 listras, 3 arco-iris, 4 ondas, 5 galaxia, 6 glitter
 */
function fundoTextura(cor, t) {
  switch (t) {
    case 1: return `radial-gradient(circle, rgba(255,255,255,.8) 0 26%, transparent 30%) 0 0/.42em .42em, ${cor}`;
    case 2: return `repeating-linear-gradient(45deg, rgba(255,255,255,.9) 0 .1em, transparent .1em .22em), ${cor}`;
    case 3: return 'radial-gradient(circle, #ff4d4d 0 18%, #ffb000 18% 34%, #ffe600 34% 50%, #3ddc5a 50% 66%, #2f8cff 66% 82%, #9b4dff 82%)';
    case 4: return `repeating-linear-gradient(0deg, rgba(255,255,255,.6) 0 .08em, transparent .08em .22em), ${cor}`;
    case 5: return 'radial-gradient(circle at 30% 35%, #fff 0 5%, transparent 7%), radial-gradient(circle at 68% 62%, #fff 0 4%, transparent 6%), radial-gradient(circle at 55% 25%, #ff8ad8 0 3%, transparent 5%), radial-gradient(circle at 50% 70%, #6b3fa8, #1c1f45)';
    case 6: return 'conic-gradient(#ffd6f5, #d6f0ff, #fff7c2, #d9ffe0, #ffd6f5)';
    default: return cor;
  }
}

/**
 * @param {Document} doc
 * @param {Record<string, string>} T
 */
export function criarHud(doc, T) {
  const $ = (id) => /** @type {HTMLElement} */ (doc.getElementById(id));
  const el = {
    pontos: $('pontos'), recorde: $('recorde'), proximo: /** @type {HTMLCanvasElement} */ ($('cProximo')), proximoCaixa: $('proximoCaixa'),
    base: $('base'), meta: $('meta'), menu: $('menu'), fim: $('fim'), fimPontos: $('fimPontos'), fimSub: $('fimSub'),
    fimTitulo: $('fimTitulo'), reviver: $('bReviver'), anuncio: $('anuncio'), anNum: $('anNum'), dep: $('depuracao'),
    gotas: $('gotas'), aviso: $('aviso'), fimGanho: $('fimGanho'), fimGotas: $('fimGotas'), dobrar: $('bDobrar'), continuar: $('bContinuar'),
  };
  for (const n of doc.querySelectorAll('[data-t]')) {
    const k = /** @type {HTMLElement} */ (n).dataset.t || '';
    if (T[k]) n.textContent = T[k];
  }
  const cb = {
    pausar: () => {}, continuar: () => {}, recomecar: () => {}, deNovo: () => {}, reviver: () => {}, som: () => {},
    poder: (/** @type {string} */ _id) => {}, menuFim: () => {}, dobrar: () => {}, gotas: () => {},
  };
  $('bPausa').addEventListener('click', () => cb.pausar());
  $('bContinuar').addEventListener('click', () => cb.continuar());
  $('bRecomecar').addEventListener('click', () => cb.recomecar());
  $('bDeNovo').addEventListener('click', () => cb.deNovo());
  $('bReviver').addEventListener('click', () => cb.reviver());
  $('bSom').addEventListener('click', () => cb.som());
  $('bMenuFim').addEventListener('click', () => cb.menuFim());
  $('bDobrar').addEventListener('click', () => cb.dobrar());
  $('gotasHud').addEventListener('click', () => cb.gotas());

  /** @type {Map<string, HTMLButtonElement>} */
  const poderes = new Map();
  /** cache do que esta no DOM */
  const ultimo = { pontos: '', recorde: '', proximo: '', evol: '', poderes: '', colecao: '', gotas: -1 };
  const listaMissoes = $('listaMissoes');
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

  /** Desenha o slime do "proximo" no canvasinho. */
  function desenharProximo(pig, escala = 1) {
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
    ctx.fillStyle = hexDaMistura(pig);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
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
        b.className = 'btn poder';
        b.innerHTML = (ICONES[p.id] || '') + '<i class="conta"></i><i class="selo" aria-hidden="true" hidden>🎬</i>';
        b.setAttribute('aria-label', p.id);
        b.addEventListener('click', () => cb.poder(p.id));
        el.base.appendChild(b);
        poderes.set(p.id, b);
      }
      el.proximoCaixa.hidden = h.proximo === undefined;
      doc.querySelector('.placar')?.toggleAttribute('hidden', h.pontos === null);
    },
    /** @param {any} h */
    atualizar(h) {
      if (!h) return;
      if (h.pontos !== null && h.pontos !== undefined) {
        const p = String(h.pontos);
        if (p !== ultimo.pontos) { ultimo.pontos = p; el.pontos.textContent = typeof h.pontos === 'string' ? p : (T.pontos || 'Score') + ': ' + p; }
        const r = String(h.recorde || 0);
        if (r !== ultimo.recorde) { ultimo.recorde = r; el.recorde.textContent = typeof h.recorde === 'string' ? r : (T.recorde || 'Best') + ': ' + r; }
      }
      if (h.proximo !== undefined) {
        const k = JSON.stringify(h.proximo) + (h.proximoEscala || 1);
        if (k !== ultimo.proximo) { ultimo.proximo = k; desenharProximo(h.proximo, h.proximoEscala || 1); }
      }
      if (h.evolucao) {
        const k = JSON.stringify(h.evolucao);
        if (k !== ultimo.evol) {
          ultimo.evol = k;
          el.meta.innerHTML = '<div class="evolucao">' + h.evolucao.map((e) => {
            const tam = (1.05 + e.k * 0.07).toFixed(2);
            return e.visto
              ? `<i style="width:${tam}em;height:${tam}em;background:${fundoTextura(e.cor, e.textura)}">${e.icone || ''}</i>`
              : `<i class="desconhecido" style="width:${tam}em;height:${tam}em">?</i>`;
          }).join('') + '</div>';
        }
      } else if (h.metaHtml !== undefined && h.metaHtml !== ultimo.evol) {
        ultimo.evol = h.metaHtml;
        el.meta.innerHTML = h.metaHtml;
      }
      if (h.colecao) this.colecao(h.colecao);
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
            b.hidden = !!p.oculto;
          }
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
    /** Aviso curto no alto da tela (missao cumprida, nivel novo, sequencia). @param {string} texto */
    aviso(texto) {
      avisos.push(texto);
      if (!avisoId) proximoAviso();
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
    },
    /** Gotas ganhas na partida e o botao de dobrar (video). @param {string|number} texto @param {boolean} dobrar */
    ganhoFim(texto, dobrar) {
      el.fimGanho.hidden = !texto;
      el.fimGotas.textContent = '+' + texto;
      el.dobrar.hidden = !dobrar;
    },
    /** Anuncio simulado (so em localhost): contagem de 3 s, premio sempre. */
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
    aoPoder(f) { cb.poder = f; },
    aoMenuFim(f) { cb.menuFim = f; },
    aoDobrar(f) { cb.dobrar = f; },
    aoGotas(f) { cb.gotas = f; },
  };
}

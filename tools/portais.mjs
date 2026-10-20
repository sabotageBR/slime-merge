// Os pacotes e o material grafico dos portais de distribuicao (Y8, Playgama, Yandex Games,
// GameMonetize, GameDistribution e GamePix), 2026-10-20.
//   node tools/portais.mjs                    # zips e material de todos
//   node tools/portais.mjs --so=builds        # so os zips
//   node tools/portais.mjs --so=arte          # so as imagens e os videos
//   node tools/portais.mjs --portal=y8,yandex # so esses portais
// Zips: tools/empacotar.mjs --alvo=<portal> (dist-portais/slime-merge-<portal>-<versao>.zip; "-sem-id"
// quando o portal pede id do painel e marketing/portais/ids.json ainda nao tem). No fim o dist/ volta a
// ser a build da Poki (--ensaio), para nao ficar a de um portal ali.
// Material em marketing/portais/<portal>/, no tamanho e no formato exatos que cada painel pede (ITENS;
// a fonte de cada regra esta no ficha.md do portal):
// - capas: tools/capas-crazy.html (a fisica e o render do jogo no caderno, com o titulo; sem titulo,
//   deitada, a pilha de perto), renderizadas em pelo menos 1600 px no lado maior e reduzidas;
// - icones: a mesma cena de perto (?caixa=), sem texto;
// - telas: o jogo de verdade, em ingles, numa partida jogada pelo bot (o sem fim cheio depois de 2 min,
//   o duelo, outro cesto e cenario), com o HUD, que os portais aceitam;
// - videos: o de 1920x1080 da CrazyGames; na Y8, a mesma partida continua sem a abertura com a capa
//   (gameplay desde o 1o s), no MP4 que todo painel le (mp4Compativel);
// - folha.jpg de cada portal, para conferir (nao vai para o envio).
// JPG que passa do peso maximo do portal desce de qualidade ate caber. Porta HTTP 5401, depuracao 9401.
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ, servir } from './servir.mjs';
import { abrirChrome, espera } from './cdp.mjs';

const JOGO = 'slime-merge';
const PORTA = 5401;
const PORTA_CDP = 9401;
const PORTAIS = ['y8', 'playgama', 'yandex', 'gamemonetize', 'gamedistribution', 'gamepix'];
const VIDEO_CRAZY = join(RAIZ, 'marketing/crazygames/video-1920x1080.mp4');
/** A abertura do video da CrazyGames: a capa parada e a fusao (tools/capas-crazy.mjs). */
const ABERTURA_VIDEO_S = 1.0 + 0.3;
/** O icone: a pilha de perto (os slimes vermelho e amarelo sorrindo), em coordenadas do mundo. */
const CAIXA_ICONE = '-3,4,3,10';
/**
 * As cenas das telas: a partida jogada pelo bot (`auto`, uma gota por segundo) depois de `passos` de
 * fisica, como os videos. `perfil` grava o check-in de hoje (sem o aviso da sequencia diaria por cima).
 */
const CENAS = {
  cheio: 'semente=34&passos=7200&auto=1000&cenario=caderno&cesto=becher&objeto=classico',
  comeco: 'semente=9&passos=2400&auto=900&cenario=caderno&cesto=becher&objeto=classico',
  duelo: 'modelo=5&semente=21&passos=3600&auto=900&cenario=caderno&cesto=becher&objeto=classico',
  jardim: 'semente=52&passos=6000&auto=1000&cenario=jardim&cesto=aquario&objeto=classico',
};
const PERFIL = `(() => { const d = new Date(); const hoje = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  localStorage.setItem('slime.perfil', JSON.stringify({ sequencia: { ultimo: hoje, dias: 1 } })); return hoje; })()`;

/**
 * @typedef {Object} Item
 * @property {string} arq
 * @property {'capa'|'icone'|'tela'|'video'} tipo
 * @property {number} [w]
 * @property {number} [h]
 * @property {'png'|'jpg'} [fmt]
 * @property {number} [maxKB]
 * @property {boolean} [titulo]   capa com o titulo (padrao: sim)
 * @property {string} [cena]      tela: chave de CENAS
 * @property {boolean} [cortaAbertura]
 */

/** O que cada portal pede (as mesmas medidas do tools/portais.mjs do hexadrop). @type {Record<string, Item[]>} */
const ITENS = {
  y8: [
    // "Standard Screenshot": vira o thumbnail das listas (a Y8 testa A/B entre eles). So gameplay.
    { arq: 'tela-760x570-1', tipo: 'tela', w: 760, h: 570, cena: 'cheio', fmt: 'jpg', maxKB: 2048 },
    { arq: 'tela-760x570-2', tipo: 'tela', w: 760, h: 570, cena: 'duelo', fmt: 'jpg', maxKB: 2048 },
    { arq: 'tela-760x570-3', tipo: 'tela', w: 760, h: 570, cena: 'jardim', fmt: 'jpg', maxKB: 2048 },
    { arq: 'tela-1280x720-1', tipo: 'tela', w: 1280, h: 720, cena: 'cheio', fmt: 'jpg', maxKB: 5120 },
    { arq: 'tela-1280x720-2', tipo: 'tela', w: 1280, h: 720, cena: 'duelo', fmt: 'jpg', maxKB: 5120 },
    { arq: 'promo-1920x1080', tipo: 'capa', w: 1920, h: 1080, fmt: 'jpg', maxKB: 5120 },
    { arq: 'promo-1080x1920', tipo: 'capa', w: 1080, h: 1920, fmt: 'jpg', maxKB: 5120 },
    { arq: 'card-760x570', tipo: 'capa', w: 760, h: 570, fmt: 'jpg', maxKB: 2048 },
    { arq: 'video-1920x1080', tipo: 'video', cortaAbertura: true },
  ],
  playgama: [
    { arq: 'capa-800x800', tipo: 'capa', w: 800, h: 800, fmt: 'png', maxKB: 10240 },
    { arq: 'capa-1080x1920', tipo: 'capa', w: 1080, h: 1920, fmt: 'png', maxKB: 10240 },
    { arq: 'capa-1920x1080', tipo: 'capa', w: 1920, h: 1080, fmt: 'png', maxKB: 10240 },
    // "Other assets", opcionais
    { arq: 'tela-1920x1080-1', tipo: 'tela', w: 1920, h: 1080, cena: 'cheio', fmt: 'jpg' },
    { arq: 'tela-1920x1080-2', tipo: 'tela', w: 1920, h: 1080, cena: 'duelo', fmt: 'jpg' },
    { arq: 'tela-1080x1920-1', tipo: 'tela', w: 1080, h: 1920, cena: 'cheio', fmt: 'jpg' },
    { arq: 'video-1920x1080', tipo: 'video' },
  ],
  yandex: [
    // Sem texto no icone; a capa pode ter o nome, igual ao titulo de cada idioma (5.1.3).
    { arq: 'icone-512x512', tipo: 'icone', w: 512, h: 512, fmt: 'png' },
    { arq: 'capa-800x470', tipo: 'capa', w: 800, h: 470, fmt: 'png' },
    { arq: 'capa-800x470-sem-texto', tipo: 'capa', w: 800, h: 470, fmt: 'png', titulo: false },
    { arq: 'hero-1560x520', tipo: 'capa', w: 1560, h: 520, fmt: 'png' },
    { arq: 'tela-desktop-1920x1080-1', tipo: 'tela', w: 1920, h: 1080, cena: 'cheio', fmt: 'png' },
    { arq: 'tela-desktop-1920x1080-2', tipo: 'tela', w: 1920, h: 1080, cena: 'duelo', fmt: 'png' },
    { arq: 'tela-desktop-1920x1080-3', tipo: 'tela', w: 1920, h: 1080, cena: 'jardim', fmt: 'png' },
    { arq: 'tela-mobile-1080x1920-1', tipo: 'tela', w: 1080, h: 1920, cena: 'cheio', fmt: 'png' },
    { arq: 'tela-mobile-1080x1920-2', tipo: 'tela', w: 1080, h: 1920, cena: 'comeco', fmt: 'png' },
    { arq: 'tela-mobile-1080x1920-3', tipo: 'tela', w: 1080, h: 1920, cena: 'jardim', fmt: 'png' },
    { arq: 'video-1920x1080', tipo: 'video' },
  ],
  gamemonetize: [
    { arq: 'thumb-512x384', tipo: 'capa', w: 512, h: 384, fmt: 'jpg' },
    { arq: 'thumb-512x512', tipo: 'capa', w: 512, h: 512, fmt: 'jpg' },
    { arq: 'thumb-512x340', tipo: 'capa', w: 512, h: 340, fmt: 'jpg' },
  ],
  gamedistribution: [
    // So JPG, no maximo 500 KB, tamanho exato. O titulo so nas de 1280; na 200x120, nada de logo.
    { arq: 'thumb-512x384', tipo: 'capa', w: 512, h: 384, fmt: 'jpg', maxKB: 500, titulo: false },
    { arq: 'thumb-512x512', tipo: 'capa', w: 512, h: 512, fmt: 'jpg', maxKB: 500, titulo: false },
    { arq: 'thumb-200x120', tipo: 'capa', w: 200, h: 120, fmt: 'jpg', maxKB: 500, titulo: false },
    { arq: 'banner-1280x720', tipo: 'capa', w: 1280, h: 720, fmt: 'jpg', maxKB: 500 },
    { arq: 'banner-1280x550', tipo: 'capa', w: 1280, h: 550, fmt: 'jpg', maxKB: 500 },
  ],
  gamepix: [
    { arq: 'icone-256x256', tipo: 'icone', w: 256, h: 256, fmt: 'png', maxKB: 1024 },
    { arq: 'capa-1360x850', tipo: 'capa', w: 1360, h: 850, fmt: 'png', maxKB: 1536 },
  ],
};

const opt = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), ''] : [a.slice(2, i), a.slice(i + 1)]; }));
const ESCOLHIDOS = opt.portal ? opt.portal.split(',') : PORTAIS;
for (const p of ESCOLHIDOS) {
  if (!ITENS[p]) {
    process.stdout.write(`portal desconhecido: ${p} (${PORTAIS.join(', ')})\n`);
    process.exit(2);
  }
}

if (opt.so !== 'arte') builds();
if (opt.so !== 'builds') await arte();

// ------------------------------------------------------------------ builds

function builds() {
  for (const p of ESCOLHIDOS) {
    const r = spawnSync('node', ['tools/empacotar.mjs', `--alvo=${p}`], { cwd: RAIZ, encoding: 'utf8', env: { ...process.env, IDS_PORTAL: '' } });
    process.stdout.write(r.stdout.split('\n').filter((l) => /^(alvo|dist-portais)/.test(l)).join('\n') + '\n');
    if (r.status !== 0) {
      process.stdout.write(`empacotar ${p} falhou:\n${r.stdout}${r.stderr}\n`);
      process.exit(1);
    }
  }
  // o dist/ volta a ser a build da Poki
  spawnSync('node', ['tools/empacotar.mjs', '--ensaio'], { cwd: RAIZ, encoding: 'utf8' });
}

// ------------------------------------------------------------------ arte

async function arte() {
  const fechar = await servir(PORTA);
  const c = await abrirChrome({ largura: 1200, altura: 800, porta: PORTA_CDP });
  const tmp = join(RAIZ, '.tmp/portais');
  mkdirSync(tmp, { recursive: true });
  /** O que ja foi feito nesta execucao, pela receita: o mesmo PNG serve a varios portais. */
  const feitos = new Map();
  /** @param {number} w @param {number} h @param {number} dpr @param {boolean} [toque] */
  const vista = async (w, h, dpr, toque = false) => {
    await c.cmd('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: dpr, mobile: toque });
    await c.cmd('Emulation.setTouchEmulationEnabled', { enabled: toque, maxTouchPoints: toque ? 2 : 0 });
  };

  /** Capa ou icone pelo tools/capas-crazy.html, em >= 1600 px no lado maior, reduzida para w x h. */
  async function cena(/** @type {string} */ chave, /** @type {number} */ w, /** @type {number} */ h, /** @type {string} */ extra) {
    if (feitos.has(chave)) return feitos.get(chave);
    const f = Math.max(1, Math.ceil(1600 / Math.max(w, h)));
    const W = w * f;
    const H = h * f;
    await vista(W, H, 1);
    await c.ir(`http://127.0.0.1:${PORTA}/tools/capas-crazy.html?w=${W}&h=${H}${extra}`, 300);
    let pronto = false;
    for (let k = 0; k < 120 && !pronto; k++) {
      await espera(150);
      pronto = (await c.avaliar('document.title')) === 'PRONTO';
    }
    if (!pronto) throw new Error(`a capa ${chave} nao ficou pronta`);
    const bruto = join(tmp, `${chave}-bruto.png`);
    writeFileSync(bruto, await c.print());
    const png = join(tmp, `${chave}.png`);
    ff(['-i', bruto, '-vf', `scale=${w}:${h}:flags=lanczos`, '-pix_fmt', 'rgb24', png]);
    feitos.set(chave, png);
    return png;
  }

  /**
   * Uma tela do jogo em ingles. A vista e a metade do pedido (dpr 2) a partir de 1920; abaixo, uma
   * vista do proprio tamanho no dobro, reduzida (o HUD na proporcao de uma janela de verdade).
   */
  async function tela(/** @type {Item} */ it) {
    const w = /** @type {number} */ (it.w);
    const h = /** @type {number} */ (it.h);
    const chave = `tela-${w}x${h}-${it.cena}`;
    if (feitos.has(chave)) return feitos.get(chave);
    const retrato = h > w;
    const [vw, vh] = w >= 1920 || h >= 1920 ? [w / 2, h / 2] : [w, h];
    await vista(vw, vh, 2, retrato);
    // o armazenamento e da origem: uma pagina leve dela primeiro, para gravar o perfil
    await c.ir(`http://127.0.0.1:${PORTA}/LICENCAS.txt`, 300);
    await c.avaliar('localStorage.clear(); true');
    await c.avaliar(PERFIL);
    await c.ir(`http://127.0.0.1:${PORTA}/index.html?lang=en&${CENAS[/** @type {string} */ (it.cena)]}`, 1500);
    for (let k = 0; k < 60 && !(await c.avaliar('!!(window.__slime && __slime.J.modo && __slime.J.estado === "jogando")')); k++) await espera(250);
    // o bot joga um pouco em tempo real: gotas no ar, rostos e HUD vivos
    await c.avaliar('__slime.J.tocou = true; true');
    await espera(3200);
    const bruto = join(tmp, `${chave}-bruto.png`);
    writeFileSync(bruto, await c.print());
    const png = join(tmp, `${chave}.png`);
    ff(['-i', bruto, '-vf', `scale=${w}:${h}:flags=lanczos`, '-pix_fmt', 'rgb24', png]);
    feitos.set(chave, png);
    return png;
  }

  try {
    for (const portal of ESCOLHIDOS) {
      const pasta = join(RAIZ, 'marketing/portais', portal);
      mkdirSync(pasta, { recursive: true });
      /** @type {string[]} */
      const naFolha = [];
      for (const it of ITENS[portal]) {
        if (it.tipo === 'video') {
          const mp4 = join(pasta, `${JOGO}-${it.arq}.mp4`);
          if (it.cortaAbertura) {
            mp4Compativel(['-ss', String(ABERTURA_VIDEO_S), '-i', VIDEO_CRAZY], mp4);
          } else {
            copyFileSync(VIDEO_CRAZY, mp4);
          }
          const dur = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4], { encoding: 'utf8' }).stdout.trim();
          process.stdout.write(`  ${portal}/${JOGO}-${it.arq}.mp4  ${Number(dur).toFixed(1)} s, ${(statSync(mp4).size / 1048576).toFixed(1)} MB\n`);
          continue;
        }
        const w = /** @type {number} */ (it.w);
        const h = /** @type {number} */ (it.h);
        let fonte;
        if (it.tipo === 'capa') fonte = await cena(`capa-${w}x${h}-${it.titulo === false ? 'sem' : 'com'}`, w, h, it.titulo === false ? '&semtitulo' : '');
        else if (it.tipo === 'icone') fonte = await cena(`icone-${w}`, w, h, `&caixa=${CAIXA_ICONE}`);
        else fonte = await tela(it);
        const arq = join(pasta, `${JOGO}-${it.arq}.${it.fmt}`);
        const kb = gravar(fonte, arq, it);
        naFolha.push(arq);
        process.stdout.write(`  ${portal}/${JOGO}-${it.arq}.${it.fmt}  ${w}x${h}, ${kb.toFixed(0)} KB${it.maxKB ? ` (max ${it.maxKB})` : ''}\n`);
      }
      folha(naFolha, join(pasta, 'folha.jpg'));
    }
    if (c.erros.length) process.stdout.write(`avisos do jogo: ${c.erros.slice(0, 3).join(' | ')}\n`);
  } finally {
    await c.fechar();
    await fechar();
  }
}

/**
 * Grava no formato do item. JPG desce a qualidade ate caber no peso maximo.
 * @param {string} fonte PNG no tamanho final
 * @param {string} arq
 * @param {Item} it
 * @returns {number} KB
 */
function gravar(fonte, arq, it) {
  rmSync(arq, { force: true });
  if (it.fmt === 'png') {
    ff(['-i', fonte, '-pix_fmt', 'rgb24', '-compression_level', '9', arq]);
  } else {
    for (let q = 2; q <= 12; q++) {
      ff(['-i', fonte, '-q:v', String(q), '-pix_fmt', 'yuvj444p', arq]);
      if (!it.maxKB || statSync(arq).size / 1024 <= it.maxKB) break;
    }
  }
  const kb = statSync(arq).size / 1024;
  if (it.maxKB && kb > it.maxKB) throw new Error(`${arq}: ${kb.toFixed(0)} KB, acima de ${it.maxKB}`);
  return kb;
}

/**
 * O MP4 que todo painel le: H.264 High 4.2, yuv420p na faixa de TV com as cores bt709 marcadas e uma
 * trilha de audio muda. A Y8 mostrava o video em preto, em 0:00, com o yuvj420p (faixa cheia, que o
 * video da CrazyGames herdou dos quadros em JPEG) e sem trilha de audio.
 * @param {string[]} entrada argumentos de entrada do ffmpeg (com o -ss, se cortar)
 * @param {string} mp4
 */
function mp4Compativel(entrada, mp4) {
  ff([...entrada, '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
    '-map', '0:v:0', '-map', '1:a:0', '-shortest',
    '-vf', 'scale=in_range=auto:out_range=tv:out_color_matrix=bt709,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-profile:v', 'high', '-level:v', '4.2', '-pix_fmt', 'yuv420p',
    '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart', mp4]);
}

/** Folha de conferencia: todas as imagens do portal, cada uma numa celula de 576x416. */
function folha(/** @type {string[]} */ arqs, /** @type {string} */ saida) {
  if (!arqs.length) return;
  const porLinha = 4;
  let f = arqs.map((_, i) => `[${i}]scale=560:400:force_original_aspect_ratio=decrease:flags=lanczos,pad=576:416:(ow-iw)/2:(oh-ih)/2:white[a${i}]`).join(';');
  /** @type {string[]} */
  const linhas = [];
  for (let i = 0; i < arqs.length; i += porLinha) {
    const n = Math.min(porLinha, arqs.length - i);
    const grupo = arqs.slice(i, i + n).map((_, k) => `[a${i + k}]`).join('');
    f += `;${grupo}${n > 1 ? `hstack=inputs=${n}` : 'null'},pad=${576 * porLinha}:416:0:0:white[l${i}]`;
    linhas.push(`[l${i}]`);
  }
  f += linhas.length > 1 ? `;${linhas.join('')}vstack=inputs=${linhas.length}[s]` : `;${linhas[0]}null[s]`;
  ff([...arqs.flatMap((a) => ['-i', a]), '-filter_complex', f, '-map', '[s]', '-q:v', '4', saida]);
}

/** @param {string[]} args */
function ff(args) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffmpeg falhou: ${r.stderr.slice(0, 400)}`);
}

// Capa 16:9 sem texto em 5 versoes (2026-10-21): o slime heroi (uma cor por versao), sentado e com
// peso, com dois menores se fundindo nele (tools/capa-heroi.html: a fisica e o campo do jogo, o gel 3D
// de tools/capa-heroi-gel.js). O src nao muda e nada aqui mexe na build nem no material ja enviado.
//   node tools/capa-heroi.mjs              # as 5 versoes, a folha de comparacao e a de tiles
//   node tools/capa-heroi.mjs 1 3          # so essas versoes (e as folhas, se as 5 PNG existirem)
//   node tools/capa-heroi.mjs --sem-folhas # so as versoes
//   node tools/capa-heroi.mjs --final      # a ESCOLHIDA em 3840x2160 reduzida para 1920x1080 (PNG e JPG)
//   node tools/capa-heroi.mjs --pilha      # a capa com titulo no estilo da imagem do Grok (tools/capa-pilha.html):
//                                          # o motor e o PNG do Grok, nos 3 tamanhos da CrazyGames, e a folha
// Saidas em marketing/capa-heroi/: opcoes/<n>-<nome>-1920x1080.png, comparar.png (a capa de hoje e as
// 5, com rotulo) e comparar-tiles.png (320x180, 200x113 e 160x90 em fundo escuro e claro); o bruto em
// .tmp/capa-heroi/. As medidas de cada versao (window.__medidas) saem no console e so avisam; no
// --final barram so a imagem que nao e opaca, o drawingBuffer menor e o brilho em cima do rosto.
// Porta HTTP 5410, depuracao 9410.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ, servir } from './servir.mjs';
import { abrirChrome, espera } from './cdp.mjs';

const PORTA = 5410;
const PORTA_CDP = 9410;
/** As 5 versoes (tools/capa-heroi.html, VERSOES). */
const VERSOES = { 1: 'vitrine', 2: 'petroleo', 3: 'close', 4: 'impacto', 5: 'caderno' };
/** A escolhida pelo usuario (vazia ate a escolha; o --final recusa sem ela). */
const ESCOLHIDA = '';
const FOLHA = [1968, 882];
const GRADE = [2032, 1000];
const SAIDA = join(RAIZ, 'marketing/capa-heroi');
const OPCOES = join(SAIDA, 'opcoes');
const TMP = join(RAIZ, '.tmp/capa-heroi');

const args = process.argv.slice(2);
const FINAL = args.includes('--final');
const SEM_FOLHAS = args.includes('--sem-folhas');
const PILHA = args.includes('--pilha');
const estranhos = args.filter((a) => !VERSOES[a] && !['--final', '--sem-folhas', '--pilha'].includes(a));
if (estranhos.length) {
  console.error(`argumento desconhecido: ${estranhos.join(' ')} (versoes: ${Object.keys(VERSOES).join(' ')}; --sem-folhas; --final)`);
  process.exit(2);
}
if (FINAL && !VERSOES[ESCOLHIDA]) {
  console.error('--final sem ESCOLHIDA: o usuario ainda nao escolheu (ESCOLHIDA em tools/capa-heroi.mjs)');
  process.exit(1);
}
const pedidas = args.filter((a) => VERSOES[a]).map(Number);
const lista = pedidas.length ? pedidas : Object.keys(VERSOES).map(Number);

/** Uma promessa com prazo (o Chrome travado nao prende o runner); o relogio e desarmado no fim. */
function comPrazo(p, ms, oque) {
  let relogio;
  const prazo = new Promise((_, falha) => { relogio = setTimeout(() => falha(new Error(`prazo estourado: ${oque}`)), ms); });
  return Promise.race([p, prazo]).finally(() => clearTimeout(relogio));
}

/** @param {string[]} a */
function ff(a) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...a], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffmpeg falhou: ${r.stderr.slice(0, 400)}`);
}

/** A porta de depuracao livre (senao o runner falaria com o Chrome de outro processo). */
async function portaLivre() {
  try {
    await fetch(`http://127.0.0.1:${PORTA_CDP}/json/version`, { signal: AbortSignal.timeout(800) });
  } catch {
    return;
  }
  throw new Error(`a porta ${PORTA_CDP} ja tem um Chrome de depuracao: feche-o antes`);
}

/**
 * Abre a pagina com a query, espera PRONTO (ou ERRO) e devolve o print e as medidas.
 * @param {Awaited<ReturnType<typeof abrirChrome>>} c
 */
async function pagina(c, query, w, h, arquivo = 'capa-heroi.html') {
  await comPrazo(c.cmd('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false }), 20000, 'vista');
  await comPrazo(c.ir(`http://127.0.0.1:${PORTA}/tools/${arquivo}?${query}&w=${w}&h=${h}`, 200), 30000, 'navegar');
  const limite = Date.now() + 150000;
  let titulo = '';
  while (Date.now() < limite) {
    titulo = String(await comPrazo(c.avaliar('document.title'), 20000, 'titulo'));
    if (titulo === 'PRONTO' || titulo.startsWith('ERRO')) break;
    await espera(250);
  }
  if (titulo !== 'PRONTO') {
    const det = await c.avaliar("document.getElementById('medidas') ? document.getElementById('medidas').textContent : ''").catch(() => '');
    throw new Error(`${query}: ${titulo || 'sem resposta'}\n${det}`);
  }
  const medidas = JSON.parse(String(await c.avaliar('JSON.stringify(window.__medidas || null)')));
  const png = await comPrazo(c.print(), 120000, 'print');
  return { png, medidas };
}

/** PNG sem alfa, comprimido. */
function gravarPng(bruto, saida, escala) {
  rmSync(saida, { force: true });
  ff(['-i', bruto, ...(escala ? ['-vf', `scale=${escala}:flags=lanczos`] : []), '-pix_fmt', 'rgb24', '-compression_level', '9', saida]);
}

function resumo(n, med) {
  if (!med) return;
  const s = med.slimes.map((x) => `${x.cor} C${x.croma}${x.contraste === null ? '' : ` ${x.contraste}:1`}`).join(', ');
  console.log(`  ${n}-${VERSOES[n]}: heroi ${Math.round(med.altura * 100)}% da altura; ${s}; ${med.ms.total} ms; ${med.renderer}`);
  for (const a of med.avisos) console.log(`    aviso: ${a}`);
}

await portaLivre();
mkdirSync(OPCOES, { recursive: true });
mkdirSync(TMP, { recursive: true });
const fechar = await servir(PORTA);
const c = await abrirChrome({ largura: 1920, altura: 1080, porta: PORTA_CDP });
try {
  if (PILHA) {
    // render em 2x e reduzido para o tamanho da CrazyGames (16:9, 1:1 e 2:3)
    const pasta = join(SAIDA, 'pilha');
    mkdirSync(pasta, { recursive: true });
    const feitos = [];
    for (const modo of ['motor', 'grok']) {
      for (const [w, h, fw, fh] of [[1920, 1080, 1920, 1080], [1600, 1600, 800, 800], [1600, 2400, 800, 1200]]) {
        const { png } = await pagina(c, `modo=${modo}`, w, h, 'capa-pilha.html');
        const bruto = join(TMP, `pilha-${modo}-${w}x${h}.png`);
        writeFileSync(bruto, png);
        const arq = join(pasta, `${modo}-${fw}x${fh}.png`);
        gravarPng(bruto, arq, `${fw}:${fh}`);
        feitos.push(arq);
      }
    }
    // a folha: em cima os 16:9 (motor | grok), embaixo os quadrados e os em pe
    const [m1, m2, m3, g1, g2, g3] = feitos;
    rmSync(join(pasta, 'comparar.png'), { force: true });
    ff(['-i', m1, '-i', g1, '-i', m2, '-i', g2, '-i', m3, '-i', g3, '-filter_complex',
      '[0]scale=960:540[a];[1]scale=960:540[b];[a][b]hstack[l1];[2]scale=480:480[c];[3]scale=480:480[d];[4]scale=320:480[e];[5]scale=320:480[f];[c][d][e][f]hstack=inputs=4,pad=1920:480:(ow-iw)/2:0:white[l2];[l1][l2]vstack',
      '-pix_fmt', 'rgb24', join(pasta, 'comparar.png')]);
    console.log('pilha: marketing/capa-heroi/pilha/ (motor-* e grok-*, comparar.png)');
  } else if (FINAL) {
    const { png, medidas } = await pagina(c, `versao=${ESCOLHIDA}&medir`, 3840, 2160);
    resumo(Number(ESCOLHIDA), medidas);
    const duros = medidas.avisos.filter((a) => /opaca|drawingBuffer|brilho em cima/.test(a));
    if (duros.length) throw new Error(`a escolhida nao passa: ${duros.join('; ')}`);
    const bruto = join(TMP, `final-${ESCOLHIDA}-3840x2160.png`);
    writeFileSync(bruto, png);
    const arq = join(SAIDA, 'slime-merge-capa-1920x1080');
    gravarPng(bruto, `${arq}.png`, '1920:1080');
    rmSync(`${arq}.jpg`, { force: true });
    ff(['-i', `${arq}.png`, '-q:v', '2', '-pix_fmt', 'yuvj444p', `${arq}.jpg`]);
    console.log(`final: ${arq}.png e .jpg`);
  } else {
    console.log('versoes:');
    for (const n of lista) {
      const { png, medidas } = await pagina(c, `versao=${n}&medir`, 1920, 1080);
      const bruto = join(TMP, `${n}-${VERSOES[n]}-bruto.png`);
      writeFileSync(bruto, png);
      gravarPng(bruto, join(OPCOES, `${n}-${VERSOES[n]}-1920x1080.png`));
      writeFileSync(join(TMP, `${n}-${VERSOES[n]}-medidas.json`), JSON.stringify(medidas, null, 2));
      resumo(n, medidas);
    }
    const todas = Object.keys(VERSOES).every((n) => existsSync(join(OPCOES, `${n}-${VERSOES[n]}-1920x1080.png`)));
    if (!SEM_FOLHAS && todas) {
      for (const [modo, [w, h], arq] of [['folha', FOLHA, 'comparar.png'], ['grade', GRADE, 'comparar-tiles.png']]) {
        const { png } = await pagina(c, modo, w, h);
        const bruto = join(TMP, `${modo}-bruto.png`);
        writeFileSync(bruto, png);
        gravarPng(bruto, join(SAIDA, arq));
        console.log(`folha: marketing/capa-heroi/${arq}`);
      }
    }
  }
} finally {
  if (c.erros.length) console.log('erros na pagina:\n  ' + c.erros.join('\n  '));
  await c.fechar();
  await fechar();
}

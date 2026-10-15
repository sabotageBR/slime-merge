// Renderiza a thumb da Poki (tools/thumb.html) pelo Chrome headless (porte do 2048_cards).
// Uso:
//   node tools/thumb.mjs [opcoes]  as opcoes (padrao: as 9 de OPCOES) em
//                                  marketing/thumb/opcoes/<opcao>-<tamanho>.png, lado a lado em
//                                  marketing/thumb/comparar.png, os tiles pequenos em
//                                  marketing/thumb/comparar-tiles.png, e as medidas de cada uma
//   node tools/thumb.mjs --final   mede a ESCOLHIDA contra a regra da Poki (falha alto se sair
//                                  dela) e grava marketing/thumb/slime-merge-{1256,628}.{png,jpg}
//                                  e a folha de conferencia marketing/thumb/conferir.png
//   node tools/thumb.mjs --perto [opcoes]  marca de magenta os pixels perto do #83FFE7
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { servir, RAIZ } from './servir.mjs';
import { chrome } from './shot.mjs';

/**
 * Opcao da thumb oficial. 2026-10-15: 'arcoiris' por recomendacao (a mais legivel nos tiles
 * pequenos), ate o usuario escolher entre as 6 (docs/autoria.md; lava, missil e close pedidas
 * no fim do dia).
 */
const ESCOLHIDA = 'arcoiris';
const OPCOES = ['fusao', 'pote', 'arcoiris', 'lava', 'missil', 'close', 'fusao-azul', 'fusao-verde', 'fusao-lilas'];
/** Tamanhos entregues: o minimo da Poki (628) e o dobro. */
const TAMANHOS = [1256, 628];
/**
 * Limites da medida (?medir, na thumb de 628 px). Barram: quase nada perto do #83FFE7,
 * beirada longe dele, nenhuma tarja e opaca. So avisa: o slime principal com menos de 3:1
 * contra a media dos cantos (regua nossa, nao da Poki).
 */
const LIMITES = { pertoPoki: 0.01, bordaPoki: 30, contraste: 3 };

const porta = 4353;
const fechar = await servir(porta);

/** Chrome headless sem GPU (o WebGL2 roda no SwiftShader) com perfil descartavel. */
async function rodarChrome(query, larg, alt, extra) {
  const perfil = mkdtempSync(join(tmpdir(), 'slime-thumb-'));
  const out = await chrome(['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
    `--user-data-dir=${perfil}`, `--window-size=${larg},${alt}`, '--virtual-time-budget=4000', ...extra,
    `http://127.0.0.1:${porta}/tools/thumb.html?${query}`], 180000);
  rmSync(perfil, { recursive: true, force: true });
  return out;
}

async function print(query, larg, alt, arq) {
  await rodarChrome(query, larg, alt, [`--screenshot=${arq}`]);
  process.stdout.write(`thumb -> ${relative(RAIZ, arq)}\n`);
}

/** Mede a opcao o (?medir) e devolve as falhas contra LIMITES. */
async function conferir(o) {
  const dom = await rodarChrome(`opcao=${o}&medir`, 628, 628, ['--dump-dom']);
  const json = (dom.match(/<pre id="medidas">([^<]*)<\/pre>/) || [])[1];
  if (!json) return { m: null, falhas: ['sem medidas (a pagina nao terminou?)'], avisos: [] };
  const m = JSON.parse(json);
  const falhas = [];
  const avisos = [];
  if (m.pertoPoki > LIMITES.pertoPoki) falhas.push(`${(m.pertoPoki * 100).toFixed(1)}% dos pixels perto do #83FFE7`);
  if (m.bordaPoki < LIMITES.bordaPoki) falhas.push(`beirada perto do #83FFE7 (Delta E ${m.bordaPoki})`);
  if (m.tarja.length) falhas.push(`tarja ou borda em: ${m.tarja.join(', ')}`);
  for (const [quem, c] of Object.entries(m.contraste)) if (c < LIMITES.contraste) avisos.push(`contraste do ${quem} com os cantos ${c}:1`);
  if (!m.opaca) falhas.push('pixels transparentes');
  return { m, falhas, avisos };
}

const args = process.argv.slice(2);
const pedidas = args.filter((a) => !a.startsWith('--'));
if (args.includes('--perto')) {
  const dir = join(RAIZ, 'marketing/thumb/opcoes');
  mkdirSync(dir, { recursive: true });
  for (const o of pedidas.length ? pedidas : OPCOES) await print(`opcao=${o}&perto`, 628, 628, join(dir, `${o}-perto.png`));
} else if (args.includes('--final') && !ESCOLHIDA) {
  process.stdout.write('sem thumb escolhida: rode sem --final, mostre as opcoes ao usuario e grave a escolha em ESCOLHIDA\n');
  await fechar();
  process.exit(1);
} else if (args.includes('--final')) {
  const { m, falhas, avisos } = await conferir(ESCOLHIDA);
  process.stdout.write(`medidas: ${JSON.stringify(m)}\n`);
  if (avisos.length) process.stdout.write('aviso: ' + avisos.join('; ') + '\n');
  if (falhas.length) {
    process.stdout.write('FALHOU (regra da Poki):\n  ' + falhas.join('\n  ') + '\n');
    await fechar();
    process.exit(1);
  }
  const dir = join(RAIZ, 'marketing/thumb');
  mkdirSync(dir, { recursive: true });
  for (const s of TAMANHOS) {
    const png = join(dir, `slime-merge-${s}.png`);
    await print(`opcao=${ESCOLHIDA}&s=${s}`, s, s, png);
    const jpg = png.replace(/\.png$/, '.jpg');
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', png, '-q:v', '2', jpg]);
    process.stdout.write(`thumb -> ${relative(RAIZ, jpg)}\n`);
  }
  // 28 + (314+28) + (204+28) + (140+28) + (94+28) = 892; 314 + 2*28 = 370
  await print(`opcao=${ESCOLHIDA}&grade`, 892, 370, join(dir, 'conferir.png'));
} else {
  const opcoes = pedidas.length ? pedidas : OPCOES;
  const dir = join(RAIZ, 'marketing/thumb/opcoes');
  mkdirSync(dir, { recursive: true });
  for (const o of opcoes) for (const s of TAMANHOS) await print(`opcao=${o}&s=${s}`, s, s, join(dir, `${o}-${s}.png`));
  const lado = join(RAIZ, 'marketing/thumb/comparar.png');
  const ent = opcoes.flatMap((o) => ['-i', join(dir, `${o}-628.png`)]);
  // o ffmpeg nao empilha uma imagem so
  if (opcoes.length === 1) copyFileSync(join(dir, `${opcoes[0]}-628.png`), lado);
  else execFileSync('ffmpeg', ['-v', 'error', '-y', ...ent, '-filter_complex', `hstack=inputs=${opcoes.length}`, lado]);
  process.stdout.write(`thumb -> ${relative(RAIZ, lado)}\n`);
  for (const o of opcoes) await print(`opcao=${o}&grade`, 892, 370, join(dir, `${o}-tiles.png`));
  const tiles = join(RAIZ, 'marketing/thumb/comparar-tiles.png');
  const entT = opcoes.flatMap((o) => ['-i', join(dir, `${o}-tiles.png`)]);
  if (opcoes.length === 1) copyFileSync(join(dir, `${opcoes[0]}-tiles.png`), tiles);
  else execFileSync('ffmpeg', ['-v', 'error', '-y', ...entT, '-filter_complex', `vstack=inputs=${opcoes.length}`, tiles]);
  process.stdout.write(`thumb -> ${relative(RAIZ, tiles)}\n`);
  for (const o of opcoes) {
    const { m, falhas, avisos } = await conferir(o);
    process.stdout.write(`${o}: ${JSON.stringify(m)}${falhas.length ? '\n   fora da regra: ' + falhas.join('; ') : ''}${avisos.length ? '\n   aviso: ' + avisos.join('; ') : ''}\n`);
  }
}
await fechar();

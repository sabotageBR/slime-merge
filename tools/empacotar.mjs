// Monta a build da Poki (porte do 2048_cards): copia so o jogo para dist/ (sem os prototipos da
// avaliacao), confere e zipa em
// dist-poki/slime-merge-<versao>.zip (index.html na raiz do zip). Recusa URL externa,
// console.log, .map e mais de 500 KB em gzip (a meta do plano; a regra da Poki e < 10 MB ate o
// gameplay). A thumb ainda nao existe (vem com a producao do modelo escolhido): sem
// --thumb, o empacotamento e so um ensaio.
// Uso: node tools/empacotar.mjs [--thumb]
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { RAIZ } from './servir.mjs';

const versao = JSON.parse(readFileSync(join(RAIZ, 'package.json'), 'utf8')).version;
const dist = join(RAIZ, 'dist');
const saida = join(RAIZ, 'dist-poki');
const zip = join(saida, `slime-merge-${versao}.zip`);
const PERMITIDA = 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js';
const THUMB = join(RAIZ, 'marketing/thumb/slime-merge-1256.png');
const COM_THUMB = process.argv.includes('--thumb');
const THUMB_MIN = 628;

/** @param {string} d @returns {string[]} */
const listar = (d) => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  return statSync(p).isDirectory() ? listar(p) : [p];
});

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
for (const item of ['index.html', 'LICENCAS.txt', 'src']) cpSync(join(RAIZ, item), join(dist, item), { recursive: true });

// so o modelo escolhido vai para a Poki: os prototipos da avaliacao (Croma, Loja, Molde, lab)
// ficam no repositorio e no hub. No main.js saem as linhas marcadas com "// prototipo".
const PROTOTIPOS = [
  'src/jogo/modos/croma.js', 'src/jogo/modos/loja.js', 'src/jogo/modos/molde.js', 'src/jogo/modos/lab.js',
  'src/jogo/cores.js', 'src/jogo/goo.js', 'src/jogo/fases-molde.js', 'src/jogo/missoes.js',
];
for (const r of PROTOTIPOS) rmSync(join(dist, r), { force: true });
// audio: so os arquivos das variantes do PADRAO (src/som/catalogo.js); as outras ficam no
// repositorio e no Estudio de sons
const { CATEGORIAS, PADRAO, variante, arquivosDa } = await import('../src/som/catalogo.js');
const { ARQUIVOS } = await import('../src/som/arquivos.js');
// o catalogo fala em ids (fichas); a pasta tem os nomes dos arquivos (fichas.mp3)
const usados = new Set(CATEGORIAS.flatMap((c) => arquivosDa(variante(c.id, PADRAO[c.id]))).map((id) => (ARQUIVOS[id] ? ARQUIVOS[id].arquivo : id)));
const pastaSons = join(dist, 'src/som/arquivos');
let kbAudio = 0;
if (existsSync(pastaSons)) {
  for (const f of readdirSync(pastaSons)) {
    if (!usados.has(f)) rmSync(join(pastaSons, f), { force: true });
    else kbAudio += statSync(join(pastaSons, f)).size / 1024;
  }
}
const mainDist = join(dist, 'src/main.js');
writeFileSync(mainDist, readFileSync(mainDist, 'utf8').split('\n').filter((l) => !/\/\/ prototipo\s*$/.test(l)).join('\n'));

const falhas = [];
const arquivos = listar(dist);
// nenhum import pode apontar para um arquivo que saiu da build
for (const p of arquivos.filter((x) => x.endsWith('.js'))) {
  const t = readFileSync(p, 'utf8');
  for (const m of t.matchAll(/import\s*(?:[^'"]*from\s*)?\(?\s*'(\.[^']+)'/g)) {
    if (!existsSync(join(p, '..', m[1]))) falhas.push(`import quebrado em ${relative(dist, p)}: ${m[1]}`);
  }
}
const html = readFileSync(join(dist, 'index.html'), 'utf8');
if (!/viewport-fit=cover/.test(html)) falhas.push('index.html sem viewport-fit=cover');
if (!html.includes(PERMITIDA)) falhas.push('index.html sem o SDK da Poki');
let bruto = 0;
let gz = 0;
for (const p of arquivos) {
  const r = relative(dist, p);
  const dados = readFileSync(p);
  bruto += dados.length;
  gz += gzipSync(dados, { level: 9 }).length;
  if (extname(p) === '.map') falhas.push(`mapa de fonte na build: ${r}`);
  if (/\.(html|js|css)$/.test(p)) {
    const t = dados.toString('utf8');
    for (const u of t.match(/https?:\/\/[^\s"'`)<>]+/g) || []) if (u !== PERMITIDA) falhas.push(`URL externa em ${r}: ${u}`);
    if (/console\.(log|info|debug)\s*\(/.test(t)) falhas.push(`console.log em ${r}`);
  }
}
if (gz > 500 * 1024) falhas.push(`build acima de 500 KB gzip (${gz} bytes)`);
for (const f of usados) if (!existsSync(join(pastaSons, f))) falhas.push(`som escolhido sem arquivo: ${f}`);
if (kbAudio > 120) falhas.push(`audio acima de 120 KB (${kbAudio.toFixed(1)} KB)`);
process.stdout.write(`audio: ${usados.size} arquivos, ${kbAudio.toFixed(1)} KB\n`);
// thumb: assinatura PNG e largura/altura do IHDR (bytes 16..23, big-endian)
let thumbLado = 0;
if (!COM_THUMB) { /* ensaio sem thumb */ } else if (!existsSync(THUMB)) falhas.push(`thumb ausente: ${relative(RAIZ, THUMB)} (rode node tools/thumb.mjs --final)`);
else {
  const t = readFileSync(THUMB);
  const png = t.length > 24 && t.toString('latin1', 1, 4) === 'PNG';
  const w = png ? t.readUInt32BE(16) : 0, h = png ? t.readUInt32BE(20) : 0;
  if (!png) falhas.push('thumb nao e PNG');
  else if (w !== h) falhas.push(`thumb nao e quadrada (${w}x${h})`);
  else if (w < THUMB_MIN) falhas.push(`thumb menor que ${THUMB_MIN} px (${w})`);
  else thumbLado = w;
}
if (falhas.length) {
  process.stdout.write('FALHOU:\n  ' + falhas.join('\n  ') + '\n');
  process.exit(1);
}

mkdirSync(saida, { recursive: true });
rmSync(zip, { force: true });
const z = spawnSync('zip', ['-qr', '-X', zip, '.'], { cwd: dist, encoding: 'utf8' });
if (z.status !== 0) {
  process.stdout.write('zip falhou: ' + z.stderr + '\n');
  process.exit(1);
}
const teste = spawnSync('unzip', ['-tq', zip], { encoding: 'utf8' });
const lista = spawnSync('unzip', ['-Z1', zip], { encoding: 'utf8' }).stdout.trim().split('\n');
if (teste.status !== 0 || !lista.includes('index.html')) {
  process.stdout.write('zip invalido ou sem index.html na raiz\n');
  process.exit(1);
}
const sha = createHash('sha256').update(readFileSync(zip)).digest('hex');
const tam = statSync(zip).size;
writeFileSync(join(saida, `slime-merge-${versao}.sha256`), `${sha}  slime-merge-${versao}.zip\n`);
const thumbSaida = join(saida, `slime-merge-${versao}-thumb.png`);
if (COM_THUMB) cpSync(THUMB, thumbSaida);
process.stdout.write(`build ok: ${arquivos.length} arquivos, ${(bruto / 1024).toFixed(0)} KB (${(gz / 1024).toFixed(0)} KB gzip)\n`);
process.stdout.write(`${relative(RAIZ, zip)}: ${(tam / 1024).toFixed(0)} KB, sha256 ${sha}\n`);
if (COM_THUMB) process.stdout.write(`${relative(RAIZ, thumbSaida)}: ${thumbLado}x${thumbLado}, ${(statSync(thumbSaida).size / 1024).toFixed(0)} KB\n`);
if (!existsSync(zip)) process.exit(1);

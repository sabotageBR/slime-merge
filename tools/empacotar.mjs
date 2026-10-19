// Monta a build da Poki (porte do 2048_cards): copia so o jogo para dist/ (sem os prototipos da
// avaliacao), confere e zipa em
// dist-poki/slime-merge-<versao>.zip (index.html na raiz do zip). Recusa URL externa,
// console.log, .map e mais de 500 KB em gzip (a meta do plano; a regra da Poki e < 10 MB ate o
// gameplay). A thumb ainda nao existe (vem com a producao do modelo escolhido): sem
// --thumb, o empacotamento e so um ensaio.
// Uso: node tools/empacotar.mjs [--thumb] [--alvo=poki|crazygames] [--anuncios]
// --alvo=crazygames (2026-10-19, depois da recusa da Poki): a mesma build com o SDK v3 da CrazyGames
// no lugar do da Poki (o import do main.js passa para src/core/crazygames.js, de mesma interface), em
// dist-crazygames/. Sai sem anuncios (Basic Launch: botao de video sem efeito reprova); --anuncios
// liga para o Full Launch. Sem thumb: as capas da CrazyGames vao a parte, pelo portal.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { RAIZ } from './servir.mjs';

/** SDK (a unica URL externa) e pasta de saida de cada plataforma. */
const ALVOS = {
  poki: { sdk: 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js', saida: 'dist-poki' },
  crazygames: { sdk: 'https://sdk.crazygames.com/crazygames-sdk-v3.js', saida: 'dist-crazygames' },
};
const argAlvo = process.argv.find((a) => a.startsWith('--alvo='));
const nomeAlvo = argAlvo ? argAlvo.slice(7) : 'poki';
if (!ALVOS[nomeAlvo]) {
  process.stdout.write(`alvo desconhecido: ${nomeAlvo} (${Object.keys(ALVOS).join(', ')})\n`);
  process.exit(1);
}
const ALVO = ALVOS[nomeAlvo];
const NA_CRAZY = nomeAlvo === 'crazygames';
const COM_ANUNCIOS = process.argv.includes('--anuncios');

const versao = JSON.parse(readFileSync(join(RAIZ, 'package.json'), 'utf8')).version;
const dist = join(RAIZ, 'dist');
const saida = join(RAIZ, ALVO.saida);
const nomeZip = `slime-merge-${versao}${NA_CRAZY && !COM_ANUNCIOS ? '-basic' : ''}`;
const zip = join(saida, `${nomeZip}.zip`);
const PERMITIDA = ALVO.sdk;
const SDK_POKI = ALVOS.poki.sdk;
const THUMB = join(RAIZ, 'marketing/thumb/slime-merge-1256.png');
const COM_THUMB = process.argv.includes('--thumb') && !NA_CRAZY;
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
  'src/jogo/cores.js', 'src/jogo/goo.js', 'src/jogo/fases-molde.js',
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
let mainTexto = readFileSync(mainDist, 'utf8').split('\n').filter((l) => !/\/\/ prototipo\s*$/.test(l)).join('\n');
// plataforma: na CrazyGames, o SDK v3 no lugar do da Poki e o import do wrapper trocado; na Poki o
// wrapper da CrazyGames sai
const falhasAlvo = [];
const crazyDist = join(dist, 'src/core/crazygames.js');
if (NA_CRAZY) {
  const importPoki = "from './core/poki.js';";
  if (!mainTexto.includes(importPoki)) falhasAlvo.push('main.js sem o import do core/poki.js');
  mainTexto = mainTexto.replace(importPoki, "from './core/crazygames.js';");
  const htmlDist = join(dist, 'index.html');
  const htmlTexto = readFileSync(htmlDist, 'utf8');
  if (!htmlTexto.includes(SDK_POKI)) falhasAlvo.push('index.html sem a tag do SDK da Poki para trocar');
  writeFileSync(htmlDist, htmlTexto.replace(SDK_POKI, PERMITIDA).replace('Unico script externo permitido pela Poki.', 'Unico script externo: o SDK v3 da CrazyGames.'));
  if (!COM_ANUNCIOS) {
    const crazyTexto = readFileSync(crazyDist, 'utf8');
    const ligado = 'export const ANUNCIOS = true;';
    if (!crazyTexto.includes(ligado)) falhasAlvo.push(`crazygames.js sem "${ligado}" para desligar`);
    writeFileSync(crazyDist, crazyTexto.replace(ligado, 'export const ANUNCIOS = false;'));
  }
} else {
  rmSync(crazyDist, { force: true });
}
writeFileSync(mainDist, mainTexto);

const falhas = [...falhasAlvo];
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
if (!html.includes(PERMITIDA)) falhas.push(`index.html sem o SDK (${nomeAlvo})`);
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
if (kbAudio > 150) falhas.push(`audio acima de 150 KB (${kbAudio.toFixed(1)} KB)`);
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
writeFileSync(join(saida, `${nomeZip}.sha256`), `${sha}  ${nomeZip}.zip\n`);
const thumbSaida = join(saida, `${nomeZip}-thumb.png`);
if (COM_THUMB) cpSync(THUMB, thumbSaida);
process.stdout.write(`alvo: ${nomeAlvo}${NA_CRAZY ? (COM_ANUNCIOS ? ' (com anuncios)' : ' (Basic Launch, sem anuncios)') : ''}\n`);
process.stdout.write(`build ok: ${arquivos.length} arquivos, ${(bruto / 1024).toFixed(0)} KB (${(gz / 1024).toFixed(0)} KB gzip)\n`);
process.stdout.write(`${relative(RAIZ, zip)}: ${(tam / 1024).toFixed(0)} KB, sha256 ${sha}\n`);
if (COM_THUMB) process.stdout.write(`${relative(RAIZ, thumbSaida)}: ${thumbLado}x${thumbLado}, ${(statSync(thumbSaida).size / 1024).toFixed(0)} KB\n`);
if (!existsSync(zip)) process.exit(1);

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
// --alvo=<portal> (2026-10-20): os portais de distribuicao (y8, playgama, yandex, gamemonetize,
// gamedistribution, gamepix), cada um com o SDK dele (src/core/portais/<portal>.js, sobre o
// src/core/portal.js) e os ids do painel de marketing/portais/ids.json, em
// dist-portais/slime-merge-<portal>-<versao>.zip ("-sem-id" quando o portal pede id e ele falta).
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { RAIZ } from './servir.mjs';

/**
 * SDK (a unica URL externa) e pasta de saida de cada plataforma. Nos portais: `tag` e o que entra no
 * lugar do script da Poki no index.html (vazio: o modulo do portal carrega o SDK depois das opcoes que
 * ele le), `ids` os que o painel da e a build precisa, `arquivos` o que vai a mais na raiz.
 */
const ALVOS = {
  poki: { sdk: 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js', saida: 'dist-poki' },
  crazygames: { sdk: 'https://sdk.crazygames.com/crazygames-sdk-v3.js', saida: 'dist-crazygames' },
  y8: { sdk: 'https://cdn.y8.com/minimal-sdk/2-0/y8.min.js', saida: 'dist-portais', portal: 'Y8',
    tag: '<script src="https://cdn.y8.com/minimal-sdk/2-0/y8.min.js" async></script>', ids: ['appId', 'gameId'] },
  playgama: { sdk: 'https://bridge.playgama.com/v2/stable/playgama-bridge.js', saida: 'dist-portais', portal: 'Playgama',
    tag: '<script src="https://bridge.playgama.com/v2/stable/playgama-bridge.js"></script>',
    arquivos: { 'playgama-bridge-config.json': `${JSON.stringify({ advertisement: { minimumDelayBetweenInterstitial: 60 } }, null, 2)}\n` } },
  // relativo de proposito: a Yandex serve o SDK na raiz do dominio do jogo (requisito 1.7)
  yandex: { sdk: '/sdk.js', saida: 'dist-portais', portal: 'Yandex Games', tag: '<script src="/sdk.js"></script>' },
  gamemonetize: { sdk: 'https://api.gamemonetize.com/sdk.js', saida: 'dist-portais', portal: 'GameMonetize', tag: '', ids: ['gameId'] },
  gamedistribution: { sdk: 'https://html5.api.gamedistribution.com/main.min.js', saida: 'dist-portais', portal: 'GameDistribution', tag: '', ids: ['gameId'] },
  gamepix: { sdk: 'https://integration.gamepix.com/sdk/v3/gamepix.sdk.js', saida: 'dist-portais', portal: 'GamePix',
    tag: '<script src="https://integration.gamepix.com/sdk/v3/gamepix.sdk.js"></script>' },
};
const argAlvo = process.argv.find((a) => a.startsWith('--alvo='));
const nomeAlvo = argAlvo ? argAlvo.slice(7) : 'poki';
if (!ALVOS[nomeAlvo]) {
  process.stdout.write(`alvo desconhecido: ${nomeAlvo} (${Object.keys(ALVOS).join(', ')})\n`);
  process.exit(1);
}
const ALVO = ALVOS[nomeAlvo];
const NA_CRAZY = nomeAlvo === 'crazygames';
const NUM_PORTAL = !!ALVO.portal;
/** Os ids do painel do portal (marketing/portais/ids.json); os que faltam viram "-sem-id" no zip. */
// IDS_PORTAL (JSON) passa por cima, para a automacao (tools/portaischeck.mjs, sempre com --ensaio)
const IDS = !NUM_PORTAL ? {} : process.env.IDS_PORTAL ? JSON.parse(process.env.IDS_PORTAL)
  : (JSON.parse(readFileSync(join(RAIZ, 'marketing/portais/ids.json'), 'utf8'))[nomeAlvo] || {});
/** --ensaio: monta e confere dist/, sem zip (a automacao roda o jogo de dist/). */
const ENSAIO = process.argv.includes('--ensaio');
const SEM_ID = NUM_PORTAL && (ALVO.ids || []).some((k) => !IDS[k]);
const COM_ANUNCIOS = process.argv.includes('--anuncios');

const versao = JSON.parse(readFileSync(join(RAIZ, 'package.json'), 'utf8')).version;
const dist = join(RAIZ, 'dist');
const saida = join(RAIZ, ALVO.saida);
const nomeZip = NUM_PORTAL
  ? `slime-merge-${nomeAlvo}-${versao}${SEM_ID ? '-sem-id' : ''}`
  : `slime-merge-${versao}${NA_CRAZY && !COM_ANUNCIOS ? '-basic' : ''}`;
const zip = join(saida, `${nomeZip}.zip`);
const PERMITIDA = ALVO.sdk;
const SDK_POKI = ALVOS.poki.sdk;
const THUMB = join(RAIZ, 'marketing/thumb/slime-merge-1256.png');
const COM_THUMB = process.argv.includes('--thumb') && !NA_CRAZY && !NUM_PORTAL;
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
  // os 5 prototipos de gosma (2026-10-19): modo, desenho e o CSS deles
  'src/jogo/modos/volei.js', 'src/jogo/modos/vitral.js', 'src/jogo/modos/janela.js', 'src/jogo/modos/garra.js', 'src/jogo/modos/aperta.js',
  'src/render/prototipos', 'src/ui/prototipos.css',
];
for (const r of PROTOTIPOS) rmSync(join(dist, r), { force: true, recursive: true });
// as linhas "// prototipo" saem de todo .js da build (ganchos da cena e do HUD); o main.js, logo abaixo
const tirarPrototipo = (t) => t.split('\n').filter((l) => !/\/\/ prototipo\s*$/.test(l)).join('\n');
const pastas = [join(dist, 'src')];
while (pastas.length) {
  const d = pastas.pop();
  for (const nome of readdirSync(d)) {
    const f = join(d, nome);
    if (statSync(f).isDirectory()) pastas.push(f);
    else if (nome.endsWith('.js') && f !== join(dist, 'src/main.js')) {
      const t = readFileSync(f, 'utf8');
      if (t.includes('// prototipo')) writeFileSync(f, tirarPrototipo(t));
    }
  }
}
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
// cada build leva so o wrapper dela: nada de marca de outro portal (CrazyGames e GamePix cobram)
if (!NUM_PORTAL) {
  rmSync(join(dist, 'src/core/portal.js'), { force: true });
  rmSync(join(dist, 'src/core/portais'), { force: true, recursive: true });
}
if (NUM_PORTAL) {
  const importPoki = "from './core/poki.js';";
  if (!mainTexto.includes(importPoki)) falhasAlvo.push('main.js sem o import do core/poki.js');
  mainTexto = mainTexto.replace(importPoki, `from './core/portais/${nomeAlvo}.js';`);
  rmSync(crazyDist, { force: true });
  for (const f of readdirSync(join(dist, 'src/core/portais'))) if (f !== `${nomeAlvo}.js`) rmSync(join(dist, 'src/core/portais', f));
  const htmlDist = join(dist, 'index.html');
  const htmlTexto = readFileSync(htmlDist, 'utf8');
  const tagPoki = `<!-- Unico script externo permitido pela Poki. -->\n<script src="${SDK_POKI}"></script>`;
  if (!htmlTexto.includes(tagPoki)) falhasAlvo.push('index.html sem a tag do SDK da Poki para trocar');
  const troca = ALVO.tag
    ? `<!-- ${ALVO.portal}: o SDK do portal, unico script de fora. -->\n${ALVO.tag}`
    : `<!-- ${ALVO.portal}: o SDK entra por src/core/portais/${nomeAlvo}.js, depois das opcoes que ele le. -->`;
  writeFileSync(htmlDist, htmlTexto.replace(tagPoki, troca));
  // os ids do painel no modulo do portal
  if (ALVO.ids) {
    const modDist = join(dist, `src/core/portais/${nomeAlvo}.js`);
    const modTexto = readFileSync(modDist, 'utf8');
    const vazio = 'export const IDS = {};';
    if (!modTexto.includes(vazio)) falhasAlvo.push(`${nomeAlvo}.js sem "${vazio}" para gravar os ids`);
    const ids = Object.fromEntries(ALVO.ids.filter((k) => IDS[k]).map((k) => [k, String(IDS[k])]));
    writeFileSync(modDist, modTexto.replace(vazio, `export const IDS = ${JSON.stringify(ids)};`));
  }
  for (const [nome, conteudo] of Object.entries(ALVO.arquivos || {})) writeFileSync(join(dist, nome), conteudo);
} else if (NA_CRAZY) {
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
if (ALVO.tag !== '' && !html.includes(PERMITIDA)) falhas.push(`index.html sem o SDK (${nomeAlvo})`);
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
if (ENSAIO) {
  process.stdout.write(`ensaio ${nomeAlvo}: dist/ ok, ${arquivos.length} arquivos, ${(gz / 1024).toFixed(0)} KB gzip (sem zip)\n`);
  process.exit(0);
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
process.stdout.write(`alvo: ${nomeAlvo}${NA_CRAZY ? (COM_ANUNCIOS ? ' (com anuncios)' : ' (Basic Launch, sem anuncios)') : ''}${SEM_ID ? ` (SEM ${ALVO.ids.filter((k) => !IDS[k]).join(' e ')}: so para teste, o SDK nao carrega)` : ''}\n`);
process.stdout.write(`build ok: ${arquivos.length} arquivos, ${(bruto / 1024).toFixed(0)} KB (${(gz / 1024).toFixed(0)} KB gzip)\n`);
process.stdout.write(`${relative(RAIZ, zip)}: ${(tam / 1024).toFixed(0)} KB, sha256 ${sha}\n`);
if (COM_THUMB) process.stdout.write(`${relative(RAIZ, thumbSaida)}: ${thumbLado}x${thumbLado}, ${(statSync(thumbSaida).size / 1024).toFixed(0)} KB\n`);
if (!existsSync(zip)) process.exit(1);

// Arquivos de som CC0 da Kenney para o Estudio de sons (modelos/sons.html).
// Uso:
//   node tools/sons.mjs baixar [pacote...]   baixa os zips em .tmp/sons/zip/ e extrai cada um
//                                            numa pasta nova e vazia em .tmp/sons/pacotes/<pacote>/
//   node tools/sons.mjs listar <pacote>      lista os audios do pacote com a duracao
//   node tools/sons.mjs converter            converte a tabela FONTES em MP3 mono 56 kbps em
//                                            src/som/arquivos/, mede e gera src/som/arquivos.js e
//                                            o bloco de creditos do LICENCAS.txt
//   node tools/sons.mjs medir                so mede os MP3 que ja existem e regera o indice
//
// Seguranca: os zips e o que sai deles sao dados NAO confiaveis. Cada zip e extraido com
// `unzip -d` numa pasta nova (apagada antes, se existir); links simbolicos sao ignorados;
// os caminhos vao como argumento para ffprobe/ffmpeg (sem shell) e nada de dentro deles roda.
//
// Download manual (se o automatico falhar): abrir a pagina do pacote em kenney.nl/assets/<slug>
// (slugs na tabela PACOTES), clicar em "Download" (gratis, CC0) e salvar o zip como
// .tmp/sons/zip/<pacote>.zip; depois `node tools/sons.mjs baixar <pacote>` so extrai.
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const TMP = join(RAIZ, '.tmp', 'sons');
const DIR_ZIP = join(TMP, 'zip');
const DIR_PACOTES = join(TMP, 'pacotes');
const DIR_SAIDA = join(RAIZ, 'src', 'som', 'arquivos');
const INDICE = join(RAIZ, 'src', 'som', 'arquivos.js');
const LICENCAS = join(RAIZ, 'LICENCAS.txt');

/** Pacotes da Kenney (todos CC0 1.0): id local -> slug da pagina e nome para os creditos. */
export const PACOTES = {
  casino: { slug: 'casino-audio', nome: 'Casino Audio' },
  voz: { slug: 'voiceover-pack', nome: 'Voiceover Pack' },
  interface: { slug: 'interface-sounds', nome: 'Interface Sounds' },
  impacto: { slug: 'impact-sounds', nome: 'Impact Sounds' },
  ui: { slug: 'ui-audio', nome: 'UI Audio' },
};

/**
 * O que vira arquivo do jogo. `arquivo` e o caminho dentro do pacote extraido; `corte` = [inicio,
 * fim] em s depois de tirar o silencio do comeco (fim 0 = ate o fim); `pitch` > 1 sobe o tom e
 * acelera (o "locutor de slime"); `ganhoDb` ajusta depois do loudnorm (moedas mais baixas).
 * @type {{id: string, pacote: keyof typeof PACOTES, arquivo: string, corte?: [number, number], pitch?: number, ganhoDb?: number}[]}
 */
export const FONTES = [
  // botoes e moedas (fichas de cassino: o pacote nao tem moeda)
  { id: 'clique', pacote: 'ui', arquivo: 'Audio/click1.ogg' },
  { id: 'ficha', pacote: 'casino', arquivo: 'Audio/chip-lay-1.ogg' },
  { id: 'fichas', pacote: 'casino', arquivo: 'Audio/chips-stack-3.ogg' },
  // locutor (voz masculina) e a versao "de slime", 1,35x mais aguda e rapida
  ...[
    ['vozPowerUp', 'power_up'], ['vozNivel', 'level_up'], ['vozCuidado', 'war_look_out'], ['vozFim', 'game_over'],
    ['vozRecorde', 'new_highscore'], ['vozMissao', 'mission_completed'], ['vozVenceu', 'you_win'],
  ].flatMap(([id, nome]) => [
    { id, pacote: /** @type {const} */ ('voz'), arquivo: `Male/${nome}.ogg` },
    { id: id + 'Slime', pacote: /** @type {const} */ ('voz'), arquivo: `Male/${nome}.ogg`, pitch: 1.35 },
  ]),
];

/** Taxa de bits e taxa de amostragem dos MP3. */
const KBPS = 56;
const TAXA = 44100;

/** @param {string} cmd @param {string[]} args */
function rodar(cmd, args, entrada) {
  const r = spawnSync(cmd, args, { encoding: entrada === 'binario' ? 'buffer' : 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`${cmd} saiu com ${r.status}: ${String(r.stderr).slice(-800)}`);
  return r;
}

/** @param {string} p @returns {string} p com a garantia de estar dentro de base */
function dentro(base, p) {
  const a = resolve(base);
  const b = resolve(p);
  if (b !== a && !b.startsWith(a + sep)) throw new Error(`caminho fora de ${relative(RAIZ, a)}: ${p}`);
  return b;
}

/** Arquivos de audio (sem links simbolicos) dentro de dir, recursivo. */
function audiosEm(dir) {
  /** @type {string[]} */
  const out = [];
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    const st = lstatSync(p);
    if (st.isSymbolicLink()) continue;
    if (st.isDirectory()) out.push(...audiosEm(p));
    else if (/\.(ogg|wav|mp3|flac)$/i.test(n)) out.push(p);
  }
  return out.sort();
}

/** Duracao em s (ffprobe). */
function duracao(p) {
  const r = rodar('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', p]);
  return Number(String(r.stdout).trim()) || 0;
}

// ------------------------------------------------------------------ baixar
async function baixar(lista) {
  mkdirSync(DIR_ZIP, { recursive: true });
  mkdirSync(DIR_PACOTES, { recursive: true });
  for (const id of lista) {
    const pac = PACOTES[id];
    if (!pac) throw new Error(`pacote desconhecido: ${id} (conhecidos: ${Object.keys(PACOTES).join(', ')})`);
    const zip = join(DIR_ZIP, `${id}.zip`);
    if (!existsSync(zip)) {
      const pagina = `https://kenney.nl/assets/${pac.slug}`;
      process.stdout.write(`${id}: lendo ${pagina}\n`);
      const html = await (await fetch(pagina)).text();
      if (!/CC0/.test(html)) throw new Error(`${id}: a pagina nao diz CC0; conferir a licenca a mao`);
      const re = new RegExp(`https://kenney\\.nl/media/pages/assets/${pac.slug}/[A-Za-z0-9_\\-]+/[A-Za-z0-9_\\-.]+\\.zip`);
      const m = re.exec(html);
      if (!m) throw new Error(`${id}: link do zip nao encontrado; baixe a mao (ver o topo deste arquivo)`);
      process.stdout.write(`${id}: baixando ${m[0]}\n`);
      const r = await fetch(m[0]);
      if (!r.ok) throw new Error(`${id}: download ${r.status}`);
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > 200 * 1024 * 1024) throw new Error(`${id}: zip grande demais (${buf.length} B)`);
      writeFileSync(zip, buf);
    }
    // pasta nova e vazia para cada zip
    const destino = dentro(DIR_PACOTES, join(DIR_PACOTES, id));
    rmSync(destino, { recursive: true, force: true });
    mkdirSync(destino);
    rodar('unzip', ['-q', '-o', zip, '-d', destino]);
    const n = audiosEm(destino).length;
    process.stdout.write(`${id}: ${n} audios em ${relative(RAIZ, destino)}\n`);
  }
}

// ------------------------------------------------------------------ listar
function listar(id) {
  const dir = join(DIR_PACOTES, id);
  if (!existsSync(dir)) throw new Error(`${id}: rode antes "node tools/sons.mjs baixar ${id}"`);
  for (const p of audiosEm(dir)) process.stdout.write(`${duracao(p).toFixed(2).padStart(6)} s  ${relative(dir, p)}\n`);
}

// ------------------------------------------------------------------ converter e medir
/**
 * Amostras do MP3 decodificado (mono, float, TAXA), para medir o atraso e o pico.
 * @param {string} p
 */
function amostras(p) {
  const r = rodar('ffmpeg', ['-v', 'error', '-i', p, '-f', 'f32le', '-ac', '1', '-ar', String(TAXA), '-'], 'binario');
  const b = /** @type {Buffer} */ (r.stdout);
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
}

/**
 * Atraso inicial do MP3 (o codificador poe silencio no comeco): o instante da primeira
 * amostra acima de 2% do pico, menos 3 ms de folga.
 * @param {Float32Array} a
 */
function atrasoInicial(a) {
  let pico = 0;
  for (let i = 0; i < a.length; i++) pico = Math.max(pico, Math.abs(a[i]));
  const lim = pico * 0.02;
  let i = 0;
  while (i < a.length && Math.abs(a[i]) < lim) i++;
  return Math.max(0, i / TAXA - 0.003);
}

/** Filtros antes da normalizacao: mono, silencio do comeco, tom, corte, silencio do fim, fades. */
function filtrosBase(f) {
  const filtros = [`aresample=${TAXA}`, 'aformat=sample_fmts=fltp:channel_layouts=mono',
    'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.004'];
  if (f.pitch && f.pitch !== 1) filtros.push(`asetrate=${TAXA}*${f.pitch}`, `aresample=${TAXA}`);
  const [ini, fim] = f.corte || [0, 0];
  if (ini || fim) filtros.push(`atrim=start=${ini}${fim ? `:end=${fim}` : ''}`, 'asetpts=PTS-STARTPTS');
  // silencio do fim fora e as pontas sem corte seco
  filtros.push('areverse', 'silenceremove=start_periods=1:start_threshold=-55dB', 'areverse');
  filtros.push('afade=t=in:d=0.004', 'areverse', 'afade=t=in:d=0.03', 'areverse');
  return filtros;
}

/**
 * Normalizacao: loudnorm em 2 passadas (linear, alvo -18 LUFS, pico -1,5 dBTP) nos sons de
 * 0,5 s ou mais; nos curtos (a medida integrada precisa de 400 ms), pico em -3 dBFS.
 * @param {string} ent
 * @param {string[]} base
 */
function normalizacao(ent, base) {
  const ff = (/** @type {string[]} */ extra) => spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', ent, '-af', [...base, ...extra].join(','), '-f', 'null', '-'], { encoding: 'utf8' }).stderr || '';
  const dur = Number((/time=(\d+):(\d+):([\d.]+)/.exec(ff([])) || []).slice(1).reduce((a, x, i) => a + Number(x) * [3600, 60, 1][i], 0)) || 0;
  if (dur >= 0.5) {
    const txt = ff(['loudnorm=I=-18:TP=-1.5:LRA=11:print_format=json']);
    const j = JSON.parse(txt.slice(txt.lastIndexOf('{'), txt.lastIndexOf('}') + 1));
    if (Number.isFinite(Number(j.input_i))) {
      return [`loudnorm=I=-18:TP=-1.5:LRA=11:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true`, `aresample=${TAXA}`];
    }
  }
  const m = /max_volume: (-?[\d.]+) dB/.exec(ff(['volumedetect']));
  const pico = m ? Number(m[1]) : 0;
  return [`volume=${(-3 - pico).toFixed(2)}dB`];
}

function converter() {
  mkdirSync(DIR_SAIDA, { recursive: true });
  for (const f of FONTES) {
    const pac = PACOTES[f.pacote];
    const base = join(DIR_PACOTES, f.pacote);
    const ent = dentro(base, join(base, f.arquivo));
    if (!existsSync(ent) || lstatSync(ent).isSymbolicLink()) throw new Error(`${f.id}: ${f.arquivo} nao existe em ${pac.nome} (rode baixar)`);
    const saida = join(DIR_SAIDA, `${f.id}.mp3`);
    const filtros = filtrosBase(f);
    filtros.push(...normalizacao(ent, filtros));
    if (f.ganhoDb) filtros.push(`volume=${f.ganhoDb}dB`);
    rodar('ffmpeg', ['-v', 'error', '-y', '-i', ent, '-af', filtros.join(','), '-ac', '1', '-ar', String(TAXA),
      '-codec:a', 'libmp3lame', '-b:a', `${KBPS}k`, '-map_metadata', '-1', '-id3v2_version', '0', '-write_xing', '0', saida]);
    process.stdout.write(`${f.id.padEnd(22)} <- ${pac.nome}: ${f.arquivo}\n`);
  }
  medir();
}

function medir() {
  if (!existsSync(DIR_SAIDA)) mkdirSync(DIR_SAIDA, { recursive: true });
  const porId = new Map(FONTES.map((f) => [f.id, f]));
  /** @type {Record<string, {arquivo: string, kb: number, dur: number, inicio: number, licenca: string}>} */
  const indice = {};
  let total = 0;
  for (const n of readdirSync(DIR_SAIDA).filter((x) => x.endsWith('.mp3')).sort()) {
    const id = basename(n, '.mp3');
    const f = porId.get(id);
    if (!f) { process.stdout.write(`(sobra, fora da tabela FONTES: ${n})\n`); continue; }
    const p = join(DIR_SAIDA, n);
    const a = amostras(p);
    const bytes = statSync(p).size;
    total += bytes;
    const inicio = atrasoInicial(a);
    indice[id] = {
      arquivo: n,
      kb: Math.round((bytes / 1024) * 10) / 10,
      dur: Math.round((a.length / TAXA - inicio) * 1000) / 1000,
      inicio: Math.round(inicio * 10000) / 10000,
      licenca: `CC0 Kenney ${PACOTES[f.pacote].nome}`,
    };
  }
  const linhas = Object.entries(indice).map(([id, x]) => `  ${/^[a-z]\w*$/i.test(id) ? id : `'${id}'`}: { arquivo: '${x.arquivo}', kb: ${x.kb}, dur: ${x.dur}, inicio: ${x.inicio}, licenca: '${x.licenca}' },`);
  const js = [
    '// GERADO por `node tools/sons.mjs converter|medir`: nao editar a mao.',
    '// Arquivos de som em src/som/arquivos/ (MP3 mono 56 kbps, loudnorm -18 LUFS, pico -1,5 dB).',
    '// inicio: atraso do codificador no comeco do MP3, s (o start() pula ele); dur: sem o atraso, s.',
    '',
    '/** @type {Readonly<Record<string, {arquivo: string, kb: number, dur: number, inicio: number, licenca: string}>>} */',
    'export const ARQUIVOS = Object.freeze({',
    ...linhas,
    '});',
    '',
  ].join('\n');
  writeFileSync(INDICE, js);
  atualizarLicencas(indice);
  process.stdout.write(`${Object.keys(indice).length} arquivos, ${(total / 1024).toFixed(1)} KB no total -> ${relative(RAIZ, INDICE)}\n`);
}

const MARCA_INI = '=== Sons (src/som/arquivos/) ===';
const MARCA_FIM = '=== fim dos sons ===';

/** Reescreve o bloco de creditos dos sons no LICENCAS.txt (o resto do arquivo fica igual). */
function atualizarLicencas(indice) {
  let txt = readFileSync(LICENCAS, 'utf8');
  txt = txt.replace(/^2048 Cards - licencas/m, 'Slime Merge - licencas');
  const porPacote = new Map();
  for (const [id, x] of Object.entries(indice)) {
    const f = FONTES.find((y) => y.id === id);
    const nome = PACOTES[f.pacote].nome;
    if (!porPacote.has(nome)) porPacote.set(nome, []);
    porPacote.get(nome).push(`  ${x.arquivo} <- ${f.arquivo}${f.pitch ? ` (tom x${f.pitch})` : ''}`);
  }
  const bloco = [
    MARCA_INI,
    'Os demais sons do jogo sao sintetizados no navegador (src/core/audio.js e src/som/).',
    'Os arquivos abaixo vem dos pacotes da Kenney (www.kenney.nl), licenca Creative Commons',
    'Zero (CC0 1.0 Universal): dominio publico, sem exigencia de credito. Credito por cortesia:',
    '"Kenney Vleugels (www.kenney.nl)". Convertidos por tools/sons.mjs (corte, loudnorm, MP3).',
    '',
    ...[...porPacote.entries()].flatMap(([nome, l]) => [
      `Kenney - ${nome} (CC0 1.0)${nome === PACOTES.voz.nome ? ', voz masculina de Jeffrey M. Smith' : ''}`, ...l, '']),
    MARCA_FIM,
  ].join('\n');
  const i = txt.indexOf(MARCA_INI);
  const j = txt.indexOf(MARCA_FIM);
  if (i >= 0 && j > i) txt = txt.slice(0, i) + bloco + txt.slice(j + MARCA_FIM.length);
  else {
    // o bloco entra logo depois do titulo (antes da licenca da fonte)
    const k = txt.indexOf('\n\n');
    txt = txt.slice(0, k + 2) + bloco + '\n\n' + txt.slice(k + 2);
  }
  writeFileSync(LICENCAS, txt);
}

// ------------------------------------------------------------------ linha de comando
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, ...resto] = process.argv.slice(2);
  if (cmd === 'baixar') await baixar(resto.length ? resto : Object.keys(PACOTES));
  else if (cmd === 'listar') listar(resto[0] || 'casino');
  else if (cmd === 'converter') converter();
  else if (cmd === 'medir') medir();
  else {
    process.stdout.write('uso: node tools/sons.mjs baixar [pacote...] | listar <pacote> | converter | medir\n');
    process.stdout.write(`pacotes: ${Object.keys(PACOTES).join(', ')}\n`);
    process.exit(1);
  }
}

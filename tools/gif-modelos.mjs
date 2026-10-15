// GIFs dos modelos: a pagina roda o filme deterministico (?filme=N&cada=K com o bot) e devolve
// os quadros pelo --dump-dom do Chrome headless; o ffmpeg monta o GIF com paleta.
// Uso: node tools/gif-modelos.mjs [modelo...] [--tam=390x700] [--quadros=120]
//        [--extra="bot=borda&cesto=aquario"] [--nome=borda-aquario] [--saida=docs/visuais] [--passos=N] [--auto=ms] [--cada=K]
//   sem modelo: lab, 1, 2, 3, 4, 5. Saida em docs/modelos/<modelo>.gif (ou <saida>/<nome>.gif)
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RAIZ, servir } from './servir.mjs';

const args = process.argv.slice(2);
// so o primeiro '=' separa nome e valor (o --extra traz uma query inteira)
const opt = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), ''] : [a.slice(2, i), a.slice(i + 1)]; }));
const modelos = args.filter((a) => !a.startsWith('--'));
const lista = modelos.length ? modelos : ['lab', '1', '2', '3', '4', '5'];
const [W, H] = (opt.tam || '390x700').split('x').map(Number);
const QUADROS = Number(opt.quadros) || 120;

/** roteiro de cada modelo: aquecimento, ritmo do bot e semente */
const ROTEIRO = {
  lab: { passos: 60, auto: 99999, cada: 4, semente: 7 },
  1: { passos: 900, auto: 900, cada: 4, semente: 5 },
  2: { passos: 1200, auto: 900, cada: 4, semente: 4 },
  3: { passos: 300, auto: 450, cada: 4, semente: 4 },
  4: { passos: 60, auto: 300, cada: 5, semente: 4 },
  5: { passos: 900, auto: 800, cada: 4, semente: 4 },
};

function chrome(argv, ms) {
  return new Promise((ok) => {
    const p = spawn('google-chrome', argv, { stdio: ['ignore', 'pipe', 'ignore'] });
    let out = '';
    p.stdout.on('data', (d) => { out += d; });
    const t = setTimeout(() => p.kill('SIGKILL'), ms);
    p.on('close', () => { clearTimeout(t); ok(out); });
  });
}

const porta = 5374;
const fechar = await servir(porta);
const saida = join(RAIZ, opt.saida || 'docs/modelos');
mkdirSync(saida, { recursive: true });
for (const m of lista) {
  const r = { ...(ROTEIRO[m] || ROTEIRO[1]) };
  for (const k of ['passos', 'auto', 'cada']) if (opt[k]) r[k] = Number(opt[k]);
  const nome = opt.nome || m;
  const perfil = mkdtempSync(join(tmpdir(), 'slime-gif-'));
  const extra = opt.extra ? '&' + opt.extra : '';
  const url = `http://127.0.0.1:${porta}/index.html?modelo=${m}&semente=${r.semente}&passos=${r.passos}&auto=${r.auto}&filme=${QUADROS}&cada=${r.cada}&lang=pt&semanuncio${extra}`;
  const dom = await chrome(['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--host-resolver-rules=MAP game-cdn.poki.com 127.0.0.1:9',
    `--user-data-dir=${perfil}`, `--window-size=${W},${H}`, '--virtual-time-budget=120000', '--dump-dom', url], 600000);
  rmSync(perfil, { recursive: true, force: true });
  const ini = dom.indexOf('<pre id="filme">');
  if (ini < 0) { process.stdout.write(`${m}: sem quadros (${(dom.match(/<title>[^<]*<\/title>/) || [''])[0]})\n`); continue; }
  const quadros = dom.slice(ini + 16, dom.indexOf('</pre>', ini)).split('\n').filter((l) => l.startsWith('data:image'));
  const tmp = join(RAIZ, '.tmp/gif-' + nome);
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  quadros.forEach((q, i) => writeFileSync(join(tmp, `q${String(i).padStart(4, '0')}.jpg`), Buffer.from(q.split(',')[1], 'base64')));
  const gif = join(saida, `${nome}.gif`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '15', '-i', join(tmp, 'q%04d.jpg'),
    '-vf', 'scale=300:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4', gif]);
  const meio = String(Math.floor(quadros.length * 0.7)).padStart(4, '0');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(tmp, `q${meio}.jpg`), '-vf', 'scale=360:-1', join(saida, `${nome}.jpg`)]);
  process.stdout.write(`${m}: ${quadros.length} quadros -> ${gif}\n`);
}
await fechar();
